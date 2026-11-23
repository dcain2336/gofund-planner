# GoFund Planner

**Missions-trip fundraising & budget planner for small churches. $39 one-time, no subscription.**

Small churches run missions-trip fundraising on spreadsheets and guesswork. GoFund Planner is one
simple tool that does the whole job:

- **Per-student fundraising tracker** — goal vs. raised, donor list, progress bars.
- **Trip budget builder** — flights, lodging, food, insurance, contingency; per-person items multiply
  by headcount automatically, and the app tells you whether fundraising covers the budget.
- **Shareable student page** — every student gets a public fundraising link that works with no
  account and no server (the totals travel in the link itself).
- **Board report (PDF)** — one-click printout for the missions-team meeting: every student, every
  budget line, covered-or-short in one line.

Built for the [Ship or Die $100K Hackathon](https://ship-or-die.com/100k-hackathon) (Nov 16 – Dec 16,
2026). Started from zero on Nov 23, 2026 — brand-new code, brand-new repo.

## Try it

Live: **https://gofund-planner.pages.dev** (or run it locally — see below)

Click **Load demo trip** to see a sample trip (NextGen Missions — Guatemala 2027, 4 students, 7
budget lines). All demo figures are labeled demo. Your real data stays in your browser — nothing is
uploaded to any server.

## Run it yourself (5-minute clean-clone test)

```bash
git clone https://github.com/dcain2336/gofund-planner.git
cd gofund-planner
# No build step, no dependencies. Serve the folder any way you like:
python3 -m http.server 8000
# then open http://localhost:8000
```

Or just open `index.html` directly in a browser — everything works from a file, except the share
links need an `http(s)` origin to copy cleanly.

Verified Nov 23, 2026: fresh clone, `python3 -m http.server`, all four features exercised
(add student + donation, add budget line, copy share link and open it in a private window, print
the board report). No console errors.

## Buy — $39 one-time

Free version: 1 trip, up to 3 students, everything else included. The $39 license unlocks
unlimited students and trips, forever, no renewal.

1. Click **$39 one-time — Buy** in the app (Stripe checkout).
2. After paying you get a license code by email (`GFP-XXXX-XXXX`).
3. Click **Enter license code** in the app, paste your email + code, done.

Refunds: email arc.agent.ops@gmail.com within 14 days, no questions asked.

## How it works (for the curious)

- **Stack:** plain HTML + CSS + vanilla JS. No framework, no build, no database, no tracking
  beyond the Ship or Die traffic tracker (see below).
- **Storage:** `localStorage` in your browser. Export/import JSON any time from Share & export.
- **Share links:** a student's public totals are base64url-encoded JSON in the link hash
  (`#s=...`). Anyone opening the link sees a read-only page rendered from the link itself.
  Donor names are NOT included in share links — only the student's name, trip, goal, amount raised,
  and supporter count.
- **PDF:** the board report is a print stylesheet — your browser's Print → Save as PDF.
- **License check:** the code is a hash of the buyer's email (`tools/make-license.js` mints them).
  See Limitations — this is an honor-system check in the MVP.

## Ship or Die verification

- **Traffic tracker:** installed in `index.html` (snippet slot at the top of `<head>`) before any
  traffic was driven to the site.
- **Revenue:** all payments run through Stripe, connected to TrustMRR from day one
  (see `docs/CONNECT-CHECKLIST.md`). Profit is revenue minus refunds, chargebacks, fees, and ad
  spend — ad spend is $0.
- **History:** this repo was created Nov 23, 2026, after the contest started (Nov 16). Every commit
  is public.

## Limitations (honest)

1. **Data lives in one browser.** There is no account and no cloud sync — if you clear site data
   without exporting, your trip is gone. Export JSON regularly; cloud sync is the first post-contest
   upgrade.
2. **The license check is client-side.** A determined user could read `app.js`, see the hash, and
   mint their own code. Real buyers in churches pay because the tool is worth $39 and the maker
   answers email — but server-side verification is a planned upgrade, not a current feature.
3. **No online donations in the app.** Donations are logged by hand (cash, check, or whatever the
   church already uses). In-app card donations via Stripe are a planned upgrade.
4. **Share links carry the totals, not live data.** If a student gets a new donation, you must
   copy a fresh link — the old one shows the old total. Live links need a server; see #1.

## Numbers (real, from the demo — labeled)

Demo trip, seeded Nov 23, 2026: 4 students, goals $1,850 each ($7,400 total), $1,480 raised
(20.0%), 7 budget lines totaling $7,304 ($1,826 per person at 4 travelers, 10% contingency
included). Reconciliation: goals cover the budget with $96 to spare — the app says so on screen.
These are demo figures, not sales.

## License

MIT — see `LICENSE`. Built by David Scott Cain (Cape Carteret Baptist Church NextGen Missions).
