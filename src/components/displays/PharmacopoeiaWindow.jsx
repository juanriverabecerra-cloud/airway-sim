import React, { useState } from 'react';
import { useSimState } from '../../sync/useSimState';
import { Pharmacopoeia } from '../controls/Pharmacopoeia';
import { LinesResusPanel } from '../controls/LinesResusPanel';
import { DrugConsultModal } from '../modals/DrugConsultModal';
import { AccessModal } from '../modals/Modals';
import { Activity, Maximize2, Pill, Syringe } from 'lucide-react';

export function PharmacopoeiaWindow() {
  const { state: syncedState, actions } = useSimState();
  const [activeTab, setActiveTab] = useState('drugs'); // 'drugs' | 'lines'
  const [drugConsultModal, setDrugConsultModal] = useState({ show: false, drugId: '' });
  const [accessModal, setAccessModal] = useState({ show: false, category: '' });

  const patient = syncedState.patient;
  const vitals = syncedState.vitals;
  const activeMeds = syncedState.activeMeds || [];

  const handlePushMed = (drugId, amount, isWeightBased) => {
    actions.pushMed(drugId, amount, isWeightBased);
  };

  const handlePushFluid = (type, volume) => {
    actions.pushFluid(type, volume);
  };

  return (
    <div className="w-screen h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none font-sans relative">
      {/* Top Banner */}
      <div className="h-10 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-xs font-black tracking-wider uppercase text-slate-200 flex items-center gap-2">
            <Pill className="w-3.5 h-3.5 text-indigo-400" />
            AETHERIS PHARMACOPOEIA & LINE ACCESS STATION
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">
            ROOM: {syncedState.roomCode || 'LOCAL'}
          </span>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px] font-bold">
          <button
            onClick={() => setActiveTab('drugs')}
            className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'drugs' ? 'bg-slate-800 text-indigo-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Pill className="w-3 h-3" /> Pharmacopoeia & Dosing
          </button>
          <button
            onClick={() => setActiveTab('lines')}
            className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'lines' ? 'bg-slate-800 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Syringe className="w-3 h-3" /> Line Access & Fluids
          </button>
        </div>

        <button
          onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(() => {});
            } else {
              document.exitFullscreen().catch(() => {});
            }
          }}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 transition-colors"
        >
          <Maximize2 className="w-3 h-3" /> Fullscreen
        </button>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 p-3 min-h-0 bg-slate-950 overflow-hidden">
        {!patient ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
            <Activity className="w-12 h-12 mb-3 animate-spin text-indigo-400/60" />
            <p className="text-sm font-bold text-slate-300">Awaiting Live Host Simulation Stream...</p>
          </div>
        ) : (
          <div className="w-full h-full rounded-xl border border-slate-800 bg-slate-900/60 p-3 overflow-y-auto">
            {activeTab === 'drugs' ? (
              <Pharmacopoeia
                patient={patient}
                pushMed={handlePushMed}
                processMed={() => {}}
                activeMeds={activeMeds}
                onOpenDrugConsult={(drugId) => setDrugConsultModal({ show: true, drugId })}
              />
            ) : (
              <LinesResusPanel
                patient={patient}
                pushFluid={handlePushFluid}
                setPatient={() => {}}
                onOpenAccessModal={(category) => setAccessModal({ show: true, category })}
              />
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {drugConsultModal.show && (
        <DrugConsultModal
          drugId={drugConsultModal.drugId}
          patient={patient}
          onClose={() => setDrugConsultModal({ show: false, drugId: '' })}
        />
      )}

      {accessModal.show && (
        <AccessModal
          category={accessModal.category}
          patient={patient}
          onClose={() => setAccessModal({ show: false, category: '' })}
        />
      )}
    </div>
  );
}
