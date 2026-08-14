# Layer 3 — Parameter Provenance & Numerical Fidelity Audit

**Status:** planning → execution. This is the layer that asks, of every number the simulator uses,
*"is this value correct, and where did it come from?"* — not "does it move the right direction"
(Layer 2), but "is the magnitude, the time constant, and the threshold right, and is it traceable to a
source or disclosed as a reasoned estimate."

Companion docs: `audit_layer1_physics_core.md` (L1), `audit_layer2_physiology_correctness.md` (L2),
running findings in `audit_findings.md`. Findings from this layer continue the same `F#` sequence
(next id: **F34**).

---

## 1. Why this layer, and why it's the biggest

Layer 2 verified *direction* (roc→TOF↓, dobutamine→CO↑, spinal→MAP↓). But direction-correct code can
still be numerically wrong: a drug can move BP the right way by the wrong amount, on the wrong time
course. Layer 2 already surfaced that **c50-scale errors are systematic** — isoproterenol (100× off),
methylphenidate, albuterol, methylergonovine, enalaprilat, and earlier norepinephrine were all
clinically inert or mis-scaled because their `c50` didn't match the effect-site concentration their
clinical dose actually produces. Those were found opportunistically. Layer 3 finds them **exhaustively**,
and extends the same rigor to PK time constants, volume of distribution, Hill coefficients, Emax
magnitudes, MAC values, receptor thresholds, and the thousands of physiological engine constants.

## 2. Scope (quantified from reconnaissance)

| Domain | Count | Current provenance state |
|---|---|---|
| **Pharmacology PK** (V1/V2/V3, k10–k31, ke0, protein binding, hepatic/renal fraction, coSensitivity) | 178 drugs × ~13 fields ≈ **2,300** | ~60–75% have a citation comment; ~25–40% bare |
| **Pharmacology PD** (c50, gamma, sysMax/diaMax/hrMax/rrMax, inducesApneaAtCe, inducesParalysisAtCe, receptor affinities, receptors block) | 178 drugs × ~6–17 fields ≈ **1,100** | mixed; the Emax fields rarely cited |
| **Named PK models embedded in `PKPDEngine`** (Marsh, Schnider, Minto, Eleveld, etc.) | ~6–10 models | cited by name; verify coefficients |
| **Physiological engine constants** (baroreflex gains, Frank-Starling, alveolar gas eqn, O₂ dissociation, acid-base buffers, GFR/clearance, BIS/GABA, thermoregulation, endocrine, coag) | ~300 decimal literals × ~40 substantive engines ≈ **thousands** | scattered inline; variable citation |
| **Disease/event model magnitudes** (sepsis, anaphylaxis, hemorrhage, MH, PE, etc.) | ~30 models | mostly Bucket-B reasoned estimates |
| **Fluid/electrolyte params** | 9 fluids × ~12 fields | verified for *direction* in L2; grade magnitudes here |

**Source material available for cross-reference (read-only — never modify `src/knowledge/`):**
142 parsed reference chapters (Miller's 9th, Morgan & Mikhail, Jaffe) under `src/parsed texts/`, and a
queryable `src/knowledge/medical_truth.db`. Plus the auditor's own pharmacology/physiology knowledge as
a primary reference. Existing in-code citation comments are a starting point, **not** trusted blindly —
several will turn out to disagree with the value they annotate.

## 3. Grading rubric (applied to every audited parameter)

| Grade | Meaning | Action |
|---|---|---|
| **A** | Sourced (named model / citation / textbook table) AND value verified within tolerance of the source | none — record as verified |
| **B** | Sourced but the value deviates materially from the source | **correct** to source; regression-pin |
| **C** | Plausible clinical estimate consistent with general knowledge, but undisclosed as an estimate | **disclose** in a comment; keep value |
| **D** | Implausible — outside the physiological/pharmacological range, or self-inconsistent (e.g. c50 that makes the clinical dose inert or saturated; k10 giving a half-life 10× off) | **fix** + finding + regression |
| **F** | Fabricated / no basis / contradicts a hard fact | **fix** + finding + regression |

"Tolerance" is domain-specific and stated per check (e.g. half-life within ±30% of published; c50 such
that the clinical dose yields an effect fraction in [0.2, 0.9]).

**Confirmed scoping decisions (user, before execution):**
- **Traceability = cite EVERY audited parameter to a source** (not just flagged ones). Each ledger row
  carries an explicit citation: a named published PK model (Shafer/Marsh/Schnider/Minto/Eleveld…), a
  Miller's/Morgan & Mikhail/Jaffe table located in `medical_truth.db`/parsed chapters (record the
  chapter + table/page + the internal doc id), or — where no primary source exists — an explicit
  `ESTIMATE` tag with the reasoning (grade C). This maximizes traceability and multiplies the session
  count; that is accepted. An existing in-code citation is *verified against the value*, not trusted.
- **Fix policy = fix as found.** B/D/F parameters are corrected immediately with a regression test, a
  green full-suite gate, and two-DB sync, per the Layer 1/2 pattern. No hold-for-approval batching.

## 4. Methodology — three complementary passes per domain

Manual eyeballing of 3,400 parameters is neither complete nor rigorous. Each domain gets:

1. **Automated derived-quantity cross-checks** (the workhorse — gives completeness). Compute clinically
   meaningful *derived* quantities from the raw params and assert they fall in the published range:
   - **PK:** elimination t½ from `k10` (and the micro-rate constants); Vdss from V1+V2+V3; clearance =
     k10·V1; context-sensitive behavior from k12/k21/k13/k31; **time-to-peak-effect from `ke0`**;
     redistribution t½α. Compare against the value the *comment claims* AND against the known clinical
     value. Mismatch between value, comment, and reality = graded finding.
   - **PD:** for every drug, run its **indication dose** through the headless sim and read the **peak
     effect-site Ce**, then compute `fraction = Ce^γ/(Ce^γ+c50^γ)`. Flag `c50` where the clinical dose
     gives fraction **< 0.15 (inert)** or **> 0.97 (saturated, no dose-response)** — this is the
     generalized isoproterenol/F29 detector, run over all 178 drugs. Also flag `gamma` outside [0.8, 5]
     and Emax magnitudes outside plausible bands.
   - **Physiology:** targeted invariant checks per engine (e.g. the alveolar gas equation constants
     reproduce a normal A-a gradient; the O₂ dissociation curve passes through the standard P50≈26.8 and
     the (40,75)/(60,90)/(100,98) anchor points; Henderson-Hasselbalch pK'≈6.1; normal GFR≈100).
2. **Source cross-reference** — for flagged params and for a stratified sample of the "looks fine" ones,
   pull the reference value from `medical_truth.db` / parsed chapters / standard tables and confirm.
3. **Manual expert grading** — the auditor grades each flagged parameter A–F with a one-line rationale
   into the **provenance ledger** (`docs/architecture/layer3_provenance_ledger.md`, a big table), and
   fixes B/D/F.

Every fix gets a regression test (a derived-quantity assertion or a metamorphic magnitude bound), so the
whole Layer-3 harness becomes a permanent guard against future parameter drift.

## 5. Phase breakdown (execution order — most systematic yield first)

### Phase 3A — Infrastructure + the two flagship automated sweeps  *(highest yield, do first)*
- **3A.1 Provenance ledger + harness scaffolding.** A test/harness that imports `MEDICATIONS`, iterates
  all drugs, and emits a machine-readable table of raw params + derived quantities.
- **3A.2 c50-vs-clinical-dose sweep** (generalizes the isoproterenol/F29 detector). Peak-Ce/c50 fraction
  for every drug at its indication dose → flag inert/saturated. *Expected to surface a cluster of
  D-grade findings immediately.*
- **3A.3 PK time-constant sweep.** Derived t½ (elim + redistribution), Vdss, clearance, time-to-peak
  effect for every drug → compare to the comment's claim and the known clinical value. Flag deviations.
- Deliverable: a ranked list of flagged drugs feeding Phases 3B/3C.

### Phase 3B — PK parameter audit, by drug class
Grade & fix the PK block (V1/V2/V3, k-constants, ke0, protein binding, hepatic/renal fraction,
coSensitivity) class-by-class against the source models:
sedatives/hypnotics (Marsh/Schnider/Eleveld propofol, etc.) → opioids (Shafer/Minto) → NMBs → local
anesthetics → vasoactives/inotropes → antiarrhythmics/electrolytes → the long tail (antibiotics,
anticoagulants, endocrine, misc).

### Phase 3C — PD parameter audit, by drug class
c50/EC50 (fed by 3A.2), gamma, Emax (sys/dia/hr/rr Max), `inducesApneaAtCe`, `inducesParalysisAtCe`,
receptor-affinity/`receptors` blocks, MAC values for the volatile agents (the single most-cited numbers
in anesthesia — verify sevo 1.8 / iso 1.15 / des 6.0 / halothane 0.75 / N₂O 104 / xenon 63, age
correction, and the additivity model).

### Phase 3D — Cardiovascular & respiratory engine constants
The two largest, most safety-critical engines. CV: baroreflex gains, Frank-Starling / FourChamber
reference pressures & resistance scales, reflex time constants, the neuraxial/opioid/anaphylaxis
coefficients added in L2. Resp: alveolar gas equation, A-a gradient, shunt fraction, dead space,
oxyhemoglobin dissociation curve, hypoxic/hypercapnic drive slopes, CO₂ dissociation, apnea desat rate.

### Phase 3E — Metabolic / renal / hepatic / neuro / endocrine / thermoregulation
Acid-base (buffer, SID, Henderson-Hasselbalch), RenalEngine (GFR, RBF, clearance, UOP, diuretic gains —
re-grade the F20 mannitol & F23 dextrose coefficients), HepaticEngine (metabolic clearances),
ConsciousnessEngine (GABA-A/BIS EC50s, the etomidate/volatile terms from L2), PancreasEngine
(glucose flux coefficients from F23), thermoregulation, adrenal/cortisol.

### Phase 3F — Disease/event model magnitudes (Bucket B — relaxed standard, must be disclosed)
Sepsis cascade, anaphylaxis progression, hemorrhage/PPH rates, MH, PE, PH, TLS, transfusion immunology,
etc. These are legitimately reasoned estimates; the job is to confirm each is *plausible and disclosed*,
not fabricated-and-presented-as-sourced.

### Phase 3G — Fluids, misc, and the "bare number" long tail
Grade the fluid electrolyte/coag/retention/citrate coefficients (L2 verified direction; grade magnitude
here). Then sweep the remaining uncited inline magic numbers across the smaller engines.

## 5.5 Source-citation mechanics (`medical_truth.db`)

`src/knowledge/medical_truth.db` (SQLite, read-only) holds **16,402 prose rows + 1,956 figure/matrix
rows** across Miller's Anaesthesia 9th (ch.9–87), Morgan & Mikhail 6th (ch.1–59), and Jaffe AMSP 6th
(ch.1–11). Row `id` encodes source + page, e.g. `Millers_Anaesthesia_9th_Edition_Chapter_26.pdf_PAGE_014_sec_2`
→ cite as "Miller's 9th Ch.26 p.14". Query with the sqlite3 CLI:
```
sqlite3 src/knowledge/medical_truth.db \
  "SELECT id, substr(body_text,1,240) FROM textbook_prose \
   WHERE body_text LIKE '%remifentanil%' AND body_text LIKE '%context-sensitive%' LIMIT 5;"
```
Practical reality: the prose is OCR'd and noisy (topics are garbage; the `physiological_matrices` table
is mostly figure captions, not clean drug tables). So the DB is a **supporting/confirming** reference for
chapter-level citation and exact-value spot-confirmation — NOT a clean lookup for all 3,400 values. The
authoritative citations are therefore layered:
1. **Named published PK/PD model** (Shafer-Varvel 1990/1991 fentanyl-sufentanil-alfentanil; Minto 1997
   remifentanil; Marsh 1991 / Schnider 1998 / Eleveld 2018 propofol; Gepts dexmed; etc.) — cited by name
   and confirmed against the value; these are the gold standard for the IV-anesthetic PK.
2. **Miller's / Morgan & Mikhail chapter** located via DB search (record chapter + page + the doc id) for
   drug-specific half-lives, Vd, MAC, receptor data, and physiological constants.
3. **`ESTIMATE`** — explicit tag + reasoning where no primary source exists (Bucket-B, grade C).
Each ledger row records which of the three applies. An in-code citation comment is re-verified, not
trusted (the F9 discipline: several will disagree with the value they annotate).

## 6. Deliverables & discipline

- **`layer3_provenance_ledger.md`** — the master table: parameter, file:line, current value, derived
  quantity, source value, grade, rationale, action taken. This is the completeness artifact.
- **`layer3_*.test.ts`** — one derived-quantity/magnitude regression suite per phase.
- Findings continue in `audit_findings.md` (F34+), one row each, most-severe first.
- **Discipline carried from L1/L2:** verify before claiming (the F9 lesson — several "wrong" values will
  turn out correct once the model context is understood); never present a reasoned estimate as sourced;
  run the full suite after each batch and keep it green; two-DB sync (`MEDICATIONS` ↔ `meds.config.ts`,
  `FLUIDS` ↔ `fluids.config`) on every value change; do not modify `src/knowledge/` (read-only source);
  commit per coherent batch with the finding id in the message.

## 7. Sequencing / session plan

Layer 3 is multi-session (like L2). Session cadence: **3A this session** (build the harness + run the two
flagship sweeps + triage the flagged cluster), then one focused session per drug-class/engine-domain in
Phases 3B–3G, each ending with fixes + regression tests + ledger rows + a commit. Estimated ordering by
expected finding-yield: 3A ≫ 3C ≳ 3D ≳ 3B ≳ 3E > 3F ≳ 3G.
