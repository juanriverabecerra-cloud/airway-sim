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

  // Sync fuzzerState.phase with patient status
  if (fuzzerState.phase === 'PRE_OP' && hasIV && hasMonitors) {
    fuzzerState.phase = 'INDUCTION';
  } else if (fuzzerState.phase === 'INDUCTION' && isHypnotic && isParalyzed) {
    fuzzerState.phase = 'AIRWAY_MGMT';
  } else if (fuzzerState.phase === 'AIRWAY_MGMT' && isAirwaySecured) {
    fuzzerState.phase = 'MAINTENANCE';
  }

  // Phase-specific guided generators based on selected Strategy Archetype:
  switch (strategy) {
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
    // Expose algebraic and ceiling limits in cardiovascular equations by blending Epinephrine + Phenylephrine + Esmolol
    const rocuroniumCe = activeMeds.find(m => m.name === 'Rocuronium')?.Ce || 0;
    
    // Check if we should test neuromuscular reversal dynamics
    if (rocuroniumCe > 0.1 && Math.random() < 0.25) {
      fuzzerState.currentSequence = [
        // Synergistic double reversal (Sugammadex + Neostigmine & Glycopyrrolate)
        { name: 'Push Sugammadex 1000mg', type: 'med', drug: 'Sugammadex', dose: 1000, unit: 'mg', medType: 'Bolus', route: 'IV' },
        { name: 'Push Neostigmine 5mg (Without Glyco)', type: 'med', drug: 'Neostigmine', dose: 5, unit: 'mg', medType: 'Bolus', route: 'IV' },
        { name: 'Push Glycopyrrolate 0.2mg', type: 'med', drug: 'Glycopyrrolate', dose: 0.2, unit: 'mg', medType: 'Bolus', route: 'IV' },
        { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 }
      ];
      return fuzzerState.currentSequence.shift();
    }

    if (vitals.map < 65) {
      // Hypotension: Try synergistic vasoactive surge
      fuzzerState.currentSequence = [
        { name: 'Push Phenylephrine 100mcg', type: 'med', drug: 'Phenylephrine', dose: 100, unit: 'mcg', medType: 'Bolus', route: 'IV' },
        { name: 'Push Epinephrine 50mcg', type: 'med', drug: 'Epinephrine', dose: 50, unit: 'mcg', medType: 'Bolus', route: 'IV' },
        { name: 'Bolus LR 500mL', type: 'fluid', nameFluid: 'Lactated Ringers (LR)', volume: 500 },
        { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 }
      ];
      return fuzzerState.currentSequence.shift();
    }

    if (vitals.hr > 110) {
      // Tachycardia: Try beta blockade titration
      return { name: 'Push Esmolol 20mg', type: 'med', drug: 'Esmolol', dose: 20, unit: 'mg', medType: 'Bolus', route: 'IV' };
    }

    // Default maintenance operations: resus fluids and blood products to stress coagulopathy
    if (patient.ebl > 1500 && Math.random() < 0.3) {
      fuzzerState.currentSequence = [
        { name: 'Transfuse PRBC 1 Unit', type: 'fluid', nameFluid: 'Packed Red Blood Cells (PRBC)', volume: 1 },
        { name: 'Transfuse FFP 1 Unit', type: 'fluid', nameFluid: 'Fresh Frozen Plasma (FFP)', volume: 1 },
        { name: 'Observe physiology for 20 seconds', type: 'wait', duration: 20 }
      ];
      return fuzzerState.currentSequence.shift();
    }

    // Standard time ticking to allow PK/PD elimination kinetics to step forward
    return { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 };
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

    // Default Malpractice maintenance: Let gases drift or turn Vent RR to 0 (Apneic malpractice)
    if (Math.random() < 0.2) {
      return { name: 'Set Vent RR 0 (Apnea)', type: 'vent', field: 'rr', value: 0 };
    }
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
    return { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 };
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
    return { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 };
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
  patient
}) {
  const lineId = patient.accessLines && patient.accessLines.length > 0 ? patient.accessLines[0].id : null;

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
