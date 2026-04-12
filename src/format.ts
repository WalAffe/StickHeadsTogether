import type { ProviderResult } from "./providers.js";

const PROVIDER_STYLE: Record<string, { emoji: string; name: string }> = {
  chatgpt: { emoji: "🔵", name: "ChatGPT" },
  gemini: { emoji: "🔴", name: "Gemini" },
};

export function formatResults(
  results: ProviderResult[],
  roundNumber: number,
): string {
  const parts: string[] = [];

  for (const result of results) {
    const style = PROVIDER_STYLE[result.provider] ?? {
      emoji: "⚪",
      name: result.provider,
    };

    const header = result.error
      ? `## ${style.emoji} ${style.name} — ${result.model} — Runde ${roundNumber} ⚠️ Fehler`
      : `## ${style.emoji} ${style.name} — ${result.model} — Runde ${roundNumber}`;

    const body = result.error ? `**Fehler:** ${result.error}` : result.response;

    parts.push([`---`, ``, header, ``, body, ``].join("\n"));
  }

  parts.push(`---`);
  return parts.join("\n\n");
}

export function formatSessionInfo(sessionId: string, round: number): string {
  return `**Session:** \`${sessionId.slice(0, 8)}\` · **Runde:** ${round}`;
}
