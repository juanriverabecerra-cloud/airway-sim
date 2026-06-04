/**
 * Clinical AI Chat Engine (V2.0 — Senior Attending Refactored)
 * Evaluates free-form natural language queries against the real-time physiological simulator state.
 * Synthesizes highly nuanced, medically rigorous clinical guidance mimicking a senior anesthesiology attending.
 * Incorporates interactive keywords mapped to CLINICAL_ACTIONS so that recommended treatments are clickable.
 * Strictly Zero Hallucination: recommendations are fully functional buttons in the app.
 */

function fmt(val, decimals = 0) {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    if (typeof val === 'string' && val.trim() !== '') return val;
    return 'N/A';
  }
  return val.toFixed(decimals);
}

export function getAttendingResponse(query, state) {
  const safeQuery = typeof query === 'string' ? query : '';
  const q = safeQuery.toLowerCase().trim();

  const safeState = state || {};
  const vitals = safeState.vitals || {};
  const patient = safeState.patient || {};
  const activeMeds = Array.isArray(safeState.activeMeds) ? safeState.activeMeds : [];
  const surgicalPhase = safeState.surgicalPhase || 'Pre-Op';


  // 1. EXTRACT RELEVANT SIMULATION STATES
  const hr = typeof vitals.hr === 'number' && Number.isFinite(vitals.hr) ? vitals.hr : 0;
  const sys = typeof vitals.sys === 'number' && Number.isFinite(vitals.sys) ? vitals.sys : 0;
  const dia = typeof vitals.dia === 'number' && Number.isFinite(vitals.dia) ? vitals.dia : 0;
  const map = typeof vitals.map === 'number' && Number.isFinite(vitals.map) ? vitals.map : 0;
  
  // Use strict checks rather than `||` to prevent overriding real clinical zero readings in cardiovascular/pulmonary arrest
  const spo2 = typeof vitals.spo2 === 'number' && Number.isFinite(vitals.spo2) ? vitals.spo2 : 100;
  const paco2 = typeof vitals.paco2 === 'number' && Number.isFinite(vitals.paco2) ? vitals.paco2 : 40;
  const etco2 = typeof vitals.etco2 === 'number' && Number.isFinite(vitals.etco2) ? vitals.etco2 : 40;
  const mac = typeof vitals.mac === 'number' && Number.isFinite(vitals.mac) ? vitals.mac : 0;
  
  const bis = vitals.bis !== undefined && vitals.bis !== null && Number.isFinite(vitals.bis) ? vitals.bis : 99;
  const tofCount = vitals.tofCount !== undefined && vitals.tofCount !== null && Number.isFinite(vitals.tofCount) ? vitals.tofCount : 4;
  const pip = typeof vitals.pip === 'number' && Number.isFinite(vitals.pip) ? vitals.pip : 0;
  const compliance = typeof vitals.compl === 'number' && Number.isFinite(vitals.compl) ? vitals.compl : 60;
  const resistance = typeof vitals.res === 'number' && Number.isFinite(vitals.res) ? vitals.res : 10;

  const isArrest = patient.isArrest || false;
  const rhythm = patient.cardiacRhythm || 'sinus';
  const stunning = typeof patient.myocardialStunning === 'number' && Number.isFinite(patient.myocardialStunning) ? patient.myocardialStunning : 0;
  const ebl = typeof patient.ebl === 'number' && Number.isFinite(patient.ebl) ? patient.ebl : 0;
  const ebv = typeof patient.ebv === 'number' && Number.isFinite(patient.ebv) && patient.ebv > 0 ? patient.ebv : 5000;
  
  // Dynamic baseline potassium logic: respect patient.potassiumLevel if provided, otherwise default to 4.0;
  // if a succinylcholine leak occurs, it spikes the level to at least 6.2.
  const basePotassium = typeof patient.potassiumLevel === 'number' && Number.isFinite(patient.potassiumLevel) ? patient.potassiumLevel : 4.0;
  const potassium = patient.suxPotassiumLeaked ? Math.max(basePotassium, 6.2) : basePotassium;

  const isSeptic = patient.isSeptic || false;
  const isAnaphylaxis = patient.anaphylaxisTriggered || false;
  const isAnaphylaxisTreated = patient.anaphylaxisTreated || false;
  const bradycardiaTriggered = patient.bradycardiaTriggered || false;
  const airwaySecured = patient.airwaySecured || false;
  
  const frc_L = patient.lungVolumes && typeof patient.lungVolumes.frc_L === 'number' && Number.isFinite(patient.lungVolumes.frc_L) && patient.lungVolumes.frc_L > 0 
    ? patient.lungVolumes.frc_L 
    : 2.4;
  const o2Buffer = patient.oxygenBuffer !== null && patient.oxygenBuffer !== undefined && Number.isFinite(patient.oxygenBuffer) ? patient.oxygenBuffer : 0.5;
  const frcO2Percent = frc_L > 0 ? Math.min(100, Math.max(0, (o2Buffer / frc_L) * 100)) : 21;

  // Active drugs concentration levels
  const propofolCe = activeMeds.find(m => m.name === 'Propofol')?.Ce || 0;


  const rocuroniumCe = activeMeds.find(m => m.name === 'Rocuronium')?.Ce || 0;
  const succinylcholineCe = activeMeds.find(m => m.name === 'Succinylcholine')?.Ce || 0;


  const pos = patient.position || 'Supine';

  // Check placed access lines
  const placedLines = Array.isArray(patient.accessLines) ? patient.accessLines : [];


  // Case profiles
  const isObeseCase = patient.isObese || patient.bmi > 35;
  const isSepticCase = patient.isSeptic || isSeptic;
  const isTraumaCase = patient.trauma;
  const isCardiacCase = patient.cad || patient.as || patient.chf || (patient.pmhx && patient.pmhx.includes('CAD'));

  // 2. DEFINE SPECIALIZED DECISION-TREE RESPONSES MAPPED TO STATE

  // A. ACLS / Cardiac Arrest
  if (isArrest || q.includes('arrest') || q.includes('acls') || q.includes('asystole') || q.includes('v-fib') || q.includes('cpr') || q.includes('cardiac arrest') || q.includes('audit ')) {
    if (q.includes('hypovolemia')) {
      let msg = `### 🔍 ACLS Diagnostic Audit: HYPOVOLEMIA\n\n`;
      msg += `Hypovolemia represents a critical, rapidly reversible cause of intraoperative cardiac arrest. Let's evaluate:\n\n`;
      msg += `- **Estimated Blood Loss (EBL)**: ${fmt(ebl)} mL\n`;
      msg += `- **Estimated Blood Volume (EBV)**: ${fmt(ebv)} mL\n`;
      msg += `- **Dilution/Fluid Volume**: ${fmt(patient.intravascularVolume || 5000)} mL\n`;
      const bloodLossPct = ebv > 0 ? (ebl / ebv * 100) : 0;
      msg += `- **Volume Loss Ratio**: ${bloodLossPct.toFixed(1)}%\n\n`;

      const lossRatio = ebv > 0 ? ebl / ebv : 0;
      if (lossRatio > 0.25 || (patient.intravascularVolume && patient.intravascularVolume < 4200)) {
        msg += `🔴 **STATUS: CONFIRMED HYPOVOLEMIA**\n`;
        msg += `The patient has lost a significant fraction of blood volume (${(lossRatio * 100).toFixed(1)}% of total volume), causing severe venous return depletion and circulatory collapse. This is driving the cardiac arrest.\n\n`;
        msg += `**Directive**: Immediately maximize venous access (click [place central line] or [place piv]), administer large-volume resuscitation fluids on the Lines Panel, and order blood matching via [labs]!`;
      } else {
        msg += `🟢 **STATUS: HYPOVOLEMIA UNLIKELY**\n`;
        msg += `Intravascular volume is relatively well maintained (${fmt(patient.intravascularVolume || 5000)} mL) and blood loss is minimal. Hypovolemia is not the primary driver of this arrest.\n\n`;
        msg += `Keep searching the other H's and T's: click [audit hypoxia], [audit acidosis], [audit hyperkalemia], or [audit toxins].`;
      }
      return msg;
    }

    if (q.includes('hypoxia')) {
      let msg = `### 🔍 ACLS Diagnostic Audit: HYPOXIA\n\n`;
      msg += `Hypoxia prevents myocardial oxidative phosphorylation, leading to rapid brady-asystolic cardiac arrest.\n\n`;
      msg += `- **Oxygen Saturation (SpO2)**: ${fmt(spo2)}%\n`;
      msg += `- **Alveolar O2 Buffer (FRC O2)**: ${frcO2Percent.toFixed(1)}%\n`;
      msg += `- **Airway Secured**: ${airwaySecured ? 'YES' : 'NO'}\n`;
      msg += `- **Tube Position**: ${patient.tubePosition?.toUpperCase() || 'N/A'}\n\n`;

      if (spo2 < 75 || frcO2Percent < 45 || patient.tubePosition === 'esophagus') {
        msg += `🔴 **STATUS: CONFIRMED SEVERE HYPOXIA**\n`;
        msg += `Severe arterial and tissue hypoxia is present. Myocardial oxygenation has collapsed, rendering the heart unable to sustain pacemaker activity.\n\n`;
        msg += `**Directive**:\n`;
        msg += `1. Verify fresh gas flow O2 is at 100% dial.\n`;
        msg += `2. If not intubated, perform [laryngoscopy] immediately to secure the airway.\n`;
        msg += `3. If intubated, verify tube position (rule out esophagus or mainstem).\n`;
        msg += `4. If severe bronchospasm is active, administer [albuterol] via ETT.`;
      } else {
        msg += `🟢 **STATUS: HYPOXIA UNLIKELY**\n`;
        msg += `The patient is well-oxygenated (SpO2: ${fmt(spo2)}%, FRC O2: ${frcO2Percent.toFixed(1)}%). Hypoxia is not the cause of this cardiac arrest.\n\n`;
        msg += `Keep searching the other H's and T's: click [audit hypovolemia], [audit acidosis], [audit hyperkalemia], or [audit toxins].`;
      }
      return msg;
    }

    if (q.includes('acidosis')) {
      let msg = `### 🔍 ACLS Diagnostic Audit: HYDROGEN ION (ACIDOSIS)\n\n`;
      msg += `Severe acidemia depresses myocardial contractility and blunts the effectiveness of endogenous and exogenous catecholamines.\n\n`;
      msg += `- **Arterial pH**: ${vitals.ph || 7.4}\n`;
      msg += `- **PaCO2 / EtCO2**: ${fmt(paco2)} / ${fmt(etco2)} mmHg\n`;
      msg += `- **Lactic Acid**: ${fmt(patient.lacticAcid || 1.0, 1)} mmol/L\n\n`;

      if (vitals.ph && vitals.ph < 7.15) {
        msg += `🔴 **STATUS: CONFIRMED SEVERE ACIDOSIS**\n`;
        msg += `Severe acidosis is present (pH: ${fmt(vitals.ph, 2)}). This is likely a mixed respiratory acidosis (from hypoventilation/apnea) and metabolic lactic acidosis (from low tissue perfusion).\n\n`;
        msg += `**Directive**: Optimize ventilation immediately (increase RR and Vt to wash out CO2), ensure high-quality chest compressions [start cpr], and click [order abg] to follow progress.`;
      } else {
        msg += `🟢 **STATUS: ACIDOSIS UNLIKELY**\n`;
        msg += `The patient's pH is stable. Severe acidosis is not the primary driver of this arrest.\n\n`;
        msg += `Keep searching the other H's and T's: click [audit hypovolemia], [audit hypoxia], [audit hyperkalemia], or [audit toxins].`;
      }
      return msg;
    }

    if (q.includes('hyperkalemia') || q.includes('potassium')) {
      let msg = `### 🔍 ACLS Diagnostic Audit: POTASSIUM / HYPERKALEMIA\n\n`;
      msg += `Hyperkalemia alters the cardiac action potential, causing peaked T waves, widened QRS, and brady-asystolic cardiac arrest.\n\n`;
      msg += `- **Serum Potassium (K+)**: ${fmt(potassium, 1)} mEq/L\n`;
      msg += `- **Calcium Administered**: ${patient.calciumAdministered ? 'YES' : 'NO'}\n\n`;

      if (potassium > 5.5) {
        msg += `🔴 **STATUS: CONFIRMED SEVERE HYPERKALEMIA**\n`;
        msg += `The potassium level is dangerously elevated at ${fmt(potassium, 1)} mEq/L. This has caused severe electrical membrane instability and cardiac arrest.\n\n`;
        msg += `**Directive**:\n`;
        msg += `1. **Stabilize Membrane**: Administer **[calcium chloride]** (1000 mg IV) immediately. This protects the myocardium from VFib/Asystole by restoring the membrane electrical gradient!\n`;
        msg += `2. **Shift Potassium Intracellularly**: Administer **[albuterol]** via ETT, hyperventilate (wash out CO2), or give insulin/dextrose.\n`;
        msg += `3. Ensure continuous high-quality chest compressions [start cpr] and epinephrine support.`;
      } else {
        msg += `🟢 **STATUS: POTASSIUM DERANGEMENT UNLIKELY**\n`;
        msg += `Potassium level is within normal bounds (${fmt(potassium, 1)} mEq/L). Hyperkalemia is not the cause of this arrest.\n\n`;
        msg += `Keep searching the other H's and T's: click [audit hypovolemia], [audit hypoxia], [audit acidosis], or [audit toxins].`;
      }
      return msg;
    }

    if (q.includes('toxin')) {
      let msg = `### 🔍 ACLS Diagnostic Audit: TOXINS\n\n`;
      msg += `Anesthetic induction agents, antibiotics (anaphylaxis), or local anesthetics can act as severe cardiovascular toxins.\n\n`;
      msg += `- **Anaphylaxis Triggered**: ${isAnaphylaxis ? 'YES (Penicillin administered)' : 'NO'}\n`;
      msg += `- **Anaphylaxis Treated**: ${isAnaphylaxisTreated ? 'YES' : 'NO'}\n`;
      msg += `- **Succinylcholine Administered**: ${patient.suxPotassiumLeaked ? 'YES (Potassium leaked!)' : 'NO'}\n`;
      msg += `- **Volatile MAC**: ${fmt(mac, 2)}\n\n`;

      if (isAnaphylaxis && !isAnaphylaxisTreated) {
        msg += `🔴 **STATUS: CONFIRMED ANAPHYLACTIC SHOCK**\n`;
        msg += `The patient is suffering from severe penicillin-induced anaphylaxis, causing complete vascular smooth muscle paralysis and bronchospasm.\n\n`;
        msg += `**Directive**: Administer **[epinephrine]** (50 mcg IV bolus) immediately to restore SVR and bronchedilate, and give **[albuterol]** via ETT for bronchospasm.`;
      } else if (patient.suxPotassiumLeaked) {
        msg += `🔴 **STATUS: SUCCINYLCHOLINE-INDUCED POTASSIUM LEAK**\n`;
        msg += `Administering Succinylcholine in this patient's upregulated receptor state caused a massive release of intracellular potassium, inducing hyperkalemia-associated arrest.\n\n`;
        msg += `**Directive**: Administer **[calcium chloride]** (1000 mg IV) immediately to stabilize the myocardium, and click [audit hyperkalemia] to view the potassium shift protocol.`;
      } else {
        msg += `🟢 **STATUS: DIRECT TOXIN EFFECTS UNLIKELY**\n`;
        msg += `No active toxic exposures or untreated anaphylactic triggers are present. Direct toxin effect is not driving the arrest.\n\n`;
        msg += `Keep searching the other H's and T's: click [audit hypovolemia], [audit hypoxia], [audit acidosis], or [audit tension pneumothorax].`;
      }
      return msg;
    }

    // General Cardiac Arrest Prompt
    let msg = `### 🚨 ATTENDING EMERGENCY ADVISORY: CARDIAC ARREST!\n\n`;
    msg += `We have a **CARDIAC ARREST** in the OR! Rhythm is **${rhythm.toUpperCase()}**. SBP: **${fmt(sys)} mmHg**, MAP: **${fmt(map)} mmHg**.\n\n`;
    msg += `**Immediate Clinical Directive**:\n`;
    msg += `1. **CPR**: Ensure continuous high-quality chest compressions immediately (click **[start cpr]**).\n`;
    msg += `2. **Epinephrine**: Administer **[epinephrine]** (50 mcg IV bolus) immediately to restore coronary and cerebral perfusion pressures.\n`;
    msg += `3. **Defibrillation**: If rhythm is VFib/Pulseless VT, prepare to click **[deliver shock]** (200 J) after pausing compressions briefly (click **[check rhythm]**).\n\n`;
    msg += `**ACLS H's & T's Diagnostic Audit**:\n`;
    msg += `To rescue this patient, we must systematically audit and treat the underlying causes. Click any of the active audits below to investigate:\n\n`;
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

  // B. Allergy & Penicillin Anaphylaxis
  if (isAnaphylaxis || q.includes('anaphylaxis') || q.includes('allergy') || q.includes('allergic') || q.includes('unasyn') || q.includes('penicillin')) {
    if (isAnaphylaxis && !isAnaphylaxisTreated) {
      return `### 🚨 LIFE-THREATENING PENICILLIN ANAPHYLAXIS!
The patient is in profound, vasodilatory anaphylactic shock triggered by the administration of Penicillin antibiotics (Unasyn).
- **Hemodynamics**: SBP is ${fmt(sys)} mmHg, MAP is ${fmt(map)} mmHg. Massive histamine release has caused complete vascular smooth muscle relaxation (SVR collapse) and severe vasodilatory shock.
- **Pulmonary Mechanics**: Airway compliance is dangerously low at ${fmt(compliance)} mL/cmH2O and resistance is extremely elevated at ${fmt(resistance)} cmH2O/L/s due to hyperacute bronchospasm and sub-glottic swelling.

**Clinical Rationale**: Epinephrine is the primary treatment. Its alpha-1 agonist activity induces powerful vasoconstriction to restore SVR and MAP, while its beta-2 agonist activity provides strong bronchodilation and stabilizes mast cell membranes to stop further degranulation.

**Directive**: Do not delay! Immediately administer **[epinephrine]** (50 mcg IV bolus) to restore vasomotor tone and reverse life-threatening bronchoconstriction. You should also administer **[albuterol]** via ETT to directly alleviate bronchial resistance.`;
    } else if (isAnaphylaxis && isAnaphylaxisTreated) {
      return `The anaphylactic shock has been successfully treated with epinephrine. Current parameters are stabilizing: SBP is ${fmt(sys)} mmHg (MAP: ${fmt(map)} mmHg), and airway compliance has improved to ${fmt(compliance)} mL/cmH2O. We must continue to monitor the patient closely for biphasic reactions.`;
    } else {
      return `The patient's chart lists a severe allergy to Penicillin. Always perform a thorough EMR review (click [pre-op checklists]) before administering antibiotics. Inadvertent administration in this patient will trigger profound IgE-mediated anaphylaxis, causing complete SVR collapse (shock) and hyperacute bronchospasm, requiring immediate [epinephrine] rescue and [albuterol] bronchodilation.`;
    }
  }

  // C. Unopposed Muscarinic / Neostigmine Bradycardia
  if (bradycardiaTriggered || q.includes('bradycardia') || q.includes('slow heart') || q.includes('neostigmine') || q.includes('muscarinic')) {
    if (bradycardiaTriggered) {
      return `### 🚨 SEVERE UNOPPOSED MUSCARINIC SURGE!
We are witnessing severe, progressive bradycardia (HR: ${fmt(hr)} bpm) due to unopposed muscarinic stimulation! This occurred because Neostigmine was administered without co-administration of an anticholinergic.

**Clinical Rationale**: Neostigmine blocks acetylcholinesterase, leading to a massive surge of acetylcholine (ACh) at both nicotinic and muscarinic synapses. At the neuromuscular junction, nicotinic receptor ACh restores muscle twitches. However, at peripheral muscarinic receptors (heart and glands), ACh triggers intense vagal stimulation, causing severe bradycardia, salivary hyper-secretion, and risk of asystole.

**Directive**: Administer **[glycopyrrolate]** (0.2 mg IV) or **[atropine]** (0.5 mg IV) immediately! These drugs are competitive muscarinic antagonists that will block peripheral ACh receptors, rapidly restoring heart rate and drying up secretions.`;
    } else {
      return `Current heart rate is ${fmt(hr)} bpm. If you plan to reverse neuromuscular blockade using neostigmine, always co-administer an anticholinergic like **[glycopyrrolate]** or **[atropine]** to prevent severe, life-threatening bradycardia.`;
    }
  }

  // D. NPO Status / Gastric Volume / Aspiration Risk
  if (q.includes('npo') || q.includes('fasting') || q.includes('aspiration') || q.includes('gastric') || q.includes('stomach') || q.includes('eat') || q.includes('drink')) {
    const gastricVol = patient.gastricVolume !== undefined ? patient.gastricVolume : 0;
    const hasFullStomach = gastricVol > 50 || patient.stomach === 'full';

    let msg = `### NPO & Aspiration Risk Assessment\n`;
    msg += `- **Solid Fasting**: ${patient.npoSolids || 8} hours\n`;
    msg += `- **Liquid Fasting**: ${patient.npoLiquids || 4} hours\n`;
    msg += `- **Calculated Gastric Volume**: ${fmt(gastricVol)} mL\n\n`;

    if (hasFullStomach) {
      msg += `**Clinical Evaluation**: The patient has a high risk of aspiration (full stomach / insufficient fasting window). We must treat this as a **Rapid Sequence Induction (RSI)** case. 
      
**Directive**:
1. **Avoid BMV**: Avoid positive pressure mask ventilation prior to intubation to prevent gastric insufflation, which worsens regurgitation.
2. **Suction Ready**: Ensure rigid Yankauer [suction] is fully functional and ready in-hand at the bedside.
3. **Paralysis**: Administer high-dose neuromuscular blocker: **[succinylcholine]** (1.5 mg/kg IV) or high-dose **[rocuronium]** (1.2 mg/kg IV) to achieve rapid paralysis in under 60 seconds.
4. Apply cricoid pressure during laryngoscopy to mechanically occlude the esophagus until the airway is secured.`;
    } else {
      msg += `**Clinical Evaluation**: The patient is NPO-compliant (solids > 8h, liquids > 2h). Gastric volume is low (${fmt(gastricVol)} mL). Standard induction and ventilation strategy is appropriate. Always check [npo history] before transferring the patient.`;
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

      if (patient.tubePosition === 'esophagus') {
        msg += `**CRITICAL ALERT**: The tube is malpositioned in the esophagus! Immediately remove the tube (deflate/extubate), clear secretions with rigid Yankauer [suction], and perform [laryngoscopy] again using a Video Laryngoscope!\n\n`;
      } else if (patient.tubePosition === 'right_mainstem') {
        msg += `**WARNING**: The tube is mainstemmed in the right bronchus! Pull the ETT back 2cm immediately to establish bilateral ventilation and prevent left-sided collapse.\n\n`;
      }
      
      if (pip > 35) {
        msg += `**ALERT**: Peak pressure is high (${fmt(pip)} cmH2O). If this is bronchospasm, consider administering **[albuterol]** via ETT. If the patient is biting/coughing, consider oral **[suction]** or deep neuromuscular blockade with **[rocuronium]**.`;
      } else {
        msg += `The airway is currently stable. Keep volatile MAC at 0.8-1.0 and maintain mechanical ventilation. Before pulling the ETT, run a [cuff leak test]!`;
      }
    } else {
      msg += `- **Airway secured**: No\n`;
      msg += `- **Pre-oxygenation status (FRC O2)**: ${fmt(frcO2Percent)}% (Goal: >85%)\n`;
      msg += `- **FRC lung volume**: ${fmt(frc_L, 2)} L\n\n`;

      if (patient.airwayBlood && !patient.isSuctioned) {
        msg += `⚠️ **CRITICAL SECRETION ALERT**: The pharynx is obscured by massive blood and secretions. You MUST perform rigid Yankauer **[suction]** immediately before attempting mask ventilation or intubation. Otherwise, you will force secretions directly into the trachea, triggering aspiration pneumonitis and intense bronchospasm.\n\n`;
      }

      let obeseAdvice = "";
      if (isObeseCase) {
        obeseAdvice = `\n- **Obesity Factor**: Place the patient in the **[ramped]** position prior to induction to optimize FRC and delay apneic desaturation.`;
      }

      msg += `**Directive**: We must achieve adequate pre-oxygenation to wash out alveolar nitrogen and expand the FRC oxygen buffer (FRC O2 > 85%). Once pre-oxygenation is optimal, administer propofol (150 mg IV) or etomidate (20 mg IV if hemodynamically unstable). Follow with a muscle relaxant like **[rocuronium]** (50 mg) or **[succinylcholine]** (100 mg). When paralysis is complete, perform **[laryngoscopy]** and place the ETT.${obeseAdvice}`;
    }
    return msg;
  }

  // F. Hemodynamics / Sepsis / Cardiac / Blood Pressure
  if (q.includes('pressure') || q.includes('bp') || q.includes('hypotension') || q.includes('hypertension') || q.includes('map') || q.includes('low blood') || q.includes('shock') || q.includes('heart rate') || q.includes('pulse') || q.includes('tachycardia')) {
    let msg = `### Hemodynamic Profile & Cardiovascular State\n`;
    msg += `- **Blood Pressure**: ${fmt(sys)}/${fmt(dia)} mmHg (MAP: ${fmt(map)} mmHg)\n`;
    msg += `- **Heart Rate**: ${fmt(hr)} bpm\n`;
    msg += `- **Myocardial Stunning**: ${fmt(stunning, 1)}%\n`;
    msg += `- **Access Lines Placed**: ${placedLines.length > 0 ? placedLines.map(l => l.name).join(', ') : 'None'}\n\n`;

    if (isArrest) {
      msg += `**CRITICAL**: The patient is in cardiac arrest! Immediately begin chest compressions [start cpr] and push [epinephrine].`;
    } else if (isSepticCase && propofolCe > 0.1 && map < 60) {
      msg += `### 🚨 POST-PROPOFOL CARDIOVASCULAR COLLAPSE!
The patient is suffering from profound septic shock. Administering Propofol has triggered rapid SVR collapse. 
**Directive**: Administer **[epinephrine]** (50 mcg IV bolus) or **[phenylephrine]** (100 mcg IV bolus) immediately to restore systemic vasomotor tone! Open crystalloid fluids on the Lines Panel.`;
    } else if (isCardiacCase && stunning > 5) {
      msg += `### 🚨 MYOCARDIAL ISCHEMIA DETECTED!
Myocardial perfusion has collapsed due to tachycardia or severe hypotension.
**Directive**: Administer **[phenylephrine]** (100 mcg bolus) immediately to restore coronary perfusion pressure (target MAP > 65), and push **[esmolol]** (20 mg bolus) to control heart rate and reduce myocardial oxygen demand.`;
    } else if (map < 65) {
      msg += `**Clinical Evaluation**: Significant hypotension detected (MAP: ${fmt(map)} mmHg). Perfusion to organs is compromised.
- If this is vasoplegia due to anesthetic induction, administer **[phenylephrine]** (100 mcg IV bolus) to increase SVR.
- If concurrent bradycardia is present, consider **[atropine]** or **[glycopyrrolate]**.
- If cardiac risk profile is high, place a **[place arterial line]** immediately for beat-to-beat pressure telemetry.`;
    } else if (sys > 140 || hr > 100) {
      msg += `**Clinical Evaluation**: Hypertension or tachycardia present (SBP: ${fmt(sys)} mmHg, HR: ${fmt(hr)} bpm).
- Check anesthetic depth: BIS is ${fmt(bis)} (Goal 40-60). Consider increasing Sevoflurane vaporizer dial or administering **[fentanyl]** (100 mcg IV) to manage surgical noxious stimulation.
- If heart rate remains elevated, consider **[esmolol]** (20 mg IV) to protect the myocardium.`;
    } else {
      msg += `**Clinical Evaluation**: Cardiovascular system is stable. Perfusion pressures are within normal physiological bounds (MAP: ${fmt(map)} mmHg, HR: ${fmt(hr)} bpm).`;
    }
    return msg;
  }

  // G. Muscle Relaxation / TOF / Reversals
  if (q.includes('paraly') || q.includes('relax') || q.includes('tof') || q.includes('train-of-four') || q.includes('rocuronium') || q.includes('succinylcholine') || q.includes('vecuronium') || q.includes('sugammadex') || q.includes('revers')) {
    let msg = `### Neuromuscular Blockade Assessment\n`;
    msg += `- **Train-of-Four (TOF) Count**: ${fmt(tofCount)}/4 twitch responses\n`;
    msg += `- **Active Muscle Relaxants**: Rocuronium Ce is ${fmt(rocuroniumCe, 2)} mcg/mL, Succinylcholine Ce is ${fmt(succinylcholineCe, 2)} mcg/mL.\n\n`;

    if (surgicalPhase === 'Extubation') {
      if (tofCount < 4) {
        msg += `⚠️ **CRITICAL PARALYSIS WARING**: Neuromuscular blockade is still active (TOF twitches: ${fmt(tofCount)}/4). Extubating now will cause complete upper airway obstruction and respiratory failure.
        
**Directive**: Administer **[sugammadex]** (2-4 mg/kg IV) to encapsulate and inactivate Rocuronium/Vecuronium, or **[neostigmine]** co-administered with **[glycopyrrolate]** to reverse neuromuscular blockade. Wait for a TOF count of 4/4 with no fade before deflating ETT cuff!`;
      } else {
        msg += `🟢 **Neuromuscular block reversed**: TOF count is 4/4. Safe to proceed with extubation checklists once Sevoflurane dial is off and patient is awake.`;
      }
    } else {
      if (tofCount === 4) {
        msg += `**Clinical Evaluation**: Patient is not paralyzed (TOF: 4/4).
- To facilitate laryngoscopy or assist surgical abdominal relaxation, administer **[rocuronium]** (50 mg IV) or **[succinylcholine]** (100 mg IV). Ensure the patient is adequately sedated (BIS < 60) before administering paralytics!`;
      } else if (tofCount > 0) {
        msg += `**Clinical Evaluation**: Partial neuromuscular blockade (TOF: ${tofCount}/4). Muscle tone is recovering. Administer an additional bolus of **[vecuronium]** or **[rocuronium]** if deep paralysis is required by the surgical team.`;
      } else {
        msg += `**Clinical Evaluation**: Deep, complete neuromuscular blockade (TOF: 0/4). Optimal for mechanical ventilation. Do not reverse until the surgery is complete and you are preparing to emerge.`;
      }
    }
    return msg;
  }

  // H. Potassium / Hyperkalemia / Succinylcholine Risk
  if (q.includes('potassium') || q.includes('hyperkalemia') || q.includes('k+') || q.includes('calcium')) {
    let msg = `### Serum Electrolytes & Hyperkalemia Audit\n`;
    msg += `- **Estimated Potassium (K+)**: ${fmt(potassium, 1)} mEq/L (Normal: 3.5 - 5.0 mEq/L)\n`;
    if (patient.suxPotassiumLeaked) {
      msg += `- **Alert Event**: Potassium leaked due to Succinylcholine administration in upregulated nAChRs!\n\n`;
    }

    if (potassium > 5.5) {
      msg += `🔴 **CRITICAL HYPERKALEMIA DETECTED** (${fmt(potassium, 1)} mEq/L)! This triggers myocardial membrane instability and asystolic cardiac arrest.
      
**Directive**:
1. **Stabilize Myocardium**: Administer **[calcium chloride]** (1000 mg IV) immediately.
2. **Shift Potassium Intracellularly**: Administer **[albuterol]** via ETT, hyperventilate (increase ventilator RR and VT), or give insulin/dextrose.`;
    } else {
      msg += `**Clinical Evaluation**: Potassium is within normal limits (${fmt(potassium, 1)} mEq/L). Standard anesthetic course is safe. Check [labs] to evaluate other electrolytes.`;
    }
    return msg;
  }

  // I. Positioning Physiology
  if (q.includes('position') || q.includes('sitting') || q.includes('beach chair') || q.includes('trendelenburg') || q.includes('lithotomy') || q.includes('prone') || q.includes('ramped')) {
    let msg = `### 📐 Positioning Physiology & Telemetry Audit\n`;
    msg += `- **Current Position**: ${pos.toUpperCase()}\n`;
    msg += `- **Compliance / Resistance**: ${fmt(compliance)} mL/cmH2O / ${fmt(resistance)} cmH2O/L/s\n\n`;

    if (pos === 'Sitting' || pos === 'Beach Chair') {
      msg += `⚠️ **Beach Chair / Sitting Positioning Warning**:\n`;
      msg += `1. **Cerebral Hydrostatic Gradient**: actual cerebral MAP is approximately ~29.6 mmHg lower than measured by the arm cuff! With a systemic MAP of ${fmt(map)} mmHg, actual cerebral pressure is only ~${fmt(map - 29.6)} mmHg. Target an arm cuff MAP > 85 mmHg to protect the brain from watershed ischemia.\n`;
      msg += `2. **Venous Pooling**: Blood pools in the lower extremities, severely reducing preload. Ensure aggressive crystalloid hydration and have vasopressors ready.\n`;
    } else if (pos === 'Trendelenburg' || pos === 'Lithotomy') {
      msg += `⚠️ **Trendelenburg / Lithotomy Diaphragmatic Compression**:\n`;
      msg += `Cephalad visceral shift pushes the abdominal contents against the diaphragm, shifting it upward. This directly compresses the lungs, reducing FRC and chest wall compliance, which spikes Peak Inspiratory Pressures (PIP: ${fmt(pip)} cmH2O). Maintain moderate tidal volumes, check PIP frequently, and ensure deep neuromuscular blockade ([rocuronium]) to relax abdominal resistance.\n`;
    } else if (pos === 'Prone') {
      msg += `⚠️ **Prone Positioning Safety Interlocks**:\n`;
      msg += `1. **Airway Security**: Accidental extubation in a prone patient is a high-mortality clinical emergency. Ensure the ETT is rigidly secured prior to turning.\n`;
      msg += `2. **Pressure Points**: Pad facial structures, eyes, and peripheral nerves (ulnar/brachial plexus) to prevent ischemia and postoperative neuropathies.\n`;
    } else if (pos === 'Ramped') {
      msg += `🟢 **Optimized Clinical Positioning**:\n`;
      msg += `Unloads chest wall weight and shifts the abdominal viscera downward, significantly improving FRC. Essential for obese patients during pre-oxygenation to expand the oxygen buffer and delay apnea-induced desaturation.`;
    }
    return msg;
  }

  // J. Help / General Next Step Directives
  if (q.includes('help') || q.includes('what should i do') || q.includes('next') || q.includes('advice') || q.includes('guidance') || q.includes('treat')) {
    let msg = `### Attending Clinical Consultation\n`;
    msg += `Looking at the current state, here is my immediate guidance:\n\n`;

    if (isArrest) {
      msg += `🚨 **CARDIAC ARREST ACTIVE**: rhythm is ${rhythm.toUpperCase()}. Focus on ACLS: click **[start cpr]** and push **[epinephrine]** (50 mcg IV).\n\n`;
    } else if (isAnaphylaxis && !isAnaphylaxisTreated) {
      msg += `🚨 **ANAPHYLACTIC SHOCK ACTIVE**: Compliance has crashed to ${fmt(compliance)} and SBP is ${fmt(sys)}. Push **[epinephrine]** (50 mcg IV) immediately! Also consider **[albuterol]**.\n\n`;
    } else if (bradycardiaTriggered) {
      msg += `🚨 **UNOPPOSED MUSCARINIC SURGE**: Profound bradycardia (HR: ${fmt(hr)} bpm). Immediately push **[glycopyrrolate]** (0.2 mg) or **[atropine]**.\n\n`;
    } else if (isSepticCase && propofolCe > 0.1 && map < 60) {
      msg += `🚨 **POST-PROPOFOL CARDIOVASCULAR COLLAPSE**: SBP is ${fmt(sys)} mmHg in a septic patient. Push **[epinephrine]** (50 mcg bolus) or **[phenylephrine]** immediately to restore vasomotor tone, and open fluids.\n\n`;
    } else if (isTraumaCase && patient.tubePosition === 'esophagus') {
      msg += `🚨 **ESOPHAGEAL INTUBATION**: ETT is in stomach. Immediately pull the ETT [remove], clear secretions with [suction], and perform [laryngoscopy] again using a Video Laryngoscope.\n\n`;
    } else if (isCardiacCase && stunning > 5) {
      msg += `🚨 **MYOCARDIAL ISCHEMIA DETECTED**: Stunning is at ${fmt(stunning)}%. Maintain SVR by pushing **[phenylephrine]** (100 mcg) and control heart rate with **[esmolol]** (20 mg bolus).\n\n`;
    } else if (spo2 < 90) {
      msg += `🚨 **ACUTE DESATURATION**: SpO2 is ${fmt(spo2)}%. Check tube position, check circuit connections, increase fresh gas flows, and bag manually with 100% O2.\n\n`;
    } else if (map < 65) {
      msg += `⚠️ **HYPOTENSION**: MAP is ${fmt(map)} mmHg. Administer **[phenylephrine]** (100 mcg IV) and assess anesthetic depth (MAC is ${fmt(mac, 2)}). You may need to review [labs].\n\n`;
    } else if (pip > 35) {
      msg += `⚠️ **ELEVATED AIRWAY PRESSURE**: PIP is ${fmt(pip)} cmH2O. Check for bronchospasm (administer **[albuterol]**) or patient coughing (deepen paralysis or [suction]).\n\n`;
    } else if (bis > 60 && surgicalPhase !== 'Pre-Op') {
      msg += `⚠️ **LIGHT ANESTHESIA**: BIS is ${fmt(bis)} during active phase. Increase Sevoflurane vaporizer dial or administer **[propofol]** (150 mg IV).\n\n`;
    } else if (!airwaySecured) {
      if (patient.airwayBlood && !patient.isSuctioned) {
        msg += `📋 **AIRWAY ASSIGNMENT**: Perform rigid Yankauer **[suction]** immediately to clear massive blood/secretions. Then pre-oxygenate to >85% FRC O2. Follow with **[propofol]** (or [etomidate] if unstable), **[fentanyl]**, and a paralytic before **[laryngoscopy]**.\n\n`;
      } else {
        msg += `📋 **AIRWAY ASSIGNMENT**: Perform pre-oxygenation to >85% FRC O2 (current: ${fmt(frcO2Percent)}%). Then push **[propofol]** (150 mg IV), **[fentanyl]** (100 mcg IV), and a paralytic. Once paralyzed, perform **[laryngoscopy]** to secure the airway.\n\n`;
      }
    } else {
      msg += `✅ **PHYSIOLOGY STABLE**: Current patient vitals are stable. Maintain volatile MAC at 0.8-1.0 and ventilate to keep PaCO2 at 35-45 mmHg. Review [labs] if needed.\n\n`;
    }

    msg += `Feel free to ask me about any specific organ system (e.g. *hemodynamics*, *airway*, *ventilation*, *anesthesia depth*, *positioning*, *NPO status*, or *potassium level*).`;
    return msg;
  }

  // K. Fallback Attending Clinical Reasoning
  let fallback = `### Senior Attending Briefing\n`;
  fallback += `Hello. As the attending anesthesiologist, I am reviewing the live simulation telemetry for ${patient.name || 'our patient'} (ASA ${patient.asaStatus || 'I'}).\n\n`;
  fallback += `- **Vitals Snapshot**: HR: ${fmt(hr)} bpm, BP: ${fmt(sys)}/${fmt(dia)} mmHg (MAP: ${fmt(map)} mmHg), SpO2: ${fmt(spo2)}%, EtCO2: ${fmt(etco2)} mmHg.\n`;
  fallback += `- **Anesthetic Depth**: BIS: ${fmt(bis)}, MAC: ${fmt(mac, 2)}.\n`;
  fallback += `- **Surgical Phase**: ${surgicalPhase}.\n`;
  fallback += `- **Patient Position**: ${pos}.\n\n`;
  fallback += `Please ask me specific physiological or pharmacological questions regarding the patient's state, active medications, NPO guidelines, [positioning], or procedural actions (e.g., [laryngoscopy], [suction], [msmaids checklist], [pre-op checklists], [post-intubation check], [extubation check], [cuff leak test], [cpr], [check rhythm], [deliver shock], [order abg], [order vbg], [order cbc], [order cmp], [order coags], [order teg], [review chart], or [live labs]). I will provide high-fidelity clinical reasoning and outline next steps.`;
  return fallback;
}
