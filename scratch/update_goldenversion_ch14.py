import os

def update_golden_version_ch14():
    filepath = 'goldenversion.md'
    if not os.path.exists(filepath):
        print("Error: goldenversion.md not found!")
        return

    with open(filepath, 'r') as f:
        content = f.read()

    # 1. Update Table of Contents (TOC)
    old_toc_621 = "    *   [6.21 Alveolar Recruitment Maneuver](#621-alveolar-recruitment-maneuver)"
    new_toc_621 = (
        "    *   [6.21 Alveolar Recruitment Maneuver](#621-alveolar-recruitment-maneuver)\n"
        "    *   [6.22 Bezold-Jarisch Reflex](#622-bezold-jarisch-reflex)\n"
        "    *   [6.23 Bainbridge Reflex](#623-bainbridge-reflex)\n"
        "    *   [6.24 Oculocardiac Reflex](#624-oculocardiac-reflex)"
    )
    content = content.replace(old_toc_621, new_toc_621)

    # 2. Update Section 4.1 Content
    old_sec_41_start = "#### 4.1 Cardiovascular & Hemodynamic Physiology (`CardiovascularEngine.ts`)"
    old_sec_42_start = "#### 4.2 Oscillations & Homeostatic Waves"

    start_idx_41 = content.find(old_sec_41_start)
    end_idx_41 = content.find(old_sec_42_start)

    if start_idx_41 != -1 and end_idx_41 != -1:
        new_sec_41_content = (
            "#### 4.1 Cardiovascular & Hemodynamic Physiology (`CardiovascularEngine.ts`)\n"
            "The cardiovascular engine calculates the patient's continuous perfusion status every second. It models cardiac output ($CO$, L/min) and mean arterial pressure ($MAP$, mmHg):\n\n"
            "1.  **Mean Arterial Pressure (MAP)**:\n"
            "    $$MAP = DBP + \\frac{SBP - DBP}{3}$$\n"
            "    $$MAP_{\\text{exact}} = \\frac{CO \\cdot SVR}{80} + \\Delta P_{\\text{pressor}} + \\Delta P_{\\text{sepsis}} - \\text{Stunning}_{\\text{MAP\_penalty}}$$\n"
            "    *   *Systemic Vascular Resistance ($SVR$)*: Normal range is $900 - 1400\\text{ dyn}\\cdot\\text{s}\\cdot\\text{cm}^{-5}$. Updates dynamically based on vasodilation, vasoactive infusions, and autonomic reflexes.\n"
            "    *   *Pressor Pressure Shift (\\Delta P_{\\text{pressor}})*:\n"
            "        $$\\Delta P_{\\text{pressor}} = \\frac{\\text{EffectiveVolume} - EBV}{250} \\cdot 8$$\n"
            "    *   *Sepsis Pressure Shift (\\Delta P_{\\text{sepsis}})*: Drops SVR and subtracts $33.33\\text{ mmHg}$ from MAP due to vasoplegia.\n"
            "    *   *Stunning MAP Penalty (\\text{Stunning}_{\\text{MAP\_penalty}})*: If myocardial stunning is present, MAP is reduced by the stunning percentage.\n"
            "2.  **Cardiac Output (CO)**:\n"
            "    $$CO = \\frac{HR \\cdot SV}{1000} \\quad \\text{[L/min]}$$\n"
            "    *   *Stroke Volume ($SV$)*: Derived from Frank-Starling preload curves, contractility, and stunning factors:\n"
            "        $$SV = \\min\\left(SV_{\\text{max}}, SV_{\\text{base}} \\cdot Preload_{SV} \\cdot \\max(0.1, Inotropy) \\cdot CHF_{\\text{penalty}} \\cdot AFib_{\\text{penalty}}\\right)$$\n"
            "        *   *Frank-Starling Preload Stroke Volume ($Preload_{SV}$)*: Models stroke volume variation as a function of LVEDP:\n"
            "            $$Preload_{SV} = 1.2 \\cdot \\left(1.0 - e^{-0.15 \\cdot LVEDP}\\right) \\cdot \\left(1.0 - 1.2 \\cdot \\text{BloodLossRatio}\\right)$$\n"
            "        *   *Left Ventricular End-Diastolic Pressure ($LVEDP$)*: Calculated dynamically from intravascular volume offsets and myocardial inotropy:\n"
            "            $$LVEDP = \\max\\left(2.0, \\min\\left(40.0, 8.0 + 4.0 \\cdot \\frac{\\text{EffectiveVolume} - EBV}{250} + \\frac{5.0}{Inotropy}\\right)\\right)$$\n"
            "        *   *Inotropy ($Inotropy$)*:\n"
            "            $$Inotropy = \\max\\left(0.01, 1.0 - \\frac{\\text{Stunning}}{100} + \\text{Inotropy}_{\\text{drugs}} + \\text{Spike}_{\\text{contractility}}\\right)$$\n"
            "3.  **Systolic (SBP) & Diastolic (DBP) Pressures**:\n"
            "    Systolic and diastolic pressures are derived from MAP and Pulse Pressure ($PP$, mmHg), which scales with stroke volume:\n"
            "    $$PP = 40 \\cdot \\frac{SV}{SV_{\\text{base}}}$$\n"
            "    $$SBP = MAP + \\frac{2}{3} \\cdot PP + \\text{Noise}_{\\text{sys}}$$\n"
            "    $$DBP = MAP - \\frac{1}{3} \\cdot PP + \\text{Noise}_{\\text{dia}}$$\n"
            "4.  **Autonomic Reflexes - Baroreceptor Reflex**:\n"
            "    *   *Baroreflex Gain (\\text{baroreflexGain})*: Blunted dose-dependently by volatile anesthetics and completely bypassed under connected awareness crises:\n"
            "        $$\\text{baroreflexGain} = \\max\\left(0, 1.0 - \\text{currentMac} \\cdot 0.67\\right)$$\n"
            "    *   *Autonomic Heart Rate Mod (\\text{autonomicHrMod})*:\n"
            "        $$\\text{Error}_{\\text{baro}} = MAP - MAP_{\\text{set}} \\quad \\text{where } MAP_{\\text{set}} = DBP_{\\text{base}} + \\frac{SBP_{\\text{base}} - DBP_{\\text{base}}}{3}$$\n"
            "        $$\\text{autonomicHrMod} = \\max\\left(-25, \\min\\left(30, -0.5 \\cdot \\text{Error}_{\\text{baro}} \\cdot \\text{baroreflexGain}\\right)\\right)$$\n"
            "        Reflex bradycardia is blunted (set to 0) if antimuscarinic drugs block cholinergic receptors (`totalHrDelta > 15`).\n\n"
        )
        content = content[:start_idx_41] + new_sec_41_content + content[end_idx_41:]
    else:
        print("Error: Could not locate section 4.1/4.2 boundaries!")

    # 3. Update Section 4.3 Myocardial Ischemia & Metabolic Demand
    old_sec_43_start = "#### 4.3 Myocardial Ischemia & Metabolic Demand"
    old_sec_44_start = "#### 4.4 Cardiac Arrest & Resuscitation Loop"

    start_idx_43 = content.find(old_sec_43_start)
    end_idx_43 = content.find(old_sec_44_start)

    if start_idx_43 != -1 and end_idx_43 != -1:
        new_sec_43_content = (
            "#### 4.3 Myocardial Ischemia & Metabolic Demand\n"
            "Myocardial oxygen balance represents a dynamic supply-demand relationship. Perfusion occurs primarily during diastole and is governed by coronary driving pressure:\n\n"
            "*   **Coronary Perfusion Pressure ($CPP_{\\text{coronary}}$)**:\n"
            "    $$CPP_{\\text{coronary}} = \\max\\left(5.0, DBP - LVEDP\\right)$$\n"
            "*   **Diastolic Time Ratio (\\text{DiastoleTimeRatio})**: Shrinks as heart rate rises, limiting the duration of coronary perfusion:\n"
            "    $$\\text{DiastoleTimeRatio} = \\max\\left(0.20, \\min\\left(0.85, \\frac{60.0 - 0.2 \\cdot HR}{60.0}\right)\\right)$$\n"
            "*   **Myocardial Oxygen Demand ($MVO_2$)**: Scales with heart rate, systolic pressure, contractility, and ventricular radius:\n"
            "    $$MVO_2 = HR \\cdot SBP \\cdot Inotropy \\cdot RadiusMod \\quad \\text{where } RadiusMod = 1.0 + \\max\\left(0, \\frac{LVEDP - 12.0}{15.0}\right)$$\n"
            "*   **Myocardial Oxygen Supply ($Supply_{\\text{myo}}$)**:\n"
            "    $$Supply_{\\text{myo}} = CPP_{\\text{coronary}} \\cdot \\text{DiastoleTimeRatio} \\cdot CaO_2 \\cdot \\text{coronaryStenosisMod} \\cdot 8.5$$\n"
            "    where $CaO_2 = Hb \\cdot 1.34 \\cdot (SpO_2 / 100) + PaO_2 \\cdot 0.0031$, and $\\text{coronaryStenosisMod} = 0.40$ if CAD patient, else $1.0$.\n"
            "*   **Ischemia & Stunning Accumulation**:\n"
            "    If oxygen demand exceeds supply, stunning accumulates at a rate proportional to the deficit:\n"
            "    $$\\text{StunningRate} = \\max\\left(0, \\frac{MVO_2 - Supply_{\\text{myo}}}{10000} \\cdot 0.381\right) \\quad [\\%/\\text{s}]$$\n"
            "    Stunning restricts inotropy and contractility. It decays slowly by $0.2\\%$ per second once oxygen supply exceeds demand.\n\n"
        )
        content = content[:start_idx_43] + new_sec_43_content + content[end_idx_43:]
    else:
        print("Error: Could not locate section 4.3/4.4 boundaries!")

    # 4. Add Section 6 Crises Loops additions
    old_sec_7_chat = "### 7. Attending Direct Chat, Advisor & NLP Engine"
    new_sec_6_additions = (
        "#### 6.22 Bezold-Jarisch Reflex\n"
        "*   **Trigger Conditions**: Active when `myocardialStunning > 25.0` or `bloodLossRatio > 0.35` (low ventricular volume), stimulating ventricular mechanoreceptors and unmyelinated vagal C-fibers.\n"
        "*   **Physiological Impact**: Induces a classic triad of bradycardia, vasodilation, and hypotension:\n"
        "    - Reduces heart rate: `totalHrDelta -= 20` bpm.\n"
        "    - Induces vasodilation: reduces systemic vascular resistance: `targetSVR *= 0.75`.\n"
        "*   **Resolution Criteria**: Resolves when underlying ischemia/stunning falls below $25.0$ and intravascular volume is restored (bloodLossRatio $< 0.35$).\n\n"
        "#### 6.23 Bainbridge Reflex\n"
        "*   **Trigger Conditions**: Active when venous return increases significantly, elevating right atrial pressure (modeled via LVEDP: `LVEDP > 18.0`), provided the Bezold-Jarisch reflex is inactive.\n"
        "*   **Physiological Impact**: Overrides baroreceptor bradycardia to prevent pulmonary venous congestion:\n"
        "    - Triggers compensatory tachycardia:\n"
        "      $$\\Delta HR_{\\text{Bainbridge}} = \\max\\left(0, \\min\\left(20, 1.5 \\cdot (LVEDP - 18.0)\\right)\\right)$$\n"
        "*   **Resolution Criteria**: Resolves as right atrial pressure and LVEDP normalize to $\\le 18.0\\text{ mmHg}$.\n\n"
        "#### 6.24 Oculocardiac Reflex\n"
        "*   **Trigger Conditions**: Traction on the extraocular muscles (especially medial rectus), pressure on the globe, or orbital pathology triggers sensory afferents through the ciliary nerves to the ophthalmic division of the trigeminal nerve (CN V1), synapsing in the gasserian ganglion, and terminating in the sensory nucleus of CN V. The efferent pathway is mediated by the vagal CN X fibers.\n"
        "*   **Physiological Impact**: Triggers profound bradycardia or cardiac arrest (Asystole):\n"
        "    - Reduces heart rate: `totalHrDelta -= 35` bpm.\n"
        "*   **Mitigation / Resolution**: Stopped immediately by releasing traction/pressure. Prevented or treated by antimuscarinic medications (Atropine or Glycopyrrolate) which occupy cardiac muscarinic acetylcholine receptors, preventing acetylcholine-mediated vagal slowing.\n\n"
        "### 7. Attending Direct Chat, Advisor & NLP Engine"
    )
    content = content.replace(old_sec_7_chat, new_sec_6_additions)

    # 5. Add Section 8.2 State Tree variables
    old_state_tree_do2 = "    *   `do2`: `number` (Systemic oxygen delivery rate, mL/min)"
    new_state_tree_do2 = (
        old_state_tree_do2 + "\n"
        "    *   `lvedp`: `number` (Left ventricular end-diastolic pressure, mmHg)\n"
        "    *   `cpp_coronary`: `number` (Coronary perfusion pressure, mmHg)\n"
        "    *   `diastoleTimeRatio`: `number` (Ratio of diastolic time to total cardiac cycle)\n"
        "    *   `mvo2`: `number` (Myocardial oxygen consumption index)\n"
        "    *   `mvo2Supply`: `number` (Myocardial oxygen supply index)"
    )
    content = content.replace(old_state_tree_do2, new_state_tree_do2)

    old_patient_currentFiO2 = "`currentO2Flow`: `number`"
    new_patient_currentFiO2 = "`currentO2Flow`: `number`, `oculocardiacTriggered`: `boolean`"
    content = content.replace(old_patient_currentFiO2, new_patient_currentFiO2)

    # 6. Add Section 10 Constraints
    old_constraints = (
        "12. **Alveolar Gas Partitioning**: The single-alveolus FRC model simplifies ventilation-perfusion distribution. Gravitational West zones and regional ventilation heterogeneities are represented through overall shunt fraction and compliance multipliers rather than discrete anatomical compartments."
    )
    new_constraints = (
        old_constraints + "\n"
        "13. **Coronary Anatomy & Autoregulation**: The coronary system is modeled globally via left ventricular end-diastolic pressure and mean diastolic perfusion, representing local flow dynamics as a single lumped compartment with uniform stenosis scaling rather than independent regional vessel trees.\n"
    )
    content = content.replace(old_constraints, new_constraints)

    # 7. Add Section 12 Dependency Table
    old_dependency_anchor = "| **Alveolar Recruitment Maneuver** | None. | None. | Sustained positive pressure maneuvers do not affect alveolar volume or cardiovascular preload. |"
    new_dependency_addition = (
        old_dependency_anchor + "\n"
        "| **Diastolic Perfusion & LVEDP** | None. | None. | Coronary perfusion pressure is assumed constant and is independent of left ventricular end-diastolic pressure or diastolic cycle duration. |\n"
        "| **Autonomic Reflexes** | Simple baroreceptor heart rate drop in [CardiovascularEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/CardiovascularEngine.ts). | None. | Bezold-Jarisch, Bainbridge, and Oculocardiac reflexes are unmodeled; heart rate changes do not depend on ventricular volume or trigeminal afferents. |"
    )
    content = content.replace(old_dependency_anchor, new_dependency_addition)

    with open(filepath, 'w') as f:
        f.write(content)
    print("Success: Weaved Chapter 14 Cardiac Physiology into goldenversion.md")

if __name__ == '__main__':
    update_golden_version_ch14()
