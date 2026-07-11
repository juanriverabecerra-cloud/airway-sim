/**
 * ReceptorBodyPanel — Floating Pharmacodynamic Body Map
 *
 * An interactive SVG human body silhouette where hovering over anatomical
 * regions reveals which receptors are active/blocked by current drugs.
 * Organs glow with color and intensity proportional to real-time receptor
 * occupancy computed from PKPDEngine Ce values via the Hill equation.
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { X, Dna, GripVertical } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// RECEPTOR KNOWLEDGE MAP
// drug name → array of receptor entries per anatomical site
// Ce units match Pharmacology.js (mg/L for most; mcg/L noted where different)
// action: 'agonist' | 'antagonist' | 'modulator' | 'inhibitor'
// color: 'blue'=CNS depression | 'green'=activation | 'red'=blockade | 'amber'=mixed
// ─────────────────────────────────────────────────────────────────────────────
const DRUG_RECEPTOR_MAP = {
  // ── INDUCTION / SEDATION ──────────────────────────────────────────────────
  Propofol: [
    { site: 'brain',    receptor: 'GABA-A',  action: 'agonist',    c50: 3.5,    gamma: 2.76, label: 'Unconsciousness', color: 'blue',
      detail: 'Potentiates GABA-A → ↑Cl⁻ influx → hyperpolarization' },
    { site: 'arterial', receptor: 'α₁',      action: 'antagonist', c50: 4.0,    gamma: 1.5,  label: '↓ SVR / Vasodilation', color: 'red',
      detail: 'Inhibits smooth-muscle Ca²⁺ release independent of α₁' },
  ],
  Etomidate: [
    { site: 'brain',    receptor: 'GABA-A',  action: 'agonist',    c50: 0.35,   gamma: 1.8,  label: 'Unconsciousness (hemostable)', color: 'blue',
      detail: 'Selective GABA-A potentiation; adrenocortical suppression via 11β-hydroxylase block' },
  ],
  Midazolam: [
    { site: 'brain',    receptor: 'GABA-A',  action: 'modulator',  c50: 0.15,   gamma: 1.5,  label: 'Anxiolysis / Sedation', color: 'blue',
      detail: 'BZD site → ↑Cl⁻ channel opening frequency; synergistic with propofol' },
  ],
  Diazepam: [
    { site: 'brain',    receptor: 'GABA-A',  action: 'modulator',  c50: 0.30,   gamma: 1.5,  label: 'Anxiolysis / Amnesia', color: 'blue',
      detail: 'Long-acting BZD; active metabolite desmethyldiazepam' },
  ],
  Ketamine: [
    { site: 'brain',    receptor: 'NMDA',    action: 'antagonist', c50: 1.5,    gamma: 1.5,  label: 'Dissociative Anesthesia', color: 'amber',
      detail: 'Non-competitive NMDA block → prevents Ca²⁺/glutamate influx; preserves laryngeal reflexes' },
    { site: 'spinal',   receptor: 'NMDA',    action: 'antagonist', c50: 0.5,    gamma: 1.5,  label: '↓ Central sensitization', color: 'amber',
      detail: 'Blocks spinal wind-up; opioid-sparing at sub-anesthetic doses' },
    { site: 'cardiac',  receptor: 'β₁',      action: 'agonist',    c50: 1.5,    gamma: 1.5,  label: '↑ HR / ↑ CO (indirect)', color: 'green',
      detail: 'Central sympathetic activation → NE release → β₁ stimulation' },
    { site: 'arterial', receptor: 'α₁',      action: 'agonist',    c50: 1.5,    gamma: 1.5,  label: '↑ SVR (sympathomimetic)', color: 'green',
      detail: 'Central NE release → peripheral vasoconstriction' },
  ],
  Thiopental: [
    { site: 'brain',    receptor: 'GABA-A',  action: 'agonist',    c50: 15.0,   gamma: 2.0,  label: 'Unconsciousness (barbiturate)', color: 'blue',
      detail: 'Increases GABA-A opening duration; also blocks AMPA receptors' },
  ],
  Dexmedetomidine: [
    { site: 'brain',    receptor: 'α₂-CNS',  action: 'agonist',    c50: 0.6,    gamma: 1.5,  label: 'NREM-like Sedation', color: 'blue',
      detail: 'Locus coeruleus α₂ → ↓NE → arousable sedation without respiratory depression' },
    { site: 'arterial', receptor: 'α₁',      action: 'agonist',    c50: 1.5,    gamma: 1.5,  label: 'Peripheral vasoconstriction (early)', color: 'amber',
      detail: 'Peripheral α₂/α₁ → brief HTN at bolus; superseded by central sympatholysis' },
  ],
  Clonidine: [
    { site: 'brain',    receptor: 'α₂-CNS',  action: 'agonist',    c50: 0.6,    gamma: 1.5,  label: 'Sedation / Antihypertensive', color: 'blue',
      detail: 'α₂ Gi → ↓NE; adjuvant analgesic; reduces anesthetic requirements' },
  ],
  // ── OPIOIDS ───────────────────────────────────────────────────────────────
  Fentanyl: [
    { site: 'brain',    receptor: 'μ-Opioid',action: 'agonist',    c50: 0.0015, gamma: 1.7,  label: 'Analgesia / Resp. Depression', color: 'blue',
      detail: 'Gi → ↓cAMP → closes VGCCs, opens K⁺ → hyperpolarization; context-sensitive t½' },
    { site: 'spinal',   receptor: 'μ-Opioid',action: 'agonist',    c50: 0.0015, gamma: 1.7,  label: 'Spinal analgesia', color: 'blue',
      detail: 'Inhibits dorsal-horn nociceptive transmission; fast systemic absorption from epidural' },
  ],
  Sufentanil: [
    { site: 'brain',    receptor: 'μ-Opioid',action: 'agonist',    c50: 0.0006, gamma: 1.7,  label: 'Analgesia (10× fentanyl)', color: 'blue',
      detail: 'Highest μ-affinity of clinical opioids; high lipophilicity → fast onset' },
    { site: 'spinal',   receptor: 'μ-Opioid',action: 'agonist',    c50: 0.0006, gamma: 1.7,  label: 'Spinal analgesia', color: 'blue',
      detail: 'Rapid cord sequestration → short spinal duration; minimal rostral spread' },
  ],
  Alfentanil: [
    { site: 'brain',    receptor: 'μ-Opioid',action: 'agonist',    c50: 0.095,  gamma: 1.7,  label: 'Rapid-onset analgesia', color: 'blue',
      detail: 'High free fraction (non-ionized) → fast CNS penetration; short context t½' },
  ],
  Remifentanil: [
    { site: 'brain',    receptor: 'μ-Opioid',action: 'agonist',    c50: 0.012,  gamma: 2.1,  label: 'Ultra-short analgesia', color: 'blue',
      detail: 'Ester hydrolysis in plasma/tissue → context-insensitive 3-5 min offset; OIH with prolonged infusion' },
  ],
  Morphine: [
    { site: 'brain',    receptor: 'μ-Opioid',action: 'agonist',    c50: 0.012,  gamma: 1.7,  label: 'Analgesia / Sedation', color: 'blue',
      detail: 'Active M6G metabolite; histamine release → hypotension; accumulates in renal failure' },
    { site: 'spinal',   receptor: 'μ-Opioid',action: 'agonist',    c50: 0.012,  gamma: 1.7,  label: 'Intrathecal: delayed resp. depression 6-18h', color: 'blue',
      detail: 'Hydrophilic → stays in CSF → rostral migration to respiratory center' },
    { site: 'gi',       receptor: 'μ-GI',   action: 'agonist',    c50: 0.012,  gamma: 1.0,  label: '↓ GI motility / constipation', color: 'amber',
      detail: 'Peripheral μ receptors → ↓peristalsis → ileus; first clinical sign in some patients' },
  ],
  Hydromorphone: [
    { site: 'brain',    receptor: 'μ-Opioid',action: 'agonist',    c50: 0.005,  gamma: 1.7,  label: 'Analgesia (5× morphine)', color: 'blue',
      detail: 'Semi-synthetic; preferred in renal failure over morphine (no M6G accumulation)' },
  ],
  Methadone: [
    { site: 'brain',    receptor: 'μ-Opioid',action: 'agonist',    c50: 0.4,    gamma: 1.5,  label: 'Long-acting analgesia', color: 'blue',
      detail: 'QTc prolongation via hERG block; CYP3A4/2D6 interactions; ORT enrollment required' },
    { site: 'brain',    receptor: 'NMDA',    action: 'antagonist', c50: 0.8,    gamma: 1.5,  label: 'NMDA block (opioid-sparing)', color: 'amber',
      detail: 'NMDA antagonism contributes unique analgesic mechanism; reduces opioid tolerance' },
  ],
  Codeine: [
    { site: 'brain',    receptor: 'μ-Opioid',action: 'agonist',    c50: 0.05,   gamma: 1.5,  label: 'Weak analgesia (prodrug)', color: 'blue',
      detail: 'CYP2D6 → morphine; UM: toxic morphine levels; PM: no analgesia (FDA black-box)' },
  ],
  Tramadol: [
    { site: 'brain',    receptor: 'μ-Opioid',action: 'agonist',    c50: 0.1,    gamma: 1.5,  label: 'Weak analgesia + NE/serotonin', color: 'amber',
      detail: 'CYP2D6 → O-desmethyltramadol (active); serotonin syndrome risk with SSRIs' },
  ],
  Naloxone: [
    { site: 'brain',    receptor: 'μ-Opioid',action: 'antagonist', c50: 0.002,  gamma: 2.0,  label: 'Opioid reversal', color: 'red',
      detail: 'Competitive antagonist; short t½ (30-90 min) → re-narcotization risk; titrate to reversal' },
    { site: 'spinal',   receptor: 'μ-Opioid',action: 'antagonist', c50: 0.002,  gamma: 2.0,  label: 'Reverses resp. depression', color: 'red',
      detail: 'Also reverses intrathecal morphine delayed resp. depression' },
  ],
  // ── NMBs ─────────────────────────────────────────────────────────────────
  Rocuronium: [
    { site: 'nmj',      receptor: 'nAChR',   action: 'antagonist', c50: 0.14,   gamma: 5.5,  label: 'NMJ Block (TOF ↓)', color: 'red',
      detail: 'Competitive ACh antagonist at postjunctional nAChR; reversed by sugammadex (encapsulation)' },
  ],
  Vecuronium: [
    { site: 'nmj',      receptor: 'nAChR',   action: 'antagonist', c50: 0.13,   gamma: 5.5,  label: 'NMJ Block (intermediate)', color: 'red',
      detail: 'Aminosteroidal; hepatic/renal metabolism; no cardiovascular effects' },
  ],
  Cisatracurium: [
    { site: 'nmj',      receptor: 'nAChR',   action: 'antagonist', c50: 0.15,   gamma: 5.5,  label: 'NMJ Block (organ-independent)', color: 'red',
      detail: 'Hofmann elimination at physiologic pH/temp; isomer of atracurium; no laudanosine' },
  ],
  Atracurium: [
    { site: 'nmj',      receptor: 'nAChR',   action: 'antagonist', c50: 0.2,    gamma: 5.5,  label: 'NMJ Block (intermediate)', color: 'red',
      detail: 'Hofmann + ester hydrolysis; laudanosine accumulation in prolonged infusion → CNS excitation' },
  ],
  Pancuronium: [
    { site: 'nmj',      receptor: 'nAChR',   action: 'antagonist', c50: 0.15,   gamma: 5.5,  label: 'NMJ Block (long-acting)', color: 'red',
      detail: 'Aminosteroidal; renal-dependent elimination; longest duration' },
    { site: 'cardiac',  receptor: 'M₂',      action: 'antagonist', c50: 0.2,    gamma: 1.5,  label: 'Vagolysis → ↑ HR', color: 'amber',
      detail: 'M2 antagonism → most pronounced tachycardia of any NDMB; caution in CAD/tachyarrhythmias' },
  ],
  Succinylcholine: [
    { site: 'nmj',      receptor: 'nAChR',   action: 'agonist',    c50: 0.3,    gamma: 3.0,  label: 'Fasciculations → Paralysis', color: 'amber',
      detail: 'Depolarizing Phase I → desensitization block; plasma cholinesterase metabolism; Phase II with repeat dosing' },
  ],
  Mivacurium: [
    { site: 'nmj',      receptor: 'nAChR',   action: 'antagonist', c50: 0.15,   gamma: 5.5,  label: 'NMJ Block (ultra-short)', color: 'red',
      detail: 'Plasma cholinesterase hydrolysis; ~15 min duration; no reversal agent typically needed' },
  ],
  Dantrolene: [
    { site: 'nmj',      receptor: 'RyR1',    action: 'antagonist', c50: 2.5,    gamma: 1.5,  label: 'SR Ca²⁺ release block (MH Rx)', color: 'red',
      detail: 'Ryanodine receptor 1 antagonist → prevents Ca²⁺-triggered Ca²⁺ release; 2.5 mg/kg IV for MH' },
  ],
  // ── REVERSAL ──────────────────────────────────────────────────────────────
  Neostigmine: [
    { site: 'nmj',      receptor: 'AChE',    action: 'inhibitor',  c50: 0.04,   gamma: 1.5,  label: 'NMJ Reversal (↑ACh)', color: 'green',
      detail: 'AChE inhibition → ACh accumulation → competitive displacement of NDMB' },
    { site: 'cardiac',  receptor: 'M₂',      action: 'agonist',    c50: 0.04,   gamma: 1.5,  label: 'Bradycardia (give with glycopyrrolate)', color: 'red',
      detail: 'Excess ACh → M2 Gi → ↓HR; always co-administer anticholinergic' },
    { site: 'gi',       receptor: 'M₃',      action: 'agonist',    c50: 0.04,   gamma: 1.5,  label: '↑ GI motility / secretions', color: 'amber',
      detail: 'M3 activation → ↑peristalsis, ↑salivation; PONV risk' },
  ],
  Sugammadex: [
    { site: 'nmj',      receptor: 'nAChR',   action: 'agonist',    c50: 0.5,    gamma: 2.0,  label: 'Encapsulates roc/vec → reversal', color: 'green',
      detail: 'Cyclodextrin chelation; 16 mg/kg for immediate reversal of intubating dose; no muscarinic side effects' },
  ],
  Atropine: [
    { site: 'cardiac',  receptor: 'M₂',      action: 'antagonist', c50: 0.02,   gamma: 1.5,  label: '↑ HR (vagolysis)', color: 'green',
      detail: 'M2 Gi antagonist → removes vagal brake → ↑HR at SA/AV node; crosses BBB' },
    { site: 'gi',       receptor: 'M₃',      action: 'antagonist', c50: 0.02,   gamma: 1.5,  label: '↓ Secretions / ↓ GI motility', color: 'red',
      detail: 'M3 block → ↓salivation, ↓gastric secretion, ↓bowel motility; mydriasis' },
  ],
  Glycopyrrolate: [
    { site: 'cardiac',  receptor: 'M₂',      action: 'antagonist', c50: 0.01,   gamma: 1.5,  label: '↑ HR (mild vagolysis)', color: 'green',
      detail: 'Quaternary amine → does not cross BBB; no CNS effects; preferred with neostigmine' },
  ],
  // ── VASOPRESSORS / INOTROPES ──────────────────────────────────────────────
  Epinephrine: [
    { site: 'cardiac',  receptor: 'β₁',      action: 'agonist',    c50: 0.002,  gamma: 1.5,  label: '↑ HR / ↑ Inotropy', color: 'green',
      detail: 'β₁ Gs → ↑cAMP → ↑Ca²⁺ → chronotropy + inotropy; first-line cardiac arrest' },
    { site: 'arterial', receptor: 'α₁',      action: 'agonist',    c50: 0.004,  gamma: 1.5,  label: '↑ SVR (high dose)', color: 'green',
      detail: 'α₁ Gq → PLC → IP3 → Ca²⁺ → vasoconstriction; dominant at high doses' },
    { site: 'arterial', receptor: 'β₂',      action: 'agonist',    c50: 0.001,  gamma: 1.5,  label: '↓ SVR / Bronchodilation (low dose)', color: 'amber',
      detail: 'β₂ Gs → ↑cAMP → vasodilation + bronchial smooth-muscle relaxation; dominant at low doses' },
    { site: 'pulmonary',receptor: 'β₂',      action: 'agonist',    c50: 0.001,  gamma: 1.5,  label: 'Bronchodilation', color: 'green',
      detail: 'Pulmonary β₂ → bronchial smooth-muscle relaxation; first-line anaphylaxis bronchospasm' },
  ],
  Norepinephrine: [
    { site: 'arterial', receptor: 'α₁',      action: 'agonist',    c50: 0.001,  gamma: 1.5,  label: '↑ SVR / ↑ MAP', color: 'green',
      detail: 'Potent α₁ → vasoconstriction; first-line for septic shock (SOAP II)' },
    { site: 'venous',   receptor: 'α₁',      action: 'agonist',    c50: 0.001,  gamma: 1.5,  label: 'Venoconstriction / ↑ Preload', color: 'green',
      detail: 'α₁ on capacitance veins → ↑ venous return → ↑ preload' },
    { site: 'cardiac',  receptor: 'β₁',      action: 'agonist',    c50: 0.002,  gamma: 1.5,  label: '↑ Inotropy (modest)', color: 'green',
      detail: 'Moderate β₁; reflex bradycardia from elevated MAP via baroreflex offset' },
  ],
  Phenylephrine: [
    { site: 'arterial', receptor: 'α₁',      action: 'agonist',    c50: 0.02,   gamma: 1.0,  label: '↑ SVR / ↑ MAP', color: 'green',
      detail: 'Pure α₁ agonist → ↑SVR; reflex bradycardia; caution in heart failure (↑afterload)' },
  ],
  Vasopressin: [
    { site: 'arterial', receptor: 'V₁',      action: 'agonist',    c50: 0.05,   gamma: 2.0,  label: 'Vasoconstriction (catecholamine-resistant)', color: 'green',
      detail: 'V1 Gq → PLC → IP3 → SMC Ca²⁺; non-adrenergic; effective in distributive shock after catecholamines fail' },
    { site: 'venous',   receptor: 'V₁',      action: 'agonist',    c50: 0.05,   gamma: 2.0,  label: 'Venoconstriction', color: 'green',
      detail: 'Splanchnic venoconstriction → ↑venous return' },
  ],
  Dopamine: [
    { site: 'cardiac',  receptor: 'β₁',      action: 'agonist',    c50: 0.01,   gamma: 1.5,  label: '↑ CO / ↑ HR (medium dose)', color: 'green',
      detail: '5-10 mcg/kg/min β₁ → ↑inotropy/chronotropy (dopaminergic dose 1-3 mcg/kg/min: renal DA₁)' },
    { site: 'arterial', receptor: 'α₁',      action: 'agonist',    c50: 0.015,  gamma: 1.5,  label: '↑ SVR (high dose >10 mcg)', color: 'green',
      detail: 'High-dose α₁ → vasoconstriction; consider NE instead (SOAP II: NE superior)' },
  ],
  Dobutamine: [
    { site: 'cardiac',  receptor: 'β₁',      action: 'agonist',    c50: 0.5,    gamma: 1.5,  label: '↑ Inotropy / ↑ CO', color: 'green',
      detail: 'β₁ dominant; mild β₂ → modest ↓SVR; no significant α₁; choice for cardiogenic shock' },
    { site: 'arterial', receptor: 'β₂',      action: 'agonist',    c50: 0.5,    gamma: 1.5,  label: '↓ SVR (mild)', color: 'amber',
      detail: 'β₂ component → mild vasodilation; ↓afterload aids failing ventricle' },
  ],
  Ephedrine: [
    { site: 'cardiac',  receptor: 'β₁',      action: 'agonist',    c50: 0.5,    gamma: 1.5,  label: '↑ HR / ↑ CO (indirect)', color: 'green',
      detail: 'Indirect: releases stored NE; direct: mild β₁; onset <2 min IV; crosses BBB' },
    { site: 'arterial', receptor: 'α₁',      action: 'agonist',    c50: 0.5,    gamma: 1.5,  label: '↑ SVR (indirect)', color: 'green',
      detail: 'NE release → α₁; preferred in OB hypotension (less fetal HR effect vs phenylephrine)' },
  ],
  Milrinone: [
    { site: 'cardiac',  receptor: 'PDE₃',    action: 'inhibitor',  c50: 0.2,    gamma: 1.5,  label: '↑ Inotropy + Lusitropic', color: 'green',
      detail: 'PDE3 inhibition → ↑cAMP → ↑Ca²⁺ cycling; "inodilator" — inotropy + vasodilation simultaneously' },
    { site: 'arterial', receptor: 'PDE₃',    action: 'inhibitor',  c50: 0.2,    gamma: 1.5,  label: '↓ SVR / ↓ PVR', color: 'green',
      detail: 'Smooth-muscle PDE3 → ↑cAMP → ↓Ca²⁺ → vasodilation; especially useful in PAH + RV failure' },
  ],
  // ── BETA-BLOCKERS ─────────────────────────────────────────────────────────
  Metoprolol: [
    { site: 'cardiac',  receptor: 'β₁',      action: 'antagonist', c50: 0.5,    gamma: 1.5,  label: '↓ HR / ↓ Inotropy', color: 'red',
      detail: 'β₁-selective antagonist; blocks Gs → ↓cAMP; rate control for AF, ↓periop MI risk' },
  ],
  Esmolol: [
    { site: 'cardiac',  receptor: 'β₁',      action: 'antagonist', c50: 0.5,    gamma: 1.5,  label: '↓ HR (ultra-short, 9 min t½)', color: 'red',
      detail: 'RBC esterase metabolism → titratable; ideal for intubation response, SVT' },
  ],
  Atenolol: [
    { site: 'cardiac',  receptor: 'β₁',      action: 'antagonist', c50: 0.5,    gamma: 1.5,  label: '↓ HR / Antihypertensive', color: 'red',
      detail: 'Cardioselective β₁; long-acting (12-24h); renal elimination' },
  ],
  Propranolol: [
    { site: 'cardiac',  receptor: 'β₁',      action: 'antagonist', c50: 0.05,   gamma: 1.5,  label: '↓ HR / ↓ Inotropy', color: 'red',
      detail: 'Non-selective β₁+β₂ block; membrane stabilizing (Class II antiarrhythmic)' },
    { site: 'pulmonary',receptor: 'β₂',      action: 'antagonist', c50: 0.05,   gamma: 1.5,  label: 'Bronchospasm risk', color: 'red',
      detail: 'β₂ block → bronchospasm; avoid in reactive airway disease / COPD' },
  ],
  Labetalol: [
    { site: 'cardiac',  receptor: 'β₁',      action: 'antagonist', c50: 0.25,   gamma: 1.5,  label: '↓ HR / ↓ CO', color: 'red',
      detail: 'Mixed α₁+β; α:β = 1:7 (IV); α₁ block → ↓SVR; β block → ↓HR/inotropy' },
    { site: 'arterial', receptor: 'α₁',      action: 'antagonist', c50: 0.25,   gamma: 1.5,  label: '↓ SVR', color: 'red',
      detail: 'α₁ block → ↓peripheral resistance; ideal for hypertensive crisis in PEC/pheochromocytoma' },
  ],
  // ── ANTIHYPERTENSIVES ─────────────────────────────────────────────────────
  Hydralazine: [
    { site: 'arterial', receptor: 'VGCC-L',  action: 'antagonist', c50: 0.03,   gamma: 1.5,  label: '↓ SVR (arteriodilator)', color: 'red',
      detail: 'Direct arteriolar smooth-muscle relaxation; reflex tachycardia; lupus-like reaction with prolonged use' },
  ],
  Nifedipine: [
    { site: 'arterial', receptor: 'VGCC-L',  action: 'antagonist', c50: 0.05,   gamma: 1.5,  label: '↓ SVR / ↓ BP', color: 'red',
      detail: 'Dihydropyridine CCB → ↓arterial Ca²⁺; used for PEC hypertension' },
  ],
  // ── VOLATILE ANESTHETICS (MAC-based, handled separately in compute) ────────
  Sevoflurane: [
    { site: 'brain',    receptor: 'GABA-A',  action: 'agonist',    c50: 0.5,    gamma: 3.0,  label: 'Unconsciousness (MAC-based)', color: 'blue', isMac: true,
      detail: 'Potentiates GABA-A + activates TREK-1 K⁺ channels; MAC 2.0% at 40 yr; pungency low (inhalation induction ok)' },
    { site: 'brain',    receptor: 'TREK-K⁺', action: 'agonist',    c50: 0.5,    gamma: 3.0,  label: 'K⁺ channel activation', color: 'blue', isMac: true,
      detail: 'TREK-1/TASK-1/TASK-3 activation → hyperpolarization; contributes to immobility at sub-hypnotic MAC' },
    { site: 'arterial', receptor: 'α₁',      action: 'antagonist', c50: 0.5,    gamma: 2.0,  label: '↓ SVR (dose-dependent)', color: 'red', isMac: true,
      detail: 'Inhibits vascular smooth-muscle Ca²⁺ → vasodilation; compensatory ↑HR' },
  ],
  Isoflurane: [
    { site: 'brain',    receptor: 'GABA-A',  action: 'agonist',    c50: 0.5,    gamma: 3.0,  label: 'Unconsciousness (MAC 1.17%)', color: 'blue', isMac: true,
      detail: 'GABA-A + TREK; coronary steal controversial (historical); potent airway irritant' },
    { site: 'arterial', receptor: 'α₁',      action: 'antagonist', c50: 0.5,    gamma: 2.0,  label: '↓ SVR / Vasodilation', color: 'red', isMac: true,
      detail: 'Vasodilation → reflex ↑HR; well-tolerated hemodynamically at ≤1 MAC' },
  ],
  Desflurane: [
    { site: 'brain',    receptor: 'GABA-A',  action: 'agonist',    c50: 0.5,    gamma: 3.0,  label: 'Unconsciousness (MAC 6.6%)', color: 'blue', isMac: true,
      detail: 'Fastest offset volatile; sympathetic activation with rapid ↑ in concentration → ↑HR/BP spike' },
    { site: 'arterial', receptor: 'α₁',      action: 'antagonist', c50: 0.5,    gamma: 2.0,  label: '↓ SVR', color: 'red', isMac: true,
      detail: 'Vasodilation; avoids CO₂ absorber (hot) → less compound A/CO than others at low flows' },
  ],
  // ── ANTIEMETICS / GI ──────────────────────────────────────────────────────
  Ondansetron: [
    { site: 'gi',       receptor: '5-HT₃',   action: 'antagonist', c50: 0.03,   gamma: 1.5,  label: '↓ PONV (CTZ + vagal)', color: 'green',
      detail: '5-HT3 block at CTZ (area postrema) and gut vagal afferents; most effective for chemotherapy/post-op nausea; QTc prolongation' },
  ],
  Metoclopramide: [
    { site: 'gi',       receptor: 'D₂',      action: 'antagonist', c50: 0.05,   gamma: 1.5,  label: 'Antiemetic + Prokinetic', color: 'green',
      detail: 'D2 block at CTZ + 5-HT4 agonist → ↑LES tone + ↑motility; EPS risk at high doses; not for bowel obstruction' },
  ],
  Droperidol: [
    { site: 'gi',       receptor: 'D₂',      action: 'antagonist', c50: 0.01,   gamma: 1.5,  label: 'Potent antiemetic (low dose)', color: 'green',
      detail: 'Butyrophenone D2 block at CTZ; 0.625 mg IV = ondansetron efficacy; QTc black-box warning → ECG required' },
  ],
  // ── LOCAL ANESTHETICS ─────────────────────────────────────────────────────
  Bupivacaine: [
    { site: 'spinal',   receptor: 'Na⁺ Ch',  action: 'antagonist', c50: 2.0,    gamma: 2.0,  label: 'Sensory > Motor block', color: 'red',
      detail: 'Differential block: B/C fibers blocked first (sympathetic/pain), then A-delta, finally A-alpha (motor)' },
    { site: 'cardiac',  receptor: 'Na⁺ Ch',  action: 'antagonist', c50: 5.0,    gamma: 1.5,  label: 'LAST: Cardiac Na⁺ block', color: 'red',
      detail: 'Cardiotoxic at systemic levels: "fast-in, slow-out" in heart → VF refractory to standard ACLS; Intralipid rescue' },
  ],
  Lidocaine: [
    { site: 'spinal',   receptor: 'Na⁺ Ch',  action: 'antagonist', c50: 2.0,    gamma: 2.0,  label: 'Conduction block (short)', color: 'red',
      detail: 'Fast-in fast-out Na⁺ block; systemic: membrane-stabilizing analgesic (1.5 mg/kg IV); TNS risk with intrathecal' },
    { site: 'cardiac',  receptor: 'Na⁺ Ch',  action: 'antagonist', c50: 3.0,    gamma: 1.5,  label: 'Class Ib antiarrhythmic', color: 'amber',
      detail: 'Ventricular Na⁺ block → VT/VF suppression; therapeutic window narrow' },
  ],
  Ropivacaine: [
    { site: 'spinal',   receptor: 'Na⁺ Ch',  action: 'antagonist', c50: 2.5,    gamma: 2.0,  label: 'Sensory > Motor block', color: 'red',
      detail: 'Lower lipophilicity than bupivacaine → less cardiotoxic; preferred for epidurals at labor-epidural concentrations' },
  ],
  // ── PULMONARY ─────────────────────────────────────────────────────────────
  Epoprostenol: [
    { site: 'pulmonary',receptor: 'PGI₂',    action: 'agonist',    c50: 0.001,  gamma: 1.5,  label: '↓ PVR (PAH treatment)', color: 'green',
      detail: 'IP receptor Gs → ↑cAMP → ↓Ca²⁺ in pulmonary SMC → vasodilation; also antiplatelet; very short t½' },
  ],
  Albuterol: [
    { site: 'pulmonary',receptor: 'β₂',      action: 'agonist',    c50: 0.005,  gamma: 2.0,  label: 'Bronchodilation', color: 'green',
      detail: 'β₂ Gs → ↑cAMP → bronchial SMC relaxation; tremor + tachycardia from β₁ spillover at high doses' },
    { site: 'arterial', receptor: 'β₂',      action: 'agonist',    c50: 0.005,  gamma: 2.0,  label: '↓ SVR (peripheral β₂)', color: 'amber',
      detail: 'Peripheral β₂ → systemic vasodilation → reflex ↑HR' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY: Hill-equation occupancy
// ─────────────────────────────────────────────────────────────────────────────
const hillOcc = (Ce, c50, gamma) => {
  if (!Ce || Ce <= 0 || !c50 || c50 <= 0) return 0;
  const ceG = Math.pow(Math.max(0, Ce), gamma);
  const c50G = Math.pow(c50, gamma);
  return ceG / (ceG + c50G);
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTONOMIC NERVOUS SYSTEM PROFILE
// Per-drug SNS/PNS tone effects, direct cardiac effects, and conflict flags.
// This layer is distinct from receptor occupancy: it captures the NET physiological
// consequence through autonomic pathways (indirect) vs. direct organ effects.
//
// dir: +1 = stimulation/activation, -1 = inhibition/block, 0 = neutral
// tone: 0=none, 1=mild, 2=moderate, 3=strong
// conflict: true when SNS/PNS and direct cardiac effects OPPOSE each other
// ─────────────────────────────────────────────────────────────────────────────
const ANS_PROFILE = {
  // ── INDUCTION AGENTS ──────────────────────────────────────
  Propofol:     { sns:{tone:2,dir:-1,label:'↓ SNS',mech:'Baroreflex blunting + direct vasodilation → ↓SVR ↓MAP'}, pns:null, cardiac:{dir:-1,label:'↓ Inotropy',note:'Direct myocardial depression; inhibits Ca²⁺ transients'}, conflict:false },
  Etomidate:    { sns:null, pns:null, cardiac:{dir:0,label:'Hemostable',note:'Preserves baroreceptor reflex and SVR; minimal cardiac depression — drug of choice for hemodynamically unstable patients'}, conflict:false },
  Thiopental:   { sns:{tone:2,dir:-1,label:'↓ SNS',mech:'Baroreflex depression → compensatory tachycardia from venodilation'}, pns:null, cardiac:{dir:-1,label:'↓ Inotropy',note:'Direct myocardial depression via Na⁺/Ca²⁺ channel inhibition; more pronounced than propofol at equipotent doses'}, conflict:false },
  Midazolam:    { sns:{tone:1,dir:-1,label:'↓ SNS (mild)',mech:'Anxiolysis reduces endogenous catecholamine release; mild baroreflex depression'}, pns:null, cardiac:{dir:0,label:'Minimal',note:'Negligible direct cardiac effect; most hemodynamic changes are from benzodiazepine-mediated anxiolysis'}, conflict:false },
  Ketamine: {
    sns: { tone:3, dir:+1, label:'↑↑↑ SNS', mech:'Blocks NE reuptake at sympathetic terminals + activates locus coeruleus → ↑HR ↑BP ↑CO ↑myocardial O₂ demand' },
    pns: { tone:1, dir:+1, label:'↑ PNS (secretions)', mech:'Muscarinic stimulation → ↑salivary/tracheobronchial secretions; co-administer glycopyrrolate to prevent laryngospasm-triggering secretion surge' },
    cardiac: { dir:-1, label:'↓ Direct Inotropy (masked)', note:'Ketamine is an intrinsic negative inotrope — direct myocardial depression via inhibition of L-type Ca²⁺ channels. This is MASKED by dominant SNS activation in intact patients but UNMASKED in catecholamine-depleted states.' },
    conflict: true,
    conflictNote: '⚠️ KETAMINE PARADOX — The dominant clinical presentation is sympathomimetic (↑HR, ↑BP, ↑CO), but ketamine is simultaneously a direct myocardial depressant. In patients with exhausted catecholamine reserves (terminal septic shock, end-stage heart failure), the sympathetic reserve is depleted and the intrinsic negative inotropic effect dominates → paradoxical cardiovascular collapse despite expected stimulation. This is a critical teaching point for ketamine in high-risk patients.',
  },
  Dexmedetomidine: {
    sns: { tone:3, dir:-1, label:'↓↓↓ SNS', mech:'α₂ agonism in locus coeruleus → ↓NE synthesis/release from all sympathetic terminals → ↓HR ↓BP (central sympatholysis); most potent perioperative sympatholytic' },
    pns: { tone:1, dir:+1, label:'↑ PNS (relative)', mech:'After SNS withdrawal, vagal tone is unmasked → relative bradycardia; not direct vagal activation but baroreflex-mediated' },
    cardiac: { dir:0, label:'Preserved CO', note:'No direct myocardial depression; CO maintenance depends on HR. Profound bradycardia can significantly reduce CO; atropine/glycopyrrolate may be needed.' },
    conflict: false,
  },
  // ── OPIOIDS ────────────────────────────────────────────────
  Fentanyl: { sns:{tone:1,dir:-1,label:'↓ SNS',mech:'Blunts sympathetic response to nociception; supraspinal opioid receptors ↓NE release'}, pns:{tone:1,dir:+1,label:'↑ PNS (vagotonic)',mech:'μ-receptors in nucleus tractus solitarius → ↑vagal tone → bradycardia (esp. rapid bolus)'}, cardiac:{dir:0,label:'Neutral',note:'No intrinsic cardiac depression at clinical doses; hemodynamic stability is a principal advantage of opioids in cardiac anesthesia'}, conflict:false },
  Sufentanil: { sns:{tone:1,dir:-1,label:'↓ SNS',mech:'More complete sympatholysis than fentanyl at equipotent doses; used in high-dose opioid cardiac anesthesia'}, pns:{tone:2,dir:+1,label:'↑↑ PNS (vagotonic)',mech:'Greater vagotonic potency; bradycardia risk is higher than fentanyl; premedicate with glycopyrrolate in cardiac cases'}, cardiac:{dir:0,label:'Neutral',note:'No direct myocardial depression; preferred in high-risk cardiac patients'}, conflict:false },
  Alfentanil: { sns:{tone:1,dir:-1,label:'↓ SNS',mech:'Rapid-onset sympatholysis (high ionized fraction at physiologic pH); effective for blunting intubation response'}, pns:{tone:1,dir:+1,label:'↑ PNS (vagotonic)',mech:'Vagotonic; bradycardia with rapid high-dose boluses'}, cardiac:{dir:0,label:'Neutral',note:'No direct myocardial depression'}, conflict:false },
  Remifentanil: { sns:{tone:2,dir:-1,label:'↓↓ SNS',mech:'Potent sympatholysis; infusions >0.15 mcg/kg/min commonly cause significant bradycardia + hypotension; context-independent offset'}, pns:{tone:2,dir:+1,label:'↑↑ PNS (vagotonic)',mech:'Strong vagal activation; rapid boluses risk asystole; always have atropine available'}, cardiac:{dir:0,label:'Neutral',note:'Hemodynamic effects are purely ANS-mediated; no intrinsic cardiac depression'}, conflict:false },
  Morphine: { sns:{tone:1,dir:-1,label:'↓ SNS',mech:'Mild sympatholysis; histamine release → vasodilation (non-ANS mechanism, from mast cell activation)'}, pns:{tone:1,dir:+1,label:'↑ PNS (vagotonic)',mech:'μ NTS activation → ↑vagal tone; bradycardia less common than synthetic opioids'}, cardiac:{dir:0,label:'Neutral',note:'Hypotension from morphine is primarily from histamine release and venodilation, not cardiac depression'}, conflict:false },
  Hydromorphone: { sns:{tone:1,dir:-1,label:'↓ SNS',mech:'Sympatholysis similar to morphine; less histamine release → more cardiovascular stable than morphine'}, pns:{tone:1,dir:+1,label:'↑ PNS',mech:'Vagotonic; bradycardia less common than with synthetic opioids'}, cardiac:{dir:0,label:'Neutral',note:'No direct cardiac depression; preferred over morphine in renal failure (no active metabolite accumulation)'}, conflict:false },
  Methadone: { sns:{tone:1,dir:-1,label:'↓ SNS',mech:'Sympatholysis; long-acting creates sustained blunting of sympathetic response'}, pns:{tone:1,dir:+1,label:'↑ PNS',mech:'Vagotonic; bradycardia occasionally seen'}, cardiac:{dir:-1,label:'QTc prolongation',note:'hERG K⁺ channel blockade → QTc prolongation → risk of Torsades de Pointes; not a mechanical negative inotrope but electrical cardiac toxicity at high doses'}, conflict:false },
  // ── NMBs ──────────────────────────────────────────────────
  Rocuronium: { sns:null, pns:null, cardiac:{dir:0,label:'Neutral',note:'No clinically significant autonomic effects at standard doses; occasional mild vagolysis at very high RSI doses'}, conflict:false },
  Vecuronium: { sns:null, pns:null, cardiac:{dir:0,label:'Neutral (gold standard)',note:'The cardiovascular gold standard for NMBs — zero autonomic effects. Choice for cardiac surgery NMB.'}, conflict:false },
  Cisatracurium: { sns:null, pns:null, cardiac:{dir:0,label:'Neutral',note:'No histamine release or autonomic effects at clinical doses; organ-independent Hofmann elimination'}, conflict:false },
  Atracurium: { sns:null, pns:{tone:1,dir:+1,label:'↑ PNS (histamine)',mech:'Histamine release at high doses → vasodilation (not true PNS activation); laudanosine accumulation with prolonged use'}, cardiac:{dir:-1,label:'Histamine → ↓BP',note:'Histamine release from atracurium causes hypotension and bronchospasm; not a direct cardiac effect but dangerous in asthma/allergic patients'}, conflict:false },
  Pancuronium: {
    sns: { tone:1,dir:+1,label:'↑ SNS (mild)',mech:'Mild sympathomimetic via NE reuptake inhibition at cardiac nerve terminals' },
    pns: { tone:2,dir:-1,label:'↓↓ PNS (vagolytic)',mech:'M₂ muscarinic ANTAGONISM at SA/AV node → ↑HR; most pronounced vagolytic effect of ALL NMBs; problematic in CAD' },
    cardiac: { dir:+1, label:'↑ HR (vagolysis)',note:'Tachycardia from combined M₂ block + mild sympathomimetic; ↑myocardial O₂ demand = problematic in coronary artery disease. Avoid in CAD patients where ↑HR is harmful.' },
    conflict: false,
  },
  Succinylcholine: {
    sns: { tone:1,dir:+1,label:'↑ SNS (ganglionic Nic.)',mech:'Stimulates nicotinic receptors at autonomic ganglia → tachycardia (adults, 1st dose)' },
    pns: { tone:2,dir:+1,label:'↑↑ PNS (cardiac Musc.)',mech:'Stimulates cardiac muscarinic M₂ receptors → bradycardia; dominant effect in children and with repeat adult doses; pre-treat children with atropine' },
    cardiac: { dir:-1, label:'Bradycardia risk', note:'Children: predominantly muscarinic → bradycardia/asystole risk — ALWAYS pre-treat pediatric patients with atropine 0.02 mg/kg IV. Adults: 1st dose often tachycardia (ganglionic), repeat doses → progressive bradycardia.' },
    conflict: true,
    conflictNote: '⚠️ SUCCINYLCHOLINE ANS CONFLICT: Stimulates BOTH nicotinic ganglionic receptors (→ SNS: tachycardia in adults, 1st dose) AND cardiac muscarinic M₂ receptors (→ PNS: bradycardia/asystole). Net effect is age-dependent: children = predominantly muscarinic bradycardia (mandatory atropine pre-treatment). Adults = tachycardia on 1st dose, progressive bradycardia with repeat doses.',
  },
  Mivacurium: { sns:null, pns:{tone:1,dir:+1,label:'↑ PNS (histamine)',mech:'Mild histamine release → vasodilation; plasma cholinesterase metabolism makes it ultra-short (~15 min)'}, cardiac:{dir:0,label:'Minimal',note:'No autonomic ganglionic effects; any hemodynamic effect is from histamine release'}, conflict:false },
  // ── REVERSAL ──────────────────────────────────────────────
  Neostigmine: {
    sns: null,
    pns: { tone:3, dir:+1, label:'↑↑↑ PNS (systemic)', mech:'AChE inhibition → ACh accumulates at ALL muscarinic junctions: M₂ (bradycardia, AV block), M₃ (bronchospasm, ↑secretions, ↑GI motility, urinary urgency, miosis); ALWAYS co-administer glycopyrrolate' },
    cardiac: { dir:-1, label:'↓ HR (bradycardia)', note:'Risk of severe bradycardia or asystole without anticholinergic co-medication. Standard dosing: glycopyrrolate 0.2 mg per neostigmine 1 mg (1:5 ratio). Atropine is alternative but crosses BBB (consider in elderly).' },
    conflict: false,
  },
  Physostigmine: { sns:null, pns:{tone:2,dir:+1,label:'↑↑ PNS (central+periph)',mech:'Tertiary AChE inhibitor — crosses BBB to reverse central anticholinergic syndrome; also peripheral muscarinic stimulation'}, cardiac:{dir:-1,label:'Bradycardia risk',note:'Central AChE inhibition can be life-saving in anticholinergic delirium/overdose but also has peripheral muscarinic side effects'}, conflict:false },
  Sugammadex: { sns:null, pns:null, cardiac:{dir:0,label:'Neutral',note:'No anticholinergic co-administration required; no autonomic effects from the cyclodextrin itself. Rare bradycardia case reports — mechanism unclear, possibly from abrupt reversal of NMB-mediated sympathetic blunting.'}, conflict:false },
  Atropine: {
    sns: null,
    pns: { tone:3, dir:-1, label:'↓↓↓ PNS (anticholinergic)', mech:'Competitive M₁/M₂/M₃ ANTAGONIST: ↑HR (M₂ block at SA node), ↓secretions, bronchodilation, mydriasis, ↓GI motility, urinary retention; CROSSES BBB → CNS effects' },
    cardiac: { dir:+1, label:'↑ HR (vagolysis)', note:'First-line drug for symptomatic sinus bradycardia (ACLS). Central anticholinergic syndrome risk in elderly (agitation, confusion, delirium) — consider glycopyrrolate instead.' },
    conflict: false,
  },
  Glycopyrrolate: {
    sns: null,
    pns: { tone:2, dir:-1, label:'↓↓ PNS (anticholinergic)', mech:'Quaternary ammonium compound → M₂/M₃ ANTAGONIST → ↑HR, ↓secretions; does NOT cross BBB = no CNS anticholinergic effects; preferred over atropine when post-op cognitive dysfunction risk is present' },
    cardiac: { dir:+1, label:'↑ HR (mild, vagolysis)', note:'Slower onset than atropine; preferred companion for neostigmine reversal in elderly/frail patients where central anticholinergic effects are hazardous (postoperative cognitive dysfunction risk).' },
    conflict: false,
  },
  // ── VASOPRESSORS / INOTROPES ──────────────────────────────
  Epinephrine: {
    sns: { tone:3, dir:+1, label:'↑↑↑ SNS (direct all α+β)', mech:'Direct α₁ + β₁ + β₂ activation → ↑HR ↑contractility ↑CO ↑SVR (high dose) + bronchodilation. First-line cardiac arrest. Pharmacological cornerstone of anaphylaxis treatment.' },
    pns: null,
    cardiac: { dir:+1, label:'↑↑ Inotropy + Chronotropy', note:'β₁-mediated ↑HR and ↑contractility; risk of malignant tachyarrhythmias (VT/VF) at high doses. Also causes hypokalemia via β₂-mediated K⁺ cellular uptake — monitor electrolytes.' },
    conflict: false,
  },
  Norepinephrine: {
    sns: { tone:3, dir:+1, label:'↑↑↑ SNS (α₁ dominant)', mech:'Potent α₁ → ↑SVR ↑MAP; moderate β₁ → ↑contractility; first-line vasopressor for septic shock (SOAP II evidence)' },
    pns: { tone:1, dir:+1, label:'↑ PNS (reflex only)', mech:'Baroreflex: ↑MAP → ↑vagal afferent firing → ↑efferent vagal tone → reflex bradycardia; NOT direct PNS activation' },
    cardiac: { dir:+1, label:'↑ Inotropy (moderate)', note:'β₁ component ↑contractility; ↑afterload from α₁ can reduce stroke volume in already-failing ventricles. Monitor CO in cardiogenic shock.' },
    conflict: false,
  },
  Phenylephrine: {
    sns: { tone:2, dir:+1, label:'↑↑ SNS (α₁ only)', mech:'Pure α₁ → ↑SVR ↑MAP; absolutely NO β receptor activity → no direct chronotropy or inotropy' },
    pns: { tone:2, dir:+1, label:'↑↑ PNS (reflex bradycardia)', mech:'Baroreflex: ↑MAP → ↑vagal tone → reflex ↓HR; can cause symptomatic bradycardia, especially large doses or in patients with AV nodal disease' },
    cardiac: { dir:-1, label:'↑ Afterload → ↓ CO risk', note:'No intrinsic inotropic activity. ↑SVR raises afterload which can reduce CO in heart failure. Preferred in spinal/neuraxial hypotension during C-section (maintains uteroplacental flow) and mild hypotension in neurologically injured patients.' },
    conflict: true,
    conflictNote: '⚠️ PHENYLEPHRINE HEMODYNAMIC CONFLICT: Raises MAP via pure vasoconstriction → baroreflex triggers compensatory bradycardia via vagal activation. Net CO change is complex: ↑afterload may reduce SV while ↑MAP maintains perfusion pressure. In healthy patients: well-tolerated. In heart failure: ↑SVR can worsen low output. The bradycardia is not from PNS activation — it is a normal baroreflex response to hypertension.',
  },
  Vasopressin: { sns:null, pns:null, cardiac:{dir:0,label:'Vasoconstriction only',note:'V₁ receptor vasoconstriction; no adrenergic receptor activation. Coronary vasospasm risk at doses >0.1 U/min. Used as catecholamine-sparing agent when maximal NE doses are reached in vasodilatory shock.'}, conflict:false },
  Dopamine: {
    sns: { tone:2, dir:+1, label:'↑↑ SNS (dose-dep.)', mech:'Low dose (<3 mcg/kg/min): DA₁ renal vasodilation. Medium (3-10): β₁ ↑inotropy/HR. High (>10): α₁ ↑SVR ↑MAP' },
    pns: null,
    cardiac: { dir:+1, label:'↑ Inotropy + Arrhythmia risk', note:'More tachyarrhythmias than norepinephrine (SOAP II: NE superior in septic shock). Dose-dependent; complex pharmacology limits titration. Fewer specialists now choose dopamine over NE for first-line vasopressor support.' },
    conflict: false,
  },
  Dobutamine: {
    sns: { tone:2, dir:+1, label:'↑↑ SNS (β₁ dominant)', mech:'β₁ dominant → ↑inotropy ↑HR; β₂ component → peripheral vasodilation (reduces afterload = "inodilator" that increases CO while ↓SVR)' },
    pns: null,
    cardiac: { dir:+1, label:'↑↑ Inotropy (inodilator)', note:'Increases CO via ↑contractility AND ↓afterload (β₂ vasodilation). Risk: tachyarrhythmias, ↑myocardial O₂ demand. Does NOT activate dopaminergic receptors. Primary agent for cardiogenic shock/low output states.' },
    conflict: false,
  },
  Ephedrine: {
    sns: { tone:2, dir:+1, label:'↑↑ SNS (indirect + direct)', mech:'Indirect: releases stored NE from sympathetic terminals. Direct: mild α₁ + β₁ agonism. Preserves uteroplacental flow better than phenylephrine in obstetric hypotension (less vasoconstriction).' },
    pns: null,
    cardiac: { dir:+1, label:'↑ HR / ↑ CO', note:'β₁-mediated ↑HR and ↑CO; preferred over phenylephrine when ↑HR is acceptable or desirable (e.g., combined hypotension + bradycardia after spinal). Tachyphylaxis with repeated doses (depletes NE stores).' },
    conflict: false,
  },
  Milrinone: {
    sns: null,
    pns: null,
    cardiac: { dir:+1, label:'↑↑ Inotropy + ↑ Lusitropy', note:'PDE-III inhibitor → ↑cAMP → ↑contractility AND improved relaxation (lusitropy). Critically, does NOT require β-adrenergic receptor activation — works even when β-receptors are down-regulated (advanced heart failure, chronic β-blocker use, post-bypass). Simultaneous vasodilation reduces afterload and PVR.' },
    conflict: false,
  },
  // ── BETA-BLOCKERS ─────────────────────────────────────────
  Metoprolol: { sns:{tone:2,dir:-1,label:'↓↓ SNS (β₁ block)',mech:'β₁ selective antagonism → ↓HR ↓contractility ↓CO; prevents catecholamine-mediated demand ischemia'}, pns:{tone:1,dir:+1,label:'↑ PNS (relative)',mech:'Unopposed vagal tone after β₁ block; AV nodal slowing'}, cardiac:{dir:-1,label:'↓ HR / ↓ Inotropy',note:'Reduces myocardial O₂ demand; avoid in acute decompensated heart failure (worsens output)'}, conflict:false },
  Esmolol: { sns:{tone:2,dir:-1,label:'↓↓ SNS (β₁, 9min t½)',mech:'Ultra-short β₁ block via RBC esterases; titratable hemodynamic control for intubation, intraoperative tachycardia, SVT'}, pns:{tone:1,dir:+1,label:'↑ PNS (relative)',mech:'Relative vagal dominance; bradycardia if overdosed'}, cardiac:{dir:-1,label:'↓ HR / ↓ Inotropy (titratable)',note:'Ideal for brief hemodynamic control needs due to ultra-short t½; easily reversed'}, conflict:false },
  Atenolol: { sns:{tone:2,dir:-1,label:'↓↓ SNS (β₁ selective)',mech:'Cardioselective β₁ block; longer duration than metoprolol; renal elimination'}, pns:{tone:1,dir:+1,label:'↑ PNS (relative)',mech:'Relative vagal dominance'}, cardiac:{dir:-1,label:'↓ HR / ↓ Inotropy',note:'Long-acting; safer in asthma than non-selective beta-blockers'}, conflict:false },
  Propranolol: { sns:{tone:2,dir:-1,label:'↓↓ SNS (non-selective β)',mech:'Non-selective β₁+β₂ block; β₂ block causes peripheral vasoconstriction + bronchospasm risk'}, pns:{tone:2,dir:+1,label:'↑↑ PNS (relative + AV slowing)',mech:'Relative vagal dominance + direct AV node slowing; heart block risk'}, cardiac:{dir:-1,label:'↓ HR / ↓ Inotropy + Membrane stabilizing',note:'Class II antiarrhythmic; membrane-stabilizing at high doses; AVOID in reactive airway disease (β₂ block → bronchospasm)'}, conflict:false },
  Labetalol: { sns:{tone:3,dir:-1,label:'↓↓↓ SNS (α+β block)',mech:'Non-selective β₁+β₂ + α₁ block; IV α:β ratio ~1:7; preferred for hypertensive urgency in PEC, pheochromocytoma perioperative management'}, pns:null, cardiac:{dir:-1,label:'↓ HR / ↓ CO + ↓ SVR',note:'Combined α₁ (↓SVR) + β₁ (↓HR ↓inotropy) → significant CO reduction; β₂ block can cause bronchospasm — caution in asthma'}, conflict:false },
  // ── VOLATILE ANESTHETICS ──────────────────────────────────
  Sevoflurane: {
    sns: { tone:2, dir:-1, label:'↓↓ SNS (MAC-dep.)', mech:'MAC-dependent baroreflex depression + direct vascular smooth muscle relaxation; β-adrenergic receptor desensitization at surgical depth; least arrhythmogenic volatile' },
    pns: null,
    cardiac: { dir:-1, label:'↓ Inotropy (MAC-dep.)', note:'Direct myocardial depression at >1 MAC; ↓Ca²⁺ flux via L-type Ca²⁺ channel inhibition. Lowest arrhythmogenic potential of all volatiles (low epinephrine-sensitization threshold). Safe for inhaled induction in pediatrics.' },
    conflict: false,
  },
  Isoflurane: {
    sns: { tone:2, dir:-1, label:'↓ SNS + ↑ Reflex SNS', mech:'Peripheral vasodilation → ↓MAP → baroreflex → compensatory SNS activation → ↑HR. The drug is sympatholytic but triggers reflex sympathetic counter-response that partially reverses the hypotension.' },
    pns: null,
    cardiac: { dir:-1, label:'↓ Inotropy + ↑ HR (compensatory)', note:'Direct myocardial depression, but peripheral vasodilation triggers reflex tachycardia that maintains CO. This compensatory tachycardia can be mistaken for light anesthesia or awareness.' },
    conflict: true,
    conflictNote: '⚠️ ISOFLURANE REFLEX PARADOX: The drug itself is a vasodilator and sympatholytic, but the resulting ↓MAP activates the baroreflex → compensatory SNS → ↑HR. The tachycardia is not from direct SNS stimulation but from the body compensating for the vasodilation. This masquerades as inadequate anesthesia depth. Treat with volume, not more drug.',
  },
  Desflurane: {
    sns: { tone:3, dir:+1, label:'↑↑↑ SNS (at rapid↑)', mech:'UNIQUE: Rapid concentration increases trigger sympathetic surge via airway C-fiber irritant receptors → acute ↑HR ↑BP ↑NE release (can be severe and arrhythmogenic). At stable concentrations, behaves like other volatiles.' },
    pns: null,
    cardiac: { dir:-1, label:'↓ Inotropy (stable) / ↑ HR/BP (rapid ↑)', note:'At stable doses: similar myocardial depression to other volatiles. RAPID increases = SNS surge from airway irritant receptors → hypertension + tachyarrhythmias. NEVER use for mask induction. Titrate concentration increases slowly.' },
    conflict: true,
    conflictNote: '⚠️ DESFLURANE CONCENTRATION-DEPENDENT PARADOX: At stable anesthetic concentrations, desflurane = sympatholytic + negative inotrope (like all volatiles). But rapid concentration increases trigger an acute SNS surge from airway irritant C-fiber activation → severe hypertension + tachycardia. This is the OPPOSITE of what you expect from a volatile anesthetic and can cause life-threatening arrhythmias if not anticipated.',
  },
  // ── OTHER COMMON AGENTS ───────────────────────────────────
  Dantrolene:    { sns:null, pns:null, cardiac:{dir:0,label:'Neutral (MH-specific)',note:'RyR1 block reduces SR Ca²⁺ release in skeletal muscle; minimal cardiac effects at therapeutic doses for MH crisis (cardiac RyR2 is different isoform and less sensitive)'}, conflict:false },
  Ondansetron:   { sns:null, pns:null, cardiac:{dir:0,label:'QTc prolongation',note:'5-HT₃ block at CTZ (antiemetic); hERG K⁺ channel block → QTc prolongation; FDA warning for doses ≥32 mg IV; clinically relevant with concurrent QT-prolonging drugs'}, conflict:false },
  Labetalol:     { sns:{tone:3,dir:-1,label:'↓↓↓ SNS (α+β)',mech:'Mixed α₁ + β block; see Labetalol entry'}, pns:null, cardiac:{dir:-1,label:'↓ HR/CO + ↓ SVR',note:'Combined sympatholytic; caution in reactive airway disease'}, conflict:false },
};

// Compute net ANS tone from all active medications
function computeANSBalance(activeMeds) {
  let snsScore = 0; let pnsScore = 0;
  const snsContribs = []; const pnsContribs = [];
  const cardiacEffects = []; const conflicts = [];

  (activeMeds || []).forEach(model => {
    if (!model?.name || !model.Ce || model.Ce <= 0) return;
    const profile = ANS_PROFILE[model.name];
    if (!profile) return;

    // Rough activation level (0-1) from Ce relative to typical therapeutic range
    const activation = Math.min(1, Math.max(0.1, model.Ce / Math.max(0.01, model.Ce)));
    // For volatiles use 1.0 (always active when Ce > 0)
    const weight = activation;

    if (profile.sns) {
      const score = profile.sns.tone * profile.sns.dir * weight;
      snsScore += score;
      snsContribs.push({ name: model.name, ...profile.sns });
    }
    if (profile.pns) {
      const score = profile.pns.tone * profile.pns.dir * weight;
      pnsScore += score;
      pnsContribs.push({ name: model.name, ...profile.pns });
    }
    if (profile.cardiac && profile.cardiac.dir !== 0) {
      cardiacEffects.push({ name: model.name, ...profile.cardiac });
    }
    if (profile.conflict) {
      conflicts.push({ name: model.name, note: profile.conflictNote });
    }
  });

  const netSNS = Math.max(-3, Math.min(3, snsScore));
  const netPNS = Math.max(-3, Math.min(3, pnsScore));
  const netANS = netSNS - netPNS; // positive = SNS dominant, negative = PNS dominant

  return { netSNS, netPNS, netANS, snsContribs, pnsContribs, cardiacEffects, conflicts,
           hasActivity: snsContribs.length > 0 || pnsContribs.length > 0 || cardiacEffects.length > 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Compute per-site receptor activity from activeMeds + vitals
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// MECHANISM TYPE SYSTEM
// Explains HOW each drug interacts with each receptor, enabling differentiation
// of agonists vs. antagonists vs. PAMs vs. channel blockers at the same receptor.
// ─────────────────────────────────────────────────────────────────────────────

// Default mech derived from action (covers ~80% of entries without needing explicit annotation)
const DEFAULT_MECH = { agonist: 'agonist', antagonist: 'competitive', modulator: 'pam', inhibitor: 'enzyme_inhibit' };

// Drug × receptor exceptions where the default mapping is wrong
const MECH_OVERRIDES = {
  Propofol:        { 'GABA-A': 'pam' },          // technically PAM, not direct agonist
  Etomidate:       { 'GABA-A': 'pam' },
  Thiopental:      { 'GABA-A': 'pam' },
  Ketamine:        { 'NMDA': 'channel_block', 'NMDA-Sp': 'channel_block' },
  Methadone:       { 'NMDA': 'channel_block' },   // NMDA component is open channel block
  Succinylcholine: { 'nAChR': 'depolarizing' },   // depolarizing agonist → Phase I desensitization block
  Sugammadex:      { 'nAChR': 'chelation' },       // encapsulates roc/vec, doesn't bind nAChR
  Neostigmine:     { 'M₂': 'agonist', 'M₃': 'agonist' }, // excess ACh from AChE inhibition acts as agonist
};

// Human-readable labels for each mechanism type
const MECH_META = {
  agonist:       { short: 'FULL AGONIST',    icon: '▲', colorKey: 'green',  desc: 'Directly activates receptor' },
  partial:       { short: 'PART. AGONIST',   icon: '△', colorKey: 'amber',  desc: 'Partial receptor activation (ceiling effect)' },
  pam:           { short: 'PAM',             icon: '⊕', colorKey: 'blue',   desc: 'Positive allosteric modulator — enhances agonist without activating alone' },
  nam:           { short: 'NAM',             icon: '⊖', colorKey: 'amber',  desc: 'Negative allosteric modulator — reduces agonist efficacy without blocking' },
  competitive:   { short: 'COMP. ANTAG.',    icon: '▼', colorKey: 'red',    desc: 'Competitive antagonist — competes for same binding site as agonist' },
  noncompetitive:{ short: 'NON-COMP.',       icon: '✕', colorKey: 'red',    desc: 'Non-competitive antagonist — different site, reduces maximal effect' },
  channel_block: { short: 'CH. BLOCKER',     icon: '⊗', colorKey: 'amber',  desc: 'Open-channel blocker — enters channel pore and plugs it (voltage-dependent)' },
  enzyme_inhibit:{ short: 'ENZ. INHIBITOR',  icon: '⊘', colorKey: 'green',  desc: 'Enzyme inhibitor — increases endogenous substrate (e.g. ACh) which then acts as agonist' },
  depolarizing:  { short: 'DEPOL. AGONIST',  icon: '≈', colorKey: 'amber',  desc: 'Depolarizing agonist → Phase I block (fasciculations) then desensitization/paralysis' },
  chelation:     { short: 'ENCAPSULATION',   icon: '◎', colorKey: 'green',  desc: 'Physical encapsulation removes drug from receptor — not a classical receptor interaction' },
};

const getMech = (drugName, receptor, action) =>
  MECH_OVERRIDES[drugName]?.[receptor] ?? DEFAULT_MECH[action] ?? 'agonist';

// Compute net receptor activation: positive = agonism prevails, negative = blockade prevails
function computeNetEffect(contribs) {
  if (!contribs || contribs.length === 0) return null;
  let agScore = 0, antScore = 0, pamBoost = 0;
  contribs.forEach(({ occ, mech }) => {
    switch (mech) {
      case 'agonist':        agScore  += occ; break;
      case 'partial':        agScore  += occ * 0.5; break;
      case 'pam':            pamBoost += occ * 0.55; break;
      case 'nam':            antScore += occ * 0.4; break;
      case 'competitive':    antScore += occ; break;
      case 'noncompetitive': antScore += occ * 0.85; break;
      case 'channel_block':  antScore += occ * 0.9; break;
      case 'enzyme_inhibit': agScore  += occ; break;
      case 'depolarizing':   agScore  += occ * 0.15; antScore += occ * 0.75; break;
      case 'chelation':      agScore  += occ; break;  // removes NMB → restores activation
      default:               agScore  += occ * 0.5;
    }
  });
  const effectiveAg = Math.min(1.2, agScore * (1 + pamBoost));
  const net = Math.max(-1, Math.min(1, effectiveAg - antScore));
  let label, color;
  if (net > 0.18) { label = 'AGONISM PREVAILS';  color = '#34d399'; }
  else if (net < -0.18) { label = 'BLOCKADE PREVAILS'; color = '#f87171'; }
  else { label = 'BALANCED / PARTIAL'; color = '#fbbf24'; }
  return { net: parseFloat(net.toFixed(3)), agScore: Math.min(1,agScore), antScore: Math.min(1,antScore), pamBoost, label, color };
}

function computeActivity(activeMeds, vitals) {
  const sites = { brain: {}, cardiac: {}, arterial: {}, venous: {}, pulmonary: {}, nmj: {}, gi: {}, spinal: {} };
  const currentMac = vitals?.mac || 0;

  const merge = (site, receptor, occ, entry, drugName) => {
    if (!sites[site]) return;
    const mech = getMech(drugName, receptor, entry.action);
    if (!sites[site][receptor]) {
      sites[site][receptor] = { occ: 0, action: entry.action, color: entry.color, label: entry.label, detail: entry.detail, drugs: [], contribs: [] };
    }
    const rec = sites[site][receptor];
    if (occ > rec.occ) {
      rec.occ = occ; rec.action = entry.action; rec.color = entry.color;
      rec.label = entry.label; rec.detail = entry.detail;
    }
    if (!rec.drugs.includes(drugName)) rec.drugs.push(drugName);
    // Track per-drug contribution with mechanism
    if (!rec.contribs.find(c => c.name === drugName && c.receptor === receptor)) {
      rec.contribs.push({ name: drugName, occ, mech, action: entry.action, color: entry.color, label: entry.label, detail: entry.detail });
    }
  };

  (activeMeds || []).forEach(model => {
    if (!model?.name || !model.Ce || model.Ce <= 0) return;
    const entries = DRUG_RECEPTOR_MAP[model.name];
    if (!entries) return;
    entries.forEach(entry => {
      const Ce = entry.isMac ? currentMac : model.Ce;
      const occ = hillOcc(Ce, entry.c50, entry.gamma);
      if (occ < 0.02) return;
      merge(entry.site, entry.receptor, occ, entry, model.name);
    });
  });

  // Compute net effect for each receptor after all drugs are merged
  Object.values(sites).forEach(site => {
    Object.values(site).forEach(rec => { rec.netEffect = computeNetEffect(rec.contribs); });
  });

  return sites;
}

// Colour palette per action type
const ACTION_COLORS = {
  agonist:    { bar: '#22d3ee', glow: 'rgba(34,211,238,', border: '#0891b2', text: '#a5f3fc', label: 'AGONIST' },
  antagonist: { bar: '#f87171', glow: 'rgba(248,113,113,', border: '#dc2626', text: '#fca5a5', label: 'ANTAGONIST' },
  modulator:  { bar: '#a78bfa', glow: 'rgba(167,139,250,', border: '#7c3aed', text: '#c4b5fd', label: 'MODULATOR' },
  inhibitor:  { bar: '#fb923c', glow: 'rgba(251,146,60,',  border: '#ea580c', text: '#fed7aa', label: 'INHIBITOR' },
};

// Override color based on drug-semantic color field
const SEMANTIC_COLORS = {
  blue:   { bar: '#818cf8', glow: 'rgba(129,140,248,', border: '#4f46e5', text: '#c7d2fe', label: '↓ CNS' },
  green:  { bar: '#34d399', glow: 'rgba(52,211,153,',  border: '#059669', text: '#a7f3d0', label: '↑ ACTIVE' },
  red:    { bar: '#f87171', glow: 'rgba(248,113,113,', border: '#dc2626', text: '#fca5a5', label: '↓ BLOCKED' },
  amber:  { bar: '#fbbf24', glow: 'rgba(251,191,36,',  border: '#d97706', text: '#fde68a', label: '± MIXED' },
  violet: { bar: '#c084fc', glow: 'rgba(192,132,252,', border: '#9333ea', text: '#e9d5ff', label: 'MODULATES' },
};

const getColor = (entry) => SEMANTIC_COLORS[entry.color] || ACTION_COLORS[entry.action] || ACTION_COLORS.agonist;

// Max occupancy across a site's receptors → glow intensity 0-1
const siteMaxOcc = (siteMap) => Math.max(0, ...Object.values(siteMap || {}).map(r => r.occ));

const SITE_META = {
  brain:     { label: "Brain / CNS",        short: "CNS",   icon: "🧠" },
  cardiac:   { label: "Heart",              short: "HEART", icon: "♥" },
  arterial:  { label: "Systemic Arteries",  short: "ART",   icon: "〜" },
  venous:    { label: "Venous System",       short: "VEN",   icon: "≈" },
  pulmonary: { label: "Pulmonary",          short: "PULM",  icon: "🫁" },
  nmj:       { label: "Neuromuscular Jxn",  short: "NMJ",   icon: "⚡" },
  gi:        { label: "GI / Smooth Muscle", short: "GI",    icon: "⊙" },
  spinal:    { label: "Spinal / Pain",      short: "SPINE", icon: "⋮" },
};

const BodySvg = ({ activity, hoveredSite, onSiteEnter, onSiteLeave }) => {
  const sg = useMemo(() => {
    const compute = (site) => {
      const occ = siteMaxOcc(activity[site]);
      if (occ < 0.03) return { occ: 0, color: "#4776a6", bar: "#4776a6" };
      const receptors = Object.values(activity[site] || {});
      const dominant = receptors.reduce((a, b) => (a.occ > b.occ ? a : b), { occ: 0, color: "blue" });
      const col = getColor(dominant);
      return { occ, color: col.bar, bar: col.bar };
    };
    return {
      brain: compute("brain"), cardiac: compute("cardiac"), arterial: compute("arterial"),
      venous: compute("venous"), pulmonary: compute("pulmonary"), nmj: compute("nmj"),
      gi: compute("gi"), spinal: compute("spinal"),
    };
  }, [activity]);

  const vis = (site) => {
    const { occ, color } = sg[site];
    const active = hoveredSite === site;
    return {
      pointerEvents: "none",
      fill: color,
      fillOpacity: active ? Math.min(0.9, 0.35 + occ * 0.55) : Math.max(0.18, 0.18 + occ * 0.45),
      stroke: color,
      strokeOpacity: active ? 0.95 : (occ > 0.05 ? 0.80 : 0.45),
      strokeWidth: active ? 2.0 : 1.3,
      filter: (active || occ > 0.25) ? "url(#gbody)" : undefined,
      transition: "fill 0.3s,stroke 0.3s,fill-opacity 0.3s,stroke-opacity 0.3s",
    };
  };

  const line = (site, sw = 1.8, dash) => ({
    ...vis(site), fill: "none", strokeWidth: sw,
    strokeDasharray: dash || undefined,
  });

  const region = (site) => {
    const { occ, color } = sg[site];
    const active = hoveredSite === site;
    return {
      pointerEvents: "none", stroke: "none",
      fill: color,
      fillOpacity: active ? Math.max(0.14, 0.06 + occ * 0.22) : Math.max(0.03, 0.02 + occ * 0.13),
      transition: "fill-opacity 0.35s,fill 0.35s",
    };
  };

  const vessel = (site, dashed = false) => {
    const { occ, color } = sg[site];
    const active = hoveredSite === site;
    return {
      pointerEvents: "none", fill: "none", stroke: color,
      strokeOpacity: active ? 0.95 : (occ > 0.08 ? 0.70 : 0.22),
      strokeWidth: active ? 2.6 : 1.9,
      strokeDasharray: dashed ? "5,3.5" : undefined,
      filter: (active || occ > 0.22) ? "url(#gbody)" : undefined,
      transition: "stroke 0.3s,stroke-opacity 0.3s",
    };
  };

  const hit = () => ({ fill: "transparent", stroke: "none", cursor: "pointer" });

  return (
    <svg viewBox="0 0 360 510" className="w-full select-none" style={{ height: "auto", display: "block" }}>
      <defs>
        <filter id="gbody" x="-55%" y="-55%" width="210%" height="210%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* ═══ BODY SILHOUETTE — sleek medical wireframe, spread-eagle contour ══════ */}
      {/* Head - perfect circle */}
      <circle cx="180" cy="105" r="38" fill="#050a15" stroke="#244473" strokeWidth="1.6" style={{pointerEvents:'none'}}/>
      {/* Continuous Body Path (Neck, Arms, Torso, Legs - WIDER) */}
      <path d="M 160,143 C 135,132 80,112 50,105 C 38,102 34,118 42,125 C 75,150 110,165 138,175 C 138,210 144,235 142,260 C 140,285 132,295 128,310 C 122,350 107,410 97,470 C 90,485 120,485 125,470 C 138,430 160,375 180,330 C 200,375 222,430 235,470 C 240,485 270,485 265,470 C 255,370 240,350 232,310 C 230,295 220,295 218,260 C 216,235 222,210 222,175 C 250,165 285,150 320,125 C 328,118 324,102 310,105 C 280,112 225,132 200,143 Z"
            fill="#050a15" stroke="#244473" strokeWidth="1.6" style={{pointerEvents:'none'}}/>

      {/* ═══ REGION OVERLAYS — glow fills per pharmacological site ════════════ */}
      <circle cx="180" cy="105" r="32" {...region('brain')}/>
      <ellipse cx="192" cy="208" rx="22" ry="18" {...region('cardiac')}/>
      <ellipse cx="151" cy="205" rx="14" ry="22" {...region('pulmonary')}/>
      <ellipse cx="209" cy="205" rx="14" ry="22" {...region('pulmonary')}/>
      <ellipse cx="180" cy="275" rx="26" ry="24" {...region('gi')}/>
      <rect x="177" y="145" width="6" height="170" rx="3" {...region('arterial')}/>
      <rect x="177" y="145" width="6" height="170" rx="3" {...region('venous')}/>

      {/* ═══ VASCULAR LINES ═════════════════════════════════════════════════ */}
      {/* Aortic arch + descending */}
      <path d="M 186,192 L 186,310" {...line('arterial', 2.0)}/>
      {/* SVC */}
      <path d="M 174,155 L 174,190 C 174,196 182,196 182,196" {...line('venous', 1.6, '3,2.5')}/>
      {/* IVC */}
      <path d="M 174,215 L 174,310" {...line('venous', 1.6, '3,2.5')}/>
      {/* Arm vessels */}
      <path d="M 172,170 C 130,152 90,132 44,113" {...vessel('arterial')}/>
      <path d="M 188,170 C 230,152 270,132 316,113" {...vessel('arterial')}/>
      <path d="M 168,174 C 126,156 86,136 40,117" {...vessel('venous', true)}/>
      <path d="M 192,174 C 234,156 274,136 320,117" {...vessel('venous', true)}/>
      {/* Leg vessels */}
      <path d="M 176,310 C 165,336 142,385 105,460" {...vessel('arterial')}/>
      <path d="M 184,310 C 195,336 218,385 255,460" {...vessel('arterial')}/>
      <path d="M 173,310 C 162,338 139,387 102,462" {...vessel('venous', true)}/>
      <path d="M 187,310 C 198,338 221,387 258,462" {...vessel('venous', true)}/>

      {/* ═══ EXTERNAL SPINE WIDGET (ON THE RIGHT SIDE OUTSIDE BODY) ══════ */}
      <rect x="241" y="182" width="18" height="141" rx="4"
            fill="rgba(30,58,95,0.06)" stroke="rgba(30,58,95,0.25)" strokeWidth="0.8" style={{pointerEvents:'none'}}/>
      <path d="M 250,187 L 250,318" stroke={sg.spinal.color} strokeOpacity={sg.spinal.occ < 0.03 ? 0.08 : 0.15} strokeWidth="1.2" style={{pointerEvents:'none'}}/>
      {[190, 205, 220, 235, 250, 265, 280, 295, 310].map((y,i)=>(
        <rect key={`vert-group-${i}`} x="245" y={y-2.5} width="10" height="5" rx="1.5"
              fill={sg.spinal.color}
              fillOpacity={sg.spinal.occ < 0.03 ? 0.08 : 0.13 + sg.spinal.occ * 0.50}
              stroke={sg.spinal.color}
              strokeOpacity={sg.spinal.occ > 0.05 ? 0.55 : 0.17}
              strokeWidth="0.8"
              style={{
                pointerEvents: 'none',
                filter: (hoveredSite === 'spinal' || sg.spinal.occ > 0.22) ? 'url(#gbody)' : undefined,
                transition: 'all 0.25s'
              }}
        />
      ))}

      {/* ═══ ORGANS — anatomical representations ════════════════════════ */}
      {/* Brain: two clean symmetric lobes + midline */}
      <path d="M 180,85 C 165,85 160,95 160,106 C 160,117 168,122 180,122 Z" {...vis('brain')}/>
      <path d="M 180,85 C 195,85 200,95 200,106 C 200,117 192,122 180,122 Z" {...vis('brain')}/>
      <line x1="180" y1="85" x2="180" y2="122" style={{pointerEvents:'none'}} stroke={sg.brain.color}
            strokeWidth="0.7" strokeDasharray="2.5,2" strokeOpacity={sg.brain.occ > 0.05 ? 0.6 : 0.2}/>

      {/* Heart: anatomical tilted ventricles + aorta loop (1/3 right, 2/3 left of midline) */}
      <path d="M 185,192 C 174,192 168,198 168,206 C 168,214 195,224 205,224 C 210,224 212,216 212,206 C 212,198 198,192 192,192 L 192,183 C 192,178 185,178 185,183 L 187,192 Z" {...vis('cardiac')}/>

      {/* Lungs: bilateral lobes with cardiac notch and fissures (CONTAINED IN BODY) */}
      {/* Viewer's Left Lung (Patient's Right Lung - 3 lobes) */}
      <path d="M 160,185 C 150,187 142,202 142,222 C 142,232 149,234 160,227 Z" {...vis('pulmonary')}/>
      <line x1="143" y1="205" x2="158" y2="225" stroke={sg.pulmonary.color} strokeOpacity={sg.pulmonary.occ > 0.05 ? 0.6 : 0.3} strokeWidth="0.8" style={{pointerEvents:'none'}}/>
      <line x1="149" y1="213" x2="160" y2="213" stroke={sg.pulmonary.color} strokeOpacity={sg.pulmonary.occ > 0.05 ? 0.6 : 0.3} strokeWidth="0.8" style={{pointerEvents:'none'}}/>

      {/* Viewer's Right Lung (Patient's Left Lung - 2 lobes + cardiac notch) */}
      <path d="M 200,185 C 210,187 218,202 218,222 C 218,232 211,234 200,227 C 204,222 206,216 205,210 C 204,204 200,200 200,185 Z" {...vis('pulmonary')}/>
      <line x1="217" y1="205" x2="203" y2="225" stroke={sg.pulmonary.color} strokeOpacity={sg.pulmonary.occ > 0.05 ? 0.6 : 0.3} strokeWidth="0.8" style={{pointerEvents:'none'}}/>

      {/* Trachea + main bronchi */}
      <line x1="180" y1="155" x2="180" y2="185" {...line('pulmonary', 1.6)}/>
      <path d="M 180,185 C 172,191 162,203" fill="none" {...line('pulmonary', 1.3)}/>
      <path d="M 180,185 C 188,191 198,203" fill="none" {...line('pulmonary', 1.3)}/>

      {/* GI: Stomach + Large Colon frame + small intestine loops */}
      {/* Stomach (patient's left side / viewer's right) */}
      <path d="M 186,242 C 196,242 202,250 202,260 C 202,272 188,274 176,270 C 172,268 170,262 174,258 C 180,254 185,254 188,250 C 190,247 188,244 186,242 Z" {...vis('gi')}/>
      {/* Haustrated Large Colon */}
      <path d="M 156,300 Q 153,295 156,290 Q 153,285 156,280 Q 154,275 160,275 Q 168,278 180,275 Q 192,278 200,275 Q 206,275 204,280 Q 207,285 204,290 Q 207,295 204,300 Q 192,304 180,302 Q 168,304 156,300 Z" {...vis('gi')}/>
      {/* Small Intestines loops */}
      <path d="M 162,282 C 160,288 174,292 180,288 C 186,292 200,288 198,282 C 196,276 164,276 162,282 C 160,288 180,294 180,286 C 180,294 200,288 198,282" fill="none" {...line('gi', 0.9)}/>

      {/* ═══ NMJ TARGET NODES — placed anatomically on muscle monitoring sites ══════ */}
      {[
        { cx: 194, cy: 100, label: "facial" },
        { cx: 42,  cy: 113, label: "left-wrist" },
        { cx: 318, cy: 113, label: "right-wrist" },
        { cx: 138, cy: 380, label: "left-knee" },
        { cx: 222, cy: 380, label: "right-knee" }
      ].map((pt) => (
        <g key={`nmj-${pt.label}`} style={{ pointerEvents: 'none' }}>
          <circle cx={pt.cx} cy={pt.cy} r="2.5" fill={sg.nmj.color}
                  fillOpacity={sg.nmj.occ > 0.05 ? 0.90 : 0.30}
                  stroke={sg.nmj.color} strokeWidth="0.5" />
          <circle cx={pt.cx} cy={pt.cy} r="6.5" fill="none" stroke={sg.nmj.color}
                  strokeWidth="0.6" strokeDasharray="2,1.5"
                  strokeOpacity={sg.nmj.occ > 0.05 ? 0.70 : 0.22}
                  style={{
                    filter: (hoveredSite === 'nmj' || sg.nmj.occ > 0.25) ? 'url(#gbody)' : undefined,
                    transition: 'stroke-opacity 0.3s'
                  }} />
        </g>
      ))}

      {/* ═══ CALLOUT GROUPS — symmetrical lines & text labels (clipping fixed) ═══ */}
      {/* CNS Callout Group */}
      <g cursor="pointer" onMouseEnter={()=>onSiteEnter('brain')} onMouseLeave={onSiteLeave}>
        <path d="M 172,105 L 115,30 L 70,30" fill="none" stroke={sg.brain.color} strokeWidth="1.1" strokeOpacity="0.85" style={{pointerEvents:'none'}} />
        <circle cx="172" cy="105" r="2" fill={sg.brain.color} style={{pointerEvents:'none'}} />
        <text x="65" y="26" textAnchor="end" fontSize="9.5" fontFamily="monospace" fontWeight="bold" fill={sg.brain.color} style={{pointerEvents:'none'}}>CNS</text>
        <text x="65" y="37" textAnchor="end" fontSize="7.5" fontFamily="monospace" fill={sg.brain.color} fillOpacity="0.85" style={{pointerEvents:'none'}}>{Math.round(sg.brain.occ * 100)}%</text>
        <rect x="35" y="40" width="30" height="2" fill="#111827" stroke="#1e293b" strokeWidth="0.5" rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="35" y="40" width={30 * sg.brain.occ} height="2" fill={sg.brain.color} rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="10" y="16" width="60" height="30" fill="rgba(0,0,0,0)" stroke="none" />
      </g>

      {/* LUNGS Callout Group */}
      <g cursor="pointer" onMouseEnter={()=>onSiteEnter('pulmonary')} onMouseLeave={onSiteLeave}>
        <path d="M 154,205 L 115,110 L 70,110" fill="none" stroke={sg.pulmonary.color} strokeWidth="1.1" strokeOpacity="0.85" style={{pointerEvents:'none'}} />
        <circle cx="154" cy="205" r="2" fill={sg.pulmonary.color} style={{pointerEvents:'none'}} />
        <text x="65" y="106" textAnchor="end" fontSize="9.5" fontFamily="monospace" fontWeight="bold" fill={sg.pulmonary.color} style={{pointerEvents:'none'}}>LUNGS</text>
        <text x="65" y="117" textAnchor="end" fontSize="7.5" fontFamily="monospace" fill={sg.pulmonary.color} fillOpacity="0.85" style={{pointerEvents:'none'}}>{Math.round(sg.pulmonary.occ * 100)}%</text>
        <rect x="35" y="120" width="30" height="2" fill="#111827" stroke="#1e293b" strokeWidth="0.5" rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="35" y="120" width={30 * sg.pulmonary.occ} height="2" fill={sg.pulmonary.color} rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="10" y="96" width="60" height="30" fill="rgba(0,0,0,0)" stroke="none" />
      </g>

      {/* ARTERIAL Callout Group */}
      <g cursor="pointer" onMouseEnter={()=>onSiteEnter('arterial')} onMouseLeave={onSiteLeave}>
        <path d="M 186,260 L 115,180 L 70,180" fill="none" stroke={sg.arterial.color} strokeWidth="1.1" strokeOpacity="0.85" style={{pointerEvents:'none'}} />
        <circle cx="186" cy="260" r="2" fill={sg.arterial.color} style={{pointerEvents:'none'}} />
        <text x="65" y="176" textAnchor="end" fontSize="9.5" fontFamily="monospace" fontWeight="bold" fill={sg.arterial.color} style={{pointerEvents:'none'}}>ARTERIAL</text>
        <text x="65" y="187" textAnchor="end" fontSize="7.5" fontFamily="monospace" fill={sg.arterial.color} fillOpacity="0.85" style={{pointerEvents:'none'}}>{Math.round(sg.arterial.occ * 100)}%</text>
        <rect x="35" y="190" width="30" height="2" fill="#111827" stroke="#1e293b" strokeWidth="0.5" rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="35" y="190" width={30 * sg.arterial.occ} height="2" fill={sg.arterial.color} rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="10" y="166" width="60" height="30" fill="rgba(0,0,0,0)" stroke="none" />
      </g>

      {/* GI TRACT Callout Group */}
      <g cursor="pointer" onMouseEnter={()=>onSiteEnter('gi')} onMouseLeave={onSiteLeave}>
        <path d="M 175,275 L 115,260 L 70,260" fill="none" stroke={sg.gi.color} strokeWidth="1.1" strokeOpacity="0.85" style={{pointerEvents:'none'}} />
        <circle cx="175" cy="275" r="2" fill={sg.gi.color} style={{pointerEvents:'none'}} />
        <text x="65" y="256" textAnchor="end" fontSize="9.5" fontFamily="monospace" fontWeight="bold" fill={sg.gi.color} style={{pointerEvents:'none'}}>GI TRACT</text>
        <text x="65" y="267" textAnchor="end" fontSize="7.5" fontFamily="monospace" fill={sg.gi.color} fillOpacity="0.85" style={{pointerEvents:'none'}}>{Math.round(sg.gi.occ * 100)}%</text>
        <rect x="35" y="270" width="30" height="2" fill="#111827" stroke="#1e293b" strokeWidth="0.5" rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="35" y="270" width={30 * sg.gi.occ} height="2" fill={sg.gi.color} rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="10" y="246" width="60" height="30" fill="rgba(0,0,0,0)" stroke="none" />
      </g>

      {/* NMJ Callout Group */}
      <g cursor="pointer" onMouseEnter={()=>onSiteEnter('nmj')} onMouseLeave={onSiteLeave}>
        <path d="M 138,380 L 115,360 L 70,360" fill="none" stroke={sg.nmj.color} strokeWidth="1.1" strokeOpacity="0.85" style={{pointerEvents:'none'}} />
        <circle cx="138" cy="380" r="2" fill={sg.nmj.color} style={{pointerEvents:'none'}} />
        <text x="65" y="356" textAnchor="end" fontSize="9.5" fontFamily="monospace" fontWeight="bold" fill={sg.nmj.color} style={{pointerEvents:'none'}}>NMJ</text>
        <text x="65" y="367" textAnchor="end" fontSize="7.5" fontFamily="monospace" fill={sg.nmj.color} fillOpacity="0.85" style={{pointerEvents:'none'}}>{Math.round(sg.nmj.occ * 100)}%</text>
        <rect x="35" y="370" width="30" height="2" fill="#111827" stroke="#1e293b" strokeWidth="0.5" rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="35" y="370" width={30 * sg.nmj.occ} height="2" fill={sg.nmj.color} rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="10" y="346" width="60" height="30" fill="rgba(0,0,0,0)" stroke="none" />
      </g>

      {/* HEART Callout Group */}
      <g cursor="pointer" onMouseEnter={()=>onSiteEnter('cardiac')} onMouseLeave={onSiteLeave}>
        <path d="M 206,208 L 245,110 L 290,110" fill="none" stroke={sg.cardiac.color} strokeWidth="1.1" strokeOpacity="0.85" style={{pointerEvents:'none'}} />
        <circle cx="206" cy="208" r="2" fill={sg.cardiac.color} style={{pointerEvents:'none'}} />
        <text x="295" y="106" textAnchor="start" fontSize="9.5" fontFamily="monospace" fontWeight="bold" fill={sg.cardiac.color} style={{pointerEvents:'none'}}>HEART</text>
        <text x="295" y="117" textAnchor="start" fontSize="7.5" fontFamily="monospace" fill={sg.cardiac.color} fillOpacity="0.85" style={{pointerEvents:'none'}}>{Math.round(sg.cardiac.occ * 100)}%</text>
        <rect x="295" y="120" width="30" height="2" fill="#111827" stroke="#1e293b" strokeWidth="0.5" rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="295" y="120" width={30 * sg.cardiac.occ} height="2" fill={sg.cardiac.color} rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="290" y="96" width="60" height="30" fill="rgba(0,0,0,0)" stroke="none" />
      </g>

      {/* VENOUS Callout Group */}
      <g cursor="pointer" onMouseEnter={()=>onSiteEnter('venous')} onMouseLeave={onSiteLeave}>
        <path d="M 182,230 L 245,180 L 290,180" fill="none" stroke={sg.venous.color} strokeWidth="1.1" strokeOpacity="0.85" style={{pointerEvents:'none'}} />
        <circle cx="182" cy="230" r="2" fill={sg.venous.color} style={{pointerEvents:'none'}} />
        <text x="295" y="176" textAnchor="start" fontSize="9.5" fontFamily="monospace" fontWeight="bold" fill={sg.venous.color} style={{pointerEvents:'none'}}>VENOUS</text>
        <text x="295" y="187" textAnchor="start" fontSize="7.5" fontFamily="monospace" fill={sg.venous.color} fillOpacity="0.85" style={{pointerEvents:'none'}}>{Math.round(sg.venous.occ * 100)}%</text>
        <rect x="295" y="190" width="30" height="2" fill="#111827" stroke="#1e293b" strokeWidth="0.5" rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="295" y="190" width={30 * sg.venous.occ} height="2" fill={sg.venous.color} rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="290" y="166" width="60" height="30" fill="rgba(0,0,0,0)" stroke="none" />
      </g>

      {/* SPINE Callout Group (POINTS TO THE FLOATING SPINE PANEL) */}
      <g cursor="pointer" onMouseEnter={()=>onSiteEnter('spinal')} onMouseLeave={onSiteLeave}>
        <path d="M 250,250 L 290,250" fill="none" stroke={sg.spinal.color} strokeWidth="1.1" strokeOpacity="0.85" style={{pointerEvents:'none'}} />
        <circle cx="250" cy="250" r="2" fill={sg.spinal.color} style={{pointerEvents:'none'}} />
        <text x="295" y="246" textAnchor="start" fontSize="9.5" fontFamily="monospace" fontWeight="bold" fill={sg.spinal.color} style={{pointerEvents:'none'}}>SPINE</text>
        <text x="295" y="257" textAnchor="start" fontSize="7.5" fontFamily="monospace" fill={sg.spinal.color} fillOpacity="0.85" style={{pointerEvents:'none'}}>{Math.round(sg.spinal.occ * 100)}%</text>
        <rect x="295" y="249" width="30" height="2" fill="#111827" stroke="#1e293b" strokeWidth="0.5" rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="295" y="249" width={30 * sg.spinal.occ} height="2" fill={sg.spinal.color} rx="0.8" style={{pointerEvents:'none'}} />
        <rect x="290" y="236" width="60" height="30" fill="rgba(0,0,0,0)" stroke="none" />
      </g>

      {/* ═══ MOUSE HOVER HITBOXES — invisible overlays for easy selection ═══ */}
      {/* Brain/CNS */}
      <circle cx="180" cy="105" r="32" {...hit()} onMouseEnter={()=>onSiteEnter('brain')} onMouseLeave={onSiteLeave}/>
      {/* Lungs */}
      <ellipse cx="151" cy="205" rx="14" ry="24" {...hit()} onMouseEnter={()=>onSiteEnter('pulmonary')} onMouseLeave={onSiteLeave}/>
      <ellipse cx="209" cy="205" rx="14" ry="24" {...hit()} onMouseEnter={()=>onSiteEnter('pulmonary')} onMouseLeave={onSiteLeave}/>
      {/* Heart */}
      <ellipse cx="192" cy="208" rx="22" ry="18" {...hit()} onMouseEnter={()=>onSiteEnter('cardiac')} onMouseLeave={onSiteLeave}/>
      {/* Arterial */}
      <rect x="183" y="145" width="5" height="170" rx="2" {...hit()} onMouseEnter={()=>onSiteEnter('arterial')} onMouseLeave={onSiteLeave}/>
      {/* Venous */}
      <rect x="172" y="145" width="5" height="170" rx="2" {...hit()} onMouseEnter={()=>onSiteEnter('venous')} onMouseLeave={onSiteLeave}/>
      {/* Spine (OVERLAYS SPINE PANEL) */}
      <rect x="241" y="182" width="18" height="141" rx="4" {...hit()} onMouseEnter={()=>onSiteEnter('spinal')} onMouseLeave={onSiteLeave}/>
      {/* GI Tract */}
      <ellipse cx="180" cy="275" rx="30" ry="28" {...hit()} onMouseEnter={()=>onSiteEnter('gi')} onMouseLeave={onSiteLeave}/>
      {/* NMJ - 5 site triggers */}
      <circle cx="194" cy="100" r="14" {...hit()} onMouseEnter={()=>onSiteEnter('nmj')} onMouseLeave={onSiteLeave}/>
      <circle cx="42"  cy="113" r="16" {...hit()} onMouseEnter={()=>onSiteEnter('nmj')} onMouseLeave={onSiteLeave}/>
      <circle cx="318" cy="113" r="16" {...hit()} onMouseEnter={()=>onSiteEnter('nmj')} onMouseLeave={onSiteLeave}/>
      <circle cx="138" cy="380" r="18" {...hit()} onMouseEnter={()=>onSiteEnter('nmj')} onMouseLeave={onSiteLeave}/>
      <circle cx="222" cy="380" r="18" {...hit()} onMouseEnter={()=>onSiteEnter('nmj')} onMouseLeave={onSiteLeave}/>
    </svg>
  );
};// ─────────────────────────────────────────────────────────────────────────────
// ANS BALANCE PANEL — always-visible autonomic tone display
// Shows the net sympathetic/parasympathetic balance from all active drugs,
// direct cardiac effects, and pharmacological conflicts (e.g. ketamine paradox)
// ─────────────────────────────────────────────────────────────────────────────
const ANSPanel = ({ ansBalance }) => {
  const [expandedConflict, setExpandedConflict] = useState(null);
  const { netANS, snsContribs, pnsContribs, cardiacEffects, conflicts, hasActivity } = ansBalance;
  if (!hasActivity) return null;

  const SNS = '#f97316'; const PNS = '#60a5fa';
  const dominantSNS = netANS > 0.3; const dominantPNS = netANS < -0.3;
  // gauge: indicator moves from left (SNS) to right (PNS)
  const pct = Math.round(((netANS + 3) / 6) * 100); // 100=maxSNS, 0=maxPNS

  // Build one row per drug: merge SNS, PNS, and cardiac into a single entry
  const drugMap = {};
  const add = (list, key) => list.forEach(c => { if (!drugMap[c.name]) drugMap[c.name] = {}; drugMap[c.name][key] = c; });
  add(snsContribs, 'sns'); add(pnsContribs, 'pns');
  cardiacEffects.filter(c => c.dir !== 0).forEach(c => { if (!drugMap[c.name]) drugMap[c.name] = {}; drugMap[c.name].cardiac = c; });
  const conflictNames = new Set(conflicts.map(c => c.name));

  return (
    <div className="px-2 pb-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Header row */}
      <div className="flex items-center justify-between pt-1.5 pb-1">
        <span className="text-[12px] font-black tracking-widest uppercase font-mono text-slate-500">ANS Tone</span>
        <div className="flex items-center gap-1.5 text-[11px] font-bold font-mono">
          <span style={{color:SNS}}>⚡SNS</span>
          <span className="text-slate-700">·</span>
          <span style={{color:PNS}}>PNS∿</span>
          {conflicts.length > 0 && (
            <span className="ml-1 px-1 py-px rounded" style={{background:'#fbbf2414',color:'#fbbf24',border:'1px solid #fbbf2436'}}>
              ⚠️{conflicts.length}
            </span>
          )}
        </div>
      </div>

      {/* Balance gauge — compact 6px tall */}
      <div className="relative h-1.5 rounded-full overflow-hidden mb-0.5"
           style={{background:`linear-gradient(90deg,${SNS}28,rgba(15,23,42,0.8),${PNS}28)`,border:'1px solid rgba(255,255,255,0.05)'}}>
        <div className="absolute top-0 bottom-0 w-1.5 rounded-full transition-all duration-700"
             style={{left:`calc(${100-pct}% - 3px)`,background:dominantSNS?SNS:dominantPNS?PNS:'#64748b',boxShadow:`0 0 5px ${dominantSNS?SNS:dominantPNS?PNS:'#64748b'}`}}/>
      </div>
      <p className="text-[11px] font-bold font-mono text-center mb-1.5" style={{color:dominantSNS?SNS:dominantPNS?PNS:'#64748b'}}>
        {dominantSNS?'SNS dominant':dominantPNS?'PNS dominant':'Balanced'}
      </p>

      {/* One row per drug */}
      <div className="space-y-0.5">
        {Object.entries(drugMap).map(([name, d]) => (
          <div key={name} className="flex items-center gap-1 min-w-0">
            {/* Drug name — truncated, fixed width */}
            <span className="text-[12.5px] font-bold font-mono text-slate-300 truncate shrink-0" style={{width:80}}>{name}</span>
            {/* Effect badges — wrap if needed */}
            <div className="flex items-center gap-0.5 flex-wrap min-w-0">
              {d.sns && <span className="text-[10px] font-black px-1 py-px rounded leading-none whitespace-nowrap"
                style={{background:d.sns.dir>0?`${SNS}1a`:`#94a3b81a`,color:d.sns.dir>0?SNS:'#94a3b8',border:`1px solid ${d.sns.dir>0?SNS+'38':'#94a3b838'}`}}>
                {d.sns.label}</span>}
              {d.pns && <span className="text-[10px] font-black px-1 py-px rounded leading-none whitespace-nowrap"
                style={{background:d.pns.dir>0?`${PNS}1a`:`#94a3b81a`,color:d.pns.dir>0?PNS:'#94a3b8',border:`1px solid ${d.pns.dir>0?PNS+'38':'#94a3b838'}`}}>
                {d.pns.label}</span>}
              {d.cardiac && <span className="text-[10px] font-black px-1 py-px rounded leading-none whitespace-nowrap"
                style={{background:d.cardiac.dir>0?'#34d3991a':'#f871711a',color:d.cardiac.dir>0?'#34d399':'#f87171',border:`1px solid ${d.cardiac.dir>0?'#34d39938':'#f8717138'}`}}>
                ♥ {d.cardiac.label}</span>}
              {/* Conflict indicator — clickable */}
              {conflictNames.has(name) && (
                <button onClick={()=>setExpandedConflict(expandedConflict===name?null:name)}
                  className="text-[10px] font-black px-1 py-px rounded leading-none"
                  style={{background:'#fbbf2414',color:'#fbbf24',border:'1px solid #fbbf2436',cursor:'pointer'}}>
                  ⚠️
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Conflict detail — expands inline when ⚠️ tapped */}
      {expandedConflict && (
        <div className="mt-1.5 rounded-lg px-2 py-1.5"
             style={{background:'#fbbf2408',border:'1px solid #fbbf2430'}}>
           <p className="text-[11.5px] font-black text-amber-400 font-mono mb-0.5">{expandedConflict} — CONFLICT</p>
           <p className="text-[11px] leading-tight" style={{color:'rgba(253,230,138,0.55)'}}>
            {conflicts.find(c=>c.name===expandedConflict)?.note}
          </p>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TOOLTIP CONTENT — receptor rows for the hovered organ
// ─────────────────────────────────────────────────────────────────────────────
const ReceptorTooltip = ({ site, siteData, onEnter, onLeave }) => {
  const meta = SITE_META[site] || { label: site, icon: '◈' };
  const receptors = Object.entries(siteData || {}).filter(([, r]) => r.occ >= 0.02).sort((a, b) => b[1].occ - a[1].occ);

  return (
    <div onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {/* ── HEADER ── */}
      <div className="flex items-center gap-2 px-3 py-2.5"
           style={{ borderBottom: '1px solid rgba(34,211,238,0.12)', background: 'rgba(34,211,238,0.04)' }}>
        <span className="text-base leading-none">{meta.icon}</span>
        <div>
          <p className="text-[13px] font-black text-slate-100 tracking-wide">{meta.label}</p>
          <p className="text-[10.5px] font-mono text-slate-500">receptor occupancy · mechanism · net effect</p>
        </div>
      </div>

      {receptors.length === 0 ? (
        <div className="px-3 py-4 text-center">
          <p className="text-[12.5px] text-slate-600 font-mono italic">No active modulation</p>
        </div>
      ) : (
        <div className="px-2.5 py-2.5 space-y-4 max-h-80 overflow-y-auto">
          {receptors.map(([recName, rec]) => {
            const col = getColor(rec);
            const maxPct = Math.round(rec.occ * 100);
            const ne = rec.netEffect;
            // Sort contribs: agonists first, then by occ desc
            const contribs = [...(rec.contribs || [])].sort((a, b) => {
              const aAg = ['agonist','pam','partial','enzyme_inhibit','depolarizing','chelation'].includes(a.mech) ? 0 : 1;
              const bAg = ['agonist','pam','partial','enzyme_inhibit','depolarizing','chelation'].includes(b.mech) ? 0 : 1;
              return aAg - bAg || b.occ - a.occ;
            });

            return (
              <div key={recName} className="space-y-1.5">
                {/* ── RECEPTOR HEADER ── */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-black font-mono" style={{ color: col.text }}>{recName}</span>
                  <span className="text-[13px] font-black font-mono tabular-nums" style={{ color: col.bar }}>{maxPct}% max occ.</span>
                </div>

                {/* ── NET EFFECT ── */}
                {ne && contribs.length > 1 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none"
                            style={{ background: ne.color + '18', color: ne.color, border: `1px solid ${ne.color}44` }}>
                        {ne.label}
                      </span>
                    </div>
                    {/* Net balance bar: green left half = agonism, red right half = blockade */}
                    <div className="relative h-2 rounded-full overflow-hidden flex"
                         style={{ background: 'rgba(10,20,40,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-l-full" title={`Agonism: ${Math.round(ne.agScore*100)}%`}
                           style={{ width: `${Math.round(ne.agScore * 50)}%`, background: '#34d399', opacity: 0.85 }} />
                      <div className="absolute top-0 bottom-0 w-px bg-slate-600/50" style={{ left: '50%' }} />
                      <div className="h-full rounded-r-full ml-auto" title={`Blockade: ${Math.round(ne.antScore*100)}%`}
                           style={{ width: `${Math.round(ne.antScore * 50)}%`, background: '#f87171', opacity: 0.85 }} />
                    </div>
                    <div className="flex justify-between text-[9.5px] font-mono text-slate-600">
                      <span>◄ AGONISM</span>
                      {ne.pamBoost > 0.05 && <span className="text-indigo-400/70">PAM ×{(1+ne.pamBoost).toFixed(1)}</span>}
                      <span>BLOCKADE ►</span>
                    </div>
                  </div>
                )}

                {/* ── PER-DRUG BREAKDOWN ── */}
                <div className="space-y-1.5 pl-2 border-l-2" style={{ borderColor: col.bar + '30' }}>
                  {contribs.map((c, i) => {
                    const mm = MECH_META[c.mech] || MECH_META.agonist;
                    const cc = SEMANTIC_COLORS[c.color] || getColor(c);
                    const cpct = Math.round(c.occ * 100);
                    const isAntag = ['competitive','noncompetitive','channel_block','nam'].includes(c.mech);
                    return (
                      <div key={`${c.name}-${i}`} className="space-y-0.5">
                        {/* Drug name + mechanism badge + occupancy */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-1 py-0.5 rounded leading-none shrink-0"
                                style={{ background: cc.bar + '1a', color: cc.text, border: `1px solid ${cc.border}38` }}>
                            {mm.icon} {mm.short}
                          </span>
                          <span className="text-[12px] font-bold font-mono text-slate-200">{c.name}</span>
                          <span className="text-[11.5px] font-black font-mono tabular-nums ml-auto" style={{ color: cc.bar }}>{cpct}%</span>
                        </div>
                        {/* Occupancy bar — red for antagonists, color for agonists */}
                        <div className="h-1 rounded-full overflow-hidden" style={{ background:'rgba(10,20,40,0.7)', border:`1px solid ${cc.border}18` }}>
                          <div className="h-full rounded-full transition-all duration-500"
                               style={{ width:`${cpct}%`, background: isAntag ? `linear-gradient(90deg,#f8717160,#f87171)` : `linear-gradient(90deg,${cc.bar}60,${cc.bar})`, boxShadow:`0 0 4px ${cc.bar}40` }} />
                        </div>
                        {/* Mechanism one-liner */}
                        <p className="text-[10px] leading-tight font-mono" style={{ color: 'rgba(148,163,184,0.6)' }}>{mm.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PANEL — draggable, collapsible vertical-tab design
// ─────────────────────────────────────────────────────────────────────────────
export const ReceptorBodyPanel = ({ activeMeds, vitals, patient, isOpen, onClose }) => {
  const [hoveredSite, setHoveredSite] = useState(null);
  const [panelExpanded, setPanelExpanded] = useState(true);
  const [pos, setPos] = useState({ x: 8, y: 120 });
  const [panelWidth, setPanelWidth] = useState(235); // resizable body panel width

  const dragRef = useRef({ active: false, startX: 0, startY: 0, ox: 0, oy: 0 });
  const resizeRef = useRef({ active: false, startX: 0, startW: 0 });
  const containerRef = useRef(null);

  // Hover debounce — 220ms timeout so tooltip doesn't vanish when cursor moves
  // from the SVG organ to the tooltip panel
  const hoverTimerRef = useRef(null);

  const onSiteEnter = useCallback((site) => {
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
    setHoveredSite(site);
  }, []);

  const onSiteLeave = useCallback(() => {
    hoverTimerRef.current = setTimeout(() => setHoveredSite(null), 220);
  }, []);

  const onTooltipEnter = useCallback(() => {
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
  }, []);

  const onTooltipLeave = useCallback(() => {
    hoverTimerRef.current = setTimeout(() => setHoveredSite(null), 220);
  }, []);

  // Drag — attach to document so fast mouse movements don't lose the handler
  const onDragStart = useCallback((e) => {
    if (e.button !== 0) return;
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, ox: pos.x, oy: pos.y };
    e.preventDefault();
  }, [pos]);

  const onResizeStart = useCallback((e) => {
    if (e.button !== 0) return;
    resizeRef.current = { active: true, startX: e.clientX, startW: panelWidth };
    e.preventDefault();
    e.stopPropagation();
  }, [panelWidth]);

  useEffect(() => {
    const onMove = (e) => {
      if (dragRef.current.active) {
        setPos({
          x: Math.max(0, Math.min(window.innerWidth - 60, dragRef.current.ox + (e.clientX - dragRef.current.startX))),
          y: Math.max(0, Math.min(window.innerHeight - 80, dragRef.current.oy + (e.clientY - dragRef.current.startY))),
        });
      }
      if (resizeRef.current.active) {
        setPanelWidth(Math.max(140, Math.min(380, resizeRef.current.startW + (e.clientX - resizeRef.current.startX))));
      }
    };
    const onUp = () => { dragRef.current.active = false; resizeRef.current.active = false; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, []);

  const activity = useMemo(() => computeActivity(activeMeds, vitals), [activeMeds, vitals]);
  const ansBalance = useMemo(() => computeANSBalance(activeMeds), [activeMeds]);

  const totalActive = useMemo(() =>
    Object.values(activity).reduce((s, site) => s + Object.values(site).filter(r => r.occ >= 0.05).length, 0),
    [activity]
  );

  if (!isOpen) return null;

  const PANEL_W = panelWidth;  // resizable
  const TOOLTIP_W = 272;
  const TAB_W = 36;

  const tooltipLeft = (pos.x + TAB_W + PANEL_W + TOOLTIP_W + 8 > window.innerWidth);

  return (
    <div ref={containerRef}
         className="fixed z-[120] flex items-start select-none"
         style={{ left: pos.x, top: pos.y }}>

      {/* ── VERTICAL TAB STRIP (drag handle + collapse toggle) ──────── */}
      <div
        className="flex flex-col items-center rounded-l-2xl overflow-hidden shrink-0 shadow-xl"
        style={{
          width: TAB_W,
          maxHeight: 'calc(100vh - 120px)',
          background: 'linear-gradient(180deg, rgba(2,12,28,0.98) 0%, rgba(4,18,42,0.96) 100%)',
          border: '1px solid rgba(34,211,238,0.22)',
          borderRight: panelExpanded ? '1px solid rgba(34,211,238,0.08)' : '1px solid rgba(34,211,238,0.22)',
          backdropFilter: 'blur(18px)',
          cursor: dragRef.current.active ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
        onMouseDown={onDragStart}
      >
        {/* Drag grip dots */}
        <div className="flex flex-col items-center gap-0.5 pt-2.5 pb-1.5" style={{ cursor: 'inherit' }}>
          {[0,1,2].map(i => (
            <div key={i} className="flex gap-0.5">
              <div className="w-0.5 h-0.5 rounded-full bg-slate-600" />
              <div className="w-0.5 h-0.5 rounded-full bg-slate-600" />
            </div>
          ))}
        </div>

        {/* DNA icon */}
        <div className="py-2">
          <Dna size={14} className="text-cyan-400" style={{ filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.5))' }} />
        </div>

        {/* Rotated label */}
        <div className="flex-1 flex items-center justify-center" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          <span className="text-[11px] font-black tracking-widest uppercase font-mono text-cyan-400/80">
            RECEPTORS
          </span>
        </div>

        {/* Active badge */}
        {totalActive > 0 && (
          <div className="py-2 flex flex-col items-center gap-1">
            <div className="w-4 h-4 rounded-full flex items-center justify-center animate-pulse"
                 style={{ background: 'rgba(34,211,238,0.18)', border: '1px solid rgba(34,211,238,0.4)' }}>
              <span className="text-[9.5px] font-black text-cyan-300">{totalActive}</span>
            </div>
          </div>
        )}

        {/* Expand / collapse + close */}
        <div className="flex flex-col items-center gap-2 pb-3 pt-1">
          <button
            className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-cyan-300 transition-colors"
            style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.12)' }}
            onClick={(e) => { e.stopPropagation(); setPanelExpanded(v => !v); }}
            onMouseDown={e => e.stopPropagation()}
            title={panelExpanded ? 'Collapse' : 'Expand'}
          >
            <span className="text-[10px] leading-none">{panelExpanded ? '◂' : '▸'}</span>
          </button>
          <button
            className="w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:text-rose-300 transition-colors"
            style={{ background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.1)' }}
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            onMouseDown={e => e.stopPropagation()}
            title="Close"
          >
            <X size={10} />
          </button>
        </div>
      </div>

      {/* ── BODY PANEL (collapses) ───────────────────────────────────── */}
      {panelExpanded && (
        <div className="rounded-r-2xl shadow-2xl shrink-0 flex flex-col"
             style={{
               width: PANEL_W,
               maxHeight: 'calc(100vh - 120px)', // prevents panel from growing off-screen
               overflowY: 'auto',
               overflowX: 'hidden',
               background: 'linear-gradient(160deg, rgba(2,8,23,0.97) 0%, rgba(5,15,35,0.95) 100%)',
               border: '1px solid rgba(34,211,238,0.15)',
               borderLeft: 'none',
               backdropFilter: 'blur(18px)',
             }}>

          {/* SVG body map */}
          <div className="px-1.5 pt-2 pb-1">
            <BodySvg activity={activity} hoveredSite={hoveredSite} onSiteEnter={onSiteEnter} onSiteLeave={onSiteLeave} />
          </div>

          {/* Legend strip */}
          <div className="px-3 pb-2.5 flex flex-wrap gap-x-3 gap-y-1 border-t border-white/5 pt-2">
            {[['blue','CNS↓'],['green','AGONIST'],['red','BLOCKED'],['amber','MIXED']].map(([c, l]) => (
              <div key={c} className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: SEMANTIC_COLORS[c].bar, boxShadow: `0 0 4px ${SEMANTIC_COLORS[c].bar}70` }} />
                <span className="text-[12px] font-mono font-bold" style={{ color: SEMANTIC_COLORS[c].text }}>{l}</span>
              </div>
            ))}
          </div>

          {/* ── ANS BALANCE (always visible when drugs are active) ── */}
          <ANSPanel ansBalance={ansBalance} />

          {!hoveredSite && !ansBalance.hasActivity && (
            <p className="text-[13px] text-slate-700 font-mono text-center pb-1 italic">hover organ for receptor detail</p>
          )}

          {/* ── RESIZE GRIP (drag right edge to resize width) ── */}
          <div
            className="flex items-center justify-center py-1.5 cursor-col-resize select-none"
            style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
            onMouseDown={onResizeStart}
            title="Drag to resize"
          >
            <GripVertical size={12} className="text-slate-700 rotate-90" />
          </div>
        </div>
      )}

      {/* ── TOOLTIP PANEL (shown while hovering an organ) ──────────── */}
      {hoveredSite && panelExpanded && (
        <div
          className="rounded-2xl overflow-hidden shadow-2xl shrink-0"
          style={{
            width: TOOLTIP_W,
            background: 'linear-gradient(160deg, rgba(2,8,26,0.99) 0%, rgba(5,14,40,0.97) 100%)',
            border: '1px solid rgba(34,211,238,0.2)',
            backdropFilter: 'blur(20px)',
            position: tooltipLeft ? 'absolute' : 'static',
            ...(tooltipLeft ? { right: TAB_W + PANEL_W + 8, top: 0 } : {}),
          }}
          onMouseEnter={onTooltipEnter}
          onMouseLeave={onTooltipLeave}
        >
          <ReceptorTooltip
            site={hoveredSite}
            siteData={activity[hoveredSite]}
            onEnter={onTooltipEnter}
            onLeave={onTooltipLeave}
          />
        </div>
      )}
    </div>
  );
};
