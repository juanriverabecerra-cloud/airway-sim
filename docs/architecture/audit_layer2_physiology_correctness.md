# Audit Initiative — Layer 2: Physiology Correctness

> Read `audit_layer1_physics_core.md` first — Layer 2 is built entirely on the Layer 1 headless,
> deterministic, closed-loop harness (`src/testing/harness/headlessSim.ts`). This is where the audit
> starts catching **medical** mistakes, not just coding ones.

## Why Layer 2

Layer 1 gave us a physics core we can run headless, deterministically, and audit every tick against
the `FidelityOracle`. But the oracle is thin: ~30 rules for ~150 models, and every rule checks
**single-trajectory internal consistency** (does MAP match CO·SVR *this tick*). It never checks:

1. **Direction** — does the output move the *right way* when an input changes? (Sign errors — a `+`
   that should be a `−` — are the single most common physiology-coding bug and are invisible to
   consistency checks: a wrong-signed response is still internally consistent.)
2. **Magnitude/rate** — does propofol drop SVR by the *right amount* on the *right timescale*? (That's
   Layer 3, parameter provenance — noted, not done here.)
3. **Conservation** — fluid in/out vs volume; mass; O₂ delivery vs consumption.
4. **Cross-monitor consistency** — SpO₂ vs PaO₂ (dissociation curve), EtCO₂ vs PaCO₂ (gradient).

## The core new capability: metamorphic / differential testing

Run two sims that differ in exactly **one** input; assert the target output moves in the
physically-mandated direction. This is the rigorous way to catch sign/direction errors and
monotonicity violations. It's deterministic (both sims seeded identically) so a violation is
reproducible, and it's grounded (each property is an unambiguous physiology law, not a magic number).

Example laws (unambiguous directions):
- Rocuronium ↑ ⇒ TOF count ↓ · Sugammadex after roc ⇒ TOF ↑ back
- Propofol ↑ / MAC ↑ ⇒ BIS ↓ · Fentanyl ↑ (spontaneous) ⇒ RR ↓
- Phenylephrine/Norepi/Epi ↑ ⇒ MAP ↑ · Nitroprusside ↑ ⇒ MAP ↓
- Esmolol/Metoprolol ↑ ⇒ HR ↓ · Atropine ↑ ⇒ HR ↑
- Hypoventilation (RR ↓) ⇒ PaCO₂ ↑ and pH ↓ · FiO₂ ↑ ⇒ PaO₂ ↑
- Insulin ↑ ⇒ glucose ↓ · Furosemide ⇒ urine output ↑

Harness: `runMetamorphic(activeCase, mutate, { key, direction, minDelta })` in the Layer 2 harness.

## Scope of Layer 2 (this doc)
1. Metamorphic harness + a battery of drug→effect **direction** laws → triage.
2. New oracle invariants: cross-monitor consistency (SpO₂↔PaO₂, EtCO₂↔PaCO₂), conservation (fluid).
3. Fix the flagship Layer-1 findings that are confirmed physics defects:
   - **F5/F5b** MAP-CO-SVR decoupling (disease/pressor MAP shifts bypass SVR) — the big one.
   - **F7** PaO₂ ignores the alveolar ceiling when PaCO₂ rises on room air.
   - **F8** sugammadex reversal (triage sim-vs-oracle first).
   Each fix must: keep the equivalence proof green, re-bless the golden master with rationale if the
   trajectory legitimately changes, and **shrink `KNOWN_LAYER2_CRITICAL_RULES`** so the gate then
   enforces the finding's absence.

NOT in Layer 2: magnitude/time-constant grading against sourced values (Layer 3), independent blind
medical review (Layer 4), structural/tooling (Layer 5), numerical robustness (Layer 6).

## Verification checklist (every Layer 2 session)
- [ ] `npx vitest run` green · `npx vite build` green · `no-undef` 0
- [ ] Equivalence proof (hook==headless) still green
- [ ] Golden master unchanged, or re-blessed with a documented physiological rationale
- [ ] Any finding fixed ⇒ removed from `KNOWN_LAYER2_CRITICAL_RULES`; gate now enforces absence
- [ ] New findings appended to `audit_findings.md`

## Status log
- 2026-07-31 — Layer 2 opened. Design doc written.
- 2026-07-31 — **Metamorphic harness + first battery landed.**
  - `src/testing/harness/metamorphic.ts`: `giveMed` (real processMedCore path) + `runMetamorphic`
    (two identically-seeded sims differing in one input; assert the target vital's direction).
  - `src/testing/metamorphic_drug_directions_ch2.test.ts`: **11 drug→effect direction laws VERIFIED
    correct** (roc/vec→TOF↓, propofol/midazolam→BIS↓, phenylephrine/norepi→MAP↑, epi/atropine→HR↑,
    esmolol/metoprolol→HR↓, nitroprusside→MAP↓) — no sign errors in the core couplings, strong evidence
    the PK-PD wiring is directionally sound.
  - **New finding F10** (opioid doesn't blunt the compensatory ventilatory drive → paradoxical late
    tachypnea while apneic), pinned by a test. Metoprolol's apparent no-effect was a test-timing
    artifact (slower onset than esmolol — clinically correct), fixed by extending the window.
  - Next: fix F5.
- 2026-07-31 — **F5/F5b FIXED (flagship).** Root cause: the four-chamber model derives MAP from chamber
  mechanics (`referencePressure=87`, `SVR_TO_R_SCALE=1500`), not `MAP=CO·SVR/80+CVP`, so the displayed
  vasomotor-tone SVR (1100–1200) was not the SVR back-calculated from MAP/CO/CVP — the gap grew to
  ~38 mmHg under vasopressors/shock. Fix (`CardiovascularEngine.ts`): display `vitals.svr` as the
  identity-consistent `80·(MAP−CVP)/CO`; keep the tone as `vitals.svrTone` (drives the model + reflexes
  + first-pass, unchanged). Blast radius was ~0 (only the oracle reads `vitals.svr`); MAP/CO unchanged.
  Updated 2 unit tests to read `svrTone` (they test vasomotor tone), flipped the F5 doc-test to guard
  the fix, and removed `Ohm Cardiovascular Law Consistency` from `KNOWN_LAYER2_CRITICAL_RULES` so the
  gate now enforces its absence across all audit cases + the fuzzer. Full suite 1800/1800; equivalence
  proof still green (both paths use the same engine).
  - Next: fix F7 (PaO₂ alveolar ceiling) + F10 (opioid compensatory drive), then triage F8.
- 2026-07-31 — **F7 + F10 FIXED.**
  - F7: `targetPaO2` (alveolar gas eqn + A-a + shunt) was computed but never written to output vitals —
    the displayed PaO₂ was FROZEN at its input value and could exceed the alveolar ceiling. Fix
    (`RespiratoryEngine`): apply `targetPaO2` (damped) and hard-clamp to PAO₂. Also made the oracle's
    alveolar ceiling reservoir-aware (recent-max inspired FiO₂ over history) so legitimate apneic
    oxygenation / denitrogenation reservoir isn't false-flagged. PaO₂ now responds (healthy ~84, tracks
    down under hypoventilation) — no test broke (confirming the value was truly dead).
  - F10: opioids now blunt `hvrBlunting`/`hcvrBlunting` (core mechanism of opioid resp depression), and
    flag-based apnea (chest-wall rigidity / renarcotization) forces spontaneous RR to 0. Verified across
    5 seeds: fentanyl still induces apnea but RR stays ≤8 (was ~25 paradoxical tachypnea).
  - Both removed from `KNOWN_LAYER2_CRITICAL_RULES`; only F8 (sugammadex) remains. Full suite 1800/1800.
  - Next: triage F8 (sim reversal vs. dose-unaware oracle check).
- 2026-07-31 — **F8 FIXED — and it was a real, serious sim bug.** Sugammadex NEVER reversed rocuronium
  (TOF stuck at 0 even at 16 mg/kg). Root cause: `PKPDEngine.chelate()` reduced only the plasma
  compartment A1; A2/A3 refilled it and the effect-site Ce (drives TOF) relaxed only via the drug's
  own slow ke0 (~10 min). Fix: `chelate()` encapsulates drug from ALL compartments incl. Ce; bumped the
  dose→fraction tiers so an adequate rescue dose reaches ~complete reversal. Also made the oracle's
  time-delayed sugammadex check dose-aware (parse mg, compare mg/kg to block depth at push) so an
  under-dose that legitimately fails to reverse is not false-flagged. Verified dose-dependent recovery
  (`nmb_reversal_ch2.test.ts`): rescue → 4/4, 5 mg/kg → 4/4, 2.5 mg/kg on deep block → partial/recurar.
- 2026-07-31 — **All Layer-1-surfaced findings fixed (F5/F5b, F7, F10, F8).** `KNOWN_LAYER2_CRITICAL_RULES`
  is now EMPTY: the oracle-vs-physics and fuzz gates enforce ZERO CRITICAL anomalies across all audit
  cases + seeded fuzzing. Full suite 1803/1803.
  - Next: widen the net further — cross-monitor invariants + more metamorphic direction laws.
- 2026-07-31 — **Exhaustive metamorphic net-widening.** Added `exhaustive_directions_ch2.test.ts`
  (drug classes, reversal agents, mechanical ventilation) + `physiology_direction_laws_ch2.test.ts`.
  **~24 direction laws now verified** (NMBs incl. panc/miv, vasoactives, reversal agents, vent laws,
  FiO₂/fluid/furosemide). Surfaced **5 new findings**: **F12** pancuronium/mivacurium didn't paralyze
  (**fixed** — added to NMJ occupancy), and **F11** (alpha-2/labetalol paradoxical reflex tachycardia),
  **F13** (bicarbonate doesn't alkalinize), **F14** (flumazenil doesn't reverse benzo), **F15**
  (etomidate under-sedates) — all confirmed, pinned as tracked findings, open for a focused fix pass.
  Added a `setup` hook + `intubateMechanical` to the metamorphic harness. Full suite 1824/1824.
  - Next: fix F11/F13/F14/F15; add cross-monitor invariants (SpO₂↔PaO₂, EtCO₂↔PaCO₂); then Layer 3.
