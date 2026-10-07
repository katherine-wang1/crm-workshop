# Screenshot slots

Every `[SCREENSHOT x]` on the site is a slot that looks for `img/screens/<x>.png`
(then `.jpg`, then `.webp`). Drop a file with that exact name in this folder and
it appears on the site. Until then, the slot shows a dashed placeholder with its
label and description.

| File name | Where | What it shows |
|---|---|---|
| **0.1-a.png** ✓ | 0.1 | Sign-up page: Continue with Google, log in with @stanford.edu |
| **0.1-c.png** ✓ | 0.1 | The page Airtable opens after sign-up (Omni onboarding; "you don't need to touch this") |
| **0.2-a.png** ✓ | 0.2 | Dropdown arrow → ··· menu → Duplicate base |
| **0.2-b.png** ✓ | 0.2 | Duplicate dialog, your workspace selected, Duplicate base button |
| **0.2-c.png** ✓ | 0.2 | Successfully duplicated → Open base |
| **0.2-d.png** ✓ | 0.2 | Address bar: copy the Base URL |
| 0.3-a.png | 0.3 | Settings page, code execution toggle highlighted |
| 0.3-b.png | 0.3 | Settings page, skills toggle highlighted (if separate) |
| 0.4-a.png | 0.4 | Connectors page, Airtable highlighted |
| 0.4-b.png | 0.4 | The Connect button |
| 0.4-c.png | 0.4 | Airtable's permission screen, copied base selected |
| 0.4-d.png | 0.4 | The final "Grant access" / allow button |
| 0.4-e.png | 0.4 | A good result: your copied base in the list |
| 0.4-f.png | 0.4 | Where to reopen the connector's access settings |
| **claude-customize-skills.png** ✓ | 0.3, upload steps (3–5), Step 6 | Kate's annotated Customize → Skills page: Yours / Discover, + Add menu |
| claude-skill-overview.png (unused) | – | No longer shown on the site (2026-10-06: Claude screenshots removed from Step 3's Look inside). Kept for reference |
| claude-skill-contents.png (unused) | – | No longer shown on the site (2026-10-06: Claude screenshots removed from Step 3's Look inside). Kept for reference |
| 3-a.png | Step 3 | Typing /crm in the message box, with the CRM skills listed |
| 3-b.png | Step 3 | The new company in Airtable |
| 4-a.png | Step 4 | Maya's record with the Company link |
| 5-a.png | Step 5 | Claude's preview ending in NOT SAVED YET. CONFIRM? |
| **edit-capture-convo.png** ✓ | Step 5 | crm-capture-convo's Contents tab with the Edit button boxed (students edit My process by hand) |

✓ = already uploaded. Steps are numbered as on the site after the 2026-10-06 feedback round
(2026-10-07: old 0.2 "workspace" step removed, so 0.3–0.6 became 0.2–0.5. What you're building first, then 0 Setup, 1 Database … 7 Next workflow).

Slots marked "new slot" weren't in the outline; delete the `<figure class="shot">`
in `index.html` if you don't want one. Screenshots open full size when clicked.
