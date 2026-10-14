import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import plugin from "../.claude-plugin/plugin.json" with { type: "json" };
import { getSetupHint, loadConfig, type CouncilConfig } from "./config.js";
import { formatResults, formatSessionInfo, PROVIDER_STYLE } from "./format.js";
import { ask, configuredProviders, type Message } from "./providers.js";
import {
  addRound,
  buildMessages,
  createSession,
  getSession,
  type Session,
} from "./sessions.js";

type Extra = RequestHandlerExtra<ServerRequest, ServerNotification>;

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });

const complexitySchema = z
  .enum(["low", "medium", "high"])
  .describe(
    "Komplexität der Aufgabe. Steuert die Modellwahl: low = schnell/günstig, high = beste Modelle",
  );

const annotations = { readOnlyHint: true, openWorldHint: true };

const server = new McpServer({
  name: "stick-heads-together",
  version: plugin.version,
  description:
    "AI Council - Nutze ask bei Planungen, PR Reviews, Architekturentscheidungen. Wähle complexity nach Aufgabe (low/medium/high). Führe 2-3 Runden discuss für Synthese.",
});

// Asks all configured providers in parallel, each with its own history, and
// reports progress as each one answers.
async function runRound(
  config: CouncilConfig,
  session: Session,
  message: string,
  extra: Extra,
) {
  const providers = configuredProviders(config);
  const progressToken = extra._meta?.progressToken;
  let done = 0;

  const results = await Promise.all(
    providers.map(async (provider) => {
      const result = await ask(
        config,
        provider,
        session.complexity,
        buildMessages(session, message, provider),
        extra.signal,
      );
      if (progressToken !== undefined) {
        await extra
          .sendNotification({
            method: "notifications/progress",
            params: {
              progressToken,
              progress: ++done,
              total: providers.length,
              message: `${PROVIDER_STYLE[provider].name} hat geantwortet`,
            },
          })
          .catch(() => {});
      }
      return result;
    }),
  );

  const round = addRound(session, message, results);
  return text(
    [
      formatSessionInfo(session.id, round.roundNumber),
      "",
      formatResults(results, round.roundNumber),
    ].join("\n"),
  );
}

server.registerTool(
  "ask",
  {
    description:
      "Starte eine neue Council-Sitzung: Sende einen Prompt parallel an ChatGPT und Gemini. Nutze dies für Planungen, PR Reviews, Architekturentscheidungen. Gibt eine session_id für Folgerunden via discuss zurück.",
    inputSchema: {
      prompt: z
        .string()
        .describe(
          "Die Frage oder der Kontext für beide KIs. Relevanten Code, Pläne oder PR-Inhalte inline einfügen.",
        ),
      complexity: complexitySchema,
      system_context: z
        .string()
        .optional()
        .describe(
          "Optionale System-Instruktion für beide KIs, z.B. 'Du reviewst einen PR für ein TypeScript-Projekt'",
        ),
    },
    annotations,
  },
  async ({ prompt, complexity, system_context }, extra) => {
    const config = loadConfig();
    if (configuredProviders(config).length === 0) return text(getSetupHint());
    return runRound(config, createSession(complexity, system_context), prompt, extra);
  },
);

server.registerTool(
  "discuss",
  {
    description:
      "Führe eine Folgerunde in einer bestehenden Council-Sitzung. Jede KI erhält ihre eigenen früheren Antworten und die der anderen KI als Zitat. Nutze dies um Widersprüche zu klären, Recherche-Ergebnisse zu liefern, oder eine Synthese anzuregen.",
    inputSchema: {
      session_id: z
        .string()
        .describe("Vollständige Session-ID aus einem vorherigen ask oder discuss Aufruf"),
      message: z
        .string()
        .describe(
          "Folge-Nachricht, Synthese oder Frage. Du kannst referenzieren was die KIs in vorherigen Runden gesagt haben.",
        ),
    },
    annotations,
  },
  async ({ session_id, message }, extra) => {
    const session = getSession(session_id);
    if (!session) {
      return text(
        `⚠️ Session \`${session_id}\` nicht gefunden oder abgelaufen. Nutze ask um eine neue Sitzung zu starten.`,
      );
    }
    return runRound(loadConfig(), session, message, extra);
  },
);

for (const provider of ["chatgpt", "gemini"] as const) {
  const { name } = PROVIDER_STYLE[provider];
  server.registerTool(
    provider,
    {
      description: `Frage nur ${name} direkt. Für Fälle wo nur eine einzelne Perspektive gebraucht wird. Erstellt KEINE Council-Session - nutze ask für parallele Antworten und Folgerunden.`,
      inputSchema: {
        prompt: z.string().describe(`Die Frage an ${name}`),
        complexity: complexitySchema,
        system_context: z.string().optional().describe("Optionale System-Instruktion"),
      },
      annotations,
    },
    async ({ prompt, complexity, system_context }, extra) => {
      const config = loadConfig();
      if (!config.apiKeys[provider]) return text(getSetupHint());

      const messages: Message[] = system_context
        ? [{ role: "system", content: system_context }]
        : [];
      messages.push({ role: "user", content: prompt });

      const result = await ask(config, provider, complexity, messages, extra.signal);
      return text(formatResults([result], 1));
    },
  );
}

await server.connect(new StdioServerTransport());
