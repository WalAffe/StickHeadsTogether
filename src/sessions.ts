import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { homedir } from "node:os";
import type { ProviderResult, Complexity } from "./providers.js";

export interface Round {
  roundNumber: number;
  userMessage: string;
  results: ProviderResult[];
  timestamp: string;
}

export interface Session {
  id: string;
  createdAt: string;
  systemContext?: string;
  complexity: Complexity;
  rounds: Round[];
}

const CONFIG_DIR = resolve(
  process.env.COUNCIL_CONFIG_DIR?.replace("~", homedir()) ??
    resolve(homedir(), ".config", "stick-heads-together"),
);
const SESSIONS_FILE = resolve(CONFIG_DIR, "sessions.json");
const TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

interface SessionsFile {
  sessions: Record<string, Session>;
}

function readSessions(): Map<string, Session> {
  if (!existsSync(SESSIONS_FILE)) return new Map();
  try {
    const raw = readFileSync(SESSIONS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as SessionsFile;
    return new Map(Object.entries(parsed.sessions ?? {}));
  } catch {
    return new Map();
  }
}

function writeSessions(map: Map<string, Session>): void {
  try {
    mkdirSync(dirname(SESSIONS_FILE), { recursive: true });
    const obj: SessionsFile = { sessions: Object.fromEntries(map) };
    writeFileSync(SESSIONS_FILE, JSON.stringify(obj, null, 2), {
      mode: 0o600,
    });
  } catch (err) {
    // Non-fatal: session persistence failed, but in-memory still works
    console.error("Failed to persist sessions:", err);
  }
}

function cleanup(map: Map<string, Session>): void {
  const now = Date.now();
  for (const [id, session] of map) {
    if (now - new Date(session.createdAt).getTime() > TTL_MS) {
      map.delete(id);
    }
  }
}

export function createSession(
  complexity: Complexity,
  systemContext?: string,
): Session {
  const map = readSessions();
  cleanup(map);
  const session: Session = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    systemContext,
    complexity,
    rounds: [],
  };
  map.set(session.id, session);
  writeSessions(map);
  return session;
}

export function getSession(id: string): Session | undefined {
  const map = readSessions();
  cleanup(map);
  return map.get(id);
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
    timestamp: new Date().toISOString(),
  };
  session.rounds.push(round);

  const map = readSessions();
  map.set(session.id, session);
  writeSessions(map);

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
