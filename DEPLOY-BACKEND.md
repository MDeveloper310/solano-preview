# Turning on live uploads: click-by-click

Everything here is on **free plans with no card**. Total time is about 30–40 minutes.
Until these steps are done, the site runs in **demo mode** (`assets/config.js` → `backend.mode: "demo"`):
uploads, reports, claims and the review queue work but stay in the visitor's own browser.

You will collect **5 values**. Keep them in a private note (not in the repo):

| # | Value | Where it comes from | Where it goes |
|---|---|---|---|
| A | Project URL `https://<ref>.supabase.co` | Supabase → Project Settings → Data API (or API Keys page) | `assets/config.js` → `supabaseUrl` **and** GitHub secret `SUPABASE_URL` |
| B | Publishable key `sb_publishable_…` | Supabase → Project Settings → API Keys | `assets/config.js` → `supabaseKey` (safe to be public) |
| C | Secret key `sb_secret_…` | Supabase → Project Settings → API Keys → Secret keys | GitHub secret `SUPABASE_SECRET_KEY` **only**. Never in any file. |
| D | Google Client ID `…apps.googleusercontent.com` | Google Cloud → Google Auth Platform → Clients | Supabase → Authentication → Sign In / Providers → Google |
| E | Google Client secret `GOCSPX-…` | same | same |

---

## 1. Create the Supabase project (free)

1. Go to https://supabase.com/dashboard/sign-up and sign up with Carlos's email (or "Continue with GitHub" using the account that owns the repo).
2. Confirm the email if asked.
3. **New organization**: name `Crenshaw Visuals`, type `Personal`, plan **Free – $0/month**. Click *Create organization*. (No card is asked for on Free. If a card form appears, stop.)
4. **New project**:
   - Name: `scroll-california`
   - Database password: click *Generate a password*, then save it in the private note. It isn't needed for the site.
   - Region: **West US (North California)** (`us-west-1`), or the closest US West option.
   - Leave "Enable Data API" on. Leave "Enable automatic RLS" on if offered.
   - Click *Create new project* and wait about 2 minutes until it shows "Project is ready".
5. Open **Project Settings (gear) → API Keys**.
   - Copy the **Publishable key** (`sb_publishable_…`). This is value **B**.
   - Under **Secret keys**, click *Create new secret key* if none exists, name it `github-publish`, then reveal and copy it. This is value **C**.
6. Open **Project Settings → Data API** (or the *Connect* button at the top) and copy the **Project URL**. This is value **A**.

> Don't reuse the old project `bxcutapfgowtydqlsruy` that the earlier site referenced. Use this new one.

## 2. Run the database schema

1. Left sidebar → **SQL Editor** → *New query*.
2. Open `backend/schema.sql` from the repo, copy **all** of it, and paste it in.
3. Click **Run**. Expected result: "Success. No rows returned." It's safe to run again.
4. Check it worked:
   - Left sidebar → **Table Editor** shows `admins, cities, claims, places, reports, videos`.
   - Left sidebar → **Storage** shows the bucket `uploads` marked *Private*.
5. **If the storage part errors** (for example "must be owner of table objects"), create the bucket by hand instead:
   1. Go to **Storage → New bucket**.
   2. Name it `uploads`, leave *Public bucket* **off**, turn on *Restrict file size* and set **50 MB**.
   3. Set *Allowed MIME types* to `video/mp4, video/quicktime, video/webm`, then click *Save*.
   4. Re-run only the `create policy … on storage.objects` lines from the bottom of schema.sql.

## 3. Google sign-in (free)

Uploaders sign in with Google. Supabase's built-in email only sends to project team members (2/hour), so email links won't work for the public without paid or custom SMTP and DNS changes.

1. Go to https://console.cloud.google.com/ and sign in with Carlos's Google account. Accept the terms. **Don't start a free trial and don't add billing; neither is needed.**
2. Click the project picker at the top → **New project**, name it `Scroll California`, then click *Create* and select it.
3. Open https://console.cloud.google.com/auth/overview → **Get started**:
   - App name: `Scroll California`
   - User support email: Carlos's email
   - Audience: **External**
   - Contact email: Carlos's email
   - Agree, then click *Create*.
4. **Branding** (left menu):
   - Application home page: `https://scrollcalifornia.com/`
   - Privacy policy: `https://scrollcalifornia.com/privacy/`
   - Terms of service: `https://scrollcalifornia.com/terms/`
   - Authorized domains: add `scrollcalifornia.com` (and `supabase.co` if Google accepts it; skip it if refused)
   - Click *Save*.
5. **Data Access** → *Add or remove scopes* → tick `.../auth/userinfo.email`, `.../auth/userinfo.profile` and `openid`, then *Update* and *Save*. These are non-sensitive scopes, so no Google review is needed.
6. **Audience** → *Publish app* → *Confirm* so any Google user can sign in. While it's in "Testing", only listed test users can.
7. **Clients** → *Create client*:
   - Application type: **Web application**, Name: `Supabase`
   - Authorized JavaScript origins: `https://scrollcalifornia.com`
   - Authorized redirect URIs: `https://<ref>.supabase.co/auth/v1/callback`. Use the Project URL from step 1.6 plus `/auth/v1/callback`. Supabase also shows this exact "Callback URL" on its Google provider page.
   - Click *Create*, then copy **Client ID** (value **D**) and **Client secret** (value **E**).
8. Back in Supabase, go to **Authentication → Sign In / Providers → Google**:
   - Turn on *Enable Sign in with Google*.
   - Paste the Client ID (D) and Client Secret (E).
   - Click *Save*.
9. Supabase → **Authentication → URL Configuration**:
   - Site URL: `https://scrollcalifornia.com`
   - Redirect URLs, click *Add URL* for each:
     - `https://scrollcalifornia.com/**`
     - `http://localhost:8000/**` (only for local testing; remove later)
   - Click *Save*.

## 4. Put the public values in the site config

Edit `assets/config.js`, in the `backend:` block:

```js
backend: {
  mode: "live",                                   // was "demo"
  supabaseUrl: "https://<ref>.supabase.co",       // value A
  supabaseKey: "sb_publishable_xxxxxxxxxxxxxxxx", // value B: publishable ONLY, never the secret key
  ...
```

Then run `python3 _build/build.py` (this updates the `?v=` cache-busters) and commit.

## 5. GitHub secrets for the publish job

1. Go to https://github.com/MDeveloper310/solano-preview/settings/secrets/actions and click **New repository secret**:
   - Name `SUPABASE_URL`, value **A**
   - Name `SUPABASE_SECRET_KEY`, value **C**
2. Go to https://github.com/MDeveloper310/solano-preview/settings/actions:
   - *Actions permissions*: "Allow all actions…"
   - *Workflow permissions*: **Read and write permissions**
   - Click *Save*.
3. The workflow `.github/workflows/publish-uploads.yml` runs hourly **only from the `main` branch**, after the v2 branch is merged. You can run it any time from **Actions → Publish approved uploads → Run workflow**.

## 6. Make yourself the admin

1. Open https://scrollcalifornia.com/admin/ and click **Continue with Google**.
2. The page says "Not an admin" and shows a SQL line with your user ID.
3. Copy that line into Supabase → **SQL Editor** and click **Run**:
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'CARLOS-GOOGLE-EMAIL';
   ```
4. Reload /admin/. You'll see the Uploads / Reports / Claims / Reviewed tabs.

## 7. End-to-end test (about 10 minutes)

1. On a phone, open `/upload/`, sign in with Google, and upload a 10–20 s vertical food clip.
   - Expected: "pending review".
   - Expected: Supabase → Table Editor → `videos` has the row with status `pending`, and Storage → `uploads/<user-id>/` has the file.
2. Open the same video's place or city page. It's **not** visible (nothing auto-publishes).
3. In `/admin/`, open the Uploads tab: the video plays.
   1. Try *Approve* without ticking the checklist; it's blocked.
   2. Tick the checklist and click *Approve*.
4. Click **Publish now**, then *Run workflow*. After about 2–4 minutes the run is green, and a commit "Publish approved uploads" appears. After about 1 minute GitHub Pages redeploys.
5. The clip is now in the feed, on `/cities/<city>/`, `/places/<place>/`, `/food/<dish>/`, at `/videos/<slug>/`, and in `sitemap.xml`. In Storage, the original has been deleted.
6. On the clip, click **Report**, pick a reason and send it. It appears in Admin → Reports. Click *Remove video*: the clip disappears from the feed immediately, and its files are deleted at the next publish run.
7. Open `/claim/`, submit a claim, and check that it appears in Admin → Claims.

## Limits to know (free plans)

- Supabase Free: 1 GB file storage, 5 GB egress, 500 MB database, 50 MB max file, and the project **pauses after 1 week of inactivity**. The hourly publish job queries it, which counts as activity. Originals are deleted after publishing, so storage stays small. https://supabase.com/pricing
- GitHub Pages: site ≤ 1 GB, about 100 GB/month soft bandwidth, about 10 builds/hour soft limit. A published clip is about 2–4 MB, so roughly 200 uploads fit before media should move to a CDN or object storage (for example Cloudflare R2). https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- Per uploader: 5 uploads / 24 h and 5 pending at once (database trigger). Reports: 10/hour per connection. Claims: 5/hour.

## Before you announce uploads (legal: not legal advice; have a lawyer review)

- **DMCA designated agent**: register at https://www.copyright.gov/dmca-directory/ (**$6**, renew every 3 years; fee source: https://www.copyright.gov/dmca-directory/faq.html). Then fill in the agent block on `/dmca/` (`_build/pages/dmca.html`). Without it, the copyright safe harbor for user uploads isn't available. This costs money, so it's Carlos's call.
- Review the draft `/terms/` (user-content license, 18+), `/privacy/` (Google sign-in, Supabase as processor, CCPA rights), `/guidelines/` and `/dmca/`.
- Music: clips are **muted on publish** unless the uploader ticks "keep original sound". When approving with sound on, listen for commercial music.
- Respond to reports quickly, especially privacy, minors and copyright reports.
