import { useState } from 'react';
import { Zap, Activity, History } from 'lucide-react';
import { parseAndRenderText } from '../../engine/ClinicalActions';

// Mapping of clinical alert keywords to user-friendly titles
const ALERT_MAP = [
  { keywords: ['cerebral perfusion', 'cpp'], name: 'Cerebral Perfusion Pressure (CPP) < 50 mmHg', id: 'cpp' },
  { keywords: ['aortocaval compression'], name: 'Aortocaval Compression', id: 'aortocaval' },
  { keywords: ['upper airway obstruction', 'genioglossus', 'pharyngeal patency', 'snoring/obstructed'], name: 'Upper Airway Obstruction', id: 'airway_obs' },
  { keywords: ['laryngospasm'], name: 'Laryngospasm', id: 'laryngospasm' },
  { keywords: ['bronchospasm'], name: 'Bronchospasm', id: 'bronchospasm' },
  { keywords: ['lethal triad'], name: 'Lethal Triad of Trauma', id: 'lethal_triad' },
  { keywords: ['acute kidney injury', 'aki', 'creatinine has risen'], name: 'Acute Kidney Injury (AKI)', id: 'aki' },
  { keywords: ['ureteral obstruction'], name: 'Ureteral Obstruction', id: 'ureteral_obs' },
  { keywords: ['delayed respiratory depression', 'it morphine'], name: 'Delayed Respiratory Depression (IT Morphine)', id: 'it_morphine_resp' },
  { keywords: ['high spinal', 'phrenic nerve block', 'total spinal'], name: 'High/Total Spinal Anesthetic', id: 'high_spinal' },
  { keywords: ['pediatric bradycardia'], name: 'Pediatric Bradycardia', id: 'ped_brady' },
  { keywords: ['tension pneumothorax'], name: 'Tension Pneumothorax', id: 'pneumothorax' },
  { keywords: ['fluid overload', 'alveolar fluid'], name: 'Fluid Overload Pulmonary Edema', id: 'fluid_overload' },
  { keywords: ['propofol infusion syndrome', 'pris'], name: 'Propofol Infusion Syndrome (PRIS)', id: 'pris' },
  { keywords: ['emergence delirium'], name: 'Emergence Delirium', id: 'emergence_delirium' },
  { keywords: ['anaphylactic', 'anaphylaxis'], name: 'Anaphylactic Shock', id: 'anaphylaxis' },
  { keywords: ['post-extubation stridor', 'laryngeal edema'], name: 'Post-Extubation Laryngeal Edema/Stridor', id: 'stridor' },
  { keywords: ['co2 absorbent'], name: 'CO2 Absorbent Exhausted', id: 'co2_absorbent' },
  { keywords: ['turp syndrome'], name: 'TURP Syndrome', id: 'turp' },
  { keywords: ['uterine atony', 'postpartum hemorrhage'], name: 'Uterine Atony / Postpartum Hemorrhage', id: 'uterine_atony' },
  { keywords: ['fetal bradycardia', 'decelerations'], name: 'Fetal Bradycardia', id: 'fetal_brady' },
  { keywords: ['wooden chest', 'chest wall rigidity'], name: 'Opioid-Induced Chest Wall Rigidity', id: 'wooden_chest' },
  { keywords: ['sphincter of oddi'], name: 'Sphincter of Oddi Spasm', id: 'sphincter_oddi' },
  { keywords: ['pruritus', 'facial itching'], name: 'Opioid-Induced Pruritus', id: 'pruritus' },
  { keywords: ['urinary retention'], name: 'Urinary Retention', id: 'urinary_retention' },
  { keywords: ['autonomic dysreflexia'], name: 'Autonomic Dysreflexia', id: 'autonomic_dysreflexia' },
  { keywords: ['pulmonary embolism'], name: 'Pulmonary Embolism', id: 'pe' },
  { keywords: ['dlt malposition'], name: 'DLT Malposition', id: 'dlt_malposition' },
  { keywords: ['regurgitation', 'regurgitated'], name: 'Gastric Regurgitation', id: 'regurgitation' },
  { keywords: ['aspiration', 'aspirated'], name: 'Gastric Aspiration', id: 'aspiration' },
  // ── Critical crises — previously missing from ALERT_MAP ────────────────────
  { keywords: ['malignant hyperthermia', 'mh crisis', 'mh trigger', 'dantrolene'], name: 'Malignant Hyperthermia (MH)', id: 'mh' },
  { keywords: ['thyroid storm', 'thyrotoxic crisis'], name: 'Thyroid Storm', id: 'thyroid_storm' },
  { keywords: ['adrenal crisis', 'adrenocortical insufficiency', 'stress-dose steroid'], name: 'Adrenal Crisis', id: 'adrenal_crisis' },
  { keywords: ['serotonin syndrome', 'maoi', 'hypertensive crisis from maoi'], name: 'Serotonin Syndrome / MAOI Crisis', id: 'serotonin_syndrome' },
  { keywords: ['local anesthetic systemic toxicity', 'last', 'intralipid', 'bupivacaine toxicity', 'cardiac toxicity from local'], name: 'Local Anesthetic Systemic Toxicity (LAST)', id: 'last' },
  { keywords: ['venous air embolism', 'air embolism', 'mill-wheel murmur', 'vae', 'intracardiac air'], name: 'Venous Air Embolism (VAE)', id: 'vae' },
  { keywords: ['amniotic fluid embolism', 'afe', 'anaphylactoid syndrome of pregnancy'], name: 'Amniotic Fluid Embolism (AFE)', id: 'afe' },
  { keywords: ['carcinoid crisis', 'carcinoid'], name: 'Carcinoid Crisis', id: 'carcinoid' },
  { keywords: ['bone cement', 'bcis', 'cement implantation syndrome'], name: 'Bone Cement Implantation Syndrome (BCIS)', id: 'bcis' },
  { keywords: ['hyperkalemia', 'potassium', 'peaked t wave'], name: 'Hyperkalemia', id: 'hyperkalemia' },
  { keywords: ['hypoglycemia', 'blood glucose below', 'glucose < 50', 'loss of consciousness from glucose'], name: 'Hypoglycemia', id: 'hypoglycemia' },
  { keywords: ['hypocalcemia', 'ionized calcium', 'citrate', 'tetany', 'trousseau'], name: 'Hypocalcemia', id: 'hypocalcemia' },
  { keywords: ['masseter muscle rigidity', 'trismus'], name: 'Masseter Muscle Rigidity (MH Prodrome)', id: 'mmr' },
  { keywords: ['neuroleptic malignant syndrome', 'nms'], name: 'Neuroleptic Malignant Syndrome (NMS)', id: 'nms' },
  { keywords: ['trali', 'transfusion-related acute lung injury'], name: 'TRALI', id: 'trali' },
  { keywords: ['taco', 'transfusion-associated circulatory overload'], name: 'TACO', id: 'taco' },
  { keywords: ['disseminated intravascular coagulation', 'dic', 'consumptive coagulopathy'], name: 'DIC', id: 'dic' },
  { keywords: ['fat embolism', 'fat embolism syndrome'], name: 'Fat Embolism Syndrome', id: 'fat_embolism' },
  { keywords: ['negative pressure pulmonary edema', 'post-obstruction pulmonary edema'], name: 'Negative Pressure Pulmonary Edema', id: 'nppe' },
  { keywords: ['awareness', 'patient reported awareness', 'intraoperative recall'], name: 'Intraoperative Awareness', id: 'awareness' },
  { keywords: ['high spinal', 'total spinal', 'cardiac accelerator'], name: 'High/Total Spinal', id: 'high_spinal_ext' },
  { keywords: ['phrenic nerve', 'hemidiaphragm paralysis'], name: 'Phrenic Nerve Palsy (Hemidiaphragm)', id: 'phrenic' },
];

// Helper to convert "MM:SS" to total seconds
const parseTimeToSeconds = (timeStr) => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10);
    const secs = parseInt(parts[1], 10);
    if (!isNaN(mins) && !isNaN(secs)) {
      return mins * 60 + secs;
    }
  }
  return 0;
};

// Parser to split logs into active issues and summary timelines
const processLogs = (logs) => {
  const activeAlerts = {};
  const timelineSummary = [];
  const rawTimeline = [];
  const lastAlertLoggedTime = {};

  // Process oldest → newest so the MOST RECENT event wins for each alert.
  // (Iterating newest→oldest caused resolved events to be processed first, then the
  //  older trigger event would re-add the alert — keeping "active" after resolution.)
  for (let i = 0; i < logs.length; i++) {
    const rawLog = logs[i];
    const logStr = typeof rawLog === 'string' ? rawLog : String(rawLog || '');
    
    const dashIndex = logStr.indexOf(' - ');
    let timeStr = '00:00';
    let content = logStr;
    if (dashIndex !== -1) {
      timeStr = logStr.substring(0, dashIndex).trim();
      content = logStr.substring(dashIndex + 3).trim();
    }
    
    const timeSec = parseTimeToSeconds(timeStr);
    const matchedAlert = ALERT_MAP.find(alert => 
      alert.keywords.some(keyword => content.toLowerCase().includes(keyword))
    );
    
    let isAlert = false;
    let isResolution = false;
    const isAttending = content.includes('[STATUS]') && content.includes('[FORECAST]');
    
    if (matchedAlert) {
      const isCritical = content.includes('🚨') || content.toLowerCase().includes('critical') || content.toLowerCase().includes('emergency');
      const isWarning = content.includes('⚠️') || content.toLowerCase().includes('warning') || content.toLowerCase().includes('alert');
      isAlert = isCritical || isWarning;
      isResolution = content.includes('✅') || content.toLowerCase().includes('resolved') || content.toLowerCase().includes('recovered') || content.toLowerCase().includes('broken') || content.toLowerCase().includes('relieved');
      
      if (isAlert) {
        activeAlerts[matchedAlert.id] = {
          timeStr,
          msg: content,
          name: matchedAlert.name,
          severity: isCritical ? 'critical' : 'warning'
        };
        
        const lastTime = lastAlertLoggedTime[matchedAlert.id];
        if (lastTime === undefined || (timeSec - lastTime) > 20) {
          timelineSummary.push({ timeStr, logStr, content, type: 'alert', alertId: matchedAlert.id, severity: isCritical ? 'critical' : 'warning' });
          lastAlertLoggedTime[matchedAlert.id] = timeSec;
        }
      } else if (isResolution) {
        delete activeAlerts[matchedAlert.id];
        
        const lastTime = lastAlertLoggedTime[matchedAlert.id];
        if (lastTime !== undefined && (timeSec - lastTime) > 20) {
          timelineSummary.push({ timeStr, logStr, content, type: 'resolution', alertId: matchedAlert.id });
          lastAlertLoggedTime[matchedAlert.id] = timeSec;
        }
      }
    }
    
    if (!matchedAlert) {
      if (isAttending) {
        timelineSummary.push({ timeStr, logStr, content, type: 'attending' });
      } else {
        timelineSummary.push({ timeStr, logStr, content, type: 'normal' });
      }
    }
    
    rawTimeline.push({ timeStr, logStr, content, isAttending });
  }

  // Reverse so newest displays at the top
  timelineSummary.reverse();
  rawTimeline.reverse();

  return {
    activeAlerts: Object.values(activeAlerts),
    timelineSummary,
    rawTimeline
  };
};

export const LogPanel = ({ logs = [], onActionClick }) => {
  const [tab, setTab] = useState('summary');
  const safeLogs = Array.isArray(logs) ? logs : [];
  
  const { activeAlerts, timelineSummary, rawTimeline } = processLogs(safeLogs);

  return (
    <div className="col-span-1 glass-panel glass-amber p-4 flex flex-col min-h-[550px] max-h-[800px] shadow-2xl transition-all duration-300">
      {/* Title Header */}
      <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
        <h3 className="text-amber-450 font-black flex items-center gap-2 uppercase tracking-widest text-xs font-mono">
          <Zap size={14}/> Clinical Log & Monitor
        </h3>
      </div>

      {/* Active Clinical Conditions (Top Card) */}
      {activeAlerts.length > 0 ? (
        <div className="bg-red-950/20 border border-red-900/30 rounded-lg p-3 mb-3 shadow-lg transition-all duration-300">
          <div className="flex items-center gap-2 border-b border-red-900/20 pb-1.5 mb-2 relative">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-ping absolute" />
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[10px] text-red-450 font-bold font-mono uppercase tracking-wider pl-3">
              Active Issues ({activeAlerts.length})
            </span>
          </div>
          <div className="space-y-1.5 max-h-[110px] overflow-y-auto custom-scrollbar">
            {activeAlerts.map((alert, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-[11px] font-mono leading-relaxed">
                <span className="text-red-400 font-bold">[{alert.timeStr}]</span>
                <span className="text-slate-200">{alert.name}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-emerald-950/10 border border-emerald-900/25 rounded-lg p-2.5 mb-3 shadow-inner transition-all duration-300">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-emerald-450 font-bold font-mono uppercase tracking-wider">
            Physiology Stable
          </span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex bg-slate-950/40 rounded-lg p-0.5 border border-white/5 mb-3">
        <button
          onClick={() => setTab('summary')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold font-mono uppercase tracking-wider rounded-md transition-all duration-300 ${
            tab === 'summary'
              ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 shadow-sm'
              : 'border border-transparent text-slate-450 hover:text-slate-250'
          }`}
        >
          <Activity size={10} /> Summary Timeline
        </button>
        <button
          onClick={() => setTab('raw')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold font-mono uppercase tracking-wider rounded-md transition-all duration-300 ${
            tab === 'raw'
              ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 shadow-sm'
              : 'border border-transparent text-slate-450 hover:text-slate-250'
          }`}
        >
          <History size={10} /> Full Log ({safeLogs.length})
        </button>
      </div>

      {/* Log Feed Display */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
        {tab === 'summary' ? (
          timelineSummary.length > 0 ? (
            timelineSummary.map((item, index) => {
              if (item.type === 'attending') {
                const parts = item.logStr.split('\n');
                const timeStr = parts[0] ? (parts[0].split('-')[0] || '').trim() : '';
                const statusStr = parts[1] ? parts[1].replace('[STATUS]', '').trim() : '';
                const forecastStr = parts[2] ? parts[2].replace('[FORECAST]', '').trim() : '';
                
                return (
                  <div key={index} className="flex flex-col gap-1.5 bg-amber-950/15 border border-amber-900/30 rounded-lg p-2.5 my-1.5 shadow-sm">
                    <div className="text-[10px] text-amber-400 font-bold border-b border-amber-900/20 pb-1 mb-1 font-mono">
                      {timeStr} - ATTENDING CONSULT
                    </div>
                    <div className="text-[11px] text-slate-200">
                      <span className="font-extrabold text-[9px] text-white bg-slate-800 px-1 py-0.5 rounded mr-1 font-mono uppercase">STATUS</span>{' '}
                      {parseAndRenderText(statusStr, onActionClick)}
                    </div>
                    <div className="text-[11px] text-amber-200">
                      <span className="font-extrabold text-[9px] text-white bg-amber-900 px-1 py-0.5 rounded mr-1 font-mono uppercase">FORECAST</span>{' '}
                      {parseAndRenderText(forecastStr, onActionClick)}
                    </div>
                  </div>
                );
              }

              let borderClass = 'border-l border-white/5 pl-2.5 py-0.5';
              let textClass = 'text-[11px] text-slate-400';
              
              if (item.type === 'alert') {
                borderClass = item.severity === 'critical' 
                  ? 'border-l-2 border-red-500 pl-2.5 py-0.5 bg-red-950/5 rounded-r' 
                  : 'border-l-2 border-amber-500 pl-2.5 py-0.5 bg-amber-950/5 rounded-r';
                textClass = 'text-[11px] text-slate-200 font-medium';
              } else if (item.type === 'resolution') {
                borderClass = 'border-l-2 border-emerald-500 pl-2.5 py-0.5 bg-emerald-950/5 rounded-r';
                textClass = 'text-[11px] text-slate-350';
              } else if (index === 0) {
                borderClass = 'border-l-2 border-amber-450 pl-2.5 py-0.5 bg-white/[0.02] rounded-r';
                textClass = 'text-[12px] text-white font-extrabold';
              }

              return (
                <div key={index} className={`${borderClass} ${textClass} leading-relaxed`}>
                  {parseAndRenderText(item.logStr, onActionClick)}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-slate-500 italic text-[11px] font-mono">
              No summary events recorded yet.
            </div>
          )
        ) : (
          rawTimeline.length > 0 ? (
            rawTimeline.map((item, index) => {
              if (item.isAttending) {
                const parts = item.logStr.split('\n');
                const timeStr = parts[0] ? (parts[0].split('-')[0] || '').trim() : '';
                const statusStr = parts[1] ? parts[1].replace('[STATUS]', '').trim() : '';
                const forecastStr = parts[2] ? parts[2].replace('[FORECAST]', '').trim() : '';
                
                return (
                  <div key={index} className="flex flex-col gap-1.5 bg-amber-950/15 border border-amber-900/30 rounded-lg p-2.5 my-1.5 shadow-sm">
                    <div className="text-[10px] text-amber-400 font-bold border-b border-amber-900/20 pb-1 mb-1 font-mono">
                      {timeStr} - ATTENDING CONSULT
                    </div>
                    <div className="text-[11px] text-slate-200">
                      <span className="font-extrabold text-[9px] text-white bg-slate-800 px-1 py-0.5 rounded mr-1 font-mono uppercase">STATUS</span>{' '}
                      {parseAndRenderText(statusStr, onActionClick)}
                    </div>
                    <div className="text-[11px] text-amber-200">
                      <span className="font-extrabold text-[9px] text-white bg-amber-900 px-1 py-0.5 rounded mr-1 font-mono uppercase">FORECAST</span>{' '}
                      {parseAndRenderText(forecastStr, onActionClick)}
                    </div>
                  </div>
                );
              }

              const borderClass = index === 0 
                ? 'border-l-2 border-amber-450 pl-2.5 py-0.5 bg-white/[0.02] rounded-r' 
                : 'border-l border-white/5 pl-2.5 py-0.5';
              const textClass = index === 0 
                ? 'text-[12px] text-white font-extrabold' 
                : 'text-[11px] text-slate-400';

              return (
                <div key={index} className={`${borderClass} ${textClass} leading-relaxed`}>
                  {parseAndRenderText(item.logStr, onActionClick)}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-slate-500 italic text-[11px] font-mono">
              Log feed is empty.
            </div>
          )
        )}
      </div>
    </div>
  );
};