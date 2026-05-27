import React, { useState, useEffect, useRef } from 'react';
import { 
  X, AlertTriangle, HelpCircle, Shield, Award, Clock, ArrowRight, 
  Play, CheckCircle2, Activity, FileCode, CheckSquare, Settings
} from 'lucide-react';
import { evaluateFidelity } from '../../engine/FidelityOracle';
import { getRandomFuzzAction, executeFuzzAction, generateFidelityReport } from '../../engine/FidelityFuzzer';

export default function FidelityPanel({
  isOpen,
  setIsOpen,
  vitals,
  patient,
  activeMeds,
  gasSettings,
  ventSettings,
  surgicalPhase,
  electrolytes,
  coags,
  time,
  setPatient,
  handleProcessMed,
  handlePushMed,
  handlePushFluid,
  handleSetVentSettings,
  logEvent
}) {
  const [auditResult, setAuditResult] = useState(null);
  const [isFuzzing, setIsFuzzing] = useState(false);
  const [fuzzProgress, setFuzzProgress] = useState(0);
  const [fuzzLogs, setFuzzLogs] = useState([]);
  const [fuzzAnomalies, setFuzzAnomalies] = useState([]);
  const [fuzzHistory, setFuzzHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('live'); // 'live' or 'fuzzer'

  // Web3Forms Bug Report Submission States
  const [testerName, setTesterName] = useState('');
  const [testerNotes, setTesterNotes] = useState('');
  const [submitStatus, setSubmitStatus] = useState('idle'); // 'idle' | 'sending' | 'success' | 'error'
  const [submitError, setSubmitError] = useState('');
  const [accessKey, setAccessKey] = useState(() => {
    return localStorage.getItem('web3forms_key') || 'e2175b71-5996-4f82-b55f-cf76fcca8255';
  });
  const [showSettings, setShowSettings] = useState(false);

  // Ref to hold the current active state variables so the fuzzer can read them dynamically
  const currentStateRef = useRef();
  useEffect(() => {
    currentStateRef.current = {
      vitals, patient, activeMeds, gasSettings, ventSettings, surgicalPhase, electrolytes, coags, time
    };
  }, [vitals, patient, activeMeds, gasSettings, ventSettings, surgicalPhase, electrolytes, coags, time]);

  // Execute Live Physiology Audit
  const handleLiveAudit = () => {
    const state = currentStateRef.current;
    const result = evaluateFidelity(state);
    setAuditResult(result);
    // Reset submission state on new audit
    setSubmitStatus('idle');
    setSubmitError('');
  };

  const handleSaveSettings = (newKey) => {
    setAccessKey(newKey);
    localStorage.setItem('web3forms_key', newKey);
    setShowSettings(false);
  };

  const handleSubmitReport = async () => {
    if (submitStatus === 'sending') return;
    if (!testerName.trim()) {
      setSubmitStatus('error');
      setSubmitError('Please enter your name or title first.');
      return;
    }

    setSubmitStatus('sending');
    setSubmitError('');

    try {
      const isLive = activeTab === 'live';
      const anomalies = isLive ? (auditResult?.anomalies || []) : fuzzAnomalies;
      const history = isLive ? [] : fuzzHistory;
      
      const reportMd = generateFidelityReport(anomalies, history, patient);

      // Append beta tester comments and name to the report text
      let fullMessage = `### Beta Tester Feedback Details\n`;
      fullMessage += `- **Beta Tester**: ${testerName}\n`;
      fullMessage += `- **Tester Notes**: ${testerNotes || 'No notes provided'}\n\n`;
      fullMessage += reportMd;

      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          access_key: accessKey === 'YOUR_ACCESS_KEY_HERE' ? '4638d21b-db22-48f8-8bb0-0fb7a149b1ff' : accessKey,
          subject: `🔬 Airway Sim Anomaly: ${anomalies[0]?.rule || 'Fidelity Anomaly'} (${patient.name || 'Standard Patient'})`,
          from_name: `${testerName} (Airway Beta Tester)`,
          message: fullMessage
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSubmitStatus('success');
        setTesterNotes('');
        logEvent(`🔬 clinical fidelity report uploaded to developer successfully.`);
      } else {
        throw new Error(data.message || 'API submission rejected by Web3Forms.');
      }
    } catch (err) {
      setSubmitStatus('error');
      setSubmitError(err.message || 'Network error occurred during submission.');
    }
  };

  // Run the Automated State-Space Fuzzer (50 accelerated ticks in sequence)
  const runFuzzTest = () => {
    if (isFuzzing) return;
    
    setIsFuzzing(true);
    setFuzzProgress(0);
    setFuzzLogs(['🚀 Initiating head-free State-Space Fuzzing Stress Test...', 'Cloning baseline physiological states...']);
    setFuzzAnomalies([]);
    
    const localHistory = [];
    const localAnomalies = [];
    let tickCount = 0;
    const totalTicks = 50;

    // Run action ticks rapidly in a 100ms interval loop
    const fuzzInterval = setInterval(() => {
      tickCount++;
      setFuzzProgress(Math.round((tickCount / totalTicks) * 100));

      const activeState = currentStateRef.current;
      const action = getRandomFuzzAction();
      
      // Execute the random action in the real simulator loop
      const actionText = executeFuzzAction(action, {
        setPatient,
        handleProcessMed,
        handlePushMed,
        handlePushFluid,
        handleSetVentSettings,
        logEvent,
        patient: activeState.patient
      });

      // Allow 50ms for React state to cycle, then audit the resulting state
      setTimeout(() => {
        const updatedState = currentStateRef.current;
        const audit = evaluateFidelity(updatedState);

        // Record step telemetry
        const stepRecord = {
          tick: tickCount,
          actionText,
          vitals: { ...updatedState.vitals },
          electrolytes: { ...updatedState.electrolytes },
          patient: { ...updatedState.patient }
        };
        localHistory.push(stepRecord);

        // Collect new anomalies
        if (audit.anomalies.length > 0) {
          audit.anomalies.forEach(anomaly => {
            const exists = localAnomalies.some(a => a.rule === anomaly.rule);
            if (!exists) {
              localAnomalies.push(anomaly);
              setFuzzAnomalies(prev => [...prev, anomaly]);
              setFuzzLogs(prev => [`🚨 INCONSISTENCY IN "${anomaly.rule}": ${anomaly.message}`, ...prev]);
            }
          });
        }

        setFuzzLogs(prev => [`Step ${tickCount}/${totalTicks}: ${actionText}`, ...prev]);
      }, 50);

      if (tickCount >= totalTicks) {
        clearInterval(fuzzInterval);
        setTimeout(() => {
          setIsFuzzing(false);
          setFuzzHistory(localHistory);
          setFuzzLogs(prev => [
            `🏁 Stress test completed. Ticks run: ${totalTicks}. Unique clinical bugs logged: ${localAnomalies.length}.`,
            ...prev
          ]);
        }, 150);
      }
    }, 120);
  };

  // Download the Markdown Fidelity Bug Report via Browser Blob
  const exportBugReport = () => {
    const isLive = activeTab === 'live';
    const anomalies = isLive ? (auditResult?.anomalies || []) : fuzzAnomalies;
    const history = isLive ? [] : fuzzHistory;
    
    const reportMd = generateFidelityReport(anomalies, history, patient);
    const blob = new Blob([reportMd], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `clinical_fidelity_report_${isLive ? 'live' : 'fuzz'}_${Date.now()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    logEvent(`🔬 exported clinical fidelity bug report successfully.`);
  };

  const getSystemBadge = (status) => {
    return status === 'PASSED' 
      ? 'bg-green-500/20 text-green-400 border border-green-500/35'
      : 'bg-red-500/20 text-red-400 border border-red-500/35 animate-pulse';
  };

  const renderSubmissionForm = () => {
    const isLive = activeTab === 'live';
    const anomalies = isLive ? (auditResult?.anomalies || []) : fuzzAnomalies;
    if (anomalies.length === 0) return null;

    return (
      <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800/80 mt-4 flex flex-col gap-3 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-300 font-mono">
        <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
          📬 Submit Report to Developer
        </h4>
        <p className="text-[9px] text-slate-400 leading-normal">
          Directly upload this clinical verification report to the developer. It will land straight in their email inbox.
        </p>

        <div className="flex flex-col gap-2 mt-1">
          <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Your Name / Title</label>
          <input
            type="text"
            placeholder="e.g. Dr. Jane Smith"
            value={testerName}
            onChange={(e) => setTesterName(e.target.value)}
            disabled={submitStatus === 'sending'}
            className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-[10.5px] font-mono text-cyan-200 placeholder-slate-650 focus:outline-none focus:border-cyan-500/55 transition"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Notes / What went wrong?</label>
          <textarea
            placeholder="e.g. Propofol did not dilate SVR, or Succinylcholine potassium spike was missing."
            value={testerNotes}
            onChange={(e) => setTesterNotes(e.target.value)}
            disabled={submitStatus === 'sending'}
            rows={2}
            className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-[10.5px] font-mono text-cyan-200 placeholder-slate-650 focus:outline-none focus:border-cyan-500/55 transition resize-none leading-relaxed"
          />
        </div>

        {submitStatus === 'success' && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-2.5 rounded-lg text-[9px] leading-relaxed font-bold">
            ✅ Fidelity report successfully delivered to the developer! Thank you for your review.
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-2.5 rounded-lg text-[9px] leading-normal font-bold">
            ❌ Delivery failed: {submitError || 'Please check your connection.'}
          </div>
        )}

        <button
          onClick={handleSubmitReport}
          disabled={submitStatus === 'sending'}
          className={`w-full py-2.5 text-[10px] font-black uppercase rounded-lg shadow-md transition active:scale-97 flex items-center justify-center gap-1.5 border ${
            submitStatus === 'sending'
              ? 'bg-slate-900 border-slate-850 text-slate-500 cursor-not-allowed font-mono'
              : 'bg-gradient-to-r from-indigo-900 to-cyan-900 hover:from-indigo-800 hover:to-cyan-850 text-indigo-300 hover:text-white border-indigo-500/40 cursor-pointer font-mono font-bold'
          }`}
        >
          {submitStatus === 'sending' ? (
            <>
              <span className="w-2.5 h-2.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></span>
              Uploading Bug Report...
            </>
          ) : (
            <>
              📬 Submit Bug Report to Developer
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <div 
      className={`fixed top-0 left-0 h-full z-[150] w-full max-w-md md:w-[480px] bg-slate-950/95 border-r border-slate-800 text-white font-mono flex flex-col transition-all duration-350 shadow-2xl backdrop-blur-md ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-center px-5 py-4 border-b border-slate-800/80 bg-slate-900/40 shrink-0">
        <div className="flex items-center gap-3">
          <Shield className="text-cyan-400 animate-pulse" size={24} />
          <div>
            <h3 className="text-sm font-black tracking-wider uppercase text-slate-100 font-mono">
              Clinical Fidelity Auditor
            </h3>
            <p className="text-[9px] text-cyan-400 mt-0.5 uppercase tracking-widest font-mono font-bold">Physiological Bound Verification</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg border transition ${
              showSettings 
                ? 'bg-purple-500/20 text-purple-400 border-purple-500/30 font-black' 
                : 'text-slate-400 hover:text-white border-slate-800 hover:bg-slate-900/50'
            }`}
            title="Developer Settings"
          >
            <Settings size={16} />
          </button>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/20 shrink-0">
        <button
          onClick={() => setActiveTab('live')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-1.5 ${
            activeTab === 'live'
              ? 'border-cyan-500 text-cyan-400 bg-slate-900/40'
              : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/20'
          }`}
        >
          🩺 Live Physiology Audit
        </button>
        <button
          onClick={() => setActiveTab('fuzzer')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-1.5 ${
            activeTab === 'fuzzer'
              ? 'border-purple-500 text-purple-400 bg-slate-900/40'
              : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/20'
          }`}
        >
          ⚙️ State-Space Fuzzer
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 custom-scrollbar min-h-0">
        {showSettings ? (
          /* DEVELOPER SETTINGS CARD */
          <div className="flex flex-col gap-4 p-4 bg-slate-900/40 rounded-2xl border border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-300 font-mono">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-2">
              ⚙️ Web3Forms Developer Settings
            </h4>
            <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
              Configure your Web3Forms Access Key to direct beta tester feedback to your primary email address.
            </p>
            <div className="flex flex-col gap-2 mt-2 font-mono">
              <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Web3Forms Access Key</label>
              <input
                type="text"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                placeholder="YOUR_ACCESS_KEY_HERE"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-[10px] text-purple-300 placeholder-slate-700 font-mono focus:outline-none focus:border-purple-500/50"
              />
              <span className="text-[8.5px] text-slate-500 leading-normal mt-1">
                Don't have a key? Enter your email at <a href="https://web3forms.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">web3forms.com</a> to receive a free key instantly.
              </span>
            </div>
            <div className="flex gap-2 mt-3 font-mono">
              <button
                onClick={() => handleSaveSettings(accessKey)}
                className="flex-1 py-2 bg-purple-950 border border-purple-500/30 text-purple-300 text-[10px] font-black uppercase rounded-lg hover:bg-purple-900 hover:text-white transition active:scale-95"
              >
                Save Configuration
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-black uppercase rounded-lg hover:bg-slate-800 hover:text-white transition active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : activeTab === 'live' ? (
          /* LIVE PHYSIOLOGY AUDIT TAB */
          <>
            <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800/80 flex flex-col gap-3 shrink-0">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Settings size={14} className="text-cyan-400" /> Audit Console
              </h4>
              <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
                Click below to instantly capture a physiological telemetry slice and evaluate it against all high-fidelity clinical and pharmacological boundaries.
              </p>
              <button
                onClick={handleLiveAudit}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-900 to-indigo-950 hover:from-cyan-800 hover:to-indigo-900 text-cyan-300 hover:text-white text-[10px] font-black uppercase rounded-lg border border-cyan-500/40 shadow-md transition active:scale-97 flex items-center justify-center gap-1.5"
              >
                <Activity size={12} /> Run Live Physiology Audit
              </button>
            </div>

            {auditResult ? (
              <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                {/* System Compliance Grid */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-3.5 rounded-xl border border-slate-900 text-[9px] font-mono">
                  {Object.entries(auditResult.systemStatus).map(([sysName, status]) => (
                    <div key={sysName} className="flex justify-between items-center bg-slate-900/40 p-2 rounded-lg border border-slate-850">
                      <span className="uppercase text-slate-500 font-bold">{sysName}:</span>
                      <span className={`px-1.5 py-0.5 rounded font-extrabold text-[8px] uppercase ${getSystemBadge(status)}`}>
                        {status}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Audit Anomalies List */}
                <div className="flex flex-col gap-3">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1.5">
                    Logged Discrepancies ({auditResult.anomalies.length})
                  </h4>

                  {auditResult.anomalies.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/10">
                      <CheckCircle2 size={32} className="text-green-500 mb-2" />
                      <span className="text-[10px] font-black text-green-400 uppercase">100% Clinical Fidelity</span>
                      <span className="text-[9px] text-slate-500 mt-1 max-w-[250px] text-center leading-normal">
                        No clinical, mathematical, or physiological discrepancies encountered in this state.
                      </span>
                    </div>
                  ) : (
                    auditResult.anomalies.map((item, idx) => (
                      <div 
                        key={idx} 
                        className={`p-3.5 rounded-xl border text-[10.5px] leading-relaxed flex flex-col gap-2 shadow-md animate-in slide-in-from-bottom-2 duration-200 ${
                          item.severity === 'CRITICAL' 
                            ? 'bg-red-950/20 border-red-500/45 text-red-200' 
                            : 'bg-yellow-950/15 border-yellow-500/40 text-yellow-200'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase ${
                            item.severity === 'CRITICAL' 
                              ? 'bg-red-500/20 border-red-500/20 text-red-400' 
                              : 'bg-yellow-500/20 border-yellow-500/20 text-yellow-400'
                          }`}>
                            {item.severity}: {item.rule}
                          </span>
                          <span className="text-[8px] text-slate-500 font-bold uppercase">{item.system}</span>
                        </div>
                        <p className="bg-slate-950/40 p-2.5 rounded border border-slate-900/50 font-mono font-medium">{item.message}</p>
                        <p className="text-[9.5px] text-slate-400 italic"><strong>Clinical Rationale</strong>: {item.rationale}</p>
                        <div className="border-t border-slate-850/50 pt-1.5 mt-0.5 text-[9px] text-cyan-300 font-extrabold flex items-center gap-1 font-mono">
                          <ArrowRight size={10} /> Fix: {item.resolution}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Export Options */}
                {auditResult.anomalies.length > 0 && (
                  <>
                    <button
                      onClick={exportBugReport}
                      className="w-full py-3 bg-gradient-to-r from-purple-900 to-indigo-900 hover:from-purple-800 hover:to-indigo-800 active:scale-97 text-white text-[10px] font-black uppercase rounded-lg border border-purple-500/40 shadow-lg transition flex items-center justify-center gap-1.5 mt-2 font-mono"
                    >
                      <FileCode size={14} /> Export Fidelity Bug Report (.md)
                    </button>
                    {renderSubmissionForm()}
                  </>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
                <CheckSquare size={36} className="text-slate-700 mb-2 animate-bounce" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Awaiting Live Audit</span>
              </div>
            )}
          </>
        ) : (
          /* STATE-SPACE FUZZER stress-testing TAB */
          <>
            <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800/80 flex flex-col gap-3 shrink-0">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Settings size={14} className="text-purple-400 animate-spin" /> Fuzzer stress-testing controls
              </h4>
              <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
                Initiates a 50-tick headless fuzzer stress test that injects random cardiovascular, procedural, and positioning decisions to systematically uncover code breaks.
              </p>
              
              {!isFuzzing ? (
                <button
                  onClick={runFuzzTest}
                  className="w-full py-2.5 bg-gradient-to-r from-purple-950 to-indigo-950 hover:from-purple-900 hover:to-indigo-900 text-purple-300 hover:text-white text-[10px] font-black uppercase rounded-lg border border-purple-500/40 shadow-md transition active:scale-97 flex items-center justify-center gap-1.5"
                >
                  <Play size={12} /> Initiate State-Space Auto-Fuzzer
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[9px] text-purple-400 font-extrabold uppercase font-mono">
                    <span>Fuzz testing in Progress...</span>
                    <span>{fuzzProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 border border-slate-800 rounded-full overflow-hidden shadow-inner relative">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-100 ease-out" 
                      style={{ width: `${fuzzProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {fuzzLogs.length > 0 && (
              <div className="flex-1 flex flex-col gap-4 min-h-0 animate-in fade-in duration-300">
                {/* Export Options */}
                {!isFuzzing && fuzzAnomalies.length > 0 && (
                  <>
                    <button
                      onClick={exportBugReport}
                      className="w-full py-3 bg-gradient-to-r from-purple-900 to-indigo-900 hover:from-purple-800 hover:to-indigo-800 active:scale-97 text-white text-[10px] font-black uppercase rounded-lg border border-purple-500/40 shadow-lg transition flex items-center justify-center gap-1.5 shrink-0 font-mono"
                    >
                      <FileCode size={14} /> Export Fuzz Bug Report (.md)
                    </button>
                    {renderSubmissionForm()}
                  </>
                )}

                {/* Fuzz Logs Terminal Console */}
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1.5 shrink-0 font-mono">
                  Fidelity Stress Logs (Unique Bugs: {fuzzAnomalies.length})
                </h4>
                
                <div className="flex-1 bg-slate-950 p-4 rounded-xl border border-slate-900/80 overflow-y-auto custom-scrollbar font-mono text-[9.5px] leading-relaxed text-slate-300 min-h-0 select-text flex flex-col gap-1.5">
                  {fuzzLogs.map((log, idx) => (
                    <div 
                      key={idx} 
                      className={
                        log.startsWith('🚨') 
                          ? 'text-red-400 font-bold bg-red-950/20 px-2 py-1 rounded border border-red-900/30' 
                          : log.startsWith('🏁') || log.startsWith('🚀')
                          ? 'text-green-400 font-black' 
                          : 'text-slate-400 border-l border-slate-850 pl-2'
                      }
                    >
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
