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

_Status: scenario 1 complete (F40, F42 fixed; F41 deferred). Scenarios 2-7 (RSI, hemorrhage, anaphylaxis,
apnea/desat, emergence, arrest) pending. Full suite 1904/1904._
