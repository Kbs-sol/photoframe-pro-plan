
## What you'll get

Two deliverables saved into this Lovable project's `/docs` folder so you can download/copy them — nothing rebuilt here, since you're keeping the Hono / Cloudflare / Supabase stack.

1. `docs/AUDIT.md` — prioritised audit of the PhotoFramePFS repo
2. `docs/DESIGNS/` — a starter SKU catalog of framed prints you can sell, with images + metadata-ready CSV for Supabase import

---

## Part 1 — Repo audit (what's wrong / what to improve)

Based on `system_literacy.md` v5.3, README, commit history, and known-issues table. Grouped by severity.

### Critical (fix before next ₹1 of ad spend)

- **No server-side cart/price validation.** `/api/checkout/create-order` trusts client-sent prices → attacker can buy a ₹1,699 XL for ₹1. Re-fetch every variant from Supabase server-side, recompute subtotal/shipping/COD fee, ignore client totals.
- **All 11 products are `is_placeholder:true` → Cloudinary 404s on PDPs.** Live site is effectively broken for buyers. Must upload real artwork (Part 2 below fixes this).
- **Admin password committed in `system_literacy.md`.** Rotate Supabase admin password, scrub git history (`git filter-repo`), enable 2FA, never commit credentials again.
- **`/api/admin/pricing` route missing → admin Pricing tab 404s.** Either build the route or remove the tab.
- **DB constraint trap: `product_variants_frame_type_check` only allows `'Direct Frame'`.** Frame finish is encoded in SKU suffix — undocumented landmine for anyone seeding data. Either drop the constraint and use `frame_type` properly, or rename the column to `frame_mount_type` and add a real `frame_finish` enum column.

### High

- **No rate limiting on `/api/checkout/*` or `/api/reviews`.** Add Cloudflare Turnstile on checkout + a KV-backed token-bucket (10 req/min/IP) on order creation and review submission.
- **CSP uses `unsafe-inline`** because of inline `onclick=` handlers across `app.js`. Migrate to `addEventListener` + event delegation, then add a per-request nonce in `pageShell`. Removes the biggest XSS surface.
- **Razorpay webhook verification only on the success callback, not via Razorpay's server webhook.** If a user closes the modal mid-payment but the charge succeeds, you never reconcile. Add `/api/webhooks/razorpay` with signature verification and an idempotent order-status update.
- **`saveCart` localStorage QuotaExceeded handling exists but cart is the only source of truth.** A logged-in user switching devices loses their cart. Persist cart server-side keyed by `user_id` (anon → on login, merge).

### Medium

- **Bundle bloat.** `dist/_worker.js` is ~386kB unminified; `vite build --minify false` is set. Turn minification on (saves ~40–60%) — Workers free plan has a 10MB limit but smaller = faster cold start.
- **Vanilla-JS SPA in one ~5k LOC `app.js`.** Hard to test, no type safety, route handlers and DOM rendering interleaved. Mid-term: extract render functions into ES modules per route (`/routes/pdp.js`, `/routes/checkout.js`), add TypeScript on the client (you already have it server-side).
- **`checkout_source` + `shiprocket_synced` columns referenced but not in schema** — code that reads them silently returns `undefined`. Add columns or remove the reads.
- **No automated tests.** Add Playwright e2e for the critical paths: home → PDP → ATC → checkout → Razorpay test mode → order-success. Run in the existing GitHub Action.
- **GA4 events fire client-side only.** Use `/api/analytics/event` as the primary path (server-side, immune to ad-blockers) and GA4 as fallback — currently it's the inverse.
- **Cloudinary `is_placeholder` logic isn't gated at the API layer.** PDP renders broken `<img>` tags. Server should fall back to a packaged `/static/placeholder.webp` when `is_placeholder=true`.
- **No structured error logging.** Wire Cloudflare Logpush → a free Better Stack or Axiom account so 5xx from the Worker is visible.
- **Resend emails have no retry / DLQ.** If Resend 5xx's during `verify-payment`, the order is processing but the customer never gets confirmation. Queue via Cloudflare Queues or retry 3× with exponential backoff.

### Low / polish

- **Shop page `seo_title` still says `PhotoFrameIn`** — update in Admin → Settings.
- **OG image is a single fallback.** Generate per-PDP OG cards (Cloudinary transform: artwork + title overlay).
- **Sitemap hardcodes 5 blog + 6 category slugs.** Generate from Supabase at request time, cache 1h in KV.
- **No `/robots.txt` rules for admin** — explicitly `Disallow: /admin`.
- **No `lighthouse-ci` budget enforcement** despite Lighthouse CI being wired — set assertions (LCP < 2.5s, CLS < 0.1, TBT < 200ms) and fail the build if regressed.
- **No accessibility audit beyond skip-link** — run `axe-core` in Playwright, target zero violations on home/PDP/checkout.
- **A4 ₹99 loss-leader unit economics** — verify print + frame + shipping cost is genuinely below ₹99 break-even after Razorpay 2% fee, else it's a bleed not a hook.

### Conversion / business (not bugs, but money on the table)

- Add **abandoned-cart email** at T+30min (Resend, triggered by KV TTL).
- **WhatsApp Business catalog sync** — Indian D2C: ~30% of buyers prefer WA over web checkout.
- **Reviews with photos** (current reviews are text-only). Photo reviews lift PDP conversion 15–25%.
- **Bundle pricing** ("any 3 prints ₹1,999"). Cart-level promo, no per-product setup.
- **Festival landing pages** (Diwali, Karwa Chauth, anniversary, housewarming) with curated 6–8 prints each — easy SEO wins + Meta ad LPs.

---

## Part 2 — Designs you can sell (framed-print SKU catalog)

I'll generate a **starter pack of 12 original print designs** in 6 categories matching your existing taxonomy, render each at print-grade resolution, and produce a `products.csv` you can import into Supabase + upload to Cloudinary.

### Categories (6, matching your store)
1. **Botanical & Line Art** — minimal black-ink line drawings (2 designs)
2. **Abstract Geometric** — bold shapes, muted modernist palette (2)
3. **Vintage Travel Posters** — India destinations: Jaipur, Varanasi, Kerala backwaters (2)
4. **Typographic / Quote** — Hindi + English calligraphy, gifting-friendly (2)
5. **Devotional / Spiritual** — modern Ganesha, Krishna, Om — non-kitsch (2)
6. **Pet & Family Silhouette** — clean silhouette templates (2)

### Per-design output
- 1 master image, 1920×1920, print-grade, saved to `docs/DESIGNS/{slug}/master.png`
- 1 lifestyle mockup (framed on a wall) for PDP hero, `mockup.jpg`
- 1 OG / social card (1200×630), `og.jpg`
- Metadata row in `docs/DESIGNS/products.csv` with: `slug, title, category, description, base_price_standard_medium, tags, seo_title, seo_description`
- Mapped to your existing 4 sizes × 2 frame finishes = 8 SKU variants each (96 SKUs total)

### Pricing applied (your v5.3 pricing)
| Size | Standard | Premium |
|------|----------|---------|
| Small 8×12 | ₹449 | ₹599 |
| Medium 12×18 *(default)* | ₹749 | ₹999 |
| Large 16×20 | ₹1,099 | ₹1,399 |
| XL 20×30 | ₹1,699 | ₹2,199 |

### Import path (your existing infra)
1. Upload `master.png` per design to Cloudinary via Admin → Media Manager (one click each, or bulk via Cloudinary's `upload` API + the `CLOUDINARY_URL` you already have).
2. Run `products.csv` through a one-off seeding script (`scripts/seed-designs.ts`) that inserts into `products` + 8 rows into `product_variants` per design, respecting the `'Direct Frame'` constraint and SKU-suffix convention.
3. Flip `is_placeholder` → `false` on each.

I'll include the seeding script as `docs/DESIGNS/seed-designs.ts` ready to paste into your repo.

---

## Technical notes (skip if non-technical)

- All work happens in this Lovable project's filesystem under `/docs` — nothing is deployed, no Lovable Cloud/Supabase activated, no new code touches your live repo.
- Image generation uses Lovable's premium image model for the artwork and standard for mockups. ~12 designs × 3 images = ~36 image generations.
- CSV uses your existing `products` / `product_variants` schema as documented in `system_literacy.md` §7.
- You apply the audit fixes and import the SKUs in your own repo / Cloudflare workflow.

---

## What I need from you before building

1. **Confirm the 6 categories above** — or swap any (e.g. drop Devotional, add Kids/Nursery).
2. **Brand voice for the print titles + descriptions** — minimal/gallery, warm/storytelling, or punchy/Instagram-y?
3. **Any prints you do NOT want generated** (religious imagery, specific deities, political, etc.).

Reply with answers and I'll execute Part 1 (audit doc) and Part 2 (designs + CSV + seed script) in one build pass.
