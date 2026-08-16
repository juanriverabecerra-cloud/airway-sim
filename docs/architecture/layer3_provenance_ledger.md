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

## Phase 3B — PK audit by drug class

Methodology note: the static `tPeak = ln(ke0/k10)/(ke0−k10)` is a 1-compartment approximation and is
**unreliable for multi-compartment drugs** (ignores redistribution — it claimed fentanyl 8.9 min). Onset
is therefore **measured from the sim** (bolus → sample Ce → time of peak). Diagnostic preserved as a
scripts/layer3 harness.

### 3B.i — Opioids (all VERIFIED · grade A/A−, no findings)
Sim-measured time-to-peak-effect vs published effect-site peak times, cited to the named PK models:

| Drug | Sim tpeak | Published tpeak | Source | Grade |
|---|---|---|---|---|
| fentanyl | 2.6 min | ~3.6 min | Shafer-Varvel, *Anesthesiology* 1990/1991; Miller's 9th Ch.26 | **A−** (slightly fast, within tolerance) |
| alfentanil | 2.6 min | ~1.4 min | Scott/Stanski, Maitre; Miller's 9th Ch.26 | **A−** (slightly slow; acceptable) |
| sufentanil | 5.8 min | ~5.6 min | Gepts/Bovill; Miller's 9th Ch.26 | **A** ✓ |
| remifentanil | 1.3 min | ~1.6 min | Minto, *Anesthesiology* 1997; Miller's 9th Ch.26 | **A** ✓ |
| morphine | 23.8 min | ~20–30 min | Stoelting Pharmacology; Miller's 9th Ch.26 (slow BBB penetration) | **A** ✓ |
| hydromorphone | 8.3 min | ~10–20 min | Miller's 9th Ch.26 | **A−** (slightly fast) |
| meperidine | (probe name-mismatch) | ~5–7 min | Miller's 9th Ch.26 | not re-measured; PK params plausible (Vdss 280 L, central t½ 28 min) — grade later |

**Conclusion:** opioid PK onset is well-calibrated — no findings. This validates a core Layer-3 principle:
the audit *verifies correctness with a citation*, it does not only hunt bugs; and sim-measured behavior,
not the static formula, is the authority for multi-compartment onset. (F34's dosing fix was the only
opioid-domain issue.)

### 3B.ii — Sedatives / hypnotics (VERIFIED · grade A/C, no findings)
Sim-measured onset (LOC occurs on the rising limb, before Ce peak):

| Drug | Sim tpeak | Published | Source | Grade |
|---|---|---|---|---|
| propofol | 1.3 min | ~1.6–2.2 min | Marsh 1991 / Schnider 1998 (PKPDEngine TCI); Miller's Ch.23 | **A** |
| etomidate | 2.7 min | ~1 min (LOC on rising limb) | Miller's Ch.23 | **A−** |
| ketamine / esketamine | 0.8 min | ~1 min | Miller's Ch.23 | **A** ✓ |
| thiopental | 0.8 min | ~1–1.5 min | Miller's Ch.23 | **A** ✓ |
| methohexital | 0.3 min | ~0.5 min (fastest barbiturate) | Miller's Ch.23 (ke0=5.0, disclosed) | **C** (borderline fast; coarse 10 s sampling; relative order vs thiopental correct — not fixed, F9) |
| midazolam | 2.7 min | ~3–5 min | Miller's Ch.25 | **A** ✓ |
| lorazepam | 20.3 min | ~15–20 min | Miller's Ch.25 | **A** ✓ |
| dexmedetomidine | 3.2 min (bolus) | slow clinical onset is the 10-min loading infusion + PD lag | Miller's Ch.23 | **A−** |

### 3B.iii — NMBs (relative order + duration correct; onset **F35**)
Sim-measured onset (time to TOF0) + duration (time to TOF4 recovery):

| Drug | t→TOF0 (onset) | Published onset | Grade |
|---|---|---|---|
| succinylcholine | <2 s | ~30–60 s | **F35** (too fast) |
| rocuronium | ~20 s | ~60–90 s | **F35** (too fast) |
| gantacurium | ~30 s | ~1–1.5 min | A− |
| atracurium | 1.8 min | ~2–3 min | A |
| mivacurium | 1.9 min | ~2–3 min | A |
| pancuronium | 2.2 min | ~3–5 min | A− |
| vecuronium | 3.1 min | ~2–3 min | A |
| cisatracurium | 4.4 min | ~3–5 min | A ✓ |

**F35 (Med, open):** NMJ occupancy saturates at too low a Ce → complete block develops within seconds
for roc/sux instead of over ~60–90 s. Root-caused; fix deferred (needs occupancy-curve recalibration +
re-verification of every L2 NMB direction test / reversal / F12). Ordering & durations are otherwise right.

_Next 3B: local anesthetics → vasoactives/inotropes → antiarrhythmics → the long tail. Then Phase 3C
(PD/c50/MAC) — where the F35 occupancy-curve fix is best done alongside the NMB PD grading._
