import os
import requests

def main():
    file_path = "/Users/jsriverab/.gemini/antigravity/scratch/airway-sim/goldenversion.md"
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        return

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. TOC Update for Section 5.3
    old_toc_53 = "*   [5.3 Flow-Dependent Clearance & Distribution Autoregulation](#53-flow-dependent-clearance--distribution-autoregulation)"
    new_toc_53 = "*   [5.3 Flow-Dependent Clearance, Distribution Autoregulation & Front-End Recirculatory Kinetics](#53-flow-dependent-clearance-distribution-autoregulation--front-end-recirculatory-kinetics)"
    if old_toc_53 in content:
        content = content.replace(old_toc_53, new_toc_53)
        print("Updated TOC Section 5.3.")
    else:
        print("Warning: TOC Section 5.3 target not found.")

    # 2. TOC Update for Section 5.8
    old_toc_58 = "*   [5.8 Drug-Drug Synergism, Chelation Reversal & Anticholinesterase ceiling](#58-drug-drug-synergism-chelation-reversal--anticholinesterase-ceiling)"
    new_toc_58 = "*   [5.8 Drug-Drug Synergism, Chelation Reversal, Anticholinesterase ceiling, & Back-End CSHT decrement curves](#58-drug-drug-synergism-chelation-reversal-anticholinesterase-ceiling--back-end-csht-decrement-curves)"
    if old_toc_58 in content:
        content = content.replace(old_toc_58, new_toc_58)
        print("Updated TOC Section 5.8.")
    else:
        print("Warning: TOC Section 5.8 target not found.")

    # 3. Section 5.3 Body Update
    old_body_53 = (
        "#### 5.3 Flow-Dependent Clearance & Distribution Autoregulation\n"
        "*   **Cardiac Output Scaling Modifier ($coMod$)**:\n"
        "    $$coMod = \\max\\left(0, 1.0 + (\\text{CoRatio} - 1.0) \\cdot CoSensitivity\\right) \\quad \\text{where } \\text{CoRatio} = \\frac{CO_{\\text{current}}}{CO_{\\text{baseline}}}$$\n"
        "    *   *Autoregulated Rates*: $k_{10} = k_{10,\\text{baseline}} \\cdot coMod$, $k_{12} = k_{12,\\text{baseline}} \\cdot coMod$, $k_{13} = k_{13,\\text{baseline}} \\cdot coMod$.\n"
        "*   **Effect-Site Equilibration ($ke_0$) Autoregulation**:\n"
        "    Cerebral autoregulation maintains brain perfusion until severe shock occurs. For sedatives and opioids, $ke_0$ scales as:\n"
        "    $$ke_0 = ke_{0,\\text{baseline}} \\cdot \\text{BrainFlowMod} \\quad \\text{where } \\text{BrainFlowMod} = \\begin{cases} \\text{CoRatio} \\cdot 2 & \\text{if } \\text{CoRatio} < 0.5 \\\\ 1.0 & \\text{otherwise} \\end{cases}$$\n"
        "    For other peripheral drugs (e.g. paralytics, vasopressors), onset delays linearly with perfusion:\n"
        "    $$ke_0 = ke_{0,\\text{baseline}} \\cdot \\max(0.1, \\text{CoRatio})$$"
    )
    new_body_53 = (
        "#### 5.3 Flow-Dependent Clearance, Distribution Autoregulation & Front-End Recirculatory Kinetics\n"
        "*   **Cardiac Output Scaling Modifier ($coMod$)**:\n"
        "    $$coMod = \\max\\left(0, 1.0 + (\\text{CoRatio} - 1.0) \\cdot CoSensitivity\\right) \\quad \\text{where } \\text{CoRatio} = \\frac{CO_{\\text{current}}}{CO_{\\text{baseline}}}$$\n"
        "    *   *Autoregulated Rates*: $k_{10} = k_{10,\\text{baseline}} \\cdot coMod$, $k_{12} = k_{12,\\text{baseline}} \\cdot coMod$, $k_{13} = k_{13,\\text{baseline}} \\cdot coMod$.\n"
        "*   **Effect-Site Equilibration ($ke_0$) Autoregulation**:\n"
        "    Cerebral autoregulation maintains brain perfusion until severe shock occurs. For sedatives and opioids, $ke_0$ scales as:\n"
        "    $$ke_0 = ke_{0,\\text{baseline}} \\cdot \\text{BrainFlowMod} \\quad \\text{where } \\text{BrainFlowMod} = \\begin{cases} \\text{CoRatio} \\cdot 2 & \\text{if } \\text{CoRatio} < 0.5 \\\\ 1.0 & \\text{otherwise} \\end{cases}$$\n"
        "    For other peripheral drugs (e.g. paralytics, vasopressors), onset delays linearly with perfusion:\n"
        "    $$ke_0 = ke_{0,\\text{baseline}} \\cdot \\max(0.1, \\text{CoRatio})$$\n"
        "*   **Front-End Recirculatory Volume ($dynamicV_1$)**:\n"
        "    To model how low cardiac output states reduce mixing volume and elevate peak concentrations, the central volume $V_1$ scales dynamically:\n"
        "    $$dynamicV_1 = \\max\\left(0.1, V_1 \\cdot v_1VolumeRatio \\cdot (0.6 + 0.4 \\cdot coRatio)\\right)$$\n"
        "    where $v_1VolumeRatio$ is the ratio of current blood volume to baseline estimated blood volume, and $coRatio$ is the ratio of current cardiac output to baseline."
    )
    if old_body_53 in content:
        content = content.replace(old_body_53, new_body_53)
        print("Updated Section 5.3 Body.")
    else:
        print("Warning: Section 5.3 Body target not found.")

    # 4. Section 5.8 Body Update
    old_body_58 = (
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
        "    Neostigmine inhibits acetylcholinesterase (AChE) to increase synaptic ACh. However, it exhibits a clear ceiling effect at $0.07 - 0.08\\text{ mg/kg}$ ($5.0\\text{ mg}$ total in adults), corresponding to $100\\%$ enzyme inhibition. Higher doses are ineffective at accelerating recovery, and instead cause channel block, causing depolarizing weakness."
    )
    new_body_58 = (
        "#### 5.8 Drug-Drug Synergism, Chelation Reversal, Anticholinesterase ceiling, & Back-End CSHT decrement curves\n"
        "*   **MAC-BAR Suppression Synergy (Minto/Greco concept)**:\n"
        "    Opioids shift the concentration curves of volatiles and hypnotics required to suppress the somatic response to pain:\n"
        "    $$MAC_{\\text{BAR,50}} = 1.2 \\cdot e^{-3.0 \\cdot Effect_{\\text{opioid}}} \\quad Hypnotic_{\\text{BAR,50}} = 1.5 \\cdot e^{-3.0 \\cdot Effect_{\\text{opioid}}}$$\n"
        "    $$BAR_{\\text{suppression}} = 1.0 - (1.0 - Effect_{\\text{volatile}}) \\cdot (1.0 - Effect_{\\text{hypnotic}})$$\n"
        "    $$\\text{Surge}_{\\text{sympathetic}} = C_{\\text{cat}} \\cdot (1.0 - BAR_{\\text{suppression}})$$\n"
        "*   **GABA-Opioid Synergistic Hypnosis (Inward-Bowing Isoboles)**:\n"
        "    Instead of simple independent probability, the simulator models GABA-opioid synergistic hypnosis (inward-bowing isoboles representing Figure 18.30) for processed EEG metrics (BIS and SEF95):\n"
        "    $$aggregateHypnosis = \\min\\left(1.0, sedativeEff + opioidEff + 1.8 \\cdot sedativeEff \\cdot opioidEff\\right)$$\n"
        "*   **Back-End Decrement Times / Context-Sensitive Half-Times (CSHT)**:\n"
        "    Cumulative active infusion durations ($t_{\\text{inf}}$ in minutes) are tracked continuously. Context-sensitive half-times (CSHT, in minutes) are calculated at runtime using empirical rational fits matching Figure 18.16:\n"
        "    - *Remifentanil*: $CSHT = 3.5\\text{ minutes}$ (constant/context-insensitive due to blood/tissue esterase clearance).\n"
        "    - *Propofol*: $CSHT = 3.0 + 37.0 \\cdot \\frac{t_{\\text{inf}}}{t_{\\text{inf}} + 80.0}\\text{ minutes}$\n"
        "    - *Fentanyl*: $CSHT = 5.0 + 300.0 \\cdot \\frac{t_{\\text{inf}}^{1.2}}{t_{\\text{inf}}^{1.2} + 120.0}\\text{ minutes}$\n"
        "    - *Sufentanil*: $CSHT = 4.0 + 80.0 \\cdot \\frac{t_{\\text{inf}}}{t_{\\text{inf}} + 240.0}\\text{ minutes}$\n"
        "    - *Midazolam*: $CSHT = 5.0 + 150.0 \\cdot \\frac{t_{\\text{inf}}}{t_{\\text{inf}} + 180.0}\\text{ minutes}$\n"
        "*   **Drug Chelation Reversal (Sugammadex)**:\n"
        "    Sugammadex encapsulates steroidal NMBAs (Rocuronium, Vecuronium) in the plasma ($V_1$), removing active drug molecules from circulation:\n"
        "    $$A_{1,\\text{effective}} = A_{1,\\text{initial}} \\cdot (1 - ChelateRatio)$$\n"
        "    This creates a steep concentration gradient that pulls drug molecules out of the effect-site ($V_e$) and peripheral tissues back into $V_1$ to be cleared, rapidly reversing paralysis.\n"
        "*   **Anticholinesterase Reversal & Ceiling Effect (Neostigmine)**:\n"
        "    Neostigmine inhibits acetylcholinesterase (AChE) to increase synaptic ACh. However, it exhibits a clear ceiling effect at $0.07 - 0.08\\text{ mg/kg}$ ($5.0\\text{ mg}$ total in adults), corresponding to $100\\%$ enzyme inhibition. Higher doses are ineffective at accelerating recovery, and instead cause channel block, causing depolarizing weakness."
    )
    if old_body_58 in content:
        content = content.replace(old_body_58, new_body_58)
        print("Updated Section 5.8 Body.")
    else:
        print("Warning: Section 5.8 Body target not found.")

    # 5. Section 8 State Tree Update
    old_state_activemeds = "*   `activeMeds`: `PKPDModel[]` (Instantiated pharmacology models tracking compartment amounts $A_1, A_2, A_3$ and effect site $C_e$ values)."
    new_state_activemeds = "*   `activeMeds`: `PKPDModel[]` (Instantiated pharmacology models tracking compartment amounts $A_1, A_2, A_3$, effect site $C_e$, plasma concentration $C_p$, dynamic central volume `dynamicV1`, active infusion duration `infusionDurationSeconds`, and context-sensitive half-times `csht`)."
    if old_state_activemeds in content:
        content = content.replace(old_state_activemeds, new_state_activemeds)
        print("Updated Section 8 activeMeds.")
    else:
        print("Warning: Section 8 activeMeds target not found.")

    # 6. Section 12 Dependency Table Update
    old_dep_row = "| **KDIGO AKI Staging & Diuresis** | Staging is computed dynamically from creatinine ratios and oliguria/anuria timers. Loop diuretics (Furosemide) and osmotic agents (Mannitol) stimulate diuresis in [RenalEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/RenalEngine.ts). | None. | AKI staging is unmodeled; UOP does not scale with GFR or diuretics. |"
    new_dep_row = (
        "| **KDIGO AKI Staging & Diuresis** | Staging is computed dynamically from creatinine ratios and oliguria/anuria timers. Loop diuretics (Furosemide) and osmotic agents (Mannitol) stimulate diuresis in [RenalEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/RenalEngine.ts). | None. | AKI staging is unmodeled; UOP does not scale with GFR or diuretics. |\n"
        "| **Front-End & Back-End Kinetics** | Dynamic V1 scaling is driven by cardiac output and blood volume ratios; cumulative active infusion time is tracked in seconds to calculate context-sensitive half-times (CSHT) in [PKPDEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/PKPDEngine.ts). | None. | Central volume V1 is constant (or scales only with hemodilution); infusion durations and context-sensitive half-times are unmodeled. |\n"
        "| **GABA-Opioid Synergistic Hypnosis** | Sedative and opioid effects are combined synergistically using an inward-bowing isobologram interaction formula to calculate aggregate hypnosis in [usePhysiology.js](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/usePhysiology.js). | None. | Medication hypnosis levels are combined using an independent probability formula. |"
    )
    if old_dep_row in content:
        content = content.replace(old_dep_row, new_dep_row)
        print("Updated Section 12 Dependency Table.")
    else:
        print("Warning: Section 12 target not found.")

    # Save the updated goldenversion.md
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Successfully wrote updated goldenversion.md.")

    # 7. Send HTTP POST request to update-goldenversion
    url = "http://localhost:9091/update-goldenversion"
    try:
        response = requests.post(url, json={"markdownContent": content}, timeout=5)
        print(f"POST response: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Failed to send POST request: {e} (This is normal if the server is offline; local file has been successfully written).")

if __name__ == "__main__":
    main()
