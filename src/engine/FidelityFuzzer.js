/**
 * Clinical Fidelity Fuzzer
 * Generates automated, randomized clinical actions to stress-test the simulation's state space
 * and generates reproducible physiological bug reports.
 */

export const FUZZ_ACTIONS = [
  // Sedative pushes
  { name: 'Push Propofol 150mg', type: 'med', drug: 'Propofol', dose: 150, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Etomidate 20mg', type: 'med', drug: 'Etomidate', dose: 20, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Ketamine 100mg', type: 'med', drug: 'Ketamine', dose: 100, unit: 'mg', medType: 'Bolus', route: 'IV' },
  
  // Opioid pushes
  { name: 'Push Fentanyl 100mcg', type: 'med', drug: 'Fentanyl', dose: 100, unit: 'mcg', medType: 'Bolus', route: 'IV' },
  
  // Paralytics pushes
  { name: 'Push Rocuronium 50mg', type: 'med', drug: 'Rocuronium', dose: 50, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Succinylcholine 100mg', type: 'med', drug: 'Succinylcholine', dose: 100, unit: 'mg', medType: 'Bolus', route: 'IV' },
  
  // Emergency cardiovascular meds
  { name: 'Push Epinephrine 50mcg', type: 'med', drug: 'Epinephrine', dose: 50, unit: 'mcg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Phenylephrine 100mcg', type: 'med', drug: 'Phenylephrine', dose: 100, unit: 'mcg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Glycopyrrolate 0.2mg', type: 'med', drug: 'Glycopyrrolate', dose: 0.2, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Atropine 0.5mg', type: 'med', drug: 'Atropine', dose: 0.5, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Esmolol 20mg', type: 'med', drug: 'Esmolol', dose: 20, unit: 'mg', medType: 'Bolus', route: 'IV' },
  { name: 'Push Calcium Chloride 1g', type: 'med', drug: 'Calcium', dose: 1000, unit: 'mg', medType: 'Bolus', route: 'IV' },
  
  // Fluids and transfusions
  { name: 'Bolus NS 500mL', type: 'fluid', nameFluid: 'Normal Saline', volume: 500 },
  { name: 'Transfuse PRBC 1 Unit', type: 'fluid', nameFluid: 'Packed Red Blood Cells', volume: 1 },
  
  // Positioning shifts
  { name: 'Position Supine', type: 'position', value: 'Supine' },
  { name: 'Position Sniffing', type: 'position', value: 'Sniffing' },
  { name: 'Position Ramped', type: 'position', value: 'Ramped' },
  { name: 'Position Sitting', type: 'position', value: 'Sitting' },
  { name: 'Position Trendelenburg', type: 'position', value: 'Trendelenburg' },
  
  // Ventilator parameter adjustments
  { name: 'Set Vent RR 16', type: 'vent', field: 'rr', value: 16 },
  { name: 'Set Vent RR 0 (Apnea)', type: 'vent', field: 'rr', value: 0 },
  { name: 'Set Vent VT 600', type: 'vent', field: 'vt', value: 600 },
  { name: 'Set Vent FiO2 100%', type: 'vent', field: 'fio2', value: 100 },
  { name: 'Set Vent PEEP 10', type: 'vent', field: 'peep', value: 10 },
  
  // Airway procedures
  { name: 'Suction pharynx', type: 'procedure', action: 'suction' },
  { name: 'Perform Laryngoscopy', type: 'procedure', action: 'laryngoscopy' },
  { name: 'Optimize Airway OPA', type: 'procedure', action: 'opa' }
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
        
      case 'procedure':
        if (action.action === 'suction') {
          setPatient(p => ({ ...p, airwayBlood: false, isSuctioned: true }));
          logEvent("Performed Yankauer Pharyngeal Suction.");
          return 'Perform Yankauer Suction';
        } else if (action.action === 'laryngoscopy' && !patient.airwaySecured) {
          // Mock a successful intubation under fuzz test
          const height = patient.height || 170;
          const tubePos = Math.random() < 0.15 ? 'right_mainstem' : 'trachea';
          setPatient(p => ({ ...p, airwaySecured: true, ventilationStatus: 'successful', tubePosition: tubePos, currentO2Device: 'Mechanical Ventilator (100% FiO2)', currentFiO2: 100 }));
          logEvent(`Laryngoscopy performed. ETT placed in ${tubePos}.`);
          return `Perform laryngoscopy (ETT in ${tubePos})`;
        } else if (action.action === 'opa') {
          setPatient(p => ({ ...p, bmvOptimized: true }));
          logEvent("Inserted Oropharyngeal Airway (OPA).");
          return 'Insert OPA';
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
  md += `**Subject subject**: ${patientInfo.name || 'Standard Subject'} (ASA ${patientInfo.asaStatus || 'I'})  \n`;
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
  
  md += `## ⏪ Reprodution Case Steps\n`;
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
