# Session Close

Wrap the current session by:

1. Summarize in ≤5 bullets what happened today (pace, PRs, issues, key insight).
2. Ask the human explicitly: "Any directives for tomorrow?"
3. When the human answers (or explicitly says "no directives"), compose the new `next-run.md`:
   - `# Next Run — {tomorrow's date YYYY-MM-DD}`
   - `## Human directives` (verbatim quote of what they said)
   - `## Carried over` (specific unfinished items from today with links)
   - `## Hypotheses to test` (with measurement window in days)
   - `## Data to pull next run` (scopes, filters, date ranges)
   - `## Session budget` (max PRs, max blogs, max human-todos, est. ₹ cost)
4. Compose one-line `history_append`:
   `## {timestamp IST}\n- Pace: {status} (₹{rev}/₹{target})\n- PRs opened: {list}\n- Issues opened: {list}\n- Key insight: {one line}`
5. Compose 0..N JSONL rows for `decisions_append`:
   `{"date":"...","pr":"...","hypothesis":"...","action":"...","expected_lift_inr":N,"actual_lift_inr":null,"verdict":"pending"}`
6. Call `agent-write-next-brief.yml` with all three payloads.
7. Confirm in chat: brief saved at commit SHA {sha}.