// Reads PR + issue comments matching @agent since last run, writes .agent/feedback-inbox.md.
// Env: GITHUB_TOKEN (provided by workflow), GITHUB_REPOSITORY
import { requireEnv, safe, writeOut } from "./lib";
import { writeFile } from "node:fs/promises";

const token = requireEnv("GITHUB_TOKEN");
const repo = requireEnv("GITHUB_REPOSITORY"); // owner/name

async function gh<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "ChitraFrameAgent" },
  });
  if (!res.ok) throw new Error(`GH ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

type Comment = { id: number; body: string; user: { login: string }; created_at: string; html_url: string };
type PR = { number: number; title: string; state: string; merged_at: string | null; updated_at: string; html_url: string };

const report = await safe("feedback", async () => {
  const since = new Date(Date.now() - 14 * 86400_000).toISOString();
  const prs = await gh<PR[]>(`/repos/${repo}/pulls?state=all&per_page=30&sort=updated&direction=desc`);
  const sections: string[] = [];
  for (const pr of prs.slice(0, 15)) {
    const comments = await gh<Comment[]>(`/repos/${repo}/issues/${pr.number}/comments?since=${since}&per_page=100`);
    const mentions = comments.filter((c) => /@agent\b/i.test(c.body));
    if (!mentions.length) continue;
    sections.push(`## PR #${pr.number} — ${pr.title} — ${pr.merged_at ? "merged" : pr.state}`);
    for (const c of mentions) sections.push(`- @${c.user.login} (${c.created_at.slice(0, 10)}): ${c.body.replace(/\s+/g, " ").slice(0, 300)}`);
    sections.push("");
  }
  const md = `# Feedback Inbox\n\n_Auto-populated ${new Date().toISOString()}._\n\n${sections.join("\n") || "(no @agent mentions in last 14 days)"}\n`;
  await writeFile(".agent/feedback-inbox.md", md);
  return { mentionsFound: sections.length };
});

await writeOut("feedback", report);