import { useState, useEffect } from 'react';
import { X, BookOpen, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { parseAndRenderText } from '../../engine/ClinicalActions';
import { getPreloadedConsult } from '../../engine/config/preloadedConsults';
import { MEDICATIONS, INHALATIONAL_AGENTS, FLUIDS } from '../../engine/Pharmacology';

export const DrugConsultModal = ({ data, close, handleActionClick }) => {
  const [selectedId, setSelectedId] = useState('');
  const [isDetailedExpanded, setIsDetailedExpanded] = useState(false);

  // Sync selectedId with the prop drug/fluid/gas when modal opens
  useEffect(() => {
    if (data.show && data.agentId) {
      setSelectedId(data.agentId);
      setIsDetailedExpanded(false);
    }
  }, [data.show, data.agentId]);

  if (!data.show) return null;

  // Build a unified searchable/selectable list of all items
  const allItems = [
    ...Object.keys(MEDICATIONS).map(k => ({
      id: k,
      name: MEDICATIONS[k].name,
      category: 'Medication',
      subCategory: MEDICATIONS[k].classes?.[0] || 'Unknown Class'
    })),
    ...Object.keys(INHALATIONAL_AGENTS).map(k => ({
      id: k,
      name: INHALATIONAL_AGENTS[k].name,
      category: 'Volatile Anesthetic',
      subCategory: 'Inhalational Gas'
    })),
    ...Object.keys(FLUIDS).map(k => ({
      id: k,
      name: k,
      category: 'Resus Fluid',
      subCategory: FLUIDS[k].type || 'Intravenous Fluid'
    }))
  ].sort((a, b) => a.name.localeCompare(b.name));

  // Find currently selected item properties
  const activeItem = allItems.find(item => item.id.toLowerCase() === selectedId.toLowerCase()) || {
    id: selectedId,
    name: selectedId,
    category: 'Anesthetic Agent',
    subCategory: 'Clinical Compound'
  };

  // Retrieve preloaded consult text
  const consultText = getPreloadedConsult(activeItem.id, MEDICATIONS);

  // Parse text using delimiters
  const hasTwoFold = consultText.includes('=== CLINICAL SUMMARY ===') && 
                     consultText.includes('=== DETAILED CONSULTATION ===');

  let summaryPart = '';
  let detailedPart = '';

  if (hasTwoFold) {
    const summaryStart = consultText.indexOf('=== CLINICAL SUMMARY ===') + '=== CLINICAL SUMMARY ==='.length;
    const detailedIdx = consultText.indexOf('=== DETAILED CONSULTATION ===');
    summaryPart = consultText.slice(summaryStart, detailedIdx).trim();
    detailedPart = consultText.slice(detailedIdx + '=== DETAILED CONSULTATION ==='.length).trim();
  } else {
    summaryPart = consultText;
  }

  // Handle overlay click to close
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      close();
    }
  };

  // Determine dynamic border/shadow colors based on class/category
  // Full class → theme color mapping. Order matters: more specific terms first.
  const getThemeColors = () => {
    const cat = activeItem.category;

    if (cat === 'Volatile Anesthetic')
      return 'border-cyan-500/60 shadow-[0_0_30px_rgba(6,182,212,0.25)] text-cyan-400';

    if (cat === 'Resus Fluid')
      return activeItem.subCategory?.toLowerCase().includes('blood')
        ? 'border-rose-500/60 shadow-[0_0_30px_rgba(244,63,94,0.25)] text-rose-400'
        : 'border-teal-500/60 shadow-[0_0_30px_rgba(20,184,166,0.25)] text-teal-400';

    const sub = (activeItem.subCategory || '').toLowerCase();

    // Neuromuscular (NMBs + reversals)
    if (sub.includes('ndmr') || sub.includes('depolarizing') || sub.includes('nmba') ||
        sub.includes('reversal') || sub.includes('ache inhibitor') || sub.includes('muscle relaxant'))
      return 'border-emerald-500/60 shadow-[0_0_30px_rgba(16,185,129,0.25)] text-emerald-400';

    // Opioids / analgesics
    if (sub.includes('opioid') || sub.includes('analgesic') || sub.includes('opioid antagonist'))
      return 'border-blue-500/60 shadow-[0_0_30px_rgba(59,130,246,0.25)] text-blue-400';

    // Sedatives / hypnotics / benzodiazepines / barbiturates / dissociatives / alpha-2 agonists
    if (sub.includes('sedative') || sub.includes('hypnotic') || sub.includes('benzodiazepine') ||
        sub.includes('barbiturate') || sub.includes('dissociative') || sub.includes('amnestic') ||
        sub.includes('alpha-2') || sub.includes('dual orexin'))
      return 'border-yellow-500/60 shadow-[0_0_30px_rgba(234,179,8,0.25)] text-yellow-400';

    // Vasopressors / inotropes / vasoactives
    if (sub.includes('vasopressor') || sub.includes('inotrope') || sub.includes('pressor') ||
        sub.includes('vasoactive') || sub.includes('chronotrope') || sub.includes('mixed alpha'))
      return 'border-purple-500/60 shadow-[0_0_30px_rgba(168,85,247,0.25)] text-purple-400';

    // Local anesthetics / sodium channel blockers
    if (sub.includes('local anesthetic') || sub.includes('sodium channel') || sub.includes('class i'))
      return 'border-orange-500/60 shadow-[0_0_30px_rgba(249,115,22,0.25)] text-orange-400';

    // Cardiac / antiarrhythmic / beta-blockers / CCB / anticoagulants
    if (sub.includes('beta-blocker') || sub.includes('beta blocker') || sub.includes('antiarrhythmic') ||
        sub.includes('ccb') || sub.includes('calcium channel') || sub.includes('cardiac glycoside') ||
        sub.includes('anticoagulant') || sub.includes('antifibrinolytic') || sub.includes('vasodilator') ||
        sub.includes('arterial vasodilator') || sub.includes('venodilator') || sub.includes('pde'))
      return 'border-fuchsia-500/60 shadow-[0_0_30px_rgba(217,70,239,0.25)] text-fuchsia-400';

    // Antiemetics / antihistamines / anticholinergics
    if (sub.includes('antiemetic') || sub.includes('antihistamine') || sub.includes('anticholinergic') ||
        sub.includes('5-ht3') || sub.includes('d2 antagonist') || sub.includes('nk1') ||
        sub.includes('prokinetic') || sub.includes('antipsychotic'))
      return 'border-amber-500/60 shadow-[0_0_30px_rgba(245,158,11,0.25)] text-amber-400';

    // Antibiotics / antifungals
    if (sub.includes('antibiotic') || sub.includes('cephalosporin') || sub.includes('penicillin') ||
        sub.includes('carbapenem') || sub.includes('aminoglycoside') || sub.includes('fluoroquinolone') ||
        sub.includes('glycopeptide') || sub.includes('nitroimidazole'))
      return 'border-lime-500/60 shadow-[0_0_30px_rgba(132,204,22,0.25)] text-lime-400';

    // Hormones / endocrine / steroids / antidiabetic
    if (sub.includes('corticosteroid') || sub.includes('hormone') || sub.includes('antidiabetic') ||
        sub.includes('antithyroid') || sub.includes('uterotonic') || sub.includes('prostaglandin') ||
        sub.includes('vasopressin analogue'))
      return 'border-pink-500/60 shadow-[0_0_30px_rgba(236,72,153,0.25)] text-pink-400';

    // Antidotes / rescue agents / reversal / specific antagonists
    if (sub.includes('antidote') || sub.includes('rescue') || sub.includes('cyanide') ||
        sub.includes('coagulation factor') || sub.includes('complement') || sub.includes('lipid emulsion'))
      return 'border-rose-500/60 shadow-[0_0_30px_rgba(244,63,94,0.25)] text-rose-400';

    // GI / diuretics / electrolytes
    if (sub.includes('diuretic') || sub.includes('electrolyte') || sub.includes('ppi') ||
        sub.includes('h2 receptor') || sub.includes('buffer') || sub.includes('osmotic'))
      return 'border-sky-500/60 shadow-[0_0_30px_rgba(14,165,233,0.25)] text-sky-400';

    return 'border-indigo-500/60 shadow-[0_0_30px_rgba(99,102,241,0.25)] text-indigo-400';
  };

  const activeThemeClass = getThemeColors();

  return (
    <div 
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div 
        className={`bg-slate-950/95 border-2 ${activeThemeClass} backdrop-blur-2xl rounded-xl p-5 md:p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar flex flex-col gap-4 shadow-2xl animate-in zoom-in-95 duration-200`}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-3 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
              <HelpCircle className="text-purple-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-white font-mono leading-tight">
                {activeItem.name}
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                {activeItem.category} • {activeItem.subCategory}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto self-stretch sm:self-auto shrink-0 font-mono">
            {/* Quick Switch Dropdown */}
            <span className="text-[9px] uppercase font-extrabold text-slate-500 shrink-0 select-none">Quick Lookup:</span>
            <select
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setIsDetailedExpanded(false);
              }}
              className="flex-1 sm:flex-initial bg-slate-900/90 text-slate-200 text-xs font-bold border border-slate-800 rounded-lg p-2 pr-8 outline-none focus:border-purple-500/50 appearance-none cursor-pointer max-w-[200px] truncate"
            >
              {allItems.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.subCategory})
                </option>
              ))}
            </select>
            
            {/* Close Button */}
            <button 
              onClick={close} 
              className="text-slate-400 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar flex flex-col gap-4 font-mono text-[11px] leading-relaxed text-slate-300">
          
          {/* Snapshot Summary Section */}
          <div className="flex flex-col p-3 bg-slate-900/50 border border-slate-900 rounded-xl">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-400 mb-2 flex items-center gap-1.5 border-b border-amber-500/10 pb-1.5 select-none">
              <span>📋 Quick Snapshot Summary</span>
            </div>
            <div className="space-y-1 text-slate-300">
              {parseAndRenderText(summaryPart, handleActionClick)}
            </div>
          </div>

          {/* Expand Button */}
          {hasTwoFold && (
            <button
              type="button"
              onClick={() => setIsDetailedExpanded(!isDetailedExpanded)}
              className="py-2 px-3 bg-slate-900/80 border border-slate-800 text-[10px] font-black uppercase text-amber-400 rounded-xl hover:bg-slate-900 hover:border-amber-500/40 active:scale-98 transition-all flex items-center gap-1.5 justify-center self-start select-none shadow-sm cursor-pointer"
            >
              <BookOpen size={12} />
              {isDetailedExpanded ? '📖 Collapse Detailed Consult' : '🔍 Expand Full Detailed Consult'}
              {isDetailedExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}

          {/* Expanded Consultation */}
          {hasTwoFold && isDetailedExpanded && (
            <div className="mt-1 pt-3 border-t border-white/5 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-blue-400 mb-3 flex items-center gap-1.5 border-b border-blue-500/20 pb-1.5 select-none">
                <span>🧠 Comprehensive Teaching Consult</span>
              </div>
              <div className="space-y-3 detailed-consultation-rendered">
                {parseAndRenderText(detailedPart, handleActionClick)}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex gap-3 mt-2 pt-3 border-t border-white/5 shrink-0">
          <button 
            onClick={close} 
            className="w-full glass-button glass-button-purple p-3 rounded-lg font-bold text-white transition text-[10px] font-mono uppercase tracking-wider cursor-pointer"
          >
            Close Consult
          </button>
        </div>
      </div>
    </div>
  );
};
