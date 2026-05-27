/**
 * Clinical Fidelity Oracle
 * Independently audits the entire live or hypothetical simulator state Ref
 * and outputs structured clinical anomalies and physiological discrepancies.
 */

function fmt(val, decimals = 1) {
  if (val === undefined || val === null || isNaN(val)) return 'N/A';
  return typeof val === 'number' ? val.toFixed(decimals) : val;
}

export function evaluateFidelity(state) {
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

  // 1. EXTRACT TELEMETRY VARIABLES
  const vitals = state.vitals || {};
  const patient = state.patient || {};
  const activeMeds = state.activeMeds || [];
  const electrolytes = state.electrolytes || {};
  const coags = state.coags || {};
  const ventSettings = state.ventSettings || {};
  const gasSettings = state.gasSettings || {};
  const surgicalPhase = state.surgicalPhase || 'Pre-Op';

  const hr = vitals.hr || 0;
  const sys = vitals.sys || 0;
  const dia = vitals.dia || 0;
  const map = vitals.map || 0;
  const co = vitals.co || 5.0;
  const svr = vitals.svr || 1200;
  const spo2 = vitals.spo2 || 100;
  const pao2 = vitals.pao2 || 100;
  const paco2 = vitals.paco2 || 40;
  const etco2 = vitals.etco2 || 40;
  const temp = vitals.temp || 37.0;
  const bis = vitals.bis !== undefined ? vitals.bis : 99;
  const tofCount = vitals.tofCount !== undefined ? vitals.tofCount : 4;
  const pip = vitals.pip || 0;
  const compliance = vitals.compl || 60;
  const resistance = vitals.res || 10;
  const lacticAcid = vitals.lacticAcid || patient.lacticAcid || 1.0;

  const isArrest = patient.isArrest || false;
  const cprActive = patient.cprActive || false;
  const stunning = patient.myocardialStunning || 0;
  const ebl = patient.ebl || 0;
  const ebv = patient.ebv || 5000;
  const position = patient.position || 'Supine';
  const airwaySecured = patient.airwaySecured || false;
  const tubePosition = patient.tubePosition || null;
  const isApneic = patient.isApneic || false;

  const potassium = electrolytes.k || 4.0;
  const calcium = electrolytes.ca || 9.0;
  const ph = electrolytes.ph || 7.4;

  const propofolCe = activeMeds.find(m => m.name === 'Propofol')?.Ce || 0;
  const etomidateCe = activeMeds.find(m => m.name === 'Etomidate')?.Ce || 0;
  const ketamineCe = activeMeds.find(m => m.name === 'Ketamine')?.Ce || 0;
  const fentanylCe = activeMeds.find(m => m.name === 'Fentanyl')?.Ce || 0;
  const rocuroniumCe = activeMeds.find(m => m.name === 'Rocuronium')?.Ce || 0;
  const succinylcholineCe = activeMeds.find(m => m.name === 'Succinylcholine')?.Ce || 0;
  const vecuroniumCe = activeMeds.find(m => m.name === 'Vecuronium')?.Ce || 0;

  // Audit variables that must be defined to prevent runtime exceptions
  const mac = vitals.mac !== undefined ? vitals.mac : (patient.mac !== undefined ? patient.mac : 0);
  const time = state.time || 0;
  const apneaDuration = (state.time && patient.apneaStartTime) ? (state.time - patient.apneaStartTime) : 0;
  const bradycardiaTriggered = patient.bradycardiaTriggered || false;

  // 2. RUN PHYSIOLOGICAL FIDELITY CHECKS

  // --- A. HEMODYNAMIC FIDELITY AUDIT ---
  
  // A1. Mathematical MAP Equation
  const calculatedMap = dia + (sys - dia) / 3;
  if (Math.abs(map - calculatedMap) > 2.5 && !isArrest) {
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

  // A2. Cardiac Arrest Circulatory Mechanics
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

  // A3. Myocardial Oxygen Demand & Stunning
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

  // B3. Shunt Fraction Limiting Oxygenation (Trauma OLV)
  if (patient.shuntFraction >= 0.20 && airwaySecured && ventSettings.fio2 >= 90) {
    if (pao2 > 250) {
      systemStatus.ventilation = 'WARNING';
      anomalies.push({
        system: 'Ventilation',
        severity: 'WARNING',
        rule: 'Shunt Fraction Oxygenation Barrier',
        message: `Patient has a severe intrapulmonary shunt (${fmt(patient.shuntFraction * 100)}% shunt), but arterial PaO2 has risen to ${fmt(pao2)} mmHg on high FiO2.`,
        rationale: 'Intrapulmonary shunt represents deoxygenated blood bypassing ventilated alveoli to mix directly with oxygenated blood. If shunt is > 20% (e.g. trauma atelectasis or single-lung ventilation), it creates a physiological barrier: even under 100% FiO2, arterial PaO2 cannot exceed 150-200 mmHg.',
        resolution: 'Apply shunt fraction physiological equation to restrict maximum arterial PaO2.'
      });
    }
  }

  // B4. Cyanide Pulse Oximetry Deception
  const cyanide = patient.cyanide || vitals.cyanide || 0;
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

  // B5. Positive Pressure Ventilation Aspiration Safety
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


  // --- C. PHARMACOLOGICAL FIDELITY AUDIT ---

  // C1. Propofol Vasodilation & Hypotension
  if (propofolCe > 1.5 && !isArrest) {
    const vasopressorActive = activeMeds.some(m => m.classes.includes('Vasopressor') && m.Ce > 0.01);
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
  const ioLine = patient.accessLines?.find(l => l.category?.includes('IO'));
  if (ioLine) {
    const lType = ioLine.fluidLine || patient.fluidLine || 'gravity';
    const isBelmontRunningOnIO = lType === 'belmont' && ioLine.activeInfusions && ioLine.activeInfusions.length > 0;
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
  const artLine = patient.accessLines?.find(l => l.category?.includes('Arterial'));
  if (artLine && artLine.activeInfusions && artLine.activeInfusions.length > 0) {
    systemStatus.lines = 'FAILED';
    anomalies.push({
      system: 'Vascular Access',
      severity: 'CRITICAL',
      rule: 'Arterial Resuscitation Bolus Block',
      message: `Active fluid infusion (${artLine.activeInfusions[0].name}) is running on Arterial Line: ${artLine.name}.`,
      rationale: 'Arterial lines are placed strictly to monitor continuous blood pressure and draw blood gases. Attempting fluid resuscitation or pushing medications via an arterial line is a severe clinical error that causes instant arterial vasospasm, vascular endothelial damage, and severe distal tissue ischemia/necrosis.',
      resolution: 'Block fluid administration and trigger severe vascular penalties when infusions are directed to arterial lines.'
    });
  }


  // --- F. POSITIONING PHYSICS FIDELITY AUDIT ---

  // F1. Beach Chair Hydrostatic Pressure Shift
  if ((position === 'Sitting' || position === 'Beach Chair') && !isArrest) {
    const cuffMap = map;
    const cerebralMap = vitals.cmap || map;
    const expectedCMap = cuffMap - 29.6;
    if (Math.abs(cerebralMap - expectedCMap) > 3) {
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

  return { anomalies, systemStatus };
}
