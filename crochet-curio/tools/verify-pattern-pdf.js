/* ============================================================
   verify-pattern-pdf.js — accessibility checks the build can fail on

   PAC checks the tag tree. It does not check the glyph runs
   underneath, which is how a PDF that reads "Beanie, AdultMedium"
   out loud passed PAC clean. These checks cover the gap: they read
   the file the way assistive technology does — walk the structure
   tree, pull the text each tag actually owns, and assert on what
   comes out.

   Run it on its own:  node tools/verify-pattern-pdf.js <file.pdf>
   Exit code 0 = pass, 1 = fail.
   ============================================================ */

const {
  load,
  inflate,
  pageObjects,
  pageFonts,
  contentStreamNum,
  decodeTextBlock,
} = require("./pdf-tools");

/* Split a /K value into its parts: child references, MCID integers,
   and inline dictionaries (which is how OBJR annotation links appear). */
function splitK(v) {
  v = v.trim();
  if (v.startsWith("[")) v = v.slice(1, -1);

  const items = [];
  let i = 0;

  while (i < v.length) {
    if (/\s/.test(v[i])) {
      i++;
      continue;
    }
    if (v.startsWith("<<", i)) {
      let depth = 0;
      let j = i;
      while (j < v.length) {
        if (v.startsWith("<<", j)) {
          depth++;
          j += 2;
        } else if (v.startsWith(">>", j)) {
          depth--;
          j += 2;
          if (!depth) break;
        } else j++;
      }
      items.push({ dict: v.slice(i, j) });
      i = j;
      continue;
    }
    const ref = /^(\d+) 0 R/.exec(v.slice(i));
    if (ref) {
      items.push({ ref: ref[1] });
      i += ref[0].length;
      continue;
    }
    const num = /^(\d+)(?!\d)/.exec(v.slice(i));
    if (num) {
      items.push({ mcid: num[1] });
      i += num[0].length;
      continue;
    }
    i++;
  }

  return items;
}

function getK(dict) {
  const m = /\/K\s*(\[[\s\S]*?\]|<<[\s\S]*?>>|\d+ 0 R|\d+)/.exec(dict);
  return m ? m[1] : null;
}

function getRef(dict, key) {
  const i = dict.indexOf("/" + key + " ");
  if (i < 0) return null;
  const m = /^(\d+) 0 R/.exec(dict.slice(i + key.length + 2));
  return m ? m[1] : null;
}

/* Walk the structure tree and return the text runs in tag order —
   the sequence a screen reader traverses. */
function readingOrder(objs) {
  const pages = pageObjects(objs);
  const pageIndex = {};
  pages.forEach((p, i) => (pageIndex[p] = i + 1));

  /* page -> { mcid: text }, and every text line on the page */
  const pageText = {};
  const lines = [];

  for (const p of pages) {
    const cn = contentStreamNum(objs, p);
    const fonts = pageFonts(objs, p);
    const t = inflate(objs[cn]).toString("latin1");
    const map = {};
    let mcid = null;

    const re = /\/([A-Za-z0-9]+) <<\/MCID (\d+) >>BDC|BT([\s\S]*?)ET/g;
    let m;
    while ((m = re.exec(t))) {
      if (m[2] !== undefined) {
        mcid = m[2];
        if (map[mcid] === undefined) map[mcid] = "";
        continue;
      }
      const { text } = decodeTextBlock(m[3], fonts);
      if (text.length) lines.push({ page: pageIndex[p], text });
      if (mcid !== null) map[mcid] = (map[mcid] || "") + text;
    }
    pageText[p] = map;
  }

  const rootNum = Object.keys(objs).find((k) =>
    /\/Type \/StructTreeRoot/.test(objs[k].dict)
  );

  const out = [];
  if (!rootNum) return { out, lines, rootNum: null };

  (function walk(num, inheritedPg, path, nums) {
    const o = objs[num];
    if (!o) return;
    const d = o.dict;
    const S = (/\/S \/(\w+)/.exec(d) || [])[1];
    const pg = getRef(d, "Pg") || inheritedPg;
    const here = path.concat([S]);
    const hereNums = nums.concat([num]);
    const k = getK(d);
    if (k === null) return;

    /* the nearest heading ancestor, so text split across an H2 and its
       NonStruct child can be grouped back into one heading */
    let headingLevel = null;
    let headingElem = null;
    for (let i = here.length - 1; i >= 0; i--) {
      const hm = /^H([1-6])$/.exec(here[i]);
      if (hm) {
        headingLevel = Number(hm[1]);
        headingElem = hereNums[i];
        break;
      }
    }

    for (const it of splitK(k)) {
      if (it.ref) {
        walk(it.ref, pg, here, hereNums);
      } else if (it.mcid !== undefined) {
        const txt = (pageText[pg] || {})[it.mcid];
        out.push({
          page: pageIndex[pg],
          tag: S,
          path: here.join(">"),
          headingLevel,
          headingElem,
          text: txt === undefined ? null : txt,
        });
      } else if (it.dict) {
        out.push({
          page: pageIndex[pg],
          tag: "OBJR",
          path: here.join(">"),
          headingLevel,
          headingElem,
          text: "[annotation]",
        });
      }
    }
  })(rootNum, null, [], []);

  return { out, lines, rootNum };
}

function verify(path, opts) {
  const quiet = opts && opts.quiet;
  const { objs } = load(path);
  const failures = [];
  const notes = [];

  const pages = pageObjects(objs);
  const { out, lines, rootNum } = readingOrder(objs);

  /* 1. tagged at all */
  if (!rootNum) failures.push("no StructTreeRoot — the PDF is not tagged");

  /* 2. natural language declared */
  const hasLang = Object.values(objs).some((o) => /\/Lang \(/.test(o.dict));
  if (!hasLang) failures.push("no /Lang — the document language is not declared");

  /* 3. the space fix: every text line must end on a word boundary.
        This is the check that would have caught "AdultMedium". */
  const unterminated = lines.filter((l) => !/\s$/.test(l.text));
  if (unterminated.length) {
    failures.push(
      unterminated.length +
        " text line(s) do not end with a space — words will run together when read aloud" +
        "\n      first: p" +
        unterminated[0].page +
        " " +
        JSON.stringify(unterminated[0].text.slice(-40))
    );
  }

  /* 4. reading order must not jump backwards through the document */
  let high = 0;
  const jumps = [];
  for (const r of out) {
    if (r.page < high) jumps.push(r);
    high = Math.max(high, r.page || 0);
  }
  if (jumps.length) {
    failures.push(
      jumps.length +
        " backward page jump(s) in tag order — content is tagged out of sequence" +
        "\n      first: page " +
        jumps[0].page +
        " " +
        JSON.stringify((jumps[0].text || "").slice(0, 50))
    );
  }

  /* 5. nothing tagged twice */
  const seen = {};
  for (const r of out) {
    const t = (r.text || "").trim();
    if (t.length > 25) seen[t] = (seen[t] || 0) + 1;
  }
  const repeated = Object.entries(seen).filter(([, c]) => c > 1);
  if (repeated.length) {
    failures.push(
      repeated.length +
        " text run(s) appear more than once in the tag tree" +
        "\n      first: " +
        JSON.stringify(repeated[0][0].slice(0, 50))
    );
  }

  /* 6 & 7. heading levels: start at H1, never skip a level down, and
           never announce an empty heading */
  const headings = [];
  const byElem = {};
  for (const r of out) {
    if (r.headingElem === null || r.headingElem === undefined) continue;
    if (byElem[r.headingElem] === undefined) {
      byElem[r.headingElem] = headings.length;
      headings.push({ level: r.headingLevel, text: "", page: r.page });
    }
    headings[byElem[r.headingElem]].text += r.text || "";
  }
  headings.forEach((h) => (h.text = h.text.trim()));

  const empty = headings.filter((h) => !h.text);
  if (empty.length) {
    failures.push(empty.length + " heading(s) carry no text");
  }

  if (headings.length && headings[0].level !== 1) {
    failures.push("first heading is H" + headings[0].level + ", not H1");
  }

  for (let i = 1; i < headings.length; i++) {
    if (headings[i].level > headings[i - 1].level + 1) {
      failures.push(
        "heading level skipped: H" +
          headings[i - 1].level +
          " to H" +
          headings[i].level +
          " at " +
          JSON.stringify(headings[i].text)
      );
    }
  }

  /* 8 & 9. every link annotation needs an alternative description, and
           must sit inside a Link structure element */
  const linkAnnots = Object.values(objs).filter((o) =>
    /\/Subtype \/Link/.test(o.dict)
  );
  const missingAlt = linkAnnots.filter((o) => !/\/Contents \(/.test(o.dict));
  if (missingAlt.length) {
    failures.push(
      missingAlt.length + " link annotation(s) have no /Contents alternative description"
    );
  }

  const objrs = out.filter((r) => r.tag === "OBJR");
  if (objrs.length !== linkAnnots.length) {
    failures.push(
      linkAnnots.length +
        " link annotation(s) but " +
        objrs.length +
        " OBJR reference(s) in the tag tree"
    );
  }
  const strayObjr = objrs.filter((r) => !/>Link$/.test(r.path));
  if (strayObjr.length) {
    failures.push(strayObjr.length + " OBJR(s) not nested in a Link element");
  }

  notes.push(pages.length + " pages");
  notes.push(
    lines.length +
      " text lines, " +
      (lines.length - unterminated.length) +
      " ending on a word boundary"
  );
  notes.push(out.length + " tagged items in reading order");
  notes.push(
    headings.length +
      " headings (" +
      headings.map((h) => "H" + h.level).join(" ") +
      ")"
  );
  notes.push(
    linkAnnots.length +
      " link annotation(s), " +
      (linkAnnots.length - missingAlt.length) +
      " described"
  );

  if (!quiet) {
    console.log("\n  verify " + path);
    for (const n of notes) console.log("    · " + n);
    if (failures.length) {
      console.log("\n  FAILED");
      for (const f of failures) console.log("    ✗ " + f);
    } else {
      console.log("    ✓ all checks passed");
    }
  }

  return { ok: failures.length === 0, failures, notes, headings, out };
}

module.exports = { verify, readingOrder };

if (require.main === module) {
  const target = process.argv[2];
  if (!target) {
    console.error("usage: node tools/verify-pattern-pdf.js <file.pdf>");
    process.exit(2);
  }
  process.exit(verify(target).ok ? 0 : 1);
}
