import React, { useState } from 'react';
import { Activity, Dices, AlertTriangle, CheckCircle2, FileText, ArrowLeft, Play } from 'lucide-react';
import { calculateIBW } from '../../engine/Pharmacology';

export const CaseManager = ({ onStart }) => {
  const [activeTab, setActiveTab] = useState('random'); 
  const [stagedCase, setStagedCase] = useState(null); 

  // --- CUSTOM BUILDER STATE ---
  const [customForm, setCustomForm] = useState({
    name: 'Custom Scenario',
    age: 45, sex: 'male', weight: 80, height: 175,
    hr: 75, sys: 120, dia: 80, spo2: 99, rr: 14, temp: 37.0,
    mallampati: 1, neckMobility: 'normal', airwayBlood: false,
    obese: false, septic: false, trauma: false, copd: false, chf: false
  });

  const calculateDifficulty = (data) => {
    let score = 0;
    const bmi = data.weight / Math.pow(data.height / 100, 2);
    if (bmi > 35) score += 2;
    if (bmi > 45) score += 2;
    if (data.age > 70) score += 1;
    if (data.sys < 90 || data.sys > 160) score += 2;
    if (data.spo2 < 92) score += 3;
    if (data.mallampati > 2) score += (data.mallampati - 2) * 2;
    if (data.neckMobility === 'reduced') score += 2;
    if (data.airwayBlood) score += 5;
    
    if (data.septic) score += 4;
    if (data.trauma) score += 4;
    if (data.chf) score += 3;
    if (data.copd) score += 2;

    if (score <= 2) return { level: 'Easy', color: 'text-green-400', border: 'border-green-500' };
    if (score <= 6) return { level: 'Medium', color: 'text-yellow-400', border: 'border-yellow-500' };
    return { level: 'Hard', color: 'text-red-500', border: 'border-red-600' };
  };

  const generateBriefing = (data, levelStr) => {
    const bmi = data.weight / Math.pow(data.height / 100, 2);
    let pmhx = [];
    if (data.obese || bmi > 35) pmhx.push("Obesity");
    if (bmi > 40) pmhx.push("Morbid Obesity");
    if (data.copd) pmhx.push("Severe COPD/Asthma");
    if (data.chf) pmhx.push("Congestive Heart Failure (Reduced EF)");
    if (data.septic) pmhx.push("Sepsis / Vasoplegia");
    if (data.trauma) pmhx.push("Polytrauma / Hemorrhage");
    if (data.sys > 140 && !data.septic && !data.trauma) pmhx.push("Hypertension");

    const pmhxStr = pmhx.length > 0 ? pmhx.join(', ') : "None (ASA I. Healthy patient without systemic disease.)";

    let surgery = "Elective Procedure";
    if (data.trauma) surgery = "Emergency Exploratory Laparotomy (Level 1 Trauma)";
    else if (data.septic) surgery = "Emergency Bowel Resection (Perforated Viscus)";
    else if (levelStr === 'Medium') surgery = "Urgent Open Cholecystectomy";
    else if (levelStr === 'Easy') surgery = "Elective Inguinal Hernia Repair";

    let airway = `Mallampati Class ${['I', 'II', 'III', 'IV'][data.mallampati - 1]}. `;
    airway += data.neckMobility === 'reduced' ? "Severe C-spine restriction/rigidity noted. " : "Normal neck extension and ROM. ";
    if (data.airwayBlood) airway += "Active hemorrhage/secretions visible in the oropharynx. ";

    let rationale = "";
    if (levelStr === 'Easy') {
      rationale = "Reassuring baseline. Excellent physiological reserve. Patient is expected to tolerate induction agents well. Airway anatomy suggests straightforward direct laryngoscopy.";
    } else if (levelStr === 'Medium') {
      rationale = "Diminished physiological reserve. " + (pmhx.length > 0 ? `The presence of ${pmhx[0]} alters baseline hemodynamics and restricts compensation. ` : "") + "Requires careful titration of induction agents to prevent hypotension. Anticipate a potentially challenging airway requiring optimized positioning.";
    } else {
      rationale = "CRITICAL SCENARIO. High risk of peri-induction cardiac arrest. ";
      if (data.trauma) rationale += "Active hemorrhage depletes preload; induction will cause severe vasodilation resulting in profound shock. ";
      if (data.septic) rationale += "Vasoplegia is present; patient is highly dependent on endogenous catecholamines. ";
      if (data.mallampati > 2 || data.neckMobility === 'reduced') rationale += "Difficult airway is anticipated. Mask ventilation may be difficult and DL view may be obscured. ";
      if (bmi > 35) rationale += "Severe reduction in Functional Residual Capacity (FRC) guarantees highly accelerated oxygen desaturation during apnea. ";
    }

    return {
      hpi: `Patient is a ${data.age}yo ${data.sex === 'male' ? 'M' : 'F'} presenting to the OR for ${surgery}.`,
      pmhx: pmhxStr,
      airway: airway.trim(),
      vitals: `HR: ${data.hr} bpm | BP: ${data.sys}/${data.dia} mmHg | SpO2: ${data.spo2}% (Room Air) | RR: ${data.rr} | Temp: ${data.temp}°C`,
      rationale: rationale
    };
  };

  // UNIFIED CONSTRUCTOR: All cases MUST pass through here to get a Pre-Op Briefing
  const handleStageCase = (data, nameOverride, levelOverride) => {
    const ibw = calculateIBW(data.height, data.sex);
    const bmi = data.weight / Math.pow(data.height / 100, 2);
    const diff = calculateDifficulty(data);
    const finalLevel = levelOverride || diff.level;
    const briefing = generateBriefing(data, finalLevel);

    const newCase = {
      id: 'case-' + Date.now(),
      name: nameOverride || data.name,
      difficulty: finalLevel,
      description: briefing.hpi,
      preOpBriefing: briefing,
      baseVitals: { hr: data.hr, sys: data.sys, dia: data.dia, spo2: data.spo2, etco2: 0, rr: data.rr, temp: data.temp },
      patient: { 
        age: data.age, sex: data.sex, weight: Math.round(data.weight), height: data.height, ibw: ibw, bmi: bmi,
        oxygenBuffer: 21, targetBuffer: 21, 
        airwayBlood: data.airwayBlood, mallampati: data.mallampati, neckMobility: data.neckMobility,
        isObese: data.obese || bmi > 35, isSeptic: data.septic, trauma: data.trauma, copd: data.copd, chf: data.chf,
        ebv: data.weight * 70, ebl: data.trauma ? 800 : 0, 
        patientBaseSV: data.chf ? 45 : 70, patientBaseSVR: data.septic ? 600 : 1100 
      }
    };
    setStagedCase(newCase);
  };

  const generateRandom = (level) => {
    const isMale = Math.random() > 0.5;
    const height = isMale ? Math.floor(Math.random() * 20 + 165) : Math.floor(Math.random() * 20 + 150);
    const ibw = calculateIBW(height, isMale ? 'male' : 'female');
    
    let c = {
      age: Math.floor(Math.random() * 40 + 20),
      sex: isMale ? 'male' : 'female',
      height: height, 
      weight: Math.round(ibw + (Math.random() * 10)), 
      hr: Math.floor(Math.random() * 20 + 60), sys: 120, dia: 80, spo2: 99, rr: 12, temp: 37.0,
      mallampati: Math.random() > 0.8 ? 2 : 1, neckMobility: 'normal', airwayBlood: false,
      obese: false, septic: false, trauma: false, copd: false, chf: false
    };

    if (level === 'Medium') {
      c.age += 20;
      c.weight = Math.round(ibw + 20 + (Math.random() * 30)); 
      c.mallampati = Math.random() > 0.5 ? 2 : 3;
      c.sys = Math.floor(135 + Math.random() * 30);
      c.dia = Math.floor(85 + Math.random() * 15);
      c.copd = Math.random() > 0.5;
      c.spo2 = c.copd ? 94 : 98;
    } else if (level === 'Hard') {
      c.age = Math.floor(Math.random() * 30 + 55);
      c.weight = Math.round(ibw + 40 + (Math.random() * 50)); 
      c.mallampati = Math.random() > 0.5 ? 3 : 4;
      c.neckMobility = Math.random() > 0.7 ? 'reduced' : 'normal';
      
      const path = Math.random();
      if (path < 0.33) {
        c.septic = true; c.sys = 75; c.dia = 40; c.hr = 125; c.temp = 39.2;
      } else if (path < 0.66) {
        c.trauma = true; c.airwayBlood = true; c.sys = 85; c.dia = 50; c.hr = 135;
      } else {
        c.chf = true; c.copd = true; c.spo2 = 88; c.rr = 24; c.sys = 160; c.hr = 95;
      }
    }
    
    // Funnels directly to stage constructor
    handleStageCase(c, `${level} Emergency Scenario`, level);
  };

  const currDiff = calculateDifficulty(customForm);

  if (stagedCase) {
    const b = stagedCase.preOpBriefing;
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-3xl flex flex-col gap-6 text-white font-mono animate-in slide-in-from-bottom-4">
        <div className="flex justify-between items-center border-b border-slate-700 pb-4">
          <h2 className="text-3xl font-black text-blue-400 flex items-center gap-3"><FileText size={28}/> Pre-Op Briefing (EMR)</h2>
          <span className={`px-3 py-1 rounded border font-bold text-xs ${stagedCase.difficulty === 'Easy' ? 'bg-green-950 border-green-500 text-green-400' : stagedCase.difficulty === 'Medium' ? 'bg-yellow-950 border-yellow-500 text-yellow-400' : 'bg-red-950 border-red-500 text-red-400'}`}>
            {stagedCase.difficulty} Case
          </span>
        </div>

        <div className="flex flex-col gap-4 bg-slate-950/50 p-4 rounded-lg border border-slate-800">
          <div>
            <h3 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-1">History of Present Illness</h3>
            <p className="text-slate-200 text-sm">{b.hpi}</p>
          </div>
          <div>
            <h3 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-1">Past Medical History</h3>
            <p className="text-slate-200 text-sm">{b.pmhx}</p>
          </div>
          <div>
            <h3 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-1">Baseline Vitals</h3>
            <p className="text-cyan-300 font-bold text-sm bg-cyan-950/30 p-2 rounded border border-cyan-900/50">{b.vitals}</p>
          </div>
          <div>
            <h3 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-1">Airway Exam</h3>
            <p className="text-yellow-200 text-sm border-l-2 border-yellow-500 pl-2">{b.airway}</p>
          </div>
        </div>

        <div className="bg-purple-950/30 border border-purple-900/50 p-4 rounded-lg">
          <h3 className="text-purple-400 font-bold uppercase tracking-widest text-xs mb-1">Attending Anesthesiologist Rationale</h3>
          <p className="text-purple-200 text-sm italic">"{b.rationale}"</p>
        </div>

        <div className="flex justify-between pt-4 border-t border-slate-800 mt-2">
          <button onClick={() => setStagedCase(null)} className="px-6 py-2 rounded font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition flex items-center gap-2">
            <ArrowLeft size={16}/> Back
          </button>
          <button onClick={() => onStart(stagedCase)} className="px-8 py-2 rounded font-black text-white bg-blue-600 hover:bg-blue-500 transition shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center gap-2">
            Proceed to OR <Play size={16}/>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-4xl flex flex-col gap-6 text-white font-mono">
      <div className="flex justify-between items-center border-b border-slate-700 pb-4">
        <h2 className="text-3xl font-black text-cyan-400 flex items-center gap-3"><Activity size={28}/> Clinical Case Engine</h2>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('random')} className={`px-4 py-2 font-bold rounded ${activeTab === 'random' ? 'bg-cyan-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Randomizer</button>
          <button onClick={() => setActiveTab('custom')} className={`px-4 py-2 font-bold rounded ${activeTab === 'custom' ? 'bg-cyan-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Custom Builder</button>
        </div>
      </div>

      {activeTab === 'random' ? (
        <div className="flex flex-col gap-6 items-center py-8">
          <Dices size={48} className="text-slate-500 mb-2" />
          <p className="text-slate-300 text-center max-w-lg mb-4">Instantly generate a highly realistic clinical scenario. Pathologies, hemodynamics, and airway morphometrics are mathematically linked to provide true-to-life clinical challenges.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
             <button onClick={() => generateRandom('Easy')} className="bg-green-950/40 hover:bg-green-900/60 border-2 border-green-700 p-6 rounded-xl flex flex-col items-center gap-2 transition-all hover:scale-105">
                <CheckCircle2 size={32} className="text-green-500"/>
                <span className="font-black text-green-400 text-xl tracking-widest">EASY</span>
                <span className="text-xs text-green-200/50 text-center">Healthy baseline. Optimal airway. Elective surgery.</span>
             </button>
             <button onClick={() => generateRandom('Medium')} className="bg-yellow-950/40 hover:bg-yellow-900/60 border-2 border-yellow-700 p-6 rounded-xl flex flex-col items-center gap-2 transition-all hover:scale-105">
                <AlertTriangle size={32} className="text-yellow-500"/>
                <span className="font-black text-yellow-400 text-xl tracking-widest">MEDIUM</span>
                <span className="text-xs text-yellow-200/50 text-center">Mild systemic disease. Obesity or controlled HTN.</span>
             </button>
             <button onClick={() => generateRandom('Hard')} className="bg-red-950/40 hover:bg-red-900/60 border-2 border-red-700 p-6 rounded-xl flex flex-col items-center gap-2 transition-all hover:scale-105">
                <Activity size={32} className="text-red-500"/>
                <span className="font-black text-red-500 text-xl tracking-widest">HARD</span>
                <span className="text-xs text-red-200/50 text-center">Severe pathology. Trauma, Sepsis, or CHF. Difficult airway.</span>
             </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Demographics */}
            <div className="flex flex-col gap-3 bg-slate-950/50 p-4 rounded border border-slate-800">
               <h3 className="text-cyan-500 font-bold border-b border-slate-700 pb-1 uppercase tracking-widest text-xs">Demographics</h3>
               <div className="flex flex-col gap-1">
                 <label className="text-[10px] text-slate-400 uppercase">Age (yrs)</label>
                 <input type="number" value={customForm.age} onChange={e => setCustomForm({...customForm, age: Number(e.target.value)})} className="bg-slate-800 text-white p-1.5 rounded outline-none border border-slate-700 focus:border-cyan-500 text-sm" />
               </div>
               <div className="flex flex-col gap-1">
                 <label className="text-[10px] text-slate-400 uppercase">Sex</label>
                 <select value={customForm.sex} onChange={e => setCustomForm({...customForm, sex: e.target.value})} className="bg-slate-800 text-white p-1.5 rounded outline-none border border-slate-700 text-sm">
                   <option value="male">Male</option><option value="female">Female</option>
                 </select>
               </div>
               
               <div className="grid grid-cols-2 gap-2 w-full">
                 <div className="flex flex-col gap-1 min-w-0 w-full">
                   <label className="text-[10px] text-slate-400 uppercase">Height (cm)</label>
                   <input type="number" value={customForm.height} onChange={e => setCustomForm({...customForm, height: Number(e.target.value)})} className="w-full bg-slate-800 text-white p-1.5 rounded outline-none border border-slate-700 focus:border-cyan-500 text-sm" />
                 </div>
                 <div className="flex flex-col gap-1 min-w-0 w-full">
                   <label className="text-[10px] text-slate-400 uppercase">Weight (kg)</label>
                   <input type="number" value={customForm.weight} onChange={e => setCustomForm({...customForm, weight: Number(e.target.value)})} className="w-full bg-slate-800 text-white p-1.5 rounded outline-none border border-slate-700 focus:border-cyan-500 text-sm" />
                 </div>
               </div>
            </div>

            {/* Baseline Vitals */}
            <div className="flex flex-col gap-3 bg-slate-950/50 p-4 rounded border border-slate-800">
               <h3 className="text-green-500 font-bold border-b border-slate-700 pb-1 uppercase tracking-widest text-xs">Baseline Vitals</h3>
               <div className="grid grid-cols-2 gap-2">
                 <div className="flex flex-col gap-1">
                   <label className="text-[10px] text-slate-400 uppercase">Heart Rate</label>
                   <input type="number" value={customForm.hr} onChange={e => setCustomForm({...customForm, hr: Number(e.target.value)})} className="bg-slate-800 text-white p-1.5 rounded outline-none border border-slate-700 focus:border-green-500 text-sm" />
                 </div>
                 <div className="flex flex-col gap-1">
                   <label className="text-[10px] text-slate-400 uppercase">SpO2 (%)</label>
                   <input type="number" value={customForm.spo2} onChange={e => setCustomForm({...customForm, spo2: Number(e.target.value)})} className="bg-slate-800 text-white p-1.5 rounded outline-none border border-slate-700 focus:border-green-500 text-sm" />
                 </div>
                 <div className="flex flex-col gap-1">
                   <label className="text-[10px] text-slate-400 uppercase">Systolic BP</label>
                   <input type="number" value={customForm.sys} onChange={e => setCustomForm({...customForm, sys: Number(e.target.value)})} className="bg-slate-800 text-white p-1.5 rounded outline-none border border-slate-700 focus:border-green-500 text-sm" />
                 </div>
                 <div className="flex flex-col gap-1">
                   <label className="text-[10px] text-slate-400 uppercase">Diastolic BP</label>
                   <input type="number" value={customForm.dia} onChange={e => setCustomForm({...customForm, dia: Number(e.target.value)})} className="bg-slate-800 text-white p-1.5 rounded outline-none border border-slate-700 focus:border-green-500 text-sm" />
                 </div>
               </div>
            </div>

            {/* Pathologies & Airway */}
            <div className="flex flex-col gap-3 bg-slate-950/50 p-4 rounded border border-slate-800">
               <h3 className="text-yellow-500 font-bold border-b border-slate-700 pb-1 uppercase tracking-widest text-xs">Airway & Pathologies</h3>
               <div className="grid grid-cols-2 gap-2">
                 <div className="flex flex-col gap-1">
                   <label className="text-[10px] text-slate-400 uppercase">Mallampati</label>
                   <select value={customForm.mallampati} onChange={e => setCustomForm({...customForm, mallampati: Number(e.target.value)})} className="bg-slate-800 text-white p-1.5 rounded outline-none border border-slate-700 text-sm">
                     <option value={1}>Class I</option><option value={2}>Class II</option><option value={3}>Class III</option><option value={4}>Class IV</option>
                   </select>
                 </div>
                 <div className="flex flex-col gap-1">
                   <label className="text-[10px] text-slate-400 uppercase">Neck Mobility</label>
                   <select value={customForm.neckMobility} onChange={e => setCustomForm({...customForm, neckMobility: e.target.value})} className="bg-slate-800 text-white p-1.5 rounded outline-none border border-slate-700 text-sm">
                     <option value="normal">Normal</option><option value="reduced">Reduced / C-Collar</option>
                   </select>
                 </div>
               </div>
               
               <div className="grid grid-cols-2 gap-2 mt-2">
                 <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                   <input type="checkbox" checked={customForm.airwayBlood} onChange={e => setCustomForm({...customForm, airwayBlood: e.target.checked})} className="accent-red-500" /> Airway Blood
                 </label>
                 <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                   <input type="checkbox" checked={customForm.septic} onChange={e => setCustomForm({...customForm, septic: e.target.checked})} className="accent-red-500" /> Sepsis
                 </label>
                 <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                   <input type="checkbox" checked={customForm.trauma} onChange={e => setCustomForm({...customForm, trauma: e.target.checked})} className="accent-red-500" /> Major Trauma
                 </label>
                 <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                   <input type="checkbox" checked={customForm.copd} onChange={e => setCustomForm({...customForm, copd: e.target.checked})} className="accent-red-500" /> COPD / Asthma
                 </label>
                 <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                   <input type="checkbox" checked={customForm.chf} onChange={e => setCustomForm({...customForm, chf: e.target.checked})} className="accent-red-500" /> CHF
                 </label>
                 <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                   <input type="checkbox" checked={customForm.obese} onChange={e => setCustomForm({...customForm, obese: e.target.checked})} className="accent-red-500" /> Morbid Obesity
                 </label>
               </div>
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-950 p-4 border border-slate-700 rounded-lg">
             <div className="flex flex-col">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Calculated Difficulty</span>
                <span className={`text-2xl font-black uppercase tracking-widest ${currDiff.color}`}>{currDiff.level}</span>
             </div>
             <button onClick={() => handleStageCase(customForm)} className={`px-12 py-4 rounded-xl font-black text-xl bg-slate-900 border-2 ${currDiff.border} ${currDiff.color} hover:bg-slate-800 transition shadow-lg`}>
               STAGE SCENARIO
             </button>
          </div>
        </div>
      )}
    </div>
  );
};