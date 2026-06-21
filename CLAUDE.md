# AirwaySim — Project Conventions & Architecture Index

This file is for any AI agent working in this repo (Claude Code, Gemini/Antigravity, or
otherwise) — read it at the start of every session, together with `goldenversion.md`.
Both are intentionally short. Everything else is loaded on demand (see the Document Map
in `goldenversion.md`).

This file exists because chapter-integration sessions were burning excessive tokens
re-discovering the same architecture and re-deriving the same conventions every time, in
a codebase that has grown past 14,000 lines across `goldenversion.md` + the engine files.
The fix is this file (symbol-indexed, not line-indexed — line numbers go stale on the next
edit; symbol names don't) plus splitting `goldenversion.md` into load-on-demand pieces.

## What AirwaySim is

A medical-grade perioperative trainer (Miller's Anesthesia 9th Ed as ground truth) that is
simultaneously: (a) a physiology/PK-PD simulator, (b) a case-prep and "ask an attending"
reasoning partner, (c) an eventual outcome-scoring/debrief tool, and (d) eventually a
platform for procedural/spatial skill practice (regional/neuraxial, POCUS/TTE/TEE/FAST).
Chapters are integrated one at a time via a standing "SET THIS ONCE: CHAPTER NUMBER = N"
prompt — see `docs/chapter_integration_prompt.md` for the current canonical version.

## Document map (see `goldenversion.md` for the full table)

- `goldenversion.md` — TOC, system architecture (§1-3), compilation blueprint (§11-13).
- `docs/engines/physiology.md` (§4), `pharmacology.md` (§5), `clinical_events.md` (§6) —
  read only the one(s) relevant to your chapter's content, not all three by default.
- `docs/state_tree.md` (§8, §10) — the full patient/vitals/app state tree. Check this
  before adding a new flag, to avoid duplicating one that already exists.
- `docs/ingestion_pipeline.md` (§9) — `src/knowledge/` internals. You should almost never
  need this; chapter sessions are scoped to never touch `src/knowledge/`.
- `docs/chapters/*.md` (§14+) — one file per chapter/sweep, historical rationale only.
  You do not need to read these to integrate a new chapter.
- `walkthrough.md` — scratch notes for the *current* session only. Safe to overwrite at
  the start of a new chapter session; its durable content should end up in a new
  `docs/chapters/chXX.md` file (and a `goldenversion.md` index row) by the end of the
  session, following the closing-report convention below.

## The classification framework (apply to every new chapter)

**Axis 1 — content type:**
- **Bucket A** (quantifiable physiology/PK-PD): numbers that drive a live tick. Never
  invent a parameter the source doesn't give — use the class-average fallback pattern and
  disclose the gap. Lives in `docs/engines/physiology.md` or `pharmacology.md`.
- **Bucket B** (clinical judgment/decision-support): risk scores, comorbidity guidance,
  monitoring standards, epidemiology. Relaxed standard applies: fill genuine gaps with a
  best-reasoned estimate from general medical knowledge, disclosed inline and in the
  closing report — never presented as directly sourced. This relaxed standard does NOT
  extend to Bucket A parameters.
- **Bucket C** (procedural/technique): landmarks, ordered steps, technique-specific
  complication data. Capture as structured data for a future procedural-practice engine;
  do not build the interactive engine itself unless explicitly instructed.

**Axis 2 — phase of care:** PreOp / Intraoperative / PACU / PostDischarge / Cross-cutting.
Don't default to "intraoperative" — check explicitly where the content actually belongs.

## Standing conventions (established across Ch24-35, confirmed by re-reading code, not memory)

- **Two medication databases must stay in sync**: `MEDICATIONS` in `src/engine/Pharmacology.js`
  (production/UI source) and `MEDICATIONS_CONFIG` in `src/engine/config/meds.config.ts`
  (legacy/test source). Adding a drug to one without the other has caused real bugs.
- **Extract inline logic into a shared, exported, pure, unit-tested function** the moment
  it's used more than once or needs grading/testing. This pattern caught real bugs every
  time it was applied (Link-25 gas mixing, RCRI's "Prior MI" gap, the ExtubationModal
  ground-truth leak). Established examples to follow: `calculateDermatomalBlockFraction`,
  `calculateLink25GasMixture` (`Pharmacology.js`); `calculateRcriFactors`, `classifyBmi`,
  `calculateDasiMets`/`DASI_ITEMS`, `assessAirwayExamBox311`, `calculateCha2ds2VascScore`,
  `calculateAnticoagulationPlan`, `calculateStopBangScore`/`STOP_BANG_ITEMS`,
  `calculateChronicMedicationManagementPlan`, `assessPheoBlockadeAdequacy`,
  `calculateMyastheniaPostopVentRisk` (all in `src/components/modals/PreOpEMR.jsx`).
- **The `QualityEvent` / outcome-scoring system** (`src/engine/OutcomeScoringEngine.ts`):
  `createQualityEvent()`, `scoreQualityEvents()`, `calculatePacuReadiness()`. Categories:
  `Vigilance | PharmacologicChoice | CrisisManagement | Monitoring | ChecklistAdherence |
  PostopReadiness`. Severities and point penalties: `info`=0, `minor`=-2, `moderate`=-5,
  `major`=-15, `critical`=-30. The live-simulation entry point is `logQualityEvent()` in
  `usePhysiology.js` (additive to the existing narrative `logEvent` log, not a replacement).
  Use this for any new quality-of-care marker rather than inventing a parallel system —
  check `docs/chapters/*.md` if you need precedent for a specific category/severity choice.
- **PACU is a real phase of care**: `surgicalPhase` has six values now (`Pre-Op`,
  `Induction`, `Incision`, `Maintenance`, `Emergence`, `PACU`), routed through the single
  chokepoint `handleSetSurgicalPhase()` in `App.jsx` (both UI buttons and Attending-chat
  `phase_*` actions go through it). PACU transfer is NOT hard-blocked — score it via
  `QualityEvent`, don't prevent it; that mirrors how a real OR works.
- **Knowledge-layer content (Bucket B) must be reachable from the Attending chat**, not
  just a UI panel — see the pattern in `ClinicalAiChat.js` for RCRI/PACU/OSA/pheo handlers
  (`getAttendingResponseInternal`, matched by keyword, grounded in live state when a
  patient flag exists for it, falling back to general reference knowledge when it doesn't).
- **Pure data/knowledge-layer engines** (`OutcomeScoringEngine.ts`, `CAMKnowledgeEngine.ts`,
  `PositioningKnowledgeEngine.ts`) are the established pattern for chapter content that is
  mostly structured reference data plus a few pure evaluation functions, rather than
  another `if` branch inside `usePhysiology.js`'s tick loop. Prefer this for new
  Bucket B/C chapters with a lot of structured data (herbs, positions, nerve injuries, etc).
- **Test file naming**: one `src/testing/<topic>_ch<N>.test.ts` per chapter, testing
  exported pure functions directly — not full hook integration.
- **Verification**: run `npx vitest run` and `npx vite build` once at the end of a session
  (not after every sub-step). A pre-existing chunk-size build warning is expected and
  unrelated to your changes — don't try to fix it as part of a chapter session.
- **Scope fence**: never touch `src/knowledge/` during a chapter-integration session —
  that's the ingestion pipeline, explicitly out of scope (see `docs/ingestion_pipeline.md`).
- **This repo is worked on by more than one AI tool** (Claude Code and Gemini/Antigravity
  have both made commits here). Don't assume only your own session's conventions exist —
  grep for the symbol/pattern before assuming something doesn't exist yet.

## Closing-report convention

Every chapter session ends with: what was added vs. corrected (by bucket and phase of
care), any new engines/UI/scoring-hook components, what was a disclosed reasoned estimate
and why, what groundwork was laid without being a usable feature yet, and what (if
anything) couldn't be integrated. Durably record it as a new `docs/chapters/chXX.md` file
plus a one-row addition to `goldenversion.md`'s §14+ index table — don't just leave it in
chat history or `walkthrough.md`.
