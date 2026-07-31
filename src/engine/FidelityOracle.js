/**
 * High-Fidelity Clinical Fidelity Oracle
 * Independently audits the simulator state and historical timeline
 * to output structured clinical anomalies, physiological discrepancies,
 * and time-delayed PK/PD compliance reports.
 */

function fmt(val, decimals = 1) {
  if (val === undefined || val === null || typeof val !== 'number' || !Number.isFinite(val)) return 'N/A';
  return val.toFixed(decimals);
}

/**
 * Evaluates the simulator's physiological, pharmacological, and mechanical state.
 * Supports differential checks and time-delayed expectations across a historical window.
 * 
 * @param {Object} state Current simulator state slice
 * @param {Array} history Array of historical step records (telemetry snapshots)
 */
export function evaluateFidelity(state, history = []) {
  const anomalies = [];
  const systemStatus = {
    hemodynamics: 'PASSED',
    ventilation: 'PASSED',
    pharmacology: 'PASSED',
    electrolytes: 'PASSED',
    lines: 'PASSED',
    positioning: 'PASSED',
    neurology: 'PASSED'
  };

  if (!state) return { anomalies, systemStatus };

  // Enforce array safety on history
  const safeHistory = Array.isArray(history) ? history : [];

  // 1. EXTRACT TELEMETRY VARIABLES
  const vitals = state.vitals || {};
  const patient = state.patient || {};
  const activeMeds = state.activeMeds || [];
  const electrolytes = state.electrolytes || {};
  const ventSettings = state.ventSettings || {};

  // --- DYNAMIC TELEMETRY CORRUPTION & FINITENESS LOOP ---
  const nonFiniteVitals = [];
  const vitalKeys = ['hr', 'sys', 'dia', 'map', 'co', 'svr', 'spo2', 'pao2', 'paco2', 'etco2', 'temp', 'bis', 'tofCount', 'pip', 'compl', 'res', 'lacticAcid', 'mac'];
  for (const key of vitalKeys) {
    const val = vitals[key];
    if (val !== undefined && (typeof val !== 'number' || !Number.isFinite(val))) {
      nonFiniteVitals.push(key);
    }
  }
  if (nonFiniteVitals.length > 0) {
    systemStatus.hemodynamics = 'FAILED';
    anomalies.push({
      system: 'Telemetry',
      severity: 'CRITICAL',
      rule: 'Telemetry Value Finiteness',
      message: `Telemetry contains non-finite vital parameters: ${nonFiniteVitals.join(', ')}.`,
      rationale: 'Telemetry variables must always be finite, real numbers. NaN or Infinite values indicate a severe mathematical overflow/underflow or unhandled division by zero in the physical integrator loops.',
      resolution: 'Check physical integration in usePhysiology.js.'
    });
  }

  const hr = Number.isFinite(vitals.hr) ? vitals.hr : 0;
  const sys = Number.isFinite(vitals.sys) ? vitals.sys : 0;
  const dia = Number.isFinite(vitals.dia) ? vitals.dia : 0;
  const map = Number.isFinite(vitals.map) ? vitals.map : 0;
  const co = Number.isFinite(vitals.co) ? vitals.co : 5.0;
  const svr = Number.isFinite(vitals.svr) ? vitals.svr : 1200;
  const spo2 = Number.isFinite(vitals.spo2) ? vitals.spo2 : 100;
  const pao2 = Number.isFinite(vitals.pao2) ? vitals.pao2 : 100;
  const paco2 = Number.isFinite(vitals.paco2) ? vitals.paco2 : 40;
  const etco2 = Number.isFinite(vitals.etco2) ? vitals.etco2 : 40;
  const temp = Number.isFinite(vitals.temp) ? vitals.temp : 37.0;
  const bis = Number.isFinite(vitals.bis) ? vitals.bis : 99;
  const tofCount = Number.isFinite(vitals.tofCount) ? vitals.tofCount : 4;
  const pip = Number.isFinite(vitals.pip) ? vitals.pip : 0;
  const compliance = Number.isFinite(vitals.compl) ? vitals.compl : 60;
  const cvp = Number.isFinite(vitals.cvp) ? vitals.cvp : (Number.isFinite(patient.cvp) ? patient.cvp : 0);

  const lacticAcid = Number.isFinite(vitals.lacticAcid) ? vitals.lacticAcid : (Number.isFinite(patient.lacticAcid) ? patient.lacticAcid : 1.0);
  const rr = Number.isFinite(vitals.rr) ? vitals.rr : (Number.isFinite(patient.rr) ? patient.rr : 12);

  const isArrest = patient.isArrest || false;
  const cprActive = patient.cprActive || false;
  const stunning = Number.isFinite(patient.myocardialStunning) ? patient.myocardialStunning : 0;
  const ebl = Number.isFinite(patient.ebl) ? patient.ebl : 0;

  const position = patient.position || 'Supine';
  const airwaySecured = patient.airwaySecured || false;
  const tubePosition = patient.tubePosition || null;
  const isApneic = patient.isApneic || false;

  const potassium = Number.isFinite(electrolytes.k) ? electrolytes.k : 4.0;
  const calcium = Number.isFinite(electrolytes.ca) ? electrolytes.ca : 9.0;
  const ph = Number.isFinite(electrolytes.ph) ? electrolytes.ph : 7.4;

  // Case-Insensitive CE Drug Finder Helper
  const findCe = (drugName) => {
    if (!Array.isArray(activeMeds)) return 0;
    const found = activeMeds.find(m => m && (m.name || m.drug || '').toLowerCase() === drugName.toLowerCase());
    return found && Number.isFinite(found.Ce) ? found.Ce : 0;
  };

  const propofolCe = findCe('Propofol');
  const fentanylCe = findCe('Fentanyl');
  const rocuroniumCe = findCe('Rocuronium');
  const succinylcholineCe = findCe('Succinylcholine');
  const remifentanilCe = findCe('Remifentanil');

  const mac = Number.isFinite(vitals.mac) ? vitals.mac : (Number.isFinite(patient.mac) ? patient.mac : 0);

  const apneaDuration = (Number.isFinite(state.time) && Number.isFinite(patient.apneaStartTime)) ? (state.time - patient.apneaStartTime) : 0;
  const bradycardiaTriggered = patient.bradycardiaTriggered || false;

  const deliveredFiO2 = Number.isFinite(state.ventSettings?.fio2) ? state.ventSettings.fio2 : (Number.isFinite(patient.currentFiO2) ? patient.currentFiO2 : 21);

  // ==========================================
  // 2. PHYSIOLOGICAL INVARIANT ASSERTIONS (Strict Medical Boundaries)
  // ==========================================

  // --- A. HEMODYNAMIC FIDELITY AUDIT ---
  
  // A1. SVR-MAP-CO Hemodynamic Closed Loop consistency
  // Standard systemic cardiovascular physics: MAP - CVP = CO * SVR / 80, i.e. MAP = CO*SVR/80 + CVP.
  // (The CVP term is the definition of SVR and was previously omitted here — a false-positive source
  // caught by the Layer 1C oracle-vs-live-physics harness: the physics correctly includes CVP.)
  const calculatedPhysMAP = (co * svr) / 80 + cvp;
  const ohmError = Math.abs(map - calculatedPhysMAP);
  // Two-tier, calibrated (Layer 1C) against the live four-chamber circuit model:
  //  • CRITICAL (>25 mmHg): gross decoupling — a genuine integrator/algebra break, well above any
  //    legitimate model deviation (the unit test's map=150 vs 75 = 75 mmHg error stays CRITICAL).
  //  • WARNING (8–25 mmHg): a KNOWN fidelity gap the harness surfaced — disease-specific MAP
  //    modifiers (e.g. sepsisMAPShift, obesity/COPD shifts in CardiovascularEngine) are applied
  //    directly to MAP without adjusting CO/SVR, so the displayed CO·SVR·CVP identity drifts ~12–17
  //    mmHg in comorbid patients. Tracked for a Layer 2 CV-engine fix (route MAP shifts through SVR).
  //  Below 8 mmHg is the healthy rounding/dither/form-factor noise floor and is ignored.
  if (Number.isFinite(map) && Number.isFinite(calculatedPhysMAP) && !isArrest) {
    if (ohmError > 25.0) {
      systemStatus.hemodynamics = 'FAILED';
      anomalies.push({
        system: 'Hemodynamics',
        severity: 'CRITICAL',
        rule: 'Ohm Cardiovascular Law Consistency',
        message: `MAP grossly violates the hydraulic circuit equations (MAP = CO * SVR / 80 + CVP). Vitals show MAP ${fmt(map)} mmHg, but SVR-CO-CVP calculations dictate ${fmt(calculatedPhysMAP)} mmHg (error: ${fmt(map - calculatedPhysMAP)} mmHg).`,
        rationale: 'A gross MAP/CO/SVR decoupling indicates an algebraic error in the physiological integrator.',
        resolution: 'Check pressure integrator in usePhysiology.js.'
      });
    } else if (ohmError > 8.0) {
      if (systemStatus.hemodynamics === 'PASSED') systemStatus.hemodynamics = 'WARNING';
      anomalies.push({
        system: 'Hemodynamics',
        severity: 'WARNING',
        rule: 'MAP-CO-SVR Coupling Drift',
        message: `Displayed MAP (${fmt(map)} mmHg) is inconsistent with CO·SVR/80+CVP (${fmt(calculatedPhysMAP)} mmHg) by ${fmt(map - calculatedPhysMAP)} mmHg — a clinician recomputing SVR from these values would disagree.`,
        rationale: 'Disease-specific MAP modifiers are applied directly to MAP without adjusting CO/SVR, breaking the defining SVR identity. Fidelity gap, not a crash.',
        resolution: 'Layer 2: route disease MAP shifts (sepsis/obesity/COPD) through SVR so displayed hemodynamics stay self-consistent.'
      });
    }
  }

  // A2. ECG Rhythm - Heart Rate Congruency
  if (hr === 0 && !isArrest && !isApneic) {
    systemStatus.hemodynamics = 'FAILED';
    anomalies.push({
      system: 'Hemodynamics',
      severity: 'CRITICAL',
      rule: 'ECG Rhythm - HR Congruency',
      message: `Pulse shows HR of 0 bpm, but patient state is marked as NOT IN CARDIAC ARREST and rhythm is "${patient.cardiacRhythm || 'sinus'}".`,
      rationale: 'Heart rate of 0 is mathematically and clinically incompatible with a healthy, perfusing sinus rhythm. A flatline rate must trigger arrest states immediately to align diagnostic dashboards.',
      resolution: 'Enforce cardiac arrest transitions in usePhysiology.js when HR drops to zero.'
    });
  }

  // A3. Mathematical MAP Equation
  // MAP = DBP + PP/3 is an APPROXIMATION (true form factor varies ~0.33–0.42 with HR); the engine also
  // adds intentional respiratory/thermal/micro BP variation and rounds SBP/DBP/MAP to integers, so the
  // reconstruction legitimately differs by a few mmHg. Tolerance calibrated (Layer 1C) to the live
  // noise floor (~2.7 mmHg): 5 mmHg keeps margin while still flagging a genuinely mis-derived MAP.
  const calculatedMap = dia + (sys - dia) / 3;
  if (Number.isFinite(map) && Number.isFinite(calculatedMap) && Math.abs(map - calculatedMap) > 5.0 && !isArrest) {
    systemStatus.hemodynamics = 'FAILED';
    anomalies.push({
      system: 'Hemodynamics',
      severity: 'CRITICAL',
      rule: 'MAP Mathematical Consistency',
      message: `MAP violates the standard physiological equation (MAP = DBP + PP/3). Cuff shows ${fmt(map)} mmHg, but calculated is ${fmt(calculatedMap)} mmHg (error: ${fmt(map - calculatedMap)} mmHg).`,
      rationale: 'Mean Arterial Pressure (MAP) is the integration of the arterial pressure curve over time. In normal cardiovascular physics, it must strictly correlate with SBP and DBP to prevent telemetry dashboard inconsistencies.',
      resolution: 'Verify MAP calculation logic in usePhysiology.js.'
    });
  }

  // A4. Cardiac Arrest Passive Circulatory Decay
  if (isArrest) {
    if (!cprActive && (sys > 10 || map > 5)) {
      systemStatus.hemodynamics = 'FAILED';
      anomalies.push({
        system: 'Hemodynamics',
        severity: 'CRITICAL',
        rule: 'Cardiac Arrest Passive Circulatory Decay',
        message: `Patient is in CARDIAC ARREST but passive SBP is ${fmt(sys)} mmHg (MAP: ${fmt(map)} mmHg) without active CPR compressions.`,
        rationale: 'Upon cardiac arrest (ventricular fibrillation, pea, or asystole), active stroke volume drops to zero. Systemic pressures must decay exponentially to zero (mean circulatory filling pressure ~ 5-10 mmHg) within 5 seconds of stopping compressions.',
        resolution: 'Ensure vitals decay to zero when cprActive is false during arrest.'
      });
    }
    if (cprActive && (map < 10 || map > 55)) {
      systemStatus.hemodynamics = 'WARNING';
      anomalies.push({
        system: 'Hemodynamics',
        severity: 'WARNING',
        rule: 'CPR Compression Perfusion Generation',
        message: `Active chest compressions are running, but generated MAP is out of realistic perfusion bounds: ${fmt(map)} mmHg (expected: 15-40 mmHg).`,
        rationale: 'High-quality chest compressions mechanically generate a temporary cardiac output, generating a perfusion MAP between 15 and 45 mmHg. Pressures above 50 mmHg or below 10 mmHg during manual compressions are clinically unrealistic.',
        resolution: 'Calibrate generated pressure bounds during CPR.'
      });
    }
  }

  // A5. Thermal Redistribution Maximum Rate Limits
  if (safeHistory.length > 1) {
    const prevTick = safeHistory[safeHistory.length - 2];
    const prevTemp = prevTick?.vitals?.temp;
    if (Number.isFinite(temp) && Number.isFinite(prevTemp)) {
      const tempChange = Math.abs(temp - prevTemp);
      if (tempChange > 0.15 && !state.patient.coldFluidsInfused) {
        systemStatus.hemodynamics = 'FAILED';
        anomalies.push({
          system: 'Hemodynamics',
          severity: 'CRITICAL',
          rule: 'Thermal Redistribution Continuity',
          message: `Core body temperature shifted instantaneously by ${fmt(tempChange)}°C in one second (Current: ${fmt(temp)}°C, Prev: ${fmt(prevTemp)}°C).`,
          rationale: 'Human tissue possesses massive thermal capacity. Instantaneous, sharp drops in core temperature (>0.15°C/s) without active thermal clearance or massive icy volume infusion violate physical thermodynamics.',
          resolution: 'Verify thermal decay rate coefficients in usePhysiology.js.'
        });
      }
    }
  }

  // A6. Myocardial Oxygen Demand & Stunning
  const doubleProduct = hr * sys;
  if (patient.cad && doubleProduct > 15000 && stunning === 0 && !isArrest) {
    systemStatus.hemodynamics = 'WARNING';
    anomalies.push({
      system: 'Hemodynamics',
      severity: 'WARNING',
      rule: 'Ischemic Stunning Demand Coupling',
      message: `Patient has significant Coronary Artery Disease and myocardial double-product is extremely high (${fmt(doubleProduct)}), but myocardial stunning is 0%.`,
      rationale: 'High myocardial oxygen demand (HR x SBP > 14,000) in patients with severe CAD limits supply/demand ratios, which must trigger myocardial ischemia and subsequent stunning/dysfunction in the simulator.',
      resolution: 'Ensure ischemic damage and stunning accumulate correctly when double product thresholds are exceeded.'
    });
  }


  // --- B. VENTILATION & AIRWAY FIDELITY AUDIT ---

  // B1. Apneic Hypercapnia & Capnography Flatline
  if (isApneic && ventSettings.rr === 0 && !airwaySecured) {
    if (etco2 > 5) {
      systemStatus.ventilation = 'FAILED';
      anomalies.push({
        system: 'Ventilation',
        severity: 'CRITICAL',
        rule: 'Apneic Capnography Flatline',
        message: `Patient is completely apneic and unventilated, but end-tidal CO2 (EtCO2) is showing ${fmt(etco2)} mmHg.`,
        rationale: 'During absolute apnea without active mechanical or bag ventilation, there is zero bulk gas flow in and out of the lungs. The capnograph sensor must show a flatline (EtCO2 = 0) because no gas is being exhaled, even though PaCO2 is accumulating in the blood.',
        resolution: 'Force EtCO2 to 0 when there is no tidal exchange/respiratory rate.'
      });
    }
    if (apneaDuration > 60 && paco2 <= 40) {
      systemStatus.ventilation = 'WARNING';
      anomalies.push({
        system: 'Ventilation',
        severity: 'WARNING',
        rule: 'Apneic Carbon Dioxide Accumulation',
        message: `Patient has been apneic for ${fmt(apneaDuration)} seconds, but arterial PaCO2 remains stable at ${fmt(paco2)} mmHg.`,
        rationale: 'During apnea, cellular respiration continues to dump CO2 into the blood. Without ventilation, PaCO2 must rise by roughly 3-6 mmHg in the first minute, and 3-4 mmHg every minute thereafter.',
        resolution: 'Verify PaCO2 accumulation rate during apnea.'
      });
    }
  }

  // B2. Esophageal Intubation Capnography
  if (tubePosition === 'esophagus' && etco2 > 10) {
    systemStatus.ventilation = 'FAILED';
    anomalies.push({
      system: 'Ventilation',
      severity: 'CRITICAL',
      rule: 'Esophageal Intubation Capnography',
      message: `ETT is positioned in the esophagus, but EtCO2 is high at ${fmt(etco2)} mmHg.`,
      rationale: 'An endotracheal tube misplaced in the esophagus cannot participate in alveolar gas exchange. Aside from a transient wash out of gastric gas (1-2 breaths), capnography must flatline (EtCO2 ~ 0). Continuous high EtCO2 waves in an esophageal tube is a major clinical safety simulator defect.',
      resolution: 'Clamp EtCO2 to 0 when tubePosition is esophagus.'
    });
  }

  // B3. Cyanide Pulse Oximetry Deception
  const cyanide = Number.isFinite(patient.cyanide) ? patient.cyanide : (Number.isFinite(vitals.cyanide) ? vitals.cyanide : 0);
  if (cyanide > 0.3 && spo2 < 99 && !isArrest) {
    systemStatus.ventilation = 'FAILED';
    anomalies.push({
      system: 'Ventilation',
      severity: 'CRITICAL',
      rule: 'Cyanide Pulse Oximetry Deception',
      message: `Patient has severe cyanide toxicity (cyanide: ${fmt(cyanide, 2)} mcg/mL), but pulse oximeter shows SpO2 of ${fmt(spo2)}%.`,
      rationale: 'Cyanide poisons cytochrome c oxidase in the mitochondrial respiratory chain, completely halting cellular oxygen extraction. Because tissues cannot extract oxygen, venous blood remains fully oxygenated, and arterial-venous difference falls to zero. SaO2/SpO2 remains 100% despite profound cellular asphyxiation and lactic acidosis.',
      resolution: 'Clamp SpO2 to 100% during severe cyanide toxicity.'
    });
  }

  // B4. Positive Pressure Ventilation Aspiration Safety
  const hasAspirated = patient.hasAspirated || false;
  const isVentilatingPPV = patient.ventilationStatus === 'mechanical' || (ventSettings && ventSettings.mode !== 'spontaneous') || pip > 15;
  if (!airwaySecured && patient.stomach === 'full' && isVentilatingPPV && !hasAspirated) {
    systemStatus.ventilation = 'FAILED';
    anomalies.push({
      system: 'Ventilation',
      severity: 'CRITICAL',
      rule: 'Full Stomach PPV Aspiration Interlock',
      message: 'Positive pressure ventilation is active on a full stomach without a secured airway, but no aspiration was triggered.',
      rationale: 'In patients with a full stomach (e.g., obese patients, emergencies, or un-held GLP-1 agonists), delivering positive pressure ventilation pushes gas into the esophagus, raising intragastric pressure, opening the lower esophageal sphincter, and causing regurgitation and immediate, massive pulmonary aspiration of acidic gastric contents.',
      resolution: 'Secure the airway using rapid sequence intubation (RSI) before positive pressure ventilation is initiated.'
    });
  }


  // --- C. PHARMACOLOGICAL & NEUROLOGICAL FIDELITY AUDIT ---

  // C1. Propofol Vasodilation & Hypotension
  if (propofolCe > 1.5 && !isArrest) {
    const vasopressorActive = Array.isArray(activeMeds) && activeMeds.some(m => m && Array.isArray(m.classes) && m.classes.includes('Vasopressor') && m.Ce > 0.01);
    if (!vasopressorActive && svr >= 1100) {
      systemStatus.pharmacology = 'WARNING';
      anomalies.push({
        system: 'Pharmacology',
        severity: 'WARNING',
        rule: 'Propofol SVR Depressive Vasodilation',
        message: `Propofol Ce is high (${fmt(propofolCe, 2)} mcg/mL) with no active vasopressors, but Systemic Vascular Resistance (SVR) remains high at ${fmt(svr)} dynes.`,
        rationale: 'Propofol induces profound, dose-dependent arterial and venous vasodilation by reducing sympathetic tone and causing direct vascular smooth muscle relaxation. SVR must drop by at least 15-30% in the absence of vasopressors.',
        resolution: 'Increase the sensitivity of Propofol Ce to depress SVR in the physiology loops.'
      });
    }
  }

  // C2. Succinylcholine nAChR Potassium Leak
  if (succinylcholineCe > 0.05 && patient.nAChR_state === 'upregulated') {
    if (potassium < 5.2 && !patient.suxPotassiumLeaked) {
      systemStatus.pharmacology = 'FAILED';
      anomalies.push({
        system: 'Pharmacology',
        severity: 'CRITICAL',
        rule: 'Upregulated nAChR Succinylcholine Efflux',
        message: `Succinylcholine was pushed in a patient with upregulated extrajunctional nAChRs, but potassium remains normal at ${fmt(potassium, 1)} mEq/L.`,
        rationale: 'In patients with upregulated receptors (e.g., severe trauma, burns, or prolonged immobility), extrajunctional nicotinic acetylcholine receptors are expressed across the entire sarcolemma. Depolarizing neuromuscular blockers like Succinylcholine cause prolonged opening of these channels, leading to massive, life-threatening intracellular potassium efflux (+1.5 to +5.5 mEq/L), triggering hyperkalemic cardiac arrest.',
        resolution: 'Ensure a rapid, massive potassium leak is triggered in the physiology loop upon Succinylcholine bolus in upregulated states.'
      });
    }
  }

  // C3. Neostigmine Muscarinic Bradycardia
  if (bradycardiaTriggered && hr >= 60) {
    systemStatus.pharmacology = 'FAILED';
    anomalies.push({
      system: 'Pharmacology',
      severity: 'CRITICAL',
      rule: 'Neostigmine Bradycardic Surge',
      message: `Neostigmine bradycardia was triggered, but heart rate is stable at ${fmt(hr)} bpm.`,
      rationale: 'Administering Neostigmine without an anticholinergic (Glycopyrrolate or Atropine) builds up acetylcholine at muscarinic cardiac receptors, inducing profound vagal bradycardia (typically HR < 40 bpm) which will degenerate to asystole if Muscarinic receptors are not blocked.',
      resolution: 'Apply progressive, severe chronotropic depression when bradycardiaTriggered is active.'
    });
  }

  // C4. Sedative-Opioid Synergistic Apnea Check
  const isDeepSynergySedation = (propofolCe > 1.5 && (fentanylCe > 1.0 || remifentanilCe > 0.05)) || mac > 0.8;
  const isSpontaneouslyBreathing = patient.ventilationStatus === 'spontaneous' || !ventSettings.rr || ventSettings.rr === 0;
  if (isDeepSynergySedation && isSpontaneouslyBreathing && !airwaySecured && !isArrest) {
    if (hr > 0 && rr > 8) {
      systemStatus.pharmacology = 'WARNING';
      anomalies.push({
        system: 'Pharmacology',
        severity: 'WARNING',
        rule: 'Sedative-Opioid Synergistic Apnea',
        message: `Patient has deep sedative-opioid concentration (Propofol Ce: ${fmt(propofolCe, 2)} mcg/mL, Fentanyl Ce: ${fmt(fentanylCe, 2)} ng/mL, Remi Ce: ${fmt(remifentanilCe, 2)} ng/mL) while breathing spontaneously at RR ${fmt(rr)} breaths/min.`,
        rationale: 'Intravenous anesthetics (Propofol) and potent opioids (Fentanyl, Remifentanil) exhibit strong pharmacological synergy in the respiratory center of the medulla oblongata, profoundly depressing carbon dioxide response curves and triggering hypoventilation or central apnea.',
        resolution: 'Implement medication synergistic respiratory depression in ventilation loops.'
      });
    }
  }


  // --- D. ELECTROLYTE & FLUID FIDELITY AUDIT ---

  // D1. Bicarbonate Metabolic Acidosis
  if (lacticAcid > 4.5 && ph >= 7.35 && !isArrest) {
    systemStatus.electrolytes = 'WARNING';
    anomalies.push({
      system: 'Electrolytes',
      severity: 'WARNING',
      rule: 'Bicarbonate Metabolic Lactic Acidosis',
      message: `Lactic acid is severely elevated at ${fmt(lacticAcid)} mmol/L, but pH remains normal at ${fmt(ph, 2)}.`,
      rationale: 'Lactic acid is a strong metabolic acid that dissociates completely, consuming bicarbonate buffers. Elevated lactic acid (> 4.5 mmol/L) due to tissue hypoperfusion must trigger metabolic acidosis, shifting arterial pH lower.',
      resolution: 'Link pH directly to metabolic lactic acid accumulation.'
    });
  }

  // D2. Citrate Toxicity Calcium Bind (Transfusion)
  if (ebl > 2000 && !patient.calciumAdministered && calcium >= 8.5) {
    systemStatus.electrolytes = 'WARNING';
    anomalies.push({
      system: 'Electrolytes',
      severity: 'WARNING',
      rule: 'Citrate Calcium Binding Toxicity',
      message: `Massive blood product transfusion administered (${fmt(ebl)} mL lost and replaced), but serum ionized calcium remains normal at ${fmt(calcium, 1)} mEq/L.`,
      rationale: 'Blood products (PRBCs, FFP) are preserved with sodium citrate. Citrate binds free ionized calcium in the blood. Transfusing large volumes of blood products (> 3-4 units) rapidly without calcium chloride replacement must cause citrate toxicity, dropping ionized calcium, causing myocardial depression and prolonged QT.',
      resolution: 'Implement a calcium depletion rate based on blood products infused without calcium chloride replacement.'
    });
  }


  // --- E. VASCULAR ACCESS & LINES FIDELITY AUDIT ---

  // E1. Belmont IO Rapid Pressure Blowout
  const ioLine = Array.isArray(patient.accessLines) ? patient.accessLines.find(l => l && l.category?.includes('IO')) : undefined;
  if (ioLine) {
    const lType = ioLine.fluidLine || patient.fluidLine || 'gravity';
    const isBelmontRunningOnIO = lType === 'belmont' && Array.isArray(ioLine.activeInfusions) && ioLine.activeInfusions.length > 0;
    if (isBelmontRunningOnIO && !ioLine.failed) {
      systemStatus.lines = 'FAILED';
      anomalies.push({
        system: 'Vascular Access',
        severity: 'CRITICAL',
        rule: 'IO Rapid Infuser Pressure Blowout',
        message: `Belmont Rapid Infuser was connected to Intraosseous (IO) line, but the line did not blowout.`,
        rationale: 'IO lines sit inside the rigid bone marrow cavity. The Belmont Rapid Infuser generates high pressures up to 300 mmHg and high flows up to 500 mL/min. Pushing this volume into the marrow cavity will blow out the bone vascular structure, causing severe extravasation. This is a critical vascular access interlock.',
        resolution: 'Trigger immediate line failure and blowout when belmont is running on IO.'
      });
    }
  }

  // E2. Arterial Resuscitation Bolus Block
  const artLine = Array.isArray(patient.accessLines) ? patient.accessLines.find(l => l && l.category?.includes('Arterial')) : undefined;
  if (artLine && Array.isArray(artLine.activeInfusions) && artLine.activeInfusions.length > 0) {
    systemStatus.lines = 'FAILED';
    anomalies.push({
      system: 'Vascular Access',
      severity: 'CRITICAL',
      rule: 'Arterial Resuscitation Bolus Block',
      message: `Active fluid infusion (${artLine.activeInfusions[0]?.name || 'Unknown'}) is running on Arterial Line: ${artLine.name || 'Arterial'}.`,
      rationale: 'Arterial lines are placed strictly to monitor continuous blood pressure and draw blood gases. Attempting fluid resuscitation or pushing medications via an arterial line is a severe clinical error that causes instant arterial vasospasm, vascular endothelial damage, and severe distal tissue ischemia/necrosis.',
      resolution: 'Block fluid administration and trigger severe vascular penalties when infusions are directed to arterial lines.'
    });
  }


  // --- F. POSITIONING PHYSICS FIDELITY AUDIT ---

  // F1. Beach Chair Hydrostatic Pressure Shift
  if ((position === 'Sitting' || position === 'Beach Chair') && !isArrest) {
    const cuffMap = map;
    const cerebralMap = (vitals.cmap !== undefined && vitals.cmap !== null && Number.isFinite(vitals.cmap)) ? vitals.cmap : map;
    const expectedCMap = Math.max(0, cuffMap - 29.6);
    if (Number.isFinite(cerebralMap) && Number.isFinite(expectedCMap) && Math.abs(cerebralMap - expectedCMap) > 3) {
      systemStatus.positioning = 'FAILED';
      anomalies.push({
        system: 'Positioning',
        severity: 'CRITICAL',
        rule: 'Beach Chair Hydrostatic Cerebral Gradient',
        message: `Patient is in Sitting position. Cuff MAP is ${fmt(cuffMap)} mmHg, but Cerebral MAP is ${fmt(cerebralMap)} mmHg (expected: ~${fmt(expectedCMap)} mmHg).`,
        rationale: 'In the beach chair/sitting position, the head sits roughly 30 cm above the heart. Every 1.36 cm of height difference drops MAP by 1 mmHg due to gravity-hydrostatic column weights. Cerebral MAP at the circle of Willis is strictly ~29.6 mmHg lower than arm cuff MAP. Failing to model this exposes patients to massive watershed brain ischemia.',
        resolution: 'Apply the hydrostatic pressure modifier to cmap in usePhysiology.js.'
      });
    }
  }

  // F2. Trendelenburg Viscerocranial Compliance Drop
  if (position === 'Trendelenburg' && compliance >= 55 && pip > 0) {
    systemStatus.positioning = 'WARNING';
    anomalies.push({
      system: 'Positioning',
      severity: 'WARNING',
      rule: 'Trendelenburg Cephalad Visceral Compliance Load',
      message: `Patient is in Trendelenburg position, but lung compliance remains high at ${fmt(compliance)} mL/cmH2O.`,
      rationale: 'Trendelenburg position shifts the abdominal viscera cephalad against the diaphragm. This directly restricts diaphragmatic displacement under positive pressure, increasing Peak Inspiratory Pressures (PIP) and decreasing functional compliance by at least 15-20%.',
      resolution: 'Apply positional compliance penalties during Trendelenburg.'
    });
  }


  // --- G. NEUROLOGICAL & NEUROMUSCULAR FIDELITY AUDIT ---

  // G1. BIS vs Volatile Anesthetic MAC
  if (mac > 0.8 && bis > 65 && !isArrest) {
    systemStatus.neurology = 'WARNING';
    anomalies.push({
      system: 'Neurology',
      severity: 'WARNING',
      rule: 'BIS Volatile MAC Depth Coupling',
      message: `Volatile MAC is therapeutic at ${fmt(mac, 2)}, but Bispectral Index (BIS) is high at ${fmt(bis)} (awake).`,
      rationale: 'Therapeutic volatile end-tidal concentrations of 0.8 to 1.2 MAC must suppress the cerebral cortex, dropping BIS to general anesthesia ranges (40-60). BIS remaining high during therapeutic MAC indicates a clinical simulation depth discrepancy.',
      resolution: 'Couple BIS directly to volatile MAC and sedative Ce.'
    });
  }

  // G2. TOF Count vs Active Paralytics
  if (rocuroniumCe > 0.15 && tofCount === 4) {
    systemStatus.neurology = 'WARNING';
    anomalies.push({
      system: 'Neurology',
      severity: 'WARNING',
      rule: 'TOF NDMR Paralysis Coupling',
      message: `Rocuronium concentration is high (${fmt(rocuroniumCe, 2)} mcg/mL), but TOF twitches remain at 4/4.`,
      rationale: 'High ndmr muscle relaxant concentrations block neuromuscular nicotinic receptors, which must cause a fade in TOF twitches and drop the count below 4 twitches.',
      resolution: 'Couple active paralytic Ce directly to TOF twitches in usePhysiology.js.'
    });
  }


  // ==========================================
  // 3. DIFFERENTIAL TESTING (Deterministic Medical Equivalence)
  // ==========================================

  // D1. Alveolar Gas Equation Differential Test
  // PAO2 = FiO2 * (Patm - PH2O) - PaCO2 / R
  const calculatedPAO2 = (deliveredFiO2 * 7.13) - (paco2 / 0.8);
  if (Number.isFinite(pao2) && Number.isFinite(calculatedPAO2) && pao2 > calculatedPAO2 + 5.0 && !isArrest) {
    systemStatus.ventilation = 'FAILED';
    anomalies.push({
      system: 'Ventilation',
      severity: 'CRITICAL',
      rule: 'Alveolar Gas Equation Thermodynamic Violation',
      message: `Arterial PaO2 (${fmt(pao2)} mmHg) is higher than calculated Alveolar PAO2 (${fmt(calculatedPAO2)} mmHg) under FiO2 ${fmt(deliveredFiO2)}% and PaCO2 ${fmt(paco2)} mmHg.`,
      rationale: 'By fundamental gas diffusion physics, oxygen partial pressure in the systemic arterial blood (PaO2) cannot exceed partial pressure inside the alveoli (PAO2). Mass oxygen transport occurs along partial pressure gradients; reversing this gradient is thermodynamically impossible.',
      resolution: 'Ensure PaO2 is correctly bounded by PAO2 minus the A-a gradient.'
    });
  }

  // D2. PK/PD Compartment Mass Balance Conservation
  if (Array.isArray(activeMeds)) {
    activeMeds.forEach(m => {
      if (!m) return;
      const rawMaxDoseMg = 2000; // Physical sanity ceiling for bolus doses in catalog
      const estCentralMassMg = Number.isFinite(m.A1) ? m.A1 : 0;
      if (estCentralMassMg > rawMaxDoseMg) {
        systemStatus.pharmacology = 'FAILED';
        anomalies.push({
          system: 'Pharmacology',
          severity: 'CRITICAL',
          rule: 'PK/PD Mass Conservation',
          message: `Drug central compartment mass for ${m.name || m.drug || 'Unknown'} is abnormally elevated at ${fmt(estCentralMassMg)} mg, exceeding standard clinical bolus limits.`,
          rationale: 'Pharmacokinetic engines must conserve mass. Spontaneous accumulation of central compartment mass values beyond clinical dosing catalogs indicates an algebraic integration leakage or division-by-zero error.',
          resolution: 'Review PK integration loop subdivisions in PKPDEngine.js.'
        });
      }
    });
  }


  // ==========================================
  // 4. TIME-DELAYED ORACLE EXPECTATIONS (Historical Telemetry Windows)
  // ==========================================
  if (safeHistory.length > 5) {
    // T1. Sugammadex Neuromuscular Block Reversal Timeline (Routine/Rescue)
    const sugammadexPushIdx = safeHistory.findIndex(step => step && step.actionText && step.actionText.toLowerCase().includes('sugammadex'));
    if (sugammadexPushIdx !== -1) {
      const pushTick = safeHistory[sugammadexPushIdx]?.tick;
      const currentTick = safeHistory[safeHistory.length - 1]?.tick;
      if (Number.isFinite(pushTick) && Number.isFinite(currentTick)) {
        const elapsedSec = currentTick - pushTick;

        // If at least 120s has elapsed since Sugammadex administration
        if (elapsedSec >= 120) {
          if (tofCount < 4 && !isArrest) {
            systemStatus.neurology = 'FAILED';
            anomalies.push({
              system: 'Neurology',
              severity: 'CRITICAL',
              rule: 'Sugammadex Reversal Delayed Recovery',
              message: `Sugammadex was pushed ${fmt(elapsedSec)}s ago, but muscle TOF twitch count remains depressed at ${tofCount}/4 (expected: 4/4).`,
              rationale: 'Sugammadex encapsulates steroidal neuromuscular blockers (Rocuronium, Vecuronium) on a 1:1 molar basis. An adequate dose (2-4 mg/kg routine, or 16 mg/kg rescue) must completely reverse neuromuscular blockade within 1.5 to 2 minutes, restoring twitches to 4/4.',
              resolution: 'Check Sugammadex chelation speed coefficients and TOF twitch binding calculations in usePhysiology.js.'
            });
          }
        }
      }
    }

    // T2. Upregulated nAChR Succinylcholine Efflux
    const suxPushIdx = safeHistory.findIndex(step => step && step.actionText && step.actionText.toLowerCase().includes('succinylcholine'));
    if (suxPushIdx !== -1) {
      const suxStep = safeHistory[suxPushIdx];
      const isUpregulated = suxStep?.patient && suxStep.patient.nAChR_state === 'upregulated';

      if (isUpregulated) {
        const pushTick = suxStep.tick;
        const currentTick = safeHistory[safeHistory.length - 1]?.tick;
        if (Number.isFinite(pushTick) && Number.isFinite(currentTick)) {
          const elapsedSec = currentTick - pushTick;

          if (elapsedSec >= 10 && elapsedSec <= 60) {
            const initialK = suxStep.electrolytes?.k || 4.0;
            const kDelta = potassium - initialK;
            if (kDelta < 1.5) {
              systemStatus.pharmacology = 'FAILED';
              anomalies.push({
                system: 'Pharmacology',
                severity: 'CRITICAL',
                rule: 'Upregulated nAChR Potassium Leak Timeline',
                message: `Succinylcholine was pushed ${fmt(elapsedSec)}s ago in upregulated state, but potassium delta is only +${fmt(kDelta)} mEq/L (expected: >= +1.5 mEq/L).`,
                rationale: 'In upregulated nicotinic receptor states, Succinylcholine triggers persistent opening of extrajunctional channels. This must cause a hyperacute, massive potassium efflux (+1.5 to +5.0 mEq/L) within 60s, leading to hyperkalemic cardiac arrest.',
                resolution: 'Review depolarizing NMBA potassium flux modifiers in usePhysiology.js.'
              });
            }
          }
        }
      }
    }

    // T3. Neostigmine Muscarinic Bradycardic Surge
    const neoPushIdx = safeHistory.findIndex(step => step && step.actionText && step.actionText.toLowerCase().includes('neostigmine') && !step.actionText.toLowerCase().includes('glyco'));
    if (neoPushIdx !== -1) {
      const pushTick = safeHistory[neoPushIdx]?.tick;
      const currentTick = safeHistory[safeHistory.length - 1]?.tick;
      if (Number.isFinite(pushTick) && Number.isFinite(currentTick)) {
        const elapsedSec = currentTick - pushTick;

        if (elapsedSec >= 30 && elapsedSec <= 90) {
          // Check if glyco was given in this window
          const glycoGiven = safeHistory.slice(neoPushIdx).some(step => step && step.actionText && step.actionText.toLowerCase().includes('glycopyrrolate'));
          if (!glycoGiven && hr >= 55 && !isArrest) {
            systemStatus.pharmacology = 'FAILED';
            anomalies.push({
              system: 'Pharmacology',
              severity: 'CRITICAL',
              rule: 'Unopposed Neostigmine Vagal Chronotropy Decay',
              message: `Neostigmine was administered ${fmt(elapsedSec)}s ago without anticholinergic protection, but heart rate remains stable at ${fmt(hr)} bpm (expected: < 40 bpm or arrest).`,
              rationale: 'Neostigmine blocks acetylcholinesterase, accumulating acetylcholine at cardiac M2 receptors. Without Glycopyrrolate co-administration, it triggers profound vagal chronotropy, causing severe bradycardia or asystolic arrest within 60s.',
              resolution: 'Tighten muscarinic bradycardia time kinetics when Glycopyrrolate Ce is low.'
            });
          }
        }
      }
    }

    // T4. Propofol Bolus Hypotension
    const propofolPushIdx = safeHistory.findIndex(step => step && step.actionText && step.actionText.toLowerCase().includes('propofol 150mg'));
    if (propofolPushIdx !== -1) {
      const pushStep = safeHistory[propofolPushIdx];
      const pushTick = pushStep?.tick;
      const currentTick = safeHistory[safeHistory.length - 1]?.tick;
      if (Number.isFinite(pushTick) && Number.isFinite(currentTick)) {
        const elapsedSec = currentTick - pushTick;

        if (elapsedSec >= 30 && elapsedSec <= 90) {
          const vasopressorActive = Array.isArray(activeMeds) && activeMeds.some(m => m && Array.isArray(m.classes) && m.classes.includes('Vasopressor') && m.Ce > 0.01);
          if (!vasopressorActive) {
            const initialSVR = pushStep.vitals?.svr || 1200;
            if (Number.isFinite(initialSVR) && initialSVR > 0) {
              const svrRatio = svr / initialSVR;
              if (svrRatio > 0.90) {
                systemStatus.pharmacology = 'WARNING';
                anomalies.push({
                  system: 'Pharmacology',
                  severity: 'WARNING',
                  rule: 'Propofol Vasodepressive Response Timeline',
                  message: `Propofol bolus was pushed ${fmt(elapsedSec)}s ago with no active pressors, but SVR decayed by only ${fmt((1 - svrRatio) * 100)}% (expected: >= 15% SVR drop).`,
                  rationale: 'Propofol induces profound, rapid-onset arterial and venous smooth muscle dilation, reducing SVR. An SVR drop must manifest clinically within 60-90s in the absence of opposing vasopressors.',
                  resolution: 'Increase Propofol effect-site SVR depression sensitivity and speed.'
                });
              }
            }
          }
        }
      }
    }
  }

  return { anomalies, systemStatus };
}
