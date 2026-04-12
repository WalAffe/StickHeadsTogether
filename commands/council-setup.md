---
name: council-setup
description: Set up StickHeadsTogether by configuring your OpenAI and Gemini API keys
---

# Council Setup

Guide the user through setting up their API keys. **NEVER ask the user to paste API keys into the chat.** Keys must never flow through an LLM prompt.

## Steps

1. **Check if already configured:**
   Check if `~/.config/stick-heads-together/.env` exists. If it does, offer to validate the existing config instead of overwriting.

2. **Create the config directory:**
   ```bash
   mkdir -p ~/.config/stick-heads-together
   ```

3. **Copy the template:**
   There's a `.env.example` in the plugin root (`${CLAUDE_PLUGIN_ROOT}/.env.example`). Copy it to the config location:
   ```bash
   cp ${CLAUDE_PLUGIN_ROOT}/.env.example ~/.config/stick-heads-together/.env
   chmod 600 ~/.config/stick-heads-together/.env
   ```

4. **Tell the user to edit the file themselves** (in their own editor, NOT through Claude):
   ```bash
   $EDITOR ~/.config/stick-heads-together/.env
   ```
   The template contains all needed comments about:
   - Where to get API keys (OpenAI platform, Google AI Studio)
   - The important note that ChatGPT Plus does NOT include API access
   - Which Gemini models are free-tier vs paid-tier
   - How to override models per complexity level

5. **After the user confirms they've saved the keys**, validate by calling `ask_chatgpt` and `ask_gemini` with a simple "Say hello in one sentence" prompt. Report which providers work.

## Important

- **NEVER** ask the user to type, paste, or share their API keys in the chat
- **NEVER** read the .env file contents - only check if the file exists
- Only use the MCP tools to validate that keys work (the server reads them internally)
- Both keys are optional - the council works with just one provider too
- If `gemini-3*-preview` models fail with "quota exceeded", that's because they require Gemini paid tier. Recommend `gemini-2.5-flash` which works on free tier.
