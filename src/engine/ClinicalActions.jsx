import React from 'react';

export const CLINICAL_ACTIONS = {
  // Medications
  "epinephrine": { type: "medication", drug: "epinephrine", dose: 50, route: "IV", drugType: "Bolus", unit: "mcg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "phenylephrine": { type: "medication", drug: "phenylephrine", dose: 100, route: "IV", drugType: "Bolus", unit: "mcg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "atropine": { type: "medication", drug: "atropine", dose: 0.5, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "glycopyrrolate": { type: "medication", drug: "glycopyrrolate", dose: 0.2, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "esmolol": { type: "medication", drug: "esmolol", dose: 20, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "succinylcholine": { type: "medication", drug: "succinylcholine", dose: 100, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "rocuronium": { type: "medication", drug: "rocuronium", dose: 50, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "propofol": { type: "medication", drug: "propofol", dose: 150, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "fentanyl": { type: "medication", drug: "fentanyl", dose: 100, route: "IV", drugType: "Bolus", unit: "mcg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "calcium chloride": { type: "medication", drug: "calcium", dose: 1000, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "calcium": { type: "medication", drug: "calcium", dose: 1000, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "albuterol": { type: "medication", drug: "albuterol", dose: 2.5, route: "Inhaled (via ETT)", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },

  // Procedures
  "larson's jaw-thrust": { type: "procedure", action: "larson", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "larson's point": { type: "procedure", action: "larson", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "larson maneuver": { type: "procedure", action: "larson", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "jaw-thrust": { type: "procedure", action: "larson", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "suction airway": { type: "procedure", action: "suction", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "suction": { type: "procedure", action: "suction", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "laryngoscopy": { type: "procedure", action: "laryngoscopy", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "intubation": { type: "procedure", action: "laryngoscopy", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "lma": { type: "procedure", action: "laryngoscopy", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "npo fasting history": { type: "procedure", action: "npo", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "npo history": { type: "procedure", action: "npo", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "fasting history": { type: "procedure", action: "npo", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "airway exam": { type: "procedure", action: "airway_exam", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },

  // UI Actions
  "review chart": { type: "ui", action: "review_chart", color: "text-purple-400 border-purple-800 bg-purple-950/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.15)]" },
  "pre-op emr": { type: "ui", action: "review_chart", color: "text-purple-400 border-purple-800 bg-purple-950/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.15)]" },
  "live labs": { type: "ui", action: "live_labs", color: "text-purple-400 border-purple-800 bg-purple-950/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.15)]" },
  "labs": { type: "ui", action: "live_labs", color: "text-purple-400 border-purple-800 bg-purple-950/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.15)]" }
};

const keywords = Object.keys(CLINICAL_ACTIONS).sort((a, b) => b.length - a.length);
const regexPattern = new RegExp(`\\b(${keywords.map(k => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})\\b`, 'gi');

export const parseAndRenderText = (text, onActionClick) => {
  if (!text || typeof text !== 'string') return text;
  if (!onActionClick) return text;

  const parts = text.split(regexPattern);
  if (parts.length === 1) return text;

  return parts.map((part, index) => {
    const lowerPart = part.toLowerCase();
    const actionConfig = CLINICAL_ACTIONS[lowerPart];
    if (actionConfig) {
      return (
        <button
          key={index}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onActionClick(lowerPart);
          }}
          className={`inline-flex items-center mx-1 px-1.5 py-0.5 rounded text-[10px] font-black border font-mono tracking-wide uppercase transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm ${actionConfig.color}`}
        >
          {part}
        </button>
      );
    }
    return part;
  });
};
