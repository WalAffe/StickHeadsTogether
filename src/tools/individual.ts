import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadConfig, getSetupHint } from "../config.js";
import { createProviders, type Complexity } from "../providers.js";
import { formatResults } from "../format.js";

const complexitySchema = z
  .enum(["low", "medium", "high"])
  .describe(
    "Komplexität der Aufgabe. Steuert die Modellwahl: low = schnell/günstig, high = beste Modelle",
  );

export function registerIndividualTools(server: McpServer) {
  server.registerTool(
    "ask_chatgpt",
    {
      description:
        "Frage nur ChatGPT direkt. Für Fälle wo nur eine einzelne Perspektive gebraucht wird. Erstellt KEINE Council-Session - nutze council_ask für parallele Antworten und Folgerunden.",
      inputSchema: {
        prompt: z.string().describe("Die Frage an ChatGPT"),
        complexity: complexitySchema,
        system_context: z
          .string()
          .optional()
          .describe("Optionale System-Instruktion"),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ prompt, complexity, system_context }) => {
      const config = loadConfig();
      if (!config.openaiApiKey) {
        return { content: [{ type: "text", text: getSetupHint() }] };
      }

      const providers = createProviders(config);
      const messages: Array<{
        role: "user" | "assistant" | "system";
        content: string;
      }> = [];
      if (system_context) {
        messages.push({ role: "system", content: system_context });
      }
      messages.push({ role: "user", content: prompt });

      const result = await providers.askSingle(
        "chatgpt",
        complexity as Complexity,
        messages,
      );

      return {
        content: [{ type: "text", text: formatResults([result], 1) }],
      };
    },
  );

  server.registerTool(
    "ask_gemini",
    {
      description:
        "Frage nur Gemini direkt. Für Fälle wo nur eine einzelne Perspektive gebraucht wird. Erstellt KEINE Council-Session - nutze council_ask für parallele Antworten und Folgerunden.",
      inputSchema: {
        prompt: z.string().describe("Die Frage an Gemini"),
        complexity: complexitySchema,
        system_context: z
          .string()
          .optional()
          .describe("Optionale System-Instruktion"),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ prompt, complexity, system_context }) => {
      const config = loadConfig();
      if (!config.geminiApiKey) {
        return { content: [{ type: "text", text: getSetupHint() }] };
      }

      const providers = createProviders(config);
      const messages: Array<{
        role: "user" | "assistant" | "system";
        content: string;
      }> = [];
      if (system_context) {
        messages.push({ role: "system", content: system_context });
      }
      messages.push({ role: "user", content: prompt });

      const result = await providers.askSingle(
        "gemini",
        complexity as Complexity,
        messages,
      );

      return {
        content: [{ type: "text", text: formatResults([result], 1) }],
      };
    },
  );
}
