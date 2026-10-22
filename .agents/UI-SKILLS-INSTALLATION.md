# Requested UI/UX skills installation

Installed 22 October 2026 in the project root, before product-source edits.

## UI/UX Pro Max

Command: `npm_config_cache=/workspace/.npm-cache npx ui-ux-pro-max-cli init --ai codex`.
CLI version: 2.15.0. Skill: `.agents/skills/ui-ux-pro-max/SKILL.md`.
The original command failed with `ENOENT` for `/home/agent/.npm/_cacache`; the writable cache resolved the install.

## ibelick UI Skills

Official README inspected: https://github.com/ibelick/ui-skills/blob/main/README.md.
The current README documents `npx ui-skills get baseline-ui`, with no separate Codex install section.
CLI version: 0.2.4. That fetch failed with `Error communicating with ui-skills.com: fetch failed` (exit 4).

Fallback: cloned the official repository and copied its `skills/*` directories unchanged to `.agents/skills/`.
Upstream revision: `55363c305097d4c84487bd5f323d29b3f067bf72`.
The MIT licence is preserved at `.agents/skills/UI-SKILLS-LICENSE`.

Implementation context selected: `baseline-ui`, `fixing-accessibility`, `fixing-motion-performance`.
`ui-skills-root` routing instructions were read. `improve-ui` is a separate audit/plan-only workflow and is not selected for implementing this request.

The existing project identity, primitives, routes and user-approved scope take precedence over generic palette/font recommendations or unsolicited framework migrations. Skill files are available to read in this session; automatic discovery in a fresh Codex session may require restarting the assistant as noted by the Pro Max installer.
