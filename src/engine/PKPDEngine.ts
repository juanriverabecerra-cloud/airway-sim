import { PKParameters, PDParameters } from './config/types';
import { computeReceptorCoupling } from './ReceptorPharmacologyModel';

export interface MedicationProfileInput {
  name: string;
  classes?: string[];
  pk: PKParameters;
  pd: PDParameters;
}

export interface PKPDEffects {
  hrDelta: number;
  sysDelta: number;
  diaDelta: number;
  rrDelta: number;
  hypnoticEffect: number;
  receptorOccupancy: number;
  group: string;
  svrMultiplier: number;
  coMultiplier: number;
  alpha1Activity?: number; // receptor potency * fraction, for per-vascular-bed redistribution (Phase 2)
  beta2Activity?: number;
}

export class PKPDModel {
  name: string;
  pk: PKParameters;
  pd: PDParameters;
  classes: string[];
  weight: number;
  
  // Compartment amounts in milligrams (mg)
  A1: number = 0; // Central compartment (Blood plasma)
  A2: number = 0; // Rapidly equilibrating compartment (Muscle/Organs)
  A3: number = 0; // Slowly equilibrating compartment (Fat)
  
  Ce: number = 0; // Effect-site concentration (mg/L)
  currentInfusionRate: number = 0; // mg/sec
  Cp: number = 0; // Plasma concentration (mg/L)
  dynamicV1: number = 0; // Dynamic central volume of distribution (L)
  infusionDurationSeconds: number = 0; // Cumulative duration of active infusion (seconds)
  csht: number = 0; // Context-sensitive half-time (minutes)
  csdt80: number = 0; // Context-sensitive 80% decrement time (minutes)
  patientAge: number = 40;
  patientSex: string = 'male';
  patientHeight: number = 170;
  opioidToleranceMultiplier: number = 1.0;
  opioidReceptorGenotype: string = 'A118A';

  tciMode: 'none' | 'Cp' | 'Ce' = 'none';
  tciTarget: number = 0;
  tciModelName: string = 'Schnider';

  constructor(med: MedicationProfileInput, weight: number) {
    this.name = med.name || 'Unknown';
    this.classes = med.classes || [];
    
    // Defensive PK parameters sanitization
    const rawPk = med.pk || {} as any;
    this.pk = {
      V1: typeof rawPk.V1 === 'number' && Number.isFinite(rawPk.V1) && rawPk.V1 > 0 ? rawPk.V1 : 10.0,
      V2: typeof rawPk.V2 === 'number' && Number.isFinite(rawPk.V2) && rawPk.V2 >= 0 ? rawPk.V2 : 0,
      V3: typeof rawPk.V3 === 'number' && Number.isFinite(rawPk.V3) && rawPk.V3 >= 0 ? rawPk.V3 : 0,
      k10: typeof rawPk.k10 === 'number' && Number.isFinite(rawPk.k10) && rawPk.k10 >= 0 ? rawPk.k10 : 0.05,
      k12: typeof rawPk.k12 === 'number' && Number.isFinite(rawPk.k12) && rawPk.k12 >= 0 ? rawPk.k12 : 0,
      k21: typeof rawPk.k21 === 'number' && Number.isFinite(rawPk.k21) && rawPk.k21 >= 0 ? rawPk.k21 : 0,
      k13: typeof rawPk.k13 === 'number' && Number.isFinite(rawPk.k13) && rawPk.k13 >= 0 ? rawPk.k13 : 0,
      k31: typeof rawPk.k31 === 'number' && Number.isFinite(rawPk.k31) && rawPk.k31 >= 0 ? rawPk.k31 : 0,
      ke0: typeof rawPk.ke0 === 'number' && Number.isFinite(rawPk.ke0) && rawPk.ke0 >= 0 ? rawPk.ke0 : 0.1,
      coSensitivity: typeof rawPk.coSensitivity === 'number' && Number.isFinite(rawPk.coSensitivity) ? Math.max(0, Math.min(1.0, rawPk.coSensitivity)) : 0.5,
      proteinBinding: typeof rawPk.proteinBinding === 'number' && Number.isFinite(rawPk.proteinBinding) ? Math.max(0, Math.min(0.999, rawPk.proteinBinding)) : 0,
      renalFraction: typeof rawPk.renalFraction === 'number' && Number.isFinite(rawPk.renalFraction) ? Math.max(0, Math.min(1.0, rawPk.renalFraction)) : 0,
      hepaticFraction: typeof rawPk.hepaticFraction === 'number' && Number.isFinite(rawPk.hepaticFraction) ? Math.max(0, Math.min(1.0, rawPk.hepaticFraction)) : 0,
    };
    
    // Defensive PD parameters sanitization
    const rawPd = med.pd || {} as any;
    this.pd = {
      c50: typeof rawPd.c50 === 'number' && Number.isFinite(rawPd.c50) && rawPd.c50 > 0 ? rawPd.c50 : 1.0,
      gamma: typeof rawPd.gamma === 'number' && Number.isFinite(rawPd.gamma) && rawPd.gamma > 0 ? rawPd.gamma : 1.0,
      sysMax: typeof rawPd.sysMax === 'number' && Number.isFinite(rawPd.sysMax) ? rawPd.sysMax : 0,
      diaMax: typeof rawPd.diaMax === 'number' && Number.isFinite(rawPd.diaMax) ? rawPd.diaMax : 0,
      hrMax: typeof rawPd.hrMax === 'number' && Number.isFinite(rawPd.hrMax) ? rawPd.hrMax : 0,
      rrMax: typeof rawPd.rrMax === 'number' && Number.isFinite(rawPd.rrMax) ? rawPd.rrMax : 0,
      // F41 (L4 root fix): synergyGroup is declared at the DRUG TOP LEVEL in the medication defs
      // (`med.synergyGroup`), not inside `pd`. Reading only `rawPd.synergyGroup` made it always 'None',
      // so effects.group never matched and `sedativeEff`/`opioidEff` stayed ~0 for EVERY drug — silently
      // disabling opioid RR depression, opioid consciousness/GCS effects, aggregateHypnosis, and the
      // sedative/opioid one-shot event gates. Fall back to the top-level field so the signals actually work.
      synergyGroup: typeof rawPd.synergyGroup === 'string' ? rawPd.synergyGroup
        : (typeof (med as any).synergyGroup === 'string' ? (med as any).synergyGroup : 'None'),
      inducesApneaAtCe: typeof rawPd.inducesApneaAtCe === 'number' && Number.isFinite(rawPd.inducesApneaAtCe) ? rawPd.inducesApneaAtCe : 999,
      inducesParalysisAtCe: typeof rawPd.inducesParalysisAtCe === 'number' && Number.isFinite(rawPd.inducesParalysisAtCe) ? rawPd.inducesParalysisAtCe : 999,
      receptors: rawPd.receptors ? {
        Alpha1: typeof rawPd.receptors.Alpha1 === 'number' && Number.isFinite(rawPd.receptors.Alpha1) ? rawPd.receptors.Alpha1 : 0,
        Beta1: typeof rawPd.receptors.Beta1 === 'number' && Number.isFinite(rawPd.receptors.Beta1) ? rawPd.receptors.Beta1 : 0,
        Beta2: typeof rawPd.receptors.Beta2 === 'number' && Number.isFinite(rawPd.receptors.Beta2) ? rawPd.receptors.Beta2 : 0,
        V1: typeof rawPd.receptors.V1 === 'number' && Number.isFinite(rawPd.receptors.V1) ? rawPd.receptors.V1 : 0,
      } : undefined
    };

    // Validate and clamp weight
    let w = Number(weight);
    if (isNaN(w) || !isFinite(w) || w <= 0) {
      w = 70.0;
    }
    this.weight = Math.max(1.0, Math.min(500.0, w));
  }

  setTci(mode: 'none' | 'Cp' | 'Ce', target: number, modelName?: string, patient?: any): void {
    this.tciMode = mode;
    this.tciTarget = Number(target) || 0;
    if (modelName) {
      this.tciModelName = modelName;
    }
    if (mode !== 'none' && patient) {
      this.updateModelParameters(this.tciModelName, patient);
    }
  }

  updateModelParameters(modelName: string, patient: any): void {
    const age = patient.age || 40;
    const weight = this.weight;
    const height = patient.height || 170;
    const sex = patient.sex || 'male';

    this.patientAge = age;
    this.patientSex = sex;
    this.patientHeight = height;
    this.opioidToleranceMultiplier = patient.opioidToleranceMultiplier || 1.0;
    this.opioidReceptorGenotype = patient.opioidReceptorGenotype || 'A118A';

    if (modelName === 'Marsh') {
      this.pk.V1 = 0.228 * weight;
      this.pk.V2 = 0.363 * weight;
      this.pk.V3 = 2.893 * weight;
      this.pk.k10 = 0.119;
      this.pk.k12 = 0.112;
      this.pk.k13 = 0.042;
      this.pk.k21 = 0.055;
      this.pk.k31 = 0.0033;
      this.pk.ke0 = 0.26;
    } else if (modelName === 'Schnider') {
      this.pk.V1 = 4.27;
      this.pk.V2 = 18.9 - 0.391 * (age - 53);
      this.pk.V3 = 238.0;
      const Cl1 = 1.29 - 0.024 * (age - 53);
      this.pk.k10 = Cl1 / this.pk.V1;
      this.pk.k12 = 0.302 - 0.0056 * (age - 53);
      this.pk.k13 = 0.196;
      this.pk.k21 = Cl1 / this.pk.V2;
      this.pk.k31 = 0.0035;
      this.pk.ke0 = 0.456;
    } else if (modelName === 'Paedfusor') {
      this.pk.V1 = 0.458 * weight;
      this.pk.V2 = 1.34 * weight;
      this.pk.V3 = 8.20 * weight;
      this.pk.k10 = 70.0 * Math.pow(weight, -0.3) / 458.3;
      this.pk.k12 = 0.12;
      this.pk.k13 = 0.034;
      this.pk.k21 = 0.041;
      this.pk.k31 = 0.0019;
      this.pk.ke0 = 0.26;
    } else if (modelName === 'Kataria') {
      this.pk.V1 = 0.52 * weight;
      this.pk.V2 = 1.0 * weight;
      this.pk.V3 = 8.2 * weight;
      this.pk.k10 = 0.066;
      this.pk.k12 = 0.113;
      this.pk.k13 = 0.051;
      this.pk.k21 = 0.059;
      this.pk.k31 = 0.0032;
      this.pk.ke0 = 0.26;
    } else if (modelName === 'Domino') {
      this.pk.V1 = 0.063 * weight;
      this.pk.V2 = 0.207 * weight;
      this.pk.V3 = 1.51 * weight;
      this.pk.k10 = 0.4381;
      this.pk.k12 = 0.5921;
      this.pk.k13 = 0.59;
      this.pk.k21 = 0.2470;
      this.pk.k31 = 0.0146;
      this.pk.ke0 = 0.15;
    } else if (modelName === 'Minto') {
      // Calculate James LBM formula locally to avoid circular import dependency
      const safeSex = typeof sex === 'string' && sex.trim().toLowerCase() === 'female' ? 'female' : 'male';
      let lbm = 0;
      if (safeSex === 'male') {
        lbm = 1.10 * weight - 128.0 * Math.pow(weight / height, 2);
      } else {
        lbm = 1.07 * weight - 148.0 * Math.pow(weight / height, 2);
      }
      lbm = Math.max(15.0, Math.max(weight * 0.25, lbm)); // clamp LBM

      // Minto equations centered at age 40 and LBM 55 kg (Miller's 9th Ed, Ch 18 p. 485)
      this.pk.V1 = 5.1 - 0.0201 * (age - 40) + 0.072 * (lbm - 55);
      this.pk.V2 = 9.82 - 0.0811 * (age - 40) + 0.108 * (lbm - 55);
      this.pk.V3 = 5.42;
      const Cl1 = 2.6 - 0.0162 * (age - 40) + 0.0191 * (lbm - 55);
      const Cl2 = 2.05 - 0.0301 * (age - 40);
      const Cl3 = 0.076 - 0.00113 * (age - 40);
      this.pk.k10 = Cl1 / this.pk.V1;
      this.pk.k12 = Cl2 / this.pk.V1;
      this.pk.k13 = Cl3 / this.pk.V1;
      this.pk.k21 = Cl2 / this.pk.V2;
      this.pk.k31 = Cl3 / this.pk.V3;
      this.pk.ke0 = 0.595 - 0.007 * (age - 40);
    } else if (modelName === 'Gepts') {
      // Sufentanil/Gepts model (Table 26.7, Miller's 9th Ed) - fixed (non-covariate-scaled) parameters
      this.pk.V1 = 14.3;
      this.pk.V2 = 63.4;
      this.pk.V3 = 251.9;
      this.pk.k10 = 0.0645;
      this.pk.k12 = 0.1086;
      this.pk.k13 = 0.0229;
      this.pk.k21 = 0.0245;
      this.pk.k31 = 0.0013;
      // ke0 intentionally left at the medication's existing static default - Table 26.7 lists ke0 as "NA" for the Gepts model
    } else if (modelName === 'Shafer') {
      // Fentanyl/Shafer model (Table 26.7, Miller's 9th Ed) - fixed (non-covariate-scaled) parameters
      this.pk.V1 = 6.09;
      this.pk.V2 = 28.1;
      this.pk.V3 = 228.0;
      this.pk.k10 = 0.083;
      this.pk.k12 = 0.4713;
      this.pk.k13 = 0.22496;
      this.pk.k21 = 0.1021;
      this.pk.k31 = 0.00601;
      this.pk.ke0 = 0.147;
    } else if (modelName === 'Maitre') {
      // Alfentanil/Maitre model (Table 26.7, Miller's 9th Ed) - sex- and age-dependent
      const safeSex = typeof sex === 'string' && sex.trim().toLowerCase() === 'female' ? 'female' : 'male';
      this.pk.V1 = safeSex === 'female' ? 1.15 * 0.111 * weight : 0.111 * weight;
      this.pk.V2 = 12.0;
      this.pk.V3 = 10.5;
      this.pk.k10 = (age < 40 ? 0.356 : (0.356 - 0.00269 * (age - 40))) / this.pk.V1;
      this.pk.k12 = 0.104;
      this.pk.k13 = 0.017;
      this.pk.k21 = 0.067;
      this.pk.k31 = age < 40 ? 0.0126 : (0.0126 - 0.000113 * (age - 40));
      this.pk.ke0 = 0.77;
    }
  }

  // Administer a bolus (instantly enters V1)
  giveBolus(doseMg: number): void {
    const d = Number(doseMg);
    if (!isNaN(d) && isFinite(d) && d > 0) {
      this.A1 = Math.max(0, Math.min(1e9, this.A1 + d));
    }
  }

  // Physical removal of drug mass (e.g., Sugammadex encapsulation)
  chelate(fraction: number): void {
    // Sugammadex binds Rocuronium/Vecuronium in a 1:1 molar ratio in the plasma (A1)
    let f = Number(fraction);
    if (isNaN(f) || !isFinite(f)) {
      f = 0;
    }
    f = Math.max(0, Math.min(1.0, f));
    // Sugammadex encapsulates the drug in a 1:1 molar ratio and the resulting free-drug gradient pulls
    // it off the tissues AND the effect site — so the encapsulated fraction is removed from ALL
    // compartments including Ce. Previously only A1 was reduced: A2/A3 immediately refilled it, and Ce
    // (which drives NMJ occupancy/TOF) only relaxed via the drug's own slow ke0 (rocuronium half-life
    // ~10 min at the effect site), so TOF never recovered — reversal silently failed even at 16 mg/kg
    // (F8). Reducing Ce directly reproduces sugammadex's rapid effect-site stripping (recovery in
    // seconds-to-minutes, dose-dependent) instead of being rate-limited by passive redistribution.
    this.A1 *= (1 - f);
    this.A2 *= (1 - f);
    this.A3 *= (1 - f);
    this.Ce *= (1 - f);
  }

  // Set continuous infusion rate
  setInfusion(rateMgPerSec: number): void {
    let r = Number(rateMgPerSec);
    if (isNaN(r) || !isFinite(r) || r < 0) {
      r = 0;
    }
    this.currentInfusionRate = Math.min(1e6, r);
  }

  /**
   * Ticks the physics forward
   * @param dt seconds
   * @param coRatio Current CO / Baseline CO (1.0 = normal)
   * @param v1VolumeRatio Current Blood Vol / Baseline EBV (Hemoconcentration modifier)
   * @param renalRatio GFR clearance ratio (1.0 = normal)
   * @param pdSensitivityCoeff Sensitivity modifier (1.0 = normal)
   * @param hepaticRatio Hepatic clearance ratio (1.0 = normal)
   */
  tick(
    dt: number = 1,
    coRatio: number = 1.0,
    v1VolumeRatio: number = 1.0,
    renalRatio: number = 1.0,
    pdSensitivityCoeff: number = 1.0,
    hepaticRatio: number = 1.0,
    bcheMultiplier: number = 1.0,
    hofmannMultiplier: number = 1.0,
    lCysteineCe: number = 0.0,
    adiposeVolumeRatio: number = 1.0,  // Phase 5, Stage 6: BMI-scaled peripheral compartment
    cyp2d6Multiplier: number = 1.0,   // Phase 6C: CYP2D6 polymorphism effect on clearance
    cyp2c9c19Multiplier: number = 1.0, // Phase 6C: CYP2C9/2C19 polymorphism effect on clearance
    cyp3a4Multiplier: number = 1.0    // Phase 6H: CYP3A4 DDI (fluconazole/rifampin) for fentanyl/midazolam
  ): PKPDEffects {
    // Validate inputs
    let safeDt = Number(dt);
    if (isNaN(safeDt) || !isFinite(safeDt) || safeDt <= 0) {
      safeDt = 1.0;
    }
    safeDt = Math.max(0.001, Math.min(3600.0, safeDt));

    let safeCoRatio = Number(coRatio);
    if (isNaN(safeCoRatio) || !isFinite(safeCoRatio) || safeCoRatio < 0) {
      safeCoRatio = 1.0;
    }
    safeCoRatio = Math.max(0.0, Math.min(10.0, safeCoRatio));

    let safeV1VolumeRatio = Number(v1VolumeRatio);
    if (isNaN(safeV1VolumeRatio) || !isFinite(safeV1VolumeRatio) || safeV1VolumeRatio <= 0) {
      safeV1VolumeRatio = 1.0;
    }
    safeV1VolumeRatio = Math.max(0.1, Math.min(5.0, safeV1VolumeRatio));

    let safeRenalRatio = Number(renalRatio);
    if (isNaN(safeRenalRatio) || !isFinite(safeRenalRatio) || safeRenalRatio < 0) {
      safeRenalRatio = 1.0;
    }
    safeRenalRatio = Math.max(0.0, Math.min(5.0, safeRenalRatio));

    let safePdSensitivityCoeff = Number(pdSensitivityCoeff);
    if (isNaN(safePdSensitivityCoeff) || !isFinite(safePdSensitivityCoeff) || safePdSensitivityCoeff < 0) {
      safePdSensitivityCoeff = 1.0;
    }
    safePdSensitivityCoeff = Math.max(0.0, Math.min(10.0, safePdSensitivityCoeff));

    let safeHepaticRatio = Number(hepaticRatio);
    if (isNaN(safeHepaticRatio) || !isFinite(safeHepaticRatio) || safeHepaticRatio < 0) {
      safeHepaticRatio = 1.0;
    }
    safeHepaticRatio = Math.max(0.0, Math.min(5.0, safeHepaticRatio));

    let safeBcheMultiplier = Number(bcheMultiplier);
    if (isNaN(safeBcheMultiplier) || !isFinite(safeBcheMultiplier) || safeBcheMultiplier < 0) {
      safeBcheMultiplier = 1.0;
    }

    let safeHofmannMultiplier = Number(hofmannMultiplier);
    if (isNaN(safeHofmannMultiplier) || !isFinite(safeHofmannMultiplier) || safeHofmannMultiplier < 0) {
      safeHofmannMultiplier = 1.0;
    }

    let safeLCysteineCe = Number(lCysteineCe);
    if (isNaN(safeLCysteineCe) || !isFinite(safeLCysteineCe) || safeLCysteineCe < 0) {
      safeLCysteineCe = 0.0;
    }

    // Internal sub-stepping for numerical stability (10 steps per tick)
    const subSteps = 10;
    const subDt = safeDt / subSteps;

    // Apply flow-dependency to elimination (k10) and distribution (k12, k13)
    const coMod = Math.max(0, 1 + (safeCoRatio - 1) * (this.pk.coSensitivity !== undefined ? this.pk.coSensitivity : 0.5));
    
    let k10Raw = this.pk.k10 || 0;

    // Apply Chapter 27 dynamic clearance multipliers
    if (this.name === 'Succinylcholine' || this.name === 'Mivacurium') {
      // Table 27.1, Miller's 9th Ed: Mivacurium is hydrolyzed by the same plasma
      // butyrylcholinesterase enzyme as Succinylcholine, and its block is similarly
      // prolonged under heterozygous/atypical genotypes, pregnancy, or cirrhosis.
      k10Raw *= safeBcheMultiplier;
    } else if (this.name === 'Atracurium' || this.name === 'Cisatracurium') {
      k10Raw *= safeHofmannMultiplier;
    } else if (this.name === 'Gantacurium' || this.name === 'CW002') {
      if (safeLCysteineCe > 0.01) {
        k10Raw *= (1.0 + 20.0 * (safeLCysteineCe / (safeLCysteineCe + 0.5)));
      }
    }
    
    // Phase 6C: Pharmacogenomics CYP multipliers on clearance (k10Raw modified by genotype)
    const safeCyp2d6 = typeof cyp2d6Multiplier === 'number' && Number.isFinite(cyp2d6Multiplier) ? Math.max(0.01, cyp2d6Multiplier) : 1.0;
    const safeCyp2c9c19 = typeof cyp2c9c19Multiplier === 'number' && Number.isFinite(cyp2c9c19Multiplier) ? Math.max(0.01, cyp2c9c19Multiplier) : 1.0;
    const safeCyp3a4 = typeof cyp3a4Multiplier === 'number' && Number.isFinite(cyp3a4Multiplier) ? Math.max(0.01, cyp3a4Multiplier) : 1.0;
    const CYP2D6_DRUGS = new Set(['Codeine', 'Tramadol', 'Oxycodone', 'Ondansetron', 'Morphine']);
    const CYP2C9C19_DRUGS = new Set(['Warfarin', 'Clopidogrel', 'Pantoprazole', 'Omeprazole']);
    // CYP3A4 substrates: major opioids and benzodiazepines. Fluconazole reduces their clearance dramatically.
    const CYP3A4_DRUGS = new Set(['Fentanyl', 'Alfentanil', 'Sufentanil', 'Remifentanil', 'Midazolam', 'Diazepam', 'Ketamine']);
    if (CYP2D6_DRUGS.has(this.name)) k10Raw *= safeCyp2d6;
    if (CYP2C9C19_DRUGS.has(this.name)) k10Raw *= safeCyp2c9c19;
    if (CYP3A4_DRUGS.has(this.name)) k10Raw *= safeCyp3a4;

    // Configuration-driven organ impairment clearance calculations
    const renalFrac = this.pk.renalFraction !== undefined ? this.pk.renalFraction : 0.0;
    const hepaticFrac = this.pk.hepaticFraction !== undefined ? this.pk.hepaticFraction : 0.0;
    const independentFrac = Math.max(0, 1.0 - renalFrac - hepaticFrac);
    
    k10Raw *= (independentFrac + renalFrac * safeRenalRatio + hepaticFrac * safeHepaticRatio);

    const k10 = (k10Raw / 60) * coMod;
    const k12 = ((this.pk.k12 || 0) / 60) * coMod;
    const k13 = ((this.pk.k13 || 0) / 60) * coMod;

    // Adipose PK scaling (Phase 5, Stage 6): larger adipose mass in obese patients
    // means peripheral compartments V2/V3 hold MORE drug per unit drug in circulation --
    // equivalent to SLOWER return from peripheral compartments (lower k21/k31) since the
    // same amount of drug is distributed across a bigger mass with poor blood supply
    // per unit volume (fat tissue RBF is much lower per kg than lean tissue). Only applied
    // to lipophilic drugs (proxied by protein binding) since adipose has minimal effect on
    // water-soluble drugs. adiposeVolumeRatio = 1 + max(0, (BMI-25)/30), i.e. 1.0 at BMI 25,
    // 1.5 at BMI 40, 1.67 at BMI 45 -- within the clinically observed 40-70% V2 increase
    // for highly lipophilic drugs (propofol, fentanyl) in severe obesity.
    const safeAdiposeRatio = Math.max(0.5, Math.min(2.5, typeof adiposeVolumeRatio === 'number' && Number.isFinite(adiposeVolumeRatio) ? adiposeVolumeRatio : 1.0));
    const lipophilicityProxy = this.pk.proteinBinding !== undefined ? Math.min(1, this.pk.proteinBinding) : 0.5;
    const adiposeSlowingFactor = 1.0 / (1.0 + Math.max(0, safeAdiposeRatio - 1) * lipophilicityProxy * 0.5);
    const k21 = ((this.pk.k21 || 0) / 60) * adiposeSlowingFactor;
    const k31 = ((this.pk.k31 || 0) / 60) * adiposeSlowingFactor;

    // Autoregulation of Effect-Site Equilibration (ke0)
    let ke0Mod = 1.0;
    if (this.classes.includes('Sedative') || this.classes.includes('Hypnotic') || this.classes.includes('Opioid')) {
      // Cerebral autoregulation preserves brain blood flow (and ke0) until severe shock
      ke0Mod = safeCoRatio < 0.5 ? (safeCoRatio * 2) : 1.0; 
    } else {
      // Systemic/Muscle perfusion drops linearly with CO (delays paralytic/pressor onset in shock)
      ke0Mod = Math.max(0.1, safeCoRatio);
    }
    const ke0 = ((this.pk.ke0 || 0.1) / 60) * ke0Mod;

    // Track active infusion time (seconds)
    if (this.currentInfusionRate > 0) {
      this.infusionDurationSeconds += safeDt;
    }

    // Calculate Context-Sensitive Half-Time (CSHT) in minutes
    const tInf = this.infusionDurationSeconds / 60; // in minutes
    if (this.name === 'Remifentanil') {
      this.csht = 3.5;
    } else if (this.name === 'Propofol') {
      this.csht = 3.0 + 37.0 * tInf / (tInf + 80.0);
    } else if (this.name === 'Fentanyl') {
      this.csht = 5.0 + 300.0 * Math.pow(tInf, 1.2) / (Math.pow(tInf, 1.2) + 120.0);
    } else if (this.name === 'Sufentanil') {
      this.csht = 4.0 + 80.0 * tInf / (tInf + 240.0);
    } else if (this.name === 'Midazolam') {
      this.csht = 5.0 + 150.0 * tInf / (tInf + 180.0);
    } else {
      this.csht = 0;
    }

    // Calculate Context-Sensitive 80% Decrement Time (CSDT80) in minutes (Fig 18.16, Miller 9th Ed)
    if (this.name === 'Remifentanil') {
      this.csdt80 = 9.0;
    } else if (this.name === 'Propofol') {
      this.csdt80 = 10.0 + 120.0 * tInf / (tInf + 90.0);
    } else if (this.name === 'Fentanyl') {
      this.csdt80 = 30.0 + 600.0 * Math.pow(tInf, 1.1) / (Math.pow(tInf, 1.1) + 120.0);
    } else if (this.name === 'Sufentanil') {
      this.csdt80 = 20.0 + 320.0 * tInf / (tInf + 180.0);
    } else if (this.name === 'Midazolam') {
      this.csdt80 = 30.0 + 450.0 * tInf / (tInf + 150.0);
    } else {
      this.csdt80 = 0;
    }

    // Dynamic V1 based on hemorrhage / massive fluid resuscitation and cardiac output (front-end recirculatory model)
    const dynamicV1 = Math.max(0.1, this.pk.V1 * safeV1VolumeRatio * (0.6 + 0.4 * safeCoRatio));
    this.dynamicV1 = dynamicV1;

    // Protein Binding & Free Fraction
    const proteinBinding = this.pk.proteinBinding || 0;
    const freeFraction = 1.0 - proteinBinding; 
    // Severe hemodilution (v1VolumeRatio > 1.2) dilutes plasma proteins, increasing free fraction.
    const effectiveFreeFraction = Math.min(1.0, freeFraction * (safeV1VolumeRatio > 1.2 ? 1.2 : 1.0));

    for (let i = 0; i < subSteps; i++) {
      if (this.tciMode === 'Cp' || this.tciMode === 'Ce') {
        let targetCp = this.tciTarget;
        if (this.tciMode === 'Ce') {
          // Ce-controlled overshoot targeting
          targetCp = Math.max(0, Math.min(3.0 * this.tciTarget, this.tciTarget + (this.tciTarget - this.Ce) * 1.5));
        }
        const targetA1 = targetCp * dynamicV1;
        // Euler backward-solving for required infusion rate (mg/sec)
        const reqInfRate = (targetA1 - this.A1) / subDt + (k10 + k12 + k13) * this.A1 - k21 * this.A2 - k31 * this.A3;
        this.currentInfusionRate = Math.max(0, reqInfRate);
      }

      // 1. Add continuous infusion to Central Compartment
      this.A1 += this.currentInfusionRate * subDt;

      // 2. Calculate flux between compartments (Euler)
      const flux10 = k10 * this.A1 * subDt; 
      const flux12 = k12 * this.A1 * subDt; 
      const flux21 = k21 * this.A2 * subDt; 
      const flux13 = k13 * this.A1 * subDt; 
      const flux31 = k31 * this.A3 * subDt; 

      // 3. Update compartment masses (guarded against overflow/divergence and underflow)
      this.A1 = Math.max(0, Math.min(1e9, this.A1 - flux10 - flux12 + flux21 - flux13 + flux31));
      this.A2 = Math.max(0, Math.min(1e9, this.A2 + flux12 - flux21));
      this.A3 = Math.max(0, Math.min(1e9, this.A3 + flux13 - flux31));

      // 4. Update Effect-Site Concentration (Ce) driven by Unbound Plasma Concentration
      const Cp = (this.A1 / dynamicV1) * effectiveFreeFraction;
      this.Cp = Cp;
      this.Ce += ke0 * (Cp - this.Ce) * subDt;
      this.Ce = Math.max(0, Math.min(1e9, this.Ce));
    }

    return this.getEffects(safePdSensitivityCoeff);
  }

  // Hill Equation for Pharmacodynamics
  getEffects(pdSensitivityCoeff: number = 1.0): PKPDEffects {
    const effects: PKPDEffects = { 
      hrDelta: 0, 
      sysDelta: 0, 
      diaDelta: 0, 
      rrDelta: 0, 
      hypnoticEffect: 0, 
      receptorOccupancy: 0,
      group: this.pd?.synergyGroup || 'None',
      svrMultiplier: 1.0,
      coMultiplier: 1.0
    };

    if (!this.pd) return effects;

    // Age-dependent pharmacodynamic sensitivity scaling (Miller 9th Ed, Ch 18 p. 486)
    let ageSens = 1.0;
    const ageVal = this.patientAge || 40;
    if (this.classes.includes('Sedative') || 
        this.classes.includes('Hypnotic') || 
        this.classes.includes('Dissociative') || 
        this.classes.includes('Opioid') ||
        this.classes.includes('Opioid (Ultra-short)')) {
      if (this.name === 'Propofol') {
        // Propofol sensitivity: 20yo -> 0.5, 80yo -> 1.4 (65% dose reduction relative to 20yo)
        ageSens = 1.0 + (ageVal - 40) * 0.025;
      } else if (this.classes.includes('Opioid') || this.classes.includes('Opioid (Ultra-short)')) {
        // Opioid sensitivity: 20yo -> 0.64, 80yo -> 1.44 (55% dose reduction relative to 20yo)
        ageSens = 1.0 + (ageVal - 40) * 0.018;
      } else {
        ageSens = 1.0 + (ageVal - 40) * 0.015;
      }
      ageSens = Math.max(0.2, Math.min(4.0, ageSens));
    }

    let fraction = 0;
    let fractionResp = 0;
    let c50Hyp = this.pd.c50;
    let c50Resp = this.pd.c50;

    if (this.classes.includes('Opioid') || this.classes.includes('Opioid (Ultra-short)')) {
      const tol = this.opioidToleranceMultiplier || 1.0;
      c50Hyp = this.pd.c50 * tol;
      c50Resp = this.pd.c50 * tol;
      if (this.opioidReceptorGenotype === 'A118G') {
        c50Hyp *= 3.0; // 3x higher requirement/lower sensitivity for analgesia/hypnosis
      }
    }

    if (c50Hyp && c50Hyp > 0) {
      const gamma = Math.max(0.001, Math.min(100.0, this.pd.gamma || 1.0));
      const safeCe = Math.max(0, this.Ce); 
      const activeCe = safeCe * pdSensitivityCoeff * ageSens;
      if (activeCe > 0) {
        if (activeCe >= c50Hyp) {
          const ratio = c50Hyp / activeCe;
          fraction = 1.0 / (1.0 + Math.pow(ratio, gamma));
        } else {
          const ratio = activeCe / c50Hyp;
          const power = Math.pow(ratio, gamma);
          fraction = power / (1.0 + power);
        }
      }
    }
    if (isNaN(fraction) || !isFinite(fraction)) {
      fraction = 0.5;
    }
    fraction = Math.max(0, Math.min(1.0, fraction));
    if (fraction < 1e-15) fraction = 0.0;
    if (fraction > 1.0 - 1e-15) fraction = 1.0;

    if (c50Resp && c50Resp > 0) {
      const gamma = Math.max(0.001, Math.min(100.0, this.pd.gamma || 1.0));
      const safeCe = Math.max(0, this.Ce); 
      const activeCe = safeCe * pdSensitivityCoeff * ageSens;
      if (activeCe > 0) {
        if (activeCe >= c50Resp) {
          const ratio = c50Resp / activeCe;
          fractionResp = 1.0 / (1.0 + Math.pow(ratio, gamma));
        } else {
          const ratio = activeCe / c50Resp;
          const power = Math.pow(ratio, gamma);
          fractionResp = power / (1.0 + power);
        }
      }
    }
    if (isNaN(fractionResp) || !isFinite(fractionResp)) {
      fractionResp = 0.5;
    }
    fractionResp = Math.max(0, Math.min(1.0, fractionResp));
    if (fractionResp < 1e-15) fractionResp = 0.0;
    if (fractionResp > 1.0 - 1e-15) fractionResp = 1.0;

    // Direct Deltas for non-vasopressor agents (Sedatives, Opioids)
    if (this.pd.sysMax && !this.pd.receptors) effects.sysDelta = this.pd.sysMax * fraction;
    if (this.pd.diaMax && !this.pd.receptors) effects.diaDelta = this.pd.diaMax * fraction;
    if (this.pd.hrMax && !this.pd.receptors) effects.hrDelta = this.pd.hrMax * fractionResp;
    if (this.pd.rrMax) {
      effects.rrDelta = this.pd.rrMax * (this.classes.includes('Opioid') || this.classes.includes('Opioid (Ultra-short)') ? fractionResp : fraction);
    }

    // HIGH-FIDELITY VASOPRESSOR / RECEPTOR COUPLING (CA-1 Integration) -- extracted into
    // ReceptorPharmacologyModel.ts's computeReceptorCoupling (Phase 2's receptor-
    // unification piece, mutable-roaming-newell.md) so PainEngine.ts's endogenous
    // catecholamine pool can share the exact same math; this call site's behavior is
    // unchanged, a pure refactor.
    if (this.pd.receptors) {
      const coupling = computeReceptorCoupling(fraction, this.pd.receptors);
      effects.svrMultiplier += coupling.svrMultiplierDelta;
      effects.coMultiplier += coupling.coMultiplierDelta;
      effects.hrDelta += coupling.hrDeltaContribution;
      effects.alpha1Activity = (effects.alpha1Activity || 0) + coupling.alpha1Activity;
      effects.beta2Activity = (effects.beta2Activity || 0) + coupling.beta2Activity;

      // Pure-alpha or pure-V1 vasopressors (no Beta-1) have their baroreceptor reflex
      // bradycardia carried in pd.hrMax but the `!this.pd.receptors` gate above blocks it.
      // Apply it here for drugs with Alpha1 or V1 activity and zero Beta1 — these are
      // phenylephrine (hrMax=-35) and vasopressin (hrMax=-5). The receptor coupling's own
      // small baroreceptor term is already in coupling.hrDeltaContribution; hrMax replaces
      // that with the clinically correct magnitude, so subtract the double-counted term.
      const r = this.pd.receptors as { Alpha1?: number; Beta1?: number; V1?: number };
      const isPurePressorNoInotrope = ((r.Alpha1 ?? 0) > 0 || (r.V1 ?? 0) > 0) && !(r.Beta1);
      if (isPurePressorNoInotrope && this.pd.hrMax) {
        // Remove the small receptor-coupling baroreceptor term (which was alpha1*5*fraction or v1*5*fraction)
        // and replace with the calibrated hrMax value.
        const smallTerm = -((r.Alpha1 ?? 0) + (r.V1 ?? 0)) * 5 * fraction;
        effects.hrDelta -= smallTerm;               // undo the small coupling term
        effects.hrDelta += this.pd.hrMax * fraction; // apply the calibrated reflex magnitude
      }
    }

    // Clinical Hypnosis
    if (this.classes.includes('Sedative') || 
        this.classes.includes('Hypnotic') || 
        this.classes.includes('Dissociative') || 
        this.classes.includes('Opioid')) {
      effects.hypnoticEffect = fraction;
    }

    // Neuromuscular Junction Occupancy
    if (this.classes.includes('NDMR') || this.classes.includes('Depolarizing NMBA') || this.classes.includes('NMBA')) {
      effects.receptorOccupancy = fraction;
    }
    
    // Prevent negative zero (-0) propagation in clinical deltas
    effects.hrDelta += 0;
    effects.sysDelta += 0;
    effects.diaDelta += 0;
    effects.rrDelta += 0;

    return effects;
  }
}
