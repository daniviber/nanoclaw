---
name: add-clawlective
description: Build Clawlective Intelligence for your organization's NanoClaws — your team's living layer of shared AI capabilities and context. Powered by Skilder, which stores, versions, and distributes skills, tools, and knowledge composed into role-based Hats — for every claw on the team. One author, every agent.
---

# Add Clawlective Intelligence — powered by [Skilder](https://skilder.ai)

> **Clawlective Intelligence.** Your team stops running N disconnected claws and starts running as one shoal. Skilder is the layer that distributes capabilities and context to every claw on the team — and keeps them in sync as your playbook evolves.

## The problem this solves

A team that runs more than one NanoClaw runs into the same wall every time:

- Niclaw on WhatsApp, a teammate's claw on Slack, a third on a server — each starts from zero, with its own slice of prompt, its own copy of the playbook.
- Someone improves how the team handles weekly product updates. That improvement lives in *one* local *.md. The other claws keep doing it the old way.
- Two months in, every claw's prompt is a slightly different fork of the original. Bug fixes have to be applied N times. Some get missed. Agents disagree on basic facts about how the team works.
- Onboarding a 4th claw means re-doing the prompt-engineering work for it from scratch.

This is the same problem any distributed system has: **shared capabilities need a distribution and lifecycle layer, not N copies that drift.**

## What Skilder does about it

Skilder is that layer. It **stores, versions, and distributes** the team's AI capabilities and context to every wired claw, live, on every call:

- **Author once, every claw has it.** A skill written in Skilder is available to every connected NanoClaw on the next message. No deploy, no copy, no sync script.
- **Edit once, every claw uses the new version.** Skills are read at call-time. Yesterday's tweak to `weekly-investor-update` is what every claw uses today. Drift can't accumulate because there's only one source.
- **Roles travel.** A **Hat** — a role-based composition of skills, the tools they expose, and instructions for when to wear it — can be picked up by any claw on the team. "Wear the on-call engineer hat" works the same on Slack-claw as on WhatsApp-claw, because the Hat *is* the role.
- **Reviewed in one place.** Skill changes happen in Skilder's graph-db, with normal review and audit. They don't get smuggled in through edits to N different prompt files.
- **The collective compounds.** Every skill a teammate ships becomes part of every other teammate's claw next conversation. The Clawlective Intelligence grows from the team's actual work, not from a side-project "AI ops" effort that nobody has time for.

This is what *Clawlective Intelligence* names: a team's claws acting as a shoal because they share a living capability layer, not because someone keeps their prompts in sync by hand.

### What's a Hat?

A **Hat** is a **role-based composition**: a named bundle of skills + the tools those skills expose + instructions for when and how to wear it (e.g. *Investor Relations*, *On-Call Engineer*, *Sales Rep*, *Founder*). When a claw picks up a Hat, it inherits that role's full posture in one move for the session. Hats are how Skilder turns a flat capability library into role-specific behavior — without per-claw prompt sprawl, and without each teammate having to re-author the same role on their own claw. Full schema and patterns: [docs.skilder.ai](https://docs.skilder.ai).

### How is this different from `/add-karpathy-llm-wiki`?

`/add-karpathy-llm-wiki` is **per-claw and local** — one NanoClaw curates a file-based wiki on disk over time, its own notes in its own scope. It's personal memory.

Clawlective Intelligence is **per-team and live** — every wired claw, across channels and across teammates, draws from the same authored, versioned, distributed runtime served by Skilder. It's the team's shared capability layer.

They compose well: wiki for *this claw's private memory*, Clawlective for *the team's evolving playbook*.

## What the agent actually gets — `mcp__skilder__*`

The wired claw can **read** the team's library (what skills exist, what Hats are available, what tools each skill exposes) and **author into** it (create or refine skills as the team works). Tools group into:

- **Skills** — the named, reusable capabilities. `list-skills`, `get-skill`, `create-skill`, `update-skill`, `delete-skill`, `add-tool-to-skill`, `remove-tool-from-skill`.
- **Skill Content** — the references, scripts, and assets a skill is built on. `list-skill-content`, `get-skill-content`, `create-skill-content`, `update-skill-content`, `delete-skill-content`.
- **Hats** — role bundles. `list-hats`, `get-hat`, `create-hat`, `update-hat`, `delete-hat`, `add-skill-to-hat`, `remove-skill-from-hat`.
- **Org Units** — team / group structure that scopes distribution. `list-org-units`, `get-org-unit`, `create-org-unit`, `update-org-unit`, `delete-org-unit`, `reparent-org-unit`.
- **Discovery** — `list-available-tools`.
- **MCP server management** — `prepare_mcp_config`, `install_mcp_server` (for skills that bring their own MCP servers).

Read-side tools are what the claw reaches for during normal conversations. Write-side tools let the claw help the user evolve the library — the lifecycle loop that makes Clawlective compound rather than stagnate. Full reference: [docs.skilder.ai](https://docs.skilder.ai).

## Install

NanoClaw doesn't ship `mcp-remote` or the `mcp__skilder__*` allowlist entry in trunk. This skill brings them in from the `skill/clawlective` branch and wires the selected group(s) locally.

### Pre-flight (idempotent)

Skip to **Credentials** if both of these are already in place:

- `container/Dockerfile` contains `MCP_REMOTE_VERSION` and a `pnpm install -g "mcp-remote@${MCP_REMOTE_VERSION}"` block
- `container/agent-runner/src/providers/claude.ts` contains `'mcp__skilder__*'` in `TOOL_ALLOWLIST`

Otherwise, every step below is safe to re-run.

### 1. Fetch the skill branch

```bash
git fetch origin skill/clawlective
```

### 2. Copy the Dockerfile and tool-allowlist file

```bash
git show origin/skill/clawlective:container/Dockerfile > container/Dockerfile
git show origin/skill/clawlective:container/agent-runner/src/providers/claude.ts > container/agent-runner/src/providers/claude.ts
```

These are the only two files that change. We deliberately **do not** `git merge origin/skill/clawlective` (the pattern other feature skills use): the branch carries unrelated drift from when it was forked, and a merge would clobber the user's `whatsapp.ts`, `scripts/claw`, `pnpm-lock.yaml`, and other live files. Surgical copy avoids that. If `git show` reports a stale hunk after a build failure, see **Branch out of sync** in Troubleshooting.

### 3. Build host + container

```bash
pnpm run build
./container/build.sh
```

Both must complete cleanly. The container build adds one new layer for the `mcp-remote` install (~10s with cache, ~30s cold).

## Credentials

### Get a Skilder UserKey

Skilder issues the credential that authenticates a NanoClaw to the team's Clawlective layer. Use AskUserQuestion: *Do you already have a Skilder UserKey, or do you need to create one?*

If they need one, tell them:

1. Go to https://app.skilder.ai/register and create your account (or sign in if you already have one).
2. Open the **Profile** page from the left nav (or your avatar menu) → switch to the **API Keys** tab.
3. Generate a **UserKey** and copy it — it starts with `USK` and is **46 characters total** (e.g. `USKy...`).
4. Paste it here.

Wait for the key. **Do not echo it back, write it to `.env`, or commit it.** The key only ever lives in `groups/<folder>/container.json`, which is per-host.

Validate minimally: starts with `USK`, length 46. If it doesn't match, ask again — almost certainly a copy/paste mistake.

### Bringing teammates onto the same Clawlective

A UserKey is scoped to one user inside one workspace. For teammates' claws to draw from the same library — which is the whole point — the workspace admin must invite them in Skilder first:

1. https://app.skilder.ai → workspace settings → **Users & Roles** → **Invite user** by email.
2. The teammate accepts, opens their own Profile → API Keys tab, generates their own UserKey.
3. They run `/add-clawlective` on their own NanoClaw with that key.

Until step 1 happens, a teammate's fresh UserKey only sees their personal scope — and the collective stays siloed. The whole "one fleet" effect depends on every claw resolving to the same workspace.

## Pick which agent groups join the collective

```bash
ls groups/
```

Use AskUserQuestion: *Which agent group(s) should join the Clawlective Intelligence? You can wire more than one — every group will draw from the same Skilder workspace.* — list each `groups/<folder>/` entry.

For each group selected, confirm whether the same UserKey applies, or whether each group should use a different one. Most teams use one shared key per Skilder workspace; multi-key setups are unusual.

## Wire per-agent-group

For each selected group, merge into `groups/<folder>/container.json`:

```json
{
  "mcpServers": {
    "skilder": {
      "command": "mcp-remote",
      "args": [
        "https://app.skilder.ai/mcp?key=USKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      ],
      "env": {},
      "instructions": "You're a claw in **Clawlective Intelligence**, powered by Skilder — the team's shared, versioned layer of AI capabilities and context. Every other claw on this team draws from the same library you do: **Skills** (named reusable capabilities), **Hats** (role-based bundles of skills + tools + instructions), **Skill Content** (the references, scripts, assets the skills are built on), and **Org Units** (the team structure). When the user asks how the team does something, what role to take, what tools are available, or anything about the team's playbook, prefer the `mcp__skilder__*` tools (start with `list-skills`, `list-hats`, or `list-available-tools`) over WebFetch or general search — the answer lives in the team's library, not on the public web. When the user invents or refines a way of doing something, offer to capture it as a skill or update an existing one, so the rest of the team's claws inherit it next conversation. Skip these tools for purely public-info questions (general web facts, code, math). Never surface or log the underlying MCP URL — it embeds the user's key."
    }
  }
}
```

Substitute the real UserKey for the `USKxxx...` placeholder. Read existing `container.json` as JSON, set `cfg.mcpServers.skilder = {...}`, write it back pretty-printed — don't blow away other entries.

The MCP server is registered as `skilder` (the actual provider) and tools surface as `mcp__skilder__*`; the user-facing positioning is **Clawlective Intelligence**. Both names matter — keep them consistent: provider in code, value in product.

The `instructions` field is composed into the agent's `CLAUDE.md` at spawn ([src/claude-md-compose.ts:95](../../../src/claude-md-compose.ts#L95)) so the claw picks up its Clawlective posture without you editing the group's main `CLAUDE.md`.

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

In the wired claw's chat, run two probes that exercise the team's library:

1. **"list my Skilder hats"** — exercises `list-hats`. Should return your workspace's Hats by name and color.
2. **"what skills are available to me?"** — exercises `list-skills`. Should return real skill names from your library, not a generic "I can help with…" answer.

The first call may take a couple of seconds while `mcp-remote` shakes hands with `app.skilder.ai`. The replies should reference real Skilder content (Hat names, skill names) — not a general-knowledge guess.

That's the moment Clawlective Intelligence kicks in: the claw stops being its own island and starts speaking on behalf of the team.

If it instead falls back to WebFetch or apologizes for not having the tool:

```bash
tail -100 logs/nanoclaw.log logs/nanoclaw.error.log | grep -iE 'skilder|mcp-remote|clawlective'
ls -t data/v2-sessions/*/stderr.log | head -1 | xargs tail -50
```

## Troubleshooting

- **`command not found: mcp-remote`** — image wasn't rebuilt after step 2. Run `./container/build.sh` and confirm the layer ran (`docker history <image-tag> | grep mcp-remote`).
- **401 / 403 from `app.skilder.ai`** — UserKey is wrong, expired, or rotated. Generate a new one in Profile → API Keys and update `container.json`. Don't trim `USK` — it's part of the key. Length should be 46.
- **Agent says "I don't have those tools"** — the `mcp__skilder__*` allowlist line didn't make it into `claude.ts`, or the agent-runner image wasn't rebuilt. Confirm both, then `./container/build.sh`.
- **List queries return nothing** — the workspace this UserKey resolves to has no skills or hats yet (fresh workspace), or the workspace was soft-deleted. Confirm in Skilder's web UI; if soft-deleted, restore it or generate a key from a live workspace.
- **One teammate's claw sees a different library than another's** — they're in different workspaces. The admin needs to invite them into the same Skilder workspace (Users & Roles → Invite user); a personal workspace and a team workspace are separate libraries.
- **`mcp-remote` retries forever** — the container can't reach `app.skilder.ai`. Test from inside the image: `docker run --rm <image-tag> curl -sI https://app.skilder.ai/mcp` (expect HTTP 400 — that's reachability, not failure).
- **Branch out of sync** — `main` moved `container/Dockerfile` or `claude.ts`, and `skill/clawlective` is now stale. Open an issue or PR to rebase the branch on main; in the meantime, re-apply the two edits manually (`git diff origin/main..origin/skill/clawlective` shows them — small).

## Removal

1. Delete the `"skilder"` entry from each group's `container.json`.
2. Revert the Dockerfile and `claude.ts` changes: `git checkout origin/main -- container/Dockerfile container/agent-runner/src/providers/claude.ts`
   (Only if no other skill installed since needs them — at time of writing, only this skill modifies those two files in this way.)
3. `pnpm run build && ./container/build.sh && launchctl kickstart -k gui/$(id -u)/com.nanoclaw`.

## Notes for upstream contribution

This skill follows [CONTRIBUTING.md](../../../CONTRIBUTING.md) type 1 (feature skill, branch-based). Submission flow:

- Push a single PR branch to your fork containing both the SKILL.md and the two source edits (`container/Dockerfile`, `container/agent-runner/src/providers/claude.ts`).
- Open the PR against upstream `main`. The maintainer creates `skill/clawlective` from the source-edit commit; the SKILL.md commit lands on `main`.
- Verify the pinned `mcp-remote` version: `npm view mcp-remote version` (3-day-old release per the `minimumReleaseAge` policy in `pnpm-workspace.yaml`).
- Disclose the privacy footprint in the PR description. Skilder is a hosted service; tool calls are processed on Skilder's servers and read/write workspace-scoped data (skills, hats, content, org units). At time of writing, no third-party analytics layer sits in the MCP request path — only operational logging on Skilder's side.
- Naming convention: skill is `/add-clawlective` (the value); MCP server and tool prefix stay `skilder` / `mcp__skilder__*` (the provider). Keep both — the wrapper rebrand should not leak into the technical surface.
- If a second remote-MCP skill ever needs `mcp-remote`, factor the Dockerfile lines into a shared base. Today it's a one-liner, so inlining is fine.

## Credits & references

- **Powered by Skilder**: https://skilder.ai / https://app.skilder.ai — the platform that stores, versions, and distributes the team's AI capabilities and context behind Clawlective Intelligence.
- **Full Skilder documentation**: https://docs.skilder.ai — Skills, Hats, Org Units, Skill Content, MCP tool reference, governance patterns.
- **mcp-remote**: https://www.npmjs.com/package/mcp-remote — stdio↔HTTP MCP bridge.
- **Skill pattern**: branch-based, modeled on `/add-telegram`. HTTP-MCP precedent from `/add-parallel` (which edits `index.ts` directly — this skill stays per-group instead).
