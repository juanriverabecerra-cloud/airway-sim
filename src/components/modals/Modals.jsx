import React from 'react';
import { X, Eye, Wind, Stethoscope } from 'lucide-react';

export const PocusModal = ({ data, close }) => {
  if (!data.show) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="bg-slate-950/90 border-2 border-indigo-500/60 shadow-[0_0_30px_rgba(99,102,241,0.25)] backdrop-blur-xl rounded-xl p-6 md:p-8 max-h-[85vh] overflow-y-auto custom-scrollbar w-11/12 max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2"><Eye size={24} className="text-indigo-400"/> {data.title}</h2>
          <button onClick={close} className="text-slate-400 hover:text-white"><X size={24}/></button>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
          <p className="text-indigo-400 font-bold text-xs uppercase tracking-wider mb-2 font-mono">Ultrasound Findings</p>
          <p className="text-white text-base md:text-lg font-medium">{data.finding}</p>
        </div>
        <button onClick={close} className="mt-6 w-full glass-button glass-button-cyan p-3 rounded-lg font-bold text-white transition text-xs font-mono uppercase tracking-wider">Close Report</button>
      </div>
    </div>
  );
};

export const AirwayQuizModal = ({ data, submitAirwayQuiz }) => {
  const [error, setError] = React.useState('');
  const [prevShow, setPrevShow] = React.useState(data.show);
  
  if (data.show !== prevShow) {
    setPrevShow(data.show);
    setError('');
  }

  if (!data.show) return null;

  const handleSelect = (grade) => {
      if (grade !== data.trueMallampati) {
          setError(`Incorrect. Look closely at the description: "${data.description}". ` + 
                   (data.trueMallampati === 1 ? "In Class I, you can see the soft palate, fauces, uvula, and pillars." :
                    data.trueMallampati === 2 ? "In Class II, you can see the soft palate, fauces, and uvula (not pillars)." :
                    data.trueMallampati === 3 ? "In Class III, you can only see the soft palate and base of uvula." :
                    "In Class IV, the soft palate is NOT visible at all, only hard palate."));
      } else {
          submitAirwayQuiz(grade);
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="bg-slate-950/90 border-2 border-cyan-500/60 shadow-[0_0_30px_rgba(6,182,212,0.25)] backdrop-blur-xl rounded-xl p-6 md:p-8 max-h-[85vh] overflow-y-auto custom-scrollbar w-11/12 max-w-2xl shadow-2xl">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-4 flex items-center gap-2"><Eye size={24} className="text-cyan-400"/> Pre-Intubation Airway Assessment</h2>
        <p className="text-sm md:text-lg text-slate-300 mb-4 italic border-l-4 border-cyan-500/60 pl-4 py-2 bg-slate-900/50 whitespace-pre-wrap">{data.description}</p>
        
        {error && (
            <div className="mb-4 bg-red-950/80 border border-red-500 text-red-200 p-3 rounded font-bold text-sm animate-pulse">
                ⚠️ {error}
            </div>
        )}

        <h3 className="text-yellow-400 font-bold mb-4 text-sm md:text-base">Based on your visualization, select the correct Mallampati Score:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(grade => (
            <button key={grade} onClick={() => handleSelect(grade)} className="bg-slate-900/60 hover:bg-cyan-950/40 p-4 rounded-xl border border-slate-800/80 hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all font-mono">
              <span className="font-black text-white block text-sm tracking-wide">Mallampati Class {['I', 'II', 'III', 'IV'][grade-1]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export const AccessModal = ({ data, close, establishAccess }) => {
  const [cvcType, setCvcType] = React.useState('Triple Lumen CVC');
  const [pivType, setPivType] = React.useState('18G');
  const [ioType, setIoType] = React.useState('EZ-IO');
  const [artType, setArtType] = React.useState('20G');

  if (!data.show) return null;

  // Helper to calculate gravity crystalloid flow rate using Poiseuille Series model
  const getFlowStats = (rad, len, venousP, veinR) => {
    const rTubing = 400; // gravity
    const rCath = len / Math.pow(rad, 4);
    const rTotal = rTubing + rCath + veinR;
    const deltaP = Math.max(0, 74 - venousP);
    const q_ml_min = (1200 * deltaP) / rTotal;
    const q_ml_hr = q_ml_min * 60;
    return {
      min: q_ml_min.toFixed(1),
      hr: Math.round(q_ml_hr),
      rCath: Math.round(rCath),
      rTotal: Math.round(rTotal)
    };
  };

  const getPivParams = (type) => {
    let rad = 0.475;
    let len = 32;
    if (type === '14G') { rad = 0.85; len = 45; }
    else if (type === '16G') { rad = 0.665; len = 45; }
    else if (type === '18G') { rad = 0.475; len = 32; }
    else if (type === '20G') { rad = 0.405; len = 30; }
    else if (type === '22G') { rad = 0.30; len = 25; }
    else if (type === '24G') { rad = 0.235; len = 19; }
    return { rad, len };
  };

  const getCvcLumens = (type) => {
    if (type === 'Triple Lumen CVC') {
      return [
        { name: 'Distal Lumen (16G)', rad: 0.665, len: 200 },
        { name: 'Medial Lumen (18G)', rad: 0.475, len: 200 },
        { name: 'Proximal Lumen (18G)', rad: 0.475, len: 200 }
      ];
    } else if (type === 'Double Lumen CVC (14G, 18G)') {
      return [
        { name: 'Distal Lumen (14G)', rad: 0.85, len: 200 },
        { name: 'Proximal Lumen (18G)', rad: 0.475, len: 200 }
      ];
    } else if (type.includes('Single Lumen CVC')) {
      return [{ name: 'Single Lumen (14G)', rad: 0.85, len: 200 }];
    } else if (type.includes('MAC')) {
      return [{ name: 'MAC Introducer (9Fr)', rad: 1.25, len: 100 }];
    } else if (type.includes('Cordis')) {
      return [{ name: 'Trauma Cordis (8.5Fr)', rad: 1.15, len: 100 }];
    } else if (type.includes('Pulmonary Artery') || type.includes('Swan')) {
      return [{ name: 'PAC Proximal (CVP) Port', rad: 0.45, len: 1100 }, { name: 'PAC Distal (PA) Port', rad: 0.45, len: 1100 }];
    }
    return [];
  };

  // Ring theme colors
  const themes = {
    'Peripheral IV': {
      ring: 'border-cyan-500/60 shadow-[0_0_30px_rgba(6,182,212,0.25)]',
      text: 'text-cyan-400',
      btn: 'bg-cyan-600/20 hover:bg-cyan-600 border border-cyan-500/30 hover:border-cyan-400 text-cyan-100 hover:text-white',
      banner: 'bg-cyan-950/40 border border-cyan-800/40 text-cyan-200'
    },
    'Central Line': {
      ring: 'border-indigo-500/60 shadow-[0_0_30px_rgba(99,102,241,0.25)]',
      text: 'text-indigo-400',
      btn: 'bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 hover:border-indigo-400 text-indigo-100 hover:text-white',
      banner: 'bg-indigo-950/40 border border-indigo-800/40 text-indigo-200'
    },
    'Intraosseous (IO)': {
      ring: 'border-amber-500/60 shadow-[0_0_30px_rgba(245,158,11,0.25)]',
      text: 'text-amber-400',
      btn: 'bg-amber-600/20 hover:bg-amber-600 border border-amber-500/30 hover:border-amber-400 text-amber-100 hover:text-white',
      banner: 'bg-amber-950/40 border border-amber-800/40 text-amber-200'
    },
    'Arterial Line': {
      ring: 'border-rose-500/60 shadow-[0_0_30px_rgba(244,63,94,0.25)]',
      text: 'text-rose-400',
      btn: 'bg-rose-600/20 hover:bg-rose-600 border border-rose-500/30 hover:border-rose-400 text-rose-100 hover:text-white',
      banner: 'bg-rose-950/40 border border-rose-800/40 text-rose-200'
    }
  };

  const currentTheme = themes[data.category] || themes['Peripheral IV'];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className={`backdrop-blur-lg bg-slate-950/90 border-2 rounded-2xl p-6 md:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl transition-all ${currentTheme.ring}`}>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-slate-800/60 pb-4">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-wide uppercase">
              Establish {data.category} Access
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-mono">Physiologic Flow Model: Poiseuille-Series Resus V2</p>
          </div>
          <button onClick={close} className="text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 p-2 rounded-lg border border-slate-800 transition-colors">
            <X size={20}/>
          </button>
        </div>

        {/* --- PERIPHERAL IV --- */}
        {data.category === 'Peripheral IV' && (() => {
          const { rad, len } = getPivParams(pivType);
          const acStats = getFlowStats(rad, len, 8, 200);
          const armStats = getFlowStats(rad, len, 12, 800);
          const handStats = getFlowStats(rad, len, 18, 2200);
          
          return (
            <div className="flex flex-col gap-6">
              {/* Dropdown Selection */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div>
                  <label className="text-slate-300 font-bold block mb-1 text-sm font-mono">Select Catheter Gauge</label>
                  <p className="text-xs text-slate-500">Larger gauges have smaller diameter and higher resistance.</p>
                </div>
                <select 
                  value={pivType} 
                  onChange={e => setPivType(e.target.value)}
                  className="w-full md:w-80 bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 font-bold focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                >
                  <option value="14G">14G (1.70mm OD, 45mm L)</option>
                  <option value="16G">16G (1.33mm OD, 45mm L)</option>
                  <option value="18G">18G (0.95mm OD, 32mm L)</option>
                  <option value="20G">20G (0.81mm OD, 30mm L)</option>
                  <option value="22G">22G (0.60mm OD, 25mm L)</option>
                  <option value="24G">24G (0.47mm OD, 19mm L)</option>
                </select>
              </div>

              {/* Physical specs display */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center font-mono">
                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase block">Inner Radius (r)</span>
                  <span className="text-lg font-extrabold text-white">{rad} mm</span>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase block">Length (L)</span>
                  <span className="text-lg font-extrabold text-white">{len} mm</span>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase block">R_catheter (L / r⁴)</span>
                  <span className="text-lg font-extrabold text-cyan-400">{Math.round(len / Math.pow(rad, 4))}</span>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase block">R_tubing (Gravity)</span>
                  <span className="text-lg font-extrabold text-cyan-400">400</span>
                </div>
              </div>

              {/* Anatomy Flow Rate Estimation Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* AC */}
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-cyan-400 mb-2 border-b border-slate-800 pb-1 text-sm font-mono text-center">Antecubital Vein (AC)</h3>
                    <div className="text-xs font-mono space-y-1 text-slate-400 mb-4">
                      <div className="flex justify-between"><span>Vein Resistance:</span><span className="text-white">200</span></div>
                      <div className="flex justify-between"><span>Venous Pressure:</span><span className="text-white">8 mmHg</span></div>
                      <div className="flex justify-between border-t border-slate-800/80 pt-1 mt-1 font-bold">
                        <span>Max Flow (Crystalloid):</span>
                        <span className="text-cyan-400">{acStats.hr} mL/hr ({acStats.min} mL/min)</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => establishAccess('PIV', `${pivType} PIV`, 'Right AC')} className={`w-1/2 p-2 rounded-lg font-bold text-xs transition-all ${currentTheme.btn}`}>Right AC</button>
                    <button onClick={() => establishAccess('PIV', `${pivType} PIV`, 'Left AC')} className={`w-1/2 p-2 rounded-lg font-bold text-xs transition-all ${currentTheme.btn}`}>Left AC</button>
                  </div>
                </div>

                {/* Forearm */}
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-cyan-400 mb-2 border-b border-slate-800 pb-1 text-sm font-mono text-center">Forearm Vein</h3>
                    <div className="text-xs font-mono space-y-1 text-slate-400 mb-4">
                      <div className="flex justify-between"><span>Vein Resistance:</span><span className="text-white">800</span></div>
                      <div className="flex justify-between"><span>Venous Pressure:</span><span className="text-white">12 mmHg</span></div>
                      <div className="flex justify-between border-t border-slate-800/80 pt-1 mt-1 font-bold">
                        <span>Max Flow (Crystalloid):</span>
                        <span className="text-cyan-400">{armStats.hr} mL/hr ({armStats.min} mL/min)</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => establishAccess('PIV', `${pivType} PIV`, 'Right Forearm')} className={`w-1/2 p-2 rounded-lg font-bold text-xs transition-all ${currentTheme.btn}`}>Right Arm</button>
                    <button onClick={() => establishAccess('PIV', `${pivType} PIV`, 'Left Forearm')} className={`w-1/2 p-2 rounded-lg font-bold text-xs transition-all ${currentTheme.btn}`}>Left Arm</button>
                  </div>
                </div>

                {/* Hand */}
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-cyan-400 mb-2 border-b border-slate-800 pb-1 text-sm font-mono text-center">Hand Dorsal Plexus</h3>
                    <div className="text-xs font-mono space-y-1 text-slate-400 mb-4">
                      <div className="flex justify-between"><span>Vein Resistance:</span><span className="text-white">2200</span></div>
                      <div className="flex justify-between"><span>Venous Pressure:</span><span className="text-white">18 mmHg</span></div>
                      <div className="flex justify-between border-t border-slate-800/80 pt-1 mt-1 font-bold text-[11px]">
                        <span>Max Flow (Crystalloid):</span>
                        <span className="text-cyan-400">{handStats.hr} mL/hr ({handStats.min} mL/min)</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => establishAccess('PIV', `${pivType} PIV`, 'Right Hand')} className={`w-1/2 p-2 rounded-lg font-bold text-xs transition-all ${currentTheme.btn}`}>Right Hand</button>
                    <button onClick={() => establishAccess('PIV', `${pivType} PIV`, 'Left Hand')} className={`w-1/2 p-2 rounded-lg font-bold text-xs transition-all ${currentTheme.btn}`}>Left Hand</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* --- CENTRAL VENOUS ACCESS --- */}
        {data.category === 'Central Line' && (() => {
          const lumens = getCvcLumens(cvcType);
          
          return (
            <div className="flex flex-col gap-6">
              {/* Dropdown Selection */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div>
                  <label className="text-slate-300 font-bold block mb-1 text-sm font-mono">Select Central Catheter Type</label>
                  <p className="text-xs text-slate-500">CVC lumens act in parallel. Long length increases resistance.</p>
                </div>
                <select 
                  value={cvcType} 
                  onChange={e => setCvcType(e.target.value)}
                  className="w-full md:w-96 bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 font-bold focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                >
                  <option value="Single Lumen CVC (14G)">Single Lumen CVC (14G)</option>
                  <option value="Double Lumen CVC (14G, 18G)">Double Lumen CVC (14G, 18G)</option>
                  <option value="Triple Lumen CVC">Triple Lumen CVC (16G, 18G, 18G)</option>
                  <option value="MAC Introducer (9Fr)">MAC Introducer (9Fr / 3.0mm OD)</option>
                  <option value="Trauma Cordis">Trauma Cordis (8.5Fr / 2.8mm OD)</option>
                  <option value="Pulmonary Artery Catheter (Swan-Ganz)">Pulmonary Artery Catheter (Swan-Ganz, 7.5Fr)</option>
                </select>
              </div>

              {/* Lumen Flow Breakdown Dashboard */}
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/80">
                <h4 className="font-bold text-slate-300 text-xs font-mono uppercase tracking-wide mb-3">Lumen Poiseuille Flow Estimates (Gravity, CVP = 5, R_vein = 0)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono">
                  {lumens.map((l, i) => {
                    const stats = getFlowStats(l.rad, l.len, 5, 0);
                    return (
                      <div key={i} className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
                        <span className="font-extrabold text-indigo-400 block mb-1.5">{l.name}</span>
                        <div className="space-y-0.5 text-slate-400 text-[11px]">
                          <div>Radius: <span className="text-white">{l.rad} mm</span></div>
                          <div>Length: <span className="text-white">{l.len} mm</span></div>
                          <div>Resistance (L/r⁴): <span className="text-white">{stats.rCath}</span></div>
                          <div className="text-indigo-400 font-extrabold border-t border-slate-900 mt-1 pt-1">
                            Flow: {stats.hr} mL/hr ({stats.min} mL/min)
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Anatomical Placements */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
                  <h3 className="font-extrabold text-indigo-400 mb-3 text-center border-b border-slate-800 pb-2 text-sm font-mono">Internal Jugular (IJ)</h3>
                  <div className="flex gap-2">
                    <button onClick={() => establishAccess('CVC', cvcType, 'Right IJ')} className={`w-1/2 p-2 rounded-lg font-bold text-xs transition-all ${currentTheme.btn}`}>Right IJ</button>
                    <button onClick={() => establishAccess('CVC', cvcType, 'Left IJ')} className={`w-1/2 p-2 rounded-lg font-bold text-xs transition-all ${currentTheme.btn}`}>Left IJ</button>
                  </div>
                </div>
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
                  <h3 className="font-extrabold text-indigo-400 mb-3 text-center border-b border-slate-800 pb-2 text-sm font-mono">Subclavian Vein</h3>
                  <div className="flex gap-2">
                    <button onClick={() => establishAccess('CVC', cvcType, 'Right Subclavian')} className={`w-1/2 p-2 rounded-lg font-bold text-xs transition-all ${currentTheme.btn}`}>Right SC</button>
                    <button onClick={() => establishAccess('CVC', cvcType, 'Left Subclavian')} className={`w-1/2 p-2 rounded-lg font-bold text-xs transition-all ${currentTheme.btn}`}>Left SC</button>
                  </div>
                </div>
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
                  <h3 className="font-extrabold text-indigo-400 mb-3 text-center border-b border-slate-800 pb-2 text-sm font-mono">Femoral Vein</h3>
                  <div className="flex gap-2">
                    <button onClick={() => establishAccess('CVC', cvcType, 'Right Femoral')} className={`w-1/2 p-2 rounded-lg font-bold text-xs transition-all ${currentTheme.btn}`}>Right Fem</button>
                    <button onClick={() => establishAccess('CVC', cvcType, 'Left Femoral')} className={`w-1/2 p-2 rounded-lg font-bold text-xs transition-all ${currentTheme.btn}`}>Left Fem</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* --- INTRAOSSEOUS ACCESS --- */}
        {data.category === 'Intraosseous (IO)' && (() => {
          const tibiaStats = getFlowStats(0.45, 25, 18, 2500);
          const humeralStats = getFlowStats(0.45, 25, 15, 1500);
          
          return (
            <div className="flex flex-col gap-6">
              {/* Dropdown Selection */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div>
                  <label className="text-slate-300 font-bold block mb-1 text-sm font-mono">Select IO System</label>
                  <p className="text-xs text-slate-500">Rigid bones constrain bone marrow venous sinusoids.</p>
                </div>
                <select 
                  value={ioType} 
                  onChange={e => setIoType(e.target.value)}
                  className="w-full md:w-80 bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 font-bold focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                >
                  <option value="EZ-IO">EZ-IO (15G Needle / 1.1mm ID)</option>
                </select>
              </div>

              {/* Placements and estimated flows */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-amber-400 mb-2 border-b border-slate-800 pb-1 text-sm font-mono text-center">Proximal Tibia</h3>
                    <div className="text-xs font-mono space-y-1 text-slate-400 mb-4">
                      <div className="flex justify-between"><span>Catheter (15G):</span><span className="text-white">r: 0.45mm, L: 25mm</span></div>
                      <div className="flex justify-between"><span>Bony Sinusoid Resistance:</span><span className="text-white">2500</span></div>
                      <div className="flex justify-between"><span>Intramedullary Pressure:</span><span className="text-white">18 mmHg</span></div>
                      <div className="flex justify-between border-t border-slate-800/80 pt-1 mt-1 font-bold text-[11px]">
                        <span>Gravity Crystalloid Flow:</span>
                        <span className="text-amber-400">{tibiaStats.hr} mL/hr ({tibiaStats.min} mL/min)</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => establishAccess('IO', ioType, 'Right Proximal Tibia')} className={`w-1/2 p-2 rounded-lg font-bold text-xs transition-all ${currentTheme.btn}`}>Right Tibia</button>
                    <button onClick={() => establishAccess('IO', ioType, 'Left Proximal Tibia')} className={`w-1/2 p-2 rounded-lg font-bold text-xs transition-all ${currentTheme.btn}`}>Left Tibia</button>
                  </div>
                </div>

                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-amber-400 mb-2 border-b border-slate-800 pb-1 text-sm font-mono text-center">Humeral Head</h3>
                    <div className="text-xs font-mono space-y-1 text-slate-400 mb-4">
                      <div className="flex justify-between"><span>Catheter (15G):</span><span className="text-white">r: 0.45mm, L: 25mm</span></div>
                      <div className="flex justify-between"><span>Humeral Sinusoid Resistance:</span><span className="text-white">1500</span></div>
                      <div className="flex justify-between"><span>Intramedullary Pressure:</span><span className="text-white">15 mmHg</span></div>
                      <div className="flex justify-between border-t border-slate-800/80 pt-1 mt-1 font-bold text-[11px]">
                        <span>Gravity Crystalloid Flow:</span>
                        <span className="text-amber-400">{humeralStats.hr} mL/hr ({humeralStats.min} mL/min)</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => establishAccess('IO', ioType, 'Right Humeral Head')} className={`w-1/2 p-2 rounded-lg font-bold text-xs transition-all ${currentTheme.btn}`}>Right Humerus</button>
                    <button onClick={() => establishAccess('IO', ioType, 'Left Humeral Head')} className={`w-1/2 p-2 rounded-lg font-bold text-xs transition-all ${currentTheme.btn}`}>Left Humerus</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* --- ARTERIAL LINE ACCESS --- */}
        {data.category === 'Arterial Line' && (
          <div className="flex flex-col gap-6">
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div>
                <label className="text-slate-300 font-bold block mb-1 text-sm font-mono">Select Arterial Catheter Size</label>
                <p className="text-xs text-slate-500">Only used for invasive BP monitoring. Fluid resuscitation contraindicated!</p>
              </div>
              <select 
                value={artType} 
                onChange={e => setArtType(e.target.value)}
                className="w-full md:w-80 bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 font-bold focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
              >
                <option value="20G">20G Arterial Catheter (Radial/Brachial)</option>
                <option value="18G">18G Arterial Catheter (Femoral/Axillary)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-center">
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
                <h3 className="font-extrabold text-rose-400 mb-3 border-b border-slate-800 pb-2 text-xs">Radial Artery</h3>
                <div className="flex flex-col gap-2">
                  <button onClick={() => establishAccess('Arterial', `${artType} Arterial Line`, 'Right Radial')} className={`p-2 rounded-lg font-bold text-xs transition-all ${currentTheme.btn}`}>Right Radial</button>
                  <button onClick={() => establishAccess('Arterial', `${artType} Arterial Line`, 'Left Radial')} className={`p-2 rounded-lg font-bold text-xs transition-all ${currentTheme.btn}`}>Left Radial</button>
                </div>
              </div>
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
                <h3 className="font-extrabold text-rose-400 mb-3 border-b border-slate-800 pb-2 text-xs">Brachial Artery</h3>
                <div className="flex flex-col gap-2">
                  <button onClick={() => establishAccess('Arterial', `${artType} Arterial Line`, 'Right Brachial')} className={`p-2 rounded-lg font-bold text-xs transition-all ${currentTheme.btn}`}>Right Brachial</button>
                  <button onClick={() => establishAccess('Arterial', `${artType} Arterial Line`, 'Left Brachial')} className={`p-2 rounded-lg font-bold text-xs transition-all ${currentTheme.btn}`}>Left Brachial</button>
                </div>
              </div>
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
                <h3 className="font-extrabold text-rose-400 mb-3 border-b border-slate-800 pb-2 text-xs">Axillary Artery</h3>
                <div className="flex flex-col gap-2">
                  <button onClick={() => establishAccess('Arterial', `${artType} Arterial Line`, 'Right Axillary')} className={`p-2 rounded-lg font-bold text-xs transition-all ${currentTheme.btn}`}>Right Axillary</button>
                  <button onClick={() => establishAccess('Arterial', `${artType} Arterial Line`, 'Left Axillary')} className={`p-2 rounded-lg font-bold text-xs transition-all ${currentTheme.btn}`}>Left Axillary</button>
                </div>
              </div>
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
                <h3 className="font-extrabold text-rose-400 mb-3 border-b border-slate-800 pb-2 text-xs">Femoral Artery</h3>
                <div className="flex flex-col gap-2">
                  <button onClick={() => establishAccess('Arterial', `${artType} Arterial Line`, 'Right Femoral')} className={`p-2 rounded-lg font-bold text-xs transition-all ${currentTheme.btn}`}>Right Femoral</button>
                  <button onClick={() => establishAccess('Arterial', `${artType} Arterial Line`, 'Left Femoral')} className={`p-2 rounded-lg font-bold text-xs transition-all ${currentTheme.btn}`}>Left Femoral</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const TubeConfirmModal = ({ data, close, patient, auscultateLungs, adjustTube }) => {
  if (!data.show) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="bg-slate-950/90 border-2 border-indigo-500/60 shadow-[0_0_30px_rgba(99,102,241,0.25)] backdrop-blur-xl rounded-xl p-6 md:p-8 max-h-[85vh] overflow-y-auto custom-scrollbar w-11/12 max-w-xl shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2"><Stethoscope size={24} className="text-indigo-400"/> Auscultate & Confirm</h2>
          <button onClick={close} data-tutorial="confirm-close-btn" className="text-slate-400 hover:text-white"><X size={24}/></button>
        </div>

        {data.result && (
          <div className="mb-6 p-4 bg-indigo-950/60 border border-indigo-500/40 rounded-xl text-indigo-200 font-mono font-bold text-xs md:text-sm shadow-inner">
            {data.result}
          </div>
        )}

        <p className="text-xs md:text-sm text-slate-400 mb-4 font-mono">Select an anatomical location to auscultate for breath sounds or gastric insufflation:</p>
        <div className="grid grid-cols-1 gap-3 mb-6 font-mono">
          <button onClick={() => auscultateLungs('Left Lung')} data-tutorial="auscultate-left-btn" className="bg-slate-900/60 hover:bg-indigo-950/40 p-4 rounded-xl border border-slate-800/80 hover:border-indigo-500/50 hover:shadow-[0_0_12px_rgba(99,102,241,0.15)] text-left transition font-bold text-xs md:text-sm text-white">Left Lung Field</button>
          <button onClick={() => auscultateLungs('Right Lung')} className="bg-slate-900/60 hover:bg-indigo-950/40 p-4 rounded-xl border border-slate-800/80 hover:border-indigo-500/50 hover:shadow-[0_0_12px_rgba(99,102,241,0.15)] text-left transition font-bold text-xs md:text-sm text-white">Right Lung Field</button>
          <button onClick={() => auscultateLungs('Epigastrium')} className="bg-slate-900/60 hover:bg-indigo-950/40 p-4 rounded-xl border border-slate-800/80 hover:border-indigo-500/50 hover:shadow-[0_0_12px_rgba(99,102,241,0.15)] text-left transition font-bold text-xs md:text-sm text-white">Epigastrium (Stomach)</button>
        </div>

        {(patient.tubePosition === 'right_mainstem' || patient.tubePosition === 'left_mainstem' || patient.tubePosition === 'trachea' || patient.tubePosition === 'esophagus') && (
          <>
            <h3 className="text-indigo-400 font-bold text-xs uppercase tracking-wider mb-3 border-b border-indigo-950 pb-1 font-mono">Tube Interventions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
              <button onClick={() => adjustTube('pull_back')} className="bg-slate-900/60 hover:bg-slate-800/60 p-3 rounded-xl border border-slate-800 hover:border-slate-600 text-xs text-center font-bold text-slate-200 transition-all">Pull Tube Back 2cm</button>
              <button onClick={() => adjustTube('remove')} className="bg-rose-950/20 hover:bg-rose-900/35 p-3 rounded-xl border border-rose-900/40 hover:border-rose-500 text-xs text-center text-rose-300 font-bold transition-all">Extubate / Remove Tube</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const SetupModal = ({ show, close, viewModal, setViewModal, processIntubation }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="bg-slate-950/90 border-2 border-cyan-500/60 shadow-[0_0_30px_rgba(6,182,212,0.25)] backdrop-blur-xl rounded-xl p-4 md:p-8 max-w-4xl shadow-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-6 flex items-center gap-2"><Wind size={24} className="text-cyan-400"/> Intubation Equipment Setup</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 font-mono">
          <div>
            <h3 className="text-cyan-400 font-bold mb-3 border-b border-cyan-950 pb-1 text-xs uppercase tracking-wider">1. Select Blade</h3>
            <div className="flex flex-col gap-2">
              {['Macintosh (Curved DL)', 'Miller (Straight DL)', 'Standard VL', 'Hyperangulated VL', 'Fiberoptic'].map(blade => (
                <button key={blade} onClick={() => setViewModal(prev => ({...prev, blade}))} data-tutorial={blade === 'Macintosh (Curved DL)' ? 'mac-blade-btn' : undefined} className={`p-2 rounded-xl text-xs text-left border transition-all ${viewModal.blade === blade ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.15)] font-bold' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>{blade}</button>
              ))}
            </div>
            {viewModal.blade && !viewModal.blade.includes('Fiberoptic') && (
              <select value={viewModal.bladeSize} onChange={(e) => setViewModal(prev => ({...prev, bladeSize: e.target.value}))} data-tutorial="blade-size-select" className="w-full mt-2 bg-slate-950 text-white text-xs p-2 border border-slate-800 rounded outline-none focus:border-cyan-500 transition">
                <option value="">Select Size (Hint: Size 3/4 Adult)</option>
                <option value="2">Size 2 (Small)</option><option value="3">Size 3 (Normal)</option><option value="4">Size 4 (Large)</option>
              </select>
            )}
          </div>
          <div>
            <h3 className="text-indigo-400 font-bold mb-3 border-b border-indigo-950 pb-1 text-xs uppercase tracking-wider">2. Select ETT</h3>
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <label className="text-[10px] md:text-xs text-slate-400 block mb-1">Tube Size (Hint: 7.0-7.5 Female, 7.5-8.0 Male)</label>
              <select value={viewModal.tubeSize} onChange={(e) => setViewModal(prev => ({...prev, tubeSize: e.target.value}))} data-tutorial="tube-size-select" className="w-full bg-slate-950 text-white text-xs p-2.5 border border-slate-850 rounded-lg outline-lg outline-none focus:border-cyan-500 transition">
                <option value="">Select ETT Size</option>
                <option value="6.0">6.0 mm</option><option value="6.5">6.5 mm</option><option value="7.0">7.0 mm</option><option value="7.5">7.5 mm</option><option value="8.0">8.0 mm</option>
              </select>
            </div>
          </div>
          <div>
            <h3 className="text-cyan-400 font-bold mb-3 border-b border-cyan-950 pb-1 text-xs uppercase tracking-wider">3. Select Adjunct</h3>
            <div className="flex flex-col gap-2">
              {[
                'None (Direct Tube)', 
                'Standard Malleable Stylet', 
                'Standard Bougie (Eschmann)', 
                'Hyperangulated Rigid Stylet', 
                'Articulating Bougie'
              ].map(adjunct => (
                <button key={adjunct} onClick={() => setViewModal(prev => ({...prev, adjunct}))} data-tutorial={adjunct === 'Standard Malleable Stylet' ? 'stylet-btn' : undefined} className={`p-2 rounded-xl text-xs text-left border transition-all ${viewModal.adjunct === adjunct ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.15)] font-bold' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>{adjunct}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-end gap-3 md:gap-4 border-t border-slate-800/60 pt-4">
          <button onClick={close} className="px-6 py-3 sm:py-2 bg-slate-900 hover:bg-slate-800 rounded-xl font-bold w-full sm:w-auto text-slate-400 hover:text-white border border-slate-800 transition">Cancel</button>
          <button onClick={() => processIntubation(`${viewModal.blade} Size ${viewModal.bladeSize || '-'} with ${viewModal.tubeSize} ETT`, viewModal.adjunct)} disabled={!viewModal.blade || !viewModal.adjunct || !viewModal.tubeSize} data-tutorial="proceed-intubate-btn" className="px-6 py-3 sm:py-2 bg-cyan-600/20 hover:bg-cyan-600 disabled:opacity-50 disabled:pointer-events-none rounded-xl font-bold text-cyan-300 hover:text-white border border-cyan-500/30 hover:border-cyan-400 w-full sm:w-auto transition shadow-[0_0_15px_rgba(6,182,212,0.1)]">Proceed to Intubate</button>
        </div>
      </div>
    </div>
  );
};

export const ViewModal = ({ data, submitGrade }) => {
  if (!data.show || !data.description) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="bg-slate-950/90 border-2 border-cyan-500/60 shadow-[0_0_30px_rgba(6,182,212,0.25)] backdrop-blur-xl rounded-xl p-6 md:p-8 max-w-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2"><Eye size={24} className="text-cyan-400"/> Direct Visualization: {data.blade}</h2>
        <p className="text-lg text-slate-300 mb-8 italic border-l-4 border-cyan-500/60 pl-4 py-2 bg-slate-900/50 whitespace-pre-wrap">"{data.description}"</p>
        <h3 className="text-yellow-400 font-bold mb-4 font-mono text-sm md:text-base">Select the Cormack-Lehane Grade:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
          {[1, 2, 3, 4].map(grade => (
            <button key={grade} onClick={() => submitGrade(grade)} data-tutorial={grade === data.trueGrade ? 'correct-grade-btn' : undefined} className="bg-slate-900/60 hover:bg-cyan-950/40 p-4 rounded-xl border border-slate-800/85 hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all text-left">
              <span className="font-black text-white block text-sm tracking-wide">Grade {['I', 'II', 'III', 'IV'][grade-1]}</span>
              <span className="text-xs text-slate-400 mt-1 block">{['Full view of glottis', 'Partial view of glottis', 'Epiglottis only visible', 'No structures visible'][grade-1]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// 1. PRE-OPERATIVE RISK ASSESSMENT & FLOWCHART MODAL
export const PreopModal = ({ show, close, patient, setPatient, logEvent }) => {
  const [rcri, setRcri] = React.useState({
    highRiskSurg: false,
    ischemicHeart: false,
    chf: false,
    cerebrovascular: false,
    insulin: false,
    creatinine: false
  });

  const [mets, setMets] = React.useState(null); // 'poor', 'adequate'
  
  const [preopOrders, setPreopOrders] = React.useState({
      cbc: false,
      bmp: false,
      coags: false,
      typeAndScreen: false,
      typeAndCross: false
  });

  React.useEffect(() => {
    if (patient?.verifiedRisk) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRcri({
        highRiskSurg: patient.verifiedRisk.rcriHighRisk || false,
        ischemicHeart: patient.verifiedRisk.rcriIhd || false,
        chf: patient.verifiedRisk.rcriChf || false,
        cerebrovascular: patient.verifiedRisk.rcriCva || false,
        insulin: patient.verifiedRisk.rcriInsulin || false,
        creatinine: patient.verifiedRisk.rcriCr || false
      });
      setMets(patient.verifiedRisk.mets || null);
    }
    if (patient?.preOpOrders && patient.preOpOrders.labs) {
      setPreopOrders({
        cbc: patient.preOpOrders.labs.cbc || false,
        bmp: patient.preOpOrders.labs.bmp || false,
        coags: patient.preOpOrders.labs.coags || false,
        typeAndScreen: patient.preOpOrders.labs.typeAndScreen || false,
        typeAndCross: patient.preOpOrders.labs.typeAndCross || false
      });
    }
  }, [patient]);

  if (!show) return null;

  const calculateRcriScore = () => {
    return Object.values(rcri).filter(Boolean).length;
  };

  const rcriScore = calculateRcriScore();
  const rcriClass = rcriScore === 0 ? 'Class I (0.4% risk)' : rcriScore === 1 ? 'Class II (0.9% risk)' : rcriScore === 2 ? 'Class III (6.6% risk)' : 'Class IV (11% risk)';

  const handleClearance = () => {
    logEvent(`📋 Pre-Op Evaluation Complete: RCRI Score = ${rcriScore} (${rcriClass}), Functional capacity = ${mets ? mets.toUpperCase() : 'UNKNOWN'}. Patient cleared with precautions.`);
    if (setPatient) {
        setPatient(prev => ({ 
            ...prev, 
            bloodBank: preopOrders.typeAndCross
                ? { status: 'available', unitsInOR: 2, deliveryCountdown: 0, totalDeliveryTime: 0, preOpWorkup: 'crossmatch' }
                : { status: 'none', unitsInOR: 0, deliveryCountdown: 0, totalDeliveryTime: 0, preOpWorkup: preopOrders.typeAndScreen ? 'screen' : 'none' }
        }));
    }
    close();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="bg-slate-950/90 border-2 border-indigo-500/60 shadow-[0_0_30px_rgba(99,102,241,0.25)] backdrop-blur-xl rounded-xl p-6 md:p-8 max-w-4xl shadow-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">📋 Pre-Operative Risk Assessment</h2>
            <p className="text-xs text-indigo-400 mt-1">Based on the 2024 ACC/AHA Preoperative Cardiovascular Guidelines</p>
          </div>
          <button onClick={close} className="text-slate-400 hover:text-white"><X size={24}/></button>
        </div>

        {/* Section 1: Patient Clinical Profile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-slate-800/80 p-4 rounded-lg border border-slate-700 col-span-2">
            <h3 className="text-indigo-300 font-bold text-sm uppercase mb-3">Clinical Profile & History</h3>
            <div className="grid grid-cols-2 gap-3 text-xs md:text-sm">
              <div><span className="text-slate-400">Patient:</span> <span className="text-white font-bold">{patient?.name || 'John Doe'}</span></div>
              <div><span className="text-slate-400">Age / Weight:</span> <span className="text-white font-bold">{patient?.age || 65}yo / {patient?.weight || 75} kg</span></div>
              <div><span className="text-slate-400">Height / BMI:</span> <span className="text-white font-bold">{patient?.height || 175} cm / {patient?.bmi ? parseFloat(patient.bmi.toFixed(1)) : 24.5} ({patient?.isObese ? 'Obese' : 'Normal'})</span></div>
              <div><span className="text-slate-400">Airway Exam:</span> <span className="text-white font-bold">Mallampati {patient?.airwayExamined ? patient.mallampatiScore || 'N/A' : 'UNEXAMINED'}</span></div>
            </div>
            
            <div className="mt-4 border-t border-slate-700/50 pt-3">
              <span className="text-slate-400 text-xs block mb-1">Active Comorbidities:</span>
              <div className="flex flex-wrap gap-1.5">
                {patient?.cad && <span className="bg-red-950 border border-red-800 text-red-300 px-2 py-0.5 rounded text-[10px] font-bold">Coronary Artery Disease</span>}
                {patient?.chf && <span className="bg-orange-950 border border-orange-800 text-orange-300 px-2 py-0.5 rounded text-[10px] font-bold">Congestive Heart Failure</span>}
                {patient?.diabetes && <span className="bg-yellow-950 border border-yellow-800 text-yellow-300 px-2 py-0.5 rounded text-[10px] font-bold">Diabetes Mellitus</span>}
                {patient?.mg && <span className="bg-purple-950 border border-purple-800 text-purple-300 px-2 py-0.5 rounded text-[10px] font-bold">Myasthenia Gravis</span>}
                {patient?.mhSusceptible && <span className="bg-red-950 border border-red-800 text-red-300 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse">Malignant Hyperthermia Susceptible</span>}
                {patient?.dmd && <span className="bg-purple-950 border border-purple-800 text-purple-300 px-2 py-0.5 rounded text-[10px] font-bold">Duchenne Muscular Dystrophy</span>}
                {patient?.bmd && <span className="bg-purple-950 border border-purple-800 text-purple-300 px-2 py-0.5 rounded text-[10px] font-bold">Becker Muscular Dystrophy</span>}
                {patient?.cmt && <span className="bg-purple-950 border border-purple-800 text-purple-300 px-2 py-0.5 rounded text-[10px] font-bold">Charcot-Marie-Tooth</span>}
                {patient?.elms && <span className="bg-purple-950 border border-purple-800 text-purple-300 px-2 py-0.5 rounded text-[10px] font-bold">Eaton-Lambert Myasthenic Syndrome</span>}
                {patient?.cip && <span className="bg-purple-950 border border-purple-800 text-purple-300 px-2 py-0.5 rounded text-[10px] font-bold">Critical Illness Polyneuropathy</span>}
                {patient?.mitochondrial && <span className="bg-purple-950 border border-purple-800 text-purple-300 px-2 py-0.5 rounded text-[10px] font-bold">Mitochondrial Myopathy</span>}
                {patient?.hyperPP && <span className="bg-yellow-950 border border-yellow-700 text-yellow-300 px-2 py-0.5 rounded text-[10px] font-bold">Hyperkalemic Periodic Paralysis</span>}
                {patient?.hypoPP && <span className="bg-yellow-950 border border-yellow-700 text-yellow-300 px-2 py-0.5 rounded text-[10px] font-bold">Hypokalemic Periodic Paralysis</span>}
                {patient?.isTrauma && <span className="bg-red-950 border border-red-500 text-red-200 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse">TRAUMA / BURNS</span>}
              </div>
            </div>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-lg border border-slate-700">
            <h3 className="text-indigo-300 font-bold text-sm uppercase mb-3">NPO & DAPT Timelines</h3>
            <div className="flex flex-col gap-3 text-xs">
              <div>
                <span className="text-slate-400 font-semibold">NPO Duration:</span>
                <span className="text-white font-bold block mt-0.5">{patient.npoDuration || '2'} hours (Solids)</span>
                {patient.glp1Active && (
                  <span className="text-red-400 bg-red-950/50 border border-red-950 p-1 rounded block mt-1 font-bold">
                    ⚠️ GLP-1 Active: Gastric ultrasound shows full stomach! HIGH ASPIRATION RISK!
                  </span>
                )}
              </div>
              <div className="border-t border-slate-700/50 pt-2">
                <span className="text-slate-400 font-semibold">PCI/DAPT Status:</span>
                <span className="text-white font-bold block mt-0.5">DES placed {patient.pciMonthsAgo || '3'} months ago</span>
                <span className="text-yellow-400 bg-yellow-950/40 border border-yellow-900/50 p-1 rounded block mt-1 font-bold">
                  ⚠️ Premature DAPT cessation (&lt;6mo DES) carries high coronary stent thrombosis death risk.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Interactive Cardiac Evaluation Algorithm */}
        <div className="bg-slate-800/50 p-5 rounded-lg border border-slate-700 mb-6">
          <h3 className="text-indigo-300 font-bold text-sm uppercase mb-4">2024 ACC/AHA Preoperative Cardiac Algorithm</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* RCRI Calculator */}
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Revised Cardiac Risk Index (RCRI)</span>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white">
                  <input type="checkbox" checked={rcri.highRiskSurg} onChange={(e) => setRcri({...rcri, highRiskSurg: e.target.checked})} className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0" />
                  <span>High-risk surgery (Intrathoracic, Intraabdominal, Suprainguinal Vascular)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white">
                  <input type="checkbox" checked={rcri.ischemicHeart} onChange={(e) => setRcri({...rcri, ischemicHeart: e.target.checked})} className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0" />
                  <span>History of Ischemic Heart Disease (CAD, prior MI)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white">
                  <input type="checkbox" checked={rcri.chf} onChange={(e) => setRcri({...rcri, chf: e.target.checked})} className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0" />
                  <span>History of Congestive Heart Failure</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white">
                  <input type="checkbox" checked={rcri.cerebrovascular} onChange={(e) => setRcri({...rcri, cerebrovascular: e.target.checked})} className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0" />
                  <span>History of Cerebrovascular Disease (Stroke, TIA)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white">
                  <input type="checkbox" checked={rcri.insulin} onChange={(e) => setRcri({...rcri, insulin: e.target.checked})} className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0" />
                  <span>Preoperative treatment with Insulin</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white">
                  <input type="checkbox" checked={rcri.creatinine} onChange={(e) => setRcri({...rcri, creatinine: e.target.checked})} className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0" />
                  <span>Preoperative Creatinine &gt; 2.0 mg/dL</span>
                </label>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-3 rounded mt-4 flex justify-between items-center">
                <span className="text-xs text-slate-400 font-bold">RCRI Score: <span className="text-white text-base font-black ml-1">{rcriScore}</span></span>
                <span className="text-xs text-indigo-400 font-black">{rcriClass}</span>
              </div>
            </div>

            {/* Functional capacity / METs */}
            <div className="flex flex-col justify-between">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-2">Functional Capacity (METs)</span>
                <p className="text-[11px] text-slate-400 mb-3">Evaluate patient's physical capability to handle cardiovascular stressors:</p>
                <div className="flex flex-col gap-2">
                  <button onClick={() => setMets('adequate')} className={`p-2 rounded text-xs text-left border font-bold transition-all ${mets === 'adequate' ? 'bg-indigo-950 border-indigo-500 text-indigo-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
                    🚶‍♂️ Adequate Capacity (≥ 4 METs)
                    <span className="block text-[10px] text-slate-500 font-normal">Can climb two flights of stairs, walk briskly &gt; 3 mph, or do light housework.</span>
                  </button>
                  <button onClick={() => setMets('poor')} className={`p-2 rounded text-xs text-left border font-bold transition-all ${mets === 'poor' ? 'bg-red-950 border-red-500 text-red-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
                    🏃‍♂️ Poor Capacity (&lt; 4 METs / Unknown)
                    <span className="block text-[10px] text-slate-500 font-normal">Cannot walk up a flight of stairs, climb a hill, or do heavy housework.</span>
                  </button>
                </div>
              </div>

              {/* Dynamic recommendation card — 2024 ACC/AHA Preoperative Cardiac Algorithm
                 Decision matrix: RCRI score × Functional Capacity (METs)
                 References:
                   - Lee TH et al. Circulation 1999;100:1043-1049 (RCRI derivation)
                   - Fleisher LA et al. Circulation 2014;130:e278-e333 (ACC/AHA perioperative guidelines)
                   - 2024 ACC/AHA Focused Update on Perioperative Cardiovascular Evaluation
                 Risk classes (30-day MACE per Lee et al.):
                   Class I  (RCRI 0): 0.4%
                   Class II (RCRI 1): 0.9%
                   Class III(RCRI 2): 6.6%
                   Class IV (RCRI 3+): 11%+
              */}
              <div className="bg-slate-950 border border-slate-800 p-3 rounded mt-4">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1">ACC/AHA CLINICAL PATHWAY:</span>
                {(() => {
                  // METs not yet selected — prompt the user
                  if (!mets) {
                    return (
                      <span className="text-xs text-slate-500 italic">
                        Select functional capacity (METs) to view algorithm recommendations...
                      </span>
                    );
                  }

                  // Functional capacity categorisation
                  // METs ≥ 4 corresponds to 'adequate'; METs < 4 or unknown = 'poor'
                  const adequateMets = mets === 'adequate';

                  // ── RCRI ≥ 3 — HIGH RISK regardless of METs (Class IV, ≥11% 30-day MACE) ──
                  // Per 2024 ACC/AHA: cardiology consult always; delay / cath if poor METs
                  if (rcriScore >= 3) {
                    return (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs text-red-300 font-black tracking-wide">
                          🚨 HIGH CARDIOVASCULAR RISK — {rcriClass}
                        </span>
                        {adequateMets ? (
                          <span className="text-xs text-red-400 font-bold">
                            ⚠️ RCRI ≥ 3 with adequate METs: Mandatory cardiology consult regardless of functional capacity.
                            Obtain pre-op 12-lead ECG + troponin. Consider postponing elective surgery pending cardiac workup.
                          </span>
                        ) : (
                          <span className="text-xs text-red-400 font-bold">
                            🛑 RCRI ≥ 3 with poor/unknown METs: DELAY SURGERY. Obtain urgent cardiology consult.
                            Pharmacologic stress test (dobutamine echo or nuclear perfusion) recommended.
                            Consider coronary catheterisation if ischaemia demonstrated.
                          </span>
                        )}
                      </div>
                    );
                  }

                  // ── RCRI = 2 — ELEVATED RISK (Class III, ~6.6% 30-day MACE) ──
                  if (rcriScore === 2) {
                    return (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs text-orange-300 font-black tracking-wide">
                          ⚠️ ELEVATED CARDIOVASCULAR RISK — {rcriClass}
                        </span>
                        {adequateMets ? (
                          <span className="text-xs text-yellow-400 font-bold">
                            Adequate METs (≥ 4): Proceed with enhanced haemodynamic monitoring (arterial line recommended).
                            Pre-op 12-lead ECG required. Consider BNP/NT-proBNP. Optimise beta-blocker if already prescribed.
                          </span>
                        ) : (
                          <span className="text-xs text-orange-400 font-bold">
                            Poor/unknown METs with RCRI 2: Pharmacologic stress test recommended before proceeding.
                            Obtain pre-op ECG + troponin + BNP. Cardiology consult recommended for risk stratification.
                          </span>
                        )}
                      </div>
                    );
                  }

                  // ── RCRI = 1 — LOW-INTERMEDIATE RISK (Class II, ~0.9% 30-day MACE) ──
                  if (rcriScore === 1) {
                    return (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs text-yellow-300 font-black tracking-wide">
                          ⚡ LOW-INTERMEDIATE CARDIOVASCULAR RISK — {rcriClass}
                        </span>
                        {adequateMets ? (
                          <span className="text-xs text-green-400 font-bold">
                            ✅ Adequate METs (≥ 4): Proceed to surgery with standard hemodynamic precautions.
                            No additional cardiac testing required.
                          </span>
                        ) : (
                          <span className="text-xs text-yellow-400 font-bold">
                            Poor/unknown METs with single RCRI factor: Pre-op 12-lead ECG recommended.
                            Consider exercise or pharmacologic stress test if results will change management.
                          </span>
                        )}
                      </div>
                    );
                  }

                  // ── RCRI = 0 — LOW RISK (Class I, ~0.4% 30-day MACE) ──
                  return (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs text-green-300 font-black tracking-wide">
                        ✅ LOW CARDIOVASCULAR RISK — {rcriClass}
                      </span>
                      <span className="text-xs text-green-400 font-bold">
                        Proceed to surgery. No additional cardiac testing indicated.
                        {!adequateMets
                          ? ' Note: poor METs at RCRI 0 does not mandate further workup per ACC/AHA.'
                          : ' Patient is functionally fit with no cardiac risk factors.'}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>


        {/* Section 3: Pre-Operative Labs & Logistics */}
        <div className="bg-slate-800/50 p-5 rounded-lg border border-slate-700 mb-6">
          <h3 className="text-indigo-300 font-bold text-sm uppercase mb-4">Pre-Operative Orders & Blood Bank Logistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Standard Labs</span>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white">
                  <input type="checkbox" checked={preopOrders.cbc} onChange={(e) => setPreopOrders({...preopOrders, cbc: e.target.checked})} className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0" />
                  <span>CBC (Complete Blood Count)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white">
                  <input type="checkbox" checked={preopOrders.bmp} onChange={(e) => setPreopOrders({...preopOrders, bmp: e.target.checked})} className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0" />
                  <span>BMP (Basic Metabolic Panel)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white">
                  <input type="checkbox" checked={preopOrders.coags} onChange={(e) => setPreopOrders({...preopOrders, coags: e.target.checked})} className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0" />
                  <span>Coags (PT/INR/PTT)</span>
                </label>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Blood Bank Logistics</span>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white">
                  <input type="checkbox" checked={preopOrders.typeAndScreen} onChange={(e) => {
                      if (e.target.checked) setPreopOrders({...preopOrders, typeAndScreen: true, typeAndCross: false});
                      else setPreopOrders({...preopOrders, typeAndScreen: false});
                  }} className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0" />
                  <span>Type & Screen</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white">
                  <input type="checkbox" checked={preopOrders.typeAndCross} onChange={(e) => {
                      if (e.target.checked) setPreopOrders({...preopOrders, typeAndCross: true, typeAndScreen: false});
                      else setPreopOrders({...preopOrders, typeAndCross: false});
                  }} className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0" />
                  <span>Type & Cross (Immediate PRBC Availability in OR)</span>
                </label>
                
                {preopOrders.typeAndCross && (
                    <div className="mt-2 p-2 bg-green-950/40 border border-green-900 rounded text-green-400 text-[10px] font-bold">
                        ✅ Blood bank notified. PRBC cooler will be waiting in the OR upon arrival.
                    </div>
                )}
                {!preopOrders.typeAndCross && (
                    <div className="mt-2 p-2 bg-red-950/40 border border-red-900 rounded text-red-400 text-[10px] font-bold">
                        ⚠️ WARNING: Blood products ordered intra-operatively without a Type & Cross will incur a strict 10-minute logistical delay.
                    </div>
                )}
              </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
          <button onClick={close} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded font-bold text-xs text-slate-300 transition">Close</button>
          <button 
            onClick={handleClearance} 
            disabled={mets === null} 
            className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded font-bold text-xs text-white transition shadow-lg shadow-green-900/30"
          >
            Clear Patient & Proceed to Induction
          </button>
        </div>
      </div>
    </div>
  );
};

// 2. MSMAIDS PRE-INDUCTION CHECKLIST
export const MsmaidsModal = ({ show, close, logEvent, onComplete }) => {
  const [checks, setChecks] = React.useState({
    m: false,
    s: false,
    m2: false,
    a: false,
    i: false,
    d: false,
    s2: false
  });

  if (!show) return null;

  const allChecked = Object.values(checks).every(Boolean);

  const toggleCheck = (key) => {
    setChecks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleVerify = () => {
    logEvent("🚀 MSMAIDS pre-induction checklists successfully verified! Anesthesia machine, suction, monitors, airways, IV, drugs, and safety backup confirmed READY.");
    if (onComplete) onComplete();
    close();
  };


  return (
    <div data-tutorial="msmaids-modal" className="fixed left-4 top-28 z-[100] w-[380px] max-h-[calc(100vh-140px)] shadow-[0_10px_50px_rgba(0,0,0,0.85)] rounded-xl border border-cyan-500/60 bg-slate-950/95 p-5 overflow-y-auto custom-scrollbar flex flex-col pointer-events-auto animate-in slide-in-from-left duration-250 font-mono text-slate-200">
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xs font-bold text-white flex items-center gap-2">🛠️ MSMAIDS Setup</h2>
        </div>
        <button 
          onClick={() => setChecks({ m: true, s: true, m2: true, a: true, i: true, d: true, s2: true })}
          className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-500/30 rounded-lg text-[9px] text-cyan-300 font-extrabold uppercase transition duration-150 active:scale-95 mr-2"
        >
          Select All
        </button>
        <button onClick={close} data-tutorial="msmaids-close" className="text-slate-400 hover:text-white"><X size={16}/></button>
      </div>

      <div className="flex flex-col gap-2.5 my-2">
        <button onClick={() => toggleCheck('m')} className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all text-xs ${checks.m ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200' : 'bg-slate-900/60 border-slate-850 text-slate-400 hover:bg-slate-800/80'}`}>
          <span className={`text-sm font-black w-4 ${checks.m ? 'text-cyan-400' : 'text-slate-500'}`}>M</span>
          <div className="flex-1">
            <span className="font-bold block text-white">Anesthesia Machine Check</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Leak test completed, vaporizers locked, circuit connected, backup O2 verified.</span>
          </div>
          <input type="checkbox" checked={checks.m} readOnly className="rounded border-slate-700 text-cyan-500 focus:ring-0 mt-0.5 pointer-events-none" />
        </button>

        <button onClick={() => toggleCheck('s')} className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all text-xs ${checks.s ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200' : 'bg-slate-900/60 border-slate-850 text-slate-400 hover:bg-slate-800/80'}`}>
          <span className={`text-sm font-black w-4 ${checks.s ? 'text-cyan-400' : 'text-slate-500'}`}>S</span>
          <div className="flex-1">
            <span className="font-bold block text-white">Suction Setup</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Yankauer catheter secured bedside, suction pressure verified &gt; -200 mmHg.</span>
          </div>
          <input type="checkbox" checked={checks.s} readOnly className="rounded border-slate-700 text-cyan-500 focus:ring-0 mt-0.5 pointer-events-none" />
        </button>

        <button onClick={() => toggleCheck('m2')} className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all text-xs ${checks.m2 ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200' : 'bg-slate-900/60 border-slate-850 text-slate-400 hover:bg-slate-800/80'}`}>
          <span className={`text-sm font-black w-4 ${checks.m2 ? 'text-cyan-400' : 'text-slate-500'}`}>M</span>
          <div className="flex-1">
            <span className="font-bold block text-white">Monitors Applied</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">ECG, Pulse Ox, BP cuff applied and reading vitals.</span>
          </div>
          <input type="checkbox" checked={checks.m2} readOnly className="rounded border-slate-700 text-cyan-500 focus:ring-0 mt-0.5 pointer-events-none" />
        </button>

        <button onClick={() => toggleCheck('a')} className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all text-xs ${checks.a ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200' : 'bg-slate-900/60 border-slate-850 text-slate-400 hover:bg-slate-800/80'}`}>
          <span className={`text-sm font-black w-4 ${checks.a ? 'text-cyan-400' : 'text-slate-500'}`}>A</span>
          <div className="flex-1">
            <span className="font-bold block text-white">Airway Equipment Ready</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Primary & backup ETT sizes verified, DL/VL laryngoscopes loaded.</span>
          </div>
          <input type="checkbox" checked={checks.a} readOnly className="rounded border-slate-700 text-cyan-500 focus:ring-0 mt-0.5 pointer-events-none" />
        </button>

        <button onClick={() => toggleCheck('i')} className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all text-xs ${checks.i ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200' : 'bg-slate-900/60 border-slate-850 text-slate-400 hover:bg-slate-800/80'}`}>
          <span className={`text-sm font-black w-4 ${checks.i ? 'text-cyan-400' : 'text-slate-500'}`}>I</span>
          <div className="flex-1">
            <span className="font-bold block text-white">Intravenous Access Patency</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Large-bore PIV running, catheter gauge verified.</span>
          </div>
          <input type="checkbox" checked={checks.i} readOnly className="rounded border-slate-700 text-cyan-500 focus:ring-0 mt-0.5 pointer-events-none" />
        </button>

        <button onClick={() => toggleCheck('d')} className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all text-xs ${checks.d ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200' : 'bg-slate-900/60 border-slate-850 text-slate-400 hover:bg-slate-800/80'}`}>
          <span className={`text-sm font-black w-4 ${checks.d ? 'text-cyan-400' : 'text-slate-500'}`}>D</span>
          <div className="flex-1">
            <span className="font-bold block text-white">Drugs & Syringes Labeled</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Induction sedatives, paralytics, and rescue pressors drawn.</span>
          </div>
          <input type="checkbox" checked={checks.d} readOnly className="rounded border-slate-700 text-cyan-500 focus:ring-0 mt-0.5 pointer-events-none" />
        </button>

        <button onClick={() => toggleCheck('s2')} className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all text-xs ${checks.s2 ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200' : 'bg-slate-900/60 border-slate-850 text-slate-400 hover:bg-slate-800/80'}`}>
          <span className={`text-sm font-black w-4 ${checks.s2 ? 'text-cyan-400' : 'text-slate-500'}`}>S</span>
          <div className="flex-1">
            <span className="font-bold block text-white">Safety backups bedside</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Cricothyrotomy kit bedside, code cart located.</span>
          </div>
          <input type="checkbox" checked={checks.s2} readOnly className="rounded border-slate-700 text-cyan-500 focus:ring-0 mt-0.5 pointer-events-none" />
        </button>
      </div>

      <div className="flex justify-end gap-2.5 border-t border-slate-900 pt-4 mt-3">
        <button onClick={close} className="px-4 py-2 bg-slate-900 hover:bg-slate-850 rounded-lg font-bold text-xs text-slate-400 hover:text-white border border-slate-800 transition">Cancel</button>
        <button 
          onClick={handleVerify} 
          disabled={!allChecked} 
          className="px-5 py-2 bg-cyan-600/20 hover:bg-cyan-600 disabled:opacity-30 disabled:pointer-events-none rounded-lg font-extrabold text-xs text-cyan-300 hover:text-white border border-cyan-500/30 hover:border-cyan-400 transition duration-200 active:scale-95 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
        >
          Complete MSMAIDS Check
        </button>
      </div>
    </div>
  );
};

// 3. POST-INTUBATION "A'S" CHECKLIST
export const PostIntubationModal = ({ show, close, logEvent }) => {
  const [checks, setChecks] = React.useState({
    airway: false,
    anesthesia: false,
    access: false,
    another: false,
    arms: false,
    air: false,
    abg: false,
    antibiotics: false,
    analgesia: false
  });

  if (!show) return null;

  const allChecked = Object.values(checks).every(Boolean);

  const toggleCheck = (key) => {
    setChecks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleComplete = () => {
    logEvent("✅ Post-Intubation checklist complete. Patient stabilized on mechanical ventilation, anesthesia active, lines secured, and initial safety steps verified.");
    close();
  };

  return (
    <div className="fixed left-4 top-28 z-[100] w-[380px] max-h-[calc(100vh-140px)] shadow-[0_10px_50px_rgba(0,0,0,0.85)] rounded-xl border border-cyan-500/60 bg-slate-950/95 p-5 overflow-y-auto custom-scrollbar flex flex-col pointer-events-auto animate-in slide-in-from-left duration-250 font-mono text-slate-200">
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xs font-bold text-white flex items-center gap-2">🔄 Post-Intubation</h2>
        </div>
        <button 
          onClick={() => setChecks({ airway: true, anesthesia: true, access: true, another: true, arms: true, air: true, abg: true, antibiotics: true, analgesia: true })}
          className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-500/30 rounded-lg text-[9px] text-cyan-300 font-extrabold uppercase transition duration-150 active:scale-95 mr-2"
        >
          Select All
        </button>
        <button onClick={close} className="text-slate-400 hover:text-white"><X size={16}/></button>
      </div>

      <div className="flex flex-col gap-2 my-2">
        {[
          { id: 'airway', letter: 'A', title: 'Airway Secured', desc: 'ETT cuff inflated, breath sounds bilateral.' },
          { id: 'anesthesia', letter: 'A', title: 'Anesthesia Maintenance', desc: 'Turn on Sevoflurane dial to matching needs.' },
          { id: 'access', letter: 'A', title: 'Access Lines Secured', desc: 'PIV patency & secure tape verified.' },
          { id: 'another', letter: 'A', title: 'Another in mouth', desc: 'Bite block & gastric tube inserted.' },
          { id: 'arms', letter: 'A', title: 'Arms & Positioning Padded', desc: 'Secure and pad arms properly.' },
          { id: 'air', letter: 'A', title: 'Air / Vent Parameters', desc: 'Verify vent VCV/PCV settings & PEEP.' },
          { id: 'abg', letter: 'A', title: 'ABG / A-line check', desc: 'Confirm A-line zeroed at axis.' },
          { id: 'antibiotics', letter: 'A', title: 'Antibiotics Administered', desc: 'Prophylaxis done within 60 mins.' },
          { id: 'analgesia', letter: 'A', title: 'Analgesia Loading', desc: 'Opioids or block loading done.' }
        ].map(item => (
          <button key={item.id} onClick={() => toggleCheck(item.id)} className={`flex items-start gap-2.5 p-2.5 rounded border text-left text-xs transition ${checks[item.id] ? 'bg-cyan-950/30 border-cyan-600 text-cyan-200' : 'bg-slate-800 border-slate-700 text-slate-350 hover:bg-slate-700'}`}>
            <span className="text-sm font-black text-cyan-400 w-4">{item.letter}</span>
            <div className="flex-1">
              <span className="font-bold block">{item.title}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{item.desc}</span>
            </div>
            <input type="checkbox" checked={checks[item.id]} readOnly className="rounded border-slate-600 text-cyan-600 focus:ring-0 mt-0.5 pointer-events-none" />
          </button>
        ))}
      </div>

      <div className="flex justify-end gap-2.5 border-t border-slate-900 pt-4 mt-3">
        <button onClick={close} className="px-4 py-2 bg-slate-900 hover:bg-slate-850 rounded-lg font-bold text-xs text-slate-400 hover:text-white border border-slate-800 transition">Cancel</button>
        <button 
          onClick={handleComplete} 
          disabled={!allChecked} 
          className="px-5 py-2 bg-cyan-600/20 hover:bg-cyan-600 disabled:opacity-30 disabled:pointer-events-none rounded-lg font-extrabold text-xs text-cyan-300 hover:text-white border border-cyan-500/30 hover:border-cyan-400 transition duration-200 active:scale-95 shadow-md shadow-cyan-950/50"
        >
          Complete Post-Intubation Check
        </button>
      </div>
    </div>
  );
};

// 4. EXTUBATION EVALUATION MODAL
export const ExtubationModal = ({ show, close, vitals, patient, logEvent, performExtubation }) => {
  const [checks, setChecks] = React.useState({
    tof: false,
    rr: false,
    cuffLeak: false,
    tv: false,
    commands: false,
    suction: false
  });

  if (!show) return null;

  const toggleCheck = (key) => {
    setChecks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Ch28, Miller's 9th Ed: when monitoring qualitatively (manual tactile/visual PNS), the
  // displayed TOF count/ratio reflects what a clinician would actually perceive - which can
  // be a false-positive "fully recovered" reading despite real residual blockade up to a
  // true ratio of 0.89. This modal must use the same perceived values the bedside monitor
  // displays, or the chapter's central safety lesson never has a real decision consequence.
  const isQualitativeTof = patient?.tofMonitorMode === 'qualitative';
  const displayedTofCount = isQualitativeTof ? vitals?.perceivedTofCount : vitals?.tofCount;
  const displayedTofRatio = isQualitativeTof ? vitals?.perceivedTofRatio : vitals?.tofRatio;
  const hasTofRatio = displayedTofCount === 4 && displayedTofRatio >= 0.90;
  // Ground truth, used only for the post-extubation outcome/safety check below - never shown
  // to the user when qualitative monitoring is selected, since that's the entire point.
  const trueResidualBlock = !(vitals?.tofCount === 4 && vitals?.tofRatio >= 0.90);
  const isRrGood = vitals?.rr >= 6 && vitals?.rr <= 30;
  const isTvGood = vitals?.vte >= 5 * (patient?.weight || 70);

  const allChecked = Object.values(checks).every(Boolean);

  const handleExtubateSubmit = () => {
    if (!hasTofRatio) {
      logEvent("⚠️ WARNING: Extubation attempted with incomplete neuromuscular block reversal! High risk of respiratory collapse and upper airway obstruction.");
    } else if (isQualitativeTof && trueResidualBlock) {
      logEvent("⚠️ WARNING: Qualitative (manual) monitoring reported the TOF ratio as fully recovered, but clinically significant residual blockade was actually still present. This is exactly the blind spot quantitative (AMG) monitoring exists to catch.");
    }
    logEvent("💨 Extubation checklist completed. ETT deflated, suctioned, and removed. Patient successfully transitioned to spontaneous breathing mask.");
    performExtubation();
    close();
  };

  return (
    <div className="fixed left-4 top-28 z-[100] w-[380px] max-h-[calc(100vh-140px)] shadow-[0_10px_50px_rgba(0,0,0,0.85)] rounded-xl border border-indigo-500/60 bg-slate-950/95 p-5 overflow-y-auto custom-scrollbar flex flex-col pointer-events-auto animate-in slide-in-from-left duration-250 font-mono text-slate-200">
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-850">
        <div>
          <h2 className="text-xs font-bold text-white flex items-center gap-2">💨 Extubation Criteria</h2>
        </div>
        <button 
          onClick={() => setChecks({ tof: true, rr: true, cuffLeak: true, tv: true, commands: true, suction: true })}
          className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/30 rounded-lg text-[9px] text-indigo-300 font-extrabold uppercase transition duration-150 active:scale-95 mr-2"
        >
          Select All
        </button>
        <button onClick={close} className="text-slate-400 hover:text-white"><X size={16}/></button>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-xl flex flex-col gap-2 my-2">
        <h3 className="text-indigo-400 font-bold text-[10px] uppercase tracking-wider font-mono">Objective Metrics</h3>
        
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
          <div className="bg-slate-950 p-2 rounded border border-slate-850 flex flex-col">
            <span className="text-slate-400 text-[8px]">TOF Ratio{isQualitativeTof ? ' (PNS)' : ' (AMG)'}:</span>
            <span className={`text-sm font-black mt-0.5 ${hasTofRatio ? 'text-green-400' : 'text-red-400'}`}>
              {displayedTofCount || 0}/4 ({displayedTofRatio ? `${(displayedTofRatio*100).toFixed(0)}%` : '0%'})
            </span>
          </div>

          <div className="bg-slate-950 p-2 rounded border border-slate-850 flex flex-col">
            <span className="text-slate-400 text-[8px]">Resp Rate:</span>
            <span className={`text-sm font-black mt-0.5 ${isRrGood ? 'text-green-400' : 'text-red-400'}`}>
              {vitals?.rr || 0} bpm
            </span>
          </div>

          <div className="bg-slate-950 p-2 rounded border border-slate-850 flex flex-col col-span-2">
            <span className="text-slate-400 text-[8px]">Tidal Volume:</span>
            <span className={`text-sm font-black mt-0.5 ${isTvGood ? 'text-green-400' : 'text-red-400'}`}>
              {vitals?.vte || 0} mL ({(vitals?.vte && patient?.weight) ? (vitals.vte / patient.weight).toFixed(1) : '0'} mL/kg)
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 my-2">
        <h3 className="text-indigo-400 font-bold text-[10px] uppercase tracking-wider font-mono">Clinical Checks</h3>
        
        <button onClick={() => toggleCheck('tof')} className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-[10px] font-bold transition-all ${checks.tof ? 'bg-indigo-950/30 border-indigo-500/40 text-indigo-200' : 'bg-slate-900/60 border-slate-850 text-slate-450 hover:bg-slate-800/80'}`}>
          <span>Confirm TOF Ratio &gt;= 90%</span>
          <input type="checkbox" checked={checks.tof} readOnly className="rounded border-slate-700 text-indigo-500 focus:ring-0 pointer-events-none" />
        </button>

        <button onClick={() => toggleCheck('rr')} className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-[10px] font-bold transition-all ${checks.rr ? 'bg-indigo-950/30 border-indigo-500/40 text-indigo-200' : 'bg-slate-900/60 border-slate-850 text-slate-450 hover:bg-slate-800/80'}`}>
          <span>Respiratory rate 6-30 bpm</span>
          <input type="checkbox" checked={checks.rr} readOnly className="rounded border-slate-700 text-indigo-500 focus:ring-0 pointer-events-none" />
        </button>

        <button onClick={() => toggleCheck('cuffLeak')} className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-[10px] font-bold transition-all ${checks.cuffLeak ? 'bg-indigo-950/30 border-indigo-500/40 text-indigo-200' : 'bg-slate-900/60 border-slate-850 text-slate-450 hover:bg-slate-800/80'}`}>
          <span>Audible cuff leak present</span>
          <input type="checkbox" checked={checks.cuffLeak} readOnly className="rounded border-slate-700 text-indigo-500 focus:ring-0 pointer-events-none" />
        </button>

        <button onClick={() => toggleCheck('tv')} className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-[10px] font-bold transition-all ${checks.tv ? 'bg-indigo-950/30 border-indigo-500/40 text-indigo-200' : 'bg-slate-900/60 border-slate-850 text-slate-450 hover:bg-slate-800/80'}`}>
          <span>Tidal volume &gt; 5 mL/kg</span>
          <input type="checkbox" checked={checks.tv} readOnly className="rounded border-slate-700 text-indigo-500 focus:ring-0 pointer-events-none" />
        </button>

        <button onClick={() => toggleCheck('commands')} className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-[10px] font-bold transition-all ${checks.commands ? 'bg-indigo-950/30 border-indigo-500/40 text-indigo-200' : 'bg-slate-900/60 border-slate-850 text-slate-450 hover:bg-slate-800/80'}`}>
          <span>Awake (5s head lift)</span>
          <input type="checkbox" checked={checks.commands} readOnly className="rounded border-slate-700 text-indigo-500 focus:ring-0 pointer-events-none" />
        </button>

        <button onClick={() => toggleCheck('suction')} className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-[10px] font-bold transition-all ${checks.suction ? 'bg-indigo-950/30 border-indigo-500/40 text-indigo-200' : 'bg-slate-900/60 border-slate-850 text-slate-450 hover:bg-slate-800/80'}`}>
          <span>Pharynx & ETT suctioned</span>
          <input type="checkbox" checked={checks.suction} readOnly className="rounded border-slate-700 text-indigo-500 focus:ring-0 pointer-events-none" />
        </button>
      </div>

      <div className="flex justify-end gap-2.5 border-t border-slate-900 pt-4 mt-3">
        <button onClick={close} className="px-4 py-2 bg-slate-900 hover:bg-slate-850 rounded-lg font-bold text-xs text-slate-400 hover:text-white border border-slate-800 transition">Cancel</button>
        <button 
          onClick={handleExtubateSubmit} 
          disabled={!allChecked} 
          className="px-5 py-2 bg-indigo-600/20 hover:bg-indigo-600 disabled:opacity-30 disabled:pointer-events-none rounded-lg font-extrabold text-xs text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-indigo-400 transition duration-200 active:scale-95 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
        >
          Deflate Cuff & Extubate ETT
        </button>
      </div>
    </div>
  );
};