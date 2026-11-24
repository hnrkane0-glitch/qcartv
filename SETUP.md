# QuickCart — setup & reference (all notes in one file)

> Merged from: SETUP.md, BACKEND-GUIDE.md, LAUNCH-CHECKLIST.md, docs/LAUNCH-CHECKLIST.md, docs/CODE-MAP.md, docs/DATABASE.md, docs/MIGRATIONS.md, UPGRADE-NOTES.md, firebase-rules/ROLLBACK-open-rules.json


---

<!-- ══ SETUP.md ══ -->

# QuickCart — what YOU must do to go live

Everything in the code is built and tested. These are the steps only you can do (accounts, keys, domain).
Do them **in this order**. Each step says how to check it worked. Budget: 1–2 hours.

> After step 5, log in as **admin** and open **🩺 Launch check** in the menu — it shows ✅/❌ for everything below and tells you what is left.

---------------------------------------------------------------------------------------------------

## 1 · Put the project on Vercel
1. Unzip this project. Push the folder to a **GitHub** repository (private is fine).
2. Vercel → **Add New → Project** → pick that repository → **Deploy** (no build settings needed).
3. Open the site address Vercel gives you. You should see the landing page.

## 2 · Firebase (your database)
The app already points at the Firebase Realtime Database used before (`sneakerai-c96f0`).
1. Firebase console → that project → **Project settings → Service accounts → Database secrets** → **Show / Copy**.
2. You will paste it into Vercel as `FIREBASE_DB_SECRET` in step 5.
3. **Do not publish new rules yet** — that is step 6 (order matters).

*Using a different Firebase project?* Tell me — the database address appears in a few files and must be changed there.

## 3 · Email (password reset + Contact page)
1. Create a free account at **resend.com** → *Domains* → add your domain and add the DNS records it shows (at your domain registrar).
2. Resend → *API Keys* → create one → copy it (`RESEND_API_KEY`).
3. Choose a sender on that domain, e.g. `QuickCart <no-reply@yourdomain.com>` (`MAIL_FROM`).
Without this, password-reset emails and the Contact page email will not work (contact messages are still saved and visible in **Backend → Inbox**).

## 4 · Paystack (so customers can pay you)
1. Paystack dashboard → **Settings → API Keys & Webhooks**.
2. Copy the **live** secret key (`sk_live_…`) and public key (`pk_live_…`).
3. Test first with the `sk_test_…` / `pk_test_…` keys: pay for a plan with Paystack’s test card, then switch to live.
Note: customers’ own shop payments go to **their own** Paystack — that is configured by them in their dashboard.

## 5 · Environment variables in Vercel
Vercel → your project → **Settings → Environment Variables**. Add (see `.env.example` for the full list with notes):

| Name | What to put |
|---|---|
| `QC_ENC_KEY` | any random 32+ characters (never change it later) |
| `QC_ADMIN_PASSWORD` | a long password — this is your **admin** login |
| `FIREBASE_DB_SECRET` | the secret from step 2 |
| `APP_URL` | `https://yourdomain.com` |
| `RESEND_API_KEY`, `MAIL_FROM` | from step 3 |
| `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY` | from step 4 |

Then **Deployments → ⋯ → Redeploy**. Log in at `/login` with username **admin** and your `QC_ADMIN_PASSWORD`, open **🩺 Launch check**.
At this point everything should be ✅ **except** “Secure mode” and “Database rules are LOCKED”.

## 6 · Lock the database (VERY IMPORTANT — do not skip)
Until you do this, anyone who knows a store’s link can read/change that store’s data (customers, orders). Do it in this exact order:
1. Vercel → add `QC_SECURE_DB` = `1` → **Redeploy**.
2. Launch check → “Firebase accepts the access tokens this server issues” must be ✅. (If ❌: the database secret is wrong.)
3. Firebase console → **Realtime Database → Rules** → delete what’s there → paste the contents of **`database.rules.json`** → **Publish**.
4. Launch check again → “Database rules are LOCKED” ✅ and “One store cannot read another store’s data” ✅.
5. Test by hand (5 minutes): log in as a test owner → dashboard loads; open a store link in a private window → products show; place a test order; POS sale works.
6. **If anything breaks:** Firebase → Rules → paste **`firebase-rules/ROLLBACK-open-rules.json`** → Publish. Everything returns to how it was (but unlocked) while you investigate.
Owners who were already logged in simply log in again once.

## 7 · Your own domain
1. Vercel → **Settings → Domains** → add `yourdomain.com` and `www.yourdomain.com` → add the DNS records at your registrar.
2. Make sure `APP_URL` matches. Open `https://yourdomain.com/sitemap.xml` — it should list the pages.
3. *(Optional)* For automatic custom domains for your customers add `VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID` (see `.env.example`).

## 8 · Back up your data (the app no longer has a backup page)
Firebase → Realtime Database → **Backups** (scheduled daily backups, on the Blaze plan) — turn it on. Also use **Dashboard → Import · Edit · Export → Export** for a product export any time.

## 9 · Legal wording
`/terms` and `/privacy` are plain-language templates. Before taking money, have a Nigerian lawyer review them and add your **registered company name and address**. Edit them by changing `terms.html` / `privacy.html`.

## 10 · Your first-day test (do it yourself, as a customer)
1. Visit `/register` → create a store (tick the Terms box) → you land in the dashboard (trial: 14 days).
2. **Import** a few products (CSV) → open the store link → products show → add one to cart → place an order.
3. Open **POS** → ring up a cash sale.
4. Log out → **Forgot password** → you receive the email.
5. **My Plan → Pay / renew** with the Paystack **test** key → plan shows Active.
6. Use the **Contact** page → you receive the email and see it in **Backend → Inbox**.
7. In **Backend**, change something small, **Preview**, then **▶ Run** (see BACKEND-GUIDE.md).

---------------------------------------------------------------------------------------------------
Questions? Everything here can also be asked of me — just say which step.


---

<!-- ══ BACKEND-GUIDE.md ══ -->

# Your Backend — control the whole platform without code

Log in as **admin** → left menu → **🛠 Backend**. Only you see it.

## The idea (4 lines)
1. You change things → saved as a **draft** (nobody else sees it).
2. **👁 Preview** shows the draft in your own dashboard, as an owner on the plan you pick.
3. **▶ Run — push live** publishes it to **every owner, staff and visitor** within ~1 minute. No redeploy, no code.
4. Mistake? **History → ↶ Roll back** puts any earlier release back in one click.

The bar at the top always tells you: *“● 3 unpublished changes”* or *“✓ Live = Draft”*.

## What each tab does
| Tab | Use it to… |
|---|---|
| 🏠 Overview | see owners, paying, on trial, trials ending, estimated monthly revenue |
| 🧩 **Features** | turn any dashboard feature **on/off**, set a **minimum plan** (shows 🔒 + upgrade prompt), rename it, change its icon, add a **NEW / BETA / SOON** badge, reorder, roll out to **only X % of owners first**. Also switch parts of the POS (split payments, scanner…) |
| 💰 Plans & pricing | change plan **names, prices, features, “Most popular”**, hide a plan, and the **free-trial length**. Website, sign-up and payments all follow |
| 📣 Announcements | banners for owners / POS / website / stores, with colours, links, start–end dates, only for certain plans |
| 🎁 What’s new | post release notes: pop up once for every owner + a “What’s new” page in their menu |
| 📄 Pages | **build new pages** that appear in every owner’s menu (training videos, tips, support, offers): headings, text, pictures, buttons, YouTube/Vimeo, lists, FAQ, embeds |
| 🌐 Website | landing-page headline & buttons, top announcement bar, **real** numbers and **real** customer reviews, extra FAQ answers, support email, footer note |
| 🎨 Look & feel | main colour, second colour, corner roundness for every dashboard/POS |
| 🚦 Controls | **Maintenance mode**, **close/open sign-ups**, trial length |
| 👥 Owners | search owners; **+7 days trial**, **grant a plan**, **suspend/activate**, open their store |
| 📬 Inbox | messages from your Contact page; reply, mark read, delete |
| 🕘 History | every release, roll back, scheduled releases, activity log |

## Recipes
**Turn a feature off for everyone** → Features → switch **On** off → ▶ Run.
**Make a feature Pro-only** → Features → *Min plan* = Pro+ → ▶ Run. Starter owners see 🔒 and an “Upgrade” prompt.
**Test a new feature on 10 % of owners first** → Features → *Rollout %* = 10 → Run → later 100 → Run.
**Black-Friday banner** → Announcements → ＋ New → text, tick *Public website* and *Owner dashboard*, set Start/End → Preview → Run.
**Change a price** → Plans & pricing → type the new monthly price → Run. (Owners who already paid keep what they paid for; new payments and the website use the new price.)
**Announce an upgrade** → What’s new → ＋ Post a release note → Run. Every owner gets a pop-up once.
**Add a training page** → Pages → ＋ New page → add Heading, Video, Button blocks → Run.
**Planned downtime** → Controls → Maintenance **ON** (+ “back at 3 PM”) → Run (it asks you to confirm). When done: switch it off → Run. You are never locked out.
**Schedule a release for tonight** → press ▶ Run → **Schedule instead…** → pick the time.
**Undo anything** → History → ↶ Roll back.

## Good to know
* Your admin account always sees everything (tagged ON/OFF/🔒) so you can’t lock yourself out. Use **Preview** to see what owners see.
* Turning features off/locking them is a *display* control. It is meant for packaging and rollout, not as a security boundary.
* Pictures you upload in Pages/What’s new are small (auto-compressed). For big images paste a link.
* Real numbers only: the landing page no longer shows made-up stats or testimonials. Add true ones in **Website**.


---

<!-- ══ LAUNCH-CHECKLIST.md ══ -->

# Go / No-go checklist

**Must be ✅ before you charge customers**
- [ ] 🩺 Launch check shows no red ❌ (admin → Launch check)
- [ ] Database rules **locked** (SETUP.md step 6) and tested
- [ ] Paystack **live** keys in Vercel; a real small payment tested end to end
- [ ] Email working (password reset arrives; Contact page emails you)
- [ ] Your domain + `APP_URL` set; HTTPS works
- [ ] Terms & Privacy reviewed by a lawyer; company name added
- [ ] You changed `QC_ADMIN_PASSWORD` to something long and private
- [ ] Firebase scheduled backups on
- [ ] Landing page shows **no invented numbers/reviews** (Backend → Website: add only true ones)

**Nice to have**
- [ ] Custom-domain automation (`VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`)
- [ ] A **What’s new** post and a welcome **Page** (training video) built in the Backend
- [ ] Support email on the Website tab

**Known limits (be aware)**
- Product **cost price** is stored on the same record as the selling price, so a technical visitor can see it in a store’s product feed. Don’t rely on cost being secret.
- Shoppers’ stock deduction is allowed from the storefront (they can only *lower* stock, never raise it).
- Feature locks in the Backend are display controls, not security.


---

<!-- ══ docs/LAUNCH-CHECKLIST.md ══ -->

# Launch checklist

## A. Vercel environment variables (Project → Settings → Environment Variables)
| Name | Value | Why |
|---|---|---|
| `QC_ENC_KEY` | 40+ random characters | signs logins, encrypts payment keys — **never change after launch** |
| `QC_ADMIN_PASSWORD` | strong password | your `/backend` login (username `admin`) |
| `FIREBASE_DB_SECRET` | Firebase → Project settings → Service accounts → Database secrets | server access when rules are locked |
| `QC_SECURE_DB` | `1` | turns on locked rules |
| `ADMIN_EMAIL` | your email | new-lead alerts + ticket alerts |
| `RESEND_API_KEY` (or `BREVO_API_KEY`) + `MAIL_FROM` | from the email provider | sending mail. Verify your domain with them. |
| `APP_URL` | `https://yourdomain.com` | links in emails |
Redeploy after saving.

## B. Firebase
1. Realtime Database → Rules → paste `database.rules.json` → Publish.
2. Enable backups (see docs/DATABASE.md).

## C. First-day tests (do these yourself, in order)
1. Open `/signup`, submit a test lead → check **you receive the email** and see it in `/backend` → Leads. Click *Resend* on the welcome page → second email arrives.
2. In `/backend` → Migrations → run **2026-001** (Preview, then Run) if you already have customers.
3. Leads → Open → tick modules → **Register as client** → copy the login.
4. Log in at `/login` as that client → confirm only the ticked modules appear. Untick one in Clients → within 5 minutes it disappears.
5. Settings → Security: change the password; set a staff password; staff log in with Company ID = the owner's email.
6. HR → Stores & Outlets: add an outlet; create a cashier assigned to it; log in as the cashier → POS shows the outlet and cannot change it.
7. POS: sell, print the receipt on the real thermal printer (paper width in POS settings, margins None).
8. Turn Wi-Fi off in the POS → popup appears → sell → Wi-Fi on → sale uploads; Orders shows ⚡ OFFLINE.
9. Settings → Payments: add Monnify/Flutterwave keys in **test mode**, run a test card sale at the POS.
10. HR → Attendance Devices: add a machine (needs your physical device).
11. Phone check: open landing, signup, POS on a real phone.

## D. Things only you can do
* Create merchant accounts with Moniepoint (Monnify) / Flutterwave and test payments with their test cards.
* Test a real attendance machine (models differ; see HR → Attendance Devices for the bridge-script fallback).
* Get Terms/Privacy reviewed by a Nigerian lawyer (they were edited for the new sign-up model).
* Put your bank details on the platform invoices (note field when creating an invoice).
* Connect your domain in Vercel and add `https://yourdomain.com` to Firebase → Authentication allowed domains if you use it.


---

<!-- ══ docs/CODE-MAP.md ══ -->

# QuickCart — Code Map ("where do I go to change X?")

Every file starts with a banner comment listing its SECTIONS. Search for the heading text (e.g. `7 Rules editor`) and you land on the exact block.
To upgrade one feature, replace ONLY that file (or that section). Files never depend on each other's internals — they talk through `QS` (the shared helper) and the database.

## 1. Customer-facing pages
| What you want to change | File | Notes |
|---|---|---|
| Home page text, hero, sections | `landing.html` | Login modal + login code are at the bottom (`doLogin`, `doStaffLogin`) — don't delete |
| Sign-up form (lead capture) | `signup.html` | Sends `action:'register'` to `/api/auth` → creates a LEAD, not an account |
| "What happens next" page | `welcome.html` | Has the resend button (`action:'lead-resend'`) |
| Pricing page | `pricing.html` | Prices come from `assets/qc-catalog.js` — never edit prices here |
| Features / FAQ / How it works / Contact / Terms / Privacy | the `.html` of the same name | Nav + footer: `assets/site.js`. Colours/fonts: `assets/qc-site-theme.css` |
| Renewal page | `payment.html` | Plain page; no card form |
| **Fonts, colours, buttons, sidebar look (whole site)** | `assets/qc-theme.css` | Section 1 "TOKENS" controls everything |

## 2. Prices, modules & who sees what
| Need | File / section |
|---|---|
| Add a module / change a price / rename | `assets/qc-catalog.js` → `MODULES` (one entry each) |
| Quick-pick templates (Hotel, Clinic…) | `assets/qc-catalog.js` → `BUNDLES` |
| Annual discount, VAT | `assets/qc-catalog.js` → `ANNUAL_DISCOUNT`, `VAT` |
| Hide menus a customer didn't buy | `assets/qc-entitle.js` (reads `qc_modules`) |

## 3. Dashboard modules (each is one file; `QS.mount('panel', …)` at the bottom)
| Module | File | Tabs / sections |
|---|---|---|
| Shared helpers (database, tables, forms, audit log, panel mounting) | `assets/qc-suite.js` | `QS.db`, `QS.table`, `QS.mount`, `QS.log` |
| Accounting & Books | `assets/qc-books.js` | Ledger engine `ledger()`; tabs Overview · Journal · Books · Receivables · Payables · Expenses · Reports · Budgets · Assets · Setup |
| HR, attendance, payroll, outlets, activity log | `assets/qc-hr.js` | Staff form · Activity Log · Login Sessions · Attendance · Attendance Devices · Payroll · Stores & Outlets |
| Production, Advanced Inventory, Wholesale | `assets/qc-ops.js` | Section headings `PRODUCTION`, `ADVANCED INVENTORY`, `WHOLESALE & PRICING` |
| Customers, Loyalty, Marketing | `assets/qc-crm.js` | `CUSTOMERS`, `LOYALTY`, `MARKETING` |
| Services, Hotel, Hospital (+lab), Lounge & Bar | `assets/qc-verticals.js` | One section per vertical |
| Invoicing (11 document types) | `assets/qc-invoices.js` | Print template = section 3 |
| Security & Fraud | `assets/qc-security.js` | Rules = section 1, detection = section 2 |
| Help centre + tickets | `assets/qc-help.js` | Add articles in `ARTICLES` |
| Settings → Security (passwords), Payments (gateway keys), banners, limits | `assets/qc-settings.js` | |

## 4. Point of Sale
| Need | File |
|---|---|
| Filter drawer, price levels, coupons, flash sales, manager PIN, thermal receipt, offline popup/bar, session log, services in POS | `assets/pos-v60.js` (sections are commented) |
| Cart, checkout, original sale logic | `pos.html` (inline script) + `assets/pos-ext.js` |
| Product card UI | `_src/src/pos.jsx` (+ compiled `assets/pos.js`) |
| Online card payment | `pos.html` → `cardOnline()` → `/api/gateway` |
| Offline caching of the app itself | `sw.js` (bump `quickcart-vNN` when you add files) |

## 5. Server (Vercel functions in `/api`)
| File | Job |
|---|---|
| `auth.js` | Login, staff login, **sign-up leads**, passwords, staff accounts, tickets |
| `console.js` | Everything the Backend Console does (leads, clients, modules, invoices, migrations, DB move) — admin only |
| `gateway.js` | Card/transfer payments for each merchant (Monnify/Moniepoint, Flutterwave, Paystack) |
| `attendance.js` | Fingerprint/face machines (ZKTeco push) + webhook |
| `_qc.js` | Shared security helpers (tokens, encryption, rate limiting) |
| `_mail.js` | Email sending |
| `contact.js`, `forgot-password.js`, `reset-password.js` | As named |
| `terminal.js`, `paystack.js`, `webhook.js` | Older Paystack-era code, no longer used by the new flows (safe to delete once you've checked nothing links to them) |

## 6. Backend Console
`backend.html` (open `/backend`). Sections are commented: AUTH · API · OVERVIEW · LEADS · CLIENTS · INVOICES · TICKETS · ANNOUNCE · CATALOG · MIGRATIONS · DBMOVE · AUDIT · SECURITY.
Adding a migration: `api/console.js` → `MIGRATIONS` array (append only).

## 7. Database rules
`database.rules.json` — publish in Firebase console → Realtime Database → Rules.


---

<!-- ══ docs/DATABASE.md ══ -->

# How the database works

## What you use today: Firebase Realtime Database (Google)
* One Firebase project holds **all customers**. Each customer's data lives under their own branch: `users/<owner>/…` (products, orders, settings, hotel, hospital…).
* **Staff and the owner share the branch.** The server issues a signed token that says "this person belongs to owner X"; Firebase rules only allow access to branch X.
* **Audit trail** (staff activity + sessions) lives at `audit/<owner>/…`, *outside* the branch, with a rule that staff cannot read it. Activity entries can be added but never edited/deleted.
* **Platform-only data** (leads, client records/modules, invoices, tickets, console audit, encrypted payment keys) is under `users/user_*`, `leads`, `platform`, `tickets`, `devices`: locked to the server.
* A customer can be moved to **their own Firebase project** (Console → Database move). The shared database stays as a backup copy.

### Is Firebase the right choice?
| | Firebase RTDB (now) | Postgres (Supabase / Neon) |
|---|---|---|
| Speed to launch | ✅ already built | ❌ would need a rewrite of every module |
| Real-time screens | ✅ built in | needs extra work |
| Offline sync | ✅ we added our own queue | same |
| Reporting over millions of rows | ⚠️ weaker (no SQL joins) | ✅ best |
| Cost at small/medium scale | ✅ cheap | ✅ cheap |
**Recommendation:** launch on Firebase (it works and is tested). Plan to add Postgres only for heavy reporting once a single customer has > ~200k orders. Until then, move big customers to their own Firebase project.

### Must-do before real customers
1. Set `QC_SECURE_DB=1` and `FIREBASE_DB_SECRET` in Vercel, publish `database.rules.json`. Without this, rules may be open.
2. Turn on **daily automatic backups** in the Firebase console (Blaze plan) or schedule an export — the customer-side "Download backup" is only for customers.
3. Remember Realtime Database has a ~1 GB-per-database soft comfort zone; that is why "Move to own database" exists.


---

<!-- ══ docs/MIGRATIONS.md ══ -->

# Migrations — what they are and what to do

**Plain English:** when a new version of QuickCart changes *how data is stored*, customers who signed up on the old version still have data in the old shape. A migration is a small, safe script that converts the old data to the new shape. You press a button; it runs for all customers.

Open **Backend Console → Migrations**. Each card says what it changes.
1. **Preview** first — shows how many records would change. Nothing is modified.
2. **Run now** — does it and records the date. A migration never runs twice.

Shipped with this version:
| Migration | Why you need it |
|---|---|
| `2026-001-grandfather-modules` | Old customers have no module list. This gives them every module so nothing disappears; then trim each in Clients. **Run this first.** |
| `2026-002-normalise-usernames` | Fixes upper/lower-case login mismatches |
| `2026-003-move-audit` | Copies old staff activity/sessions into the owner-only audit area (originals kept) |
| `2026-004-order-source` | Tags old orders as POS/online so reports split correctly |
| `2026-005-default-outlet-settings` | Prepares settings nodes the new screens expect |

**Database move** (separate tool in the console) is a different thing: it copies one customer to their own Firebase project, verifies it, then switches them over.

Adding your own later: append an object to `MIGRATIONS` in `api/console.js` with a new `id`. Never edit an old one.


---

<!-- ══ UPGRADE-NOTES.md ══ -->

# QuickCart — upgrade 54 (launch build)

Start with **SETUP.md** (what you must do) and **BACKEND-GUIDE.md** (how to use your new Backend).

## NEW: 🛠 Backend (admin only)
No-code control center: Features (on/off, min plan, rename, badge, order, % rollout), Plans & pricing, Announcements, What’s new, custom Pages, Website content, Look & feel, Maintenance/sign-up switch, Owners, Inbox, History with rollback and scheduled releases. Draft → Preview → ▶ Run → live for everyone in ~1 minute.
Files: `api/platform.js`, `api/_platform.js`, `assets/backend.js` (admin UI), `assets/platform.js` (runtime loaded by dashboard/POS/store/website). Plans/trial/sign-up now come from the published config (`api/_plans.js`).

## Security (the big one)
* The database was fully open (anyone could read/change any store). Now: per-store access tokens (`QC_SECURE_DB=1`) + locked rules (`database.rules.json`; rollback copy in `firebase-rules/`). Shoppers can still browse, order and lower stock; nothing else.
* Login / staff login / register / forgot-password are rate-limited (brute-force lockout). Passwords ≥ 8. Terms must be accepted at sign-up.
* `/api/health` + **🩺 Launch check** page (admin) verify your whole setup, including that the rules really lock the database.
* Security headers in `vercel.json`.

## Fixed
* **Landing “image keeps growing”** — real cause: duplicate React keys in the live-sales feed. Fixed at the source (+ height clamp).
* **Banners from the Page Editor didn’t display** — the Page Editor had no banner/picture option. Added: top slider banner, banner strip, picture, gallery, video, reviews, contact block — with direct photo upload. (Store-builder banners already worked.)
* New sign-ups were sent to the old card page — now go to the dashboard.
* POS: card options, terminal-waiting, camera scanner and scan-confirmation screens were unstyled; empty-cart text was huge; Settings now solid and tidy.
* App icons / favicon / social image were missing (manifest pointed at files that didn’t exist) — added.
* Admin account moved to its own store (`users/admin`); old deal-site pages (store/submit/track-click) and their menu items removed.
* Landing page no longer shows invented stats (“₦2.4B”, “2,400+ stores”, “99.9% SLA”) or fake testimonials — add real ones in Backend → Website.

## Also in this build
Marketing pages (/features /demo /how-it-works /pricing /faq /contact /terms /privacy), contact form → your email + Backend inbox, Billing & Card and Backup removed (no card needed; trial starts instantly), **My Plan** page for owners, Import · Edit · Export (CSV, Excel, JSON, JSONL, XML, HTML, Markdown, TSV), coupon store dropdown, sitemap.xml / robots.txt.

## Tested (real headless Chrome against a copy of the deployment + fake secure Firebase)
Landing soak test (110 s), all marketing pages desktop+mobile, sign-up, all 22 dashboard panels, import/edit, banners from Page Editor, POS cash sale, staff login, 18 attacker probes against the locked rules, the whole Backend (edit → Run → owner/visitor/pricing/payments/sign-up see it; maintenance; rollback; preview; owners; inbox; POS switches).
**Not testable here:** the real Firebase rules engine, real Paystack, real email — that is why SETUP.md step 6 has Launch check + a rollback file.


---

<!-- ══ firebase-rules/ROLLBACK-open-rules.json ══ -->

## Emergency rollback: open Firebase rules

Paste this into Firebase → Realtime Database → Rules only if you must undo the locked rules quickly:

```json
{
  "rules": {
    "users": {
      ".indexOn": ["username", "email", "owner"],
      "$k": {
        ".read":  "!$k.matches(/^(user_|staff-)/)",
        ".write": "!$k.matches(/^(user_|staff-)/)"
      }
    },
    "billing":  { ".read": false, ".write": false },
    "payments": { ".read": false, ".write": false },
    "backups":  { ".read": false, ".write": false },
    "contact_messages": { ".read": false, ".write": false },
    "dbmap":    { ".read": true,  ".write": false },
    "$other":   { ".read": true,  ".write": true }
  }
}
```
