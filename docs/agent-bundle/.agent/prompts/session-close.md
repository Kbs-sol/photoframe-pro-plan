# Session-Close Prompt

_Say this explicitly if the agent forgets to close the session._

---

Wrap this session:

1. Summarize in 5 bullets what happened today.
2. List every PR opened with its URL and one-line purpose.
3. Ask me for tomorrow's directives.
4. When I answer, compose `.agent/next-run.md` with:
   - `# Next Run — {tomorrow's ISO date}`
   - `## Human directives` (my answer, verbatim)
   - `## Carried over` (unfinished items from today)
   - `## Hypotheses to test` (each with a measurement window)
   - `## Data to pull next run` (specific scopes and filters)
   - `## Session budget` (max PRs, max blog posts, est. LLM cost)
5. Base64-encode it and dispatch `agent-write-next-brief.yml` with:
   - `next_run_b64`: the encoded brief
   - `history_line`: one-line summary of today (e.g. "opened 4 PRs, 2 SEO + 1 blog + 1 focus swap")
   - `decisions_jsonl_b64`: JSONL rows for each hypothesis logged today
6. Confirm to me the brief is saved and give me the commit SHA.
