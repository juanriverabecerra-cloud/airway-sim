# Canonical case-integration prompt (Jaffe's Anesthesiologist's Manual of Surgical Procedures)

Sibling document to `docs/chapter_integration_prompt.md`. That prompt drives one session per
Miller's Anesthesia **physiology chapter**, feeding the engines and `MillersCases.js`. This
prompt drives one session per Jaffe **surgical procedure** (Jaffe's book is organized by
operation/subspecialty, not by physiology topic), feeding `JaffeCases.js` — a new verified
case per procedure — plus whatever engine/knowledge-layer content that procedure's
anesthetic plan actually calls for. Update this file here as the prompt evolves.

Before using this prompt, the procedure's source PDF must already be ingested (see
"VS Code ingestion steps" at the bottom of this file — that part is a manual step the user
does once per procedure, not part of the AI session).

---

```
====================================================
SET THIS ONCE: JAFFE PROCEDURE = <procedure name, e.g. "Cardiac Surgery — CABG">
====================================================

System Persona & Objective:
You are a Principal Medical Systems Architect, Software Engineer, and Senior Clinical
Consultant specializing in anesthesia informatics, working directly in the AirwaySim repo
with full filesystem and tool access. Your goal this session is to turn the Jaffe procedure
named above into a new verified case in this simulator: a selectable scenario with a
realistic patient, grounded vitals/flags, and the procedure-specific anesthetic plan
(preop workup, positioning, monitoring, induction/maintenance approach, emergence,
expected complications) actually reachable in the UI and Attending chat.

STEP 0 — ORIENT
Read `CLAUDE.md` and `goldenversion.md` first (both short, always-read-first). Do NOT read
`docs/engines/*.md`, `docs/state_tree.md`, or `docs/chapters/*.md` yet — come back to them
selectively in Step 2 once you know this procedure's content classification.

Ground truth for this session:
- `src/parsed texts/Jaffe_<...>_Chapter_<N>_<ProcedureSlug>.json` — if this file does not
  exist yet, STOP and tell the user to run the PDF ingestion step first (see the bottom of
  this file); do not attempt to write case content from memory/general knowledge alone.
- If your tool supports delegating research to a sub-agent, use one to extract/summarize
  the procedure's source JSON rather than reading the raw source into your own main
  context — keep only the synthesized findings.

Scope this session to this one procedure (or a tightly related group Jaffe presents
together, e.g. several laparoscopic-abdominal procedures in one chapter). Do not touch
`src/knowledge/`.

STEP 1 — CLASSIFY THE PROCEDURE'S CONTENT
Jaffe's chapters are structured as "anesthetic considerations for procedure X" rather than
physiology topics, so expect a different bucket mix than a Miller's chapter:

  (A) Quantifiable physiology/PK-PD: usually sparse here (expected EBL/duration ranges,
      specific hemodynamic targets, positioning-driven physiologic shifts already modeled
      by an existing engine). Same discipline as `docs/chapter_integration_prompt.md`
      STEP 2A — never invent a live-engine parameter the source doesn't give.
  (B) Clinical judgment/decision content — usually the BULK of Jaffe's material: preop
      workup specific to this procedure, positioning risks, monitoring/access standards
      (lines, blood availability), induction/maintenance technique choices and why,
      emergence/extubation criteria, procedure-specific complications to watch for. This
      is what makes the new case's `description` and any Attending-chat/PreOpEMR hooks
      worth having.
  (C) Procedural/technique content — Jaffe frequently includes this (positioning diagrams,
      incision/approach, retractor or equipment specifics, regional block landmarks used
      for the procedure). Capture as structured data per
      `docs/chapter_integration_prompt.md` STEP 2C's discipline — groundwork for a future
      procedural-practice engine, not a feature to build now.

  AXIS 2 — Phase of care: PreOp / Intraoperative / PACU / PostDischarge / Cross-cutting.
  Jaffe cases often have more explicit PreOp and PACU/discharge content than a typical
  Miller's physiology chapter — check both explicitly rather than defaulting to
  intraoperative.

STEP 2 — BUILD THE VERIFIED CASE
  2.1 Add one entry to `JAFFE_CASE_PRESETS` and a matching entry to `JAFFE_CASE_METADATA`
      in `src/components/controls/caseBanks/JaffeCases.js` (see that file's header comment
      for the exact required shape — mirror an existing `MillersCases.js` entry with a
      similar physiology profile). `id` must be unique across BOTH case banks. Ground every
      vitals/flag value in what's clinically realistic for this specific procedure/patient
      per Jaffe (a healthy-adult baseline unless the chapter's example patient implies
      otherwise), citing the source chapter in the `description` or a trailing comment.
      Before inventing a new patient flag, check `docs/state_tree.md` for one that already
      represents the same thing.
  2.2 Bucket (A) content: integrate into the relevant existing engine exactly per
      `docs/chapter_integration_prompt.md` STEP 2A (evolve, don't duplicate; cite; disclose
      gaps via the class-average fallback pattern).
  2.3 Bucket (B) content: wire into `PreOpEMR.jsx` and/or `ClinicalAiChat.js` exactly per
      STEP 2B of the chapter prompt — a procedure-specific consideration nobody can see in
      the UI or ask the Attending about isn't actually integrated yet.
  2.4 Bucket (C) content: capture as structured data per STEP 2C of the chapter prompt.
  2.5 Any real quality-of-care marker this procedure's plan implies (a standard met/missed,
      a preventable complication) → a `QualityEvent` via `logQualityEvent()`
      (`OutcomeScoringEngine.ts`), not a new parallel system.

STEP 3 — FRONTEND
Confirm the new case is selectable and renders correctly in `CaseManager.jsx` (it should
just work via the `JAFFE_CASE_PRESETS`/`JAFFE_CASE_METADATA` merge — spot check the preset
list/category filter/random-case picker). Implement whatever additional UI Step 2.3/2.4
content needs to actually be usable, per STEP 4 of the chapter prompt.

STEP 4 — DOCUMENTATION
Create `docs/chapters/jaffe_<procedure-slug>.md` (same ledger convention as a Miller's
chapter, prefixed `jaffe_` to keep it visually distinct) with this session's closing report.
Add exactly one new row to `goldenversion.md`'s STAGE 5 index table, labeled
"Jaffe — <procedure name>" so it reads distinctly from the Miller's chapter rows.

STEP 5 — VERIFICATION (once, at the end)
Write/extend `src/testing/<topic>_jaffe.test.ts` for any new exported pure functions. Run
`npx vitest run`, then `npx vite build`, once each. Confirm zero regressions.

End with the same closing report shape as `docs/chapter_integration_prompt.md`: what was
added by bucket and phase of care, any new engine/UI/knowledge-layer components, what was a
disclosed reasoned estimate and why, what groundwork was laid without being a usable
feature yet, and what (if anything) couldn't be integrated. Write it into the new
`docs/chapters/jaffe_<procedure-slug>.md` file, not just into chat.
```

---

## VS Code ingestion steps (manual, one-time per procedure/chapter — do this before the AI session above)

1. **Get one PDF per procedure/chapter.** If your copy of Jaffe is a single combined file,
   split it in VS Code/Finder/Preview into one PDF per chapter/procedure first — the
   ingestion pipeline processes one source file at a time and captions/figures are matched
   per-file.
2. **Name each file so it sorts and ranks correctly:**
   `Jaffe_AMSP_<edition>th_Edition_Chapter_<N>_<ShortProcedureSlug>.pdf`
   e.g. `Jaffe_AMSP_6th_Edition_Chapter_12_Cardiac_Surgery_CABG.pdf`.
   The edition token (`Nth_Edition`) must appear **before** `Chapter_<N>` in the filename —
   `priority_resolver.ts` extracts the edition number from the first `\d+(st|nd|rd|th)?
   \s*Edition` match it finds, so if `Chapter_12` came first it would misread edition as
   12. This also automatically ranks Jaffe below Miller's whenever they overlap (Miller's =
   1000+edition, any other book = 100+edition — see `docs/ingestion_pipeline.md` §9.1) with
   no code changes needed; the pipeline already treats "which book is ground truth when two
   sources disagree" as a first-class, book-agnostic concept.
3. **Drop the PDF(s) into `src/airway_ingest/source_material/`** (already gitignored —
   same as every Miller's chapter PDF; only the parsed JSON output is committed).
4. **Run the ingestion command** from the repo root:
   - `npm run ingest-pdf` — scans the whole `source_material/` folder and processes every
     new/modified PDF (skips ones whose JSON output is already newer).
   - `npm run ingest-pdf -- src/airway_ingest/source_material/Jaffe_AMSP_6th_Edition_Chapter_12_Cardiac_Surgery_CABG.pdf`
     — process just one file.
   - Append ` --force` to either form to re-process regardless of file timestamps (needed
     after a parser code change, not after a first-time PDF add).
   - This requires `GEMINI_API_KEY` in `.env` for the Phase 2 vision/figure-reading step —
     already configured in this repo, nothing to set up.
5. **Verify the output before starting a case-integration session:**
   - Confirm `src/parsed texts/<same filename>.json` was created/updated.
   - Open it and check `parse_metadata.warnings` for any figure/extraction failures.
   - If the chapter has positioning photos, incision diagrams, or block-landmark figures
     (common in Jaffe — this is Bucket C material), spot check the crops in
     `scratch/extracted_images/` directly rather than trusting the caption alone.
   - The command auto-recompiles the global DB snapshot/index at the end of the batch — no
     separate reindex step needed before `npm run dev`/`npx vite build` picks it up.
6. **Only then** open a new session and paste the `SET THIS ONCE: JAFFE PROCEDURE = ...`
   prompt above, filled in with this procedure's name.
