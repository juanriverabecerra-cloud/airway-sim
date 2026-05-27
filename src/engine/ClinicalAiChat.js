/**
 * Clinical AI Chat Engine
 * Evaluates free-form natural language queries against the real-time physiological simulator state.
 * Synthesizes highly nuanced, medically rigorous clinical guidance mimicking a senior anesthesiology attending.
 * Incorporates interactive keywords mapped to CLINICAL_ACTIONS so that recommended treatments are clickable.
 */

function fmt(val, decimals = 0) {
  if (val === undefined || val === null || isNaN(val)) return 'N/A';
  return typeof val === 'number' ? val.toFixed(decimals) : val;
}

export function getAttendingResponse(query, {
  vitals = {},
  patient = {},
  activeMeds = [],
  surgicalPhase = 'Pre-Op',
  time = 0,
  logs = []
} = {}) {
  const q = query.toLowerCase().trim();

  // 1. EXTRACT PHYSIOLOGICAL & PHARMACOLOGICAL VARIABLES
  const hr = vitals.hr || 0;
  const sys = vitals.sys || 0;
  const dia = vitals.dia || 0;
  const map = vitals.map || 0;
  const spo2 = vitals.spo2 || 100;
  const paco2 = vitals.paco2 || 40;
  const etco2 = vitals.etco2 || 40;
  const mac = vitals.mac || 0;
  const bis = vitals.bis !== undefined ? vitals.bis : 99;
  const tofCount = vitals.tofCount !== undefined ? vitals.tofCount : 4;
  const pip = vitals.pip || 0;
  const compliance = vitals.compl || 60;
  const resistance = vitals.res || 10;

  const isArrest = patient.isArrest || false;
  const rhythm = patient.cardiacRhythm || 'sinus';
  const stunning = patient.myocardialStunning || 0;
  const ebl = patient.ebl || 0;
  const ebv = patient.ebv || 5000;
  const potassium = patient.suxPotassiumLeaked ? (patient.potassiumLevel || 6.2) : 4.0;
  const isSeptic = patient.isSeptic || false;
  const isAnaphylaxis = patient.anaphylaxisTriggered || false;
  const isAnaphylaxisTreated = patient.anaphylaxisTreated || false;
  const bradycardiaTriggered = patient.bradycardiaTriggered || false;
  const airwaySecured = patient.airwaySecured || false;
  
  const frc_L = patient.lungVolumes?.frc_L || 2.4;
  const o2Buffer = patient.oxygenBuffer !== null && patient.oxygenBuffer !== undefined ? patient.oxygenBuffer : 0.5;
  const frcO2Percent = frc_L > 0 ? (o2Buffer / frc_L) * 100 : 21;

  // Sedatives and opioids active levels
  const propofolCe = activeMeds.find(m => m.name === 'Propofol')?.Ce || 0;
  const etomidateCe = activeMeds.find(m => m.name === 'Etomidate')?.Ce || 0;
  const ketamineCe = activeMeds.find(m => m.name === 'Ketamine')?.Ce || 0;
  const fentanylCe = activeMeds.find(m => m.name === 'Fentanyl')?.Ce || 0;
  const rocuroniumCe = activeMeds.find(m => m.name === 'Rocuronium')?.Ce || 0;
  const succinylcholineCe = activeMeds.find(m => m.name === 'Succinylcholine')?.Ce || 0;

  // 2. DEFINE INTENT DETECTORS & GENERATE CLINICAL ANSWERS

  // A. ACLS / Cardiac Arrest
  if (isArrest || q.includes('arrest') || q.includes('acls') || q.includes('asystole') || q.includes('v-fib') || q.includes('cpr') || q.includes('cardiac arrest') || q.includes('audit ')) {
    const temp = vitals.temp !== undefined ? vitals.temp : 37.0;

    if (q.includes('hypovolemia')) {
      let msg = `### 🔍 H's & T's Audit: HYPOVOLEMIA\n\n`;
      msg += `Hypovolemia is a leading cause of intraoperative cardiac arrest. Let's audit the volume status:\n\n`;
      msg += `- **Estimated Blood Loss (EBL)**: ${fmt(ebl)} mL\n`;
      msg += `- **Estimated Blood Volume (EBV)**: ${fmt(ebv)} mL\n`;
      msg += `- **Blood Loss Ratio**: ${(ebl / ebv * 100).toFixed(1)}%\n`;
      msg += `- **Intravascular Fluid Volume**: ${fmt(patient.intravascularVolume || 5000)} mL\n\n`;
      
      const bloodLossRatio = ebl / ebv;
      if (bloodLossRatio > 0.25 || (patient.intravascularVolume && patient.intravascularVolume < 4200)) {
        msg += `🔴 **DIAGNOSTIC STATUS: CONFIRMED HYPOVOLEMIA**\n`;
        msg += `The patient has lost a significant fraction of blood volume (${(bloodLossRatio * 100).toFixed(1)}% of total volume), causing severe venous return depletion and circulatory collapse. This is driving the cardiac arrest.\n\n`;
        msg += `**Immediate Treatment Protocol**:\n`;
        msg += `1. **Fluids**: Administer large-volume fluid resuscitation (Normal Saline or Lactated Ringer's IV).\n`;
        msg += `2. **Blood**: Initiate blood transfusion immediately if blood is crossed/available.\n`;
        msg += `3. Click [labs] to evaluate hemoglobin.`;
      } else {
        msg += `🟢 **DIAGNOSTIC STATUS: HYPOVOLEMIA UNLIKELY**\n`;
        msg += `Intravascular volume is relatively well maintained (${fmt(patient.intravascularVolume || 5000)} mL) and blood loss is minimal. Hypovolemia is not the primary driver of this arrest.\n\n`;
        msg += `Keep searching the other H's and T's: click [audit hypoxia], [audit acidosis], [audit hyperkalemia], or [audit toxins].`;
      }
      return msg;
    }
    
    if (q.includes('hypoxia')) {
      let msg = `### 🔍 H's & T's Audit: HYPOXIA\n\n`;
      msg += `Hypoxia prevents myocardial oxidative phosphorylation, leading to rapid brady-asystolic cardiac arrest.\n\n`;
      msg += `- **Oxygen Saturation (SpO2)**: ${fmt(spo2)}%\n`;
      msg += `- **Alveolar O2 Buffer (FRC O2)**: ${frcO2Percent.toFixed(1)}%\n`;
      msg += `- **Airway Secured**: ${airwaySecured ? 'YES' : 'NO'}\n`;
      msg += `- **Tube Position**: ${patient.tubePosition?.toUpperCase() || 'N/A'}\n\n`;
      
      if (spo2 < 75 || frcO2Percent < 45 || patient.tubePosition === 'esophagus') {
        msg += `🔴 **DIAGNOSTIC STATUS: CONFIRMED SEVERE HYPOXIA**\n`;
        msg += `Severe arterial and tissue hypoxia is present. Myocardial oxygenation has collapsed, rendering the heart unable to sustain pacemaker activity.\n\n`;
        msg += `**Immediate Treatment Protocol**:\n`;
        msg += `1. Ensure **FiO2 100%** on the ventilator and increase fresh gas flow.\n`;
        msg += `2. If not intubated, perform [laryngoscopy] immediately to secure the airway.\n`;
        msg += `3. If intubated, verify tube position (rule out esophagus or mainstem).\n`;
        msg += `4. If severe bronchospasm is active, administer [albuterol] via ETT.`;
      } else {
        msg += `🟢 **DIAGNOSTIC STATUS: HYPOXIA UNLIKELY**\n`;
        msg += `The patient is well-oxygenated (SpO2: ${fmt(spo2)}%, FRC O2: ${frcO2Percent.toFixed(1)}%). Hypoxia is not the cause of this cardiac arrest.\n\n`;
        msg += `Keep searching the other H's and T's: click [audit hypovolemia], [audit acidosis], [audit hyperkalemia], or [audit toxins].`;
      }
      return msg;
    }
    
    if (q.includes('acidosis')) {
      const currentPh = vitals.ph || electrolytes?.ph || 7.4;
      let msg = `### 🔍 H's & T's Audit: HYDROGEN ION (ACIDOSIS)\n\n`;
      msg += `Acidosis depresses myocardial contractility and blunts the effectiveness of endogenous and exogenous catecholamines.\n\n`;
      msg += `- **Arterial pH**: ${fmt(currentPh, 2)} (Normal: 7.35 - 7.45)\n`;
      msg += `- **PaCO2 / EtCO2**: ${fmt(paco2)} / ${fmt(etco2)} mmHg\n`;
      msg += `- **Lactic Acid**: ${fmt(patient.lacticAcid || 1.0, 1)} mmol/L\n\n`;
      
      if (currentPh < 7.15) {
        msg += `🔴 **DIAGNOSTIC STATUS: CONFIRMED SEVERE ACIDOSIS**\n`;
        msg += `Severe acidosis is present (pH: ${fmt(currentPh, 2)}). This is likely a mixed respiratory acidosis (from hypoventilation/apnea) and metabolic lactic acidosis (from low tissue perfusion).\n\n`;
        msg += `**Immediate Treatment Protocol**:\n`;
        msg += `1. Optimize ventilation: increase RR and Vt to wash out CO2.\n`;
        msg += `2. Administer sodium bicarbonate IV if metabolic acidosis is severe and refractory.\n`;
        msg += `3. Ensure high-quality chest compressions to improve tissue perfusion and oxygenation.`;
      } else {
        msg += `🟢 **DIAGNOSTIC STATUS: ACIDOSIS UNLIKELY**\n`;
        msg += `The patient's pH is stable at ${fmt(currentPh, 2)}. Severe acidosis is not the primary driver of this arrest.\n\n`;
        msg += `Keep searching the other H's and T's: click [audit hypovolemia], [audit hypoxia], [audit hyperkalemia], or [audit toxins].`;
      }
      return msg;
    }
    
    if (q.includes('hyperkalemia') || q.includes('potassium') || q.includes('hypokalemia')) {
      let msg = `### 🔍 H's & T's Audit: POTASSIUM / HYPERKALEMIA\n\n`;
      msg += `Hyperkalemia alters the cardiac action potential, causing peaked T waves, widened QRS, and brady-asystolic cardiac arrest.\n\n`;
      msg += `- **Serum Potassium (K+)**: ${fmt(potassium, 1)} mEq/L (Normal: 3.5 - 5.0 mEq/L)\n`;
      msg += `- **Calcium Administered**: ${patient.calciumAdministered ? 'YES' : 'NO'}\n\n`;
      
      if (potassium > 5.5) {
        msg += `🔴 **DIAGNOSTIC STATUS: CONFIRMED SEVERE HYPERKALEMIA**\n`;
        msg += `The potassium level is dangerously elevated at ${fmt(potassium, 1)} mEq/L. This has caused severe electrical membrane instability and cardiac arrest.\n\n`;
        msg += `**Immediate Treatment Protocol**:\n`;
        msg += `1. **Stabilize Membrane**: Administer **[calcium chloride]** (1000 mg IV) immediately. This protects the myocardium from VFib/Asystole!\n`;
        msg += `2. **Shift Potassium Intracellularly**: Administer **[albuterol]** via ETT, hyperventilate (wash out CO2), or give insulin/dextrose.\n`;
        msg += `3. Ensure continuous high-quality chest compressions and epinephrine support.`;
      } else {
        msg += `🟢 **DIAGNOSTIC STATUS: POTASSIUM DERANGEMENT UNLIKELY**\n`;
        msg += `Potassium level is within normal bounds (${fmt(potassium, 1)} mEq/L). Hyperkalemia is not the cause of this arrest.\n\n`;
        msg += `Keep searching the other H's and T's: click [audit hypovolemia], [audit hypoxia], [audit acidosis], or [audit toxins].`;
      }
      return msg;
    }
    
    if (q.includes('hypothermia')) {
      let msg = `### 🔍 H's & T's Audit: HYPOTHERMIA\n\n`;
      msg += `Severe hypothermia slows cardiac conduction and induces highly irritable, refractory ventricular fibrillation.\n\n`;
      msg += `- **Core Temperature**: ${fmt(temp, 1)}°C\n\n`;
      
      if (temp < 32.0) {
        msg += `🔴 **DIAGNOSTIC STATUS: CONFIRMED HYPOTHERMIA**\n`;
        msg += `The core temperature has fallen to ${fmt(temp, 1)}°C. At this temperature, the heart is extremely irritable and prone to refractory VFib.\n\n`;
        msg += `**Immediate Treatment Protocol**:\n`;
        msg += `1. Initiate active external warming (forced-air warming blankets).\n`;
        msg += `2. Administer warm intravenous fluids.\n`;
        msg += `3. Continue high-quality CPR; note that drug metabolism is delayed in hypothermia.`;
      } else {
        msg += `🟢 **DIAGNOSTIC STATUS: HYPOTHERMIA UNLIKELY**\n`;
        msg += `The patient's temperature is safe at ${fmt(temp, 1)}°C. Hypothermia is not the cause of this arrest.\n\n`;
        msg += `Keep searching the other H's and T's: click [audit hypovolemia], [audit hypoxia], [audit acidosis], or [audit toxins].`;
      }
      return msg;
    }
    
    if (q.includes('toxin')) {
      let msg = `### 🔍 H's & T's Audit: TOXINS\n\n`;
      msg += `Anesthetic induction agents, antibiotics (anaphylaxis), or local anesthetics (LAST) can act as severe cardiovascular toxins.\n\n`;
      msg += `- **Anaphylaxis Triggered**: ${isAnaphylaxis ? 'YES (Penicillin administered)' : 'NO'}\n`;
      msg += `- **Anaphylaxis Treated**: ${isAnaphylaxisTreated ? 'YES' : 'NO'}\n`;
      msg += `- **Succinylcholine Administered**: ${patient.suxPotassiumLeaked ? 'YES (Potassium leaked!)' : 'NO'}\n`;
      msg += `- **Volatile MAC**: ${fmt(mac, 2)}\n\n`;
      
      if (isAnaphylaxis && !isAnaphylaxisTreated) {
        msg += `🔴 **DIAGNOSTIC STATUS: CONFIRMED ANAPHYLACTIC SHOCK**\n`;
        msg += `The patient is suffering from severe penicillin-induced anaphylaxis, causing complete vascular smooth muscle paralysis and bronchospasm.\n\n`;
        msg += `**Immediate Treatment Protocol**:\n`;
        msg += `1. Administer **[epinephrine]** (50 mcg IV bolus) immediately to restore SVR and bronchodilate.\n`;
        msg += `2. Give **[albuterol]** via ETT for bronchospasm.\n`;
        msg += `3. Click [audit hyperkalemia] if Succinylcholine was also administered.`;
      } else if (patient.suxPotassiumLeaked) {
        msg += `🔴 **DIAGNOSTIC STATUS: SUCCINYLCHOLINE-INDUCED POTASSIUM LEAK**\n`;
        msg += `Administering Succinylcholine in this patient's upregulated receptor state caused a massive release of intracellular potassium, inducing hyperkalemia-associated arrest.\n\n`;
        msg += `**Immediate Treatment Protocol**:\n`;
        msg += `1. Administer **[calcium chloride]** (1000 mg IV) immediately to stabilize the myocardium.\n`;
        msg += `2. Click [audit hyperkalemia] to view the full potassium protocol.`;
      } else {
        msg += `🟢 **DIAGNOSTIC STATUS: DIRECT TOXIN EFFECTS UNLIKELY**\n`;
        msg += `No active toxic exposures or untreated anaphylactic triggers are present. Direct toxin effect is not driving the arrest.\n\n`;
        msg += `Keep searching the other H's and T's: click [audit hypovolemia], [audit hypoxia], [audit acidosis], or [audit tension pneumothorax].`;
      }
      return msg;
    }
    
    if (q.includes('tension') || q.includes('pneumothorax')) {
      let msg = `### 🔍 H's & T's Audit: TENSION PNEUMOTHORAX\n\n`;
      msg += `Tension pneumothorax causes massive intrathoracic pressure, collapsing the vena cava and preventing venous return to the heart.\n\n`;
      msg += `- **Peak Airway Pressure (PIP)**: ${fmt(pip)} cmH2O\n`;
      msg += `- **Tracheal Deviation**: None detected\n`;
      msg += `- **Bilateral Breath Sounds**: Equal bilateral chest rise\n\n`;
      
      msg += `🟢 **DIAGNOSTIC STATUS: TENSION PNEUMOTHORAX UNLIKELY**\n`;
      msg += `Lung compliance is stable, PIP is acceptable, and there is no evidence of unilateral chest collapse. Tension pneumothorax is not present.\n\n`;
      msg += `Keep searching the other H's and T's: click [audit hypovolemia], [audit hypoxia], [audit acidosis], or [audit toxins].`;
      return msg;
    }
    
    if (q.includes('tamponade')) {
      let msg = `### 🔍 H's & T's Audit: CARDIAC TAMPONADE\n\n`;
      msg += `Fluid accumulation in the pericardial sac restricts ventricular filling, collapsing cardiac output.\n\n`;
      msg += `- **Beck's Triad Check**: Hypotension (present), JVD (not assessable), Muffled Heart Sounds (not assessable)\n`;
      msg += `- **POCUS/TTE Assessment**: No pericardial effusion seen on ultrasound\n\n`;
      
      msg += `🟢 **DIAGNOSTIC STATUS: CARDIAC TAMPONADE UNLIKELY**\n`;
      msg += `Focus on other reversible causes: click [audit hypovolemia], [audit hypoxia], [audit acidosis], or [audit toxins].`;
      return msg;
    }
    
    if (q.includes('thrombosis') || q.includes('pulmonary') || q.includes('coronary') || q.includes('mi') || q.includes('pe')) {
      let msg = `### 🔍 H's & T's Audit: THROMBOSIS (PULMONARY / CORONARY)\n\n`;
      msg += `Massive pulmonary embolism (PE) or acute myocardial infarction (MI) leads to sudden mechanical obstruction or pump failure.\n\n`;
      msg += `- **Coronary Risk (CAD History)**: ${patient.cad ? 'YES (History of Coronary Artery Disease)' : 'NO'}\n`;
      msg += `- **PE Risk**: No active hypercoagulability triggers\n\n`;
      
      msg += `🟡 **DIAGNOSTIC STATUS: SUSPICION LOW TO MODERATE**\n`;
      msg += `If the patient has a history of CAD, myocardial stunning is at ${fmt(stunning, 1)}%. Maintain coronary perfusion pressure (MAP > 65) using vasopressors and high-quality CPR to support myocardial recovery.\n\n`;
      msg += `Keep searching other H's and T's: click [audit hypovolemia], [audit hypoxia], [audit acidosis], or [audit toxins].`;
      return msg;
    }

    // General Cardiac Arrest Prompt
    let msg = `### 🚨 ATTENDING CONSULT: CRITICAL CARDIAC ARREST!\n\n`;
    msg += `We have a **CARDIAC ARREST** in the OR! Rhythm is **${rhythm.toUpperCase()}**. SBP: **${fmt(sys)} mmHg**, MAP: **${fmt(map)} mmHg**.\n\n`;
    msg += `**Immediate Clinical Directive**:\n`;
    msg += `1. **Compressions**: Ensure continuous high-quality chest compressions (**🩺 Initiated Chest Compressions**).\n`;
    msg += `2. **Epinephrine**: Administer **[epinephrine]** (50 mcg IV) or vasopressors immediately to restore coronary and cerebral perfusion pressures.\n`;
    msg += `3. **Oxygenation**: Ensure 100% oxygenation (FiO2 100% on fresh gas) and ventilate.\n\n`;
    
    msg += `**ACLS H's & T's Diagnostic Audit**:\n`;
    msg += `To get this patient out of cardiac arrest, we must systematically audit and treat the underlying causes. Click any of the active audits below to investigate thoroughly:\n\n`;
    
    msg += `- **The 5 H's**:\n`;
    msg += `  - 💧 **Hypovolemia**: Click [audit hypovolemia]\n`;
    msg += `  - 💨 **Hypoxia**: Click [audit hypoxia]\n`;
    msg += `  - 🧪 **Hydrogen Ion (Acidosis)**: Click [audit acidosis]\n`;
    msg += `  - 🍌 **Hypo/Hyperkalemia**: Click [audit hyperkalemia]\n`;
    msg += `  - ❄️ **Hypothermia**: Click [audit hypothermia]\n\n`;
    
    msg += `- **The 5 T's**:\n`;
    msg += `  - 🔋 **Toxins (Anaphylaxis/Drugs)**: Click [audit toxins]\n`;
    msg += `  - 🌬️ **Tension Pneumothorax**: Click [audit tension pneumothorax]\n`;
    msg += `  - 🫀 **Tamponade (Cardiac)**: Click [audit cardiac tamponade]\n`;
    msg += `  - 🫁 **Thrombosis (Pulmonary/PE)**: Click [audit pulmonary thrombosis]\n`;
    msg += `  - 🩸 **Thrombosis (Coronary/MI)**: Click [audit coronary thrombosis]\n`;
    
    return msg;
  }

  // B. Allergy / Anaphylaxis
  if (isAnaphylaxis || q.includes('anaphylaxis') || q.includes('allergy') || q.includes('allergic') || q.includes('reaction') || q.includes('penicillin')) {
    if (isAnaphylaxis && !isAnaphylaxisTreated) {
      return `ALERT: This patient is in severe vasoplegic anaphylactic shock triggered by the administration of penicillin!
- **Hemodynamics**: SBP is ${fmt(sys)} mmHg, MAP is ${fmt(map)} mmHg. Profound vasodilation has occurred.
- **Pulmonary Mechanics**: Airway compliance is dangerously low at ${fmt(compliance)} mL/cmH2O and resistance is extremely elevated at ${fmt(resistance)} cmH2O/L/s due to hyperacute bronchospasm.

**Attending's Advice**: Do not delay! Immediately administer epinephrine (50 mcg IV bolus) to restore vasomotor tone and reverse life-threatening bronchoconstriction. You should also administer albuterol (2.5 mg ETT) to directly alleviate airway resistance and support ventilation.`;
    } else if (isAnaphylaxis && isAnaphylaxisTreated) {
      return `The anaphylactic shock has been successfully treated with epinephrine. Current parameters are stabilizing: SBP is ${fmt(sys)} mmHg (MAP: ${fmt(map)} mmHg), and airway compliance has improved to ${fmt(compliance)} mL/cmH2O. We must continue to monitor the patient closely for biphasic reactions and ensure adequate volatile depth (MAC is currently ${fmt(mac, 2)}).`;
    } else {
      return `The patient's chart lists a severe allergy to Penicillin. Always review chart and perform a pre-op emr assessment before administering any antibiotics. Inadvertent administration will trigger profound anaphylaxis, causing airway resistance to skyrocket and blood pressure to collapse, which requires immediate epinephrine rescue.`;
    }
  }

  // C. Unopposed Muscarinic / Neostigmine Bradycardia
  if (bradycardiaTriggered || q.includes('bradycardia') || q.includes('slow heart') || q.includes('neostigmine') || q.includes('muscarinic')) {
    if (bradycardiaTriggered) {
      return `We are witnessing severe, progressive bradycardia (HR: ${fmt(hr)} bpm) due to unopposed muscarinic stimulation! This occurred because Neostigmine was administered without co-administration of an anticholinergic. Copious secretions and vagal hyper-stimulation will lead to asystole.

**Clinical Directive**: Administer glycopyrrolate (0.2 mg IV) or atropine (0.5 mg IV) immediately to block peripheral muscarinic receptors and restore normal heart rate!`;
    } else {
      return `Current heart rate is ${fmt(hr)} bpm. If you plan to reverse neuromuscular blockade using neostigmine, always co-administer an anticholinergic like glycopyrrolate or atropine to prevent severe, life-threatening bradycardia.`;
    }
  }

  // D. NPO Status / Gastric Volume / Aspiration Risk
  if (q.includes('npo') || q.includes('fasting') || q.includes('aspiration') || q.includes('gastric') || q.includes('stomach') || q.includes('eat') || q.includes('drink')) {
    const solidHrs = patient.npoHistory?.solidHrs !== undefined ? patient.npoHistory.solidHrs : 'unknown';
    const liquidHrs = patient.npoHistory?.liquidHrs !== undefined ? patient.npoHistory.liquidHrs : 'unknown';
    const gastricVol = patient.gastricVolume !== undefined ? patient.gastricVolume : 0;
    const hasFullStomach = gastricVol > 50 || solidHrs < 6 || liquidHrs < 2;

    let msg = `### NPO & Aspiration Risk Assessment\n`;
    msg += `- **Solid Fasting**: ${solidHrs} hours\n`;
    msg += `- **Liquid Fasting**: ${liquidHrs} hours\n`;
    msg += `- **Calculated Gastric Volume**: ${fmt(gastricVol)} mL\n\n`;

    if (hasFullStomach) {
      msg += `**Clinical Evaluation**: The patient has a high risk of aspiration (full stomach / insufficient fasting window). We must treat this as a **Rapid Sequence Induction (RSI)** case. Avoid positive pressure ventilation prior to intubation to prevent gastric insufflation. Ensure suction airway is fully functional and ready at the bedside. Perform laryngoscopy with cricoid pressure, and consider pre-treating with a rapid neuromuscular blocker like succinylcholine or high-dose rocuronium. Always execute a thorough airway exam first.`;
    } else {
      msg += `**Clinical Evaluation**: The patient is NPO-compliant (solids > 8h, liquids > 2h). Gastric volume is low (${fmt(gastricVol)} mL). Standard induction and ventilation strategy is appropriate. Always check npo fasting history before transferring the patient.`;
    }
    return msg;
  }

  // E. Airway / Intubation Plan
  if (q.includes('airway') || q.includes('intubat') || q.includes('laryngoscopy') || q.includes('vocal cord') || q.includes('tube') || q.includes('ett') || q.includes('lma') || q.includes('extubat')) {
    let msg = `### Airway Status & Ventilation Management\n`;
    if (airwaySecured) {
      const posText = patient.tubePosition === 'trachea' 
        ? 'correctly positioned in the trachea' 
        : patient.tubePosition === 'right_mainstem' 
        ? 'in the right mainstem bronchus (requires pulling back 2cm)' 
        : patient.tubePosition === 'left_mainstem' 
        ? 'in the left mainstem bronchus' 
        : 'in the esophagus (failed placement!)';

      msg += `- **Airway secured**: Yes (Endotracheal Tube)\n`;
      msg += `- **Tube Position**: ${posText.toUpperCase()}\n`;
      msg += `- **Peak Inspiratory Pressure (PIP)**: ${fmt(pip)} cmH2O\n`;
      msg += `- **Airway Resistance**: ${fmt(resistance)} cmH2O/L/s\n`;
      msg += `- **Lung Compliance**: ${fmt(compliance)} mL/cmH2O\n\n`;

      if (patient.tubePosition !== 'trachea') {
        msg += `**WARNING**: The tube is malpositioned! If in the esophagus, immediately pull back or perform laryngoscopy again. If mainstemmed, adjust tube position to prevent unilateral collapse and hyperinflation barotrauma.\n\n`;
      }
      
      if (pip > 35) {
        msg += `**ALERT**: Peak pressure is high (${fmt(pip)} cmH2O). If this is bronchospasm, consider administering albuterol or deepening anesthesia with sevoflurane. If the patient is biting, consider suction airway or deep neuromuscular blockade with rocuronium.`;
      } else {
        msg += `The airway is currently stable. Keep volatile MAC at 0.8-1.0 and maintain mechanical ventilation.`;
      }
    } else {
      msg += `- **Airway secured**: No\n`;
      msg += `- **Pre-oxygenation status (FRC O2)**: ${fmt(frcO2Percent)}% (Goal: >85%)\n`;
      msg += `- **FRC lung volume**: ${fmt(frc_L, 2)} L\n\n`;

      msg += `**Clinical Strategy**: We must achieve adequate pre-oxygenation to wash out alveolar nitrogen and expand the FRC oxygen buffer. Once pre-oxygenation is optimal (FRC O2 > 85%), administer propofol (150 mg IV) and fentanyl (100 mcg IV). Follow with a muscle relaxant like rocuronium (50 mg) or succinylcholine (100 mg). When paralysis is complete (TOF count 0/4), perform laryngoscopy and place the endotracheal tube. Don't forget to perform a thorough airway exam beforehand.`;
    }
    return msg;
  }

  // F. Hemodynamics / Blood Pressure / Heart Rate
  if (q.includes('pressure') || q.includes('bp') || q.includes('hypotension') || q.includes('hypertension') || q.includes('map') || q.includes('low blood') || q.includes('shock') || q.includes('heart rate') || q.includes('pulse') || q.includes('tachycardia')) {
    let msg = `### Hemodynamic Profile & Cardiovascular State\n`;
    msg += `- **Blood Pressure**: ${fmt(sys)}/${fmt(dia)} mmHg (MAP: ${fmt(map)} mmHg)\n`;
    msg += `- **Heart Rate**: ${fmt(hr)} bpm\n`;
    msg += `- **Myocardial Stunning**: ${fmt(stunning, 1)}%\n`;
    msg += `- **Estimated Blood Loss (EBL)**: ${fmt(ebl)} mL (EBV: ${fmt(ebv)} mL)\n\n`;

    if (isArrest) {
      msg += `**CRITICAL**: The patient is in cardiac arrest! Immediately begin chest compressions and push epinephrine.`;
    } else if (map < 65) {
      msg += `**Clinical Evaluation**: Significant hypotension detected (MAP: ${fmt(map)} mmHg, SBP: ${fmt(sys)} mmHg). Perfusion to organs is compromised.
- If this is vasoplegia due to anesthetic induction, administer phenylephrine (100 mcg IV bolus) to increase SVR.
- If concurrent bradycardia is present (HR: ${fmt(hr)} bpm), consider glycopyrrolate or ephedrine.
- If stunning is present (${fmt(stunning, 1)}%), maintain high coronary perfusion pressure (MAP > 65) and avoid tachycardia (Double-Product: ${fmt(hr * sys)}). Deepen anesthesia if light or administer phenylephrine. Check labs to evaluate hemoglobin.`;
    } else if (sys > 140 || hr > 100) {
      msg += `**Clinical Evaluation**: Hypertension or tachycardia present (SBP: ${fmt(sys)} mmHg, HR: ${fmt(hr)} bpm). Double-product is ${fmt(hr * sys)}, risking myocardial ischemia in patients with CAD.
- Check anesthetic depth: BIS is ${fmt(bis)} (Goal 40-60). Consider increasing vaporizer dial or administering fentanyl (100 mcg IV) to manage noxious surgical stimulation.
- If heart rate remains elevated, consider esmolol (20 mg IV) to protect the myocardium.`;
    } else {
      msg += `**Clinical Evaluation**: Cardiovascular system is stable. Perfusion pressures are within normal physiological bounds (MAP: ${fmt(map)} mmHg, HR: ${fmt(hr)} bpm).`;
    }
    return msg;
  }

  // G. Ventilation / Hypoxia / SpO2
  if (q.includes('spo2') || q.includes('oxygen') || q.includes('hypoxia') || q.includes('desaturat') || q.includes('co2') || q.includes('paco2') || q.includes('etco2') || q.includes('ventilat') || q.includes('pip') || q.includes('compliance') || q.includes('resistance') || q.includes('bronchospasm')) {
    let msg = `### Respiratory Mechanics & Blood Gas Analysis\n`;
    msg += `- **Oxygen Saturation (SpO2)**: ${fmt(spo2)}%\n`;
    msg += `- **End-Tidal CO2 (EtCO2)**: ${fmt(etco2)} mmHg (PaCO2: ${fmt(paco2)} mmHg)\n`;
    msg += `- **Peak Airway Pressure (PIP)**: ${fmt(pip)} cmH2O\n`;
    msg += `- **Compliance**: ${fmt(compliance)} mL/cmH2O\n`;
    msg += `- **Resistance**: ${fmt(resistance)} cmH2O/L/s\n`;
    msg += `- **FRC Oxygen Buffer**: ${fmt(frcO2Percent)}% (${fmt(o2Buffer, 2)} L)\n\n`;

    if (spo2 < 90) {
      msg += `**CRITICAL ALERT**: Severe arterial hypoxemia! Alveolar oxygen reserves are depleted.
1. Confirm endotracheal tube placement (check EtCO2 waveform).
2. Increase FiO2 to 100% and fresh gas flows.
3. Check ventilator circuit connections.
4. Bag manually to assess lung compliance.
5. If bronchospasm is active (resistance ${fmt(resistance)}), administer albuterol (2.5 mg ETT).`;
    } else if (pip > 35) {
      msg += `**WARNING**: Elevated peak pressures! Resistance is high (${fmt(resistance)}). Rule out patient coughing/bucking (check TOF count or BIS), mainstem intubation, secretions (requires suction airway), or bronchospasm. Deepen volatile anesthesia or push rocuronium if paralyzed is inadequate.`;
    } else if (paco2 > 45) {
      msg += `**Evaluation**: Mild hypercapnia (PaCO2: ${fmt(paco2)} mmHg). Consider adjusting ventilator setting to increase minute ventilation: increase RR or VT slightly to increase carbon dioxide washout.`;
    } else if (paco2 < 30) {
      msg += `**Evaluation**: Hypocapnia (PaCO2: ${fmt(paco2)} mmHg). Reduce ventilator minute ventilation to allow physiological CO2 re-accumulation and prevent cerebral vasoconstriction.`;
    } else {
      msg += `**Evaluation**: Pulmonary ventilation and oxygenation are highly satisfactory. Maintain current parameters.`;
    }
    return msg;
  }

  // H. Anesthesia Depth / BIS / Sedation
  if (q.includes('depth') || q.includes('bis') || q.includes('mac') || q.includes('sedat') || q.includes('awake') || q.includes('awareness') || q.includes('propofol') || q.includes('fentanyl') || q.includes('vaporizer') || q.includes('sevo')) {
    let msg = `### Anesthetic Depth & Sedation State\n`;
    msg += `- **Bispectral Index (BIS)**: ${fmt(bis)} (Target: 40 - 60 during surgery)\n`;
    msg += `- **End-Tidal MAC**: ${fmt(mac, 2)} (Target: 0.8 - 1.0 MAC)\n`;
    msg += `- **Active Sedative Concentrations**: Propofol Ce is ${fmt(propofolCe, 2)} mcg/mL, Etomidate Ce is ${fmt(etomidateCe, 2)} mcg/mL.\n`;
    msg += `- **Active Opioid Concentration**: Fentanyl Ce is ${fmt(fentanylCe, 2)} ng/mL.\n\n`;

    if (bis > 60 && surgicalPhase !== 'Pre-Op') {
      msg += `**WARNING**: Anesthesia is too light (BIS: ${fmt(bis)}). The patient risks intraoperative awareness or sympathetic discharge (tachycardia/hypertension).
- Increase vaporizer dial setting (Sevoflurane) to at least 1.5 - 2.5%.
- Consider administering a propofol (150 mg IV bolus) to rapidly deepen anesthetic depth, or fentanyl (100 mcg IV) for surgical analgesia.`;
    } else if (bis < 30) {
      msg += `**Evaluation**: Deep anesthetic state (BIS: ${fmt(bis)}). Consider decreasing vaporizer settings to prevent profound myocardial depression and hypotension.`;
    } else {
      msg += `**Evaluation**: Excellent depth of anesthesia (BIS is ${fmt(bis)}, MAC is ${fmt(mac, 2)}). Anesthetic state is well-matched to surgical demands.`;
    }
    return msg;
  }

  // I. Muscle Relaxation / TOF Count / Paralysis
  if (q.includes('paraly') || q.includes('relax') || q.includes('tof') || q.includes('train-of-four') || q.includes('rocuronium') || q.includes('succinylcholine') || q.includes('vecuronium')) {
    let msg = `### Neuromuscular Blockade Assessment\n`;
    msg += `- **Train-of-Four (TOF) Count**: ${fmt(tofCount)}/4 twitch responses\n`;
    msg += `- **Active Muscle Relaxants**: Rocuronium Ce is ${fmt(rocuroniumCe, 2)} mcg/mL, Succinylcholine Ce is ${fmt(succinylcholineCe, 2)} mcg/mL.\n\n`;

    if (tofCount === 4) {
      msg += `**Clinical Evaluation**: Patient is not paralyzed (TOF: 4/4). No significant neuromuscular blockade is active.
- To facilitate laryngoscopy or assist abdominal muscle relaxation, administer rocuronium (50 mg IV) or succinylcholine (100 mg IV). Ensure the patient is adequately sedated (BIS < 60) before administering paralytics!`;
    } else if (tofCount > 0) {
      msg += `**Clinical Evaluation**: Partial neuromuscular blockade (TOF: ${tofCount}/4). Muscle tone is recovering. Administer an additional bolus of rocuronium if deep paralysis is required by the surgical team.`;
    } else {
      msg += `**Clinical Evaluation**: Deep, complete neuromuscular blockade (TOF: 0/4). Optimal for endotracheal intubation and mechanical ventilation. Do not reverse unless surgical phase is 'Extubation' or surgery is complete.`;
    }
    return msg;
  }

  // J. Potassium / Hyperkalemia
  if (q.includes('potassium') || q.includes('hyperkalemia') || q.includes('k+') || q.includes('electrolyte') || q.includes('calcium')) {
    let msg = `### Serum Electrolytes & Hyperkalemia Audit\n`;
    msg += `- **Estimated Potassium (K+)**: ${fmt(potassium, 1)} mEq/L (Normal: 3.5 - 5.0 mEq/L)\n`;
    if (patient.suxPotassiumLeaked) {
      msg += `- **Alert Event**: Potassium leaked due to Succinylcholine administration in upregulated nAChRs!\n\n`;
    }

    if (potassium > 5.5) {
      msg += `**CRITICAL**: Severe Hyperkalemia detected (${fmt(potassium, 1)} mEq/L)! This triggers myocardial membrane instability, peaking T waves, QRS widening, and asystole.
**Immediate Treatment Protocol**:
1. Administer calcium chloride (1000 mg IV) or Calcium Gluconate immediately to stabilize cardiac cell membranes.
2. Direct potassium intracellularly: give albuterol (2.5 mg ETT), hyperventilate the patient (increase minute ventilation via vent), or administer insulin/dextrose.`;
    } else {
      msg += `**Clinical Evaluation**: Potassium is within normal limits (${fmt(potassium, 1)} mEq/L). Standard anesthetic course is safe. Check labs to evaluate other electrolytes.`;
    }
    return msg;
  }

  // K. Help / Next Step Directives
  if (q.includes('help') || q.includes('what should i do') || q.includes('next') || q.includes('advice') || q.includes('guidance') || q.includes('treat')) {
    let msg = `### Attending Clinical Consultation\n`;
    msg += `Looking at the current state, here is my immediate guidance:\n\n`;

    // High priority clinical warnings
    if (isArrest) {
      msg += `🚨 **CARDIAC ARREST ACTIVE**: SBP is ${fmt(sys)} mmHg. Focus on ACLS: push epinephrine (50 mcg IV) and start chest compressions.\n\n`;
    } else if (isAnaphylaxis && !isAnaphylaxisTreated) {
      msg += `🚨 **ANAPHYLACTIC SHOCK ACTIVE**: Compliance has crashed to ${fmt(compliance)} and SBP is ${fmt(sys)}. Push epinephrine (50 mcg IV) immediately! Also consider albuterol.\n\n`;
    } else if (bradycardiaTriggered) {
      msg += `🚨 **UNOPPOSED MUSCARINIC SURGE**: Profound bradycardia (HR: ${fmt(hr)} bpm). Immediately push glycopyrrolate (0.2 mg) or atropine.\n\n`;
    } else if (spo2 < 90) {
      msg += `🚨 **ACUTE DESATURATION**: SpO2 is ${fmt(spo2)}%. Check tube position, check circuit connections, increase fresh gas flows, and bag manually with 100% O2.\n\n`;
    } else if (map < 65) {
      msg += `⚠️ **HYPOTENSION**: MAP is ${fmt(map)} mmHg. Administer phenylephrine (100 mcg IV) and assess anesthetic depth (MAC is ${fmt(mac, 2)}). You may need to review chart.\n\n`;
    } else if (pip > 35) {
      msg += `⚠️ **ELEVATED AIRWAY PRESSURE**: PIP is ${fmt(pip)} cmH2O. Check for bronchospasm (administer albuterol) or patient coughing (suction airway or deepen paralysis).\n\n`;
    } else if (bis > 60 && surgicalPhase !== 'Pre-Op') {
      msg += `⚠️ **LIGHT ANESTHESIA**: BIS is ${fmt(bis)} during active phase. Increase Sevoflurane vaporizer dial or administer propofol (150 mg IV).\n\n`;
    } else if (!airwaySecured) {
      msg += `📋 **AIRWAY ASSIGNMENT**: Perform pre-oxygenation to >85% FRC O2 (current: ${fmt(frcO2Percent)}%). Then push propofol (150 mg IV), fentanyl (100 mcg IV), and a paralytic. Once paralyzed, perform laryngoscopy to secure the airway.\n\n`;
    } else {
      msg += `✅ **PHYSIOLOGY STABLE**: Current patient vitals are stable. Maintain volatile MAC at 0.8-1.0 and ventilate to keep PaCO2 at 35-45 mmHg. Review labs if needed.\n\n`;
    }

    msg += `Feel free to ask me about any specific organ system (e.g. *hemodynamics*, *airway*, *ventilation*, *anesthesia depth*, *NPO status*, or *potassium level*).`;
    return msg;
  }

  // L. Fallback Attending Clinical Reasoning
  let fallback = `### Senior Attending Briefing\n`;
  fallback += `Hello. As the attending anesthesiologist, I am reviewing the live simulation telemetry for ${patient.name || 'our patient'} (ASA ${patient.asaStatus || 'I'}).\n\n`;
  fallback += `- **Vitals Snapshot**: HR: ${fmt(hr)} bpm, BP: ${fmt(sys)}/${fmt(dia)} mmHg (MAP: ${fmt(map)} mmHg), SpO2: ${fmt(spo2)}%, EtCO2: ${fmt(etco2)} mmHg.\n`;
  fallback += `- **Anesthetic Depth**: BIS: ${fmt(bis)}, MAC: ${fmt(mac, 2)}.\n`;
  fallback += `- **Surgical Phase**: ${surgicalPhase}.\n\n`;
  fallback += `Please ask me specific physiological or pharmacological questions regarding the patient's state, active medications, NPO guidelines, or procedural actions (e.g., *laryngoscopy*, *muscle relaxation*, *ventilation pressures*, or *hyperkalemia*). I will provide high-fidelity clinical reasoning and outline next steps. You can also review chart or check labs.`;
  return fallback;
}
