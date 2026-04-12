---
name: pr-review
description: Use when the user asks for a PR review, code review, or "reviewe diesen PR". Defines a consistent review schema that both council AIs must follow so reviews are comparable and structured the same way every time.
---

# PR Review via Council

When the user asks for a PR review, use the council tools (`council_ask` / `council_discuss`) with a **fixed review schema** so ChatGPT and Gemini always respond in the same structure. This makes their answers comparable and avoids getting a different format each time.

## Workflow (STRICT ORDER — do not skip or reorder)

### Phase 1: Read the actual code FIRST

**Do not call the council before you have read the real code.** A review based on the PR description alone leads to hallucinated issues against code that doesn't exist. This wastes tokens and the user's attention on already-solved problems.

1. `gh pr view <PR> --json title,body,additions,deletions,files,baseRefName,headRefName`
2. `gh pr diff <PR>` — read the **actual diff**, not just the description
3. For large PRs: also read the key files on disk (if the branch is checked out) to understand surrounding context that isn't in the diff
4. Form your own initial understanding: what changed, why, what stands out

Only proceed to Phase 2 once you have actually read the code.

### Phase 2: Brief the council with the REAL diff

**Never simplify, paraphrase, or reconstruct the code.** Send what's actually in the diff. If the diff is too large, send the most critical files/hunks verbatim and tell the council which parts you omitted and why — but never "simplify" by writing a plausible-looking version of the code. That's hallucinating the review target.

Call `council_ask` with:
- `complexity: "high"` — PR reviews warrant the best models
- `system_context`: the review schema below, copied verbatim
- `prompt`: PR title + description + **verbatim code from the diff** (or verbatim excerpts if the diff is too large)

### Phase 3: Cross-check against reality

Before presenting the review: **spot-check the council's findings against the actual code.** LLMs will sometimes flag issues that don't exist, miss context from outside the diff, or assume broken patterns that the repo actually handles correctly. For each Blocker/Must-Fix:
- Does the cited file:line match what's actually in the repo?
- Is the "problem" already solved elsewhere (e.g. via a constraint, middleware, decorator, etc. not visible in the diff)?

Mark false positives clearly in your synthesis instead of passing them on.

### Phase 4: Present the results

Show the raw council output, then your own synthesis (see below). Offer a follow-up `council_discuss` round only if there are real unresolved points.

## Required system_context (copy verbatim into council_ask)

```
Du bist Senior Full-Stack Entwickler und reviewst einen Pull Request. Antworte auf Deutsch.

WICHTIG: Halte dich STRIKT an das folgende Schema. Jede Sektion muss vorkommen, in dieser Reihenfolge, mit exakt diesen Überschriften. Keine zusätzlichen Sektionen, keine Umbenennung.

## 1. Zusammenfassung
Ein bis zwei Sätze: Was macht der PR, wofür ist er da.

## 2. Gesamturteil
Ein einziger Satz: APPROVE | REQUEST_CHANGES | COMMENT — mit kurzer Begründung.

## 3. Blocker
Kritische Issues die vor dem Merge gefixt werden MÜSSEN. Pro Issue:
- **Datei:zeile** (falls bekannt)
- **Problem:** Ein Satz
- **Warum kritisch:** Ein Satz
- **Fix:** Konkreter Vorschlag, wenn möglich mit Code

Wenn keine Blocker: "Keine."

## 4. Must-Fix
Wichtige Issues die gefixt werden sollten, aber nicht zwingend blocken. Gleiches Format wie Blocker.

Wenn keine: "Keine."

## 5. Nice-to-have
Verbesserungsvorschläge, Stil, Refactoring-Ideen. Gleiches Format, kann knapper sein.

Wenn keine: "Keine."

## 6. Positives
Was ist am PR gut? (Tests, Architektur, Sicherheit, etc.) Stichpunkte.

## 7. Sicherheit
Spezifische Security-Risiken (Auth, Input-Validation, Injection, Race Conditions, Secrets, etc.). Wenn nichts auffällig: "Keine Auffälligkeiten."

## 8. Performance
Performance-Risiken (N+1, fehlende Indizes, unnötige Queries, etc.). Wenn nichts auffällig: "Keine Auffälligkeiten."

## 9. Tests
Sind die Tests ausreichend? Fehlen Edge Cases? Wenn keine Teständerungen: "Keine Teständerungen im PR."

Halte dich exakt an diese Sektionen und Überschriften. Wenn du zu einem Punkt nichts zu sagen hast, schreibe explizit "Keine." — lass keine Sektion weg.
```

## Presentation

After both AIs answered:

1. Show the raw council output (it already has separators between ChatGPT and Gemini).
2. Add a **synthesis section** below with:
   - **Übereinstimmungen:** Wo sind sich beide einig?
   - **Widersprüche:** Wo sagen sie Unterschiedliches?
   - **Top Prioritäten:** Die 3-5 wichtigsten Punkte aus beiden Reviews zusammen
3. Ask the user: "Sollen wir eine Folgerunde `council_discuss` machen für [spezifisches Thema]?" — nur wenn es sich lohnt.

## Optional: Review posten via gh CLI

Falls der User explizit möchte dass die Review auf GitHub gepostet wird (nicht nur als Analyse): Folge dem Pattern von [aidankinzett/claude-git-pr-skill](https://github.com/aidankinzett/claude-git-pr-skill) (pending review erstellen, User-Approval via AskUserQuestion, dann submit). Die Council-Outputs sind dann die Grundlage für die gh-Kommentare.

**Wichtig:** Niemals automatisch auf GitHub posten. Immer erst explizit vom User bestätigen lassen.

## Tipps

- Bei großen PRs (>1000 Zeilen): Fokussiere dich auf die wichtigsten Dateien. Erwähne im Prompt **verbatim**, welche Dateien du ausgelassen hast und warum — aber reiche die Dateien die du schickst **unverändert** ein.
- Der `gh pr diff` Output kann riesig sein — kürzen ist OK, **umschreiben ist nicht OK**. Lieber weniger Dateien vollständig als viele Dateien "vereinfacht".
- Wenn ein AI ein Quota-Problem hat, ist das immer noch besser als nichts — präsentiere was da ist und markiere das Fehlen der anderen Meinung.

## Red Flags — Du bist dabei, den Skill zu brechen

Stop wenn du denkst:
- "Ich schick schonmal die PR-Description an den Council, Code lese ich gleich"
- "Der echte Code ist zu lang, ich beschreibe ihn mit eigenen Worten"
- "Die Grundidee reicht, Details rekonstruiere ich plausibel"
- "Ich frag einfach den Council und filtere die Antworten danach"

**Alle bedeuten: STOP. Phase 1 (Code lesen) zuerst. Phase 2 (Council mit echtem Code) danach.**
