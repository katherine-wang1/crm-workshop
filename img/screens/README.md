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
| **0.3-a.png** ✓ | 0.3 | Customize → Connectors → Discover → search "Airtable" |
| **0.3-ab.png** ✓ | 0.3 | "Finish connecting a connector?" page → Continue connecting |
| **0.3-b.png** ✓ | 0.3 | Airtable's permission screen: Custom access, the base duplicated in 0.2 selected |
| **0.3-z.png** ✓ | 0.3 | Claude asks to use List Airtable bases → Always allow |
| **0.3-d.png** ✓ | 0.3 | A good result: one base, the student's copy, in the list |
| **0.3-tools-a.png** ✓ | 0.3 | Customize → Connectors → Airtable, Tool permissions expanded: each row is a tool, three icons per row |
| **0.3-tools-b.png** ✓ | 0.3 | Both sections collapsed: Read-only 25, Write/delete 21 ("46 tools") |
| **0.3-tools-c.png** ✓ | 0.3 | Group dropdown open: Always allow / Needs approval / Blocked / Custom |
| **claude-customize-skills.png** ✓ | Upload steps (3–5), Step 6 | Kate's annotated Customize → Skills page: Yours / Discover, + Add menu |
| claude-skill-overview.png (unused) | – | No longer shown on the site (2026-10-06: Claude screenshots removed from Step 3's Look inside). Kept for reference |
| claude-skill-contents.png (unused) | – | No longer shown on the site (2026-10-06: Claude screenshots removed from Step 3's Look inside). Kept for reference |
| **3-0.png** ✓ | Step 3 | Look inside it in Claude: crm-capture-convo's Contents tab with SKILL.md and crm-config.txt boxed |
| **3-a.png** ✓ | Step 3 | Method 2: typing /crm-co in the message box, crm-company listed |
| **3-b.png** ✓ | Step 3 | The new company (Stripe) in Airtable's Companies table |
| **4-a.png** ✓ | Step 4 | Maya's People record: Cedar Labs link, Conversation scheduled, coffee Next action |
| **edit-capture-convo.png** ✓ | Step 5 | crm-capture-convo's Contents tab with the Edit button boxed (students edit My process by hand) |

✓ = already uploaded. Steps are numbered as on the site after the 2026-10-06 feedback round
(2026-10-07: 0.3-c and 0.3-e slots removed; 0.3-ab and 0.3-z added. Earlier 2026-10-07: old "workspace" and "Prepare Claude" steps removed; setup is now 0.1 account, 0.2 duplicate base, 0.3 connect Airtable, 0.4 optional student plan. What you're building first, then 0 Setup, 1 Database … 7 Next workflow).

Slots marked "new slot" weren't in the outline; delete the `<figure class="shot">`
in `index.html` if you don't want one. Screenshots open full size when clicked.
