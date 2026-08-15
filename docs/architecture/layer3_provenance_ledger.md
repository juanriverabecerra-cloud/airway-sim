# Layer 3 — Parameter Provenance Ledger

The completeness artifact for the Layer 3 audit (`audit_layer3_parameter_provenance.md`). One section per
parameter domain; within each, every audited parameter is graded **A–F** with a source citation (named
model / Miller's·Morgan·Jaffe chapter+page located in `medical_truth.db` / `ESTIMATE`). Fixes are made
as-found (per the confirmed scope) and cross-referenced to the finding id in `audit_findings.md`.

Grades: **A** sourced+verified · **B** sourced-but-off (fix) · **C** disclosed estimate · **D** implausible
(fix) · **F** fabricated (fix).

---

## Phase 3A.2 — c50 vs clinical-dose sweep (all 173 drugs with a numeric `pd.c50`)

Ran every drug's first indication dose through the headless sim; measured peak effect-site Ce; computed
the Hill fraction `f = Ce^γ/(Ce^γ+c50^γ)`. **Interpretation requires the PK sweep (3A.3)**: a low `f`
means *either* c50 too high *or* Ce too low (PK). Triage below.

### Result buckets: 35 inert (f<0.15) · 27 saturated (f>0.97) · 111 responsive (0.15–0.97)

### Triage of the 35 "inert" flags
| Drug | f | Verdict | Note |
|---|---|---|---|
| glucagon, verapamil, magnesium, mannitol, amiodarone, regularInsulin | ~0 | **Not a c50 bug — VESTIGIAL** | Clinical effect is wired directly in `usePhysiology` (F16/F17/F18/F19/F20 rate/diuresis/glucose terms), not via `pd.c50`. Grade the c50 as **C (unused/disclose)**; do not "fix". |
| meropenem, piperacillin_tazobactam, vancomycin, cefazolin, ceftriaxone, gentamicin, tranexamicAcid, rfviia, protamine, hemin, benzocaine, ipratropium | <0.07 | **Correct — non-hemodynamic** | Antibiotics/hemostatics/topicals have no `pd`-driven vital effect by design; "inert" is right. Grade **A (correctly no effect)**. |
| desmopressin, ziconotide, octreotide, carboprost, misoprostol, bromocriptine, haloperidol, granisetron, palonosetron, physostigmine, dexamethasone, tetracaine, cefazolin | <0.13 | **Review — special/receptor pathway** | Effect (ADH/vWF, uterotonic, D2, 5-HT3, anticholinesterase…) is not a simple c50 hemodynamic. Confirm the real pathway is wired; grade c50 accordingly. |
| **alfentanil** | 0.001 | **REAL candidate → 3A.3** | Opioid; 25 mcg/kg reached peakCe 1.7 ng/mL — far below both c50 (0.25 mg/L) and alfentanil's true EC50 (~0.1–0.3 mg/L = 100–300 ng/mL). Likely **PK** (Ce ~100× too low), NOT c50. Disambiguate with the PK sweep before fixing. |
| **sufentanil** | 0.13 | **REAL candidate → 3A.3** | c50 0.0006 mg/L is plausible for a very potent opioid, but 10 mcg reached only 0.17 ng/mL — check the PK (V1/ke0). |
| **digoxin** | 0.000 | **Review** | Narrow therapeutic window; its AV/inotropic effect is slow & partly special-wired. Confirm intended pathway. |
| **enalaprilat** | 0.027 | **Known-partial (F29)** | c50 already corrected 1.0→0.3 in F29, but its ke0=0.015 is so slow Ce barely rises in-window — a **PK/onset** provenance item for 3A.3, and ACE-I effect is genuinely RAAS-state-dependent (disclosed estimate). |
| milrinone | 0.019 | **Known (F25)** | Slow ke0; documented. |

### Triage of the 27 "saturated" flags
| Drug(s) | Verdict | Note |
|---|---|---|
| propofol, etomidate, esketamine, cocaine, methohexital | **Correct** | Induction agents at induction doses SHOULD be near-maximal (steep γ). Verify the c50 values themselves in 3C against Marsh/Schnider/published EC50, but the "saturation" is expected. |
| rocuronium, succinylcholine, atracurium, mivacurium, gantacurium, edrophonium, adenosine | **Correct** | NMBs (γ=4) at intubating doses → complete block; expected f≈1. |
| remifentanil, naloxone, angiotensin_ii, nitroprusside | **Plausible** | Very potent agents near-max at clinical infusion/dose; confirm exact c50 in 3C. |
| sugammadex (c50=0), albumin (c50=0) | **Placeholder** | c50=0 makes f≡1; effect wired elsewhere (chelation/volume). Grade **C (placeholder, unused)**. |
| r_isoflurane, s_isoflurane, f3, l_cysteine, heparin, andexanet, fosaprepitant, gentamicin, pralidoxime, hydroxocobalamin | **Artifact/special** | Gas-agent enantiomers dosed as IV bolus in the sweep (not a real route); or non-hemodynamic agents. Not real dose-response bugs. |

**Phase 3A.2 conclusion:** the sweep is validated (it re-flags the known F26/F29/F25 class and surfaces
**alfentanil + sufentanil** as new opioid candidates). The dominant lesson — consistent with the F9
discipline — is that a low Hill fraction is frequently *correct* (non-hemodynamic drug, or effect
special-wired, or induction agent at full effect), so each flag is graded individually, not batch-fixed.

## Phase 3A.3 — PK derived-quantity sweep + the finding it exposed (F34)

Static sweep (no sim) computing, per drug: elimination t½=ln2/k10, time-to-peak-effect from ke0/k10,
Vdss=V1+V2+V3, CL=k10·V1, and Cp₀ per 1 mg. Diagnostic preserved at `scripts/layer3/pk_sweep.diagnostic.ts`.

**F34 (High, FIXED) — the `mcg/kg` under-dose.** Cross-referencing the c50 sweep's "inert opioid" flags
against the PK sweep resolved the paradox: alfentanil's `V1=7.8 L` means a real 25 mcg/kg bolus (1.75 mg
for 70 kg) should give Cp₀ ≈ 224 ng/mL — therapeutic — yet the c50 sweep measured peak Ce = 1.7 ng/mL, a
~130× gap. Not a PK-param error: the **dose was under-delivered**. `processMedCore`'s unit parser matched
`'mcg'` before the `/kg` qualifier, so `'mcg/kg'` boluses dropped the weight factor (~70× under-dose).
Fixed (F34) by matching `includes('mcg/kg')` first. So **alfentanil/sufentanil c50 were NOT bugs** — they
were symptoms of F34; re-grade their c50/PK in 3B/3C once dosing is correct. This is the payoff of running
the c50 and PK sweeps *together*.

**Opioid PK first-pass grades (to verify against sources in 3B):** remifentanil (t½≈1min, tpeak≈1.8min —
Minto; A−, t½ a touch short) · fentanyl (tpeak≈8.9min — Shafer; **B?**, published tpeak ~3.6min, ke0 may
be too slow — 3B) · alfentanil (t½≈15min vs published ~90–110min — **B**, k10 too fast; 3B) · morphine
(tpeak≈51min — **B?**, published ~20–30min; 3B) · propofol (t½≈2min, tpeak≈2.2min — Marsh/Schnider; A) ·
lorazepam (tpeak≈43min — plausible for a slow benzo; verify). Full grading in Phase 3B.

_Next: Phase 3B — PK audit by drug class, citing each param to its named model / Miller's-Morgan chapter,
starting with the opioids (Shafer/Minto) whose PK the 3A.3 sweep already flags (fentanyl/alfentanil/morphine
onset & elimination)._
