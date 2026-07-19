# On-Site Assistant — 3 Free API Keys

The widget rotates through 3 providers in order. Any one working is enough — the other two are redundancy.

## 1. Google AI Studio (primary)

- URL: https://aistudio.google.com/apikey
- Model used: `gemini-2.5-flash-lite`
- Free tier: generous (millions of tokens/month at time of writing)
- Env var name: `GOOGLE_AI_STUDIO_KEY`

Steps: sign in with Google → "Create API key" → copy → add as GitHub Actions secret AND Cloudflare Pages env var (same name).

## 2. OpenRouter (fallback #1)

- URL: https://openrouter.ai/keys
- Model used: `meta-llama/llama-3.1-8b-instruct:free`
- Free tier: small daily quota (enough for a few hundred messages/day)
- Env var name: `OPENROUTER_KEY`

Steps: sign up → API Keys → Create → copy → add to both secret stores.

## 3. NVIDIA NIM or xAI Grok (fallback #2)

**NVIDIA (recommended):**
- URL: https://build.nvidia.com
- Sign in → "Get API Key" → free tier gives generous credits
- Env var name: `GROK_OR_NVIDIA_KEY`
- Default endpoint (already coded): `https://integrate.api.nvidia.com/v1/chat/completions`
- Default model (already coded): `meta/llama-3.1-8b-instruct`

**xAI Grok alternative:**
- URL: https://console.x.ai
- Sign up → API keys → Create
- Env var name: `GROK_OR_NVIDIA_KEY`
- Also set `GROK_OR_NVIDIA_URL=https://api.x.ai/v1/chat/completions`
- Also set `GROK_OR_NVIDIA_MODEL=grok-2-1212` (or whichever model your key allows)

## Enable / disable the widget

- **Server-side kill switch** (returns 503 without hitting any provider): `ASSISTANT_ENABLED=true` in Cloudflare env vars. Unset or `false` = off.
- **Client-side render switch** (widget doesn't even mount): `VITE_ASSISTANT_ENABLED=true` in Cloudflare env vars. Requires rebuild.

Set both to `true` to launch. Set both to `false` to hide instantly.

## Rate limit
20 messages per IP per hour (in-memory, per Worker instance). Adjust in `src/routes/api/assistant.ts` if needed.

## Key rotation
Rotate keys every 90 days. Update the same secret in both GitHub and Cloudflare — the app reads from Cloudflare, workflows read from GitHub.

## Cost expectation
All three tiers are free for your expected volume (a few hundred messages/day). If you outgrow this, the widget will start failing over — that's the signal to upgrade.