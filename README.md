# StickHeadsTogether

A Claude Code plugin that lets Claude consult ChatGPT and Gemini in parallel during planning, PR reviews, and architecture decisions. Claude orchestrates the discussion, chooses models by task complexity, and presents results side by side.

## How it works

When you ask Claude to plan a feature or review a PR, Claude can call the council's MCP tools to send your question to ChatGPT and Gemini in parallel, then synthesize their responses. Follow-up rounds let you resolve disagreements or dig deeper.

Two skills ship with the plugin:

- **`council`** — general guidance on when to consult the council and how to present results
- **`pr-review`** — a fixed review schema both AIs must follow, so their reviews are structurally comparable (inspired by [aidankinzett/claude-git-pr-skill](https://github.com/aidankinzett/claude-git-pr-skill))

## Setup

```bash
git clone https://github.com/WalAffe/StickHeadsTogether.git
```

No build step needed: `dist/server.js` ships as a committed bundle.

The repo doubles as a single-plugin marketplace, so install it permanently with:

```bash
claude plugin marketplace add /path/to/StickHeadsTogether
claude plugin install stick-heads-together@stick-heads-together
```

Or for a one-off session, without installing:

```bash
claude --plugin-dir /path/to/StickHeadsTogether
```

> **The plugin runs straight from this clone.** With the directory marketplace,
> Claude Code starts `dist/server.js` from this repo, not from a copy.
> `dist/server.js` is a committed single-file bundle with all dependencies, so a
> fresh clone works without `bun install`. After changing `src/`, run
> `bun run build` (type check plus bundle), commit `dist/server.js` together with
> the source, then run `/mcp` and reconnect `council`.

Then run the setup command in any project to configure your API keys:

```
/stick-heads-together:council-setup
```

This copies `.env.example` to `~/.config/stick-heads-together/.env` for you to fill in.

## Tools

| Tool | Description |
|------|-------------|
| `ask` | Start a new council session — sends a prompt to both AIs in parallel |
| `discuss` | Continue a session with follow-up rounds |
| `chatgpt` | Ask only ChatGPT |
| `gemini` | Ask only Gemini |

## Model Selection

Claude chooses models based on task complexity. Defaults:

| Complexity | OpenAI | Google |
|-----------|--------|--------|
| low | gpt-6-luna | gemini-3.5-flash-lite |
| medium | gpt-6.1-sol | gemini-3.8-flash |
| high | gpt-6-astra | gemini-4-argon |

All defaults can be overridden via env vars (`COUNCIL_OPENAI_LOW`, `COUNCIL_GEMINI_HIGH`, etc.) — see [.env.example](.env.example) for the full list, including which Gemini models are free-tier vs paid-tier.

## Requirements

- [Claude Code](https://claude.com/claude-code) with plugin support
- OpenAI API key (note: ChatGPT Plus does **not** include API access — you need separate credits) and/or
- Google Gemini API key (`gemini-2.5-*` is retired for new keys — the defaults use `gemini-3.5-flash-lite` / `gemini-3.8-flash` on the free tier; `gemini-4-argon` needs billing)
- [Bun](https://bun.sh/), only for working on the source (`bun run build`, `bun run test`)
- Node.js 20+ to run the MCP server

## Credits

Built by [Jonas Doerken](https://github.com/WalAffe) in collaboration with [Claude Code](https://claude.com/claude-code) (Claude Opus 4.6) — the plugin was designed, coded, and iterated on in a single Claude Code session.

The PR review schema and gh CLI posting workflow are inspired by [aidankinzett/claude-git-pr-skill](https://github.com/aidankinzett/claude-git-pr-skill) — a great reference for structured PR reviews via the GitHub CLI.

## License

MIT
