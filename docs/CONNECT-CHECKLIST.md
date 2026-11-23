# GoFund Planner — connect checklist (Scott's taps)

Do these in order, BEFORE driving any traffic. Nothing here needs a password in chat —
each step happens in the service's own dashboard, signed in as you.

## 0. What is already done (Nov 23, 2026)

- [x] Ship or Die registration: rules read in full (clean — no gov/military exclusion),
      account David Scott Cain / arc.agent.ops@gmail.com, rules accepted, profile complete.
- [x] GitHub repo: https://github.com/dcain2336/gofund-planner (public, created Nov 23).
- [x] App deployed: https://gofund-planner.pages.dev
- [x] Traffic tracker: snippet installed in `index.html` `<head>` (Nov 23) — verify with
      "Check installation" on the Ship or Die dashboard after the redeploy.

## 1. Stripe — create the $19.99 Payment Link (~10 min)

1. Sign in to https://dashboard.stripe.com (use the existing Stripe account; create one if
   needed — free, no monthly fee).
2. Products → Add product: name `GoFund Planner — lifetime license`, price $19.99 USD, one-time.
3. Create a **Payment Link** for that product. Copy the URL (looks like
   `https://buy.stripe.com/xxxxxxxxxxxxxx`).
4. Open `app.js`, set `STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/…'` at the top,
   commit + push. The Buy button goes live on the next Pages deploy (automatic on push
   if the repo is connected, otherwise re-run the deploy script).
5. Do a test purchase yourself with Stripe's test card first (4242 4242 4242 4242), then
   switch the link to live mode. Never put a live secret key in the repo — Payment Links
   need no keys at all.

## 2. TrustMRR — connect Stripe so revenue counts (~10 min)

Profit only counts if it flows through a TrustMRR-connected account from day one.

1. Go to https://trustmrr.com → **Add startup**.
2. In the Stripe Dashboard: Developers → API keys → **Create restricted key**. Give it
   read-only access to: Charges, Subscriptions, Account information. (TrustMRR accepts
   only restricted `rk_live_` keys — they cannot charge anyone or change anything.)
3. Paste the restricted key into TrustMRR and save. TrustMRR syncs hourly and builds the
   public profile; the leaderboard picks it up from there.
4. Confirm the GoFund Planner listing shows up on TrustMRR before announcing the launch.

## 3. Ship or Die traffic tracker — installed Nov 23 (verify it)

1. The snippet is already in `index.html` (top of `<head>`), installed Nov 23 and deployed.
2. Open the Ship or Die dashboard: https://www.ship-or-die.com/100k-hackathon/dashboard
   and run "Check installation" — traffic should show connected.
3. Do this BEFORE posting the link anywhere — untracked visits don't count.

## 4. Launch — distribution (the part that makes profit real)

1. Email the app link to 10–20 churches you personally know — CCBC first, then the NC
   Baptist / NextGen contacts. One short email each: what it does, $19.99, demo trip link.
2. Post the demo in the church-leader spaces you already belong to (no new accounts, no ads).
3. Record a 60-second phone demo video (screen + voice) and link it from the repo README.
4. $0 ad spend — ad spend subtracts from profit, and the channel is personal anyway.

## 5. After the first sale

1. Buyer pays via the Stripe Payment Link → Stripe emails you the receipt with their email.
2. Mint their code: `node tools/make-license.js buyer@email.com` → email them the code.
3. They paste email + code in the app → unlocked. (Honor-system check — see README
   Limitations; server verification is a post-contest upgrade.)
4. Reconcile weekly in TrustMRR: revenue − refunds − chargebacks − fees − $0 ad spend.

## If anything here is blocked

- Stripe wants ID verification: that's a you-step in the Stripe dashboard; the app works
  unlicensed meanwhile (free version, 3 students).
- TrustMRR rejects the key: it must be a *restricted* `rk_live_` key with read-only
  Charges/Subscriptions/Account — a full secret key will be refused.
- Tracker snippet missing from the dashboard: ask in the Ship or Die Discord; do not drive
  traffic until it is installed.
