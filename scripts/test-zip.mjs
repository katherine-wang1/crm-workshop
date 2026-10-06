// Checks the zip generator without a browser: builds every skill zip for a
// sample Base URL, unzips it with the system `unzip`, and confirms that
// SKILL.md is byte-identical and crm-config.txt is filled in.
//
//   npm run test-zip

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ctx = { TextEncoder, Buffer };
ctx.globalThis = ctx;
vm.runInNewContext(fs.readFileSync(path.join(ROOT, "js/zip.js"), "utf8"), ctx);
const Z = ctx.CRMZip;

let fail = 0;
const ok = (cond, msg) => { console.log((cond ? "  OK    " : "  FAIL  ") + msg); if (!cond) fail++; };

// URL parsing
const SAMPLE = "https://airtable.com/appQ3vRk8LmT2xYzA/tblzdz8unGnEeamvi/viwAbCdEfGhIjKlMn?blocks=hide";
const p = Z.parseBaseUrl(SAMPLE);
ok(p.ok && p.baseId === "appQ3vRk8LmT2xYzA", "full Airtable URL -> Base ID");
ok(p.baseUrl === "https://airtable.com/appQ3vRk8LmT2xYzA", "Base URL normalised");
ok(Z.parseBaseUrl("airtable.com/appQ3vRk8LmT2xYzA").ok, "no https:// still works");
ok(Z.parseBaseUrl("appQ3vRk8LmT2xYzA").ok, "bare Base ID works");
ok(Z.parseBaseUrl(" <https://airtable.com/appQ3vRk8LmT2xYzA> ").ok, "stray brackets/spaces ignored");
ok(Z.parseBaseUrl("https://airtable.com/app6pSBloIpR6pOLN/tblX").code === "template", "template base rejected");
ok(Z.parseBaseUrl("https://airtable.com/shrAbCdEfGhIjKlMn").code === "share", "share link rejected");
ok(Z.parseBaseUrl("https://docs.google.com/appQ3vRk8LmT2xYzA").code === "host", "non-Airtable host rejected");
ok(Z.parseBaseUrl("https://airtable.com/appXXXXXXXXXXXXXX").code === "placeholder", "placeholder rejected");
ok(!Z.parseBaseUrl("https://airtable.com/appShort").ok, "too-short ID rejected");
ok(!Z.parseBaseUrl("").ok, "empty rejected");

// Zips
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "w2zip-"));
for (const skill of ["crm-company", "crm-person", "crm-capture-convo", "crm-brief-me"]) {
  const md = new Uint8Array(fs.readFileSync(path.join(ROOT, "skills", skill, "SKILL.md")));
  const cfg = fs.readFileSync(path.join(ROOT, "skills", skill, "crm-config.txt"), "utf8");
  const zip = Z.buildSkillZip(skill, md, cfg, p);
  const zf = path.join(tmp, skill + ".zip");
  fs.writeFileSync(zf, Buffer.from(zip));
  const out = path.join(tmp, "x-" + skill);
  execFileSync("unzip", ["-q", "-t", zf]);
  execFileSync("unzip", ["-q", "-o", zf, "-d", out]);
  const list = execFileSync("unzip", ["-Z1", zf]).toString().trim().split("\n");
  ok(list.join(",") === `${skill}/SKILL.md,${skill}/crm-config.txt`, `${skill}: layout ${list.join(", ")}`);
  ok(Buffer.compare(fs.readFileSync(path.join(out, skill, "SKILL.md")), Buffer.from(md)) === 0, `${skill}: SKILL.md byte-identical`);
  const filled = fs.readFileSync(path.join(out, skill, "crm-config.txt"), "utf8");
  ok(filled.includes("Base URL: https://airtable.com/appQ3vRk8LmT2xYzA\n") && filled.includes("Base ID: appQ3vRk8LmT2xYzA\n"), `${skill}: config filled`);
  ok(filled.includes("Time zone: America/Los_Angeles") && !filled.includes("appXXXXXXXXXXXXXX"), `${skill}: time zone kept, no placeholder left`);
}
console.log("\nUnzipped copies left in " + tmp);
process.exit(fail ? 1 : 0);
