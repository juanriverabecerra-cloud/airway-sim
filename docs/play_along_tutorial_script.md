# AirwaySim — Play-Along Tutorial Script
## A Complete Case Walk-Through for Instructors, Residents & Program Directors

> **How to open this file in VS Code:**
> ```bash
> code /Users/jsriverab/.gemini/antigravity/scratch/airway-sim/docs/play_along_tutorial_script.md
> ```
> Or find it in the **Explorer sidebar → docs/** folder.

---

### Legend

| Icon | Meaning |
|------|---------|
| 🕹️ **PLAYER OBJECTIVE** | What the learner must do — concrete, sequenced task commands |
| 📍 **WHERE TO LOOK** | Exact panel, column, or screen region to focus on |
| ⚙️ **WHAT TO CLICK / ENTER** | Precise click sequence, value, and button label |
| 🎭 **THE SIMULATOR REACTION** | What changes on screen — vitals, waveforms, log events, panel updates |
| 💡 **CLINICAL INSIGHT FOR DIRECTORS** | The physiology, pharmacology, or patient-safety principle being illustrated |

---

### Dashboard Layout Quick Reference

```
┌──────────────────────────────┬───────────────────────────────┐
│  PRIMARY MONITOR             │  VENT MONITOR                 │
│  (ECG, A-line, Pleth, EEG)   │  (Paw, Flow, EtCO₂, Loops)   │
├──────────────────────────────┴───────────────────────────────┤
│  BOTTOM BAR: Gas Dials · Vent Settings · Phase Buttons       │
├──────────────┬───────────────┬───────────────────────────────┤
│ AIRWAY       │ PHARMACOPOEIA │ LOG PANEL + ATTENDING CHAT    │
│ PANEL (L)    │ PANEL (C)     │ MEMORY / RENAL (R)            │
└──────────────┴───────────────┴───────────────────────────────┘
```

---

## 📋 PHASE 1 — PRE-OP ASSESSMENT & RISK STRATIFICATION

### Milestone 1.1 — Load the Case

- **🕹️ PLAYER OBJECTIVE**: Start a high-fidelity anesthetic case from the Case Manager.
- **📍 WHERE TO LOOK**: The **Case Manager** button at the top of the screen (briefcase icon, or the blue "Load Case" panel on first launch).
- **⚙️ WHAT TO CLICK / ENTER**:
  1. Click **"Load Case"** in the top navigation bar.
  2. In the Case Manager grid, select **"General — Laparoscopic Appendectomy"** (the first card — healthy adult, ASA I).
  3. Click **"Start Case"**.
- **🎭 THE SIMULATOR REACTION**: The OR dashboard populates. The Primary Monitor shows an awake patient: HR 78 bpm · BP 122/78 mmHg · SpO₂ 98% (room air) · RR 14 · Temp 36.8°C. The Log Panel prints *"Case initialized: Laparoscopic Appendectomy — healthy 34-year-old adult."* The surgical phase button shows **Pre-Op** as active.
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: Every case initializes from a physiologically consistent patient state derived from the full engine stack (cardiovascular, respiratory, endocrine, coagulation). The "healthy" baseline you see here is the product of the same engines that later model sepsis, hemorrhage, and MH — not a hard-coded starting point.

---

### Milestone 1.2 — Review the Pre-Op EMR

- **🕹️ PLAYER OBJECTIVE**: Read the patient chart to identify relevant history, allergies, and airway predictors before touching the patient.
- **📍 WHERE TO LOOK**: Top navigation bar → **"Pre-Op EMR"** button (green, stethoscope icon).
- **⚙️ WHAT TO CLICK / ENTER**: Click **"Pre-Op EMR"** → Review each tab: **Summary · Vitals · Airway · Labs · Meds · Allergies**.
- **🎭 THE SIMULATOR REACTION**: A modal opens showing:
  - Airway: Mallampati II, mouth opening 4 cm, thyromental distance 7 cm, neck mobility normal.
  - RCRI: 0 factors → Estimated cardiac risk < 1%.
  - STOP-BANG: 1 point → Low OSA risk.
  - Labs: Hgb 14.1, Plt 228, INR 1.0, Creatinine 0.9, Na 139.
  - Medications: None. Allergies: None known.
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: The RCRI, STOP-BANG, BMI, Mallampati, and airway exam boxes are all computed live — not filled statically. If you load the **Bariatric preset** (BMI 51, OSA), these scores update automatically to reflect the real patient state, including the CHA₂DS₂-VASc, Apfel PONV risk, and chronic medication management plan.

---

### Milestone 1.3 — Ask the Attending AI a Pre-Op Question

- **🕹️ PLAYER OBJECTIVE**: Use the AI attending to explore the pre-op plan before induction.
- **📍 WHERE TO LOOK**: Bottom-right corner → **"Attending"** tab in the right panel.
- **⚙️ WHAT TO CLICK / ENTER**: Click the **Attending** tab → type *"What is my pre-op plan for this patient?"* → press Enter.
- **🎭 THE SIMULATOR REACTION**: The attending responds with a concise clinical plan covering: NPO status, aspiration risk, antibiotic prophylaxis timing (30–60 min before incision), premedication considerations, airway strategy, and anticipated surgical challenges (pneumoperitoneum, Trendelenburg).
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: The attending reads the live patient state — including active medications, lab values, and comorbidities — to ground its response. Ask follow-up questions like *"What antibiotic for prophylaxis?"* or *"Is this patient at risk for PONV?"* to explore the full knowledge layer.

---

### Milestone 1.4 — Explore the Vital Context Panels (Pre-Op Baseline)

- **🕹️ PLAYER OBJECTIVE**: Click on a vital box on the Primary Monitor to open the interactive context panel and understand what drives each value at baseline.
- **📍 WHERE TO LOOK**: **Primary Monitor** (left column of main display) → numeric vitals section (right half of that panel).
- **⚙️ WHAT TO CLICK / ENTER**: Click the **HR (Heart Rate)** box → observe the **Vital Context Panel** that opens as a draggable floating window → click the **DRIVERS** tab → then click **ACTIONS** → then **CONTEXT**.
- **🎭 THE SIMULATOR REACTION**: A floating panel titled *"Heart Rate"* appears anchored near the HR box. The DRIVERS tab lists the dominant inputs to HR at baseline: sympathetic/parasympathetic tone, age-adjusted intrinsic rate, current MAC contribution (0), and endocrine state. The ACTIONS tab shows one-click options (Atropine, Glycopyrrolate, Metoprolol, Esmolol) with dose pre-populated. The CONTEXT tab shows normal range, pacemaker dependency, and baroreceptor gain.
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: Every vital box on every monitor is clickable. The panels auto-detect the current patient crisis state — a panel opened during MH will show massively elevated sympathetic drive as a driver; during cardiac arrest it surfaces CPR quality and rhythm determinants.

---

## 💨 PHASE 2 — MONITORING SETUP & PRE-OXYGENATION

### Milestone 2.1 — Add TOF Monitoring

- **🕹️ PLAYER OBJECTIVE**: Set up quantitative neuromuscular monitoring before administering any paralytics.
- **📍 WHERE TO LOOK**: Primary Monitor numeric section → **TOF** box (shows "-- " before monitor is added).
- **⚙️ WHAT TO CLICK / ENTER**: Click the **TOF** box → in the floating context panel that opens, click **ACTIONS** tab → click **"Add TOF Monitor"**.
- **🎭 THE SIMULATOR REACTION**: The TOF box updates to **4/4 · Ratio 1.00** (no paralysis at baseline). An event logs *"Quantitative TOF acceleromyography monitor attached."*
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: Quantitative TOF is mandatory by ASA guidelines before and after any NDMR. "4/4 twitches with no fade" on qualitative (manual) assessment can coexist with a TOF ratio as low as 0.62 — clinically dangerous residual paralysis. The simulator models this gap explicitly; see Phase 7.

---

### Milestone 2.2 — Add BIS Monitoring

- **🕹️ PLAYER OBJECTIVE**: Add depth-of-anesthesia monitoring before induction.
- **📍 WHERE TO LOOK**: Primary Monitor → **BIS** box (shows "--" before added).
- **⚙️ WHAT TO CLICK / ENTER**: Click the **BIS** box → **ACTIONS** → **"Add BIS Monitor"**.
- **🎭 THE SIMULATOR REACTION**: BIS updates to **96** (awake). The EEG strip appears at the bottom of the waveform column, labeled **"AWAKE — β/γ ACTIVITY"** with a fast, low-amplitude irregular trace. The EEG state badge shows in purple.
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: BIS in AirwaySim is computed from a real thalamocortical-frontoparietal oscillation model (ConsciousnessEngine), not a simple formula. The display shows SUB-PARAMETER breakdown: SynchFastSlow, SEF95, BSR — the same metrics on clinical BIS monitors.

---

### Milestone 2.3 — Explore the EEG Waveform Guide

- **🕹️ PLAYER OBJECTIVE**: Click the live EEG strip to open the interactive EEG teaching panel.
- **📍 WHERE TO LOOK**: Primary Monitor waveform column (left side) → bottom strip labeled **"EEG"** with the state badge.
- **⚙️ WHAT TO CLICK / ENTER**: Click anywhere on the EEG strip → the **EEG Context Panel** opens as a draggable floating window.
- **🎭 THE SIMULATOR REACTION**: The panel opens at **EEG State Guide** tab by default, showing 6 clickable state cards:
  - AWAKE (β/γ)
  - Light Sedation (α spindles)
  - Moderate (θ)
  - Surgical Depth (δ waves)
  - Burst Suppression
  - Isoelectric
  Each card has a mini SVG waveform preview. Click **"Surgical Depth (δ waves)"** → the card expands to show a large delta wave SVG, mechanism (thalamic hyperpolarization, cortical synchrony), clinical significance (BIS 40–55 target), and which drugs drive this state.
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: The pre-computed waveform examples use the exact same signal mathematics as the live EEG strip. This ensures what the student learns in the guide panel matches precisely what they will see appear on the live monitor strip during induction.

---

### Milestone 2.4 — Pre-Oxygenation

- **🕹️ PLAYER OBJECTIVE**: Pre-oxygenate the patient to extend the safe apnea window.
- **📍 WHERE TO LOOK**: Left column → **Airway Panel** → top section.
- **⚙️ WHAT TO CLICK / ENTER**:
  1. Click **"O₂ Mask"** (or **"NRB Mask"**) → select **"15 L/min 100% O₂"** → click **"Apply"**.
  2. Wait for SpO₂ to reach **100%** and EtO₂ (end-tidal oxygen) to exceed **0.85** (visible in vitals when measured).
- **🎭 THE SIMULATOR REACTION**: SpO₂ climbs from 98% to 100%. FiO₂ rises to 1.0. The Log Panel notes *"Pre-oxygenation initiated. Target EtO₂ > 0.9 for adequate denitrogenation."*
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: AirwaySim models FRC-based oxygen storage and the denitrogenation time constant. A patient with BMI 51 (Bariatric preset) desaturates 4× faster because FRC is reduced by 25–50%, compressing the safe apnea window from ~8 minutes to ~2–3 minutes — a difference that appears dramatically on the monitor during laryngoscopy.

---

## 🔵 PHASE 3 — INDUCTION OF ANESTHESIA

### Milestone 3.1 — Premedication (Midazolam + Fentanyl)

- **🕹️ PLAYER OBJECTIVE**: Administer anxiolysis and opioid pre-loading before induction.
- **📍 WHERE TO LOOK**: Center column → **Pharmacopoeia Panel** → medication tabs at top.
- **⚙️ WHAT TO CLICK / ENTER**:
  1. Click **"Anxiolytics/Benzos"** tab → select **"Midazolam"** → dose **"2 mg"** → route **IV** → click **"PUSH"**.
  2. Click **"Opioids"** tab → select **"Fentanyl"** → dose **"1.5 mcg/kg"** → click **"PUSH"**.
- **🎭 THE SIMULATOR REACTION**: Midazolam Ce builds over 90 seconds (ke0 = 0.8/min). BIS drops mildly: 96 → 82. HR slows mildly (78 → 72). Fentanyl Ce builds more slowly (ke0 = 0.147/min — its clinically slow effect-site equilibration); RR begins to fall subtly (14 → 11). Log: *"Midazolam 2 mg IV — anxiolysis. Fentanyl 105 mcg IV — opioid preloading."*
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: Fentanyl's slow ke0 (t½ to peak effect ≈ 5 min) is clinically important — administering it 3–5 minutes before propofol achieves true synergistic blunting of the hemodynamic intubation response. The simulator models this timing delay precisely; pushing fentanyl immediately before propofol produces less cardiovascular blunting.

---

### Milestone 3.2 — Propofol Induction

- **🕹️ PLAYER OBJECTIVE**: Induce general anesthesia with propofol and observe the dose-dependent hemodynamic and BIS response.
- **📍 WHERE TO LOOK**: Pharmacopoeia → **"Sedatives/Hypnotics"** tab; Primary Monitor for BIS and BP.
- **⚙️ WHAT TO CLICK / ENTER**: Select **"Propofol"** → dose **"2.0 mg/kg"** → click **"PUSH"**.
- **🎭 THE SIMULATOR REACTION**: Over 30–45 seconds:
  - BIS: 82 → 55 → 35 → 22 (deep hypnosis). EEG strip transitions through α spindles → δ waves → the state badge reads **"SURGICAL DEPTH — δ WAVES"**.
  - BP: 122/78 → 96/58 → 88/52 mmHg (vasodilation + inotropy suppression). The Primary Monitor BP box flashes amber.
  - RR → 0 (apnea). The SpO₂ waveform (PLETH strip) continues as long as O₂ reserves last.
  - HR holds or rises slightly (propofol's hrMax = -2/min, so minimal chronotropy change; compensation comes from vasodilation-triggered baroreceptor reflex).
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: The BP drop is not a simple "propofol causes hypotension" flag — it emerges from propofol's three simultaneous effects: (1) venodilation reducing preload (diaDelta), (2) mild arterial vasodilation reducing afterload, (3) slight negative inotropy. The magnitude scales with patient age, baseline BP, and hypovolemia. Try the Bariatric or Cardiac preset to observe blunted responses or exaggerated responses, respectively.

---

### Milestone 3.3 — Click the Pleth Waveform for the SpO₂ Guide

- **🕹️ PLAYER OBJECTIVE**: While the patient is apneic and you await SpO₂ stability, explore the pleth waveform teaching panel.
- **📍 WHERE TO LOOK**: Primary Monitor waveform column → **PLETH strip** (cyan colored, below CVP if present).
- **⚙️ WHAT TO CLICK / ENTER**: Click on the PLETH strip → the **Waveform Context Panel** opens, labeled *"Plethysmography (SpO₂ Waveform)"*.
- **🎭 THE SIMULATOR REACTION**: The panel opens on the **WAVEFORM GUIDE** tab showing 5 clickable pattern cards: Normal, Poor Perfusion, Hyperdynamic, PPV Variation, Irregular (AF). Click **"PPV Variation"** → the SVG expands showing alternating amplitude beats with respiratory cycling, and the clinical text explains fluid responsiveness, valid conditions (no spontaneous breathing, TV ≥ 8 mL/kg), and PPV threshold (>13%).
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: The CURRENT PATTERN tab in this panel interprets the live patient. After intubation and volume infusion, return here — if PPV exceeds 13%, the panel will flag it and recommend a fluid responsiveness assessment.

---

### Milestone 3.4 — Rocuronium for Intubation

- **🕹️ PLAYER OBJECTIVE**: Administer neuromuscular blockade to facilitate laryngoscopy.
- **📍 WHERE TO LOOK**: Pharmacopoeia → **"Paralytics / NDMR"** tab.
- **⚙️ WHAT TO CLICK / ENTER**: Select **"Rocuronium"** → dose **"0.6 mg/kg"** → click **"PUSH"**.
- **🎭 THE SIMULATOR REACTION**: Rocuronium Ce builds rapidly (ke0 = 0.18/min, onset 60–90 seconds). TOF ratio falls: 1.00 → 0.70 → 0.20 → 0.00. Log: *"TOF 0/4 — complete neuromuscular blockade. Intubating conditions present in 60–90 seconds."* The TOF box on the monitor flashes red and shows **"0/4"**.
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: AirwaySim's NMJ model computes blockade from Ce, c50 (1.2 mg/L), gamma (Hill coefficient = 4), and receptor occupancy. The steep Hill curve with gamma=4 produces the clinically familiar "all or nothing" transition from partial to complete blockade — a small dose increment crosses the threshold quickly.

---

## 🫁 PHASE 4 — AIRWAY MANAGEMENT

### Milestone 4.1 — Laryngoscopy and ETT Placement

- **🕹️ PLAYER OBJECTIVE**: Perform direct laryngoscopy and place an endotracheal tube.
- **📍 WHERE TO LOOK**: Left column → **Airway Panel** → *"Intubation"* section.
- **⚙️ WHAT TO CLICK / ENTER**:
  1. Click **"Prepare Intubation Equipment"** → select **Macintosh Blade 3** · **ETT 7.5 mm** · **Stylet ON** → click **"Proceed"**.
  2. In the laryngoscopy modal, select the Cormack-Lehane grade shown (Grade I for this patient) → click **"Advance ETT"** → click **"Confirm Placement"**.
- **🎭 THE SIMULATOR REACTION**: Airway Panel updates: *"ETT 7.5 mm secured — 22 cm at teeth. Airway secured."* The Vent Monitor panel (right column) activates. The Log Panel: *"Airway secured. Mechanical ventilation initiated."*
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: Grade I–IV is assigned based on patient anatomy (Mallampati, thyromental distance, neck mobility). Loading the ENT/Airway — Awake Tracheostomy preset creates a Grade IV view, forcing the learner to use alternative techniques (video laryngoscope, fiberoptic, surgical airway).

---

### Milestone 4.2 — Confirm Placement with Capnography

- **🕹️ PLAYER OBJECTIVE**: Verify tracheal intubation using the gold-standard confirmation — continuous capnography.
- **📍 WHERE TO LOOK**: **Vent Monitor** → bottom waveform strip labeled **"EtCO₂"** (yellow trace).
- **⚙️ WHAT TO CLICK / ENTER**: Watch the EtCO₂ waveform appear over 3–6 breaths. Click the **EtCO₂ strip** to open the Waveform Guide.
- **🎭 THE SIMULATOR REACTION**: A rectangular capnogram waveform appears: Phase I flat baseline at the BOTTOM of the strip → Phase II steep rise → Phase III flat plateau at the TOP (EtCO₂ ≈ 36 mmHg) → Phase 0 sharp fall. The Waveform Context Panel opens titled *"Capnography (EtCO₂)"* showing the anatomy of all 4 phases.

  Click **"Esophageal Intubation"** pattern card → the SVG shows 3–4 sinusoidal waveforms diminishing to flat zero — the classic esophageal confirmation failure. Compare to the normal rectangular shape.
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: This waveform is rendered from the corrected capnography model where CO₂=0 (inspiration) sits at the BOTTOM of the display and the EtCO₂ plateau sits at the TOP — matching every real capnograph in clinical practice. The "Shark Fin" bronchospasm pattern (steep Phase III slope, no flat plateau) and "Rebreathing" pattern (elevated baseline) are both accessible in the guide and will appear on the live strip during relevant crises.

---

### Milestone 4.3 — Configure Mechanical Ventilation

- **🕹️ PLAYER OBJECTIVE**: Set lung-protective ventilator parameters for the intubated patient.
- **📍 WHERE TO LOOK**: Bottom bar → **Vent Settings** section (right of gas dials).
- **⚙️ WHAT TO CLICK / ENTER**:
  1. Mode: **Volume Control (VCV)**.
  2. Tidal Volume: **420 mL** (6 mL/kg IBW for a 70 kg patient).
  3. Rate: **12 bpm**.
  4. PEEP: **5 cmH₂O**.
  5. FiO₂: **0.50**.
  6. Click **"Apply"**.
- **🎭 THE SIMULATOR REACTION**: Vent Monitor activates fully. Paw waveform shows a linear ramp up to PIP ≈ 18 cmH₂O then a flat plateau at Pplat ≈ 15 cmH₂O, then rapid fall to PEEP = 5. Flow waveform shows a flat rectangular inspiratory flow (constant flow in VCV) above the zero line, and decelerating expiratory flow below. EtCO₂ stabilizes at 36–38 mmHg. Cdyn ≈ 55–65 mL/cmH₂O.
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: The PIP-Pplat gap (≈3 cmH₂O) reflects normal airway resistance. During bronchospasm (later), this gap widens to 15–25 cmH₂O as resistance rises, PIP spikes, but Pplat remains normal. The distinction tells you: *high PIP + normal Pplat = resistance problem; high Pplat = compliance problem.*

---

### Milestone 4.4 — Explore the Pressure-Time and Flow-Time Waveform Guides

- **🕹️ PLAYER OBJECTIVE**: Use the waveform context panels to understand what the vent waveform patterns mean clinically.
- **📍 WHERE TO LOOK**: Vent Monitor → waveform area → click the **Paw cmH₂O** strip (yellow-amber trace at top of waveform column).
- **⚙️ WHAT TO CLICK / ENTER**: Click the **Paw strip** → Waveform Guide opens. Explore:
  - **VCV Normal**: linear ramp + plateau (what you see now).
  - **High Resistance**: the PIP bar shoots high with normal plateau — wide PIP-Pplat gap.
  - **ARDS / Low Compliance**: both PIP and Pplat elevated, narrow gap.
  - **Auto-PEEP**: baseline never returns to set PEEP — truncated expiratory limb.

  Then click the **Flow L/min** strip → explore VCV Square Wave vs PCV Decelerating vs Auto-PEEP patterns.
- **🎭 THE SIMULATOR REACTION**: Each pattern card shows a pre-computed SVG waveform and opens to show mechanism, clinical significance, and key pearls. The **CURRENT PATTERN** tab reads the live ventilator parameters and interprets the patient's waveform: *"Normal pressures: PIP 18, Pplat 15, Driving pressure 10 cmH₂O — well within lung-protective thresholds."*
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: Driving pressure (Pplat − PEEP) is the strongest independent predictor of ARDS mortality. The guide reminds learners of the ≤15 cmH₂O target at every waveform review.

---

### Milestone 4.5 — Explore the Flow-Volume Loop

- **🕹️ PLAYER OBJECTIVE**: Switch to Loops View on the Vent Monitor and examine the Flow-Volume loop.
- **📍 WHERE TO LOOK**: Vent Monitor → top-left corner → **"Loops View"** button → **"F-V Loop"** toggle.
- **⚙️ WHAT TO CLICK / ENTER**: Click **"Loops View"** → ensure **"F-V Loop"** is selected → click on the loop canvas.
- **🎭 THE SIMULATOR REACTION**: The loop panel opens the **Flow-Volume Loop Waveform Guide**. The guide shows:
  - **Normal**: teardrop shape — expiratory limb starts at TLC (right, zero flow), rises quickly to peak expiratory flow, then descends nearly linearly to RV (left, zero flow). Inspiratory limb is a rounded bowl.
  - **COPD/Obstructive**: expiratory limb "scooped out" (concave) with RV shifted right from air trapping.
  - **Restrictive**: normal shape, smaller overall loop.
  - **Fixed Upper Airway Obstruction**: plateaued (flattened) on BOTH inspiratory AND expiratory limbs — the "box" pattern.
  - **Variable Extrathoracic**: only inspiratory limb flattened (vocal cord collapse on inspiration).
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: The FV loop's expiratory limb correctness matters here — a prior model bug placed maximum flow AT TLC instead of zero, inverting the shape. It now correctly shows flow rising from zero at TLC to peak expiratory flow, then descending linearly — matching every pulmonary function lab's standard.

---

## 🔷 PHASE 5 — INTRAOPERATIVE MAINTENANCE

### Milestone 5.1 — Advance to Incision Phase

- **🕹️ PLAYER OBJECTIVE**: Formally advance the case to the incision phase.
- **📍 WHERE TO LOOK**: Bottom bar → phase buttons (Pre-Op | Induction | Incision | Maintenance | Emergence | PACU).
- **⚙️ WHAT TO CLICK / ENTER**: Click **"Incision"** → confirm in the dialog → click **"Advance Phase"**.
- **🎭 THE SIMULATOR REACTION**: Phase button highlights. Log: *"Phase: Incision. Surgical stimulus now active — monitor for hemodynamic response."* HR rises mildly (70 → 82 bpm) and BP ticks up (88/52 → 96/60 mmHg) as the surgical stimulus model engages.
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: AirwaySim models nociceptive surgical stimulus as a real synaptic input driving catecholamine release proportional to pain score and anesthetic depth. If MAC < 0.7 at incision, the response is exaggerated — HR may spike to 110+, BP to 160/95. This is the "light anesthesia at incision" scenario that produces awareness risk.

---

### Milestone 5.2 — Start Sevoflurane Maintenance

- **🕹️ PLAYER OBJECTIVE**: Establish volatile anesthetic maintenance to maintain surgical depth.
- **📍 WHERE TO LOOK**: Bottom bar → **gas dials** section → Sevoflurane vaporizer dial.
- **⚙️ WHAT TO CLICK / ENTER**:
  1. Select **"Sevoflurane"** from the volatile dropdown.
  2. Turn the dial to **"2.0%"** (approximately 1.0 MAC for a 34-year-old at this altitude).
  3. Set FGF to **"2 L/min"** (carrier gas).
- **🎭 THE SIMULATOR REACTION**: End-tidal sevoflurane climbs over 3–5 minutes (wash-in follows blood:gas partition = 0.65 — relatively fast). BIS drops from 35 toward 40–50 (surgical depth). MAC display in the vent panel shows **0.85 → 1.0**. Log: *"Sevoflurane 2.0% — approaching 1 MAC. Targeting BIS 40–55."*
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: MAC is age-adjusted in AirwaySim. The same 2.0% sevoflurane produces 1.0 MAC in a 34-year-old but only 0.75 MAC in an 80-year-old (whose MAC is 1.5%). Overdosing elderly patients with volatile causes hemodynamic collapse the simulator faithfully reproduces.

---

### Milestone 5.3 — Click the A-Line Waveform for the Arterial Pressure Guide

*(For this milestone, first add an arterial line via the Lines & Resus panel if not already present.)*

- **🕹️ PLAYER OBJECTIVE**: Open the arterial line waveform teaching panel to understand what the pressure wave's morphology reveals.
- **📍 WHERE TO LOOK**: Primary Monitor waveform column → **ART strip** (red trace, visible after A-line insertion).
- **⚙️ WHAT TO CLICK / ENTER**: Click on the **ART strip** → Waveform Context Panel opens for *"Arterial Line Waveform"*.
- **🎭 THE SIMULATOR REACTION**: The guide shows 6 pattern cards:
  - **Normal**: steep anacrotic limb, systolic peak, clear V-shaped dicrotic notch, smooth exponential diastolic runoff.
  - **Hyperdynamic (Sepsis)**: very wide pulse pressure (high SBP, very low DBP), early shallow dicrotic notch.
  - **Hypovolemic**: narrow pulse pressure, low absolute pressures, HR-compensated tachycardia.
  - **High SVR**: elevated diastolic, late dicrotic notch, slow runoff.
  - **Aortic Regurgitation**: waterhammer pulse — wide PP, absent dicrotic notch (aortic valve never fully closes).
  - **Pulsus Paradoxus**: respiratory variation > 10 mmHg on amplitude.
  
  The CURRENT PATTERN tab reads the live SBP/DBP and flags the current interpretation.
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: The dicrotic notch position tells you SVR non-invasively: a notch that sits high and late (close to systolic peak) = high SVR. A notch that is absent or very early = low SVR (vasodilatory state — early sepsis, vasodilators). This is NOT reflected on the numeric BP display — only visible on the waveform.

---

### Milestone 5.4 — Treat Propofol-Induced Hypotension with Ephedrine

*(If using volatile-only technique, induce mild hypotension first by increasing sevo to 2.5%.)*

- **🕹️ PLAYER OBJECTIVE**: Restore MAP > 65 mmHg using ephedrine — and observe the corrected dose-response now that the PK/PD is calibrated.
- **📍 WHERE TO LOOK**: Primary Monitor → **MAP** box flashing (MAP < 65) → Pharmacopoeia → Vasopressors tab.
- **⚙️ WHAT TO CLICK / ENTER**: Select **"Ephedrine"** → dose **"10 mg"** → click **"PUSH"**.
- **🎭 THE SIMULATOR REACTION**: Within 90–120 seconds (ke0 = 2.0/min, onset 1–2 min):
  - HR rises: 72 → 88 bpm (Beta1 chronotropy).
  - BP rises: MAP 58 → 76 mmHg (Alpha1 SVR increase ~36% + Beta1 inotropy ~30%).
  - BIS unchanged (ephedrine does not affect consciousness).
  - A-line waveform shows increased amplitude and slightly earlier dicrotic notch.
  - Log: *"Ephedrine 10 mg IV — mixed agonist. SVR and CO both supported. MAP restored."*
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: Prior to calibration, ephedrine 10 mg raised SVR by only 8% (because Beta2=2 cancelled most of Alpha1=2's effect) and the c50 was above achievable plasma concentrations — so BP literally didn't move. The fix (Alpha1: 2→3, Beta2: 2→1, c50: 0.5→0.30) produces the correct clinical result: 36% SVR increase + 30% inotropy, together raising MAP 15–20 mmHg. That is now what you see here.

---

### Milestone 5.5 — Activate Pneumoperitoneum (Laparoscopic Phase)

- **🕹️ PLAYER OBJECTIVE**: Simulate laparoscopic CO₂ insufflation and observe its multisystem effects.
- **📍 WHERE TO LOOK**: Airway Panel or Attending Chat → find the **"Activate Pneumoperitoneum"** action or type *"activate pneumoperitoneum"* in Attending.
- **⚙️ WHAT TO CLICK / ENTER**: In the Attending action panel, click **"activate pneumoperitoneum"** or navigate to Surgical Actions → **"CO₂ Insufflation 15 mmHg"** → click **"Activate"**.
- **🎭 THE SIMULATOR REACTION**: Over 60–90 seconds:
  - EtCO₂ rises: 37 → 45 mmHg (CO₂ absorption from peritoneum).
  - Paw (PIP) rises: 18 → 26 cmH₂O (diaphragmatic compression by CO₂).
  - Cdyn falls: 60 → 38 mL/cmH₂O (reduced respiratory system compliance).
  - BP rises mildly (venous return briefly increased, then SVR rises from catecholamine release).
  - The Vent Pressure waveform pattern shifts — the plateau pressure rises visibly.
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: CO₂ pneumoperitoneum has a tripartite effect: (1) mechanical diaphragm compression reduces FRC and compliance, (2) CO₂ absorbs into blood raising EtCO₂, requiring RR increase to maintain normocapnia, (3) vagal stimulation from peritoneal stretch can cause bradycardia. The simulator models all three through independent pathways (PneumoperitoneumModel, CapnographyModel, and the autonomic vagal engine).

---

## 🚨 PHASE 6 — CRISIS: BRONCHOSPASM

### Milestone 6.1 — Trigger Bronchospasm

- **🕹️ PLAYER OBJECTIVE**: Simulate intraoperative bronchospasm and recognize it from the monitoring pattern before treating.
- **📍 WHERE TO LOOK**: Pharmacopoeia → or Attending panel → or observe if it occurs spontaneously at light depth.
- **⚙️ WHAT TO CLICK / ENTER**: In the Attending chat, type *"trigger bronchospasm"*, or reduce sevoflurane to 0.8% to simulate light plane response → observe.
- **🎭 THE SIMULATOR REACTION**: Over 30–60 seconds:
  - Airway resistance (Raw) climbs: 5 → 22 cmH₂O/L/s (Vent Monitor, right panel).
  - PIP spikes: 26 → 42 cmH₂O (Paw waveform rises steeply). Pplat unchanged at 18 — **large PIP-Pplat gap**.
  - EtCO₂ waveform **changes shape**: Phase III slope becomes steep (shark fin). The waveform no longer has a flat plateau — it is an ascending ramp all the way to Phase 0.
  - SpO₂ begins to fall if ventilation is impaired.
  - Log: *"🚨 BRONCHOSPASM: Airway resistance critically elevated. SpO₂ falling."*
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: The PIP-Pplat gap (now 24 cmH₂O, well above the 10 cmH₂O threshold) immediately tells you this is a resistance problem, not a compliance problem. The capnography "shark fin" is caused by heterogeneous alveolar emptying — airways with higher resistance empty last, with higher CO₂, producing the continuously rising Phase III.

---

### Milestone 6.2 — Identify the Shark Fin on the Waveform Guide

- **🕹️ PLAYER OBJECTIVE**: Use the waveform guide to confirm the bronchospasm pattern.
- **📍 WHERE TO LOOK**: Vent Monitor → EtCO₂ strip (yellow).
- **⚙️ WHAT TO CLICK / ENTER**: Click the **EtCO₂ strip** → Waveform Guide → click **"Bronchospasm / COPD"** card.
- **🎭 THE SIMULATOR REACTION**: The SVG example shows the shark fin: no flat Phase III plateau, continuous upward slope, no sharp transition. The CURRENT PATTERN tab now shows: *"Bronchospasm suspected — shark fin morphology. Airway resistance 22 cmH₂O/L/s. Treat immediately."*
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: This is the educational moment — the learner sees the pathological pattern on the live monitor AND the teaching panel simultaneously, connecting waveform morphology to mechanism in real time.

---

### Milestone 6.3 — Treat Bronchospasm

- **🕹️ PLAYER OBJECTIVE**: Resolve bronchospasm through a stepwise treatment protocol.
- **📍 WHERE TO LOOK**: Bottom bar → Sevoflurane dial; Pharmacopoeia → Bronchodilators tab.
- **⚙️ WHAT TO CLICK / ENTER**:
  1. Increase Sevoflurane to **"3.0%"** (deepen — volatiles are bronchodilators).
  2. Pharmacopoeia → **"Bronchodilators"** → **"Albuterol"** → **"4 puffs MDI"** → click **"Administer"**.
  3. If refractory: **"IV Ketamine"** → **"0.5 mg/kg"** → click **"PUSH"** (bronchodilatory dissociative).
- **🎭 THE SIMULATOR REACTION**: Over 2–4 minutes:
  - Raw falls: 22 → 12 → 7 cmH₂O/L/s.
  - PIP falls: 42 → 28 → 20 cmH₂O. PIP-Pplat gap narrows back toward normal.
  - EtCO₂ waveform returns to rectangular shape — Phase III plateau re-establishes.
  - SpO₂ recovers.
  - Log: *"Bronchospasm resolving. Albuterol + deepened anesthesia effective."*
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: Albuterol, ketamine, and volatile anesthetics are all independently bronchodilatory through different mechanisms (β₂-agonism, NMDA antagonism, and direct smooth muscle relaxation respectively). AirwaySim models each mechanism separately — and they are additive, so all three together produce faster resolution than any single agent.

---

## 🟢 PHASE 7 — EMERGENCE & REVERSAL

### Milestone 7.1 — Turn Off Volatile, Begin Emergence

- **🕹️ PLAYER OBJECTIVE**: Initiate controlled emergence from anesthesia.
- **📍 WHERE TO LOOK**: Bottom bar → Sevoflurane dial; Phase buttons.
- **⚙️ WHAT TO CLICK / ENTER**:
  1. Set Sevoflurane dial to **"0.0%"** (OFF).
  2. Increase FGF to **"6 L/min"** to accelerate washout.
  3. Click phase button → **"Emergence"**.
- **🎭 THE SIMULATOR REACTION**: End-tidal sevoflurane starts falling (blood:gas partition = 0.65 → relatively fast washout). BIS climbs: 42 → 55 → 70 → 85. EEG state badge changes: δ waves → α spindles → AWAKE. Log: *"Sevoflurane washout begun. EtSevo falling. Emergence phase active."*
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: Xenon (blood:gas = 0.115) would washout ~5× faster. Isoflurane (blood:gas = 1.4) washes out ~2× slower. These kinetics are modeled through the gas kinetics engine and appear directly as the slope of the BIS recovery curve — load each volatile agent to demonstrate this teaching point.

---

### Milestone 7.2 — Assess Residual Neuromuscular Blockade

- **🕹️ PLAYER OBJECTIVE**: Perform quantitative TOF assessment before attempting reversal.
- **📍 WHERE TO LOOK**: Primary Monitor → **TOF** box.
- **⚙️ WHAT TO CLICK / ENTER**: Click the **TOF** box → observe the current ratio → if TOF < 4/4 or ratio < 0.9, proceed to reversal.
- **🎭 THE SIMULATOR REACTION**: The TOF box shows (depending on time elapsed and rocuronium dose): **"2/4"** or **"4/4 · Ratio 0.62"**. Note that *4/4 twitches does not mean safe extubation* — ratio must be ≥ 0.9. Log: *"TOF 4/4 ratio 0.62 — significant residual paralysis. Sugammadex indicated."*
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: This is the most important neuromuscular teaching point: a TOF ratio of 0.62 produces no fade visible to the eye or felt by the finger — but the patient has 38% of NMJ receptors blocked, insufficient to lift their head for > 5 seconds, sustain a bite block, or maintain airway protection. Extubating at this TOF ratio causes silent aspiration and postoperative respiratory complications.

---

### Milestone 7.3 — Reverse with Sugammadex

- **🕹️ PLAYER OBJECTIVE**: Administer weight-based Sugammadex for complete reversal of rocuronium blockade.
- **📍 WHERE TO LOOK**: Pharmacopoeia → **"NMJ Reversal"** tab.
- **⚙️ WHAT TO CLICK / ENTER**: Select **"Sugammadex"** → dose **"2 mg/kg"** (for TOF count 4 with fade) → click **"PUSH"**.
- **🎭 THE SIMULATOR REACTION**: Within 60–90 seconds:
  - TOF ratio rises: 0.62 → 0.80 → 0.95 → 1.00.
  - TOF box updates: *"4/4 · Ratio 0.99 — FULLY REVERSED"*.
  - Log: *"Sugammadex 140 mg IV — rocuronium chelation complete. Full reversal confirmed quantitatively."*
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: Sugammadex is a selective relaxant binding agent that encapsulates rocuronium/vecuronium molecules directly, removing them from the NMJ. Unlike neostigmine (AChE inhibitor), it does not produce muscarinic side effects, does not require glycopyrrolate co-administration, and reverses even profound blockade (TOF 0/4) reliably. Demonstrate the contrast: load neostigmine at TOF 0/4 — Log will flag: *"QualityEvent: Neostigmine at TOF 0 — high residual paralysis risk."*

---

### Milestone 7.4 — Extubation Criteria Check

- **🕹️ PLAYER OBJECTIVE**: Confirm all extubation criteria before removing the tube.
- **📍 WHERE TO LOOK**: Attend chat or the Pre-Extubation checklist in the Airway Panel.
- **⚙️ WHAT TO CLICK / ENTER**: In Attending chat, type *"extubation criteria"*.
- **🎭 THE SIMULATOR REACTION**: The attending lists the current patient status against each criterion:
  - ✅ Awake and following commands (BIS 88).
  - ✅ TOF ≥ 0.9 (0.99).
  - ✅ SpO₂ ≥ 96% on FiO₂ ≤ 0.4.
  - ✅ RR 12–20 and adequate minute ventilation.
  - ✅ Temperature ≥ 36°C.
  - ✅ No active bronchospasm.
  - ✅ Hemostasis achieved.
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: Extubation is as consequential as intubation. The simulator will log a QualityEvent if you extubate without meeting all criteria — and the patient may develop laryngospasm, re-intubation requirements, or aspiration in the PACU depending on which criterion was missed.

---

### Milestone 7.5 — Extubate and Transition to PACU

- **🕹️ PLAYER OBJECTIVE**: Extubate and transfer to PACU for monitored recovery.
- **📍 WHERE TO LOOK**: Airway Panel → **"EXTUBATE"** button; Phase buttons.
- **⚙️ WHAT TO CLICK / ENTER**:
  1. Click **"EXTUBATE PATIENT"** in Airway Panel → confirm.
  2. Click phase button → **"PACU"**.
- **🎭 THE SIMULATOR REACTION**: ETT is removed. The Vent Monitor closes (no longer intubated). Primary Monitor shows spontaneous breathing: RR 14 · SpO₂ 99% on supplemental O₂ · BP recovering toward normal. The PACU readiness score appears. Log: *"Extubation successful. PACU phase active. Modified Aldrete Score: 9/10."*
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: PACU is a real sixth phase in AirwaySim — it is not a "win screen." PONV risk is calculated (Apfel score from patient state), pain assessment updates, and the patient can deteriorate with delayed opioid respiratory depression, shivering driving temperature back down, or emergence agitation if ketamine was used. Monitor for 30 minutes of simulated time before declaring discharge-ready.

---

## 🏥 PHASE 8 — PACU MANAGEMENT

### Milestone 8.1 — Manage PONV Risk

- **🕹️ PLAYER OBJECTIVE**: Assess PONV risk and treat proactively.
- **📍 WHERE TO LOOK**: Memory Panel (right column) → PONV section; or Attending chat.
- **⚙️ WHAT TO CLICK / ENTER**: In Attending chat, type *"PONV risk"*.
- **🎭 THE SIMULATOR REACTION**: The attending computes the Apfel score: Female sex (if applicable) · Non-smoker · History of PONV/motion sickness · Postoperative opioids. For this patient: 2–3 risk factors → 39–61% PONV risk. Recommends: Ondansetron 4 mg IV + Dexamethasone 4–8 mg IV if not already given at induction.
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: Dexamethasone is most effective when given at INDUCTION — not emergence. AirwaySim logs a QualityEvent (Moderate, -5 points) if dexamethasone is given late. This teaches the timing principle that is commonly missed in trainees.

---

### Milestone 8.2 — Review the Renal Panel

- **🕹️ PLAYER OBJECTIVE**: Assess fluid balance and renal status at the end of the case.
- **📍 WHERE TO LOOK**: Right column → **Renal Panel** (above Lines & Resus panel).
- **⚙️ WHAT TO CLICK / ENTER**: Click the **Urine Output (UOP)** box in the Renal Panel to open the context panel.
- **🎭 THE SIMULATOR REACTION**: The Renal Panel shows:
  - UOP: 0.7 mL/kg/hr (adequate).
  - eGFR: 95 mL/min/1.73 m² (normal).
  - FEₙₐ: 0.4% (pre-renal pattern — appropriate perioperative response).
  - Net fluid balance: +850 mL (crystalloid minus blood loss).
  - No AKI banner (creatinine unchanged from baseline).
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: FEₙₐ < 1% in the perioperative period reflects appropriate ADH-mediated water retention — not true hypovolemia. AirwaySim distinguishes these through the RenalEngine's tubular reabsorption mechanics, modeled with true glomerular filtration physics rather than a simple formula.

---

### Milestone 8.3 — Review Quality Events Scoring

- **🕹️ PLAYER OBJECTIVE**: Review the case's quality event log to see what the simulator tracked and scored.
- **📍 WHERE TO LOOK**: Log Panel → **"Quality Events"** tab (or in Attending chat type *"score my case"*).
- **⚙️ WHAT TO CLICK / ENTER**: Click the **Log Panel** → switch to **Quality Events** view (if available) or scroll the log for colored quality event entries.
- **🎭 THE SIMULATOR REACTION**: The log shows scored events such as:
  - ✅ *+0 pts — Quantitative TOF added before paralytic: VIGILANCE (excellent practice).*
  - ✅ *+0 pts — Confirmed tracheal placement with capnography.*
  - ⚠️ *−5 pts — MAP < 65 mmHg for > 90 seconds before treatment: MONITORING (moderate concern).*
  - ⚠️ *−2 pts — Dexamethasone given at emergence rather than induction: PHARMACOLOGIC_CHOICE (minor).*
- **💡 CLINICAL INSIGHT FOR DIRECTORS**: The outcome scoring system is not punitive — it is a teaching tool. Every deduction is documented with category (Vigilance / PharmacologicChoice / CrisisManagement / Monitoring / ChecklistAdherence / PostopReadiness) and a clinical rationale, so the learner sees exactly what they would improve next time.

---

## 🎓 APPENDIX: QUICK TEACHING SCENARIOS (5-MINUTE DRILLS)

### Drill A — Malignant Hyperthermia Recognition

- **Load case**: *"Neuromuscular — MH Susceptible"* preset.
- **Trigger**: Give Succinylcholine (or Sevoflurane).
- **Watch for**: EtCO₂ rising rapidly despite normal/increased MV → Temp rising → HR tachycardia → masseter rigidity log event → metabolic acidosis (pH falling).
- **Treat**: Dantrolene 2.5 mg/kg → repeat q5 min → cool patient → switch to TIVA → avoid volatiles.
- **Key Waveform**: EtCO₂ trace → click the EtCO₂ strip → WAVEFORM GUIDE → *"MH Rising"* pattern shows EtCO₂ accelerating upward across the display in real time.

---

### Drill B — CVP Waveform Pathology Recognition

- **Load case**: Any case → add CVC (Lines & Resus panel → Central Lines → *"Right IJ Triple Lumen"*).
- **Click the CVP strip** on the Primary Monitor → Waveform Guide opens.
- **Walk through**:
  - **Normal**: identify a, c, x, v, y components on the labeled SVG.
  - **AF**: absent a wave — click to see the flat-lined a component.
  - **Tamponade**: prominent x, absent y — teach the "x but no y = tamponade" mnemonic.
  - **TR**: giant cv fusion waves dominating the trace.
  - **Constrictive Pericarditis**: steep x AND steep y (M/W pattern on the trace).
- **💡 Teaching Pearl**: Normal CVP range (2–8 mmHg) tells you filling pressure but NOT volume responsiveness. A CVP of 14 in sepsis may still be fluid-responsive; a CVP of 4 in cardiac tamponade is life-threatening despite the low number.

---

### Drill C — Dexmedetomidine Sedation (Corrected Pharmacology)

- **Load case**: Any case.
- **Administer**: Dexmedetomidine 1 mcg/kg loading bolus → observe BIS fall → then start 0.7 mcg/kg/hr infusion.
- **Old behavior**: Zero hemodynamic or sedative effect at any dose (c50 = 1.2, 1200× too high).
- **New behavior**: Loading dose → 96% effect → BIS 96 → 72; infusion → 69% steady-state → sustained sedation, HR −15 bpm, MAP −12 mmHg (target-organ effects appropriate for alpha-2 agonism at locus coeruleus and vasculature).
- **Click the HR box** → DRIVERS tab → observe alpha-2 central sympatholysis now listed as an active driver.

---

### Drill D — Dobutamine Dose-Response (Corrected Pharmacology)

- **Load case**: *"Cardiac — CABG"* preset (post-bypass low-output state).
- **Administer**: Dobutamine 5 mcg/kg/min → observe response → increase to 10 → then 15.
- **Old behavior**: Maximal effect (98%) at 5 mcg/kg/min — increasing the dose did nothing.
- **New behavior**: 5 mcg/kg/min → 31% effect; 10 → 56%; 15 → 70%. Each dose increment produces a visible, proportional increase in CO and BP — the clinical dose-response curve now spans the entire therapeutic range.
- **Click the MAP box** → ACTIONS tab → Dobutamine dose selector is pre-populated and adjustable in real time.

---

### Drill E — The Two-Drug Anaphylaxis Cascade

- **Load case**: Any case with penicillin allergy.
- **Administer**: Ampicillin/Sulbactam IV → watch for allergic cascade over 45–60 seconds.
- **Sequence**: Urticaria → tachycardia (HR 125) → hypotension (MAP < 50) → bronchospasm (PIP spike, shark fin EtCO₂).
- **Treat**: Epinephrine 0.3 mg IM (or 10–20 mcg IV push-dose) → then epinephrine infusion → diphenhydramine → hydrocortisone.
- **Observe**: Receptor Body Panel → show progressive multi-receptor antagonist response (histamine H₁/H₂ + β₂ + α₁ simultaneously active).
- **💡 Teaching Pearl**: The first dose of epinephrine in anaphylaxis must address all three pathways simultaneously: α₁ (BP/SVR), β₁ (inotropy/chronotropy), β₂ (bronchospasm). No other single drug achieves this.

---

*End of Tutorial Script — v2.0 | Based on AirwaySim engine stack as of July 2026 | Miller's Anesthesia 9th Ed as clinical ground truth*
