import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, ChevronRight, X, Volume2, VolumeX, AlertTriangle, 
  HelpCircle, Shield, Award, Clock, ArrowRight, Play, BookOpen
} from 'lucide-react';
import { parseAndRenderText } from '../../engine/ClinicalActions';
import { getAttendingResponse } from '../../engine/ClinicalAiChat';

export default function AttendingPanel({
  vitals,
  patient,
  activeMeds,
  surgicalPhase,
  time,
  logs,
  attendingMode,
  setAttendingMode,
  primaryGuidance,
  fullAudit,
  activeAlertsCount,
  formatTime,
  generateClinicalHint,
  onActionClick
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [messageHistory, setMessageHistory] = useState([]);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const lastMessageRef = useRef(null);

  const [activeTab, setActiveTab] = useState('advisor'); // 'advisor' or 'chat'
  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Initialize and reset chat messages on patient name changes
  useEffect(() => {
    setChatMessages([
      {
        id: 'welcome',
        sender: 'attending',
        text: `Hello! Ask me any free-form questions regarding the current patient, the active procedure, or real-time clinical advice. I will review the live physiological state to guide you.`,
        timestamp: formatTime ? formatTime(time) : `${Math.floor(time / 60)}m`
      }
    ]);
  }, [patient?.name]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isTyping]);

  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    if (!userInput.trim()) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userInput,
      timestamp: formatTime ? formatTime(time) : `${Math.floor(time / 60)}m`
    };

    setChatMessages(prev => [...prev, userMessage]);
    const currentInput = userInput;
    setUserInput('');
    setIsTyping(true);

    setTimeout(() => {
      const attendingReply = getAttendingResponse(currentInput, {
        vitals,
        patient,
        activeMeds,
        surgicalPhase,
        time,
        logs
      });

      const responseMessage = {
        id: `attending-${Date.now()}`,
        sender: 'attending',
        text: attendingReply,
        timestamp: formatTime ? formatTime(time) : `${Math.floor(time / 60)}m`
      };

      setChatMessages(prev => [...prev, responseMessage]);
      setIsTyping(false);
    }, 600);
  };

  // Spirometric FRC and oxygen buffer calculations to prevent ReferenceError crash
  const frc_L = patient?.lungVolumes?.frc_L || 2.4;
  const frcO2Percent = frc_L > 0 ? ((patient?.oxygenBuffer || 0) / frc_L) * 100 : 21;

  // Sync primary guidance to message history when it changes to prevent duplicates
  useEffect(() => {
    if (primaryGuidance) {
      setMessageHistory(prev => {
        // Prevent appending the exact same message back-to-back
        if (prev.length > 0 && prev[prev.length - 1].text === primaryGuidance.text) {
          return prev;
        }
        return [
          ...prev,
          {
            id: Date.now(),
            timestamp: formatTime ? formatTime(time) : `${Math.floor(time / 60)}m`,
            stepName: primaryGuidance.title,
            text: primaryGuidance.text,
            priority: primaryGuidance.priority,
            suggestion: primaryGuidance.suggestion
          }
        ];
      });
    }
  }, [primaryGuidance, time, formatTime]);

  const handleCallAttending = () => {
    setShowAuditModal(true);
    if (generateClinicalHint) {
      generateClinicalHint();
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-950/40 border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.2)]',
          badge: 'bg-red-500/20 text-red-400 border-red-500/40',
          text: 'text-red-200',
          icon: '🚨'
        };
      case 'WARNING':
        return {
          bg: 'bg-yellow-950/40 border-yellow-500/60 shadow-[0_0_15px_rgba(234,179,8,0.15)]',
          badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
          text: 'text-yellow-200',
          icon: '⚠️'
        };
      case 'SUGGESTION':
        return {
          bg: 'bg-emerald-950/30 border-emerald-600/50 shadow-[0_0_12px_rgba(16,185,129,0.1)]',
          badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
          text: 'text-emerald-200',
          icon: '💡'
        };
      case 'TEACHING':
        return {
          bg: 'bg-indigo-950/40 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]',
          badge: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
          text: 'text-indigo-200',
          icon: '📚'
        };
      default:
        return {
          bg: 'bg-slate-900/60 border-slate-700/60 shadow-md',
          badge: 'bg-slate-800 text-slate-400 border-slate-700/50',
          text: 'text-slate-200',
          icon: 'ℹ️'
        };
    }
  };

  return (
    <>
      {/* Floating Toggle Button (Visible when closed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed right-4 bottom-24 z-40 bg-gradient-to-r from-purple-900 to-indigo-900 border border-purple-500/50 text-white p-3 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:scale-105 hover:from-purple-800 hover:to-indigo-800 transition-all flex items-center gap-2 group"
        >
          <MessageSquare size={20} className="text-purple-300 group-hover:text-purple-200" />
          <span className="text-xs font-bold font-mono uppercase tracking-wider">Attending Consult</span>
          {activeAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-purple-950">
              {activeAlertsCount}
            </span>
          )}
        </button>
      )}

      {/* Sidebar Panel */}
      <div 
        className={`fixed top-16 right-0 h-[calc(100vh-4rem)] z-40 w-96 bg-slate-900/90 border-l border-slate-800 text-white font-mono flex flex-col transition-all duration-350 shadow-2xl backdrop-blur-md ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-slate-800/80 bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-2">
            <Award className="text-cyan-400" size={18} />
            <h3 className="text-sm font-black tracking-wider uppercase text-slate-100 flex items-center gap-1.5">
              Clinical Attending
              {activeAlertsCount > 0 && (
                <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-[9px] px-1.5 py-0.5 rounded font-extrabold animate-pulse">
                  {activeAlertsCount} ALERTS
                </span>
              )}
            </h3>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 shrink-0">
          <button
            onClick={() => setActiveTab('advisor')}
            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
              activeTab === 'advisor'
                ? 'border-cyan-500 text-cyan-400 bg-slate-900/40'
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/20'
            }`}
          >
            📢 Advisor
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'chat'
                ? 'border-purple-500 text-purple-400 bg-slate-900/40'
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/20'
            }`}
          >
            💬 Direct Chat
          </button>
        </div>

        {activeTab === 'advisor' ? (
          <>
            {/* Mode Selector Controls */}
            <div className="p-4 border-b border-slate-800/80 flex flex-col gap-3 bg-slate-950/20 shrink-0">
              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Attending Mode</span>
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800/85">
                {['silent', 'observing', 'teaching'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setAttendingMode(mode)}
                    className={`py-1.5 text-[10px] font-black uppercase rounded transition-all ${
                      attendingMode === mode 
                        ? 'bg-cyan-700 text-white shadow-md' 
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/60'
                    }`}
                  >
                    {mode === 'silent' ? '🔇 Silent' : mode === 'observing' ? '👀 Observe' : '📚 Teach'}
                  </button>
                ))}
              </div>

              {/* Quick Guidance Info Text */}
              <p className="text-[10px] text-slate-400 leading-relaxed italic bg-slate-900/40 p-2.5 rounded border border-slate-850">
                {attendingMode === 'silent' && "🔇 Attending is silent. Click 'Call Attending' below at any point for detailed clinical consultations."}
                {attendingMode === 'observing' && "👀 Attending monitors passively and speaks up on critical physiological changes or medication hazards."}
                {attendingMode === 'teaching' && "📚 Full step-by-step guidance. The Attending explains clinical rationales and suggests specific drug dosings."}
              </p>
            </div>

            {/* Active Consultation Message Card */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
              {primaryGuidance ? (
                <div className={`p-4 rounded-xl border flex flex-col gap-3 transition-all animate-in fade-in duration-300 ${getPriorityColor(primaryGuidance.priority).bg}`}>
                  <div className="flex justify-between items-center border-b border-slate-800/30 pb-2">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${getPriorityColor(primaryGuidance.priority).badge}`}>
                      {getPriorityColor(primaryGuidance.priority).icon} {primaryGuidance.priority}
                    </span>
                    <span className="text-[9px] text-slate-500 font-semibold flex items-center gap-1">
                      <Clock size={10} /> {formatTime ? formatTime(time) : `${Math.floor(time / 60)}m`}
                    </span>
                  </div>
                  
                  <h4 className="font-extrabold text-xs text-white leading-tight uppercase">
                    {primaryGuidance.title}
                  </h4>
                  
                  <p className="text-[11px] leading-relaxed text-slate-200 bg-slate-950/30 p-3 rounded border border-slate-900/40 font-medium">
                    {parseAndRenderText(primaryGuidance.text, onActionClick)}
                  </p>

                  {primaryGuidance.suggestion && (
                    <div className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded border border-slate-900/80 mt-1">
                      <ArrowRight size={14} className="text-cyan-400 shrink-0 mt-0.5" />
                      <span className="text-[10px] font-bold text-cyan-300 leading-snug">
                        {parseAndRenderText(primaryGuidance.suggestion, onActionClick)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4 border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
                  <Shield size={36} className="text-slate-600 mb-2.5 animate-pulse" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Physiology Stable</span>
                  <span className="text-[10px] text-slate-500 mt-1 max-w-[200px] leading-normal">
                    {attendingMode === 'silent' 
                      ? "Attending is in Silent mode. Click 'Call Attending' for advice." 
                      : "No active warnings. Attending is observing patient vital trends."}
                  </span>
                </div>
              )}

              {/* Call Attending Call-to-Action Button */}
              <button
                onClick={handleCallAttending}
                className="w-full py-3 bg-gradient-to-r from-purple-850 to-indigo-850 hover:from-purple-755 hover:to-indigo-755 active:scale-98 text-white text-xs font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 border border-purple-600/40 shrink-0"
              >
                <HelpCircle size={15} />
                CALL ATTENDING CONSULT
              </button>
            </div>

            {/* Message Log History Panel */}
            <div className="border-t border-slate-800 bg-slate-950/60 h-44 flex flex-col shrink-0">
              <div className="px-4 py-2 border-b border-slate-800 bg-slate-950/90 flex justify-between items-center shrink-0">
                <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Clinical Guidance Log</span>
                <span className="text-[9px] text-slate-500 font-semibold">{messageHistory.length} messages</span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 custom-scrollbar text-[10px]">
                {messageHistory.length === 0 ? (
                  <div className="text-center py-6 text-slate-600 italic">No historical log entries.</div>
                ) : (
                  messageHistory.slice().reverse().map((msg) => (
                    <div key={msg.id} className="border-b border-slate-900/60 pb-2">
                      <div className="flex justify-between items-center text-[9px] text-slate-500 mb-0.5">
                        <span className="font-extrabold uppercase text-cyan-400">{msg.stepName || 'ALERT'}</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <p className="text-slate-300 leading-normal">{parseAndRenderText(msg.text, onActionClick)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          /* Direct Chat View */
          <div className="flex-1 flex flex-col min-h-0 bg-slate-950/20">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
              {chatMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[9px] text-slate-500 font-extrabold uppercase mb-1">
                    {msg.sender === 'user' ? 'You' : 'Attending'} • {msg.timestamp}
                  </span>
                  <div 
                    className={`px-3.5 py-2.5 rounded-2xl text-[11px] leading-relaxed font-mono ${
                      msg.sender === 'user' 
                        ? 'bg-purple-900/40 border border-purple-500/30 text-purple-100 rounded-tr-none shadow-[0_2px_8px_rgba(168,85,247,0.1)]' 
                        : 'bg-slate-900/80 border border-slate-800/80 text-slate-200 rounded-tl-none shadow-md'
                    }`}
                  >
                    {msg.sender === 'user' 
                      ? msg.text 
                      : parseAndRenderText(msg.text, onActionClick)
                    }
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex flex-col items-start">
                  <span className="text-[9px] text-slate-500 font-extrabold uppercase mb-1">
                    Attending • Thinking
                  </span>
                  <div className="bg-slate-900/60 border border-slate-800/40 rounded-2xl rounded-tl-none px-3.5 py-2.5 shadow-sm text-[10px] text-slate-400 italic">
                    <span className="animate-pulse">Attending is formulating clinical advice...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-850 bg-slate-950/60 flex gap-2 shrink-0">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Ask Attending (e.g. 'why is BP low?')..."
                className="flex-1 bg-slate-900/90 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20 transition-all font-mono"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={isTyping || !userInput.trim()}
                className="px-3 py-2 bg-gradient-to-r from-purple-800 to-indigo-850 hover:from-purple-700 hover:to-indigo-750 disabled:opacity-50 text-white rounded-lg transition-all flex items-center justify-center border border-purple-600/30 active:scale-95 shadow-lg shadow-purple-950/20"
              >
                <ChevronRight size={16} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Comprehensive Audit Consult Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 font-mono">
          <div className="bg-slate-900 border border-cyan-500/80 rounded-2xl p-6 md:p-8 max-w-2xl shadow-[0_0_30px_rgba(6,182,212,0.15)] w-full max-h-[85vh] overflow-y-auto flex flex-col gap-4 custom-scrollbar text-white">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Award className="text-cyan-400" size={24} />
                <div>
                  <h2 className="text-lg font-black tracking-wide text-slate-100 uppercase">Attending Staff Consultation</h2>
                  <p className="text-[10px] text-cyan-400 mt-0.5">Physiological diagnostic audit & pharmacological review</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAuditModal(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Patient Snapshot */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 text-[10px] text-slate-400">
              <div>
                <span className="block text-[9px] uppercase tracking-wider text-slate-500">Patient Class</span>
                <span className="font-bold text-slate-200 text-xs">{patient.name || 'Custom Subject'} (ASA {patient.asaStatus || 'I'})</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase tracking-wider text-slate-500">Spirometric FRC</span>
                <span className="font-bold text-cyan-300 text-xs">{(patient.lungVolumes?.frc_L || 2.4).toFixed(2)} L</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase tracking-wider text-slate-500">Oxygen Buffer</span>
                <span className="font-bold text-emerald-400 text-xs">{(patient.oxygenBuffer || 0.5).toFixed(2)} L O2 ({Math.round(frcO2Percent)}%)</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase tracking-wider text-slate-500">Ischemic Damage</span>
                <span className="font-bold text-yellow-500 text-xs">{Math.round(patient.ischemicDamage || 0)} / {patient.arrestThreshold || 1200}</span>
              </div>
            </div>

            {/* Detailed Clinical Findings */}
            <div className="flex flex-col gap-3 my-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1 flex items-center gap-1.5">
                <BookOpen size={14} className="text-cyan-400" /> Active Diagnostic Findings
              </h3>
              
              {fullAudit && fullAudit.length > 0 ? (
                fullAudit.map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3.5 rounded-xl border text-[11px] leading-relaxed flex flex-col gap-2 ${
                      item.priority === 'CRITICAL' 
                        ? 'bg-red-950/30 border-red-500/40 text-red-200' 
                        : item.priority === 'WARNING' 
                        ? 'bg-yellow-950/20 border-yellow-500/40 text-yellow-200' 
                        : item.priority === 'SUGGESTION'
                        ? 'bg-emerald-950/20 border-emerald-600/30 text-emerald-200'
                        : 'bg-slate-950/40 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between shrink-0">
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase ${
                        item.priority === 'CRITICAL' 
                          ? 'bg-red-500/20 border-red-500/30 text-red-400' 
                          : item.priority === 'WARNING' 
                          ? 'bg-yellow-500/20 border-yellow-500/20 text-yellow-400' 
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}>
                        {item.priority}
                      </span>
                    </div>
                    <p>{parseAndRenderText(item.message, onActionClick)}</p>
                    {item.action && (
                      <div className="flex items-center gap-1.5 mt-1 border-t border-slate-800/40 pt-1.5 text-cyan-300 font-bold text-[10px]">
                        <ArrowRight size={12} />
                        <span>Recommended Action: {parseAndRenderText(item.action, onActionClick)}</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-xs italic text-center py-4">No significant cardiopulmonary or surgical hazards detected. Patient is stable under current anesthetic maintenance.</p>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800 mt-2">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs rounded-lg transition"
              >
                Return to Simulation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
