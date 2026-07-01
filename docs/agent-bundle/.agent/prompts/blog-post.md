# Blog Post Sub-Prompt

Draft a single blog post that:

- Targets one specific long-tail query (3–5 words) from the GSC content-gap list.
- Length: 800–1400 words.
- Structure: hook (2–3 lines) → problem framing → the answer → 3–5 examples using our actual product SKUs → FAQ block (4–6 questions) → soft CTA.
- Voice: matches `instructions.md`. Warm, considered, gallery-quality. No hype.
- Internal links: 3+ links to products in categories from `focus.md`. 1+ link to another blog if relevant.
- Frontmatter: `title`, `slug`, `description`, `date`, `author: "ChitraFrame"`, `category`, `tags`, `hero_image` (leave placeholder if none).
- Meta description: ≤160 chars, benefit-first.
- No AI-tell phrases ("in today's world", "in the realm of", "delve into", "landscape of", "unlock the potential", "furthermore", "moreover").

Output the full MDX, base64-encode it, and dispatch `agent-publish-blog.yml`.
