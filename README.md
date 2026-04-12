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
cd StickHeadsTogether
bun install && bun run build
```

Install as a Claude Code plugin (add to `~/.claude/settings.json`):

```json
{
  "plugins": {
    "local": ["/path/to/StickHeadsTogether"]
  }
}
```

Or for a one-off session:

```bash
claude --plugin-dir /path/to/StickHeadsTogether
```

Then run the setup command in any project to configure your API keys:

```
/stick-heads-together:council-setup
```

This copies `.env.example` to `~/.config/stick-heads-together/.env` for you to fill in.

## Tools

| Tool | Description |
|------|-------------|
| `council_ask` | Start a new council session — sends a prompt to both AIs in parallel |
| `council_discuss` | Continue a session with follow-up rounds |
| `ask_chatgpt` | Ask only ChatGPT |
| `ask_gemini` | Ask only Gemini |

## Model Selection

Claude chooses models based on task complexity. Defaults:

| Complexity | OpenAI | Google |
|-----------|--------|--------|
| low | gpt-5.4-mini | gemini-2.5-flash |
| medium | gpt-5.4-mini | gemini-2.5-flash |
| high | gpt-5.4 | gemini-2.5-flash |

All defaults can be overridden via env vars (`COUNCIL_OPENAI_LOW`, `COUNCIL_GEMINI_HIGH`, etc.) — see [.env.example](.env.example) for the full list, including which Gemini models are free-tier vs paid-tier.

## Requirements

- [Claude Code](https://claude.com/claude-code) with plugin support
- OpenAI API key (note: ChatGPT Plus does **not** include API access — you need separate credits) and/or
- Google Gemini API key (free tier works with `gemini-2.5-flash`)
- [Bun](https://bun.sh/) for building
- Node.js 20+ to run the MCP server

## Credits

Built by [Jonas Doerken](https://github.com/WalAffe) in collaboration with [Claude Code](https://claude.com/claude-code) (Claude Opus 4.6) — the plugin was designed, coded, and iterated on in a single Claude Code session.

The PR review schema and gh CLI posting workflow are inspired by [aidankinzett/claude-git-pr-skill](https://github.com/aidankinzett/claude-git-pr-skill) — a great reference for structured PR reviews via the GitHub CLI.

## License

MIT
