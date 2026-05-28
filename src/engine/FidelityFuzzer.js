/**
 * Clinical Fidelity Fuzzer
 * Generates automated, randomized clinical actions to stress-test the simulation's state space
 * and generates reproducible physiological bug reports.
 */

export const FUZZ_ACTIONS = [
  // === 1. SEDATIVES & HYPNOTICS ===
  { name: 'Push Propofol 150mg', type: 'med', drug: 'Propofol', dose: 150, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Etomidate 20mg', type: 'med', drug: 'Etomidate', dose: 20, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Ketamine 100mg', type: 'med', drug: 'Ketamine', dose: 100, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Dexmedetomidine 100mcg', type: 'med', drug: 'Dexmedetomidine', dose: 100, unit: 'mcg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Midazolam 2mg', type: 'med', drug: 'Midazolam', dose: 2, unit: 'mg', medType: 'Bolus', route: 'IV' },
  
  // === 2. OPIOIDS ===
  { name: 'Push Fentanyl 100mcg', type: 'med', drug: 'Fentanyl', dose: 100, unit: 'mcg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Sufentanil 10mcg', type: 'med', drug: 'Sufentanil', dose: 10, unit: 'mcg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Remifentanil 100mcg', type: 'med', drug: 'Remifentanil', dose: 100, unit: 'mcg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Hydromorphone 1mg', type: 'med', drug: 'Hydromorphone', dose: 1, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Morphine 5mg', type: 'med', drug: 'Morphine', dose: 5, unit: 'mg', medType: 'Bolus', route: 'IV' },
  
  // === 3. PARALYTICS & REVERSALS ===
  { name: 'Push Rocuronium 50mg', type: 'med', drug: 'Rocuronium', dose: 50, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Succinylcholine 100mg', type: 'med', drug: 'Succinylcholine', dose: 100, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Vecuronium 10mg', type: 'med', drug: 'Vecuronium', dose: 10, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Cisatracurium 10mg', type: 'med', drug: 'Cisatracurium', dose: 10, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Sugammadex 1000mg', type: 'med', drug: 'Sugammadex', dose: 1000, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Neostigmine 5mg (Without Glyco)', type: 'med', drug: 'Neostigmine', dose: 5, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Glycopyrrolate 0.2mg', type: 'med', drug: 'Glycopyrrolate', dose: 0.2, unit: 'mg', medType: 'Bolus', route: 'IV' },
  
  // === 4. VASOACTIVES & INOTROPES ===
  { name: 'Push Epinephrine 50mcg', type: 'med', drug: 'Epinephrine', dose: 50, unit: 'mcg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Epinephrine 1mg', type: 'med', drug: 'Epinephrine', dose: 1000, unit: 'mcg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Ephedrine 10mg', type: 'med', drug: 'Ephedrine', dose: 10, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Norepinephrine 16mcg', type: 'med', drug: 'Norepinephrine', dose: 16, unit: 'mcg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Phenylephrine 100mcg', type: 'med', drug: 'Phenylephrine', dose: 100, unit: 'mcg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Vasopressin 2 Units', type: 'med', drug: 'Vasopressin', dose: 2, unit: 'units', medType: 'Bolus', route: 'IV' },
  { name: 'Push Dobutamine 250mcg', type: 'med', drug: 'Dobutamine', dose: 250, unit: 'mcg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Dopamine 200mcg', type: 'med', drug: 'Dopamine', dose: 200, unit: 'mcg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Milrinone 50mcg', type: 'med', drug: 'Milrinone', dose: 50, unit: 'mcg', medType: 'Bolus', route: 'IV' },
  
  // === 5. ANTIHYPERTENSIVES ===
  { name: 'Push Esmolol 20mg', type: 'med', drug: 'Esmolol', dose: 20, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Labetalol 20mg', type: 'med', drug: 'Labetalol', dose: 20, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Metoprolol 5mg', type: 'med', drug: 'Metoprolol', dose: 5, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Nitroglycerin 100mcg', type: 'med', drug: 'Nitroglycerin', dose: 100, unit: 'mcg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Nitroprusside 100mcg', type: 'med', drug: 'Nitroprusside', dose: 100, unit: 'mcg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Clevidipine 2mg', type: 'med', drug: 'Clevidipine', dose: 2, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Clonidine 150mcg', type: 'med', drug: 'Clonidine', dose: 150, unit: 'mcg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Enalaprilat 1.25mg', type: 'med', drug: 'Enalaprilat', dose: 1.25, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Hydralazine 10mg', type: 'med', drug: 'Hydralazine', dose: 10, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Nicardipine 1mg', type: 'med', drug: 'Nicardipine', dose: 1, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Phentolamine 5mg', type: 'med', drug: 'Phentolamine', dose: 5, unit: 'mg', medType: 'Bolus', route: 'IV' },
  
  // === 6. DIURETICS ===
  { name: 'Push Furosemide 20mg', type: 'med', drug: 'Furosemide', dose: 20, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Bumetanide 1mg', type: 'med', drug: 'Bumetanide', dose: 1, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Mannitol 20% 25g', type: 'med', drug: 'Mannitol', dose: 25, unit: 'g', medType: 'Bolus', route: 'IV' },
  { name: 'Push Acetazolamide 500mg', type: 'med', drug: 'Acetazolamide', dose: 500, unit: 'mg', medType: 'Bolus', route: 'IV' },

  // === 7. ANTIARRHYTHMICS, ELECTROLYTES, LOCAL ANESTHETICS ===
  { name: 'Push Adenosine 6mg', type: 'med', drug: 'Adenosine', dose: 6, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Amiodarone 150mg', type: 'med', drug: 'Amiodarone', dose: 150, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Atropine 0.5mg', type: 'med', drug: 'Atropine', dose: 0.5, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Sodium Bicarbonate 50mEq', type: 'med', drug: 'Bicarbonate', dose: 50, unit: 'mEq', medType: 'Bolus', route: 'IV' },
  { name: 'Push Calcium Chloride 1g', type: 'med', drug: 'Calcium', dose: 1000, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Digoxin 0.25mg', type: 'med', drug: 'Digoxin', dose: 0.25, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Diltiazem 10mg', type: 'med', drug: 'Diltiazem', dose: 10, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Ibutilide 1mg', type: 'med', drug: 'Ibutilide', dose: 1, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Lidocaine 100mg', type: 'med', drug: 'Lidocaine', dose: 100, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Benzocaine 2 sprays', type: 'med', drug: 'Benzocaine', dose: 2, unit: 'sprays', medType: 'Bolus', route: 'Topical' },
  
  // === 8. RESUS FLUIDS (Corrected exact keys) ===
  { name: 'Bolus NS 500mL', type: 'fluid', nameFluid: 'Normal Saline (0.9% NS)', volume: 500 },
  { name: 'Bolus LR 500mL', type: 'fluid', nameFluid: 'Lactated Ringers (LR)', volume: 500 },
  { name: 'Bolus Plasmalyte 500mL', type: 'fluid', nameFluid: 'Plasmalyte', volume: 500 },
  { name: 'Infuse Albumin 5% 250mL', type: 'fluid', nameFluid: 'Albumin 5%', volume: 250 },
  { name: 'Transfuse PRBC 1 Unit', type: 'fluid', nameFluid: 'Packed Red Blood Cells (PRBC)', volume: 1 },
  { name: 'Transfuse FFP 1 Unit', type: 'fluid', nameFluid: 'Fresh Frozen Plasma (FFP)', volume: 1 },
  { name: 'Transfuse Platelets 1 Unit', type: 'fluid', nameFluid: 'Platelets', volume: 1 },
  { name: 'Transfuse Cryoprecipitate 1 Unit', type: 'fluid', nameFluid: 'Cryoprecipitate', volume: 1 },
  { name: 'Push Fibrinogen Concentrate 2g', type: 'fluid', nameFluid: 'Fibrinogen Concentrate', volume: 2 },
  
  // === 9. PATIENT POSITIONING (All supported) ===
  { name: 'Position Supine', type: 'position', value: 'Supine' },
  { name: 'Position Sniffing', type: 'position', value: 'Sniffing' },
  { name: 'Position Ramped', type: 'position', value: 'Ramped' },
  { name: 'Position Trendelenburg', type: 'position', value: 'Trendelenburg' },
  { name: 'Position Reverse Trendelenburg', type: 'position', value: 'Rev Trendelenburg' },
  { name: 'Position Lithotomy', type: 'position', value: 'Lithotomy' },
  { name: 'Position Lateral', type: 'position', value: 'Lateral' },
  { name: 'Position Prone', type: 'position', value: 'Prone' },
  { name: 'Position Sitting', type: 'position', value: 'Sitting' },
  
  // === 10. VASCULAR ACCESS PLACEMENTS ===
  { name: 'Place 18G PIV Right Forearm', type: 'line', category: 'Peripheral IV', lType: '18G Peripheral IV', location: 'Right Forearm' },
  { name: 'Place 14G PIV Left Antecubital', type: 'line', category: 'Peripheral IV', lType: '14G Peripheral IV', location: 'Left Antecubital' },
  { name: 'Place Triple Lumen CVC Right IJ', type: 'line', category: 'Central Line', lType: 'Triple Lumen CVC (7Fr)', location: 'Right Internal Jugular' },
  { name: 'Place Humeral Head IO', type: 'line', category: 'Intraosseous (IO)', lType: 'Humeral Head IO', location: 'Right Humeral Head' },
  { name: 'Place Radial Arterial Line', type: 'line', category: 'Arterial Line', lType: 'Radial Arterial Line', location: 'Left Radial' },

  // === 11. CHECKLISTS, MANEUVERS, REVIEWS ===
  { name: "Perform Larson's Maneuver", type: 'maneuver' },
  { name: 'Check ETT Cuff Leak', type: 'check', action: 'cuff' },
  { name: 'Review Fasting NPO History', type: 'check', action: 'npo' },

  // === 12. POC DIAGNOSTICS (Lab Ordering) ===
  { name: 'Order POC ABG Panel', type: 'lab', labType: 'ABG' },
  { name: 'Order POC VBG Panel', type: 'lab', labType: 'VBG' },
  { name: 'Order POC CBC Panel', type: 'lab', labType: 'CBC' },
  { name: 'Order POC CMP Panel', type: 'lab', labType: 'CMP' },
  { name: 'Order POC Coags Panel', type: 'lab', labType: 'Coagulation' },
  { name: 'Order POC TEG Panel', type: 'lab', labType: 'TEG' },

  // === 13. VENTILATOR ADJUSTMENTS ===
  { name: 'Set Vent RR 16', type: 'vent', field: 'rr', value: 16 },
  { name: 'Set Vent RR 0 (Apnea)', type: 'vent', field: 'rr', value: 0 },
  { name: 'Set Vent VT 600', type: 'vent', field: 'vt', value: 600 },
  { name: 'Set Vent FiO2 100%', type: 'vent', field: 'fio2', value: 100 },
  { name: 'Set Vent PEEP 10', type: 'vent', field: 'peep', value: 10 },
  
  // === 14. OXYGEN DEVICES ===
  { name: 'O2 Nasal Cannula 4L', type: 'o2', device: 'Nasal Cannula', flow: 4, fio2: 36, ipap: 0, epap: 0, rate: 0 },
  { name: 'O2 Non-Rebreather 15L', type: 'o2', device: 'Non-Rebreather Mask (NRB)', flow: 15, fio2: 100, ipap: 0, epap: 0, rate: 0 },
  { name: 'O2 HFNC 60L 100%', type: 'o2', device: 'High Flow Nasal Cannula (HFNC)', flow: 60, fio2: 100, ipap: 0, epap: 0, rate: 0 },
  { name: 'O2 CPAP 10 PEEP 100%', type: 'o2', device: 'CPAP', flow: 0, fio2: 100, ipap: 0, epap: 10, rate: 0 },
  { name: 'O2 BiPAP 15/5 100%', type: 'o2', device: 'BiPAP', flow: 0, fio2: 100, ipap: 15, epap: 5, rate: 12 },

  // === 15. AIRWAY PROCEDURES & CARDIAC ACTIONS ===
  { name: 'Suction pharynx', type: 'procedure', action: 'suction' },
  { name: 'Perform Laryngoscopy', type: 'procedure', action: 'laryngoscopy' },
  { name: 'Optimize Airway OPA', type: 'procedure', action: 'opa' },
  { name: 'Perform BMV ventilation', type: 'procedure', action: 'bmv' },
  { name: 'Toggle CPR compressions', type: 'cpr' },
  { name: 'Deliver Defib Shock 200J', type: 'shock', joules: 200, sync: false },
  { name: 'Deliver Sync Cardioversion 100J', type: 'shock', joules: 100, sync: true },

  // === 16. TEMPORAL OBSERVATION ACTIONS ===
  { name: 'Observe physiology for 10 seconds', type: 'wait', duration: 10 },
  { name: 'Observe physiology for 20 seconds', type: 'wait', duration: 20 },
  { name: 'Observe physiology for 30 seconds', type: 'wait', duration: 30 }
];

export function getRandomFuzzAction() {
  const idx = Math.floor(Math.random() * FUZZ_ACTIONS.length);
  return FUZZ_ACTIONS[idx];
}

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
          return `Transfuse ${action.volume} ${action.nameFluid}`;
        }
        return 'Fluid skipped (No IV access)';
        
      case 'position':
        setPatient(p => ({ ...p, position: action.value }));
        logEvent(`Position: ${action.value}. FRC adjusted.`);
        return `Change position to ${action.value}`;
        
      case 'vent':
        handleSetVentSettings({ [action.field]: action.value });
        return `Adjust Vent ${action.field} to ${action.value}`;
        
      case 'o2':
        if (handleSetO2) {
          handleSetO2(action.device, action.flow, action.fio2, action.ipap, action.epap, action.rate);
          return `Set Oxygen Device to ${action.device} (FiO2: ${action.fio2}%)`;
        }
        return 'O2 adjust skipped (Handler unavailable)';

      case 'cpr':
        if (handleToggleCPR) {
          handleToggleCPR();
          return 'Toggle chest compressions (CPR)';
        }
        return 'CPR toggle skipped';

      case 'shock':
        if (handleDeliverShock) {
          handleDeliverShock(action.joules, action.sync);
          return `Deliver ${action.joules}J ${action.sync ? 'Synchronized' : 'Biphasic Defib'} Shock`;
        }
        return 'Defib shock skipped';

      case 'line':
        if (establishAccess) {
          establishAccess(action.category, action.lType, action.location);
          return `Placed ${action.lType} in ${action.location}`;
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

      case 'lab':
        if (generateLab) {
          generateLab(action.labType);
          return `Order POC ${action.labType} Panel`;
        }
        return 'Lab order skipped';

      case 'procedure':
        if (action.action === 'suction') {
          setPatient(p => ({ ...p, airwayBlood: false, isSuctioned: true }));
          logEvent("Performed Yankauer Pharyngeal Suction.");
          return 'Perform Yankauer Suction';
        } else if (action.action === 'laryngoscopy' && !patient.airwaySecured) {
          const tubePos = Math.random() < 0.15 ? 'right_mainstem' : 'trachea';
          setPatient(p => ({ ...p, airwaySecured: true, ventilationStatus: 'successful', tubePosition: tubePos, currentO2Device: 'Mechanical Ventilator (100% FiO2)', currentFiO2: 100 }));
          logEvent(`Laryngoscopy performed. ETT placed in ${tubePos}.`);
          return `Perform laryngoscopy (ETT in ${tubePos})`;
        } else if (action.action === 'opa') {
          setPatient(p => ({ ...p, bmvOptimized: true }));
          logEvent("Inserted Oropharyngeal Airway (OPA).");
          return 'Insert OPA';
        } else if (action.action === 'bmv') {
          setPatient(p => ({ ...p, ventilationStatus: 'assisted', currentO2Device: 'Bag-Valve-Mask (15L)', currentFiO2: 100 }));
          logEvent("Performed Bag-Valve-Mask (BMV) Ventilation.");
          return 'Perform BMV ventilation';
        }
        return 'Procedure skipped';
        
      default:
        return 'Skipped';
    }
  } catch (err) {
    return `Action failed: ${err.message}`;
  }
}

export function generateFidelityReport(anomalies, history, patientInfo = {}) {
  const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
  
  let md = `# Clinical Fidelity Verification Bug Report\n\n`;
  md += `**Timestamp**: ${timestamp}  \n`;
  md += `**Subject**: ${patientInfo.name || 'Standard Subject'} (ASA ${patientInfo.asaStatus || 'I'})  \n`;
  md += `**Simulation Mode**: Headless State-Space Auto-Fuzzing Stress-Test  \n`;
  md += `**Stress Test Steps**: ${history.length} ticks executed\n\n`;
  
  md += `## 🚨 Discovered Clinical Inconsistencies (${anomalies.length})\n\n`;
  
  if (anomalies.length === 0) {
    md += `🟢 **SUCCESS**: All physiological, pharmacological, and mechanical bounds are fully compliant with clinical laws under random stress testing. Excellent fidelity!\n\n`;
  } else {
    anomalies.forEach((item, idx) => {
      md += `### Bug #${idx + 1}: ${item.rule} (${item.system})\n`;
      md += `- **Severity**: \`${item.severity}\`\n`;
      md += `- **Discrepancy Details**: ${item.message}\n`;
      md += `- **Physiological Rationale**: *${item.rationale}*\n`;
      md += `- **Technical Resolution**: ${item.resolution}\n\n`;
    });
  }
  
  md += `## ⏪ Reproduction Case Steps\n`;
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
