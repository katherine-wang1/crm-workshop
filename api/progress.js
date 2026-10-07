import {
  STEPS, ROOM_TTL_SECONDS, keys, cleanRoom, cleanName, cleanEmail, cleanSteps, cleanViewing,
  parseRecord, readBody, storeOr503, roomHasSpace,
} from "../lib/store.js";

/**
 * A student saves their own progress.
 *
 *   POST /api/progress?room=default   body: { name, email, steps, viewing, session }
 *
 * Write-only on purpose: reading anyone's progress goes through
 * /api/instructor, which needs the instructor key. The server stamps when each
 * step was first completed and when the student joined, so those times can't
 * be set by the page. The Base URL is never sent here.
 */
const BREAK_MS = 3 * 60 * 60 * 1000;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const db = storeOr503(res);
  if (!db) return;

  const room = cleanRoom(req.query?.room);
  const body = readBody(req);
  const name = cleanName(body.name);
  const email = cleanEmail(body.email);

  if (!name) return res.status(400).json({ ok: false, error: "bad_name", message: "A name is required." });
  if (!email) return res.status(400).json({ ok: false, error: "bad_email", message: "A valid email is required." });

  try {
    const key = keys.students(room);

    if (!(await roomHasSpace(db, key, email))) {
      return res.status(429).json({
        ok: false,
        error: "room_full",
        message: "This room is full. Start a new one with ?room=<name>.",
      });
    }

    const prev = parseRecord(await db.hget(key, email)) || {};
    const prevSteps = prev.steps || {};
    const prevAt = prev.stepAt || {};
    const now = new Date().toISOString();

    const steps = cleanSteps(body.steps);
    const stepAt = {};
    for (const step of STEPS) {
      if (steps[step]) stepAt[step] = (prevSteps[step] && prevAt[step]) || now;
    }

    // When the student started the step they're on: stamped the first time they
    // open it, and again if they come back in a new page session after a break of
    // 3+ hours (pre-work at home, then class). The dashboard's median time per step
    // runs from this stamp to completion, so a gap between pre-work and class
    // doesn't inflate the in-class steps.
    const viewing = cleanViewing(body.viewing);
    const session = String(body.session || "").replace(/[^a-z0-9]/gi, "").slice(0, 24);
    const viewAt = prev.viewAt && typeof prev.viewAt === "object" ? { ...prev.viewAt } : {};
    if (viewing && viewing !== "finish" && viewing !== "fork" && !steps[viewing] && (!viewAt[viewing] || (session !== prev.session && Date.parse(now) - Date.parse(viewAt[viewing]) > BREAK_MS))) {
      viewAt[viewing] = now;
    }

    const record = {
      name,
      email,
      steps,
      stepAt,
      viewing,
      session,
      viewAt,
      joinedAt: prev.joinedAt || now,
      updatedAt: now,
    };

    await db.hset(key, { [email]: JSON.stringify(record) });
    await db.expire(key, ROOM_TTL_SECONDS);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("progress handler failed", err);
    return res.status(500).json({ ok: false, error: "server_error", message: "Could not reach the database." });
  }
}
