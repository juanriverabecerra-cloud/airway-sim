# §14 — Outcome Scoring, PACU Readiness & the Clinical Knowledge Layer (Ch9-30 Retroactive Sweep)

> Chapter ledger entry, relocated from `goldenversion.md`. This is historical record of what
> was built in this session — read only if you need the detailed rationale; the architecture
> itself (PACU phase, QualityEvent system, Aldrete scoring) is summarized in `CLAUDE.md`.

**Strategic context.** Through Chapter 30, AirwaySim's chapter-by-chapter integration work treated the simulator primarily as a repository of PK/PD and physiology data. Starting with this section, the project's scope explicitly expands: AirwaySim is intended to become a full perioperative trainer spanning **PreOp → Intraoperative → PACU/Post-op** care, eventually scored for outcome quality (with an explainable, causally-attributed debrief) and eventually extended into procedural/spatial skill practice (regional/neuraxial anesthesia, POCUS/TTE/TEE/FAST). This section documents the first cross-cutting architecture built toward that goal, applied retroactively across the chapters already integrated (9-30) rather than waiting for a specific chapter to require it.

#### 14.1 The PreOp → Intraoperative → PACU Continuum

Prior to this section, the simulator's surgical timeline had exactly five phases (`Pre-Op`, `Induction`, `Incision`, `Maintenance`, `Emergence`) with no phase representing the recovery room. Any post-emergence patient state (residual neuromuscular block, opioid-induced respiratory depression, emergence delirium, hypothermia) had no "home" in the care timeline despite being clinically central to PACU practice.

*   **`PACU` added as a sixth surgical-timeline phase** (`PatientHeader.jsx`, `usePhysiology.js`'s `surgicalPhase` state). Unlike the existing MSMAIDS interlock on `Induction` (a hard block), transitioning to `PACU` is **not** hard-blocked — in real practice a patient can be transferred under-recovered, and that is itself the teaching point worth scoring rather than preventing outright.
*   All surgical-phase transitions (both from the UI timeline buttons and from Attending-chat-driven actions, `App.jsx`'s `phase_*` action handler) now route through the single chokepoint `handleSetSurgicalPhase()`, which returns a boolean success flag so callers don't log a false "advanced to X" message when an interlock blocks the transition.

#### 14.2 Aldrete-Style PACU Readiness Scoring (`OutcomeScoringEngine.ts`)

`calculatePacuReadiness(vitals, patient)` approximates the clinically well-established Aldrete Post-Anesthesia Recovery Score (Activity, Respiration, Circulation, Consciousness, O2 Saturation; 0-2 points each, 10 max) using physiology signals this simulator already tracks:

*   **Activity** ← neuromuscular recovery (TOF count/ratio) — proxies "voluntary movement of all 4 extremities."
*   **Respiration** ← respiratory rate and apnea state.
*   **Circulation** ← MAP deviation from a `baselineMap` captured once at case start (`usePhysiology.js`) — proxies "BP within 20% of baseline."
*   **Consciousness** ← processed EEG (BIS) — proxies "fully awake vs. arousable vs. unresponsive."
*   **O2 Saturation** ← SpO2 and room-air vs. supplemental-O2 dependence.

Discharge readiness requires a total score $\ge 9/10$ **and** no single criterion scored at 0. Since the Aldrete score is a bedside clinical observation tool rather than a chapter-tabulated formula, several criteria here are proxies from the nearest available simulator signal rather than a literal textbook citation, each documented inline in the source — this is the "best-reasoned estimate, disclosed, pending future source material" standard now in effect for clinical-judgment content, as distinct from the stricter "never invent" standard still held for live physiology-engine PK/PD parameters.

Surfaced in `MemoryPanel.jsx` as a "PACU Readiness (Aldrete-style)" card, visible from `Emergence` onward, and computed silently at the moment of PACU transfer in `App.jsx`'s `handleSetSurgicalPhase()`.

#### 14.3 Structured Quality-of-Care Events & the Outcome Score (`OutcomeScoringEngine.ts`)

The simulator's only event record prior to this section was the narrative `logEvent` text log — sufficient for a human reading the session live, but not structured enough to ever drive an explainable score ("who/what/where/why a decision impacted the patient") or a future debrief view without re-parsing prose.

*   **`QualityEvent`**: `{ time, phase, category, severity, description, idealAction?, actualAction?, impact?, chapterSource? }`. Categories: `Vigilance`, `PharmacologicChoice`, `CrisisManagement`, `Monitoring`, `ChecklistAdherence`, `PostopReadiness`. Severities: `info` (0 pts), `minor` (-2), `moderate` (-5), `major` (-15), `critical` (-30).
*   **`createQualityEvent()`**: defensively validates/defaults all fields rather than throwing on malformed input — important since this is new infrastructure that may be called from call sites that don't exist yet.
*   **`scoreQualityEvents()`**: pure aggregation of a list of events into a 0-100 outcome score plus a category/phase-of-care breakdown, for eventual consumption by a debrief/scoreboard UI (**not built yet** — this is explicitly-scoped groundwork, consistent with the Ch9-30 retroactive sweep's instruction not to build the scoring/ranking UI itself without further direction).
*   **`logQualityEvent()`** (`usePhysiology.js`): the live-simulation entry point. Appends a structured event to `patient.qualityEvents[]` (deep-cloned by the existing snapshot/restore mechanism automatically) and emits a `📋 [Category/SEVERITY] ...` line through the existing `logEvent` narrative log, so the new structured channel is additive, not a replacement.

**Wired retroactively into existing Ch9-30 mechanics** (representative sample, not yet exhaustive — see §14.6):
*   Extubation with true residual neuromuscular block (Ch27/28) — `major`/`info`, `App.jsx`'s `handleExtubation()`.
*   PACU transfer below Aldrete readiness threshold — `major`/`moderate`/`info`, `App.jsx`'s `handleSetSurgicalPhase()`.
*   Gabapentinoid-Opioid Synergistic Respiratory Depression onset (Ch25 GOSRD) — `moderate`, `usePhysiology.js`.
*   Laryngospasm/bronchospasm triggered by airway manipulation under inadequate depth — `major`, `usePhysiology.js`.
*   Administering a penicillin-class drug to a documented-allergic patient, and the resulting anaphylaxis if triggered — `critical`, `usePhysiology.js`'s `processMed()` and main tick loop respectively.
*   LAST CNS seizure threshold reached (Ch29) — `critical`, `usePhysiology.js`.
*   Propofol Infusion Syndrome (PRIS) onset — `critical`, `usePhysiology.js`.

#### 14.4 Closing the Qualitative/Quantitative TOF Monitoring Loop (Ch28) at the Actual Decision Point

Auditing Ch28's qualitative-vs-quantitative TOF monitoring blind spot (§5.7) against this new continuity-of-care lens surfaced a real gap: the feature was built and correctly displayed in `MemoryPanel.jsx`, but the actual **decision point** — the `ExtubationModal` — still read ground-truth `vitals.tofCount`/`tofRatio` directly, regardless of which monitoring mode the user had selected. The chapter's entire teaching point (a clinician can be falsely reassured by manual assessment) had no real consequence at the one moment it should have mattered most.

Fixed: `ExtubationModal` (`Modals.jsx`) now reads `perceivedTofCount`/`perceivedTofRatio` when `patient.tofMonitorMode === 'qualitative'`, exactly mirroring `MemoryPanel.jsx`'s display logic. `handleExtubation()` separately computes the *true* residual-block state (never shown to the user in qualitative mode) to drive the `logQualityEvent()` call described in §14.3 — so a user who is misled by qualitative monitoring into extubating early is both realistically deceived in the moment and correctly scored against afterward.

#### 14.5 The Clinical Knowledge Layer in the Attending Chat (Ch30 RCRI)

Ch30's Revised Cardiac Risk Index (§6.80) and the PACU readiness score (§14.2) are now both queryable through the Attending chat (`ClinicalAiChat.js`), grounded in the live patient/case state rather than static prose:

*   A `caseId` (the active case's id, e.g. `'cardiac'`, `'vascular'`) is now threaded through `App.jsx` → `AttendingPanel.jsx` → all three `getAttendingResponse()` call sites, so chat-side risk calculations can reason about surgery type the same way `PreOpEMR.jsx` already does.
*   Queries matching cardiac-risk/RCRI/ASA-class/"what should I prepare for" phrasing call `calculateRcriFactors()` directly and render the live 6-criteria breakdown with the textbook's own caveat ("does not perform well predicting death or...events after vascular surgery") rather than generic advice.
*   Queries matching PACU/readiness/discharge/Aldrete phrasing call `calculatePacuReadiness()` directly and render the live 5-criterion breakdown.

This is the first concrete instance of the "bucket-B clinical-judgment content must be wired somewhere it's actually surfaced at runtime, not just documented" requirement being applied to the chat specifically, rather than only to a UI panel.

#### 14.6 Explicitly Deferred (Not Built This Session)

Consistent with the scoped instructions for this sweep, the following were deliberately **not** built, though the groundwork above is intended to make them straightforward later:
*   A debrief/scoreboard UI consuming `scoreQualityEvents()`'s output.
*   A leaderboard/ranking system.
*   Procedural/spatial practice engines for regional/neuraxial anesthesia or POCUS/TTE/TEE/FAST (no chapter covering this content has been integrated yet).
*   User accounts, authentication, or multi-tenant access control.
*   Exhaustive quality-event tagging of every existing crisis trigger in `usePhysiology.js` — §14.3 lists a representative sample (laryngospasm/bronchospasm, GOSRD, anaphylaxis, LAST seizure, PRIS, residual NMB at extubation, PACU readiness) chosen for severity and cross-chapter relevance; dozens of smaller existing triggers (e.g. individual drug-specific seizure/dyscrasia events from Ch24/25) are not yet tagged and remain straightforward future additions using the same `logQualityEvent()` call pattern.
