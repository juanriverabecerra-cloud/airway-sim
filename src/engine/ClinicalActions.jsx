
export const CLINICAL_ACTIONS = {
  // === SEDATIVES & HYPNOTICS ===
  "dexmedetomidine": { type: "medication", drug: "dexmedetomidine", dose: 1, route: "IV", drugType: "Bolus", unit: "mcg/kg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "etomidate": { type: "medication", drug: "etomidate", dose: 20, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "ketamine": { type: "medication", drug: "ketamine", dose: 100, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "midazolam": { type: "medication", drug: "midazolam", dose: 2, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "propofol": { type: "medication", drug: "propofol", dose: 150, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },

  // === OPIOIDS & ANALGESICS ===
  "fentanyl": { type: "medication", drug: "fentanyl", dose: 100, route: "IV", drugType: "Bolus", unit: "mcg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "hydromorphone": { type: "medication", drug: "hydromorphone", dose: 0.5, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "morphine": { type: "medication", drug: "morphine", dose: 4, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "remifentanil": { type: "medication", drug: "remifentanil", dose: 70, route: "IV", drugType: "Bolus", unit: "mcg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "sufentanil": { type: "medication", drug: "sufentanil", dose: 10, route: "IV", drugType: "Bolus", unit: "mcg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },

  // === PARALYTICS & REVERSALS ===
  "cisatracurium": { type: "medication", drug: "cisatracurium", dose: 10, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "glycopyrrolate": { type: "medication", drug: "glycopyrrolate", dose: 0.2, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "neostigmine": { type: "medication", drug: "neostigmine", dose: 3.5, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "rocuronium": { type: "medication", drug: "rocuronium", dose: 50, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "succinylcholine": { type: "medication", drug: "succinylcholine", dose: 100, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "sugammadex": { type: "medication", drug: "sugammadex", dose: 200, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "vecuronium": { type: "medication", drug: "vecuronium", dose: 10, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },

  // === INOTROPES & VASOPRESSORS ===
  "dobutamine": { type: "medication", drug: "dobutamine", dose: 5, route: "IV", drugType: "Bolus", unit: "mcg/kg/min", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "dopamine": { type: "medication", drug: "dopamine", dose: 5, route: "IV", drugType: "Bolus", unit: "mcg/kg/min", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "ephedrine": { type: "medication", drug: "ephedrine", dose: 5, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "epinephrine": { type: "medication", drug: "epinephrine", dose: 50, route: "IV", drugType: "Bolus", unit: "mcg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "milrinone": { type: "medication", drug: "milrinone", dose: 0.5, route: "IV", drugType: "Bolus", unit: "mcg/kg/min", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "norepinephrine": { type: "medication", drug: "norepinephrine", dose: 0.1, route: "IV", drugType: "Bolus", unit: "mcg/kg/min", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "phenylephrine": { type: "medication", drug: "phenylephrine", dose: 100, route: "IV", drugType: "Bolus", unit: "mcg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "vasopressin": { type: "medication", drug: "vasopressin", dose: 1, route: "IV", drugType: "Bolus", unit: "Unit", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },

  // === ANTIHYPERTENSIVES ===
  "clevidipine": { type: "medication", drug: "clevidipine", dose: 2, route: "IV", drugType: "Bolus", unit: "mg/hr", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "clonidine": { type: "medication", drug: "clonidine", dose: 150, route: "IV", drugType: "Bolus", unit: "mcg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "enalaprilat": { type: "medication", drug: "enalaprilat", dose: 1.25, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "esmolol": { type: "medication", drug: "esmolol", dose: 20, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "hydralazine": { type: "medication", drug: "hydralazine", dose: 10, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "labetalol": { type: "medication", drug: "labetalol", dose: 10, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "metoprolol": { type: "medication", drug: "metoprolol", dose: 5, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "nicardipine": { type: "medication", drug: "nicardipine", dose: 5, route: "IV", drugType: "Bolus", unit: "mg/hr", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "nitroglycerin": { type: "medication", drug: "nitroglycerin", dose: 20, route: "IV", drugType: "Bolus", unit: "mcg/min", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "nitroprusside": { type: "medication", drug: "nitroprusside", dose: 0.5, route: "IV", drugType: "Bolus", unit: "mcg/kg/min", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "phentolamine": { type: "medication", drug: "phentolamine", dose: 2, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },

  // === DIURETICS ===
  "acetazolamide": { type: "medication", drug: "acetazolamide", dose: 250, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "bumetanide": { type: "medication", drug: "bumetanide", dose: 1, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "furosemide": { type: "medication", drug: "furosemide", dose: 20, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "mannitol": { type: "medication", drug: "mannitol", dose: 50, route: "IV", drugType: "Bolus", unit: "g", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },

  // === ANTIARRHYTHMICS & ELECTROLYTES ===
  "adenosine": { type: "medication", drug: "adenosine", dose: 6, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "amiodarone": { type: "medication", drug: "amiodarone", dose: 150, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "atropine": { type: "medication", drug: "atropine", dose: 0.5, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "bicarbonate": { type: "medication", drug: "bicarbonate", dose: 50, route: "IV", drugType: "Bolus", unit: "mEq", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "calcium chloride": { type: "medication", drug: "calcium", dose: 1000, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "calcium": { type: "medication", drug: "calcium", dose: 1000, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "digoxin": { type: "medication", drug: "digoxin", dose: 0.25, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "diltiazem": { type: "medication", drug: "diltiazem", dose: 10, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "ibutilide": { type: "medication", drug: "ibutilide", dose: 1, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "lidocaine": { type: "medication", drug: "lidocaine", dose: 100, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "benzocaine": { type: "medication", drug: "benzocaine", dose: 1, route: "Topical", drugType: "Bolus", unit: "sprays", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "prilocaine": { type: "medication", drug: "prilocaine", dose: 100, route: "IV", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
  "albuterol": { type: "medication", drug: "albuterol", dose: 2.5, route: "Inhaled (via ETT)", drugType: "Bolus", unit: "mg", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },

  // === RESUSCITATION FLUIDS ===
  "packed red blood cells": { type: "fluid", fluid: "Packed Red Blood Cells (PRBC)", dose: 1, color: "text-emerald-400 border-emerald-800 bg-emerald-950/40 hover:bg-emerald-900/60 shadow-[0_0_8px_rgba(16,185,129,0.15)]" },
  "prbc": { type: "fluid", fluid: "Packed Red Blood Cells (PRBC)", dose: 1, color: "text-emerald-400 border-emerald-800 bg-emerald-950/40 hover:bg-emerald-900/60 shadow-[0_0_8px_rgba(16,185,129,0.15)]" },
  "fresh frozen plasma": { type: "fluid", fluid: "Fresh Frozen Plasma (FFP)", dose: 1, color: "text-emerald-400 border-emerald-800 bg-emerald-950/40 hover:bg-emerald-900/60 shadow-[0_0_8px_rgba(16,185,129,0.15)]" },
  "ffp": { type: "fluid", fluid: "Fresh Frozen Plasma (FFP)", dose: 1, color: "text-emerald-400 border-emerald-800 bg-emerald-950/40 hover:bg-emerald-900/60 shadow-[0_0_8px_rgba(16,185,129,0.15)]" },
  "lactated ringers": { type: "fluid", fluid: "Lactated Ringers (LR)", dose: 500, color: "text-emerald-400 border-emerald-800 bg-emerald-950/40 hover:bg-emerald-900/60 shadow-[0_0_8px_rgba(16,185,129,0.15)]" },
  "lr": { type: "fluid", fluid: "Lactated Ringers (LR)", dose: 500, color: "text-emerald-400 border-emerald-800 bg-emerald-950/40 hover:bg-emerald-900/60 shadow-[0_0_8px_rgba(16,185,129,0.15)]" },
  "normal saline": { type: "fluid", fluid: "Normal Saline (0.9% NS)", dose: 500, color: "text-emerald-400 border-emerald-800 bg-emerald-950/40 hover:bg-emerald-900/60 shadow-[0_0_8px_rgba(16,185,129,0.15)]" },
  "ns": { type: "fluid", fluid: "Normal Saline (0.9% NS)", dose: 500, color: "text-emerald-400 border-emerald-800 bg-emerald-950/40 hover:bg-emerald-900/60 shadow-[0_0_8px_rgba(16,185,129,0.15)]" },
  "plasmalyte": { type: "fluid", fluid: "Plasmalyte", dose: 500, color: "text-emerald-400 border-emerald-800 bg-emerald-950/40 hover:bg-emerald-900/60 shadow-[0_0_8px_rgba(16,185,129,0.15)]" },
  "albumin": { type: "fluid", fluid: "Albumin 5%", dose: 1, color: "text-emerald-400 border-emerald-800 bg-emerald-950/40 hover:bg-emerald-900/60 shadow-[0_0_8px_rgba(16,185,129,0.15)]" },
  "platelets": { type: "fluid", fluid: "Platelets", dose: 1, color: "text-emerald-400 border-emerald-800 bg-emerald-950/40 hover:bg-emerald-900/60 shadow-[0_0_8px_rgba(16,185,129,0.15)]" },
  "cryoprecipitate": { type: "fluid", fluid: "Cryoprecipitate", dose: 1, color: "text-emerald-400 border-emerald-800 bg-emerald-950/40 hover:bg-emerald-900/60 shadow-[0_0_8px_rgba(16,185,129,0.15)]" },
  "fibrinogen": { type: "fluid", fluid: "Fibrinogen Concentrate", dose: 1, color: "text-emerald-400 border-emerald-800 bg-emerald-950/40 hover:bg-emerald-900/60 shadow-[0_0_8px_rgba(16,185,129,0.15)]" },

  // === RESUSCITATION DELIVERY WARMERS ===
  "swap gravity": { type: "procedure", action: "swap_gravity", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "swap ranger": { type: "procedure", action: "swap_ranger", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "swap belmont": { type: "procedure", action: "swap_belmont", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "belmont": { type: "procedure", action: "swap_belmont", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "ranger": { type: "procedure", action: "swap_ranger", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },

  // === ACCESS PLACEMENTS ===
  "place piv": { type: "procedure", action: "place_piv", color: "text-emerald-400 border-emerald-800 bg-emerald-950/40 hover:bg-emerald-900/60 shadow-[0_0_8px_rgba(16,185,129,0.15)]" },
  "place central line": { type: "procedure", action: "place_cvc", color: "text-emerald-400 border-emerald-800 bg-emerald-950/40 hover:bg-emerald-900/60 shadow-[0_0_8px_rgba(16,185,129,0.15)]" },
  "central line": { type: "procedure", action: "place_cvc", color: "text-emerald-400 border-emerald-800 bg-emerald-950/40 hover:bg-emerald-900/60 shadow-[0_0_8px_rgba(16,185,129,0.15)]" },
  "place io": { type: "procedure", action: "place_io", color: "text-emerald-400 border-emerald-800 bg-emerald-950/40 hover:bg-emerald-900/60 shadow-[0_0_8px_rgba(16,185,129,0.15)]" },
  "place arterial line": { type: "procedure", action: "place_art", color: "text-emerald-400 border-emerald-800 bg-emerald-950/40 hover:bg-emerald-900/60 shadow-[0_0_8px_rgba(16,185,129,0.15)]" },
  "arterial line": { type: "procedure", action: "place_art", color: "text-emerald-400 border-emerald-800 bg-emerald-950/40 hover:bg-emerald-900/60 shadow-[0_0_8px_rgba(16,185,129,0.15)]" },

  // === CHECKLISTS & PROTOCOLS ===
  "msmaids checklist": { type: "procedure", action: "msmaids", color: "text-purple-400 border-purple-800 bg-purple-950/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.15)]" },
  "msmaids check": { type: "procedure", action: "msmaids", color: "text-purple-400 border-purple-800 bg-purple-950/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.15)]" },
  "msmaids": { type: "procedure", action: "msmaids", color: "text-purple-400 border-purple-800 bg-purple-950/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.15)]" },
  "pre-op checklists": { type: "procedure", action: "preop", color: "text-purple-400 border-purple-800 bg-purple-950/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.15)]" },
  "pre-op checklist": { type: "procedure", action: "preop", color: "text-purple-400 border-purple-800 bg-purple-950/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.15)]" },
  "post-intubation check": { type: "procedure", action: "post_intub", color: "text-purple-400 border-purple-800 bg-purple-950/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.15)]" },
  "extubation check": { type: "procedure", action: "extub", color: "text-purple-400 border-purple-800 bg-purple-950/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.15)]" },
  "cuff leak test": { type: "procedure", action: "cuff_leak", color: "text-purple-400 border-purple-800 bg-purple-950/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.15)]" },

  // === ACLS, CPR & DEFIB ===
  "cpr": { type: "procedure", action: "cpr", color: "text-rose-500 border-rose-800 bg-rose-950/40 hover:bg-rose-900/60 shadow-[0_0_8px_rgba(244,63,94,0.15)]" },
  "start cpr": { type: "procedure", action: "cpr", color: "text-rose-500 border-rose-800 bg-rose-950/40 hover:bg-rose-900/60 shadow-[0_0_8px_rgba(244,63,94,0.15)]" },
  "check rhythm": { type: "procedure", action: "check_rhythm", color: "text-rose-500 border-rose-800 bg-rose-950/40 hover:bg-rose-900/60 shadow-[0_0_8px_rgba(244,63,94,0.15)]" },
  "deliver shock": { type: "procedure", action: "shock", color: "text-rose-500 border-rose-800 bg-rose-950/40 hover:bg-rose-900/60 shadow-[0_0_8px_rgba(244,63,94,0.15)]" },

  // === LAB ORDERS ===
  "abg": { type: "procedure", action: "order_abg", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)]" },
  "order abg": { type: "procedure", action: "order_abg", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)]" },
  "vbg": { type: "procedure", action: "order_vbg", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)]" },
  "order vbg": { type: "procedure", action: "order_vbg", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)]" },
  "cbc": { type: "procedure", action: "order_cbc", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)]" },
  "order cbc": { type: "procedure", action: "order_cbc", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)]" },
  "cmp": { type: "procedure", action: "order_cmp", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)]" },
  "order cmp": { type: "procedure", action: "order_cmp", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)]" },
  "coags": { type: "procedure", action: "order_coags", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)]" },
  "order coags": { type: "procedure", action: "order_coags", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)]" },
  "teg": { type: "procedure", action: "order_teg", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)]" },
  "order teg": { type: "procedure", action: "order_teg", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)]" },

  // === AIRWAY INTERVENTION MANEUVERS ===
  "larson's jaw-thrust": { type: "procedure", action: "larson", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "larson's point": { type: "procedure", action: "larson", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "larson maneuver": { type: "procedure", action: "larson", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "jaw-thrust": { type: "procedure", action: "jaw_thrust", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "suction airway": { type: "procedure", action: "suction", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "suction": { type: "procedure", action: "suction", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "laryngoscopy": { type: "procedure", action: "laryngoscopy", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "intubation": { type: "procedure", action: "laryngoscopy", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "npo fasting history": { type: "procedure", action: "npo", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "npo history": { type: "procedure", action: "npo", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "fasting history": { type: "procedure", action: "npo", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "airway exam": { type: "procedure", action: "airway_exam", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "surgical cric": { type: "procedure", action: "surgical_cric", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "cricothyroidotomy": { type: "procedure", action: "surgical_cric", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "extubate": { type: "procedure", action: "extubate", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "deflate and extubate": { type: "procedure", action: "extubate", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "place opa": { type: "procedure", action: "place_opa", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "opa": { type: "procedure", action: "place_opa", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "place npa": { type: "procedure", action: "place_npa", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "npa": { type: "procedure", action: "place_npa", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "place lma": { type: "procedure", action: "place_lma", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "lma": { type: "procedure", action: "place_lma", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "spray lidocaine": { type: "procedure", action: "spray_lidocaine", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "lidocaine spray": { type: "procedure", action: "spray_lidocaine", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },

  // === ANATOMICAL POSITIONING ===
  "supine": { type: "procedure", action: "pos_supine", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "sniffing": { type: "procedure", action: "pos_sniffing", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "ramped": { type: "procedure", action: "pos_ramped", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "trendelenburg": { type: "procedure", action: "pos_trendelenburg", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "reverse trendelenburg": { type: "procedure", action: "pos_rev_trendelenburg", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "lithotomy": { type: "procedure", action: "pos_lithotomy", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "lateral": { type: "procedure", action: "pos_lateral", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "prone": { type: "procedure", action: "pos_prone", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
  "sitting": { type: "procedure", action: "pos_sitting", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },

  // === CHARTS & TELEMETRY UI ===
  "review chart": { type: "ui", action: "review_chart", color: "text-purple-400 border-purple-800 bg-purple-950/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.15)]" },
  "pre-op EMR": { type: "ui", action: "review_chart", color: "text-purple-400 border-purple-800 bg-purple-950/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.15)]" },
  "pre-op emr": { type: "ui", action: "review_chart", color: "text-purple-400 border-purple-800 bg-purple-950/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.15)]" },
  "live labs": { type: "ui", action: "live_labs", color: "text-purple-400 border-purple-800 bg-purple-950/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.15)]" },
  "labs": { type: "ui", action: "live_labs", color: "text-purple-400 border-purple-800 bg-purple-950/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.15)]" },

  // === H'S & T'S DIAGNOSTIC AUDITS ===
  "audit hypovolemia": { type: "audit", action: "audit_hypovolemia", color: "text-amber-400 border-amber-800 bg-amber-950/40 hover:bg-amber-900/60 shadow-[0_0_8px_rgba(245,158,11,0.15)] font-mono" },
  "audit hypoxia": { type: "audit", action: "audit_hypoxia", color: "text-amber-400 border-amber-800 bg-amber-950/40 hover:bg-amber-900/60 shadow-[0_0_8px_rgba(245,158,11,0.15)] font-mono" },
  "audit acidosis": { type: "audit", action: "audit_acidosis", color: "text-amber-400 border-amber-800 bg-amber-950/40 hover:bg-amber-900/60 shadow-[0_0_8px_rgba(245,158,11,0.15)] font-mono" },
  "audit hyperkalemia": { type: "audit", action: "audit_hyperkalemia", color: "text-amber-400 border-amber-800 bg-amber-950/40 hover:bg-amber-900/60 shadow-[0_0_8px_rgba(245,158,11,0.15)] font-mono" },
  "audit hypothermia": { type: "audit", action: "audit_hypothermia", color: "text-amber-400 border-amber-800 bg-amber-950/40 hover:bg-amber-900/60 shadow-[0_0_8px_rgba(245,158,11,0.15)] font-mono" },
  "audit toxins": { type: "audit", action: "audit_toxins", color: "text-amber-400 border-amber-800 bg-amber-950/40 hover:bg-amber-900/60 shadow-[0_0_8px_rgba(245,158,11,0.15)] font-mono" },
  "audit tension pneumothorax": { type: "audit", action: "audit_tension", color: "text-amber-400 border-amber-800 bg-amber-950/40 hover:bg-amber-900/60 shadow-[0_0_8px_rgba(245,158,11,0.15)] font-mono" },
  "audit cardiac tamponade": { type: "audit", action: "audit_tamponade", color: "text-amber-400 border-amber-800 bg-amber-950/40 hover:bg-amber-900/60 shadow-[0_0_8px_rgba(245,158,11,0.15)] font-mono" },
  "audit pulmonary thrombosis": { type: "audit", action: "audit_pulmonary", color: "text-amber-400 border-amber-800 bg-amber-950/40 hover:bg-amber-900/60 shadow-[0_0_8px_rgba(245,158,11,0.15)] font-mono" },
  "audit coronary thrombosis": { type: "audit", action: "audit_coronary", color: "text-amber-400 border-amber-800 bg-amber-950/40 hover:bg-amber-900/60 shadow-[0_0_8px_rgba(245,158,11,0.15)] font-mono" },

  // === AUSCULTATION & EXAMS ===
  "auscultate lungs": { type: "procedure", action: "auscultate_lungs", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)] font-mono" },
  "auscultate breath sounds": { type: "procedure", action: "auscultate_lungs", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)] font-mono" },
  "auscultate": { type: "procedure", action: "auscultate_lungs", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)] font-mono" },
  "auscultation": { type: "procedure", action: "auscultate_lungs", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)] font-mono" },

  // === SURGICAL TIMELINE PHASES ===
  "phase preop": { type: "procedure", action: "phase_preop", color: "text-purple-400 border-purple-800 bg-purple-950/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.15)] font-mono" },
  "timeline preop": { type: "procedure", action: "phase_preop", color: "text-purple-400 border-purple-800 bg-purple-950/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.15)] font-mono" },
  "phase induction": { type: "procedure", action: "phase_induction", color: "text-purple-400 border-purple-800 bg-purple-950/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.15)] font-mono" },
  "timeline induction": { type: "procedure", action: "phase_induction", color: "text-purple-400 border-purple-800 bg-purple-950/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.15)] font-mono" },
  "phase incision": { type: "procedure", action: "phase_incision", color: "text-purple-400 border-purple-800 bg-purple-950/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.15)] font-mono" },
  "timeline incision": { type: "procedure", action: "phase_incision", color: "text-purple-400 border-purple-800 bg-purple-950/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.15)] font-mono" },
  "phase maintenance": { type: "procedure", action: "phase_maintenance", color: "text-purple-400 border-purple-800 bg-purple-950/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.15)] font-mono" },
  "timeline maintenance": { type: "procedure", action: "phase_maintenance", color: "text-purple-400 border-purple-800 bg-purple-950/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.15)] font-mono" },
  "phase emergence": { type: "procedure", action: "phase_emergence", color: "text-purple-400 border-purple-800 bg-purple-950/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.15)] font-mono" },
  "timeline emergence": { type: "procedure", action: "phase_emergence", color: "text-purple-400 border-purple-800 bg-purple-950/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.15)] font-mono" },

  // === POCUS ULTRASOUNDS ===
  "tte pocus": { type: "procedure", action: "pocus_cardiac", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-mono" },
  "cardiac pocus": { type: "procedure", action: "pocus_cardiac", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-mono" },
  "lung pocus": { type: "procedure", action: "pocus_lung", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-mono" },
  "gastric pocus": { type: "procedure", action: "pocus_gastric", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-mono" },
  "efast pocus": { type: "procedure", action: "pocus_efast", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-mono" },
  "fast pocus": { type: "procedure", action: "pocus_efast", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-mono" },

  // === ADDITIONAL POC & CENTRAL LABS ===
  "order lfts": { type: "procedure", action: "order_lfts", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-mono" },
  "lfts": { type: "procedure", action: "order_lfts", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-mono" },
  "order thyroid": { type: "procedure", action: "order_thyroid", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-mono" },
  "thyroid": { type: "procedure", action: "order_thyroid", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-mono" },
  "order urinalysis": { type: "procedure", action: "order_urinalysis", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-mono" },
  "urinalysis": { type: "procedure", action: "order_urinalysis", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-mono" },
  "ua": { type: "procedure", action: "order_urinalysis", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-mono" },
  "order ua": { type: "procedure", action: "order_urinalysis", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-mono" },
  "order pregnancy": { type: "procedure", action: "order_pregnancy", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-mono" },
  "pregnancy": { type: "procedure", action: "order_pregnancy", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-mono" },
  "hcg": { type: "procedure", action: "order_pregnancy", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-mono" },
  "order hcg": { type: "procedure", action: "order_pregnancy", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-mono" },
  "order type and screen": { type: "procedure", action: "order_ts", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-mono" },
  "type and screen": { type: "procedure", action: "order_ts", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-mono" },
  "t&s": { type: "procedure", action: "order_ts", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-mono" },
  "order t&s": { type: "procedure", action: "order_ts", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-mono" },
  "order type and cross": { type: "procedure", action: "order_tcross", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-mono" },
  "type and cross": { type: "procedure", action: "order_tcross", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-mono" },
  "t&cross": { type: "procedure", action: "order_tcross", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-mono" },
  "order t&cross": { type: "procedure", action: "order_tcross", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-mono" },
  "order hba1c": { type: "procedure", action: "order_hba1c", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-mono" },
  "hba1c": { type: "procedure", action: "order_hba1c", color: "text-blue-400 border-blue-800 bg-blue-950/40 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-mono" },

  // === NEURO & TWITCH MONITORS ===
  "attach bis": { type: "procedure", action: "toggle_bis", color: "text-purple-400 border-purple-800 bg-purple-950/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.15)] font-mono" },
  "bis monitor": { type: "procedure", action: "toggle_bis", color: "text-purple-400 border-purple-800 bg-purple-950/40 hover:bg-purple-900/60 shadow-[0_0_8px_rgba(168,85,247,0.15)] font-mono" },
  "attach tof": { type: "procedure", action: "toggle_tof", color: "text-amber-400 border-amber-800 bg-amber-950/40 hover:bg-amber-900/60 shadow-[0_0_8px_rgba(245,158,11,0.15)] font-mono" },
  "tof monitor": { type: "procedure", action: "toggle_tof", color: "text-amber-400 border-amber-800 bg-amber-950/40 hover:bg-amber-900/60 shadow-[0_0_8px_rgba(245,158,11,0.15)] font-mono" },

  // === NON-INVASIVE OXYGENATION ===
  "bag-mask ventilation": { type: "procedure", action: "o2_bmv", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)] font-mono" },
  "bag-mask": { type: "procedure", action: "o2_bmv", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)] font-mono" },
  "bmv": { type: "procedure", action: "o2_bmv", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)] font-mono" },
  "nasal cannula": { type: "procedure", action: "o2_cannula", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)] font-mono" },
  "simple face mask": { type: "procedure", action: "o2_mask", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)] font-mono" },
  "face mask": { type: "procedure", action: "o2_mask", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)] font-mono" },
  "non-rebreather mask": { type: "procedure", action: "o2_nrb", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)] font-mono" },
  "nrb": { type: "procedure", action: "o2_nrb", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)] font-mono" },
  "high flow nasal cannula": { type: "procedure", action: "o2_hfnc", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)] font-mono" },
  "hfnc": { type: "procedure", action: "o2_hfnc", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)] font-mono" },
  "cpap": { type: "procedure", action: "o2_cpap", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)] font-mono" },
  "bipap": { type: "procedure", action: "o2_bipap", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)] font-mono" },
  "room air": { type: "procedure", action: "o2_room_air", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)] font-mono" },
  "remove o2": { type: "procedure", action: "o2_room_air", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.15)] font-mono" },

  // === ETT TUBE ADJUSTMENTS ===
  "pull back": { type: "procedure", action: "pull_back", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)] font-mono" },
  "pull back tube": { type: "procedure", action: "pull_back", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)] font-mono" },
  "pull back ett": { type: "procedure", action: "pull_back", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)] font-mono" },
  "remove tube": { type: "procedure", action: "remove_tube", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)] font-mono" },
  "remove ett": { type: "procedure", action: "remove_tube", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)] font-mono" },
  "remove": { type: "procedure", action: "remove_tube", color: "text-teal-400 border-teal-800 bg-teal-950/40 hover:bg-teal-900/60 shadow-[0_0_8px_rgba(20,184,166,0.15)] font-mono" }

  // DEVELOPER NOTE: If any new feature or action is added to the simulator in the future, make sure to add it to this CLINICAL_ACTIONS dictionary so it becomes available to the Attending engine.
};

const keywords = Object.keys(CLINICAL_ACTIONS).sort((a, b) => b.length - a.length);
const regexPattern = new RegExp(`\\b(${keywords.map(k => k.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})\\b`, 'gi');

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
            if (typeof onActionClick === 'function') {
              onActionClick(lowerPart);
            }
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
