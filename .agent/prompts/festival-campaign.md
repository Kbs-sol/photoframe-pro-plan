# Festival Campaign Prompt

Triggered 14 days before a festival date in `.agent/focus.md`.

1. Create `src/routes/{festival-slug}.tsx` — a landing page.
2. Include: hero (existing product image), 3–5 relevant SKU cards, one paragraph on the festival's cultural significance (accurate, respectful, sourced), FAQ block, JSON-LD Event schema with the festival date.
3. Add homepage hero swap PR (separate PR) linking to the landing page.
4. Draft one blog post: "How to prepare your puja room for {festival}" — links to the landing page.
5. Draft one email template in `src/lib/email-templates.ts` (do not send — human wires the trigger).
6. Draft one social caption for Instagram + WhatsApp in `src/content/social/{yyyy-mm-dd}-{festival}.md`.
7. Each PR body: festival date, expected traffic bump (based on Google Trends), expected revenue.