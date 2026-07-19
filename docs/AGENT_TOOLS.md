# Genspark Tool Schemas

Paste each of these as a custom tool in Genspark. All 4 tools use the GitHub REST API and the PAT you created in setup step 1.

## Base
- **Base URL:** `https://api.github.com`
- **Auth header:** `Authorization: Bearer <YOUR_PAT>`
- **Extra header:** `Accept: application/vnd.github+json`
- **Repo:** `Kbs-sol/frame-it-refined` (replace if forked)

---

## Tool 1: `read_repo_file`

```json
{
  "name": "read_repo_file",
  "description": "Read a file from the ChitraFrame repo. Use for .agent/*.md, src/**, docs/**.",
  "parameters": {
    "type": "object",
    "properties": {
      "path": { "type": "string", "description": "Repo-relative path, e.g. .agent/next-run.md" },
      "ref": { "type": "string", "description": "Branch or SHA. Default: main", "default": "main" }
    },
    "required": ["path"]
  },
  "http": {
    "method": "GET",
    "url": "https://api.github.com/repos/Kbs-sol/frame-it-refined/contents/{path}?ref={ref}"
  }
}
```

Response is base64-encoded `content` field. Decode before use.

---

## Tool 2: `trigger_workflow`

```json
{
  "name": "trigger_workflow",
  "description": "Dispatch a GitHub Actions workflow. Use agent-fetch-data, agent-apply-changes, agent-publish-blog, agent-open-issue, agent-write-next-brief, agent-harvest-feedback.",
  "parameters": {
    "type": "object",
    "properties": {
      "workflow": { "type": "string", "description": "Workflow filename, e.g. agent-fetch-data.yml" },
      "ref": { "type": "string", "default": "main" },
      "inputs": { "type": "object", "description": "Workflow inputs. See workflow YAML for schema." }
    },
    "required": ["workflow", "inputs"]
  },
  "http": {
    "method": "POST",
    "url": "https://api.github.com/repos/Kbs-sol/frame-it-refined/actions/workflows/{workflow}/dispatches",
    "body": { "ref": "{ref}", "inputs": "{inputs}" }
  }
}
```

For workflows that expect base64-encoded inputs (`changes_json_b64`, `next_run_md_b64`, `body_b64`, etc.), base64-encode in your tool call before dispatching.

---

## Tool 3: `get_latest_run_artifact`

```json
{
  "name": "get_latest_run_artifact",
  "description": "Get the artifact from the most recent successful run of a workflow. Returns a download URL.",
  "parameters": {
    "type": "object",
    "properties": {
      "workflow": { "type": "string" },
      "artifact_name": { "type": "string", "default": "agent-report" }
    },
    "required": ["workflow"]
  }
}
```

Implementation (Genspark can chain HTTP calls):
1. `GET /repos/{repo}/actions/workflows/{workflow}/runs?status=success&per_page=1`
2. Take `runs[0].id`
3. `GET /repos/{repo}/actions/runs/{id}/artifacts`
4. Match `artifact_name`, take `archive_download_url`

---

## Tool 4: `list_recent_prs`

```json
{
  "name": "list_recent_prs",
  "description": "List recent PRs to see what was merged, rejected, or commented on.",
  "parameters": {
    "type": "object",
    "properties": {
      "state": { "type": "string", "enum": ["open", "closed", "all"], "default": "all" },
      "per_page": { "type": "integer", "default": 20 }
    }
  },
  "http": {
    "method": "GET",
    "url": "https://api.github.com/repos/Kbs-sol/frame-it-refined/pulls?state={state}&per_page={per_page}&sort=updated&direction=desc"
  }
}
```

## Optional Tool 5: `list_open_issues`

```json
{
  "name": "list_open_issues",
  "description": "List open issues, filterable by label (use human-todo to see blockers).",
  "parameters": {
    "type": "object",
    "properties": { "labels": { "type": "string", "default": "human-todo" } }
  },
  "http": {
    "method": "GET",
    "url": "https://api.github.com/repos/Kbs-sol/frame-it-refined/issues?state=open&labels={labels}&per_page=30"
  }
}
```

---

## System prompt for Genspark

Copy the entire contents of `.agent/prompts/session-open.md` (between the triple backticks) into Genspark's system-prompt field. That's the operating manual.