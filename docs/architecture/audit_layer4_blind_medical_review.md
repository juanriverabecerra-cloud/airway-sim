# Audit — Layer 4: Independent Blind Medical Review

**Scope.** Evaluate the simulator's *emergent, integrated* clinical behavior across representative
end-to-end scenarios, as an attending anesthesiologist would at the bedside — **deliberately not
anchored to the Layer 1–3 findings**. Where L2 tested single-variable *directions* and L3 graded
individual *parameter magnitudes*, Layer 4 asks: does the whole multi-system trajectory of a real
clinical arc look right? It catches integration bugs, missing responses, internal monitor
contradictions, and clinically-wrong emergent behavior that per-parameter checks cannot see.

**Method.** Run each scenario end-to-end in the headless sim; capture the full vitals/labs trajectory;
compare against the expected clinical course. Findings continue the shared `F##` sequence in
`audit_findings.md`. Fix-as-found (per standing scope); defer only delicate multi-system recalibrations
with a precise characterization (same discipline as L2/L3).

**Scenarios (blind checklist).**
1. Standard IV induction (propofol + fentanyl + rocuronium → intubation) — apnea, BP dip, laryngoscopy response.
2. RSI (preox → succinylcholine/high-dose roc → intubation) — onset timing, hemodynamics.
3. Hemorrhage → resuscitation — EBL → hypotension/tachycardia → fluid/blood → recovery.
4. Anaphylaxis → epinephrine rescue — SVR collapse + bronchospasm → recovery.
5. Apnea/hypoxia → desaturation → bradycardia (with and without preox).
6. Emergence/reversal — NMB reversal, extubation-readiness coherence.
7. Cardiac arrest / ACLS arc — arrest rhythm, CPR, epinephrine, ROSC.

## Findings log

### Scenario 1 — Standard IV induction (propofol + fentanyl + rocuronium) → **F40 (FIXED), F41 (deferred), F42 (open)**
Ran propofol 140 mg + fentanyl 150 mcg + roc 42 mg, no ventilation, on room air. Correct: BIS 98→2, MAP dip,
roc TOF 4→3→2→0 over ~90 s (F35 holds). **Wrong (F40):** the apneic deep-anesthesia patient (propofol Ce ~8,
BIS ~1) mounted a hypoxic ventilatory drive RR ~30 that reoxygenated it 31→88% — GA abolishes the hypoxic
drive, so this masked the lethal consequence of not ventilating. Traced to IV hypnotics (and, via **F41**, the
inert `opioidEff`) not blunting the drive. **Fixed** with an IV-hypnotic-depth term + working opioid occupancy;
the patient now stays apneic and desaturates to critical hypoxia (SpO2→17%). **F41** (root `synergyGroup`
wiring bug → `sedativeEff`/`opioidEff` always ~0) characterized, root fix deferred (large blast radius).
**F42 (FIXED):** the F40 fix exposed a pre-existing BIS oscillation (83↔33) in the peri-arrest hypoxic state.
Two causes, both fixed: (1) a **falsy-zero bug** in the arrest-BIS decrement `(st.vitals.bis || 98) − 5` —
`0 || 98 === 98`, so BIS reset to 93 every time it reached 0 (sawtooth aliasing to 83↔33); nullish-guarded so
BIS falls to 0 and stays. (2) hypoxia/hypercapnia cortical arousal (`ConsciousnessEngine`) fired regardless
of anesthetic depth, force-waking a GA patient each hypoxic tick — gated by `!isAnesthetized`. The
induction→hypoxic-arrest trajectory now reads BIS 98→23→4→1→0 monotonic. Guard `bis_arrest_ch4.test.ts`.

### Scenario 2 — RSI (preox + etomidate + succinylcholine) → no findings
Preoxygenation reserve (O2 buffer 0.56→2.68 L = denitrogenated FRC), room-air apnea time (66 s, spot-on),
anesthetized preox apnea time (~12 min — defensible: GA lowers VO2 ~15%), sux fast onset (TOF0 ~45-60 s, F35),
etomidate hemodynamic stability (pd −5, more stable than propofol) all check out. F9 avoided two false findings
(the −18% etomidate MAP was a ventilation-transient confound; the long apnea time is correct for an
anesthetized fully-preoxygenated patient).

### Scenario 3 — hemorrhage → **F43**
50% blood loss drove HR to an impossible 240 (no sinus cap) → **F43 HR cap fixed**; the over-steep compensation
curve (MAP crashes at 10% loss) characterized & deferred.

### Scenarios 4-7 (continuation) — RSI-hemodynamics, laparoscopic (pneumoperitoneum), opioid/biliary, induction
A productive batch of integration bugs, most in two families:
- **Falsy-zero / `|| fallback`**: **F47** (`map || 90` fabricated normal vitals during arrest — CerebralEngine
  reported CPP 64 during asystole; the bulk of the "decompensated monitors make no sense" report), **F48**
  (oscillator pushed HR to −2 bpm), sibling of the scenario-1 **F42**.
- **Live-vs-snapshot state**: **F52** (one-shot events re-rolled every tick → sphincter-of-Oddi spasm repeated),
  **F53** (the F31 opioid sympatholysis read a stale snapshot and NEVER applied — fentanyl still caused reflex
  tachycardia).
- **Reflex-tachycardia / baroreflex**: **F50** (baroreflex not blunted by IV hypnotics → propofol induction →
  paradoxical HR 136), **F51** (PainEngine `hrSpike` was a second un-blunted baroreflex controller summed on top).
- Plus **F44** (GA crushed resp compliance ~70% at 1 MAC — a static-vs-activity category error), **F45** (adrenal
  crisis fired in EVERY intact patient from a unit mismatch → spurious ~35% SVR cut), **F46** (phantom recruitment
  maneuvers from measured PIP hitting the pmax ceiling).
All fixed; see F43-F53 in `audit_findings.md`.

### Scenario 5 — anaphylaxis → epi rescue → **F54**
Direct-triggered anaphylactic shock: SVR collapses to ×0.25 (75% drop, correct), MAP crashes to ~28, reflex
tachycardia HR 176-189 (correctly capped by F43, not 240+). **F54 (FIXED):** epinephrine could not rescue it —
the reversal term `min(1, epiCe·12)` gave only ~13-35% reversal at clinical epi Ce, so the patient ALWAYS
arrested regardless of treatment (anaphylaxis was 100% fatal). Fixed by scaling reversal by epi receptor
occupancy `Ce/(Ce+0.005)`; treated patients now survive and perfuse. Bronchospasm→hypoxia checked and left
as-is (PCV-VG compensates to pmax; awake patients arrest from shock first). F9 also confirmed the reflex
tachycardia and HR cap behave.

### Scenario 6 — emergence / NMB reversal → no findings
Sugammadex 2.9 mg/kg at a DEEP block (TOF 0) → partial reversal (TOF 3) — correct (deep block needs 4 mg/kg;
the L2 `nmb_reversal` test confirms full-dose reaches 4/4). Neostigmine at TOF 0 → ineffective (correct, needs
TOF≥2). Neostigmine 3 mg WITHOUT glycopyrrolate → asystole in 30 s (the real unopposed-muscarinic interaction,
correctly modeled); WITH glyco → no arrest, block appropriately unreversed. Reversal pharmacology is sound.

### Scenario 7 — cardiac arrest / ACLS → no findings
VF arrest → CPR generates MAP ~66-71 (effective compressions); ROSC is coronary-perfusion-gated. Directionally
correct: ROSC achievable with CPR+epi+shocks, never without (untreated VF correctly does not self-resolve).
~25% sustained-ROSC in a small stochastic sample is defensible; not flagged (F9).

_Status: **Layer 4 COMPLETE** — scenarios 1-7 all reviewed. Findings F40-F54 (F49 skipped): **13 fixed**, 2
deferred (F41 root-fix; F43 compensation-curve). Guards added across ch4 test files. Full suite green._
