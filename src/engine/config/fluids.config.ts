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
  // retentionIntact: 0.25 (one-quarter rule — 3/4 of crystalloid distributes to interstitium)
  'Normal Saline (0.9% NS)': {
    type: 'Crystalloid', defaultVol: 1000, na: 154, cl: 154, k: 0, ca: 0, citrateLoad: 0, buffer: 0,
    retentionIntact: 0.25, retentionInflamed: 0.15, osm: 308, tonicity: 'Isotonic', coag: { r: 0, ma: -2, angle: 0 },
    acidosisRisk: true, viscosity: 1.0
  },
  'Lactated Ringers (LR)': {
    // ca: 2.7 mEq/L (published LR composition); tonicity: Isotonic (universally classified as balanced isotonic)
    // buffer: 28 mEq/L lactate (metabolized to bicarbonate, net alkalinizing)
    type: 'Crystalloid', defaultVol: 1000, na: 130, cl: 109, k: 4, ca: 2.7, citrateLoad: 0, buffer: 28,
    retentionIntact: 0.25, retentionInflamed: 0.18, osm: 273, tonicity: 'Isotonic', coag: { r: 0, ma: -1, angle: 0 }, viscosity: 1.0
  },
  'Plasmalyte': {
    // buffer: 50 (acetate 27 + gluconate 23, both metabolized to bicarbonate)
    type: 'Crystalloid', defaultVol: 1000, na: 140, cl: 98, k: 5, ca: 0, citrateLoad: 0, buffer: 50,
    retentionIntact: 0.25, retentionInflamed: 0.18, osm: 294, tonicity: 'Isotonic', coag: { r: 0, ma: -1, angle: 0 }, viscosity: 1.0
  },
  'Albumin 5%': {
    type: 'Colloid', defaultVol: 500, na: 140, cl: 150, k: 0, ca: 0, citrateLoad: 0, buffer: 0,
    retentionIntact: 1.0, retentionInflamed: 0.75, osm: 290, tonicity: 'Isotonic', coag: { r: 0, ma: -2, angle: -2 }, viscosity: 1.5
  },
  'Albumin 25%': {
    // Hyperoncotic — 100 mL expands plasma by ~150 mL via oncotic pull from interstitium
    type: 'Colloid', defaultVol: 100, na: 140, cl: 128, k: 0, ca: 0, citrateLoad: 0, buffer: 0,
    retentionIntact: 1.5, retentionInflamed: 1.0, osm: 330, tonicity: 'Hypertonic', coag: { r: 0, ma: -2, angle: -2 }, viscosity: 4.0
  },
  'Packed Red Blood Cells (PRBC)': {
    // citrateLoad: 3 (net unclearable chelation at standard transfusion rates with normal hepatic function;
    // prior 15 caused severe hypocalcemia from a single unit — liver metabolizes citrate t½≈5min)
    type: 'Blood Product', defaultVol: 300, na: 0, cl: 0, k: 15, ca: 0, citrateLoad: 3, buffer: 0,
    retentionIntact: 1.0, retentionInflamed: 0.90, hct: 0.70, osm: 300, tonicity: 'Isotonic', coag: { r: 0, ma: 0, angle: 0 }, viscosity: 3.5
  },
  'Fresh Frozen Plasma (FFP)': {
    // citrateLoad: 2 (same reasoning as PRBC)
    type: 'Blood Product', defaultVol: 250, na: 0, cl: 0, k: 4, ca: 0, citrateLoad: 2, buffer: 0,
    retentionIntact: 1.0, retentionInflamed: 0.90, osm: 300, tonicity: 'Isotonic', coag: { r: -4, ma: 0, angle: 5 }, viscosity: 1.8
  },
  'Platelets': {
    // citrateLoad: 1
    type: 'Blood Product', defaultVol: 250, na: 0, cl: 0, k: 4, ca: 0, citrateLoad: 1, buffer: 0,
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
