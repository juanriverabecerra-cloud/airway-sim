import React, { useState, useEffect, useCallback } from 'react';
import { ULTRASOUND_PROCEDURES, getProceduresGroupedByCategory } from '../../engine/ultrasound/UltrasoundRegistry';
import { UltrasoundScreenCanvas } from './UltrasoundScreenCanvas';
import { UltrasoundMachineConsole } from './UltrasoundMachineConsole';
import { UltrasoundBodyPositioner } from './UltrasoundBodyPositioner';
import { UltrasoundGuidePanel } from './UltrasoundGuidePanel';
import { UltrasoundMediaBank } from './UltrasoundMediaBank';
import { UltrasoundNeedleEngine } from '../../engine/ultrasound/UltrasoundNeedleEngine';
import { UltrasoundGameEngine } from '../../engine/ultrasound/UltrasoundGameEngine';
import { ClinicalUltrasoundBridge } from '../../engine/ultrasound/ClinicalUltrasoundBridge';

export const UltrasoundStudioModal = ({
  show = false,
  onClose,
  patientState = null,
  initialProcedureId = 'ij_cvc'
}) => {
  const [selectedProcedureId, setSelectedProcedureId] = useState(initialProcedureId);
  const [activeTab, setActiveTab] = useState('simulation'); // 'simulation' | 'guide' | 'media_bank'

  // Sync initialProcedureId when prop changes
  useEffect(() => {
    if (initialProcedureId && ULTRASOUND_PROCEDURES[initialProcedureId]) {
      setSelectedProcedureId(initialProcedureId);
    }
  }, [initialProcedureId]);

  // Probe Position on 2D body map
  const [probePos, setProbePos] = useState({ xPercent: 50, yPercent: 50 });

  // Machine controls state
  const [gainDb, setGainDb] = useState(55);
  const [depthCm, setDepthCm] = useState(4.0);
  const [frequencyMHz, setFrequencyMHz] = useState(10.0);
  const [tgc, setTgc] = useState({ near: 0, mid: 0, far: 0 });
  const [probeType, setProbeType] = useState('linear');
  const [mode, setMode] = useState('b_mode');
  const [showOverlays, setShowOverlays] = useState(true);
  const [isFrozen, setIsFrozen] = useState(false);

  // Interventional needle state
  const [needleState, setNeedleState] = useState({
    approach: 'in_plane',
    depthCm: 2.0,
    angleDeg: 30,
    xOffsetPercent: 50,
    isInserted: false,
    injectedVolumeMl: 0,
    anestheticType: 'Ropivacaine 0.5%'
  });

  const [hydrodissectionPocket, setHydrodissectionPocket] = useState(null);
  const [blockScorePercent, setBlockScorePercent] = useState(0);
  const [timeSec, setTimeSec] = useState(0);

  const currentProcedure = ULTRASOUND_PROCEDURES[selectedProcedureId] || ULTRASOUND_PROCEDURES['ij_cvc'];
  const patientModifiers = ClinicalUltrasoundBridge.evaluatePatientUltrasoundState(patientState);

  // Sync defaults on procedure change
  useEffect(() => {
    if (currentProcedure) {
      setDepthCm(currentProcedure.defaultDepthCm);
      setFrequencyMHz(currentProcedure.defaultFrequencyMHz);
      setProbeType(currentProcedure.recommendedProbe);
      const target = currentProcedure.targetMapPos || { xPercent: 50, yPercent: 50 };
      setProbePos(target);
      setNeedleState({
        approach: 'in_plane',
        depthCm: currentProcedure.defaultDepthCm * 0.5,
        angleDeg: 30,
        xOffsetPercent: 50,
        isInserted: false,
        injectedVolumeMl: 0,
        anestheticType: 'Ropivacaine 0.5%'
      });
      setHydrodissectionPocket(null);
      setBlockScorePercent(0);
      setTimeSec(0);
    }
  }, [selectedProcedureId]);

  // Procedure timer
  useEffect(() => {
    if (!show || isFrozen) return;
    const timer = setInterval(() => setTimeSec((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [show, isFrozen]);

  const handleInjectLocalAnesthetic = useCallback((doseMl) => {
    setNeedleState((prevNeedle) => {
      if (!prevNeedle.isInserted) return prevNeedle;

      const targetStructure = currentProcedure.structureOverlays[0] || { xPercent: 50, yPercent: 50, radiusPercent: 10 };
      const result = UltrasoundNeedleEngine.injectLocalAnesthetic(
        prevNeedle,
        doseMl,
        targetStructure.xPercent,
        targetStructure.yPercent,
        targetStructure.radiusPercent,
        depthCm
      );
      setHydrodissectionPocket(result.pocket);
      setBlockScorePercent(result.blockScorePercent);
      return result.updatedNeedle;
    });
  }, [currentProcedure, depthCm]);

  // Keyboard Event Listener (WASD / Arrow Keys for Needle & Hydrodissection)
  useEffect(() => {
    if (!show || activeTab !== 'simulation') return;

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();

      // W / Up Arrow: Advance needle deeper
      if (key === 'w' || key === 'arrowup') {
        e.preventDefault();
        setNeedleState((prev) => ({
          ...prev,
          isInserted: true,
          depthCm: Math.min(depthCm, prev.depthCm + 0.2)
        }));
      }
      // S / Down Arrow: Retract needle shallower
      else if (key === 's' || key === 'arrowdown') {
        e.preventDefault();
        setNeedleState((prev) => ({
          ...prev,
          isInserted: true,
          depthCm: Math.max(0.2, prev.depthCm - 0.2)
        }));
      }
      // A / Left Arrow: Steer needle left
      else if (key === 'a' || key === 'arrowleft') {
        e.preventDefault();
        setNeedleState((prev) => ({
          ...prev,
          isInserted: true,
          xOffsetPercent: Math.max(15, prev.xOffsetPercent - 2)
        }));
      }
      // D / Right Arrow: Steer needle right
      else if (key === 'd' || key === 'arrowright') {
        e.preventDefault();
        setNeedleState((prev) => ({
          ...prev,
          isInserted: true,
          xOffsetPercent: Math.min(85, prev.xOffsetPercent + 2)
        }));
      }
      // Spacebar: Inject hydrodissection LA
      else if (key === ' ') {
        e.preventDefault();
        handleInjectLocalAnesthetic(5.0);
      }
      // Shift: Toggle approach
      else if (key === 'shift') {
        setNeedleState((prev) => ({
          ...prev,
          approach: prev.approach === 'in_plane' ? 'out_of_plane' : 'in_plane'
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, activeTab, depthCm, handleInjectLocalAnesthetic]);

  if (!show) return null;

  const targetMapPos = currentProcedure.targetMapPos || { xPercent: 50, yPercent: 50 };
  const alignmentScore = UltrasoundGameEngine.calculateProbeAlignment(probePos.xPercent, probePos.yPercent, targetMapPos.xPercent, targetMapPos.yPercent);
  const gameScore = UltrasoundGameEngine.evaluateMasteryGrade(
    alignmentScore,
    blockScorePercent,
    needleState.depthCm,
    needleState.xOffsetPercent,
    currentProcedure.structureOverlays,
    timeSec,
    depthCm
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto font-sans select-none">
      <div className="relative w-full max-w-6xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Studio Modal Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">📡</span>
            <div>
              <h2 className="text-base font-bold text-white font-mono tracking-wide flex items-center gap-2">
                GAMIFIED MEDICAL ULTRASOUND SIMULATOR
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700 font-normal">
                  MASTER GRADE: {gameScore.masteryGrade}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Mouse Transducer Tracking & WASD Needle Hydrodissection Suite
              </p>
            </div>
          </div>

          {/* Procedure Dropdown */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-mono font-bold">PROCEDURE:</span>
              <select
                value={selectedProcedureId}
                onChange={(e) => setSelectedProcedureId(e.target.value)}
                className="bg-slate-900 border border-cyan-500/50 text-cyan-300 font-mono text-xs font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-400"
              >
                {/* Rendered from the registry so every option resolves to a real procedure. */}
                {getProceduresGroupedByCategory().map((group) => (
                  <optgroup key={group.key} label={group.label}>
                    {group.procedures.map((proc) => (
                      <option key={proc.id} value={proc.id}>
                        {proc.shortName}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition border border-slate-700"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-6 font-mono text-xs">
          <button
            onClick={() => setActiveTab('simulation')}
            className={`px-4 py-2.5 font-bold border-b-2 transition ${
              activeTab === 'simulation'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            🎮 Live WASD Simulation Game
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2.5 font-bold border-b-2 transition ${
              activeTab === 'guide'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            📖 Educational Mastery Scorecard
          </button>
          <button
            onClick={() => setActiveTab('media_bank')}
            className={`px-4 py-2.5 font-bold border-b-2 transition ${
              activeTab === 'media_bank'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            🖼️ Reference Atlas & Sources
          </button>
        </div>

        {/* Studio Content Area */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'simulation' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Photorealistic Ultrasound Screen Canvas (7 cols) */}
              <div className="lg:col-span-7 flex flex-col space-y-4">
                <div className="h-[430px]">
                  <UltrasoundScreenCanvas
                    procedure={currentProcedure}
                    gainDb={gainDb}
                    tgc={tgc}
                    depthCm={depthCm}
                    frequencyMHz={frequencyMHz}
                    probeType={probeType}
                    mode={mode}
                    showOverlays={showOverlays}
                    needleState={needleState}
                    hydrodissectionPocket={hydrodissectionPocket}
                    patientModifiers={patientModifiers}
                    probePos={probePos}
                    isFrozen={isFrozen}
                  />
                </div>
                <UltrasoundMachineConsole
                  gainDb={gainDb}
                  setGainDb={setGainDb}
                  depthCm={depthCm}
                  setDepthCm={setDepthCm}
                  frequencyMHz={frequencyMHz}
                  setFrequencyMHz={setFrequencyMHz}
                  tgc={tgc}
                  setTgc={setTgc}
                  probeType={probeType}
                  setProbeType={setProbeType}
                  mode={mode}
                  setMode={setMode}
                  showOverlays={showOverlays}
                  setShowOverlays={setShowOverlays}
                  isFrozen={isFrozen}
                  setIsFrozen={setIsFrozen}
                />
              </div>

              {/* Right Column: Mouse Probe Positioner & Gamified Guide (5 cols) */}
              <div className="lg:col-span-5 flex flex-col space-y-4">
                <UltrasoundBodyPositioner
                  procedure={currentProcedure}
                  probePos={probePos}
                  setProbePos={setProbePos}
                  needleState={needleState}
                  setNeedleState={setNeedleState}
                  onInjectLocalAnesthetic={handleInjectLocalAnesthetic}
                  alignmentScore={alignmentScore}
                />
                <UltrasoundGuidePanel
                  procedure={currentProcedure}
                  gameScore={gameScore}
                  patientModifiers={patientModifiers}
                />
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="max-w-3xl mx-auto py-2">
              <UltrasoundGuidePanel
                procedure={currentProcedure}
                gameScore={gameScore}
                patientModifiers={patientModifiers}
              />
            </div>
          )}

          {activeTab === 'media_bank' && (
            <div className="max-w-5xl mx-auto py-2">
              <UltrasoundMediaBank
                onSelectProcedure={(procId) => {
                  setSelectedProcedureId(procId);
                  setActiveTab('simulation');
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
