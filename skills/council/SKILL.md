---
name: council
description: Use when the user asks for planning, PR reviews, architecture decisions, or complex debugging and wants external AI perspectives. Provides council_ask, council_discuss, ask_chatgpt, and ask_gemini tools to consult ChatGPT and Gemini in parallel.
---

# AI Council - StickHeadsTogether

A set of MCP tools to consult ChatGPT and Gemini in parallel when you want additional perspectives.

## When this is useful

- **Planning**: Feature plans, implementation strategies
- **PR Reviews**: Getting multiple perspectives on code changes
- **Architecture decisions**: Technology choices, design patterns
- **Complex debugging**: Root cause analysis when stuck
- **Refactoring strategies**: Choosing the best approach

Use your judgment on when external perspectives would add value. The user can also ask you directly ("ask the council", "what does ChatGPT think", etc.).

## How to use

### Start a session

Use `council_ask` to send a prompt to both ChatGPT and Gemini in parallel.

Pick `complexity` based on the task:
- `low`: Simple questions (faster, cheaper models)
- `medium`: Moderate complexity, standard planning tasks
- `high`: Critical decisions, complex reviews (best models)

### Continue the discussion

After seeing both responses, use `council_discuss` with the returned `session_id` to ask follow-ups. Useful for resolving disagreements or digging deeper. 2-3 rounds typically produce well-vetted results.

### Present the results

The tools return responses pre-formatted with collapsible `<details>` sections. Include them as-is in your response and add your own synthesis above or below. This keeps the conversation readable.

### Single provider

Use `ask_chatgpt` or `ask_gemini` when you only want one perspective instead of both.

## Tips

- Include relevant code, constraints, and context in your prompts - vague questions get vague answers
- When the AIs disagree, `council_discuss` is better than just picking one
- The session is stored in memory for 2 hours
