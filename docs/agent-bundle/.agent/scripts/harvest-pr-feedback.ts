// Harvest @agent comments from PRs in the last 30 days into .agent/feedback-inbox.md
// Env: GH_TOKEN, GH_REPO (owner/repo)
const token = process.env.GH_TOKEN;
const repo = process.env.GH_REPO;
if (!token || !repo) throw new Error("Missing GH_TOKEN or GH_REPO");

const since = new Date(Date.now() - 30 * 86400 * 1000).toISOString();

async function gh(path: string) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) throw new Error(`GH ${res.status}: ${await res.text()}`);
  return res.json();
}

type Issue = { number: number; pull_request?: unknown; title: string };
type Comment = { body?: string; user?: { login?: string }; created_at?: string; html_url?: string };

const issues: Issue[] = await gh(
  `/repos/${repo}/issues?since=${since}&per_page=100&state=all`,
);
const prNumbers = issues.filter((i) => i.pull_request).map((i) => i.number);

const bucket: string[] = [];
for (const num of prNumbers) {
  const comments: Comment[] = await gh(`/repos/${repo}/issues/${num}/comments?per_page=100`);
  for (const c of comments) {
    if (c.body && /@agent\b/i.test(c.body)) {
      bucket.push(
        `- **PR #${num}** by @${c.user?.login ?? "?"} (${c.created_at}):\n  > ${c.body.replace(/\n/g, "\n  > ")}\n  ${c.html_url}`,
      );
    }
  }
}

const md = [
  "# Feedback Inbox",
  "",
  `_Harvested ${new Date().toISOString()} — last 30 days_`,
  "",
  bucket.length ? bucket.join("\n\n") : "_No @agent comments in the last 30 days._",
  "",
].join("\n");

await Bun.write("out/feedback-inbox.md", md);
console.log(`Feedback: ${bucket.length} comments harvested`);
