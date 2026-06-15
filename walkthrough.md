# Walkthrough: Intravenous Anesthetics, Opioids & Nonopioid Pain Meds (Chapters 23, 24 & 25 Simulator Integration)

This walkthrough documents the complete implementation of the pharmacology, pharmacodynamics, active metabolite kinetics, and clinical crises for Chapter 23 (*Intravenous Anesthetics*), Chapter 24 (*Opioids*), and Chapter 25 (*Nonopioid Pain Medications*).

---

## 🛠️ Codebase Integration Details

### 1. State Variables & Initial Patient State
The patient state tree in `usePhysiology.js` and `App.jsx` was updated with Chapters 23 & 24 properties:
*   `cortisolLevel`: `15.0` mcg/dL (monitors adrenal suppression).
*   `adrenalSuppressionActive`: `false` (11-beta-hydroxylase blockade flag).
*   `prisAccumulation`: `0.0` (tracks high-dose propofol exposure).
*   `prisTriggered`: `false` (propofol infusion syndrome status).
*   `emergenceDeliriumTriggered`: `false` (ketamine emergence agitation state).
*   `barbiturateArterialPrecipitation`: `false` (arterial barbiturate crystallization state).
*   `barbiturateArterialDrugName`: `''` (identifies the precipitating drug).
*   `chronicBenzoUse`: `boolean` (chronic tolerance flag).
*   `hydroxyMidazolam` / `norketamine`: (metabolite kinetics).
*   `opioidRigidityActive` / `remifentanilHyperalgesiaActive`: (wooden chest and hyperalgesia).
*   `sphincterOfOddiSpasmActive` / `opioidPruritusActive` / `renarcotizationActive` / `naloxoneSurgeActive`: (opioid side effect states).

No new state fields were added for Chapter 25, as all effects (analgesia, gut sparing, sedative-hypnotic CNS pathway excitation/deactivation) are computed dynamically from the active effect-site concentrations of the six newly registered medications.

---

### 2. Core Engine Refactors & Chapter 25 Additions

#### A. Multimodal Nonopioid Analgesia Surface (`PainEngine.ts`)
We integrated the six new non-opioid pain medications into the nociceptive pathway in `PainEngine.ts`:
*   *Acetaminophen* ($C_{50} = 10.0	ext{ mg/L}$, $\gamma = 1.5$)
*   *Ketorolac* ($C_{50} = 1.0	ext{ mg/L}$, $\gamma = 1.5$)
*   *Gabapentin* ($C_{50} = 5.0	ext{ mg/L}$, $\gamma = 1.5$)
*   *Pregabalin* ($C_{50} = 3.0	ext{ mg/L}$, $\gamma = 1.5$)
*   *Mexiletine* ($C_{50} = 1.0	ext{ mg/L}$, $\gamma = 1.5$)
*   *Topiramate* ($C_{50} = 4.0	ext{ mg/L}$, $\gamma = 1.5$)

These medications accumulate individually and contribute to an additive `nonopioidEff` surface:
\[
	ext{nonopioidEff} = 1.0 - \prod (1.0 - 	ext{medEff} \cdot 	ext{scale})
\]
This blunts incoming nociceptive signals dynamically:
\[
	ext{analgesiaBlunting} = 1.0 - (1.0 - 	ext{opioidAnalgesia}) \cdot (1.0 - 	ext{ketamineEff} \cdot 0.8) \cdot (1.0 - 	ext{lidoEff} \cdot 0.4) \cdot (1.0 - 	ext{nonopioidEff})
\]

#### B. Opioid-Sparing Gastrointestinal Motility (`GastrointestinalEngine.ts`)
Opioids induce Mu-receptor mediated inhibition of enteric nerves. The presence of Acetaminophen (`acetEff`) or Ketorolac (`ketoEff`) reduces the opioid blockade effect on gut motility by up to $40\%$:
\[
	ext{sparingFactor} = 1.0 - 0.40 \cdot \max(	ext{acetEff}, 	ext{ketoEff})
\]
\[
	ext{gutOpioidBlock} = 	ext{opioidBlock} \cdot 	ext{sparingFactor}
\]
This spares the motility index and speeds up postoperative/inflammatory ileus resolution.

#### C. CNS Sleep-Wake & Connectivity Pathways (`ConsciousnessEngine.ts`)
Gabapentinoids and Topiramate affect the consciousness model:
*   *Locus Ceruleus (LC) noradrenergic deactivation*:
    *   Gabapentinoids: $-0.15 \cdot 	ext{gabapentinoidEff}$
    *   Topiramate: $-0.10 \cdot 	ext{topiramateEff}$
*   *Ventrolateral Preoptic Area (VLPO) excitation*:
    *   Gabapentinoids: $+0.20 \cdot 	ext{gabapentinoidEff}$
    *   Topiramate: $+0.15 \cdot 	ext{topiramateEff}$
*   *Frontoparietal feedback deactivation*:
    *   Gabapentinoids: $-0.15 \cdot 	ext{gabapentinoidEff}$
    *   Topiramate: $-0.10 \cdot 	ext{topiramateEff}$

---

### 3. Front-End UI/UX Adaptations
*   Assigned the ASTM/ISO-inspired `indigo` color palette for non-opioid pain medications button states.

### 5. Pharmacopoeia Panel Reorganization & Category Optimization
We reorganized the pharmacopoeia categories in [Pharmacopoeia.jsx](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/components/controls/Pharmacopoeia.jsx) to group medications by their clinical effect, sorted alphabetically for rapid lookup:
1.  **Induction/Sedation** (`text-yellow-400`): General anesthetics, hypnotics, and sedative adjuncts (Dexmedetomidine, Etomidate, F3, F6, Ketamine, Methohexital, Midazolam, Propofol, Thiopental).
2.  **Analgesics** (`text-teal-400`): Opioids and nonopioid analgesics/adjuvants (Acetaminophen, Fentanyl, Gabapentin, Hydromorphone, Ketorolac, Mexiletine, Morphine, Pregabalin, Remifentanil, Sufentanil, Topiramate).
3.  **NMBAs/Reversal** (`text-cyan-400`): Neuromuscular blocking agents, reversals, and salivary anticholinergics (Atipamezole, Cisatracurium, Glycopyrrolate, Neostigmine, Rocuronium, Scopolamine, Succinylcholine, Sugammadex, Vecuronium).
4.  **Cardio/Vasoactive** (`text-rose-400`): Antiarrhythmics, pressors, vasodilators, and beta-blockers (Adenosine, Amiodarone, Atropine, Clevidipine, Ephedrine, Epinephrine, Esmolol, Labetalol, Lidocaine, Metoprolol, Nicardipine, Nitroglycerin, Norepinephrine, Papaverine, Phenylephrine, Vasopressin).
5.  **Electrolytes/Emergency** (`text-purple-400`): Bronchodilators, buffers, electrolytes, diuretics, and antimicrobials (Albuterol, Bicarbonate, Calcium, Furosemide, Magnesium, Methylphenidate, Unasyn).
6.  **Resus Fluids** (`text-emerald-400`): Resuscitation crystalloids, colloids, and blood products (Albumin 5%, Cryoprecipitate, Fibrinogen Concentrate, Fresh Frozen Plasma [FFP], Lactated Ringer's [LR], Normal Saline [0.9% NS], Packed Red Blood Cells [PRBC], Platelets, Plasmalyte).

Chiral volatile isomers (`s_isoflurane`, `r_isoflurane`) were removed from the pharmacopoeia as they are already controlled via the volatile anesthetics selector in the ventilator panel (`BottomBar.jsx`).


---



### 4. Chapter 26: Target-Controlled Infusions (TCI) & Intravenous Drug Delivery Systems

#### A. Model-Specific Parameter Recalculations
*   **Marsh Model** (Propofol): Clearance and compartment volumes are scaled linearly based on total body weight ($V_1 = 0.228 \cdot W$, $V_2 = 0.363 \cdot W$, $V_3 = 2.893 \cdot W$, $k_{10} = 0.119$).
*   **Schnider Model** (Propofol): Uses age, height, total weight, and lean body mass ($LBM$) as covariates, setting $V_1 = 4.27\text{ L}$ dynamically while adjusting intercompartmental fluxes and clearances.
*   **Paedfusor & Kataria Models**: Configured for pediatric propofol administration, scaling clearances dynamically using age/weight exponents.
*   **Domino Model**: Configured for Ketamine, scaling clearances and volumes based on body weight.

#### B. Euler Backward-Solving continuous rate
*   The required infusion rate $I(t)$ to achieve the target concentration is solved backward inside the sub-stepping integration loop (10x sub-steps per physical tick) to avoid lag, overshoot, or oscillation:
    \[I(t) = \max\left(0, \frac{\text{targetA}_1 - A_1(t)}{\Delta t} + (k_{10} + k_{12} + k_{13})A_1(t) - k_{21}A_2(t) - k_{31}A_3(t)\right)\]

#### C. Ce-Targeted Overdrive Control
*   Under Effect-Site ($C_e$) targeting, the system calculates a dynamic plasma target ($C_{p,\text{target}}$) with an overdrive factor capped at $3.0\text{x}$ the target concentration to load the biophase rapidly:
    \[C_{p,\text{target}} = \max\left(0, \min\left(3.0 \cdot C_{e,\text{target}}, C_{e,\text{target}} + (C_{e,\text{target}} - C_e) \cdot 1.5\right)\right)\]

---

## 🧪 Verification & Testing Results

### 1. Automated Test Suites
Comprehensive test suites were implemented across the codebase:
*   **Chapter 23**: `src/testing/intravenous_anesthetics_ch23.test.ts` (46 tests)
*   **Chapter 24**: `src/testing/opioids_ch24.test.ts` (11 tests)
*   **Chapter 25**: `src/testing/nonopioid_pain_meds_ch25.test.ts` (6 tests)
*   **Chapter 26**: `src/testing/intravenous_drug_delivery_ch26.test.ts` (7 tests)

*   **Vitest Results**: Run `npm run test` or `npx vitest run`. All **289/289 tests** pass successfully.
*   **Vite Build**: Run `npm run build`. Compiles and bundles successfully with zero TypeScript compilation warnings or parse errors.
