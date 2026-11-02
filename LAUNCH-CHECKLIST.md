# Scroll California launch checklist

## Domain / DNS (checked Nov 1 2026)
scrollcalifornia.com already points at this repo's GitHub Pages site (custom domain `scrollcalifornia.com`, HTTPS certificate approved through Jan 29 2027, HTTPS enforced, `www.` redirects). **No DNS change is needed.**
Keep the `CNAME` file in the repo root. If the domain ever stops resolving, the records GitHub expects are:
- Apex `scrollcalifornia.com`: four A records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (optional AAAA `2606:50c0:8000::153` ... `8003::153`)
- `www`: CNAME to `mdeveloper310.github.io`
- Then GitHub repo > Settings > Pages > Custom domain = `scrollcalifornia.com`, tick "Enforce HTTPS".

## Google Search Console (Carlos, about 15 minutes, needs his Google account)
1. Go to https://search.google.com/search-console and sign in with the Google account that should own the site.
2. **Add property > Domain** > type `scrollcalifornia.com` > Continue.
3. Google shows a TXT record (`google-site-verification=...`). Add it at the domain registrar's DNS settings (type TXT, host `@`). Don't touch the A/CNAME records. Back in Search Console click **Verify** (it can take a few minutes to an hour).
   *Alternative without DNS:* add a **URL-prefix** property `https://scrollcalifornia.com/`, choose "HTML tag", and send the `<meta name="google-site-verification" ...>` line to whoever maintains the site to paste into `head()` in `_build/build.py`, rebuild and push.
4. **Sitemaps** (left menu) > enter `sitemap.xml` > Submit. It lists 22 pages, including 6 video pages with video metadata.
5. **URL Inspection** > paste `https://scrollcalifornia.com/` > **Request indexing**. Repeat for `/restaurants/`, `/places/fogao-gaucho-vacaville/`, `/cities/vacaville/`.
6. After 3-7 days check **Pages** (indexing report) and **Videos** report. Expect "Discovered, not indexed" at first; that's normal for a new site.
7. Optional: Bing Webmaster Tools > "Import from Google Search Console" (one click), which also covers DuckDuckGo/Yahoo.
8. Google Business Profile is per business, not needed for this site.

## Decisions only Carlos can make
- [ ] **Launch go.** The rebuild is live and set to `index,follow`. To hide it from Google again, set `ROBOTS = "noindex,nofollow"` in `_build/build.py`, rebuild, push.
- [ ] **Client permission.** Confirm Omni San Francisco, Hilton Garden Inn Fairfield and Fogão Gaúcho are OK with their Reels footage being featured on Scroll California (pages say "paid client work" for transparency).
- [ ] **Flambé clip venue.** The Aug 19 bananas-foster clip is shown with no venue name. Tell us the restaurant (Mäksē in Vacaville?) to give it a place page, or pull it.
- [ ] **Sponsor prices.** Advertise page says "founding sponsor pricing, ask us" with no dollar amounts. Add prices where marked `PRICING PLACEHOLDER`.
- [ ] **Stripe Payment Link** for packages (`stripeLink` in assets/config.js).
- [ ] **Tracking endpoint** (`trackEndpoint`): pick a collector (Plausible/Umami/Cloudflare Worker/Supabase function). Needed before quoting any audience numbers to sponsors.
- [ ] **Newsletter tool** (beehiiv / Buttondown / ConvertKit). Name it "Scroll California", not the old `reelcalifornia` publication. Set `newsletterEndpoint`.
- [ ] **Form relay test.** Send one test on /submit/ and confirm it reaches the inbox (FormSubmit relay inherited from the old site).
- [ ] **Lawyer review** of /privacy/ and /terms/ (plain-language drafts).
- [ ] **More footage.** Each new shoot = one video entry in `_build/content.json`. City pages with one place are thin; 3+ places per city is the goal before promoting a city.

## v2: visitor uploads (do in this order)
- [ ] Merge branch `v2-uploads` into `main` (site keeps working in demo mode until the next steps).
- [ ] Follow `DEPLOY-BACKEND.md` steps 1–6 (Supabase free project, schema, Google sign-in, config.js, GitHub secrets, admin).
- [ ] Run the end-to-end test in DEPLOY-BACKEND.md step 7.
- [ ] Register a DMCA agent ($6) and fill in `/dmca/`. Have a lawyer review terms/privacy/guidelines.
- [ ] Check the review queue at least daily; reply to reports and claims.
- [ ] Before ~200 published uploads (GitHub Pages 1 GB limit), move `/media/ugc/` to a CDN or object storage.
