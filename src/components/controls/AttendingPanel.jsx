import { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, ChevronRight, X, 
  HelpCircle, Shield, Award, Clock, ArrowRight, BookOpen
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
  onActionClick,
  nearFutureForecast // Recieved from App.jsx
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messageHistory, setMessageHistory] = useState([]);
  const [showAuditModal, setShowAuditModal] = useState(false);

  const [activeTab, setActiveTab] = useState('advisor'); // 'advisor' or 'chat'
  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);


  // Initialize and reset chat messages on patient name changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChatMessages([
      {
        id: 'welcome',
        sender: 'attending',
        text: `Hello! Ask me any free-form questions regarding the current patient, the active procedure, or real-time clinical advice. I will review the live physiological state to guide you.`,
        timestamp: formatTime ? formatTime(time) : `${Math.floor(time / 60)}m`
      }
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.name]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isTyping]);

  const handleActionClick = (actionKey) => {
    if (actionKey.startsWith('audit ')) {
      setActiveTab('chat');
      const userMessage = {
        id: `user-${chatMessages.length}`,
        sender: 'user',
        text: actionKey.toUpperCase(),
        timestamp: formatTime ? formatTime(time) : `${Math.floor(time / 60)}m`
      };
      setChatMessages(prev => [...prev, userMessage]);
      setIsTyping(true);
      setTimeout(() => {
        const attendingReply = getAttendingResponse(actionKey, {
          vitals,
          patient,
          activeMeds,
          surgicalPhase,
          time,
          logs
        });
        setChatMessages(prev => {
          const responseMessage = {
            id: `attending-${prev.length}`,
            sender: 'attending',
            text: attendingReply,
            timestamp: formatTime ? formatTime(time) : `${Math.floor(time / 60)}m`
          };
          return [...prev, responseMessage];
        });
        setIsTyping(false);
      }, 600);
    } else {
      if (onActionClick) onActionClick(actionKey);
    }
  };

  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    if (!userInput.trim()) return;

    const userMessage = {
      id: `user-${chatMessages.length}`,
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

      setChatMessages(prev => {
        const responseMessage = {
          id: `attending-${prev.length}`,
          sender: 'attending',
          text: attendingReply,
          timestamp: formatTime ? formatTime(time) : `${Math.floor(time / 60)}m`
        };
        return [...prev, responseMessage];
      });
      setIsTyping(false);
    }, 600);
  };

  // Spirometric FRC and oxygen buffer calculations to prevent ReferenceError crash
  const frc_L = patient?.lungVolumes?.frc_L || 2.4;
  const frcO2Percent = frc_L > 0 ? ((patient?.oxygenBuffer || 0) / frc_L) * 100 : 21;

  // Sync primary guidance to message history when it changes to prevent duplicates
  useEffect(() => {
    if (primaryGuidance) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessageHistory(prev => {
        // Prevent appending the exact same message back-to-back
        if (prev.length > 0 && prev[prev.length - 1].text === primaryGuidance.text) {
          return prev;
        }
        return [
          ...prev,
          {
            id: `msg-${prev.length}`,
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
          className="fixed right-4 bottom-6 z-40 bg-gradient-to-r from-amber-600 to-yellow-600 border border-amber-400/50 text-white p-3 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:scale-105 hover:from-amber-500 hover:to-yellow-505 transition-all flex items-center gap-2 group"
        >
          <MessageSquare size={20} className="text-amber-100 group-hover:text-white" />
          <span className="text-xs font-bold font-mono uppercase tracking-wider">Attending Consult</span>
          {activeAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-amber-955">
              {activeAlertsCount}
            </span>
          )}
        </button>
      )}

      {/* Sidebar Panel */}
      <div 
        className={`fixed top-16 right-0 h-[calc(100vh-4rem)] z-40 w-full max-w-sm md:w-96 glass-panel glass-amber text-white font-mono flex flex-col transition-all duration-350 shadow-2xl backdrop-blur-md border-y-0 border-r-0 rounded-none ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Unified Sidebar Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-white/5 bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-2">
            <Award className="text-amber-400" size={18} />
            <h3 className="text-sm font-black tracking-wider uppercase text-slate-100 flex items-center gap-1.5 font-mono">
              Attending Consult
              {activeAlertsCount > 0 && (
                <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-[9px] px-1.5 py-0.5 rounded font-extrabold animate-pulse">
                  {activeAlertsCount} ALERTS
                </span>
              )}
            </h3>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/5 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-white/5 bg-slate-950/40 shrink-0">
          <button
            onClick={() => setActiveTab('advisor')}
            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
              activeTab === 'advisor'
                ? 'border-amber-500 text-amber-400 bg-slate-900/40'
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/20'
            }`}
          >
            📢 Advisor
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'chat'
                ? 'border-amber-500 text-amber-400 bg-slate-900/40'
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/20'
            }`}
          >
            💬 Direct Chat
          </button>
        </div>

        {activeTab === 'advisor' ? (
          <>
            {/* Mode Selector Controls */}
            <div className="p-4 border-b border-white/5 flex flex-col gap-3 bg-slate-950/20 shrink-0">
              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Attending Mode</span>
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-white/5">
                {['silent', 'observing', 'teaching'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setAttendingMode(mode)}
                    className={`py-1.5 text-[10px] font-black uppercase rounded transition-all ${
                      attendingMode === mode 
                        ? 'bg-amber-600 text-white shadow-md' 
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
                  
                  <h4 className="font-extrabold text-xs text-white leading-tight uppercase font-mono">
                    {primaryGuidance.title}
                  </h4>
                  
                  <p className="text-[11px] leading-relaxed text-slate-200 bg-slate-950/30 p-3 rounded border border-slate-900/40 font-mono font-medium">
                    {parseAndRenderText(primaryGuidance.text, handleActionClick)}
                  </p>
 
                  {primaryGuidance.suggestion && (
                    <div className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded border border-slate-900/80 mt-1">
                      <ArrowRight size={14} className="text-amber-400 shrink-0 mt-0.5" />
                      <span className="text-[10px] font-bold text-amber-300 leading-snug">
                        {parseAndRenderText(primaryGuidance.suggestion, handleActionClick)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4 border border-dashed border-slate-800 rounded-xl bg-slate-950/20 animate-in fade-in duration-300">
                  <Shield size={36} className="text-slate-600 mb-2.5 animate-pulse" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Physiology Stable</span>
                  <span className="text-[10px] text-slate-500 mt-1 max-w-[200px] leading-normal font-mono">
                    {attendingMode === 'silent' 
                      ? "Attending is in Silent mode. Click 'Call Attending' for advice." 
                      : "No active warnings. Attending is observing patient vital trends."}
                  </span>
                </div>
              )}
              
              {/* Premium Attending Foresight (Near-Future Predictive Forecasting Card) */}
              {attendingMode !== 'silent' && nearFutureForecast && (
                <div className="glass-panel glass-amber p-4 border border-amber-500/35 rounded-xl bg-amber-950/20 shadow-md flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <span className="text-[10px] font-extrabold uppercase text-amber-400 tracking-wider flex items-center gap-1.5 font-mono">
                    🔮 Attending Foresight
                  </span>
                  <p className="text-[10.5px] leading-relaxed text-amber-105 font-mono italic font-medium bg-slate-950/45 p-3 rounded-lg border border-amber-900/40">
                    {parseAndRenderText(nearFutureForecast, handleActionClick)}
                  </p>
                </div>
              )}
 
              {/* Call Attending Call-to-Action Button */}
              <button
                onClick={handleCallAttending}
                className="w-full py-3 glass-button glass-button-amber active:scale-98 text-xs font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 shrink-0 font-mono"
              >
                <HelpCircle size={15} />
                CALL ATTENDING CONSULT
              </button>
            </div>
 
            {/* Message Log History Panel - Hides in Silent Mode, Enlarged and Conditional for Observe & Teach */}
            {(attendingMode === 'observing' || attendingMode === 'teaching') && (
              <div className="border-t border-white/5 bg-slate-950/60 h-52 flex flex-col shrink-0 transition-all duration-300">
                <div className="px-4 py-2.5 border-b border-white/5 bg-slate-950/90 flex justify-between items-center shrink-0">
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5 font-mono">
                    <BookOpen size={12} className="text-amber-500" />
                    Attending Guidance Log
                  </span>
                  <span className="text-[9px] text-slate-450 bg-slate-800/80 px-1.5 py-0.5 rounded font-bold border border-slate-700/50">{messageHistory.length} ENTRIES</span>
                </div>
   
                <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3 custom-scrollbar text-[11px] font-mono">
                  {messageHistory.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 italic font-medium">No historical log entries. Attending is monitoring...</div>
                  ) : (
                    messageHistory.slice().reverse().map((msg) => {
                      const priorityStyles = getPriorityColor(msg.priority);
                      return (
                        <div key={msg.id} className="border-b border-slate-850/70 pb-3 flex flex-col gap-1.5 last:border-b-0 animate-in fade-in slide-in-from-bottom-2 duration-250">
                          <div className="flex justify-between items-center text-[10px] mb-0.5 font-bold">
                            <span className={`uppercase tracking-wide px-1 rounded border text-[9px] ${priorityStyles.badge}`}>
                              {priorityStyles.icon} {msg.priority}
                            </span>
                            <span className="text-slate-500 flex items-center gap-1 text-[9px]"><Clock size={9} /> {msg.timestamp}</span>
                          </div>
                          <p className="text-slate-200 leading-relaxed font-medium bg-slate-950/20 p-2.5 rounded border border-slate-900/60">
                            {parseAndRenderText(msg.text, handleActionClick)}
                          </p>
                          {msg.suggestion && (
                            <div className="text-[10px] text-amber-305 font-bold pl-1 flex items-center gap-1.5">
                              <ArrowRight size={10} className="text-amber-400" />
                              <span>{parseAndRenderText(msg.suggestion, handleActionClick)}</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
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
                        ? 'bg-amber-900/40 border border-amber-500/30 text-amber-100 rounded-tr-none shadow-[0_2px_8px_rgba(245,158,11,0.1)]' 
                        : 'bg-slate-905/80 border border-white/5 text-slate-200 rounded-tl-none shadow-md'
                    }`}
                  >
                    {msg.sender === 'user' 
                      ? msg.text 
                      : parseAndRenderText(msg.text, handleActionClick)
                    }
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex flex-col items-start">
                  <span className="text-[9px] text-slate-500 font-extrabold uppercase mb-1 font-mono">
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
            <form onSubmit={handleSendMessage} className="p-3 border-t border-white/5 bg-slate-950/60 flex gap-2 shrink-0">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Ask Attending (e.g. 'why is BP low?')..."
                className="flex-1 bg-slate-900/90 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-205 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 transition-all font-mono"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={isTyping || !userInput.trim()}
                className="px-3 py-2 glass-button glass-button-amber disabled:opacity-50 text-white rounded-lg transition-all flex items-center justify-center active:scale-95 shadow-lg shadow-amber-950/20"
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
          <div className="glass-panel glass-amber rounded-2xl p-6 md:p-8 max-w-2xl shadow-[0_0_30px_rgba(245,158,11,0.15)] w-full max-h-[85vh] overflow-y-auto flex flex-col gap-4 custom-scrollbar text-white">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <Award className="text-amber-400" size={24} />
                <div>
                  <h2 className="text-lg font-black tracking-wide text-slate-100 uppercase font-mono">Attending Consult Audit</h2>
                  <p className="text-[10px] text-amber-400 mt-0.5 font-mono">Physiological diagnostic audit & pharmacological review</p>
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
                <span className="font-bold text-slate-200 text-xs">{patient?.name || 'Custom Subject'} (ASA {patient?.asaStatus || 'I'})</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase tracking-wider text-slate-500">Spirometric FRC</span>
                <span className="font-bold text-amber-400 text-xs">{(patient?.lungVolumes?.frc_L || 2.4).toFixed(2)} L</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase tracking-wider text-slate-500">Oxygen Buffer</span>
                <span className="font-bold text-emerald-400 text-xs">{(patient?.oxygenBuffer || 0.5).toFixed(2)} L O2 ({Math.round(frcO2Percent)}%)</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase tracking-wider text-slate-500">Ischemic Damage</span>
                <span className="font-bold text-yellow-500 text-xs">{Math.round(patient?.ischemicDamage || 0)} / {patient?.arrestThreshold || 1200}</span>
              </div>
            </div>
 
            {/* Detailed Clinical Findings */}
            <div className="flex flex-col gap-3 my-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-white/5 pb-1 flex items-center gap-1.5">
                <BookOpen size={14} className="text-amber-400" /> Active Diagnostic Findings
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
                    <p>{parseAndRenderText(item.message, handleActionClick)}</p>
                    {item.action && (
                      <div className="flex items-center gap-1.5 mt-1 border-t border-slate-800/40 pt-1.5 text-amber-300 font-bold text-[10px]">
                        <ArrowRight size={12} className="text-amber-400" />
                        <span>Recommended Action: {parseAndRenderText(item.action, handleActionClick)}</span>
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
