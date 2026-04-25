---
name: add-skilder
description: Connect agent groups to Skilder (https://skilder.ai) — the shared business brain that turns a NanoClaw team into Clawlective Intelligence. Wires the hosted MCP endpoint at app.skilder.ai/mcp via mcp-remote, per-group through container.json. Idempotent.
---

# Add Skilder — Clawlective Intelligence for your NanoClaw team

> **Clawlective Intelligence.** Skilder is the brain your NanoClaws share — the same business context, every agent, every channel, every teammate.

Without Skilder, every NanoClaw on your team starts from zero each conversation. Group memory is scoped to one chat. Project state lives in someone's head, the CRM, three Notion docs, and a Slack thread. Every agent reinvents context.

With Skilder, the **mcp__skilder__\*** tools give every wired NanoClaw a window onto the same business reality — projects, financials, fundraising, customer accounts, team rhythm. Niclaw on WhatsApp and a teammate's NanoClaw on Slack see the same project status. The collective gets sharper with every interaction.

This skill wires one or more agent groups to the hosted Skilder MCP server (`https://app.skilder.ai/mcp?key=<UserKey>`). Run it once per group that should join the collective.

## Install

NanoClaw doesn't ship `mcp-remote` or the `mcp__skilder__*` allowlist entry in trunk. This skill brings them in from the `skill/skilder` branch and wires the selected group(s) locally.

### Pre-flight (idempotent)

Skip to **Credentials** if both of these are already in place:

- `container/Dockerfile` contains `MCP_REMOTE_VERSION` and a `pnpm install -g "mcp-remote@${MCP_REMOTE_VERSION}"` block
- `container/agent-runner/src/providers/claude.ts` contains `'mcp__skilder__*'` in `TOOL_ALLOWLIST`

Otherwise, every step below is safe to re-run.

### 1. Fetch the skill branch

```bash
git fetch origin skill/skilder
```

### 2. Copy the Dockerfile and tool-allowlist file

```bash
git show origin/skill/skilder:container/Dockerfile > container/Dockerfile
git show origin/skill/skilder:container/agent-runner/src/providers/claude.ts > container/agent-runner/src/providers/claude.ts
```

These are the only two files that change. If `git show` reports a stale hunk after a build failure, see *Branch out of sync* in Troubleshooting.

### 3. Build host + container

```bash
pnpm run build
./container/build.sh
```

Both must complete cleanly. The container build adds one new layer for the `mcp-remote` install (~10s with cache, ~30s cold).

## Credentials

### Get a Skilder UserKey

Use `AskUserQuestion: Do you already have a Skilder UserKey, or do you need to create one?`

**If they need one, tell them:**

> 1. Go to https://app.skilder.ai
> 2. Sign in (or create an account).
> 3. Open your account / API settings and copy the UserKey. It looks like `USKy...` — a string that starts with `USK`.
> 4. Paste it here.

Wait for the key. **Do not** echo it back, write it to `.env`, or commit it. The key only ever lives in `groups/<folder>/container.json`, which is per-host.

Validate minimally: starts with `USK`, ≥20 chars. If it doesn't match, ask again — almost certainly a copy/paste mistake.

### Pick which agent groups join the collective

```bash
ls groups/
```

Use `AskUserQuestion: Which agent group(s) should join the Clawlective Intelligence? You can join more than one — every wired NanoClaw will draw from the same Skilder context.` — list each `groups/<folder>/` entry.

For each group selected, confirm whether the **same** UserKey applies, or whether each group should use a different one. Most teams use one shared key per Skilder workspace; multi-key setups are unusual.

## Wire per-agent-group

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
      "instructions": "You're plugged into **Skilder** — your team's shared business brain. The `mcp__skilder__*` tools draw from the same context every other NanoClaw on this team sees: projects, financials, fundraising, customer accounts, team rhythm. Reach for Skilder first when the user asks about ongoing initiatives, team state, or anything internal — prefer it over WebFetch or general search for internal questions. Skip it for purely public-info questions (general web facts, code, math). Never surface or log the underlying MCP URL — it embeds the user's key."
    }
  }
}
```

Substitute the real UserKey for `USKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`. Read existing `container.json` as JSON, set `cfg.mcpServers.skilder = {...}`, write it back pretty-printed — don't blow away other entries.

The `instructions` field is composed into the agent's `CLAUDE.md` at spawn ([src/claude-md-compose.ts:94](../../../src/claude-md-compose.ts#L94)) so the agent picks up its Skilder posture without you editing the group's main `CLAUDE.md`.

## Restart

```bash
launchctl kickstart -k gui/$(id -u)/com.nanoclaw   # macOS
# systemctl --user restart nanoclaw                # Linux
```

(If your install uses a slug-suffixed launchd label like `com.nanoclaw-v2-<slug>`, kickstart that one instead — `launchctl list | grep nanoclaw` will show the live label.)

Containers are spawned per-session, so any live session won't see the new MCP server until it respawns. Either wait for the next inbound message that triggers a fresh spawn, or stop active containers manually:

```bash
docker ps --filter label=com.nanoclaw.install
docker stop <container-name>
```

## Verify

In the wired agent's chat, ask something only Skilder would know — *"what's the status on <one of your real projects>?"* or *"list my Skilder hats."* The first call may take a couple of seconds while `mcp-remote` shakes hands with `app.skilder.ai`. The reply should reference real Skilder content (project names, hats, customers) — not a general-knowledge guess.

That's the moment Clawlective Intelligence kicks in: the agent stops being a stranger to your business.

If it instead falls back to `WebFetch` or apologizes for not having the tool:

```bash
tail -100 logs/nanoclaw.log logs/nanoclaw.error.log | grep -iE 'skilder|mcp-remote'
ls -t data/v2-sessions/*/stderr.log | head -1 | xargs tail -50
```

## Troubleshooting

- **`command not found: mcp-remote`** — image wasn't rebuilt after step 2. Run `./container/build.sh` and confirm the layer ran (`docker history <image-tag> | grep mcp-remote`).
- **401 / 403 from `app.skilder.ai`** — UserKey is wrong, expired, or rotated. Generate a new one in the Skilder dashboard and update `container.json`. Don't trim `USK` — it's part of the key.
- **Agent says "I don't have Skilder tools"** — the `mcp__skilder__*` allowlist line didn't make it into `claude.ts`, or the agent-runner image wasn't rebuilt. Confirm both, then `./container/build.sh`.
- **Tools list empty** — Skilder returned no tools for this key. Server-side state issue: confirm the account has access to the relevant features in Skilder's web UI, then restart the container.
- **`mcp-remote` retries forever** — the container can't reach `app.skilder.ai`. Test from inside the image: `docker run --rm <image-tag> curl -sI https://app.skilder.ai/mcp` (expect HTTP 400 — that's reachability, not failure).
- **Branch out of sync** — main moved `container/Dockerfile` or `claude.ts`, and `skill/skilder` is now stale. Open an issue or PR to rebase the branch on main; in the meantime, re-apply the two edits manually (`git diff origin/main..origin/skill/skilder` shows them — small).

## Removal

1. Delete the `"skilder"` entry from each group's `container.json`.
2. Revert the Dockerfile and `claude.ts` changes:
   ```bash
   git checkout origin/main -- container/Dockerfile container/agent-runner/src/providers/claude.ts
   ```
   (Only if no other skill installed since needs them — at time of writing, only this skill modifies those two files in this way.)
3. `pnpm run build && ./container/build.sh && launchctl kickstart -k gui/$(id -u)/com.nanoclaw`.

## Notes for upstream contribution

This skill follows CONTRIBUTING.md type 1 (feature skill, branch-based). Submission flow:

- Push a single PR branch to your fork containing **both** the SKILL.md and the two source edits (`container/Dockerfile`, `container/agent-runner/src/providers/claude.ts`).
- Open the PR against upstream `main`. The maintainer creates `skill/skilder` from the source-edit commit; the SKILL.md commit lands on `main`.
- Verify the pinned `mcp-remote` version: `npm view mcp-remote version` (3-day-old release per the `minimumReleaseAge` policy in `pnpm-workspace.yaml`).
- **Disclose the privacy footprint** in the PR description — Skilder is a hosted service; every tool call sends data to `app.skilder.ai`. Reviewers should not have to infer that.
- If a second remote-MCP skill ever needs `mcp-remote`, factor the Dockerfile lines into a shared base. Today it's a one-liner, so inlining is fine.

## Credits & references

- **Skilder**: https://skilder.ai / https://app.skilder.ai
- **`mcp-remote`**: https://www.npmjs.com/package/mcp-remote — stdio↔HTTP MCP bridge
- **Skill pattern**: branch-based, modeled on [`/add-telegram`](../add-telegram/SKILL.md). HTTP-MCP precedent from [`/add-parallel`](../add-parallel/SKILL.md) (which edits `index.ts` directly — this skill stays per-group instead).
