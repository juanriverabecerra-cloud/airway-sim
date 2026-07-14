/**
 * Vital Context Configuration
 *
 * Defines what each clickable vital box shows when selected:
 *  - getDrivers(): live analysis of what's causing the current value
 *  - getActions(): one-click interventions with clinical rationale
 *  - getClinicalPearl(): one educational sentence, context-aware
 *
 * All driver/action functions receive: { vitals, patient, activeMeds, gasSettings, ventSettings, electrolytes }
 * All action callbacks receive: { processMed, setVent, setGas, setPatient, logEvent }
 */

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const findMed = (activeMeds, name) => activeMeds?.find(m => m.name === name);
const hasMed  = (activeMeds, name) => !!findMed(activeMeds, name);
const medCe   = (activeMeds, name) => findMed(activeMeds, name)?.Ce || 0;

const status = (val, warn, crit, invert = false) => {
  if (invert) return val < crit ? 'critical' : val < warn ? 'warn' : 'ok';
  return val > crit ? 'critical' : val > warn ? 'warn' : 'ok';
};

// ─────────────────────────────────────────────────────────────────────────────
// Config map — keyed by vital ID
// ─────────────────────────────────────────────────────────────────────────────
export const VITAL_CONFIG = {

  // ── HEART RATE ─────────────────────────────────────────────────────────────
  hr: {
    label: 'HR', subtitle: 'Heart Rate', unit: 'bpm', color: 'green',
    normal: '60-100 bpm',
    getDrivers: ({ vitals, patient, activeMeds }) => {
      // Multi-source tachycardia/bradycardia detection — covers ALL HR-altering crises
      const mhActive        = patient?.mhActive || false;
      const thyroidStorm    = patient?.thyroidStormActive || false;
      const anaphylaxisHR   = patient?.anaphylaxisTriggered || false;
      const sepsisScore     = patient?.sepsisScore || 0;
      const serotoninSyn    = patient?.serotoninSyndromeTriggered || patient?.maoisCrisisActive || false;
      const highSpinal      = patient?.highSpinalRisk || false;
      const adrenalCrisis   = patient?.adrenalCrisisActive || false;

      // Determine the most important active crisis affecting HR
      const crisisLabel = (() => {
        if (mhActive)      return 'MH ACTIVE — massive tachycardia + hypermetabolism ⚠';
        if (thyroidStorm)  return 'Thyroid Storm — HR > 150 target ⚠';
        if (serotoninSyn)  return 'Serotonin Syndrome — tachycardia + hyperthermia ⚠';
        if (anaphylaxisHR) return 'Anaphylaxis — reflex tachycardia + vasodilation ⚠';
        if (sepsisScore > 1) return `Sepsis score ${sepsisScore.toFixed(1)} — distributive tachycardia`;
        if (highSpinal)    return 'High spinal — cardiac accelerator block → bradycardia ⚠';
        if (adrenalCrisis) return 'Adrenal crisis — refractory shock ⚠';
        return null;
      })();

      return [
        { label: 'Cardiac rhythm',    value: patient?.cardiacRhythm || 'Normal Sinus',
          status: ['vfib','vtach','afib_rvr'].includes(patient?.cardiacRhythm) ? 'critical' : 'ok' },
        { label: 'Autonomic tone',    value: patient?.isArrest ? 'ARREST' : `SNS/PNS balance`,
          status: patient?.isArrest ? 'critical' : 'ok' },
        ...(crisisLabel ? [{ label: 'Active crisis ⚠', value: crisisLabel, status: 'critical' }] : []),
        { label: 'Atropine / Glyco', value: hasMed(activeMeds,'Atropine') ? `Atropine Ce ${medCe(activeMeds,'Atropine').toFixed(2)}` : hasMed(activeMeds,'Glycopyrrolate') ? 'Glycopyrrolate active' : 'None',
          status: 'ok' },
        { label: 'β-blockers',        value: hasMed(activeMeds,'Metoprolol') ? 'Metoprolol active' : hasMed(activeMeds,'Esmolol') ? 'Esmolol active' : 'None',
          status: 'ok' },
        { label: 'Vasopressors',      value: hasMed(activeMeds,'Epinephrine') ? `Epi Ce ${medCe(activeMeds,'Epinephrine').toFixed(3)}` : hasMed(activeMeds,'Ephedrine') ? 'Ephedrine active' : 'None',
          status: 'ok' },
        { label: 'Pain/stimulus',     value: patient?.manipulationIndex > 0.5 ? 'High surgical stimulus' : 'Low stimulus',
          status: patient?.manipulationIndex > 0.5 ? 'warn' : 'ok' },
        { label: 'Temp',              value: `${(vitals?.temp || 37).toFixed(1)}°C`,
          status: (vitals?.temp || 37) > 38.5 ? 'warn' : (vitals?.temp || 37) < 35 ? 'warn' : 'ok' },
      ];
    },
    getActions: ({ vitals, patient, activeMeds }, { processMed, setPatient, logEvent }) => {
      const hr = vitals?.hr || 0;
      const wt = patient?.weight || 70;
      return [
        { label: 'Atropine 0.5mg IV',    category: 'med', urgent: hr < 40,
          detail: 'Vagolytic → ↑HR. Use for symptomatic bradycardia.',
          action: () => processMed('atropine', '0.5', 'IV', 'Bolus', 'mg') },
        { label: 'Glycopyrrolate 0.2mg', category: 'med', urgent: false,
          detail: 'Vagolytic (no CNS penetration). Preferred for reversal co-administration.',
          action: () => processMed('glycopyrrolate', '0.2', 'IV', 'Bolus', 'mg') },
        { label: 'Esmolol 0.5mg/kg',     category: 'med', urgent: hr > 130,
          detail: 'Ultra-short β1-blocker. Rapid ↓HR. t½=9 min.',
          action: () => processMed('esmolol', String(Math.round(wt * 0.5)), 'IV', 'Bolus', 'mg') },
        { label: 'Metoprolol 5mg IV',    category: 'med', urgent: false,
          detail: 'β1-selective blocker. Rate control for SVT/AF with RVR.',
          action: () => processMed('metoprolol', '5', 'IV', 'Bolus', 'mg') },
        { label: 'Epinephrine 1mg IV',   category: 'med', urgent: patient?.isArrest,
          detail: 'ACLS cardiac arrest. β1+α1 activation → restores cardiac output.',
          action: () => processMed('epinephrine', '1', 'IV', 'Bolus', 'mg') },
        { label: 'Attach BIS Monitor',   category: 'monitor', urgent: false, hidden: !!patient?.hasBisMonitor,
          detail: 'Assess depth of anesthesia — light anesthesia is a major cause of tachycardia.',
          action: () => { setPatient(p => ({...p, hasBisMonitor: true})); logEvent('BIS monitor attached.'); } },
      ].filter(a => !a.hidden);
    },
    getClinicalPearl: ({ vitals, patient }) => {
      const hr = vitals?.hr || 70;
      if (hr < 40) return 'HR < 40 = ACLS bradycardia algorithm. First rule out Mobitz II / 3° AV block — atropine only for vagally-mediated causes.';
      if (hr > 130) return 'Tachycardia most commonly from light anesthesia, pain, hypovolemia, or fever. Treat the cause, not just the rate.';
      if (patient?.cardiacRhythm === 'afib') return 'AF: rate control target <110 bpm. β-blockers or CCBs for rate control; DCCV for hemodynamic instability.';
      return 'Normal sinus: 60-100 bpm. HR × SV = CO. Optimal HR for coronary perfusion is 50-70 bpm (more diastolic time).';
    }
  },

  // ── SpO2 ───────────────────────────────────────────────────────────────────
  spo2: {
    label: 'SpO₂', subtitle: 'Peripheral Oxygen Saturation', unit: '%', color: 'cyan',
    normal: '95-100%',
    getDrivers: ({ vitals, patient, activeMeds, gasSettings, ventSettings }) => {
      // Airway obstruction detection from ALL sources — not just the patient.bronchospasm boolean.
      // Resistance can be elevated by: bronchospasm, anaphylaxis, aspiration, cholinergic
      // toxidrome, angioedema, inhalation injury, TACO, fat embolism. All of these are
      // captured by vitals.res (the actual computed airway resistance). We read BOTH the
      // explicit boolean AND the resistance value so the panel always reflects the same truth
      // that the log and the respiratory engine are computing.
      const rawResistance    = vitals?.res || 5;
      const bronchospasmFlag = patient?.bronchospasm || false;
      const anaphylaxisActive= patient?.anaphylaxisTriggered || patient?.anaphylaxisActive || false;
      const aspirationActive = patient?.hasAspirated || false;
      const highResistance   = rawResistance > 9;   // >9 cmH2O/L/s is above normal for intubated

      // Determine the most descriptive cause label for elevated resistance
      const obstructionLabel = (() => {
        if (bronchospasmFlag)                    return 'Bronchospasm — ACTIVE ⚠';
        if (anaphylaxisActive && highResistance) return 'Anaphylaxis → bronchoconstriction ⚠';
        if (aspirationActive  && highResistance) return 'Aspiration → airway obstruction ⚠';
        if (patient?.angioedemaActive  && highResistance) return 'Angioedema → airway swelling ⚠';
        if (patient?.cholinergicActive && highResistance) return 'Cholinergic toxidrome → bronchospasm ⚠';
        if (highResistance)                      return `Elevated — ${Math.round(rawResistance)} cmH2O/L/s`;
        return 'None';
      })();
      const obstructionStatus = (bronchospasmFlag || (highResistance && (anaphylaxisActive || aspirationActive || patient?.angioedemaActive || patient?.cholinergicActive))) ? 'critical' : highResistance ? 'warn' : 'ok';

      return [
        { label: 'FiO2',           value: `${Math.round(vitals?.fiO2 || 21)}%`,
          status: (vitals?.fiO2 || 21) < 30 ? 'critical' : (vitals?.fiO2 || 21) < 50 ? 'warn' : 'ok' },
        { label: 'Airway secured',  value: patient?.airwaySecured ? 'ETT/LMA ✓' : 'No airway device',
          status: patient?.airwaySecured ? 'ok' : 'warn' },
        { label: 'Airway resistance', value: `${Math.round(rawResistance)} cmH2O/L/s (normal <8)`,
          status: rawResistance > 15 ? 'critical' : rawResistance > 9 ? 'warn' : 'ok' },
        { label: 'Obstruction cause', value: obstructionLabel, status: obstructionStatus },
        { label: 'Shunt fraction',  value: `${Math.round((vitals?.shuntFraction || 0.05) * 100)}%`,
          status: (vitals?.shuntFraction || 0) > 0.25 ? 'critical' : (vitals?.shuntFraction || 0) > 0.12 ? 'warn' : 'ok' },
        { label: 'PEEP',            value: patient?.airwaySecured ? `${ventSettings?.peep || 5} cmH2O` : 'N/A',
          status: (ventSettings?.peep || 0) < 3 && !!patient?.airwaySecured ? 'warn' : 'ok' },
        { label: 'MetHb',           value: `${((vitals?.metHb) || 0).toFixed(1)}%`,
          status: (vitals?.metHb || 0) > 20 ? 'critical' : (vitals?.metHb || 0) > 5 ? 'warn' : 'ok' },
        { label: 'COHb',            value: `${((vitals?.coHb) || 0).toFixed(1)}%`,
          status: (vitals?.coHb || 0) > 20 ? 'critical' : (vitals?.coHb || 0) > 5 ? 'warn' : 'ok' },
        { label: 'Hb',              value: `${(vitals?.hb || patient?.hb || 14).toFixed(1)} g/dL`,
          status: (vitals?.hb || 14) < 7 ? 'critical' : (vitals?.hb || 14) < 10 ? 'warn' : 'ok' },
        { label: 'Anaphylaxis',     value: anaphylaxisActive ? 'ACTIVE — SVR collapse + bronchospasm ⚠' : 'None',
          status: anaphylaxisActive ? 'critical' : 'ok' },
      ];
    },
    getActions: ({ vitals, patient, activeMeds, ventSettings }, { processMed, setVent, setO2, logEvent }) => {
      const spo2     = vitals?.spo2 || 98;
      const fio2     = vitals?.fiO2 || 21;
      const wt       = patient?.weight || 70;
      const secured  = !!patient?.airwaySecured;
      // Airway obstruction from ANY source
      const rawRes   = vitals?.res || 5;
      const obstr    = patient?.bronchospasm || rawRes > 9;
      const anaph    = !!(patient?.anaphylaxisTriggered || patient?.anaphylaxisActive);
      const metHb    = vitals?.metHb || 0;
      const coHb     = vitals?.coHb || 0;

      // Current O2 device rank (used to avoid showing downgrades)
      const dev      = patient?.currentO2Device || 'Room Air';
      const isNC     = dev.includes('Nasal Cannula') && !dev.includes('High Flow');
      const isFM     = dev.includes('Face Mask') && !dev.includes('Non-Rebreather');
      const isNRM    = dev.includes('Non-Rebreather') || dev.includes('Non-Rebreather');
      const isHFNC   = dev.includes('High Flow');
      const isNIPPV  = dev.includes('BiPAP') || dev.includes('CPAP');
      const devRank  = dev === 'Room Air' ? 0 : isNC ? 1 : isFM ? 2 : isNRM ? 3 : isHFNC ? 4 : isNIPPV ? 5 : 6;

      return [
        // ── Supplemental O2 for non-intubated (escalating ladder) ────────────
        { label: 'Nasal Cannula 2 L', category: 'vent', urgent: false,
          hidden: secured || devRank >= 1 || spo2 >= 96,
          detail: 'Low-flow O2 (FiO2 ~29%). For SpO2 90-95%, comfort supplementation, or at-risk patients.',
          action: () => setO2('Nasal Cannula', 2) },
        { label: 'Nasal Cannula 4 L', category: 'vent', urgent: false,
          hidden: secured || devRank > 1 || spo2 >= 93,
          detail: 'Standard NC at 4 L/min (FiO2 ~37%). Comfortable; max validated is 6 L/min.',
          action: () => setO2('Nasal Cannula', 4) },
        { label: 'Face Mask 8 L', category: 'vent', urgent: spo2 < 90,
          hidden: secured || devRank >= 3 || spo2 >= 95,
          detail: 'Simple face mask at 8 L/min (FiO2 ~56%). Use ≥5 L/min to flush CO2 from mask dead-space.',
          action: () => setO2('Face Mask', 8) },
        { label: 'Non-Rebreather 15 L', category: 'vent', urgent: spo2 < 88,
          hidden: secured || devRank >= 3 || spo2 >= 92,
          detail: 'NRM at 15 L/min delivers ~100% FiO2. First-line for moderate-severe hypoxemia and CO poisoning.',
          action: () => setO2('Non-Rebreather Mask', 15) },
        { label: 'HFNC 40 L, 100%', category: 'vent', urgent: spo2 < 85,
          hidden: secured || devRank >= 4 || spo2 >= 88,
          detail: 'High-flow nasal cannula (FiO2 100%, 40 L/min). Generates ~3-5 cmH2O PEEP effect. Better tolerance than NRM for prolonged use.',
          action: () => setO2('High Flow Nasal Cannula (HFNC)', 40, 100) },
        { label: 'BiPAP IPAP 10/EPAP 5', category: 'vent', urgent: spo2 < 82,
          hidden: secured || devRank >= 5 || spo2 >= 85,
          detail: 'Non-invasive positive pressure ventilation. Reduces work of breathing + PEEP effect. Consider before intubation in COPD/pulmonary edema.',
          action: () => setO2('BiPAP', 15, 100, 10, 5, 12) },

        // ── Vent adjustments for intubated patients ───────────────────────────
        { label: 'FiO₂ → 100%', category: 'vent', urgent: spo2 < 90,
          hidden: !secured || fio2 >= 99,
          detail: 'Maximize alveolar PO2. First step for any intraoperative hypoxemia.',
          action: () => { setVent({ fio2: 100 }); logEvent('FiO2 increased to 100%.'); } },
        { label: 'FiO₂ → 60%',  category: 'vent', urgent: false,
          hidden: !secured || fio2 >= 60 || fio2 <= 35,
          detail: 'Moderate FiO2 increase for mild hypoxemia. Avoids absorption atelectasis risk of 100%.',
          action: () => { setVent({ fio2: 60 }); logEvent('FiO2 set to 60%.'); } },
        { label: 'FiO₂ → 40%',  category: 'vent', urgent: false,
          hidden: !secured || fio2 >= 40 || fio2 <= 21,
          detail: 'Titrate FiO2 downward once SpO2 ≥95%. Reduces risk of oxygen toxicity and absorption atelectasis.',
          action: () => { setVent({ fio2: 40 }); logEvent('FiO2 set to 40%.'); } },
        { label: '+PEEP 2 cmH2O', category: 'vent', urgent: false,
          hidden: !secured,
          detail: 'Recruits atelectatic alveoli → ↓shunt. Most common intraop hypoxemia mechanism.',
          action: () => { setVent({ peep: Math.min(20, (ventSettings?.peep || 5) + 2) }); logEvent('PEEP increased by 2 cmH2O.'); } },
        { label: '+PEEP 5 cmH2O', category: 'vent', urgent: spo2 < 88 && secured,
          hidden: !secured || spo2 >= 90,
          detail: 'Aggressive PEEP titration for refractory hypoxemia (ARDS, atelectasis). Monitor for RV strain.',
          action: () => { setVent({ peep: Math.min(20, (ventSettings?.peep || 5) + 5) }); logEvent('PEEP increased by 5 cmH2O.'); } },

        // ── Bronchospasm ──────────────────────────────────────────────────────
        { label: 'Albuterol 2.5mg', category: 'med', urgent: obstr,
          hidden: !obstr,
          detail: 'β2 bronchodilator → ↓airway resistance. First-line for bronchospasm.',
          action: () => processMed('albuterol', '2.5', 'IV', 'Bolus', 'mg') },
        { label: 'Ketamine 0.5 mg/kg', category: 'med', urgent: obstr && rawRes > 15,
          hidden: rawRes < 12,
          detail: 'Bronchodilator via catecholamine release. Use for severe/refractory bronchospasm.',
          action: () => processMed('ketamine', String(Math.round(wt * 0.5)), 'IV', 'Bolus', 'mg') },

        // ── Anaphylaxis ───────────────────────────────────────────────────────
        { label: 'Epinephrine 0.3mg IM', category: 'med', urgent: anaph,
          hidden: !anaph,
          detail: 'First-line anaphylaxis: α1 (↑SVR) + β2 (bronchodilation). Fastest onset via anterolateral thigh.',
          action: () => processMed('epinephrine', '0.3', 'IV', 'Bolus', 'mg') },

        // ── Hemoglobin dysfunction ────────────────────────────────────────────
        { label: 'Methylene Blue 1 mg/kg', category: 'med', urgent: metHb > 20,
          hidden: metHb < 10 || !!patient?.g6pdDeficiency,
          detail: 'Reduces MetHb → functional HbO2. CONTRAINDICATED in G6PD deficiency (hemolysis risk).',
          action: () => processMed('methylene_blue', String(Math.round(wt)), 'IV', 'Bolus', 'mg') },
        { label: 'NRM 100% O2 (CO)', category: 'vent', urgent: coHb > 20,
          hidden: coHb < 5 || secured,
          detail: 'Displaces CO from Hb (competes at same binding site). T½: 6h room air → 60-90 min on 100% O2.',
          action: () => setO2('Non-Rebreather Mask', 15) },
        { label: 'FiO₂ 100% (CO)', category: 'vent', urgent: coHb > 20,
          hidden: coHb < 5 || !secured || fio2 >= 99,
          detail: 'Maximizes CO elimination via competitive displacement. T½ 60-90 min on 100% O2 vs 6h room air.',
          action: () => { setVent({ fio2: 100 }); logEvent('FiO2 100% for CO poisoning treatment.'); } },
      ].filter(a => !a.hidden);
    },
    getClinicalPearl: ({ vitals, patient }) => {
      const spo2 = vitals?.spo2 || 98;
      const metHb = vitals?.metHb || 0;
      const coHb = vitals?.coHb || 0;
      if (coHb > 5) return 'COHb causes FALSELY HIGH SpO2 — standard pulse ox reads COHb as HbO2. Only co-oximetry gives true saturation in CO poisoning.';
      if (metHb > 5) return 'MetHb causes SpO2 to read toward 85% regardless of true SaO2 — artificially low if normal, falsely reassuring if severe. Treat with methylene blue (not in G6PD).';
      if (spo2 < 90) return 'SpO2 <90% = PaO2 ~60 mmHg (steep part of O2-Hb dissociation curve). Small SpO2 drops reflect large PaO2 changes. Immediate intervention required.';
      return 'SpO2 underestimates true SaO2 in dark nail polish, poor perfusion, motion. Always correlate clinically.';
    }
  },

  // ── SYSTOLIC / DIASTOLIC BLOOD PRESSURE ──────────────────────────────────
  bp: {
    label: 'SBP/DBP', subtitle: 'Systolic / Diastolic Blood Pressure', unit: 'mmHg', color: 'red',
    normal: 'SBP 100-140 | DBP 60-90 mmHg',
    getDrivers: ({ vitals, patient, activeMeds, gasSettings, ventSettings }) => {
      const sys = patient?.hasALine ? (vitals?.sys || 0) : 0;
      const dia = patient?.hasALine ? (vitals?.dia || 0) : 0;
      const pp  = sys - dia;
      return [
        { label: 'Systolic (SBP)',    value: `${sys || '--'} mmHg`, status: sys > 180 ? 'critical' : sys < 80 ? 'critical' : sys > 150 ? 'warn' : sys < 90 ? 'warn' : 'ok' },
        { label: 'Diastolic (DBP)',   value: `${dia || '--'} mmHg`, status: dia > 110 ? 'critical' : dia < 50 ? 'critical' : dia > 95 ? 'warn' : dia < 60 ? 'warn' : 'ok' },
        { label: 'Pulse pressure',    value: `${pp || '--'} mmHg (SBP − DBP)`, status: pp > 60 ? 'warn' : pp < 20 ? 'warn' : 'ok' },
        { label: 'Monitor type',      value: patient?.hasALine ? 'Arterial Line (continuous, beat-to-beat)' : 'NIBP (oscillometric, intermittent)', status: 'ok' },
        { label: 'Heart rate',        value: `${vitals?.hr || '--'} bpm`, status: 'ok' },
        { label: 'Volatile MAC',      value: `${(vitals?.mac || 0).toFixed(2)} MAC → ↓SVR`, status: 'ok' },
      ];
    },
    getActions: ({ vitals, patient, activeMeds }, { processMed, setPatient, logEvent }) => {
      const sys = vitals?.sys || 0;
      const dia = vitals?.dia || 0;
      return [
        { label: 'Phenylephrine 100mcg', category: 'med', urgent: sys < 80,
          detail: 'Pure α1 → ↑SVR ↑SBP. Reflex bradycardia. Preferred for mild intraop hypotension.',
          action: () => processMed('phenylephrine', '0.1', 'IV', 'Bolus', 'mg') },
        { label: 'Ephedrine 10mg',       category: 'med', urgent: sys < 80,
          detail: 'α1 + β1 (mixed). Maintains HR. Preferred in OB spinal hypotension.',
          action: () => processMed('ephedrine', '10', 'IV', 'Bolus', 'mg') },
        { label: 'Labetalol 10mg',       category: 'med', urgent: sys > 180,
          detail: 'α + β block → ↓SBP and ↓HR. Intraop hypertensive urgency.',
          action: () => processMed('labetalol', '10', 'IV', 'Bolus', 'mg') },
        { label: 'Hydralazine 10mg',     category: 'med', urgent: false, hidden: sys < 160,
          detail: 'Direct arteriodilator → ↓SBP. Onset 15-30 min. Reflex tachycardia.',
          action: () => processMed('hydralazine', '10', 'IV', 'Bolus', 'mg') },
        { label: 'Place A-Line',         category: 'other', urgent: sys < 80 || sys > 180, hidden: !!patient?.hasALine,
          detail: 'Continuous beat-to-beat BP monitoring. Essential for hemodynamic instability.',
          action: () => logEvent('ACTION: Place arterial line for continuous blood pressure monitoring.') },
      ].filter(a => !a.hidden);
    },
    getClinicalPearl: ({ vitals, patient }) => {
      const sys = vitals?.sys || 0;
      const dia = vitals?.dia || 0;
      const pp = sys - dia;
      if (!patient?.hasALine) return 'NIBP (oscillometric) underestimates SBP in hypotension and overestimates in hypertension. For hemodynamic instability, place an arterial line for accurate continuous monitoring.';
      if (pp < 20) return `Narrow pulse pressure (${pp} mmHg) suggests ↓stroke volume (tamponade, severe hypovolemia, AS) or ↑SVR. PP = SV × SVR / compliance.`;
      if (pp > 60) return `Wide pulse pressure (${pp} mmHg) = ↑stroke volume (AR, hyperdynamic sepsis) or ↓SVR. In elderly: stiff vessels widen PP independently of SV.`;
      return 'SBP reflects stroke volume × SVR peak. DBP reflects SVR × diastolic run-off. MAP = the true organ perfusion pressure (driven by CO × SVR). Pulse pressure = SBP − DBP = surrogate for stroke volume.';
    }
  },

  // ── PPV — PULSE PRESSURE VARIATION ────────────────────────────────────────
  ppv: {
    label: 'PPV', subtitle: 'Pulse Pressure Variation', unit: '%', color: 'red',
    normal: '< 13% = unlikely fluid responder | > 13% = likely fluid responder',
    getDrivers: ({ vitals, patient, ventSettings }) => {
      const hasSinus    = patient?.cardiacRhythm === 'normal';
      const isMechVent  = patient?.ventilationStatus === 'mechanical' || (ventSettings?.mode && ventSettings?.mode !== 'spontaneous');
      const tvPerKg     = (vitals?.vte || 0) / (patient?.weight || 70);
      const hasSuffTv   = tvPerKg >= 7.0;
      const hasHrRrRatio= (vitals?.hr || 70) / (vitals?.rr || 12) >= 4.0;
      const isValid     = hasSinus && isMechVent && hasSuffTv && hasHrRrRatio;
      return [
        { label: 'PPV validity',      value: isValid ? '✓ Valid measurement' : '✗ INVALID — conditions not met', status: isValid ? 'ok' : 'warn' },
        { label: 'Sinus rhythm',      value: hasSinus ? '✓ Normal sinus' : `✗ ${patient?.cardiacRhythm || 'Arrhythmia'} — PPV unreliable`, status: hasSinus ? 'ok' : 'warn' },
        { label: 'Mechanical vent',   value: isMechVent ? '✓ Controlled ventilation' : '✗ Spontaneous — PPV unreliable', status: isMechVent ? 'ok' : 'warn' },
        { label: 'Vt ≥ 7 mL/kg',    value: `${tvPerKg.toFixed(1)} mL/kg (${hasSuffTv ? '✓' : '✗ < 7 mL/kg'})`, status: hasSuffTv ? 'ok' : 'warn' },
        { label: 'HR/RR ratio ≥ 4',  value: `${((vitals?.hr||70)/(vitals?.rr||12)).toFixed(1)} (${hasHrRrRatio ? '✓' : '✗ < 4'})`, status: hasHrRrRatio ? 'ok' : 'warn' },
        { label: 'Volume status (EBL)', value: `${Math.round(patient?.ebl || 0)} mL blood loss`, status: (patient?.ebl || 0) > 1000 ? 'critical' : (patient?.ebl || 0) > 500 ? 'warn' : 'ok' },
      ];
    },
    getActions: ({ vitals, patient, ventSettings }, { setVent, logEvent }) => {
      const eblRatio  = (patient?.ebl || 0) / (patient?.ebv || 5000);
      const ppvCalc   = Math.max(3, Math.min(45, Math.round(8 + eblRatio * 50)));
      const tvPerKg   = (vitals?.vte || 0) / (patient?.weight || 70);
      return [
        { label: 'Fluid challenge (250 mL)', category: 'other', urgent: ppvCalc > 13,
          detail: 'PPV > 13% predicts fluid responsiveness (>10% ↑CO after 500 mL bolus). Challenge first.',
          action: () => logEvent('Fluid challenge 250 mL initiated based on PPV > 13%.') },
        { label: `Vt → 8 mL/kg (${Math.round((patient?.weight || 70) * 8)} mL)`, category: 'vent',
          urgent: tvPerKg < 7, hidden: tvPerKg >= 7,
          detail: 'Vt < 7 mL/kg renders PPV invalid. Increase to ≥ 7 mL/kg to validate PPV.',
          action: () => { setVent({ vt: Math.round((patient?.weight || 70) * 8) }); logEvent('Vt increased to 8 mL/kg to validate PPV measurement.'); } },
        { label: 'Passive Leg Raise test', category: 'other', urgent: false,
          detail: 'Autotransfusion of 150-300 mL from legs. Reversible — predicts fluid responsiveness even in arrhythmia or spontaneous breathing (unlike PPV).',
          action: () => logEvent('Passive Leg Raise test: elevate legs 45° for 60-90s, monitor CO or pulse pressure change.') },
      ].filter(a => !a.hidden);
    },
    getClinicalPearl: ({ vitals, patient, ventSettings }) => {
      const hasSinus    = patient?.cardiacRhythm === 'normal';
      const isMechVent  = patient?.ventilationStatus === 'mechanical' || (ventSettings?.mode && ventSettings?.mode !== 'spontaneous');
      if (!hasSinus) return 'PPV is INVALID in arrhythmia — the irregular RR intervals cause pulse pressure to vary for rhythm reasons, not volume status. Use Passive Leg Raise or static CVP instead.';
      if (!isMechVent) return 'PPV requires MECHANICAL ventilation to generate the cyclic intrathoracic pressure changes that modulate venous return. In spontaneous breathing, effort variability confounds the measurement.';
      return 'PPV > 13% = fluid responder (sensitivity 88%, specificity 89%, Marik 2009). Mechanism: mechanical breath → ↑intrathoracic P → ↓RV preload → ↑LV output, then reversal on expiration. PP swings reflect this cycle.';
    }
  },

  // ── cMAP — CEREBRAL / CORRECTED MAP ──────────────────────────────────────
  cmap: {
    label: 'cMAP', subtitle: 'Corrected MAP at the Circle of Willis', unit: 'mmHg', color: 'red',
    normal: '≥ 65 mmHg (> 80 in cerebrovascular disease)',
    getDrivers: ({ vitals, patient }) => {
      const map  = vitals?.map  || 90;
      const cmap = vitals?.cmap || map;
      const diff = map - cmap;
      const pos  = patient?.position || 'Supine';
      return [
        { label: 'cMAP (at CoW)',     value: `${Math.round(cmap)} mmHg`, status: cmap < 50 ? 'critical' : cmap < 65 ? 'critical' : cmap < 75 ? 'warn' : 'ok' },
        { label: 'Systemic MAP',      value: `${Math.round(map)} mmHg`,  status: 'ok' },
        { label: 'Hydrostatic diff.', value: `−${Math.round(Math.abs(diff))} mmHg from ${pos} position`, status: Math.abs(diff) > 20 ? 'warn' : 'ok' },
        { label: 'Head position',     value: pos, status: ['Sitting','Beach Chair'].includes(pos) ? 'warn' : 'ok' },
        { label: 'CPP',               value: patient?.cpp ? `${Math.round(patient.cpp)} mmHg (MAP − ICP)` : 'ICP not monitored', status: (patient?.cpp || 90) < 60 ? 'critical' : (patient?.cpp || 90) < 70 ? 'warn' : 'ok' },
        { label: 'ICP',               value: patient?.icp ? `${Math.round(patient.icp)} mmHg` : 'Not monitored', status: (patient?.icp || 10) > 20 ? 'critical' : (patient?.icp || 10) > 15 ? 'warn' : 'ok' },
      ];
    },
    getActions: ({ vitals, patient, activeMeds }, { processMed, logEvent }) => {
      const cmap = vitals?.cmap || 90;
      const pos  = patient?.position || 'Supine';
      return [
        { label: 'Phenylephrine 100mcg',  category: 'med', urgent: cmap < 60,
          detail: 'Raise systemic MAP → raises cMAP proportionally. First-line for sitting/beach-chair hypotension.',
          action: () => processMed('phenylephrine', '0.1', 'IV', 'Bolus', 'mg') },
        { label: 'Norepinephrine 8mcg',   category: 'med', urgent: cmap < 55,
          detail: 'α1 dominant vasoconstriction → ↑MAP → ↑cMAP + CPP.',
          action: () => processMed('norepinephrine', '0.008', 'IV', 'Bolus', 'mg') },
        { label: 'Head-down (Trendelenburg)', category: 'other', urgent: cmap < 60, hidden: pos === 'Supine',
          detail: 'Lower head reduces hydrostatic gradient → immediately raises cMAP by reducing height difference from heart to brain.',
          action: () => logEvent('ALERT: Consider lowering the head of bed to increase cerebral MAP in sitting/beach-chair position.') },
        { label: 'Set MAP target > 80',   category: 'other', urgent: false,
          detail: 'In sitting/beach-chair or patients with cerebrovascular disease: maintain systemic MAP > 80-90 to ensure adequate cerebral perfusion.',
          action: () => logEvent('MAP target adjusted: maintain MAP > 80 mmHg for adequate cMAP in current position.') },
      ].filter(a => !a.hidden);
    },
    getClinicalPearl: ({ vitals, patient }) => {
      const cmap = vitals?.cmap || 90;
      const pos  = patient?.position || 'Supine';
      const diff = (vitals?.map || 90) - cmap;
      if (['Sitting','Beach Chair'].includes(pos)) return `Beach chair / sitting position: brain is ~${Math.round(Math.abs(diff)/0.7)} cm above the heart. Each 10 cm = −7.4 mmHg cMAP. At systemic MAP 70, cMAP ≈ ${Math.round(cmap)} mmHg — well below the 65 mmHg minimum. Maintain MAP > 80-90 in this position.`;
      if (cmap < 60) return 'cMAP < 60 mmHg is below the cerebral autoregulation lower limit. Cerebral blood flow becomes pressure-passive → risk of watershed ischemia, postoperative cognitive dysfunction, and stroke.';
      return 'cMAP = MAP − (0.77 × height above heart in cmH2O). The 0.77 factor converts cm water to mmHg. In supine, cMAP ≈ MAP. In sitting, cMAP can be 20-30 mmHg below MAP — a dangerous underestimate if only monitoring the radial MAP.';
    }
  },

  // ── MAP / BLOOD PRESSURE ───────────────────────────────────────────────────
  map: {
    label: 'MAP', subtitle: 'Mean Arterial Pressure', unit: 'mmHg', color: 'red',
    normal: '65-100 mmHg',
    getDrivers: ({ vitals, patient, activeMeds, gasSettings }) => {
      const mac             = vitals?.mac || 0;
      const anaphylaxisActive = patient?.anaphylaxisTriggered || patient?.anaphylaxisActive || false;
      const adrenalCrisis   = patient?.adrenalCrisisActive || false;
      const thyroidStorm    = patient?.thyroidStormActive || false;
      const bcisActive      = patient?.bcisActive || false;
      const vaeActive       = patient?.venousAirEmbolismActive || false;
      const afeActive       = patient?.afeActive || false;
      const highSpinalBlock = patient?.highSpinalRisk || false;

      // Determine if there's a specific crisis causing the MAP change
      const mapCrisis = (() => {
        if (anaphylaxisActive) return 'Anaphylaxis — vasodilation + ↓CO → refractory shock ⚠';
        if (adrenalCrisis)     return 'Adrenal Crisis — cortisol-deficient vasodilation, vasopressor-resistant ⚠';
        if (vaeActive)         return 'Venous Air Embolism — RV outflow obstruction → ↓CO → ↓MAP ⚠';
        if (afeActive)         return 'Amniotic Fluid Embolism — massive PE + DIC → cardiovascular collapse ⚠';
        if (bcisActive)        return 'BCIS — cement monomer toxicity → acute cardiac depression ⚠';
        if (highSpinalBlock)   return 'High Spinal — total sympathectomy → profound ↓SVR + bradycardia ⚠';
        if (thyroidStorm)      return 'Thyroid Storm — hyperdynamic + ↓DBP from vasodilation';
        return null;
      })();

      return [
        ...(mapCrisis ? [{ label: 'Crisis cause ⚠', value: mapCrisis, status: 'critical' }] : []),
        { label: 'SVR',           value: `~${Math.round(vitals?.svr || 1000)} dyn·s/cm⁵`,
          status: (vitals?.svr || 1000) < 600 ? 'critical' : (vitals?.svr || 1000) < 800 ? 'warn' : 'ok' },
        { label: 'CO',            value: `${(vitals?.co || 5).toFixed(1)} L/min`,
          status: (vitals?.co || 5) < 3 ? 'critical' : (vitals?.co || 5) < 4 ? 'warn' : 'ok' },
        { label: 'Volatile MAC',  value: `${mac.toFixed(2)} MAC (${gasSettings?.agent || 'none'})`,
          status: mac > 1.2 ? 'warn' : 'ok' },
        { label: 'Volume status', value: patient?.ebl > 1000 ? `EBL ${Math.round(patient.ebl)} mL` : 'Estimated adequate',
          status: (patient?.ebl || 0) > 1000 ? 'critical' : (patient?.ebl || 0) > 500 ? 'warn' : 'ok' },
        { label: 'Vasopressors',  value: hasMed(activeMeds,'Norepinephrine') ? `NE active` : hasMed(activeMeds,'Phenylephrine') ? 'Phenylephrine active' : hasMed(activeMeds,'Vasopressin') ? 'Vasopressin active' : 'None',
          status: 'ok' },
        { label: 'Propofol',      value: `Ce ${medCe(activeMeds,'Propofol').toFixed(1)} mcg/mL`,
          status: medCe(activeMeds,'Propofol') > 4 ? 'warn' : 'ok' },
        { label: 'Sepsis score',  value: patient?.isSeptic ? `Score ${(patient?.sepsisScore || 0).toFixed(1)}` : 'Not septic',
          status: patient?.isSeptic ? (patient?.sepsisScore > 2 ? 'critical' : 'warn') : 'ok' },
      ];
    },
    getActions: ({ vitals, patient, activeMeds }, { processMed, setPatient, logEvent }) => {
      const map = vitals?.map || 90;
      const co  = vitals?.co  || 5;
      return [
        { label: 'Phenylephrine 100mcg',   category: 'med', urgent: map < 55,
          detail: 'Pure α1 → ↑SVR ↑MAP. No direct cardiac stimulation. Causes reflex bradycardia.',
          action: () => processMed('phenylephrine', '0.1', 'IV', 'Bolus', 'mg') },
        { label: 'Norepinephrine 8mcg',    category: 'med', urgent: map < 55 && co < 3.5,
          detail: 'α1 dominant + β1 → ↑SVR + ↑inotropy. First-line for septic shock.',
          action: () => processMed('norepinephrine', '0.008', 'IV', 'Bolus', 'mg') },
        { label: 'Ephedrine 10mg',         category: 'med', urgent: map < 60,
          detail: 'Mixed direct/indirect. Maintains heart rate (preferred in OB). Faster onset than phenylephrine.',
          action: () => processMed('ephedrine', '10', 'IV', 'Bolus', 'mg') },
        { label: 'Vasopressin 0.04 U/min', category: 'med', urgent: map < 55 && hasMed(activeMeds, 'Norepinephrine'),
          detail: 'V1 vasoconstriction, catecholamine-independent. Use when NE alone insufficient.',
          action: () => processMed('vasopressin', '0.04', 'IV', 'Bolus', 'mg') },
        { label: 'NS 250mL bolus',         category: 'other', urgent: (patient?.ebl || 0) > 500,
          detail: 'Volume expansion for hypovolemia/blood loss. Check EBL before crystalloid.',
          action: () => { logEvent('Normal Saline 250mL bolus ordered via context panel.'); } },
        { label: 'Labetalol 10mg',         category: 'med', urgent: map > 130,
          detail: 'α+β blockade → ↓SVR and ↓HR. Useful for hypertensive urgency intraoperatively.',
          action: () => processMed('labetalol', '10', 'IV', 'Bolus', 'mg') },
        { label: 'Hydralazine 10mg',       category: 'med', urgent: map > 130,
          detail: 'Direct arteriodilator → ↓SVR. Slow onset (15-30 min). Reflex tachycardia.',
          action: () => processMed('hydralazine', '10', 'IV', 'Bolus', 'mg') },
      ].filter(a => !a.hidden);
    },
    getClinicalPearl: ({ vitals, patient }) => {
      const map = vitals?.map || 90;
      if (map < 55) return 'MAP < 55 = end-organ hypoperfusion threshold. Cerebral autoregulation fails; coronary perfusion depends on aortic diastolic pressure. Act immediately.';
      if (map > 120) return 'Sustained MAP > 120 = increased bleeding, stroke, and LV strain risk. Differentiate pain (light anesthesia) from essential hypertension before treating.';
      return 'MAP = DBP + 1/3(PP). Maintain >65 mmHg for organ perfusion; >80 for pre-existing cerebrovascular disease or sitting position.';
    }
  },

  // ── EtCO2 ─────────────────────────────────────────────────────────────────
  etco2: {
    label: 'EtCO₂', subtitle: 'End-Tidal CO₂', unit: 'mmHg', color: 'yellow',
    normal: '35-45 mmHg',
    getDrivers: ({ vitals, patient, ventSettings }) => {
      // EtCO2 is the FIRST indicator of several life-threatening crises:
      // MH → CO2 spikes (most sensitive sign), PE/VAE → CO2 drops (dead space ↑)
      const mhActive  = patient?.mhActive || false;
      const vaeActive = patient?.venousAirEmbolismActive || false;
      const peActive  = patient?.peActive || false;
      const metabolicMult = patient?.totalMetabolicMultiplier || 1.0;

      const co2Crisis = (() => {
        if (mhActive)  return 'MH — CO₂ production massively ↑ (most sensitive MH sign) ⚠';
        if (vaeActive) return 'VAE — CO₂ drops from dead-space ↑ and obstructed CO ⚠';
        if (peActive)  return 'PE — dead space ↑, EtCO₂ drops, VD/VT widens ⚠';
        if (metabolicMult > 1.5) return `↑ Metabolic rate ×${metabolicMult.toFixed(1)} (sepsis/fever/shivering)`;
        return null;
      })();

      return [
        { label: 'RR (set)',        value: patient?.airwaySecured ? `${ventSettings?.rr || 12} /min` : 'Spontaneous', status: 'ok' },
        { label: 'Tidal volume',    value: `${Math.round(vitals?.vte || 500)} mL`,
          status: (vitals?.vte || 500) < 6*(patient?.weight||70) ? 'warn' : 'ok' },
        { label: 'PEEP',            value: `${ventSettings?.peep || 0} cmH2O`, status: 'ok' },
        ...(co2Crisis ? [{ label: 'Crisis cause ⚠', value: co2Crisis, status: 'critical' }] : []),
        { label: 'CO₂ rebreathing', value: (patient?.co2AbsorptiveCapacity || 1) < 0.2 ? 'CO₂ absorber EXHAUSTED' : 'Absorber OK',
          status: (patient?.co2AbsorptiveCapacity || 1) < 0.2 ? 'critical' : 'ok' },
        { label: 'Cardiac output',  value: `${(vitals?.co || 5).toFixed(1)} L/min`,
          status: (vitals?.co || 5) < 2.5 ? 'critical' : 'ok' },
        { label: 'Airway position', value: patient?.tubePosition || 'Trachea',
          status: patient?.tubePosition === 'esophagus' ? 'critical' : 'ok' },
      ];
    },
    getActions: ({ vitals, patient, ventSettings }, { processMed, setVent, logEvent }) => {
      const etco2 = vitals?.etco2 || 38;
      const rr = ventSettings?.rr || 12;
      return [
        { label: `RR → ${rr + 2} /min`,  category: 'vent', urgent: etco2 > 50,
          detail: 'Increase RR to ↑alveolar ventilation → ↓PaCO2. Quick first-line for hypercapnia.',
          action: () => { setVent({ rr: rr + 2 }); logEvent(`RR increased to ${rr+2}/min.`); } },
        { label: `RR → ${Math.max(6,rr - 2)} /min`, category: 'vent', urgent: etco2 < 25,
          detail: 'Reduce RR to ↑CO2 and prevent hypocapnic cerebral vasoconstriction.',
          action: () => { setVent({ rr: Math.max(6, rr - 2) }); logEvent(`RR decreased to ${Math.max(6,rr-2)}/min.`); } },
        { label: 'Vt → 7 mL/kg IBW',    category: 'vent', urgent: false, hidden: !patient?.airwaySecured,
          detail: 'Lung-protective tidal volume per ARDS-Net. Adjust for patient size.',
          action: () => { const vt = Math.round((patient?.ibw || patient?.weight || 70) * 7); setVent({ vt }); logEvent(`Vt set to ${vt} mL.`); } },
        { label: 'Check ETT position',   category: 'other', urgent: etco2 === 0 && !!patient?.airwaySecured,
          detail: 'Zero EtCO2 on intubated patient = esophageal intubation until proven otherwise.',
          action: () => logEvent('CLINICAL CHECK: Confirm ETT position — auscultate, direct laryngoscopy, chest X-ray.') },
        { label: 'Capnography review',   category: 'other', urgent: false,
          detail: 'Review waveform morphology — bronchospasm (shark fin), rebreathing (elevated baseline), esophageal (rapid decay).',
          action: () => logEvent('EtCO2 waveform reviewed. Check phase I baseline, II slope, and III plateau angle.') },
      ].filter(a => !a.hidden);
    },
    getClinicalPearl: ({ vitals }) => {
      const etco2 = vitals?.etco2 || 38;
      if (etco2 === 0) return 'ZERO EtCO2 = esophageal intubation until proven otherwise. Confirm by direct visualization, auscultation, and sustained waveform.';
      if (etco2 < 20) return 'EtCO2 < 20 after intubation suggests low CO (cardiac arrest, massive PE, severe air embolism) or hyperventilation. Low CO is life-threatening.';
      if (etco2 > 55) return 'Hypercapnia: PaCO2 = EtCO2 + gradient (normally 2-5 mmHg). High gradient = dead space ↑ (PE, low CO). Permissive hypercapnia ok in ARDS to 55-60.';
      return 'EtCO2 ≈ PaCO2 – (2-5 mmHg dead-space gradient). Gradient widens with pulmonary embolism, low CO, and ARDS.';
    }
  },

  // ── TEMPERATURE ────────────────────────────────────────────────────────────
  temp: {
    label: 'Temp', subtitle: 'Core Temperature', unit: '°C', color: 'blue',
    normal: '36.5-37.5°C',
    getDrivers: ({ vitals, patient }) => {
      // Multi-source hyperthermia/hypothermia detection
      const mhActive      = patient?.mhActive || false;
      const thyroidStorm  = patient?.thyroidStormActive || false;
      const serotoninSyn  = patient?.serotoninSyndromeTriggered || patient?.maoisCrisisActive || false;
      const nmsActive     = patient?.nmsActive || false;
      const sepsisScore   = patient?.sepsisScore || 0;
      const temp          = vitals?.temp || 37;

      const tempCrisis = (() => {
        if (mhActive)     return 'MH ACTIVE — temp can rise >1°C/min without dantrolene ⚠';
        if (thyroidStorm) return 'Thyroid Storm — hyperthermia from ↑BMR ⚠';
        if (serotoninSyn) return 'Serotonin Syndrome — hyperthermia from muscular hyperactivity ⚠';
        if (nmsActive)    return 'NMS — hyperthermia from skeletal muscle rigidity ⚠';
        if (sepsisScore > 1 && temp > 38) return `Sepsis score ${sepsisScore.toFixed(1)} — inflammatory fever`;
        return null;
      })();

      return [
        { label: 'Current temp',   value: `${temp.toFixed(1)}°C`,
          status: temp > 38.5 ? 'critical' : temp < 35 ? 'critical' : temp < 36 ? 'warn' : 'ok' },
        ...(tempCrisis ? [{ label: 'Crisis cause ⚠', value: tempCrisis, status: 'critical' }] : []),
        { label: 'Forced-air warming', value: patient?.forcedAirWarmingActive ? '✓ Active' : '✗ Off',
          status: patient?.forcedAirWarmingActive ? 'ok' : 'warn' },
        { label: 'Warm blankets',   value: patient?.warmBlanketActive ? '✓ Applied' : '✗ None', status: 'ok' },
        { label: 'OR ambient',      value: 'Typical 18-22°C (cold)', status: temp < 36 ? 'warn' : 'ok' },
        { label: 'Volatile agents', value: 'Vasodilation → ↑heat loss', status: 'ok' },
        { label: 'MH risk',         value: patient?.malignantHyperthermiaRisk ? '⚠ MH RISK PATIENT' : 'Not flagged',
          status: patient?.malignantHyperthermiaRisk ? 'critical' : 'ok' },
        { label: 'Thyroid status',  value: thyroidStorm ? '⚠ THYROID STORM' : 'Normal',
          status: thyroidStorm ? 'critical' : 'ok' },
      ];
    },
    getActions: ({ vitals, patient }, { processMed, setPatient, logEvent }) => {
      const temp = vitals?.temp || 37;
      return [
        { label: 'Apply Bair Hugger',     category: 'other', urgent: temp < 36, hidden: !!patient?.forcedAirWarmingActive,
          detail: 'Forced-air warming: most effective rewarming strategy intraop (~40W output).',
          action: () => { setPatient(p => ({...p, forcedAirWarmingActive: true})); logEvent('Bair Hugger forced-air warming applied.'); } },
        { label: 'Remove Bair Hugger',    category: 'other', urgent: false, hidden: !patient?.forcedAirWarmingActive,
          detail: 'Discontinue warming if normothermia achieved or fever present.',
          action: () => { setPatient(p => ({...p, forcedAirWarmingActive: false})); logEvent('Bair Hugger removed.'); } },
        { label: 'Apply warm blankets',   category: 'other', urgent: false, hidden: !!patient?.warmBlanketActive,
          detail: 'Passive insulation (~12W). Less effective than forced-air but additive.',
          action: () => { setPatient(p => ({...p, warmBlanketActive: true})); logEvent('Warm cotton blankets applied.'); } },
        { label: 'Dantrolene 2.5mg/kg',  category: 'med', urgent: temp > 39 && patient?.malignantHyperthermiaRisk,
          detail: 'MALIGNANT HYPERTHERMIA treatment. RyR1 antagonist → stops SR Ca²⁺ release. 2.5 mg/kg IV q5min until response.',
          action: () => processMed('dantrolene', String(Math.round((patient?.weight || 70) * 2.5)), 'IV', 'Bolus', 'mg') },
        { label: 'Acetaminophen 1g IV',   category: 'med', urgent: false, hidden: temp < 38,
          detail: 'Antipyretic for fever. Note: intraoperative fever is unusual — rule out MH, sepsis, blood transfusion reaction.',
          action: () => processMed('acetaminophen', '1000', 'IV', 'Bolus', 'mg') },
      ].filter(a => !a.hidden);
    },
    getClinicalPearl: ({ vitals, patient }) => {
      const temp = vitals?.temp || 37;
      if (temp > 38.5 && patient?.malignantHyperthermiaRisk) return 'SUSPECT MH if T↑ + EtCO2↑ + rigidity + acidosis + tachycardia. Call for help, stop volatile, 100% O2, give dantrolene. MH hotline: 1-800-644-9737.';
      if (temp < 35) return 'Hypothermia triad: <35°C causes coagulopathy + acidosis + hypothermia = lethal triad. Warming, stop bleeding, correct acidosis simultaneously.';
      if (temp < 36) return 'Phase 1 hypothermia (36-37°C): redistribution from core to periphery (first 30-60 min anesthesia). Bair Hugger BEFORE induction is most effective prevention.';
      return 'Normothermia target: 36.5-37.5°C. Every 1°C drop below 36°C = 10% increase in surgical site infection risk + 10% prolongation of NMB block duration.';
    }
  },

  // ── BIS ────────────────────────────────────────────────────────────────────
  bis: {
    label: 'BIS', subtitle: 'Bispectral Index (Depth of Anesthesia)', unit: '', color: 'purple',
    normal: '40-60 (surgical anesthesia)',
    getDrivers: ({ vitals, patient, activeMeds, gasSettings }) => [
      { label: 'Propofol Ce',     value: `${medCe(activeMeds,'Propofol').toFixed(1)} mcg/mL`,
        status: medCe(activeMeds,'Propofol') > 6 ? 'warn' : 'ok' },
      { label: 'Volatile MAC',    value: `${(vitals?.mac || 0).toFixed(2)} MAC`,
        status: (vitals?.mac || 0) < 0.5 && patient?.airwaySecured ? 'warn' : 'ok' },
      { label: 'Midazolam',       value: medCe(activeMeds,'Midazolam') > 0.01 ? `Ce ${medCe(activeMeds,'Midazolam').toFixed(2)}` : 'None',
        status: 'ok' },
      { label: 'Dexmedetomidine', value: medCe(activeMeds,'Dexmedetomidine') > 0.1 ? `Ce ${medCe(activeMeds,'Dexmedetomidine').toFixed(2)}` : 'None',
        status: 'ok' },
      { label: 'Ketamine',        value: medCe(activeMeds,'Ketamine') > 0.1 ? `⚠ Ketamine active — BIS unreliable` : 'None',
        status: medCe(activeMeds,'Ketamine') > 0.1 ? 'warn' : 'ok' },
      { label: 'Surgical stimulus', value: patient?.manipulationIndex > 0.5 ? 'High (may ↑ BIS)' : 'Low',
        status: 'ok' },
    ],
    getActions: ({ vitals, patient, activeMeds, gasSettings }, { processMed, setVent, setGas, setPatient, logEvent }) => {
      const bis = vitals?.bis || 50;
      const mac = vitals?.mac || 0;
      return [
        { label: 'Attach BIS Monitor',   category: 'monitor', urgent: !patient?.hasBisMonitor, hidden: !!patient?.hasBisMonitor,
          detail: 'Required to display BIS. Apply frontoparietal electrode strip.',
          action: () => { setPatient(p => ({...p, hasBisMonitor: true})); logEvent('BIS monitor attached.'); } },
        { label: 'Propofol 30mg bolus',  category: 'med', urgent: bis > 75 && patient?.airwaySecured,
          detail: 'Bolus to rapidly ↓BIS for intraoperative awareness prevention.',
          action: () => processMed('propofol', '30', 'IV', 'Bolus', 'mg') },
        { label: 'Propofol 50mg bolus',  category: 'med', urgent: bis > 85,
          detail: 'Larger bolus for significantly light anesthesia or anticipated stimulation.',
          action: () => processMed('propofol', '50', 'IV', 'Bolus', 'mg') },
        { label: 'Midazolam 2mg IV',     category: 'med', urgent: false,
          detail: 'BZD → adds GABA-A modulation. Useful adjunct; causes amnesia.',
          action: () => processMed('midazolam', '2', 'IV', 'Bolus', 'mg') },
        { label: 'Fentanyl 100mcg IV',   category: 'med', urgent: bis > 70 && patient?.manipulationIndex > 0.5,
          detail: 'Opioid analgesia → blunts stimulus-driven BIS rise.',
          action: () => processMed('fentanyl', '0.1', 'IV', 'Bolus', 'mg') },
      ].filter(a => !a.hidden);
    },
    getClinicalPearl: ({ vitals, patient, activeMeds }) => {
      const bis = vitals?.bis || 50;
      const ketCe = medCe(activeMeds, 'Ketamine');
      if (ketCe > 0.5) return 'Ketamine causes DISSOCIATIVE EEG — BIS is unreliable during ketamine anesthesia. BIS may be falsely HIGH (40-60 range) even during deep dissociation.';
      if (bis > 80) return 'BIS > 80 = risk of awareness during surgical stimulation. Deepen anesthesia before incision/major stimulus.';
      if (bis < 30) return 'BIS < 30 = deep anesthesia, rarely necessary. Associated with ↑POCD and mortality. Titrate up.';
      return 'BIS 40-60 = surgical anesthesia. BIS is a processed EEG — it reflects cerebral cortical suppression, not spinal cord nociceptive transmission.';
    }
  },

  // ── TOF ────────────────────────────────────────────────────────────────────
  tof: {
    label: 'TOF', subtitle: 'Train-of-Four (Neuromuscular Block)', unit: '/4', color: 'orange',
    normal: 'TOF ≥ 0.9 before extubation',
    getDrivers: ({ vitals, patient, activeMeds, electrolytes }) => {
      const roc = findMed(activeMeds, 'Rocuronium');
      const vec = findMed(activeMeds, 'Vecuronium');
      const cis = findMed(activeMeds, 'Cisatracurium');
      const sux = findMed(activeMeds, 'Succinylcholine');
      const currentNmb = roc || vec || cis || sux;

      // Potentiating factors — these prolong NMB beyond what Ce alone predicts
      const temp = vitals?.temp || 37;
      const mg   = electrolytes?.mg || 1.0;  // serum magnesium (magnesium sulfate therapy)
      const hypothermiaProlonging = temp < 35;
      const hypermagPotentiating  = mg > 2.5;  // Mg > 2.5 mEq/L potentiates NMJ block
      const aminoglycosideActive  = hasMed(activeMeds,'Gentamicin') || hasMed(activeMeds,'Vancomycin');

      return [
        { label: 'NMB drug',      value: currentNmb ? `${currentNmb.name} (Ce ${currentNmb.Ce?.toFixed(2)})` : 'None',
          status: currentNmb ? (vitals?.tofCount <= 2 ? 'critical' : vitals?.tofCount <= 3 ? 'warn' : 'ok') : 'ok' },
        { label: 'TOF count',     value: `${vitals?.tofCount ?? 4}/4`,
          status: (vitals?.tofCount ?? 4) === 0 ? 'critical' : (vitals?.tofCount ?? 4) < 4 ? 'warn' : 'ok' },
        { label: 'TOF ratio',     value: `${((vitals?.tofRatio || 1) * 100).toFixed(0)}%`,
          status: (vitals?.tofRatio || 1) < 0.7 ? 'critical' : (vitals?.tofRatio || 1) < 0.9 ? 'warn' : 'ok' },
        { label: 'Temperature',   value: `${temp.toFixed(1)}°C${hypothermiaProlonging ? ' — ↓enzyme activity prolongs block ⚠' : ''}`,
          status: hypothermiaProlonging ? 'warn' : 'ok' },
        { label: 'Serum Mg²⁺',   value: `${mg.toFixed(1)} mEq/L${hypermagPotentiating ? ' — potentiates NMJ block ⚠' : ''}`,
          status: hypermagPotentiating ? 'warn' : 'ok' },
        { label: 'Aminoglycosides', value: aminoglycosideActive ? 'Active — potentiates NMJ block ⚠' : 'None',
          status: aminoglycosideActive ? 'warn' : 'ok' },
        { label: 'Sugammadex',    value: hasMed(activeMeds,'Sugammadex') ? 'Active — encapsulating NMB' : 'Not given', status: 'ok' },
        { label: 'Neostigmine',   value: hasMed(activeMeds,'Neostigmine') ? `Ce ${medCe(activeMeds,'Neostigmine').toFixed(2)}` : 'Not given', status: 'ok' },
        { label: 'Monitor type',  value: patient?.tofMonitorMode === 'quantitative' ? 'Quantitative (AMG)' : 'Qualitative (tactile)',
          status: patient?.tofMonitorMode === 'quantitative' ? 'ok' : 'warn' },
      ];
    },
    getActions: ({ vitals, patient, activeMeds }, { processMed, setPatient, logEvent }) => {
      const tofCount = vitals?.tofCount ?? 4;
      const tofRatio = vitals?.tofRatio || 1;
      const roc = findMed(activeMeds, 'Rocuronium');
      const vec = findMed(activeMeds, 'Vecuronium');
      const hasNdmb = !!(roc || vec || findMed(activeMeds, 'Cisatracurium'));
      const wt = patient?.weight || 70;
      return [
        { label: 'Sugammadex 16mg/kg',   category: 'med', urgent: tofCount === 0,
          detail: 'Immediate reversal of deep roc/vec block (TOF 0, PTC 1-2). Only for aminosteroidal NMBs.',
          hidden: !hasNdmb,
          action: () => processMed('sugammadex', String(Math.round(wt * 16)), 'IV', 'Bolus', 'mg') },
        { label: 'Sugammadex 4mg/kg',    category: 'med', urgent: tofCount <= 2 && tofCount > 0,
          detail: 'Rapid reversal at TOF 1-2 (deep block). Encapsulates rocuronium/vecuronium.',
          hidden: !hasNdmb || tofCount === 0,
          action: () => processMed('sugammadex', String(Math.round(wt * 4)), 'IV', 'Bolus', 'mg') },
        { label: 'Sugammadex 2mg/kg',    category: 'med', urgent: false,
          detail: 'Standard reversal at TOF ≥ 2. Aim for TOF ratio ≥ 0.9 before extubation.',
          hidden: !hasNdmb || tofCount < 2,
          action: () => processMed('sugammadex', String(Math.round(wt * 2)), 'IV', 'Bolus', 'mg') },
        { label: 'Neostigmine 50mcg/kg', category: 'med', urgent: false,
          detail: 'AChE inhibitor reversal — only when TOF ≥ 2. Give with glycopyrrolate 0.2mg.',
          hidden: hasNdmb && tofCount < 2,
          action: () => { processMed('neostigmine', String(Math.round(wt * 0.05)), 'IV', 'Bolus', 'mg'); processMed('glycopyrrolate', '0.2', 'IV', 'Bolus', 'mg'); } },
        { label: 'Rocuronium 0.6mg/kg',  category: 'med', urgent: false,
          detail: 'Intubating/maintenance dose. Onset ~3 min. Reversed by sugammadex.',
          action: () => processMed('rocuronium', String(Math.round(wt * 0.6)), 'IV', 'Bolus', 'mg') },
        { label: 'Rocuronium 0.15mg/kg', category: 'med', urgent: false,
          detail: 'Maintenance "top-up" dose for ongoing relaxation.',
          action: () => processMed('rocuronium', String(Math.round(wt * 0.15)), 'IV', 'Bolus', 'mg') },
        { label: 'Attach TOF Monitor',       category: 'monitor', urgent: false, hidden: !!patient?.hasTofMonitor,
          detail: 'Place neuromuscular monitoring electrodes. Required to display TOF count/ratio.',
          action: () => { setPatient(p => ({...p, hasTofMonitor: true})); logEvent('TOF neuromuscular monitor attached.'); } },
        { label: '→ Quantitative monitor', category: 'monitor', urgent: tofRatio > 0.7 && tofRatio < 0.9 && patient?.tofMonitorMode !== 'quantitative',
          hidden: !patient?.hasTofMonitor,
          detail: 'TOF ratio 0.7-0.9 needs quantitative confirmation. Tactile cannot detect residual block in this range.',
          action: () => { setPatient(p => ({...p, tofMonitorMode: 'quantitative'})); logEvent('Switched to quantitative neuromuscular monitoring.'); } },
      ].filter(a => !a.hidden);
    },
    getClinicalPearl: ({ vitals, patient }) => {
      const tof = vitals?.tofRatio || 1;
      const count = vitals?.tofCount ?? 4;
      if (count === 0) return 'TOF 0/4 = deep block. Sugammadex 16 mg/kg is the ONLY safe reversal. Neostigmine CANNOT reverse deep block and may cause "recurarization."';
      if (tof < 0.7) return 'TOF ratio < 0.7: DO NOT extubate. Patient cannot maintain airway, head lift, or adequate VT. Risk of aspiration and respiratory failure.';
      if (tof < 0.9) return 'TOF ratio 0.7-0.9 = "zone of uncertainty." Tactile monitoring cannot detect this. ONLY quantitative AMG can confirm readiness for extubation. Target ≥0.9.';
      return 'Safe extubation: TOF ratio ≥ 0.9 (quantitative), awake, following commands, maintaining SpO2, RR 10-20. Clinical signs alone miss 30-60% of residual block.';
    }
  },

  // ── CVP ────────────────────────────────────────────────────────────────────
  cvp: {
    label: 'CVP', subtitle: 'Central Venous Pressure', unit: 'mmHg', color: 'blue',
    normal: '2-8 mmHg (CVP varies widely with volume and compliance)',
    getDrivers: ({ vitals, patient, ventSettings }) => {
      // CVP elevation has many causes — hypovolemia and tension pneumo/tamponade are
      // polar opposites clinically but can both change CVP. Show the likely cause.
      const cvp = vitals?.cvp || 5;
      const tensionPneumo  = patient?.hasPneumothorax || false;
      const tamponade      = patient?.tamponadeActive || patient?.tamponade || false;
      const peActive       = patient?.peActive || false;

      const cvpCause = (() => {
        if (tensionPneumo && cvp > 10) return 'Tension Pneumothorax — ↑intrathoracic P → ↑CVP ⚠';
        if (tamponade && cvp > 10)     return 'Cardiac Tamponade — pericardial compression → ↑CVP ⚠';
        if (peActive && cvp > 10)      return 'Massive PE — RV failure → ↑CVP ⚠';
        if (cvp < 2)                   return 'Hypovolemia — ↓venous return → ↓CVP';
        return null;
      })();

      return [
        { label: 'CVP',         value: `${Math.round(cvp)} mmHg`, status: cvp > 18 ? 'critical' : cvp > 12 ? 'warn' : cvp < 0 ? 'warn' : 'ok' },
        ...(cvpCause ? [{ label: 'Likely cause ⚠', value: cvpCause, status: (tensionPneumo || tamponade || peActive) ? 'critical' : 'warn' }] : []),
        { label: 'Tamponade',   value: tamponade ? '⚠ ACTIVE — pericardial effusion compressing heart' : 'None',
          status: tamponade ? 'critical' : 'ok' },
        { label: 'Pneumothorax', value: tensionPneumo ? '⚠ TENSION — obstructive shock' : 'None',
          status: tensionPneumo ? 'critical' : 'ok' },
        { label: 'PEEP effect', value: patient?.airwaySecured ? `PEEP ${ventSettings?.peep || 5} cmH2O raises CVP ~${Math.round((ventSettings?.peep || 5) * 0.5)} mmHg` : 'N/A', status: 'ok' },
        { label: 'RV function', value: patient?.hasCHF ? 'CHF — RV overloaded' : 'Unknown', status: patient?.hasCHF ? 'warn' : 'ok' },
        { label: 'Volume status', value: (patient?.ebl || 0) > 1000 ? `EBL ${Math.round(patient.ebl)} mL` : 'Estimated adequate', status: 'ok' },
      ];
    },
    getActions: ({ vitals }, { processMed, logEvent }) => [
      { label: 'LR 250mL bolus',   category: 'other', urgent: (vitals?.cvp || 5) < 2,
        detail: 'Volume expansion for low CVP / hypovolemia.',
        action: () => logEvent('LR 250mL bolus ordered via context panel.') },
      { label: 'Furosemide 20mg',  category: 'med', urgent: false, hidden: (vitals?.cvp || 5) < 12,
        detail: 'Diuresis for elevated CVP / fluid overload / RV overload.',
        action: () => processMed('furosemide', '20', 'IV', 'Bolus', 'mg') },
    ].filter(a => !a.hidden),
    getClinicalPearl: () => 'CVP is a poor predictor of volume responsiveness. Dynamic measures (PPV, SVV) better predict fluid responsiveness. CVP > 15 suggests impaired RV emptying or tamponade.'
  },

  // ── RR (primary monitor) ───────────────────────────────────────────────────
  rr: {
    label: 'RR', subtitle: 'Respiratory Rate', unit: '/min', color: 'white',
    normal: '12-20 /min (spontaneous); 10-16 (ventilated)',
    getDrivers: ({ vitals, patient, activeMeds, ventSettings }) => [
      { label: 'Mode',            value: patient?.airwaySecured ? ventSettings?.mode || 'PCV-VG' : 'Spontaneous',
        status: 'ok' },
      { label: 'Opioid effect',   value: medCe(activeMeds,'Fentanyl') > 0.01 ? `Fentanyl Ce ${medCe(activeMeds,'Fentanyl').toFixed(3)} → ↓ RR` : medCe(activeMeds,'Remifentanil') > 0.001 ? 'Remifentanil active' : 'None',
        status: 'ok' },
      { label: 'PaCO2 drive',     value: `EtCO2 ${vitals?.etco2 || 38} mmHg`,
        status: (vitals?.etco2 || 38) > 55 ? 'critical' : 'ok' },
      { label: 'Volatile MAC',    value: `${(vitals?.mac || 0).toFixed(2)} MAC (↓ drive)`,
        status: (vitals?.mac || 0) > 0.8 ? 'warn' : 'ok' },
    ],
    getActions: ({ vitals, patient, ventSettings }, { setVent, logEvent }) => {
      const rr = ventSettings?.rr || 12;
      const etco2 = vitals?.etco2 || 38;
      return [
        { label: `RR → ${rr + 2}`, category: 'vent', urgent: etco2 > 50, hidden: !patient?.airwaySecured,
          detail: 'Increase to eliminate CO2.',
          action: () => { setVent({ rr: rr + 2 }); logEvent(`RR increased to ${rr+2}/min.`); } },
        { label: `RR → ${Math.max(6,rr - 2)}`, category: 'vent', urgent: false, hidden: !patient?.airwaySecured,
          detail: 'Decrease to allow CO2 rise (permissive hypercapnia).',
          action: () => { setVent({ rr: Math.max(6,rr-2) }); logEvent(`RR decreased to ${Math.max(6,rr-2)}/min.`); } },
      ].filter(a => !a.hidden);
    },
    getClinicalPearl: ({ vitals }) => {
      const rr = vitals?.rr || 14;
      if (rr < 8) return 'RR < 8 = apnea/hypoventilation. Opioid overdose common cause — consider naloxone if not on ventilator.';
      if (rr > 30) return 'Tachypnea > 30 = respiratory distress, high WOB, impending failure. Immediate cause identification + airway support.';
      return 'Normal adult RR: 12-20. The I:E ratio affects dynamic hyperinflation: use 1:3 in obstructive disease (more time to exhale).';
    }
  },

  // ═══ VENT MONITOR VITALS ═══════════════════════════════════════════════════

  // ── PIP ────────────────────────────────────────────────────────────────────
  pip: {
    label: 'PIP', subtitle: 'Peak Inspiratory Pressure', unit: 'cmH2O', color: 'yellow',
    normal: '< 30 cmH2O (lung protective)',
    getDrivers: ({ vitals, patient, ventSettings }) => {
      // PIP can spike from resistance (bronchospasm, secretions) OR compliance (pneumothorax,
      // TACO, ARDS, fat embolism) — show the actual source, not just generic labels.
      const rawResistance = vitals?.res || 5;
      const cdyn          = vitals?.compl || 60;
      const tensionPneumo = patient?.hasPneumothorax || false;
      const anaphylaxisActive = patient?.anaphylaxisTriggered || false;
      const airwayObstructed = patient?.bronchospasm || rawResistance > 9;

      const pipCause = (() => {
        if (tensionPneumo)                   return 'TENSION PNEUMOTHORAX — PIP rising acutely ⚠';
        if (airwayObstructed && cdyn > 40)   return 'Airway obstruction (resistance ↑, compliance OK)';
        if (cdyn < 20)                       return 'Compliance severely ↓ (ARDS/pulm edema/pneumothorax)';
        if (airwayObstructed)                return 'Mixed: ↑ resistance + ↓ compliance';
        return null;
      })();

      return [
        { label: 'Compliance (Cdyn)', value: `${Math.round(cdyn)} mL/cmH2O`,
          status: cdyn < 20 ? 'critical' : cdyn < 35 ? 'warn' : 'ok' },
        { label: 'Resistance (Raw)',   value: `${Math.round(rawResistance)} cmH2O/L/s`,
          status: rawResistance > 15 ? 'critical' : rawResistance > 8 ? 'warn' : 'ok' },
        ...(pipCause ? [{ label: 'Likely cause ⚠', value: pipCause, status: tensionPneumo ? 'critical' : 'warn' }] : []),
        { label: 'Tidal volume',       value: `${Math.round(vitals?.vte || 500)} mL`,
          status: (vitals?.vte || 500) > 700 ? 'warn' : 'ok' },
        { label: 'PEEP',               value: `${ventSettings?.peep || 5} cmH2O`, status: 'ok' },
        { label: 'Pneumothorax',       value: tensionPneumo ? '⚠ TENSION PNEUMOTHORAX — needle decompress NOW' : 'Not detected',
          status: tensionPneumo ? 'critical' : 'ok' },
        { label: 'ETT kink/obstruct.', value: 'Check tube position/secretions', status: 'ok' },
      ];
    },
    getActions: ({ vitals, patient, ventSettings }, { processMed, setVent, logEvent }) => {
      const pip = vitals?.pip || 20;
      const airwayObstructed = patient?.bronchospasm || (vitals?.res || 5) > 9;
      return [
        { label: 'Needle decompression — 2nd ICS MCL', category: 'other', urgent: !!patient?.hasPneumothorax,
          hidden: !patient?.hasPneumothorax,
          detail: 'TENSION PNEUMOTHORAX: 14G needle at 2nd intercostal space, midclavicular line. Immediate decompression.',
          action: () => logEvent('NEEDLE DECOMPRESSION performed: 2nd ICS midclavicular line.') },
        { label: 'Albuterol 2.5mg',     category: 'med', urgent: pip > 35 && airwayObstructed,
          hidden: !airwayObstructed,
          detail: 'β2 agonist → bronchodilation → ↓airway resistance → ↓PIP.',
          action: () => processMed('albuterol', '2.5', 'IV', 'Bolus', 'mg') },
        { label: 'Ketamine 0.5mg/kg',   category: 'med', urgent: pip > 40 && airwayObstructed,
          hidden: !airwayObstructed,
          detail: 'Bronchodilator effect via SNS activation. Useful for severe bronchospasm.',
          action: () => processMed('ketamine', String(Math.round((patient?.weight || 70) * 0.5)), 'IV', 'Bolus', 'mg') },
        { label: '↓ Vt by 50mL',        category: 'vent', urgent: pip > 35,
          detail: 'Reduce Vt for lung protection. PIP = (Vt / C) + (Flow × R) + PEEP.',
          action: () => { const vt = Math.max(200, (ventSettings?.vt || 500) - 50); setVent({ vt }); logEvent(`Vt reduced to ${vt} mL.`); } },
        { label: 'Reduce PEEP by 2',     category: 'vent', urgent: false, hidden: (ventSettings?.peep || 0) < 3,
          detail: 'Lower PEEP to reduce end-expiratory lung volume and peak pressure.',
          action: () => { setVent({ peep: Math.max(0,(ventSettings?.peep||5) - 2) }); logEvent('PEEP reduced by 2 cmH2O.'); } },
        { label: 'Suction ETT',          category: 'other', urgent: pip > 30,
          detail: 'Clear secretions. High PIP from secretions: suction resolves immediately.',
          action: () => logEvent('ETT suction performed. Recheck PIP.') },
        { label: 'Switch to PCV mode',   category: 'vent', urgent: false,
          detail: 'Pressure-controlled: variable Vt, fixed P. Protects from excessive PIP in stiff lungs.',
          action: () => { setVent({ mode: 'PCV' }); logEvent('Switched to PCV ventilation mode.'); } },
      ].filter(a => !a.hidden);
    },
    getClinicalPearl: ({ vitals }) => {
      const pip = vitals?.pip || 20;
      const plat = vitals?.pplat || 18;
      const diff = pip - plat;
      if (pip > 40) return 'PIP > 40 = barotrauma risk. Lung rupture (pneumothorax) can occur. Reduce Vt, check for auto-PEEP, and rule out ETT obstruction.';
      if (diff > 10) return `PIP-Plat gradient = ${diff} cmH2O. High gradient (>10) = ↑resistance (bronchospasm, secretions, kinked tube). Normal gradient = ↑compliance problem.`;
      return 'PIP = plateau P + resistive P. Plateau pressure reflects lung stretch (alveolar pressure). Keep Pplat < 28 cmH2O for lung-protective ventilation (ARDS-Net).';
    }
  },

  // ── PEEP ──────────────────────────────────────────────────────────────────
  peep: {
    label: 'PEEP', subtitle: 'Positive End-Expiratory Pressure', unit: 'cmH2O', color: 'yellow',
    normal: '5 cmH2O standard; 8-12 ARDS; 3-5 obstructive disease',
    getDrivers: ({ vitals, patient, ventSettings }) => [
      { label: 'Set PEEP',       value: `${ventSettings?.peep || 5} cmH2O`, status: 'ok' },
      { label: 'Atelectasis',    value: patient?.atelectasis ? `${Math.round((patient.atelectasis||0)*100)}% lung area` : 'None detected',
        status: (patient?.atelectasis || 0) > 0.1 ? 'warn' : 'ok' },
      { label: 'Auto-PEEP risk', value: patient?.copd ? 'HIGH (COPD — air trapping)' : 'Low',
        status: patient?.copd ? 'warn' : 'ok' },
      { label: 'SpO2 response',  value: `SpO2 ${vitals?.spo2 || 98}%`, status: 'ok' },
      { label: 'FRC',            value: patient?.lungVolumes ? `${(patient.lungVolumes.frc_L || 2.4).toFixed(1)} L` : 'Not measured', status: 'ok' },
    ],
    getActions: ({ vitals, patient, ventSettings }, { setVent, logEvent }) => {
      const peep = ventSettings?.peep || 5;
      return [
        { label: `PEEP → ${peep + 2} cmH2O`,    category: 'vent', urgent: false,
          detail: 'Recruits atelectatic alveoli → ↓shunt → ↑SpO2. Each 2 cmH2O ↓ shunt ~5%.',
          action: () => { setVent({ peep: Math.min(20, peep + 2) }); logEvent(`PEEP increased to ${peep+2} cmH2O.`); } },
        { label: `PEEP → ${Math.max(0,peep-2)} cmH2O`, category: 'vent', urgent: false,
          detail: 'Reduce PEEP if auto-PEEP suspected (COPD) or hemodynamic compromise.',
          action: () => { setVent({ peep: Math.max(0, peep-2) }); logEvent(`PEEP reduced to ${Math.max(0,peep-2)} cmH2O.`); } },
        { label: 'Lung Recruitment (40/40)', category: 'other', urgent: false,
          detail: 'CPAP at 40 cmH2O for 40s to open collapsed alveoli. Monitor hemodynamics closely.',
          action: () => { setPatient && setPatient(p => ({...p, recruitmentActive: true, recruitmentTime: 40})); logEvent('Lung recruitment maneuver initiated (40 cmH2O × 40s).'); } },
      ];
    },
    getClinicalPearl: ({ vitals, patient, ventSettings }) => {
      const peep = ventSettings?.peep || 5;
      if (patient?.copd && peep > 8) return 'In COPD: high PEEP risks auto-PEEP (air trapping) → dynamic hyperinflation → ↓venous return → hypotension. Use low rates and long expiratory times.';
      if (peep > 12) return `High PEEP (${peep} cmH2O) ↑ intrathoracic pressure → ↑CVP, ↓preload, ↓CO. Monitor MAP and urine output closely.`;
      return 'PEEP 5 = standard anesthetic PEEP. Open-lung approach: PEEP prevents cyclic alveolar collapse (atelectrauma). ↓PEEP before extubation (reduce to 0 briefly to assess airway).';
    }
  },

  // ── Vte ────────────────────────────────────────────────────────────────────
  vte: {
    label: 'VTe', subtitle: 'Exhaled Tidal Volume', unit: 'mL', color: 'green',
    normal: '6-8 mL/kg IBW (lung protective)',
    getDrivers: ({ vitals, patient, ventSettings }) => {
      const ibw = patient?.ibw || patient?.weight || 70;
      const mlPerKg = Math.round((vitals?.vte || 500) / ibw);
      return [
        { label: 'Vt/IBW',          value: `${mlPerKg} mL/kg IBW (target 6-8)`,
          status: mlPerKg > 10 ? 'critical' : mlPerKg > 8 ? 'warn' : mlPerKg < 4 ? 'warn' : 'ok' },
        { label: 'Mode / set Vt',   value: `${ventSettings?.mode || 'PCV-VG'} / ${ventSettings?.vt || 500} mL`,
          status: 'ok' },
        { label: 'Compliance (Cdyn)', value: `${Math.round(vitals?.compl || 60)} mL/cmH2O`,
          status: (vitals?.compl || 60) < 30 ? 'warn' : 'ok' },
        { label: 'PIP',             value: `${Math.round(vitals?.pip || 20)} cmH2O`,
          status: (vitals?.pip || 20) > 30 ? 'warn' : 'ok' },
        { label: 'Cuff leak',       value: patient?.cuffLeakPresent ? '⚠ LEAK DETECTED' : 'Sealed',
          status: patient?.cuffLeakPresent ? 'warn' : 'ok' },
      ];
    },
    getActions: ({ vitals, patient, ventSettings }, { setVent, logEvent }) => {
      const ibw = patient?.ibw || patient?.weight || 70;
      const vt6 = Math.round(ibw * 6);
      const vt8 = Math.round(ibw * 8);
      return [
        { label: `Vt → ${vt6} mL (6 mL/kg)`, category: 'vent', urgent: (vitals?.vte || 500) / ibw > 10,
          detail: 'ARDS-Net lung-protective tidal volume. Reduces ventilator-induced lung injury.',
          action: () => { setVent({ vt: vt6 }); logEvent(`Vt set to ${vt6} mL (6 mL/kg IBW).`); } },
        { label: `Vt → ${vt8} mL (8 mL/kg)`, category: 'vent', urgent: false,
          detail: 'Standard perioperative tidal volume. Acceptable for healthy lungs.',
          action: () => { setVent({ vt: vt8 }); logEvent(`Vt set to ${vt8} mL (8 mL/kg IBW).`); } },
      ];
    },
    getClinicalPearl: ({ vitals, patient }) => {
      const ibw = patient?.ibw || patient?.weight || 70;
      const mlKg = (vitals?.vte || 500) / ibw;
      if (mlKg > 10) return `${mlKg.toFixed(1)} mL/kg is above safe limits. Volutrauma (overdistension) releases cytokines and causes VILI even in healthy lungs. Target 6-8 mL/kg IBW.`;
      return 'Use IBW (not TBW) for Vt calculation — lung size correlates with height, not total body weight. Obese patients can receive dangerously high Vt if calculated from TBW.';
    }
  },

  // ── Cdyn ───────────────────────────────────────────────────────────────────
  cdyn: {
    label: 'Cdyn', subtitle: 'Dynamic Compliance', unit: 'mL/cmH2O', color: 'blue',
    normal: '50-100 mL/cmH2O',
    getDrivers: ({ vitals, patient }) => [
      { label: 'Cdyn',          value: `${Math.round(vitals?.compl || 60)} mL/cmH2O`,
        status: (vitals?.compl || 60) < 20 ? 'critical' : (vitals?.compl || 60) < 40 ? 'warn' : 'ok' },
      { label: 'ARDS/ALI',      value: patient?.isARDS ? `Active (${patient.ardsStage || 'moderate'})` : patient?.traliActive ? 'TRALI active' : 'None',
        status: patient?.isARDS || patient?.traliActive ? 'critical' : 'ok' },
      { label: 'Obesity',       value: (patient?.bmi || 22) > 35 ? `BMI ${(patient?.bmi||22).toFixed(0)} (↓ compliance)` : 'Normal BMI',
        status: (patient?.bmi || 22) > 40 ? 'warn' : 'ok' },
      { label: 'Atelectasis',   value: patient?.atelectasis ? `${Math.round((patient.atelectasis||0)*100)}%` : 'None',
        status: (patient?.atelectasis || 0) > 0.1 ? 'warn' : 'ok' },
      { label: 'Pneumothorax',  value: patient?.hasPneumothorax ? '⚠ PNEUMOTHORAX' : 'None',
        status: patient?.hasPneumothorax ? 'critical' : 'ok' },
      { label: 'Pregnancy',     value: patient?.isPregnant ? `${patient?.gestationalAgeWeeks || '?'}w — ↓FRC` : 'Not pregnant',
        status: patient?.isPregnant ? 'warn' : 'ok' },
    ],
    getActions: ({ vitals, patient, ventSettings }, { setVent, logEvent }) => [
      { label: '+PEEP 2 cmH2O',          category: 'vent', urgent: (vitals?.compl || 60) < 30,
        detail: 'PEEP recruits atelectatic alveoli → increases functional lung volume → ↑compliance.',
        action: () => { setVent({ peep: Math.min(20, (ventSettings?.peep||5)+2) }); logEvent('PEEP increased by 2 cmH2O for atelectasis recruitment.'); } },
      { label: 'Lung recruitment (40/40)', category: 'other', urgent: false,
        detail: '40 cmH2O sustained inflation × 40s. Can restore Cdyn from 20 → 50 in atelectasis.',
        action: () => logEvent('Lung recruitment maneuver initiated (40 cmH2O × 40s).') },
      { label: 'Prone positioning',       category: 'other', urgent: false, hidden: !patient?.isARDS,
        detail: 'PROSEVA trial: prone 16h/day reduces mortality in moderate-severe ARDS. ↑Cdyn in posterior lung zones.',
        action: () => logEvent('Prone positioning considered for severe ARDS.') },
    ].filter(a => !a.hidden),
    getClinicalPearl: ({ vitals }) => {
      const c = vitals?.compl || 60;
      if (c < 20) return 'Cdyn < 20 mL/cmH2O = Berlin ARDS criteria (if P/F ratio < 300). Needs lung-protective ventilation: Vt 4-6 mL/kg IBW, PEEP 10-14, prone if severe.';
      if (c < 40) return 'Cdyn 20-40: significantly impaired. Causes: ARDS, pneumonia, TACO, obesity, abdominal hypertension, late pregnancy. Exclude pneumothorax.';
      return 'Cdyn = Vt / (PIP - PEEP). Dynamic compliance includes resistance; static compliance (Vt / Pplat - PEEP) isolates parenchymal stiffness.';
    }
  },

  // ── Raw ────────────────────────────────────────────────────────────────────
  raw: {
    label: 'Raw', subtitle: 'Airway Resistance', unit: 'cmH2O/L/s', color: 'blue',
    normal: '< 5 cmH2O/L/s (intubated); < 2 (normal airway)',
    getDrivers: ({ vitals, patient }) => [
      { label: 'Raw',          value: `${Math.round(vitals?.res || 5)} cmH2O/L/s`,
        status: (vitals?.res || 5) > 15 ? 'critical' : (vitals?.res || 5) > 8 ? 'warn' : 'ok' },
      { label: 'Bronchospasm', value: patient?.bronchospasm ? '⚠ ACTIVE' : 'None',
        status: patient?.bronchospasm ? 'critical' : 'ok' },
      { label: 'COPD/asthma',  value: patient?.copd ? 'COPD' : patient?.asthma ? 'Asthma' : 'None',
        status: (patient?.copd || patient?.asthma) ? 'warn' : 'ok' },
      { label: 'Secretions',   value: 'Check ETT lumen patency', status: 'ok' },
      { label: 'ETT size',     value: patient?.ettSize ? `${patient.ettSize} mm ID` : 'Unknown',
        status: 'ok' },
    ],
    getActions: ({ vitals, patient }, { processMed, logEvent }) => {
      const res = vitals?.res || 5;
      return [
        { label: 'Albuterol 2.5mg',   category: 'med', urgent: res > 10,
          detail: 'β2 → smooth muscle relaxation → ↓bronchomotor tone → ↓resistance.',
          action: () => processMed('albuterol', '2.5', 'IV', 'Bolus', 'mg') },
        { label: 'Ipratropium 0.5mg', category: 'med', urgent: false, hidden: !patient?.copd,
          detail: 'M3 antagonist → anticholinergic bronchodilation. Additive with albuterol (COPD).',
          action: () => processMed('ipratropium', '0.5', 'IV', 'Bolus', 'mg') },
        { label: 'Ketamine 0.5mg/kg', category: 'med', urgent: res > 15,
          detail: 'Bronchodilator via SNS → ↑catecholamines → β2 activation. Use for severe bronchospasm.',
          action: () => processMed('ketamine', String(Math.round((patient?.weight || 70) * 0.5)), 'IV', 'Bolus', 'mg') },
        { label: 'Suction ETT',       category: 'other', urgent: res > 10,
          detail: 'Secretions increase Raw. Suction resolves immediately if cause.',
          action: () => logEvent('Endotracheal suction performed.') },
      ].filter(a => !a.hidden);
    },
    getClinicalPearl: ({ vitals }) => {
      const res = vitals?.res || 5;
      if (res > 20) return 'Raw > 20 = severe obstruction. Bronchospasm, kinked ETT, or herniated cuff. Immediate diagnosis: disconnect circuit to assess resistance (no circuit R), then reconnect.';
      return 'Raw = (PIP - Pplat) / Flow. High Raw with normal Pplat = obstruction (tube/bronchospasm). High Pplat with normal PIP-Pplat gap = parenchymal disease.';
    }
  },

  // ── MVe ───────────────────────────────────────────────────────────────────
  mv: {
    label: 'MVe', subtitle: 'Minute Ventilation', unit: 'L/min', color: 'green',
    normal: '5-8 L/min (rest); up to 12 intraop',
    getDrivers: ({ vitals, ventSettings }) => [
      { label: 'MVe', value: `${(vitals?.mv || 6).toFixed(1)} L/min`, status: (vitals?.mv || 6) > 15 ? 'warn' : 'ok' },
      { label: 'RR', value: `${ventSettings?.rr || 12} /min`, status: 'ok' },
      { label: 'VTe', value: `${Math.round(vitals?.vte || 500)} mL`, status: 'ok' },
      { label: 'EtCO2', value: `${vitals?.etco2 || 38} mmHg`, status: 'ok' },
    ],
    getActions: ({ vitals, ventSettings }, { setVent, logEvent }) => {
      const rr = ventSettings?.rr || 12;
      return [
        { label: `RR → ${rr + 2}`, category: 'vent', urgent: (vitals?.etco2 || 38) > 50,
          detail: '↑MV → ↑CO2 elimination.',
          action: () => { setVent({ rr: rr+2 }); logEvent(`RR increased to ${rr+2} — ↑MVe.`); } },
        { label: `RR → ${Math.max(6,rr-2)}`, category: 'vent', urgent: false,
          detail: '↓MV → permissive hypercapnia. Use in obstructive disease to prevent air trapping.',
          action: () => { setVent({ rr: Math.max(6,rr-2) }); logEvent(`RR decreased to ${Math.max(6,rr-2)}.`); } },
      ];
    },
    getClinicalPearl: () => 'MVe = Vt × RR. Target 6-8 L/min for eucapnia. Fever, MH, and shivering dramatically increase CO2 production and required MVe. EtCO2 is the best guide to adequacy.'
  },

  // ── MAC ───────────────────────────────────────────────────────────────────
  mac: {
    label: 'MAC', subtitle: 'Minimum Alveolar Concentration (Volatile Depth)', unit: 'MAC equiv.', color: 'cyan',
    normal: '0.7-1.3 MAC for surgical anesthesia',
    getDrivers: ({ vitals, patient, gasSettings }) => [
      { label: 'Agent / dial',    value: `${gasSettings?.agent || 'None'} at ${(gasSettings?.dial || 0).toFixed(1)}%`,
        status: (vitals?.mac || 0) < 0.5 && !!patient?.airwaySecured ? 'warn' : 'ok' },
      { label: 'Effective MAC',   value: `${(vitals?.mac || 0).toFixed(2)} MAC`,
        status: (vitals?.mac || 0) > 1.5 ? 'warn' : (vitals?.mac || 0) < 0.5 && !!patient?.airwaySecured ? 'warn' : 'ok' },
      { label: 'Patient age',     value: `${patient?.age || 40} yr (MAC ↓ with age)`,
        status: 'ok' },
      { label: 'N2O contribution', value: `${(vitals?.etN2O || 0).toFixed(0)}% (adds ~0.5-0.6 MAC at 60%)`,
        status: 'ok' },
      { label: 'Propofol TIVA',   value: medCe(activeMeds, 'Propofol') > 1 ? 'Active — volatile not primary agent' : 'Not active', status: 'ok' },
    ],
    getActions: ({ vitals, patient, gasSettings }, { setGas, logEvent }) => {
      const dial = gasSettings?.dial || 0;
      const agent = gasSettings?.agent || 'sevoflurane';
      return [
        { label: `↑ ${agent} dial → ${(dial + 0.5).toFixed(1)}%`, category: 'gas', urgent: (vitals?.mac || 0) < 0.5,
          detail: 'Increase volatile delivery to deepen anesthesia.',
          action: () => { setGas({ dial: dial + 0.5 }); logEvent(`${agent} dial increased to ${(dial+0.5).toFixed(1)}%.`); } },
        { label: `↓ ${agent} dial → ${Math.max(0, dial - 0.5).toFixed(1)}%`, category: 'gas', urgent: false,
          detail: 'Decrease volatile for emergence preparation or when BIS is low.',
          action: () => { setGas({ dial: Math.max(0, dial - 0.5) }); logEvent(`${agent} dial decreased to ${Math.max(0,dial-0.5).toFixed(1)}%.`); } },
        { label: `${agent} OFF (0%)`, category: 'gas', urgent: false,
          detail: 'Prepare for emergence. EtCO2 and BIS will confirm wakeup trajectory.',
          action: () => { setGas({ dial: 0 }); logEvent(`${agent} turned off for emergence.`); } },
      ];
    },
    getClinicalPearl: ({ vitals, patient }) => {
      const mac = vitals?.mac || 0;
      if (mac > 1.5) return `${mac.toFixed(2)} MAC is deeper than needed for most cases. MAC > 1.5 causes significant hypotension via vasodilation and direct myocardial depression.`;
      if (mac < 0.5 && patient?.airwaySecured) return 'MAC < 0.5 with no IV hypnotic is inadequate for surgical anesthesia. Risk of awareness. Deepen with volatile or add propofol/midazolam.';
      return 'MAC = agent dose that prevents movement in 50% of patients at surgical incision. Add 0.3-0.5 MAC for MAC-AWARE (prevents awareness). Use BIS to personalize depth.';
    }
  },

  // ── PLAT (Plateau Pressure) ────────────────────────────────────────────────
  plat: {
    label: 'PLAT', subtitle: 'Plateau Pressure', unit: 'cmH2O', color: 'yellow',
    normal: '< 28 cmH2O (ARDS-Net lung protective)',
    getDrivers: ({ vitals, patient, ventSettings }) => [
      { label: 'Plateau pressure',   value: `${Math.round(vitals?.pplat || 0)} cmH2O`,
        status: (vitals?.pplat || 0) > 30 ? 'critical' : (vitals?.pplat || 0) > 25 ? 'warn' : 'ok' },
      { label: 'PIP – Pplat gap',    value: `${Math.round((vitals?.pip || 0) - (vitals?.pplat || 0))} cmH2O (resistance contribution)`,
        status: ((vitals?.pip || 0) - (vitals?.pplat || 0)) > 10 ? 'warn' : 'ok' },
      { label: 'Driving pressure',   value: `${Math.round((vitals?.pplat || 0) - (ventSettings?.peep || 5))} cmH2O (Pplat − PEEP)`,
        status: ((vitals?.pplat || 0) - (ventSettings?.peep || 5)) > 15 ? 'critical' : ((vitals?.pplat || 0) - (ventSettings?.peep || 5)) > 13 ? 'warn' : 'ok' },
      { label: 'Set Vt',             value: `${ventSettings?.vt || 500} mL`, status: 'ok' },
      { label: 'ARDS present',       value: patient?.isARDS ? 'YES — use LPV' : 'No', status: patient?.isARDS ? 'warn' : 'ok' },
    ],
    getActions: ({ vitals, patient, ventSettings }, { processMed, setVent, logEvent }) => {
      const pplat = vitals?.pplat || 0;
      const ibw = patient?.ibw || patient?.weight || 70;
      const vt6 = Math.round(ibw * 6);
      return [
        { label: `Vt → ${vt6} mL (6 mL/kg IBW)`, category: 'vent', urgent: pplat > 28,
          detail: 'ARDS-Net: Pplat > 28 → reduce Vt to 6 mL/kg IBW. Reduces volutrauma.',
          action: () => { setVent({ vt: vt6 }); logEvent(`Vt reduced to ${vt6} mL for plateau pressure management.`); } },
        { label: '+PEEP 2 cmH2O', category: 'vent', urgent: false,
          detail: 'Higher PEEP recruits lung units → shifts Pplat vs. improves compliance tradeoff.',
          action: () => { setVent({ peep: Math.min(20, (ventSettings?.peep || 5) + 2) }); logEvent('PEEP increased by 2 cmH2O.'); } },
        { label: 'Prone positioning', category: 'other', urgent: pplat > 30 && !!patient?.isARDS,
          detail: 'PROSEVA trial: prone reduces Pplat and mortality in moderate-severe ARDS (P/F < 150).',
          action: () => logEvent('Prone positioning considered — PROSEVA indication met.') },
      ];
    },
    getClinicalPearl: ({ vitals, ventSettings }) => {
      const dp = (vitals?.pplat || 0) - (ventSettings?.peep || 5);
      if (dp > 15) return `Driving pressure (Pplat − PEEP) = ${dp} cmH2O > 15 is independently associated with ARDS mortality (Amato 2015). Reduce Vt or increase PEEP to bring DP < 14.`;
      if ((vitals?.pplat || 0) > 28) return 'Pplat > 28 cmH2O = overdistension risk. Reduce tidal volume to 6 mL/kg IBW (ARDS-Net protocol). Each 1 mL/kg reduction in Vt lowers Pplat by ~2 cmH2O.';
      return 'Pplat = static lung pressure = alveolar pressure during pause. It reflects lung stretch, unlike PIP which adds the resistive pressure component. Target < 28 cmH2O for lung protection.';
    }
  },

  // ── SHUNT / FRC ────────────────────────────────────────────────────────────
  shunt: {
    label: 'SHUNT', subtitle: 'Intrapulmonary Shunt Fraction / Functional Residual Capacity', unit: '% + Litres', color: 'green',
    normal: 'Shunt < 5% | FRC 2.0-3.5 L | FRC > Closing Capacity',
    getDrivers: ({ vitals, patient, ventSettings }) => [
      { label: 'Shunt fraction',     value: vitals?.shunt !== undefined ? `${(vitals.shunt * 100).toFixed(1)}%` : '--',
        status: (vitals?.shunt || 0) > 0.25 ? 'critical' : (vitals?.shunt || 0) > 0.10 ? 'warn' : 'ok' },
      { label: 'VD/VT ratio',        value: vitals?.vdVt !== undefined ? `${(vitals.vdVt * 100).toFixed(0)}%` : '--',
        status: (vitals?.vdVt || 0) > 0.5 ? 'critical' : (vitals?.vdVt || 0) > 0.35 ? 'warn' : 'ok' },
      { label: 'FRC',                value: patient?.lungVolumes ? `${patient.lungVolumes.frc_L?.toFixed(1)} L` : 'Not measured',
        status: 'ok' },
      { label: 'Closing capacity',   value: patient?.lungVolumes ? `${patient.lungVolumes.cc_L?.toFixed(1)} L` : 'Not measured',
        status: patient?.lungVolumes && patient.lungVolumes.frc_L < patient.lungVolumes.cc_L ? 'critical' : 'ok' },
      { label: 'FRC vs CC',          value: patient?.lungVolumes ? (patient.lungVolumes.frc_L < patient.lungVolumes.cc_L ? 'FRC < CC — AIRWAY CLOSURE' : 'FRC > CC ✓') : 'N/A',
        status: patient?.lungVolumes && patient.lungVolumes.frc_L < patient.lungVolumes.cc_L ? 'critical' : 'ok' },
      { label: 'Atelectasis',        value: patient?.atelectasis ? `${Math.round((patient.atelectasis||0)*100)}% of lung area` : 'None',
        status: (patient?.atelectasis || 0) > 0.1 ? 'warn' : 'ok' },
      { label: 'PEEP (FRC support)', value: `${ventSettings?.peep || 5} cmH2O`, status: 'ok' },
    ],
    getActions: ({ vitals, patient, ventSettings }, { setVent, logEvent }) => {
      const shunt = vitals?.shunt || 0;
      return [
        { label: '+PEEP 2 cmH2O', category: 'vent', urgent: shunt > 0.15,
          detail: 'PEEP raises FRC above closing capacity → prevents cyclic alveolar collapse → ↓shunt.',
          action: () => { setVent({ peep: Math.min(20, (ventSettings?.peep || 5) + 2) }); logEvent('PEEP increased for shunt reduction.'); } },
        { label: 'FiO₂ → 80%', category: 'vent', urgent: shunt > 0.3,
          detail: 'High shunt fraction is refractory to FiO2 increases — high FiO2 needed for any O2 effect.',
          action: () => { setVent({ fio2: 80 }); logEvent('FiO2 increased to 80% for high shunt state.'); } },
        { label: 'Lung recruitment', category: 'other', urgent: false,
          detail: 'CPAP 40 cmH2O × 40 s reopens collapsed alveoli → ↓FRC/CC gap → ↓shunt.',
          action: () => logEvent('Lung recruitment maneuver initiated.') },
      ];
    },
    getClinicalPearl: ({ vitals, patient }) => {
      const shunt = vitals?.shunt || 0;
      const frcLtCc = patient?.lungVolumes && patient.lungVolumes.frc_L < patient.lungVolumes.cc_L;
      if (frcLtCc) return 'AIRWAY CLOSURE: FRC < Closing Capacity means small airways close during normal tidal breathing — the main mechanism of intraoperative atelectasis in supine/anesthetized patients. PEEP keeps FRC above CC.';
      if (shunt > 0.3) return `Shunt ${(shunt*100).toFixed(0)}% is severe. Above ~30% shunt, increasing FiO2 has minimal effect on SpO2 — the shunted blood bypasses gas exchange entirely. PEEP, prone, and recruitment are the effective treatments.`;
      return 'Shunt = blood passing through lungs without gas exchange (V/Q = 0). Different from dead space (V/Q = ∞). FRC is the lung volume at end-expiration — must exceed closing capacity to prevent intraoperative airway closure.';
    }
  },

  // ── I:E RATIO ─────────────────────────────────────────────────────────────
  ieratio: {
    label: 'I:E', subtitle: 'Inspiratory-to-Expiratory Time Ratio', unit: 'ratio (e.g. 1:2)', color: 'cyan',
    normal: '1:2 standard | 1:3 to 1:4 for obstructive disease | 1:1 inverse ratio for ARDS',
    getDrivers: ({ vitals, patient, ventSettings }) => {
      const ie = ventSettings?.ieRatio || 2;
      const rr = ventSettings?.rr || 12;
      const cycleTime = 60 / rr;
      const inspTime = cycleTime / (1 + ie);
      const expTime = cycleTime - inspTime;
      return [
        { label: 'I:E ratio (set)',   value: `1 : ${ie}`,
          status: ie < 1 ? 'warn' : 'ok' },
        { label: 'Inspiration time',  value: `${inspTime.toFixed(2)} s`, status: 'ok' },
        { label: 'Expiration time',   value: `${expTime.toFixed(2)} s`,
          status: expTime < 0.5 ? 'critical' : expTime < 0.8 ? 'warn' : 'ok' },
        { label: 'Auto-PEEP risk',    value: patient?.copd ? 'HIGH — COPD patient (air trapping)' : ie < 1.5 ? 'Moderate at fast RR' : 'Low',
          status: patient?.copd && ie < 2 ? 'critical' : 'ok' },
        { label: 'RR',                value: `${rr} /min (cycle = ${cycleTime.toFixed(1)}s)`, status: 'ok' },
      ];
    },
    getActions: ({ vitals, patient, ventSettings }, { setVent, logEvent }) => [
      { label: 'I:E → 1:2 (standard)',  category: 'vent', urgent: false,
        detail: 'Standard ratio. Adequate expiration time for most patients.',
        action: () => { setVent({ ieRatio: 2 }); logEvent('I:E ratio set to 1:2 (standard).'); } },
      { label: 'I:E → 1:3 (obstructive)', category: 'vent', urgent: false,
        detail: 'Longer expiration to prevent air trapping in COPD/asthma. Reduces auto-PEEP.',
        action: () => { setVent({ ieRatio: 3 }); logEvent('I:E ratio set to 1:3 for obstructive disease.'); } },
      { label: 'I:E → 1:4 (COPD)',     category: 'vent', urgent: !!patient?.copd && (ventSettings?.ieRatio || 2) < 2.5,
        detail: 'Maximum expiratory time for severe COPD/status asthmaticus to allow full exhalation.',
        action: () => { setVent({ ieRatio: 4 }); logEvent('I:E ratio set to 1:4 for severe obstruction.'); } },
      { label: 'I:E → 1:1 (inverse ratio)', category: 'vent', urgent: false,
        detail: 'Inverse ratio ventilation in severe ARDS — increases mean airway pressure and recruits slow alveoli. Monitor hemodynamics.',
        action: () => { setVent({ ieRatio: 1 }); logEvent('I:E ratio set to 1:1 (inverse ratio ventilation — ARDS).'); } },
    ],
    getClinicalPearl: ({ vitals, patient, ventSettings }) => {
      const ie = ventSettings?.ieRatio || 2;
      if (patient?.copd && ie < 2) return `COPD: I:E of 1:${ie} is too short — air trapping and auto-PEEP risk. Target 1:3 or 1:4 to allow full exhalation. Auto-PEEP raises intrathoracic pressure → ↓venous return → hemodynamic compromise.`;
      if (ie < 1) return 'Inverse ratio (I > E): prolongs mean airway pressure → recruits ARDS alveoli, but requires sedation/paralysis and causes auto-PEEP. Monitor closely for hemodynamic effects.';
      return `Expiration time = ${ie}× inspiration time. Normal I:E 1:2 allows full exhalation. In obstruction: the slow time constant (RC = compliance × resistance) means alveoli need more time to empty — hence longer E phase.`;
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RENAL PANEL VITALS
  // ═══════════════════════════════════════════════════════════════════════════

  uop: {
    label: 'UOP', subtitle: 'Urine Output Rate', unit: 'mL/kg/hr', color: 'violet',
    normal: '> 0.5 mL/kg/hr (adults) | oliguria = < 0.5 mL/kg/hr × 6h',
    getDrivers: ({ vitals, patient, activeMeds }) => {
      const wt = patient?.weight || 70;
      const rate = patient?.urineOutputRate || 0;
      const ratePerKg = rate / wt;
      const map = vitals?.map || 90;
      const diureticActive = hasMed(activeMeds, 'Furosemide') || hasMed(activeMeds, 'Mannitol');
      return [
        { label: 'UOP rate',          value: `${ratePerKg.toFixed(2)} mL/kg/hr`, status: ratePerKg < 0.3 ? 'critical' : ratePerKg < 0.5 ? 'warn' : 'ok' },
        { label: 'Total UOP',         value: `${(patient?.urineOutput || 0).toFixed(1)} mL`, status: 'ok' },
        { label: 'Net fluid balance', value: `${((patient?.netFluidBalance || 0) / 1000).toFixed(2)} L`, status: (patient?.netFluidBalance || 0) < -500 ? 'warn' : 'ok' },
        { label: 'Foley catheter',    value: patient?.foleyPlaced ? '✓ Placed' : '✗ Not placed', status: patient?.foleyPlaced ? 'ok' : 'warn' },
        { label: 'MAP',               value: `${Math.round(map)} mmHg`, status: map < 65 ? 'critical' : map < 75 ? 'warn' : 'ok' },
        { label: 'EBL',               value: `${Math.round(patient?.ebl || 0)} mL`, status: (patient?.ebl||0) > 1000 ? 'critical' : (patient?.ebl||0) > 500 ? 'warn' : 'ok' },
        { label: 'Diuretic on board', value: diureticActive ? 'Active (UOP may be artificially ↑)' : 'None', status: diureticActive ? 'warn' : 'ok' },
        { label: 'AKI Stage',         value: patient?.akiStage > 0 ? `STAGE ${patient.akiStage} ⚠` : 'None', status: patient?.akiStage >= 2 ? 'critical' : patient?.akiStage === 1 ? 'warn' : 'ok' },
      ];
    },
    getActions: ({ vitals, patient, activeMeds }, { processMed, setPatient, logEvent }) => {
      const rate = (patient?.urineOutputRate || 0) / (patient?.weight || 70);
      const map = vitals?.map || 90;
      return [
        { label: 'NS 250 mL bolus',      category: 'other', urgent: rate < 0.5 && map < 70,
          detail: 'Volume challenge for oliguria + hypotension — first-line for likely prerenal. Monitor UOP response.',
          action: () => logEvent('NS 250 mL bolus: oliguria resuscitation — monitor UOP over next 30 min.') },
        { label: 'Furosemide 20mg IV',   category: 'med', urgent: false, hidden: rate > 1.0 || (patient?.ebl||0) > 500,
          detail: 'Loop diuretic. Do NOT use if volume-depleted — will worsen prerenal AKI. Only use when euvolemic with ↓UOP.',
          action: () => processMed('furosemide', '20', 'IV', 'Bolus', 'mg') },
        { label: 'Place Foley catheter', category: 'other', urgent: !patient?.foleyPlaced, hidden: !!patient?.foleyPlaced,
          detail: 'Cannot accurately track UOP without urinary catheter.',
          action: () => { setPatient(p => ({...p, foleyPlaced: true})); logEvent('Foley catheter placed.'); } },
        { label: 'Maintain MAP > 65',    category: 'other', urgent: map < 65,
          detail: 'Renal autoregulation fails below MAP 65 → pressure-passive GFR decrease → oliguria.',
          action: () => logEvent('RENAL: Target MAP > 65 mmHg for adequate renal perfusion pressure.') },
      ].filter(a => !a.hidden);
    },
    getClinicalPearl: ({ patient }) => {
      const ratePerKg = (patient?.urineOutputRate || 0) / (patient?.weight || 70);
      const feNa = patient?.feNa || 1.0;
      if (ratePerKg < 0.3) return `UOP ${ratePerKg.toFixed(2)} mL/kg/hr = severe oliguria. KDIGO Stage 1 = < 0.5 mL/kg/hr × 6h. Workup: exclude Foley obstruction, assess MAP/volume status, check FE_Na.`;
      if (ratePerKg < 0.5 && feNa < 1) return 'Oliguria + FE_Na < 1% = prerenal AKI. Kidneys intact but underperfused. Fluid challenge — 250 mL then reassess UOP. If responds: confirmed prerenal.';
      return 'Target UOP > 0.5 mL/kg/hr intraoperatively. #1 cause: hypovolemia + ↓MAP (prerenal). Check MAP, EBL, net fluid balance before giving diuretics — diuretics in a volume-depleted patient worsen renal injury.';
    }
  },

  egfr: {
    label: 'eGFR', subtitle: 'Estimated Glomerular Filtration Rate', unit: 'mL/min/1.73m²', color: 'violet',
    normal: '> 90 normal | 60-89 mild ↓ | 30-59 moderate | 15-29 severe | < 15 kidney failure',
    getDrivers: ({ vitals, patient, activeMeds }) => {
      const gfr = patient?.gfr || 125;
      const toxins = [hasMed(activeMeds,'Vancomycin')&&'Vancomycin',hasMed(activeMeds,'Gentamicin')&&'Gentamicin',hasMed(activeMeds,'Ketorolac')&&'Ketorolac (NSAID)'].filter(Boolean);
      return [
        { label: 'eGFR',              value: `${Math.round(gfr)} mL/min`, status: gfr < 30 ? 'critical' : gfr < 60 ? 'warn' : 'ok' },
        { label: 'CKD Stage',         value: gfr>=90?'G1 — Normal':gfr>=60?'G2 — Mild ↓':gfr>=30?'G3 — Moderate':gfr>=15?'G4 — Severe':'G5 — Failure', status: gfr<30?'critical':gfr<60?'warn':'ok' },
        { label: 'AKI Stage',         value: patient?.akiStage>0?`STAGE ${patient.akiStage}`:'None', status: patient?.akiStage>=2?'critical':patient?.akiStage===1?'warn':'ok' },
        { label: 'MAP / Perfusion',   value: `${Math.round(vitals?.map||90)} mmHg`, status: (vitals?.map||90)<65?'critical':'ok' },
        { label: 'Active nephrotoxins',value: toxins.length>0?toxins.join(', '):'None identified', status: toxins.length>0?'warn':'ok' },
      ];
    },
    getActions: ({ patient, activeMeds }, { logEvent }) => {
      const gfr = patient?.gfr || 125;
      const renalDrugs = [hasMed(activeMeds,'Rocuronium')&&'Rocuronium',hasMed(activeMeds,'Vecuronium')&&'Vecuronium',hasMed(activeMeds,'Morphine')&&'Morphine (M6G toxicity)',hasMed(activeMeds,'Vancomycin')&&'Vancomycin (AUC dosing)'].filter(Boolean);
      return [
        { label: 'Stop NSAIDs',           category: 'other', urgent: gfr<60&&hasMed(activeMeds,'Ketorolac'), hidden: !hasMed(activeMeds,'Ketorolac'),
          detail: 'NSAIDs block prostaglandin-mediated renal afferent vasodilation → ↓GFR. Contraindicated in CKD.',
          action: () => logEvent('RENAL ALERT: Discontinue NSAIDs — GFR < 60. Use acetaminophen + opioid-sparing multimodal analgesia.') },
        { label: 'Drug dosing review',    category: 'other', urgent: gfr<30, hidden: gfr>=60||renalDrugs.length===0,
          detail: renalDrugs.length>0?`Renally-cleared active drugs: ${renalDrugs.join(', ')}` : 'Review for renally cleared agents.',
          action: () => logEvent(`RENAL DRUG ALERT (GFR ${Math.round(gfr)}): ${renalDrugs.join(', ')} — adjust doses.`) },
        { label: 'Optimize MAP > 65',     category: 'other', urgent: false,
          detail: 'Renal autoregulation: MAP 65-150. Below 65 → GFR falls linearly with pressure. #1 intraoperative renal protection strategy.',
          action: () => logEvent('RENAL PROTECTION: Maintain MAP > 65 mmHg.') },
      ].filter(a => !a.hidden);
    },
    getClinicalPearl: ({ patient }) => {
      const gfr = patient?.gfr || 125;
      if (gfr < 15) return 'eGFR < 15 = kidney failure. ALL renally cleared drugs accumulate: vecuronium/rocuronium (prolonged block), morphine M6G (delayed respiratory depression), vancomycin (toxic troughs). Use organ-independent alternatives: cisatracurium, remifentanil.';
      if (gfr < 30) return `eGFR ${Math.round(gfr)} = severe CKD. Avoid NSAIDs and contrast. Morphine M6G accumulates → delayed opioid toxicity. Vancomycin requires AUC/MIC targeting. Consider cis-atracurium over rocuronium.`;
      return 'eGFR reflects functioning nephron mass. Anesthesia reduces renal blood flow 20-30% via ↓MAP + ↓CO. NSAIDs + ACE-inhibitors + hypovolemia = the classic AKI triad that anesthesiologists can prevent.';
    }
  },

  creatinine: {
    label: 'Cr / BUN', subtitle: 'Serum Creatinine / Blood Urea Nitrogen', unit: 'mg/dL', color: 'violet',
    normal: 'Cr 0.6-1.2 (♂) / 0.5-1.0 (♀) mg/dL | BUN 7-20 | BUN:Cr ratio 10-20',
    getDrivers: ({ patient }) => {
      const cr = patient?.creatinine || 0.85;
      const bun = patient?.bun || 12;
      const bunCrRatio = bun / Math.max(0.1, cr);
      const baselineCr = patient?.baselineCreatinine || cr;
      const akiDelta = cr / Math.max(0.1, baselineCr);
      return [
        { label: 'Creatinine',       value: `${cr.toFixed(2)} mg/dL`, status: cr>3?'critical':cr>1.5?'warn':'ok' },
        { label: 'BUN',              value: `${Math.round(bun)} mg/dL`, status: bun>80?'critical':bun>40?'warn':'ok' },
        { label: 'BUN:Cr ratio',     value: `${bunCrRatio.toFixed(1)} → ${bunCrRatio>20?'Prerenal':bunCrRatio<10?'Intrinsic renal':'Normal'}`, status: bunCrRatio>20?'warn':'ok' },
        { label: 'vs Baseline Cr',   value: `×${akiDelta.toFixed(1)} (baseline ${baselineCr.toFixed(2)} mg/dL)`, status: akiDelta>=3?'critical':akiDelta>=2?'warn':akiDelta>=1.5?'warn':'ok' },
        { label: 'AKI Stage (KDIGO)',value: patient?.akiStage>0?`Stage ${patient.akiStage} — Cr ×${akiDelta.toFixed(1)} baseline`:'No AKI', status: patient?.akiStage>=2?'critical':patient?.akiStage===1?'warn':'ok' },
        { label: 'Rhabdomyolysis',   value: (patient?.ckLevel||0)>5000?`CK ${Math.round(patient.ckLevel)} U/L — myoglobin ↑Cr`:'Not detected', status: (patient?.ckLevel||0)>5000?'critical':'ok' },
      ];
    },
    getActions: ({ patient }, { logEvent }) => [
      { label: 'Rhabdo fluid protocol', category: 'other', urgent: (patient?.ckLevel||0)>5000, hidden: (patient?.ckLevel||0)<1000,
        detail: 'Rhabdomyolysis: target UOP 200-300 mL/hr. Myoglobin precipitates in tubules at low flow → tubular necrosis.',
        action: () => logEvent('Rhabdomyolysis AKI: target UOP 200-300 mL/hr. Aggressive NS hydration.') },
      { label: 'Order post-op Cr/BUN', category: 'other', urgent: false,
        detail: 'Creatinine lags 24-48h behind injury. Order 6h and 24h post-op renal function panels for high-risk cases.',
        action: () => logEvent('Order: Cr/BUN/electrolytes at 6h and 24h post-op — Cr rises 24-48h after intraoperative renal injury.') },
    ].filter(a => !a.hidden),
    getClinicalPearl: ({ patient }) => {
      const bunCrRatio = (patient?.bun||12)/Math.max(0.1, patient?.creatinine||0.85);
      if (bunCrRatio>20) return `BUN:Cr ${bunCrRatio.toFixed(1)} > 20 = PRERENAL. Kidneys intact but underperfused — preferentially reabsorb urea (BUN rises faster than Cr). Fluid resuscitation is the treatment.`;
      if (bunCrRatio<10) return `BUN:Cr ${bunCrRatio.toFixed(1)} < 10 = INTRINSIC RENAL. Tubules damaged — cannot reabsorb urea. Suggests ATN, rhabdomyolysis, or contrast nephropathy.`;
      return 'Creatinine rises only after ~50% of GFR is lost — it is a LATE marker. By the time Cr is elevated, significant injury has already occurred. Use UOP rate and FE_Na for early intraoperative detection.';
    }
  },

  fena: {
    label: 'FE_Na', subtitle: 'Fractional Excretion of Sodium', unit: '%', color: 'violet',
    normal: '< 1% = Prerenal | > 2% = Intrinsic renal (ATN) | INVALID on diuretics',
    getDrivers: ({ patient, activeMeds }) => {
      const feNa = patient?.feNa || 1.0;
      const diuretics = hasMed(activeMeds,'Furosemide')||hasMed(activeMeds,'Bumetanide');
      return [
        { label: 'FE_Na',            value: `${feNa.toFixed(2)}%`, status: feNa<1?'ok':feNa>2?'critical':'warn' },
        { label: 'Interpretation',   value: feNa<1?'Prerenal — Na retention intact':feNa>2?'Intrinsic renal — tubular injury':'Borderline', status: feNa<1?'ok':feNa>2?'critical':'warn' },
        { label: 'Diuretics active', value: diuretics?'⚠ INVALID — diuretics invalidate FE_Na':'No — result is valid', status: diuretics?'critical':'ok' },
        { label: 'U_Osm correlation',value: `${Math.round(patient?.urineOsmolality||350)} mOsm (${(patient?.urineOsmolality||350)>500?'Concentrated = consistent prerenal':(patient?.urineOsmolality||350)<350?'Dilute = consistent ATN':'Intermediate'})`, status: 'ok' },
        { label: 'AKI Stage',        value: patient?.akiStage>0?`Stage ${patient.akiStage}`:'None', status: patient?.akiStage>=2?'critical':patient?.akiStage===1?'warn':'ok' },
      ];
    },
    getActions: ({ patient, activeMeds }, { logEvent }) => {
      const feNa = patient?.feNa || 1.0;
      const diuretics = hasMed(activeMeds,'Furosemide');
      return [
        { label: 'Fluid bolus (prerenal)', category: 'other', urgent: feNa<1&&(patient?.akiStage||0)>0, hidden: feNa>=1,
          detail: 'FE_Na < 1% = kidneys intact but underperfused. IV fluid challenge is appropriate.',
          action: () => logEvent('Prerenal AKI: FE_Na < 1% — 250 mL fluid challenge. Monitor UOP response.') },
        { label: 'Use FE_Urea instead', category: 'other', urgent: false, hidden: !diuretics,
          detail: 'On diuretics, use FE_Urea (< 35% = prerenal) — unaffected by loop diuretics.',
          action: () => logEvent('On diuretics: FE_Na invalid — calculate FE_Urea for prerenal differentiation (< 35% = prerenal).') },
        { label: 'Nephrology (ATN)', category: 'other', urgent: feNa>2&&(patient?.akiStage||0)>=2, hidden: feNa<=2,
          detail: 'ATN (FE_Na > 2%) has no specific reversal. Optimize perfusion, remove nephrotoxins, manage complications.',
          action: () => logEvent('ATN suspected: FE_Na > 2%, AKI Stage 2+ — nephrology consultation, optimize perfusion, remove nephrotoxins.') },
      ].filter(a => !a.hidden);
    },
    getClinicalPearl: ({ patient, activeMeds }) => {
      const feNa = patient?.feNa || 1.0;
      if (hasMed(activeMeds,'Furosemide')) return '⚠ FE_Na INVALID on loop diuretics — furosemide forces Na excretion regardless of volume status, making FE_Na falsely high. Use FE_Urea (< 35% = prerenal) which is unaffected by loop diuretics.';
      if (feNa<1) return 'FE_Na < 1% = the kidney is actively retaining Na — it senses underperfusion and responds correctly. The tubules are intact. This is PRERENAL AKI. IV fluids should correct it.';
      return 'FE_Na > 2% = tubular damage — cells can no longer selectively retain Na. INTRINSIC RENAL INJURY (ATN). Fluids will not reverse ATN. Optimize perfusion, eliminate nephrotoxins, manage complications.';
    }
  },

  uosm: {
    label: 'U_Osm', subtitle: 'Urine Osmolality', unit: 'mOsm/kg', color: 'violet',
    normal: '> 500 mOsm = concentrated (prerenal) | < 350 mOsm = dilute (ATN)',
    getDrivers: ({ patient }) => {
      const uOsm = patient?.urineOsmolality || 350;
      const sOsm = patient?.osm || 285;
      return [
        { label: 'U_Osm',          value: `${Math.round(uOsm)} mOsm/kg`, status: uOsm<350?'warn':'ok' },
        { label: 'U/P ratio',      value: `${(uOsm/Math.max(1,sOsm)).toFixed(1)} (${uOsm/Math.max(1,sOsm)>1.5?'Concentrating OK':'Concentrating impaired'})`, status: uOsm/sOsm<1?'critical':'ok' },
        { label: 'Interpretation', value: uOsm>500?'Prerenal pattern — intact tubules':uOsm<350?'ATN pattern — dilute urine':'Intermediate', status: uOsm<350?'warn':'ok' },
        { label: 'AKI Stage',      value: patient?.akiStage>0?`Stage ${patient.akiStage}`:'None', status: patient?.akiStage>=2?'critical':patient?.akiStage===1?'warn':'ok' },
      ];
    },
    getActions: ({ patient }, { logEvent }) => [
      { label: 'Fluid bolus (prerenal pattern)', category: 'other',
        urgent: (patient?.urineOsmolality||350)>500 && (patient?.urineOutputRate||70)/(patient?.weight||70)<0.5,
        detail: 'Oliguria + U_Osm > 500 = classic prerenal. Kidneys compensating for hypovolemia — give 250 mL and reassess.',
        action: () => logEvent('Prerenal AKI: U_Osm > 500 + oliguria → 250 mL fluid challenge.') },
    ],
    getClinicalPearl: ({ patient }) => {
      const uOsm = patient?.urineOsmolality || 350;
      if (uOsm>500) return `U_Osm ${Math.round(uOsm)} = concentrated — the tubules are working and responding to ADH. This is PRERENAL: underperfusion, not injury. Treat with fluids.`;
      if (uOsm<350) return `U_Osm ${Math.round(uOsm)} = dilute despite oliguria — tubules are damaged and cannot concentrate. Classic ATN: the combination of oliguria + isosthenuric urine (U_Osm ≈ 300, equaling serum) = established tubular injury.`;
      return 'U_Osm + FE_Na together: Prerenal = U_Osm > 500 AND FE_Na < 1%. ATN = U_Osm < 350 AND FE_Na > 2%. This combination has >90% sensitivity/specificity for AKI classification.';
    }
  },

  sosm: {
    label: 'Osm', subtitle: 'Serum Osmolality', unit: 'mOsm/kg', color: 'violet',
    normal: '280-295 mOsm/kg | Osmol gap < 10 mOsm',
    getDrivers: ({ patient, activeMeds }) => {
      const osm = patient?.osm || 285;
      const na = patient?.na || 140;
      const calcOsm = 2*na + ((patient?.bun||12)/2.8) + ((patient?.glucose||100)/18);
      const osmGap = osm - calcOsm;
      return [
        { label: 'Measured Osm',    value: `${Math.round(osm)} mOsm/kg`, status: osm>320?'critical':osm>300?'warn':osm<270?'critical':'ok' },
        { label: 'Calculated Osm',  value: `${calcOsm.toFixed(0)} (2×Na + BUN/2.8 + Gluc/18)`, status: 'ok' },
        { label: 'Osmol gap',       value: `${osmGap.toFixed(0)} mOsm ${osmGap>10?'⚠ Elevated — unmeasured osmoles':'(Normal)'}`, status: osmGap>20?'critical':osmGap>10?'warn':'ok' },
        { label: 'Sodium (Na)',     value: `${Math.round(na)} mEq/L`, status: na>150?'critical':na>145?'warn':na<130?'critical':na<135?'warn':'ok' },
        { label: 'Mannitol',       value: hasMed(activeMeds,'Mannitol')?'Active — raises Osm without raising calc Osm':'Not active', status: hasMed(activeMeds,'Mannitol')?'warn':'ok' },
      ];
    },
    getActions: ({ patient }, { logEvent }) => {
      const na = patient?.na || 140;
      const osm = patient?.osm || 285;
      return [
        { label: 'Hypertonic 3% NaCl', category: 'other', urgent: na<125, hidden: osm>=280&&na>=130,
          detail: 'Symptomatic hyponatremia: 100 mL 3% NaCl over 10 min. Target ↑Na 4-6 mEq/L initial, max 10 mEq/L per 24h (osmotic demyelination risk).',
          action: () => logEvent('Severe hyponatremia: 3% NaCl 100 mL bolus. Max correction 10 mEq/L/24h. Monitor Na q2h.') },
        { label: 'Free water restriction', category: 'other', urgent: false, hidden: osm>=290||na>=140,
          detail: 'Hyponatremia: investigate cause (SIADH, TURP syndrome, water intoxication). Restrict hypotonic fluids.',
          action: () => logEvent('Hyponatremia management: restrict free water. Investigate SIADH, TURP syndrome, cardiac/hepatic/renal failure.') },
      ].filter(a => !a.hidden);
    },
    getClinicalPearl: ({ patient, activeMeds }) => {
      const osm = patient?.osm || 285;
      const na = patient?.na || 140;
      const osmGap = osm - (2*na + ((patient?.bun||12)/2.8) + ((patient?.glucose||100)/18));
      if (osmGap>10) return `Osmol gap ${osmGap.toFixed(0)} > 10 mOsm = unmeasured osmoles: ${hasMed(activeMeds,'Mannitol')?'mannitol (active), ':''} ethanol, contrast dye, TURP irrigation fluid absorption. Gap > 20 suggests significant accumulation.`;
      if (na<130) return 'Na < 130 = significant hyponatremia. Intraoperative causes: TURP syndrome (hypotonic irrigation absorption), SIADH (surgical stress), dilutional (excessive hypotonic IVF). Osmol gap will differentiate.';
      return 'Serum Osm = 2×Na + BUN/2.8 + Glucose/18. Osmol gap = measured − calculated. Normal < 10. Elevated gap: mannitol, ethanol, methanol, TURP irrigation, or severe DKA (acetone).';
    }
  },

};
