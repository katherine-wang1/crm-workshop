# Workshop 2 website: build report

Overnight build, 2026-10-05 to 2026-10-06. Built from `02-website-outline.md` and the plan you approved. Everything is in `Workshop 2/Website/`. It's a git repo with one local commit; nothing is pushed or deployed.

**Status:** the whole site is built and tested in a headless browser at desktop (1360×900) and phone (390×844) widths. All automated checks pass:

- **Main flow (35):** sign-in → every step → feedback → reload.
- **Phone and dashboard (12).**
- **Zip checks (27).**

What I couldn't test is listed in "What I couldn't test" below. The main gaps: Vercel itself, and uploading a generated zip into Claude.

---

## 1. What was built

| Part | What's there |
|---|---|
| **Shell and mechanics** (from Workshop 1) | Name + email sign-in, `?room=`, one step at a time, side rail with groups (Before class / In class / Part A / B / C / Wrap up), steps unlock in order, "Back to where you are" bar, "X of 9 done" progress bar, progress saved in the browser and synced to the server (keyed by email), "Now you know…" after each step, checkpoints (steps 6 and 7, with a star and bigger confetti), copy cards, Stuck? drawer with search, house rules, feedback on Finish |
| **Step 0** | Sub-steps 0.1–0.6 as collapsible sections, each with its own check. Checking one closes it and opens the next. Step 0 finishes once 0.1–0.5 are checked (0.6 is optional). There are 19 screenshot slots, every [URL] is a link (with a yellow **verify** tag where it still needs checking), and every [STUCK] is a drawer entry that opens at the right sub-step |
| **Steps 1–8, Finish** | All outline content, in your phrasing where it existed. Step 1 has a diagram and "where information sits". Step 2 has an interactive mini-database (click a link chip and it jumps to the linked record). Step 4 has the crm-company anatomy visual. Step 5 has "label it yourself" for crm-person. Step 6 has the "But wait…" box. Step 7 has the six questions, the CRM card and the comparison checklist. Step 8 reuses the six questions plus "manual or scheduled?". Finish has the recap, rating and comment |
| **Side quests tab** | "Coming soon" page with a small animated map. Reachable from the top bar and from step 8 / Finish |
| **Zip generator** | In the browser, no dependencies (`js/zip.js`). It validates the Base URL, pulls out the Base ID, and fills the `Base URL:` / `Base ID:` lines of crm-config.txt. SKILL.md is copied byte for byte. The Base URL lives in page memory only and is never saved or sent. The full generator is in step 3, with one-zip versions in steps 4, 5, 6 and the step 7 fallback (crm-brief-me) |
| **Step 7 CRM card** | Filled live with the same Base URL / Base ID. If the student reloaded, it asks for the URL again |
| **Admin dashboard** | `/instructor`, behind `INSTRUCTOR_KEY`, live every 5 s: headline tiles, per-step counts, who is on each step, a step 0 breakdown by sub-step (plus who hasn't finished setup), median time per step, ratings and comments, a sortable and filterable student table, and CSV export |
| **Drafted content** | 41 Stuck? entries across 14 groups, 5 house rules, the anatomy visual for crm-company, the "label it yourself" exercise for crm-person (see section 6) |
| **Repo** | Same stack as Workshop 1: static HTML + 3 Vercel functions + Upstash Redis. Also a local dev server, test scripts, and a README with the Vercel setup |

### Styling, as proposed

- **Palette:** warm paper and ink, with one colour per part: tangerine (Part A), violet (Part B), teal (Part C), blue (pre-work), sunshine for memory moments, coral only for warnings and Safety rules.
- **Type:** Bricolage Grotesque for headings, DM Sans for body text, JetBrains Mono for skill text and copy cards.
- **Transitions:**
  - **Steps:** steps slide in with staggered content, and a pill slides along the rail.
  - **Collapsibles and checks:** collapsibles open and close smoothly. A sub-step check pops in with a small burst. Completing a step turns the button into a checkmark, fires confetti in the part's colour, fills the progress bar and slides up a "Now you know" card.
  - **Zip generator:** the Base ID lifts out of the URL as a chip, then the zip cards flip in.
  - **Anatomy:** tapping a part highlights its block in the skill.
  - **Drawer:** the Stuck? drawer slides in, and the matching group flashes.
- **Reduced motion:** all of this is turned off when a student's device asks for reduced motion.

---

## 2. How to run it locally

```bash
cd "Workshop 2/Website"
npm install
npm run dev
```

- Site: http://localhost:3000. Dashboard: http://localhost:3000/instructor (key: `dev`).
- On localhost, the **draft notes for you** (yellow dashed boxes, hidden from students) show automatically. Use `?draft=0` to see the student view, or `?draft=1` on the live site.
- Checks: `npm run test-zip` (builds every zip and checks it with `unzip`) and `npm run check-skills` (site copy vs `Workshop Materials/skills`, byte for byte; currently all 8 files OK).

---

## 3. What you need to do to push and deploy

Full steps with click paths are in `README.md` → "Deploy on Vercel". Short version:

1. **GitHub:** create an empty repo, then in `Workshop 2/Website/`:
   `git remote add origin https://github.com/<you>/<repo>.git && git push -u origin main`
2. **Vercel:** Add New → Project → import the repo. Framework preset **Other**, no build command. Deploy.
3. **Storage:** in the project, Storage → Upstash → Redis (free) → connect to the project. It adds `KV_REST_API_URL` / `KV_REST_API_TOKEN` itself. You can reuse Workshop 1's Redis: this site's keys are prefixed `workshop2:`.
4. **Env var:** Settings → Environment Variables → `INSTRUCTOR_KEY` = a password you choose (Production).
5. **Redeploy** (Deployments → ⋯ → Redeploy), then sign in on the site, open `/instructor`, enter the key, and check you appear.

After that, every push to `main` deploys automatically.

**Before students see it:**

- [ ] Replace **[LINK PENDING]** in 0.3 (README → "Editing content" shows the one-line swap).
- [ ] Drop screenshots into `img/screens/` using the slot names in `img/screens/README.md` (31 slots).
- [ ] Verify the 7 links tagged **verify**, then delete their `data-verify` attribute.
- [ ] After removing Maya from the template seeds: update the 0.3 Check and the step 2 tour table (both have draft notes).
- [ ] Skim it once with `?draft=1` to see every note I left for you.

---

## 4. Screenshots

All in `docs/screenshots/`. Desktop full-page captures show the student view after the steps were completed, so each one ends with its "Now you know" line.

| | |
|---|---|
| Sign-in | ![](docs/screenshots/desktop-00-sign-in.png) |
| Step 0, first visit (0.1 opens automatically) | ![](docs/screenshots/desktop-01-step0.png) |
| Step 0, all checked, 0.5 open | ![](docs/screenshots/desktop-step-0-setup.png) |
| Step 1 | ![](docs/screenshots/desktop-step-1-what.png) |
| Step 2 (link clicked) | ![](docs/screenshots/desktop-step-2-db.png) |
| Step 3 (zips ready) | ![](docs/screenshots/desktop-step-3-skills.png) |
| Step 4 (Description highlighted) | ![](docs/screenshots/desktop-step-4-company.png) |
| Step 5 (labels revealed) | ![](docs/screenshots/desktop-step-5-person.png) |
| Step 6 | ![](docs/screenshots/desktop-step-6-capture.png) |
| Step 7 (CRM card filled) | ![](docs/screenshots/desktop-step-7-build.png) |
| Step 8 | ![](docs/screenshots/desktop-step-8-next.png) |
| Finish | ![](docs/screenshots/desktop-step-finish-finish.png) |
| Side quests | ![](docs/screenshots/desktop-side-quests.png) |
| Stuck? drawer (opened from step 6) | ![](docs/screenshots/desktop-stuck-drawer.png) |
| Draft notes (`?draft=1`) | ![](docs/screenshots/desktop-draft-mode-notes.png) |
| Dashboard (test data) | ![](docs/screenshots/desktop-dashboard.png) |
| Phone: sign-in, step 0, step 3 | ![](docs/screenshots/phone-00-sign-in.png) ![](docs/screenshots/phone-01-step0.png) ![](docs/screenshots/phone-03-step3-zips.png) |
| Phone: steps 1, 4, anatomy | ![](docs/screenshots/phone-step-01-what.png) ![](docs/screenshots/phone-step-04-company.png) ![](docs/screenshots/phone-step-04-anatomy.png) |
| Phone: steps 6, 7, CRM card | ![](docs/screenshots/phone-step-06-capture.png) ![](docs/screenshots/phone-step-07-build.png) ![](docs/screenshots/phone-step-07-crm-card.png) |
| Phone: Finish, Stuck? | ![](docs/screenshots/phone-step-finish-finish.png) ![](docs/screenshots/phone-stuck-drawer.png) |

---

## 5. What was tested

| Area | Result |
|---|---|
| Sign-in, room parameter, sign-in validation | OK |
| Step 0 gated until 0.1–0.5 are checked; each check closes its section and opens the next; undo works | OK |
| Steps unlock in order; completing a step moves to the next; going back shows "Back to where you are" | OK |
| Progress sync: progress reached the server for each student, and the dashboard shows it | OK (local server with the in-memory store) |
| Reload: progress kept (browser), Base URL **not** kept, CRM card asks for it again | OK |
| Zip generator rejects: template base (`app6pSBloIpR6pOLN`), share links (`shr…`), non-Airtable links, the `appXXXXXXXXXXXXXX` placeholder, short IDs, empty input | OK |
| Zip generator accepts: full URL with table/view/query, no `https://`, bare Base ID, stray `<>` or spaces | OK |
| Zips for a real-looking URL (`https://airtable.com/appQ3vRk8LmT2xYzA/tbl…/viw…?blocks=hide`), opened with `unzip` and Python: layout `<skill>/SKILL.md` + `<skill>/crm-config.txt` (same as your zips); **SKILL.md byte-identical**; Base URL + Base ID filled; time zone America/Los_Angeles; no placeholder left; CRC valid | OK, all four skills |
| Base ID never written to localStorage | OK |
| Step 7 CRM card: filled with Base URL and Base ID; Copy puts the filled text on the clipboard | OK |
| Transcript copy card copies the full transcript (identical to the .md minus the facilitator comment) | OK |
| Anatomy loads the live SKILL.md and highlights sections; labeler marks right and wrong answers | OK |
| Stuck? drawer opens at the current step; search works | OK |
| Feedback sends; dashboard shows it | OK |
| Dashboard: wrong key refused, right key opens, per-step rows, CSV export (32 columns) | OK |
| Phone width: no horizontal scroll on steps 0, 1, 3, 4, 7; zip download works | OK (after one fix, see below) |
| Console errors across the whole run | None |

**Fixed during testing:**

- On phones, the step rail made the page wider than the screen.
- On narrow phones, the top bar overflowed.
- The diagram's side-quest circles slid behind the skill labels as they rotated. They're now fixed in the corners and bob gently.
- A bold word inside a house rule broke onto its own line.
- The Stuck? drawer pointed at 0.6 when setup was done.
- The "But wait…" Status line didn't match what crm-person sets for a confirmed meeting.
- Long anatomy sections stayed collapsed when highlighted.
- Button labels wrapped onto two lines.

---

## 6. Drafts for your review

Everything below is on the site. Your phrasing is kept where it existed; the rest is new.

**House rules** (step 1, also at the bottom of the Stuck? drawer)
1. Maya, Jordan, Cedar Labs and Harbor Health are made up. They're fictional examples for practice. Don't research them online.
2. Check Airtable, not just the chat. A step is done when you can see the record in your base, not when Claude says it saved.
3. Edit My process. Leave the Safety rules alone. My process is yours to change. The Safety rules are what keep your CRM safe, and they win if the two conflict.
4. Read before you confirm. When Claude says NOT SAVED YET. CONFIRM?, nothing has been written yet. Check what's being replaced before you say yes.
5. Stuck for more than five minutes? Open Stuck? (top right), then raise your hand. Setup problems are normal and fixable.

**Stuck? entries** (41): 0.1 (3), 0.2 (2), 0.3 (4), 0.4 (2), 0.5 (4), 0.6 (1), step 2 (1), step 3 (5), step 4 (5), step 5 (3), step 6 (4), step 7 (4), anywhere (3). They're drafted from the outline's examples, the skills' Safety rules and the setup flow, not from student testing. Two notable ones:

- **"I uploaded the unzipped folder":** Safari unzips downloads automatically. The fix is right-click → Compress, and don't rename the folder, because Claude's help center says the folder name must match the skill name.
- **"Claude says it's a repeat":** that's the duplicate check working as intended.

**Skill anatomy, crm-company (step 4):** the real SKILL.md, split at its headings and colour-coded: name, description, title, What this skill does, Fields, Workflow, My process, Safety rules. Each part has a one-line purpose tagged **When** (name, description) or **How** (the body). Tap a part to highlight it in the skill.

**"Label it yourself", crm-person (step 5):** the same split with the colours removed. For each block, students pick a *purpose* ("Decides when Claude uses it", "Your defaults, yours to change", …), not a heading name, so it isn't just matching titles. A right answer colours the block and adds a crm-person-specific note (for example, Inputs: "New here. crm-person never researches people online, so it spells out what it accepts"). A meter tracks progress, and "Show answers" fills them all in.

**Other new copy:** what you'll leave with / know how to do (step 1), the glossary and tour captions (step 2), the "What you see in Claude → why it happens" table (step 4), the history vs current state cards (step 6), the reveal answer for "Why did we bundle a config file?" (step 7), and the recap lines on Finish.

---

## 7. Calls I made on your behalf

**Approved in the plan**

1. Base URL is kept in page memory only. A reload means pasting it again; step 7 has its own paste field.
2. The validator accepts any `airtable.com/app…` link, a bare Base ID, or one with stray brackets. It rejects the template ID, share links, non-Airtable links and the placeholder.
3. crm-config.txt: Base URL normalised to `https://airtable.com/<BaseID>`. The comment "Replace appXXXXXXXXXXXXXX (in both lines below)…" becomes "Filled in by the AI@GSB workshop site with your Base URL and Base ID." Every other line, and SKILL.md, is untouched.
4. Only 0.6 is optional. Step 0 completes when 0.1–0.5 are checked. Checkpoints are steps 6 and 7.

**Made during the build**

5. **Step 6 "run it again" uses a different conversation.** The outline has students edit My process and "run again", plus an optional check that pasting the same transcript doesn't duplicate. Running again on the same transcript would trip the duplicate check, so the site says to run the edited skill on notes from a different conversation (real or made up). The duplicate check stays as an optional fold.
6. **Step 5's prompt dates the coffee 2026-10-05** to match the transcript, so step 6's example lines up. The "But wait…" mock shows Status `Conversation scheduled → Conversation held`, because that's what crm-person sets for a confirmed meeting.
7. **Step 4's example prompt is "Add Stripe to my CRM."** (from skills-overview), with a note to pick a real company, not Cedar Labs or Harbor Health.
8. **Candidate URLs filled in, all tagged verify:**
   - `airtable.com/signup` and `airtable.com`
   - `claude.ai/settings/capabilities` (0.4)
   - `claude.ai/customize/skills` (0.4 check, step 3, step 7)
   - `claude.ai/settings/connectors` (0.5)

   The 0.4 wording ("Settings → Capabilities → Code execution and file creation") comes from Claude's help center. The help center words the upload as "+ → Create skill → Upload a skill"; the site keeps your observed "New skill → Upload Skill" and flags the difference in a draft note.
9. **New screenshot slots** beyond the outline: 2-a, 3-f, 4-a, 5-a, 6-a, 6-b, 7-a. Delete any you don't want (listed in `img/screens/README.md`).
10. **Step 2 adds a "Try it here first" mini-database** with the current seed records, before the "now in your own base" instructions (which use Jordan Lee, so they survive Maya's removal).
11. **Step 3's check** is "three zips downloaded, install them in steps 4–6", since the outline installs each skill where it's first used.
12. **Six-question answers and labeler answers stay in the student's browser.** They're not synced or shown on the dashboard. "Copy my answers" gives students their notes as text.
13. **Step 7 fallback (crm-brief-me zip) sits in a collapsed fold**, so it doesn't compete with building their own.
14. **Draft notes for you** (open items, assumptions) are hidden from students. They show with `?draft=1` and on localhost. Verify tags and screenshot placeholders are visible to everyone, as you asked.
15. **Dashboard timing:** median time per step runs from when a student first opened the step to when they checked it off. If they come back after a 3+ hour gap (pre-work at home, then class), the clock restarts. This avoids counting the gap between pre-work and class, which Workshop 1's method (time since the previous completion) would have.
16. **The dashboard also tracks sub-steps 0.1–0.6**, so you can see where setup stalls and who hasn't finished it before class.
17. **Redis keys are prefixed `workshop2:`** (Workshop 1 used `workshop:`), so both sites can share one database.
18. **On phones narrower than 430 px, the "X of 9 done" counter is hidden** from the top bar to make room. The rail still shows checkmarks.
19. **The transcript copy card is the file verbatim minus the facilitator HTML comment.** It keeps the header line "Fictional test material for crm-capture-convo. Maya Chen and Cedar Labs are invented seed records…". Once Maya isn't a seed record, you may want to reword it in the .md and on the site.
20. **The diagram uses "?" circles for side quests**, since none are chosen yet, plus a "choose your own, on the outside" label.

---

## 8. What I couldn't test

- **Vercel and Upstash themselves.** Tested with a local server that runs the same API files against an in-memory store. The API code is unchanged in shape from Workshop 1, which runs on Vercel today, but the first real deploy is the real test.
- **Uploading a generated zip into Claude.** The zips have the same layout and file names as yours, and pass `unzip -t`, but they're "stored" (uncompressed) rather than deflated. That's valid zip, but please upload one generated zip to Claude once to confirm.
- **Anything inside Claude or Airtable:** connector flows, skill triggering, the skill builder. None of it is touched by the site, but the site's instructions depend on it.
- **Real devices and other browsers.** Tested in headless Chromium at phone size, not on a real iPhone (Safari, iOS clipboard, Safari auto-unzipping downloads) and not in Firefox.
- **The URLs tagged verify.** They need a signed-in student account.
- **`vercel dev`.** Only the bundled `npm run dev` server was tested.

---

## 9. Remaining open items

**From the outline, still open:**

- **Template base:** the share link ([LINK PENDING]), removing Maya from the seeds (then update the 0.3 check, the step 2 tour and the transcript header), removing test records (Anthropic), and re-testing Copy base from a free account.
- **Step 6 "But wait…" example:** built as drafted, for you to confirm on the site.
- **Step 7:** test the CRM card plus own-request approach in the skill builder. Are database reads reliable without the field list? Does it fit workshop time? Also verify the path to the skill builder (screenshot 7-a).
- **[VERIFY] items** in step 0: Claude settings names, the connector path, and what Stanford accounts allow.
- **Memory:** is it available on student plans, and can installed skills use it? Both memory callouts depend on it.
- **Skill triggering:** does a skill trigger reliably without the slash (step 5's description test)?
- **Platform questions:** are installed skills available on mobile? Do Airtable free-plan API limits cover the workshop and side quests?
- **Fallbacks and availability:** a fallback local sheet for students who can't get Airtable working; whether scheduled tasks with Gmail / Calendar are available on Stanford accounts.
- **Which side quests make the cut.** The tab is a placeholder.
- **Screenshots** for all 31 slots.

**New from this build:**

- **Stuck? entries are drafted, not from testing.** Revise them after a dry run with a student.
- **Decide whether the 7 new screenshot slots stay.**
- **Decide whether the phone top bar should keep a progress counter** (call 18).
- **The transcript's header line wording** (call 19).

---

## 10. Files changed outside `Website/`

- `Workshop Materials/build-log.md`: appended a dated entry for this build. Nothing else outside `Website/` was touched (no skills, no outline, nothing in Scaffolding or Archive).
