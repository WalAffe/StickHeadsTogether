import { randomUUID } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { CONFIG_DIR, type Complexity, type Provider } from "./config.js";
import type { Message, ProviderResult } from "./providers.js";

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

// One file per session, so parallel Claude sessions never overwrite each other.
// A single session is assumed to be used sequentially, one round at a time.
const SESSIONS_DIR = resolve(CONFIG_DIR, "sessions");
const TTL_MS = 2 * 60 * 60 * 1000; // 2 hours since the last round (file mtime)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const fileFor = (id: string) => resolve(SESSIONS_DIR, `${id}.json`);

function cleanup(): void {
  let names: string[];
  try {
    names = readdirSync(SESSIONS_DIR);
  } catch {
    return; // no sessions yet
  }
  const now = Date.now();
  for (const name of names) {
    const file = resolve(SESSIONS_DIR, name);
    try {
      if (now - statSync(file).mtimeMs > TTL_MS) rmSync(file);
    } catch {
      // already removed by another server process
    }
  }
}

// Not written to disk until the first round is saved.
export function createSession(
  complexity: Complexity,
  systemContext?: string,
): Session {
  cleanup();
  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    systemContext,
    complexity,
    rounds: [],
  };
}

export function getSession(id: string): Session | undefined {
  if (!UUID.test(id)) return undefined; // the id becomes a file name
  cleanup();
  try {
    return JSON.parse(readFileSync(fileFor(id), "utf-8")) as Session;
  } catch {
    return undefined;
  }
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

  try {
    mkdirSync(SESSIONS_DIR, { recursive: true, mode: 0o700 });
    const file = fileFor(session.id);
    writeFileSync(`${file}.tmp`, JSON.stringify(session, null, 2), {
      mode: 0o600,
    });
    renameSync(`${file}.tmp`, file); // atomic: no half-written session files
  } catch (err) {
    // Non-fatal: this round's answers are still returned, only follow-ups break
    console.error("Failed to persist session:", err);
  }

  return round;
}

// Each model sees its own earlier answers as assistant turns. The other
// model's answers are quoted into the next user turn, so no model mistakes
// them for its own.
export function buildMessages(
  session: Session,
  newMessage: string,
  provider: Provider,
): Message[] {
  const messages: Message[] = session.systemContext
    ? [{ role: "system", content: session.systemContext }]
    : [];

  let quoted = "";
  for (const round of session.rounds) {
    messages.push({ role: "user", content: quoted + round.userMessage });
    quoted = "";
    for (const r of round.results) {
      if (!r.response) continue;
      if (r.provider === provider) {
        messages.push({ role: "assistant", content: r.response });
      } else {
        quoted += `[Antwort von ${r.provider} (${r.model}) in Runde ${round.roundNumber}]:\n${r.response}\n\n`;
      }
    }
  }

  messages.push({ role: "user", content: quoted + newMessage });
  return messages;
}
