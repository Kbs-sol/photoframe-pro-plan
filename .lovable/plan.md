## Goal

Ship a complete, deployment-ready ChitraFrame codebase: functional storefront + full-CRUD admin panel + AI business-analyst chat agent + automated daily DB backups. You own Supabase, Razorpay, Cloudinary, Brevo, Resend, GitHub, Cloudflare (Pages + R2). Lovable's job ends at "code builds, all features work locally against your keys, deployment configs committed."

## Deployment stack (confirmed)

```text
Lovable (code)  →  GitHub repo  →  Cloudflare Pages (build + host)
                        ↓
                 GitHub Actions (nightly)  →  pg_dump Supabase  →  Cloudflare R2 (backups bucket)

Runtime env vars: set in Cloudflare Pages → Settings → Environment variables
Backup secrets:   set in GitHub → Repo Settings → Secrets and variables → Actions
```

Nothing goes into Lovable-managed secrets. Everything server-side lives in `process.env`, sourced from Cloudflare Pages env in prod and `.env` locally.

## Scope

### In (this build)
1. **Supabase schema.** `.sql` migration files under `supabase/migrations/` for every table the codebase touches — with RLS, GRANTs, `increment_order_sequence` RPC, profile-on-signup trigger. You paste-run in your Supabase SQL editor.
2. **Admin panel** at `/admin/*`, gated by `OWNER_EMAIL`. Full CRUD for products+variants+images, orders, coupons, reviews, customers, system config.
3. **Cloudinary signed uploads** — browser → Cloudinary direct, server signs.
4. **Razorpay** — checkout completion + HMAC-verified webhook (`/api/public/webhooks/razorpay`) + admin refund action.
5. **Emails** — Brevo primary + Resend fallback (already coded); wire order confirmation, owner alerts, resend button.
6. **AI business-analyst chat** at `/admin/assistant` — internal admin-only chat agent that analyzes the store (recent orders, top SKUs, low-stock, coupon performance, traffic) and suggests business improvements. Uses AI SDK + Lovable AI Gateway (`openai/gpt-5.5`), with tools to query the DB and return structured insights. Persists conversation history in `assistant_threads` + `assistant_messages` tables.
7. **Cloudflare Pages config** — `wrangler.toml` / build settings documented in `SETUP.md`, no adapter changes needed (TanStack Start already targets Cloudflare Workers).
8. **GitHub Actions: nightly DB backup** — `.github/workflows/db-backup.yml` runs `pg_dump` against Supabase, compresses, uploads to Cloudflare R2 with date-stamped filename, prunes >30 days.
9. **SETUP.md** — click-by-click for Supabase, Razorpay, Cloudinary, Brevo, Resend, Cloudflare Pages, Cloudflare R2, GitHub Actions secrets.

### Out
- Managed hosting, DNS, DB monitoring beyond backup.
- RBAC beyond single `OWNER_EMAIL` gate.
- Homepage / storefront redesign.
- Cloudflare R2 for product images (Cloudinary only — R2 is backup-bucket only).
- Wiring previously-rejected AI-generated devotional images.
- Customer-facing AI chat (assistant is admin-only for now).

## Architecture

- **Frontend:** TanStack Start, Tailwind v4, shadcn. Cloudflare Workers runtime.
- **Data layer:** Your Supabase project. All writes via `createServerFn` (service-role); reads via RLS-scoped policies.
- **Admin fns:** `.middleware([ownerOnly])` — checks Supabase session email === `OWNER_EMAIL`.
- **Webhooks:** `src/routes/api/public/webhooks/*.ts`.
- **AI agent:** `src/routes/api/admin/assistant.ts` (streaming chat route, owner-gated). Tools call read-only server fns (`getRecentOrdersFn`, `getTopProductsFn`, `getLowStockFn`, `getRevenueSummaryFn`, `getCouponUsageFn`). System prompt = "You are ChitraFrame's business analyst. Suggest concrete actions." Content lives in `src/content/assistant-system.md` (already partially scaffolded).
- **Env:** `process.env.*` server-side; `import.meta.env.VITE_*` client-side. Never leak service key to client.

## Rollout (each = one turn)

1. **This turn:** approve plan.
2. **Turn 2 — Supabase schema.** Full DDL as one migration file. You review, paste-run in Supabase.
3. **Turn 3 — Env + SETUP.md.** Updated `.env.example`, complete SETUP.md with per-service instructions.
4. **Turn 4 — Owner gate + admin sidebar + dashboard.**
5. **Turn 5 — Products CRUD + Cloudinary signed uploads.**
6. **Turn 6 — Orders admin + Razorpay webhook + refund.**
7. **Turn 7 — Coupons + reviews + customers + system_config.**
8. **Turn 8 — Email wire-ups (confirmation, owner alert, resend button).**
9. **Turn 9 — AI business-analyst chat** (schema for `assistant_threads`/`assistant_messages`, streaming route, tools, admin UI at `/admin/assistant`).
10. **Turn 10 — Cloudflare Pages config + GitHub Actions backup workflow + final SETUP.md polish + smoke-test checklist.**

Each turn is small enough to diff-review.

## Technical details

### Files added

```text
supabase/migrations/
├── 001_initial_schema.sql           (all storefront + admin tables + RLS + grants + RPC + trigger)
└── 002_assistant.sql                (assistant_threads, assistant_messages)

src/routes/
├── _admin/
│   ├── route.tsx                    (OWNER_EMAIL gate + AdminLayout with sidebar)
│   ├── index.tsx                    (dashboard: KPIs, alerts)
│   ├── products.tsx, products.new.tsx, products.$slug.tsx
│   ├── orders.tsx, orders.$id.tsx
│   ├── coupons.tsx
│   ├── reviews.tsx
│   ├── customers.tsx
│   ├── config.tsx
│   └── assistant.tsx                (AI business analyst chat)
└── api/
    ├── public/webhooks/razorpay.ts
    └── admin/assistant.ts           (streaming chat route, owner-gated)

src/lib/
├── admin.functions.ts               (all admin CRUD)
├── analytics.functions.ts           (read-only fns exposed as AI tools)
├── owner-middleware.ts
├── cloudinary.server.ts
├── cloudinary.functions.ts          (signUploadFn)
└── ai-gateway.server.ts             (Lovable AI Gateway provider helper)

src/components/admin/
├── admin-sidebar.tsx
├── data-table.tsx
├── product-form.tsx
├── variant-editor.tsx
├── cloudinary-uploader.tsx
└── assistant-chat.tsx               (useChat + markdown renderer)

.github/workflows/
└── db-backup.yml                    (nightly pg_dump → R2)

wrangler.toml                        (Pages config: build cmd, compat date)
SETUP.md                             (top-level: complete setup + deploy guide)
```

### Env vars (final list)

Runtime (Cloudflare Pages):
```text
SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, SUPABASE_PROJECT_ID
VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY   # client
RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
VITE_RAZORPAY_KEY_ID                         # client checkout widget
CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_UPLOAD_PRESET
VITE_CLOUDINARY_CLOUD_NAME                   # client widget
BREVO_API_KEY, RESEND_API_KEY, FROM_EMAIL, FROM_NAME, OWNER_EMAIL
SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD, SHIPROCKET_PICKUP_LOCATION, PICKUP_PINCODE
FREE_SHIPPING_THRESHOLD, SITE_URL, SITE_NAME, WHATSAPP_NUMBER
MAGIC_LINK_SECRET
LOVABLE_API_KEY                              # for AI business analyst (Lovable AI Gateway)
```

GitHub Actions (backup only):
```text
SUPABASE_DB_URL                              # full postgres:// URL from Supabase → Connection string
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
```

### GitHub Actions backup workflow (preview)

```yaml
name: nightly-db-backup
on:
  schedule: [{ cron: "0 20 * * *" }]   # 20:00 UTC = 01:30 IST
  workflow_dispatch:
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install postgres client + rclone
        run: sudo apt-get update && sudo apt-get install -y postgresql-client rclone
      - name: Dump DB
        run: pg_dump "$SUPABASE_DB_URL" | gzip > backup-$(date -u +%Y%m%d).sql.gz
        env: { SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }} }
      - name: Configure rclone for R2
        run: |
          mkdir -p ~/.config/rclone
          cat > ~/.config/rclone/rclone.conf <<EOF
          [r2]
          type = s3
          provider = Cloudflare
          access_key_id = ${{ secrets.R2_ACCESS_KEY_ID }}
          secret_access_key = ${{ secrets.R2_SECRET_ACCESS_KEY }}
          endpoint = https://${{ secrets.R2_ACCOUNT_ID }}.r2.cloudflarestorage.com
          EOF
      - name: Upload + prune >30 days
        run: |
          rclone copy backup-*.sql.gz r2:${{ secrets.R2_BUCKET }}/db/
          rclone delete r2:${{ secrets.R2_BUCKET }}/db/ --min-age 30d
```

### AI business-analyst chat — tool surface

Tools the LLM can call (read-only, all owner-gated):
- `getRevenueSummary({ range: "7d" | "30d" | "90d" })` → totals, order count, AOV
- `getTopProducts({ range, limit })` → best sellers
- `getLowStock({ threshold })` → variants low or out
- `getRecentOrders({ limit })` → last N orders (summary)
- `getCouponUsage({ range })` → codes used, discount given, conversion
- `getPendingReviews()` → count + samples

System prompt frames it as "ChitraFrame business analyst" — output actionable suggestions (bundle X with Y, restock this SKU, run this festival campaign) not raw dumps. Threads persisted so you can revisit past analyses.

### Cloudflare Pages build settings (in SETUP.md)

- Build command: `bun install && bun run build`
- Build output dir: `dist`
- Node version: from `.nvmrc` (already present)
- Env vars: paste the runtime list above into Pages settings (Preview + Production separately if you want test-mode Razorpay in preview).

## Confirm to start

Reply **"go"** and I'll produce **Turn 2 — the full SQL migration file** for your Supabase review.
