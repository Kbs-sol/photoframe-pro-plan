# Blog Post Prompt

When `next-run.md` says "publish blog":

1. Pick ONE long-tail keyword from the GSC "impressions but no clicks" list, or from festival calendar (`.agent/focus.md`).
2. Target 1,200–1,800 words. H1 = exact keyword. H2s = related searches. FAQ block at the end (schema.org FAQPage JSON-LD).
3. Internal-link to 3–5 relevant product pages naturally.
4. Hero image: reuse existing `src/assets/designs/*.jpg` or open a human-todo if a new image is needed.
5. File: `src/content/blog/{yyyy-mm-dd}-{slug}.md` with frontmatter: `title, description, hero, publishedAt, tags, primaryKeyword`.
6. If `src/routes/blog.tsx` or `src/routes/blog.$slug.tsx` do not exist yet, open a human-todo asking human to enable blog rendering (or PR the minimal MDX renderer if allowed by instructions).
7. PR body: keyword, search volume estimate, competitors ranking today, expected time-to-rank (weeks), expected clicks/month at position 5.