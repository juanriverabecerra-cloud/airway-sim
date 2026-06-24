import { Wind, X, ShieldAlert } from 'lucide-react';
import { FlowVolumeLoopCanvas } from '../FlowVolumeLoopCanvas';
import { generateFlowVolumeLoop } from '../../engine/FlowVolumeLoopModel';

export const FlowVolumeLoopModal = ({ show, close, patient, vitals }) => {
  if (!show) return null;

  const loop = generateFlowVolumeLoop(patient, vitals);
  const alertType = loop.alertType || 'info';
  const title = loop.title || 'Flow-Volume Loop';

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-fade-in">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-3xl h-[80vh] sm:h-[72vh] flex flex-col overflow-hidden shadow-2xl relative">

        {/* Header Block */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <Wind size={24} />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-100 uppercase leading-none">Flow-Volume Loop</h2>
              <span className="text-[10px] sm:text-xs text-slate-500 font-medium">Live pulmonary function trace</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-3 bg-black/40 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-bold">PEF:</span>
                <span className="text-green-400 font-mono font-black text-sm">{loop.pef.toFixed(1)} <span className="text-[9px]">L/s</span></span>
              </div>
              <div className="w-[1px] h-3 bg-slate-800"></div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-bold">PIF:</span>
                <span className="text-yellow-400 font-mono font-black text-sm">{loop.pif.toFixed(1)} <span className="text-[9px]">L/s</span></span>
              </div>
              <div className="w-[1px] h-3 bg-slate-800"></div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-bold">TLC:</span>
                <span className="text-slate-200 font-mono font-black text-sm">{loop.tlc.toFixed(1)} <span className="text-[9px]">L</span></span>
              </div>
              <div className="w-[1px] h-3 bg-slate-800"></div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-bold">RV:</span>
                <span className="text-slate-200 font-mono font-black text-sm">{loop.rv.toFixed(1)} <span className="text-[9px]">L</span></span>
              </div>
            </div>
            <button onClick={close} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Interpretation Banner */}
        <div className={`px-4 py-3 border-b border-slate-850 flex items-start gap-3 shrink-0 ${
          alertType === 'critical' ? 'bg-red-950/25 border-l-4 border-l-red-500' :
          alertType === 'warning' ? 'bg-amber-950/25 border-l-4 border-l-amber-500' :
          'bg-blue-950/20 border-l-4 border-l-blue-500'
        }`}>
          <div className="mt-0.5 shrink-0">
            <ShieldAlert size={18} className={
              alertType === 'critical' ? 'text-red-500' :
              alertType === 'warning' ? 'text-amber-500' :
              'text-blue-400'
            } />
          </div>
          <div className="flex-1">
            <h3 className={`text-sm font-black uppercase tracking-wider leading-none mb-1 ${
              alertType === 'critical' ? 'text-red-400' :
              alertType === 'warning' ? 'text-amber-400' :
              'text-blue-400'
            }`}>{title}</h3>
            <p className="text-xs text-slate-400 leading-normal">{loop.interpretation}</p>
          </div>
        </div>

        {/* Loop Rendering Area */}
        <div className="flex-1 relative min-h-0 bg-slate-950 p-2">
          <FlowVolumeLoopCanvas patient={patient} vitals={vitals} active={!!vitals?.rr} />
        </div>
      </div>
    </div>
  );
};
