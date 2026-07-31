# AirwaySim Audit — Running Findings Log

Concrete bugs and fidelity issues surfaced by the Layer 1–6 audit initiative
(see `audit_layer1_physics_core.md`). Each row: what, how found, severity, status.

| # | Finding | How surfaced | Severity | Status |
|---|---------|--------------|----------|--------|
| F1 | **Simulator was fully nondeterministic** — `Math.random()` in 19 tick sites + 8 engines. No replay, no golden master, unfair to trainees. | Determinism audit (L1A) | High | ✅ Fixed (L1A): seeded serializable RNG. |
| F2 | **`clamp` referenced but never defined** — 4 bronchodilator sites; threw `ReferenceError` swallowed by the tick's try/catch as "Physics Engine Tick Failed" whenever Albuterol/Ipratropium/Ketamine/Magnesium was given. | ESLint `no-undef` gate during L1B extraction | High (silent tick break) | ✅ Fixed (L1B): module-scope `clamp`. |
| F3 | **Oracle's Ohm's-law check omitted the CVP term** — `MAP = CO·SVR/80` instead of `+ CVP`; the code contradicted its own comment. Caused ~140 false CRITICALs on healthy live physics. | L1C closed loop (oracle vs live physics) | Med (false positives) | ✅ Fixed (L1C). |
| F4 | **Oracle CRITICAL tolerances calibrated on exact hand-crafted states**, too tight for live data (intentional BP dither + integer rounding + variable MAP form factor). | L1C closed loop | Med | ✅ Fixed (L1C): calibrated + two-tier severity. |
| F5 | **MAP-CO-SVR coupling drift (~12–17 mmHg) in comorbid patients** — the CV engine applies disease-specific MAP modifiers (`sepsisMAPShift`, obesity/COPD shifts) directly to MAP without adjusting CO/SVR, so displayed CO, SVR, MAP don't satisfy the defining identity `SVR=(MAP−CVP)·80/CO`. A clinician recomputing SVR from the display would disagree. | L1C closed loop (septic/obese/COPD cases) | Med (fidelity) | ⏳ **Open — Layer 2.** Pinned by a WARNING + a regression test (`oracle_vs_physics_ch1c.test.ts`). Fix: route disease MAP shifts through SVR. |
| F6 | **No type-check gate** — `vite build` strips types without checking; it missed the F2 out-of-scope var (only runtime tests caught it). | L1B (build passed on a broken ref) | Med (tooling) | ⏳ Open — Layer 5: add `tsc --noEmit`. |
| F7 | **PaO₂ doesn't track the alveolar gas equation** — once drug-induced hypoventilation raises PaCO₂ on room air, the sim keeps PaO₂ ≈ 100 mmHg, exceeding the alveolar O₂ ceiling (PaO₂ > PAO₂, thermodynamically impossible). | L1C perturbation fuzzer (drugs) | Med (fidelity) | ⏳ **Open — Layer 2.** Pinned by the fuzz regression gate. Fix: couple PaO₂ to PAO₂ − A-a gradient. |
| F8 | **Sugammadex reversal incomplete** — TOF still 0/4 120s after sugammadex. Either a real reversal gap or the oracle's time-delayed check is dose/depth-unaware (a routine 200 mg dose can't reverse a deep 0/4 block). | L1C perturbation fuzzer | Med | ⏳ **Open — Layer 2 (triage).** Determine sim-vs-oracle; make the oracle check dose-aware and/or fix reversal kinetics. |
| F5b | **F5 amplified under vasopressors** — pressor drugs (phenylephrine/epi) drive MAP directly by ~38 mmHg without raising SVR → gross MAP-CO-SVR decoupling (CRITICAL-scale). Same root cause as F5. | L1C perturbation fuzzer | Med (fidelity) | ⏳ Open — Layer 2 (folds into F5 fix). |

## Layer 2 backlog (physiology correctness — seeded from L1C)
- **F5**: MAP-CO-SVR self-consistency (route disease MAP shifts through SVR).
- Extend the L1C oracle-vs-physics harness with **drug/fluid/vent perturbations** (needs the action
  handlers `processMed`/`pushMed`/`pushFluid` extracted the same way as `runPhysicsStep`), then seed
  `FidelityFuzzer`'s RNG for reproducible guided fuzzing.
- Widen `AUDIT_CASES` to cover every shipped preset (via a small reusable `buildCase`-equivalent), so
  the invariant sweep runs over the real case bank, not just representative cases.
