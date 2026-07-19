# ChitraFrame — Supabase migrations

These are plain SQL files. Lovable does **not** manage or apply them — you own the Supabase project and apply them yourself.

## How to run

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Open the migration file (e.g. `001_initial_schema.sql`), copy the entire contents, paste into the editor.
3. Click **Run**.
4. Verify with:
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
   ```
   You should see: `categories`, `coupons`, `email_failures`, `email_log`, `error_log`, `order_sequence`, `orders`, `product_images`, `product_variants`, `products`, `profiles`, `reviews`, `system_config`.

## Order

Run in numeric order. Each file is idempotent-ish (uses `IF NOT EXISTS` / `ON CONFLICT DO NOTHING`) so re-running is safe, but only run new files in production — never re-run an older one after later files have altered its tables.

| File | Purpose |
|---|---|
| `001_initial_schema.sql` | Storefront + admin base: categories, products, variants, images, orders, coupons, reviews, profiles, system_config, ops tables, order-ID RPC, profile-on-signup trigger. Seeds two categories + default config. |
| `002_assistant.sql` (coming) | Tables for the admin AI business-analyst chat. |

## After running 001

Your app's server functions (`src/lib/products.functions.ts`, `orders.functions.ts`, etc.) will start reading real data instead of the local fallback catalogue. Set these env vars locally in `.env` and in Cloudflare Pages later:

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon key from Project Settings → API>
SUPABASE_SERVICE_KEY=<service_role key from Project Settings → API — server only, never expose>
VITE_SUPABASE_URL=<same as SUPABASE_URL>
VITE_SUPABASE_ANON_KEY=<same as SUPABASE_ANON_KEY>
```

## Backup

A GitHub Actions workflow (added in a later step) runs `pg_dump` nightly against `SUPABASE_DB_URL` and uploads to Cloudflare R2. See `.github/workflows/db-backup.yml`.