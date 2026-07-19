# How to Answer Human-Todo Issues

When the agent opens an issue labelled `human-todo`, it's paused on that thread. Your reply unblocks it.

## Response protocol

Reply on the issue with exactly one of:

- `done` — the task is complete. Agent picks up next session and continues.
- `skip` — drop this permanently. Agent will not re-propose it.
- `later` — snooze 14 days. Agent will re-surface after that.
- A question or counter-plan — agent will incorporate and re-plan.

Then **close the issue** (or leave open if `later`). Closing is your signal that action is complete.

## Priority interpretation

- **p0 issues** — the goal is blocked. Address within 48h or the ₹15k target is at risk.
- **p1 issues** — high-leverage. Address within a week.
- **p2 issues** — nice-to-have. Address when convenient.

If an issue sits open >7 days, the agent will surface it in the weekly brief as an "aging blocker."

## Common human-todo types

| Type | Typical action |
|---|---|
| "Add secret X" | Add to GitHub Actions secrets + Cloudflare env vars. |
| "Set up Google Merchant Center" | Follow the linked GMC guide, verify domain, comment `done`. |
| "Upload real product photo for SKU Y" | Upload to Cloudinary, paste URL in the issue, comment `done`. |
| "Verify festival date" | Confirm date, comment `verified: YYYY-MM-DD`. |
| "Legal review of return policy copy" | Read draft PR, either approve or comment revisions. |
| "Decide: kill or improve SKU Z" | Answer `kill` or `improve` with 1-line reason. |

## What not to do

- Don't merge the agent's PRs and then leave the issue open — comment `done` first so the agent knows.
- Don't answer with vague "yeah do it" — the agent needs a concrete input.
- Don't reopen issues you closed as `skip` — instead, tell the agent in chat "reconsider X."