import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { config as loadDotenv } from "dotenv";

export type Provider = "chatgpt" | "gemini";
export type Complexity = "low" | "medium" | "high";
export type ModelConfig = Record<Complexity, string>;

export const CONFIG_DIR = resolve(
  process.env.COUNCIL_CONFIG_DIR?.replace("~", homedir()) ??
    resolve(homedir(), ".config", "stick-heads-together"),
);
const ENV_FILE = resolve(CONFIG_DIR, ".env");

export interface CouncilConfig {
  apiKeys: Record<Provider, string | undefined>;
  models: Record<Provider, ModelConfig>;
}

const DEFAULT_MODELS: Record<Provider, ModelConfig> = {
  chatgpt: { low: "gpt-6-luna", medium: "gpt-6.1-sol", high: "gpt-6-astra" },
  gemini: {
    low: "gemini-3.5-flash-lite",
    medium: "gemini-3.8-flash",
    high: "gemini-4-argon",
  },
};

// Env overrides: COUNCIL_OPENAI_LOW, COUNCIL_GEMINI_HIGH, ...
const modelsFromEnv = (prefix: string, defaults: ModelConfig): ModelConfig => ({
  low: process.env[`${prefix}_LOW`] ?? defaults.low,
  medium: process.env[`${prefix}_MEDIUM`] ?? defaults.medium,
  high: process.env[`${prefix}_HIGH`] ?? defaults.high,
});

export function loadConfig(): CouncilConfig {
  if (existsSync(ENV_FILE)) {
    // quiet: dotenv 17 logs to stdout, which corrupts the MCP stdio stream
    loadDotenv({ path: ENV_FILE, quiet: true });
  }

  return {
    apiKeys: {
      chatgpt: process.env.OPENAI_API_KEY,
      gemini: process.env.GEMINI_API_KEY,
    },
    models: {
      chatgpt: modelsFromEnv("COUNCIL_OPENAI", DEFAULT_MODELS.chatgpt),
      gemini: modelsFromEnv("COUNCIL_GEMINI", DEFAULT_MODELS.gemini),
    },
  };
}

export function getSetupHint(): string {
  return [
    "⚠️ Council ist noch nicht eingerichtet.",
    "Nutze /stick-heads-together:council-setup um deine API Keys zu konfigurieren.",
    `Die Keys werden sicher in ${ENV_FILE} gespeichert.`,
  ].join("\n");
}
