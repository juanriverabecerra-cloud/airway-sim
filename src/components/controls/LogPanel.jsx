import React from 'react';
import { Zap, Search } from 'lucide-react';

export const LogPanel = ({ logs, generateClinicalHint }) => {
  return (
    <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full max-h-[800px]">
      <div className="flex justify-between items-center mb-3 border-b border-slate-700 pb-2">
        <h3 className="text-yellow-400 font-bold flex items-center gap-2"><Zap size={18}/> Clinical Log</h3>
        <button onClick={generateClinicalHint} className="bg-purple-900/40 hover:bg-purple-800 text-purple-300 px-2 py-1 rounded text-[10px] font-bold transition">
          <Search size={12}/> Attending Hint
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
        {logs.map((log, index) => (
          <div key={index} className={`${index === 0 ? "text-[12px] text-white font-bold border-l-2 border-cyan-500 pl-2 py-1 bg-slate-800/30" : "text-[11px] text-slate-400 pl-2"}`}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
};