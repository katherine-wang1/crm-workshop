import { Redis } from "@upstash/redis";
import { createClient } from "redis";
import { timingSafeEqual } from "node:crypto";

/**
 * Shared storage and validation for the workshop API.
 * Carried over from the Workshop 1 site (ADA110/outreach-workshop-site),
 * minus the level picker.
 *
 * One Redis hash per room for progress and one for feedback, both keyed by
 * the student's email. Both expire on their own, so old workshops clean
 * themselves up.
 *
 * Never stored: the student's Airtable Base URL or Base ID. The zip generator
 * runs entirely in the browser and never sends them here.
 */

/** Core steps, in order. Keep in sync with STEPS in js/app.js. */
export const MAIN_STEPS = [
  "what", "setup", "db", "skills", "company", "person", "capture", "build",
];

/** Optional pages after the "You made it!" hub, open in any order. Keep in sync with BRANCHES in js/app.js. */
export const BRANCH_STEPS = ["quests", "next"];

/** Step 0 sub-steps (0.1–0.4), tracked so the dashboard shows where prep stalls. */
export const SUB_STEPS = ["setup-1", "setup-2", "setup-3", "setup-4"];

/** Side quests 1–5, ticked individually on the Side quests page. Keep in sync with QUESTS in js/app.js. */
export const QUEST_STEPS = ["quest-1", "quest-2", "quest-3", "quest-4", "quest-5"];

export const STEPS = SUB_STEPS.concat(MAIN_STEPS, BRANCH_STEPS, QUEST_STEPS);

export const MAX_STUDENTS = 300;
export const MAX_NAME = 60;
export const MAX_EMAIL = 120;
export const MAX_COMMENT = 2000;
export const ROOM_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let redis = null;

/** Parse a stored value the way the Upstash client does: JSON if it is JSON, else the raw string. */
function parseStored(v) {
  if (v === null || v === undefined) return null;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

/**
 * Adapter for a standard Redis connection string (REDIS_URL, what Vercel's
 * Redis integration provides). Exposes only the commands the API uses, with
 * the same shapes as the Upstash client, so the API files don't change.
 */
export function redisUrlStore(url, create = createClient) {
  const client = create({ url });
  client.on("error", () => {}); // surfaced per command instead
  let connecting = null;
  const ready = () => {
    if (client.isReady) return Promise.resolve();
    if (!connecting) connecting = client.connect().catch((e) => { connecting = null; throw e; });
    return connecting;
  };
  return {
    async hget(key, field) { await ready(); return parseStored(await client.hGet(key, field)); },
    async hset(key, obj) { await ready(); return client.hSet(key, obj); },
    async hgetall(key) {
      await ready();
      const all = await client.hGetAll(key);
      const fields = Object.keys(all);
      if (!fields.length) return null;
      const out = {};
      for (const f of fields) out[f] = parseStored(all[f]);
      return out;
    },
    async hexists(key, field) { await ready(); return Number(await client.hExists(key, field)); },
    async hlen(key) { await ready(); return client.hLen(key); },
    async expire(key, seconds) { await ready(); return client.expire(key, seconds); },
    async scan(cursor, opts = {}) {
      await ready();
      const res = await client.scan(String(cursor), { MATCH: opts.match, COUNT: opts.count });
      return [res.cursor, res.keys];
    },
  };
}

export function getRedis() {
  // Local development (scripts/dev-server.mjs) swaps in an in-memory store.
  if (globalThis.__WORKSHOP_MEMORY_STORE__) return globalThis.__WORKSHOP_MEMORY_STORE__;
  if (!redis) {
    const hasRest = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    // Upstash REST credentials win if present; otherwise use a plain REDIS_URL.
    redis = !hasRest && process.env.REDIS_URL ? redisUrlStore(process.env.REDIS_URL) : Redis.fromEnv();
  }
  return redis;
}

export const keys = {
  students: (room) => `workshop2:${room}:students`,
  feedback: (room) => `workshop2:${room}:feedback`,
};

export function cleanRoom(value) {
  const room = String(value || "default")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 40);
  return room || "default";
}

export function cleanName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, MAX_NAME);
}

/** A lowercased email, or "" if it doesn't look like one. */
export function cleanEmail(value) {
  const email = String(value || "").trim().toLowerCase().slice(0, MAX_EMAIL);
  return EMAIL_RE.test(email) ? email : "";
}

/** Keep only the step flags we know about, as real booleans. */
export function cleanSteps(input) {
  const out = {};
  if (input && typeof input === "object") {
    for (const step of STEPS) if (input[step] === true) out[step] = true;
  }
  return out;
}

/** The step the student is looking at right now, if it's a known step, the hub ("fork") or "finish". */
export function cleanViewing(value) {
  const v = String(value || "");
  return MAIN_STEPS.indexOf(v) >= 0 || BRANCH_STEPS.indexOf(v) >= 0 || v === "fork" || v === "finish" ? v : "";
}

/** Upstash deserializes JSON on read; older writes may still be strings. */
export function parseRecord(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function readBody(req) {
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch {
      return {};
    }
  }
  return req.body && typeof req.body === "object" ? req.body : {};
}

/** The Redis client, or null after answering 503 when no store is connected. */
export function storeOr503(res) {
  try {
    return getRedis();
  } catch {
    res.status(503).json({
      ok: false,
      error: "storage_unconfigured",
      message: "No database is connected yet. Connect a Redis database to the Vercel project (REDIS_URL, or Upstash KV_REST_API_URL / KV_REST_API_TOKEN).",
    });
    return null;
  }
}

/**
 * Whether the request carries the instructor key. Returns "unconfigured" when
 * the site has no key set, so the dashboard can say so instead of failing open.
 */
export function instructorCheck(req) {
  const expected = process.env.INSTRUCTOR_KEY || "";
  if (!expected) return "unconfigured";
  const given = Buffer.from(String(req.headers["x-instructor-key"] || ""));
  const want = Buffer.from(expected);
  return given.length === want.length && timingSafeEqual(given, want);
}

/** Refuse a new entry once a room's hash is full; existing entries always pass. */
export async function roomHasSpace(db, key, id) {
  if (await db.hexists(key, id)) return true;
  return (await db.hlen(key)) < MAX_STUDENTS;
}
