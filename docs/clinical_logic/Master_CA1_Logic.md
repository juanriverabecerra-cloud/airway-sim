# Master_CA1_Logic.md
# TARGET SOURCE IDENTIFIER: CA1_2025
# TARGET SOURCE FULL NAME: Stanford CA-1 Tutorial Textbook 2025

# Phase 1: General Pre-Op Evaluation & Risk Stratification

## 1. General Pre-Op Evaluation & Setup Logic
* **Imaging & Testing Triggers:**
    * IF patient > 50yo AND has cardiopulmonary disease AND undergoing AAA/upper abdominal/thoracic surgery THEN trigger CXR.
    * IF patient BMI > 40 THEN CXR may be reasonable to detect underlying disease.
    * IF patient has unexplained dyspnea THEN trigger PFTs.
    * IF patient has dyspnea of unknown origin, suspected HF, worsening HF, or no Echo in >1 year THEN trigger Echo.
* **Device Management (PPM/AICD):**
    * IF surgery site is above the umbilicus THEN flag risk for interference from cautery equipment.
* **Surgical Positioning Hemodynamics:**
    * IF Steep Trendelenburg OR Reverse Trendelenburg OR Prone THEN flag for hemodynamic implications affecting line and monitor placement.

## 2. The 2024 ACC/AHA Preoperative Cardiac Assessment Algorithm
* Step 1: IF Urgency == "Emergent" (immediate threat to life/limb, < 2 hours) THEN Proceed to Surgery. ELSE go to Step 2.
* Step 2: IF Acute Cardiac Condition is present (Acute Coronary Syndrome, Unstable Arrhythmias, Decompensated Heart Failure) THEN Manage condition and multidisciplinary discussion to defer. ELSE go to Step 3.
* Step 3: Calculate RCRI (Ischemic heart disease, Cerebrovascular disease, History of HF, Insulin therapy, Serum Cr >= 2.0, High-risk surgery). Assess Risk Modifiers (Severe valvular disease, Severe pHTN, Congenital heart disease, Prior stents/CABG, Recent stroke, CIED/Pacemaker, Frailty). IF Low Risk AND No Modifiers THEN Proceed to Surgery. ELSE go to Step 4.
* Step 4: Assess Functional Capacity. IF METs >= 4 (can climb 1-2 flights of stairs or walk >3mph) OR DASI > 34 THEN Proceed to Surgery. ELSE (METs < 4 or unknown) go to Step 5.
* Step 5: IF further testing will NOT impact decision making THEN Proceed to surgery or consider alternative strategies. IF YES, go to Step 6.
* Step 6 & 7 & 8: Preoperative biomarker risk assessment (BNP, troponin). IF Normal biomarkers THEN Proceed to surgery. IF Abnormal, consider Echo/Stress Testing/CCTA. If findings are elevated risk, defer or palliate.

## 3. DAPT & Prior PCI Timing Algorithm (Non-Cardiac Surgery [NCS] Delays)
* Balloon Angioplasty Only: Delay NCS for 14 days.
* Bare-Metal Stent (BMS): Delay NCS for 30 days.
* Drug-Eluting Stent (DES) + Acute Coronary Syndrome (ACS): Delay NCS for 12 months. IF time-sensitive indication, delay NCS for at least 3 months. DO NOT perform NCS < 3 months.
* Drug-Eluting Stent (DES) + Chronic Coronary Disease (CCD): Delay NCS for 6 months. IF time-sensitive indication, delay NCS for at least 3 months. DO NOT perform NCS < 3 months.

# Phase 2: OR Setup & Core Monitoring

## 1. MSMAIDS Pre-Flight Setup Logic
* **Machine:** IF setting up OR THEN verify machine check, APL valve position, and enter patient age/weight to calculate age-adjusted MAC. 
* **Suction:** IF setting up OR THEN verify suction is working, accessible, and connected. 
* **Monitors:** IF induction is imminent THEN set NIBP cuff to cycle automatically every 1 minute. 
* **Airway:** IF spinning 180 degrees OR flipping prone THEN insert soft bite block AND attach accordion/straight connector to circuit. 

## 2. ASA Standards & Alarm State Logic
* **Qualified Personnel (Standard I):** IF general anesthesia, regional anesthesia, OR monitored anesthesia care is active THEN qualified personnel must be continuously present.
* **Ventilation (Standard II):** IF mechanically ventilated THEN a continuous disconnect alarm (e.g., expiratory flow monitor) MUST be active.
* **Circulation (Standard II):** IF anesthesia is active THEN blood pressure must be continually evaluated at a minimum of every 5 minutes. AND EKG must be continuously displayed.
* **Temperature (Standard II):** IF clinically significant changes in body temperature are anticipated THEN a temperature probe is required. 

## 3. Pulse Oximetry (SpO2) Artifact & Diagnostic Logic
* **Methemoglobinemia:** IF MetHb is elevated THEN SpO2 will falsely trend toward 85% because MetHb absorbs 660nm and 940nm light equally (R=1). IF true SpO2 > 85% THEN reading is falsely low. IF true SpO2 < 85% THEN reading is falsely high. Trigger Causes: Prilocaine, benzocaine, metoclopramide, dapsone, nitric oxide, nitroglycerin.
* **Carboxyhemoglobinemia:** IF COHb is elevated (e.g., smoke inhalation, desiccated soda lime) THEN SpO2 reading is falsely HIGH (often 95%+) despite low SaO2. 
* **Cyanide Toxicity:** IF Cyanide toxicity is present (e.g., sodium nitroprusside, smoke) THEN SpO2 reading is HIGH, but patient exhibits clinical cyanosis and high lactate due to uncoupled oxidative phosphorylation. 
* **Artifact Nullifiers:** IF HbF, HbS, acrylic nails, OR fluorescein dye are present THEN SpO2 reading has NO EFFECT/IS ACCURATE. 

## 4. Hydrostatic Blood Pressure (NIBP/Arterial) Logic
* **Sizing Errors:** IF cuff is too large THEN NIBP reads falsely LOW. IF cuff is too small THEN NIBP reads falsely HIGH.
* **Hydrostatic Gradient Calculation:** FOR EVERY 10cm height difference between the brain and the BP cuff, the pressure changes by 7.4 mmHg. 
* **Beach Chair / Sitting Position:** IF patient is in Beach Chair AND cuff is on leg reading 120/80 AND brain is 60cm higher THEN true cerebral BP is 75/35 mmHg. 

## 5. Pulse Pressure Variation (PPV) Validity Logic
* **Validity Check:** IF determining fluid responsiveness via PPV, ALL of the following MUST be true: Full mechanical ventilation (no spontaneous breaths), NO arrhythmias, Tidal Volume >= 7-8 mL/kg, and HR:RR ratio >= 4. 
* **PPV Distortion:** IF open abdomen THEN PPV is falsely reduced by 40-50%. IF PEEP is increased THEN PPV variation is increased.
* **Diagnosis:** IF PPV > 10% AND validity checks pass THEN patient is volume responsive (steep portion of Frank-Starling curve).

## 6. Capnography (ETCO2) Diagnostic Logic
* **Sudden Drop in ETCO2:** IF ETCO2 drops acutely, CHECK: Circuit/sampling line disconnect, Acute cardiovascular collapse / low cardiac index, Massive venous air embolism, Large Pulmonary Embolism, Dislodged/esophageal ETT.
* **Gradual Decrease in ETCO2:** IF ETCO2 slowly decreases, CHECK: Hypothermia, Hypothyroidism, Neuromuscular blockade. 
* **Increase in ETCO2:** IF ETCO2 rises, CHECK: Insufflation of abdomen/thorax, tourniquet deflation, Early sepsis, Malignant Hyperthermia, Hypoventilation/Mucus plugging.
* **Apnea Calculus:** IF patient is apneic THEN ETCO2 increases by 6 mmHg in the first minute, AND 3 mmHg every minute thereafter. 

## 7. Post-Intubation "A's" Checklist
* IF intubation is successfully completed, clinician must immediately verify: Airway (secured, vent set), Anesthesia (volatiles/infusions on), Access (lines), Another thing in mouth (OG tube, bite block), Arms (positioned), Air (Bair Hugger), ABG/ACT, Antibiotics, Analgesia.

# Phase 3: High-Fidelity Pharmacology & Awareness Logic

## 1. Vaporizer & Altitude Physics (Dalton's Law)
* **Sevoflurane / Isoflurane Rule:**
    * IF ambient atmospheric pressure (Patm) decreases (e.g., high altitude), standard vaporizers output a higher *volume* % of gas to maintain the exact same *partial pressure*. //
    * THEN Clinical Effect (MAC) remains unchanged. //
* **Desflurane Rule:**
    * IF ambient atmospheric pressure (Patm) decreases, the heated/pressurized Desflurane vaporizer delivers a fixed *concentration* (%), resulting in a decreased *partial pressure*. //
    * THEN the user MUST manually increase the dial setting to maintain the same anesthetic depth. //
    * *Formula:* Required Dial Setting = Desired % x (760 mmHg / Current Patm). //
* **Vaporizer Output Estimation Shortcut:**
    * Volume of volatile picked up by carrier gas = Fresh Gas Flow (mL/min) x (SVP / (760 - SVP)). //

## 2. Inhalational Uptake (FA/FI) & Shunt Kinetics
* **Rate of Rise (FA/FI) Modifiers:**
    * IF Cardiac Output (CO) is LOW, THEN FA/FI rises FASTER (predisposes to overdose, especially with highly soluble agents). //
    * IF Cardiac Output (CO) is HIGH, THEN FA/FI rises SLOWER. //
    * IF Minute Ventilation is HIGH, THEN FA/FI rises FASTER. //
* **Intracardiac Shunt (R-to-L):**
    * IF Right-to-Left Shunt is present, THEN Inhalational induction is SLOWED (due to dilution of arterial blood with shunted venous blood containing no volatile). //
    * IF Right-to-Left Shunt is present, THEN Intravenous (IV) induction is potentially FASTER (bypasses lungs, reaches brain quicker). //

## 3. MAC (Minimum Alveolar Concentration) Dynamic Scaling
* **Base Rule:** MAC values are strictly additive (e.g., 0.5 MAC N2O + 0.5 MAC Sevo = 1.0 MAC). //
* **Age-Based Scaling:**
    * IF patient is 6 months old, THEN MAC requirement is at its absolute HIGHEST. //
    * IF patient age > 40 years, THEN MAC requirement decreases by 6% per decade. //
* **Factors INCREASING MAC (Requires more drug):**
    * IF Hyperthermia, Hypernatremia, Chronic alcohol abuse, MAOIs/Ephedrine/Levodopa/TCAs, or infant (1-6 months), THEN MAC requirement is INCREASED. //
    * *Note:* Red hair genotype alters MAC but is NOT a proven risk factor for intraoperative recall. //
* **Factors DECREASING MAC (Requires less drug):**
    * IF Hypothermia, Hypoxia, Hypercarbia, Severe Anemia (Hb < 5), Sepsis, Pregnancy, Acute ethanol intoxication, Lithium, Verapamil, Alpha-2 agonists, IV anesthetics, or extreme age, THEN MAC requirement is DECREASED. //
* **MAC Sub-types:**
    * MAC-Amnesia = ~0.25 MAC. //
    * MAC-Awake = ~0.4 MAC (or ~0.6 MAC for N2O). //
    * MAC-Intubation (ED95 for preventing laryngeal response) = ~1.3 MAC. //
    * MAC-BAR (Blunt Autonomic Response) = ~1.5 MAC. //

## 4. Intraoperative Awareness Management
* **High-Risk Procedures:** Major trauma, Cardiac surgery, Cesarean section, pure TIVA. //
* **Risk Escalators:** Neuromuscular blockade (NMBA) increases awareness risk by 2x. // Chronic substance abuse increases risk. //
* **Signs of Light Anesthesia:** Tearing, dilated pupils, sweating, coughing, movement, HR or BP >20% above baseline, or BIS/SedLine elevation. //
* **Crisis Management Protocol (Suspected Awareness):**
    1. Immediately deepen anesthetic with fast-acting IV agent (e.g., Propofol). //
    2. Talk to patient, reassure (hearing is the last sense lost, first to return). //
    3. Administer Benzodiazepine for amnesia. //
    4. Counsel post-operatively (required in 40-60% of episodes). //

## 5. Specific IV Anesthetic Constraints
* **Propofol (PRIS Constraint):** IF prolonged high-dose infusion in pediatrics or critically ill, THEN trigger risk for Propofol Infusion Syndrome (Metabolic acidosis, rhabdomyolysis, cardiac failure). //
* **Etomidate Constraint:** IF administered, THEN trigger adrenocortical inhibition (lasting 4-8 hours). May increase mortality in septic patients. // Does NOT reduce Cerebral Perfusion Pressure (CPP). //
* **Ketamine Constraints:** IF administered, THEN secretions increase (requires Glycopyrrolate). // AND psychomimetic reactions may occur (requires Midazolam). // Can cause hypotension if catecholamines are already depleted. //
* **Thiopental/Methohexital Constraints:** IF Methohexital administered, THEN seizure threshold decreases (ideal for ECT). // IF Thiopental injected intra-arterially, THEN profound necrosis (Treat: Papaverine/Lidocaine/Sympathectomy). // Do NOT mix with Rocuronium (precipitates). //
* **Flumazenil (Reversal) Constraint:** IF Flumazenil administered (0.2mg), THEN duration is 45-90 minutes. MUST monitor for re-sedation for 2-3 hours because benzodiazepine half-life often exceeds Flumazenil. //

# Phase 4: Opioids, Hemodynamics & Neuromuscular Blockade Logic

## 1. Opioid Administration & Contraindication Logic
* **Renal Failure Constraints:**
    * IF patient has renal failure, THEN AVOID Morphine (Morphine-6-glucuronide active metabolite accumulates causing respiratory depression; Morphine-3-glucuronide causes neuroexcitation). //
    * IF patient has renal failure, THEN AVOID Meperidine (Normeperidine metabolite accumulates causing reduced seizure threshold). //
* **Drug Interaction Constraints:**
    * IF patient is taking MAOIs, THEN STRICTLY AVOID Meperidine (risk of fatal Serotonin Syndrome / Libby Zion Law). //
* **Remifentanil Infusion Logic:**
    * IF Remifentanil is infused for a prolonged time or at high doses (>0.15 mcg/kg/min), THEN anticipate Opioid-Induced Hyperalgesia and acute opioid tolerance upon cessation. //
    * IF Remifentanil is administered as a bolus, THEN anticipate bradycardia. //
* **Opioid Antagonism / Rescue:**
    * IF Naloxone is given, THEN monitor continuously for 30-45 minutes because its duration of action is shorter than most full opioid agonists (risk of re-narcotization). //

## 2. Hemodynamic Troubleshooting (MAP = CO x SVR)
* **Hypotension Diagnosis:**
    * IF Hypotension occurs, THEN systematically evaluate HR, Preload, Contractility, and Afterload (SVR). //
    * IF wide pulse pressure (> 40 mmHg), THEN suspect aortic regurgitation, atherosclerosis, or high output state. //
    * IF narrow pulse pressure (< 25 mmHg), THEN suspect aortic stenosis, cardiac tamponade, tension pneumothorax, or shock. //
* **Hypertensive Crisis:**
    * IF Hypertension is accompanied by Tachycardia, THEN treat underlying cause (pain, light anesthesia, hypoxemia, sympathetic overdrive). //
    * IF Cushing's Triad is present (HTN, bradycardia, irregular respirations), THEN suspect elevated ICP. //

## 3. Neuromuscular Blockade (NMBA) Logic
* **Succinylcholine (Depolarizing) Contraindications:**
    * IF patient has Hyperkalemia, Burn injury (>24 hrs up to 1-2 years), Muscular dystrophy, Myotonias, Prolonged immobility, Upper motor neuron disease, History of MH, or Open globe injury, THEN STRICTLY AVOID Succinylcholine (Risk of lethal hyperkalemia from extrajunctional nAChR upregulation). //
* **Non-Depolarizing NMBA Selection:**
    * IF patient has renal failure, THEN AVOID Vecuronium (3-OH metabolite accumulates causing prolonged blockade). //
    * IF patient requires enzyme-independent clearance (e.g., organ failure), THEN SELECT Cisatracurium (Hofmann elimination). //
* **nAChR Receptor States (Sensitivity Matrix):**
    * IF nAChR is UPREGULATED (Burns, Spinal cord injury, prolonged immobility), THEN patient is SENSITIVE to Succinylcholine AND RESISTANT to Non-depolarizing NMBAs. //
    * IF nAChR is DOWNREGULATED (Myasthenia Gravis), THEN patient is RESISTANT to Succinylcholine AND SENSITIVE to Non-depolarizing NMBAs. //

## 4. Neuromuscular Blockade Reversal Logic
* **Sugammadex Reversal:**
    * IF ROC/VEC is used AND TOF = 0 but PTC >= 2, THEN dose Sugammadex at 16 mg/kg (Deep reversal / Cannot Intubate Cannot Ventilate). //
    * IF TOF = 0 and PTC = 1-2, THEN dose Sugammadex at 4 mg/kg. //
    * IF TOF >= 2 twitches, THEN dose Sugammadex at 2 mg/kg. //
* **Neostigmine Reversal:**
    * IF Neostigmine is administered, THEN it MUST be paired with an anticholinergic (Glycopyrrolate) to prevent severe muscarinic bradycardia. //
    * IF patient has < 2 twitches, THEN DO NOT administer Neostigmine (wait for spontaneous recovery to start). //

# Phase 5: Airway Management, Fluids, and Transfusion Logic

## 1. Airway Assessment & Predictors Logic
* **Difficult Mask Ventilation (MaMaBOATS):**
    * IF Mallampati III/IV OR Mandibular protrusion decreased OR Beard OR Obesity (BMI >30) OR Age > 57 OR Teeth absent OR Snoring, THEN flag for Difficult Mask Ventilation.
    * IF Male + Beard + OSA + Radiation changes to neck, THEN flag for IMPOSSIBLE Mask Ventilation (MaMaBORa).
* **Difficult Intubation:**
    * IF Mallampati III/IV OR Short/thick neck (>40cm) OR Interincisor distance <4cm OR Thyromental distance <6cm OR Sternomental distance <12cm OR Prominent overbite OR ULBT Class III OR Cervical ROM <30 degrees OR Poor submandibular compliance, THEN flag for Difficult Intubation (Direct and Video).
* **Difficult Supraglottic Airway (SGA - MR ODDORR):**
    * IF Male gender OR Restricted mouth opening OR Obesity OR Dentition (poor) OR Distorted anatomy OR Obstruction at/below larynx OR Reduced neck ROM OR Radiation to neck, THEN flag for Difficult SGA.
* **Difficult Surgical Airway:**
    * IF Obesity OR Facial hair OR Prior ENT surgery OR Prior radiation to neck OR Goiter, THEN flag for Difficult Surgical Airway.

## 2. ASA Difficult Airway Algorithm (Pseudocode)
* **Pre-Induction Planning:**
    * IF Suspected difficult laryngoscopy AND (Suspected difficult mask/SGA OR Increased aspiration risk OR Rapid desaturation risk), THEN Proceed to Awake Airway Management.
    * ELSE Proceed with Induction of Anesthesia.
* **Awake Airway Management:**
    * IF Awake technique fails, THEN Cancel/Postpone case OR Induce anesthesia with preparations for emergency invasive airway (if urgent/cannot postpone).
* **Post-Induction (Asleep) Intubation Fails:**
    * Step 1: Call for help. Attempt mask ventilation.
    * Step 2 (Non-Emergency Pathway): IF Mask ventilation is ADEQUATE, THEN limit DL attempts (max 3, change blade/position/provider). Consider SGA, Video Laryngoscopy, or Fiberoptic.
    * Step 3 (Emergency Pathway): IF Mask ventilation INADEQUATE and SGA placement FAILS (or ventilation through SGA inadequate), THEN declare "Cannot Intubate, Cannot Oxygenate" (CICO). 
    * Step 4 (CICO Rescue): IMMEDIATELY perform Emergency Invasive Airway (Cricothyroidotomy, Tracheostomy, or Rigid Bronchoscopy/ECMO). Do not postpone.

## 3. Surgical Airway (Scalpel-Bougie) Workflow
* IF performing Emergency Cricothyroidotomy:
    1. Identify cricothyroid membrane.
    2. Make vertical midline incision.
    3. Make horizontal stab incision through membrane and extend to edges.
    4. Turn scalpel 180 degrees and extend.
    5. Pass bougie introducer through incision.
    6. Railroad a 6.0 cuffed ETT over the bougie until balloon is in trachea.
    7. Confirm with ETCO2.

## 4. Fluid Management & Intraoperative Oliguria Logic
* **Fluid Compartments (60-40-20 Rule):**
    * Total Body Water (TBW) = Weight x 60% (Males) or 50% (Females).
    * Intracellular Fluid (ICF) = 40% of body weight (2/3 of TBW).
    * Extracellular Fluid (ECF) = 20% of body weight (1/3 of TBW).
    * Intravascular (Plasma) = 20% of ECF. Interstitial = 80% of ECF.
* **Parkland Formula (Burns):**
    * IF patient has severe burns, THEN Total Volume = %BSA x 4mL/kg x Weight(kg).
    * Administer 1/2 of Total Volume over first 8 hours. Administer remaining 1/2 over next 16 hours. (Replace with Lactated Ringers).
    * IF burn injury is >24h old, THEN STRICTLY AVOID Succinylcholine (Hyperkalemia risk from nAChR upregulation).
* **Intraoperative Oliguria Troubleshooting:**
    * IF Pre-Renal (Hypovolemia, Decreased CO, Increased intra-abdominal pressure), THEN increase perfusion via fluid bolus OR inotropes/vasopressors.
    * IF Intrinsic Renal (Neuroendocrine ADH release, Baroreceptor response to PPV), THEN assess if true injury vs physiologic surgical response.
    * IF Post-Renal (Kinked foley, surgical manipulation of ureters), THEN flush/check foley, consider IV dyes (Indigo carmine, methylene blue) to verify ureter patency.

## 5. Transfusion Therapy & Reaction Logic
* **Massive Transfusion Protocol (MTG):**
    * IF blood loss > 1 blood volume (~10 units) in 24 hours, THEN activate MTG (Target ratio: 6 pRBCs, 4 FFP, 1 Platelet apheresis).
    * Watch for Lethal Triad: Hypothermia, Acidosis, Coagulopathy.
    * IF rapid transfusion of citrated blood occurs, THEN anticipate Hypocalcemia AND Hypomagnesemia (Citrate toxicity). Administer Calcium.
    * IF old pRBCs are transfused, THEN anticipate Hyperkalemia (K+ leakage during storage) AND Impaired O2 delivery (Decreased 2,3-DPG causing left-shift of oxyhemoglobin curve).
* **Transfusion Reaction Triage:**
    * IF Fever + Chills + Hypotension + Brown Urine (Acute Hemolytic), THEN STOP transfusion, maintain alkaline UOP, treat for ABO incompatibility.
    * IF Fever + Dyspnea + Hypoxemia + Bilateral Infiltrates within 6 hours (TRALI), THEN diagnose non-cardiogenic pulmonary edema (donor antibodies vs recipient leukocytes). Treat with mechanical ventilation, low tidal volumes, high PEEP. (Diuretics/steroids are NOT indicated).
    * IF Dyspnea + High BNP + High CVP + Pulmonary Edema (TACO), THEN diagnose volume overload. Treat with Diuretics.
    * IF Shock + Angioedema + ARDS within minutes (Anaphylaxis), THEN suspect IgA deficiency. Stop blood, give Epi, use washed RBCs in future.

# Phase 6: Respiratory, Electrolyte, Thermoregulation, and PONV Logic

## 1. Hypoxemia & Ventilation Troubleshooting Logic
* **Shunt vs. V/Q Mismatch Diagnosis:**
    * IF Hypoxemia is present AND patient DOES NOT improve with 100% FiO2, THEN diagnose Absolute Shunt (V/Q = 0; e.g., congenital heart defect, alveolar fluid/ARDS, endobronchial intubation).
    * IF Hypoxemia is present AND patient DOES improve with 100% FiO2, THEN diagnose V/Q Mismatch, Hypoventilation, or Diffusion Impairment.
* **Airway Pressure (PIP/Pplat) Diagnostics:**
    * IF Peak Inspiratory Pressure (PIP) is INCREASED AND Plateau Pressure (Pplat) is UNCHANGED, THEN diagnose Increased Airway Resistance (e.g., Bronchospasm, kinked ETT, mucus plug, foreign body).
    * IF Peak Inspiratory Pressure (PIP) is INCREASED AND Plateau Pressure (Pplat) is INCREASED, THEN diagnose Decreased Pulmonary Compliance (e.g., Abdominal insufflation, obesity, pulmonary edema, tension pneumothorax, Trendelenburg position).
* **Absorption Atelectasis vs. Diffusion Hypoxia:**
    * IF patient is maintained on 100% FiO2 (0% Nitrogen), THEN anticipate Absorption Atelectasis (Nitrogen normally splints alveoli open).
    * IF Emergence occurs with N2O cessation, THEN anticipate Diffusion Hypoxia (N2O floods alveoli, displacing O2; MUST administer 100% O2 during emergence).

## 2. O2-Hgb Dissociation Curve Shift Logic
* **Left Shift (Increased Affinity / Decreased O2 Unloading at Tissues):**
    * IF Alkalosis OR Hypothermia OR Hypocarbia OR Decreased 2,3-DPG OR Carbon Monoxide (CO-Hb) OR Methemoglobinemia, THEN shift curve LEFT.
* **Right Shift (Decreased Affinity / Increased O2 Unloading at Tissues):**
    * IF Acidosis OR Hyperthermia OR Hypercarbia (Bohr Effect) OR Increased 2,3-DPG OR Sickle Cell OR Volatile Anesthetics, THEN shift curve RIGHT.
* **Maternal/Fetal Shift:**
    * IF Pregnancy, THEN Maternal curve shifts RIGHT (P50 = 30) AND Fetal curve shifts LEFT (P50 = 18) to facilitate oxygen transfer across placenta.

## 3. Electrolyte Crisis Management Logic
* **Hyperkalemia (K+ > 5.5 mEq/L):**
    * IF K+ is elevated, THEN STRICTLY AVOID Succinylcholine AND avoid respiratory acidosis (hypoventilation).
    * IF treating Hyperkalemia with IV fluids, THEN prefer Lactated Ringers or Plasmalyte over Normal Saline (Normal Saline induces hyperchloremic metabolic acidosis, worsening Hyperkalemia).
    * IF EKG shows tall peaked T-waves or widened QRS, THEN immediately administer Calcium Gluconate or Calcium Chloride to stabilize the myocardium. Follow with Bicarbonate/Insulin/Hyperventilation to shift K+ intracellularly.
* **Hypocalcemia (Ca2+ deficiency):**
    * IF patient receives Massive Transfusion (citrate load) OR Hyperventilation (alkalosis increases Ca2+-albumin binding), THEN anticipate Hypocalcemia.
    * IF symptomatic (hypotension, prolonged QT, stridor), THEN administer Calcium. DO NOT administer Calcium and Sodium Bicarbonate in the same IV line (precipitates).
* **Magnesium Derangements:**
    * IF Hypermagnesemia is present (e.g., OB tocolysis), THEN anticipate enhanced neuromuscular blockade. Reduce NMBA doses by 25-50%.

## 4. Thermoregulation & Shivering Logic
* **Anesthetic Thermoregulation Inhibition:**
    * IF General Anesthesia is induced, THEN the interthreshold range expands 20-fold (from 0.2°C to ~4.0°C).
    * IF Regional/Neuraxial Anesthesia is induced, THEN the interthreshold range expands 4-fold.
    * IF Phase 1 (First 30 mins) of anesthesia occurs, THEN anticipate rapid Redistribution Hypothermia (core to periphery). Prevent via 30 minutes of pre-operative forced-air warming.
* **Shivering Crisis:**
    * IF patient shivers in PACU, THEN O2 consumption increases up to 500% AND Minute Ventilation requirements dramatically increase.
    * IF shivering must be treated pharmacologically, THEN administer Meperidine 12.5-25mg IV. (CAUTION: Avoid Meperidine if renal failure is present due to normeperidine accumulation/seizures).

## 5. Postoperative Nausea & Vomiting (PONV) Logic
* **Apfel Risk Scoring (Adults):**
    * IF Female (+1) AND History of PONV/Motion Sickness (+1) AND Non-smoker (+1) AND Post-op Opioids planned (+1), THEN calculate total score (0-4).
    * IF Apfel Score >= 2 (Medium to High Risk), THEN administer multiple antiemetics from DIFFERENT receptor classes (e.g., 5-HT3 antagonist + Corticosteroid).
* **Anesthetic Mitigation Strategy:**
    * IF High PONV Risk, THEN utilize Regional Anesthesia OR Propofol TIVA. AVOID Volatile anesthetics and N2O. Minimize opioids.

# Phase 7: Extubation, Airway Emergencies, and Anaphylaxis Logic

## 1. Extubation Criteria & Risk Stratification Logic
* **Risk Stratification:**
    * IF patient has known difficult airway OR airway edema (prone/Trendelenburg/large fluid resuscitation) OR OSA OR high aspiration risk, THEN classify as HIGH RISK extubation. //
* **Deep Extubation Logic:**
    * IF performing Deep Extubation, THEN patient MUST NOT respond to pharyngeal suctioning or jaw thrust (must be adequately deep). //
    * IF Deep Extubation performed, THEN patient is at high risk for laryngospasm during transport/PACU emergence. //
* **"Routine" Awake Extubation Checklist:**
    * IF extubating awake, THEN ALL of the following MUST be met:
        1. Vital signs stable, Temp > 35.5C. //
        2. Spontaneous RR > 6 and < 30, SpO2 > 90%. //
        3. PaO2 >= 60 mmHg, PaCO2 <= 50-60 mmHg (EtCO2 < 50-60). //
        4. Quantitative TOF ratio > 0.9 (Direct palpation or 5-sec head lift is NOT specific enough). //
        5. Spontaneous Tidal Volume (VT) > 5 mL/kg AND Vital Capacity (VC) > 15 mL/kg. //
        6. Protective reflexes (gag, swallow, cough) returned and patient follows commands. //
* **Cuff Leak Test (Airway Edema Check):**
    * IF airway edema is a concern, THEN deflate ETT cuff on Volume Control mode. //
    * IF difference between programmed VT and observed expiratory VT is >= 10-15%, THEN cuff leak is adequate (safe to extubate). //

## 2. Delayed Emergence Stanford Protocol
* **Initial Troubleshooting:**
    * IF Delayed Emergence, THEN confirm all anesthetics are OFF AND check/reverse residual NMB paralysis. //
* **Pharmacological Antagonism Algorithm:**
    * IF suspected opioid overdose, THEN give Naloxone 40mcg IV (repeat q2 mins up to 200mcg total). //
    * IF suspected benzodiazepine overdose, THEN give Flumazenil 0.2mg IV (repeat q1 min up to 1mg total). //
    * IF suspected central anticholinergic syndrome / volatile delay, THEN consider Physostigmine 1.25mg IV. //
* **Metabolic & Neurologic Checks:**
    * IF Temp < 34C, THEN actively warm. //
    * IF all pharmacological/metabolic causes ruled out, THEN obtain STAT head CT and consult neurology (Rule out CVA, 2.5-5% risk in high-risk pts). //

## 3. Laryngospasm & NPPE Crisis Management
* **Laryngospasm Algorithm:**
    * IF inspiratory stridor OR paradoxical chest movements OR loss of EtCO2, THEN suspect Laryngospasm (mediated by SLN). //
    * Step 1: Apply CPAP with 100% O2 via tight-fitting mask + Vigorous Jaw Thrust (Larson's Maneuver). //
    * Step 2: IF no improvement, THEN deepen anesthesia (Propofol 0.5-1.0 mg/kg IV). //
    * Step 3: IF complete laryngospasm persists (hypoxia/bradycardia), THEN give Succinylcholine 0.5-2.0 mg/kg IV + Atropine 20 mcg/kg IV. //
* **Negative Pressure Pulmonary Edema (NPPE) Logic:**
    * IF patient bites tube or has laryngospasm AND generates extreme negative intrathoracic pressure (up to -100 cmH2O), THEN anticipate NPPE. //
    * IF NPPE develops, THEN apply supportive care (100% O2, PEEP/CPAP). //
    * IF treating NPPE, THEN DO NOT administer Lasix (Diuretics are usually NOT helpful as this is non-cardiogenic). //

## 4. Pulmonary Aspiration Logic
* **Aspiration Pneumonitis Risk:**
    * IF aspirated gastric volume > 25 mL AND pH < 2.5, THEN highest risk for sterile chemical pneumonitis. //
* **Aspiration Treatment Workflow:**
    * Step 1: Place patient in head-down (Trendelenburg) position to pool secretions in posterior pharynx. //
    * Step 2: IMMEDIATELY suction pharynx and trachea BEFORE applying Positive Pressure Ventilation (PPV). //
    * Step 3: Apply 100% O2, Intubate, and apply PEEP or CPAP. //
    * IF particulate matter is suspected, THEN perform bronchoscopy. //
    * IF pure chemical pneumonitis, THEN DO NOT give antibiotics or steroids (unless subsequent infection develops). //

## 5. Oxygen Failure Logic
* **Detection & Management:**
    * IF O2 Pipeline Failure occurs, THEN disconnect patient from machine AND ventilate with self-inflating Ambu bag. //
    * STRICT CONSTRAINT: DO NOT use auxiliary O2 on the anesthesia machine (the source is the same broken pipeline). //
    * IF utilizing machine backup, THEN open O2 E-cylinder on the back of the machine AND physically disconnect the central pipeline wall hose. //
    * IF using backup O2, THEN use manual ventilation to conserve O2 (pneumatic ventilators consume high O2). //

## 6. Anaphylaxis & Protamine Reaction Logic
* **Anaphylaxis Treatment Workflow:**
    * Step 1: Stop administration of offending antigen. //
    * Step 2: Increase FiO2 to 100% and notify surgeon/help. //
    * Step 3: Discontinue volatile anesthetics (they cause vasodilation). Use alternative amnestics (Midazolam, Ketamine). //
    * Step 4: Administer massive IV fluid bolus (2-4 Liters or more). //
    * Step 5: Administer Epinephrine (10-100 mcg IV boluses for hypotension; start infusion 0.02-0.3 mcg/kg/min). //
    * IF refractory, THEN administer Vasopressin bolus or Norepinephrine infusion. //
* **Diagnostic Labs:**
    * IF Anaphylaxis is suspected, THEN draw Serum Tryptase (peaks 60 mins post-event) AND Serum Histamine (peaks <30 mins post-event). //
* **Protamine Reactions:**
    * IF Type I, THEN isolated hypotension (histamine release). //
    * IF Type II, THEN true anaphylaxis/anaphylactoid (IgE mediated). //
    * IF Type III, THEN severe refractory hypotension, acute RV failure, high PA pressures (Thromboxane A2 mediated). //

# Phase 8: Local Anesthetics & Cardiac Physiology Logic

## 1. Local Anesthetic (LA) Pharmacokinetics & Onset Logic
* **Mechanism of Action:**
    * IF LA is administered, THEN the non-ionized (base, lipid-soluble) form crosses the axonal lipid bilayer. //
    * IF LA crosses the membrane, THEN it re-equilibrates in the axoplasm into both ionized and non-ionized forms. //
    * IF LA is in the axoplasm, THEN the ionized (cationic, water-soluble) form reversibly binds the intracellular alpha subunit of the voltage-gated Na+ channel. //
    * IF the Na+ channel is blocked, THEN Na+ influx is inhibited, preventing an action potential from being reached. //
    * IF LA is active, THEN resting membrane and threshold potentials remain UNAFFECTED. //
* **Speed of Onset (pKa and pH Interplay):**
    * IF pKa is further from physiologic pH (e.g., Bupivacaine pKa = 8.2), THEN a greater fraction of the drug remains in the ionized form outside the nerve. //
    * IF a greater fraction is ionized, THEN less drug crosses the neuronal membrane, leading to a SLOWER onset of action. //
    * IF pKa is closer to physiologic pH (e.g., Lidocaine pKa = 7.9), THEN a greater fraction of the drug is in the non-ionized form. //
    * IF a greater fraction is non-ionized, THEN more drug readily crosses the neuronal membrane, leading to a FASTER onset of action. //

## 2. Cardiac Electrophysiology (Action Potential) Logic
* **Ventricular Myocytes (FAST Action Potentials):**
    * IF Myocyte = Ventricular, THEN Phase 0 triggers rapid Na+ channels to open (depolarization). //
    * IF Phase 1 is reached, THEN Na+ channels close AND K+ diffuses out (slight repolarization). //
    * IF Phase 2 is reached, THEN K+ outflow is perfectly balanced by Ca2+ inflow (plateau). //
    * IF Phase 3 is reached, THEN Ca2+ channels close AND only K+ remains open (repolarization). //
* **SA and AV Node Myocytes (SLOW Action Potentials):**
    * IF Myocyte = SA or AV node, THEN Phase 1 and Phase 2 are ABSENT. //
    * IF Phase 4 is active, THEN slow Na+ and Ca2+ channels open (slow spontaneous depolarization / automaticity). //
    * IF Phase 0 triggers in nodal cells, THEN the upstroke is driven entirely by Ca2+ opening (not Na+). //
* **Resting Potential Determinants:**
    * IF assessing resting potential (approx -90mV), THEN K+ concentration gradient (maintained by Na/K ATPase) is the major determinant. //

## 3. Cardiac Cycle & CVP Waveform Coupling
* **Atrial Contribution (The "Atrial Kick"):**
    * IF patient is in late diastolic filling, THEN atrial systole ("Atrial Kick") contributes exactly 25% of the total End-Diastolic Volume (EDV). //
* **Central Venous Pressure (CVP) Mechanical Coupling:**
    * IF CVP 'a' wave occurs, THEN it corresponds to atrial contraction. //
    * IF CVP 'c' wave occurs, THEN it corresponds to isovolumic ventricular contraction causing tricuspid valve motion toward the right atrium. //
    * IF CVP 'x' descent occurs, THEN it corresponds to atrial relaxation, descent of the cardiac base, and systolic collapse. //
    * IF CVP 'v' wave occurs, THEN it corresponds to systolic filling of the atrium against a closed tricuspid valve. //
    * IF CVP 'y' descent occurs, THEN it corresponds to the opening of the tricuspid valve, early ventricular filling, and diastolic collapse. //

## 4. Frank-Starling Contractility Logic
* **Preload vs. Stroke Volume Relationship:**
    * IF Ventricular End-Diastolic Volume (Preload) INCREASES, THEN Ventricular Performance / Stroke Volume INCREASES, up to an optimal plateau. //
    * IF patient has Heart Failure OR Fatal Myocardial Depression, THEN the Frank-Starling curve shifts DOWN and RIGHT, producing significantly less stroke volume for any given EDV. //
    * IF patient is exercising (Running/Walking), THEN increased contractile state shifts the curve UP and LEFT. //