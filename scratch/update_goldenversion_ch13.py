import os

def update_golden_version_ch13():
    filepath = 'goldenversion.md'
    if not os.path.exists(filepath):
        print("Error: goldenversion.md not found!")
        return

    with open(filepath, 'r') as f:
        content = f.read()

    # 1. Update Table of Contents (TOC)
    old_toc_48 = "        *   [4.8 Blood-Gas Exchange & Shunt Mathematics](#48-blood-gas-exchange--shunt-mathematics)"
    new_toc_48 = "        *   [4.8 Blood-Gas Exchange, Shunt Mathematics & Alveolar Dynamics](#48-blood-gas-exchange-shunt-mathematics--alveolar-dynamics)"
    content = content.replace(old_toc_48, new_toc_48)

    old_toc_619 = "    *   [6.19 Neostigmine Ceiling Effect & Overdose Weakness](#619-neostigmine-ceiling-effect--overdose-weakness)"
    new_toc_619 = ("    *   [6.19 Neostigmine Ceiling Effect & Overdose Weakness](#619-neostigmine-ceiling-effect--overdose-weakness)\n"
                   "    *   [6.20 Absorption Atelectasis & Shunt Hypoxemia](#620-absorption-atelectasis--shunt-hypoxemia)\n"
                   "    *   [6.21 Alveolar Recruitment Maneuver](#621-alveolar-recruitment-maneuver)")
    content = content.replace(old_toc_619, new_toc_619)

    # 2. Update Section 4.8 Content
    old_sec_48_start = "#### 4.8 Blood-Gas Exchange & Shunt Mathematics"
    old_sec_49_start = "#### 4.9 Optical Pulse Oximetry Absorption Model"

    # Find the exact text between 4.8 and 4.9
    start_idx = content.find(old_sec_48_start)
    end_idx = content.find(old_sec_49_start)

    if start_idx != -1 and end_idx != -1:
        new_sec_48_content = (
            "#### 4.8 Blood-Gas Exchange, Shunt Mathematics & Alveolar Dynamics\n"
            "*   **Alveolar Oxygen Tension (PAO2)**:\n"
            "    $$PAO_2 = \\left(FiO_2 \\cdot (P_B - P_{H_2O})\\right) - \\frac{PaCO_2}{R} \\quad \\text{[mmHg]} \\quad (P_B = 760, P_{H_2O} = 47, R = 0.8)$$\n"
            "*   **Apnea Oxygen Buffer Depletion**:\n"
            "    $$\\frac{d(\\text{O2Buffer})}{dt} = -VO_2 \\cdot \\text{Temp}_{\\text{scale}} \\cdot \\text{Shivering}_{\\text{scale}} + \\text{PassiveO2}_{\\text{influx}}$$\n"
            "*   **Bohr Shift & Hemoglobin Dissociation (Adair-Riley Equation)**:\n"
            "    $$PO_{2,\\text{eff}} = PO_2 \\cdot 10^{0.48 \\cdot (pH - 7.4) - 0.024 \\cdot (\\text{Temp} - 37) - \\text{Shift}_{\\text{volatile}}}$$\n"
            "    $$SaO_2 = \\frac{PO_{2,\\text{eff}}^3 + 150 \\cdot PO_{2,\\text{eff}}}{PO_{2,\\text{eff}}^3 + 150 * PO_{2,\\text{eff}} + 23400} \\cdot 100$$\n"
            "*   **Absorption Atelectasis Kinetics**:\n"
            "    High inspired oxygen fractions combined with a lack of positive airway pressure and tone loss (induction apnea/paralysis) accelerate alveolar collapse:\n"
            "    $$\\frac{d(\\text{Atelectasis})}{dt} = \\text{rate}_{\\text{base}} \\cdot (1.0 + \\text{isParalyzed} \\cdot 2.0) \\cdot (1.0 + \\text{isObese} \\cdot 1.0)$$\n"
            "    where:\n"
            "    $$\\text{rate}_{\\text{base}} = 0.001 \\cdot \\left(FiO_2 - 0.21\\right) - 0.001 \\cdot \\text{PEEP}$$\n"
            "*   **Alveolar Recruitment**:\n"
            "    PEEP recruits collapsed units gradually, while a sustained inflation recruitment maneuver (airway pressure held $\\ge 30\\text{ cmH2O}$ for $\\ge 10\\text{ seconds}$) instantly restores volume:\n"
            "    $$\\text{recruitment}_{\\text{PEEP}} = -0.005 \\cdot \\text{PEEP} \\quad (\\text{per second})$$\n"
            "    $$\\text{If } P_{\\text{airway}} \\ge 30\\text{ cmH2O for } \\ge 10\\text{ seconds} \\rightarrow \\text{Atelectasis} = 0.0$$\n"
            "*   **Hypoxic Pulmonary Vasoconstriction (HPV) & Shunt**:\n"
            "    HPV protects against hypoxemia by diverting blood flow away from collapsed hypoxic units, reducing shunt contribution by $50\\%$. Volatiles inhibit HPV dose-dependently:\n"
            "    $$\\text{hpvInhibition} = \\min\\left(1.0, \\text{Volatile}_{\\text{MAC}} \\cdot 0.67\\right)$$\n"
            "    $$\\text{hpvProtection} = 0.50 \\cdot (1 - \\text{hpvInhibition})$$\n"
            "    $$\\text{shunt}_{\\text{atelectasis}} = 0.30 \\cdot \\text{Atelectasis} \\cdot (1 - \\text{hpvProtection})$$\n"
            "    $$\\text{actualShunt} = \\text{baselineShunt} + \\text{shunt}_{\\text{atelectasis}}$$\n"
            "*   **FRC & Compliance Corrections**:\n"
            "    $$FRC_{\\text{actual}} = FRC_{\\text{baseline}} \\cdot (1.0 - 0.35 \\cdot \\text{Atelectasis})$$\n"
            "    $$Compliance_{\\text{actual}} = Compliance_{\\text{baseline}} \\cdot (1.0 - 0.40 \\cdot \\text{Atelectasis})$$\n"
            "*   **Mixed Venous Return & Pulmonary Shunt Exchange**:\n"
            "    *   *Capillary O2 Content ($CcO_2$)*: $CcO_2 = Hb \\cdot 1.34 \\cdot \\frac{SaO_2}{100} + PAO_2 \\cdot 0.0031$\n"
            "    *   *Mixed Venous O2 Content ($CvO_2$)*: $CvO_2 = CcO_2 - \\frac{VO_2}{CO \\cdot 10}$\n"
            "    *   *Arterial O2 Content ($CaO_2$)*: $CaO_2 = CcO_2 \\cdot (1 - \\text{actualShunt}) + CvO_2 \\cdot \\text{actualShunt}$\n"
            "    *   *Arterial O2 Saturation ($SpO_2$)*: $SpO_2 = \\frac{CaO_2}{Hb \\cdot 1.34} \\cdot 100$\n"
            "*   **Oxygen Delivery ($DO_2$)**:\n"
            "    $$DO_2 = CaO_2 \\cdot CO \\cdot 10 \\quad \\text{[mL/min]}$$\n\n"
        )
        content = content[:start_idx] + new_sec_48_content + content[end_idx:]
    else:
        print("Error: Could not locate section 4.8/4.9 boundaries!")

    # 3. Add Section 6 Crises Loops
    old_sec_7_chat = "### 7. Attending Direct Chat, Advisor & NLP Engine"
    new_sec_6_additions = (
        "#### 6.20 Absorption Atelectasis & Shunt Hypoxemia\n"
        "*   **Trigger Conditions**: Preoxygenation with $FiO_2 = 1.0$ (or prolonged exposure to high $FiO_2 > 0.8$) combined with loss of diaphragmatic tone (general anesthesia induction with muscle relaxation) and a lack of positive end-expiratory pressure (PEEP $= 0$).\n"
        "*   **Physiological Impact**: Oxygen is rapidly absorbed from alveolar units, leading to gas volume depletion and collapse (atelectasis). This decreases Functional Residual Capacity ($FRC$) by up to $35\\%$ and reduces lung compliance by up to $40\\%$ (worsening airway pressure: $PIP$ surges by $+50\\%$).\n"
        "    - *Right-to-Left Shunt*: Atelectasis creates non-ventilated but perfused lung segments. The shunt fraction ($Q_s/Q_t$) rises to $>35\\%$, causing rapid arterial oxygen desaturation ($SpO_2 < 85\\%$) within $60-90\\text{ seconds}$ of apnea.\n"
        "    - *Volatile-Induced HPV Inhibition*: If high-dose volatile anesthetic ($>1.0\\text{ MAC}$) is administered, the protective Hypoxic Pulmonary Vasoconstriction (HPV) reflex is inhibited, expanding blood flow through the collapsed zones, further worsening shunt and accelerating hypoxemia.\n"
        "*   **Mitigation / Resolution**:\n"
        "    1.  *Reduce FiO2*: Keep $FiO_2$ at $0.8$ or lower during induction if possible.\n"
        "    2.  *PEEP*: Apply positive end-expiratory pressure ($\ge 5-10\\text{ cmH2O}$) to resist collapse and gradually recruit alveoli.\n"
        "    3.  *Recruitment Maneuver*: Deliver sustained positive airway pressure ($30-40\\text{ cmH2O}$) for $\ge 10\\text{ seconds}$.\n"
        "\n"
        "#### 6.21 Alveolar Recruitment Maneuver\n"
        "*   **Trigger Conditions**: Active absorption atelectasis is present (`atelectasisFraction > 0.15`), and the clinician applies sustained airway pressure of $\ge 30-40\\text{ cmH2O}$ for $\ge 10\\text{ seconds}$ (manually squeezing the reservoir bag or using ventilator recruitment mode).\n"
        "*   **Physiological Impact**: The high transpulmonary pressure overcomes the critical opening pressure of collapsed alveoli, splinting them open. This instantly resets `atelectasisFraction = 0.0`, restoring baseline compliance and FRC, reducing $PIP$, and correcting the right-to-left shunt ($Q_s/Q_t$ returns to baseline $5\\%$).\n"
        "*   **Hemodynamic Safety Interlock**: Squeezing the reservoir bag to maintain airway pressure at $40\\text{ cmH2O}$ severely restricts venous return to the right atrium (decreases cardiac preload). This triggers a transient drop in cardiac output ($CO$ drops up to $-30\\%$) and MAP during the maneuver. Clinicians must verify adequate intravascular volume before execution and limit duration to $\le 15\\text{ seconds}$ to prevent circulatory shock.\n"
        "\n"
        "### 7. Attending Direct Chat, Advisor & NLP Engine"
    )
    content = content.replace(old_sec_7_chat, new_sec_6_additions)

    # 4. Add Section 8.2 State Tree variables under vitals
    old_state_tree_occupancies = (
        "    *   `nAChR_mature_occupancy`: `number` (Occupancy of mature postjunctional receptors)\n"
        "    *   `nAChR_immature_occupancy`: `number` (Occupancy of extrajunctional fetal receptors)\n"
        "    *   `nAChR_presynaptic_occupancy`: `number` (Occupancy of presynaptic receptors)\n"
        "    *   `nmjSafetyMargin`: `number` (Neuromuscular transmission safety factor)\n"
    )
    new_state_tree_occupancies = (
        old_state_tree_occupancies +
        "    *   `atelectasisFraction`: `number` (Alveolar collapse fraction, 0.0 - 1.0)\n"
        "    *   `hpvInhibition`: `number` (Hypoxic Pulmonary Vasoconstriction inhibition, 0.0 - 1.0)\n"
        "    *   `recruitmentManeuverTimer`: `number` (Timer for sustained recruitment pressure, seconds)\n"
        "    *   `recruitmentPressureActive`: `boolean` (Active recruitment pressure flag)\n"
        "    *   `do2`: `number` (Systemic oxygen delivery rate, mL/min)\n"
    )
    content = content.replace(old_state_tree_occupancies, new_state_tree_occupancies)

    # 5. Add Section 10 Constraints
    old_constraints = "11. **Phase II Block Threshold**: Transition to Phase II succinylcholine block is modeled as a binary step function based on cumulative dose rather than a continuous transition curve."
    new_constraints = (
        old_constraints + "\n"
        "12. **Alveolar Gas Partitioning**: The single-alveolus FRC model simplifies ventilation-perfusion distribution. Gravitational West zones and regional ventilation heterogeneities are represented through overall shunt fraction and compliance multipliers rather than discrete anatomical compartments.\n"
    )
    content = content.replace(old_constraints, new_constraints)

    # 6. Add Section 12 Dependency Table
    old_dependency_anchor = "| **Neostigmine weakness & ceiling** | None. | None. | Neostigmine reverses neuromuscular blockade linearly without a ceiling limit, and does not model depolarizing weakness from overdose. |"
    new_dependency_addition = (
        old_dependency_anchor + "\n"
        "| **Alveolar Atelectasis & Shunt** | Simple PEEP-based shunt reduction in [RespiratoryEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/RespiratoryEngine.ts). | None. | Alveolar collapse (absorption atelectasis) is not simulated dynamically as a function of FiO2 and airway pressure, and does not alter compliance or FRC. |\n"
        "| **Hypoxic Pulmonary Vasoconstriction (HPV)** | None. | None. | Volatile anesthetics do not alter pulmonary vascular shunt. Protective diversion of blood flow in hypoxic zones and its inhibition are unmodeled. |\n"
        "| **Alveolar Recruitment Maneuver** | None. | None. | Sustained positive pressure maneuvers do not affect alveolar volume or cardiovascular preload. |"
    )
    content = content.replace(old_dependency_anchor, new_dependency_addition)

    with open(filepath, 'w') as f:
        f.write(content)
    print("Success: Weaved Chapter 13 Respiratory Physiology into goldenversion.md")

if __name__ == '__main__':
    update_golden_version_ch13()
