// L5/F6: this module was IMPORTED by meds.config.ts and (transitively) PKPDEngine.ts but did not exist,
// so `MedicationProfile`/`PKParameters`/`PDParameters` were unresolved types — the medication config and PK/PD
// param objects were effectively `any`. Defined here from their actual runtime shape (permissive index
// signatures reflect the genuinely heterogeneous per-drug fields the codebase adds).

export interface PKParameters {
  V1?: number;
  V2?: number;
  V3?: number;
  k10?: number;
  k12?: number;
  k21?: number;
  k13?: number;
  k31?: number;
  ke0?: number;
  coSensitivity?: number;
  proteinBinding?: number;
  renalFraction?: number;
  hepaticFraction?: number;
  [key: string]: any;
}

export interface PDParameters {
  c50?: number;
  gamma?: number;
  sysMax?: number;
  diaMax?: number;
  hrMax?: number;
  rrMax?: number;
  synergyGroup?: string;
  inducesApneaAtCe?: number;
  inducesParalysisAtCe?: number;
  receptors?: Record<string, number>;
  [key: string]: any;
}

export interface MedicationProfile {
  name: string;
  classes?: string[];
  routes?: string[];
  types?: string[];
  dosingWeight?: string;
  synergyGroup?: string;
  pk: PKParameters;
  pd: PDParameters;
  [key: string]: any;
}
