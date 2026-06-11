import os

def update_golden_version_ch16():
    filepath = 'goldenversion.md'
    if not os.path.exists(filepath):
        print("Error: goldenversion.md not found!")
        return

    with open(filepath, 'r') as f:
        content = f.read()

    # 1. Update Table of Contents (TOC) for Section 4
    old_toc_4 = (
        "*   [4.11 Gastrointestinal Physiology & Lower Esophageal Barrier Pressure](#411-gastrointestinal-physiology--lower-esophageal-barrier-pressure)\n"
        "    *   [5. Pharmacology (PK/PD) Engine](#5-pharmacology-pkpd-engine)"
    )
    new_toc_4 = (
        "*   [4.11 Gastrointestinal Physiology & Lower Esophageal Barrier Pressure](#411-gastrointestinal-physiology--lower-esophageal-barrier-pressure)\n"
        "        *   [4.12 Hepatic Physiology, Pathophysiology, and Anesthetic Considerations](#412-hepatic-physiology-pathophysiology-and-anesthetic-considerations)\n"
        "    *   [5. Pharmacology (PK/PD) Engine](#5-pharmacology-pkpd-engine)"
    )
    content = content.replace(old_toc_4, new_toc_4)

    # 2. Update Table of Contents (TOC) for Section 6
    old_toc_6 = (
        "    *   [6.26 Swallowing Apnea Reflex & Pharyngeal Protection](#626-swallowing-apnea-reflex--pharyngeal-protection)\n"
        "    *   [7. Attending Direct Chat, Advisor & NLP Engine](#7-attending-direct-chat-advisor--nlp-engine)"
    )
    new_toc_6 = (
        "    *   [6.26 Swallowing Apnea Reflex & Pharyngeal Protection](#626-swallowing-apnea-reflex--pharyngeal-protection)\n"
        "    *   [6.27 Acute Variceal Bleeding Emergency](#627-acute-variceal-bleeding-emergency)\n"
        "    *   [6.28 Hepatorenal Syndrome (HRS) Loop](#628-hepatorenal-syndrome-hrs-loop)\n"
        "    *   [6.29 Portopulmonary Hypertension (PoPH) Right Ventricular PEA Collapse](#629-portopulmonary-hypertension-poph-right-ventricular-pea-collapse)\n"
        "    *   [6.30 Hepatopulmonary Syndrome (HPS) Right-to-Left Shunt](#630-hepatopulmonary-syndrome-hps-right-to-left-shunt)\n"
        "    *   [6.31 Low Central Venous Pressure (CVP) Surgical Resection Bleeding Guidelines](#631-low-central-venous-pressure-cvp-surgical-resection-bleeding-guidelines)\n"
        "    *   [7. Attending Direct Chat, Advisor & NLP Engine](#7-attending-direct-chat-advisor--nlp-engine)"
    )
    content = content.replace(old_toc_6, new_toc_6)

    # 3. Append Section 4.11 and 4.12 right before Section 5
    old_sec4_end = (
        "    - *Limits*: CBF vasoconstriction plateaus below $PaCO_2 = 25\\text{ mmHg}$; vasodilation plateaus above $75-80\\text{ mmHg}$. Reactivity is transient, returning to baseline over $6-8\\text{ hours}$ due to active bicarbonate extrusion and CSF pH normalization.\n\n"
        "---\n\n"
        "### 5. Pharmacology (PK/PD) Engine"
    )
    new_sec4_end = (
        "    - *Limits*: CBF vasoconstriction plateaus below $PaCO_2 = 25\\text{ mmHg}$; vasodilation plateaus above $75-80\\text{ mmHg}$. Reactivity is transient, returning to baseline over $6-8\\text{ hours}$ due to active bicarbonate extrusion and CSF pH normalization.\n\n"
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
        "    $$\\frac{d(\\text{bowelGasVolume})}{dt} = +0.02 \\cdot \\left(\\frac{EtN_2O}{100}\\right) - 0.005 \\cdot (\\text{bowelGasVolume} - 1.0)$$\n"
        "    clamped to a maximum of $2.5$.\n\n"
        "#### 4.12 Hepatic Physiology, Pathophysiology, and Anesthetic Considerations (`HepaticEngine.ts`)\n"
        "The hepatic physiological engine simulates liver perfusion, portal blood flow, hepatic arterial buffer response (HABR) compensation, portal venous pressure gradient (HVPG) elevation, Child-Pugh and MELD classification, and drug/volatile/pressure influences on hepatic hemodynamics.\n\n"
        "1.  **Dual-Supply Hepatic Circulation**:\n"
        "    The liver receives dual blood supply: portal venous flow ($PBF$) and hepatic arterial flow ($HABF$):\n"
        "    $$PBF = 1000.0 \\cdot CO_{\\text{ratio}} \\cdot (1.0 - 0.5 \\cdot \\text{cirrhosisFactor}) \\quad \\text{[mL/min]}$$\n"
        "    where $CO_{\\text{ratio}}$ is the current Cardiac Output divided by baseline Cardiac Output. Portal inflow is reduced by up to $50\\%$ in patients with severe hepatic cirrhosis due to elevated structural vascular resistance.\n\n"
        "2.  **Hepatic Arterial Buffer Response (HABR)**:\n"
        "    The HABR is an intrinsic compensatory mechanism where a drop in portal venous inflow triggers immediate hepatic arterial vasodilation to maintain total hepatic blood flow ($THBF$):\n"
        "    $$HABF = 300.0 + \\max(0.0, 0.5 \\cdot (1000.0 - PBF)) \\cdot HABR_{\\text{efficiency}} \\quad \\text{[mL/min]}$$\n"
        "    $$THBF = PBF + HABF$$\n"
        "    where the compensatory capacity is governed by the HABR efficiency:\n"
        "    $$HABR_{\\text{efficiency}} = \\max(0.0, 1.0 - 0.6 \\cdot \\text{Volatile}_{\\text{MAC}}) \\cdot \\max\\left(0.1, \\min\\left(1.0, \\frac{MAP - 40.0}{20.0}\\right)\\right)$$\n"
        "    - *Volatile Blunting*: Volatile anesthetics (Sevoflurane, Isoflurane, Desflurane) dose-dependently blunt the arterial dilation response by up to $60\\%$.\n"
        "    - *Hypotensive Blunting*: When Mean Arterial Pressure ($MAP$) falls below $60\\text{ mmHg}$, local autoregulation is impaired, abolishing the buffer response at $MAP \\le 40\\text{ mmHg}$.\n\n"
        "3.  **Portal Venous Pressure Gradient (HVPG) & TIPS Decompression**:\n"
        "    Normal HVPG is $5.0\\text{ mmHg}$. Cirrhosis increases portal resistance, raising the gradient:\n"
        "    $$HVPG = 5.0 + 15.0 \\cdot \\text{cirrhosisFactor} \\cdot \\left(\\frac{THBF}{1300.0}\\right) \\quad \\text{[mmHg]}$$\n"
        "    A Transjugular Intrahepatic Portosystemic Shunt (TIPS) decompresses the portal system by creating a low-resistance pathway from the portal vein to the hepatic vein:\n"
        "    $$\\text{If patient has TIPS} \\rightarrow HVPG = \\min(12.0, HVPG)$$\n\n"
        "4.  **Child-Pugh Classification**:\n"
        "    Grades hepatic dysfunction based on scoring ($1-3\\text{ points}$ each) five clinical parameters:\n"
        "    - *Bilirubin (mg/dL)*: $<2.0$ ($1\\text{ pt}$), $2.0-3.0$ ($2\\text{ pts}$), $>3.0$ ($3\\text{ pts}$)\n"
        "    - *Albumin (g/dL)*: $>3.5$ ($1\\text{ pt}$), $2.8-3.5$ ($2\\text{ pts}$), $<2.8$ ($3\\text{ pts}$)\n"
        "    - *INR*: $<1.7$ ($1\\text{ pt}$), $1.7-2.3$ ($2\\text{ pts}$), $>2.3$ ($3\\text{ pts}$)\n"
        "    - *Ascites*: None ($1\\text{ pt}$), Slight/Controlled ($2\\text{ pts}$), Moderate/Refractory ($3\\text{ pts}$)\n"
        "    - *Encephalopathy Grade*: None ($1\\text{ pt}$), Grade 1-2 ($2\\text{ pts}$), Grade 3-4 ($3\\text{ pts}$)\n"
        "    - *Classes*: Class A ($5-6\\text{ points}$), Class B ($7-9\\text{ points}$), Class C ($\\ge 10\\text{ points}$)\n\n"
        "5.  **Model for End-Stage Liver Disease (MELD)**:\n"
        "    Predicts 3-month mortality and guides organ allocation using clinical laboratory values:\n"
        "    $$MELD = 3.78 \\cdot \\ln(\\max(1.0, \\text{bilirubin})) + 11.2 \\cdot \\ln(\\max(1.0, \\text{INR})) + 9.57 \\cdot \\ln(\\max(1.0, \\text{creatinine})) + 6.43$$\n"
        "    clamped to integer values between $6$ and $40$.\n\n"
        "---\n\n"
        "### 5. Pharmacology (PK/PD) Engine"
    )
    content = content.replace(old_sec4_end, new_sec4_end)

    # 4. Append Section 6.25, 6.26, and Chapter 16 contents right before Section 7
    old_sec6_end = (
        "*   **Mitigation / Resolution**: Stopped immediately by releasing traction/pressure. Prevented or treated by antimuscarinic medications (Atropine or Glycopyrrolate) which occupy cardiac muscarinic acetylcholine receptors, preventing acetylcholine-mediated vagal slowing.\n\n"
        "### 7. Attending Direct Chat, Advisor & NLP Engine"
    )
    new_sec6_end = (
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
        "#### 6.27 Acute Variceal Bleeding Emergency\n"
        "*   **Trigger Conditions**: Severe cirrhosis (`cirrhosisFactor > 0.5`), clinically significant portal hypertension (`HVPG > 12.0 mmHg`), absence of surgical decompression (`hasTIPS = false`), and an acute hypertensive pressure surge (`sys > 160 mmHg` or `map > 115 mmHg`) triggering variceal rupture.\n"
        "*   **Physiological Impact**: Severe upper gastrointestinal hemorrhage and rapid intravascular volume loss:\n"
        "    - Adds a massive hemorrhage volume sink: active bleeding rate ($activeBleedRate$) up to $10.0\\text{ mL/s}$ depending on the portal pressure gradient:\n"
        "      $$activeBleedRate = 2.0 \\cdot \\max(0.5, HVPG - 10.0) \\cdot (1.0 - \\text{splanchnicConstriction}) \\quad \\text{[mL/s]}$$\n"
        "    - Splanchnic constriction vasoconstriction factor ($\\text{splanchnicConstriction}$) is driven by vasoactive drug administration:\n"
        "      $$\\text{splanchnicConstriction} = \\min(0.85, 0.8 \\cdot (\\text{Terlipressin}_{Ce} \\cdot 5.0 + \\text{Octreotide}_{Ce} \\cdot 5.0) + 0.15 \\cdot \\min(1.0, \\text{Norepinephrine}_{Ce} \\cdot 10.0))$$\n"
        "    - Hemorrhage rapidly reduces `intravascularVolume`, leading to systemic hypovolemia, tachycardia, and arrest if untreated.\n"
        "*   **Resolution Criteria**: Halted automatically if circulatory collapse occurs (`map < 50 mmHg`, self-limiting) or if splanchnic vasoconstrictors successfully control the bleeding ($\\text{splanchnicConstriction} > 0.6$) for a sustained duration of $>60\\text{ seconds}$.\n\n"
        "#### 6.28 Hepatorenal Syndrome (HRS) Loop\n"
        "*   **Trigger Conditions**: Severe liver cirrhosis leads to splanchnic vasodilation and venous pooling, which triggers intense compensatory renal vasoconstriction and decreases renal blood flow.\n"
        "*   **Physiological Impact**: Rapidly progressive acute renal impairment (Type 1 HRS):\n"
        "    - Renal artery resistance is calculated dynamically based on splanchnic dilation status:\n"
        "      $$RenalArteryResistance = 1.0 + 3.0 \\cdot \\text{cirrhosisFactor} \\cdot (1.0 - \\text{splanchnicConstriction})$$\n"
        "    - Serum creatinine accumulates continuously due to impaired clearance:\n"
        "      $$\\frac{d(\\text{creatinine})}{dt} = 0.0001 \\cdot RenalArteryResistance - 0.0001 \\cdot \\text{renalRatio} \\quad \\text{[mg/dL/s]}$$\n"
        "      clamped between $0.4$ and $8.0\\text{ mg/dL}$.\n"
        "    - Triggers AKI alarms if creatinine rises above $1.5\\text{ mg/dL}$. If untreated, progressive renal failure and severe uremia ensue.\n"
        "*   **Resolution Criteria**: Reverted by restoring systemic perfusion pressure and splanchnic tone using Albumin and vasoconstrictors (Terlipressin or Norepinephrine) which reduce `RenalArteryResistance` and allow renal clearance to catch up.\n\n"
        "#### 6.29 Portopulmonary Hypertension (PoPH) Right Ventricular PEA Collapse\n"
        "*   **Trigger Conditions**: Chronic liver disease induces pulmonary vasoconstriction and vascular remodeling, elevating baseline mean Pulmonary Artery Pressure ($mPAP$):\n"
        "    $$mPAP = 15.0 + 25.0 \\cdot \\text{cirrhosisFactor} \\quad \\text{[mmHg]}$$\n"
        "    If severe PoPH is present ($mPAP > 35\\text{ mmHg}$), a sudden increase in pulmonary vascular resistance (PVR) from clinical stressors triggers collapse.\n"
        "*   **Physiological Impact**: Acute right-sided ventricular overload and failure, precipitating PEA cardiac arrest:\n"
        "    - Stressors include severe hypoxia ($SpO_2 < 85\\%$), hypercapnia ($PaCO_2 > 50\\text{ mmHg}$), or hypothermia/acidosis ($Temp < 35.0^{\\circ}\\text{C}$).\n"
        "    - Arrest is triggered instantly in `CardiovascularEngine.ts` upon meeting these criteria: `hasPoPHCollapse = true`, halting cardiac output, SBP, and DBP.\n"
        "*   **Resolution Criteria**: Follows standard CPR and ACLS resuscitation loops. Requires correction of the underlying stressor (ventilation to correct hypoxia/hypercapnia, warming to resolve hypothermia) alongside cardiac support.\n\n"
        "#### 6.30 Hepatopulmonary Syndrome (HPS) Right-to-Left Shunt\n"
        "*   **Trigger Conditions**: Liver dysfunction blunts clearing of circulating vasoactive vasodilators, leading to macroscopic intrapulmonary vascular dilations ($IPVDs$) and a functional right-to-left shunt.\n"
        "*   **Physiological Impact**: Shunt blood passes through dilated capillaries without participating in gas exchange, causing severe ventilation-perfusion mismatch and arterial hypoxemia:\n"
        "    - The HPS shunt fraction scales with cirrhosis and is partially counteracted by high inspired oxygen fractions ($FiO_2$) which expand the alveolar oxygen boundary layer:\n"
        "      $$hpsShunt = 0.25 \\cdot \\text{cirrhosisFactor} \\cdot \\left(1.0 - 0.2 \\cdot \\frac{FiO_2}{100.0}\\right)$$\n"
        "    - The HPS shunt component is summed into `actualShunt` inside `RespiratoryEngine.ts`:\n"
        "      $$actualShunt = \\text{baselineShunt} - \\text{shuntReduction} + hpsShunt$$\n"
        "    - Leads to lower arterial oxygen tension ($PaO_2$) and measured $SpO_2$ compared to normal baseline shunt fractions.\n"
        "*   **Resolution Criteria**: Managed by administering high inspired oxygen concentrations ($100\\%\\text{ FiO2}$) to increase dissolved oxygen, or surgical decompression/liver transplantation to reverse the underlying vascular dilations.\n\n"
        "#### 6.31 Low Central Venous Pressure (CVP) Surgical Resection Bleeding Guidelines\n"
        "*   **Trigger Conditions**: During major hepatic resections, blood loss occurs from hepatic veins and the inferior vena cava. The venous back-bleeding rate scales directly with the pressure gradient at the site of resection.\n"
        "*   **Physiological Impact**: Hemorrhage rate is highly dependent on Central Venous Pressure ($CVP$):\n"
        "    - CVP is calculated dynamically in `usePhysiology.js` as:\n"
        "      $$CVP = 4.0 + 3.0 \\cdot \\frac{\\text{EffectiveVolume} - EBV}{250} + PEEP$$\n"
        "    - Bleeding rate during the parenchymal resection phase (`surgicalProcedure === 'hepatic_resection' && surgicalPhase === 'Resection'`):\n"
        "      - If $CVP < 5.0\\text{ mmHg}$, bleeding is restricted and minimal:\n"
        "        $$resectionBleedRate = 0.5 \\quad \\text{[mL/s]}$$\n"
        "      - If $CVP \\ge 5.0\\text{ mmHg}$, back-bleeding becomes heavy and scales linearly with venous pressure:\n"
        "        $$resectionBleedRate = 2.5 + 1.5 \\cdot (CVP - 5.0) \\quad \\text{[mL/s]}$$\n"
        "*   **Resolution Criteria**: Controlled by anesthetic fluid restriction, head-up positioning, and low-PEEP ventilator settings to maintain CVP below $5\\text{ mmHg}$ (Low CVP technique), or surgical ligation/clamping of the vascular inflow (Pringle maneuver).\n\n"
        "### 7. Attending Direct Chat, Advisor & NLP Engine"
    )
    content = content.replace(old_sec6_end, new_sec6_end)

    # 5. Add Section 8.2 State Tree additions (vitals)
    old_state_vitals = (
        "    *   `inflammatoryIleus`: `number` (Inflammatory ileus factor, 0.0 - 1.0)\n"
        "    *   `postoperativeIleus`: `number` (Postoperative ileus duration, hours)"
    )
    new_state_vitals = (
        "    *   `inflammatoryIleus`: `number` (Inflammatory ileus factor, 0.0 - 1.0)\n"
        "    *   `postoperativeIleus`: `number` (Postoperative ileus duration, hours)\n"
        "    *   `mPAP`: `number` (Mean Pulmonary Artery Pressure, mmHg)\n"
        "    *   `HVPG`: `number` (Hepatic Venous Pressure Gradient, mmHg)\n"
        "    *   `pbf`: `number` (Portal Blood Flow, mL/min)\n"
        "    *   `habf`: `number` (Hepatic Arterial Blood Flow, mL/min)\n"
        "    *   `thbf`: `number` (Total Hepatic Blood Flow, mL/min)\n"
        "    *   `renalArteryResistance`: `number` (Renal Artery Resistance index)"
    )
    content = content.replace(old_state_vitals, new_state_vitals)

    # 6. Add Section 8.2 State Tree additions (patient)
    old_state_patient = (
        "    *   `vec3oh`: `number`, `normep`: `number`, `m6g`: `number`, `isSeizure`: `boolean`, `calciumStabilized`: `boolean`, `calciumStabilizedTime`: `number`, `bradycardiaTriggered`: `boolean`, `bradycardiaTime`: `number`, `laryngospasm`: `boolean`, `bronchospasm`: `boolean`, `isBucking`: `boolean`, `celiacBlockActive`: `boolean`, `epiduralBlockActive`: `boolean`, `swallowingActive`: `boolean`, `manipulationIndex`: `number`, `hasRegurgitated`: `boolean`, `hasAspirated`: `boolean`, `suxInjectionTime`: `number`"
    )
    new_state_patient = (
        "    *   `vec3oh`: `number`, `normep`: `number`, `m6g`: `number`, `isSeizure`: `boolean`, `calciumStabilized`: `boolean`, `calciumStabilizedTime`: `number`, `bradycardiaTriggered`: `boolean`, `bradycardiaTime`: `number`, `laryngospasm`: `boolean`, `bronchospasm`: `boolean`, `isBucking`: `boolean`, `celiacBlockActive`: `boolean`, `epiduralBlockActive`: `boolean`, `swallowingActive`: `boolean`, `manipulationIndex`: `number`, `hasRegurgitated`: `boolean`, `hasAspirated`: `boolean`, `suxInjectionTime`: `number`\n"
        "    *   `cirrhosisFactor`: `number` (Hepatic cirrhosis score, 0.0 - 1.0)\n"
        "    *   `bilirubin`: `number` (Serum bilirubin level, mg/dL)\n"
        "    *   `inr`: `number` (International Normalized Ratio)\n"
        "    *   `creatinine`: `number` (Serum creatinine level, mg/dL)\n"
        "    *   `albumin`: `number` (Serum albumin level, g/dL)\n"
        "    *   `encephalopathyGrade`: `number` (West Haven criteria encephalopathy grade, 0 - 4)\n"
        "    *   `ascitesDegree`: `number` (Ascites severity degree, 0 - 2)\n"
        "    *   `surgicalProcedure`: `string` (Current scheduled surgical procedure)\n"
        "    *   `varicealBleedingActive`: `boolean` (Active gastroesophageal varices rupture flag)\n"
        "    *   `varicealBleedTime`: `number | null` (Timestamp of variceal rupture initiation)\n"
        "    *   `hasPoPHCollapse`: `boolean` (Portopulmonary acute RV collapse flag)\n"
        "    *   `hasTIPS`: `boolean` (Presence of Transjugular Intrahepatic Portosystemic Shunt)"
    )
    content = content.replace(old_state_patient, new_state_patient)

    # 7. Add Section 10 Constraints additions
    old_constraints = (
        "14. **Gastrointestinal Cavities & Gas Solubility**: The bowel is treated as a single uniform gas cavity. Regional micro-peristalsis, stomach geometry, and anatomical divisions of the small and large bowel are represented via aggregate indices (`bowelGasVolume`, `gutMotility`, `inflammatoryIleus`) rather than detailed multi-segment spatial modeling."
    )
    new_constraints = (
        "14. **Gastrointestinal Cavities & Gas Solubility**: The bowel is treated as a single uniform gas cavity. Regional micro-peristalsis, stomach geometry, and anatomical divisions of the small and large bowel are represented via aggregate indices (`bowelGasVolume`, `gutMotility`, `inflammatoryIleus`) rather than detailed multi-segment spatial modeling.\n"
        "15. **Hepatic Blood Flow & Metabolism Autoregulation**: Liver circulation is represented as a lumped dual-supply system. Micro-lobular architecture, zone-specific hypoxia (Zones 1-3), and enzymatic induction rates for specific cytochrome P450 isoenzymes are simulated via aggregate flow rates and drug clearance ratios rather than detailed metabolic spatial maps."
    )
    content = content.replace(old_constraints, new_constraints)

    # 8. Add Section 11 files table addition
    old_section_11 = (
        "9.  [`MemoryPanel.jsx`](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/components/controls/MemoryPanel.jsx): Overlay panel showing subcortical activities, connectivities, memory states, and fear memory retrieval triggers.\n"
        "10. [`AttendingPanel.jsx`](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/components/controls/AttendingPanel.jsx): Dual-tab sidebar panel hosting the automatic clinical monitor and conversational chat."
    )
    new_section_11 = (
        "9.  [`MemoryPanel.jsx`](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/components/controls/MemoryPanel.jsx): Overlay panel showing subcortical activities, connectivities, memory states, and fear memory retrieval triggers.\n"
        "10. [`AttendingPanel.jsx`](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/components/controls/AttendingPanel.jsx): Dual-tab sidebar panel hosting the automatic clinical monitor and conversational chat.\n"
        "11. [`HepaticEngine.ts`](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/HepaticEngine.ts): Pure physical sub-engine coordinating liver perfusion, portal blood flow, HVPG dynamics, hepatorenal AKI, and PoPH-induced right heart overload."
    )
    content = content.replace(old_section_11, new_section_11)

    # 9. Add Section 12 Dependency additions
    old_dependencies = (
        "| **Swallowing Apnea** | Swallowing temporarily overrides and inhibits spontaneous breathing drive and mechanical ventilation in [RespiratoryEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/RespiratoryEngine.ts). | None. | Swallowing events do not arrest spontaneous respiration or mechanical ventilation. |"
    )
    new_dependencies = (
        "| **Swallowing Apnea** | Swallowing temporarily overrides and inhibits spontaneous breathing drive and mechanical ventilation in [RespiratoryEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/RespiratoryEngine.ts). | None. | Swallowing events do not arrest spontaneous respiration or mechanical ventilation. |\n"
        "| **Hepatic Blood Flow & HABR** | Portal and arterial flows calculated dynamically based on CO ratio and cirrhosis; HABR blunted by Sevoflurane and hypotension in [HepaticEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/HepaticEngine.ts). | None. | Dual-supply hepatic circulation (PBF/HABF) and hepatic arterial buffer response auto-compensation are unmodeled. |\n"
        "| **Portal Hypertension & Variceal Bleeding** | HVPG rises with cirrhosis and falls with TIPS; pressure surges trigger bleeding; terlipressin constricts splanchnics and stops bleed in [HepaticEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/HepaticEngine.ts). | None. | Portal venous pressure gradient is not simulated; gastroesophageal varices rupture and active hematemesis are unmodeled. |\n"
        "| **Hepatorenal Syndrome (HRS)** | Splanchnic vasodilation raises renal resistance, leading to AKI and progressive creatinine accumulation in [HepaticEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/HepaticEngine.ts). | None. | Renal artery resistance is independent of liver cirrhosis and splanchnic tone; creatinine does not accumulate in liver failure. |\n"
        "| **Portopulmonary Hypertension (PoPH)** | Cirrhosis raises mPAP; hypoxia/hypercapnia/acidosis stressors trigger acute RV failure and PEA arrest in [HepaticEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/HepaticEngine.ts) and [CardiovascularEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/CardiovascularEngine.ts). | None. | Portopulmonary hypertension and stressful triggers of right ventricular failure/PEA cardiac arrest are unmodeled. |\n"
        "| **Hepatopulmonary Syndrome (HPS)** | Cirrhosis induces intrapulmonary vascular dilations creating right-to-left shunt, blunted by oxygen in [HepaticEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/HepaticEngine.ts) and [RespiratoryEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/RespiratoryEngine.ts). | None. | Liver-induced intrapulmonary shunts and their responsive hypoxemia are unmodeled. |\n"
        "| **Low-CVP Hepatic Resection** | Venous back-bleeding scales with CVP; low-CVP fluid restriction reduces surgical blood loss in [HepaticEngine.ts](file:///Users/jsriverab/.gemini/antigravity/scratch/airway-sim/src/engine/HepaticEngine.ts). | None. | Hepatic parenchymal bleeding rate is constant and independent of central venous pressure. |"
    )
    content = content.replace(old_dependencies, new_dependencies)

    with open(filepath, 'w') as f:
        f.write(content)
    print("Success: Weaved Chapter 16 Hepatic Physiology into goldenversion.md")

if __name__ == '__main__':
    update_golden_version_ch16()
