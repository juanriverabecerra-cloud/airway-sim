import os

def update_golden_version_ch11():
    filepath = 'goldenversion.md'
    if not os.path.exists(filepath):
        print("Error: goldenversion.md not found!")
        return

    with open(filepath, 'r') as f:
        content = f.read()

    # 1. Update Table of Contents
    old_toc_pulse = "        *   [4.9 Optical Pulse Oximetry Absorption Model](#49-optical-pulse-oximetry-absorption-model)"
    new_toc_pulse = ("        *   [4.9 Optical Pulse Oximetry Absorption Model](#49-optical-pulse-oximetry-absorption-model)\n"
                     "        *   [4.10 Cerebral Physiology & Intracranial Mechanics](#410-cerebral-physiology--intracranial-mechanics)")
    content = content.replace(old_toc_pulse, new_toc_pulse)

    old_toc_sdb = "    *   [6.14 Special SDB Anesthesia Bundle Checklist](#614-special-sdb-anesthesia-bundle-checklist)"
    new_toc_sdb = ("    *   [6.14 Special SDB Anesthesia Bundle Checklist](#614-special-sdb-anesthesia-bundle-checklist)\n"
                   "    *   [6.15 Intracranial Hypertension & Cushing's Reflex Loop](#615-intracranial-hypertension--cushings-reflex-loop)\n"
                   "    *   [6.16 Cerebral Steal Syndrome vs. Robin Hood Effect](#616-cerebral-steal-syndrome-vs-robin-hood-effect)\n"
                   "    *   [6.17 Severe Traumatic Brain Injury (TBI) & Brain Herniation](#617-severe-traumatic-brain-injury-tbi--brain-herniation)")
    content = content.replace(old_toc_sdb, new_toc_sdb)

    # 2. Add Section 4.10 Cerebral Physiology & Intracranial Mechanics
    old_sec_5 = "---\n\n### 5. Pharmacology (PK/PD) Engine"
    new_sec_410 = ("#### 4.10 Cerebral Physiology & Intracranial Mechanics\n"
                   "*   **Cerebral Blood Flow ($CBF$)**: Global baseline is $50\\text{ mL/100 g/min}$ (representing $12\\% - 15\\%$ of cardiac output). Gray matter (cortical) receives $80\\%$ ($75 - 80\\text{ mL/100 g/min}$); white matter (subcortical) receives $20\\%$ ($8 - 20\\text{ mL/100 g/min}$).\n"
                   "*   **Cerebral Metabolic Rate of Oxygen ($CMRO_2$)**: Baseline is $3.0 - 3.5\\text{ mL/100 g/min}$ (approx $50\\text{ mL/min}$ total, $20\\%$, of total body oxygen consumption).\n"
                   "    - *Functional metabolism*: Approximately $60\\%$ of $CMRO_2$ supports electrophysiological function (neurotransmitter synthesis, transport, and synaptic potentials). Reduced dose-dependently by anesthetics (Propofol, Barbiturates) up to a maximum of $60\\%$ reduction (at electrophysiologic silence / EEG flatline).\n"
                   "    - *Basal cellular metabolism*: The remaining $40\\%$ supports cellular homeostatic integrity. Spared by anesthetics, but reduced by hypothermia (decreases by $6\\% - 7\\%$ per $^{\\circ}\\text{C}$ reduction; $Q_{10} = 2.4$).\n"
                   "*   **Cerebral Perfusion Pressure ($CPP$)**: The net pressure gradient driving blood flow to the brain:\n"
                   "    $$CPP = MAP - ICP \\quad \\text{(or CVP if } CVP > ICP\\text{)}$$\n"
                   "    - *Lower Limit of Autoregulation (LLA)*: $70\\text{ mmHg}$ MAP (or $60 - 65\\text{ mmHg}$ CPP). Below this, CBF is pressure-passive, causing cerebral ischemia risk.\n"
                   "    - *Upper Limit of Autoregulation (ULA)*: $150\\text{ mmHg}$ MAP. Above this, vasoconstrictor tone is overcome, causing pressure-passive hyperfusion.\n"
                   "*   **Intracranial Volume-Compliance Mechanics (Monro-Kellie Doctrine)**:\n"
                   "    The rigid cranium creates a fixed total volume:\n"
                   "    $$V_{\\text{intracranial}} = V_{\\text{brain}} + V_{\\text{blood}} + V_{\\text{CSF}} = \\text{Constant}$$\n"
                   "    - *Intracranial Pressure ($ICP$)*: Baseline is $8 - 12\\text{ mmHg}$ (supine). Calculated using an exponential volume-pressure elastance model:\n"
                   "        $$ICP = ICP_{\\text{baseline}} \\cdot e^{\\text{elastance} \\cdot \\Delta V}$$\n"
                   "        where $\\Delta V$ is driven by changes in Cerebral Blood Volume ($CBV$) and `intracranialVolumeOffset` (representing hematoma, edema, or tumors).\n"
                   "    - *Elastance States*: Determined by intracranial compliance:\n"
                   "        - `'normal'`: elastance $\\approx 0.05$. CSF is easily displaced into spinal space; venous blood is squeezed out of sinuses.\n"
                   "        - `'impaired'`: elastance $\\approx 0.20$. Compensation mechanisms are partially exhausted.\n"
                   "        - `'exhausted'`: elastance $\\ge 0.50$. Compensation is fully exhausted; small volume additions trigger exponential ICP surges.\n"
                   "*   **Cerebral Autoregulation & Coupling**: CBF is tightly coupled to $CMRO_2$ (neurovascular coupling) under intravenous anesthetics (Propofol, Barbiturates) which reduce both in parallel. Volatile anesthetics ($>1\\text{ MAC}$) uncouple this relationship, causing direct cerebral vasodilation (increasing CBF/CBV) while decreasing $CMRO_2$. Volatiles also dose-dependently attenuate autoregulation (lost at $>1.5\\text{ MAC}$).\n"
                   "*   **Carbon Dioxide ($CO_2$) Reactivity**: CBF varies linearly with changes in $PaCO_2$ between $25$ and $75\\text{ mmHg}$:\n"
                   "    - *Normotension*: hypercapnia ($+2.5\\% \\text{ CBF per mmHg}$), hypocapnia ($-1.67\\% \\text{ CBF per mmHg}$).\n"
                   "    - *Moderate Hypotension* ($MAP$ reduced by $<33\\%$): hypercapnia ($+1.3\\% \\text{ CBF per mmHg}$), hypocapnia ($-1.3\\% \\text{ CBF per mmHg}$).\n"
                   "    - *Severe Hypotension* ($MAP$ reduced by $>66\\%$): CO2 reactivity is fully abolished ($0\\% \\text{ CBF per mmHg}$).\n"
                   "    - *Limits*: CBF vasoconstriction plateaus below $PaCO_2 = 25\\text{ mmHg}$; vasodilation plateaus above $75-80\\text{ mmHg}$. Reactivity is transient, returning to baseline over $6-8\\text{ hours}$ due to active bicarbonate extrusion and CSF pH normalization.\n"
                   "\n"
                   "---\n\n### 5. Pharmacology (PK/PD) Engine")
    content = content.replace(old_sec_5, new_sec_410)

    # 3. Add Section 6 Crises Loops
    old_sec_7_chat = "### 7. Attending Direct Chat, Advisor & NLP Engine"
    new_sec_6_additions = ("#### 6.15 Intracranial Hypertension & Cushing's Reflex Loop\n"
                           "*   **Trigger Conditions**: Intracranial pressure is elevated ($ICP > 20\\text{ mmHg}$) and cerebral perfusion pressure is severely compromised ($CPP < 50\\text{ mmHg}$).\n"
                           "*   **Physiological Impact**: Sympathetic vasomotor center excitation triggers a massive vasoconstrictor surge, increasing systemic vascular resistance ($SVR \\propto e^{\\gamma \\cdot (50 - CPP)}$, up to $+150\\%$ SVR increase) to support MAP. The severe arterial hypertension ($SBP > 180\\text{ mmHg}$) stimulates carotid sinus baroreceptors, producing reflex bradycardia (HR drops to $<40\\text{ bpm}$). Brainstem compression triggers irregular, gasping respirations, progressing to central apnea.\n"
                           "*   **Mitigation / Resolution**:\n"
                           "    1. *Osmotic Therapy*: Administer Mannitol ($0.5 - 1.0\\text{ g/kg}$) or Hypertonic Saline ($3\\%$) to reduce brain tissue water and lower `intracranialVolumeOffset`.\n"
                           "    2. *Hyperventilation*: Briefly target mild hypocapnia ($PaCO_2 = 30-35\\text{ mmHg}$) to induce vasoconstrictive reduction of CBV.\n"
                           "    3. *Surgical Decompression*: Perform decompressive craniectomy or CSF drainage.\n"
                           "\n"
                           "#### 6.16 Cerebral Steal Syndrome vs. Robin Hood Effect\n"
                           "*   **Trigger Conditions**: Focal brain ischemia is present (local vascular bed is maximally dilated and pressure-passive) during administration of a cerebral vasodilator (high-dose volatile $>1.2\\text{ MAC}$) [Steal] vs. a coupled vasoconstrictor (Propofol or Barbiturate) [Robin Hood].\n"
                           "*   **Physiological Impact**:\n"
                           "    - *Cerebral Steal*: Direct vasodilation of healthy vessels reduces local resistance in non-ischemic brain tissue, shunting blood flow *away* from the ischemic zone, worsening local hypoxia.\n"
                           "    - *Robin Hood (Inverse Steal)*: Constriction of healthy vessels increases resistance in normal brain tissue, shunting blood flow *toward* the passive, maximally dilated ischemic zone, improving local oxygenation.\n"
                           "*   **Mitigation / Resolution**: Discontinue volatile agents and vasodilators. Prefer Propofol or Barbiturates for neuroanesthesia, and maintain CPP in the normal range.\n"
                           "\n"
                           "#### 6.17 Severe Traumatic Brain Injury (TBI) & Brain Herniation\n"
                           "*   **Trigger Conditions**: Traumatic brain swelling, contusion, or expanding hematoma increases `intracranialVolumeOffset` until $ICP > 25\\text{ mmHg}$ and intracranial compliance is exhausted.\n"
                           "*   **Physiological Impact**: Cerebral herniation (uncal or tonsillar). Triggers compression of the ipsilateral oculomotor nerve (fixed dilated pupil), Cushing's triad, brainstem ischemia, and progresses rapidly to biological death.\n"
                           "*   **Mitigation / Resolution**: Urgent surgical evacuation of expanding hematoma, mannitol, hyperventilation, and vasopressor support to maintain CPP $>60\\text{ mmHg}$.\n"
                           "\n"
                           "### 7. Attending Direct Chat, Advisor & NLP Engine")
    content = content.replace(old_sec_7_chat, new_sec_6_additions)

    # 4. Add Section 8.2 State Tree variables
    old_state_tree_vitals = "    *   `sleepStage`: `'W' | 'N1' | 'N2' | 'N3' | 'R'` (Active sleep stage)\n"
    new_state_tree_vitals = ("    *   `sleepStage`: `'W' | 'N1' | 'N2' | 'N3' | 'R'` (Active sleep stage)\n"
                             "    *   `cbf`: `number` (Cerebral Blood Flow, mL/100 g/min)\n"
                             "    *   `cmro2`: `number` (Cerebral Metabolic Rate of Oxygen, mL/100 g/min)\n"
                             "    *   `icp`: `number` (Intracranial Pressure, mmHg)\n"
                             "    *   `cpp`: `number` (Cerebral Perfusion Pressure, mmHg)\n"
                             "    *   `intracranialCompliance`: `'normal' | 'impaired' | 'exhausted'` (Intracranial compliance state)\n"
                             "    *   `intracranialVolumeOffset`: `number` (Cranial space-occupying volume offset, mL)\n"
                             "    *   `cbv`: `number` (Cerebral Blood Volume index, 0.0 - 1.0)\n"
                             "    *   `hasCerebralIschemia`: `boolean` (Active cerebral ischemia flag)\n"
                             "    *   `cushingsTriadActive`: `boolean` (Active Cushing's reflex flag)\n"
                             "    *   `sjvo2`: `number` (Jugular venous oxygen saturation, %)\n"
                             "    *   `rso2`: `number` (Regional cerebral oxygen saturation, %)\n")
    content = content.replace(old_state_tree_vitals, new_state_tree_vitals)

    # 5. Add Section 10 Constraints
    old_constraints = "7.  **Loop Gain Numerical Stability**: High loop gain values ($LG > 2.5$) can introduce numerical resonance oscillations in the respiratory rate and tidal volume calculations during Euler integration. Solved by clamping maximum oscillations and smoothing ventilatory updates."
    new_constraints = (old_constraints + "\n"
                       "8.  **Monro-Kellie Elastance Resolution**: The exponential ICP compliance model assumes uniform pressure distribution throughout the cranial vault. Local pressure gradients (such as tentorial or tonsillar herniation shear forces) are not modeled mechanically, but are represented via functional threshold triggers.\n"
                       "9.  **Cerebral Steal Approximation**: Steal and Robin Hood effects are modeled as local perfusion resistance offsets in the blood-gas exchange and target oxygenation equations rather than a full 3D vascular network simulation.\n")
    content = content.replace(old_constraints, new_constraints)

    # 6. Add Section 12 Dependency Table
    old_dependency_anchor = "| **Sleep Stage Hypnogram & REM Atonia** | Simplified sleep-wake nuclei states inside [ConsciousnessEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/ConsciousnessEngine.ts). | None. | Postoperative sleep stages are not tracked. The simulator cannot represent sleep debt accumulation, REM sleep rebound, or postoperative sleep apnea exacerbation. |"
    new_dependency_addition = (old_dependency_anchor + "\n"
                               "| **Cerebral Blood Flow Autoregulation** | None. | None. | Cerebral blood flow is not calculated dynamically. MAP-dependent perfusion shifts, uncoupling by volatiles, and CO2 reactivity are unmodeled. |\n"
                               "| **Intracranial Compliance & ICP** | Static MAP-to-ICP estimation stubs. | None. | ICP compliance curves (Monro-Kellie) are absent. The simulator cannot model hematoma mass effect, brain swelling, or herniation. |\n"
                               "| **Cushing's Reflex** | None. | None. | Cushing's triad (hypertension, bradycardia, irregular breathing) under elevated ICP is unmodeled, preventing TBI crisis simulation. |")
    content = content.replace(old_dependency_anchor, new_dependency_addition)

    with open(filepath, 'w') as f:
        f.write(content)
    print("Success: Weaved Chapter 11 Cerebral Physiology into goldenversion.md")

if __name__ == '__main__':
    update_golden_version_ch11()
