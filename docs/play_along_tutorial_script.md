# Aetheris: The Compounding Perioperative Storm
## Play-Along Interactive Tutorial Script

Welcome to the Aetheris Play-Along Interactive Tutorial. This script is designed as a direct, sequential, screen-by-screen walk-through to showcase the platform's multi-system modeling capabilities, high-fidelity clinical scenarios, and intuitive UI controls to investors and residency program directors.

---

## 📋 PHASE 1: PRE-OP SETUP & RISK STRATIFICATION

### Milestone 1.1: Accessing the High-Fidelity Customizer
*   **🕹️ PLAYER OBJECTIVE**: Enter the custom clinical case creation suite to build a patient with complex physiology.
*   **📍 WHERE TO LOOK**: The main **Aetheris Boot Splash Screen** landing page. Look at the lower half of the center console.
*   **⚙️ WHAT TO CLICK / ENTER**: Click the blue **"Create Custom Scenario"** button in the dashboard selection matrix.
*   **🎭 THE SIMULATOR REACTION**: The boot panel slides upward with a smooth CSS spring animation, revealing the multi-tabbed **High-Fidelity Customizer** dashboard filled with adjustable physiological slider dials, patient profiles, and medical history toggles.
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Demonstrates Aetheris's ability to initialize a case from scratch rather than relying on static pre-programmed scripts, giving educators infinite customization options.

---

### Milestone 1.2: Configuring Patient Comorbidities & Risks
*   **🕹️ PLAYER OBJECTIVE**: Set up the patient parameters: severe obesity, penicillin allergy, and chronic steroid use.
*   **📍 WHERE TO LOOK**: The **High-Fidelity Customizer** panel. Focus on the Patient Profile section (left) and the Comorbidities tab (right).
*   **⚙️ WHAT TO CLICK / ENTER**:
    1. Drag the **BMI Slider** to the right until it reads **"35 kg/m²"** (Class II Obesity).
    2. Click the **"Allergies"** dropdown ➔ Select **"Penicillin / Beta-lactams"** ➔ Set severity to **"Anaphylaxis"**.
    3. Click the **"Endocrine Comorbidities"** sub-tab ➔ Toggle **"Chronic Corticosteroid Use"** to **"ON"** ➔ Set equivalent daily prednisone dose to **"10 mg/day"**.
    4. Click the cyan **"Compile Case & Initialize"** button in the bottom right corner.
*   **🎭 THE SIMULATOR REACTION**: The simulator compiles the parameters, generates a virtual patient profile named *Case 802: Complex Airway/Vasoplegic Risk*, and boots the operating room dashboard. The vital signs monitor displays an awake, slightly tachycardic patient: HR 88 bpm (sinus rhythm), BP 138/85 mmHg, SpO2 96% on room air, and RR 16 bpm.
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Showcases the platform's capability to cross-reference unrelated chronic patient states (obesity, allergy, adrenal suppression) to drive a complex clinical narrative.

---

### Milestone 1.3: Reviewing the Pre-Op EMR
*   **🕹️ PLAYER OBJECTIVE**: Review the patient's charts and airway classification before commencing.
*   **📍 WHERE TO LOOK**: The top-right corner of the primary header bar.
*   **⚙️ WHAT TO CLICK / ENTER**: Click the green **"Pre-Op EMR"** button ➔ Read the summarized chart ➔ Observe the Mallampati score.
*   **🎭 THE SIMULATOR REACTION**: A glassmorphic EMR chart slides in from the right side of the screen. It highlights an airways assessment showing: **"Mallampati Class IV, neck circumference 45 cm, short thyromental distance"** alongside a warnings flag highlighting **"Adrenal Insufficiency Risk"**.
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Emphasizes the importance of preoperative airway evaluation and teaches trainees to spot structural indicators of a difficult airway.

---

### Milestone 1.4: Completing the MSMAIDS Safety Checklist
*   **🕹️ PLAYER OBJECTIVE**: Complete the standard pre-induction equipment safety check to unlock the timeline.
*   **📍 WHERE TO LOOK**: The left-hand **Airway Panel**. Look for the **"Checklists & Maneuvers"** accordion fold.
*   **⚙️ WHAT TO CLICK / ENTER**:
    1. Click **"Checklists & Maneuvers"** to expand the list.
    2. Click the **"🛠️ MSMAIDS CHECK"** button.
    3. Within the pop-up modal, click **"Select All"** (verifying Machine, Suction, Monitor, Airway equipment, IV access, Drugs, and Special equipment).
    4. Click the **"X"** close button in the top corner.
*   **🎭 THE SIMULATOR REACTION**: The checklist items light up green, and a status message logs in the event timeline: *"✅ MSMAIDS machine and drug checkout completed. Equipment verified."* The flashing orange warning indicator on the timeline disappears, unlocking subsequent phases.
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Promotes patient safety culture by gating phase transitions until critical equipment checks are physically verified.

---

## 💨 PHASE 2: ANESTHETIC INDUCTION & THE AIRWAY EMERGENCY

### Milestone 2.1: Shifting the Timeline Phase
*   **🕹️ PLAYER OBJECTIVE**: Formally transition the case state from Pre-Op to the Induction phase.
*   **📍 WHERE TO LOOK**: The top surgical phase timeline tracker.
*   **⚙️ WHAT TO CLICK / ENTER**: Click the **"Time-Out"** phase node in the timeline ➔ In the WHO Safety Checklist modal, click **"Select All"** ➔ Click **"Authorize Induction"**.
*   **🎭 THE SIMULATOR REACTION**: The timeline node transitions to blue, and the simulator updates its ruleset to **Induction**. Ambient operating room background noises commence, and the patient's breathing sound effect updates.
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Simulates the structural workflow of the operating room where phase transitions dictate active clinical protocols.

---

### Milestone 2.2: Administering Opioid & Induction Boluses
*   **🕹️ PLAYER OBJECTIVE**: Administer weight-based doses of Fentanyl and Propofol to induce general anesthesia.
*   **📍 WHERE TO LOOK**: The right-side **Pharmacopoeia Panel**.
*   **⚙️ WHAT TO CLICK / ENTER**:
    1. Click the **"Analgesics"** tab ➔ Select **"Fentanyl"** ➔ Type **"1.5"** in the dose field (mcg/kg) ➔ Click **"PUSH"**.
    2. Click the **"Sedatives"** tab ➔ Select **"Propofol"** ➔ Type **"2.0"** in the dose field (mg/kg) ➔ Click **"PUSH"**.
*   **🎭 THE SIMULATOR REACTION**: The infusion lines glow blue, indicating drug delivery. Within 15 seconds:
    *   The patient's Respiratory Rate (RR) begins to fall (16 ➔ 8 ➔ 0 bpm) as apnea sets in.
    *   The subcortical consciousness tracking shows a drop in the BIS monitor (98 ➔ 45 ➔ 20), indicating deep sedation.
    *   The EKG displays mild vasodilation-induced hypotension: BP drops to 98/60 mmHg.
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Models dynamic drug pharmacokinetics (compartmental distribution and effect-site delay) and pharmacodynamics (apnea and vasodilation).

---

### Milestone 2.3: Identifying Obstructive Sleep Apnea (OSA) Airway Collapse
*   **🕹️ PLAYER OBJECTIVE**: Recognize and address acute upper airway collapse caused by induction of a patient with severe obesity and OSA.
*   **📍 WHERE TO LOOK**: The primary monitor vitals strip (upper left) and the **Airway Patency Status** display on the left.
*   **⚙️ WHAT TO CLICK / ENTER**: Observe the falling oxygen saturation: SpO2 drops from 99% to 92% and continues to fall rapidly. The airway patency status displays: **"🚨 OBSTRUCTED (Genioglossus Tone: 0.12)"**.
*   **🎭 THE SIMULATOR REACTION**: The pulse oximeter pitch lowers systematically as SpO2 falls (92% ➔ 85% ➔ 78%). The waveform display shows flat lines on the capnograph (no EtCO2 returning).
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Highlights the platform's ability to model soft-tissue pharyngeal collapse as a direct consequence of muscle tone loss under anesthesia in high-risk patients.

---

### Milestone 2.4: Executing the Larson Jaw-Thrust Maneuver
*   **🕹️ PLAYER OBJECTIVE**: Relieve the soft-tissue obstruction to allow mask ventilation.
*   **📍 WHERE TO LOOK**: The bottom-left **Airway Panel**.
*   **⚙️ WHAT TO CLICK / ENTER**: Click the **"💨 O2 Support"** dropdown ➔ Select **"Bag-Mask Valve (BMV)"** ➔ Click **"APPLY 100% BMV"** ➔ Click the **"✊ Perform Larson's Maneuver"** button.
*   **🎭 THE SIMULATOR REACTION**: The patency status changes to: **"PATENT (Jaw Thrust Active)"**. Capnography waveforms resume, returning a flat-top EtCO2 of 48 mmHg. The SpO2 curve stabilizes at 88% and climbs back up to 99%.
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Emphasizes basic airway management maneuvers, showing that mechanical support (jaw thrust) is vital before attempting advanced airway procedures.

---

### Milestone 2.5: Rescuing Laryngospasm with Succinylcholine
*   **🕹️ PLAYER OBJECTIVE**: Treat an acute reflex laryngospasm triggered by premature airway irritation.
*   **📍 WHERE TO LOOK**: The center screen warning alerts and the **Pharmacopoeia Panel**.
*   **⚙️ WHAT TO CLICK / ENTER**:
    1. Observe the alert: **"🚨 REFLEX LARYNGOSPASM: Vocal cords tightly closed!"**
    2. Click the **"Paralytics"** tab in the Pharmacopoeia ➔ Select **"Succinylcholine"** ➔ Type **"1.0"** in the dose field (mg/kg) ➔ Click **"PUSH"**.
*   **🎭 THE SIMULATOR REACTION**: Succinylcholine enters the venous compartment, metabolizing rapidly. Within 30 seconds, the vocal cords open in the 3D airway view, the chest begins rising with manual ventilation, and the laryngospasm alert disappears.
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Recreates severe airway crises where the trainee must select the correct fast-acting muscle relaxant to break a life-threatening vocal cord spasm.

---

### Milestone 2.6: Executing Endotracheal Intubation
*   **🕹️ PLAYER OBJECTIVE**: Successfully pass the endotracheal tube under direct visualization.
*   **📍 WHERE TO LOOK**: The center console **Airway Visualization Monitor**.
*   **⚙️ WHAT TO CLICK / ENTER**:
    1. Click the green **"PREPARE INTUBATION EQUIPMENT"** button in the Airway Panel.
    2. In the configuration modal, select **Macintosh Blade Size 3** and **ETT Size 7.5** with **Stylet** ➔ Click **"Proceed to Intubate"**.
    3. On the laryngoscopic camera view, click the **"Grade I"** confirmation target (glottic aperture).
*   **🎭 THE SIMULATOR REACTION**: The simulator advances the ETT through the vocal cords. The camera view transitions to a placement confirmation screen showing the tube in the trachea.
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Tests equipment choice and provides structural 3D visuals of Cormack-Lehane laryngoscopy grading.

---

### Milestone 2.7: Verifying Tube Placement via Auscultation
*   **🕹️ PLAYER OBJECTIVE**: auscultate the lung fields to confirm bilateral tube placement and rule out mainstem intubation.
*   **📍 WHERE TO LOOK**: The **Stethoscope Auscultation Interface** overlay.
*   **⚙️ WHAT TO CLICK / ENTER**:
    1. Click the **"Left Lung Field"** target hotspot ➔ Listen to breath sounds.
    2. Click the **"Right Lung Field"** target hotspot ➔ Listen to breath sounds.
    3. Click the **"Stomach / Epigastrium"** target hotspot ➔ Confirm absence of gurgling.
    4. Click the close **"X"** button.
*   **🎭 THE SIMULATOR REACTION**: Interactive audio clips of clean, bilateral vesicular breath sounds play through the user's headphones. The epigastric hotspot returns silent baseline hums. The event log confirms: *"Verified bilateral breath sounds. ETT position confirmed in trachea."*
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Teaches the standard checklist for confirming airway placement, ensuring the trainee does not miss an endobronchial or esophageal intubation.

---

### Milestone 2.8: Connecting and Dialing the Ventilator Manifold
*   **🕹️ PLAYER OBJECTIVE**: Configure mechanical ventilation parameters for the intubated patient.
*   **📍 WHERE TO LOOK**: The bottom fresh gas flow console.
*   **⚙️ WHAT TO CLICK / ENTER**:
    1. Click the Gas Mode selector ➔ Set to **"Mechanical Vent (Volume Control)"**.
    2. Set **Tidal Volume** to **"420 mL"** (7 mL/kg Ideal Body Weight).
    3. Set **Respiratory Rate** to **"12 bpm"**.
    4. Set **PEEP** to **"5 cmH2O"**.
*   **🎭 THE SIMULATOR REACTION**: The patient's chest rises and falls rhythmically at 12 bpm. The Capnography wave converts to a stable mechanical plateau. The secondary **Vent Monitor** panel lights up on the top right, displaying PIP: 18 cmH2O, Pplat: 13 cmH2O, and Compliance: 35 mL/cmH2O.
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Models respiratory mechanics, airway pressures, and chest wall compliance in real-time, matching typical ICU and OR ventilators.

---

## ⚡ PHASE 3: INCISION, ANAPHYLAXIS & THE SHADOW AWARENESS LOOP

### Milestone 3.1: Advancing to the Incision Phase
*   **🕹️ PLAYER OBJECTIVE**: Shift the simulation timeline to start the surgery.
*   **📍 WHERE TO LOOK**: The top surgical phase timeline tracker.
*   **⚙️ WHAT TO CLICK / ENTER**: Click the **"Incision"** phase node in the timeline.
*   **🎭 THE SIMULATOR REACTION**: The timeline node turns green. A log entry registers: *"Phase Shift: Incision. Surgical incision performed."*
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Simulates the autonomic stimulation associated with surgical incision (tachycardia/hypertension risk if anesthetic depth is insufficient).

---

### Milestone 3.2: Simulating Pneumoperitoneum & Trendelenburg
*   **🕹️ PLAYER OBJECTIVE**: Manage the cardiovascular and pulmonary changes caused by insufflation of the abdomen and head-down positioning.
*   **📍 WHERE TO LOOK**: The **Vent Monitor** (top right) and the primary monitor pressure indicators.
*   **⚙️ WHAT TO CLICK / ENTER**: Click the **"Surgical Maneuvers"** menu ➔ Select **"CO2 Insufflation (15 mmHg)"** and **"Steep Trendelenburg"**.
*   **🎭 THE SIMULATOR REACTION**: 
    *   Diaphragmatic pressure reduces lung compliance (35 ➔ 20 mL/cmH2O).
    *   Peak Inspiratory Pressure (PIP) rises from 18 to 28 cmH2O.
    *   Mean Arterial Pressure (MAP) rises by 15% due to increased systemic vascular resistance and venous return.
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Integrates complex physics modelling, simulating decreased pulmonary compliance and cardiac changes induced by mechanical compression.

---

### Milestone 3.3: Triggering Beta-Lactam Anaphylaxis
*   **🕹️ PLAYER OBJECTIVE**: Administer the surgical antibiotic prophylaxis, triggering the anaphylaxis loop due to cross-reactivity.
*   **📍 WHERE TO LOOK**: The **Pharmacopoeia Panel** (bottom right) and the patient's EMR.
*   **⚙️ WHAT TO CLICK / ENTER**: Click the **"Antibiotics"** tab ➔ Select **"Ampicillin/Sulbactam"** ➔ Click **"PUSH"**.
*   **🎭 THE SIMULATOR REACTION**: Within 45 seconds:
    *   The patient's Heart Rate surges (72 ➔ 125 ➔ 142 bpm) in sinus tachycardia.
    *   Blood Pressure drops rapidly (110/70 ➔ 62/34 mmHg).
    *   Airway pressures spike (PIP 28 ➔ 45 cmH2O) as severe bronchospasm restricts flow.
    *   The capnograph wave displays a classic prolonged, upsloping phase III (shark-fin pattern), indicating severe obstruction.
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Illustrates the danger of cross-sensitisation (penicillin anaphylaxis reacting to a beta-lactam agent) and tests the user's ability to diagnose distributive shock combined with bronchospasm.

---

### Milestone 3.4: Countering Vasoplegia with an Epinephrine Drip
*   **🕹️ PLAYER OBJECTIVE**: Initiate vasoactive infusions to restore blood pressure and treat bronchospasm.
*   **📍 WHERE TO LOOK**: The right-side **Pharmacopoeia Panel** and the **Lines & Resus** panel.
*   **⚙️ WHAT TO CLICK / ENTER**:
    1. Click the **"Vasoactives"** tab ➔ Select **"Epinephrine Drip"**.
    2. Set the rate slider to **"0.1 mcg/kg/min"** ➔ Click **"START INFUSION"**.
*   **🎭 THE SIMULATOR REACTION**: Epinephrine receptor stimulation begins:
    *   Systolic BP stabilizes and begins rising (62 ➔ 84 ➔ 102 mmHg) via $\alpha_1$ vasoconstriction.
    *   Bronchospasm resolves via $\beta_2$-mediated bronchodilation; PIP falls back to 24 cmH2O, and the capnograph waveform normalizes.
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Teaches the dual physiology of Epinephrine as a first-line vasopressor and bronchodilator in severe immunological shock.

---

### Milestone 3.5: Administering Stress-Dose Corticosteroids
*   **🕹️ PLAYER OBJECTIVE**: Deliver stress-dose steroids to treat adrenal suppression in a chronic steroid-dependent patient.
*   **📍 WHERE TO LOOK**: The **Pharmacopoeia Panel**.
*   **⚙️ WHAT TO CLICK / ENTER**: Click the **"Steroids"** tab ➔ Select **"Hydrocortisone"** ➔ Enter **"100 mg"** ➔ Click **"PUSH"**.
*   **🎭 THE SIMULATOR REACTION**: Hydrocortisone binds to glucocorticoid receptors, restoring vascular sensitivity to catecholamines. The patient's blood pressure stabilizes at 112/68 mmHg, preventing refractory vasoplegic collapse.
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Emphasizes the importance of replacing cortisol in patients with suppressed adrenal glands to prevent adrenal crisis during major surgery.

---

### Milestone 3.6: Combating Connected Awareness
*   **🕹️ PLAYER OBJECTIVE**: Recognize signs of connected awareness (under-anesthetization under paralytics) and deepen anesthesia.
*   **📍 WHERE TO LOOK**: The top-right **Receptors Panel** and the **Vaporizer Dial Manifold** in the bottom bar.
*   **⚙️ WHAT TO CLICK / ENTER**:
    1. Click the **"RECEPTORS"** button ➔ Observe GABA-A site occupancy at only **"28%"**.
    2. Under the bottom gas panel, click the volatile dropdown ➔ Select **"Sevoflurane"** ➔ Set the dial to **"2.0%"** (1.0 MAC).
*   **🎭 THE SIMULATOR REACTION**: Alveolar Sevoflurane levels rise. The subcortical BIS index drops from 68 back to a safe anesthetic range of 42. GABA-A receptor occupancy rises to **"84%"**, preventing intraoperative awareness.
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Demonstrates receptor-level modeling, showing that a paralyzed patient can still experience connected awareness if anesthetic gas concentration is not maintained.

---

## 🩸 PHASE 4: HEMORRHAGIC SHOCK & THE RESUSCITATION TRAP

### Milestone 4.1: The Catastrophic Bleeding Event
*   **🕹️ PLAYER OBJECTIVE**: Identify massive hemorrhage from an accidental surgical vein laceration.
*   **📍 WHERE TO LOOK**: The center screen console and the **Vitals Monitor** (top left).
*   **⚙️ WHAT TO CLICK / ENTER**: Observe the emergency warning: **"🚨 CATASTROPHIC HEMORRHAGE: Iliac vein lacerated! Estimated blood loss rate: 250 mL/min."**
*   **🎭 THE SIMULATOR REACTION**: 
    *   Blood pressure falls rapidly (112/68 ➔ 74/42 ➔ 50/28 mmHg).
    *   Heart Rate spikes to 135 bpm.
    *   Central Venous Pressure (CVP) drops from 8 to 1 mmHg, indicating severe preload loss.
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Tests the user's response speed to sudden, massive blood loss.

---

### Milestone 4.2: The IO Resuscitation Trap
*   **🕹️ PLAYER OBJECTIVE**: Experience the physical limits of attempting high-volume resuscitation through an intraosseous (IO) line.
*   **📍 WHERE TO LOOK**: The left-hand **Lines & Resus Panel**.
*   **⚙️ WHAT TO CLICK / ENTER**: 
    1. Click **"Establish Access"** ➔ Select **"Humeral Intraosseous (IO) Line"** ➔ Click **"Insert"**.
    2. Click the Belmont Rapid Infuser ➔ Connect to Humeral IO ➔ Set infusion rate to **"500 mL/min"** ➔ Click **"START"**.
*   **🎭 THE SIMULATOR REACTION**: Within 3 seconds, a warning alert flashes: **"🚨 LINE BLOWOUT: Pressure limit exceeded (>300 mmHg) on Humeral IO! Extravasation risk. Infuser halted."** Resuscitation stops.
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Teaches that while IO access is useful for initial drug delivery, it cannot withstand the pressure of rapid blood infusers, prompting the trainee to establish central access.

---

### Milestone 4.3: Establishing Central Venous Access
*   **🕹️ PLAYER OBJECTIVE**: Place a high-flow central venous catheter to facilitate massive transfusion.
*   **📍 WHERE TO LOOK**: The left-hand **Lines & Resus Panel**.
*   **⚙️ WHAT TO CLICK / ENTER**: Click **"Establish Access"** ➔ Select **"Right Internal Jugular 8.5Fr Cordis"** ➔ Click **"Insert"**.
*   **🎭 THE SIMULATOR REACTION**: The line inserts successfully. The interface updates to display a patent, high-flow central line: **"Right IJ Cordis (Active)"**.
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Reinforces clinical guidelines for securing large-bore access during surgical emergencies.

---

### Milestone 4.4: Configuring the Belmont Rapid Infuser
*   **🕹️ PLAYER OBJECTIVE**: Connect and run warmed blood products through the central line.
*   **📍 WHERE TO LOOK**: The left-hand **Lines & Resus Panel**.
*   **⚙️ WHAT TO CLICK / ENTER**: 
    1. Connect the Belmont Rapid Infuser to the **Right IJ Cordis**.
    2. Select infusate: **"Packed Red Blood Cells (PRBC) / Fresh Frozen Plasma (FFP)"** (1:1 Ratio).
    3. Toggle the warmer option to **"ON (37.5°C)"**.
    4. Set flow rate to **"350 mL/min"** ➔ Click **"START"**.
*   **🎭 THE SIMULATOR REACTION**: Warmed blood begins infusing. The patient's circulating intravascular volume begins to recover. The blood pressure stabilizes at 88/50 mmHg and begins rising.
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Highlights the platform's fluid dynamics modeling, tracking temperature, flow rate, and line resistance.

---

### Milestone 4.5: Analyzing Coagulation with Thromboelastography (TEG)
*   **🕹️ PLAYER OBJECTIVE**: Order lab work to diagnose trauma-induced coagulopathy during massive transfusion.
*   **📍 WHERE TO LOOK**: The top-right **Live Labs** button.
*   **⚙️ WHAT TO CLICK / ENTER**: Click the **"Live Labs"** button ➔ Select the **"Coagulation & TEG"** tab ➔ Click **"Order TEG Panel"**.
*   **🎭 THE SIMULATOR REACTION**: The lab panel generates a simulated TEG graph. It shows:
    *   **R-time**: 14 min (Prolonged ➔ factor deficiency).
    *   **Maximum Amplitude (MA)**: 38 mm (Decreased ➔ thrombocytopenia/fibrinogen deficiency).
    *   **LY30**: 8% (Elevated ➔ hyperfibrinolysis).
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Teaches trainees to interpret viscoelastic coagulation profiles to guide targeted therapy instead of giving fluids blindly.

---

### Milestone 4.6: Reversing the Lethal Triad
*   **🕹️ PLAYER OBJECTIVE**: Correct hypocalcemia, factor deficiency, and hypothermia to prevent blood breakdown.
*   **📍 WHERE TO LOOK**: The **Pharmacopoeia Panel** (bottom right) and the **Lines & Resus Panel**.
*   **⚙️ WHAT TO CLICK / ENTER**:
    1. Click the **"Electrolytes"** tab ➔ Select **"Calcium Chloride"** ➔ Enter **"1 g"** ➔ Click **"PUSH"**.
    2. Click the **"Coagulation Factors"** tab ➔ Select **"PCC (4-Factor Prothrombin Complex)"** ➔ Enter **"25 units/kg"** ➔ Click **"PUSH"**.
    3. Under the Resus panel, toggle the **"Bair Hugger Forced-Air Warmer"** to **"HIGH"**.
*   **🎭 THE SIMULATOR REACTION**: Calcium levels return to normal ($Ca^{2+} = 1.15 \text{ mmol/L}$), improving myocardial contractility. Coagulation factor levels recover, narrowing the TEG R-time. The core body temperature rises (34.8 ➔ 36.6°C), reversing acidosis and coagulopathy.
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Simulates the physiological feedback loops of the "Lethal Triad" (hypothermia, acidosis, coagulopathy), demonstrating how correct treatment resolves the cycle.

---

## 🚀 PHASE 5: EMERGENCE, REVERSAL & SAFE RECOVERY

### Milestone 5.1: Transitioning to the Emergence Phase
*   **🕹️ PLAYER OBJECTIVE**: Turn off anesthetic vaporizers and enter the emergence phase.
*   **📍 WHERE TO LOOK**: The bottom gas control bar and the top surgical timeline.
*   **⚙️ WHAT TO CLICK / ENTER**:
    1. Click the **Sevoflurane Vaporizer** dial ➔ Turn the wheel down to **"0.0%"** (OFF).
    2. Increase Fresh O2 flow to **"10 L/min"** to wash out the gas.
    3. Click the **"Emergence"** phase node in the timeline.
*   **🎭 THE SIMULATOR REACTION**: Alveolar Sevoflurane starts dropping. Capnography capnogram displays decreasing end-tidal Sevoflurane (EtSevo 2.0 ➔ 0.8 ➔ 0.1%). The subcortical BIS score rises to 75, indicating returning consciousness.
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Shows alveolar wash-out kinetics, teaching gas clearance times based on fresh gas flows.

---

### Milestone 5.2: The Manual Nerve Twitch Blind Spot (Qualitative TOF)
*   **🕹️ PLAYER OBJECTIVE**: Perform a visual check of neuromuscular blockade.
*   **📍 WHERE TO LOOK**: The left-hand **Neuromuscular Junction (NMJ) Panel**.
*   **⚙️ WHAT TO CLICK / ENTER**: Click the NMJ monitoring dropdown ➔ Select **"Qualitative (Visual/Tactile) TOF"** ➔ Click **"Stimulate Ulnar Nerve"**.
*   **🎭 THE SIMULATOR REACTION**: The virtual hand twitches. The screen displays: **"Visual Assessment: 4/4 twitches detected. Fade: None visible."**
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Recreates the dangerous clinical trap where a manual check suggests complete reversal, even when up to 70% of receptors are still blocked.

---

### Milestone 5.3: Detecting Residual Paralysis via Quantitative TOF
*   **🕹️ PLAYER OBJECTIVE**: Use quantitative monitoring to identify residual neuromuscular blockade.
*   **📍 WHERE TO LOOK**: The left-hand **NMJ Panel**.
*   **⚙️ WHAT TO CLICK / ENTER**: Click the NMJ monitoring dropdown ➔ Toggle to **"Quantitative Acceleromyography (AMG)"** ➔ Click **"Stimulate Ulnar Nerve"**.
*   **🎭 THE SIMULATOR REACTION**: The digital read-out flashes red, displaying: **"TOF Ratio: 0.62 (Severe Residual Paralysis Detected)"**.
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Demonstrates why objective neuromuscular monitoring is critical to prevent post-operative respiratory complications.

---

### Milestone 5.4: Targeted Reversal with Sugammadex
*   **🕹️ PLAYER OBJECTIVE**: Administer the correct dosing of Sugammadex to encapsulate Rocuronium.
*   **📍 WHERE TO LOOK**: The **Pharmacopoeia Panel** (bottom right).
*   **⚙️ WHAT TO CLICK / ENTER**: Click the **"NMJ Reversal"** tab ➔ Select **"Sugammadex"** ➔ Enter **"2.0 mg/kg"** (appropriate for a TOF count of 4 with fade) ➔ Click **"PUSH"**.
*   **🎭 THE SIMULATOR REACTION**: Sugammadex encapsulates free Rocuronium molecules. Within 90 seconds, ulnar nerve stimulation returns a quantitative **"TOF Ratio: 0.98 (Fully Reversed)"**.
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Teaches targeted, pharmacologically accurate reversal dosing, contrasting Sugammadex with cholinesterase inhibitors like Neostigmine.

---

### Milestone 5.5: Executing the Ventilator Cuff Leak Test
*   **🕹️ PLAYER OBJECTIVE**: Perform a cuff leak test before extubating to check for airway swelling.
*   **📍 WHERE TO LOOK**: The left-hand **Airway Panel**.
*   **⚙️ WHAT TO CLICK / ENTER**: Click the **"Cuff Deflate & Leak Test"** button.
*   **🎭 THE SIMULATOR REACTION**: The ETT cuff deflates. The vent monitor displays a difference between inhaled and exhaled volumes: **"Measured Leak: 120 mL (Pass)"**. A status log reports: *"Cuff leak test passed. No significant laryngeal edema detected."*
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Reinforces pre-extubation safety steps to prevent emergency re-intubation in cases of airway trauma or swelling.

---

### Milestone 5.6: Safe Recovery Transition & Aldrete Scoring
*   **🕹️ PLAYER OBJECTIVE**: Extubate the patient and transfer them to the PACU.
*   **📍 WHERE TO LOOK**: The left-hand **Airway Panel** and the top timeline tracker.
*   **⚙️ WHAT TO CLICK / ENTER**:
    1. Click the **"EXTUBATE PATIENT"** button in the Airway Panel.
    2. Click the **"PACU"** phase node in the timeline.
*   **🎭 THE SIMULATOR REACTION**: The ETT is removed. The patient breathes on room air (RR 14, SpO2 98%, chest rising). The screen transitions to the PACU Discharge Panel, showing a passing **Aldrete Score of 9/10** (Activity: 2, Respiration: 2, Circulation: 2, Consciousness: 2, O2 Saturation: 1).
*   **💡 CLINICAL INSIGHT FOR DIRECTORS**: Completes the clinical path, showing how proper management throughout the case leads to safe emergence and recovery.
