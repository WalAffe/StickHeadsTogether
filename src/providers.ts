import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, type LanguageModel } from "ai";
import type { Complexity, CouncilConfig, Provider } from "./config.js";

export type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

export interface ProviderResult {
  provider: Provider;
  model: string;
  response: string;
  error?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}

// Per provider call. High-tier models with a large briefing can take minutes.
const TIMEOUT_MS = 5 * 60 * 1000;

const CLIENTS: Record<Provider, (apiKey: string) => (model: string) => LanguageModel> = {
  chatgpt: (apiKey) => createOpenAI({ apiKey }),
  gemini: (apiKey) => createGoogleGenerativeAI({ apiKey }),
};

export function configuredProviders(config: CouncilConfig): Provider[] {
  return (["chatgpt", "gemini"] as const).filter((p) => config.apiKeys[p]);
}

// Never throws: every failure comes back as `error`, so one provider can't
// take down the other's answer.
export async function ask(
  config: CouncilConfig,
  provider: Provider,
  complexity: Complexity,
  messages: Message[],
  abortSignal?: AbortSignal,
): Promise<ProviderResult> {
  const model = config.models[provider][complexity];
  const apiKey = config.apiKeys[provider];
  if (!apiKey) {
    return { provider, model, response: "", error: "API Key nicht konfiguriert" };
  }

  try {
    const result = await generateText({
      model: CLIENTS[provider](apiKey)(model),
      messages,
      maxOutputTokens: 16384,
      timeout: TIMEOUT_MS,
      abortSignal,
    });
    const { inputTokens, outputTokens } = result.usage;
    return { provider, model, response: result.text, usage: { inputTokens, outputTokens } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { provider, model, response: "", error: message };
  }
}
