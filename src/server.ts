import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerCouncilTools } from "./tools/council.js";
import { registerIndividualTools } from "./tools/individual.js";

const server = new McpServer(
  {
    name: "stick-heads-together",
    version: "0.1.0",
    description:
      "AI Council - Nutze council_ask automatisch bei Planungen, PR Reviews, Architekturentscheidungen. Wähle complexity nach Aufgabe (low/medium/high). Führe 2-3 Runden council_discuss für Synthese.",
  },
);

registerCouncilTools(server);
registerIndividualTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
