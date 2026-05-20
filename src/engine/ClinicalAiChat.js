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
  if (isArrest || q.includes('arrest') || q.includes('acls') || q.includes('asystole') || q.includes('v-fib') || q.includes('cpr') || q.includes('cardiac arrest')) {
    let msg = `We are dealing with a critical intraoperative cardiac arrest! The current cardiac rhythm is ${rhythm.toUpperCase()}. SBP is ${fmt(sys)} mmHg and MAP is ${fmt(map)} mmHg. Myocardial Stunning stands at ${fmt(stunning, 1)}%.\n\n`;
    msg += `**Clinical Directive**: Initiate high-quality chest compressions immediately and ensure ventilatory support with 100% oxygen. If the patient has severe hyperkalemia or anaphylaxis, prioritize treating the root cause. You must administer epinephrine (50 mcg IV) or vasopressors to sustain coronary and cerebral perfusion pressures. If hyperkalemia is present, administer calcium chloride (1000 mg IV) immediately.`;
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
