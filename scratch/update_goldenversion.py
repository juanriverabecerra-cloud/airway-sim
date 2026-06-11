import os
import requests

def main():
    file_path = "/Users/jsriverab/.gemini/antigravity/scratch/airway-sim/goldenversion.md"
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        return

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. TOC Update Section 4
    old_toc_section4 = "*   [4.12 Hepatic Physiology, Pathophysiology, and Anesthetic Considerations](#412-hepatic-physiology-pathophysiology-and-anesthetic-considerations)"
    new_toc_section4 = (
        "*   [4.12 Hepatic Physiology, Pathophysiology, and Anesthetic Considerations](#412-hepatic-physiology-pathophysiology-and-anesthetic-considerations)\n"
        "        *   [4.13 Renal Physiology, Pathophysiology, and Anesthetic Considerations](#413-renal-physiology-pathophysiology-and-anesthetic-considerations)"
    )
    if old_toc_section4 in content:
        content = content.replace(old_toc_section4, new_toc_section4)
        print("Updated TOC Section 4.")
    else:
        print("Warning: TOC Section 4 target not found.")

    # 2. TOC Update Section 6
    old_toc_section6 = "*   [6.31 Low Central Venous Pressure (CVP) Surgical Resection Bleeding Guidelines](#631-low-central-venous-pressure-cvp-surgical-resection-bleeding-guidelines)"
    new_toc_section6 = (
        "*   [6.31 Low Central Venous Pressure (CVP) Surgical Resection Bleeding Guidelines](#631-low-central-venous-pressure-cvp-surgical-resection-bleeding-guidelines)\n"
        "    *   [6.32 Prerenal Oliguria Loop](#632-prerenal-oliguria-loop)\n"
        "    *   [6.33 Intrinsic Acute Kidney Injury (AKI) & Acute Tubular Necrosis (ATN)](#633-intrinsic-acute-kidney-injury-aki--acute-tubular-necrosis-atn)\n"
        "    *   [6.34 Fluid Overload Pulmonary Edema Crisis](#634-fluid-overload-pulmonary-edema-crisis)"
    )
    if old_toc_section6 in content:
        content = content.replace(old_toc_section6, new_toc_section6)
        print("Updated TOC Section 6.")
    else:
        print("Warning: TOC Section 6 target not found.")

    # 3. Section 4 Body Update (adding 4.13 before section 5)
    old_body_section4 = "    clamped to integer values between $6$ and $40$.\n\n---\n\n### 5. Pharmacology (PK/PD) Engine"
    
    new_body_section4 = (
        "    clamped to integer values between $6$ and $40$.\n\n"
        "#### 4.13 Renal Physiology, Pathophysiology, and Anesthetic Considerations (`RenalEngine.ts`)\n"
        "The renal physiological engine simulates renal perfusion, glomerular filtration, tubular function, ADH (vasopressin) and Aldosterone feedback loops, biochemical marker kinetics (BUN and creatinine), and acute kidney injury (AKI) development.\n\n"
        "1.  **Renal Perfusion Pressure (RPP)**:\n"
        "    Governed by Mean Arterial Pressure ($MAP$), Central Venous Pressure ($CVP$), and Positive End-Expiratory Pressure ($PEEP$) transmitting backpressure through the renal veins ($RVP$):\n"
        "    $$RVP = CVP + 0.5 \\cdot PEEP \\quad \\text{[mmHg]}$$\n"
        "    $$RPP = \\max(0.0, MAP - RVP) \\quad \\text{[mmHg]}$$\n\n"
        "2.  **Renal Blood Flow (RBF) Autoregulation**:\n"
        "    RBF is maintained relatively constant ($1100\\text{ mL/min}$ baseline) between $RPP$ of $80$ and $180\\text{ mmHg}$. Below $80\\text{ mmHg}$, RBF drops rapidly and becomes pressure-passive:\n"
        "    $$\\text{If } RPP < 80.0 \\rightarrow RBF_{\\text{auto}} = \\max(0.1, 0.1 + 0.9 \\cdot \\frac{RPP - 40.0}{40.0})$$\n"
        "    $$\\text{If } RPP \\ge 80.0 \\land RPP \\le 180.0 \\rightarrow RBF_{\\text{auto}} = 1.0$$\n"
        "    $$\\text{If } RPP > 180.0 \\rightarrow RBF_{\\text{auto}} = \\min\\left(1.5, 1.0 + \\frac{RPP - 180.0}{180.0} \\cdot 0.2\\right)$$\n"
        "    - *Volatile Blunting*: Volatile agents ($>1\\text{ MAC}$) blunt the autoregulatory response dose-dependently, shifting RBF towards passive dependence on perfusion pressure:\n"
        "      $$RBF_{\\text{auto, final}} = (1.0 - 0.5 \cdot \\text{Volatile}_{\\text{MAC}}) \\cdot RBF_{\\text{auto}} + 0.5 \\cdot \\text{Volatile}_{\\text{MAC}} \\cdot \\left(\\frac{RPP}{90.0}\\right)$$\n"
        "    - *Vasoactive Constriction*: Stress catecholamines, vasopressors, or alpha-adrenergic stimulants scale down RBF:\n"
        "      $$VasoScale = \\max(0.4, 1.0 - 0.35 \cdot \\text{Symp} - 0.25 \cdot \\min(1.0, \\text{PressorCe} \\cdot 5.0))$$\n"
        "      where Fenoldopam (DA1 agonist) dilates the renal vasculature to offset constriction:\n"
        "      $$VasoScale_{\\text{final}} = \\min(1.35, VasoScale + 2.5 \\cdot \\text{Fenoldopam}_{\\text{Ce}})$$\n"
        "      $$RBF = \\max\\left(30.0, \\min(1600.0, 1100.0 \\cdot CO_{\\text{ratio}} \\cdot RBF_{\\text{auto, final}} \\cdot VasoScale_{\\text{final}} \\cdot (1.0 - 0.4 \cdot \\text{akiDamage}))\\right)$$\n\n"
        "3.  **Glomerular Filtration Rate (GFR)**:\n"
        "    Filtration is driven by hydrostatic pressure and ceases below $RPP$ of $45\\text{ mmHg}$ (MAP ~50 mmHg):\n"
        "    $$\\text{If } RPP < 80.0 \\rightarrow GFR_{\\text{auto}} = \\max\\left(0.0, \\frac{RPP - 45.0}{35.0}\\right)$$\n"
        "    $$\\text{If } RPP \\ge 80.0 \\land RPP \\le 180.0 \\rightarrow GFR_{\\text{auto}} = 1.0$$\n"
        "    $$\\text{If } RPP > 180.0 \\rightarrow GFR_{\\text{auto}} = \\min\\left(1.3, 1.0 + \\frac{RPP - 180.0}{180.0} \\cdot 0.1\\right)$$\n"
        "    - *PEEP transmission penalty*: $GFR_{\\text{PEEP}} = \\max(0.55, 1.0 - 0.018 \\cdot PEEP)$\n"
        "    - *Anesthetic MAC penalty*: $GFR_{\\text{MAC}} = \\max(0.4, 1.0 - 0.25 \\cdot \\text{Volatile}_{\\text{MAC}})$\n"
        "    - *Efferent Vasoconstriction (AVP / Ang II)*: Constriction of the efferent arteriole preserves filtration pressure:\n"
        "      $$GFR_{\\text{efferentMod}} = 1.0 + \\min(0.25, (\\text{Vasopressin}_{\\text{Ce}} \\cdot 5.0 + \\text{Symp} \\cdot 0.4) \\cdot (1.0 - 0.5 \\cdot \\text{Volatile}_{\\text{MAC}}))$$\n"
        "      $$GFR = \\max\\left(0.0, \\min(180.0, 125.0 \\cdot GFR_{\\text{auto}} \\cdot GFR_{\\text{PEEP}} \\cdot GFR_{\\text{MAC}} \\cdot GFR_{\\text{efferentMod}} \\cdot (1.0 - \\text{akiDamage}))\\right)$$\n\n"
        "4.  **Urine Output (UOP) and Water Balance**:\n"
        "    Urine flow rates scale with GFR and are regulated by ADH (vasopressin) water absorption and loops diuretics:\n"
        "    $$UOP_{\\text{mL/min}} = (GFR \\cdot 0.01) \\cdot (1.0 - 0.92 \\cdot AVP_{\\text{level}} \\cdot (1.0 - \\text{Diuretic}_{\\text{effect}})) \\cdot Diuretic_{\\text{multiplier}}$$\n"
        "    where $Diuretic_{\\text{effect}}$ is determined by loop diuretics (Furosemide, Bumetanide) or osmotic agents (Mannitol):\n"
        "    $$\\text{Diuretic}_{\\text{effect}} = \\max\\left(0.0, \\min\\left(0.92, \\frac{loopDiureticCe + 0.15 \\cdot MannitolCe}{loopDiureticCe + 0.15 \\cdot MannitolCe + 1.2}\right)\\right)$$\n"
        "    $$Diuretic_{\\text{multiplier}} = 1.0 + 8.5 \\cdot \\text{Diuretic}_{\\text{effect}}$$\n"
        "    - ADH (AVP) levels ($AVP_{\\text{level}}$) respond to plasma osmolality ($Osm$) and blood volume depletion:\n"
        "      $$Osm = 2.0 \\cdot [Na^+] + 2.0 \\cdot [K^+] + \\frac{BUN}{2.8} + \\frac{Glucose}{18.0}$$\n"
        "      $$AVP_{\\text{level}} = \\max\\left(0.05, \\min\\left(1.0, 0.1 + \\frac{Osm - 280.0}{20.0} + avpVol + avpStress\\right)\\right)$$\n"
        "      where $avpVol$ scales with blood loss ratio and $avpStress$ scales with sympathetic activation.\n\n"
        "5.  **Biochemical Marker Kinetics (BUN and Creatinine)**:\n"
        "    - *Serum Creatinine ($Cr$)*: Accumulates at a rate dependent on GFR clearance relative to muscle production:\n"
        "      $$\\frac{d(Cr)}{dt} = 0.000018 \\cdot \\left(1.0 - \\frac{GFR}{125.0} \\cdot \\frac{Cr}{Cr_{\\text{baseline}}}\\right) \\quad \\text{[mg/dL/s]}$$\n"
        "    - *Blood Urea Nitrogen ($BUN$)*: Accumulates based on filtration clearance and urea reabsorption scaling:\n"
        "      $$\\frac{d(BUN)}{dt} = 0.00025 \\cdot \\left(1.0 - \\frac{GFR}{125.0} \\cdot \\frac{BUN}{BUN_{\\text{baseline}}} \\cdot \\left(1.0 - 0.35 \\cdot \\left(1.0 - \\frac{GFR}{125.0}\\right)\\right)\\right) \\quad \\text{[mg/dL/s]}$$\n\n"
        "6.  **KDIGO Acute Kidney Injury (AKI) Staging**:\n"
        "    AKI is staged according to serum creatinine fold-rise and the duration of oliguria ($UOP < 0.5\\text{ mL/kg/h}$) or anuria ($UOP < 0.1\\text{ mL/kg/h}$):\n"
        "    - **Stage 1**: Creatinine rise $\\ge 1.5\\text{x}$ baseline OR oliguria duration $\\ge 6\\text{ hours}$.\n"
        "    - **Stage 2**: Creatinine rise $\\ge 2.0\\text{x}$ baseline OR oliguria duration $\\ge 12\\text{ hours}$.\n"
        "    - **Stage 3**: Creatinine rise $\\ge 3.0\\text{x}$ baseline OR creatinine $\\ge 4.0\\text{ mg/dL}$ OR oliguria $\\ge 24\\text{ hours}$ OR anuria $\\ge 12\\text{ hours}$.\n\n"
        "---\n\n"
        "### 5. Pharmacology (PK/PD) Engine"
    )
    if old_body_section4 in content:
        content = content.replace(old_body_section4, new_body_section4)
        print("Updated Section 4 Body.")
    else:
        print("Warning: Section 4 body target not found.")

    # 4. Section 6 Body Update (adding 6.27 to 6.34)
    old_body_section6 = (
        "*   **Resolution Criteria**: Resolves within $1 - 2\\text{ seconds}$ once the swallow phase is complete, restoring baseline ventilatory drive and parameters.\n\n"
        "### 7. Attending Direct Chat, Advisor & NLP Engine"
    )
    
    new_body_section6 = (
        "*   **Resolution Criteria**: Resolves within $1 - 2\\text{ seconds}$ once the swallow phase is complete, restoring baseline ventilatory drive and parameters.\n\n"
        "#### 6.27 Acute Variceal Bleeding Emergency\n"
        "*   **Trigger Conditions**: Sudden arterial/portal hypertensive pressure surge ($SBP \\ge 160\\text{ mmHg}$ or $HVPG \\ge 12\\text{ mmHg}$) in a patient with severe cirrhosis and pre-existing gastroesophageal varices.\n"
        "*   **Physiological Impact**: Initiates active massive upper gastrointestinal hemorrhage ($BleedRate = 2.0 - 5.0\\text{ mL/s}$). Rapid blood loss causes hypovolemia, falling CVP, drop in cardiac output, systemic hypotension, and subsequent profound tissue ischemia.\n"
        "*   **Resolution Criteria**: Requires splanchnic vasoconstrictor therapy (Terlipressin infusion or high-dose Octreotide, reducing portal pressure) maintained for $\\ge 60\\text{ seconds}$ combined with aggressive volume resuscitation to terminate the hemorrhage.\n\n"
        "#### 6.28 Hepatorenal Syndrome (HRS) Loop\n"
        "*   **Trigger Conditions**: Severe portal hypertension ($HVPG \\ge 10\\text{ mmHg}$) causing splanchnic arterial vasodilation and relative arterial underfilling, which triggers intense renal afferent arteriolar vasoconstriction.\n"
        "*   **Physiological Impact**: Renomedullary hypoperfusion elevates renal artery resistance:\n"
        "    $$R_{\\text{renal}} = 1.0 + 3.0 \\cdot \\text{cirrhosisFactor} \\cdot (1.0 - \\text{Terlipressin}_{\\text{Ce}})$$\n"
        "    This drops renal perfusion pressure, blunts GFR, and initiates progressive accumulation of serum creatinine and BUN, leading to functional AKI in the absence of primary kidney pathology.\n"
        "*   **Resolution Criteria**: Managed via portal decompression (TIPS placement) or splanchnic vasoconstrictor therapy (Terlipressin) to restore effective arterial blood volume and normalize renal artery resistance.\n\n"
        "#### 6.29 Portopulmonary Hypertension (PoPH) Right Ventricular PEA Collapse\n"
        "*   **Trigger Conditions**: Severe liver cirrhosis ($cirrhosisFactor \\ge 0.8$) elevates baseline mean pulmonary artery pressure ($mPAP > 25\\text{ mmHg}$). Under acute physiologic stressors like hypoxia ($SpO_2 < 85\%$), hypercapnia ($PaCO_2 > 50\\text{ mmHg}$), or severe acidosis ($pH < 7.15$), pulmonary vascular resistance spikes.\n"
        "*   **Physiological Impact**: The right ventricle, unaccustomed to high afterload, undergoes acute dilatation and failure. Cardiac output drops to near-zero, inducing pulseless electrical activity (PEA) cardiac arrest.\n"
        "*   **Resolution Criteria**: Emergency resuscitation requires immediate relief of pulmonary vasoconstriction (high $FiO_2$, hyperventilation to induce hypocapnic alkalosis) coupled with CPR chest compressions and epinephrine to restore coronary perfusion.\n\n"
        "#### 6.30 Hepatopulmonary Syndrome (HPS) Right-to-Left Shunt\n"
        "*   **Trigger Conditions**: Severe cirrhosis causes pulmonary capillary vasodilatation (loss of capillary tone), leading to functional right-to-left shunting of blood due to poor oxygen diffusion across dilated vessels.\n"
        "*   **Physiological Impact**: Increases the alveolar-arterial oxygen gradient ($A-a$ gradient) and creates a significant right-to-left shunt:\n"
        "    $$Shunt_{\\text{HPS}} = 0.25 \\cdot \\text{cirrhosisFactor} \\cdot (1.0 - 0.2 \\cdot FiO_2)$$\n"
        "    This induces progressive arterial hypoxemia ($SpO_2 < 90\%$) which is only partially responsive to oxygen therapy.\n"
        "*   **Resolution Criteria**: Requires liver transplantation for long-term resolution; acute management relies on high inspired oxygen fractions ($FiO_2 \\ge 0.60$) and optimization of ventilation-perfusion matching.\n\n"
        "#### 6.31 Low Central Venous Pressure (CVP) Surgical Resection Bleeding Guidelines\n"
        "*   **Trigger Conditions**: Active parenchymal transection phase during major hepatic resection surgery.\n"
        "*   **Physiological Impact**: Surgical bleeding from the hepatic veins is directly proportional to the venous pressure gradient. High CVP ($CVP \\ge 8\\text{ mmHg}$) drives severe retrograde back-bleeding:\n"
        "    $$BleedRate_{\\text{resection}} = 2.5 + 1.5 \\cdot (CVP - 5.0) \\quad \\text{[mL/s]}$$\n"
        "    Maintaining a low CVP ($CVP < 5\\text{ mmHg}$) restricts the bleeding rate to a baseline of $0.5\\text{ mL/s}$.\n"
        "*   **Resolution Criteria**: Controlled by anesthetic fluid restriction, head-down tilt (Trendelenburg), or vasodilator therapy to target CVP $< 5\\text{ mmHg}$ during parenchymal transection.\n\n"
        "#### 6.32 Prerenal Oliguria Loop\n"
        "*   **Trigger Conditions**: Reduced renal perfusion pressure ($RPP < 65\\text{ mmHg}$) driven by systemic arterial hypotension ($MAP < 70\\text{ mmHg}$), elevated systemic venous backpressure ($CVP$), or high mechanical ventilator positive end-expiratory pressure ($PEEP$).\n"
        "*   **Physiological Impact**: Drops GFR and urine flow rate ($UOP < 0.5\\text{ mL/kg/h}$). Hypovolemia and hyperosmolality stimulate maximal vasopressin (ADH) release, resulting in concentrated urine ($U_{\\text{osm}} > 500\\text{ mOsm/kg}$) and avid tubular sodium reabsorption ($FENa < 1\%$).\n"
        "*   **Resolution Criteria**: Restoration of systemic perfusion pressure ($MAP \\ge 75\\text{ mmHg}$ or $RPP \\ge 70\\text{ mmHg}$) via fluid resuscitation or vasopressor support.\n\n"
        "#### 6.33 Intrinsic Acute Kidney Injury (AKI) & Acute Tubular Necrosis (ATN)\n"
        "*   **Trigger Conditions**: Prolonged severe renal ischemia ($MAP < 55\\text{ mmHg}$ for $>10\\text{ minutes}$) or exposure to direct nephrotoxins (myoglobin from rhabdomyolysis, mismatched blood transfusion hemolysis, iodinated contrast agents, or fluoride metabolites from prolonged Sevoflurane).\n"
        "*   **Physiological Impact**: Accumulates direct tubular cell damage ($akiDamage > 0.35$). Normal tubular concentration and reabsorption mechanisms fail:\n"
        "    - Urine osmolality is fixed close to plasma ($U_{\\text{osm}} \\approx 300\\text{ mOsm/kg}$, isosthenuria).\n"
        "    - Fractional excretion of sodium rises ($FENa > 2\%$) due to impaired tubular sodium transport.\n"
        "    - Serum creatinine and BUN accumulate progressively.\n"
        "*   **Resolution Criteria**: Avoidance of further nephrotoxic insults, fluid optimization, and supportive renal replacement therapy if severe uremia or volume overload develops.\n\n"
        "#### 6.34 Fluid Overload Pulmonary Edema Crisis\n"
        "*   **Trigger Conditions**: Aggressive intravenous fluid resuscitation ($netFluidBalance > 2000\\text{ mL}$) administered in the presence of severe oliguria/AKI ($UOP < 15\\text{ mL/h}$).\n"
        "*   **Physiological Impact**: Hydrostatic pressure drives fluid extravasation into the pulmonary interstitium and alveoli. This causes a severe drop in lung compliance:\n"
        "    $$Compliance_{\\text{overload}} = Compliance_{\\text{baseline}} - 25.0 \\quad \\text{[mL/cmH2O]}$$ \n"
        "    In volume-controlled ventilation, this spikes peak inspiratory pressure ($PIP$) and impairs blood-gas exchange, resulting in progressive hypoxemia ($SpO_2 < 90\%$).\n"
        "*   **Resolution Criteria**: Requires urgent loop diuretic therapy (Furosemide) or renal replacement therapy to remove excess volume, combined with positive airway pressure (PEEP/CPAP) to recruit flooded alveoli.\n\n"
        "### 7. Attending Direct Chat, Advisor & NLP Engine"
    )
    if old_body_section6 in content:
        content = content.replace(old_body_section6, new_body_section6)
        print("Updated Section 6 Body.")
    else:
        print("Warning: Section 6 body target not found.")

    # 5. Section 8 State Tree Update (vitals)
    old_state_vitals = "*   `renalArteryResistance`: `number` (Renal Artery Resistance index)"
    new_state_vitals = (
        "*   `renalArteryResistance`: `number` (Renal Artery Resistance index)\n"
        "    *   `gfr`: `number` (Glomerular Filtration Rate, mL/min)\n"
        "    *   `rbf`: `number` (Renal Blood Flow, mL/min)\n"
        "    *   `bun`: `number` (Blood Urea Nitrogen, mg/dL)\n"
        "    *   `creatinine`: `number` (Serum Creatinine, mg/dL)\n"
        "    *   `urineOutput`: `number` (Total cumulative urine output, mL)\n"
        "    *   `urineOutputRate`: `number` (Urine output rate, mL/h)\n"
        "    *   `urineOsmolality`: `number` (Urine osmolality, mOsm/kg)\n"
        "    *   `feNa`: `number` (Fractional excretion of sodium, %)\n"
        "    *   `akiStage`: `number` (KDIGO AKI stage, 0 - 3)\n"
        "    *   `akiDamage`: `number` (Tubular cellular damage index, 0.0 - 1.0)\n"
        "    *   `uopOliguriaTimer`: `number` (Oliguria duration timer, seconds)\n"
        "    *   `uopAnuriaTimer`: `number` (Anuria duration timer, seconds)\n"
        "    *   `vasopressinLevel`: `number` (Circulating ADH level, 0.0 - 1.0)\n"
        "    *   `aldosteroneLevel`: `number` (Circulating Aldosterone level, 0.0 - 1.0)\n"
        "    *   `osm`: `number` (Calculated plasma osmolality, mOsm/kg)"
    )
    if old_state_vitals in content:
        content = content.replace(old_state_vitals, new_state_vitals)
        print("Updated Section 8 vitals.")
    else:
        print("Warning: Section 8 vitals target not found.")

    # 6. Section 8 State Tree Update (patient)
    old_state_patient = "*   `hasTIPS`: `boolean` (Presence of Transjugular Intrahepatic Portosystemic Shunt)"
    new_state_patient = (
        "*   `hasTIPS`: `boolean` (Presence of Transjugular Intrahepatic Portosystemic Shunt)\n"
        "    *   `gfr`: `number` (Glomerular Filtration Rate, mL/min)\n"
        "    *   `rbf`: `number` (Renal Blood Flow, mL/min)\n"
        "    *   `bun`: `number` (Blood Urea Nitrogen, mg/dL)\n"
        "    *   `creatinine`: `number` (Serum Creatinine, mg/dL)\n"
        "    *   `urineOutput`: `number` (Total cumulative urine output, mL)\n"
        "    *   `urineOutputRate`: `number` (Urine output rate, mL/h)\n"
        "    *   `urineOsmolality`: `number` (Urine osmolality, mOsm/kg)\n"
        "    *   `feNa`: `number` (Fractional excretion of sodium, %)\n"
        "    *   `akiStage`: `number` (KDIGO AKI stage, 0 - 3)\n"
        "    *   `akiDamage`: `number` (Tubular cellular damage index, 0.0 - 1.0)\n"
        "    *   `uopOliguriaTimer`: `number` (Oliguria duration timer, seconds)\n"
        "    *   `uopAnuriaTimer`: `number` (Anuria duration timer, seconds)\n"
        "    *   `baselineCreatinine`: `number` (Baseline serum creatinine reference, mg/dL)\n"
        "    *   `baselineBun`: `number` (Baseline BUN reference, mg/dL)\n"
        "    *   `glucose`: `number` (Patient serum glucose level, mg/dL)\n"
        "    *   `vasopressinLevel`: `number` (Circulating ADH level, 0.0 - 1.0)\n"
        "    *   `aldosteroneLevel`: `number` (Circulating Aldosterone level, 0.0 - 1.0)\n"
        "    *   `osm`: `number` (Calculated plasma osmolality, mOsm/kg)\n"
        "    *   `hasAki`: `boolean` (Presence of acute kidney injury flag)\n"
        "    *   `hasPrerenalOliguria`: `boolean` (Active prerenal oliguria state flag)\n"
        "    *   `hasFluidOverloadEdema`: `boolean` (Active fluid overload pulmonary edema flag)"
    )
    if old_state_patient in content:
        content = content.replace(old_state_patient, new_state_patient)
        print("Updated Section 8 patient.")
    else:
        print("Warning: Section 8 patient target not found.")

    # 7. Section 11 Crucial Code Files Update
    old_code_files = "11. [`HepaticEngine.ts`](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/HepaticEngine.ts): Pure physical sub-engine coordinating liver perfusion, portal blood flow, HVPG dynamics, hepatorenal AKI, and PoPH-induced right heart overload."
    new_code_files = (
        "11. [`HepaticEngine.ts`](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/HepaticEngine.ts): Pure physical sub-engine coordinating liver perfusion, portal blood flow, HVPG dynamics, hepatorenal AKI, and PoPH-induced right heart overload.\n"
        "12. [`RenalEngine.ts`](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/RenalEngine.ts): Pure physical sub-engine coordinating renal perfusion pressure, GFR/RBF autoregulation, ADH/aldosterone loops, loop/osmotic diuretics, BUN/creatinine kinetics, and KDIGO AKI staging."
    )
    if old_code_files in content:
        content = content.replace(old_code_files, new_code_files)
        print("Updated Section 11 Crucial Code Files.")
    else:
        print("Warning: Section 11 target not found.")

    # 8. Section 12 Architectural Dependency Analysis Table Update
    old_dep_row = "| **Low-CVP Hepatic Resection** | Venous back-bleeding scales with CVP; low-CVP fluid restriction reduces surgical blood loss in [HepaticEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/HepaticEngine.ts). | None. | Hepatic parenchymal bleeding rate is constant and independent of central venous pressure. |"
    new_dep_row = (
        "| **Low-CVP Hepatic Resection** | Venous back-bleeding scales with CVP; low-CVP fluid restriction reduces surgical blood loss in [HepaticEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/HepaticEngine.ts). | None. | Hepatic parenchymal bleeding rate is constant and independent of central venous pressure. |\n"
        "| **Renal Blood Flow & GFR Autoregulation** | RBF and GFR are dynamically calculated based on RPP (incorporating CVP and PEEP backpressure). Autoregulation blunted by MAC and volatiles in [RenalEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/RenalEngine.ts). | None. | Renal blood flow and glomerular filtration are hardcoded constants or unmodeled. |\n"
        "| **KDIGO AKI Staging & Diuresis** | Staging is computed dynamically from creatinine ratios and oliguria/anuria timers. Loop diuretics (Furosemide) and osmotic agents (Mannitol) stimulate diuresis in [RenalEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/RenalEngine.ts). | None. | AKI staging is unmodeled; UOP does not scale with GFR or diuretics. |"
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

    # 9. Send HTTP POST request to update-goldenversion
    url = "http://localhost:9091/update-goldenversion"
    try:
        response = requests.post(url, json={"markdownContent": content}, timeout=5)
        print(f"POST response: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Failed to send POST request: {e} (This is normal if the server is offline; local file has been successfully written).")

if __name__ == "__main__":
    main()
