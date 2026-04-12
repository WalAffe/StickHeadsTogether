import { randomUUID } from "node:crypto";
import type { ProviderResult } from "./providers.js";
import type { Complexity } from "./providers.js";

export interface Round {
  roundNumber: number;
  userMessage: string;
  results: ProviderResult[];
  timestamp: Date;
}

export interface Session {
  id: string;
  createdAt: Date;
  systemContext?: string;
  complexity: Complexity;
  rounds: Round[];
}

const sessions = new Map<string, Session>();
const TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function cleanup() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt.getTime() > TTL_MS) {
      sessions.delete(id);
    }
  }
}

export function createSession(
  complexity: Complexity,
  systemContext?: string,
): Session {
  cleanup();
  const session: Session = {
    id: randomUUID(),
    createdAt: new Date(),
    systemContext,
    complexity,
    rounds: [],
  };
  sessions.set(session.id, session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function addRound(
  session: Session,
  userMessage: string,
  results: ProviderResult[],
): Round {
  const round: Round = {
    roundNumber: session.rounds.length + 1,
    userMessage,
    results,
    timestamp: new Date(),
  };
  session.rounds.push(round);
  return round;
}

export function buildMessages(
  session: Session,
  newMessage: string,
): Array<{ role: "user" | "assistant" | "system"; content: string }> {
  const messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }> = [];

  if (session.systemContext) {
    messages.push({ role: "system", content: session.systemContext });
  }

  for (const round of session.rounds) {
    messages.push({ role: "user", content: round.userMessage });
    // Combine all provider responses as the "assistant" turn for context
    const combined = round.results
      .filter((r) => r.response)
      .map((r) => `[${r.provider} - ${r.model}]: ${r.response}`)
      .join("\n\n");
    if (combined) {
      messages.push({ role: "assistant", content: combined });
    }
  }

  messages.push({ role: "user", content: newMessage });
  return messages;
}
