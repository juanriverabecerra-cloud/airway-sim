import React from 'react';
import { X, Activity, Eye, Wind, Stethoscope } from 'lucide-react';

export const PocusModal = ({ data, close }) => {
  if (!data.show) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border-2 border-purple-500 rounded-xl p-6 md:p-8 max-h-[85vh] overflow-y-auto custom-scrollbar w-11/12 max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2"><Eye size={24}/> {data.title}</h2>
          <button onClick={close} className="text-slate-400 hover:text-white"><X size={24}/></button>
        </div>
        <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg">
          <p className="text-purple-300 font-bold text-sm uppercase mb-2">Ultrasound Findings</p>
          <p className="text-white text-base md:text-lg">{data.finding}</p>
        </div>
        <button onClick={close} className="mt-6 w-full bg-slate-700 hover:bg-slate-600 p-3 rounded font-bold text-white transition">Close Report</button>
      </div>
    </div>
  );
};

export const AirwayQuizModal = ({ data, submitAirwayQuiz }) => {
  const [error, setError] = React.useState('');
  
  React.useEffect(() => { if (data.show) setError(''); }, [data.show]);

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border-2 border-cyan-500 rounded-xl p-6 md:p-8 max-h-[85vh] overflow-y-auto custom-scrollbar w-11/12 max-w-2xl shadow-2xl">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-4 flex items-center gap-2"><Eye size={24}/> Pre-Intubation Airway Assessment</h2>
        <p className="text-sm md:text-lg text-slate-300 mb-4 italic border-l-4 border-cyan-500 pl-4 py-2 bg-slate-800/50 whitespace-pre-wrap">{data.description}</p>
        
        {error && (
            <div className="mb-4 bg-red-950/80 border border-red-500 text-red-200 p-3 rounded font-bold text-sm animate-pulse">
                ⚠️ {error}
            </div>
        )}

        <h3 className="text-yellow-400 font-bold mb-4 text-sm md:text-base">Based on your visualization, select the correct Mallampati Score:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(grade => (
            <button key={grade} onClick={() => handleSelect(grade)} className="bg-slate-800 hover:bg-cyan-900 p-4 rounded text-left border border-slate-700 hover:border-cyan-400 transition">
              <span className="font-bold text-white block">Mallampati Class {['I', 'II', 'III', 'IV'][grade-1]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export const AccessModal = ({ data, close, establishAccess }) => {
  if (!data.show) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border-2 border-green-500 rounded-xl p-4 md:p-8 max-w-4xl shadow-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-white">Select {data.category} Access Site</h2>
          <button onClick={close} className="text-slate-400 hover:text-white"><X size={24}/></button>
        </div>
        
        {data.category === 'Peripheral IV' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800 p-4 rounded border border-slate-700">
              <h3 className="font-bold text-green-400 mb-2">Antecubital (AC)</h3>
              {[
                { size: '16G', rate: '135mL/min' },
                { size: '18G', rate: '80mL/min' },
                { size: '20G', rate: '30mL/min' }
              ].map(item => (
                <div key={`ac-${item.size}`} className="flex flex-col gap-1 mb-2">
                  <span className="text-[10px] text-slate-400">{item.size} (Max Gravity: ~{item.rate})</span>
                  <div className="flex gap-2">
                    <button onClick={() => establishAccess('PIV', `${item.size} PIV`, 'Right AC')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-green-500">Right</button>
                    <button onClick={() => establishAccess('PIV', `${item.size} PIV`, 'Left AC')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-green-500">Left</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-slate-800 p-4 rounded border border-slate-700">
              <h3 className="font-bold text-green-400 mb-2">Forearm</h3>
              {[
                { size: '18G', rate: '80mL/min' },
                { size: '20G', rate: '30mL/min' },
                { size: '22G', rate: '15mL/min' }
              ].map(item => (
                <div key={`forearm-${item.size}`} className="flex flex-col gap-1 mb-2">
                  <span className="text-[10px] text-slate-400">{item.size} (Max Gravity: ~{item.rate})</span>
                  <div className="flex gap-2">
                    <button onClick={() => establishAccess('PIV', `${item.size} PIV`, 'Right Forearm')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-green-500">Right</button>
                    <button onClick={() => establishAccess('PIV', `${item.size} PIV`, 'Left Forearm')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-green-500">Left</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-slate-800 p-4 rounded border border-slate-700">
              <h3 className="font-bold text-green-400 mb-2">Hand</h3>
              {[
                { size: '20G', rate: '30mL/min' },
                { size: '22G', rate: '15mL/min' },
                { size: '24G', rate: '4mL/min' }
              ].map(item => (
                <div key={`hand-${item.size}`} className="flex flex-col gap-1 mb-2">
                  <span className="text-[10px] text-slate-400">{item.size} (Max Gravity: ~{item.rate})</span>
                  <div className="flex gap-2">
                    <button onClick={() => establishAccess('PIV', `${item.size} PIV`, 'Right Hand')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-green-500">Right</button>
                    <button onClick={() => establishAccess('PIV', `${item.size} PIV`, 'Left Hand')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-green-500">Left</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.category === 'Central Line' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800 p-4 rounded border border-slate-700">
              <h3 className="font-bold text-purple-400 mb-2">Internal Jugular (IJ)</h3>
              {[
                { type: 'Triple Lumen CVC', rate: '30mL/min (each)' },
                { type: 'MAC Introducer', rate: '500+mL/min' }
              ].map(item => (
                <div key={`ij-${item.type}`} className="flex flex-col gap-1 mb-3">
                  <span className="text-[10px] text-slate-400">{item.type} (Max: ~{item.rate})</span>
                  <div className="flex gap-2">
                    <button onClick={() => establishAccess('CVC', item.type, 'Right IJ')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-purple-500">Right</button>
                    <button onClick={() => establishAccess('CVC', item.type, 'Left IJ')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-purple-500">Left</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-slate-800 p-4 rounded border border-slate-700">
              <h3 className="font-bold text-purple-400 mb-2">Subclavian</h3>
              {[
                { type: 'Triple Lumen CVC', rate: '30mL/min (each)' },
                { type: 'Trauma Cordis', rate: '500+mL/min' }
              ].map(item => (
                <div key={`sub-${item.type}`} className="flex flex-col gap-1 mb-3">
                  <span className="text-[10px] text-slate-400">{item.type} (Max: ~{item.rate})</span>
                  <div className="flex gap-2">
                    <button onClick={() => establishAccess('CVC', item.type, 'Right Subclavian')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-purple-500">Right</button>
                    <button onClick={() => establishAccess('CVC', item.type, 'Left Subclavian')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-purple-500">Left</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-slate-800 p-4 rounded border border-slate-700">
              <h3 className="font-bold text-purple-400 mb-2">Femoral</h3>
              {[
                { type: 'Triple Lumen CVC', rate: '30mL/min (each)' },
                { type: 'Trauma Cordis', rate: '500+mL/min' }
              ].map(item => (
                <div key={`fem-${item.type}`} className="flex flex-col gap-1 mb-3">
                  <span className="text-[10px] text-slate-400">{item.type} (Max: ~{item.rate})</span>
                  <div className="flex gap-2">
                    <button onClick={() => establishAccess('CVC', item.type, 'Right Femoral')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-purple-500">Right</button>
                    <button onClick={() => establishAccess('CVC', item.type, 'Left Femoral')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-purple-500">Left</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.category === 'Intraosseous (IO)' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800 p-4 rounded border border-slate-700">
              <h3 className="font-bold text-orange-400 mb-2">Proximal Tibia</h3>
              <span className="text-[10px] text-slate-400 mb-2 block">EZ-IO (Pressure Flow: ~60mL/min)</span>
              <div className="flex gap-2">
                <button onClick={() => establishAccess('IO', 'EZ-IO', 'Right Proximal Tibia')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-sm border border-transparent hover:border-orange-500">Right Tibia</button>
                <button onClick={() => establishAccess('IO', 'EZ-IO', 'Left Proximal Tibia')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-sm border border-transparent hover:border-orange-500">Left Tibia</button>
              </div>
            </div>
            <div className="bg-slate-800 p-4 rounded border border-slate-700">
              <h3 className="font-bold text-orange-400 mb-2">Humeral Head</h3>
              <span className="text-[10px] text-slate-400 mb-2 block">EZ-IO (Pressure Flow: ~150mL/min)</span>
              <div className="flex gap-2">
                <button onClick={() => establishAccess('IO', 'EZ-IO', 'Right Humeral Head')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-sm border border-transparent hover:border-orange-500">Right Humerus</button>
                <button onClick={() => establishAccess('IO', 'EZ-IO', 'Left Humeral Head')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-sm border border-transparent hover:border-orange-500">Left Humerus</button>
              </div>
            </div>
          </div>
        )}

        {data.category === 'Arterial Line' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800 p-4 rounded border border-slate-700">
              <h3 className="font-bold text-red-400 mb-2">Radial (20G)</h3>
              <div className="flex sm:flex-col gap-2 sm:gap-1">
                <button onClick={() => establishAccess('Arterial', '20G Arterial Line', 'Right Radial')} className="w-1/2 sm:w-full text-center sm:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-red-500">Right</button>
                <button onClick={() => establishAccess('Arterial', '20G Arterial Line', 'Left Radial')} className="w-1/2 sm:w-full text-center sm:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-red-500">Left</button>
              </div>
            </div>
            <div className="bg-slate-800 p-4 rounded border border-slate-700">
              <h3 className="font-bold text-red-400 mb-2">Brachial (20G)</h3>
              <div className="flex sm:flex-col gap-2 sm:gap-1">
                <button onClick={() => establishAccess('Arterial', '20G Arterial Line', 'Right Brachial')} className="w-1/2 sm:w-full text-center sm:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-red-500">Right</button>
                <button onClick={() => establishAccess('Arterial', '20G Arterial Line', 'Left Brachial')} className="w-1/2 sm:w-full text-center sm:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-red-500">Left</button>
              </div>
            </div>
            <div className="bg-slate-800 p-4 rounded border border-slate-700">
              <h3 className="font-bold text-red-400 mb-2">Axillary (18G)</h3>
              <div className="flex sm:flex-col gap-2 sm:gap-1">
                <button onClick={() => establishAccess('Arterial', '18G Arterial Line', 'Right Axillary')} className="w-1/2 sm:w-full text-center sm:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-red-500">Right</button>
                <button onClick={() => establishAccess('Arterial', '18G Arterial Line', 'Left Axillary')} className="w-1/2 sm:w-full text-center sm:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-red-500">Left</button>
              </div>
            </div>
            <div className="bg-slate-800 p-4 rounded border border-slate-700">
              <h3 className="font-bold text-red-400 mb-2">Femoral (18G)</h3>
              <div className="flex sm:flex-col gap-2 sm:gap-1">
                <button onClick={() => establishAccess('Arterial', '18G Arterial Line', 'Right Femoral')} className="w-1/2 sm:w-full text-center sm:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-red-500">Right</button>
                <button onClick={() => establishAccess('Arterial', '18G Arterial Line', 'Left Femoral')} className="w-1/2 sm:w-full text-center sm:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-red-500">Left</button>
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border-2 border-indigo-500 rounded-xl p-6 md:p-8 max-h-[85vh] overflow-y-auto custom-scrollbar w-11/12 max-w-xl shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2"><Stethoscope size={24}/> Auscultate & Confirm</h2>
          <button onClick={close} className="text-slate-400 hover:text-white"><X size={24}/></button>
        </div>

        {data.result && (
          <div className="mb-6 p-4 bg-indigo-900/40 border border-indigo-500 rounded text-indigo-200 font-bold text-sm md:text-base">
            {data.result}
          </div>
        )}

        <p className="text-sm md:text-base text-slate-300 mb-4">Select an anatomical location to auscultate for breath sounds or gastric insufflation:</p>
        <div className="grid grid-cols-1 gap-3 mb-6">
          <button onClick={() => auscultateLungs('Left Lung')} className="bg-slate-800 hover:bg-indigo-900 p-4 rounded text-left border border-slate-700 hover:border-indigo-400 transition font-bold text-sm md:text-base">Left Lung Field</button>
          <button onClick={() => auscultateLungs('Right Lung')} className="bg-slate-800 hover:bg-indigo-900 p-4 rounded text-left border border-slate-700 hover:border-indigo-400 transition font-bold text-sm md:text-base">Right Lung Field</button>
          <button onClick={() => auscultateLungs('Epigastrium')} className="bg-slate-800 hover:bg-indigo-900 p-4 rounded text-left border border-slate-700 hover:border-indigo-400 transition font-bold text-sm md:text-base">Epigastrium (Stomach)</button>
        </div>

        {(patient.tubePosition === 'right_mainstem' || patient.tubePosition === 'left_mainstem' || patient.tubePosition === 'trachea' || patient.tubePosition === 'esophagus') && (
          <>
            <h3 className="text-indigo-400 font-bold mb-3 border-b border-indigo-900 pb-1">Tube Interventions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => adjustTube('pull_back')} className="bg-slate-800 hover:bg-slate-700 p-3 rounded text-sm text-center border border-slate-700 hover:border-slate-500 font-bold">Pull Tube Back 2cm</button>
              <button onClick={() => adjustTube('remove')} className="bg-red-900/40 hover:bg-red-800 p-3 rounded text-sm text-center border border-red-900 hover:border-red-500 text-red-200 font-bold">Extubate / Remove Tube</button>
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border-2 border-green-500 rounded-xl p-4 md:p-8 max-w-4xl shadow-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-6 flex items-center gap-2"><Wind size={24}/> Intubation Equipment Setup</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <h3 className="text-green-400 font-bold mb-3 border-b border-green-900 pb-1">1. Select Blade</h3>
            <div className="flex flex-col gap-2">
              {['Macintosh (Curved DL)', 'Miller (Straight DL)', 'Standard VL', 'Hyperangulated VL', 'Fiberoptic'].map(blade => (
                <button key={blade} onClick={() => setViewModal(prev => ({...prev, blade}))} className={`p-2 rounded text-xs text-left border ${viewModal.blade === blade ? 'bg-green-800 border-green-400' : 'bg-slate-800 border-slate-700 hover:bg-slate-700 transition'}`}>{blade}</button>
              ))}
            </div>
            {viewModal.blade && !viewModal.blade.includes('Fiberoptic') && (
              <select value={viewModal.bladeSize} onChange={(e) => setViewModal(prev => ({...prev, bladeSize: e.target.value}))} className="w-full mt-2 bg-slate-950 text-white text-xs p-2 border border-slate-700 rounded outline-none focus:border-green-500 transition">
                <option value="">Select Size (Hint: Size 3/4 Adult)</option>
                <option value="2">Size 2 (Small)</option><option value="3">Size 3 (Normal)</option><option value="4">Size 4 (Large)</option>
              </select>
            )}
          </div>
          <div>
            <h3 className="text-cyan-400 font-bold mb-3 border-b border-cyan-900 pb-1">2. Select ETT</h3>
            <div className="bg-slate-800 p-3 rounded border border-slate-700">
              <label className="text-[10px] md:text-xs text-slate-400 block mb-1">Tube Size (Hint: 7.0-7.5 Female, 7.5-8.0 Male)</label>
              <select value={viewModal.tubeSize} onChange={(e) => setViewModal(prev => ({...prev, tubeSize: e.target.value}))} className="w-full bg-slate-950 text-white text-sm p-2 border border-slate-600 rounded outline-none focus:border-cyan-500 transition">
                <option value="">Select ETT Size...</option>
                <option value="6.0">6.0 mm</option><option value="6.5">6.5 mm</option><option value="7.0">7.0 mm</option><option value="7.5">7.5 mm</option><option value="8.0">8.0 mm</option>
              </select>
            </div>
          </div>
          <div>
            <h3 className="text-blue-400 font-bold mb-3 border-b border-blue-900 pb-1">3. Select Adjunct</h3>
            <div className="flex flex-col gap-2">
              {[
                'None (Direct Tube)', 
                'Standard Malleable Stylet', 
                'Standard Bougie (Eschmann)', 
                'Hyperangulated Rigid Stylet', 
                'Articulating Bougie'
              ].map(adjunct => (
                <button key={adjunct} onClick={() => setViewModal(prev => ({...prev, adjunct}))} className={`p-2 rounded text-xs text-left border ${viewModal.adjunct === adjunct ? 'bg-blue-800 border-blue-400' : 'bg-slate-800 border-slate-700 hover:bg-slate-700 transition'}`}>{adjunct}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-end gap-3 md:gap-4 border-t border-slate-800 pt-4">
          <button onClick={close} className="px-6 py-3 sm:py-2 bg-slate-700 hover:bg-slate-600 rounded font-bold w-full sm:w-auto transition">Cancel</button>
          <button onClick={() => processIntubation(`${viewModal.blade} Size ${viewModal.bladeSize || '-'} with ${viewModal.tubeSize} ETT`, viewModal.adjunct)} disabled={!viewModal.blade || !viewModal.adjunct || !viewModal.tubeSize} className="px-6 py-3 sm:py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded font-bold text-white w-full sm:w-auto transition">Proceed to Intubate</button>
        </div>
      </div>
    </div>
  );
};

export const ViewModal = ({ data, submitGrade }) => {
  if (!data.show || !data.description) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border-2 border-cyan-500 rounded-xl p-8 max-w-2xl shadow-2xl w-full">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2"><Eye size={24}/> Direct Visualization: {data.blade}</h2>
        <p className="text-lg text-slate-300 mb-8 italic border-l-4 border-cyan-500 pl-4 py-2 bg-slate-800/50 whitespace-pre-wrap">"{data.description}"</p>
        <h3 className="text-yellow-400 font-bold mb-4">Select the Cormack-Lehane Grade:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(grade => (
            <button key={grade} onClick={() => submitGrade(grade)} className="bg-slate-800 hover:bg-cyan-900 p-4 rounded text-left border border-slate-700 hover:border-cyan-400 transition">
              <span className="font-bold text-white block">Grade {['I', 'II', 'III', 'IV'][grade-1]}</span>
              <span className="text-sm text-slate-400">{['Full view of glottis', 'Partial view of glottis', 'Epiglottis only visible', 'No structures visible'][grade-1]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// 1. PRE-OPERATIVE RISK ASSESSMENT & FLOWCHART MODAL
export const PreopModal = ({ show, close, patient, setPatient, logEvent }) => {
  if (!show) return null;

  const [rcri, setRcri] = React.useState({
    highRiskSurg: false,
    ischemicHeart: false,
    chf: false,
    cerebrovascular: false,
    insulin: false,
    creatinine: false
  });

  const [mets, setMets] = React.useState(null); // 'poor', 'moderate', 'excellent'
  const [cleared, setCleared] = React.useState(false);
  
  const [preopOrders, setPreopOrders] = React.useState({
      cbc: false,
      bmp: false,
      coags: false,
      typeAndScreen: false,
      typeAndCross: false
  });

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
            bloodPreOrdered: preopOrders.typeAndCross,
            bloodAvailable: preopOrders.typeAndCross 
        }));
    }
    setCleared(true);
    close();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border-2 border-indigo-500 rounded-xl p-6 md:p-8 max-w-4xl shadow-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
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
              <div><span className="text-slate-400">Patient:</span> <span className="text-white font-bold">{patient.name || 'John Doe'}</span></div>
              <div><span className="text-slate-400">Age / Weight:</span> <span className="text-white font-bold">{patient.age || 65}yo / {patient.weight || 75} kg</span></div>
              <div><span className="text-slate-400">Height / BMI:</span> <span className="text-white font-bold">{patient.height || 175} cm / {patient.bmi ? parseFloat(patient.bmi.toFixed(1)) : 24.5} ({patient.isObese ? 'Obese' : 'Normal'})</span></div>
              <div><span className="text-slate-400">Airway Exam:</span> <span className="text-white font-bold">Mallampati {patient.airwayExamined ? patient.mallampatiScore || 'N/A' : 'UNEXAMINED'}</span></div>
            </div>
            
            <div className="mt-4 border-t border-slate-700/50 pt-3">
              <span className="text-slate-400 text-xs block mb-1">Active Comorbidities:</span>
              <div className="flex flex-wrap gap-1.5">
                {patient.cad && <span className="bg-red-950 border border-red-800 text-red-300 px-2 py-0.5 rounded text-[10px] font-bold">Coronary Artery Disease</span>}
                {patient.chf && <span className="bg-orange-950 border border-orange-800 text-orange-300 px-2 py-0.5 rounded text-[10px] font-bold">Congestive Heart Failure</span>}
                {patient.diabetes && <span className="bg-yellow-950 border border-yellow-800 text-yellow-300 px-2 py-0.5 rounded text-[10px] font-bold">Diabetes Mellitus</span>}
                {patient.mg && <span className="bg-purple-950 border border-purple-800 text-purple-300 px-2 py-0.5 rounded text-[10px] font-bold">Myasthenia Gravis</span>}
                {patient.isTrauma && <span className="bg-red-950 border border-red-500 text-red-200 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse">TRAUMA / BURNS</span>}
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
                  <button onClick={() => setMets('poor')} className={`p-2 rounded text-xs text-left border font-bold transition-all ${mets === 'poor' ? 'bg-red-950 border-red-500 text-red-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
                    🏃‍♂️ Poor Capacity (&lt;4 METs)
                    <span className="block text-[10px] text-slate-500 font-normal">Cannot walk up a flight of stairs, climb hill, or do heavy housework.</span>
                  </button>
                  <button onClick={() => setMets('moderate')} className={`p-2 rounded text-xs text-left border font-bold transition-all ${mets === 'moderate' ? 'bg-indigo-950 border-indigo-500 text-indigo-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
                    🚶‍♂️ Moderate Capacity (4-10 METs)
                    <span className="block text-[10px] text-slate-500 font-normal">Can climb two flights of stairs, walk fast, scrub floors, or walk at 4 mph.</span>
                  </button>
                  <button onClick={() => setMets('excellent')} className={`p-2 rounded text-xs text-left border font-bold transition-all ${mets === 'excellent' ? 'bg-green-950 border-green-500 text-green-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
                    🚴‍♂️ Excellent Capacity (&gt;10 METs)
                    <span className="block text-[10px] text-slate-500 font-normal">Can participate in strenuous sports, run, or swim vigorously.</span>
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
                  // METs ≥ 4 corresponds to 'moderate' or 'excellent'; METs < 4 or unknown = 'poor'
                  const adequateMets = mets === 'moderate' || mets === 'excellent';

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
  if (!show) return null;

  const [checks, setChecks] = React.useState({
    m: false,
    s: false,
    m2: false,
    a: false,
    i: false,
    d: false,
    s2: false
  });

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border-2 border-emerald-500 rounded-xl p-6 md:p-8 max-w-xl shadow-2xl w-full max-h-[85vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">🛠️ MSMAIDS Setup Checklist</h2>
            <p className="text-xs text-emerald-400 mt-0.5">Critical pre-flight checklist prior to general anesthesia induction</p>
          </div>
          <button onClick={close} className="text-slate-400 hover:text-white"><X size={20}/></button>
        </div>

        <div className="flex flex-col gap-3 my-4">
          <button onClick={() => toggleCheck('m')} className={`flex items-start gap-3 p-3 rounded border text-left transition ${checks.m ? 'bg-emerald-950/30 border-emerald-600 text-emerald-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
            <span className="text-xl font-black text-emerald-400 w-6">M</span>
            <div className="flex-1">
              <span className="font-bold text-sm block">Anesthesia Machine Check</span>
              <span className="text-xs text-slate-400 block mt-0.5">Leak test completed, vaporizers locked, circuit connected, backup O2 cylinder pressurized and verified.</span>
            </div>
            <input type="checkbox" checked={checks.m} readOnly className="rounded border-slate-600 text-emerald-600 focus:ring-0 mt-1 pointer-events-none" />
          </button>

          <button onClick={() => toggleCheck('s')} className={`flex items-start gap-3 p-3 rounded border text-left transition ${checks.s ? 'bg-emerald-950/30 border-emerald-600 text-emerald-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
            <span className="text-xl font-black text-emerald-400 w-6">S</span>
            <div className="flex-1">
              <span className="font-bold text-sm block">Suction Setup</span>
              <span className="text-xs text-slate-400 block mt-0.5">Yankauer catheter secured bedside, suction pressure verified &gt; -200 mmHg.</span>
            </div>
            <input type="checkbox" checked={checks.s} readOnly className="rounded border-slate-600 text-emerald-600 focus:ring-0 mt-1 pointer-events-none" />
          </button>

          <button onClick={() => toggleCheck('m2')} className={`flex items-start gap-3 p-3 rounded border text-left transition ${checks.m2 ? 'bg-emerald-950/30 border-emerald-600 text-emerald-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
            <span className="text-xl font-black text-emerald-400 w-6">M</span>
            <div className="flex-1">
              <span className="font-bold text-sm block">Monitors Applied</span>
              <span className="text-xs text-slate-400 block mt-0.5">3/5 lead ECG, pulse oximeter, blood pressure cuff, temperature probe applied and reading vitals.</span>
            </div>
            <input type="checkbox" checked={checks.m2} readOnly className="rounded border-slate-600 text-emerald-600 focus:ring-0 mt-1 pointer-events-none" />
          </button>

          <button onClick={() => toggleCheck('a')} className={`flex items-start gap-3 p-3 rounded border text-left transition ${checks.a ? 'bg-emerald-950/30 border-emerald-600 text-emerald-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
            <span className="text-xl font-black text-emerald-400 w-6">A</span>
            <div className="flex-1">
              <span className="font-bold text-sm block">Airway Equipment Ready</span>
              <span className="text-xs text-slate-400 block mt-0.5">Primary ETT and backup ETT sizes verified, laryngoscopes (DL/VL blades) loaded, bougie and oral airways accessible.</span>
            </div>
            <input type="checkbox" checked={checks.a} readOnly className="rounded border-slate-600 text-emerald-600 focus:ring-0 mt-1 pointer-events-none" />
          </button>

          <button onClick={() => toggleCheck('i')} className={`flex items-start gap-3 p-3 rounded border text-left transition ${checks.i ? 'bg-emerald-950/30 border-emerald-600 text-emerald-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
            <span className="text-xl font-black text-emerald-400 w-6">I</span>
            <div className="flex-1">
              <span className="font-bold text-sm block">Intravenous Access Patency</span>
              <span className="text-xs text-slate-400 block mt-0.5">Large-bore PIV running, catheter gauge verified, extra lines available for rapid resuscitation.</span>
            </div>
            <input type="checkbox" checked={checks.i} readOnly className="rounded border-slate-600 text-emerald-600 focus:ring-0 mt-1 pointer-events-none" />
          </button>

          <button onClick={() => toggleCheck('d')} className={`flex items-start gap-3 p-3 rounded border text-left transition ${checks.d ? 'bg-emerald-950/30 border-emerald-600 text-emerald-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
            <span className="text-xl font-black text-emerald-400 w-6">D</span>
            <div className="flex-1">
              <span className="font-bold text-sm block">Drugs & Syringes Labeled</span>
              <span className="text-xs text-slate-400 block mt-0.5">Induction sedatives, paralytics, and emergency rescue pressors (Epi, Phenylephrine, Atropine) drawn, labeled and verified.</span>
            </div>
            <input type="checkbox" checked={checks.d} readOnly className="rounded border-slate-600 text-emerald-600 focus:ring-0 mt-1 pointer-events-none" />
          </button>

          <button onClick={() => toggleCheck('s2')} className={`flex items-start gap-3 p-3 rounded border text-left transition ${checks.s2 ? 'bg-emerald-950/30 border-emerald-600 text-emerald-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
            <span className="text-xl font-black text-emerald-400 w-6">S</span>
            <div className="flex-1">
              <span className="font-bold text-sm block">Safety backups / Cricothyrotomy bedside</span>
              <span className="text-xs text-slate-400 block mt-0.5">Emergency surgical airway cricothyrotomy kit bedside, code cart located, help available.</span>
            </div>
            <input type="checkbox" checked={checks.s2} readOnly className="rounded border-slate-600 text-emerald-600 focus:ring-0 mt-1 pointer-events-none" />
          </button>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-800 pt-4 mt-6">
          <button onClick={close} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded font-bold text-xs text-slate-300 transition">Cancel</button>
          <button 
            onClick={handleVerify} 
            disabled={!allChecked} 
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded font-bold text-xs text-white transition shadow-lg shadow-emerald-950/30"
          >
            Complete MSMAIDS Check
          </button>
        </div>
      </div>
    </div>
  );
};

// 3. POST-INTUBATION "A'S" CHECKLIST
export const PostIntubationModal = ({ show, close, logEvent }) => {
  if (!show) return null;

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

  const allChecked = Object.values(checks).every(Boolean);

  const toggleCheck = (key) => {
    setChecks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleComplete = () => {
    logEvent("✅ Post-Intubation checklist complete. Patient stabilized on mechanical ventilation, anesthesia active, lines secured, and initial safety steps verified.");
    close();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border-2 border-cyan-500 rounded-xl p-6 md:p-8 max-w-xl shadow-2xl w-full max-h-[85vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">🔄 Post-Intubation Checklist</h2>
            <p className="text-xs text-cyan-400 mt-0.5">Systematic confirmation of post-intubation stabilization</p>
          </div>
          <button onClick={close} className="text-slate-400 hover:text-white"><X size={20}/></button>
        </div>

        <div className="flex flex-col gap-2 my-3">
          {[
            { id: 'airway', letter: 'A', title: 'Airway Secured', desc: 'Secure ETT at lip, confirm ETT cuff inflation to 20-30 cmH2O, verify bilateral breath sounds.' },
            { id: 'anesthesia', letter: 'A', title: 'Anesthesia Maintenance', desc: 'Turn on Sevoflurane/Desflurane dial to match surgical stimulating requirements.' },
            { id: 'access', letter: 'A', title: 'Access Lines Secured', desc: 'Verify IV catheters are patent, blood return verified, and taped securely.' },
            { id: 'another', letter: 'A', title: 'Another in mouth / Bite Block', desc: 'Insert bite block to protect ETT, insert gastric suction tube.' },
            { id: 'arms', letter: 'A', title: 'Arms & Positioning Padded', desc: 'Secure and pad arms, protect ulnar nerves, avoid hyperabduction (&gt;90 degrees).' },
            { id: 'air', letter: 'A', title: 'Air / Ventilator Parameters', desc: 'Verify ventilator settings (VCV/PCV, proper tidal volume 6-8 mL/kg, PEEP, FiO2).' },
            { id: 'abg', letter: 'A', title: 'ABG / Arterial Line check', desc: 'Confirm arterial line transducer is zeroed at phlebostatic axis.' },
            { id: 'antibiotics', letter: 'A', title: 'Antibiotics Administered', desc: 'Administer surgical prophylactic antibiotics within 60 minutes of surgical incision.' },
            { id: 'analgesia', letter: 'A', title: 'Analgesia Loading', desc: 'Administer loading opioids or regional blocks for incisional analgesia.' }
          ].map(item => (
            <button key={item.id} onClick={() => toggleCheck(item.id)} className={`flex items-start gap-3 p-2.5 rounded border text-left transition ${checks[item.id] ? 'bg-cyan-950/30 border-cyan-600 text-cyan-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
              <span className="text-lg font-black text-cyan-400 w-5">{item.letter}</span>
              <div className="flex-1">
                <span className="font-bold text-xs block">{item.title}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">{item.desc}</span>
              </div>
              <input type="checkbox" checked={checks[item.id]} readOnly className="rounded border-slate-600 text-cyan-600 focus:ring-0 mt-1 pointer-events-none" />
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-800 pt-4 mt-4">
          <button onClick={close} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded font-bold text-xs text-slate-300 transition">Cancel</button>
          <button 
            onClick={handleComplete} 
            disabled={!allChecked} 
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded font-bold text-xs text-white transition shadow-lg shadow-cyan-950/30"
          >
            Complete Post-Intubation Check
          </button>
        </div>
      </div>
    </div>
  );
};

// 4. EXTUBATION EVALUATION MODAL
export const ExtubationModal = ({ show, close, vitals, patient, logEvent, performExtubation }) => {
  if (!show) return null;

  const [checks, setChecks] = React.useState({
    tof: false,
    rr: false,
    cuffLeak: false,
    tv: false,
    commands: false,
    suction: false
  });

  const toggleCheck = (key) => {
    setChecks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const hasTofRatio = vitals.tofCount === 4 && vitals.tofRatio >= 0.90;
  const isRrGood = vitals.rr >= 6 && vitals.rr <= 30;
  const isTvGood = vitals.vte >= 5 * patient.weight;
  
  const allChecked = Object.values(checks).every(Boolean);

  const handleExtubateSubmit = () => {
    if (!hasTofRatio) {
      logEvent("⚠️ WARNING: Extubation attempted with incomplete neuromuscular block reversal! High risk of respiratory collapse and upper airway obstruction.");
    }
    logEvent("💨 Extubation checklist completed. ETT deflated, suctioned, and removed. Patient successfully transitioned to spontaneous breathing mask.");
    performExtubation();
    close();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border-2 border-rose-500 rounded-xl p-6 md:p-8 max-w-xl shadow-2xl w-full max-h-[85vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">💨 Extubation Evaluation Criteria</h2>
            <p className="text-xs text-rose-400 mt-0.5">Rigorous assessment of awake extubation clinical safety criteria</p>
          </div>
          <button onClick={close} className="text-slate-400 hover:text-white"><X size={20}/></button>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex flex-col gap-3 my-4">
          <h3 className="text-rose-400 font-bold text-xs uppercase tracking-wider">Objective Ventilatory & Neuromuscular Metrics</h3>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-900 p-2.5 rounded border border-slate-800 flex flex-col">
              <span className="text-slate-400">TOF Recovery Ratio:</span>
              <span className={`text-base font-black mt-1 ${hasTofRatio ? 'text-green-400' : 'text-red-400'}`}>
                {vitals.tofCount}/4 ({vitals.tofRatio ? `${(vitals.tofRatio*100).toFixed(0)}%` : '0%'})
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">Target: 4/4 (Ratio &gt;= 90%)</span>
            </div>

            <div className="bg-slate-900 p-2.5 rounded border border-slate-800 flex flex-col">
              <span className="text-slate-400">Spontaneous Resp Rate:</span>
              <span className={`text-base font-black mt-1 ${isRrGood ? 'text-green-400' : 'text-red-400'}`}>
                {vitals.rr} bpm
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">Target: 6 - 30 bpm</span>
            </div>

            <div className="bg-slate-900 p-2.5 rounded border border-slate-800 flex flex-col col-span-2">
              <span className="text-slate-400">Spontaneous Tidal Volume:</span>
              <span className={`text-base font-black mt-1 ${isTvGood ? 'text-green-400' : 'text-red-400'}`}>
                {vitals.vte} mL ({(vitals.vte / patient.weight).toFixed(1)} mL/kg)
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">Target: &gt; 5 mL/kg (&gt;= {5 * patient.weight} mL)</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 my-4">
          <h3 className="text-rose-400 font-bold text-xs uppercase tracking-wider">Clinical Bedside Checks</h3>
          
          <button onClick={() => toggleCheck('tof')} className={`flex items-center justify-between p-2.5 rounded border text-left text-xs font-bold transition ${checks.tof ? 'bg-rose-950/20 border-rose-600 text-rose-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
            <span>Confirm TOF Ratio &gt;= 90% (Neuromuscular safety)</span>
            <input type="checkbox" checked={checks.tof} readOnly className="rounded border-slate-600 text-rose-600 focus:ring-0 pointer-events-none" />
          </button>

          <button onClick={() => toggleCheck('rr')} className={`flex items-center justify-between p-2.5 rounded border text-left text-xs font-bold transition ${checks.rr ? 'bg-rose-950/20 border-rose-600 text-rose-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
            <span>Spontaneous respiratory rate stable between 6-30 bpm</span>
            <input type="checkbox" checked={checks.rr} readOnly className="rounded border-slate-600 text-rose-600 focus:ring-0 pointer-events-none" />
          </button>

          <button onClick={() => toggleCheck('cuffLeak')} className={`flex items-center justify-between p-2.5 rounded border text-left text-xs font-bold transition ${checks.cuffLeak ? 'bg-rose-950/20 border-rose-600 text-rose-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
            <span>Cuff Leak Test: audible leak present, no airway edema</span>
            <input type="checkbox" checked={checks.cuffLeak} readOnly className="rounded border-slate-600 text-rose-600 focus:ring-0 pointer-events-none" />
          </button>

          <button onClick={() => toggleCheck('tv')} className={`flex items-center justify-between p-2.5 rounded border text-left text-xs font-bold transition ${checks.tv ? 'bg-rose-950/20 border-rose-600 text-rose-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
            <span>Spontaneous tidal volume &gt; 5 mL/kg verified</span>
            <input type="checkbox" checked={checks.tv} readOnly className="rounded border-slate-600 text-rose-600 focus:ring-0 pointer-events-none" />
          </button>

          <button onClick={() => toggleCheck('commands')} className={`flex items-center justify-between p-2.5 rounded border text-left text-xs font-bold transition ${checks.commands ? 'bg-rose-950/20 border-rose-600 text-rose-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
            <span>Awake/Responsive: follows commands (5s head lift)</span>
            <input type="checkbox" checked={checks.commands} readOnly className="rounded border-slate-600 text-rose-600 focus:ring-0 pointer-events-none" />
          </button>

          <button onClick={() => toggleCheck('suction')} className={`flex items-center justify-between p-2.5 rounded border text-left text-xs font-bold transition ${checks.suction ? 'bg-rose-950/20 border-rose-600 text-rose-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
            <span>Pharynx & ETT suctioned, oral secretions cleared</span>
            <input type="checkbox" checked={checks.suction} readOnly className="rounded border-slate-600 text-rose-600 focus:ring-0 pointer-events-none" />
          </button>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-800 pt-4 mt-6">
          <button onClick={close} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded font-bold text-xs text-slate-300 transition">Cancel</button>
          <button 
            onClick={handleExtubateSubmit} 
            disabled={!allChecked} 
            className="px-6 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded font-bold text-xs text-white transition shadow-lg shadow-rose-900/30"
          >
            Deflate Cuff & Extubate ETT
          </button>
        </div>
      </div>
    </div>
  );
};