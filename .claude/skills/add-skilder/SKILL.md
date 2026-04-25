---
name: add-skilder
description: Add Skilder (https://skilder.ai) as a remote MCP tool. Connects via the hosted MCP endpoint at app.skilder.ai/mcp using a per-user UserKey passed as a URL query parameter. Wires per agent group via container.json after a one-time merge of the skill/skilder branch.
---

# Add Skilder Tool

Wires the hosted Skilder MCP server (`https://app.skilder.ai/mcp?key=<USER_KEY>`) into selected agent groups.

Skilder authenticates via a UserKey carried in the URL query string — there's no OAuth flow, no header-based auth, and no OneCLI integration. Because Skilder is a **remote HTTP MCP** server but the agent-runner's per-group config (`container.json`) only models stdio MCP servers, this skill bridges them with [`mcp-remote`](https://www.npmjs.com/package/mcp-remote), a small stdio↔HTTP MCP shim pinned into the container image. The agent talks stdio to `mcp-remote`; `mcp-remote` talks HTTP to Skilder.

Tools surfaced to the agent appear as `mcp__skilder__<tool>` (the exact list is controlled by Skilder, not this skill).

## Install

NanoClaw doesn't ship `mcp-remote` or the `mcp__skilder__*` allowlist entry in trunk. This skill copies them in from the `skill/skilder` branch, then wires up your selected agent groups locally.

### Pre-flight (idempotent)

Skip to **Credentials** if both of these are already in place:

- `container/Dockerfile` contains `MCP_REMOTE_VERSION` and a `pnpm install -g "mcp-remote@${MCP_REMOTE_VERSION}"` block
- `container/agent-runner/src/providers/claude.ts` contains `'mcp__skilder__*'` in `TOOL_ALLOWLIST`

Otherwise continue. Every step below is safe to re-run.

### 1. Fetch the skill branch

```bash
git fetch origin skill/skilder
```

### 2. Copy the Dockerfile and tool-allowlist file

```bash
git show origin/skill/skilder:container/Dockerfile > container/Dockerfile
git show origin/skill/skilder:container/agent-runner/src/providers/claude.ts > container/agent-runner/src/providers/claude.ts
```

These are the only two files that change. The branch is rebased on `main` whenever those files move upstream — if `git show` reports a stale hunk after a `pnpm run build` failure, see *Branch out of sync* in Troubleshooting.

### 3. Build host + container

```bash
pnpm run build
./container/build.sh
```

Both must complete cleanly. The container build adds one new layer for the `mcp-remote` install (~10s with cache, ~30s cold).

## Credentials

### Get a Skilder UserKey

Use `AskUserQuestion: Do you already have a Skilder UserKey, or do you need to create one?`

**If they need one:**
> 1. Go to https://app.skilder.ai
> 2. Sign in (or create an account).
> 3. Open your account / API settings and copy the UserKey. It looks like `USKy...` — a string that starts with `USK`.
> 4. Paste it here.

Wait for the key. Do **not** echo it back, write it to `.env`, or commit it. The key only ever lives in `groups/<folder>/container.json`, which is per-host.

Validate minimally: starts with `USK`, ≥20 chars. If it doesn't match, ask again — almost certainly a copy/paste mistake.

### Pick which agent group(s) to wire

```bash
ls groups/
```

Use `AskUserQuestion: Which agent group(s) should get the Skilder tool? (Multi-select.)` — list each `groups/<folder>/` entry. Confirm whether the **same** UserKey applies to each, or whether they should each use a different one (rare — most users have one personal key).

## Wire Per-Agent-Group

For **each** selected group, merge into `groups/<folder>/container.json`:

```jsonc
{
  "mcpServers": {
    "skilder": {
      "command": "mcp-remote",
      "args": [
        "https://app.skilder.ai/mcp?key=USKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      ],
      "env": {},
      "instructions": "Skilder is connected. Use `mcp__skilder__*` tools for Skilder-backed lookups and actions. Do not log or surface the URL — it embeds the user's key."
    }
  }
}
```

Substitute the real UserKey for `USKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`. Read existing `container.json` as JSON, set `cfg.mcpServers.skilder = {...}`, write it back pretty-printed — don't blow away other entries.

The `instructions` field is composed into the agent's `CLAUDE.md` at spawn ([src/claude-md-compose.ts:94](../../../src/claude-md-compose.ts#L94)) so the agent knows the tool exists without you editing the group's main `CLAUDE.md`.

## Restart

```bash
launchctl kickstart -k gui/$(id -u)/com.nanoclaw   # macOS
# systemctl --user restart nanoclaw                # Linux
```

Containers are spawned per-session, so any live session won't see the new MCP server until it respawns. Either wait for the next inbound message that triggers a fresh spawn, or stop any active container manually:

```bash
docker ps --filter label=com.nanoclaw.install
docker stop <container-name>
```

## Verify

In the wired agent's chat, ask something Skilder can answer — *"use skilder to …"* or whatever workflow you got it for. The first call may take a couple of seconds while `mcp-remote` connects to `app.skilder.ai`. The agent should call `mcp__skilder__<something>`.

If it falls back to `WebFetch` or apologizes for not having the tool:

```bash
tail -100 logs/nanoclaw.log logs/nanoclaw.error.log | grep -iE 'skilder|mcp-remote'
ls -t data/v2-sessions/*/stderr.log | head -1 | xargs tail -50
```

## Troubleshooting

- **`command not found: mcp-remote`** — image wasn't rebuilt after step 2. Run `./container/build.sh` and confirm the layer ran (`docker history nanoclaw-agent:latest | grep mcp-remote`).
- **401 / 403 from `app.skilder.ai`** — UserKey is wrong, expired, or rotated. Generate a new one in the Skilder dashboard, update `container.json`. Don't trim `USK` — it's part of the key.
- **Agent says "I don't have Skilder tools"** — the `mcp__skilder__*` allowlist entry didn't make it into `claude.ts`, or the agent-runner image wasn't rebuilt. Confirm both, then `./container/build.sh`.
- **Tools list empty** — Skilder returned no tools. Server-side state issue: confirm the account has access to the relevant features in Skilder's web UI, then restart the container.
- **`mcp-remote` retries forever** — container can't reach `app.skilder.ai`. Test from inside: `docker run --rm nanoclaw-agent:latest curl -sI https://app.skilder.ai/mcp`.
- **Branch out of sync** — main moved `container/Dockerfile` or `claude.ts`, and `skill/skilder` is now stale. Open an issue or PR to rebase the branch on main; in the meantime, re-apply the two edits manually (the diffs are small — see the *Branch contents* section of [CONTRIBUTING.md](../../../CONTRIBUTING.md) or read `git diff origin/main..origin/skill/skilder`).

## Removal

1. Delete the `"skilder"` entry from each group's `container.json`.
2. Revert the Dockerfile and `claude.ts` changes:
   ```bash
   git checkout origin/main -- container/Dockerfile container/agent-runner/src/providers/claude.ts
   ```
   (Only do this if no other skill installed since needs them — at time of writing, only this skill modifies those files in this way.)
3. `pnpm run build && ./container/build.sh && launchctl kickstart -k gui/$(id -u)/com.nanoclaw` (or `systemctl --user restart nanoclaw` on Linux).

## Notes for upstream contribution

This skill follows CONTRIBUTING.md type 1 (feature skill, branch-based). Before opening a PR:

- The PR should add **this `SKILL.md`** to `main` and put the **two file changes** (`container/Dockerfile`, `container/agent-runner/src/providers/claude.ts`) on the contributor's fork branch. Maintainer creates `skill/skilder` from those code commits; the SKILL.md merges to `main`.
- Verify the pinned `mcp-remote` version: `npm view mcp-remote version` (3-day-old release per the `minimumReleaseAge` policy in `pnpm-workspace.yaml`).
- Mention the privacy footprint in the PR description — Skilder is hosted, every tool call sends data to `app.skilder.ai`. Reviewers should not have to infer that.
- If a second remote-MCP skill ever needs `mcp-remote`, factor the Dockerfile lines into a shared base. Today it's a one-liner so inlining is fine.

## Credits & references

- **Skilder**: https://skilder.ai / https://app.skilder.ai
- **`mcp-remote`**: https://www.npmjs.com/package/mcp-remote — stdio↔HTTP MCP bridge
- **Skill pattern**: branch-based, modeled on [`/add-telegram`](../add-telegram/SKILL.md). HTTP-MCP precedent from [`/add-parallel`](../add-parallel/SKILL.md) (which edits `index.ts` directly — this skill stays per-group instead).
