# CPWT Daily Devotion

Posts a daily Bible verse image to the church Facebook Page and Instagram, after you approve it the evening before.

**How a day works**

1. **Evening before (e.g. 7 pm):** the app makes tomorrow's image from your spreadsheet and sends it to Telegram with **Approve**, **Regenerate** and **Skip** buttons.
2. **You approve**, either in Telegram or in the dashboard. You can also edit the verse, caption or colour theme in the dashboard.
3. **Posting time (e.g. 6 am):** if approved, it posts to Facebook and Instagram at the same moment and messages you the links. If not approved, nothing is posted.

**What runs where (all free tiers)**

| Piece | Service | What it does |
| --- | --- | --- |
| Dashboard, Telegram bot, posting | Vercel | `app/`, `lib/` |
| Database | Neon (Postgres) | The schedule and each day's status |
| Image storage | Vercel Blob | Finished JPEGs (Instagram needs a public link) |
| Image drawing | GitHub Actions | `render/` draws the image in a real browser so Tamil text renders correctly |
| Daily timer | cron-job.org | Calls the app at the evening and posting times |

## One-time setup

Follow these in order. Keep a note of every value marked **→ save**; they go into Vercel in step 6.

### 1. Database (Neon)
1. Sign up at [neon.tech](https://neon.tech) and create a project (region: Sydney, or the closest).
2. Copy the connection string. **→ save as `DATABASE_URL`**

### 2. Telegram bot
1. In Telegram, message **@BotFather**, send `/newbot`, and follow the prompts.
2. Copy the token it gives you. **→ save as `TELEGRAM_BOT_TOKEN`**
3. Make up a long random password (letters and numbers only). **→ save as `TELEGRAM_WEBHOOK_SECRET`**

### 3. Facebook Page and Instagram
You need a Facebook Page you are admin of, with an Instagram **Business or Creator** account linked to it (Instagram app → Settings → Account type, then link it from the Page settings).

1. Go to [developers.facebook.com](https://developers.facebook.com), create an app (type **Business**), and add the **Facebook Login for Business** and **Instagram** products.
2. Open the **Graph API Explorer**, choose your app, and add the permissions `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`, `business_management`. Click **Generate Access Token** and allow access to your Page and Instagram account.
3. Turn that into a long-lived token with the **Access Token Debugger** (“Extend Access Token”).
4. In the Explorer, with the long-lived token, request `me/accounts`. Copy your Page's `id` **→ save as `FACEBOOK_PAGE_ID`** and its `access_token` **→ save as `FACEBOOK_PAGE_TOKEN`** (this Page token does not expire).
5. Request `<page id>?fields=instagram_business_account` and copy the id inside. **→ save as `INSTAGRAM_USER_ID`**

### 4. GitHub token (lets the app start the image drawing)
1. GitHub → Settings → Developer settings → **Fine-grained tokens** → Generate new token.
2. Repository access: only `CPWT_Daily_Devotions`. Permissions: **Actions: Read and write**. Choose the longest expiry (and set a reminder to renew it).
3. **→ save as `GITHUB_TOKEN`**

### 5. Passwords to make up
- One for cron-job.org and setup calls. **→ save as `CRON_SECRET`**
- One for GitHub Actions to send images back. **→ save as `RENDER_SECRET`**
- One to sign dashboard logins. **→ save as `SESSION_SECRET`**
- The password you'll use to log in to the dashboard. **→ save as `DASHBOARD_PASSWORD`**

### 6. Deploy on Vercel
1. Sign up at [vercel.com](https://vercel.com) with GitHub, click **Add New → Project**, and import `CPWT_Daily_Devotions`.
2. Before deploying, open **Environment Variables** and add everything you saved, plus:
   - `APP_URL`: your Vercel address, e.g. `https://cpwt-daily-devotions.vercel.app` (you can fix it after the first deploy)
   - `CHURCH_NAME` (optional): defaults to `Citipointe West Tamil`
   - `TIMEZONE` (optional): defaults to `Australia/Brisbane`
   - `DEFAULT_HASHTAGS` (optional): defaults to `#CPWT #DailyDevotion #BibleVerse`
   - `TELEGRAM_CHAT_IDS`: leave empty for now
3. Deploy. Then go to **Storage → Create → Blob**, and connect it to the project (this adds `BLOB_READ_WRITE_TOKEN` automatically). Redeploy.

### 7. GitHub Actions secrets
In this repo: **Settings → Secrets and variables → Actions → New repository secret**:
- `APP_URL`: same as in Vercel
- `RENDER_SECRET`: same as in Vercel

### 8. Connect everything
1. Open `https://<your-app>/api/setup?key=<CRON_SECRET>` in a browser. It should say `database: ok` and that the Telegram webhook is set.
2. Send `/start` to your bot in Telegram. It replies with your chat id.
3. Put that number in Vercel as `TELEGRAM_CHAT_IDS` (several people: separate with commas; the first one receives the previews) and redeploy.

### 9. Daily timer (cron-job.org)
Sign up at [cron-job.org](https://cron-job.org) and create two jobs, both with timezone **Australia/Brisbane**:

| Job | URL | When |
| --- | --- | --- |
| Prepare tomorrow | `https://<your-app>/api/cron/prepare?key=<CRON_SECRET>` | Every day, 7:00 pm |
| Post today | `https://<your-app>/api/cron/publish?key=<CRON_SECRET>` | Every day, 6:00 am |

Change the times to whatever suits. The posting job posts only days that were approved.

### 10. Try it
1. Log in to the dashboard and upload your spreadsheet (there's a template on the upload page).
2. Open a day and press **Make image**. About two minutes later the preview appears there and in Telegram.
3. Use **Post now** on a test day once to confirm Facebook and Instagram both work.

## Spreadsheet format

First row is the headers. Only **Date** and one verse column are required.

| Date | Tamil Verse | Tamil Reference | English Verse | English Reference | Caption | Theme | Background |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 01/11/2026 | கர்த்தர் என் மேய்ப்பராயிருக்கிறார்… | சங்கீதம் 23:1 | The Lord is my shepherd… | Psalm 23:1 | | | |

- Dates can be Excel dates, `01/11/2026` (day first) or `2026-11-01`.
- **Theme**: `wine`, `maroon`, `cream`, or `photo` (uses the Background link). Empty means it rotates daily.
- **Caption**: the text of the post. Empty means the verse, reference, church name and hashtags.
- Uploading again updates changed days. Days already posted are never changed.

## Church logo

Put a PNG of the logo (transparent background, light colours for the dark footer) at `render/assets/logo.png`, and it appears in the footer next to the church name.

## Phase 2

WhatsApp approvals through the WhatsApp Business Cloud API.

## Developing

```bash
npm install
npm run dev                                  # dashboard at http://localhost:3000 (needs the env vars in .env.local)
cd render && npm install && npx playwright install chromium
node render.mjs --payload '{"date":"2026-11-01","churchName":"Citipointe West Tamil","verseTamil":"…","referenceTamil":"…"}' --out test.jpg
```
