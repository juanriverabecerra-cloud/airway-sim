import { FLUIDS_CONFIG, FluidProfile } from './config/fluids.config';

export interface ActiveInfusion {
  name: string; // Key of FLUIDS_CONFIG
  remainingVolume: number; // in mL
  currentRate?: number;     // in mL/hr
  userRate?: number;        // in mL/hr (user infusion pump cap)
}

export interface ActiveMedInfusion {
  medId: string;
  rate: number; // e.g. mcg/kg/min or mg/hr
}

export interface FluidicLine {
  name: string;
  category: string; // e.g., 'PIV', 'IO', 'CVC'
  type?: string;     // e.g. '18G', '20G', '22G', '24G'
  length: number;    // in mm
  radius: number;    // in mm
  venousPressure?: number;
  veinResistance?: number;
  fluidLine?: 'gravity' | 'ranger' | 'belmont';
  failed?: boolean;
  activeInfusions: ActiveInfusion[];
  activeMedInfusions: ActiveMedInfusion[];
}

export interface BloodBankState {
  status: 'none' | 'ordered' | 'available';
  unitsInOR: number;
  deliveryCountdown: number; // simulation seconds remaining
  totalDeliveryTime: number;  // original countdown limit
  pendingUnits: number;
  preOpWorkup: 'crossmatch' | 'screen' | 'none';
}

export interface ElectrolytesState {
  k: number;
  na: number;
  cl: number;
  ca: number;
  ph: number;
}

export interface CoagsState {
  r_offset: number;
  ma_offset: number;
  angle_offset: number;
}

export interface FluidicsPatientState {
  weight: number;
  isSeptic?: boolean;
  trauma?: boolean;
  accessLines: FluidicLine[];
  bloodBank: BloodBankState;
}

export interface FluidicsVitalsState {
  temp: number;
}

export interface FluidicsOutput {
  accessLines: FluidicLine[];
  electrolytes: ElectrolytesState;
  coags: CoagsState;
  bloodBank: BloodBankState;
  intravascularVolumeAdded_mL: number;
  tbwDelta_L: number;
  rbcVolumeAdded_mL: number;
  fluidInducedTempDrop: number;
  events: { time: number; msg: string; type: string }[];
}

export class FluidicsEngine {
  /**
   * Ticks the fluidics and blood bank countdown forward by dt seconds.
   * Completely pure and headless.
   */
  static tick(
    dt: number = 1,
    st: { patient: FluidicsPatientState; electrolytes: ElectrolytesState; coags: CoagsState; vitals: FluidicsVitalsState; time: number }
  ): FluidicsOutput {
    // Defensively handle missing state container
    const safeSt: any = st || {};
    const patient = safeSt.patient || {};
    const electrolytes = safeSt.electrolytes || { k: 4.0, na: 140, cl: 103, ca: 2.2, ph: 7.40, buf: 0 };
    const coags = safeSt.coags || { r_offset: 0, ma_offset: 0, angle_offset: 0 };
    const vitals = safeSt.vitals || { temp: 37.0 };
    
    const safeDt = Number.isFinite(dt) && dt > 0 ? dt : 1;
    const safeTime = Number.isFinite(safeSt.time) ? safeSt.time : 0;
    
    let totalFluidVolumeLiters = 0;
    let newLines: FluidicLine[] = (patient.accessLines || []).map(l => ({ 
      ...l, 
      activeInfusions: (l.activeInfusions || []).map(inf => ({ ...inf })),
      activeMedInfusions: (l.activeMedInfusions || []).map(med => ({ ...med }))
    }));

    let updatedElectrolytes = { ...electrolytes };
    let tbwDelta = 0;
    let coagDelta = { r: 0, ma: 0, angle: 0 };
    let rbcVolumeAdded = 0;
    let activeInfusionMessages: { time: number; msg: string; type: string }[] = [];
    let fluidInducedTempDrop = 0;
    let intravascularVolumeAdded = 0;

    // === POISEUILLE FLUID RESUSCITATION DRAINAGE (MULTI-LINE) ===
    for (let lineIndex = 0; lineIndex < newLines.length; lineIndex++) {
      let line = newLines[lineIndex];
      if (!line || line.failed) continue;

      if (!line.activeInfusions || line.activeInfusions.length === 0) continue;
      
      const lType = line.fluidLine || 'gravity';
      
      // Belmont Rapid Infuser blowout on IO or narrow PIV lines (<= 20G)
      const isNarrowIV = line.type && (line.type.includes('20G') || line.type.includes('22G') || line.type.includes('24G'));
      const isIO = line.category && line.category.includes('IO');
      if (lType === 'belmont' && (isIO || isNarrowIV)) {
        const blowoutMsg = `🚨 CLINICAL CATASTROPHE: Belmont Rapid Infuser connected to ${line.name}! High pressure (300 mmHg) caused immediate ${isIO ? 'bone/vascular blowout, leading to severe extravasation and compartment syndrome' : 'vein rupture and blown line'}! Access lost!`;
        activeInfusionMessages.push({ time: safeTime, msg: blowoutMsg, type: 'error' });
        line.activeInfusions = [];
        line.activeMedInfusions = [];
        line.failed = true;
        line.name += ' [BLOWN OUT]';
        continue;
      }
      
      let pInfusion = 74; // Gravity default
      if (lType === 'ranger') pInfusion = 150;
      else if (lType === 'belmont') pInfusion = 300;
      
      const pv = line.venousPressure !== undefined && Number.isFinite(line.venousPressure) ? line.venousPressure : 10;
      const rv = line.veinResistance !== undefined && Number.isFinite(line.veinResistance) ? line.veinResistance : 500;
      let deltaP = pInfusion - pv;
      if (!Number.isFinite(deltaP) || deltaP < 0) deltaP = 0;
      
      let currentInfusion = line.activeInfusions[0];
      if (!currentInfusion) continue;

      const fluidData: FluidProfile = FLUIDS_CONFIG[currentInfusion.name];
      const eta = fluidData ? (fluidData.viscosity || 1.0) : 1.0;
      
      let rTubing = 150; // calibrated from BD Angiocath published gravity flow rates
      if (lType === 'ranger') rTubing = 800;
      else if (lType === 'belmont') rTubing = 200;
      
      const safeRadius = Math.max(0.01, line.radius || 0.475);
      const rCath = line.length / Math.pow(safeRadius, 4);
      const rTotal = Math.max(1.0, rTubing + rCath + rv);
      
      const safeEta = Math.max(0.01, eta);
      let q_ml_min = 1200 * deltaP / (safeEta * rTotal);
      if (lType === 'belmont' && q_ml_min > 500) q_ml_min = 500;
      
      if (currentInfusion.userRate !== undefined && Number.isFinite(currentInfusion.userRate)) {
        const user_ml_min = currentInfusion.userRate / 60;
        q_ml_min = Math.min(q_ml_min, user_ml_min);
      }
      
      const q_ml_sec = q_ml_min / 60;
      currentInfusion.currentRate = q_ml_min * 60; // in mL/hr
      
      let infusedThisTick = Math.min(currentInfusion.remainingVolume, q_ml_sec * safeDt);
      if (!Number.isFinite(infusedThisTick) || infusedThisTick < 0) infusedThisTick = 0;
      
      if (infusedThisTick > 0 && fluidData) {
        currentInfusion.remainingVolume -= infusedThisTick;
        const volLiters = infusedThisTick / 1000;
        totalFluidVolumeLiters += volLiters;
        
        // Warmed vs Cold fluid hypothermia cooling accumulation
        if (lType === 'gravity') {
          const tempDiff = (fluidData.type === 'Blood Product' ? 4.0 : 22.0) - (vitals.temp || 37.0);
          const scaling = fluidData.type === 'Blood Product' ? 0.07 : 0.05;
          const incrementalDrop = volLiters * tempDiff * scaling;
          if (Number.isFinite(incrementalDrop)) {
            fluidInducedTempDrop += incrementalDrop;
          }
        }
        
        const isUnit = fluidData.type === 'Blood Product' || fluidData.type === 'Colloid';
        const defaultVol = fluidData.defaultVol || 300;
        const unitEq = isUnit ? (infusedThisTick / defaultVol) : volLiters;
        
        const retFactor = (patient.isSeptic || patient.trauma) ? fluidData.retentionInflamed : fluidData.retentionIntact;
        intravascularVolumeAdded += (infusedThisTick * retFactor);
        
        tbwDelta += volLiters;
        const safeWeight = Number.isFinite(patient.weight) && patient.weight > 0 ? patient.weight : 70;
        const prevTBW = Math.max(1.0, safeWeight * 0.6 + tbwDelta - volLiters);
        const newTBW = Math.max(1.0, prevTBW + volLiters);
        
        const nextK = ((updatedElectrolytes.k * prevTBW) + (fluidData.k * volLiters)) / newTBW;
        if (Number.isFinite(nextK)) updatedElectrolytes.k = nextK;

        const nextNa = ((updatedElectrolytes.na * prevTBW) + (fluidData.na * volLiters)) / newTBW;
        if (Number.isFinite(nextNa)) updatedElectrolytes.na = nextNa;

        const nextCl = ((updatedElectrolytes.cl * prevTBW) + (fluidData.cl * volLiters)) / newTBW;
        if (Number.isFinite(nextCl)) updatedElectrolytes.cl = nextCl;
        
        // Calcium: direct Ca²⁺ delivery minus citrate chelation (blood products store Ca2+ in
        // citrate; the citrate-bound portion is unavailable until the liver metabolizes citrate,
        // ~5-10 min half-life -- here modeled as immediate chelation for the infused tick since
        // 1Hz resolution doesn't distinguish sub-minute effects).
        const calciumDelta = (fluidData.ca * (isUnit ? unitEq : volLiters)) - (fluidData.citrateLoad * unitEq * 0.02);
        if (Number.isFinite(calciumDelta)) {
          updatedElectrolytes.ca = Math.max(0.5, updatedElectrolytes.ca + calciumDelta);
        }

        // Buffer (lactate in LR, acetate/gluconate in PlasmaLyte): accumulate in mEq, representing
        // the bicarbonate-equivalent capacity added. AcidBaseModel.ts (Phase 5) reads this to
        // compute its true effect on SID; the PREVIOUS crude pH penalty from high-Cl fluids
        // (updatedElectrolytes.ph -= 0.05 * volLiters) is deliberately REMOVED here -- that
        // flat constant will be replaced by the real SID-based pH computation in AcidBaseModel.ts
        // which uses the already-tracked electrolytes.cl/na directly, making the crude proxy
        // redundant and inconsistent with the new physics.
        const bufferDelta = (typeof fluidData.buffer === 'number' ? fluidData.buffer : 0) * volLiters;
        updatedElectrolytes.buf = (updatedElectrolytes.buf || 0) + bufferDelta;
        
        coagDelta.r += (fluidData.coag.r * unitEq);
        coagDelta.ma += (fluidData.coag.ma * unitEq);
        coagDelta.angle += (fluidData.coag.angle * unitEq);
        
        // F32: only RED-CELL-containing products add Hb mass. Gate on `hct` (present on PRBC/whole blood
        // only) — FFP, platelets, cryoprecipitate and fibrinogen are "Blood Product" type but carry NO
        // red cells, so counting them here would spuriously raise the hemoglobin they actually DILUTE.
        if (fluidData.type === 'Blood Product' && typeof fluidData.hct === 'number' && fluidData.hct > 0) rbcVolumeAdded += infusedThisTick;
      }
      
      if (currentInfusion.remainingVolume <= 0) {
        activeInfusionMessages.push({
          time: safeTime,
          msg: `✅ Infusion Complete: ${currentInfusion.name} via ${line.name}`,
          type: 'success'
        });
        line.activeInfusions.shift();
      }
    }

    let updatedCoags = {
      r_offset: coags.r_offset + coagDelta.r,
      ma_offset: coags.ma_offset + coagDelta.ma,
      angle_offset: coags.angle_offset + coagDelta.angle
    };

    if (!Number.isFinite(updatedCoags.r_offset)) updatedCoags.r_offset = coags.r_offset;
    if (!Number.isFinite(updatedCoags.ma_offset)) updatedCoags.ma_offset = coags.ma_offset;
    if (!Number.isFinite(updatedCoags.angle_offset)) updatedCoags.angle_offset = coags.angle_offset;

    // === BLOOD BANK DELIVERY COUNTDOWN (Simulation-Time) ===
    let updatedBloodBank = { ...patient.bloodBank };
    if (updatedBloodBank && updatedBloodBank.status === 'ordered') {
      const currentCountdown = Number.isFinite(updatedBloodBank.deliveryCountdown) ? updatedBloodBank.deliveryCountdown : 0;
      if (currentCountdown > 0) {
        const newCountdown = Math.max(0, currentCountdown - safeDt);
        updatedBloodBank.deliveryCountdown = newCountdown;

        if (newCountdown <= 0) {
          // Cooler has arrived — transition to available
          const arrivedUnits = updatedBloodBank.pendingUnits || 4;
          const isUncrossmatched = updatedBloodBank.preOpWorkup === 'none';
          
          updatedBloodBank.status = 'available';
          updatedBloodBank.unitsInOR = (updatedBloodBank.unitsInOR || 0) + arrivedUnits;
          updatedBloodBank.deliveryCountdown = 0;
          updatedBloodBank.pendingUnits = 0;

          const arrivalMsg = `✅ Blood Bank: Cooler has arrived in the OR! ${arrivedUnits} unit(s) of ${isUncrossmatched ? 'UNCROSSMATCHED O-Negative' : 'crossmatched'} blood are now available. ${isUncrossmatched ? '⚠️ Transfusion reaction risk elevated — administer cautiously and monitor closely.' : 'Products verified and compatible.'}`;
          activeInfusionMessages.push({ time: safeTime, msg: arrivalMsg, type: 'success' });
        } else {
          // Milestone notifications at halfway and at 60 seconds remaining
          const totalTime = updatedBloodBank.totalDeliveryTime || 600;
          const halfwayMark = Math.round(totalTime / 2);
          
          // Check if countdown crossed the halfway mark or the 60s mark in this tick
          const crossedHalfway = (currentCountdown > halfwayMark) && (newCountdown <= halfwayMark);
          const crossedSixty = (currentCountdown > 60) && (newCountdown <= 60);

          if (crossedHalfway) {
            activeInfusionMessages.push({
              time: safeTime,
              msg: `🔔 Blood Bank Update: Cooler is halfway to the OR. ETA: ${Math.ceil(newCountdown / 60)} min (${Math.round(newCountdown)}s).`,
              type: 'info'
            });
          } else if (crossedSixty) {
            activeInfusionMessages.push({
              time: safeTime,
              msg: `🔔 Blood Bank Update: Cooler arriving in 60 seconds. Prepare IV line and blood warmer.`,
              type: 'info'
            });
          }
        }
      }
    }

    return {
      accessLines: newLines,
      electrolytes: updatedElectrolytes,
      coags: updatedCoags,
      bloodBank: updatedBloodBank as BloodBankState,
      intravascularVolumeAdded_mL: intravascularVolumeAdded,
      tbwDelta_L: tbwDelta,
      rbcVolumeAdded_mL: rbcVolumeAdded,
      fluidInducedTempDrop,
      events: activeInfusionMessages
    };
  }
}
