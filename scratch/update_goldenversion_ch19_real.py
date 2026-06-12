import os
import requests

def main():
    file_path = "/Users/jsriverab/.gemini/antigravity/scratch/airway-sim/goldenversion.md"
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        return

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. TOC Update - Section 5.12
    old_toc_sec5 = "*   [5.11 High-Fidelity Inhalational Gas Kinetics & Multi-Gas Interactions](#511-high-fidelity-inhalational-gas-kinetics--multi-gas-interactions)"
    new_toc_sec5 = (
        "*   [5.11 High-Fidelity Inhalational Gas Kinetics & Multi-Gas Interactions](#511-high-fidelity-inhalational-gas-kinetics--multi-gas-interactions)\n"
        "    *   [5.12 Molecular Mechanisms of Inhalational Anesthetics](#512-molecular-mechanisms-of-inhalational-anesthetics)"
    )
    if old_toc_sec5 in content:
        content = content.replace(old_toc_sec5, new_toc_sec5)
        print("Updated TOC Section 5 with Section 5.12.")
    else:
        print("Warning: TOC Section 5.11 not found.")

    # 2. TOC Update - Section 6.35 - 6.37
    old_toc_sec6 = "    *   [6.34 Fluid Overload Pulmonary Edema Crisis](#634-fluid-overload-pulmonary-edema-crisis)"
    new_toc_sec6 = (
        "    *   [6.34 Fluid Overload Pulmonary Edema Crisis](#634-fluid-overload-pulmonary-edema-crisis)\n"
        "    *   [6.35 Amnestic Nonimmobilizer (F6) Disassociation Scenario](#635-amnestic-nonimmobilizer-f6-disassociation-scenario)\n"
        "    *   [6.36 K2P (TASK/TREK) Channel Knockout Anesthetic Resistance](#636-k2p-tasktrek-channel-knockout-anesthetic-resistance)\n"
        "    *   [6.37 Xenon & Sevoflurane TREK-1 Mediated Neuroprotection](#637-xenon--sevoflurane-trek-1-mediated-neuroprotection)"
    )
    if old_toc_sec6 in content:
        content = content.replace(old_toc_sec6, new_toc_sec6)
        print("Updated TOC Section 6 with new scenarios.")
    else:
        print("Warning: TOC Section 6.34 not found.")

    # 3. Section 5.12 Body Insert
    target_section_512 = (
        "### 6. Event Trigger, Clinical Scenarios & Workflow Engine"
    )
    new_section_512 = (
        "#### 5.12 Molecular Mechanisms of Inhalational Anesthetics\n\n"
        "The pharmacology of inhaled anesthetics represents a composite, multi-target cellular and network model. Rather than perturbing bulk lipid membrane structures (as posited by the original lipid-elution or non-specific lipid theory), general anesthetics bind directly to specific amphiphilic cavities in critical neuronal signaling proteins. This is proven by the enantiomeric stereoselectivity of chiral anesthetics (e.g. S-isoflurane being more potent than R-isoflurane) and the distinct receptor profile of nonimmobilizers like F6.\n\n"
        "1.  **GABA-A Receptor Potentiation (Sedation, Hypnosis, and Amnesia)**:\n"
        "    Volatile anesthetics (Isoflurane, Sevoflurane, Desflurane, Halothane) directly potentiate $\\gamma$-aminobutyric acid type A ($GABA_A$) receptors.\n"
        "    - *Synaptic IPSC Prolongation*: Potentiation slows the decay rate of inhibitory postsynaptic currents (IPSCs) postsynaptically, lengthening synaptic inhibition.\n"
        "    - *Extrasynaptic Tone*: Volatiles enhance tonic currents at extrasynaptic GABA-A receptors, hyperpolarizing neurons.\n"
        "    - *Presynaptic Facilitation*: Volatiles increase the basal release of GABA from presynaptic terminals.\n"
        "    - *Subtype Specialization*:\n"
        "      - $\\alpha_1$-containing subtypes (abundantly expressed in the cortex and thalamus) mediate the sedative and hypnotic (unconsciousness) components.\n"
        "      - $\\alpha_5$-containing subtypes (expressed in the hippocampus) and $\\alpha_4$-containing subtypes (dentate gyrus/thalamus) mediate retrograde amnesia.\n"
        "    - *Gaseous Exceptions*: Nitrous oxide and Xenon do NOT modulate GABA-A receptors, indicating a distinct substate pathway.\n\n"
        "2.  **Glycine Receptor Potentiation (Immobility)**:\n"
        "    Volatile anesthetics enhance Glycine receptors postsynaptically in the spinal cord.\n"
        "    - Glycine is the primary inhibitory neurotransmitter in the spinal cord and brainstem.\n"
        "    - Potentiation of glycine receptors containing the $\\alpha_1$-subunit suppresses motor efferent outputs from the ventral horn (nocifensive withdrawal reflex arc), mediating the immobility component of anesthesia (measured by MAC).\n"
        "    - Barbiturates and gaseous agents have negligible effects on glycine receptors.\n\n"
        "3.  **Two-Pore-Domain Potassium Channel (K2P) Activation (Hyperpolarization)**:\n"
        "    Both volatile and gaseous agents directly activate leak potassium channels ($K_{2P}$), specifically the TASK-1, TASK-3, and TREK-1 subfamilies.\n"
        "    - Activation increases $K^+$ conductance, hyperpolarizing resting membrane potentials and reducing neuronal excitability.\n"
        "    - Knockout of TASK-1, TASK-3, or TREK-1 reduces sensitivity to volatile anesthetics, increasing MAC.\n"
        "    - Halothane-induced atropine-sensitive Type II $\\theta$-rhythm (4-12 Hz) slowing/potentiation requires the presence of TASK-3 channels.\n"
        "    - TREK-1 activation mediates the neuroprotective preconditioning effects of Sevoflurane and Xenon during ischemic insult.\n\n"
        "4.  **Glutamate Receptor Inhibition (Excitatory Suppression)**:\n"
        "    Anesthetics suppress excitatory glutamatergic transmission postsynaptically and presynaptically.\n"
        "    - *NMDA Blockade*: Gaseous anesthetics (Nitrous oxide and Xenon) are potent antagonists of N-methyl-D-aspartate ($NMDA$) receptors. They compete with co-agonists (Glycine at the GluN1 site and Glutamate at the GluN2 site) to block calcium influx. Volatiles also inhibit NMDA receptors, contributing to unconsciousness and amnesia.\n"
        "    - *AMPA/Kainate Receptors*: Volatiles weakly inhibit $\\alpha$-amino-3-hydroxy-5-methyl-4-isoxazolepropionic acid ($AMPA$) receptors, but paradoxically enhance kainate receptors.\n"
        "    - *Presynaptic Release Inhibition*: Volatiles reduce presynaptic glutamate release from excitatory terminals by blocking presynaptic voltage-gated sodium and calcium channels.\n\n"
        "5.  **HCN Pacemaker Current Inhibition (Integrative Functions)**:\n"
        "    Volatiles inhibit hyperpolarization-activated cyclic nucleotide-gated ($HCN1$ and $HCN2$) channels, reducing the hyperpolarization-activated pacemaker current ($I_h$).\n"
        "    - This slows spontaneous neuronal firing and dendritic integration.\n"
        "    - Selective forebrain knockout of HCN1 blunts the hypnotic sensitivity of volatile anesthetics.\n\n"
        "6.  **Voltage-Gated Sodium Channel Blockade (Presynaptic Release)**:\n"
        "    Volatiles inhibit major mammalian voltage-gated sodium channel ($Na^+$) isoforms, including neuronal ($Nav1.2$, $Nav1.6$) and presynaptic terminal sodium channels.\n"
        "    - This blockade reduces the amplitude of action potentials arriving at synaptic terminals, suppressing presynaptic calcium influx and subsequent glutamate release.\n"
        "    - Enhancers of $Na^+$ channel activity (e.g. veratridine) oppose anesthetic action (increases MAC), whereas inhibitors (e.g. tetrodotoxin) reduce MAC.\n\n"
        "7.  **Nicotinic Acetylcholine Receptor Blockade (Amnesia)**:\n"
        "    Neuronal nicotinic acetylcholine receptors ($nnAChR$, specifically the $\\alpha_4\\beta_2$ and $\\alpha_7$ pentamers) are highly sensitive to volatiles, being inhibited at sub-MAC concentrations ($<0.25\\text{ MAC}$).\n"
        "    - Blockade of central nnAChRs disrupts cholinergic neurotransmission in ascending arousal pathways, contributing to anterograde amnesia.\n\n"
        "8.  **Receptor Profile Discrimination: F6 vs. F3**:\n"
        "    - **F6 (1,2-dichlorohexafluorocyclobutane)**: An amnestic nonimmobilizer. It does NOT produce immobility or sedation (does not affect MAC, does not affect GABA-A, glycine, or Na+ channels), but it DOES produce amnesia by selectively inhibiting neuronal nicotinic, M1 muscarinic, 5-HT2C, and mGluR5 receptors.\n"
        "    - **F3 (1-chloro-1,2,2-trifluorocyclobutane)**: A volatile anesthetic. It produces immobility, sedation, and amnesia by modulating GABA-A, glycine, AMPA, kainate, 5-HT3, nicotinic, and Na+ channels.\n\n"
        "---\n\n"
    )
    if target_section_512 in content:
        content = content.replace(target_section_512, new_section_512 + target_section_512)
        print("Inserted Section 5.12 body before Chapter 6.")
    else:
        print("Warning: Chapter 6 section header not found.")

    # 4. Medication Table Update
    old_med_table_end = "| **Solriamfetol** | Dopamine-Norepinephrine Reuptake Inhibitor | $V_1: 18.00\\text{ L}$<br>$k_{10}: 0.05$<br>$ke_0: 1.2$ | $EC_{50}: 4.0\\text{ ng/mL}$<br>$\\gamma: 1.2$ | Selective DAT/NET inhibitor. Excites VTA/AAS, promoting wakefulness. | Mild tachycardia, hypertension, palpitations. |"
    new_med_table_end = (
        "| **Solriamfetol** | Dopamine-Norepinephrine Reuptake Inhibitor | $V_1: 18.00\\text{ L}$<br>$k_{10}: 0.05$<br>$ke_0: 1.2$ | $EC_{50}: 4.0\\text{ ng/mL}$<br>$\\gamma: 1.2$ | Selective DAT/NET inhibitor. Excites VTA/AAS, promoting wakefulness. | Mild tachycardia, hypertension, palpitations. |\n"
        "| **F6 (Nonimmobilizer)** | Cyclobutane / Nonimmobilizer | $V_1: 10.00\\text{ L}$<br>$k_{10}: 0.15$<br>$ke_0: 1.0$ | $EC_{50}: 2.0\\text{ vol\\%}$<br>$\\gamma: 1.5$ | Selective amnesic cyclobutane. Blocks learning/fear memory. | Does NOT cause sedation, hypnosis, or immobility (no effect on MAC). |\n"
        "| **F3 (Anesthetic)** | Halogenated Cyclobutane | $V_1: 10.00\\text{ L}$<br>$k_{10}: 0.10$<br>$ke_0: 0.8$ | $EC_{50}: 1.2\\text{ vol\\%}$<br>$\\gamma: 2.5$ | Volatile anesthetic. Produces immobility, sedation, and amnesia. | Vasodilation, cardiodepression, and respiratory depression. |\n"
        "| **S-Isoflurane** | Chiral Volatile (Active) | $V_1: 1.40\\text{ L}$<br>$k_{10}: 0.08$<br>$ke_0: 0.8$ | $EC_{50}: 0.9\\text{ vol\\%}$<br>$\\gamma: 2.0$ | Active enantiomer of Isoflurane. High-affinity binding to proteins. | More potent vasodilation, bradycardia, and sedation. |\n"
        "| **R-Isoflurane** | Chiral Volatile (Less Active) | $V_1: 1.40\\text{ L}$<br>$k_{10}: 0.08$<br>$ke_0: 0.8$ | $EC_{50}: 1.8\\text{ vol\\%}$<br>$\\gamma: 2.0$ | Less active enantiomer of Isoflurane. Lower-affinity protein binding. | Requires twice the dose of S-enantiomer for same clinical effect. |"
    )
    if old_med_table_end in content:
        content = content.replace(old_med_table_end, new_med_table_end)
        print("Updated Medication Data Table.")
    else:
        print("Warning: Medication table end target not found.")

    # 5. Section 6 Body Update (adding 6.35 - 6.37)
    old_body_section6 = (
        "*   **Resolution Criteria**: Requires urgent loop diuretic therapy (Furosemide) or renal replacement therapy to remove excess volume, combined with positive airway pressure (PEEP/CPAP) to recruit flooded alveoli.\n\n"
        "### 7. Attending Direct Chat, Advisor & NLP Engine"
    )
    new_body_section6 = (
        "*   **Resolution Criteria**: Requires urgent loop diuretic therapy (Furosemide) or renal replacement therapy to remove excess volume, combined with positive airway pressure (PEEP/CPAP) to recruit flooded alveoli.\n\n"
        "#### 6.35 Amnestic Nonimmobilizer (F6) Disassociation Scenario\n"
        "*   **Trigger Conditions**: Administration of F6 (nonimmobilizer cyclobutane).\n"
        "*   **Physiological Impact**: F6 selectively blocks memory encoding without causing immobility or sedation:\n"
        "    - Inhibits episodic memory formation (`explicitEncoding = 0` and `fearConditioning = 0`).\n"
        "    - Does NOT affect MAC (displayed MAC is unaffected by F6).\n"
        "    - Does NOT cause sedation or loss of consciousness (BIS remains at wake baseline $\\ge 95$).\n"
        "*   **Resolution Criteria**: Discontinuation and clearance of F6.\n\n"
        "#### 6.36 K2P (TASK/TREK) Channel Knockout Anesthetic Resistance\n"
        "*   **Trigger Conditions**: Setting `isTASK1Knockout`, `isTASK3Knockout`, or `isTREK1Knockout` to true.\n"
        "*   **Physiological Impact**: Mutated animals lack leak potassium currents that mediate anesthetic hyperpolarization:\n"
        "    - Reduces sensitivity to the immobilizing action of volatiles, requiring $1.3-2.5\\text{x}$ higher concentrations to prevent movement (increases MAC).\n"
        "    - In `isTASK3Knockout === true`, halothane-induced atropine-sensitive slow-wave $\\theta$-oscillatory rhythms disappear.\n"
        "*   **Resolution Criteria**: Maintain higher anesthetic concentrations (dialed volatile agent) to overcome receptor-level resistance.\n\n"
        "#### 6.37 Xenon & Sevoflurane TREK-1 Mediated Neuroprotection\n"
        "*   **Trigger Conditions**: Active administration of Xenon or Sevoflurane in a patient with focal cerebral ischemia (`hasCerebralIschemia === true`) and `isTREK1Knockout === false`.\n"
        "*   **Physiological Impact**: Selective activation of TREK-1 leak channels hyperpolarizes neurons, preventing calcium overload and glutamate excitotoxicity:\n"
        "    - Reduces ischemic stunning accumulation rate by $50\\%$:\n"
        "      $$\\text{StunningRate} = \\max\\left(0, \\frac{MVO_2 - Supply_{\\text{myo}}}{10000} \\cdot 0.381\\right) \\cdot 0.5$$\n"
        "*   **Resolution Criteria**: Ischemic event resolves, or anesthetic agent washed out.\n\n"
        "### 7. Attending Direct Chat, Advisor & NLP Engine"
    )
    if old_body_section6 in content:
        content = content.replace(old_body_section6, new_body_section6)
        print("Updated Section 6 scenarios in body.")
    else:
        print("Warning: Section 6 body target not found.")

    # 6. Section 8 State Tree Update (vitals)
    old_state_vitals = "*   `slowOscillationPower`: `number` (Delta slow-wave power 0.0-10.0)"
    new_state_vitals = (
        "*   `gabaa_occupancy`: `number` (Sedation & hypnosis receptor state)\n"
        "*   `glycine_occupancy`: `number` (Spinal cord motor immobility receptor state)\n"
        "*   `k2p_activation`: `number` (Leak potassium hyperpolarization state)\n"
        "*   `nmda_blockade`: `number` (NMDA receptor inhibition state)\n"
        "*   `hcn_inhibition`: `number` (HCN pacemaker current inhibition state)\n"
        "*   `nav_blockade`: `number` (Voltage-gated sodium channel inhibition state)\n"
        "*   `nachr_inhibition`: `number` (Nicotinic AChR inhibition state)\n"
        "*   `isF6Active`: `boolean` (Amnestic nonimmobilizer active flag)\n"
        "*   `isF3Active`: `boolean` (Anesthetic cyclobutane active flag)\n"
        "*   `isTASK1Knockout`: `boolean` (TASK-1 gene knockout comorbidity)\n"
        "*   `isTASK3Knockout`: `boolean` (TASK-3 gene knockout comorbidity)\n"
        "*   `isTREK1Knockout`: `boolean` (TREK-1 gene knockout comorbidity)\n"
        "*   `isHCN1Knockout`: `boolean` (HCN1 forebrain knockout comorbidity)\n"
        "*   `slowOscillationPower`: `number` (Delta slow-wave power 0.0-10.0)"
    )
    if old_state_vitals in content:
        content = content.replace(old_state_vitals, new_state_vitals)
        print("Updated Section 8 vitals with molecular variables.")
    else:
        print("Warning: Section 8 vitals target not found.")

    # 7. Section 12 Architectural Dependency Analysis Table Update
    old_dep_row = "| **Volatile Gas Kinetics & Second Gas Effect** | Alveolar gas concentration ($F_A$) models multi-gas interaction for the concentration and second gas effects. Dynamic solubility-based tissue partition coefficients ($\\lambda_{fg}$) are calculated from oil-gas partition values. Diffusion hypoxia dilution occurs on room air when N2O is stopped. | None. | Alveolar gas kinetics are independent of co-administered gas uptake; partition coefficients are static constants; diffusion hypoxia and FRC oxygen buffer dilution are unmodeled. |"
    new_dep_row = (
        "| **Volatile Gas Kinetics & Second Gas Effect** | Alveolar gas concentration ($F_A$) models multi-gas interaction for the concentration and second gas effects. Dynamic solubility-based tissue partition coefficients ($\\lambda_{fg}$) are calculated from oil-gas partition values. Diffusion hypoxia dilution occurs on room air when N2O is stopped. | None. | Alveolar gas kinetics are independent of co-administered gas uptake; partition coefficients are static constants; diffusion hypoxia and FRC oxygen buffer dilution are unmodeled. |\n"
        "| **Inhaled Anesthetics Molecular Targets** | Receptors (GABA-A, Glycine, NMDA, K2P, HCN, Na+ channels, nAChRs) drive target occupancies. Supports genetic knockouts (TASK-1/3, TREK-1, HCN1) and nonimmobilizers (F6). | None. | Molecular target binding occupancies are unmodeled; MAC and sedative values are aggregated without detailed receptor-level pathway modeling. |"
    )
    if old_dep_row in content:
        content = content.replace(old_dep_row, new_dep_row)
        print("Updated Section 12 Dependency Table.")
    else:
        print("Warning: Section 12 dependency row not found.")

    # Save the updated goldenversion.md
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Successfully wrote updated goldenversion.md.")

if __name__ == "__main__":
    main()
