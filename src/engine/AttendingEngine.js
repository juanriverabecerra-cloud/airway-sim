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
  
  // Try to read actual potassium level from patient or state if available
  const isSeptic = patient.isSeptic || false;
  const isAnaphylaxis = patient.anaphylaxisTriggered || false;
  const isAnaphylaxisTreated = patient.anaphylaxisTreated || false;
  const bradycardiaTriggered = patient.bradycardiaTriggered || false;
  const airwaySecured = patient.airwaySecured || false;
  const isApneic = patient.isApneic || false;
  
  const frc_L = patient.lungVolumes?.frc_L || 2.4;
  const o2Buffer = patient.oxygenBuffer !== null ? patient.oxygenBuffer : 0.5;
  const frcO2Percent = frc_L > 0 ? (o2Buffer / frc_L) * 100 : 21;

  // Sedatives and opioids active levels
  const propofolCe = activeMeds.find(m => m.name === 'Propofol')?.Ce || 0;
  const etomidateCe = activeMeds.find(m => m.name === 'Etomidate')?.Ce || 0;
  const ketamineCe = activeMeds.find(m => m.name === 'Ketamine')?.Ce || 0;
  const fentanylCe = activeMeds.find(m => m.name === 'Fentanyl')?.Ce || 0;
  const sedativeActive = propofolCe > 0.05 || etomidateCe > 0.05 || ketamineCe > 0.05;

  // 2. SAFETY RULES / CRITICAL ALERTS (Deterministic clinical safety logic)

  // A. Penicillin Anaphylaxis
  if (isAnaphylaxis && !isAnaphylaxisTreated) {
    alerts.push({
      id: 'anaphylaxis_active',
      priority: 'CRITICAL',
      message: `🚨 LIFE-THREATENING PENICILLIN ANAPHYLAXIS! Profound vasoplegic shock and hyperacute bronchospasm triggered by Ampicillin/Sulbactam administration in a patient with a severe Penicillin allergy. Compliance is critically reduced (${fmt(compliance)} mL/cmH2O) and Resistance is extremely elevated (${fmt(resistance)} cmH2O/L/s). Administer Epinephrine (IV bolus 10-50 mcg) immediately to restore vasomotor tone and reverse bronchospasm!`,
      action: 'Push Epinephrine (IV bolus)'
    });
  }

  // B. Unopposed Muscarinic Activation (Neostigmine Bradycardia)
  if (bradycardiaTriggered) {
    alerts.push({
      id: 'unopposed_muscarinic',
      priority: 'CRITICAL',
      message: `🚨 SEVERE UNOPPOSED MUSCARINIC SURGE! Neostigmine was administered without Glycopyrrolate or Atropine. Profound vagal stimulation is causing progressive bradycardia (HR: ${fmt(hr)} bpm) and copious salivary secretions. This will progress to asystolic cardiac arrest if untreated. Administer Glycopyrrolate (0.2 mg per 1 mg of Neostigmine) or Atropine immediately to block peripheral muscarinic receptors!`,
      action: 'Push Glycopyrrolate'
    });
  }

  // C. Myocardial Stunning / Coronary Ischemia
  if (stunning > 5) {
    alerts.push({
      id: 'coronary_ischemia',
      priority: 'WARNING',
      message: `⚠️ MYOCARDIAL ISCHEMIA & STUNNING (${fmt(stunning, 1)}%)! In patients with significant Coronary Artery Disease, myocardial perfusion is highly diastole-dependent and oxygen supply/demand is critical. A high double-product (HR × SBP > 14,000) or low diastolic blood pressure (< 50 mmHg) has triggered ischemia. Maintain adequate coronary perfusion pressure (target MAP > 65) and lower heart rate with Esmolol or deepen anesthesia.`,
      action: 'Deepen anesthesia / Push Esmolol / Push Phenylephrine'
    });
  }

  // D. Severe Hypoxemia
  if (spo2 < 90 && !isArrest) {
    alerts.push({
      id: 'hypoxemia',
      priority: 'CRITICAL',
      message: `🚨 SEVERE HYPOXEMIA (SpO2: ${fmt(spo2)}%)! The oxygen reserve has depleted. Immediately check ETT placement (EtCO2 wave, chest rise), verify FiO2 delivery, rule out mainstem intubation or circuit disconnect, and consider manual bagging with 100% O2 to salvage oxygenation.`,
      action: 'Confirm tube position / Verify circuit connection / Increase FiO2'
    });
  }

  // E. Severe Hypotension
  if (map < 60 && !isArrest) {
    alerts.push({
      id: 'severe_hypotension',
      priority: 'WARNING',
      message: `⚠️ CLINICALLY SIGNIFICANT HYPOTENSION (MAP: ${fmt(map)} mmHg, SBP: ${fmt(sys)} mmHg)! Cerebral and renal perfusion pressure are severely compromised. Administer a vasopressor (Phenylephrine 50-100 mcg IV for vasoplegia, Ephedrine 5-10 mg if HR is concurrent bradycardic) and evaluate anesthetic depth (MAC is ${fmt(mac, 2)}).`,
      action: 'Push Phenylephrine / Ephedrine / Reduce Vaporizer Dial'
    });
  }

  // F. Light Anesthesia during Incision
  if (surgicalPhase === 'Incision' && mac < 0.7 && bis > 60) {
    alerts.push({
      id: 'light_anesthesia_incision',
      priority: 'WARNING',
      message: `⚠️ INADEQUATE ANESTHETIC DEPTH FOR INCISION! MAC is currently sub-therapeutic (${fmt(mac, 2)}) and BIS is high (${fmt(bis)}). Surgical incision in a light anesthetic plane will trigger severe sympathetic discharge (tachycardia, hypertension), laryngospasm, or intraoperative awareness. Increase vaporizer dial setting (Sevoflurane/Isoflurane) immediately.`,
      action: 'Increase Vaporizer Dial to 1.5 - 2.5%'
    });
  }

  // G. Airway Pressure Alarm
  if (pip > 35) {
    alerts.push({
      id: 'airway_pressure_high',
      priority: 'WARNING',
      message: `⚠️ ELEVATED PEAK INSPIRATORY PRESSURES (PIP: ${fmt(pip)} cmH2O)! High ventilatory pressures risk barotrauma. This indicates high respiratory resistance (${fmt(resistance)} cmH2O/L/s) or poor compliance. Investigate for mainstem intubation, bronchospasm, patient coughing/fighting the vent, or kinked ETT. Consider administering Albuterol or deepening neuromuscular blockade.`,
      action: 'Administer Albuterol / Push Vecuronium / Suction airway'
    });
  }

  // H. Hypercapnia
  if (paco2 > 50) {
    suggestions.push({
      id: 'hypercapnia',
      priority: 'SUGGESTION',
      message: `💡 VENTILATORY ACCUMULATION: PaCO2 is elevated at ${fmt(paco2)} mmHg. Titrate ventilator settings: increase minute ventilation by raising either the respiratory rate (RR) or tidal volume (VT) to wash out carbon dioxide.`,
      action: 'Increase Vent RR or VT'
    });
  }

  // I. Hypocapnia
  if (paco2 < 30) {
    suggestions.push({
      id: 'hypocapnia',
      priority: 'SUGGESTION',
      message: `💡 CEREBRAL VASOCONSTRICTION RISK: PaCO2 is low at ${fmt(paco2)} mmHg. Hypocapnia decreases cerebral blood flow. Consider reducing minute ventilation by decreasing ventilator respiratory rate or tidal volume to allow physiological CO2 re-accumulation.`,
      action: 'Reduce Vent RR or VT'
    });
  }

  // J. High Potassium Hyperkalemia Warning
  if (potassium > 5.5) {
    alerts.push({
      id: 'hyperkalemia_alarm',
      priority: 'CRITICAL',
      message: `🚨 SEVERE HYPERKALEMIA DETECTED! Estimated serum potassium is elevated at ${fmt(potassium, 1)} mEq/L. High potassium risks cardiac membrane instability, widening of the QRS, sine-wave formation, and asystole. Administer Calcium Chloride/Gluconate immediately to stabilize the myocardium, and give intracellular shifting agents (Albuterol, Insulin/Dextrose, Sodium Bicarbonate, or Hyperventilation).`,
      action: 'Push Calcium Chloride / Give Albuterol / Hyperventilate'
    });
  }

  // 3. STEP-BY-STEP TEACHING / TUTORIAL FLOW (Active in Teaching Mode)
  let teachingGuide = null;
  
  if (!msmaidsComplete) {
    teachingGuide = {
      step: 'MSMAIDS Pre-Induction Setup',
      message: "The patient has been transferred to the OR table. Prior to general anesthesia induction, it is mandatory to perform a standardized MSMAIDS checklist. Click the 'MSMAIDS Checklist' button to verify your Machine, Suction, Monitors, Airway gear, IV access, Drugs, and Safety backup. Confirm everything is fully functional.",
      suggestion: "Action: Click the 'MSMAIDS' button in the Action Panel."
    };
  } else if (!sedativeActive && !airwaySecured) {
    // If MSMAIDS complete but pre-oxygenation isn't finished
    if (frcO2Percent < 85) {
      teachingGuide = {
        step: 'Pre-Oxygenation (Nitrogen Washout)',
        message: `Before we induce apnea, we must pre-oxygenate to create an oxygen reservoir in the lungs. Put on the oxygen mask, set FiO2 to 100% and O2 flow to 10-15 L/min. Currently, the FRC oxygen fraction is only ${fmt(frcO2Percent)}%. Watch the exponential nitrogen washout curve. Patients with obesity or restrictive lung disease have small FRC volumes (${fmt(frc_L, 2)} L) and will desaturate within 90 seconds of apnea, while a healthy patient can tolerate up to 8 minutes!`,
        suggestion: "Action: Place Oxygen Mask, set FiO2 to 100%, and O2 flow to 15 L/min."
      };
    } else {
      teachingGuide = {
        step: 'General Anesthesia Induction',
        message: "Excellent! The FRC reservoir is fully denitrogenated (FRC O2 > 85%). The patient is pre-oxygenated and ready for induction. Go to the Pharmacopoeia and administer your sedative bolus: Propofol (1.5 - 2.0 mg/kg IV) is standard, or Etomidate (0.3 mg/kg) if the patient has cardiac comorbidities or hemodynamic instability. Co-administer Fentanyl (1 - 2 mcg/kg IV) to blunt the sympathetic response to laryngoscopy.",
        suggestion: "Action: Administer Propofol (e.g. 150 mg IV) and Fentanyl (e.g. 100 mcg IV)."
      };
    }
  } else if (tofCount === 4 && !airwaySecured) {
    teachingGuide = {
      step: 'Neuromuscular Blockade (Paralysis)',
      message: "The patient is now anesthetized and unresponsive (BIS dropping). Let's administer a neuromuscular blocking agent (NMBA) to paralyze the patient and facilitate easy laryngoscopy. If this is a rapid sequence induction (RSI) due to high aspiration risk (GERD, full stomach, GLP-1 agonists), administer Succinylcholine (1 - 1.5 mg/kg IV) or Rocuronium (0.6 - 1.2 mg/kg IV). WARNING: Check if the patient has upregulated nAChRs (burns/immobility) before choosing Succinylcholine, as it causes massive life-threatening potassium efflux!",
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
  });

  // Filter out any alert that has been clinically addressed by your actions
  const activeFilteredAlerts = alerts.filter(a => !resolvedAlertIds.has(a.id));
  const activeFilteredSuggestions = suggestions.filter(s => {
    if (s.id === 'hypercapnia' && vitals.paco2 <= 45) return false;
    if (s.id === 'hypocapnia' && vitals.paco2 >= 35) return false;
    return true;
  });

  // 5. COMBINE AND RETURN ACCORDING TO ATTENDING MODE
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
      // In observing mode, periodically speak (handled in App.jsx via timer, but we return a generic suggestion if checked)
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
    activeAlertsCount: activeFilteredAlerts.length
};
}
