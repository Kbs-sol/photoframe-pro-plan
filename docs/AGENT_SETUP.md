# Agent Setup — 60 min, one-time

You've merged the scaffold. Now wire the pipes so Genspark can actually run.

## 1. GitHub PAT (fine-grained)
GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new.
- Resource owner: your user
- Repository access: only `Kbs-sol/frame-it-refined`
- Expiration: 90 days (set calendar reminder to rotate)
- Repository permissions:
  - Actions: Read and write
  - Contents: Read and write
  - Issues: Read and write
  - Metadata: Read
  - Pull requests: Read and write

Save the token somewhere safe (password manager). You'll paste it into Genspark once.

## 2. GitHub Actions secrets
Repo → Settings → Secrets and variables → Actions → New repository secret. Add:

| Secret | Where to get it |
|---|---|
| `RAZORPAY_KEY_ID` | Razorpay Dashboard → Account & Settings → API Keys |
| `RAZORPAY_KEY_SECRET` | Same page |
| `GSC_SERVICE_ACCOUNT_JSON` | Google Cloud → IAM → Service Accounts → New → JSON key. Then in Search Console, add the SA email as a user with Full access on the property. |
| `GSC_SITE_URL` | e.g. `sc-domain:chitraframe.in` for domain properties |
| `GA4_SERVICE_ACCOUNT_JSON` | Same SA as GSC, or a new one. Then in GA4 → Admin → Property Access Management, add the SA email as Viewer. |
| `GA4_PROPERTY_ID` | GA4 → Admin → Property Settings (numeric, e.g. `123456789`) |
| `SUPABASE_URL` | Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Same |
| `CLARITY_API_TOKEN` | Clarity project settings → Data export → Generate token |
| `CLOUDINARY_URL` | Cloudinary dashboard → API keys (`cloudinary://key:secret@cloud`) |
| `RESEND_API_KEY` | Resend dashboard (optional, for weekly emailed brief) |
| `OWNER_EMAIL` | Your email (for weekly brief) |
| `GOOGLE_AI_STUDIO_KEY` | https://aistudio.google.com/apikey (assistant widget) |
| `OPENROUTER_KEY` | https://openrouter.ai/keys (assistant widget) |
| `GROK_OR_NVIDIA_KEY` | https://build.nvidia.com or x.ai (assistant widget) |

## 3. Cloudflare Pages env vars
Cloudflare → Pages → your project → Settings → Environment variables → Production. Add the **runtime** ones only (site doesn't need GSC/GA4/Clarity):

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- `CLOUDINARY_URL`
- `RESEND_API_KEY`, `OWNER_EMAIL`
- `GOOGLE_AI_STUDIO_KEY`, `OPENROUTER_KEY`, `GROK_OR_NVIDIA_KEY`
- `ASSISTANT_ENABLED=true` (server-side flag; controls whether the API returns 503)
- `VITE_ASSISTANT_ENABLED=true` (build-time flag; controls whether the widget renders)

## 4. Branch protection
Repo → Settings → Branches → Add rule for `main`:
- Require a pull request before merging
- Require review from Code Owners (yourself)
- Do NOT allow force pushes
- Do NOT allow deletions

This is the single most important step. It ensures Genspark can only propose — never merge.

## 5. Set launch date
Edit `.agent/goal.md` — replace the placeholder launch date with today's date. Commit directly to `main` (this is your goal, not the agent's decision).

## 6. Genspark tool setup
Follow `docs/AGENT_TOOLS.md`. Paste the 4 tool schemas + the session-open prompt from `.agent/prompts/session-open.md`.

## 7. First run
In Genspark, say: `Run today's ChitraFrame session`.

Expected first-run behavior:
- Agent reads all memory files.
- Dispatches `agent-fetch-data.yml`.
- Reports what data is available vs. missing.
- Opens 0–2 human-todo issues for any missing credentials.
- Writes tomorrow's brief to `.agent/next-run.md`.
- Does NOT open any code PRs on day 1 (recon only).

If it does anything else — stop the session, paste the deviation into a `human-todo` issue, and I'll fix the prompts.