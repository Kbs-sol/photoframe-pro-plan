# Agent Tools — Chat-Tool Wiring

Three formats. Pick whichever matches your chat tool. All three do the same thing: expose 4 GitHub-API tools + one system prompt.

---

## System prompt (paste into every chat tool)

See `.agent/prompts/session-open.md` in this repo. It's version-controlled — always fetch the latest before starting a session, or paste it verbatim as the tool's system message.

Set these variables in your tool's environment / config:

- `GH_REPO = Kbs-sol/PhotoFramePFS`
- `GH_TOKEN = <your fine-grained PAT>`
- `GH_DEFAULT_BRANCH = main`

---

## Format A — OpenAI function schema (Genspark, ChatGPT function-call, any AI SDK)

```json
[
  {
    "type": "function",
    "function": {
      "name": "read_repo_file",
      "description": "Read a file from the PhotoFramePFS repo (default branch). Use for .agent/next-run.md, instructions.md, focus.md, feedback-inbox.md, and any source file.",
      "parameters": {
        "type": "object",
        "properties": {
          "path": { "type": "string", "description": "Repo-relative path, e.g. .agent/next-run.md" },
          "ref": { "type": "string", "description": "Optional branch or commit SHA, default main" }
        },
        "required": ["path"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "trigger_workflow",
      "description": "Dispatch a GitHub Actions workflow_dispatch event.",
      "parameters": {
        "type": "object",
        "properties": {
          "workflow_file": {
            "type": "string",
            "enum": [
              "agent-fetch-data.yml",
              "agent-apply-changes.yml",
              "agent-publish-blog.yml",
              "agent-write-next-brief.yml",
              "agent-full-report.yml"
            ]
          },
          "ref": { "type": "string", "description": "Branch to run on, default main" },
          "inputs": {
            "type": "object",
            "description": "Workflow inputs as a JSON object matching the workflow's input schema.",
            "additionalProperties": { "type": "string" }
          }
        },
        "required": ["workflow_file", "inputs"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "get_latest_run_artifact",
      "description": "After dispatching a workflow, wait for its latest run to finish and return the artifact download URL + JSON contents.",
      "parameters": {
        "type": "object",
        "properties": {
          "workflow_file": { "type": "string" },
          "artifact_name_prefix": {
            "type": "string",
            "description": "e.g. agent-report or weekly-brief"
          },
          "timeout_seconds": { "type": "integer", "default": 300 }
        },
        "required": ["workflow_file"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "list_recent_prs",
      "description": "List recent PRs (open, closed, merged) with title, body, labels, and comments — used to see what the human merged or rejected since last run.",
      "parameters": {
        "type": "object",
        "properties": {
          "state": { "type": "string", "enum": ["open", "closed", "all"], "default": "all" },
          "since_days": { "type": "integer", "default": 7 },
          "limit": { "type": "integer", "default": 20 }
        }
      }
    }
  }
]
```

### Implementing the 4 tools

Every tool is a thin wrapper over GitHub's REST API. Reference implementation (any runtime):

- `read_repo_file` → `GET /repos/{repo}/contents/{path}?ref={ref}` → base64-decode `content`.
- `trigger_workflow` → `POST /repos/{repo}/actions/workflows/{file}/dispatches` with `{ ref, inputs }`.
- `get_latest_run_artifact` → poll `GET /repos/{repo}/actions/workflows/{file}/runs?per_page=1` until `status=completed`; then `GET /repos/{repo}/actions/runs/{id}/artifacts`; download the zip via the `archive_download_url`.
- `list_recent_prs` → `GET /repos/{repo}/pulls?state={state}&per_page={limit}` + `GET /repos/{repo}/issues/{n}/comments` per PR.

All requests carry:

```
Authorization: Bearer {GH_TOKEN}
Accept: application/vnd.github+json
X-GitHub-Api-Version: 2022-11-28
```

Genspark specifically: paste the above JSON as "Custom Tools" and provide `GH_TOKEN` as an environment secret.

---

## Format B — ChatGPT Custom GPT (OpenAPI Actions)

Create a Custom GPT → Configure → Actions → paste this OpenAPI (trimmed for brevity, expand per-endpoint as needed):

```yaml
openapi: 3.1.0
info:
  title: ChitraFrame Agent GitHub Bridge
  version: 1.0.0
servers:
  - url: https://api.github.com
paths:
  /repos/{owner}/{repo}/contents/{path}:
    get:
      operationId: read_repo_file
      parameters:
        - { name: owner, in: path, required: true, schema: { type: string } }
        - { name: repo, in: path, required: true, schema: { type: string } }
        - { name: path, in: path, required: true, schema: { type: string } }
        - { name: ref, in: query, schema: { type: string } }
      responses: { "200": { description: OK } }
  /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches:
    post:
      operationId: trigger_workflow
      parameters:
        - { name: owner, in: path, required: true, schema: { type: string } }
        - { name: repo, in: path, required: true, schema: { type: string } }
        - { name: workflow_id, in: path, required: true, schema: { type: string } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [ref]
              properties:
                ref: { type: string }
                inputs: { type: object, additionalProperties: { type: string } }
      responses: { "204": { description: Dispatched } }
  /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs:
    get:
      operationId: list_workflow_runs
      parameters:
        - { name: owner, in: path, required: true, schema: { type: string } }
        - { name: repo, in: path, required: true, schema: { type: string } }
        - { name: workflow_id, in: path, required: true, schema: { type: string } }
        - { name: per_page, in: query, schema: { type: integer } }
      responses: { "200": { description: OK } }
  /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts:
    get:
      operationId: get_run_artifacts
      parameters:
        - { name: owner, in: path, required: true, schema: { type: string } }
        - { name: repo, in: path, required: true, schema: { type: string } }
        - { name: run_id, in: path, required: true, schema: { type: integer } }
      responses: { "200": { description: OK } }
  /repos/{owner}/{repo}/pulls:
    get:
      operationId: list_recent_prs
      parameters:
        - { name: owner, in: path, required: true, schema: { type: string } }
        - { name: repo, in: path, required: true, schema: { type: string } }
        - { name: state, in: query, schema: { type: string, enum: [open, closed, all] } }
        - { name: per_page, in: query, schema: { type: integer } }
      responses: { "200": { description: OK } }
components:
  securitySchemes:
    github_pat:
      type: http
      scheme: bearer
security:
  - github_pat: []
```

Authentication → API Key → Bearer → paste your PAT.

---

## Format C — MCP server for Claude Desktop / Claude Code / Cursor

Run a tiny local MCP server that fronts the GitHub API. Simplest option — use the community `github-mcp-server`:

```bash
npm install -g @modelcontextprotocol/server-github
```

Add to Claude Desktop's `mcp.json`:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "<your PAT>" }
    }
  }
}
```

Restart Claude. It now has GitHub read/write tools. Paste the system prompt from `.agent/prompts/session-open.md` as a Claude Project's custom instructions.

For dispatching workflows specifically, the community server supports `workflow_dispatch` via its `dispatch_workflow` tool.
