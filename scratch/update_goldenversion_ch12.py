import os

def update_golden_version_ch12():
    filepath = 'goldenversion.md'
    if not os.path.exists(filepath):
        print("Error: goldenversion.md not found!")
        return

    with open(filepath, 'r') as f:
        content = f.read()

    # 1. Update Table of Contents (TOC)
    old_toc_57 = "        *   [5.7 Neuromuscular Blockade & Fade (TOF Count)](#57-neuromuscular-blockade--fade-tof-count)"
    new_toc_57 = ("        *   [5.7 Neuromuscular Blockade, Receptor Subtypes & Fade (TOF Count)](#57-neuromuscular-blockade-receptor-subtypes--fade-tof-count)\n"
                  "        *   [5.8 Drug-Drug Synergism, Chelation Reversal & Anticholinesterase ceiling](#58-drug-drug-synergism-chelation-reversal--anticholinesterase-ceiling)")
    content = content.replace(old_toc_57, new_toc_57)

    # Clean up duplicate TOC line if present due to replacement offset
    content = content.replace("        *   [5.8 Drug-Drug Synergism & Chelation Reversal](#58-drug-drug-synergism--chelation-reversal)\n", "")

    old_toc_617 = "    *   [6.17 Severe Traumatic Brain Injury (TBI) & Brain Herniation](#617-severe-traumatic-brain-injury-tbi--brain-herniation)"
    new_toc_617 = ("    *   [6.17 Severe Traumatic Brain Injury (TBI) & Brain Herniation](#617-severe-traumatic-brain-injury-tbi--brain-herniation)\n"
                   "    *   [6.18 Succinylcholine Hyperkalemia & Cardiac Membrane Stabilization](#618-succinylcholine-hyperkalemia--cardiac-membrane-stabilization)\n"
                   "    *   [6.19 Neostigmine Ceiling Effect & Overdose Weakness](#619-neostigmine-ceiling-effect--overdose-weakness)")
    content = content.replace(old_toc_617, new_toc_617)

    # 2. Update Section 5.7 and 5.8 Content
    old_sec_57_58_start = "#### 5.7 Neuromuscular Blockade & Fade (TOF Count)"
    old_sec_59_start = "#### 5.9 Consciousness, Sleep Stages, Memory, & Processed EEG Engine"

    # Find the exact text between 5.7 and 5.9
    start_idx = content.find(old_sec_57_58_start)
    end_idx = content.find(old_sec_59_start)

    if start_idx != -1 and end_idx != -1:
        new_sec_57_58_content = (
            "#### 5.7 Neuromuscular Blockade, Receptor Subtypes & Fade (TOF Count)\n"
            "Neuromuscular blocking agents (NMBAs) block nicotinic acetylcholine receptors ($nAChR$) at the motor endplate. The simulator models three distinct receptor populations representing mature, extrajunctional, and presynaptic sites:\n"
            "*   **Nicotinic Receptor Subtypes**:\n"
            "    1.  *Mature Junctional ($nAChR_{\\text{mature}}$)*: Pentameric structure of $\\alpha_2\\beta\\delta\\epsilon$. Found strictly at the postjunctional endplate crests. Exhibits short channel opening time and high electrical conductance.\n"
            "    2.  *Immature / Extrajunctional Fetal ($nAChR_{\\text{immature}}$)*: Pentameric structure of $\\alpha_2\\beta\\delta\\gamma$. Synthesized in states of denervation, burns, immobility, or severe trauma. Extends across the entire extrajunctional muscle membrane, exhibits long open times (2-10x longer than mature), and low conductance. Additionally, the homopentameric $\\alpha_7$ neuronal subtype is co-expressed, showing high Calcium/Potassium permeability.\n"
            "    3.  *Presynaptic Neuronal ($nAChR_{\\text{presynaptic}}$)*: Pentameric structure of $\\alpha_3\\beta_2$. Facilitates positive-feedback release of acetylcholine during repetitive nerve stimulation.\n"
            "*   **Safety Margin of Neuromuscular Transmission**:\n"
            "    Under normal physiology, there is a large safety buffer. At least $75\\%$ of mature postjunctional receptors must be occupied before twitch height ($T_1$) begins to decline. Full transmission block (TOF twitches $= 0/4$) is reached when mature occupancy exceeds $95\\%$:\n"
            "    *   *Receptor Occupancy ($Occupancy_{\\text{mature}}$)*:\n"
            "        *   If $Occupancy_{\\text{mature}} \\le 0.75$: All 4 twitches present, TOF ratio is $1.0$.\n"
            "        *   If $0.75 < Occupancy_{\\text{mature}} \\le 0.80$: 4 twitches present, muscle response fades (TOF ratio $< 0.90$).\n"
            "        *   If $0.80 < Occupancy_{\\text{mature}} \\le 0.85$: 3 twitches present.\n"
            "        *   If $0.85 < Occupancy_{\\text{mature}} \\le 0.90$: 2 twitches present.\n"
            "        *   If $0.90 < Occupancy_{\\text{mature}} \\le 0.95$: 1 twitch present.\n"
            "        *   If $Occupancy_{\\text{mature}} > 0.95$: 0 twitches present (profound paralysis).\n"
            "*   **Fade Physics (Presynaptic positive feedback)**:\n"
            "    Fade is caused by competitive blockade of presynaptic $\\alpha_3\\beta_2$ receptors, which halts the positive feedback replenishment of acetylcholine:\n"
            "    $$\\text{TOF Ratio} = 1.0 - nAChR_{\\text{presynaptic\\_occupancy}} \\cdot 0.95$$\n"
            "    - *Nondepolarizers (NDMRs)*: Bind competitively to presynaptic receptors, causing immediate dose-dependent fade.\n"
            "    - *Succinylcholine Phase I*: Does not block presynaptic receptors ($nAChR_{\\text{presynaptic\\_occupancy}} = 0$), producing non-fade blockade (TOF ratio $= 1.0$).\n"
            "    - *Succinylcholine Phase II*: Under high cumulative doses ($>4\\text{ mg/kg}$ or $>300\\text{ mg}$), receptors undergo desensitization. The block transitions to exhibit fade:\n"
            "      $$nAChR_{\\text{presynaptic\\_occupancy}} = suxOccupancy \\cdot 0.85$$\n"
            "\n"
            "#### 5.8 Drug-Drug Synergism, Chelation Reversal & Anticholinesterase ceiling\n"
            "*   **MAC-BAR Suppression Synergy (Minto/Greco concept)**:\n"
            "    Opioids shift the concentration curves of volatiles and hypnotics required to suppress the somatic response to pain:\n"
            "    $$MAC_{\\text{BAR,50}} = 1.2 \\cdot e^{-3.0 \\cdot Effect_{\\text{opioid}}} \\quad Hypnotic_{\\text{BAR,50}} = 1.5 \\cdot e^{-3.0 \\cdot Effect_{\\text{opioid}}}$$\n"
            "    $$BAR_{\\text{suppression}} = 1.0 - (1.0 - Effect_{\\text{volatile}}) \\cdot (1.0 - Effect_{\\text{hypnotic}})$$\n"
            "    $$\\text{Surge}_{\\text{sympathetic}} = C_{\\text{cat}} \\cdot (1.0 - BAR_{\\text{suppression}})$$\n"
            "*   **Drug Chelation Reversal (Sugammadex)**:\n"
            "    Sugammadex encapsulates steroidal NMBAs (Rocuronium, Vecuronium) in the plasma ($V_1$), removing active drug molecules from circulation:\n"
            "    $$A_{1,\\text{effective}} = A_{1,\\text{initial}} \\cdot (1 - ChelateRatio)$$\n"
            "    This creates a steep concentration gradient that pulls drug molecules out of the effect-site ($V_e$) and peripheral tissues back into $V_1$ to be cleared, rapidly reversing paralysis.\n"
            "*   **Anticholinesterase Reversal & Ceiling Effect (Neostigmine)**:\n"
            "    Neostigmine inhibits acetylcholinesterase (AChE) to increase synaptic ACh. However, it exhibits a clear ceiling effect at $0.07 - 0.08\\text{ mg/kg}$ ($5.0\\text{ mg}$ total in adults), corresponding to $100\\%$ enzyme inhibition. Higher doses are ineffective at accelerating recovery, and instead cause channel block, causing depolarizing weakness.\n\n"
        )
        content = content[:start_idx] + new_sec_57_58_content + content[end_idx:]
    else:
        print("Error: Could not locate section 5.7/5.8 boundaries!")

    # 3. Add Section 6 Crises Loops
    old_sec_7_chat = "### 7. Attending Direct Chat, Advisor & NLP Engine"
    new_sec_6_additions = (
        "#### 6.18 Succinylcholine Hyperkalemia & Cardiac Membrane Stabilization\n"
        "*   **Trigger Conditions**: Succinylcholine administered in the presence of $nAChR$ upregulation (burns, denervation, hemiplegia, or prolonged immobility; `nAChR_state === 'upregulated'`).\n"
        "*   **Physiological Impact**: Succinylcholine acts as a potent agonist on upregulated extrajunctional $\\alpha_2\\beta\\delta\\gamma$ and $\\alpha_7$ receptors. Due to their long open channel times, a massive intracellular potassium efflux occurs, elevating serum Potassium ($K^+$) by $+5.2\\text{ mEq/L}$ (compared to $+0.5\\text{ mEq/L}$ in normal patients).\n"
        "    - *Cardio-electrophysiologic Arrest Loop*: Unless stabilized, the sudden hyperkalemia ($K^+ > 7.0\\text{ mEq/L}$) alters cardiac resting membrane potentials, triggering peaked T-waves, PR prolongation, QRS widening, sinusoidal waves, and rapid progression to ventricular fibrillation (VFib) or asystole when $K^+ \\ge 8.5\\text{ mEq/L}$.\n"
        "*   **Mitigation / Resolution**:\n"
        "    1.  *Calcium Chloride / Gluconate*: Administer Calcium Chloride ($10-15\\text{ mg/kg}$ or $1\\text{ g}$ IV) to stabilize cardiac cell membranes. Calcium shifts the electrical excitation threshold upward, restoring normal conduction and raising the arrest threshold to $K^+ \\ge 9.0\\text{ mEq/L}$ without reducing serum potassium.\n"
        "    2.  *Potassium Shifts*: Administer Insulin (10 units IV) + Dextrose (50 mL D50W), Sodium Bicarbonate ($50\\text{ mEq}$ IV), or induce hyperventilation ($PaCO_2 = 30-35\\text{ mmHg}$) to drive potassium intracellularly via $Na^+/K^+\\text{-ATPase}$ stimulation.\n"
        "    3.  *Resuscitation*: Standard CPR and defibrillation if VFib occurs.\n"
        "\n"
        "#### 6.19 Neostigmine Ceiling Effect & Overdose Weakness\n"
        "*   **Trigger Conditions**: Neostigmine reversal administered in overdose ($>0.08\\text{ mg/kg}$ or $>5.0\\text{ mg}$ total) or in the absence of active neuromuscular blockade (recovering normally with TOF count $4/4$ and TOF ratio $1.0$).\n"
        "*   **Physiological Impact**: Excessive acetylcholinesterase inhibition allows high concentrations of acetylcholine to accumulate at the motor endplate, triggering depolarizing channel block and nicotinic receptor desensitization. This manifests as muscle weakness (`neostigmineWeakness = true`), which paradoxically reduces the TOF ratio to $<0.90$ and decreases genioglossus tone to $<0.80$, predisposing the patient to upper airway collapse and post-extubation hypoxemia.\n"
        "*   **Mitigation / Resolution**: Avoid neostigmine when TOF ratio is already $>0.90$. Support ventilation, administer oxygen, or wait for neostigmine metabolic clearance (approx $45-60\\text{ minutes}$).\n"
        "\n"
        "### 7. Attending Direct Chat, Advisor & NLP Engine"
    )
    content = content.replace(old_sec_7_chat, new_sec_6_additions)

    # 4. Add Section 8.2 State Tree variables under vitals
    old_state_tree_sjvo2 = "    *   `sjvo2`: `number` (Jugular venous oxygen saturation, %)\n    *   `rso2`: `number` (Regional cerebral oxygen saturation, %)\n"
    new_state_tree_sjvo2 = (
        old_state_tree_sjvo2 +
        "    *   `nAChR_mature_occupancy`: `number` (Occupancy of mature postjunctional receptors)\n"
        "    *   `nAChR_immature_occupancy`: `number` (Occupancy of extrajunctional fetal receptors)\n"
        "    *   `nAChR_presynaptic_occupancy`: `number` (Occupancy of presynaptic receptors)\n"
        "    *   `nmjSafetyMargin`: `number` (Neuromuscular transmission safety factor)\n"
    )
    content = content.replace(old_state_tree_sjvo2, new_state_tree_sjvo2)

    # Add Section 8.2 State Tree variables under patient
    old_state_tree_patient = "    *   `vec3oh`: `number`, `normep`: `number`, `m6g`: `number`, `isSeizure`: `boolean`, `calciumStabilized`: `boolean`, `calciumStabilizedTime`: `number`, `bradycardiaTriggered`: `boolean`, `bradycardiaTime`: `number`, `laryngospasm`: `boolean`, `bronchospasm`: `boolean`, `isBucking`: `boolean`"
    new_state_tree_patient = (
        old_state_tree_patient + "\n"
        "    *   `nAChR_state`: `'normal' | 'upregulated' | 'downregulated'` (Nicotinic receptor expression state)\n"
        "    *   `suxPhaseII`: `boolean` (Active Succinylcholine Phase II block flag)\n"
        "    *   `suxCumulativeDose`: `number` (Cumulative succinylcholine dose, mg)\n"
        "    *   `neostigmineWeakness`: `boolean` (Active Neostigmine-induced muscle weakness flag)"
    )
    content = content.replace(old_state_tree_patient, new_state_tree_patient)

    # 5. Add Section 10 Constraints
    old_constraints = "9.  **Cerebral Steal Approximation**: Steal and Robin Hood effects are modeled as local perfusion resistance offsets in the blood-gas exchange and target oxygenation equations rather than a full 3D vascular network simulation."
    new_constraints = (
        old_constraints + "\n"
        "10. **Neuromuscular Receptor Subtype Simplification**: The three-compartment receptor pool assumes direct proportional equilibrium of effect-site concentration without representing complex multi-step binding kinetics or local synaptic clearance gradients.\n"
        "11. **Phase II Block Threshold**: Transition to Phase II succinylcholine block is modeled as a binary step function based on cumulative dose rather than a continuous transition curve.\n"
    )
    content = content.replace(old_constraints, new_constraints)

    # 6. Add Section 12 Dependency Table
    old_dependency_anchor = "| **Cushing's Reflex** | None. | None. | Cushing's triad (hypertension, bradycardia, irregular breathing) under elevated ICP is unmodeled, preventing TBI crisis simulation. |"
    new_dependency_addition = (
        old_dependency_anchor + "\n"
        "| **Neuromuscular Junction Receptor Subtypes** | Simple occupancy calculations in [usePhysiology.js](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/usePhysiology.js). | None. | No distinction between mature, immature, and presynaptic receptor pools. Safety margin and fade are calculated using postjunctional approximations. |\n"
        "| **Phase II Succinylcholine block** | None. | None. | Succinylcholine exhibits Phase I behavior indefinitely, failing to model fade or desensitization under high/repeated doses. |\n"
        "| **Neostigmine weakness & ceiling** | None. | None. | Neostigmine reverses neuromuscular blockade linearly without a ceiling limit, and does not model depolarizing weakness from overdose. |"
    )
    content = content.replace(old_dependency_anchor, new_dependency_addition)

    with open(filepath, 'w') as f:
        f.write(content)
    print("Success: Weaved Chapter 12 Neuromuscular Physiology into goldenversion.md")

if __name__ == '__main__':
    update_golden_version_ch12()
