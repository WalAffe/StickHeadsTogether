import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, type LanguageModel } from "ai";
import type { CouncilConfig } from "./config.js";

export type Complexity = "low" | "medium" | "high";

export interface ProviderResult {
  provider: "chatgpt" | "gemini";
  model: string;
  response: string;
  error?: string;
}

export function createProviders(config: CouncilConfig) {
  const openai = config.openaiApiKey
    ? createOpenAI({ apiKey: config.openaiApiKey })
    : undefined;

  const google = config.geminiApiKey
    ? createGoogleGenerativeAI({ apiKey: config.geminiApiKey })
    : undefined;

  const modelFor = (
    provider: "openai" | "google",
    complexity: Complexity,
  ): string =>
    provider === "openai"
      ? config.openaiModels[complexity]
      : config.geminiModels[complexity];

  async function ask(
    model: LanguageModel,
    provider: "chatgpt" | "gemini",
    modelName: string,
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  ): Promise<ProviderResult> {
    try {
      const result = await generateText({ model, messages, maxOutputTokens: 16384 });
      return { provider, model: modelName, response: result.text };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { provider, model: modelName, response: "", error: message };
    }
  }

  async function askBoth(
    complexity: Complexity,
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  ): Promise<ProviderResult[]> {
    const openaiModel = modelFor("openai", complexity);
    const googleModel = modelFor("google", complexity);
    const tasks: Promise<ProviderResult>[] = [];

    if (openai) {
      tasks.push(ask(openai(openaiModel), "chatgpt", openaiModel, messages));
    }
    if (google) {
      tasks.push(ask(google(googleModel), "gemini", googleModel, messages));
    }

    if (tasks.length === 0) {
      return [];
    }

    const settled = await Promise.allSettled(tasks);
    return settled.map((r) =>
      r.status === "fulfilled"
        ? r.value
        : {
            provider: "chatgpt" as const,
            model: "unknown",
            response: "",
            error: String(r.reason),
          },
    );
  }

  async function askSingle(
    provider: "chatgpt" | "gemini",
    complexity: Complexity,
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  ): Promise<ProviderResult> {
    if (provider === "chatgpt") {
      const model = modelFor("openai", complexity);
      if (!openai)
        return {
          provider,
          model,
          response: "",
          error: "OpenAI API Key nicht konfiguriert",
        };
      return ask(openai(model), "chatgpt", model, messages);
    } else {
      const model = modelFor("google", complexity);
      if (!google)
        return {
          provider,
          model,
          response: "",
          error: "Gemini API Key nicht konfiguriert",
        };
      return ask(google(model), "gemini", model, messages);
    }
  }

  return { askBoth, askSingle };
}
