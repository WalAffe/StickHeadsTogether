// Self-check for session storage and per-provider history. Run: bun run test
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Must be set before config.ts is evaluated, hence the dynamic import.
const dir = mkdtempSync(join(tmpdir(), "council-test-"));
process.env.COUNCIL_CONFIG_DIR = dir;
const { addRound, buildMessages, createSession, getSession } = await import(
  "./sessions.js"
);

const session = createSession("low", "SYS");
assert.equal(getSession(session.id), undefined, "not on disk before first round");

addRound(session, "Frage 1", [
  { provider: "chatgpt", model: "gpt", response: "A-gpt" },
  { provider: "gemini", model: "gem", response: "", error: "boom" },
]);
const loaded = getSession(session.id);
assert.ok(loaded, "persisted after first round");
assert.equal(loaded.rounds.length, 1);
assert.deepEqual(readdirSync(join(dir, "sessions")), [`${session.id}.json`], "no .tmp left");

// ChatGPT sees its own answer as assistant turn.
assert.deepEqual(buildMessages(loaded, "Frage 2", "chatgpt"), [
  { role: "system", content: "SYS" },
  { role: "user", content: "Frage 1" },
  { role: "assistant", content: "A-gpt" },
  { role: "user", content: "Frage 2" },
]);

// Gemini failed in round 1: no fake assistant turn, ChatGPT's answer is quoted.
const forGemini = buildMessages(loaded, "Frage 2", "gemini");
assert.equal(forGemini.length, 3);
assert.equal(forGemini[2].role, "user");
assert.match(forGemini[2].content, /^\[Antwort von chatgpt \(gpt\) in Runde 1\]:\nA-gpt\n\nFrage 2$/);

// The id becomes a file name: anything but a UUID is rejected.
assert.equal(getSession("../../etc/passwd"), undefined);
assert.equal(getSession(session.id.slice(0, 8)), undefined);

// Expires 2 h after the last round.
const file = join(dir, "sessions", `${session.id}.json`);
const old = new Date(Date.now() - 3 * 60 * 60 * 1000);
utimesSync(file, old, old);
assert.equal(getSession(session.id), undefined);
assert.equal(existsSync(file), false, "expired file removed");

console.log("sessions: ok");
