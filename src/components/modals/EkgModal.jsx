import React, { useState } from 'react';
import { CanvasWaveform } from '../CanvasWaveform';
import { Activity, X, Heart, ShieldAlert, Zap } from 'lucide-react';

export const EkgModal = ({ 
  show, 
  close, 
  patient, 
  vitals, 
  electrolytes, 
  activeMeds, 
  hrSpeed, 
  rrSpeed 
}) => {
  const [viewMode, setViewMode] = useState('12lead'); // '3lead', '5lead', '12lead'
  const [gridTheme, setGridTheme] = useState('green'); // 'green', 'pink'

  if (!show) return null;

  const k = electrolytes?.k ?? 4.0;
  const ca = electrolytes?.ca ?? 9.0;
  const isArrest = patient?.isArrest ?? false;
  const rhythm = patient?.cardiacRhythm ?? 'normal';
  const hasDigoxin = activeMeds && activeMeds.some(m => m.name === 'Digoxin' || m.name === 'Lanoxin');
  const hasAmiodarone = activeMeds && activeMeds.some(m => m.name === 'Amiodarone');
  const hasPE = patient?.peActive || patient?.pulmonaryEmbolism || (patient?.procedure === 'PE' || patient?.currentPresetId === 'pe');

  let isIschemic = patient?.ischemicDamage > 400;
  if (patient?.myocardialStunning > 10 && (patient?.cad || patient?.hasCAD)) {
    isIschemic = true;
  }
  const ischemiaTerritory = (patient?.cad || patient?.hasCAD) ? 'inferior' : 'anterior';

  // Clinical Diagnostics Interpreter
  let diagnosisTitle = "Normal Sinus Rhythm";
  let diagnosisDesc = "Perfect hemodynamic baseline. No acute ischemia, conduction blocks, or electrolyte disturbances.";
  let alertType = "info"; // "info", "warning", "critical"

  if (isArrest) {
    alertType = "critical";
    if (rhythm === 'vfib') {
      diagnosisTitle = "Ventricular Fibrillation (VFib)";
      diagnosisDesc = "Chaotic, disorganized electrical activity. Defibrillate immediately (Joules shock) and perform high-quality CPR.";
    } else if (rhythm === 'vtach') {
      diagnosisTitle = "Ventricular Tachycardia (VTach)";
      diagnosisDesc = "Monomorphic wide-complex tachydysrhythmia. Pulseless VT indicates immediate shock; stable VT requires synchronized cardioversion.";
    } else if (rhythm === 'asystole') {
      diagnosisTitle = "Asystole / Cardiac Standstill";
      diagnosisDesc = "Complete cessation of electrical and mechanical cardiac activity. Perform continuous CPR, administer Epinephrine. Non-shockable.";
    } else if (rhythm === 'pea') {
      diagnosisTitle = "Pulseless Electrical Activity (PEA)";
      diagnosisDesc = "Organized electrical rhythm on EKG but zero mechanical stroke output (flat Pleth/Art line). Focus on treating H's & T's (Hypovolemia, Hypoxia, Acidosis).";
    }
  } else if (k > 8.5 && !patient?.calciumStabilized) {
    alertType = "critical";
    diagnosisTitle = "Severe Hyperkalemia (Sine Wave Pattern)";
    diagnosisDesc = `K+ = ${k.toFixed(1)} mEq/L. Ventricles are depolarized near threshold. Sine-wave formation is a pre-terminal rhythm. Administer Calcium Chloride immediately!`;
  } else if (k > 7.0 && !patient?.calciumStabilized) {
    alertType = "critical";
    diagnosisTitle = "Moderate Hyperkalemia (Wide QRS Complex)";
    diagnosisDesc = `K+ = ${k.toFixed(1)} mEq/L. Wide QRS complexes and flat/absent P-waves. Administer Calcium, Insulin/Dextrose, and Albuterol to shift potassium.`;
  } else if (k > 5.5) {
    alertType = "warning";
    diagnosisTitle = "Mild Hyperkalemia (Peaked T-Waves)";
    diagnosisDesc = `K+ = ${k.toFixed(1)} mEq/L. Symmetric, narrow, tented T-waves visible across precordial leads V2-V4. Conduction velocities currently stable.`;
  } else if (k < 3.0) {
    alertType = "warning";
    diagnosisTitle = "Severe Hypokalemia (ST Depression & U-Waves)";
    diagnosisDesc = `K+ = ${k.toFixed(1)} mEq/L. Flat T-waves, down-sloping ST segment depression, and prominent U-waves emerging in diastolic phases.`;
  } else if (isIschemic) {
    alertType = "critical";
    if (ischemiaTerritory === 'inferior') {
      diagnosisTitle = "Acute Inferior STEMI (Myocardial Infarction)";
      diagnosisDesc = "ST-segment elevation in inferior leads II, III, aVF. Reciprocal ST-segment depression in lateral leads I, aVL. RCA perfusion failure.";
    } else {
      diagnosisTitle = "Acute Anterior STEMI (Myocardial Infarction)";
      diagnosisDesc = "ST-segment elevation in precordial leads V1-V4. LAD occlusion. Severe risk of heart failure, ventricular septal rupture, or cardiogenic shock.";
    }
  } else if (hasPE) {
    alertType = "warning";
    diagnosisTitle = "Right Ventricular Strain (S1Q3T3 Pattern)";
    diagnosisDesc = "Sinus tachycardia, deep S-wave in I, pathological Q-wave in III, inverted T-wave in III, and precordial T-wave inversions (V1-V3) consistent with acute pulmonary embolism.";
  } else if (rhythm === 'afib' || patient?.afib || patient?.hasAFib) {
    alertType = "warning";
    diagnosisTitle = "Atrial Fibrillation (AFib)";
    diagnosisDesc = "Absent P-waves replaced by low-amplitude f-waves. Irregularly irregular R-R interval. 15% reduction in SV due to loss of atrial kick.";
  } else if (hasDigoxin) {
    alertType = "info";
    diagnosisTitle = "Digitalis Effect (Digoxin)";
    diagnosisDesc = "Scooped ST-segment depression ('digitalis sagging') in lateral leads I, aVL, V5, V6. Shortened QT interval. Conduction system slowed.";
  } else if (hasAmiodarone) {
    alertType = "info";
    diagnosisTitle = "QT Prolongation (Amiodarone Active)";
    diagnosisDesc = "Stretched repolarization (ST-T) segments resulting in prolonged QT/QTc interval. Monitor closely for early-afterdepolarizations and Torsades.";
  }

  // CSS Grid Background Styles
  const gridStyle = gridTheme === 'green' ? {
    backgroundImage: `
      linear-gradient(rgba(34, 197, 94, 0.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(34, 197, 94, 0.08) 1px, transparent 1px),
      linear-gradient(rgba(34, 197, 94, 0.22) 1px, transparent 1px),
      linear-gradient(90deg, rgba(34, 197, 94, 0.22) 1px, transparent 1px)
    `,
    backgroundSize: '6px 6px, 6px 6px, 30px 30px, 30px 30px',
    backgroundColor: '#030712'
  } : {
    backgroundImage: `
      linear-gradient(rgba(244, 63, 94, 0.09) 1px, transparent 1px),
      linear-gradient(90deg, rgba(244, 63, 94, 0.09) 1px, transparent 1px),
      linear-gradient(rgba(244, 63, 94, 0.26) 1px, transparent 1px),
      linear-gradient(90deg, rgba(244, 63, 94, 0.26) 1px, transparent 1px)
    `,
    backgroundSize: '6px 6px, 6px 6px, 30px 30px, 30px 30px',
    backgroundColor: '#0c0205'
  };

  const activeColor = gridTheme === 'green' ? '#22c55e' : '#f43f5e';
  const labelColor = gridTheme === 'green' ? 'text-green-400' : 'text-rose-400';

  // Leads configurations for different views
  const leads3 = ['I', 'II', 'III'];
  const leads5 = ['I', 'II', 'III', 'aVF', 'V5'];
  
  // 12-lead standard clinical display grid layout (3 rows x 4 columns)
  // Ordered by:
  // Col 1: I, II, III
  // Col 2: aVR, aVL, aVF
  // Col 3: V1, V2, V3
  // Col 4: V4, V5, V6
  const grid12 = [
    'I', 'aVR', 'V1', 'V4',
    'II', 'aVL', 'V2', 'V5',
    'III', 'aVF', 'V3', 'V6'
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-fade-in">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-6xl h-[92vh] sm:h-[88vh] flex flex-col overflow-hidden shadow-2xl relative">
        
        {/* Header Block */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <Activity size={24} className="animate-pulse" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-100 uppercase leading-none">Diagnostic Electrocardiogram</h2>
              <span className="text-[10px] sm:text-xs text-slate-500 font-medium">Real-time physiological vector telemetry</span>
            </div>
          </div>

          {/* Quick Stats Panel */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 bg-black/40 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
            <div className="flex items-center gap-1.5">
              <Heart size={14} className="text-green-500 shrink-0 animate-pulse" />
              <span className="text-slate-400 font-bold">HR:</span>
              <span className="text-green-400 font-mono font-black text-sm">{vitals?.hr ?? '--'} <span className="text-[9px]">BPM</span></span>
            </div>
            <div className="w-[1px] h-3 bg-slate-800 hidden sm:block"></div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">K+:</span>
              <span className="text-blue-400 font-mono font-black text-sm">{k.toFixed(1)} <span className="text-[9px]">mEq/L</span></span>
            </div>
            <div className="w-[1px] h-3 bg-slate-800 hidden sm:block"></div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">Ca2+:</span>
              <span className="text-cyan-400 font-mono font-black text-sm">{ca.toFixed(1)} <span className="text-[9px]">mg/dL</span></span>
            </div>
          </div>

          {/* Toggles and Close */}
          <div className="flex items-center gap-3 shrink-0">
            {/* View Mode */}
            <div className="flex bg-slate-950 border border-slate-800 p-0.5 rounded-lg text-xs font-semibold">
              <button 
                onClick={() => setViewMode('3lead')} 
                className={`px-2 py-1 rounded-md transition ${viewMode === '3lead' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                3-Lead
              </button>
              <button 
                onClick={() => setViewMode('5lead')} 
                className={`px-2 py-1 rounded-md transition ${viewMode === '5lead' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                5-Lead
              </button>
              <button 
                onClick={() => setViewMode('12lead')} 
                className={`px-2.5 py-1 rounded-md transition ${viewMode === '12lead' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                12-Lead
              </button>
            </div>



            <button 
              onClick={close} 
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Diagnosis Banner */}
        <div className={`px-4 py-3 border-b border-slate-850 flex items-start gap-3 shrink-0 ${
          alertType === 'critical' ? 'bg-red-950/25 border-l-4 border-l-red-500' :
          alertType === 'warning' ? 'bg-amber-950/25 border-l-4 border-l-amber-500' :
          'bg-blue-950/20 border-l-4 border-l-blue-500'
        }`}>
          <div className="mt-0.5 shrink-0">
            {alertType === 'critical' ? <ShieldAlert size={18} className="text-red-500 animate-bounce" /> :
             alertType === 'warning' ? <ShieldAlert size={18} className="text-amber-500 animate-pulse" /> :
             <ShieldAlert size={18} className="text-blue-400" />}
          </div>
          <div className="flex-1">
            <h3 className={`text-sm font-black uppercase tracking-wider leading-none mb-1 ${
              alertType === 'critical' ? 'text-red-400' :
              alertType === 'warning' ? 'text-amber-400' :
              'text-blue-400'
            }`}>{diagnosisTitle}</h3>
            <p className="text-xs text-slate-400 leading-normal">{diagnosisDesc}</p>
          </div>
        </div>

        {/* Waves Rendering Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 min-h-0 bg-slate-950">
          
          {/* 3-Lead Stacked Mode */}
          {viewMode === '3lead' && (
            <div className="flex-1 flex flex-col gap-2 min-h-[400px]">
              {leads3.map(leadName => (
                <div key={leadName} style={gridStyle} className="flex-1 border border-slate-800/80 rounded-xl relative overflow-hidden shadow-inner flex items-center min-h-[120px]">
                  <span className={`absolute top-2 left-3 z-20 font-black font-mono text-sm uppercase px-1.5 py-0.5 bg-black/60 rounded border border-slate-800/40 ${labelColor}`}>{leadName}</span>
                  <CanvasWaveform 
                    color={activeColor}
                    speed={hrSpeed}
                    rrSpeed={rrSpeed}
                    active={true}
                    type="ecg"
                    lead={leadName}
                    patientState={patient}
                    electrolytes={electrolytes}
                    activeMeds={activeMeds}
                  />
                </div>
              ))}
            </div>
          )}

          {/* 5-Lead Stacked Mode */}
          {viewMode === '5lead' && (
            <div className="flex-1 flex flex-col gap-2 min-h-[500px]">
              {leads5.map(leadName => (
                <div key={leadName} style={gridStyle} className="flex-1 border border-slate-800/80 rounded-xl relative overflow-hidden shadow-inner flex items-center min-h-[90px]">
                  <span className={`absolute top-2 left-3 z-20 font-black font-mono text-sm uppercase px-1.5 py-0.5 bg-black/60 rounded border border-slate-800/40 ${labelColor}`}>{leadName}</span>
                  <CanvasWaveform 
                    color={activeColor}
                    speed={hrSpeed}
                    rrSpeed={rrSpeed}
                    active={true}
                    type="ecg"
                    lead={leadName}
                    patientState={patient}
                    electrolytes={electrolytes}
                    activeMeds={activeMeds}
                  />
                </div>
              ))}
            </div>
          )}

          {/* 12-Lead Clinical Grid Mode */}
          {viewMode === '12lead' && (
            <div className="flex-1 flex flex-col gap-3 min-h-[500px]">
              {/* 3x4 Grid of diagnostic leads */}
              <div className="flex-1 grid grid-cols-4 grid-rows-3 gap-2 min-h-[360px]">
                {grid12.map(leadName => (
                  <div key={leadName} style={gridStyle} className="border border-slate-800/80 rounded-lg relative overflow-hidden shadow-inner flex items-center">
                    <span className={`absolute top-2 left-2 z-20 font-black font-mono text-xs uppercase px-1 bg-black/60 rounded border border-slate-800/40 ${labelColor}`}>{leadName}</span>
                    <CanvasWaveform 
                      color={activeColor}
                      speed={hrSpeed}
                      rrSpeed={rrSpeed}
                      active={true}
                      type="ecg"
                      lead={leadName}
                      patientState={patient}
                      electrolytes={electrolytes}
                      activeMeds={activeMeds}
                    />
                  </div>
                ))}
              </div>

              {/* Rhythm strip at the bottom (Lead II) */}
              <div className="h-[90px] sm:h-[120px] shrink-0 border border-slate-800 rounded-lg relative overflow-hidden shadow-inner flex items-center" style={gridStyle}>
                <span className={`absolute top-2 left-3 z-20 font-black font-mono text-xs uppercase px-2 py-0.5 bg-black/60 rounded border border-slate-800/40 ${labelColor} flex items-center gap-1.5`}>
                  <Zap size={10} className="text-yellow-400" /> Lead II (Rhythm Strip - 25mm/s)
                </span>
                <CanvasWaveform 
                  color={activeColor}
                  speed={hrSpeed}
                  rrSpeed={rrSpeed}
                  active={true}
                  type="ecg"
                  lead="II"
                  patientState={patient}
                  electrolytes={electrolytes}
                  activeMeds={activeMeds}
                />
              </div>
            </div>
          )}

        </div>

        {/* Footer info strip */}
        <div className="bg-slate-900 border-t border-slate-800 px-4 py-2 flex justify-between items-center text-[10px] sm:text-xs text-slate-500 font-mono shrink-0">
          <span>calibration: 10mm/mV • speed: 25mm/sec • filter: 0.05-150Hz</span>
          <span className="hidden sm:block">device: AirwaySim Cardiotransceiver v4.1</span>
        </div>
      </div>
    </div>
  );
};
