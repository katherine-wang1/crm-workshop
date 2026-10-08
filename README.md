# AI@GSB Workshop 2 site: build your AI networking CRM

The student-facing site for AI@GSB Workshop 2. Students sign in with a name and
email, then walk through the build one step at a time: set up Airtable and
Claude (step 0), get their skill zips, use three Claude skills on their own
Airtable CRM, build a fourth skill themselves, and design their next workflow.
Kate's deck covers the concepts. This site is the build.

Same stack and mechanics as the Workshop 1 site
([ADA110/outreach-workshop-site](https://github.com/ADA110/outreach-workshop-site)):
static HTML, three Vercel functions, and Upstash Redis. No framework and no build step.

```
index.html            the student site: sign-in, What you're building, steps 0–6, the "You made it!" hub,
                      Side quests and Design your own workflow (optional, any order), Finish, Stuck? drawer.
                      All student-facing text lives here.
instructor.html       the instructor dashboard, served at /instructor (needs the key)
css/site.css          styles (palette, type, transitions)
js/app.js             site mechanics: sign-in, rail, progress + sync, collapsibles, copy cards,
                      zip generator wiring, skill anatomy, Stuck? drawer, feedback
js/zip.js             Base URL validation + in-browser zip builder (no dependencies)
skills/<skill>/       copies of the four skills (SKILL.md + crm-config.txt), served as files.
                      The zip generator packages these. Keep them identical to
                      ../Workshop Materials/skills (see "Skills" below).
img/screens/          screenshot slots: drop <id>.png here (see img/screens/README.md)
api/progress.js       POST only: a student saves their own progress
api/feedback.js       POST only: a student rates the workshop
api/instructor.js     GET only, key required: everyone's progress and feedback for a room
lib/store.js          shared validation and storage (outside api/, so it isn't a route)
scripts/dev-server.mjs  local preview server with an in-memory store
scripts/skills.mjs    check / sync the skills copy against Workshop Materials
scripts/test-zip.mjs  builds every zip from a sample Base URL and checks it with `unzip`
vercel.json           cleanUrls, so /instructor works without .html
.vercelignore         keeps docs/, scripts/ and the markdown files off the live site
docs/screenshots/     screenshots from the build test (not deployed)
```

## Run it locally

Needs Node 18 or newer.

```bash
cd "Workshop 2/Website"
npm install
npm run dev
```

- Site: http://localhost:3000 (add `?room=test` to try a room)
- Dashboard: http://localhost:3000/instructor, key `dev`
- On localhost, facilitator draft notes show automatically. Add `?draft=0` to see
  exactly what students see. On the live site, add `?draft=1` to show them.

The local server keeps progress in memory, so it resets when you stop it.
Opening `index.html` straight from Finder won't work: the zip generator and
skill anatomy need to fetch files from `skills/`.

Checks:

```bash
npm run test-zip       # builds all four zips for a sample Base URL; SKILL.md must be byte-identical
npm run check-skills   # site copy of the skills vs ../Workshop Materials/skills
```

## Deploy on Vercel (one-time setup)

You need a GitHub account and a Vercel account (sign in to Vercel with GitHub).

1. **Push to GitHub.** Create a new, empty GitHub repository (no README, no
   .gitignore), then from this folder:
   ```bash
   git remote add origin https://github.com/<you>/<repo-name>.git
   git push -u origin main
   ```
2. **Import into Vercel.** On vercel.com: **Add New… → Project**, pick the repo,
   then **Import**. Settings:
   - Framework Preset: **Other**
   - Root Directory: `./`
   - Build Command, Output Directory, Install Command: leave the defaults (no build step)

   Click **Deploy**. The site works straight away, but it can't save progress
   until step 3 is done. Students still see their own progress in their browser.
3. **Add the database (Upstash Redis).** In the project: **Storage** tab →
   **Create Database** (or **Browse Marketplace**) → **Upstash → Redis** → free
   plan → connect it to this project, for all environments. This adds the env
   vars `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or
   `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`). The code reads either pair.
   - You can reuse Workshop 1's Redis database: this site stores its keys
     under `workshop2:…`, so the two never collide.
4. **Set the dashboard key.** **Settings → Environment Variables** → add
   `INSTRUCTOR_KEY` with a password of your choice, for **Production** (and Preview if you
   want the dashboard on preview links). Without it, the dashboard refuses every
   request, so student data never leaks.
5. **Redeploy** so the new env vars take effect: **Deployments** → the latest
   one → **⋯ → Redeploy**.
6. **Check it.** Open the site, sign in as yourself, check off 0.1. Then open
   `/instructor`, enter the key, and you should see yourself in the room.

After that, every push to `main` deploys to production automatically. Pushing
another branch gives you a preview URL instead.

Prefer the CLI? `npm i -g vercel`, then from this folder: `vercel` (link the
project), `vercel integration add upstash`, `vercel env add INSTRUCTOR_KEY production`,
`vercel --prod`.

### Environment variables

| Variable | Where it comes from | What it does |
|---|---|---|
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) | Added by the Upstash integration | Progress and feedback storage |
| `INSTRUCTOR_KEY` | You set it | Unlocks `/instructor` |

## Rooms

One URL serves several cohorts:

```
https://<your-site>.vercel.app/?room=gsb-fall
https://<your-site>.vercel.app/instructor?room=gsb-fall
```

No `room` means the room called `default`. The dashboard lists every room that
has data. Each room's data expires 30 days after its last write.

## Instructor dashboard

`/instructor`, behind `INSTRUCTOR_KEY`. The key stays in that browser until you
press **Lock**. Nothing on the student site links to it. It refreshes every 5 seconds and shows:

- headline numbers: signed in, finished setup, finished pre-work, finished, active now, average rating
- per-step counts and who is on each step right now
- setup (step 0) broken down by sub-step, and who hasn't finished setup yet
- median time per step (from when a student opened the step to when they
  checked it off; a break of 3+ hours, like pre-work at home and then class, restarts the clock)
- rating spread and every comment
- a filterable, sortable student table, and **Export CSV**

## Privacy

Stored per student, keyed by email: name, email, which steps are checked off and
when, which step they're on, and feedback. Deleted automatically 30 days after
the room's last activity. Only `/api/instructor` returns it, and only with the key.

**Never stored or sent:** the student's Airtable Base URL and Base ID. The zip
generator runs entirely in the browser and keeps the Base URL in page memory only. A
reload clears it, and the student pastes it again. Six-question notes and the
"label it yourself" answers stay in that student's browser (localStorage) and are not synced.

## Editing content

- **Text:** edit `index.html` directly. Each step is a `<section data-step="…">`.
  `data-learned` on the section is its "Now you know…" line.
- **Copy cards** (prompts, transcript, CRM card): the `<script type="text/plain" id="src-…">`
  blocks at the bottom of `index.html`. The CRM card's `{{BASE_URL}}` and `{{BASE_ID}}`
  are filled in from the student's Base URL.
- **Screenshots:** drop `img/screens/<id>.png` (or .jpg/.webp). Slot ids and
  descriptions are listed in `img/screens/README.md`. Empty slots show a labeled placeholder.
- **Links that still need verifying** carry `data-verify` and show a yellow
  "verify" tag. Delete the attribute once checked.
- **Template link:** in 0.2 ("Open the CRM template"), an Airtable invite link to Kate's template base. Students duplicate it into their own workspace.
- **Stuck? entries:** the `<section class="stuck-group" data-group="…">` blocks in the
  drawer. `data-group` matches a step id (`setup-1`…`setup-4`, `db`, `skills`,
  `company`, `person`, `capture`, `build`), so the drawer opens at the right place.
- **House rules:** `<ol id="house-rules">` in step 1. The drawer copies them automatically.
- **Draft notes for facilitators:** `<div class="draft-note">`. Hidden from students
  unless `?draft=1`.
- **Steps list:** if you add, remove or rename a step id, update `STEPS` (or `BRANCHES`) in
  `js/app.js`, `MAIN_STEPS` (or `BRANCH_STEPS`) in `lib/store.js`, and `TITLES`/`NUM`/`COLOR` in `instructor.html`.

## Skills

`skills/` is a copy of `../Workshop Materials/skills/<skill>/` (SKILL.md and crm-config.txt).
The zip generator copies SKILL.md byte for byte and fills only the `Base URL:` and
`Base ID:` lines of crm-config.txt. It also swaps the "Replace appXXXXXXXXXXXXXX…"
comment for a "Filled in by the AI@GSB workshop site" line. The time zone stays
America/Los_Angeles from the template.

After changing a skill in Workshop Materials:

```bash
npm run sync-skills && npm run check-skills && npm run test-zip
```

Then commit and push. Step 4's anatomy visual and step 5's "label it yourself"
read the live SKILL.md, so they update automatically as long as the `## ` section
headings stay the same.

## Limits

Same caps as Workshop 1, in `lib/store.js`: 300 students per room, 60-character
names, 120-character emails, 2,000-character feedback comments, 30-day retention.
