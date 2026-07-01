# Agent Setup — 45 min one-time

Do these steps once. After this, everything runs from your chat tool.

## 1. Copy the bundle into your repo (2 min)

```bash
cd PhotoFramePFS
cp -R /path/to/docs/agent-bundle/.github/* .github/
cp -R /path/to/docs/agent-bundle/.agent .agent
cp    /path/to/docs/agent-bundle/docs/AGENT_*.md docs/
git add . && git commit -m "chore: add growth agent scaffold" && git push
```

## 2. Create a Google Cloud service account (15 min)

1. Go to https://console.cloud.google.com/ → create a new project called `chitraframe-agent`.
2. Enable APIs: **Google Search Console API** and **Google Analytics Data API**.
3. IAM → Service Accounts → Create → name it `chitraframe-agent-reader`.
4. On the new SA → Keys → Add key → JSON. Save the file.
5. Grant it access:
   - **GSC**: https://search.google.com/search-console → Settings (of the ChitraFrame property) → Users and permissions → Add user → paste the SA email → role **Owner** (GSC's API requires Owner for read).
   - **GA4**: https://analytics.google.com → Admin → Property → Property Access Management → Add → paste SA email → role **Viewer**.

## 3. Add GitHub repo secrets (10 min)

Go to `github.com/Kbs-sol/PhotoFramePFS/settings/secrets/actions` → New repository secret. Add each:

| Name | Value |
|---|---|
| `GSC_SERVICE_ACCOUNT_JSON` | Contents of the JSON file from step 2 (paste the whole thing) |
| `GSC_SITE_URL` | `sc-domain:chitraframe.in` (or your verified URL) |
| `GA4_SERVICE_ACCOUNT_JSON` | Same JSON as above |
| `GA4_PROPERTY_ID` | The number from GA4 → Admin → Property Settings |
| `RAZORPAY_KEY_ID` | From Razorpay Dashboard → Settings → API Keys |
| `RAZORPAY_KEY_SECRET` | Same |
| `SUPABASE_URL` | From Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings → API → service_role |
| `CLOUDINARY_URL` | Cloudinary dashboard, format `cloudinary://key:secret@cloud_name` |
| `RESEND_API_KEY` | Optional |
| `SEMRUSH_API_KEY` | Optional |

## 4. Create a Fine-Grained PAT (5 min)

1. https://github.com/settings/tokens?type=beta → Generate new token.
2. Repository access: only `Kbs-sol/PhotoFramePFS`.
3. Permissions:
   - Actions: Read + Write
   - Contents: Read + Write
   - Pull requests: Read + Write
   - Metadata: Read
4. Expiration: 90 days.
5. Copy the token. This is what your chat tool uses.

## 5. Wire your chat tool (10 min)

Pick one — pick all three, they're not mutually exclusive:

- **Genspark / any tool with function-calling** → open `docs/AGENT_TOOLS.md`, copy the "OpenAI function schema" block, paste as custom tools. Copy the "System prompt" section as the system prompt.
- **ChatGPT Custom GPT** → same file, section "ChatGPT Custom GPT actions". Paste the OpenAPI spec into Actions.
- **Claude Desktop / Claude Code** → same file, section "MCP server manifest". Follow the 3 steps to run the local MCP stub.

## 6. Smoke test (3 min)

In your chat tool:

> "Ping the ChitraFrame repo. List files in `.agent/`."

Expected: the tool calls `read_repo_file` on `.agent/` and returns the list. If it does, you're live.

Then:

> "Run today's ChitraFrame session."

Expected: it reads `.agent/next-run.md` (the Day-1 kickoff), dispatches `agent-fetch-data.yml`, waits, analyzes, reports back, asks for tomorrow's directives, and writes the next brief.

## 7. Verify secrets from a real run

After the first workflow dispatch:
- GitHub → Actions → the run → check that steps didn't fail with "Missing X".
- If any secret is wrong, update it in step 3 and re-dispatch from your chat tool.
