# Screenshot slots

Every `[SCREENSHOT x]` on the site is a slot that looks for `img/screens/<x>.png`
(then `.jpg`, then `.webp`). Drop a file with that exact name in this folder and
it appears on the site. Until then, the slot shows a dashed placeholder with its
label and description.

| File name | Where | What it shows |
|---|---|---|
| 0.1-a.png | 0.1 | Sign-up page, email field and sign-up button highlighted |
| 0.1-b.png | 0.1 | The confirmation email and the button to click |
| 0.1-c.png | 0.1 | Airtable home page after first sign-in |
| 0.2-a.png | 0.2 | Left sidebar with a workspace highlighted |
| 0.2-b.png | 0.2 | Where "Add a workspace" is |
| 0.2-c.png | 0.2 | Where to see your role on the workspace (Owner) |
| 0.3-a.png | 0.3 | The template page, Copy base button highlighted |
| 0.3-b.png | 0.3 | The destination picker with your workspace selected |
| 0.3-c.png | 0.3 | Your copy, three tabs highlighted |
| 0.3-d.png | 0.3 | Address bar with the Base URL highlighted |
| 0.4-a.png | 0.4 | Settings page, code execution toggle highlighted |
| 0.4-b.png | 0.4 | Settings page, skills toggle highlighted (if separate) |
| 0.4-c.png | 0.4 | Customize → Skills → New skill → Upload Skill |
| 0.5-a.png | 0.5 | Connectors page, Airtable highlighted |
| 0.5-b.png | 0.5 | The Connect button |
| 0.5-c.png | 0.5 | Airtable's permission screen, copied base selected |
| 0.5-d.png | 0.5 | The final "Grant access" / allow button |
| 0.5-e.png | 0.5 | A good result: your copied base in the list |
| 0.5-f.png | 0.5 | Where to reopen the connector's access settings |
| 2-a.png | Step 2 | An expanded People record, Company link highlighted (new slot) |
| 3-a.png | Step 3 | Customize in the left sidebar |
| 3-b.png | Step 3 | Skills tab |
| 3-c.png | Step 3 | New skill → Upload Skill |
| 3-d.png | Step 3 | File picker with the zip |
| 3-e.png | Step 3 | The installed skill in the list |
| 3-f.png | Step 3 | Typing /crm in the message box (new slot) |
| 4-a.png | Step 4 | The new company in Airtable (new slot) |
| 5-a.png | Step 5 | Maya's record with the Company link (new slot) |
| 6-a.png | Step 6 | Claude's preview ending in NOT SAVED YET. CONFIRM? (new slot) |
| 6-b.png | Step 6 | Edit with Claude on an installed skill (new slot) |
| 7-a.png | Step 7 | Where to start a new skill with the skill builder (new slot) |

Slots marked "new slot" weren't in the outline; delete the `<figure class="shot">`
in `index.html` if you don't want one. Screenshots open full size when clicked.
