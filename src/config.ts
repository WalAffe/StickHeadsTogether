import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { config as loadDotenv } from "dotenv";

const CONFIG_DIR = resolve(
  process.env.COUNCIL_CONFIG_DIR?.replace("~", homedir()) ??
    resolve(homedir(), ".config", "stick-heads-together"),
);
const ENV_FILE = resolve(CONFIG_DIR, ".env");

export interface ModelConfig {
  low: string;
  medium: string;
  high: string;
}

export interface CouncilConfig {
  openaiApiKey: string | undefined;
  geminiApiKey: string | undefined;
  openaiModels: ModelConfig;
  geminiModels: ModelConfig;
  configDir: string;
  envFile: string;
  isConfigured: boolean;
}

const DEFAULT_OPENAI_MODELS: ModelConfig = {
  low: "gpt-5.4-mini",
  medium: "gpt-5.4-mini",
  high: "gpt-5.4",
};

const DEFAULT_GEMINI_MODELS: ModelConfig = {
  low: "gemini-2.5-flash",
  medium: "gemini-2.5-flash",
  high: "gemini-2.5-flash",
};

export function loadConfig(): CouncilConfig {
  if (existsSync(ENV_FILE)) {
    loadDotenv({ path: ENV_FILE });
  }

  const openaiApiKey = process.env.OPENAI_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  const openaiModels: ModelConfig = {
    low: process.env.COUNCIL_OPENAI_LOW ?? DEFAULT_OPENAI_MODELS.low,
    medium: process.env.COUNCIL_OPENAI_MEDIUM ?? DEFAULT_OPENAI_MODELS.medium,
    high: process.env.COUNCIL_OPENAI_HIGH ?? DEFAULT_OPENAI_MODELS.high,
  };

  const geminiModels: ModelConfig = {
    low: process.env.COUNCIL_GEMINI_LOW ?? DEFAULT_GEMINI_MODELS.low,
    medium: process.env.COUNCIL_GEMINI_MEDIUM ?? DEFAULT_GEMINI_MODELS.medium,
    high: process.env.COUNCIL_GEMINI_HIGH ?? DEFAULT_GEMINI_MODELS.high,
  };

  return {
    openaiApiKey,
    geminiApiKey,
    openaiModels,
    geminiModels,
    configDir: CONFIG_DIR,
    envFile: ENV_FILE,
    isConfigured: Boolean(openaiApiKey || geminiApiKey),
  };
}

export function getSetupHint(): string {
  return [
    "⚠️ Council ist noch nicht eingerichtet.",
    "Nutze /council-setup um deine API Keys zu konfigurieren.",
    `Die Keys werden sicher in ${ENV_FILE} gespeichert.`,
  ].join("\n");
}
