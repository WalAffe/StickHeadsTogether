import type { Provider } from "./config.js";
import type { ProviderResult } from "./providers.js";

export const PROVIDER_STYLE: Record<Provider, { emoji: string; name: string }> = {
  chatgpt: { emoji: "🔵", name: "ChatGPT" },
  gemini: { emoji: "🔴", name: "Gemini" },
};

const tokens = (n: number | undefined) =>
  n === undefined ? "?" : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

export function formatResults(
  results: ProviderResult[],
  roundNumber: number,
): string {
  const parts = results.map((r) => {
    const { emoji, name } = PROVIDER_STYLE[r.provider];
    const usage = r.usage
      ? ` · ${tokens(r.usage.inputTokens)} in / ${tokens(r.usage.outputTokens)} out`
      : "";
    const header = `## ${emoji} ${name} — ${r.model} — Runde ${roundNumber}${r.error ? " ⚠️ Fehler" : usage}`;
    const body = r.error ? `**Fehler:** ${r.error}` : r.response;
    return ["---", "", header, "", body, ""].join("\n");
  });

  return [...parts, "---"].join("\n\n");
}

// The full id: discuss needs it verbatim.
export function formatSessionInfo(sessionId: string, round: number): string {
  return `**Session:** \`${sessionId}\` · **Runde:** ${round}`;
}
