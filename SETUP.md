# ChitraFrame — Setup Guide

Everything you need to configure once, before the app can run end-to-end.
Order matters — do each section top to bottom.

---

## 0. Prerequisites

- Node 20+ and `bun` (or `pnpm`)
- A GitHub repo containing this code
- Accounts (all free tier is fine to start): Supabase · Cloudinary · Razorpay · Brevo · Resend · Shiprocket · Cloudflare · (optional) OpenAI/OpenRouter

---

## 1. Supabase (your own project)

1. Create a project at supabase.com. Save the DB password shown once at creation — you'll need it for the nightly backup.
2. **Project Settings → API** → copy:
   - `Project URL` → `VITE_SUPABASE_URL` and `SUPABASE_URL`
   - `Project ID` → `VITE_SUPABASE_PROJECT_ID`
   - `anon` / `publishable` key → `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**server-side only, never commit**)
3. **SQL Editor** → run your 30-table schema (the one you pasted). Confirm all tables + enums exist.
4. **Bootstrap yourself as owner** — replace the email and run:
   ```sql
   INSERT INTO public.admin_users (email, role)
   VALUES ('you@example.com', 'owner')
   ON CONFLICT (email) DO UPDATE SET role = 'owner';
   ```
5. **Authentication → Providers** → enable Email (magic link). For Google: enable Google provider, paste OAuth client id + secret from Google Cloud Console, set the redirect URL Supabase shows in Google Console → Authorized redirect URIs.
6. **Authentication → URL Configuration** → set `Site URL` to your production domain and add `http://localhost:8080` under `Redirect URLs` for local dev.

---

## 2. Cloudinary (image hosting)

1. cloudinary.com → Dashboard → copy Cloud name, API Key, API Secret → env vars.
2. **Settings → Upload → Upload presets → Add**:
   - Name: `chitraframe_signed`
   - Signing mode: **Signed**
   - Folder: `chitraframe/products`
   - Save. This name is what the server passes to Cloudinary at upload time.
3. (Optional) Create a second unsigned preset `chitraframe_reviews` for customer review image uploads, folder `chitraframe/reviews`, with `Max file size 5MB` and `Allowed formats jpg,png,webp`.

---

## 3. Razorpay (payments)

1. razorpay.com → Dashboard → **Settings → API Keys → Generate Live Key** (or Test Key while developing). Copy Key ID + Secret.
2. **Settings → Webhooks → Add New Webhook**:
   - URL: `https://YOUR-DOMAIN/api/public/razorpay-webhook`
   - Secret: generate a strong random string → paste same value into `RAZORPAY_WEBHOOK_SECRET`
   - Active events: `payment.captured`, `payment.failed`, `refund.processed`
3. `VITE_RAZORPAY_KEY_ID` = same Key ID (it's public — used by the client checkout modal).

---

## 4. Shiprocket

1. shiprocket.in → sign up → **Settings → API → Configure** → note the API user email + password (you may create a dedicated API user — recommended).
2. **Settings → Pickup Addresses** → add your warehouse. The nickname you give it (e.g. `Primary`) is `SHIPROCKET_PICKUP_LOCATION`. Pincode goes into `SHIPROCKET_PICKUP_PINCODE`.
3. Rate card: log in and check your negotiated slabs (Settings → Billing → Rate card). We'll call Shiprocket's live serviceability API at checkout, so no rates need to be pasted here.

---

## 5. Email — Brevo (primary) + Resend (fallback)

**Brevo:**
1. brevo.com → **SMTP & API → API Keys → Generate a new API key** (v3). Copy → `BREVO_API_KEY`.
2. **Senders & IP → Senders** → add and verify `noreply@chitraframe.in` (or your from address).
3. **Domains** → add `chitraframe.in`, then add the SPF/DKIM DNS records Brevo shows to your DNS provider. Wait for green ticks.

**Resend:**
1. resend.com → **API Keys → Create API Key** → `RESEND_API_KEY`.
2. **Domains → Add domain** `chitraframe.in` → add the DNS records shown → verify.

Both providers now able to send from the same verified domain. The app tries Brevo first; on failure logs to `email_failures` and retries via Resend.

---

## 6. Cloudflare Pages (deploy)

1. Push repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick the repo.
3. Build settings:
   - Framework preset: **None**
   - Build command: `bun run build`
   - Build output directory: `dist`
   - Node version: `20`
4. **Settings → Environment variables** → add every variable from `.env.example` **except** the ones commented out at the bottom (those are for GitHub Actions only). Add them to both **Production** and **Preview** environments.
5. Trigger a deploy. Note your `*.pages.dev` URL.
6. Come back to Supabase → Authentication → URL Configuration → add your `pages.dev` URL and (later) your custom domain to Redirect URLs.
7. Come back to Razorpay webhook → update the URL to your live domain.

---

## 7. GitHub Actions — nightly DB backup to Cloudflare R2

1. Cloudflare dashboard → **R2 → Create bucket** `chitraframe-backups`.
2. **R2 → Manage R2 API Tokens → Create API Token** → scope: **Object Read & Write** on that bucket. Save Access Key ID + Secret Access Key + Account ID.
3. Supabase → **Project Settings → Database → Connection string → URI** (session mode, not pooler) → copy → this is `SUPABASE_DB_URL`. It contains your DB password.
4. GitHub → repo → **Settings → Secrets and variables → Actions → New repository secret** — add:
   - `SUPABASE_DB_URL`
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET` (value: `chitraframe-backups`)
5. The workflow file `.github/workflows/db-backup.yml` (added in Turn 10) runs `pg_dump` nightly, gzips, uploads to R2, prunes files older than 30 days.

---

## 8. Local development

```bash
cp .env.example .env
# fill in real values
bun install
bun run dev
```

App runs at `http://localhost:8080`. Sign in with the email you inserted into `admin_users` — the `/admin` route unlocks automatically because that email exists with `role='owner'`.

---

## 9. Verification checklist

- [ ] Home page loads products from your Supabase (not seed data).
- [ ] Signing in with `admin_users` email shows `/admin` in the nav; signing in with any other email does not.
- [ ] Uploading a product image lands in Cloudinary under `chitraframe/products/` and stores `cloudinary_id` + `image_url` in `product_images`.
- [ ] Test Razorpay checkout with test card `4111 1111 1111 1111` → webhook fires → order row `status` moves to `printing` and `payment_id` fills in.
- [ ] Placing an order emails the customer via Brevo (check `email_log.service='brevo'`) and emails you at `OWNER_ALERT_EMAIL`.
- [ ] Shiprocket sync flips `shiprocket_synced=true` and populates `shiprocket_order_id` + `awb_number` once you push the order.
- [ ] Nightly at ~02:00 UTC a new `chitraframe-YYYYMMDD.sql.gz` appears in the R2 bucket.

If anything above fails, check `error_log` table first — every server-side error is written there with a `ref_id` you can search by.