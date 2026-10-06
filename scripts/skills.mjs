// Keeps the site's copy of the skills (skills/) identical to the canonical
// skills in ../Workshop Materials/skills/. The zip generator serves these files
// as they are: SKILL.md is never changed, and only the Base URL / Base ID lines
// of crm-config.txt are filled in, in the student's browser.
//
//   npm run check-skills   compare byte for byte; exits 1 on any difference
//   npm run sync-skills    copy the canonical files over the site's copy
//
// Set SKILLS_SRC to point somewhere else if the folders move.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = process.env.SKILLS_SRC || path.resolve(ROOT, "..", "Workshop Materials", "skills");
const DEST = path.join(ROOT, "skills");
const SKILLS = ["crm-company", "crm-person", "crm-capture-convo", "crm-brief-me"];
const FILES = ["SKILL.md", "crm-config.txt"];
const mode = process.argv[2] || "check";

if (!fs.existsSync(SRC)) {
  console.error(`Canonical skills folder not found: ${SRC}\nSet SKILLS_SRC=/path/to/skills and try again.`);
  process.exit(2);
}

let diff = 0;
for (const s of SKILLS) {
  for (const f of FILES) {
    const a = path.join(SRC, s, f);
    const b = path.join(DEST, s, f);
    if (mode === "sync") {
      fs.mkdirSync(path.dirname(b), { recursive: true });
      fs.copyFileSync(a, b);
      console.log("  copied  " + s + "/" + f);
      continue;
    }
    const same = fs.existsSync(b) && Buffer.compare(fs.readFileSync(a), fs.readFileSync(b)) === 0;
    console.log((same ? "  OK    " : "  DIFF  ") + s + "/" + f);
    if (!same) diff++;
  }
}
if (mode === "check" && diff) {
  console.error(`\n${diff} file(s) differ. Run: npm run sync-skills`);
  process.exit(1);
}
