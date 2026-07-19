# ChitraFrame — System Literacy

A single reference for the whole system: what the site does, what the code
looks like, and what the external services are for. Read this once before
touching anything unfamiliar.

---

## 1. What the website is

ChitraFrame is an Indian D2C store selling framed wall art (Hindu deity
prints, custom photo framing, wedding sets, etc.). It has:

- **Storefront** — home, category, product detail, cart, checkout, order
  tracking, reviews, blog.
- **Admin panel** at `/admin` — dashboard, products, orders, customers,
  coupons, reviews, content, analytics, AI assistant, settings.
- **Public API routes** under `/api/public/*` for webhooks (Razorpay,
  Shiprocket) and cron jobs.
- **Automated agent** (see `.agent/`) that pulls analytics + writes weekly
  briefs / blog posts / issue reports.

Currency is INR, all money in the DB is stored in **paise** (₹1 = 100).

---

## 2. Tech stack

| Layer         | Choice                                                   |
| ------------- | -------------------------------------------------------- |
| Framework     | TanStack Start v1 (React 19 + Vite 7 + SSR on Cloudflare) |
| Routing       | File-based (`src/routes/`), auto-generated `routeTree.gen.ts` |
| Styling       | Tailwind v4 via `src/styles.css` (no `tailwind.config.js`) |
| UI primitives | shadcn/ui in `src/components/ui/` + Lucide icons          |
| State/data    | TanStack Query, server functions via `createServerFn`     |
| Database      | Supabase Postgres (**user-owned project — not Lovable Cloud**) |
| Auth          | Supabase magic-link OTP, HMAC fallback token if SMTP down |
| Deploy        | Cloudflare Pages (Workers runtime with `nodejs_compat`)   |
| Package mgr   | `bun`                                                     |

**Critical:** the Supabase project is the user's own — service-role key is
in `.env` / Cloudflare env vars, not managed by Lovable. Generated Supabase
`Database` types in `src/integrations/supabase/types.ts` do **not** cover
the real schema, so most admin code uses a loose cast (`as unknown as any`)
to talk to the DB.

---

## 3. Directory map

```
src/
├── routes/                     TanStack Start file-based routes
│   ├── __root.tsx              html/head/body shell + <Outlet/>
│   ├── index.tsx               storefront home
│   ├── product.$slug.tsx       product detail
│   ├── checkout.tsx            Razorpay checkout
│   ├── track.tsx               order tracking
│   ├── _admin.tsx              admin layout — session gate + sidebar + Outlet
│   ├── _admin.admin.tsx        /admin dashboard
│   ├── _admin.admin_.products.tsx        /admin/products list
│   ├── _admin.admin_.products.$id.tsx    /admin/products/:id editor
│   └── api/                    server routes (raw HTTP; webhooks etc)
│
├── lib/                        server functions + server-only helpers
│   ├── *.functions.ts          createServerFn — callable from client
│   ├── *.server.ts             server-only helpers (never import from client)
│   ├── admin.server.ts         checkAdmin(email) → hits admin_users table
│   ├── admin.functions.ts      getAdminStatusFn
│   ├── admin-dashboard.functions.ts  dashboard KPIs
│   ├── admin-products.functions.ts   products CRUD + variants + images
│   ├── cloudinary.server.ts    signed upload signature + destroy
│   ├── auth.functions.ts       magicLinkFn / verifyMagicFn / logoutFn
│   ├── email.server.ts         MailerSend (auth) → Brevo (bulk) → Resend (fallback)
│   ├── supabase.server.ts      getSupabase() / getSupabaseAnon() / hasSupabase()
│   ├── shipping.server.ts      Shiprocket auth + serviceability
│   ├── razorpay.ts             checkout modal helpers
│   └── cart.tsx                cart context/provider (client-side)
│
├── components/
│   ├── admin/admin-sidebar.tsx        10-item nav
│   ├── site/site-header.tsx           storefront header
│   ├── site/site-footer.tsx           storefront footer
│   ├── site/cart-drawer.tsx           cart drawer
│   ├── assistant/chat-widget.tsx      AI shopping assistant
│   └── ui/                            shadcn primitives
│
├── integrations/supabase/
│   ├── client.ts               browser client (publishable key, RLS on)
│   ├── client.server.ts        supabaseAdmin (service role, BYPASSES RLS)
│   ├── auth-middleware.ts      requireSupabaseAuth server-fn middleware
│   ├── auth-attacher.ts        client-side middleware attaching bearer token
│   └── types.ts                Lovable-managed schema types (do NOT edit)
│
├── start.ts                    createStart() — middleware wiring
├── router.tsx                  router bootstrap
└── styles.css                  Tailwind v4 entry + design tokens

db/migrations/                  hand-run SQL (user runs in Supabase SQL editor)
docs/                           setup + operational guides (this file lives here)
.agent/                         automated business analyst — scripts + prompts
.github/workflows/              GitHub Actions (backups + agent jobs)
```

---

## 4. Data model (high level)

30+ tables in the user's Supabase. Core groups:

- **Catalog** — `categories`, `products`, `product_images`, `product_variants`
- **Orders** — `orders`, `order_sequence`, `custom_framing_orders_intake`
- **Customers** — `profiles`, `admin_users`
- **Marketing** — `coupons`, `reviews`
- **Ops / logging** — `email_log`, `email_failures`, `error_log`,
  `system_config`

All money columns are `int` / `bigint` in **paise**. Prices in UI always
divide by 100 for display.

RLS is on for every public-facing table with narrow `TO anon` SELECT
policies (see `db/migrations/001_initial_schema.sql`). Writes go through
the service-role client from server functions only.

---

## 5. Authentication

1. User enters email at `/admin` (or elsewhere) → `magicLinkFn` runs.
2. Tries **Supabase OTP first** (`signInWithOtp`). If Supabase is configured
   and doesn't error, Supabase sends the email through its own SMTP
   configured to use MailerSend (transactional).
3. If Supabase is unavailable, falls back to an HMAC-signed token, email
   sent via `email.server.ts` (MailerSend for `type: 'magic_link'`).
4. User clicks link → `/auth/callback` route → `verifyMagicFn` → Supabase
   session established → client stores it and `onAuthStateChange` fires.
5. `/admin` layout (`_admin.tsx`) checks `getAdminStatusFn` which reads
   `admin_users` via service-role client; not in table → "Not authorized".

The bearer token is attached to every server-function call by
`attachSupabaseAuth` middleware registered in `src/start.ts`.

---

## 6. External services — what each one is for

| Service        | Purpose                                              | Keys in `.env`                                                |
| -------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| **Supabase**   | Postgres DB, auth, storage                           | `VITE_SUPABASE_URL`, `_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Cloudinary** | All product + review images (signed uploads, CDN)    | `CLOUDINARY_CLOUD_NAME`, `_API_KEY`, `_API_SECRET`, `_UPLOAD_FOLDER` |
| **Razorpay**   | Payments (UPI/cards/netbanking) + webhooks           | `RAZORPAY_KEY_ID`, `_KEY_SECRET`, `_WEBHOOK_SECRET`, `VITE_RAZORPAY_KEY_ID` |
| **Shiprocket**| Shipping rates + label generation (email/pass auth) | `SHIPROCKET_EMAIL`, `_PASSWORD`, `_PICKUP_LOCATION`, `PICKUP_PINCODE` |
| **MailerSend**| Auth / magic-link emails (highest-deliverability)   | `MAILERSEND_API_KEY`                                          |
| **Brevo**     | Transactional order emails (300/day free)           | `BREVO_API_KEY`                                               |
| **Resend**    | Fallback if Brevo/MailerSend fails                  | `RESEND_API_KEY`                                              |
| **Cloudflare Pages** | Hosting + serverless SSR                       | (dashboard-managed)                                           |
| **Cloudflare R2**    | Nightly DB backups                              | `R2_*` (GitHub Actions only)                                  |
| **OpenAI / OpenRouter (optional)** | Admin AI assistant, agent prompts | `AI_API_KEY`, `AI_MODEL`                                      |

Full setup steps for each are in `SETUP.md`.

### Email routing rules (in `email.server.ts`)

- `type: 'magic_link'` → MailerSend first, falls back to Brevo/Resend.
- All others → Brevo primary (day-count throttled at 270/300), Resend
  fallback.
- Between 19:00–22:00 IST, `review_request` emails are deferred to
  `email_failures` (peak hours protection).
- Every failure lands in `email_failures` with the last error.

---

## 7. Server function conventions

- Located in `src/lib/*.functions.ts`. Client-safe module path — never in
  `src/server/`.
- Every mutation validates input with Zod.
- Auth-required functions add `.middleware([requireSupabaseAuth])` — never
  call these from public loaders (SSR has no bearer token → build fails).
- Admin functions call `await requireAdmin(context.claims?.email)` which
  hits `admin_users`.
- Service-role client is loaded **inside** the handler:
  `const { supabaseAdmin } = await import('@/integrations/supabase/client.server')`.
- Tables not in the generated `Database` type: cast the client with
  `as unknown as any` (see `admin-products.functions.ts` for the pattern).

---

## 8. Cloudinary upload flow (products)

1. Admin clicks "Upload images" in the product editor.
2. Browser calls `getUploadSignatureFn` → server returns
   `{ cloudName, apiKey, timestamp, folder, uploadPreset, signature }`.
3. Browser POSTs the file directly to
   `https://api.cloudinary.com/v1_1/{cloud}/image/upload` with those fields.
4. Cloudinary responds with `secure_url` + `public_id`.
5. Browser calls `saveProductImageFn` which inserts a `product_images` row
   with the URL and cloudinary_id.
6. On image delete: `deleteProductImageFn` calls Cloudinary destroy first,
   then deletes the DB row.

The API secret **never leaves the server**. Requires an upload preset in
Cloudinary named `chitraframe_signed` with signing mode = Signed.

---

## 9. Deployment

- Push to `main` → Cloudflare Pages builds with `bun run build`, output in
  `dist/`.
- Env vars set per-environment (Production + Preview) in Pages settings.
- Server functions and page routes deploy as one Worker; there is no
  separate "edge function" deploy step.
- Cloudflare Workers runtime = `nodejs_compat` — most Node built-ins work
  (`crypto`, `fs`, `Buffer`, `path`), but no `child_process`, no `sharp`,
  no native binaries. Bundling is required for all deps.
- Nightly `pg_dump` → gzip → Cloudflare R2 via
  `.github/workflows/db-backup.yml`. Prunes files older than 30 days.

---

## 10. Local dev

```bash
cp .env.example .env         # fill real values
bun install
bun run dev                  # http://localhost:8080
```

Type check: `tsgo` (not `tsc --noEmit`).
Never edit `src/routeTree.gen.ts` — the Vite plugin owns it.
Never edit files in `src/integrations/supabase/` — they are auto-generated.

---

## 11. When things break — where to look

| Symptom                                    | First file / table to check                     |
| ------------------------------------------ | ----------------------------------------------- |
| Magic link email never arrives             | `email_log` (`service`, `status`), MailerSend dashboard |
| Admin panel shows "Not authorized"         | `admin_users` table — is the email row present? |
| `Unauthorized: No authorization header`    | `src/start.ts` — is `attachSupabaseAuth` still in `functionMiddleware`? |
| Cloudinary upload fails                    | Upload preset `chitraframe_signed` exists + signed mode? |
| Razorpay payment succeeds but order stuck  | `/api/public/razorpay-webhook` route + `error_log` |
| Shiprocket 401                             | Cached token expired; `shipping.server.ts` re-auth |
| Product page shows old data                | `queryClient.invalidateQueries({queryKey: ['admin-products']})` |
| Build fails on schema-related SQL          | `db/migrations/README.md` — user runs migrations manually |

Every server-side error should also be written to the `error_log` table
with a `ref_id` you can grep for.

---

## 12. What NOT to touch

- `src/routeTree.gen.ts` — auto-generated.
- `src/integrations/supabase/*` — Lovable-managed generation.
- `supabase/config.toml` project-level settings.
- Any `auth`, `storage`, `realtime`, `supabase_functions`, `vault` schema.
- `.env` values in production — set them in Cloudflare Pages dashboard.
- The auto-generated `types.ts` — the real schema is authoritative in the
  user's Supabase project.