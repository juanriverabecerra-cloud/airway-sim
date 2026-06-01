/**
 * Attending Consultation Engine — High Fidelity Anesthesia Expert Advisor
 * Evaluates the full physiological, pharmacological, and procedural picture each tick
 * and outputs structured clinical reasoning and next-step actions.
 * 
 * Strict Constraint: All recommendations must use existing functional options
 * from CLINICAL_ACTIONS (rendered as clickable buttons).
 */

function fmt(val, decimals = 0) {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    if (typeof val === 'string' && val.trim() !== '') return val;
    return 'N/A';
  }
  return val.toFixed(decimals);
}

export function evaluateAttendingGuidance(params) {
  const safeParams = params || {};
  const vitals = safeParams.vitals || {};
  const patient = safeParams.patient || {};
  const activeMeds = Array.isArray(safeParams.activeMeds) ? safeParams.activeMeds : [];
  const surgicalPhase = safeParams.surgicalPhase || 'Pre-Op';
  const time = typeof safeParams.time === 'number' && Number.isFinite(safeParams.time) ? safeParams.time : 0;
  const logs = Array.isArray(safeParams.logs) ? safeParams.logs : [];
  const attendingMode = safeParams.attendingMode || 'observing';
  const msmaidsComplete = !!safeParams.msmaidsComplete;
  const ventSettings = safeParams.ventSettings || {};
  const gasSettings = safeParams.gasSettings || {};

  const alerts = [];
  const suggestions = [];

  // 1. EXTRACT TELEMETRY & PHYSIOLOGICAL VARIABLES
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
  const isApneic = patient.isApneic || false;

  const frc_L = patient.lungVolumes && typeof patient.lungVolumes.frc_L === 'number' && Number.isFinite(patient.lungVolumes.frc_L) && patient.lungVolumes.frc_L > 0 
    ? patient.lungVolumes.frc_L 
    : 2.4;
  const o2Buffer = patient.oxygenBuffer !== null && patient.oxygenBuffer !== undefined && Number.isFinite(patient.oxygenBuffer) ? patient.oxygenBuffer : 0.5;
  const frcO2Percent = frc_L > 0 ? Math.min(100, Math.max(0, (o2Buffer / frc_L) * 100)) : 21;

  // Active drugs concentration levels
  const propofolCe = activeMeds.find(m => m.name === 'Propofol')?.Ce || 0;
  const etomidateCe = activeMeds.find(m => m.name === 'Etomidate')?.Ce || 0;
  const ketamineCe = activeMeds.find(m => m.name === 'Ketamine')?.Ce || 0;
  const fentanylCe = activeMeds.find(m => m.name === 'Fentanyl')?.Ce || 0;
  const rocuroniumCe = activeMeds.find(m => m.name === 'Rocuronium')?.Ce || 0;
  const succinylcholineCe = activeMeds.find(m => m.name === 'Succinylcholine')?.Ce || 0;
  const vecuroniumCe = activeMeds.find(m => m.name === 'Vecuronium')?.Ce || 0;
  const sedativeActive = propofolCe > 0.05 || etomidateCe > 0.05 || ketamineCe > 0.05;

  const pos = patient.position || 'Supine';

  // Helper values to parse logs
  const lowercaseLogs = logs.map(l => typeof l === 'string' ? l.toLowerCase() : '');
  const logHas = (kw) => lowercaseLogs.some(log => log.includes(kw.toLowerCase()));
  const logHasAny = (kws) => kws.some(kw => lowercaseLogs.some(log => log.includes(kw.toLowerCase())));

  // Check placed access lines
  const placedLines = Array.isArray(patient.accessLines) ? patient.accessLines : [];
  const hasPIV = placedLines.some(l => l && typeof l.category === 'string' && (l.category.includes('Peripheral') || (typeof l.name === 'string' && l.name.includes('PIV'))));
  const hasCVC = placedLines.some(l => l && typeof l.category === 'string' && (l.category.includes('Central') || (typeof l.name === 'string' && l.name.includes('CVC'))));
  const hasArt = placedLines.some(l => l && typeof l.category === 'string' && (l.category.includes('Arterial') || (typeof l.name === 'string' && l.name.includes('Arterial')) || patient.hasALine));

  // Determine Case Profiles
  const isObeseCase = patient.isObese || patient.bmi > 35;
  const isSepticCase = patient.isSeptic || isSeptic;
  const isTraumaCase = patient.trauma;
  const isCardiacCase = patient.cad || patient.as || patient.chf || (patient.pmhx && patient.pmhx.includes('CAD'));

  // 2. DYNAMIC CLINICAL ALERTS & STATE RECALIBRATIONS (Expert Rules Engine)

  // A. Sepsis Profile & Recalibration on Propofol-Induced Collapse
  if (isSepticCase) {
    if (!airwaySecured && !isArrest) {
      if (propofolCe > 0.1 && (map < 60 || sys < 90)) {
        alerts.push({
          id: 'septic_propofol_collapse',
          priority: 'CRITICAL',
          message: `🚨 SEVERE POST-PROPOFOL CARDIOVASCULAR COLLAPSE! Propofol was administered in a profoundly vasodilated septic shock state. Propofol causes significant venodilation (pre-depleting preload) and direct myocardial depression, which has destroyed this patient's compensatory sympathetic drive. Cardiac output has failed. Administer a vasopressor [epinephrine] or [phenylephrine] immediately to restore vascular tone, open fluids, and order [order abg]!`,
          action: 'epinephrine'
        });
      } else if (!hasArt) {
        suggestions.push({
          id: 'septic_art_line_suggest',
          priority: 'SUGGESTION',
          message: `💡 SEPTIC INDUCTION RISK: This patient is in septic shock. General anesthesia induction will trigger severe vasoplegia. It is highly recommended to place an [arterial line] first to establish beat-to-beat real-time blood pressure monitoring.`,
          action: 'place arterial line'
        });
      }
    }
  }

  // B. Morbid Obesity & Recalibration on Rapid Apneic Desaturation
  if (isObeseCase) {
    if (!airwaySecured && !isArrest) {
      if (sedativeActive && frcO2Percent < 65 && spo2 < 92) {
        alerts.push({
          id: 'obesity_desat_cliff',
          priority: 'CRITICAL',
          message: `🚨 CRITICAL APNEIC DESATURATION CLIFF! Due to obesity-related FRC diaphragmatic compression, the oxygen reservoir has collapsed. The patient is rapidly desaturating (SpO2: ${fmt(spo2)}%) because they were induced without adequate pre-oxygenation or [ramped] positioning. Immediately perform manual [bag-mask ventilation] with 100% O2 to salvage, or insert a rescue [lma] to secure ventilation!`,
          action: 'suction'
        });
      } else if (pos === 'Supine' || pos === 'Trendelenburg') {
        suggestions.push({
          id: 'obesity_position_suggest',
          priority: 'SUGGESTION',
          message: `💡 MORBID OBESITY DIAPHRAGMATIC COMPRESSION: The patient is in the ${pos} position. Gravity-dependent visceral weight is compressing the diaphragm, crushing FRC lung volume. Place the patient in the [ramped] position immediately to extend safe apnea time.`,
          action: 'ramped'
        });
      }
    }
  }

  // C. Trauma & Esophageal Intubation Recalibration
  if (isTraumaCase) {
    if (!airwaySecured && !isArrest) {
      if (patient.tubePosition === 'esophagus') {
        alerts.push({
          id: 'esophageal_intubation',
          priority: 'CRITICAL',
          message: `🚨 CRITICAL ESOPHAGEAL INTUBATION! The endotracheal tube has been placed in the esophagus due to a blood-obscured view (absent EtCO2, dim breath sounds, epigastrium gurgling). Immediately remove the tube (defibrate/extubate), clear secretions with rigid Yankauer [suction], and re-attempt [laryngoscopy] using a Video Laryngoscope!`,
          action: 'suction'
        });
      } else if (patient.airwayBlood && !patient.isSuctioned) {
        alerts.push({
          id: 'trauma_obscured_airway',
          priority: 'WARNING',
          message: `⚠️ OBSCURED BLOODY AIRWAY! Active oropharyngeal bleeding is present. Attempting intubation in this state will cause blind esophageal placement and fatal aspiration. You must perform rigid Yankauer [suction] immediately to clear the field.`,
          action: 'suction'
        });
      }
    }
  }

  // D. Cardiac/CAD/AS & Recalibration on Myocardial Stunning/Ischemia
  if (isCardiacCase) {
    if (stunning > 5 && !isArrest) {
      alerts.push({
        id: 'coronary_ischemia',
        priority: 'CRITICAL',
        message: `🚨 SEVERE MYOCARDIAL ISCHEMIA & CORONARY UNDERPERFUSION (Stunning: ${fmt(stunning, 1)}%)! In severe Aortic Stenosis and CAD, coronary perfusion occurs during diastole and is dependent on diastolic SVR. Severe tachycardia or vasoplegia has triggered ischemia. Maintain high coronary perfusion pressure (target MAP > 65) with [phenylephrine] (pure alpha-1 vasopressor) and control heart rate with [esmolol] to control oxygen demand.`,
        action: 'phenylephrine'
      });
    } else if (!isArrest && !hasArt) {
      suggestions.push({
        id: 'cardiac_art_suggest',
        priority: 'SUGGESTION',
        message: `💡 AORTIC STENOSIS CORONARY PERFUSION: A sudden drop in SVR is catastrophic in fixed stroke volume Aortic Stenosis. You must place an [arterial line] prior to induction for beat-to-beat monitoring to prevent silent vascular collapse.`,
        action: 'place arterial line'
      });
    }
  }

  // E. Life-Threatening Penicillin Anaphylaxis
  if (isAnaphylaxis && !isAnaphylaxisTreated) {
    alerts.push({
      id: 'anaphylaxis_active',
      priority: 'CRITICAL',
      message: `🚨 LIFE-THREATENING PENICILLIN ANAPHYLAXIS! Complete vascular collapse (SVR crash, MAP: ${fmt(map)} mmHg) and severe bronchospasm (compliance: ${fmt(compliance)}) triggered by Unasyn administration in a patient with a severe Penicillin allergy. Administer [epinephrine] immediately! Epinephrine's alpha-1 agonist activity restores vasomotor tone, while beta-2 activity stabilizes mast cells and provides powerful bronchedilation. Also administer [albuterol] via ETT.`,
      action: 'epinephrine'
    });
  }

  // F. Unopposed Muscarinic Activation (Neostigmine Bradycardia)
  if (bradycardiaTriggered && hr < 40) {
    alerts.push({
      id: 'unopposed_muscarinic',
      priority: 'CRITICAL',
      message: `🚨 SEVERE UNOPPOSED MUSCARINIC SURGE! Neostigmine was administered without co-administration of an anticholinergic. This has caused massive acetylcholine accumulation at peripheral muscarinic receptors. Vagal stimulation has triggered profound bradycardia (HR: ${fmt(hr)} bpm) and salivary secretions. Administer [glycopyrrolate] or [atropine] immediately to block muscarinic receptors!`,
      action: 'glycopyrrolate'
    });
  }

  // G. Severe Hyperkalemia
  if (potassium > 5.5) {
    alerts.push({
      id: 'hyperkalemia_alarm',
      priority: 'CRITICAL',
      message: `🚨 LIFE-THREATENING HYPERKALEMIA DETECTED (Estimated K+: ${fmt(potassium, 1)} mEq/L)! Severe electrical membrane instability. Succinylcholine administration in an upregulated receptor state has triggered massive potassium leak. Administer [calcium chloride] immediately to stabilize the cardiac membrane and hyperventilate to shift potassium intracellularly!`,
      action: 'calcium'
    });
  }

  // H. Severe Hypoxemia
  if (spo2 < 90 && !isArrest && !isObeseCase && !alerts.some(a => a.id === 'anaphylaxis_active')) {
    alerts.push({
      id: 'hypoxemia',
      priority: 'CRITICAL',
      message: `🚨 CRITICAL ARTERIAL HYPOXEMIA (SpO2: ${fmt(spo2)}%)! Alveolar oxygen reserves are depleted. Systematically audit: check for chest rise, verify oxygen flow (FiO2 100% on gas panel), verify capnography waveform (confirm tube is in trachea), and immediately perform manual [bag-mask ventilation] with 100% O2 to salvage.`,
      action: 'pre-op checklists'
    });
  }

  // I. Severe Hypotension
  if (map < 60 && !isArrest && !isSepticCase && !isCardiacCase && !isAnaphylaxis) {
    alerts.push({
      id: 'severe_hypotension',
      priority: 'WARNING',
      message: `⚠️ CLINICALLY SIGNIFICANT HYPOTENSION (MAP: ${fmt(map)} mmHg)! Volatile dose-dependent myocardial depression or post-induction vasoplegia. Administer a vasopressor immediately: push [phenylephrine] (100 mcg) or [ephedrine] (5-10 mg) if heart rate is slow. Decrease vaporizer dial settings to reduce gas-induced vasodilation.`,
      action: 'phenylephrine'
    });
  }

  // J. High Airway Pressures
  if (pip > 35) {
    alerts.push({
      id: 'airway_pressure_high',
      priority: 'WARNING',
      message: `⚠️ ELEVATED PEAK INSPIRATORY PRESSURES (PIP: ${fmt(pip)} cmH2O)! High ventilatory pressures expose the lungs to barotrauma. Check for bronchospasm (administer [albuterol] via ETT), or patient coughing/bucking the ventilator (deepen paralysis with [rocuronium] or [vecuronium], or deepen anesthesia). Secretions require oral [suction].`,
      action: 'albuterol'
    });
  }

  // K. Positional Hemodynamic & Compliance Warnings
  if (pos === 'Sitting' || pos === 'Beach Chair') {
    if (map < 80 && !isArrest) {
      alerts.push({
        id: 'beach_chair_ischemia',
        priority: 'CRITICAL',
        message: `🚨 CEREBRAL PERFUSION RISK IN SITTING POSITION! The patient is in the Beach Chair position. Brain lies roughly 30 cm higher than the heart: actual cerebral MAP is ~29.6 mmHg LOWER than arm measured MAP! Cuff MAP is ${fmt(map)} mmHg, meaning cerebral perfusion pressure is only ~${fmt(map - 29.6)} mmHg. This is below the autoregulation threshold. Administer [phenylephrine] immediately to keep cuff MAP > 85 mmHg!`,
        action: 'phenylephrine'
      });
    }
  }

  // L. Audit suggestions for Hypercapnia / Hypocapnia
  if (paco2 > 48) {
    suggestions.push({
      id: 'hypercapnia',
      priority: 'SUGGESTION',
      message: `💡 VENTILATORY CO2 RETENTION: PaCO2 is elevated at ${fmt(paco2)} mmHg. Acidosis depresses myocardial function. Increase ventilator minute ventilation (RR or VT) to accelerate carbon dioxide washout.`,
      action: 'pre-op checklists'
    });
  } else if (paco2 < 32 && paco2 > 0) {
    suggestions.push({
      id: 'hypocapnia',
      priority: 'SUGGESTION',
      message: `💡 CEREBRAL VASOCONSTRICTION RISK: PaCO2 is low at ${fmt(paco2)} mmHg. Hypocapnia triggers respiratory alkalosis, which causes profound cerebral vascular constriction. Reduce ventilator minute ventilation to allow physiological CO2 re-accumulation.`,
      action: 'pre-op checklists'
    });
  }

  // 3. STEP-BY-STEP TEACHING / TUTORIAL FLOW (Active in Teaching Mode)
  let teachingGuide = null;

  if (!msmaidsComplete) {
    teachingGuide = {
      step: 'MSMAIDS Pre-Induction Setup',
      message: "The patient is on the OR table. Prior to general anesthesia induction, it is mandatory to perform a standardized MSMAIDS checklist. Click the 'MSMAIDS' button in the Action Panel to verify your Machine, Suction, Monitors, Airway gear, IV access, Drugs, and Safety backup. Confirm everything is fully functional.",
      suggestion: "Action: Run the [msmaids checklist] checklist."
    };
  } else if (patient.airwayBlood && !airwaySecured && !patient.isSuctioned) {
    teachingGuide = {
      step: 'Clear Airway Secretions (Suction)',
      message: "The patient has active blood or secretions obscuring the oropharynx. Performing laryngoscopy or positive pressure ventilation in a soiled airway is extremely hazardous: it completely obscures your view of the vocal cords and forces acidic fluids/blood directly into the trachea, triggering catastrophic aspiration pneumonitis and severe bronchospasm. Perform rigid Yankauer suction immediately to establish a clean field.",
      suggestion: "Action: Click [suction] to clear secretions."
    };
  } else if (!sedativeActive && !airwaySecured) {
    if (frcO2Percent < 85) {
      let obeseContext = "";
      if (isObeseCase) {
        obeseContext = ` Notice that this patient is severely obese (BMI: ${fmt(patient.bmi, 1)}). Obese patients have significantly reduced baseline FRC. In the Supine position, abdominal contents compress the lungs. To prevent a catastrophic rapid desaturation cliff, ensure the patient is in the [ramped] position to optimize lung volumes and extend safe apnea time.`;
      }
      teachingGuide = {
        step: 'Pre-Oxygenation (Nitrogen Washout)',
        message: `Before we induce apnea, we must pre-oxygenate to create an oxygen reservoir in the lungs. Put on the oxygen mask, set FiO2 to 100% and O2 flow to 10-15 L/min. Currently, the FRC oxygen fraction is only ${fmt(frcO2Percent)}%. Watch the nitrogen washout curve. Patients with obesity or restrictive lung disease have small FRC volumes (${fmt(frc_L, 2)} L) and will desaturate within 90 seconds of apnea, while a healthy patient can tolerate up to 8 minutes!${obeseContext}`,
        suggestion: "Action: Place Oxygen Mask, set FiO2 to 100%, and O2 flow to 15 L/min."
      };
    } else {
      let cardiacContext = "";
      let sepsisContext = "";
      if (isCardiacCase) {
        cardiacContext = " WARNING: This patient has severe CAD/AS. Propofol causes significant vasodilation and myocardial depression which can trigger profound coronary perfusion failure. Avoid Propofol and Ketamine. Recommend administering [etomidate] (0.2-0.3 mg/kg) as it is hemodynamically stable, and co-administer high-dose [fentanyl] (2-3 mcg/kg) to blunt the tachycardia response to laryngoscopy.";
      } else if (isSepticCase) {
        sepsisContext = " WARNING: This patient is in septic shock. General anesthesia induction causes profound vasoplegia. Recommends venous access, fluid loading, and induction with [etomidate] (0.3 mg/kg) or [ketamine] (1.0 mg/kg). Avoid [propofol] to prevent SVR collapse.";
      }
      teachingGuide = {
        step: 'General Anesthesia Induction',
        message: `Excellent! The FRC reservoir is fully denitrogenated (FRC O2 > 85%). The patient is pre-oxygenated and ready for induction. Go to the Pharmacopoeia and administer your sedative bolus: [propofol] (1.5 - 2.0 mg/kg IV) is standard for healthy patients. Co-administer [fentanyl] (1 - 2 mcg/kg IV) to blunt the sympathetic response to laryngoscopy.${cardiacContext}${sepsisContext}`,
        suggestion: "Action: Administer [propofol] (or [etomidate] if hemodynamically unstable) and [fentanyl]."
      };
    }
  } else if (tofCount === 4 && !airwaySecured) {
    let rsiContext = "";
    let mgContext = "";
    if (patient.stomach === 'full' || isTraumaCase) {
      rsiContext = " WARNING: The patient has a full stomach / is a trauma case. This is a high-risk Rapid Sequence Induction (RSI). To prevent passive regurgitation, avoid positive pressure ventilation (BMV) prior to intubation. Administer a rapid paralytic immediately: [succinylcholine] (1.5 mg/kg) or high-dose [rocuronium] (1.2 mg/kg). Ensure there are no contraindications (like burns or immobility causing nAChR upregulation) to avoid life-threatening hyperkalemia!";
    }
    if (patient.mg) {
      mgContext = " WARNING: This patient has Myasthenia Gravis. Upregulated antibodies reduce functional nAChRs. Patients are extremely sensitive to non-depolarizing agents (like [rocuronium] or [vecuronium]) and resistant to [succinylcholine]. Doses of Rocuronium should be reduced by 50-70% (e.g. 10-15 mg) to avoid prolonged paralysis.";
    }
    teachingGuide = {
      step: 'Neuromuscular Blockade (Paralysis)',
      message: `The patient is now anesthetized and unresponsive (BIS dropping). Let's administer a neuromuscular blocking agent (NMBA) to paralyze the patient and facilitate easy laryngoscopy. Muscle relaxants completely relax the vocal cords, ensuring optimal Cormack-Lehane exposure and preventing laryngospasm during tube placement.${rsiContext}${mgContext}`,
      suggestion: "Action: Administer [rocuronium] or [succinylcholine] (or low-dose [vecuronium])."
    };
  } else if (!airwaySecured) {
    let bladeChoice = "Macintosh 3 or 4 blade";
    if (isObeseCase || isTraumaCase || patient.neckMobility === 'reduced') {
      bladeChoice = "Video Laryngoscope (hyperangulated blade) due to predicted difficult airway (restricted neck extension or thick tissues)";
    }
    teachingGuide = {
      step: 'Laryngoscopy & Intubation',
      message: `The patient is fully paralyzed and apneic (TOF count is ${tofCount}/4). This is the optimal time to secure the airway. Click 'Perform Laryngoscopy' in the Airway Panel. Choose an appropriate blade: ${bladeChoice}. Visualize the vocal cords (Cormack-Lehane Grade) and carefully place the Endotracheal Tube (ETT).`,
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
      nmbHint = " WARNING: Neuromuscular blockade is still active. Extubating a paralyzed patient will trigger immediate complete respiratory failure. You must administer [sugammadex] (2-4 mg/kg IV) or [neostigmine] co-administered with [glycopyrrolate] to reverse neuromuscular block and achieve a TOF 4/4 count before pulling the tube!";
    }
    teachingGuide = {
      step: 'Extubation & Emergence Setup',
      message: `The surgery is complete, and we are ready to emerge the patient. Safe extubation requires strict criteria:
1. **Neuromuscular Recovery**: Confirm TOF is 4/4 with no fade. Reverse if necessary.${nmbHint}
2. **Anesthetic Washout**: Turn off the Sevoflurane dial (dial to 0%) and wait for MAC < 0.2 and BIS > 80, confirming patient is conscious and can protect their airway.
3. **Spontaneous Ventilation**: Titrate ventilator RR to 0 or place on pressure support so the patient is breathing spontaneously.
Once met, suction oral secretions, perform [cuff leak test], deflate the cuff, and click 'Deflate & Extubate' in the Airway Panel.`,
      suggestion: "Action: Set Sevoflurane dial to 0%, check TOF twitch, run [cuff leak test], and prepare to extubate once NMB is reversed and patient is awake and breathing."
    };
  } else {
    let positionWarning = "";
    if (pos === 'Sitting' || pos === 'Beach Chair') {
      positionWarning = " Notice that the patient is in the sitting position, pooling blood in the lower extremities. Arm cuff MAP must be kept > 85 mmHg to ensure adequate cerebral perfusion pressure (>55 mmHg) because the brain lies ~30 cm higher than the heart.";
    } else if (pos === 'Trendelenburg') {
      positionWarning = " Patient is in Trendelenburg position. Gravity is compressing diaphragmatic volumes and spiking Peak Inspiratory Pressures. Check compliance and ensure deep paralysis.";
    }
    teachingGuide = {
      step: 'Maintenance Phase Monitoring',
      message: `We are in the maintenance phase of anesthesia. Maintain a steady state: titrate vaporizer dial to keep MAC between 0.8 and 1.0 (BIS 40-60), adjust ventilator RR and VT to maintain arterial PaCO2 at 35-45 mmHg, monitor blood loss, and replace fluids to maintain hemodynamic stability. If surgical neuromuscular blockade is requested, administer intermittent [vecuronium] or [rocuronium].${positionWarning}`,
      suggestion: "Action: Monitor vitals, maintain MAC at 0.8-1.0, and keep PaCO2 at 40 mmHg."
    };
  }

  // 4. SMART ALERTS REMEDIATION FILTERING INTERLOCK (Dynamic Resolution check)
  const resolvedAlertIds = new Set();
  alerts.forEach(alert => {
    if (alert.id === 'anaphylaxis_active' && patient.anaphylaxisTreated) {
      resolvedAlertIds.add(alert.id);
    }
    if (alert.id === 'unopposed_muscarinic' && !patient.bradycardiaTriggered) {
      resolvedAlertIds.add(alert.id);
    }
    if (alert.id === 'septic_propofol_collapse' && map >= 65) {
      resolvedAlertIds.add(alert.id);
    }
    if (alert.id === 'obesity_desat_cliff' && spo2 >= 92) {
      resolvedAlertIds.add(alert.id);
    }
    if (alert.id === 'esophageal_intubation' && patient.tubePosition === 'trachea') {
      resolvedAlertIds.add(alert.id);
    }
    if (alert.id === 'trauma_obscured_airway' && (!patient.airwayBlood || patient.isSuctioned)) {
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
    if (alert.id === 'airway_pressure_high' && (vitals.pip <= 30 || logHasAny(['albuterol', 'vecuronium', 'suction']))) {
      resolvedAlertIds.add(alert.id);
    }
    if (alert.id === 'hyperkalemia_alarm' && logHasAny(['calcium', 'albuterol', 'insulin', 'bicarbonate', 'hyperventilate'])) {
      resolvedAlertIds.add(alert.id);
    }
    if (alert.id === 'beach_chair_ischemia' && vitals.map >= 80) {
      resolvedAlertIds.add(alert.id);
    }
  });

  const activeFilteredAlerts = alerts.filter(a => !resolvedAlertIds.has(a.id));
  const activeFilteredSuggestions = suggestions.filter(s => {
    if (s.id === 'hypercapnia' && vitals.paco2 <= 45) return false;
    if (s.id === 'hypocapnia' && vitals.paco2 >= 35) return false;
    if (s.id === 'septic_art_line_suggest' && (hasArt || isArrest)) return false;
    if (s.id === 'cardiac_art_suggest' && (hasArt || isArrest)) return false;
    if (s.id === 'obesity_position_suggest' && (pos === 'Ramped' || pos === 'Sniffing')) return false;
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
    } else if (isObeseCase) {
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
      forecasts.push(`🔮 VOLATILE MYOCARDIAL DEPRESSION: High volatile anesthetic concentration (MAC is ${fmt(mac, 2)}) is causing profound, dose-dependent myocardial depression and systemic vasodilation. Anticipate worsening hypotension. Titrate down the vaporizer dial, ensure volume resuscitation, and consider pushing [phenylephrine] to restore vascular tone.`);
    }
    if (ebl > 800) {
      const bloodRatio = ebv > 0 ? (ebl / ebv * 100).toFixed(1) : '0';
      forecasts.push(`🔮 HEMORRHAGIC HYPOVOLEMIA: The patient has lost a significant fraction of blood volume (${bloodRatio}% of EBV). Compensatory vasoconstriction and tachycardia may temporarily mask vascular collapse. Anticipate rapid, refractory hypotension if bleeding continues. Order [order cbc] to evaluate hemoglobin, prepare the massive transfusion protocol, and maximize IV access.`);
    }
    if (surgicalPhase === 'Incision' && mac < 0.7 && bis > 60) {
      forecasts.push("🔮 LIGHT ANESTHESIA RISK: Surgical noxious stimulation is high, but MAC is low. This will trigger massive sympathetic discharge (refractory tachycardia and hypertension) and risks intraoperative awareness. Proactively deepen anesthesia by increasing Sevoflurane and pushing [propofol] or [fentanyl] before incision begins.");
    }
  }

  // Position-specific forecasts
  if (pos === 'Sitting' || pos === 'Beach Chair') {
    forecasts.push("🔮 BEACH CHAIR CLINICAL FORESIGHT: Sitting position induces gravity-driven venous pooling in the lower extremities, severely reducing cardiac preload. Furthermore, the brain sits ~30 cm higher than the heart: cerebral MAP is ~29.6 mmHg lower than arm cuff MAP! Keep arm cuff MAP > 85 mmHg to ensure adequate cerebral perfusion pressure (>55 mmHg) and prevent watershed brain ischemia.");
  } else if (pos === 'Trendelenburg' || pos === 'Lithotomy') {
    forecasts.push("🔮 DIAPHRAGMATIC COMPRESSION: Trendelenburg/Lithotomy position shifts abdominal viscera cephalad against the diaphragm, directly reducing functional lung volumes (FRC) and chest wall compliance. Expect elevated Peak Inspiratory Pressures (PIP) and increased risk of barotrauma under positive pressure ventilation. Maintain moderate tidal volumes and check PIP frequently.");
  } else if (pos === 'Prone') {
    forecasts.push("🔮 PRONE VENTILATION CHECK: Patient is in the Prone position. Ensure chest rolls are optimally positioned to allow free abdominal excursion; abdominal compression will crush compliance and spike PIP. Crucially, verify that the endotracheal tube is absolutely secure, as accidental extubation in the prone position is a catastrophic, high-mortality airway emergency.");
  }

  const nearFutureForecast = forecasts.length > 0 
    ? forecasts[Math.floor((time / 10) % forecasts.length)]
    : "🔮 Telemetry stable. Maintain current anesthetic depth, fluid balance, and mechanical ventilation parameters. Review labs and monitor for surgical blood loss.";

  // 6. COMBINE AND RETURN ACCORDING TO ATTENDING MODE
  let primaryGuidance = null;
  const criticalAlert = activeFilteredAlerts.find(a => a.priority === 'CRITICAL');
  const warningAlert = activeFilteredAlerts.find(a => a.priority === 'WARNING');
  const highestSuggestion = activeFilteredSuggestions.find(s => s.priority === 'SUGGESTION');

  if (attendingMode === 'teaching') {
    if (criticalAlert) {
      primaryGuidance = {
        priority: 'CRITICAL',
        title: criticalAlert.message.split('!')[0] + '!',
        text: criticalAlert.message,
        suggestion: `Rescue Action: [${criticalAlert.action}]`
      };
    } else if (warningAlert) {
      primaryGuidance = {
        priority: 'WARNING',
        title: "⚠️ Attending Clinical Warning: " + warningAlert.id.replace(/_/g, ' ').toUpperCase(),
        text: warningAlert.message,
        suggestion: `Advice Action: [${warningAlert.action}]`
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
    if (criticalAlert) {
      primaryGuidance = {
        priority: 'CRITICAL',
        title: "🚨 Attending Critical Warning!",
        text: criticalAlert.message,
        suggestion: `Rescue Action: [${criticalAlert.action}]`
      };
    } else if (warningAlert) {
      primaryGuidance = {
        priority: 'WARNING',
        title: "⚠️ Attending Clinical Warning",
        text: warningAlert.message,
        suggestion: `Advice Action: [${warningAlert.action}]`
      };
    } else {
      primaryGuidance = null;
    }
  } else {
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
