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
  if (!data.show) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border-2 border-cyan-500 rounded-xl p-6 md:p-8 max-h-[85vh] overflow-y-auto custom-scrollbar w-11/12 max-w-2xl shadow-2xl">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-4 flex items-center gap-2"><Eye size={24}/> Pre-Intubation Airway Assessment</h2>
        <p className="text-sm md:text-lg text-slate-300 mb-6 italic border-l-4 border-cyan-500 pl-4 py-2 bg-slate-800/50 whitespace-pre-wrap">{data.description}</p>
        <h3 className="text-yellow-400 font-bold mb-4 text-sm md:text-base">Based on your visualization, select the correct Mallampati Score:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(grade => (
            <button key={grade} onClick={() => submitAirwayQuiz(grade)} className="bg-slate-800 hover:bg-cyan-900 p-4 rounded text-left border border-slate-700 hover:border-cyan-400 transition">
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
              {['16G', '18G', '20G'].map(size => (
                <div key={`ac-${size}`} className="flex gap-2 mb-1">
                  <button onClick={() => establishAccess('PIV', `${size} PIV`, 'Right AC')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-green-500">{size} Right</button>
                  <button onClick={() => establishAccess('PIV', `${size} PIV`, 'Left AC')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-green-500">{size} Left</button>
                </div>
              ))}
            </div>
            <div className="bg-slate-800 p-4 rounded border border-slate-700">
              <h3 className="font-bold text-green-400 mb-2">Forearm</h3>
              {['18G', '20G', '22G'].map(size => (
                <div key={`forearm-${size}`} className="flex gap-2 mb-1">
                  <button onClick={() => establishAccess('PIV', `${size} PIV`, 'Right Forearm')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-green-500">{size} Right</button>
                  <button onClick={() => establishAccess('PIV', `${size} PIV`, 'Left Forearm')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-green-500">{size} Left</button>
                </div>
              ))}
            </div>
            <div className="bg-slate-800 p-4 rounded border border-slate-700">
              <h3 className="font-bold text-green-400 mb-2">Hand</h3>
              {['20G', '22G', '24G'].map(size => (
                <div key={`hand-${size}`} className="flex gap-2 mb-1">
                  <button onClick={() => establishAccess('PIV', `${size} PIV`, 'Right Hand')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-green-500">{size} Right</button>
                  <button onClick={() => establishAccess('PIV', `${size} PIV`, 'Left Hand')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-green-500">{size} Left</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.category === 'Central Line' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800 p-4 rounded border border-slate-700">
              <h3 className="font-bold text-purple-400 mb-2">Internal Jugular (IJ)</h3>
              {['Triple Lumen CVC', 'MAC Introducer'].map(type => (
                <div key={`ij-${type}`} className="flex flex-col gap-1 mb-3">
                  <span className="text-[10px] text-slate-400">{type}</span>
                  <div className="flex gap-2">
                    <button onClick={() => establishAccess('CVC', type, 'Right IJ')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-purple-500">Right</button>
                    <button onClick={() => establishAccess('CVC', type, 'Left IJ')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-purple-500">Left</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-slate-800 p-4 rounded border border-slate-700">
              <h3 className="font-bold text-purple-400 mb-2">Subclavian</h3>
              {['Triple Lumen CVC', 'Trauma Cordis'].map(type => (
                <div key={`sub-${type}`} className="flex flex-col gap-1 mb-3">
                  <span className="text-[10px] text-slate-400">{type}</span>
                  <div className="flex gap-2">
                    <button onClick={() => establishAccess('CVC', type, 'Right Subclavian')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-purple-500">Right</button>
                    <button onClick={() => establishAccess('CVC', type, 'Left Subclavian')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-purple-500">Left</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-slate-800 p-4 rounded border border-slate-700">
              <h3 className="font-bold text-purple-400 mb-2">Femoral</h3>
              {['Triple Lumen CVC', 'Trauma Cordis'].map(type => (
                <div key={`fem-${type}`} className="flex flex-col gap-1 mb-3">
                  <span className="text-[10px] text-slate-400">{type}</span>
                  <div className="flex gap-2">
                    <button onClick={() => establishAccess('CVC', type, 'Right Femoral')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-purple-500">Right</button>
                    <button onClick={() => establishAccess('CVC', type, 'Left Femoral')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-xs border border-transparent hover:border-purple-500">Left</button>
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
              <div className="flex gap-2">
                <button onClick={() => establishAccess('IO', 'EZ-IO', 'Right Proximal Tibia')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-sm border border-transparent hover:border-orange-500">Right Tibia</button>
                <button onClick={() => establishAccess('IO', 'EZ-IO', 'Left Proximal Tibia')} className="w-1/2 text-center md:text-left p-2 hover:bg-slate-700 rounded text-sm border border-transparent hover:border-orange-500">Left Tibia</button>
              </div>
            </div>
            <div className="bg-slate-800 p-4 rounded border border-slate-700">
              <h3 className="font-bold text-orange-400 mb-2">Humeral Head</h3>
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