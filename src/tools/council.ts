import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadConfig, getSetupHint } from "../config.js";
import { createProviders, type Complexity } from "../providers.js";
import {
  createSession,
  getSession,
  addRound,
  buildMessages,
} from "../sessions.js";
import { formatResults, formatSessionInfo } from "../format.js";

const complexitySchema = z
  .enum(["low", "medium", "high"])
  .describe(
    "Komplexität der Aufgabe. Steuert die Modellwahl: low = schnell/günstig, high = beste Modelle",
  );

export function registerCouncilTools(server: McpServer) {
  server.registerTool(
    "council_ask",
    {
      description:
        "Starte eine neue Council-Sitzung: Sende einen Prompt parallel an ChatGPT und Gemini. Nutze dies für Planungen, PR Reviews, Architekturentscheidungen. Gibt eine session_id für Folgerunden via council_discuss zurück.",
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
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ prompt, complexity, system_context }, extra) => {
      const config = loadConfig();
      if (!config.isConfigured) {
        return { content: [{ type: "text", text: getSetupHint() }] };
      }

      const providers = createProviders(config);
      const session = createSession(complexity as Complexity, system_context);

      const messages = buildMessages(session, prompt);

      await extra
        .sendNotification({
          method: "notifications/progress" as any,
          params: {
            progressToken: `council-${session.id}`,
            progress: 0,
            total: 1,
            message: "Frage an ChatGPT und Gemini gesendet...",
          },
        })
        .catch(() => {});

      const results = await providers.askBoth(
        complexity as Complexity,
        messages,
      );
      const round = addRound(session, prompt, results);

      await extra
        .sendNotification({
          method: "notifications/progress" as any,
          params: {
            progressToken: `council-${session.id}`,
            progress: 1,
            total: 1,
            message: "Beide Antworten erhalten.",
          },
        })
        .catch(() => {});

      const output = [
        formatSessionInfo(session.id, round.roundNumber),
        "",
        formatResults(results, round.roundNumber),
      ].join("\n");

      return {
        content: [{ type: "text", text: output }],
      };
    },
  );

  server.registerTool(
    "council_discuss",
    {
      description:
        "Führe eine Folgerunde in einer bestehenden Council-Sitzung. Beide KIs erhalten die volle Konversationshistorie. Nutze dies um Widersprüche zu klären, zu vertiefen, oder eine Synthese anzuregen.",
      inputSchema: {
        session_id: z
          .string()
          .describe(
            "Session-ID aus einem vorherigen council_ask oder council_discuss Aufruf",
          ),
        message: z
          .string()
          .describe(
            "Folge-Nachricht, Synthese oder Frage. Du kannst referenzieren was die KIs in vorherigen Runden gesagt haben.",
          ),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ session_id, message }, extra) => {
      const session = getSession(session_id);
      if (!session) {
        return {
          content: [
            {
              type: "text",
              text: `⚠️ Session \`${session_id}\` nicht gefunden oder abgelaufen. Nutze council_ask um eine neue Sitzung zu starten.`,
            },
          ],
        };
      }

      const config = loadConfig();
      const providers = createProviders(config);
      const messages = buildMessages(session, message);

      const roundNum = session.rounds.length + 1;
      await extra
        .sendNotification({
          method: "notifications/progress" as any,
          params: {
            progressToken: `council-${session.id}`,
            progress: 0,
            total: 1,
            message: `Runde ${roundNum}: Frage an beide KIs gesendet...`,
          },
        })
        .catch(() => {});

      const results = await providers.askBoth(session.complexity, messages);
      const round = addRound(session, message, results);

      await extra
        .sendNotification({
          method: "notifications/progress" as any,
          params: {
            progressToken: `council-${session.id}`,
            progress: 1,
            total: 1,
            message: `Runde ${round.roundNumber} abgeschlossen.`,
          },
        })
        .catch(() => {});

      const output = [
        formatSessionInfo(session.id, round.roundNumber),
        "",
        formatResults(results, round.roundNumber),
      ].join("\n");

      return {
        content: [{ type: "text", text: output }],
      };
    },
  );
}
