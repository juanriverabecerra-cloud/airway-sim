import { textbookProse, physiologicalMatrices } from './medical_truth_snapshot.ts';
import { MEDICATIONS_CONFIG } from '../engine/config/meds.config.ts';
import { MEDICATIONS } from '../engine/Pharmacology.js';

export interface PKParameters {
  V1: number;
  V2: number;
  V3: number;
  k10: number;
  k12: number;
  k21: number;
  k13: number;
  k31: number;
  ke0: number;
  coSensitivity?: number;
  proteinBinding?: number;
  renalFraction?: number;
  hepaticFraction?: number;
}

export interface Receptors {
  Alpha1?: number;
  Beta1?: number;
  Beta2?: number;
  V1?: number;
}

export interface PDParameters {
  c50: number;
  gamma: number;
  sysMax?: number;
  diaMax?: number;
  hrMax?: number;
  rrMax?: number;
  inducesApneaAtCe?: number;
  inducesParalysisAtCe?: number;
  receptorAffinity?: number;
  chelationRatio?: number;
  receptors?: Receptors;
  synergyGroup?: string;
}

export interface IndicationDetail {
  dose: string;
  unit: string;
  type: 'Bolus' | 'Infusion';
}

export interface MedicationProfile {
  name: string;
  classes: string[];
  routes: string[];
  types: ('Bolus' | 'Infusion' | 'Stop Infusion')[];
  dosingWeight: 'TBW' | 'IBW' | 'LBW';
  metabolism: string;
  proteinBinding?: number;
  synergyGroup?: string;
  pkModel?: string;
  targetReceptor?: string;
  intracellularCascade?: string;
  indications: Record<string, IndicationDetail>;
  pk: PKParameters;
  pd: PDParameters;
  notes: string;
  activeMetabolites?: string[];
  activeMetabolite?: string;
}

const CLASS_AVERAGES: Record<string, { pk: PKParameters; pd: PDParameters; classes: string[]; synergyGroup: string }> = {
  'sedative': {
    classes: ['Sedative', 'Hypnotic'],
    synergyGroup: 'Sedative',
    pk: { V1: 10.0, V2: 30.0, V3: 100.0, k10: 0.1, k12: 0.1, k21: 0.05, k13: 0.03, k31: 0.01, ke0: 1.0, coSensitivity: 0.3 },
    pd: { c50: 1.0, gamma: 2.0, sysMax: -15, diaMax: -10, hrMax: -5, rrMax: -10, inducesApneaAtCe: 1.5 }
  },
  'opioid': {
    classes: ['Opioid'],
    synergyGroup: 'Opioid',
    pk: { V1: 15.0, V2: 35.0, V3: 200.0, k10: 0.05, k12: 0.1, k21: 0.05, k13: 0.04, k31: 0.01, ke0: 0.2, coSensitivity: 0.6 },
    pd: { c50: 0.01, gamma: 1.5, sysMax: -10, diaMax: -10, hrMax: -15, rrMax: -12, inducesApneaAtCe: 0.02 }
  },
  'ndmr': {
    classes: ['NDMR'],
    synergyGroup: 'Paralytic',
    pk: { V1: 15.0, V2: 25.0, V3: 0, k10: 0.08, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.1, coSensitivity: 0.2 },
    pd: { c50: 0.5, gamma: 4, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: -20, inducesParalysisAtCe: 0.5, inducesApneaAtCe: 0.5, receptorAffinity: 0.75 }
  },
  'paralytic': {
    classes: ['NMBA'],
    synergyGroup: 'Paralytic',
    pk: { V1: 15.0, V2: 25.0, V3: 0, k10: 0.08, k12: 0.05, k21: 0.05, k13: 0, k31: 0, ke0: 0.1, coSensitivity: 0.2 },
    pd: { c50: 0.5, gamma: 4, sysMax: 0, diaMax: 0, hrMax: 0, rrMax: -20, inducesParalysisAtCe: 0.5, inducesApneaAtCe: 0.5, receptorAffinity: 0.75 }
  },
  'vasopressor': {
    classes: ['Vasopressor'],
    synergyGroup: 'Pressor',
    pk: { V1: 8.0, V2: 0, V3: 0, k10: 0.5, k12: 0, k21: 0, k13: 0, k31: 0, ke0: 1.5, coSensitivity: 0.1 },
    pd: { c50: 0.01, gamma: 1.5, sysMax: 30, diaMax: 30, hrMax: 10, rrMax: 0, receptors: { Alpha1: 3, Beta1: 1, Beta2: 0 } }
  }
};

export class DynamicMedicationRegistry {
  private static dynamicMeds: Record<string, MedicationProfile> = {};
  private static initialized = false;

  /**
   * Initializes the registry by scanning textbook snapshots, extracting dynamic
   * medications, and registering them directly in the simulator's exported MEDICATIONS dictionaries.
   */
  public static hydrate(): Record<string, MedicationProfile> {
    if (this.initialized) {
      return this.dynamicMeds;
    }

    console.log(`[DynamicMedicationRegistry] Hydrating dynamic medications...`);

    // 1. Scan textbook matrices (structured figure tables)
    for (const matrix of physiologicalMatrices) {
      if (matrix.archetype === 'COORDINATE X-Y GRAPHS & COMPLEMENTARY PANELS' || 
          matrix.caption.toLowerCase().includes('pharmacokinetics') || 
          matrix.caption.toLowerCase().includes('pharmacodynamics') ||
          matrix.caption.toLowerCase().includes('dosing') ||
          matrix.caption.toLowerCase().includes('affinity')) {
        try {
          const payload = JSON.parse(matrix.structured_payload);
          const rows = payload.matrix_rows || (payload.details && payload.details.matrix_rows);
          if (rows && rows.length > 0) {
            this.parseTable(rows, matrix.caption);
          }
        } catch (e: any) {
          // Silent catch for non-JSON payloads
        }
      }
    }

    // 2. Scan textbook prose for raw markdown tables
    for (const prose of textbookProse) {
      if (prose.body_text && prose.body_text.includes('|')) {
        const rows = this.parseMarkdownTable(prose.body_text);
        if (rows.length > 0) {
          this.parseTable(rows, prose.section_heading || prose.chapter_title);
        }
      }
    }

    // 3. Hydrate baseline and dynamic medications into both state pools
    for (const [key, profile] of Object.entries(this.dynamicMeds)) {
      if (!MEDICATIONS[key]) {
        MEDICATIONS[key] = profile;
        console.log(`  ✓ Dynamically registered medication in Pharmacology.MEDICATIONS: ${profile.name} [${key}]`);
      }
      if (!MEDICATIONS_CONFIG[key]) {
        MEDICATIONS_CONFIG[key] = profile as any;
        console.log(`  ✓ Dynamically registered medication in meds.config.MEDICATIONS_CONFIG: ${profile.name} [${key}]`);
      }
    }

    this.initialized = true;
    return this.dynamicMeds;
  }

  /**
   * Manual registration tool for testing or specific case loads.
   */
  public static registerMedication(key: string, profile: MedicationProfile): void {
    const cleanKey = key.toLowerCase().trim();
    this.dynamicMeds[cleanKey] = profile;
    
    // Immediate hydration
    MEDICATIONS[cleanKey] = profile;
    MEDICATIONS_CONFIG[cleanKey] = profile as any;
  }

  /**
   * Retrieves a merged set of all medications (static + dynamic)
   */
  public static getMergedMedications(): Record<string, MedicationProfile> {
    this.hydrate();
    return {
      ...(MEDICATIONS as any),
      ...this.dynamicMeds
    };
  }

  /**
   * Resets the registry (useful for clean test environments)
   */
  public static reset(): void {
    this.dynamicMeds = {};
    this.initialized = false;
  }

  /**
   * Parses markdown tables into row-column lists.
   */
  private static parseMarkdownTable(text: string): string[][] {
    const lines = text.split('\n');
    const rows: string[][] = [];
    for (const line of lines) {
      if (line.includes('|')) {
        const cells = line
          .split('|')
          .map(c => c.trim())
          .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
        
        // Skip separator line (e.g. |---|---|)
        if (cells.length > 0 && !cells.every(c => c.startsWith('-'))) {
          rows.push(cells);
        }
      }
    }
    return rows;
  }

  /**
   * Parses standard table structures (row-oriented or column-oriented) to identify novel medications.
   */
  private static parseTable(rows: string[][], contextLabel: string): void {
    if (rows.length < 2) return;

    const headers = rows[0].map(h => h.toLowerCase().trim());

    // 1. Column-oriented Multi-Drug Table
    // Headers: [ "drug", "class", "v1", "k10", "c50", ... ]
    const drugColIdx = headers.findIndex(h => h.includes('drug') || h.includes('medication') || h.includes('agent'));
    if (drugColIdx >= 0) {
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (row.length <= drugColIdx) continue;
        const drugName = row[drugColIdx].trim();
        if (drugName.length < 2 || drugName.includes('---')) continue;

        // Skip if already hardcoded
        const key = drugName.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (MEDICATIONS[key] && !this.dynamicMeds[key]) continue;

        // Extract parameters
        const extracted: Record<string, any> = {};
        for (let c = 0; c < headers.length; c++) {
          if (c === drugColIdx) continue;
          const val = parseFloat(row[c]);
          if (!isNaN(val)) {
            extracted[headers[c]] = val;
          } else {
            extracted[headers[c]] = row[c].trim();
          }
        }

        const profile = this.buildProfile(drugName, extracted);
        this.dynamicMeds[key] = profile;
      }
    } 
    // 2. Row-oriented Single-Drug Table
    // Context label contains the drug name, and rows are key-value pairs (e.g., [ "V1", "8.0" ])
    else {
      // Look for a drug name inside contextLabel, ignoring common noise words
      const noiseWords = ['pharmacokinetics', 'pharmacokinetic', 'pharmacodynamics', 'pharmacodynamic', 'parameter', 'parameters', 'dosing', 'affinity', 'curve', 'table', 'chart', 'hypnogram', 'recording', 'eeg', 'waveform', 'timeline', 'intubation', 'awake', 'fiberoptic', 'rsi', 'ventilation', 'procedure'];
      
      const words = contextLabel.split(/[^a-zA-Z]/);
      let drugName = '';
      for (const w of words) {
        if (w.length > 2 && w[0] === w[0].toUpperCase()) {
          const lower = w.toLowerCase();
          if (!noiseWords.includes(lower)) {
            drugName = w;
            break;
          }
        }
      }

      if (drugName) {
        const key = drugName.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (MEDICATIONS[key] && !this.dynamicMeds[key]) return;

        const extracted: Record<string, any> = {};
        for (const row of rows) {
          if (row.length < 2) continue;
          const paramName = row[0].toLowerCase().trim();
          const rawVal = row[1].trim();
          const val = parseFloat(rawVal);
          if (!isNaN(val)) {
            extracted[paramName] = val;
          } else {
            extracted[paramName] = rawVal;
          }
        }

        if (Object.keys(extracted).length > 0) {
          const profile = this.buildProfile(drugName, extracted);
          this.dynamicMeds[key] = profile;
        }
      }
    }
  }

  /**
   * Dynamically constructs a MedicationProfile from parsed fields, using class-based
   * averages to fill in missing fields and default to single-compartment parameters if needed.
   */
  private static buildProfile(name: string, fields: Record<string, any>): MedicationProfile {
    // 1. Identify standard clinical drug class based on notes or parsed class field
    let drugClass = (fields.class || fields.category || '').toLowerCase();
    if (!drugClass) {
      const lowerName = name.toLowerCase();
      if (lowerName.includes('curium') || lowerName.includes('ronium') || lowerName.includes('curonium')) {
        drugClass = 'ndmr';
      } else if (lowerName.includes('fentanyl') || lowerName.includes('morphone') || lowerName.includes('codone')) {
        drugClass = 'opioid';
      } else if (lowerName.includes('pine') || lowerName.includes('lol') || lowerName.includes('pressor') || lowerName.includes('epinephrine')) {
        drugClass = 'vasopressor';
      } else {
        drugClass = 'sedative'; // Fallback default
      }
    }

    // Find class averages
    const fallback = CLASS_AVERAGES[drugClass] || CLASS_AVERAGES['sedative'];

    // 2. Build PK Parameters (euler multi-compartment mammillary)
    const pk: PKParameters = {
      V1: fields.v1 !== undefined ? parseFloat(fields.v1) : fallback.pk.V1,
      V2: fields.v2 !== undefined ? parseFloat(fields.v2) : fallback.pk.V2,
      V3: fields.v3 !== undefined ? parseFloat(fields.v3) : fallback.pk.V3,
      k10: fields.k10 !== undefined ? parseFloat(fields.k10) : fallback.pk.k10,
      k12: fields.k12 !== undefined ? parseFloat(fields.k12) : fallback.pk.k12,
      k21: fields.k21 !== undefined ? parseFloat(fields.k21) : fallback.pk.k21,
      k13: fields.k13 !== undefined ? parseFloat(fields.k13) : fallback.pk.k13,
      k31: fields.k31 !== undefined ? parseFloat(fields.k31) : fallback.pk.k31,
      ke0: fields.ke0 !== undefined ? parseFloat(fields.ke0) : fallback.pk.ke0,
      coSensitivity: fields.cosensitivity !== undefined ? parseFloat(fields.cosensitivity) : fallback.pk.coSensitivity,
      proteinBinding: fields.proteinbinding !== undefined ? parseFloat(fields.proteinbinding) : fallback.pk.proteinBinding,
      renalFraction: fields.renalfraction !== undefined ? parseFloat(fields.renalfraction) : fallback.pk.renalFraction,
      hepaticFraction: fields.hepaticfraction !== undefined ? parseFloat(fields.hepaticfraction) : fallback.pk.hepaticFraction
    };

    // 3. Build PD Parameters (sigmoid emax)
    const pd: PDParameters = {
      c50: fields.c50 !== undefined ? parseFloat(fields.c50) : fallback.pd.c50,
      gamma: fields.gamma !== undefined ? parseFloat(fields.gamma) : fallback.pd.gamma,
      sysMax: fields.sysmax !== undefined ? parseFloat(fields.sysmax) : fallback.pd.sysMax,
      diaMax: fields.diamax !== undefined ? parseFloat(fields.diamax) : fallback.pd.diaMax,
      hrMax: fields.hrmax !== undefined ? parseFloat(fields.hrmax) : fallback.pd.hrMax,
      rrMax: fields.rrmax !== undefined ? parseFloat(fields.rrmax) : fallback.pd.rrMax,
      inducesApneaAtCe: fields.inducesapneaatce !== undefined ? parseFloat(fields.inducesapneaatce) : fallback.pd.inducesApneaAtCe,
      inducesParalysisAtCe: fields.inducesparalysisatce !== undefined ? parseFloat(fields.inducesparalysisatce) : fallback.pd.inducesParalysisAtCe,
      receptorAffinity: fields.receptoraffinity !== undefined ? parseFloat(fields.receptoraffinity) : fallback.pd.receptorAffinity,
      chelationRatio: fields.chelationratio !== undefined ? parseFloat(fields.chelationratio) : fallback.pd.chelationRatio,
      synergyGroup: fields.synergygroup !== undefined ? fields.synergygroup : fallback.pd.synergyGroup
    };

    if (fields.receptors || fields.receptoralpha1) {
      pd.receptors = {
        Alpha1: fields.receptoralpha1 !== undefined ? parseFloat(fields.receptoralpha1) : fields.receptors?.Alpha1,
        Beta1: fields.receptorbeta1 !== undefined ? parseFloat(fields.receptorbeta1) : fields.receptors?.Beta1,
        Beta2: fields.receptorbeta2 !== undefined ? parseFloat(fields.receptorbeta2) : fields.receptors?.Beta2,
        V1: fields.receptorv1 !== undefined ? parseFloat(fields.receptorv1) : fields.receptors?.V1
      };
    } else if (fallback.pd.receptors) {
      pd.receptors = { ...fallback.pd.receptors };
    }

    // 4. indications
    const indications: Record<string, IndicationDetail> = {};
    if (fields.indicationname && fields.indicationdose) {
      indications[fields.indicationname] = {
        dose: String(fields.indicationdose),
        unit: fields.indicationunit || 'mg/kg',
        type: fields.indicationtype || 'Bolus'
      };
    } else {
      indications['Induction'] = {
        dose: String(pd.c50 * 2),
        unit: pd.synergyGroup === 'Opioid' ? 'mcg' : 'mg/kg',
        type: 'Bolus'
      };
    }

    return {
      name,
      classes: fields.classes ? (Array.isArray(fields.classes) ? fields.classes : [fields.classes]) : fallback.classes,
      routes: fields.routes ? (Array.isArray(fields.routes) ? fields.routes : [fields.routes]) : ['IV'],
      types: fields.types ? (Array.isArray(fields.types) ? fields.types : [fields.types]) : ['Bolus', 'Infusion'],
      dosingWeight: fields.dosingweight || 'TBW',
      metabolism: fields.metabolism || 'Hepatic',
      proteinBinding: pk.proteinBinding,
      synergyGroup: pd.synergyGroup,
      pkModel: fields.pkmodel || 'Dynamic Ingestion Model',
      targetReceptor: fields.targetreceptor || fields.targetReceptor || 'nAChR',
      intracellularCascade: fields.intracellularcascade || fields.intracellularCascade || 'competitive blockade',
      indications,
      pk,
      pd,
      notes: fields.notes || `Dynamically parsed from textbook sources under category: ${drugClass.toUpperCase()}`
    };
  }
}
