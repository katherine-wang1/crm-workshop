// Local preview server: serves the static site and the /api functions with an
// in-memory store, so you can click through everything without Vercel or Redis.
//
//   npm run dev                      -> http://localhost:3000
//   INSTRUCTOR_KEY=letmein npm run dev   (dashboard key; defaults to "dev")
//
// Data lives in memory and is gone when you stop the server. For a closer copy
// of production, use `vercel dev` instead (see README).

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 3000);
process.env.INSTRUCTOR_KEY = process.env.INSTRUCTOR_KEY || "dev";

/* ---------- a tiny stand-in for the Upstash Redis calls the API uses ---------- */
const hashes = new Map();
const hash = (k) => { if (!hashes.has(k)) hashes.set(k, new Map()); return hashes.get(k); };
globalThis.__WORKSHOP_MEMORY_STORE__ = {
  async hget(k, f) { const v = hash(k).get(f); return v === undefined ? null : JSON.parse(v); },
  async hset(k, obj) { for (const [f, v] of Object.entries(obj)) hash(k).set(f, typeof v === "string" ? v : JSON.stringify(v)); return 1; },
  async hgetall(k) { const h = hashes.get(k); if (!h || !h.size) return null; const o = {}; for (const [f, v] of h) o[f] = JSON.parse(v); return o; },
  async hexists(k, f) { return hash(k).has(f) ? 1 : 0; },
  async hlen(k) { return hash(k).size; },
  async expire() { return 1; },
  async scan(_c, { match }) {
    const re = new RegExp("^" + match.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$");
    return [0, [...hashes.keys()].filter((k) => re.test(k) && hashes.get(k).size)];
  },
};

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".md": "text/markdown; charset=utf-8", ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".gif": "image/gif", ".json": "application/json", ".ico": "image/x-icon",
};

async function runApi(name, req, res, url) {
  const file = path.join(ROOT, "api", name + ".js");
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end("Not found"); }
  const mod = await import(pathToFileURL(file).href);
  let raw = "";
  for await (const chunk of req) raw += chunk;
  req.body = raw;
  req.query = Object.fromEntries(url.searchParams);
  // Minimal Vercel-style response helpers.
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(obj)); return res; };
  await mod.default(req, res);
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const p = decodeURIComponent(url.pathname);
    if (p.startsWith("/api/")) return await runApi(p.slice(5).replace(/\/$/, ""), req, res, url);

    // cleanUrls, like vercel.json: /instructor -> instructor.html
    let file = path.join(ROOT, p === "/" ? "index.html" : p);
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    if (!path.extname(file) && fs.existsSync(file + ".html")) file += ".html";
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
    fs.createReadStream(file).pipe(res);
  } catch (err) {
    console.error(err);
    res.writeHead(500); res.end("Server error");
  }
}).listen(PORT, () => {
  console.log(`Workshop 2 site:   http://localhost:${PORT}/`);
  console.log(`Dashboard:         http://localhost:${PORT}/instructor   (key: ${process.env.INSTRUCTOR_KEY})`);
  console.log("Progress is kept in memory only while this runs.");
});
