# Weekly Brief Sub-Prompt

Given all data from the last 7 days + the last 7 entries in `history.md` + all merged/closed PRs in the last 7 days, produce:

## Executive summary (5 bullets max)
- Revenue this week vs last (+ MoM if applicable)
- Sessions + top source
- Top winning page (biggest position gain)
- Top losing page (biggest position drop)
- One-line agent verdict on the week

## What the agent did
- N PRs opened, M merged, K rejected
- Total copy changes, blog posts, meta rewrites

## Hypothesis verdicts
- For every hypothesis logged ≥7 days ago in `decisions.jsonl`, mark verdict: `won`, `lost`, `inconclusive`. Explain in one line.

## What needs the human's decision (max 3)
- Each is a yes/no question with recommendation

## What I'll do next week (proposed)
- Top 3 initiatives with rationale

Save this as a Markdown file in the artifact. Also render as HTML and email via Resend to the address in secrets if `RESEND_API_KEY` is set.
