/**
 * Attending Consultation Engine — High Fidelity Anesthesia Expert Advisor
 * Evaluates the full physiological, pharmacological, and procedural picture each tick
 * and outputs structured clinical reasoning and next-step actions.
 */

// Helper to format physiological values nicely
function fmt(val, decimals = 0) {
  if (val === undefined || val === null || isNaN(val)) return 'N/A';
  return typeof val === 'number' ? val.toFixed(decimals) : val;
}

export function evaluateAttendingGuidance({
  vitals = {},
  patient = {},
  activeMeds = [],
  surgicalPhase = 'Pre-Op',
  time = 0,
  logs = [],
  attendingMode = 'observing',
  msmaidsComplete = false,
  ventSettings = {},
  gasSettings = {}
}) {
  const alerts = [];
  const suggestions = [];
  
  // 1. EXTRACT RELEVANT STATES
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
  const potassium = patient.suxPotassiumLeaked ? (patient.potassiumLevel || 6.2) : 4.0; // surrogate from app state if leak triggered
  
  const isSeptic = patient.isSeptic || false;
  const isAnaphylaxis = patient.anaphylaxisTriggered || false;
  const isAnaphylaxisTreated = patient.anaphylaxisTreated || false;
  const bradycardiaTriggered = patient.bradycardiaTriggered || false;
  const airwaySecured = patient.airwaySecured || false;
  const isApneic = patient.isApneic || false;
  
  const frc_L = patient.lungVolumes?.frc_L || 2.4;
  const o2Buffer = patient.oxygenBuffer !== null && patient.oxygenBuffer !== undefined ? patient.oxygenBuffer : 0.5;
  const frcO2Percent = frc_L > 0 ? (o2Buffer / frc_L) * 100 : 21;

  // Sedatives, opioids, and paralytics active levels
  const propofolCe = activeMeds.find(m => m.name === 'Propofol')?.Ce || 0;
  const etomidateCe = activeMeds.find(m => m.name === 'Etomidate')?.Ce || 0;
  const ketamineCe = activeMeds.find(m => m.name === 'Ketamine')?.Ce || 0;
  const fentanylCe = activeMeds.find(m => m.name === 'Fentanyl')?.Ce || 0;
  const rocuroniumCe = activeMeds.find(m => m.name === 'Rocuronium')?.Ce || 0;
  const succinylcholineCe = activeMeds.find(m => m.name === 'Succinylcholine')?.Ce || 0;
  const vecuroniumCe = activeMeds.find(m => m.name === 'Vecuronium')?.Ce || 0;
  const sedativeActive = propofolCe > 0.05 || etomidateCe > 0.05 || ketamineCe > 0.05;

  const pos = patient.position || 'Supine';

  // 2. SAFETY RULES / CRITICAL ALERTS (High-Fidelity Physiological & Pharmacological Logic)

  // A. Penicillin Anaphylaxis
  if (isAnaphylaxis && !isAnaphylaxisTreated) {
    alerts.push({
      id: 'anaphylaxis_active',
      priority: 'CRITICAL',
      message: `🚨 LIFE-THREATENING PENICILLIN ANAPHYLAXIS! Profound vasodilatory shock and hyperacute bronchospasm triggered by Ampicillin/Sulbactam administration in a patient with a severe Penicillin allergy. Mast cell degranulation has released massive systemic histamine and leukotrienes, causing complete vascular smooth muscle relaxation (SVR collapse) and severe sub-glottic airway narrowing. Respiratory compliance is critically reduced (${fmt(compliance)} mL/cmH2O) and Resistance is extremely elevated (${fmt(resistance)} cmH2O/L/s). Administer Epinephrine immediately! Epinephrine's alpha-1 agonist activity will restore vasomotor tone and SVR, while beta-2 agonist activity stabilizes mast cells and provides powerful bronchodilation.`,
      action: 'Push Epinephrine (IV bolus)'
    });
  }

  // B. Unopposed Muscarinic Activation (Neostigmine Bradycardia)
  if (bradycardiaTriggered) {
    alerts.push({
      id: 'unopposed_muscarinic',
      priority: 'CRITICAL',
      message: `🚨 SEVERE UNOPPOSED MUSCARINIC SURGE! Neostigmine was administered without co-administration of an anticholinergic. While Neostigmine blocks acetylcholinesterase to increase acetylcholine (ACh) at the neuromuscular junction (nicotinic receptors) to reverse paralysis, it also builds up ACh at peripheral muscarinic receptors. This causes profound parasympathetic vagal stimulation, resulting in severe bradycardia (HR: ${fmt(hr)} bpm), AV block, and copious salivary secretions. Left untreated, this will rapidly degenerate into asystole. Administer Glycopyrrolate or Atropine immediately to competitively block muscarinic receptors and protect the heart!`,
      action: 'Push Glycopyrrolate'
    });
  }

  // C. Myocardial Stunning / Coronary Ischemia
  if (stunning > 5) {
    alerts.push({
      id: 'coronary_ischemia',
      priority: 'WARNING',
      message: `⚠️ MYOCARDIAL ISCHEMIA & CORONARY UNDERPERFUSION (Stunning: ${fmt(stunning, 1)}%)! In patients with Coronary Artery Disease, myocardial perfusion occurs almost exclusively during diastole. Diastolic coronary perfusion pressure is directly dependent on systemic diastolic BP minus LVEDP. A elevated double-product (HR × SBP > 14,000, signaling high oxygen demand) or low diastolic pressure (< 50 mmHg, signaling low oxygen supply) has triggered ischemia. Maintain high coronary perfusion pressure (target MAP > 65) with Phenylephrine (pure alpha-1 vasoconstrictor, which increases diastolic BP without increasing heart rate) and control heart rate with Esmolol. Deepen volatile anesthesia if MAC is sub-therapeutic.`,
      action: 'Deepen anesthesia / Push Esmolol / Push Phenylephrine'
    });
  }

  // D. Severe Hypoxemia
  if (spo2 < 90 && !isArrest) {
    alerts.push({
      id: 'hypoxemia',
      priority: 'CRITICAL',
      message: `🚨 CRITICAL ARTERIAL HYPOXEMIA (SpO2: ${fmt(spo2)}%)! Alveolar oxygen reserves are completely depleted, and tissue hypoxia is imminent, risking rapid hypoxic cardiac arrest. Systematically audit: check for chest rise, verify oxygen flow (FiO2 100% on gas panel), verify capnography waveform (confirming tube is in trachea and not esophagus), check circuit connections to rule out disconnect, and immediately initiate manual bag-mask ventilation with 100% O2 to salvage oxygenation.`,
      action: 'Confirm tube position / Verify circuit connection / Increase FiO2'
    });
  }

  // E. Severe Hypotension
  if (map < 60 && !isArrest) {
    alerts.push({
      id: 'severe_hypotension',
      priority: 'WARNING',
      message: `⚠️ CLINICALLY SIGNIFICANT HYPOTENSION (MAP: ${fmt(map)} mmHg, SBP: ${fmt(sys)} mmHg)! Cerebral, coronary, and renal perfusion pressures are severely compromised. Review anesthetic depth: volatile gases cause direct, dose-dependent myocardial contractility depression and systemic vasodilation (MAC is currently ${fmt(mac, 2)}). Administer a vasopressor immediately: push Phenylephrine (100 mcg IV) for pure vasoplegic SVR restoration, or co-administer Ephedrine (5-10 mg IV) if heart rate is slow. Decrease volatile vaporizer dial settings to reduce gas-induced myocardial depression.`,
      action: 'Push Phenylephrine / Ephedrine / Reduce Vaporizer Dial'
    });
  }

  // F. Light Anesthesia during Incision
  if (surgicalPhase === 'Incision' && mac < 0.7 && bis > 60) {
    alerts.push({
      id: 'light_anesthesia_incision',
      priority: 'WARNING',
      message: `⚠️ INADEQUATE ANESTHETIC DEPTH FOR SURGICAL INCISION! Volatile end-tidal MAC is critically sub-therapeutic (${fmt(mac, 2)}) and BIS is high (${fmt(bis)}), indicating a highly active cerebral cortex. Pain from surgical incision in a light anesthetic plane will trigger massive sympathetic nociceptive discharge, causing severe tachycardia, hypertension, and cardiac oxygen demand spikes, or trigger life-threatening laryngospasm and intraoperative awareness. Increase vaporizer settings to 1.5 - 2.5% immediately to achieve a therapeutic MAC level (0.8 - 1.0) and push Propofol/Fentanyl.`,
      action: 'Increase Vaporizer Dial to 1.5 - 2.5%'
    });
  }

  // G. Airway Pressure Alarm (PIP Alarm)
  if (pip > 35) {
    alerts.push({
      id: 'airway_pressure_high',
      priority: 'WARNING',
      message: `⚠️ ELEVATED PEAK INSPIRATORY PRESSURES (PIP: ${fmt(pip)} cmH2O)! Elevated ventilatory pressures expose the lungs to barotrauma and alveolar rupture. High PIP is driven by high resistance (e.g., bronchospasm, mucus plugging, ETT kinking) or reduced compliance (e.g., patient coughing/bucking the ventilator, pneumothorax, cephalad visceral weight in Trendelenburg). Auscultate lungs immediately. Check TOF/BIS: if the patient is waking or fighting the ventilator, deepen neuromuscular blockade with Vecuronium or deepen anesthesia. Administer Albuterol if bronchospasm is present, or perform rigid Yankauer suction if secretions are high.`,
      action: 'Administer Albuterol / Push Vecuronium / Suction airway'
    });
  }

  // H. Hypercapnia
  if (paco2 > 50) {
    suggestions.push({
      id: 'hypercapnia',
      priority: 'SUGGESTION',
      message: `💡 VENTILATORY CARBON DIOXIDE RETENTION: PaCO2 is elevated at ${fmt(paco2)} mmHg (normal: 35-45). This respiratory acidosis depresses myocardial function and raises intracranial pressure. Increase minute ventilation (Ve) on the ventilator by raising either the respiratory rate (RR) or tidal volume (VT) to accelerate carbon dioxide clearance.`,
      action: 'Increase Vent RR or VT'
    });
  }

  // I. Hypocapnia
  if (paco2 < 30) {
    suggestions.push({
      id: 'hypocapnia',
      priority: 'SUGGESTION',
      message: `💡 CEREBRAL VASOCONSTRICTION RISK: PaCO2 is low at ${fmt(paco2)} mmHg. Hypocapnia triggers respiratory alkalosis, which causes profound cerebral vascular constriction, severely reducing cerebral blood flow and oxygen delivery to the brain. Reduce ventilator minute ventilation by decreasing respiratory rate or tidal volume to allow physiological CO2 re-accumulation.`,
      action: 'Reduce Vent RR or VT'
    });
  }

  // J. Severe Hyperkalemia
  if (potassium > 5.5) {
    alerts.push({
      id: 'hyperkalemia_alarm',
      priority: 'CRITICAL',
      message: `🚨 LIFE-THREATENING HYPERKALEMIA DETECTED (Estimated K+: ${fmt(potassium, 1)} mEq/L)! Elevated potassium shifts the cardiac resting membrane potential closer to threshold, causing severe electrical conduction blocks, QRS widening, sine-wave formation, and asystolic cardiac arrest. Administer Calcium Chloride immediately to stabilize the cardiac membrane (calcium restores the electrical threshold gradient). To shift potassium intracellularly, hyperventilate (alkalosis shifts H+ out and K+ in), administer Albuterol (beta-2 receptor activation stimulates Na+/K+-ATPase), or give insulin/dextrose.`,
      action: 'Push Calcium Chloride / Give Albuterol / Hyperventilate'
    });
  }

  // K. Positional Hemodynamic & Compliance Warnings
  if (pos === 'Sitting' || pos === 'Beach Chair') {
    if (map < 80 && !isArrest) {
      alerts.push({
        id: 'beach_chair_ischemia',
        priority: 'CRITICAL',
        message: `🚨 CEREBRAL PERFUSION RISK IN SITTING POSITION! The patient is in the Sitting/Beach Chair position, which triggers gravity-dependent blood pooling in the lower extremities, severely compromising cardiac preload and output. More importantly, the brain lies roughly 30 cm higher than the heart, creating a hydrostatic pressure gradient that renders cerebral MAP ~29.6 mmHg LOWER than measured by the arm cuff! cuff MAP is ${fmt(map)} mmHg, meaning cerebral MAP is only ~${fmt(map - 29.6)} mmHg. This is below the autoregulation threshold. Administer vasopressors (Phenylephrine) immediately to keep cuff MAP > 85 mmHg!`,
        action: 'Push Phenylephrine / Increase Fluids'
      });
    }
  } else if (pos === 'Trendelenburg' || pos === 'Lithotomy') {
    if (pip > 30) {
      alerts.push({
        id: 'diaphragmatic_compression',
        priority: 'WARNING',
        message: `⚠️ COMPLIANCE LOSS FROM POSITIONAL COMPRESSION: The patient is in the ${pos} position. Gravity is shifting abdominal viscera cephalad against the diaphragm, directly compressing lung volumes (FRC) and reducing chest wall compliance. This is driving airway pressures higher (PIP: ${fmt(pip)} cmH2O). Ensure adequate neuromuscular blockade (TOF 0/4) and titrate tidal volumes downward while increasing RR to prevent pulmonary barotrauma.`,
        action: 'Push Vecuronium / Reduce Tidal Volume'
      });
    }
  }

  // 3. STEP-BY-STEP TEACHING / TUTORIAL FLOW (Active in Teaching Mode)
  let teachingGuide = null;
  
  if (!msmaidsComplete) {
    teachingGuide = {
      step: 'MSMAIDS Pre-Induction Setup',
      message: "The patient has been transferred to the OR table. Prior to general anesthesia induction, it is mandatory to perform a standardized MSMAIDS checklist. Click the 'MSMAIDS Checklist' button to verify your Machine, Suction, Monitors, Airway gear, IV access, Drugs, and Safety backup. Confirm everything is fully functional.",
      suggestion: "Action: Click the 'MSMAIDS' button in the Action Panel."
    };
  } else if (patient.airwayBlood && !airwaySecured) {
    teachingGuide = {
      step: 'Clear Airway Secretions (Suction)',
      message: "The patient has active blood or secretions obscuring the oropharynx (Mallampati exam cannot visualize structures). Performing laryngoscopy or positive pressure bag-mask ventilation (BMV) in a soiled airway is extremely hazardous: it will completely obscure your view of the vocal cords and force acidic fluids or blood directly into the trachea, triggering catastrophic aspiration pneumonitis and severe bronchospasm. Perform rigid Yankauer suction immediately to establish a clean field.",
      suggestion: "Action: Click the 'Yankauer Suction' button in the Airway Panel."
    };
  } else if (!sedativeActive && !airwaySecured) {
    if (frcO2Percent < 85) {
      let obeseContext = "";
      if (patient.isObese) {
        obeseContext = ` Notice that this patient is severely obese (BMI: ${fmt(patient.bmi, 1)}). Obese patients have significantly reduced baseline FRC. In the Supine position, the weight of the chest and abdomen further compresses the lungs. To prevent a catastrophic rapid desaturation cliff, ensure the patient is in the Ramped position to optimize lung volumes and extend safe apnea time.`;
      }
      teachingGuide = {
        step: 'Pre-Oxygenation (Nitrogen Washout)',
        message: `Before we induce apnea, we must pre-oxygenate to create an oxygen reservoir in the lungs. Put on the oxygen mask, set FiO2 to 100% and O2 flow to 10-15 L/min. Currently, the FRC oxygen fraction is only ${fmt(frcO2Percent)}%. Watch the exponential nitrogen washout curve. Patients with obesity or restrictive lung disease have small FRC volumes (${fmt(frc_L, 2)} L) and will desaturate within 90 seconds of apnea, while a healthy patient can tolerate up to 8 minutes!${obeseContext}`,
        suggestion: "Action: Place Oxygen Mask, set FiO2 to 100%, and O2 flow to 15 L/min."
      };
    } else {
      let cardiacContext = "";
      if (patient.cad) {
        cardiacContext = " WARNING: This patient has Coronary Artery Disease. Propofol causes significant vasodilation and myocardial depression which can trigger profound hypotension and coronary hypoperfusion. Consider using Etomidate (0.3 mg/kg) as it is hemodynamically stable, and co-administer Fentanyl (1-2 mcg/kg) to blunt the tachycardia response to laryngoscopy.";
      }
      teachingGuide = {
        step: 'General Anesthesia Induction',
        message: `Excellent! The FRC reservoir is fully denitrogenated (FRC O2 > 85%). The patient is pre-oxygenated and ready for induction. Go to the Pharmacopoeia and administer your sedative bolus: Propofol (1.5 - 2.0 mg/kg IV) is standard. Co-administer Fentanyl (1 - 2 mcg/kg IV) to blunt the sympathetic response to laryngoscopy.${cardiacContext}`,
        suggestion: "Action: Administer Propofol (e.g. 150 mg IV) and Fentanyl (e.g. 100 mcg IV)."
      };
    }
  } else if (tofCount === 4 && !airwaySecured) {
    let rsiContext = "";
    if (patient.stomach === 'full') {
      rsiContext = " WARNING: The patient has a full stomach / is not fasted. This is a high-risk Rapid Sequence Induction (RSI) case. To prevent gastric insufflation and passive regurgitation, avoid positive pressure ventilation (BMV) prior to intubation. Administer a rapid paralytic immediately: Succinylcholine (1.5 mg/kg) or high-dose Rocuronium (1.2 mg/kg). If choosing Succinylcholine, make sure there are no contraindications (like burns or muscle immobility causing nAChR upregulation) to avoid life-threatening hyperkalemia!";
    }
    teachingGuide = {
      step: 'Neuromuscular Blockade (Paralysis)',
      message: `The patient is now anesthetized and unresponsive (BIS dropping). Let's administer a neuromuscular blocking agent (NMBA) to paralyze the patient and facilitate easy laryngoscopy. Administering a muscle relaxant completely relaxes the vocal cords, ensuring optimal Cormack-Lehane exposure and preventing laryngospasm during tube placement.${rsiContext}`,
      suggestion: "Action: Administer Rocuronium (e.g. 50-70 mg IV) or Succinylcholine (e.g. 100 mg IV)."
    };
  } else if (!airwaySecured) {
    teachingGuide = {
      step: 'Laryngoscopy & Intubation',
      message: `The patient is fully paralyzed and apneic (TOF count is ${tofCount}/4). This is the optimal time to secure the airway. Click 'Perform Laryngoscopy' in the Airway Panel. Choose an appropriate blade size (e.g., Macintosh 3 or Video Laryngoscope if difficult airway predicted), visualize the vocal cords (Cormack-Lehane Grade), and carefully place the Endotracheal Tube (ETT).`,
      suggestion: "Action: Click 'Perform Laryngoscopy' on the Airway Panel."
    };
  } else if (airwaySecured && ventSettings.rr === 0) {
    teachingGuide = {
      step: 'Secure Airway & Initiate Ventilation',
      message: "The endotracheal tube has been placed! However, the ventilator is not yet running, and the patient is apneic. Immediately confirm correct ETT placement: check for a sustained EtCO2 waveform (capnography) and listen for equal bilateral breath sounds. Once confirmed, secure the tube, connect the breathing circuit, set ventilator to PCV-VG or VCV mode, and set RR to 12 bpm and Tidal Volume to 7 mL/kg.",
      suggestion: "Action: Turn on the Ventilator and select a mode (e.g. PCV-VG, RR 12, VT 500)."
    };
  } else if (surgicalPhase === 'Induction') {
    teachingGuide = {
      step: 'Maintenance Transition',
      message: "Superb work! The airway is safely secured, bilateral ventilation is confirmed, and mechanical ventilation is active. We are ready to transition to the maintenance phase. Turn on your volatile anesthetic vaporizer (Sevoflurane or Isoflurane dial to 1.5 - 2.5%) and set surgical phase to 'Incision' to let the surgical team begin the procedure.",
      suggestion: "Action: Turn Sevoflurane dial to 2.0% and click 'Incision' under Surgical Phase."
    };
  } else if (surgicalPhase === 'Extubation') {
    const hasNMB = rocuroniumCe > 0.05 || vecuroniumCe > 0.05;
    const nmbReversed = !hasNMB || tofCount === 4;
    let nmbHint = "";
    if (!nmbReversed) {
      nmbHint = " WARNING: Neuromuscular blockade is still active. Extubating a paralyzed patient will trigger immediate complete respiratory failure. You must administer Sugammadex (2-4 mg/kg IV) or Neostigmine co-administered with Glycopyrrolate to reverse neuromuscular block and achieve a TOF 4/4 count before pulling the tube!";
    }
    teachingGuide = {
      step: 'Extubation & Emergence Setup',
      message: `The surgery is complete, and we are ready to emerge the patient. Safe extubation requires strict criteria:
1. **Neuromuscular Recovery**: Confirm TOF is 4/4 with no fade. Reverse if necessary.${nmbHint}
2. **Anesthetic Washout**: Turn off the Sevoflurane dial (dial to 0%) and wait for MAC < 0.2 and BIS > 80, confirming patient is conscious and can protect their airway.
3. **Spontaneous Ventilation**: Titrate ventilator RR to 0 or place on pressure support so the patient is breathing spontaneously.
Once met, suction oral secretions, deflate the cuff, and click 'Deflate & Extubate' in the Airway Panel.`,
      suggestion: "Action: Set Sevoflurane dial to 0%, check TOF twitch, and prepare to extubate once NMB is reversed and patient is awake and breathing."
    };
  } else {
    teachingGuide = {
      step: 'Maintenance Phase Monitoring',
      message: "We are in the maintenance phase of anesthesia. Maintain a steady state: titrate vaporizer dial to keep MAC between 0.8 and 1.0 (BIS 40-60), adjust ventilator RR and VT to maintain arterial PaCO2 at 35-45 mmHg, monitor blood loss, and replace fluids to maintain hemodynamic stability. If surgical neuromuscular blockade is requested, administer intermittent vecuronium or rocuronium.",
      suggestion: "Action: Monitor vitals, maintain MAC at 0.8-1.0, and keep PaCO2 at 40 mmHg."
    };
  }

  // 4. SMART ALERTS REMEDIATION FILTERING INTERLOCK
  // Compiles log search helpers to check if a specific action has been executed since the alert state triggered
  const lowercaseLogs = logs.map(l => l.toLowerCase());
  const logHasAny = (keywords) => keywords.some(kw => lowercaseLogs.some(log => log.includes(kw)));

  const resolvedAlertIds = new Set();

  // Evaluate dynamic clinical resolution criteria for each active alert type
  alerts.forEach(alert => {
    if (alert.id === 'anaphylaxis_active' && patient.anaphylaxisTreated) {
      resolvedAlertIds.add(alert.id);
    }
    if (alert.id === 'unopposed_muscarinic' && !patient.bradycardiaTriggered) {
      resolvedAlertIds.add(alert.id);
    }
    if (alert.id === 'coronary_ischemia' && (vitals.hr < 80 && map >= 65 || logHasAny(['esmolol', 'phenylephrine', 'deepen']))) {
      resolvedAlertIds.add(alert.id);
    }
    if (alert.id === 'hypoxemia' && vitals.spo2 >= 92) {
      resolvedAlertIds.add(alert.id);
    }
    if (alert.id === 'severe_hypotension' && vitals.map >= 65) {
      resolvedAlertIds.add(alert.id);
    }
    if (alert.id === 'light_anesthesia_incision' && (vitals.mac >= 0.8 || logHasAny(['dial', 'vaporizer', 'sevoflurane', 'isoflurane']))) {
      resolvedAlertIds.add(alert.id);
    }
    if (alert.id === 'airway_pressure_high' && (vitals.pip <= 30 || logHasAny(['albuterol', 'vecuronium', 'suction']))) {
      resolvedAlertIds.add(alert.id);
    }
    if (alert.id === 'hyperkalemia_alarm' && logHasAny(['calcium', 'albuterol', 'insulin', 'bicarbonate', 'hyperventilate'])) {
      resolvedAlertIds.add(alert.id);
    }
    if (alert.id === 'beach_chair_ischemia' && vitals.map >= 80) {
      resolvedAlertIds.add(alert.id);
    }
    if (alert.id === 'diaphragmatic_compression' && vitals.pip <= 28) {
      resolvedAlertIds.add(alert.id);
    }
  });

  // Filter out any alert that has been clinically addressed by your actions
  const activeFilteredAlerts = alerts.filter(a => !resolvedAlertIds.has(a.id));
  const activeFilteredSuggestions = suggestions.filter(s => {
    if (s.id === 'hypercapnia' && vitals.paco2 <= 45) return false;
    if (s.id === 'hypocapnia' && vitals.paco2 >= 35) return false;
    return true;
  });

  // 5. NEAR-FUTURE PREDICTIVE FORECASTING ANALYZER (Attending Foresight)
  const forecasts = [];
  
  if (!airwaySecured) {
    if (sedativeActive && !isApneic) {
      forecasts.push("🔮 SEDATIVE REFLEX ALERT: Induction agents are circulating. Expect rapid onset of apnea and loss of airway protective reflexes in the next 30 seconds. Prepare for immediate bag-mask ventilation (BMV) and monitor for systemic vasodilation (hypotension). Have a vasopressor (phenylephrine or ephedrine) ready to support SVR.");
    }
    if ((propofolCe > 0 || etomidateCe > 0) && isApneic && tofCount === 4) {
      forecasts.push("🔮 PARALYSIS REQUIREMENT: Sedation is active but the patient is not yet paralyzed (TOF 4/4 twitches). To optimize vocal cord visualization and prevent laryngospasm or severe airway trauma during laryngoscopy, wait until neuromuscular blockade is established (TOF 0/4 twitches) before attempting intubation.");
    }
    if (frcO2Percent > 85) {
      forecasts.push("🔮 DENITROGENATION COMPLETED: Excellent nitrogen washout has been achieved (FRC O2 > 85%). This has built a solid oxygen reservoir in the lungs, buying 4 to 8 minutes of safe apnea time before desaturation starts. Safe to proceed with induction and paralysis.");
    } else if (patient.isObese) {
      forecasts.push(`🔮 OBESITY DESATURATION RISK: Obese patients have severely reduced functional residual capacity (FRC: ${fmt(frc_L, 2)} L) and high metabolic oxygen consumption. FRC oxygen is currently low (${fmt(frcO2Percent)}%). Upon induction, SpO2 will crash exponentially within 60-90 seconds. To maximize safety, achieve full pre-oxygenation (>85% FRC O2) and ensure patient is in a Ramped position to reduce visceral weight.`);
    } else if (pos === 'Supine') {
      forecasts.push("🔮 PRE-OXYGENATION TARGET: Patient is currently in the Supine position. Pre-oxygenate meticulously to denitrogenate the FRC. To expand the oxygen buffer and prolong safe apnea time, consider placing the patient in a Sniffing or Ramped position.");
    }
  } else {
    // Airway secured
    const hasNMB = rocuroniumCe > 0.05 || vecuroniumCe > 0.05 || succinylcholineCe > 0.05;
    if (hasNMB && tofCount > 0) {
      forecasts.push(`🔮 NMB WEARING OFF: Neuromuscular blockade is wearing off (TOF count is ${tofCount}/4). Anticipate return of spontaneous ventilation effort or sudden patient coughing/bucking against the mechanical ventilator. If surgical abdominal relaxation is required, redose muscle relaxant (rocuronium/vecuronium). If surgery is complete, plan for pharmacological reversal.`);
    }
    if (mac > 1.2 && map < 65) {
      forecasts.push(`🔮 VOLATILE MYOCARDIAL DEPRESSION: High volatile anesthetic concentration (MAC is ${fmt(mac, 2)}) is causing profound, dose-dependent myocardial depression and systemic vasodilation. Anticipate worsening hypotension. Titrate down the vaporizer dial, ensure volume resuscitation, and consider pushing phenylephrine to restore vascular tone.`);
    }
    if (ebl > 800) {
      const bloodRatio = (ebl / ebv * 100).toFixed(1);
      forecasts.push(`🔮 HEMORRHAGIC HYPOVOLEMIA: The patient has lost a significant fraction of blood volume (${bloodRatio}% of EBV). Compensatory vasoconstriction and tachycardia may temporarily mask vascular collapse. Anticipate rapid, refractory hypotension if bleeding continues. Review [labs] for hemoglobin, prepare the massive transfusion protocol (PRBCs/FFP), and maximize IV access.`);
    }
    if (surgicalPhase === 'Incision' && mac < 0.7 && bis > 60) {
      forecasts.push("🔮 LIGHT ANESTHESIA RISK: Surgical noxious stimulation is high, but MAC is low. This will trigger massive sympathetic discharge (refractory tachycardia and hypertension) and risks intraoperative awareness. Proactively deepen anesthesia by increasing Sevoflurane and pushing Propofol/Fentanyl before incision begins.");
    }
  }

  // Position-specific forecasts
  if (pos === 'Sitting' || pos === 'Beach Chair') {
    forecasts.push("🔮 BEACH CHAIR CLINICAL FORESIGHT: Sitting position induces gravity-driven venous pooling in the lower extremities, severely reducing cardiac preload. Furthermore, the brain sits ~30 cm higher than the heart: cerebral MAP is ~29.6 mmHg lower than arm cuff MAP! Keep arm cuff MAP > 85 mmHg to ensure adequate cerebral perfusion pressure (>55 mmHg) and prevent watershed brain ischemia.");
  } else if (pos === 'Trendelenburg' || pos === 'Lithotomy') {
    forecasts.push("🔮 DIAPHRAGMATIC COMPRESSION: Trendelenburg/Lithotomy position shifts abdominal viscera cephalad against the diaphragm, directly reducing functional lung volumes (FRC) and chest wall compliance. Expect elevated Peak Inspiratory Pressures (PIP) and increased risk of barotrauma under positive pressure ventilation. Maintain moderate tidal volumes and check PIP frequently.");
  } else if (pos === 'Prone') {
    forecasts.push("🔮 PRONE VENTILATION CHECK: Patient is in the Prone position. Ensure chest rolls are optimally positioned to allow free abdominal excursion; abdominal compression will crush compliance and spike PIP. Crucially, verify that the endotracheal tube is absolutely secure, as accidental extubation in the prone position is a catastrophic, high-mortality airway emergency.");
  } else if (pos === 'Lateral') {
    forecasts.push("🔮 V/Q MISMATCH FORECAST: Lateral decubitus position alters ventilation-perfusion relationships: gravity directs blood flow to the dependent lung, while ventilation preferentially goes to the non-dependent lung. This V/Q mismatch will cause arterial oxygenation to drift lower. Maintain high FiO2 and check SpO2 frequently.");
  }

  const nearFutureForecast = forecasts.length > 0 
    ? forecasts[Math.floor((time / 10) % forecasts.length)] // Rotate forecasts every 10s
    : "🔮 Telemetry stable. Maintain current anesthetic depth, fluid balance, and mechanical ventilation parameters. Review labs and monitor for surgical blood loss.";

  // 6. COMBINE AND RETURN ACCORDING TO ATTENDING MODE
  let primaryGuidance = null;
  const criticalAlert = activeFilteredAlerts.find(a => a.priority === 'CRITICAL');
  const warningAlert = activeFilteredAlerts.find(a => a.priority === 'WARNING');
  const highestSuggestion = activeFilteredSuggestions.find(s => s.priority === 'SUGGESTION');

  if (attendingMode === 'teaching') {
    // Teaching mode prioritizes the procedural step, but prefixes it with any active critical safety alerts!
    if (criticalAlert) {
      primaryGuidance = {
        priority: 'CRITICAL',
        title: criticalAlert.message.split('!')[0] + '!',
        text: criticalAlert.message,
        suggestion: criticalAlert.action
      };
    } else if (warningAlert) {
      primaryGuidance = {
        priority: 'WARNING',
        title: "⚠️ Attending Clinical Warning: " + warningAlert.id.replace(/_/g, ' ').toUpperCase(),
        text: warningAlert.message,
        suggestion: "Advice: " + warningAlert.action
      };
    } else {
      primaryGuidance = {
        priority: 'TEACHING',
        title: `📚 Attending Guide: ${teachingGuide.step}`,
        text: teachingGuide.message,
        suggestion: teachingGuide.suggestion
      };
    }
  } else if (attendingMode === 'observing') {
    // Observing mode is silent unless a critical physiological event or warning occurs.
    if (criticalAlert) {
      primaryGuidance = {
        priority: 'CRITICAL',
        title: "🚨 Attending Critical Warning!",
        text: criticalAlert.message,
        suggestion: "Advice: " + criticalAlert.action
      };
    } else if (warningAlert) {
      primaryGuidance = {
        priority: 'WARNING',
        title: "⚠️ Attending Clinical Warning",
        text: warningAlert.message,
        suggestion: "Advice: " + warningAlert.action
      };
    } else {
      primaryGuidance = null;
    }
  } else {
    // Silent mode.
    primaryGuidance = null;
  }

  // Always return the complete active physiological evaluation
  const fullAudit = [];
  if (criticalAlert) fullAudit.push(criticalAlert);
  if (warningAlert) fullAudit.push(warningAlert);
  fullAudit.push(...activeFilteredAlerts.filter(a => a.id !== criticalAlert?.id && a.id !== warningAlert?.id));
  fullAudit.push(...activeFilteredSuggestions);
  
  // Add procedural step as the baseline fallback in the audit
  fullAudit.push({
    id: 'procedural_step',
    priority: 'INFO',
    message: teachingGuide?.message || "Procedural status normal. Continue to monitor patient physiology.",
    action: teachingGuide?.suggestion || "Monitor vitals."
  });
  
  return {
    primaryGuidance,
    fullAudit,
    activeAlertsCount: activeFilteredAlerts.length,
    nearFutureForecast
  };
}
