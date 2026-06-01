export interface CoagEffects {
  readonly r: number;
  readonly ma: number;
  readonly angle: number;
}

export interface FluidProfile {
  readonly type: 'Crystalloid' | 'Colloid' | 'Blood Product';
  readonly defaultVol: number;
  readonly na: number;
  readonly cl: number;
  readonly k: number;
  readonly ca: number;
  readonly citrateLoad: number;
  readonly buffer: number;
  readonly retentionIntact: number;
  readonly retentionInflamed: number;
  readonly osm: number;
  readonly tonicity: 'Isotonic' | 'Hypotonic' | 'Hypertonic';
  readonly coag: CoagEffects;
  readonly viscosity: number;
  readonly acidosisRisk?: boolean;
  readonly hct?: number;
}

export const FLUIDS_CONFIG: Record<string, FluidProfile> = {
  'Normal Saline (0.9% NS)': { 
    type: 'Crystalloid', defaultVol: 1000, na: 154, cl: 154, k: 0, ca: 0, citrateLoad: 0, buffer: 0,
    retentionIntact: 0.75, retentionInflamed: 0.20, osm: 308, tonicity: 'Isotonic', coag: { r: 0, ma: -2, angle: 0 },
    acidosisRisk: true, viscosity: 1.0 
  },
  'Lactated Ringers (LR)': { 
    type: 'Crystalloid', defaultVol: 1000, na: 130, cl: 109, k: 4, ca: 3.0, citrateLoad: 0, buffer: 28,
    retentionIntact: 0.80, retentionInflamed: 0.25, osm: 273, tonicity: 'Hypotonic', coag: { r: 0, ma: -1, angle: 0 }, viscosity: 1.0 
  },
  'Plasmalyte': { 
    type: 'Crystalloid', defaultVol: 1000, na: 140, cl: 98, k: 5, ca: 0, citrateLoad: 0, buffer: 27,
    retentionIntact: 0.80, retentionInflamed: 0.25, osm: 294, tonicity: 'Isotonic', coag: { r: 0, ma: -1, angle: 0 }, viscosity: 1.0 
  },
  'Albumin 5%': { 
    type: 'Colloid', defaultVol: 500, na: 140, cl: 150, k: 0, ca: 0, citrateLoad: 0, buffer: 0,
    retentionIntact: 1.0, retentionInflamed: 0.75, osm: 290, tonicity: 'Isotonic', coag: { r: 0, ma: -2, angle: -2 }, viscosity: 1.5 
  },
  'Packed Red Blood Cells (PRBC)': { 
    type: 'Blood Product', defaultVol: 300, na: 0, cl: 0, k: 15, ca: 0, citrateLoad: 15, buffer: 0,
    retentionIntact: 1.0, retentionInflamed: 0.90, hct: 0.70, osm: 300, tonicity: 'Isotonic', coag: { r: 0, ma: 0, angle: 0 }, viscosity: 3.5 
  }, 
  'Fresh Frozen Plasma (FFP)': { 
    type: 'Blood Product', defaultVol: 250, na: 0, cl: 0, k: 4, ca: 0, citrateLoad: 10, buffer: 0,
    retentionIntact: 1.0, retentionInflamed: 0.90, osm: 300, tonicity: 'Isotonic', coag: { r: -4, ma: 0, angle: 5 }, viscosity: 1.8 
  },
  'Platelets': { 
    type: 'Blood Product', defaultVol: 250, na: 0, cl: 0, k: 4, ca: 0, citrateLoad: 5, buffer: 0,
    retentionIntact: 1.0, retentionInflamed: 0.90, osm: 300, tonicity: 'Isotonic', coag: { r: -1, ma: 15, angle: 10 }, viscosity: 2.0 
  },
  'Cryoprecipitate': { 
    type: 'Blood Product', defaultVol: 50, na: 0, cl: 0, k: 0, ca: 0, citrateLoad: 5, buffer: 0,
    retentionIntact: 1.0, retentionInflamed: 0.95, osm: 300, tonicity: 'Isotonic', coag: { r: 0, ma: 5, angle: 15 }, viscosity: 1.8 
  },
  'Fibrinogen Concentrate': {
    type: 'Blood Product', defaultVol: 50, na: 0, cl: 0, k: 0, ca: 0, citrateLoad: 0, buffer: 0,
    retentionIntact: 1.0, retentionInflamed: 0.95, osm: 300, tonicity: 'Isotonic', coag: { r: 0, ma: 15, angle: 10 }, viscosity: 1.8
  }
} as const;
