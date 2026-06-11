import os

def update_golden_version_ch15():
    filepath = 'goldenversion.md'
    if not os.path.exists(filepath):
        print("Error: goldenversion.md not found!")
        return

    with open(filepath, 'r') as f:
        content = f.read()

    # 1. Update Table of Contents (TOC) for Section 4
    old_toc_410 = "*   [4.10 Cerebral Physiology & Intracranial Mechanics](#410-cerebral-physiology--intracranial-mechanics)"
    new_toc_410 = (
        "*   [4.10 Cerebral Physiology & Intracranial Mechanics](#410-cerebral-physiology--intracranial-mechanics)\n"
        "        *   [4.11 Gastrointestinal Physiology & Lower Esophageal Barrier Pressure](#411-gastrointestinal-physiology--lower-esophageal-barrier-pressure)"
    )
    content = content.replace(old_toc_410, new_toc_410)

    # 2. Update Table of Contents (TOC) for Section 6
    old_toc_624 = "    *   [6.24 Oculocardiac Reflex](#624-oculocardiac-reflex)"
    new_toc_624 = (
        "    *   [6.24 Oculocardiac Reflex](#624-oculocardiac-reflex)\n"
        "    *   [6.25 Postoperative Ileus (POI) & Gut Motility Dysregulation](#625-postoperative-ileus-poi--gut-motility-dysregulation)\n"
        "    *   [6.26 Swallowing Apnea Reflex & Pharyngeal Protection](#626-swallowing-apnea-reflex--pharyngeal-protection)"
    )
    content = content.replace(old_toc_624, new_toc_624)

    # 3. Update Section 4.1 Content (Splanchnic Blood Pooling)
    old_sec_41_start = "1.  **Mean Arterial Pressure (MAP)**:\n    $$MAP = DBP + \\frac{SBP - DBP}{3}$$\n    $$MAP_{\\text{exact}} = \\frac{CO \\cdot SVR}{80} + \\Delta P_{\\text{pressor}} + \\Delta P_{\\text{sepsis}} - \\text{Stunning}_{\\text{MAP\_penalty}}$$\n    *   *Systemic Vascular Resistance ($SVR$)*: Normal range is $900 - 1400\\text{ dyn}\\cdot\\text{s}\\cdot\\text{cm}^{-5}$. Updates dynamically based on vasodilation, vasoactive infusions, and autonomic reflexes.\n    *   *Pressor Pressure Shift (\\Delta P_{\\text{pressor}})*:\n        $$\\Delta P_{\\text{pressor}} = \\frac{\\text{EffectiveVolume} - EBV}{250} \\cdot 8$$\n    *   *Sepsis Pressure Shift (\\Delta P_{\\text{sepsis}})*: Drops SVR and subtracts $33.33\\text{ mmHg}$ from MAP due to vasoplegia."
    
    new_sec_41_content = (
        "1.  **Mean Arterial Pressure (MAP)**:\n"
        "    $$MAP = DBP + \\frac{SBP - DBP}{3}$$\n"
        "    $$MAP_{\\text{exact}} = \\frac{CO \\cdot SVR}{80} + \\Delta P_{\\text{pressor}} + \\Delta P_{\\text{sepsis}} - \\text{Stunning}_{\\text{MAP\_penalty}}$$\n"
        "    *   *Systemic Vascular Resistance ($SVR$)*: Normal range is $900 - 1400\\text{ dyn}\\cdot\\text{s}\\cdot\\text{cm}^{-5}$. Updates dynamically based on vasodilation, vasoactive infusions, and autonomic reflexes. Under celiac or thoracic epidural sympathetic blockade (TEA):\n"
        "        $$\\text{targetSVR} *= (1.0 - 0.15 \\cdot \\text{SympatheticBlock})$$\n"
        "        where $\\text{SympatheticBlock} = 1.0$ if celiac or thoracic epidural block is active, else $0.0$.\n"
        "    *   *Pressor Pressure Shift (\\Delta P_{\\text{pressor}})*:\n"
        "        $$\\Delta P_{\\text{pressor}} = \\frac{\\text{EffectiveVolume} - EBV - \\text{splanchnicPoolingOffset}}{250} \\cdot 8$$\n"
        "        where $\\text{splanchnicPoolingOffset} = 1000 \\cdot (V_{\\text{splanchnic}} - 1.0)\\text{ mL}$. Sympathetic block dilates mesenteric capacitance vessels, causing relative splanchnic pooling ($V_{\\text{splanchnic}} > 1.0$). This is reversed by alpha-1 adrenergic receptor stimulation:\n"
        "        $$V_{\\text{splanchnic}} = 1.0 + 0.3 \\cdot \\text{SympatheticBlock} \\cdot (1.0 - \\text{AlphaAgonistEffect})$$\n"
        "        where $\\text{AlphaAgonistEffect} = 1.0$ if Phenylephrine, Norepinephrine, or Epinephrine is active.\n"
        "    *   *Sepsis Pressure Shift (\\Delta P_{\\text{sepsis}})*: Drops SVR and subtracts $33.33\\text{ mmHg}$ from MAP due to vasoplegia."
    )
    content = content.replace(old_sec_41_start, new_sec_41_content)

    # 4. Update Section 4.6 Content (Diaphragmatic Compliance Compression)
    old_sec_46_comp = (
        "*   **FRC & Compliance Corrections**:\n"
        "    $$Compliance_{\\text{actual}} = Compliance_{\\text{baseline}} \\cdot (1.0 - 0.40 \\cdot \\text{Atelectasis})$$"
    )
    new_sec_46_comp = (
        "*   **FRC & Compliance Corrections**:\n"
        "    $$Compliance_{\\text{actual}} = Compliance_{\\text{baseline}} \\cdot (1.0 - 0.40 \\cdot \\text{Atelectasis}) \\cdot \\text{ComplianceMod}_{\\text{bowel}}$$\n"
        "    where $\\text{ComplianceMod}_{\\text{bowel}} = \\frac{1.0}{1.0 + 0.3 \cdot \\max(0, \\text{bowelGasVolume} - 1.0)}$. Bowel gas volume expansion compresses the diaphragm, reducing thoracic compliance and raising Peak Airway Pressure."
    )
    content = content.replace(old_sec_46_comp, new_sec_46_comp)

    # 5. Append Section 4.11 Gastrointestinal Physiology & LES Barrier Pressure
    old_sec_410_end = (
        "    - *Limits*: CBF vasoconstriction plateaus below $PaCO_2 = 25\\text{ mmHg}$; vasodilation plateaus above $75-80\text{ mmHg}$. Reactivity is transient, returning to baseline over $6-8\text{ hours}$ due to active bicarbonate extrusion and CSF pH normalization.\n\n"
        "---\n\n"
        "### 5. Pharmacology (PK/PD) Engine"
    )
    new_sec_410_end = (
        "    - *Limits*: CBF vasoconstriction plateaus below $PaCO_2 = 25\\text{ mmHg}$; vasodilation plateaus above $75-80\text{ mmHg}$. Reactivity is transient, returning to baseline over $6-8\text{ hours}$ due to active bicarbonate extrusion and CSF pH normalization.\n\n"
        "#### 4.11 Gastrointestinal Physiology & Lower Esophageal Barrier Pressure (`GastrointestinalEngine.ts`)\n"
        "The gastrointestinal engine models the lower esophageal sphincter ($LES$) tone, intragastric pressure ($P_{\\text{gastric}}$), nitrous oxide ($N_2O$) bowel gas diffusion dynamics, and gut motility.\n\n"
        "1.  **Lower Esophageal Sphincter (LES) Tone**:\n"
        "    $$LES_{\\text{tone}} = 25.0 \\cdot \\max(0.2, 1.0 - 0.4 \\cdot \\text{Propofol}_{Ce} - 0.3 \\cdot \\text{Volatile}_{\\text{MAC}}) \\quad \\text{[mmHg]}$$\n"
        "    LES tone represents the active sphincter barrier preventing the regurgitation of gastric contents. It is blunted dose-dependently by intravenous sedatives (Propofol) and inhalational volatiles.\n\n"
        "2.  **Intragastric Pressure**:\n"
        "    $$P_{\\text{gastric}} = 7.0 + 15.0 \\cdot suxFasciculation \\quad \\text{[mmHg]}$$\n"
        "    Intragastric pressure is normally $7.0\\text{ mmHg}$. However, during the first 45 seconds of succinylcholine administration, intense skeletal muscle fasciculations spike intragastric pressure by $+15.0\\text{ mmHg}$ to $22.0\\text{ mmHg}$.\n\n"
        "3.  **Barrier Pressure & Regurgitation / Aspiration Triggers**:\n"
        "    Regurgitation occurs if the stomach is not empty and gastric pressure exceeds LES tone:\n"
        "    $$\\text{Regurgitation} = \\text{stomach === 'full'} \\land P_{\\text{gastric}} > LES_{\\text{tone}} \\land \\neg\\text{airwaySecured}$$\n"
        "    If regurgitation occurs, active positive pressure ventilation ($PPV$) or spontaneous breathing will pull the regurgitated contents into the respiratory tract, causing **Chemical Aspiration Pneumonitis**:\n"
        "    $$\\text{Aspiration} = \\text{Regurgitation} \\land (\\text{positivePressureVentilationActive} \\lor \\text{spontaneousBreathingActive})$$\n"
        "    Aspiration triggers severe bronchospasm (resistance penalty $+25\\text{ cmH2O/L/s}$) and chemical pneumonitis (compliance penalty $-30\\text{ mL/cmH2O}$), which can be partially mitigated by suctioning the airway in the Trendelenburg position (reducing penalties to $+8$ resistance and $-10$ compliance).\n\n"
        "4.  **Nitrous Oxide Bowel Gas Expansion**:\n"
        "    Nitrous oxide ($N_2O$) is 34 times more soluble in blood than nitrogen ($N_2$). It diffuses into air-filled bowel cavities faster than nitrogen can escape, causing cavity expansion:\n"
        "    $$\\frac{d(\\text{bowelGasVolume})}{dt} = +0.02 \\cdot \\left(\frac{EtN_2O}{100}\\right) - 0.005 \\cdot (\\text{bowelGasVolume} - 1.0)$$\n"
        "    clamped to a maximum of $2.5$.\n\n"
        "---\n\n"
        "### 5. Pharmacology (PK/PD) Engine"
    )
    content = content.replace(old_sec_410_end, new_sec_410_end)

    # 6. Append Sections 6.25 and 6.26
    old_sec_6_end = (
        "*   **Mitigation / Resolution**: Stopped immediately by releasing traction/pressure. Prevented or treated by antimuscarinic medications (Atropine or Glycopyrrolate) which occupy cardiac muscarinic acetylcholine receptors, preventing acetylcholine-mediated vagal slowing.\n\n"
        "### 7. Attending Direct Chat, Advisor & NLP Engine"
    )
    new_sec_6_end = (
        "*   **Mitigation / Resolution**: Stopped immediately by releasing traction/pressure. Prevented or treated by antimuscarinic medications (Atropine or Glycopyrrolate) which occupy cardiac muscarinic acetylcholine receptors, preventing acetylcholine-mediated vagal slowing.\n\n"
        "#### 6.25 Postoperative Ileus (POI) & Gut Motility Dysregulation\n"
        "Postoperative ileus is a multifactorial bowel motility dysfunction governed by surgical bowel manipulation, opioid-induced mu-receptor activation, and sympathetic inhibitory drive.\n\n"
        "*   **Gut Motility Index ($motility_{\\text{gut}}$)**:\n"
        "    $$motility_{\\text{gut}} = (1.0 - \\text{Opioid}_{\\text{block}}) \\cdot (1.0 - \\text{Sympathetic}_{\\text{inhibition}}) \\cdot (1.0 - \\text{Inflammatory}_{\\text{ileus}})$$\n"
        "    - *Opioid-Induced Mu Blockade (\\text{Opioid}_{\\text{block}})*:\n"
        "      $$\\text{Opioid}_{\\text{block}} = \\frac{Ce_{\\text{opioid}}}{Ce_{\\text{opioid}} + EC50_{\\text{opioid}}}$$\n"
        "      Opioids bind to enteric $\\mu$-receptors, suppressing acetylcholine release and inhibiting peristalsis. This blockade can be reversed by Naloxone or peripheral $\\mu$-antagonists (e.g. Alvimopan, Methylnaltrexone).\n"
        "    - *Sympathetic Inhibitory Drive (\\text{Sympathetic}_{\\text{inhibition}})*:\n"
        "      $$\\text{Sympathetic}_{\\text{inhibition}} = \\min\\left(0.9, 0.4 \\cdot \\frac{C_{\\text{cat}}}{40} \\cdot (1.0 - \\text{SympatheticBlock})\\right)$$\n"
        "      Catecholamine stress increases sympathetic outflow, stimulating $\\alpha$-receptors on cholinergic nerves to inhibit motility. A celiac plexus or thoracic epidural block (TEA) blocks this inhibitory pathway (`SympatheticBlock = 1.0`), preserving motility.\n"
        "    - *Inflammatory Ileus (\\text{Inflammatory}_{\\text{ileus}})*:\n"
        "      $$\\frac{d(\\text{Inflammatory}_{\\text{ileus}})}{dt} = +0.00015 \\cdot \\text{manipulationIndex} \\cdot (1.0 - \\text{epiduralAnalgesiaBonus})$$\n"
        "      Surgical bowel manipulation recruits inflammatory cells (macrophages/mast cells) to the muscularis, releasing nitric oxide and prostaglandins that paralyze smooth muscle. This accumulation is mitigated by thoracic epidural analgesia (`epiduralAnalgesiaBonus = 0.36`).\n"
        "*   **Postoperative Ileus Duration ($POI_{\\text{hours}}$)**:\n"
        "    $$POI_{\\text{hours}} = 72.0 \\cdot \\text{manipulationIndex} \\cdot (1.0 - \\text{SympatheticBlock} \\cdot 0.36) \\cdot \\left(1.0 + 0.5 \\cdot \\max(0, \\text{bowelGasVolume} - 1.0)\\right)$$\n"
        "    POI duration represents the clinical recovery time (in hours) before return of bowel function, prolonged by bowel gas distension and shortened by epidural analgesia.\n\n"
        "#### 6.26 Swallowing Apnea Reflex & Pharyngeal Protection\n"
        "*   **Trigger Conditions**: Swallowing is a complex reflex coordinated by the brainstem swallowing center. Afferent signals from CN V, VII, IX, and X initiate a motor sequence that pulls the larynx anteriorly and superiorly, closing the epiglottis.\n"
        "*   **Physiological Impact**: Temporarily arrests breathing to prevent aspiration of food, liquid, or saliva:\n"
        "    - Inhibits all spontaneous respiratory drive: target respiratory rate ($RR = 0$), tidal volume ($V_T = 0$), and alveolar ventilation ($V_A = 0$).\n"
        "    - Overrides and halts active mechanical ventilation breath delivery.\n"
        "*   **Resolution Criteria**: Resolves within $1 - 2\\text{ seconds}$ once the swallow phase is complete, restoring baseline ventilatory drive and parameters.\n\n"
        "### 7. Attending Direct Chat, Advisor & NLP Engine"
    )
    content = content.replace(old_sec_6_end, new_sec_6_end)

    # 7. Add Section 8.2 State Tree additions (vitals)
    old_state_tree_mvo2 = (
        "    *   `mvo2`: `number` (Myocardial oxygen consumption index)\n"
        "    *   `mvo2Supply`: `number` (Myocardial oxygen supply index)"
    )
    new_state_tree_mvo2 = (
        "    *   `mvo2`: `number` (Myocardial oxygen consumption index)\n"
        "    *   `mvo2Supply`: `number` (Myocardial oxygen supply index)\n"
        "    *   `lesTone`: `number` (Lower Esophageal Sphincter tone, mmHg)\n"
        "    *   `gastricPressure`: `number` (Intragastric pressure, mmHg)\n"
        "    *   `bowelGasVolume`: `number` (Bowel gas volume expansion index, 1.0 - 2.5)\n"
        "    *   `gutMotility`: `number` (Gut motility index, 0.0 - 1.0)\n"
        "    *   `inflammatoryIleus`: `number` (Inflammatory ileus factor, 0.0 - 1.0)\n"
        "    *   `postoperativeIleus`: `number` (Postoperative ileus duration, hours)"
    )
    content = content.replace(old_state_tree_mvo2, new_state_tree_mvo2)

    # 8. Add Section 8.2 State Tree additions (patient)
    old_patient_state = (
        "    *   `isApneic`: `boolean`, `isParalyzed`: `boolean`, `isTopicalized`: `boolean`, `airwaySecured`: `boolean`, `airwayExamined`: `boolean`, `ventilationStatus`: `string` ('none' | 'assisted' | 'successful' | 'failed' | 'spontaneous'), `tubePosition`: `string | null` ('trachea' | 'right_mainstem' | 'left_mainstem' | 'esophagus' | `null`), `isCuffDeflated`: `boolean`, `bmvOptimized`: `boolean`\n"
        "    *   `vec3oh`: `number`, `normep`: `number`, `m6g`: `number`, `isSeizure`: `boolean`, `calciumStabilized`: `boolean`, `calciumStabilizedTime`: `number`, `bradycardiaTriggered`: `boolean`, `bradycardiaTime`: `number`, `laryngospasm`: `boolean`, `bronchospasm`: `boolean`, `isBucking`: `boolean`"
    )
    new_patient_state = (
        "    *   `isApneic`: `boolean`, `isParalyzed`: `boolean`, `isTopicalized`: `boolean`, `airwaySecured`: `boolean`, `airwayExamined`: `boolean`, `ventilationStatus`: `string` ('none' | 'assisted' | 'successful' | 'failed' | 'spontaneous'), `tubePosition`: `string | null` ('trachea' | 'right_mainstem' | 'left_mainstem' | 'esophagus' | `null`), `isCuffDeflated`: `boolean`, `bmvOptimized`: `boolean`\n"
        "    *   `vec3oh`: `number`, `normep`: `number`, `m6g`: `number`, `isSeizure`: `boolean`, `calciumStabilized`: `boolean`, `calciumStabilizedTime`: `number`, `bradycardiaTriggered`: `boolean`, `bradycardiaTime`: `number`, `laryngospasm`: `boolean`, `bronchospasm`: `boolean`, `isBucking`: `boolean`, `celiacBlockActive`: `boolean`, `epiduralBlockActive`: `boolean`, `swallowingActive`: `boolean`, `manipulationIndex`: `number`, `hasRegurgitated`: `boolean`, `hasAspirated`: `boolean`, `suxInjectionTime`: `number`"
    )
    content = content.replace(old_patient_state, new_patient_state)

    # 9. Add Section 10 Constraints additions
    old_constraints = (
        "13. **Coronary Anatomy & Autoregulation**: The coronary system is modeled globally via left ventricular end-diastolic pressure and mean diastolic perfusion, representing local flow dynamics as a single lumped compartment with uniform stenosis scaling rather than independent regional vessel trees."
    )
    new_constraints = (
        "13. **Coronary Anatomy & Autoregulation**: The coronary system is modeled globally via left ventricular end-diastolic pressure and mean diastolic perfusion, representing local flow dynamics as a single lumped compartment with uniform stenosis scaling rather than independent regional vessel trees.\n"
        "14. **Gastrointestinal Cavities & Gas Solubility**: The bowel is treated as a single uniform gas cavity. Regional micro-peristalsis, stomach geometry, and anatomical divisions of the small and large bowel are represented via aggregate indices (`bowelGasVolume`, `gutMotility`, `inflammatoryIleus`) rather than detailed multi-segment spatial modeling."
    )
    content = content.replace(old_constraints, new_constraints)

    # 10. Add Section 12 Dependency additions
    old_dependency = (
        "| **Autonomic Reflexes** | Simple baroreceptor heart rate drop in [CardiovascularEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/CardiovascularEngine.ts). | None. | Bezold-Jarisch, Bainbridge, and Oculocardiac reflexes are unmodeled; heart rate changes do not depend on ventricular volume or trigeminal afferents. |"
    )
    new_dependency = (
        "| **Autonomic Reflexes** | Simple baroreceptor heart rate drop in [CardiovascularEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/CardiovascularEngine.ts). | None. | Bezold-Jarisch, Bainbridge, and Oculocardiac reflexes are unmodeled; heart rate changes do not depend on ventricular volume or trigeminal afferents. |\n"
        "| **Splanchnic Blood Pooling** | Sympathetic block blunts SVR and sequesters 300mL blood volume in splanchnic dilations, reversed by alpha-1 agonists in [CardiovascularEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/CardiovascularEngine.ts). | None. | Celiac plexus and thoracic epidural blocks do not cause splanchnic venous dilation, blood volume sequestration, or MAP shifts. |\n"
        "| **LES Barrier & Aspiration** | Propofol/volatiles depress LES; sux fasciculations spike gastric pressure; low barrier pressure triggers regurgitation/aspiration in [GastrointestinalEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/GastrointestinalEngine.ts). | None. | Lower esophageal sphincter barrier pressure is unmodeled; stomach fullness, sux administration, and positive pressure ventilation do not cause regurgitation or aspiration pneumonitis. |\n"
        "| **Nitrous Oxide Bowel Expansion** | Alveolar N2O diffuses into the bowel, causing gas volume expansion up to 2.5 in [GastrointestinalEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/GastrointestinalEngine.ts). | None. | Inhalational N2O exposure does not expand bowel gas volume or alter abdominal distension. |\n"
        "| **Postoperative Ileus (POI)** | Gut motility is blocked by opioids, stress-induced sympathetics, and surgery; epidural block protects motility in [GastrointestinalEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/GastrointestinalEngine.ts). | None. | Postoperative bowel motility recovery is constant and independent of surgical manipulation, opioid use, or sympathetic nerve blockade. |\n"
        "| **Swallowing Apnea** | Swallowing temporarily overrides and inhibits spontaneous breathing drive and mechanical ventilation in [RespiratoryEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/RespiratoryEngine.ts). | None. | Swallowing events do not arrest spontaneous respiration or mechanical ventilation. |"
    )
    content = content.replace(old_dependency, new_dependency)

    with open(filepath, 'w') as f:
        f.write(content)
    print("Success: Weaved Chapter 15 Gastrointestinal Physiology into goldenversion.md")

if __name__ == '__main__':
    update_golden_version_ch15()
