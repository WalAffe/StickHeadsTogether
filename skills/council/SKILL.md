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

## The council is a tool, not a replacement for your workflow

**Critical:** Consulting the council does NOT bypass normal Claude Code workflows. The council is an *input* to your thinking, not a substitute for it.

### In plan mode

If you're in plan mode when consulting the council, you MUST still:
1. Read the relevant code yourself first
2. Call `council_ask` as one input among others
3. Synthesize the council's perspectives **together with your own analysis** into a plan
4. Write that plan to the plan file (the path given in the plan mode system message)
5. Use `AskUserQuestion` for clarifications — do NOT just dump questions as plain text
6. Use `ExitPlanMode` for approval — do NOT just ask "should I proceed?" in text

The raw council output should appear as supporting context in your response (via the `<details>`-separated format the tools return), but the actual plan must be YOUR synthesis, written to the plan file, with the normal approval flow.

### In PR review mode

Same principle: if the user asks for a PR review, follow the `pr-review` skill's workflow (read code first, brief council with real diff, cross-check findings). The council output is the raw material; your synthesis and false-positive filtering is what the user actually needs.

### In normal chat mode

When the user just asks a question without a specific workflow, you can call the council and present the results directly. But still add your own synthesis — don't just forward the raw responses.

## How to use the tools

### `council_ask` — start a session

Send a prompt to both ChatGPT and Gemini in parallel.

Pick `complexity` based on the task:
- `low`: Simple questions (faster, cheaper models)
- `medium`: Moderate complexity, standard planning tasks
- `high`: Critical decisions, complex reviews (best models)

### `council_discuss` — follow-up rounds

Use the returned `session_id` to ask follow-ups. Useful for resolving disagreements or digging deeper. 2-3 rounds typically produce well-vetted results.

### `ask_chatgpt` / `ask_gemini` — single provider

Use when you only want one perspective instead of both.

### Presenting results

The tools return responses pre-formatted with Markdown separators. Include them as-is in your response and add your own synthesis (agreements, disagreements, priorities, false positives).

## Tips

- Include relevant code, constraints, and context in your prompts - vague questions get vague answers
- When the AIs disagree, `council_discuss` is better than just picking one
- The session is stored in memory for 2 hours
