/**
 * High-Fidelity Guided Clinical Scenario Fuzzer
 * Generates automated, stateful, and physiologically guided clinical actions 
 * to systematically stress-test the anesthesiology simulation's state space.
 */

// Core static fuzzing actions (Fallbacks and discrete sequence blocks)
export const FUZZ_ACTIONS = [
  // === 1. SEDATIVES & HYPNOTICS ===
  { name: 'Push Propofol 150mg', type: 'med', drug: 'Propofol', dose: 150, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Propofol 1500mg (10x Overdose)', type: 'med', drug: 'Propofol', dose: 1500, unit: 'mg', medType: 'Bolus', route: 'IV' }, // Overdose
  { name: 'Push Propofol 10mg (Sub-therapeutic)', type: 'med', drug: 'Propofol', dose: 10, unit: 'mg', medType: 'Bolus', route: 'IV' },  // Underdose
  { name: 'Push Etomidate 20mg', type: 'med', drug: 'Etomidate', dose: 20, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Ketamine 100mg', type: 'med', drug: 'Ketamine', dose: 100, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Dexmedetomidine 100mcg', type: 'med', drug: 'Dexmedetomidine', dose: 100, unit: 'mcg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Midazolam 2mg', type: 'med', drug: 'Midazolam', dose: 2, unit: 'mg', medType: 'Bolus', route: 'IV' },
  
  // === 2. OPIOIDS ===
  { name: 'Push Fentanyl 100mcg', type: 'med', drug: 'Fentanyl', dose: 100, unit: 'mcg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Sufentanil 10mcg', type: 'med', drug: 'Sufentanil', dose: 10, unit: 'mcg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Remifentanil 100mcg', type: 'med', drug: 'Remifentanil', dose: 100, unit: 'mcg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Morphine 5mg', type: 'med', drug: 'Morphine', dose: 5, unit: 'mg', medType: 'Bolus', route: 'IV' },
  
  // === 3. PARALYTICS & REVERSALS ===
  { name: 'Push Rocuronium 50mg', type: 'med', drug: 'Rocuronium', dose: 50, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Succinylcholine 100mg', type: 'med', drug: 'Succinylcholine', dose: 100, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Vecuronium 10mg', type: 'med', drug: 'Vecuronium', dose: 10, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Cisatracurium 10mg', type: 'med', drug: 'Cisatracurium', dose: 10, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Sugammadex 200mg (Routine)', type: 'med', drug: 'Sugammadex', dose: 200, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Sugammadex 1000mg (Rescue/Deep)', type: 'med', drug: 'Sugammadex', dose: 1000, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Neostigmine 5mg (Without Glyco)', type: 'med', drug: 'Neostigmine', dose: 5, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Glycopyrrolate 0.2mg', type: 'med', drug: 'Glycopyrrolate', dose: 0.2, unit: 'mg', medType: 'Bolus', route: 'IV' },
  
  // === 4. VASOACTIVES & INOTROPES ===
  { name: 'Push Epinephrine 50mcg', type: 'med', drug: 'Epinephrine', dose: 50, unit: 'mcg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Epinephrine 1mg (ACLS Arrest Dose)', type: 'med', drug: 'Epinephrine', dose: 1000, unit: 'mcg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Ephedrine 10mg', type: 'med', drug: 'Ephedrine', dose: 10, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Norepinephrine 16mcg', type: 'med', drug: 'Norepinephrine', dose: 16, unit: 'mcg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Phenylephrine 100mcg', type: 'med', drug: 'Phenylephrine', dose: 100, unit: 'mcg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Vasopressin 2 Units', type: 'med', drug: 'Vasopressin', dose: 2, unit: 'units', medType: 'Bolus', route: 'IV' },
  
  // === 5. ANTIHYPERTENSIVES ===
  { name: 'Push Esmolol 20mg', type: 'med', drug: 'Esmolol', dose: 20, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Labetalol 20mg', type: 'med', drug: 'Labetalol', dose: 20, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Metoprolol 5mg', type: 'med', drug: 'Metoprolol', dose: 5, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Nitroprusside 100mcg', type: 'med', drug: 'Nitroprusside', dose: 100, unit: 'mcg', medType: 'Bolus', route: 'IV' },
  
  // === 6. DIURETICS & RESUS FLUIDS ===
  { name: 'Push Furosemide 20mg', type: 'med', drug: 'Furosemide', dose: 20, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Bolus NS 500mL', type: 'fluid', nameFluid: 'Normal Saline (0.9% NS)', volume: 500 },
  { name: 'Bolus LR 500mL', type: 'fluid', nameFluid: 'Lactated Ringers (LR)', volume: 500 },
  { name: 'Transfuse PRBC 1 Unit', type: 'fluid', nameFluid: 'Packed Red Blood Cells (PRBC)', volume: 1 },
  { name: 'Transfuse FFP 1 Unit', type: 'fluid', nameFluid: 'Fresh Frozen Plasma (FFP)', volume: 1 },
  
  // === 7. CHECKLISTS, MANEUVERS, ACCESS ===
  { name: 'Complete MSMAIDS Checklist', type: 'procedure_action', actionName: 'msmaids' },
  { name: 'Attach BIS Monitor', type: 'procedure_action', actionName: 'attach_bis' },
  { name: 'Attach TOF Monitor', type: 'procedure_action', actionName: 'attach_tof' },
  { name: "Perform Larson's Maneuver", type: 'maneuver' },
  { name: 'Check ETT Cuff Leak', type: 'check', action: 'cuff' },
  { name: 'Review Fasting NPO History', type: 'check', action: 'npo' },
  { name: 'Place 18G PIV Right Forearm', type: 'line', category: 'Peripheral IV', lType: '18G Peripheral IV', location: 'Right Forearm' },
  { name: 'Place Radial Arterial Line', type: 'line', category: 'Arterial Line', lType: 'Radial Arterial Line', location: 'Left Radial' },
  { name: 'Place Triple Lumen CVC Right IJ', type: 'line', category: 'Central Line', lType: 'Triple Lumen CVC (7Fr)', location: 'Right Internal Jugular' },

  // === 8. VENTILATOR ADJUSTMENTS ===
  { name: 'Set Vent RR 16', type: 'vent', field: 'rr', value: 16 },
  { name: 'Set Vent RR 0 (Apnea)', type: 'vent', field: 'rr', value: 0 },
  { name: 'Set Vent VT 500', type: 'vent', field: 'vt', value: 500 },
  { name: 'Set Vent FiO2 100%', type: 'vent', field: 'fio2', value: 100 },
  { name: 'Set Vent PEEP 5', type: 'vent', field: 'peep', value: 5 },
  
  // === 9. OXYGEN DEVICES ===
  { name: 'O2 Non-Rebreather 15L', type: 'o2', device: 'Non-Rebreather Mask (NRB)', flow: 15, fio2: 100, ipap: 0, epap: 0, rate: 0 },
  { name: 'O2 HFNC 60L 100%', type: 'o2', device: 'High Flow Nasal Cannula (HFNC)', flow: 60, fio2: 100, ipap: 0, epap: 0, rate: 0 },

  // === 10. AIRWAY PROCEDURES & CARDIAC ACTIONS ===
  { name: 'Suction pharynx', type: 'procedure', action: 'suction' },
  { name: 'Perform Laryngoscopy (ETT in trachea)', type: 'procedure', action: 'laryngoscopy', tubePosition: 'trachea' },
  { name: 'Perform Laryngoscopy (ETT in esophagus)', type: 'procedure', action: 'laryngoscopy', tubePosition: 'esophagus' },
  { name: 'Perform Laryngoscopy (ETT in mainstem)', type: 'procedure', action: 'laryngoscopy', tubePosition: 'right_mainstem' },
  { name: 'Optimize Airway OPA', type: 'procedure', action: 'opa' },
  { name: 'Perform BMV ventilation', type: 'procedure', action: 'bmv' },
  { name: 'Toggle CPR compressions', type: 'cpr' },
  { name: 'Deliver Defib Shock 200J', type: 'shock', joules: 200, sync: false },

  // === 11. OBSERVATION ACTIONS ===
  { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 },
  { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 }
];

/**
 * Returns a random action from the default set (Backwards Compatibility)
 */
export function getRandomFuzzAction() {
  const idx = Math.floor(Math.random() * FUZZ_ACTIONS.length);
  return FUZZ_ACTIONS[idx];
}

/**
 * Main Guided Stateful Clinical Scenario Action Generator.
 * Tracks patient state and queues logical sequences according to chosen fuzzer archetype.
 * 
 * @param {Object} state Current simulator state (vitals, patient, activeMeds, time)
 * @param {Object} fuzzerState Persistent fuzzer state (phase, currentSequence, counters)
 * @param {string} strategy Strategy archetype ('polypharmacy', 'malpractice', 'mechanical', 'guided')
 */
export function getGuidedFuzzAction(state, fuzzerState, strategy = 'guided') {
  if (!state) return getRandomFuzzAction();

  // 1. Initialize fuzzerState if empty
  if (!fuzzerState.phase) {
    fuzzerState.phase = 'PRE_OP';
    fuzzerState.currentSequence = [];
    fuzzerState.sequenceStep = 0;
    fuzzerState.attemptCount = 0;
    fuzzerState.drugsGiven = {};
  }

  const patient = state.patient || {};
  const vitals = state.vitals || {};
  const activeMeds = state.activeMeds || [];

  // Check if we have a pre-programmed sequence running
  if (fuzzerState.currentSequence && fuzzerState.currentSequence.length > 0) {
    const nextAction = fuzzerState.currentSequence.shift();
    return nextAction;
  }

  // Determine current physical/clinical milestones to transition fuzzer phases:
  const hasIV = patient.accessLines && patient.accessLines.some(l => l.category?.includes('IV') || l.name?.includes('IV'));
  const hasArtLine = patient.accessLines && patient.accessLines.some(l => l.category?.includes('Arterial'));
  const hasMonitors = patient.hasBisMonitor && patient.hasTofMonitor;
  const isHypnotic = activeMeds.some(m => m.classes.includes('Sedative') || m.classes.includes('Hypnotic') || m.classes.includes('Dissociative'));
  const isParalyzed = patient.isParalyzed || vitals.tofCount < 4;
  const isAirwaySecured = patient.airwaySecured;

  // Sync fuzzerState.phase with patient status (Bypass for comprehensive 'ultimate' strategy)
  if (strategy !== 'ultimate') {
    if (fuzzerState.phase === 'PRE_OP' && hasIV && hasMonitors) {
      fuzzerState.phase = 'INDUCTION';
    } else if (fuzzerState.phase === 'INDUCTION' && isHypnotic && isParalyzed) {
      fuzzerState.phase = 'AIRWAY_MGMT';
    } else if (fuzzerState.phase === 'AIRWAY_MGMT' && isAirwaySecured) {
      fuzzerState.phase = 'MAINTENANCE';
    }
  }

  // Phase-specific guided generators based on selected Strategy Archetype:
  switch (strategy) {
    case 'ultimate':
      return generateUltimateCoverageAction(state, fuzzerState, { hasIV, hasArtLine, hasMonitors, isHypnotic, isParalyzed, isAirwaySecured });

    case 'polypharmacy':
      return generatePolypharmacyAction(state, fuzzerState, { hasIV, hasArtLine, hasMonitors, isHypnotic, isParalyzed, isAirwaySecured });
      
    case 'malpractice':
      return generateMalpracticeAction(state, fuzzerState, { hasIV, hasArtLine, hasMonitors, isHypnotic, isParalyzed, isAirwaySecured });
      
    case 'mechanical':
      return generateMechanicalFailureAction(state, fuzzerState, { hasIV, hasArtLine, hasMonitors, isHypnotic, isParalyzed, isAirwaySecured });
      
    case 'guided':
    default:
      return generateStandardGuidedAction(state, fuzzerState, { hasIV, hasArtLine, hasMonitors, isHypnotic, isParalyzed, isAirwaySecured });
  }
}

/**
 * Exhaustive Clinical Coverage Strategy Action Generator (ultimate)
 */
function generateUltimateCoverageAction(state, fuzzerState, flags) {
  const patient = state.patient || {};
  const vitals = state.vitals || {};
  const activeMeds = state.activeMeds || [];

  // Check if we have a pre-programmed sequence running
  if (fuzzerState.currentSequence && fuzzerState.currentSequence.length > 0) {
    const nextAction = fuzzerState.currentSequence.shift();
    return nextAction;
  }

  // Define phases: 'PRE_OP', 'INDUCTION', 'AIRWAY_MGMT', 'MAINTENANCE', 'EMERGENCE', 'POST_OP'
  if (!fuzzerState.ultimatePhase) {
    fuzzerState.ultimatePhase = 'PRE_OP';
  }

  // 1. PRE-OP PHASE: Setup checklists, monitors, and place ALL line access types
  if (fuzzerState.ultimatePhase === 'PRE_OP') {
    fuzzerState.currentSequence = [
      { name: 'Review Fasting NPO History', type: 'check', action: 'npo' },
      { name: 'Complete MSMAIDS Checklist', type: 'procedure_action', actionName: 'msmaids' },
      { name: 'Attach BIS Monitor', type: 'procedure_action', actionName: 'attach_bis' },
      { name: 'Attach TOF Monitor', type: 'procedure_action', actionName: 'attach_tof' },
      { name: 'Place 18G PIV Right Forearm', type: 'line', category: 'Peripheral IV', lType: '18G Peripheral IV', location: 'Right Forearm' },
      { name: 'Place Radial Arterial Line', type: 'line', category: 'Arterial Line', lType: 'Radial Arterial Line', location: 'Left Radial' },
      { name: 'Place Femoral Arterial Line', type: 'line', category: 'Arterial Line', lType: 'Femoral Arterial Line', location: 'Right Femoral' },
      { name: 'Place Triple Lumen CVC Right IJ', type: 'line', category: 'Central Line', lType: 'Triple Lumen CVC (7Fr)', location: 'Right Internal Jugular' },
      { name: 'Place MAC Cordis CVC Right IJ', type: 'line', category: 'Central Line', lType: 'Introducer Cordis (8.5Fr)', location: 'Right Internal Jugular' },
      { name: 'Place Humeral IO Right Shoulder', type: 'line', category: 'IO Line', lType: 'Humeral IO (15G)', location: 'Right Humeral' },
      { name: 'Place Tibial IO Left Leg', type: 'line', category: 'IO Line', lType: 'Tibial IO (15G)', location: 'Left Tibial' },
      { name: 'Place 14G PIV Left AC', type: 'line', category: 'Peripheral IV', lType: '14G Peripheral IV', location: 'Left AC' },
      { name: 'Place 22G PIV Right Hand', type: 'line', category: 'Peripheral IV', lType: '22G Peripheral IV', location: 'Right Hand' },
      { name: 'O2 Non-Rebreather 15L', type: 'o2', device: 'Non-Rebreather Mask (NRB)', flow: 15, fio2: 100, ipap: 0, epap: 0, rate: 0 },
      { name: 'O2 HFNC 60L 100%', type: 'o2', device: 'High Flow Nasal Cannula (HFNC)', flow: 60, fio2: 100, ipap: 0, epap: 0, rate: 0 },
      { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 }
    ];
    fuzzerState.ultimatePhase = 'INDUCTION';
    return fuzzerState.currentSequence.shift();
  }

  // 2. INDUCTION PHASE: Randomize sedative, opioid, and paralytic pick
  if (fuzzerState.ultimatePhase === 'INDUCTION') {
    const sedatives = [
      { name: 'Push Propofol 150mg', type: 'med', drug: 'Propofol', dose: 150, unit: 'mg', medType: 'Bolus', route: 'IV' },
      { name: 'Push Etomidate 20mg', type: 'med', drug: 'Etomidate', dose: 20, unit: 'mg', medType: 'Bolus', route: 'IV' },
      { name: 'Push Ketamine 100mg', type: 'med', drug: 'Ketamine', dose: 100, unit: 'mg', medType: 'Bolus', route: 'IV' },
      { name: 'Push Midazolam 2mg', type: 'med', drug: 'Midazolam', dose: 2, unit: 'mg', medType: 'Bolus', route: 'IV' },
      { name: 'Push Dexmedetomidine 100mcg', type: 'med', drug: 'Dexmedetomidine', dose: 100, unit: 'mcg', medType: 'Bolus', route: 'IV' }
    ];
    const opioids = [
      { name: 'Push Fentanyl 100mcg', type: 'med', drug: 'Fentanyl', dose: 100, unit: 'mcg', medType: 'Bolus', route: 'IV' },
      { name: 'Push Sufentanil 10mcg', type: 'med', drug: 'Sufentanil', dose: 10, unit: 'mcg', medType: 'Bolus', route: 'IV' },
      { name: 'Push Remifentanil 100mcg', type: 'med', drug: 'Remifentanil', dose: 100, unit: 'mcg', medType: 'Bolus', route: 'IV' },
      { name: 'Push Morphine 5mg', type: 'med', drug: 'Morphine', dose: 5, unit: 'mg', medType: 'Bolus', route: 'IV' }
    ];
    const paralytics = [
      { name: 'Push Rocuronium 50mg', type: 'med', drug: 'Rocuronium', dose: 50, unit: 'mg', medType: 'Bolus', route: 'IV' },
      { name: 'Push Succinylcholine 100mg', type: 'med', drug: 'Succinylcholine', dose: 100, unit: 'mg', medType: 'Bolus', route: 'IV' },
      { name: 'Push Vecuronium 10mg', type: 'med', drug: 'Vecuronium', dose: 10, unit: 'mg', medType: 'Bolus', route: 'IV' },
      { name: 'Push Cisatracurium 10mg', type: 'med', drug: 'Cisatracurium', dose: 10, unit: 'mg', medType: 'Bolus', route: 'IV' }
    ];

    const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
    const shuffSed = shuffle(sedatives);
    const shuffOpi = shuffle(opioids);
    const shuffPar = shuffle(paralytics);

    fuzzerState.currentSequence = [
      shuffSed[0],
      { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 },
      shuffOpi[0],
      { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 },
      shuffPar[0],
      { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 }
    ];

    // Store remainder for pharmacological sweeps
    fuzzerState.remainingSedatives = shuffSed.slice(1);
    fuzzerState.remainingOpioids = shuffOpi.slice(1);
    fuzzerState.remainingParalytics = shuffPar.slice(1);

    fuzzerState.ultimatePhase = 'AIRWAY_MGMT';
    return fuzzerState.currentSequence.shift();
  }

  // 3. AIRWAY MANAGEMENT PHASE: Exhaustive tubes, compliance and rescue maneuvers
  if (fuzzerState.ultimatePhase === 'AIRWAY_MGMT') {
    fuzzerState.currentSequence = [
      { name: 'Perform BMV ventilation', type: 'procedure', action: 'bmv' },
      { name: 'Optimize Airway OPA', type: 'procedure', action: 'opa' },
      { name: "Perform Larson's Maneuver", type: 'maneuver' },
      { name: 'Suction pharynx', type: 'procedure', action: 'suction' },
      
      // Esophageal stress loop
      { name: 'Perform Laryngoscopy (ETT in esophagus)', type: 'procedure', action: 'laryngoscopy', tubePosition: 'esophagus' },
      { name: 'Set Vent RR 16', type: 'vent', field: 'rr', value: 16 },
      { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 },
      { name: 'Recognize Esophageal ETT: Remove ETT', type: 'procedure_action', actionName: 'remove_ett' },
      
      // Mainstem bronchus stress loop
      { name: 'Perform Laryngoscopy (ETT in mainstem)', type: 'procedure', action: 'laryngoscopy', tubePosition: 'right_mainstem' },
      { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 },
      { name: 'Recognize Mainstem: Pull back ETT', type: 'procedure_action', actionName: 'pull_back_ett' },
      
      // Normal tracheal placement
      { name: 'Check ETT Cuff Leak', type: 'check', action: 'cuff' },
      { name: 'Set Vent VT 500', type: 'vent', field: 'vt', value: 500 },
      { name: 'Set Vent FiO2 100%', type: 'vent', field: 'fio2', value: 100 },
      { name: 'Set Vent PEEP 5', type: 'vent', field: 'peep', value: 5 },
      { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 }
    ];
    fuzzerState.ultimatePhase = 'MAINTENANCE';
    return fuzzerState.currentSequence.shift();
  }

  // 4. MAINTENANCE PHASE: Diverse shuffled critical stresses and treatments
  if (fuzzerState.ultimatePhase === 'MAINTENANCE') {
    // Generate challenges array if empty
    if (!fuzzerState.maintenanceChallenges) {
      const challengesList = [
        // A. Incision hypertensive autonomic spike
        [
          { name: 'Change Surgical Phase to Incision', type: 'surgical_phase', value: 'Incision' },
          { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 },
          { name: 'Push Esmolol 20mg', type: 'med', drug: 'Esmolol', dose: 20, unit: 'mg', medType: 'Bolus', route: 'IV' },
          { name: 'Push Labetalol 20mg', type: 'med', drug: 'Labetalol', dose: 20, unit: 'mg', medType: 'Bolus', route: 'IV' },
          { name: 'Push Metoprolol 5mg', type: 'med', drug: 'Metoprolol', dose: 5, unit: 'mg', medType: 'Bolus', route: 'IV' },
          { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 }
        ],
        // B. ACLS VFib Cardiac Arrest
        [
          { name: 'Trigger VFib Cardiac Arrest', type: 'procedure_action', actionName: 'trigger_vfib' },
          { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 },
          { name: 'Toggle CPR compressions', type: 'cpr' },
          { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 },
          { name: 'Push Epinephrine 1mg (ACLS Arrest Dose)', type: 'med', drug: 'Epinephrine', dose: 1000, unit: 'mcg', medType: 'Bolus', route: 'IV' },
          { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 },
          { name: 'Deliver Defib Shock 200J', type: 'shock', joules: 200, sync: false },
          { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 }
        ],
        // C. ACLS Asystole/PEA Arrest
        [
          { name: 'Trigger Asystole Cardiac Arrest', type: 'procedure_action', actionName: 'trigger_asystole' },
          { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 },
          { name: 'Toggle CPR compressions', type: 'cpr' },
          { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 },
          { name: 'Push Epinephrine 1mg (ACLS Arrest Dose)', type: 'med', drug: 'Epinephrine', dose: 1000, unit: 'mcg', medType: 'Bolus', route: 'IV' },
          { name: 'Order POC ABG Panel', type: 'lab', labType: 'ABG' },
          { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 }
        ],
        // D. Sepsis / Vasoplegic Shock and Fluid Resus
        [
          { name: 'Trigger Sepsis Vasodilatory Shock', type: 'procedure_action', actionName: 'trigger_sepsis' },
          { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 },
          { name: 'Bolus LR 500mL', type: 'fluid', nameFluid: 'Lactated Ringers (LR)', volume: 500 },
          { name: 'Push Vasopressin 2 Units', type: 'med', drug: 'Vasopressin', dose: 2, unit: 'units', medType: 'Bolus', route: 'IV' },
          { name: 'Push Norepinephrine 16mcg', type: 'med', drug: 'Norepinephrine', dose: 16, unit: 'mcg', medType: 'Bolus', route: 'IV' },
          { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 }
        ],
        // E. Upregulated nAChR Succinylcholine Hyperkalemia
        [
          { name: 'Induce extrajunctional nAChR upregulation', type: 'procedure_action', actionName: 'upregulate_nachr' },
          { name: 'Push Succinylcholine 100mg', type: 'med', drug: 'Succinylcholine', dose: 100, unit: 'mg', medType: 'Bolus', route: 'IV' },
          { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 },
          { name: 'Push Calcium Chloride 1g', type: 'fluid', nameFluid: 'Calcium Chloride 1g', volume: 1 },
          { name: 'Order POC ABG Panel', type: 'lab', labType: 'ABG' },
          { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 }
        ],
        // F. Belmont IO Blowout Challenge
        [
          { name: 'Configure Belmont Rapid Infuser', type: 'procedure_action', actionName: 'set_belmont' },
          { name: 'Transfuse PRBC 1 Unit via IO', type: 'fluid', nameFluid: 'Packed Red Blood Cells (PRBC)', volume: 1, useIO: true },
          { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 },
          { name: 'Configure Belmont back to Gravity', type: 'procedure_action', actionName: 'set_gravity' },
          { name: 'Transfuse PRBC 1 Unit via CVC', type: 'fluid', nameFluid: 'Packed Red Blood Cells (PRBC)', volume: 1, useCVC: true },
          { name: 'Observe physiology for 20 seconds', type: 'wait', duration: 20 }
        ],
        // G. Arterial Line Accidental Bolus
        [
          { name: 'Accidental drug injection via Arterial Line', type: 'med', drug: 'Phenylephrine', dose: 100, unit: 'mcg', medType: 'Bolus', route: 'IV', useArterial: true },
          { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 }
        ],
        // H. Sweep Positionings
        [
          { name: 'Position Trendelenburg', type: 'position', value: 'Trendelenburg' },
          { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 },
          { name: 'Position Sitting', type: 'position', value: 'Sitting' },
          { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 },
          { name: 'Position Ramped', type: 'position', value: 'Ramped' },
          { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 },
          { name: 'Position Supine', type: 'position', value: 'Supine' }
        ],
        // I. Sweep Ventilator
        [
          { name: 'Set Vent RR 8', type: 'vent', field: 'rr', value: 8 },
          { name: 'Set Vent VT 350', type: 'vent', field: 'vt', value: 350 },
          { name: 'Set Vent PEEP 10', type: 'vent', field: 'peep', value: 10 },
          { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 },
          { name: 'Set Vent RR 20', type: 'vent', field: 'rr', value: 20 },
          { name: 'Set Vent VT 700', type: 'vent', field: 'vt', value: 700 },
          { name: 'Set Vent FiO2 40%', type: 'vent', field: 'fio2', value: 40 },
          { name: 'Observe physiology for 15 seconds', type: 'wait', duration: 15 }
        ],
        // J. Broad Pharmacopoeia Coverage Sweeps
        [
          { name: 'Push Amiodarone 150mg', type: 'med', drug: 'Amiodarone', dose: 150, unit: 'mg', medType: 'Bolus', route: 'IV' },
          { name: 'Push Lidocaine 100mg', type: 'med', drug: 'Lidocaine', dose: 100, unit: 'mg', medType: 'Bolus', route: 'IV' },
          { name: 'Push Furosemide 20mg', type: 'med', drug: 'Furosemide', dose: 20, unit: 'mg', medType: 'Bolus', route: 'IV' },
          { name: 'Push Ampicillin/Sulbactam 3g', type: 'med', drug: 'Unasyn', dose: 3, unit: 'g', medType: 'Bolus', route: 'IV' },
          { name: 'Push Nitroprusside 100mcg', type: 'med', drug: 'Nitroprusside', dose: 100, unit: 'mcg', medType: 'Bolus', route: 'IV' },
          { name: 'Transfuse Albumin 5% 250mL', type: 'fluid', nameFluid: 'Albumin 5%', volume: 250 },
          { name: 'Transfuse Hetastarch 6% 500mL', type: 'fluid', nameFluid: 'Hetastarch 6%', volume: 500 },
          { name: 'Observe physiology for 20 seconds', type: 'wait', duration: 20 }
        ]
      ];

      // Add remaining sedatives/opioids/paralytics to pharmacopoeia sweeps
      const remainingMeds = [];
      if (fuzzerState.remainingSedatives) {
        fuzzerState.remainingSedatives.forEach(m => remainingMeds.push(m));
      }
      if (fuzzerState.remainingOpioids) {
        fuzzerState.remainingOpioids.forEach(m => remainingMeds.push(m));
      }
      if (fuzzerState.remainingParalytics) {
        fuzzerState.remainingParalytics.forEach(m => remainingMeds.push(m));
      }

      if (remainingMeds.length > 0) {
        const pharmacopoeiaSeq = remainingMeds.flatMap(m => [m, { name: 'Observe physiology for 5 seconds', type: 'wait', duration: 5 }]);
        challengesList.push(pharmacopoeiaSeq);
      }

      // Shuffle challenges
      fuzzerState.maintenanceChallenges = challengesList.sort(() => Math.random() - 0.5);
    }

    if (fuzzerState.maintenanceChallenges.length > 0) {
      fuzzerState.currentSequence = fuzzerState.maintenanceChallenges.shift();
      return fuzzerState.currentSequence.shift();
    } else {
      fuzzerState.ultimatePhase = 'EMERGENCE';
    }
  }

  // 5. EMERGENCE PHASE: Stop maintenance, test reversals, extubate
  if (fuzzerState.ultimatePhase === 'EMERGENCE') {
    fuzzerState.currentSequence = [
      { name: 'Change Surgical Phase to Emergence', type: 'surgical_phase', value: 'Emergence' },
      
      // Stop continuous infusions
      { name: 'Stop Norepinephrine infusion', type: 'med', drug: 'Norepinephrine', medType: 'Stop Infusion' },
      
      // Reversals: Unopposed Muscarinic Bradycardia test
      { name: 'Push Neostigmine 5mg (Without Glyco)', type: 'med', drug: 'Neostigmine', dose: 5, unit: 'mg', medType: 'Bolus', route: 'IV' },
      { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 },
      // Rescue muscarinic antagonist glycopyrrolate
      { name: 'Push Glycopyrrolate 0.2mg', type: 'med', drug: 'Glycopyrrolate', dose: 0.2, unit: 'mg', medType: 'Bolus', route: 'IV' },
      { name: 'Push Atropine 1mg', type: 'med', drug: 'Atropine', dose: 1, unit: 'mg', medType: 'Bolus', route: 'IV' },
      
      // Systematic reversals
      { name: 'Push Sugammadex 1000mg (Rescue/Deep)', type: 'med', drug: 'Sugammadex', dose: 1000, unit: 'mg', medType: 'Bolus', route: 'IV' },
      { name: 'Push Flumazenil 0.5mg', type: 'med', drug: 'Flumazenil', dose: 0.5, unit: 'mg', medType: 'Bolus', route: 'IV' },
      { name: 'Set Vent RR 0 (Spontaneous Mode)', type: 'vent', field: 'rr', value: 0 },
      { name: 'Observe physiology for 15 seconds', type: 'wait', duration: 15 },
      
      // Extubation
      { name: 'Perform Tracheal Extubation', type: 'extubate' },
      { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 }
    ];
    fuzzerState.ultimatePhase = 'POST_OP';
    return fuzzerState.currentSequence.shift();
  }

  // 6. POST-OP PHASE: Patient is stable and recovering
  return { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 };
}

/**
 * Central clinically reactive maintenance phase action generator.
 * Actively monitors patient status, treats hemodynamic instability (MAP, HR),
 * manages anesthetic depth (BIS), orders labs, adjusts ventilator settings,
 * and schedules time delays to allow PK/PD kinetics to manifest.
 */
function generateMaintenanceAction(state, fuzzerState, strategy) {
  const vitals = state.vitals || {};
  const patient = state.patient || {};
  const activeMeds = state.activeMeds || [];

  // 1. Hypotension check (MAP < 65) - Clinically react with fluids or pressors
  if (vitals.map < 65 && !patient.isArrest) {
    if (strategy === 'malpractice' && Math.random() < 0.20) {
      // Malpractice: Extreme Epinephrine bolus overdose (1mg/1000mcg instead of pressor push)
      return { name: 'Push Epinephrine 1mg (ACLS Arrest Dose)', type: 'med', drug: 'Epinephrine', dose: 1000, unit: 'mcg', medType: 'Bolus', route: 'IV' };
    }
    
    const pChoice = Math.random();
    if (pChoice < 0.3 && patient.ebl > 1500) {
      return { name: 'Transfuse PRBC 1 Unit', type: 'fluid', nameFluid: 'Packed Red Blood Cells (PRBC)', volume: 1 };
    } else if (pChoice < 0.6) {
      return { name: 'Bolus LR 500mL', type: 'fluid', nameFluid: 'Lactated Ringers (LR)', volume: 500 };
    } else {
      const vasopressor = Math.random() > 0.5 ? 'Phenylephrine' : 'Epinephrine';
      const dose = vasopressor === 'Phenylephrine' ? 100 : 50;
      return { name: `Push ${vasopressor} ${dose}mcg`, type: 'med', drug: vasopressor, dose, unit: 'mcg', medType: 'Bolus', route: 'IV' };
    }
  }

  // 2. Hypertension/Tachycardia check (MAP > 110 or HR > 110) - Treat with beta blockers
  if ((vitals.map > 110 || vitals.hr > 110) && !patient.isArrest) {
    if (strategy === 'malpractice' && vitals.hr < 60 && Math.random() < 0.35) {
      // Malpractice: Pushing beta-blocker in severe bradycardia
      return { name: 'Push Metoprolol 5mg', type: 'med', drug: 'Metoprolol', dose: 5, unit: 'mg', medType: 'Bolus', route: 'IV' };
    }
    return Math.random() > 0.5 
      ? { name: 'Push Esmolol 20mg', type: 'med', drug: 'Esmolol', dose: 20, unit: 'mg', medType: 'Bolus', route: 'IV' }
      : { name: 'Push Labetalol 20mg', type: 'med', drug: 'Labetalol', dose: 20, unit: 'mg', medType: 'Bolus', route: 'IV' };
  }

  // 3. Awareness risk / Wake-up (BIS > 65) - Deepen anesthesia
  if (vitals.bis > 65 && !patient.isArrest) {
    return Math.random() > 0.5 
      ? { name: 'Push Propofol 150mg', type: 'med', drug: 'Propofol', dose: 150, unit: 'mg', medType: 'Bolus', route: 'IV' }
      : { name: 'Push Fentanyl 100mcg', type: 'med', drug: 'Fentanyl', dose: 100, unit: 'mcg', medType: 'Bolus', route: 'IV' };
  }

  // 4. Neuromuscular recovery check (Stress NMJ chelation/reversal loops)
  const rocuroniumCe = activeMeds.find(m => m.name === 'Rocuronium')?.Ce || 0;
  if (rocuroniumCe > 0.1 && Math.random() < 0.20) {
    if (strategy === 'polypharmacy') {
      // Test complex chelation and muscarinic antagonism
      fuzzerState.currentSequence = [
        { name: 'Push Sugammadex 1000mg (Rescue/Deep)', type: 'med', drug: 'Sugammadex', dose: 1000, unit: 'mg', medType: 'Bolus', route: 'IV' },
        { name: 'Push Neostigmine 5mg (Without Glyco)', type: 'med', drug: 'Neostigmine', dose: 5, unit: 'mg', medType: 'Bolus', route: 'IV' },
        { name: 'Push Glycopyrrolate 0.2mg', type: 'med', drug: 'Glycopyrrolate', dose: 0.2, unit: 'mg', medType: 'Bolus', route: 'IV' },
        { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 }
      ];
      return fuzzerState.currentSequence.shift();
    } else if (strategy === 'malpractice') {
      // Trigger unopposed muscarinic bradycardia
      return { name: 'Push Neostigmine 5mg (Without Glyco)', type: 'med', drug: 'Neostigmine', dose: 5, unit: 'mg', medType: 'Bolus', route: 'IV' };
    } else {
      return { name: 'Push Sugammadex 200mg (Routine)', type: 'med', drug: 'Sugammadex', dose: 200, unit: 'mg', medType: 'Bolus', route: 'IV' };
    }
  }

  // 5. Active Cardiac Arrest Emergency ACLS
  if (patient.isArrest) {
    const arrestChoice = Math.random();
    if (!patient.cprActive) {
      return { name: 'Toggle CPR compressions', type: 'cpr' };
    } else if (arrestChoice < 0.4) {
      return { name: 'Push Epinephrine 1mg (ACLS Arrest Dose)', type: 'med', drug: 'Epinephrine', dose: 1000, unit: 'mcg', medType: 'Bolus', route: 'IV' };
    } else if (arrestChoice < 0.7 && (patient.cardiacRhythm === 'vfib' || patient.cardiacRhythm === 'vtach')) {
      return { name: 'Deliver Defib Shock 200J', type: 'shock', joules: 200, sync: false };
    } else {
      return { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 };
    }
  }

  // 6. Polypharmacy custom drug blending override
  if (strategy === 'polypharmacy' && Math.random() < 0.15) {
    const medsList = ['Ketamine', 'Etomidate', 'Midazolam', 'Sufentanil'];
    const selectedMed = medsList[Math.floor(Math.random() * medsList.length)];
    const dose = selectedMed === 'Midazolam' ? 2 : (selectedMed === 'Sufentanil' ? 10 : 50);
    return { name: `Push ${selectedMed} ${dose}${selectedMed === 'Sufentanil' ? 'mcg' : 'mg'}`, type: 'med', drug: selectedMed, dose, unit: selectedMed === 'Sufentanil' ? 'mcg' : 'mg', medType: 'Bolus', route: 'IV' };
  }

  // 7. Mechanical failure troubleshooting / circuit leak override
  if (strategy === 'mechanical' && Math.random() < 0.20) {
    const mechChoice = Math.random();
    if (mechChoice < 0.4 && patient.tubePosition !== 'esophagus') {
      return { name: 'Set Vent PEEP 0 (Circuit Leak)', type: 'vent', field: 'peep', value: 0 };
    } else if (mechChoice < 0.7 && patient.tubePosition === 'right_mainstem') {
      return { name: 'Recognize Mainstem: Pull back ETT', type: 'procedure_action', actionName: 'pull_back_ett' };
    } else {
      return { name: 'Check ETT Cuff Leak', type: 'check', action: 'cuff' };
    }
  }

  // 8. General Maintenance Pool (40% Observe/Wait, 20% Vent adjustments, 15% Labs, 15% Positions, 10% Procedures)
  const activityChoice = Math.random();
  if (activityChoice < 0.40) {
    // Periodic wait to let drug kinetics/ventilation run (inflection timer delays)
    const duration = Math.random() > 0.5 ? 10 : 30;
    return { name: `Observe physiological circulation (t+${duration}s)`, type: 'wait', duration };
  } else if (activityChoice < 0.60) {
    // Vent settings adjustment
    const fields = ['rr', 'peep', 'vt', 'fio2'];
    const field = fields[Math.floor(Math.random() * fields.length)];
    let val = 12;
    if (field === 'rr') val = Math.random() > 0.5 ? 10 : 16;
    else if (field === 'peep') val = Math.random() > 0.5 ? 5 : 8;
    else if (field === 'vt') val = Math.random() > 0.5 ? 400 : 600;
    else if (field === 'fio2') val = Math.random() > 0.5 ? 40 : 100;
    return { name: `Set Vent ${field} to ${val}`, type: 'vent', field, value: val };
  } else if (activityChoice < 0.75) {
    // Lab Diagnostics
    const labs = ['ABG', 'VBG', 'TEG', 'CBC'];
    const labType = labs[Math.floor(Math.random() * labs.length)];
    return { name: `Order POC ${labType} Panel`, type: 'lab', labType };
  } else if (activityChoice < 0.90) {
    // Positioning shifts
    const positions = ['Supine', 'Trendelenburg', 'Sitting', 'Ramped'];
    const p = positions[Math.floor(Math.random() * positions.length)];
    return { name: `Position ${p}`, type: 'position', value: p };
  } else {
    // Pharyngeal suction / OPA / Larstons
    return Math.random() > 0.5 
      ? { name: 'Suction pharynx', type: 'procedure', action: 'suction' }
      : { name: "Perform Larson's Maneuver", type: 'maneuver' };
  }
}

/**
 * Archetype A: The "Polypharmacy & Synergism" Fuzzer
 * Goal: Blends multiple drugs, reversals, and vasoactives to check for physiological model scaling bugs.
 */
function generatePolypharmacyAction(state, fuzzerState, flags) {
  const activeMeds = state.activeMeds || [];
  const vitals = state.vitals || {};
  const patient = state.patient || {};

  // Pre-Op Phase: Establish IV, Arterial line, CVC, and hook up monitors
  if (fuzzerState.phase === 'PRE_OP') {
    if (!flags.hasIV) {
      return { name: 'Place 18G PIV Right Forearm', type: 'line', category: 'Peripheral IV', lType: '18G Peripheral IV', location: 'Right Forearm' };
    }
    if (!flags.hasArtLine) {
      return { name: 'Place Radial Arterial Line', type: 'line', category: 'Arterial Line', lType: 'Radial Arterial Line', location: 'Left Radial' };
    }
    if (!flags.hasMonitors) {
      fuzzerState.currentSequence = [
        { name: 'Attach BIS Monitor', type: 'procedure_action', actionName: 'attach_bis' },
        { name: 'Attach TOF Monitor', type: 'procedure_action', actionName: 'attach_tof' },
        { name: 'Position Sniffing', type: 'position', value: 'Sniffing' }
      ];
      return fuzzerState.currentSequence.shift();
    }
  }

  // Induction: Synergistic Blending of Midazolam + Fentanyl + Propofol + Rocuronium
  if (fuzzerState.phase === 'INDUCTION') {
    fuzzerState.currentSequence = [
      { name: 'Push Midazolam 2mg', type: 'med', drug: 'Midazolam', dose: 2, unit: 'mg', medType: 'Bolus', route: 'IV' },
      { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 },
      { name: 'Push Fentanyl 100mcg', type: 'med', drug: 'Fentanyl', dose: 100, unit: 'mcg', medType: 'Bolus', route: 'IV' },
      { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 },
      { name: 'Push Propofol 150mg', type: 'med', drug: 'Propofol', dose: 150, unit: 'mg', medType: 'Bolus', route: 'IV' },
      // Wait for peak Propofol effect-site concentration (Cmax) at 60s
      { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 },
      { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 },
      // Push muscle relaxants (Polypharmacy blend: Rocuronium + Vecuronium)
      { name: 'Push Rocuronium 50mg', type: 'med', drug: 'Rocuronium', dose: 50, unit: 'mg', medType: 'Bolus', route: 'IV' },
      { name: 'Push Vecuronium 10mg', type: 'med', drug: 'Vecuronium', dose: 10, unit: 'mg', medType: 'Bolus', route: 'IV' },
      // Wait precisely for Rocuronium Cmax (onset window) at 90s
      { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 },
      { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 },
      { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 }
    ];
    fuzzerState.phase = 'AIRWAY_MGMT';
    return fuzzerState.currentSequence.shift();
  }

  // Airway: Pre-ox LMA / ETT
  if (fuzzerState.phase === 'AIRWAY_MGMT') {
    fuzzerState.currentSequence = [
      { name: 'Perform Laryngoscopy (ETT in trachea)', type: 'procedure', action: 'laryngoscopy', tubePosition: 'trachea' },
      { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 },
      { name: 'Set Vent RR 16', type: 'vent', field: 'rr', value: 16 },
      { name: 'Set Vent FiO2 100%', type: 'vent', field: 'fio2', value: 100 }
    ];
    fuzzerState.phase = 'MAINTENANCE';
    return fuzzerState.currentSequence.shift();
  }

  // Maintenance: Compound interactions, Vasoactive titrations, Fluid Hemodilution
  if (fuzzerState.phase === 'MAINTENANCE') {
    return generateMaintenanceAction(state, fuzzerState, 'polypharmacy');
  }

  return { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 };
}

/**
 * Archetype B: The "Human Error / Malpractice" Fuzzer
 * Goal: Simulates classic, high-risk clinical errors (sloppy timing, massive dosing, and fixation bias).
 */
function generateMalpracticeAction(state, fuzzerState, flags) {
  const vitals = state.vitals || {};
  const patient = state.patient || {};
  const activeMeds = state.activeMeds || [];

  // Setup: Attach monitors but skip pre-op safeguards (Checklists, NPO review)
  if (fuzzerState.phase === 'PRE_OP') {
    if (!flags.hasIV) {
      return { name: 'Place 18G PIV Right Forearm', type: 'line', category: 'Peripheral IV', lType: '18G Peripheral IV', location: 'Right Forearm' };
    }
    if (!flags.hasMonitors) {
      fuzzerState.currentSequence = [
        { name: 'Attach BIS Monitor', type: 'procedure_action', actionName: 'attach_bis' },
        { name: 'Attach TOF Monitor', type: 'procedure_action', actionName: 'attach_tof' }
      ];
      return fuzzerState.currentSequence.shift();
    }
  }

  // Induction: Human Error Dosing and Timing Mistakes
  if (fuzzerState.phase === 'INDUCTION') {
    const errorType = Math.random();
    if (errorType < 0.33) {
      // 1. Massive 10x Propofol Overdose
      fuzzerState.currentSequence = [
        { name: 'Push Propofol 1500mg (10x Overdose)', type: 'med', drug: 'Propofol', dose: 1500, unit: 'mg', medType: 'Bolus', route: 'IV' },
        { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 },
        { name: 'Push Rocuronium 50mg', type: 'med', drug: 'Rocuronium', dose: 50, unit: 'mg', medType: 'Bolus', route: 'IV' },
        // Timing Malpractice: Attempt intubation immediately after paralytic push (onset takes 60-90s, we wait 5s!)
        { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 },
        { name: 'Perform Laryngoscopy (ETT in esophagus)', type: 'procedure', action: 'laryngoscopy', tubePosition: 'esophagus' }
      ];
    } else if (errorType < 0.66) {
      // 2. Sub-therapeutic Propofol (leads to awareness and severe sympathetic surge upon intubation attempt)
      fuzzerState.currentSequence = [
        { name: 'Push Propofol 10mg (Sub-therapeutic)', type: 'med', drug: 'Propofol', dose: 10, unit: 'mg', medType: 'Bolus', route: 'IV' },
        { name: 'Push Fentanyl 100mcg', type: 'med', drug: 'Fentanyl', dose: 100, unit: 'mcg', medType: 'Bolus', route: 'IV' },
        { name: 'Push Rocuronium 50mg', type: 'med', drug: 'Rocuronium', dose: 50, unit: 'mg', medType: 'Bolus', route: 'IV' },
        { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 },
        { name: 'Perform Laryngoscopy (ETT in trachea)', type: 'procedure', action: 'laryngoscopy', tubePosition: 'trachea' }
      ];
    } else {
      // 3. Neostigmine reversal without Glycopyrrolate (triggers vagal cardiac bradycardia surge/asystole)
      fuzzerState.currentSequence = [
        { name: 'Push Propofol 150mg', type: 'med', drug: 'Propofol', dose: 150, unit: 'mg', medType: 'Bolus', route: 'IV' },
        { name: 'Push Rocuronium 50mg', type: 'med', drug: 'Rocuronium', dose: 50, unit: 'mg', medType: 'Bolus', route: 'IV' },
        { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 },
        { name: 'Perform Laryngoscopy (ETT in trachea)', type: 'procedure', action: 'laryngoscopy', tubePosition: 'trachea' },
        { name: 'Set Vent RR 16', type: 'vent', field: 'rr', value: 16 },
        { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 },
        { name: 'Push Neostigmine 5mg (Without Glyco)', type: 'med', drug: 'Neostigmine', dose: 5, unit: 'mg', medType: 'Bolus', route: 'IV' }
      ];
    }
    fuzzerState.phase = 'AIRWAY_MGMT';
    return fuzzerState.currentSequence.shift();
  }

  // Airway & Maintenance: Fixation Bias Simulation
  if (fuzzerState.phase === 'AIRWAY_MGMT' || fuzzerState.phase === 'MAINTENANCE') {
    // Fixation Bias: If patient SpO2 drops severely during difficult intubation, 
    // keep repeatedly attempting laryngoscopy instead of bag ventilation or ventilating with O2.
    if (vitals.spo2 < 85) {
      fuzzerState.attemptCount++;
      if (fuzzerState.attemptCount <= 3) {
        fuzzerState.currentSequence = [
          { name: `Failed Intubation attempt #${fuzzerState.attemptCount} (Fixation Bias)`, type: 'procedure', action: 'laryngoscopy', tubePosition: 'esophagus' },
          { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 }
        ];
        return fuzzerState.currentSequence.shift();
      } else {
        // Finally try rescue CPR if they went into cardiac arrest, or rescue ACLS epinephrine bolus (1mg - 1000mcg)
        fuzzerState.attemptCount = 0;
        if (patient.isArrest) {
          fuzzerState.currentSequence = [
            { name: 'Toggle CPR compressions', type: 'cpr' },
            { name: 'Push Epinephrine 1mg (ACLS Arrest Dose)', type: 'med', drug: 'Epinephrine', dose: 1000, unit: 'mcg', medType: 'Bolus', route: 'IV' },
            { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 }
          ];
          return fuzzerState.currentSequence.shift();
        } else {
          return { name: 'Perform BMV ventilation', type: 'procedure', action: 'bmv' };
        }
      }
    }

    // Default Malpractice maintenance: Let gases drift or trigger apneic/vasoplegic errors
    return generateMaintenanceAction(state, fuzzerState, 'malpractice');
  }

  return { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 };
}

/**
 * Archetype C: The "Hardware & Mechanical Failure" Fuzzer
 * Goal: Progressively introduces circuit leaks, kinking, and tube misplacement cascading loops.
 */
function generateMechanicalFailureAction(state, fuzzerState, flags) {
  const vitals = state.vitals || {};
  const patient = state.patient || {};

  // Pre-Op Setup
  if (fuzzerState.phase === 'PRE_OP') {
    if (!flags.hasIV) {
      return { name: 'Place 18G PIV Right Forearm', type: 'line', category: 'Peripheral IV', lType: '18G Peripheral IV', location: 'Right Forearm' };
    }
    if (!flags.hasMonitors) {
      fuzzerState.currentSequence = [
        { name: 'Attach BIS Monitor', type: 'procedure_action', actionName: 'attach_bis' },
        { name: 'Attach TOF Monitor', type: 'procedure_action', actionName: 'attach_tof' }
      ];
      return fuzzerState.currentSequence.shift();
    }
  }

  // Induction
  if (fuzzerState.phase === 'INDUCTION') {
    fuzzerState.currentSequence = [
      { name: 'Push Propofol 150mg', type: 'med', drug: 'Propofol', dose: 150, unit: 'mg', medType: 'Bolus', route: 'IV' },
      { name: 'Push Rocuronium 50mg', type: 'med', drug: 'Rocuronium', dose: 50, unit: 'mg', medType: 'Bolus', route: 'IV' },
      { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 }
    ];
    fuzzerState.phase = 'AIRWAY_MGMT';
    return fuzzerState.currentSequence.shift();
  }

  // Airway: Mechanical Failures (Esophageal placement, Mainstem, or tube kinking)
  if (fuzzerState.phase === 'AIRWAY_MGMT') {
    const mechanicalTrouble = Math.random();
    if (mechanicalTrouble < 0.4) {
      // 1. Esophageal Intubation (checks if EtCO2 correctly drops to 0)
      fuzzerState.currentSequence = [
        { name: 'Perform Laryngoscopy (ETT in esophagus)', type: 'procedure', action: 'laryngoscopy', tubePosition: 'esophagus' },
        { name: 'Set Vent RR 16', type: 'vent', field: 'rr', value: 16 },
        { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 }
      ];
    } else if (mechanicalTrouble < 0.7) {
      // 2. Right Mainstem Bronchus placement (causes asymmetric ventilation, compliance drop, slow hypoxia)
      fuzzerState.currentSequence = [
        { name: 'Perform Laryngoscopy (ETT in mainstem)', type: 'procedure', action: 'laryngoscopy', tubePosition: 'right_mainstem' },
        { name: 'Set Vent RR 16', type: 'vent', field: 'rr', value: 16 },
        { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 }
      ];
    } else {
      // 3. ETT Cuff Leak / circuit leak adjustment
      fuzzerState.currentSequence = [
        { name: 'Perform Laryngoscopy (ETT in trachea)', type: 'procedure', action: 'laryngoscopy', tubePosition: 'trachea' },
        { name: 'Set Vent RR 16', type: 'vent', field: 'rr', value: 16 },
        { name: 'Set Vent PEEP 0 (Circuit Leak)', type: 'vent', field: 'peep', value: 0 },
        { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 }
      ];
    }
    fuzzerState.phase = 'MAINTENANCE';
    return fuzzerState.currentSequence.shift();
  }

  // Maintenance: Progressive troubleshooting or cascading circuit issues
  if (fuzzerState.phase === 'MAINTENANCE') {
    // If tube is in esophagus, fuzzer must troubleshooting or suffer desaturation
    if (patient.tubePosition === 'esophagus' && vitals.spo2 < 90) {
      fuzzerState.currentSequence = [
        { name: 'Recognize Esophageal ETT: Remove ETT', type: 'procedure_action', actionName: 'remove_ett' },
        { name: 'Perform BMV ventilation', type: 'procedure', action: 'bmv' },
        { name: 'Optimize Airway OPA', type: 'procedure', action: 'opa' },
        { name: 'Observe physiology for 20 seconds', type: 'wait', duration: 20 },
        { name: 'Re-attempt Laryngoscopy (ETT in trachea)', type: 'procedure', action: 'laryngoscopy', tubePosition: 'trachea' }
      ];
      return fuzzerState.currentSequence.shift();
    }

    if (patient.tubePosition === 'right_mainstem' && vitals.spo2 < 92) {
      // Mainstem: Pull back tube to trachea
      fuzzerState.currentSequence = [
        { name: 'Recognize Mainstem: Pull back ETT', type: 'procedure_action', actionName: 'pull_back_ett' },
        { name: 'Observe physiology for 20 seconds', type: 'wait', duration: 20 }
      ];
      return fuzzerState.currentSequence.shift();
    }

    // Default mechanical adjustments
    return generateMaintenanceAction(state, fuzzerState, 'mechanical');
  }

  return { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 };
}

/**
 * Standard Guided Fuzzer Pathway (General case progression)
 */
function generateStandardGuidedAction(state, fuzzerState, flags) {
  if (fuzzerState.phase === 'PRE_OP') {
    if (!flags.hasIV) {
      return { name: 'Place 18G PIV Right Forearm', type: 'line', category: 'Peripheral IV', lType: '18G Peripheral IV', location: 'Right Forearm' };
    }
    if (!flags.hasMonitors) {
      fuzzerState.currentSequence = [
        { name: 'Attach BIS Monitor', type: 'procedure_action', actionName: 'attach_bis' },
        { name: 'Attach TOF Monitor', type: 'procedure_action', actionName: 'attach_tof' },
        { name: 'Complete MSMAIDS Checklist', type: 'procedure_action', actionName: 'msmaids' }
      ];
      return fuzzerState.currentSequence.shift();
    }
  }

  if (fuzzerState.phase === 'INDUCTION') {
    fuzzerState.currentSequence = [
      { name: 'Push Fentanyl 100mcg', type: 'med', drug: 'Fentanyl', dose: 100, unit: 'mcg', medType: 'Bolus', route: 'IV' },
      { name: 'Push Propofol 150mg', type: 'med', drug: 'Propofol', dose: 150, unit: 'mg', medType: 'Bolus', route: 'IV' },
      { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 },
      { name: 'Push Rocuronium 50mg', type: 'med', drug: 'Rocuronium', dose: 50, unit: 'mg', medType: 'Bolus', route: 'IV' },
      { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 },
      { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 }
    ];
    fuzzerState.phase = 'AIRWAY_MGMT';
    return fuzzerState.currentSequence.shift();
  }

  if (fuzzerState.phase === 'AIRWAY_MGMT') {
    fuzzerState.currentSequence = [
      { name: 'Perform Laryngoscopy (ETT in trachea)', type: 'procedure', action: 'laryngoscopy', tubePosition: 'trachea' },
      { name: 'Set Vent RR 16', type: 'vent', field: 'rr', value: 16 },
      { name: 'Set Vent FiO2 100%', type: 'vent', field: 'fio2', value: 100 }
    ];
    fuzzerState.phase = 'MAINTENANCE';
    return fuzzerState.currentSequence.shift();
  }

  if (fuzzerState.phase === 'MAINTENANCE') {
    return generateMaintenanceAction(state, fuzzerState, 'guided');
  }

  return { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 };
}

/**
 * Dispatches a generated fuzzer action onto the simulator state methods.
 */
export function executeFuzzAction(action, {
  setPatient,
  handleProcessMed,
  handlePushMed,
  handlePushFluid,
  handleSetVentSettings,
  handleSetO2,
  handleToggleCPR,
  handleDeliverShock,
  establishAccess,
  performLarsonManeuver,
  checkCuffLeak,
  examineNpoHistory,
  generateLab,
  logEvent,
  patient,
  setSurgicalPhase,
  handleExtubation
}) {
  let lineId = null;
  if (patient.accessLines && patient.accessLines.length > 0) {
    if (action.useArterial) {
      const artLine = patient.accessLines.find(l => l.category?.includes('Arterial') || l.name?.includes('Arterial'));
      if (artLine) lineId = artLine.id;
    } else if (action.useIO) {
      const ioLine = patient.accessLines.find(l => !l.failed && (l.category?.includes('IO') || l.name?.includes('IO')));
      if (ioLine) lineId = ioLine.id;
    } else if (action.useCVC) {
      const cvcLine = patient.accessLines.find(l => !l.failed && (l.category?.includes('CVC') || l.name?.includes('CVC') || l.type?.includes('CVC') || l.type?.includes('Cordis') || l.type?.includes('Introducer')));
      if (cvcLine) lineId = cvcLine.id;
    } else if (action.usePIV) {
      const pivLine = patient.accessLines.find(l => !l.failed && (l.category?.includes('PIV') || l.name?.includes('PIV')));
      if (pivLine) lineId = pivLine.id;
    }
    
    // Fallback: Use the first non-failed venous line, or just first line
    if (!lineId) {
      const venousLine = patient.accessLines.find(l => !l.failed && !l.category?.includes('Arterial'));
      lineId = venousLine ? venousLine.id : patient.accessLines[0].id;
    }
  }

  try {
    switch (action.type) {
      case 'med':
        handleProcessMed(action.drug.toLowerCase(), action.dose, action.route, action.medType, action.unit, lineId);
        return `Push ${action.drug} ${action.dose}${action.unit} ${action.route}`;
        
      case 'fluid':
        if (lineId) {
          handlePushFluid(action.nameFluid, action.volume, lineId);
          return `Resus: ${action.volume} unit/mL of ${action.nameFluid}`;
        }
        return 'Fluid skipped (No IV access)';
        
      case 'position':
        setPatient(p => ({ ...p, position: action.value }));
        logEvent(`Position adjusted to: ${action.value}. FRC compliance shifting.`);
        return `Change position to ${action.value}`;
        
      case 'vent':
        handleSetVentSettings({ [action.field]: action.value });
        return `Adjust Vent ${action.field} to ${action.value}`;
        
      case 'o2':
        if (handleSetO2) {
          handleSetO2(action.device, action.flow, action.fio2, action.ipap, action.epap, action.rate);
          return `Set Oxygen Device: ${action.device} (FiO2: ${action.fio2}%)`;
        }
        return 'O2 adjust skipped (Handler unavailable)';

      case 'cpr':
        if (handleToggleCPR) {
          handleToggleCPR();
          return 'Initiated chest compressions (CPR)';
        }
        return 'CPR toggle skipped';

      case 'shock':
        if (handleDeliverShock) {
          handleDeliverShock(action.joules, action.sync);
          return `Delivered ${action.joules}J ${action.sync ? 'Synchronized' : 'Biphasic Defib'} Shock`;
        }
        return 'Defib shock skipped';

      case 'line':
        if (establishAccess) {
          establishAccess(action.category, action.lType, action.location);
          return `Vascular Access: Placed ${action.lType} in ${action.location}`;
        }
        return 'Line placement skipped';

      case 'maneuver':
        if (performLarsonManeuver) {
          performLarsonManeuver();
          return "Perform Larson's Maneuver";
        }
        return 'Maneuver skipped';

      case 'check':
        if (action.action === 'cuff') {
          if (checkCuffLeak) {
            checkCuffLeak();
            return 'Check ETT Cuff Leak';
          }
        } else if (action.action === 'npo') {
          if (examineNpoHistory) {
            examineNpoHistory();
            return 'Review Fasting NPO History';
          }
        }
        return 'Check skipped';

      case 'surgical_phase':
        if (setSurgicalPhase) {
          setSurgicalPhase(action.value);
          logEvent(`Surgical Phase advanced to: ${action.value}. Stimulus level adjusting.`);
          return `Surgical Phase changed to ${action.value}`;
        }
        return 'Surgical Phase change skipped (Handler unavailable)';

      case 'extubate':
        if (handleExtubation) {
          handleExtubation();
          return 'Tracheal Extubation performed';
        }
        return 'Extubation skipped (Handler unavailable)';

      case 'procedure_action':
        // Custom UI procedures
        if (action.actionName === 'msmaids') {
          setPatient(p => ({ ...p, msmaidsComplete: true }));
          logEvent("Verified MSMAIDS Equipment Checklist.");
          return 'Complete MSMAIDS Checklist';
        } else if (action.actionName === 'attach_bis') {
          setPatient(p => ({ ...p, hasBisMonitor: true }));
          logEvent("Attached Bispectral Index (BIS) Brain Monitor.");
          return 'Attached BIS Brain Monitor';
        } else if (action.actionName === 'attach_tof') {
          setPatient(p => ({ ...p, hasTofMonitor: true }));
          logEvent("Attached Train-Of-Four (TOF) Neuromuscular Monitor.");
          return 'Attached TOF Twitch Monitor';
        } else if (action.actionName === 'remove_ett') {
          setPatient(p => ({ ...p, airwaySecured: false, tubePosition: null, ventilationStatus: 'spontaneous' }));
          logEvent("Removed misplaced Endotracheal Tube.");
          return 'Misplaced ETT removed';
        } else if (action.actionName === 'pull_back_ett') {
          setPatient(p => ({ ...p, tubePosition: 'trachea' }));
          logEvent("Pulled back Endotracheal Tube into Trachea.");
          return 'Pulled back ETT into tracheal position';
        } else if (action.actionName === 'trigger_vfib') {
          setPatient(p => ({ ...p, isArrest: true, cardiacRhythm: 'vfib' }));
          logEvent("🚨 CLINICAL CRISIS: Ventricular Fibrillation (VFib) Cardiac Arrest triggered!");
          return 'VFib Cardiac Arrest triggered';
        } else if (action.actionName === 'trigger_asystole') {
          setPatient(p => ({ ...p, isArrest: true, cardiacRhythm: 'asystole' }));
          logEvent("🚨 CLINICAL CRISIS: Asystole Cardiac Arrest triggered!");
          return 'Asystole Cardiac Arrest triggered';
        } else if (action.actionName === 'trigger_sepsis') {
          setPatient(p => ({ ...p, isSeptic: true }));
          logEvent("🚨 CLINICAL CRISIS: Sepsis induced! Severe vasodilation and systemic inflammatory response active.");
          return 'Sepsis vasodilatory shock triggered';
        } else if (action.actionName === 'upregulate_nachr') {
          setPatient(p => ({ ...p, nAChR_state: 'upregulated' }));
          logEvent("⚠️ Pathology: Upregulated extrajunctional nAChR receptors induced.");
          return 'nAChR receptors upregulated';
        } else if (action.actionName === 'set_belmont') {
          setPatient(p => ({ ...p, fluidLine: 'belmont' }));
          logEvent("🔧 Fluid Infusion Mode: Switched to Belmont Rapid Infuser.");
          return 'Belmont Rapid Infuser enabled';
        } else if (action.actionName === 'set_gravity') {
          setPatient(p => ({ ...p, fluidLine: 'gravity' }));
          logEvent("🔧 Fluid Infusion Mode: Switched to standard Gravity line.");
          return 'Gravity infusion line enabled';
        }
        return 'Procedure Action skipped';

      case 'procedure':
        if (action.action === 'suction') {
          setPatient(p => ({ ...p, airwayBlood: false, isSuctioned: true }));
          logEvent("Performed Yankauer Pharyngeal Suction.");
          return 'Perform Yankauer Suction';
        } else if (action.action === 'laryngoscopy') {
          const tubePos = action.tubePosition || 'trachea';
          setPatient(p => ({ 
            ...p, 
            airwaySecured: true, 
            ventilationStatus: 'mechanical', 
            tubePosition: tubePos, 
            currentO2Device: 'Mechanical Ventilator (100% FiO2)', 
            currentFiO2: 100 
          }));
          logEvent(`Laryngoscopy performed. ETT positioned in ${tubePos}.`);
          return `Perform Laryngoscopy: ETT placed in ${tubePos}`;
        } else if (action.action === 'opa') {
          setPatient(p => ({ ...p, bmvOptimized: true }));
          logEvent("Inserted Oropharyngeal Airway (OPA).");
          return 'Insert Oropharyngeal Airway';
        } else if (action.action === 'bmv') {
          setPatient(p => ({ ...p, ventilationStatus: 'assisted', currentO2Device: 'Bag-Valve-Mask (15L)', currentFiO2: 100 }));
          logEvent("Performed active Bag-Valve-Mask (BMV) Ventilation.");
          return 'Perform BMV ventilation';
        }
        return 'Procedure skipped';
        
      default:
        return 'Skipped unknown action';
    }
  } catch (err) {
    return `Action failed: ${err.message}`;
  }
}

/**
 * Formats a reproducible physiological bug report.
 */
export function generateFidelityReport(anomalies, history, patientInfo = {}) {
  const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
  
  let md = `# Clinical Fidelity Verification Bug Report\n\n`;
  md += `**Timestamp**: ${timestamp}  \n`;
  md += `**Subject**: ${patientInfo.name || 'Standard Subject'} (ASA ${patientInfo.asaStatus || 'I'})  \n`;
  md += `**Simulation Mode**: Stateful Coverage-Guided Clinical Fuzzing Stress-Test  \n`;
  md += `**Stress Test Steps**: ${history.length} ticks executed\n\n`;
  
  md += `## 🚨 Discovered Clinical Inconsistencies (${anomalies.length})\n\n`;
  
  if (anomalies.length === 0) {
    md += `🟢 **SUCCESS**: All physiological, pharmacological, and mechanical bounds are fully compliant with clinical laws under guided stress testing. Excellent fidelity!\n\n`;
  } else {
    anomalies.forEach((item, idx) => {
      md += `### Bug #${idx + 1}: ${item.rule} (${item.system})\n`;
      md += `- **Severity**: \`${item.severity}\`\n`;
      md += `- **Discrepancy Details**: ${item.message}\n`;
      md += `- **Physiological Rationale**: *${item.rationale}*\n`;
      md += `- **Technical Resolution**: ${item.resolution}\n\n`;
    });
  }
  
  md += `## ⏪ Replication Case Steps\n`;
  md += `Execute these steps in order to reproduce the physiological anomalies in the simulator:\n\n`;
  
  if (history.length === 0) {
    md += `*No actions recorded.*\n`;
  } else {
    history.forEach((step, idx) => {
      md += `${idx + 1}. **Tick ${step.tick}**: ${step.actionText}  \n`;
      md += `   *Telemetry snapshot*: HR: ${Math.round(step.vitals.hr)} bpm | BP: ${Math.round(step.vitals.sys)}/${Math.round(step.vitals.dia)} mmHg (MAP: ${Math.round(step.vitals.map)}) | SpO2: ${Math.round(step.vitals.spo2)}% | EtCO2: ${Math.round(step.vitals.etco2)} mmHg | pH: ${step.electrolytes.ph?.toFixed(2) || '7.4'}\n`;
    });
  }
  
  md += `\n---\n*Report generated automatically by the Clinical Fidelity Verification Engine.*`;
  return md;
}
