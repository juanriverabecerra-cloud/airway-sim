import os
import requests

def main():
    file_path = "/Users/jsriverab/.gemini/antigravity/scratch/airway-sim/goldenversion.md"
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        return

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. TOC Update
    old_toc = "*   [5.10 High-Fidelity Medication Data Table](#510-high-fidelity-medication-data-table)"
    new_toc = (
        "*   [5.10 High-Fidelity Medication Data Table](#510-high-fidelity-medication-data-table)\n"
        "    *   [5.11 High-Fidelity Inhalational Gas Kinetics & Multi-Gas Interactions](#511-high-fidelity-inhalational-gas-kinetics--multi-gas-interactions)"
    )
    if old_toc in content:
        content = content.replace(old_toc, new_toc)
        print("Updated TOC with Section 5.11.")
    else:
        print("Warning: TOC Section 5.10 target not found.")

    # 2. Section 5.11 Body Insert
    target_section = "### 6. Event Trigger, Clinical Scenarios & Workflow Engine"
    new_section_511 = (
        "#### 5.11 High-Fidelity Inhalational Gas Kinetics & Multi-Gas Interactions\n\n"
        "*   **Solubility and Partition Coefficients**:\n"
        "    The simulator uses agent-specific blood-gas ($\\lambda_{bg}$) and oil-gas ($\\lambda_{og}$) partition coefficients to model pharmacokinetic distribution. The fat-blood partition coefficient ($\\lambda_{fg}$) is calculated dynamically:\n"
        "    $$\\lambda_{fg} = \\frac{\\lambda_{og}}{\\lambda_{bg}}$$\n"
        "    - Sevoflurane: $\\lambda_{bg} = 0.65, \\lambda_{og} = 47.0 \\rightarrow \\lambda_{fg} \\approx 72.3$\n"
        "    - Desflurane: $\\lambda_{bg} = 0.45, \\lambda_{og} = 19.0 \\rightarrow \\lambda_{fg} \\approx 42.2$\n"
        "    - Isoflurane: $\\lambda_{bg} = 1.4, \\lambda_{og} = 98.0 \\rightarrow \\lambda_{fg} \\approx 70.0$\n"
        "    - Halothane: $\\lambda_{bg} = 2.4, \\lambda_{og} = 224.0 \\rightarrow \\lambda_{fg} \\approx 93.3$\n"
        "    - Nitrous Oxide ($N_2O$): $\\lambda_{bg} = 0.47, \\lambda_{og} = 1.4 \\rightarrow \\lambda_{fg} \\approx 2.98$\n"
        "    - Xenon: $\\lambda_{bg} = 0.115, \\lambda_{og} = 1.9 \\rightarrow \\lambda_{fg} \\approx 16.5$\n\n"
        "*   **Alveolar Concentration ($F_A$) and Multi-Gas Interactions**:\n"
        "    The wash-in of inhalational anesthetics is modeled by updating the alveolar fraction ($F_{A,j}$) for each gas $j$ at every second. This incorporates fresh gas flows, alveolar ventilation ($\\dot{V}_A$), lung volume ($V_{FRC}$), and uptake into pulmonary blood ($\\text{Uptake}_j$). To model the **Concentration Effect** and **Second Gas Effect** without code inflation, the alveolar mass-balance equation is modified by the co-administered gas shrinkage rate:\n"
        "    $$\\text{dFa}_j = \\frac{\\dot{V}_A \\cdot (F_{I,j} - F_{A,j}) - \\text{Uptake}_j + \\left(\\sum_k \\text{Uptake}_k\\right) \\cdot F_{I,j}}{V_{FRC}}$$\n"
        "    where $\\sum_k \\text{Uptake}_k$ represents the total volumetric uptake rate (in L/sec) of all active gases (specifically Nitrous Oxide accelerating the uptake of volatile agents co-administered with it).\n\n"
        "*   **Diffusion Hypoxia (Fink Effect) and Washout Kinetics**:\n"
        "    When Nitrous Oxide administration is stopped, the high solubility and high volume of N2O dissolved in blood causes it to rapidly diffuse out of pulmonary capillaries back into the alveoli ($\\text{Uptake}_{N_2O} < 0$). This dilutes all other alveolar gases:\n"
        "    $$\\text{O2Buffer} -= \\left(\\frac{\\text{O2Buffer}}{FRC_{\\text{recruited}}}\\right) \\cdot (-\\text{Uptake}_{N_2O}) \\cdot dt$$\n"
        "    If the patient is left breathing room air ($FiO_2 = 21\\%$), this alveolar oxygen dilution reduces $PaO_2$ and causes rapid desaturation ($SpO_2 < 90\\%$). This is prevented or reversed by increasing inspired oxygen ($FiO_2 = 100\\%$), which over-saturates the remaining gas volume.\n\n"
    )
    if target_section in content:
        content = content.replace(target_section, new_section_511 + target_section)
        print("Inserted Section 5.11 body before Chapter 6.")
    else:
        print("Warning: Chapter 6 section header not found.")

    # 3. Section 12 Dependency Table Update
    old_dep_row = "| **GABA-Opioid Synergistic Hypnosis** | Sedative and opioid effects are combined synergistically using an inward-bowing isobologram interaction formula to calculate aggregate hypnosis in [usePhysiology.js](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/usePhysiology.js). | None. | Medication hypnosis levels are combined using an independent probability formula. |"
    new_dep_row = (
        "| **GABA-Opioid Synergistic Hypnosis** | Sedative and opioid effects are combined synergistically using an inward-bowing isobologram interaction formula to calculate aggregate hypnosis in [usePhysiology.js](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/usePhysiology.js). | None. | Medication hypnosis levels are combined using an independent probability formula. |\n"
        "| **Volatile Gas Kinetics & Second Gas Effect** | Alveolar gas concentration ($F_A$) models multi-gas interaction for the concentration and second gas effects. Dynamic solubility-based tissue partition coefficients ($\\lambda_{fg}$) are calculated from oil-gas partition values. Diffusion hypoxia dilution occurs on room air when N2O is stopped. | None. | Alveolar gas kinetics are independent of co-administered gas uptake; partition coefficients are static constants; diffusion hypoxia and FRC oxygen buffer dilution are unmodeled. |"
    )
    if old_dep_row in content:
        content = content.replace(old_dep_row, new_dep_row)
        print("Updated Section 12 Dependency Table with Chapter 19.")
    else:
        print("Warning: Section 12 target not found.")

    # Save the updated goldenversion.md
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Successfully wrote updated goldenversion.md.")

    # 4. Send HTTP POST request to update-goldenversion
    url = "http://localhost:9091/update-goldenversion"
    try:
        response = requests.post(url, json={"markdownContent": content}, timeout=5)
        print(f"POST response: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Failed to send POST request: {e} (This is normal if the server is offline; local file has been successfully written).")

if __name__ == "__main__":
    main()
