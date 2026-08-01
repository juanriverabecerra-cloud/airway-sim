import { useState, useEffect, useRef } from 'react';
import { MEDICATIONS, FLUIDS, INHALATIONAL_AGENTS, calculateIBW, calculateLBW, calculateHumeLBM, calculateJanmahasatianFFM, calculateCBW, calculateMFFM, calculatePKM, calculateAgeAdjustedMAC, calculateLungVolumes, calculateLink25GasMixture } from './Pharmacology.js';
import { PKPDModel } from './PKPDEngine';
import { GasKineticsModel } from './GasKineticsEngine';
import { getAnatomicalParameter, extractTextbookRules } from '../testing/oracle_query.ts';
import { DynamicMedicationRegistry } from '../knowledge/DynamicMedicationRegistry.ts';
import { FluidicsEngine } from './FluidicsEngine';
import { CardiovascularEngine } from './CardiovascularEngine';
import { RespiratoryEngine } from './RespiratoryEngine';
import { PainEngine } from './PainEngine';
import { ConsciousnessEngine } from './ConsciousnessEngine';
import { GastrointestinalEngine } from './GastrointestinalEngine';
import { HepaticEngine } from './HepaticEngine';
import { RenalEngine } from './RenalEngine';
import { CerebralEngine } from './CerebralEngine';
import { LymphaticSystemModel } from './LymphaticSystemModel';
import { AdrenalEngine } from './AdrenalEngine';
import { ThyroidEngine } from './ThyroidEngine';
import { PancreasEngine } from './PancreasEngine';
import { ParathyroidEngine } from './ParathyroidEngine';
import { AutonomicNervousSystemEngine } from './AutonomicNervousSystemEngine';
import { BrainstemEngine } from './BrainstemEngine';
import { CerebellarEngine } from './CerebellarEngine';
import { PregnancyPhysiologyEngine } from './PregnancyPhysiologyEngine';
import { UterineToneModel } from './UterineToneModel';
import { FetalMonitoringModel } from './FetalMonitoringModel';
import { TurpSyndromeModel } from './TurpSyndromeModel';
import { CoagulationCascadeModel } from './CoagulationCascadeModel';
import { AcidBaseModel } from './AcidBaseModel';
import { LastModel } from './LastModel';
import { SepsisCascadeModel } from './SepsisCascadeModel';
import { AntibioticPKPDModel } from './AntibioticPKPDModel';
import { TransfusionImmunologyModel } from './TransfusionImmunologyModel';
import { PharmacogenomicsEngine } from './PharmacogenomicsEngine';
import { CapnographyModel } from './CapnographyModel';
import { HpaAxisModel } from './HpaAxisModel';
import { SexHormoneModel } from './SexHormoneModel';
import { NeuraxialPKModel } from './NeuraxialPKModel';
import { DrugInteractionModel } from './DrugInteractionModel';
import { MAOIModel } from './MAOIModel';
import { PneumoperitoneumModel } from './PneumoperitoneumModel';
import { PulmonaryEmbolismModel } from './PulmonaryEmbolismModel';
import { VenousAirEmbolismModel } from './VenousAirEmbolismModel';
import { ClinicalScoringEngine } from './ClinicalScoringEngine';
import { SurgicalCrisisModel } from './SurgicalCrisisModel';
import { PONVModel } from './PONVModel';
import { DeepCoagulationModel } from './DeepCoagulationModel';
import { ThermoregulationModel } from './ThermoregulationModel';
import { MusculoskeletalModel } from './MusculoskeletalModel';
import { OneLungVentilationModel } from './OneLungVentilationModel';
import { CarbonMonoxideModel } from './CarbonMonoxideModel';
import { BurnsPhysiologyModel } from './BurnsPhysiologyModel';
import { PulmonaryHypertensionModel } from './PulmonaryHypertensionModel';
import { PediatricPhysiologyEngine } from './PediatricPhysiologyEngine';
import { PreeclampsiaModel } from './PreeclampsiaModel';
import { AmniotiFluidEmbolismModel } from './AmniotiFluidEmbolismModel';
import { AcetaminophenModel } from './AcetaminophenModel';
import { PerioperativeMIModel } from './PerioperativeMIModel';
import { FatEmbolismModel } from './FatEmbolismModel';
import { ToxidromeModel } from './ToxidromeModel';
import { CarotidEndCerebralModel } from './CarotidEndCerebralModel';
import { TACOModel } from './TACOModel';
import { PDPHModel } from './PDPHModel';
import { SpecialSurgeryPhysiology } from './SpecialSurgeryPhysiology';
import { DigoxinToxicityModel } from './DigoxinToxicityModel';
import { HypertensiveEmergencyModel } from './HypertensiveEmergencyModel';
import { SickleCellModel } from './SickleCellModel';
import { AcutePorphyriaModel } from './AcutePorphyriaModel';
import { TumorLysisElectrolyteModel } from './TumorLysisElectrolyteModel';
import { DifficultyAirwayModel } from './DifficultyAirwayModel';
import { MultipleAnaphylaxisModel } from './MultipleAnaphylaxisModel';
import { AcuteCardiacEventModel } from './AcuteCardiacEventModel';
import { AngioedemaStatusAsthmaModel } from './AngioedemaStatusAsthmaModel';
import { CardiacArrhythmiaManagementModel } from './CardiacArrhythmiaManagementModel';
import { CKDPerioperativeModel } from './CKDPerioperativeModel';
import { ChronicOpioidToleranceModel } from './ChronicOpioidToleranceModel';
import { LiverTransplantPhysiologyModel } from './LiverTransplantPhysiologyModel';
import { MalnutritionFrailtyModel } from './MalnutritionFrailtyModel';
import { CardiopulmonaryBypassModel } from './CardiopulmonaryBypassModel';
import { ThyroidStormTreatmentModel } from './ThyroidStormTreatmentModel';
import { LaborEpiduralModel } from './LaborEpiduralModel';
import { PostopPainManagementModel } from './PostopPainManagementModel';
import { MassiveTransfusionModel } from './MassiveTransfusionModel';
import { PerioperativeGlucoseModel } from './PerioperativeGlucoseModel';
import { VentilatorWeaningARDSModel } from './VentilatorWeaningARDSModel';
import { ShockVasopressorModel } from './ShockVasopressorModel';
import { AnticoagulationPerioperativeModel } from './AnticoagulationPerioperativeModel';
import { NeuromuscularMonitoringModel } from './NeuromuscularMonitoringModel';
import { AcuteCoronarySyndromeModel } from './AcuteCoronarySyndromeModel';
import { SepsisManagementProtocolModel } from './SepsisManagementProtocolModel';
import { PediatricSpecificClinicalModel } from './PediatricSpecificClinicalModel';
import { MetabolicEquilibriumModel } from './MetabolicEquilibriumModel';
import { ObstetricHemorrhageModel } from './ObstetricHemorrhageModel';
import { ChronicDiseaseManagementModel } from './ChronicDiseaseManagementModel';
import { SpinalCordInjuryModel } from './SpinalCordInjuryModel';
import { DrugInteractionSafetyModel } from './DrugInteractionSafetyModel';
import { EmergencyDrugDosingModel } from './EmergencyDrugDosingModel';
import { CardiacRhythmManagementModel } from './CardiacRhythmManagementModel';
import { AcuteKidneyInjuryModel } from './AcuteKidneyInjuryModel';
import { createQualityEvent } from './OutcomeScoringEngine.ts';
import { HERBAL_MEDICINES, DIETARY_SUPPLEMENTS } from './CAMKnowledgeEngine';
import { ensureRng } from './rng';

/**
 * Clamp `v` to [lo, hi]. Module-scope helper used by the physics step (bronchodilator effects).
 * NOTE: `clamp` was referenced at 4 sites but never defined anywhere in this file — a latent
 * ReferenceError that the tick's try/catch swallowed as "Physics Engine Tick Failed" whenever
 * Albuterol/Ipratropium/Ketamine/Magnesium was administered. Surfaced by the Layer 1B extraction's
 * ESLint no-undef gate and fixed here (docs/architecture/audit_layer1_physics_core.md).
 */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function resolveDosingWeight(medData, type, patient) {
  const tbw = typeof patient.weight === 'number' && Number.isFinite(patient.weight) && patient.weight > 0 ? patient.weight : 70;
  const ibw = typeof patient.ibw === 'number' && Number.isFinite(patient.ibw) && patient.ibw > 0 ? patient.ibw : 70;
  const lbw = typeof patient.lbw === 'number' && Number.isFinite(patient.lbw) && patient.lbw > 0 ? patient.lbw : 60; // Janmahasatian
  const lbm = typeof patient.lbm === 'number' && Number.isFinite(patient.lbm) && patient.lbm > 0 ? patient.lbm : lbw; // Hume
  const ffm = typeof patient.ffm === 'number' && Number.isFinite(patient.ffm) && patient.ffm > 0 ? patient.ffm : lbw; // Janmahasatian
  const cbw = typeof patient.cbw === 'number' && Number.isFinite(patient.cbw) && patient.cbw > 0 ? patient.cbw : ibw;
  const mffm = typeof patient.mffm === 'number' && Number.isFinite(patient.mffm) && patient.mffm > 0 ? patient.mffm : ffm;
  const pkm = typeof patient.pkm === 'number' && Number.isFinite(patient.pkm) && patient.pkm > 0 ? patient.pkm : ibw;

  // Chapter 18:
  // Propofol: bolus is scaled to LBM (Hume), infusions to TBW or CBW. Let's use CBW as default for obese (BMI >= 30) infusion maintenance, TBW for lean.
  if (medData.name === 'Propofol') {
    const isObese = (tbw / Math.pow((patient.height || 170) / 100, 2)) >= 30.0;
    if (type === 'Bolus') {
      return lbm;
    } else { // Infusion
      return isObese ? cbw : tbw;
    }
  }

  // Remifentanil: bolus to TBW, infusions to IBW.
  if (medData.name === 'Remifentanil') {
    if (type === 'Bolus') {
      return tbw;
    } else { // Infusion
      return ibw;
    }
  }

  // Fentanyl: pharmacokinetic mass (PKM)
  if (medData.name === 'Fentanyl') {
    return pkm;
  }

  // Otherwise check the config
  const key = medData.dosingWeight;
  if (key === 'IBW') return ibw;
  if (key === 'LBW') return lbw;
  if (key === 'LBM') return lbm;
  if (key === 'FFM') return ffm;
  if (key === 'CBW') return cbw;
  if (key === 'MFFM') return mffm;
  if (key === 'PKM') return pkm;
  
  return tbw;
}

/**
 * Layer 1B: the pure-ish per-step physics core, extracted verbatim from the hook so it can run
 * headless (deterministic replay, golden-master + closed-loop oracle testing). Mutates
 * __ctx.stateRef.current and emits side effects only through injected callbacks. The hook injects
 * React-backed deps; the headless harness injects plain-object deps. See
 * docs/architecture/audit_layer1_physics_core.md for the ctx contract.
 * @returns {{skipped: boolean}} skipped=true when the step aborted early (empty/uninitialized vitals).
 */
export function runPhysicsStep(__ctx) {
  const {
    stateRef, ventSettings, gasSettings, logEvent, logQualityEvent, setVitals, setElectrolytes, setCoags, setTotalBodyWaterLiters, setIntravascularVolume, setSurgicalPhase, setIsRunning, ffRemainingRef, ffTotalRef, electrolytes
  } = __ctx;
            stateRef.current.time = (stateRef.current.time || 0) + 1;
            
            const st = stateRef.current;
          // Layer 1A determinism: every stochastic complication "roll" in this tick draws from a
          // seeded, serializable RNG bound to st.patient.rng (see
          // docs/architecture/audit_layer1_physics_core.md). Stored on patient because patient is the
          // bag that survives the flush -> render -> stateRef-rebuild cycle and createSnapshot. Falls
          // back to a Math.random-derived seed in production (still individually replayable because the
          // seed is retained on st.patient.rng.seed). Tests/harness pre-seed st.patient.rng for repeatability.
          const rng = st.patient ? ensureRng(st.patient, st.patient.rngSeed) : Math.random;
          const safeIntravascularVolume = typeof st.intravascularVolume === 'number' && Number.isFinite(st.intravascularVolume) ? st.intravascularVolume : 0;
          let currentMac = st.vitals.mac || 0;
          let deliveredFiO2 = st.vitals.fiO2 || 21;
          let currentEtN2O = st.vitals.etN2O || 0;
          const activeVentSettings = st.ventSettings || ventSettings || { mode: 'PCV-VG', vt: 500, rr: 12, peep: 5, pmax: 40 };
          const activeGasSettings = st.gasSettings || gasSettings || { agent: 'sevoflurane', dial: 0, o2Flow: 2.0, airFlow: 0.0, n2oFlow: 0.0 };
          if (!st || !st.vitals || Object.keys(st.vitals).length === 0) return { skipped: true };
          const pos = st.patient.position || 'Supine';
          const prevEblBeforeThisTick = st.patient.ebl || 0;

          // Phase 5, Stage 4: SepsisCascadeModel -- dynamic isSeptic severity progression.
          // Computed very early so sepsisScore can be stored on st.patient before
          // CardiovascularEngine.ts reads it to replace the prior flat isSeptic ? 0.6 modifier.
          const dexamethasoneSepsisModel = (st.activeMeds || []).find(m => m.name === 'Dexamethasone');
          const hydrocortisoneSepsisModel = (st.activeMeds || []).find(m => m.name === 'Hydrocortisone');
          const steroidCeForSepsis = Math.max(dexamethasoneSepsisModel ? dexamethasoneSepsisModel.Ce : 0, hydrocortisoneSepsisModel ? hydrocortisoneSepsisModel.Ce : 0);
          // Phase 6A: Antibiotic PD target attainment -- feeds treatment-responsive sepsis
          const abxCefazolinModel = (st.activeMeds || []).find(m => m.name === 'Cefazolin');
          const abxVancomycinModel = (st.activeMeds || []).find(m => m.name === 'Vancomycin');
          const abxPiptazoModel = (st.activeMeds || []).find(m => m.name === 'Piperacillin/Tazobactam');
          const abxMeropenemModel = (st.activeMeds || []).find(m => m.name === 'Meropenem');
          const abxGentamicinModel = (st.activeMeds || []).find(m => m.name === 'Gentamicin');
          const abxMetronidazoleModel = (st.activeMeds || []).find(m => m.name === 'Metronidazole');
          const abxCiprofloxacinModel = (st.activeMeds || []).find(m => m.name === 'Ciprofloxacin');
          const abxCeftriaxoneModel = (st.activeMeds || []).find(m => m.name === 'Ceftriaxone');
          const abxUnasynModel = (st.activeMeds || []).find(m => m.name === 'Ampicillin/Sulbactam (Unasyn)');

          const antibioticOutput = AntibioticPKPDModel.tick({
              cefazolinCe: abxCefazolinModel ? abxCefazolinModel.Ce : 0,
              vancomycinCe: abxVancomycinModel ? abxVancomycinModel.Ce : 0,
              piptazoCe: (abxPiptazoModel ? abxPiptazoModel.Ce : 0) + (abxUnasynModel ? abxUnasynModel.Ce * 0.3 : 0),
              meropenemCe: abxMeropenemModel ? abxMeropenemModel.Ce : 0,
              gentamicinCe: abxGentamicinModel ? abxGentamicinModel.Ce : 0,
              metronidazoleCe: abxMetronidazoleModel ? abxMetronidazoleModel.Ce : 0,
              ciprofloxacinCe: abxCiprofloxacinModel ? abxCiprofloxacinModel.Ce : 0,
              ceftriaxoneCe: abxCeftriaxoneModel ? abxCeftriaxoneModel.Ce : 0,
              prevVancomycinAuc24h: st.patient.vancomycinAuc24h,
              prevCiprofloxacinAuc24h: st.patient.ciprofloxacinAuc24h,
              infectionType: st.patient.infectionType || 'default',
              renalFunctionRatio: (st.patient.gfr && Number.isFinite(st.patient.gfr)) ? Math.max(0.05, st.patient.gfr / 125) : 1.0,
              dt: 1
          });
          st.patient.vancomycinAuc24h = antibioticOutput.vancomycinAuc24h;
          st.patient.ciprofloxacinAuc24h = antibioticOutput.ciprofloxacinAuc24h;
          st.patient.antibioticCoverageAdequacy = antibioticOutput.coverageAdequacy;

          const sepsisOutput = SepsisCascadeModel.tick({
              isSeptic: !!st.patient.isSeptic,
              prevSepsisScore: st.patient.sepsisScore,
              mapMmHg: st.vitals.map || 65,
              netFluidBalanceMl: st.patient.netFluidBalance || 0,
              sourceControlActive: !!st.patient.sourceControlActive,
              corticosteroidCe: steroidCeForSepsis,
              antibioticCoverageAdequacy: antibioticOutput.coverageAdequacy,
              dt: 1
          });
          if (st.patient.isSeptic) {
              st.patient.sepsisScore = sepsisOutput.sepsisScore;
          }

          // Pregnancy Physiology Engine Tick (Phase 4): computed early since its outputs feed
          // into the CV/Resp/GI engines further down (preload via positionPreloadMod, HR via
          // totalHrDelta, SVR via a new drugEffects field, FRC/metabolic-rate multipliers,
          // baseline PaCO2, and GI LES-tone/gastroparesis).
          const pregnancyOutput = PregnancyPhysiologyEngine.tick({
              isPregnant: !!st.patient.isPregnant,
              gestationalAgeWeeks: st.patient.gestationalAgeWeeks,
              position: pos,
              leftUterineDisplacement: !!st.patient.leftUterineDisplacement
          });

          let totalHrDelta = pregnancyOutput.hrBaselineShift;
          let totalRrDelta = 0;
          let drugSvrMod = 1.0;
          let drugInotropyMod = 1.0;
          let sedativeEff = 0;
          let opioidEff = 0;
          let maxNMJOccupancy = 0;

          if (st.patient.isPregnant) {
              const prevAortocavalCompressionActive = !!st.patient.aortocavalCompressionActive;
              if (pregnancyOutput.aortocavalCompressionActive && !prevAortocavalCompressionActive) {
                  logEvent("⚠️ WARNING: Supine positioning in a gravid patient past ~20 weeks risks aortocaval compression (supine hypotensive syndrome) -- consider left uterine displacement or lateral tilt.");
              } else if (!pregnancyOutput.aortocavalCompressionActive && prevAortocavalCompressionActive) {
                  logEvent("✅ CLINICAL UPDATE: Aortocaval compression has resolved (left uterine displacement/lateral tilt or repositioning).");
              }
              st.patient.aortocavalCompressionActive = pregnancyOutput.aortocavalCompressionActive;
          }

          // ==========================================
          // TEXTBOOK CLINICAL RULE INTERPRETER
          // ==========================================
          let ruleHrOffset = 0;
          let ruleHrScale = 1.0;
          let ruleHrClamp = undefined;
          let ruleRrOffset = 0;
          let ruleRrScale = 1.0;
          let ruleMapOffset = 0;
          let ruleMapScale = 1.0;
          let ruleSpo2Offset = 0;
          let ruleKOffset = 0;
          let ruleComplScale = 1.0;
          let rulePipOffset = 0;
          let ruleTempOffset = 0;

          const evaluateCondition = (rule, state) => {
            const cond = rule.condition.toLowerCase();
            
            if (state.patient.position && state.patient.position.toLowerCase().includes(cond)) {
              return true;
            }
            
            if (cond === 'sepsis' && state.patient.isSeptic) return true;
            if (cond === 'burn' && (state.patient.nAChR_state === 'upregulated' || state.patient.burns || state.patient.burn)) return true;
            if (cond === 'obese' && state.patient.isObese) return true;
            if (cond === 'copd' && state.patient.copd) return true;
            if (cond === 'seizure' && state.patient.isSeizure) return true;
            if (cond === 'trauma' && state.patient.trauma) return true;
            
            const med = state.activeMeds && state.activeMeds.find(m => m.name.toLowerCase() === cond);
            if (med && med.Ce > 0.01) {
              return true;
            }
            
            return false;
          };

          try {
            const activeRules = extractTextbookRules();
            for (const rule of activeRules) {
              if (evaluateCondition(rule, st)) {
                const op = rule.operator;
                const val = rule.value;
                
                if (rule.targetVital === 'hr') {
                  if (op === '+') ruleHrOffset += val;
                  else if (op === '-') ruleHrOffset -= val;
                  else if (op === 'scale') ruleHrScale *= val;
                  else if (op === 'clamp') ruleHrClamp = val;
                } else if (rule.targetVital === 'rr') {
                  if (op === '+') ruleRrOffset += val;
                  else if (op === '-') ruleRrOffset -= val;
                  else if (op === 'scale') ruleRrScale *= val;
                } else if (rule.targetVital === 'map') {
                  if (op === '+') ruleMapOffset += val;
                  else if (op === '-') ruleMapOffset -= val;
                  else if (op === 'scale') ruleMapScale *= val;
                } else if (rule.targetVital === 'spo2') {
                  if (op === '+') ruleSpo2Offset += val;
                  else if (op === '-') ruleSpo2Offset -= val;
                } else if (rule.targetVital === 'k') {
                  if (op === '+') ruleKOffset += val;
                  else if (op === '-') ruleKOffset -= val;
                } else if (rule.targetVital === 'compl') {
                  if (op === 'scale') ruleComplScale *= val;
                } else if (rule.targetVital === 'pip') {
                  if (op === '+') rulePipOffset += val;
                  else if (op === '-') rulePipOffset -= val;
                } else if (rule.targetVital === 'temp') {
                  if (op === '+') ruleTempOffset += val;
                  else if (op === '-') ruleTempOffset -= val;
                }
              }
            }
          } catch (e) {
            console.error("Error executing dynamic textbook rules:", e);
          }
          // ==========================================

          // 2. Fluidics Engine Tick
          const fluidicsOutput = FluidicsEngine.tick(1, {
            patient: st.patient,
            electrolytes: st.electrolytes,
            coags: st.coags,
            vitals: st.vitals,
            time: st.time
          });

          // Extract continuous medication rates from non-blown lines
          const lineMedicationRates = {};
          const nonBlownLines = fluidicsOutput.accessLines.filter(l => !l.failed);
          nonBlownLines.forEach(line => {
              if (line.activeMedInfusions) {
                  line.activeMedInfusions.forEach(medInf => {
                      if (medInf.rate > 0) {
                          lineMedicationRates[medInf.medId] = (lineMedicationRates[medInf.medId] || 0) + parseFloat(medInf.rate);
                      }
                  });
              }
          });

          // Log events from fluidics
          if (fluidicsOutput.events && fluidicsOutput.events.length > 0) {
              fluidicsOutput.events.forEach(evt => logEvent(evt.msg));
          }

          // Apply fluidics updates
          const patientAfterFluidics = {
              ...st.patient,
              accessLines: fluidicsOutput.accessLines,
              bloodBank: fluidicsOutput.bloodBank
          };
          
          if (fluidicsOutput.events && fluidicsOutput.events.length > 0) {
              fluidicsOutput.events.forEach(evt => {
                  patientAfterFluidics.events = [
                      ...(patientAfterFluidics.events || []),
                      { time: st.time, msg: evt.msg, type: evt.type } // Layer 1A: sim time, not Date.now (deterministic)
                  ];
              });
          }

          // Auto-resolve transient bradycardia from onset mismatch (Edrophonium + Glyco) after 120 seconds
          if (patientAfterFluidics.transientBradycardia && patientAfterFluidics.bradycardiaTriggered) {
              const elapsed = st.time - (patientAfterFluidics.bradycardiaTime || 0);
              if (elapsed >= 120) {
                  patientAfterFluidics.bradycardiaTriggered = false;
                  patientAfterFluidics.transientBradycardia = false;
                  logEvent("✅ Glycopyrrolate has reached therapeutic effect. Transient bradycardia resolved.");
              }
          }

          if (fluidicsOutput.tbwDelta_L > 0) {
              setTotalBodyWaterLiters(prev => prev + fluidicsOutput.tbwDelta_L);
              setElectrolytes(fluidicsOutput.electrolytes);
              setCoags(fluidicsOutput.coags);
          }
          setIntravascularVolume(prev => prev + fluidicsOutput.intravascularVolumeAdded_mL);

          // 3. PK/PD and Gas models loops
          let currentCOForPK = Number(st.vitals.co);
          if (isNaN(currentCOForPK) || !isFinite(currentCOForPK) || currentCOForPK <= 0) {
              currentCOForPK = 5.0;
          }
          // High-quality CPR provides ~25-30% of normal CO (~1.5 L/min).
          // Without this, coRatio=0 freezes all PKPD rate constants (k10, ke0 floored
          // at 10%), preventing drugs given during CPR from ever reaching their effect
          // compartments and making epinephrine/amiodarone/etc appear to "do nothing."
          // With coRatio=0.3, epi's Ce builds to therapeutic levels in ~3-5 minutes of
          // CPR, matching the clinical reality of ACLS drug distribution during compressions.
          if (st.patient.isArrest && st.patient.cprActive) {
              currentCOForPK = Math.max(currentCOForPK, 1.5);
          }
          const coRatio = currentCOForPK / 5.0;

          // Phase 6J: Deep Coagulation (VWF, hemophilia, reversal agents, PFA)
          const desmopressinModel = (st.activeMeds || []).find(m => m.name === 'Desmopressin (DDAVP)');
          const ddavpCe = desmopressinModel ? desmopressinModel.Ce : 0;
          const deepCoagOutput = DeepCoagulationModel.tick({
              hasVWD: !!st.patient.hasVWD,
              vwdType: st.patient.vwdType,
              ddavpCe: ddavpCe,
              vwfConcentrateGiven: !!st.patient.vwfConcentrateGiven,
              hasHemophiliaA: !!st.patient.hasHemophiliaA || !!st.patient.hemophiliaA,
              hasHemophiliaB: !!st.patient.hasHemophiliaB || !!st.patient.hemophiliaB,
              factorVIIIPercent: st.patient.factorVIIIPercent,
              factorIXPercent: st.patient.factorIXPercent,
              hasInhibitors: !!st.patient.hemophiliaInhibitors,
              pccGiven: !!st.patient.pccGiven,
              andexanetGiven: !!st.patient.andexanetGiven,
              idarucizumabGiven: !!st.patient.idarucizumabGiven,
              fviiiBolusMg: st.patient.fviiiBolusMg || 0,
              fviiaBolusMg: st.patient.fviiaBolusMg || 0,
              plateletCountK: patientAfterFluidics.plateletCount || st.patient.plateletCount || 250,
              aspirinActive: !!st.patient.aspirinActive,
              nonsteroidsActive: !!st.patient.chronicNSAIDs,
              currentFactorActivityFraction: patientAfterFluidics.factorActivityFraction || st.patient.factorActivityFraction || 1
          });
          st.patient.vwfActivityPercent = deepCoagOutput.vwfActivityPercent;
          st.patient.pfaADPClosureTimeSec = deepCoagOutput.pfaADPClosureTimeSec;
          st.patient.pfaEpiClosureTimeSec = deepCoagOutput.pfaEpiClosureTimeSec;
          st.patient.factorVIIIPercent = deepCoagOutput.factorVIIIPercent;
          st.patient.factorIXPercent = deepCoagOutput.factorIXPercent;
          patientAfterFluidics.vwfActivityPercent = deepCoagOutput.vwfActivityPercent;
          patientAfterFluidics.pfaADPClosureTimeSec = deepCoagOutput.pfaADPClosureTimeSec;
          patientAfterFluidics.pfaEpiAbnormal = deepCoagOutput.pfaEpiAbnormal;
          patientAfterFluidics.factorVIIIPercent = deepCoagOutput.factorVIIIPercent;
          patientAfterFluidics.factorIXPercent = deepCoagOutput.factorIXPercent;
          // Deep coag factor activity boost feeds into the coagulation model next tick via patient state
          if (deepCoagOutput.effectiveFactorActivityBoost < 0) {
              patientAfterFluidics.factorActivityFraction = Math.max(0, (patientAfterFluidics.factorActivityFraction || st.patient.factorActivityFraction || 1) + deepCoagOutput.effectiveFactorActivityBoost);
              st.patient.factorActivityFraction = patientAfterFluidics.factorActivityFraction;
          }

          // SurgicalCrisisModel: Carcinoid, Pheo, NPPE, MMR
          const octreotideModelForCrisis = (st.activeMeds || []).find(m => m.name === 'Octreotide');
          const suxForMMR = (st.activeMeds || []).find(m => m.name === 'Succinylcholine');
          const surgicalCrisisOutput = SurgicalCrisisModel.tick({
              carcinoidTumorPresent: !!st.patient.carcinoidTumor,
              surgeonManipulatingTumor: !!st.patient.carcinoidTumor && !!(st.surgicalPhase === 'Incision' || st.surgicalPhase === 'Maintenance'),
              octreotideCe: octreotideModelForCrisis ? octreotideModelForCrisis.Ce : 0,
              prevCarcinoidCrisisLogged: !!st.patient.carcinoidCrisisLogged,
              pheoPresent: !!st.patient.pheo,
              pheoBlockadeAdequate: !!st.patient.pheoBlockadeAdequate,
              surgeonTouchingAdrenal: !!st.patient.pheo && !!(st.surgicalPhase === 'Incision' || st.surgicalPhase === 'Maintenance'),
              tumorLigated: !!st.patient.pheoTumorLigated,
              phentolamineCe: ((st.activeMeds || []).find(m => m.name === 'Phentolamine') || {Ce:0}).Ce || 0,
              prevPheoCrisisLogged: !!st.patient.pheoCrisisLogged,
              prevPheoHypotensionLogged: !!st.patient.pheoHypotensionLogged,
              laryngospasmOccurred: !!st.patient.laryngospasm,
              minutesSinceLaryngospasm: st.patient.laryngospasmTime !== undefined ? (st.time - st.patient.laryngospasmTime) / 60 : 0,
              prevNPPELogged: !!st.patient.nppeLogged,
              succinylcholineGivenToMHSusceptible: !!(suxForMMR && suxForMMR.Ce > 0.05 && st.patient.mhSusceptible),
              prevMMRLogged: !!st.patient.mmrLogged
          });
          if (surgicalCrisisOutput.events && surgicalCrisisOutput.events.length > 0) {
              surgicalCrisisOutput.events.forEach(evt => logEvent(evt));
          }
          st.patient.carcinoidCrisisLogged = surgicalCrisisOutput.prevCarcinoidCrisisLogged;
          st.patient.pheoCrisisLogged = surgicalCrisisOutput.prevPheoCrisisLogged;
          st.patient.pheoHypotensionLogged = surgicalCrisisOutput.prevPheoHypotensionLogged;
          st.patient.nppeLogged = surgicalCrisisOutput.prevNPPELogged;
          st.patient.mmrLogged = surgicalCrisisOutput.prevMMRLogged;
          if (surgicalCrisisOutput.carcinoidCrisisActive) {
              drugSvrMod *= (1 + surgicalCrisisOutput.carcinoidSVRMod);
          }
          if (surgicalCrisisOutput.pheoHypertensiveCrisisActive || surgicalCrisisOutput.pheoHypotensionActive) {
              // Pheo crisis contributes to vasomotor SVR channel (same established pattern)
              st.patient.pheoSVRContribution = surgicalCrisisOutput.pheoSVRSpike + (surgicalCrisisOutput.pheoHypotensionSVRDrop * 1200);
          } else {
              st.patient.pheoSVRContribution = 0;
          }
          if (surgicalCrisisOutput.nppePulmonaryEdemaActive) {
              st.patient.nppeCompliancePenalty = surgicalCrisisOutput.nppeCompliancePenalty;
              st.patient.nppeResistancePenalty = surgicalCrisisOutput.nppeResistancePenalty;
          } else {
              st.patient.nppeCompliancePenalty = 0;
              st.patient.nppeResistancePenalty = 0;
          }

          // === PREECLAMPSIA / ECLAMPSIA / HELLP MODEL ===
          {
            const pecMagModel = (st.activeMeds || []).find(m => m.name === 'Magnesium Sulfate');
            const pecLabetalolModel = (st.activeMeds || []).find(m => m.name === 'Labetalol');
            const pecHydralazineModel = (st.activeMeds || []).find(m => m.name === 'Hydralazine');
            const pecNifedipineModel = (st.activeMeds || []).find(m => m.name === 'Nifedipine');
            const pecOutput = PreeclampsiaModel.tick({
              rng,
              hasPreeclampsia: !!st.patient.hasPreeclampsia,
              gestationalAgeWeeks: st.patient.gestationalAgeWeeks,
              currentMAP: st.vitals.map,
              currentSBP: st.vitals.sys,
              currentDBP: st.vitals.dia,
              magnesiumCe: pecMagModel ? pecMagModel.Ce : 0,
              plateletCount: st.patient.plateletCount,
              currentAST: st.patient.AST,
              currentALT: st.patient.ALT,
              currentCreatinine: st.patient.creatinine,
              labetalolCe: pecLabetalolModel ? pecLabetalolModel.Ce : 0,
              hydralazineCe: pecHydralazineModel ? pecHydralazineModel.Ce : 0,
              nifedipineCe: pecNifedipineModel ? pecNifedipineModel.Ce : 0,
              prevPECHypertensiveLogged: !!st.patient.prevPECHypertensiveLogged,
              prevEclampsiaLogged: !!st.patient.prevEclampsiaLogged,
              prevHELLPLogged: !!st.patient.prevHELLPLogged,
              prevMgToxicLogged: !!st.patient.prevMgToxicLogged,
              prevAirwayEdemaLogged: !!st.patient.prevPECAirwayEdemaLogged,
            });
            pecOutput.events.forEach(e => logEvent(e));
            st.patient.prevPECHypertensiveLogged = pecOutput.prevPECHypertensiveLogged;
            st.patient.prevEclampsiaLogged = pecOutput.prevEclampsiaLogged;
            st.patient.prevHELLPLogged = pecOutput.prevHELLPLogged;
            st.patient.prevMgToxicLogged = pecOutput.prevMgToxicLogged;
            st.patient.prevPECAirwayEdemaLogged = pecOutput.prevAirwayEdemaLogged;
            st.patient.pecSvrContribution = pecOutput.svrContributionFromPEC;
            // PEC-driven hypertension: feed SVR increase into the CV engine
            if (st.patient.hasPreeclampsia) {
              drugSvrMod *= (1.0 + pecOutput.svrContributionFromPEC);
            }
            // Mg toxicity: respiratory depression
            if (pecOutput.mgToxicityActive && pecOutput.mgRespDepression > 0) {
              totalRrDelta -= pecOutput.mgRespDepression;
            }
            // Eclampsia seizure → triggers like existing seizure model (metabolic + consciousness)
            if (pecOutput.eclampsiaActive) {
              st.patient.seizureActive = true;
            }
          }

          // === AMNIOTIC FLUID EMBOLISM ===
          {
            const afeOutput = AmniotiFluidEmbolismModel.tick({
              afeActive: !!st.patient.afeActive,
              minutesSinceOnset: st.patient.afeActive ? (st.time - (st.patient.afeOnsetTime || st.time)) / 60 : 0,
              currentFibrinogen: st.patient.fibrinogenMgDl,
              prevAFEOnsetLogged: !!st.patient.prevAFEOnsetLogged,
              prevAFEPhase2Logged: !!st.patient.prevAFEPhase2Logged,
            });
            afeOutput.events.forEach(e => logEvent(e));
            st.patient.prevAFEOnsetLogged = afeOutput.prevAFEOnsetLogged;
            st.patient.prevAFEPhase2Logged = afeOutput.prevAFEPhase2Logged;
            if (st.patient.afeActive) {
              // Phase 1: acute cor pulmonale → massive CO drop
              drugInotropyMod *= afeOutput.cardiacOutputFraction;
              drugSvrMod *= (1 - afeOutput.svrDropFraction);
              // Phase 2: DIC → activate DIC flag for CoagulationCascadeModel
              if (afeOutput.phase2Active) {
                st.patient.isActiveDIC = true;
              }
              st.patient.afeRvFailureFraction = afeOutput.rvFailureFraction;
              st.patient.afeDicFibConsumptionRate = afeOutput.dic_fibrinogenConsumptionRate;
              st.patient.afeDicPlateletConsumptionRate = afeOutput.dic_plateletConsumptionRate;
              st.patient.afeDicFactorConsumptionRate = afeOutput.dic_factorConsumptionRate;
            } else {
              st.patient.afeRvFailureFraction = 0;
              st.patient.afeDicFibConsumptionRate = 0;
              st.patient.afeDicPlateletConsumptionRate = 0;
              st.patient.afeDicFactorConsumptionRate = 0;
            }
          }

          // === ACETAMINOPHEN HEPATOTOXICITY ===
          {
            const apapModel = (st.activeMeds || []).find(m => m.name === 'Acetaminophen');
            // Track cumulative acetaminophen dose (mg)
            if (apapModel && apapModel.Ce > 0.01) {
              if (!st.patient.apapFirstDoseTime) st.patient.apapFirstDoseTime = st.time;
            }
            const apapOutput = AcetaminophenModel.tick({
              cumulativeDoseMgPerKg: (st.patient.apapCumulativeDoseMg || 0) / (st.patient.weight || 70),
              timeSinceFirstDoseHours: st.patient.apapFirstDoseTime ? (st.time - st.patient.apapFirstDoseTime) / 3600 : 0,
              weightKg: st.patient.weight || 70,
              hasLiverDisease: !!(st.patient.cirrhosis || st.patient.hepatitis || st.patient.AST > 100),
              isAlcoholic: !!st.patient.alcoholic,
              isMalnourished: !!st.patient.malnourished,
              nacActive: !!st.patient.nacActive,
              currentAST: st.patient.AST,
              currentALT: st.patient.ALT,
              currentINR: st.patient.inr,
              prevHepToxLogged: !!st.patient.prevAPAPHepToxLogged,
              prevALFLogged: !!st.patient.prevAPAPALFLogged,
              prevNACSuccessLogged: !!st.patient.prevNACSuccessLogged,
            });
            apapOutput.events.forEach(e => logEvent(e));
            st.patient.prevAPAPHepToxLogged = apapOutput.prevHepToxLogged;
            st.patient.prevAPAPALFLogged = apapOutput.prevALFLogged;
            st.patient.prevNACSuccessLogged = apapOutput.prevNACSuccessLogged;
            // APAP hepatotoxicity feeds into hepatic engine via AST/ALT/INR contributions
            st.patient.apapAstContribution = apapOutput.astContribution;
            st.patient.apapAltContribution = apapOutput.altContribution;
            st.patient.apapInrContribution = apapOutput.inrContribution;
          }

          // === PERIOPERATIVE MI MODEL ===
          {
            const pmiOutput = PerioperativeMIModel.tick({
              hasCAD: !!(st.patient.cad || st.patient.priorMI),
              priorMI: !!st.patient.priorMI,
              hasHFrEF: !!st.patient.chf,
              diabetesPresent: !!st.patient.diabetes,
              rcriScore: st.patient.rcriScore || 0,
              currentHR: st.vitals.hr,
              currentSBP: st.vitals.sys,
              currentDBP: st.vitals.dia,
              currentMAP: st.vitals.map,
              currentHb: st.patient.hemoglobin || 14,
              currentSaO2: (st.vitals.spo2 || 98) / 100,
              currentLVEDP: st.vitals.lvedp || 8,
              currentCO: st.vitals.co,
              ischemicBurdenAccumulator: st.patient.ischemicBurdenAccumulator || 0,
              troponinNgL: st.patient.troponinNgL || 3,
              troponinPeakNgL: st.patient.troponinPeakNgL || 3,
              miActiveType1: !!st.patient.miActiveType1,
              miActiveType2: !!st.patient.miActiveType2,
              minutesSinceMIOnset: (st.patient.miActiveType1 || st.patient.miActiveType2) && st.patient.miOnsetTime
                ? (st.time - st.patient.miOnsetTime) / 60 : 0,
              prevIschemiaLogged: !!st.patient.prevIschemiaLogged,
              prevMIType1Logged: !!st.patient.prevMIType1Logged,
              prevMIType2Logged: !!st.patient.prevMIType2Logged,
              prevTroponinAlertLogged: !!st.patient.prevTroponinAlertLogged,
            });
            pmiOutput.events.forEach(e => logEvent(e));
            st.patient.ischemicBurdenAccumulator = pmiOutput.ischemicBurdenAccumulator;
            st.patient.troponinNgL = pmiOutput.troponinNgL;
            st.patient.troponinPeakNgL = pmiOutput.troponinPeakNgL;
            st.patient.prevIschemiaLogged = pmiOutput.prevIschemiaLogged;
            st.patient.prevMIType1Logged = pmiOutput.prevMIType1Logged;
            st.patient.prevMIType2Logged = pmiOutput.prevMIType2Logged;
            st.patient.prevTroponinAlertLogged = pmiOutput.prevTroponinAlertLogged;
            // Feed MI effects into CV engine
            if (pmiOutput.myocardialStunningContribution > 0) {
              st.patient.myocardialStunning = Math.min(1.0,
                (st.patient.myocardialStunning || 0) + pmiOutput.myocardialStunningContribution * 0.01);
            }
            if (pmiOutput.inotropyPenalty > 0) {
              drugInotropyMod *= (1 - pmiOutput.inotropyPenalty);
            }
          }

          // === FAT EMBOLISM SYNDROME ===
          {
            const methylpredModel = (st.activeMeds || []).find(m => m.name === 'Methylprednisolone');
            const femOutput = FatEmbolismModel.tick({
              femActive: !!st.patient.femActive,
              femTriggerType: st.patient.femTriggerType || 'fracture',
              minutesSinceOnset: st.patient.femActive && st.patient.femOnsetTime
                ? (st.time - st.patient.femOnsetTime) / 60 : 0,
              hasPFO: !!st.patient.hasPFO,
              currentPeep: (activeVentSettings && activeVentSettings.peep) || 5,
              methylprednisoloneCe: methylpredModel ? methylpredModel.Ce : 0,
              prevFEMOnsetLogged: !!st.patient.prevFEMOnsetLogged,
              prevFEMSevereLogged: !!st.patient.prevFEMSevereLogged,
            });
            femOutput.events.forEach(e => logEvent(e));
            st.patient.prevFEMOnsetLogged = femOutput.prevFEMOnsetLogged;
            st.patient.prevFEMSevereLogged = femOutput.prevFEMSevereLogged;
            // Fat embolism shunt feeds RespiratoryEngine additively (stored on patient)
            st.patient.femShuntContribution = femOutput.shuntContribution;
            st.patient.femCompliancePenalty = femOutput.compliancePenaltyFraction;
            st.patient.femResistancePenalty = femOutput.resistancePenalty;
            // Platelet consumption feeds CoagulationCascadeModel context
            st.patient.femPlateletConsumptionRate = femOutput.plateletConsumptionRate;
          }



          // === POST-DURAL PUNCTURE HEADACHE ===
          {
            const caffeineForPDPH = (st.activeMeds || []).find(m => m.name === 'Caffeine');
            const pdphHoursElapsed = st.patient.dptOccurred && st.patient.dptOccurredTime
              ? (st.time - st.patient.dptOccurredTime) / 3600 : 0;
            const pdphOutput = PDPHModel.tick({
              dptOccurred: !!st.patient.dptOccurred,
              dptNeedleGauge: st.patient.dptNeedleGauge || 17,
              dptNeedleType: st.patient.dptNeedleType || 'cutting',
              dptTimeHours: pdphHoursElapsed,
              isPregnant: !!st.patient.isPregnant,
              patientSex: st.patient.sex,
              patientAge: st.patient.age,
              isUpright: !!(st.patient.position === 'Sitting' || st.patient.position === 'Standing'),
              bloodPatchGiven: !!st.patient.bloodPatchGiven,
              bloodPatchTimeSinceDPTHours: st.patient.bloodPatchGiven && st.patient.bloodPatchTime
                ? (st.patient.bloodPatchTime - (st.patient.dptOccurredTime || st.patient.bloodPatchTime)) / 3600 : pdphHoursElapsed,
              caffeineActive: !!(caffeineForPDPH && caffeineForPDPH.Ce > 0.01),
              caffeineDose: caffeineForPDPH ? caffeineForPDPH.Ce * 100 : 0,
              prevPDPHOnsetLogged: !!st.patient.prevPDPHOnsetLogged,
              prevBloodPatchLogged: !!st.patient.prevBloodPatchLogged,
            });
            pdphOutput.events.forEach(e => logEvent(e));
            st.patient.prevPDPHOnsetLogged = pdphOutput.prevPDPHOnsetLogged;
            st.patient.prevBloodPatchLogged = pdphOutput.prevBloodPatchLogged;
            st.patient.pdphActive = pdphOutput.pdphActive;
            st.patient.pdphHeadacheNRS = pdphOutput.headacheNRS;
            // PDPH can drive sympathetic activation (pain response) → already handled by PainEngine
          }

          // === MALNUTRITION / FRAILTY ===
          {
            const mfOutput = MalnutritionFrailtyModel.tick({
              albumin: st.patient.albumin || 4.0,
              bmi: st.patient.bmi,
              weightKg: st.patient.weight,
              ibwKg: st.patient.ibw,
              isStarved: !!st.patient.isStarved,
              starvationDays: st.patient.starvationDays || 0,
              hasFrailty: !!st.patient.hasFrailty,
              frailtyScore: st.patient.frailtyScore || 0,
              ageYears: st.patient.age,
              phosphorusLevel: st.patient.phosphorusLevel || 3.5,
              aggressiveNutritionStarted: !!st.patient.aggressiveNutritionStarted,
              isMorbidlyObese: !!(st.patient.bmi && st.patient.bmi > 40),
              prevMalnutritionLogged: !!st.patient.prevMalnutritionLogged,
              prevRefeedingLogged: !!st.patient.prevRefeedingLogged,
              prevFrailtyLogged: !!st.patient.prevFrailtyLogged,
            });
            mfOutput.events.forEach(e => logEvent(e));
            st.patient.prevMalnutritionLogged = mfOutput.prevMalnutritionLogged;
            st.patient.prevRefeedingLogged = mfOutput.prevRefeedingLogged;
            st.patient.prevFrailtyLogged = mfOutput.prevFrailtyLogged;
            // Apply malnutrition drug sensitivity to the overall inotropy/resistance
            if (mfOutput.malnutritionSeverity > 0.1) {
              // Reduced albumin → more free drug → need less drug for same effect
              // This is informational — individual drug models would need to account for this
              st.patient.malnutritionDrugSensitivity = mfOutput.drugSensitivityMultiplier;
            }
          }

          // === PERIOPERATIVE GLUCOSE MANAGEMENT ===
          {
            const insulinModelForGlucose = (st.activeMeds || []).find(m => m.name === 'Insulin' || m.name === 'Regular Insulin');
            const steroidForGlucose = (st.activeMeds || []).find(m => m.name === 'Hydrocortisone' || m.name === 'Dexamethasone' || m.name === 'Methylprednisolone');
            const pgOutput = PerioperativeGlucoseModel.tick({
              currentGlucoseMgDl: st.patient.glucose || 100,
              previousGlucose: st.patient.previousGlucose || (st.patient.glucose || 100),
              insulinCe: insulinModelForGlucose ? insulinModelForGlucose.Ce : 0,
              metforminActive: !!st.patient.metforminOnDayOfSurgery,
              sglt2Active: !!st.patient.sglt2Inhibitor,
              glp1Active: !!st.patient.glp1Agonist,
              steroidCe: steroidForGlucose ? steroidForGlucose.Ce : 0,
              isDiabetic: !!st.patient.diabetes,
              isICU: st.surgicalPhase === 'PACU',
              isMajorSurgery: !!(st.patient.procedure && st.patient.procedure.length > 0),
              prevHyperlogged: !!st.patient.prevHyperglycemiaLogged,
              prevHypologged: !!st.patient.prevHypoglycemiaLogged,
              prevSGLT2Logged: !!st.patient.prevSGLT2Logged,
              prevMetforminLogged: !!st.patient.prevMetforminLogged,
            });
            pgOutput.events.forEach(e => logEvent(e));
            st.patient.prevHyperglycemiaLogged = pgOutput.prevHyperlogged;
            st.patient.prevHypoglycemiaLogged = pgOutput.prevHypologged;
            st.patient.prevSGLT2Logged = pgOutput.prevSGLT2Logged;
            st.patient.prevMetforminLogged = pgOutput.prevMetforminLogged;
            st.patient.previousGlucose = st.patient.glucose || 100;
          }

          // === MASSIVE TRANSFUSION PROTOCOL ===
          {
            const txaModelForMTP = (st.activeMeds || []).find(m => m.name === 'Tranexamic Acid (TXA)');
            const mtpOutput = MassiveTransfusionModel.tick({
              isActiveMTP: !!st.patient.isActiveMTP,
              prbcUnitsGiven: st.patient.prbcVolumeReceivedMl ? Math.round(st.patient.prbcVolumeReceivedMl / 300) : 0,
              ffpUnitsGiven: st.patient.ffpVolumeReceivedMl ? Math.round(st.patient.ffpVolumeReceivedMl / 250) : 0,
              plateletsUnitsGiven: st.patient.plateletsVolumeReceivedMl ? Math.round(st.patient.plateletsVolumeReceivedMl / 250) : 0,
              cryoUnitsGiven: st.patient.cryoVolumeReceivedMl ? Math.round(st.patient.cryoVolumeReceivedMl / 50) : 0,
              txaGiven: !!st.patient.txaGiven,
              txaTimeFromInjuryHours: st.patient.txaAdminTime ? (st.time - st.patient.txaAdminTime) / 3600 : 0,
              currentCaIonized: st.patient.calcium ? st.patient.calcium / 4.0 : 1.2,
              currentHb: st.patient.hemoglobin || 14,
              permissiveHypotension: !!st.patient.permissiveHypotension,
              hasTBI: !!(st.patient.icp && st.patient.icp > 20),
              currentMAP: st.vitals.map,
              currentTemp: st.vitals.temp,
              prevMTPLogged: !!st.patient.prevMTPLogged,
              prevTXALogged: !!st.patient.prevMTPTXALogged,
              prevCalciumLogged: !!st.patient.prevMTPCalciumLogged,
            });
            mtpOutput.events.forEach(e => logEvent(e));
            st.patient.prevMTPLogged = mtpOutput.prevMTPLogged;
            st.patient.prevMTPTXALogged = mtpOutput.prevTXALogged;
            st.patient.prevMTPCalciumLogged = mtpOutput.prevCalciumLogged;
          }

          // === LABOR EPIDURAL ===
          {
            const laborEpiOutput = LaborEpiduralModel.tick({
              laborEpiduralActive: !!st.patient.laborEpiduralActive,
              laborStage: st.patient.laborStage || 1,
              bupivacaineConcentrationPercent: st.patient.laborBupiConc || 0.0625,
              fentanylConcentrationMcgMl: st.patient.laborFentanylConc || 2,
              isCSE: !!st.patient.isCSEActive,
              currentMAP: st.vitals.map,
              currentHR: st.vitals.hr,
              hasHypotension: st.vitals.map < 65,
              highBlockSuspected: !!st.patient.highBlockSuspected,
              fetalHR: st.vitals.fetalHR || 140,
              prevLaborEpiduralLogged: !!st.patient.prevLaborEpiduralLogged,
              prevHighBlockLogged: !!st.patient.prevHighBlockLogged,
              prevFetalBradyLogged: !!st.patient.prevFetalBradyLogged,
              prevHypotensionLogged: !!st.patient.prevLaborEpiHypotensionLogged,
            });
            laborEpiOutput.events.forEach(e => logEvent(e));
            st.patient.prevLaborEpiduralLogged = laborEpiOutput.prevLaborEpiduralLogged;
            st.patient.prevHighBlockLogged = laborEpiOutput.prevHighBlockLogged;
            st.patient.prevFetalBradyLogged = laborEpiOutput.prevFetalBradyLogged;
            st.patient.prevLaborEpiHypotensionLogged = laborEpiOutput.prevHypotensionLogged;
          }

          // === CARDIOPULMONARY BYPASS ===
          {
            const heparinForCPB = (st.activeMeds || []).find(m => m.name === 'Heparin');
            const protamineForCPB = (st.activeMeds || []).find(m => m.name === 'Protamine Sulfate');
            const cpbOutput = CardiopulmonaryBypassModel.tick({
              onBypass: !!st.patient.cpbActive,
              bypassMinutesSince: st.patient.cpbActive && st.patient.cpbStartTime
                ? (st.time - st.patient.cpbStartTime) / 60 : 0,
              cpbFlowRateLMin: st.patient.cpbFlowRateLMin || 4.5,
              cpbTemperatureC: st.patient.cpbTemperatureC || 37,
              aortaClamped: !!st.patient.aortaClamped,
              primeVolumeAddedMl: st.patient.cpbPrimeVolumeMl || 1500,
              heparinCe: heparinForCPB ? heparinForCPB.Ce : 0,
              protamineCe: protamineForCPB ? protamineForCPB.Ce : 0,
              hasProtamineHistory: !!st.patient.hasProtamineHistory,
              hasNPHInsulin: !!st.patient.hasNPHInsulin,
              currentHb: st.patient.hemoglobin || 14,
              bsaM2: st.patient.bsa || 1.73,
              prevCPBOnsetLogged: !!st.patient.prevCPBOnsetLogged,
              prevClampLogged: !!st.patient.prevCPBClampLogged,
              prevProtamineLogged: !!st.patient.prevProtamineLogged,
              prevWeaningLogged: !!st.patient.prevCPBWeaningLogged,
            });
            cpbOutput.events.forEach(e => logEvent(e));
            st.patient.prevCPBOnsetLogged = cpbOutput.prevCPBOnsetLogged;
            st.patient.prevCPBClampLogged = cpbOutput.prevClampLogged;
            st.patient.prevProtamineLogged = cpbOutput.prevProtamineLogged;
            st.patient.prevCPBWeaningLogged = cpbOutput.prevWeaningLogged;
            // SIRS from CPB feeds into existing sepsis-like inflammatory response
            if (cpbOutput.sirsIndex > 0.3) {
              st.patient.cpbSirsContribution = cpbOutput.sirsIndex;
            }
          }

          // === LIVER TRANSPLANT PHYSIOLOGY ===
          {
            const ltOutput = LiverTransplantPhysiologyModel.tick({
              meldScore: st.patient.meldScore || 10,
              isALF: !!st.patient.isALF,
              hasHepPulmonarySyndrome: !!st.patient.hasHepPulmonarySyndrome,
              hasPortoPulmonaryHTN: !!st.patient.hasPoPHCollapse,
              oltPhase: st.patient.oltPhase || 'pre_anhepatic',
              anhepticDurationMinutes: st.patient.oltPhase === 'anhepatic' && st.patient.anhepticStartTimeSec
                ? (st.time - st.patient.anhepticStartTimeSec) / 60 : 0,
              reperfusionMinutesSince: st.patient.oltPhase === 'reperfusion' && st.patient.reperfusionStartTimeSec
                ? (st.time - st.patient.reperfusionStartTimeSec) / 60 : 0,
              currentINR: st.patient.inr,
              currentCreatinine: st.patient.creatinine,
              currentBilirubin: st.patient.bilirubin,
              ffpVolumeMlThisPhase: st.patient.ffpVolumeReceivedMl || 0,
              prevAnhepacticLogged: !!st.patient.prevAnhepaticLogged,
              prevReperfusionLogged: !!st.patient.prevReperfusionLogged,
              prevHPSLogged: !!st.patient.prevHPSLogged,
            });
            ltOutput.events.forEach(e => logEvent(e));
            st.patient.prevAnhepaticLogged = ltOutput.prevAnhepaticLogged;
            st.patient.prevReperfusionLogged = ltOutput.prevReperfusionLogged;
            st.patient.prevHPSLogged = ltOutput.prevHPSLogged;
            // Phase-specific hemodynamic effects
            if (st.patient.oltPhase === 'pre_anhepatic') {
              drugSvrMod *= (1 - ltOutput.svrReductionFromCirrhosis);
              drugInotropyMod *= (1 - ltOutput.esldInotropyPenalty);
            } else if (st.patient.oltPhase === 'anhepatic') {
              drugSvrMod *= (1 - ltOutput.svrReductionFromCirrhosis);
              drugInotropyMod *= (1 - ltOutput.anhepaticVRReduction * 0.5); // VR reduction → CO drop
            }
            // HPS shunt contribution
            st.patient.hpsShuntContribution = ltOutput.hpsShuntContribution;
            // Fibrinolysis in reperfusion (stored for CoagulationCascadeModel context)
            st.patient.reperfusionFibrinolysisIndex = ltOutput.fibrinolysisIndex;
          }

          // === CHRONIC OPIOID TOLERANCE + DELIRIUM ===
          {
            const benzoForDelirium = (st.activeMeds || []).find(m =>
              m.name === 'Midazolam' || m.name === 'Lorazepam' || m.name === 'Diazepam');
            const haloForDelirium = (st.activeMeds || []).find(m => m.name === 'Haloperidol');
            const dexmedForDelirium = (st.activeMeds || []).find(m => m.name === 'Dexmedetomidine');
            const cotOutput = ChronicOpioidToleranceModel.tick({
              isChronicOpioidUser: !!st.patient.isChronicOpioidUser,
              morphineEquivalentDosePerDay: st.patient.morphineEquivalentDosePerDay || 0,
              onMethadone: !!st.patient.onMethadone,
              onBuprenorphine: !!st.patient.onBuprenorphine,
              opioidWithdrawalRisk: !!st.patient.opioidWithdrawalRisk,
              prolongedHighDoseOpioidExposure: !!st.patient.isChronicOpioidUser && (st.patient.morphineEquivalentDosePerDay || 0) > 50,
              ageYears: st.patient.age,
              hasBaselineCognitivImpairment: !!st.patient.hasBaselineCognitivImpairment,
              hasFrailty: !!st.patient.hasFrailty,
              isPostoperative: st.surgicalPhase === 'PACU',
              benzodiazepineCe: benzoForDelirium ? benzoForDelirium.Ce : 0,
              haloperidolCe: haloForDelirium ? haloForDelirium.Ce : 0,
              dexmedetomidineCe: dexmedForDelirium ? dexmedForDelirium.Ce : 0,
              currentHR: st.vitals.hr,
              currentSBP: st.vitals.sys,
              prevChronicOpioidLogged: !!st.patient.prevChronicOpioidLogged,
              prevWithdrawalLogged: !!st.patient.prevWithdrawalLogged,
              prevDeliriumLogged: !!st.patient.prevDeliriumLogged,
            });
            cotOutput.events.forEach(e => logEvent(e));
            st.patient.prevChronicOpioidLogged = cotOutput.prevChronicOpioidLogged;
            st.patient.prevWithdrawalLogged = cotOutput.prevWithdrawalLogged;
            st.patient.prevDeliriumLogged = cotOutput.prevDeliriumLogged;
            st.patient.opioidToleranceMultiplier = cotOutput.opioidToleranceMultiplier;
          }

          // === CKD/ESRD PERIOPERATIVE SAFETY ===
          {
            const codeine_CKD = (st.activeMeds || []).find(m => m.name === 'Codeine');
            const mep_CKD = (st.activeMeds || []).find(m => m.name === 'Meperidine (Pethidine)');
            const morph_CKD = (st.activeMeds || []).find(m => m.name === 'Morphine');
            const gabap_CKD = (st.activeMeds || []).find(m => m.name === 'Gabapentin');
            const sux_CKD = (st.activeMeds || []).find(m => m.name === 'Succinylcholine');
            const ddavp_CKD = (st.activeMeds || []).find(m => m.name === 'Desmopressin (DDAVP)');
            const ckdOutput = CKDPerioperativeModel.tick({
              gfr: st.patient.gfr || 90,
              isOnDialysis: !!st.patient.isOnDialysis,
              daysSinceLastDialysis: st.patient.daysSinceLastDialysis || 1,
              bun: st.patient.bun || 15,
              baselineKPlus: electrolytes ? electrolytes.k : 4.0,
              baselineHb: st.patient.hemoglobin || 14,
              codeineCe: codeine_CKD ? codeine_CKD.Ce : 0,
              mepCe: mep_CKD ? mep_CKD.Ce : 0,
              morphineCe: morph_CKD ? morph_CKD.Ce : 0,
              gabapentinCe: gabap_CKD ? gabap_CKD.Ce : 0,
              succinylcholineCe: sux_CKD ? sux_CKD.Ce : 0,
              desmopressinCe: ddavp_CKD ? ddavp_CKD.Ce : 0,
              prevCKDWarningLogged: !!st.patient.prevCKDWarningLogged,
              prevUremiaPlateletLogged: !!st.patient.prevUremiaPlateletLogged,
              prevHyperKSuxLogged: !!st.patient.prevHyperKSuxCKDLogged,
            });
            ckdOutput.events.forEach(e => logEvent(e));
            st.patient.prevCKDWarningLogged = ckdOutput.prevCKDWarningLogged;
            st.patient.prevUremiaPlateletLogged = ckdOutput.prevUremiaPlateletLogged;
            st.patient.prevHyperKSuxCKDLogged = ckdOutput.prevHyperKSuxLogged;
            // MAC reduction from uremia
            if (ckdOutput.macReduction > 0) {
              // Apply uremia MAC reduction — reduce agentMac by this fraction
              // This is a patient-state field that modifies effective anesthetic depth
              st.patient.uremiaMacReduction = ckdOutput.macReduction;
            }
          }

          // === CARDIAC ARRHYTHMIA MANAGEMENT ===
          {
            const adenosineModelForArrhythmia = (st.activeMeds || []).find(m => m.name === 'Adenosine');
            const amiodaroneModelForArrhythmia = (st.activeMeds || []).find(m => m.name === 'Amiodarone');
            const lidocaineModelForArrhythmia = (st.activeMeds || []).find(m => m.name === 'Lidocaine');
            const verapamilModelForArrhythmia = (st.activeMeds || []).find(m => m.name === 'Verapamil');
            const metoprolModelForArrhythmia = (st.activeMeds || []).find(m => m.name === 'Metoprolol');
            const arrhOutput = CardiacArrhythmiaManagementModel.tick({
              cardiacRhythm: st.patient.cardiacRhythm || 'normal',
              currentHR: st.vitals.hr,
              isHemodynamicallyUnstable: st.vitals.map < 65,
              hasWPW: !!st.patient.hasWPW,
              wpwHasAF: !!st.patient.wpwHasAF,
              adenosineCe: adenosineModelForArrhythmia ? adenosineModelForArrhythmia.Ce : 0,
              verapamilCe: verapamilModelForArrhythmia ? verapamilModelForArrhythmia.Ce : 0,
              amiodaroneCe: amiodaroneModelForArrhythmia ? amiodaroneModelForArrhythmia.Ce : 0,
              lidocaineCe: lidocaineModelForArrhythmia ? lidocaineModelForArrhythmia.Ce : 0,
              metoproloLCeForAF: metoprolModelForArrhythmia ? metoprolModelForArrhythmia.Ce : 0,
              digoxinCeForAF: (() => { const m = (st.activeMeds || []).find(x => x.name === 'Digoxin'); return m ? m.Ce : 0; })(),
              vagalManeuverAttempted: !!st.patient.vagalManeuverAttempted,
              prevSVTLogged: !!st.patient.prevSVTLogged,
              prevWPWLogged: !!st.patient.prevWPWLogged,
              prevVTLogged: !!st.patient.prevVTLogged,
            });
            arrhOutput.events.forEach(e => logEvent(e));
            st.patient.prevSVTLogged = arrhOutput.prevSVTLogged;
            st.patient.prevWPWLogged = arrhOutput.prevWPWLogged;
            st.patient.prevVTLogged = arrhOutput.prevVTLogged;
          }

          // === ANGIOEDEMA + STATUS ASTHMATICUS ===
          {
            const c1InhModel = (st.activeMeds || []).find(m => m.name === 'C1-INH Concentrate');
            const icatibantModel = (st.activeMeds || []).find(m => m.name === 'Icatibant');
            const magForAsthma = (st.activeMeds || []).find(m => m.name === 'Magnesium Sulfate');
            const albuForAsthma = (st.activeMeds || []).find(m => m.name === 'Albuterol (Salbutamol)');
            const iprForAsthma = (st.activeMeds || []).find(m => m.name === 'Ipratropium');
            const epiForAngioedema = (st.activeMeds || []).find(m => m.name === 'Epinephrine');
            const ketamineModelForAsthma = (st.activeMeds || []).find(m => m.name === 'Ketamine');
            const esketamineModelForAsthma = (st.activeMeds || []).find(m => m.name === 'Esketamine');
            const localKetamineCe = (ketamineModelForAsthma ? ketamineModelForAsthma.Ce : 0) + (esketamineModelForAsthma ? esketamineModelForAsthma.Ce * 3.5 : 0);

            const angAsthOutput = AngioedemaStatusAsthmaModel.tick({
              aceInhibitorActive: !!st.patient.aceInhibitorActive,
              hasHAE: !!st.patient.hasHAE,
              angioedemaPresent: !!st.patient.angioedemaPresent,
              angioedemaMinutesSince: st.patient.angioedemaPresent && st.patient.angioedemaOnsetTime
                ? (st.time - st.patient.angioedemaOnsetTime) / 60 : 0,
              c1InhConcentrateCe: c1InhModel ? c1InhModel.Ce : 0,
              icatibantCe: icatibantModel ? icatibantModel.Ce : 0,
              epinephrineCeForAngioedema: epiForAngioedema ? epiForAngioedema.Ce : 0,
              statusAsthmaticusActive: !!st.patient.statusAsthmaticusActive,
              statusAsthmaticusMinutesSince: st.patient.statusAsthmaticusActive && st.patient.statusAsthmaticusOnsetTime
                ? (st.time - st.patient.statusAsthmaticusOnsetTime) / 60 : 0,
              ventilatedDuringAsthma: !!st.patient.airwaySecured,
              albuterolCe: albuForAsthma ? albuForAsthma.Ce : 0,
              ipratropiumCe: iprForAsthma ? iprForAsthma.Ce : 0,
              magnesiumCeForAsthma: magForAsthma ? magForAsthma.Ce : 0,
              ketamineCeForAsthma: localKetamineCe, // already computed above
              helioxActive: !!st.patient.helioxActive,
              prevAngioedemaLogged: !!st.patient.prevAngioedemaLogged,
              prevAngioedemaAirwayLogged: !!st.patient.prevAngioedemaAirwayLogged,
              prevStatusAsthmaLogged: !!st.patient.prevStatusAsthmaLogged,
              prevAutoPEEPLogged: !!st.patient.prevAutoPEEPLogged,
            });
            angAsthOutput.events.forEach(e => logEvent(e));
            st.patient.prevAngioedemaLogged = angAsthOutput.prevAngioedemaLogged;
            st.patient.prevAngioedemaAirwayLogged = angAsthOutput.prevAngioedemaAirwayLogged;
            st.patient.prevStatusAsthmaLogged = angAsthOutput.prevStatusAsthmaLogged;
            st.patient.prevAutoPEEPLogged = angAsthOutput.prevAutoPEEPLogged;
            // Angioedema upper airway resistance (feeds RespiratoryEngine existing resistance calc)
            st.patient.angioedemaResistancePenalty = angAsthOutput.uppperAirwayResistancePenalty;
            // Status asthmaticus auto-PEEP reduces CO
            if (angAsthOutput.autoPEEPCOImpact > 0) {
              drugInotropyMod *= (1 - angAsthOutput.autoPEEPCOImpact);
            }
          }

          // === CARDIAC TAMPONADE + TAKOTSUBO ===
          {
            const betaBlockerForCard = (st.activeMeds || []).find(m =>
              m.name === 'Metoprolol' || m.name === 'Esmolol' || m.name === 'Labetalol' || m.name === 'Atenolol');
            const cardOutput = AcuteCardiacEventModel.tick({
              pericardialEffusionMl: st.patient.pericardialEffusionMl || 0,
              effusionAccumulationRateMlMin: st.patient.effusionAccumulationRateMlMin || 0,
              isChronicEffusion: !!st.patient.isChronicEffusion,
              pericardiocentesisDone: !!st.patient.pericardiocentesisDone,
              pericardiocentesisVolumeMl: st.patient.pericardiocentesisVolumeMl || 0,
              takotsuboActive: !!st.patient.takotsuboActive,
              catecholamineSurgeIndex: Math.min(1, (st.patient.C_cat || 0) / 10),
              isFemalePostmenopausal: st.patient.sex === 'female' && (st.patient.age || 0) > 55,
              hasSAH: !!(st.patient.icp && st.patient.icp > 25 && st.patient.hasCerebralIschemia),
              minutesSinceTakotsuboOnset: st.patient.takotsuboActive && st.patient.takotsuboOnsetTime
                ? (st.time - st.patient.takotsuboOnsetTime) / 60 : 0,
              betaBlockerCe: betaBlockerForCard ? betaBlockerForCard.Ce : 0,
              currentCO: st.vitals.co,
              currentCVP: st.vitals.cvp,
              currentMAP: st.vitals.map,
              prevTamponadeLogged: !!st.patient.prevTamponadeLogged,
              prevTakotsuboLogged: !!st.patient.prevTakotsuboLogged,
            });
            cardOutput.events.forEach(e => logEvent(e));
            st.patient.prevTamponadeLogged = cardOutput.prevTamponadeLogged;
            st.patient.prevTakotsuboLogged = cardOutput.prevTakotsuboLogged;
            // Tamponade hemodynamic effects
            if (cardOutput.tamponadeActive) {
              totalHrDelta += cardOutput.tamponadeHRContribution;
              drugSvrMod *= (1 + cardOutput.tamponadeSVRContribution);
              drugInotropyMod *= (1 - cardOutput.tamponadeCOReduction);
            }
            // Takotsubo LV dysfunction
            if (cardOutput.takotsuboActive) {
              drugInotropyMod *= (1 - cardOutput.takotsuboInotropyPenalty);
            }
          }

          // === DIFFICULT AIRWAY ASSESSMENT ===
          {
            const dawOutput = DifficultyAirwayModel.tick({
              mallampati: st.patient.mallampati || 2,
              mouthOpeningCm: st.patient.mouthOpeningCm || 5,
              submandibularDistanceCm: st.patient.submandibularDistanceCm || 7,
              thyroMentalDistanceCm: st.patient.thyroMentalDistanceCm || 8,
              neckMobility: st.patient.neckMobility || 'normal',
              hasObstruction: !!st.patient.airwayObstructionPresent,
              isObese: !!(st.patient.bmi && st.patient.bmi > 35),
              hasFacialTrauma: !!(st.patient.trauma && st.patient.airwayBlood),
              hasCervicalSpineInjury: !!st.patient.hasSpinalCordInjuryAboveT6,
              isPregnant: !!st.patient.isPregnant,
              intubationAttemptsMade: st.patient.intubationAttemptsMade || 0,
              cormackLehaneGrade: st.patient.cormackLehaneGrade || 1,
              airwaySecured: !!st.patient.airwaySecured,
              sgaInPlace: !!st.patient.sgaInPlace,
              sgaVentilating: !!st.patient.sgaVentilating,
              currentSpO2: st.vitals.spo2,
              apneaDurationSeconds: st.patient.apneaStartTime ? st.time - st.patient.apneaStartTime : 0,
              videolaryngoscopyUsed: !!st.patient.videolaryngoscopyUsed,
              bougieTried: !!st.patient.bougieTried,
              cicoActive: !!st.patient.cicoActive,
              cricothyroidotomyDone: !!st.patient.cricothyroidotomyDone,
              prevDifficultyLogged: !!st.patient.prevDifficultyAirwayLogged,
              prevFailedLogged: !!st.patient.prevFailedIntubLogged,
              prevCICOLogged: !!st.patient.prevCICOLogged,
            });
            dawOutput.events.forEach(e => logEvent(e));
            st.patient.prevDifficultyAirwayLogged = dawOutput.prevDifficultyLogged;
            st.patient.prevFailedIntubLogged = dawOutput.prevFailedLogged;
            st.patient.prevCICOLogged = dawOutput.prevCICOLogged;
            st.patient.lemonScore = dawOutput.lemonScore;
            st.patient.airwayStrategy = dawOutput.airwayStrategy;
            // Cricothyroidotomy provides rescue ventilation (treated as airway secured for O2)
            if (dawOutput.cricothyroidotomyEfficacy > 0.7) {
              st.patient.airwaySecured = true;
            }
          }

          // === TUMOR LYSIS SYNDROME + ELECTROLYTE EFFECTS ===
          {
            const rasburicaseModel = (st.activeMeds || []).find(m => m.name === 'Rasburicase');
            const calciumGlucModel = (st.activeMeds || []).find(m => m.name === 'Calcium Gluconate');
            const magSulfModel = (st.activeMeds || []).find(m => m.name === 'Magnesium Sulfate');
            const tleOutput = TumorLysisElectrolyteModel.tick({
              tlsActive: !!st.patient.tlsActive,
              tlsMinutesSince: st.patient.tlsActive && st.patient.tlsOnsetTime
                ? (st.time - st.patient.tlsOnsetTime) / 60 : 0,
              tlsRiskLevel: st.patient.tlsRiskLevel || 'intermediate',
              allopurinolActive: !!st.patient.allopurinolActive,
              rasburicaseCe: rasburicaseModel ? rasburicaseModel.Ce : 0,
              ivFluidRateMlHr: 100, // approximate
              currentCa: st.patient.calcium || 9.5,
              currentMg: st.patient.magnesiumLevel || 1.8,
              currentNa: electrolytes ? electrolytes.na : 140,
              currentPhos: st.patient.phosphorusLevel || 3.5,
              prevNa: st.patient.prevSodiumForNaTracking || (electrolytes ? electrolytes.na : 140),
              calciumGluconateCe: calciumGlucModel ? calciumGlucModel.Ce : 0,
              magnesiumSulfateCe: magSulfModel ? magSulfModel.Ce : 0,
              prevTLSLogged: !!st.patient.prevTLSLogged,
              prevHypoCaLogged: !!st.patient.prevHypoCaLogged,
              prevHypoMgLogged: !!st.patient.prevHypoMgLogged,
              prevHypoNaLogged: !!st.patient.prevHypoNaLogged,
            });
            tleOutput.events.forEach(e => logEvent(e));
            st.patient.prevTLSLogged = tleOutput.prevTLSLogged;
            st.patient.prevHypoCaLogged = tleOutput.prevHypoCaLogged;
            st.patient.prevHypoMgLogged = tleOutput.prevHypoMgLogged;
            st.patient.prevHypoNaLogged = tleOutput.prevHypoNaLogged;
            // Track previous Na for rate monitoring
            st.patient.prevSodiumForNaTracking = electrolytes ? electrolytes.na : 140;
            // Hypocalcemia: reduce contractility
            if (tleOutput.hypocalcemiaContractilityPenalty > 0) {
              drugInotropyMod *= (1 - tleOutput.hypocalcemiaContractilityPenalty);
            }
            // Hypomagnesemia: arrhythmia risk stored on patient for QTc computation
            st.patient.hypomagnesemiaArrhythmiaRisk = tleOutput.hypomagnesemiaArrhythmiaRisk;
            st.patient.hypomagnesemiaK_Resistance = tleOutput.hypomagnesemiaK_Resistance;
            st.patient.hypocalcemiaNeuromuscularIndex = tleOutput.hypocalcemiaNeuromuscularIndex;
          }

          // === DIGOXIN TOXICITY ===
          {
            const digoxinModelForTox = (st.activeMeds || []).find(m => m.name === 'Digoxin');
            const digoxinFabModel = (st.activeMeds || []).find(m => m.name === 'Digoxin Immune Fab');
            if (digoxinModelForTox && digoxinModelForTox.Ce > 0.3) {
              const digToxOutput = DigoxinToxicityModel.tick({
                digoxinCe: digoxinModelForTox.Ce,
                currentK: electrolytes ? electrolytes.k : 4.0,
                currentMg: st.patient.magnesiumLevel || 1.8,
                currentCa: st.patient.calcium || 9.5,
                hasRenalInsufficiency: !!(st.patient.gfr && st.patient.gfr < 30),
                digoxinFabCe: digoxinFabModel ? digoxinFabModel.Ce : 0,
                prevDigoxinToxLogged: !!st.patient.prevDigoxinToxLogged,
                prevDigoxinSevereLogged: !!st.patient.prevDigoxinSevereLogged,
              });
              digToxOutput.events.forEach(e => logEvent(e));
              st.patient.prevDigoxinToxLogged = digToxOutput.prevDigoxinToxLogged;
              st.patient.prevDigoxinSevereLogged = digToxOutput.prevDigoxinSevereLogged;
              if (digToxOutput.toxicityActive) {
                totalHrDelta += digToxOutput.bradycardiaContribution;
                // Hyperkalemia from Na/K-ATPase failure
                if (digToxOutput.hyperkalemiaContribution > 0 && electrolytes) {
                  electrolytes.k = Math.min(8.0, (electrolytes.k || 4.0) + digToxOutput.hyperkalemiaContribution * 0.001);
                }
              }
            }
          }

          // === HYPERTENSIVE EMERGENCY + AORTIC DISSECTION ===
          {
            const esmololForHTN = (st.activeMeds || []).find(m => m.name === 'Esmolol');
            const labetalolForHTN = (st.activeMeds || []).find(m => m.name === 'Labetalol');
            const nicardipineForHTN = (st.activeMeds || []).find(m => m.name === 'Nicardipine');
            const ntgForHTN = (st.activeMeds || []).find(m => m.name === 'Nitroglycerin');
            const snpForHTN = (st.activeMeds || []).find(m => m.name === 'Nitroprusside');
            const hydralazineForHTN = (st.activeMeds || []).find(m => m.name === 'Hydralazine');
            const htnOutput = HypertensiveEmergencyModel.tick({
              currentSBP: st.vitals.sys,
              currentDBP: st.vitals.dia,
              currentMAP: st.vitals.map,
              currentHR: st.vitals.hr,
              hasKnownHTN: !!st.patient.htn,
              aorticDissectionPresent: !!st.patient.aorticDissectionPresent,
              dissectionType: st.patient.dissectionType || 'B',
              coronaryInvolved: !!st.patient.dissectionCoronaryInvolved,
              pericardalTamponade: !!st.patient.pericardialTamponade,
              esmololCe: esmololForHTN ? esmololForHTN.Ce : 0,
              labetalolCe: labetalolForHTN ? labetalolForHTN.Ce : 0,
              nicardipineCe: nicardipineForHTN ? nicardipineForHTN.Ce : 0,
              nitroglyceriCe: ntgForHTN ? ntgForHTN.Ce : 0,
              nitroprussideCe: snpForHTN ? snpForHTN.Ce : 0,
              hydralazineCe: hydralazineForHTN ? hydralazineForHTN.Ce : 0,
              hasEncephalopathy: !!(st.vitals.map > 130),
              prevHyperEmergencyLogged: !!st.patient.prevHyperEmergencyLogged,
              prevDissectionLogged: !!st.patient.prevDissectionLogged,
              prevEncephalopathyLogged: !!st.patient.prevEncephalopathyLogged,
            });
            htnOutput.events.forEach(e => logEvent(e));
            st.patient.prevHyperEmergencyLogged = htnOutput.prevHyperEmergencyLogged;
            st.patient.prevDissectionLogged = htnOutput.prevDissectionLogged;
            st.patient.prevEncephalopathyLogged = htnOutput.prevEncephalopathyLogged;
          }

          // === SICKLE CELL DISEASE ===
          {
            if (st.patient.hasSickleCellDisease) {
              const scdOutput = SickleCellModel.tick({
                rng,
                hasSickleCellDisease: true,
                hbSPercent: st.patient.hbSPercent || 85,
                currentSpO2: st.vitals.spo2,
                currentTemp: st.vitals.temp,
                currentHb: st.patient.hemoglobin || 8,
                isHydrated: (safeIntravascularVolume || 0) > 0 || !st.patient.npoSolids,
                currentPH: electrolytes ? (electrolytes.ph || 7.4) : 7.4,
                hasActiveInfection: !!(st.patient.infectionType && st.patient.isSeptic),
                tourniquetActive: !!st.patient.tourniquetActive,
                vocActive: !!st.patient.vocActive,
                acsActive: !!st.patient.acsActive,
                acsMinutesSinceOnset: st.patient.acsActive && st.patient.acsOnsetTime
                  ? (st.time - st.patient.acsOnsetTime) / 60 : 0,
                hydroxyureaActive: false, // not commonly given during acute surgery
                o2Supplemental: (deliveredFiO2 || 0.21) > 0.21,
                prevVOCLogged: !!st.patient.prevVOCLogged,
                prevACSLogged: !!st.patient.prevACSLogged,
              });
              scdOutput.events.forEach(e => logEvent(e));
              st.patient.prevVOCLogged = scdOutput.prevVOCLogged;
              st.patient.prevACSLogged = scdOutput.prevACSLogged;
              // ACS shunt + compliance → feeds RespiratoryEngine
              st.patient.acsShuntContribution = scdOutput.acsShuntContribution;
              st.patient.acsCompliancePenalty = scdOutput.acsCompliancePenalty;
            } else {
              st.patient.acsShuntContribution = 0;
              st.patient.acsCompliancePenalty = 0;
            }
          }

          // === ACUTE PORPHYRIA ===
          {
            if (st.patient.hasAcutePorphyria) {
              const thiopentalMod = (st.activeMeds || []).find(m => m.name === 'Thiopental');
              const metronidazoleMod = (st.activeMeds || []).find(m => m.name === 'Metronidazole');
              const porphOutput = AcutePorphyriaModel.tick({
                hasAcutePorphyria: true,
                currentlyActive: !!st.patient.porphyriaAttackActive,
                thiopentalCe: thiopentalMod ? thiopentalMod.Ce : 0,
                metronidazoleCe: metronidazoleMod ? metronidazoleMod.Ce : 0,
                attackMinutesSince: st.patient.porphyriaAttackActive && st.patient.porphyriaAttackStartTime
                  ? (st.time - st.patient.porphyriaAttackStartTime) / 60 : 0,
                heminGiven: !!st.patient.heminGiven,
                offendingDrugStopped: !thiopentalMod,
                prevPorphyriaLogged: !!st.patient.prevPorphyriaLogged,
                prevParalysisLogged: !!st.patient.prevPorphyriaParalysisLogged,
              });
              porphOutput.events.forEach(e => logEvent(e));
              st.patient.prevPorphyriaLogged = porphOutput.prevPorphyriaLogged;
              st.patient.prevPorphyriaParalysisLogged = porphOutput.prevParalysisLogged;
              if (porphOutput.porphyriaActive) {
                st.patient.porphyriaAttackActive = true;
                if (!st.patient.porphyriaAttackStartTime) st.patient.porphyriaAttackStartTime = st.time;
                // Autonomic effects
                totalHrDelta += porphOutput.hrContribution;
                drugSvrMod *= (1 + porphOutput.svrContribution);
                // Respiratory paralysis → reduces effective RR
                if (porphOutput.respiratoryParalysisRisk > 0.2) {
                  totalRrDelta -= porphOutput.respiratoryParalysisRisk * 8;
                }
              }
            }
          }

          // === TACO (TRANSFUSION-ASSOCIATED CIRCULATORY OVERLOAD) ===
          {
            const furosemideModelForTACO = (st.activeMeds || []).find(m => m.name === 'Furosemide');
            const tacoOutput = TACOModel.tick({
              prbcVolumeReceivedMl: st.patient.prbcVolumeReceivedMl || 0,
              ffpVolumeReceivedMl: st.patient.ffpVolumeReceivedMl || 0,
              plateletsVolumeReceivedMl: st.patient.plateletsVolumeReceivedMl || 0,
              cryoVolumeReceivedMl: st.patient.cryoVolumeReceivedMl || 0,
              transfusionRateMlPerHr: 150, // default
              hasChf: !!(st.patient.chf),
              ef: st.patient.ef || 60,
              hasRenalInsufficiency: !!(st.patient.ckd || (st.patient.gfr && st.patient.gfr < 45)),
              ageYears: st.patient.age,
              weightKg: st.patient.weight,
              isFluidOverloaded: (safeIntravascularVolume || 0) > 2000,
              currentCVP: st.vitals.cvp || 6,
              currentMAP: st.vitals.map,
              currentSpo2: st.vitals.spo2,
              currentLVEDP: st.vitals.lvedp || 8,
              furosemideCe: furosemideModelForTACO ? furosemideModelForTACO.Ce : 0,
              prevTACOLogged: !!st.patient.prevTACOLogged,
              prevTACOSevereLogged: !!st.patient.prevTACOSevereLogged,
            });
            tacoOutput.events.forEach(e => logEvent(e));
            st.patient.prevTACOLogged = tacoOutput.prevTACOLogged;
            st.patient.prevTACOSevereLogged = tacoOutput.prevTACOSevereLogged;
            if (tacoOutput.tacoActive) {
              drugSvrMod *= (1 + tacoOutput.svrContribution); // HTN from volume overload
              // Store respiratory penalties for RespiratoryEngine
              st.patient.tacoCompliancePenalty = tacoOutput.compliancePenalty;
              st.patient.tacoShuntContribution = tacoOutput.shuntContribution;
              st.patient.tacoResistancePenalty = tacoOutput.resistancePenalty;
            } else {
              st.patient.tacoCompliancePenalty = 0;
              st.patient.tacoShuntContribution = 0;
              st.patient.tacoResistancePenalty = 0;
            }
          }

          // === HYPERKALEMIA TREATMENT CHAIN ===
          // When K+ is elevated and appropriate drugs are present, model the K+-lowering effects
          // Treatment hierarchy (each acts independently and additively):
          // 1. Calcium gluconate: membrane stabilizer (no K+ change, protects heart)
          // 2. Insulin + D50W: intracellular K+ shift (~0.5-1.5 mEq/L over 30 min)
          // 3. Albuterol (IV or inhaled): beta-2 mediated K+ shift (~1.0-1.5 mEq/L)
          // 4. Sodium bicarbonate: K+ shift via Na-H antiporter (most effective in acidosis)
          // 5. Furosemide: renal K+ excretion (slower: 30-60 min)
          {
            const currentK = electrolytes ? electrolytes.k : 4.0;
            if (currentK > 5.5) {
              const insulinModelForHK = (st.activeMeds || []).find(m => m.name === 'Insulin');
              const albuterolModelForHK = (st.activeMeds || []).find(m => m.name === 'Albuterol (Salbutamol)');
              const bicarb_HK = (st.activeMeds || []).find(m => m.name === 'Sodium Bicarbonate');
              const furo_HK = (st.activeMeds || []).find(m => m.name === 'Furosemide');
              const calcG_HK = (st.activeMeds || []).find(m => m.name === 'Calcium Gluconate');

              // Insulin: K+ shift per second → ~0.01-0.03 mEq/L per tick (peaks at 30 min)
              let kShiftPerSec = 0;
              if (insulinModelForHK && insulinModelForHK.Ce > 0.02) {
                const insulinEffect = Math.min(0.03, insulinModelForHK.Ce * 0.008); // mEq/L per sec
                kShiftPerSec += insulinEffect;
              }
              // Albuterol (IV/inhaled): beta-2 → K+ into cells
              if (albuterolModelForHK && albuterolModelForHK.Ce > 0.01) {
                const albuterolEffect = Math.min(0.025, albuterolModelForHK.Ce * 0.01);
                kShiftPerSec += albuterolEffect;
              }
              // Bicarbonate: K+ shift (amplified when pH < 7.3)
              if (bicarb_HK && bicarb_HK.Ce > 0.01) {
                const pH = electrolytes ? (electrolytes.ph || 7.4) : 7.4;
                const acidModifier = Math.max(1, (7.4 - pH) * 3); // larger effect in acidosis
                kShiftPerSec += Math.min(0.02, bicarb_HK.Ce * 0.005 * acidModifier);
              }
              // Furosemide: renal excretion (slower, proportional to dose)
              if (furo_HK && furo_HK.Ce > 0.05) {
                kShiftPerSec += Math.min(0.005, furo_HK.Ce * 0.001);
              }

              if (kShiftPerSec > 0 && electrolytes) {
                const newK = Math.max(3.0, currentK - kShiftPerSec);
                electrolytes.k = newK;
              }

              // Calcium gluconate: protective against arrhythmia (no K+ change, but vital)
              if (currentK > 6.5 && !(calcG_HK && calcG_HK.Ce > 0.01) && !st.patient.hyperkKCalciumWarned) {
                logEvent('⚠️ SEVERE HYPERKALEMIA: K⁺ ' + currentK.toFixed(1) + ' mEq/L. CALCIUM GLUCONATE 1-3g IV (10% solution) → stabilizes myocardial membrane (prevents VF) — does NOT lower K⁺. Give FIRST before insulin/albuterol/bicarb. Then: Insulin 10U + D50W 50mL IV → shifts K⁺ intracellularly (~0.5-1.5 mEq/L over 30 min). Albuterol 20mg neb or 0.5mg IV → beta-2 shift (~1 mEq/L). NaHCO3 if acidotic. Furosemide if adequate renal function.');
                st.patient.hyperkKCalciumWarned = true;
              }
              if (currentK < 6.0) st.patient.hyperkKCalciumWarned = false;
            } else {
              st.patient.hyperkKCalciumWarned = false;
            }
          }

          // === TOXIDROME MODEL ===
          {
            const atropineModelForTox = (st.activeMeds || []).find(m => m.name === 'Atropine');
            const scopolamineModelForTox = (st.activeMeds || []).find(m => m.name === 'Scopolamine');
            const diphModelForTox = (st.activeMeds || []).find(m => m.name === 'Diphenhydramine');
            const promModelForTox = (st.activeMeds || []).find(m => m.name === 'Promethazine');
            const glycModelForTox = (st.activeMeds || []).find(m => m.name === 'Glycopyrrolate');
            const neostModelForTox = (st.activeMeds || []).find(m => m.name === 'Neostigmine');
            const physModelForTox = (st.activeMeds || []).find(m => m.name === 'Physostigmine');
            const edroModelForTox = (st.activeMeds || []).find(m => m.name === 'Edrophonium');
            const pralidoximeModelForTox = (st.activeMeds || []).find(m => m.name === 'Pralidoxime (2-PAM)');
            // Pralidoxime reactivates AChE — reduces effective organophosphate concentration
            if (pralidoximeModelForTox && pralidoximeModelForTox.Ce > 0.2 && st.patient.organophosphateConcentration > 0) {
              const reactivationRate = pralidoximeModelForTox.Ce * 0.005; // per second
              st.patient.organophosphateConcentration = Math.max(0, st.patient.organophosphateConcentration - reactivationRate);
            }
            const toxOutput = ToxidromeModel.tick({
              atropineCe: atropineModelForTox ? atropineModelForTox.Ce : 0,
              scopolamineCe: scopolamineModelForTox ? scopolamineModelForTox.Ce : 0,
              diphenhydramineCe: diphModelForTox ? diphModelForTox.Ce : 0,
              promethazineCe: promModelForTox ? promModelForTox.Ce : 0,
              glycopyrrolateCe: glycModelForTox ? glycModelForTox.Ce : 0,
              neostigmineCe: neostModelForTox ? neostModelForTox.Ce : 0,
              physostigmineCe: physModelForTox ? physModelForTox.Ce : 0,
              edrophoniumCe: edroModelForTox ? edroModelForTox.Ce : 0,
              organophosphatePoisoning: !!st.patient.organophosphatePoisoning,
              organophosphateConcentration: st.patient.organophosphateConcentration || 0,
              currentHR: st.vitals.hr,
              currentTemp: st.vitals.temp,
              currentSpO2: st.vitals.spo2,
              prevAnticholinLogged: !!st.patient.prevAnticholinLogged,
              prevCholinergicLogged: !!st.patient.prevCholinergicLogged,
              prevCholinergicSevereLogged: !!st.patient.prevCholinergicSevereLogged,
            });
            toxOutput.events.forEach(e => logEvent(e));
            st.patient.prevAnticholinLogged = toxOutput.prevAnticholinLogged;
            st.patient.prevCholinergicLogged = toxOutput.prevCholinergicLogged;
            st.patient.prevCholinergicSevereLogged = toxOutput.prevCholinergicSevereLogged;
            // Anticholinergic: tachycardia, hyperthermia, mild vasodilation
            if (toxOutput.anticholinergicActive) {
              totalHrDelta += toxOutput.anticholinergicHREffect;
              // Temperature effect stored for ThermoregulationModel
              st.patient.anticholinergicTempBonus = toxOutput.anticholinergicTempEffect;
              drugSvrMod *= (1 + toxOutput.anticholinergicSVREffect);
            } else {
              st.patient.anticholinergicTempBonus = 0;
            }
            // Cholinergic: bradycardia, bronchospasm, secretions
            if (toxOutput.cholinergicActive) {
              totalHrDelta += toxOutput.cholinergicHREffect;
              drugSvrMod *= (1 + toxOutput.cholinergicSVREffect);
              // Feed bronchospasm into existing bronchialSmoothMuscleCa pathway
              st.patient.bronchialSmoothMuscleCa = Math.min(1.0,
                (st.patient.bronchialSmoothMuscleCa || 0) + toxOutput.cholinergicBronchospasmContribution);
              st.patient.cholinergicResistancePenalty = toxOutput.cholinergicResistancePenalty;
            } else {
              st.patient.cholinergicResistancePenalty = 0;
            }
          }

          // === CAROTID ENDARTERECTOMY + REPERFUSION SYNDROME ===
          {
            const ceaOut = CarotidEndCerebralModel.tick({
              ceaActive: !!st.patient.ceaActive,
              carotidClamped: !!st.patient.carotidClamped,
              carotidShuntInPlace: !!st.patient.carotidShuntInPlace,
              carotidStumpPressureMmHg: st.patient.carotidStumpPressureMmHg || 60,
              ipsilateralRSO2Baseline: st.patient.ipsilateralRSO2Baseline || 68,
              ipsilateralRSO2Current: st.patient.rso2 || st.vitals.rso2 || 68,
              currentMAP: st.vitals.map,
              carotidBodyManipulation: !!st.patient.carotidBodyManipulation,
              reperfusionActive: !!st.patient.reperfusionActive,
              reperfusionType: st.patient.reperfusionType || 'hepatic',
              ischemicDurationMinutes: st.patient.ischemicDurationMinutes || 0,
              reperfusionTimeSec: st.patient.reperfusionActive && st.patient.reperfusionStartTime
                ? st.time - st.patient.reperfusionStartTime : 0,
              coldPreservationSolution: !!st.patient.coldPreservationSolution,
              preservationKMEqL: st.patient.preservationKMEqL || 115,
              prevClampLogged: !!st.patient.prevCEAClampLogged,
              prevIschEmiaLogged: !!st.patient.prevCEAIschemiaLogged,
              prevReperfusionLogged: !!st.patient.prevReperfusionLogged,
              prevHyperperfusionLogged: !!st.patient.prevHyperperfusionLogged,
              prevCarotidBodyLogged: !!st.patient.prevCarotidBodyLogged,
            });
            ceaOut.events.forEach(e => logEvent(e));
            st.patient.prevCEAClampLogged = ceaOut.prevClampLogged;
            st.patient.prevCEAIschemiaLogged = ceaOut.prevIschEmiaLogged;
            st.patient.prevReperfusionLogged = ceaOut.prevReperfusionLogged;
            st.patient.prevHyperperfusionLogged = ceaOut.prevHyperperfusionLogged;
            st.patient.prevCarotidBodyLogged = ceaOut.prevCarotidBodyLogged;
            // CEA: carotid body vagal bradycardia
            if (ceaOut.carotidBodyVagalEffect !== 0) {
              totalHrDelta += ceaOut.carotidBodyVagalEffect;
            }
            // Reperfusion: hypotension, K+ spike, acidosis
            if (ceaOut.reperfusionSyndromeSeverity > 0) {
              drugSvrMod *= (1.0 - ceaOut.reperfusionHypotensionFraction);
              drugInotropyMod *= (1.0 - ceaOut.reperfusionSyndromeSeverity * 0.3);
              // K+ spike to electrolytes
              const currentElK = (electrolytes ? electrolytes.k : 4.0) || 4.0;
              if (ceaOut.reperfusionKPulse > 0 && electrolytes) {
                st.patient._reperfKPulse = ceaOut.reperfusionKPulse;
              }
            } else {
              st.patient._reperfKPulse = 0;
            }
          }

          // ClinicalScoringEngine: ACT, Modified Aldrete, Pre-Extubation, ASA, SOFA
          // Uses current vitals and patient state -- computed early enough to store on patient
          const clinicalScores = ClinicalScoringEngine.compute({
              heparinCe: ((st.activeMeds || []).find(m => m.name === 'Heparin') || {Ce:0}).Ce || 0,
              plateletCountK: st.patient.plateletCount || 250,
              temperature: st.vitals.temp || 37,
              antithrombinLevel: 1.0,
              vitals_spo2: st.vitals.spo2 || 98,
              vitals_map: st.vitals.map || 90,
              baselineMap: st.patient.MAP_set || 90,
              vitals_rr: st.vitals.rr || 14,
              consciousnessLevel: 1 - Math.min(1, currentMac * 0.6 + opioidEff * 0.4),
              canMoveAllLimbs: maxNMJOccupancy < 0.3,
              breathesDeep: (st.vitals.rr || 0) >= 10,
              tidalVolumeMlPerKgIBW: st.vitals.vte && st.patient.ibw ? st.vitals.vte / st.patient.ibw : 0,
              fio2Current: deliveredFiO2 || 0.21,
              etco2Current: st.vitals.etco2 || 38,
              baselinePaCO2: st.patient.isPregnant ? 32 : st.patient.copd ? 50 : 40,
              tofRatio: st.vitals.tofRatio || 1.0,
              isHemodynamicallyStable: (st.vitals.map || 0) > 60,
              temperatureForExtubation: st.vitals.temp || 37,
              patient_htn: !!st.patient.htn,
              patient_dm: !!st.patient.diabetes,
              patient_cad: !!st.patient.cad,
              patient_chf: !!st.patient.chf,
              patient_ef: st.patient.ef || 65,
              patient_copd: !!st.patient.copd,
              patient_bmi: st.patient.bmi || 22,
              patient_ckd: st.patient.akiStage > 0 || !!st.patient.ckd,
              patient_creatinine: st.patient.creatinine || 0.9,
              patient_cirrhosis: !!st.patient.cirrhosis,
              patient_inr: st.patient.inr || 1.0,
              patient_septic: !!st.patient.isSeptic,
              patient_trauma: !!st.patient.trauma,
              emergent_surgery: !!st.patient.emergentRSI,
              pao2: st.vitals.pao2 || 100,
              fio2: deliveredFiO2 || 0.21,
              plateletCountK_sofa: st.patient.plateletCount || 250,
              bilirubinMgDl: st.patient.bilirubin || 0.8,
              mapMmHg: st.vitals.map || 90,
              vasopressorRequired: !!(((st.activeMeds || []).find(m => m.name === 'Norepinephrine')) || ((st.activeMeds || []).find(m => m.name === 'Vasopressin'))),
              norepinephrineDose: 0,
              glasgowComaScore: 15 - Math.round(currentMac * 5 + opioidEff * 4),
              creatinineMgDl: st.patient.creatinine || 0.9,
              urineOutputMlHr: st.patient.urineOutputRate || 50
          });
          // Store computed clinical scores on patient for display
          st.patient.actSeconds = clinicalScores.actSeconds;
          st.patient.actSafeForBypass = clinicalScores.actSafeForBypass;
          st.patient.aldreteScore = clinicalScores.aldreteTotal;
          st.patient.aldreteReadyForDischarge = clinicalScores.aldreteReadyForDischarge;
          st.patient.extubationAllCriteriaMet = clinicalScores.extubationCriteria.allMet;
          st.patient.extubationFailedCriteria = clinicalScores.extubationCriteria.failedCriteria;
          st.patient.asaPhysicalStatus = clinicalScores.asaPhysicalStatus;
          st.patient.sofaTotal = clinicalScores.sofaTotal;



          // MAOI Drug Interaction Model -- the most dangerous drug interaction in anesthesia
          const meperidineModelForMAOI = (st.activeMeds || []).find(m => m.name === 'Meperidine (Pethidine)');
          const tramadolModelForMAOI = (st.activeMeds || []).find(m => m.name === 'Tramadol');
          const ephedrineModelForMAOI = (st.activeMeds || []).find(m => m.name === 'Ephedrine');
          const phenylModelForMAOI = (st.activeMeds || []).find(m => m.name === 'Phenylephrine');
          const methyleneBlueModelForMAOI = (st.activeMeds || []).find(m => m.name === 'Methylene Blue');
          const maoiOutput = MAOIModel.tick({
              maoisActive: !!st.patient.maoisActive,
              maoiWashoutDaysRemaining: st.patient.maoiWashoutDaysRemaining || 0,
              meperidineCe: meperidineModelForMAOI ? meperidineModelForMAOI.Ce : 0,
              tramadolCe: tramadolModelForMAOI ? tramadolModelForMAOI.Ce : 0,
              fentanylCe: ((st.activeMeds || []).find(m => m.name === 'Fentanyl') || {Ce:0}).Ce || 0,
              ephedrineCe: ephedrineModelForMAOI ? ephedrineModelForMAOI.Ce : 0,
              phenylephrineCe: phenylModelForMAOI ? phenylModelForMAOI.Ce : 0,
              methylene_blue_Ce: methyleneBlueModelForMAOI ? methyleneBlueModelForMAOI.Ce : 0,
              prevSerotoninSyndromeLogged: !!st.patient.maoiSerotoninLogged,
              prevHypertensiveCrisisLogged: !!st.patient.maoiHypertensiveLogged
          });
          if (maoiOutput.events && maoiOutput.events.length > 0) {
              maoiOutput.events.forEach(evt => logEvent(evt));
          }
          st.patient.maoiSerotoninLogged = maoiOutput.prevSerotoninSyndromeLogged;
          st.patient.maoiHypertensiveLogged = maoiOutput.prevHypertensiveCrisisLogged;
          st.patient.maoisCrisisActive = maoiOutput.serotoninSyndromeActive || maoiOutput.hypertensiveCrisisActive;
          // MAOI hemodynamic consequences
          if (maoiOutput.serotoninSyndromeActive || maoiOutput.hypertensiveCrisisActive) {
              totalHrDelta += maoiOutput.serotoninHRMod;
              drugSvrMod *= (1 + maoiOutput.serotoninSVRMod);
          }
          // MAOI hypertensive crisis: massive SVR spike from catecholamine storm
          // Applied via vasomotorSvrContribution-equivalent (additive channel to targetSVR)
          const maoiSVRSpikeContribution = maoiOutput.hypertensiveCrisisActive ? maoiOutput.hypertensiveSVRSpike : 0;

          // Phase 6H: Drug Interactions -- CYP3A4 DDI and QT prolongation matrix
          const fluconazoleModelForDDI = (st.activeMeds || []).find(m => m.name === 'Fluconazole');
          const ondansetronModelForDDI = (st.activeMeds || []).find(m => m.name === 'Ondansetron');
          const ddiOutput = DrugInteractionModel.tick({
              fluconazoleCe: fluconazoleModelForDDI ? fluconazoleModelForDDI.Ce : 0,
              rifampicinChronic: !!st.patient.rifampicinChronic,
              carbamazepineChronic: !!st.patient.carbamazepineChronic,
              ondansetronCe: ondansetronModelForDDI ? ondansetronModelForDDI.Ce : 0,
              ciprofloxacinCe: ((st.activeMeds || []).find(m => m.name === 'Ciprofloxacin') || {Ce:0}).Ce || 0,
              metronidazoleCe: ((st.activeMeds || []).find(m => m.name === 'Metronidazole') || {Ce:0}).Ce || 0,
              baselineQTcMs: st.patient.qtcBaseline || 420,
              prevTorsadesWarningLogged: !!st.patient.torsadesWarningLogged
          });
          if (ddiOutput.events && ddiOutput.events.length > 0) {
              ddiOutput.events.forEach(evt => logEvent(evt));
          }
          st.patient.torsadesWarningLogged = ddiOutput.prevTorsadesWarningLogged;
          st.patient.estimatedQTcMs = ddiOutput.estimatedAbsoluteQTcMs;
          st.patient.cyp3a4ActivityMultiplier = ddiOutput.cyp3a4ActivityMultiplier;

          // Phase 6G: Neuraxial PK (baricity, spread, IT opioid rostral migration)
          if (st.patient.spinalBaricityType || st.patient.intrathecalMorphineMg > 0 || st.patient.intrathecalFentanylMcg > 0 || st.patient.epiduralMorphineCe > 0) {
              const neuraxialOutput = NeuraxialPKModel.tick({
                  spinalBaricityType: st.patient.spinalBaricityType,
                  injectionPosition: st.patient.spinalInjectionPosition || pos,
                  currentPosition: pos,
                  minutesSinceInjection: st.patient.spinalInjectionTime !== undefined ? (st.time - st.patient.spinalInjectionTime) / 60 : 0,
                  intrathecalMorphineMg: st.patient.intrathecalMorphineMg || 0,
                  intrathecalFentanylMcg: st.patient.intrathecalFentanylMcg || 0,
                  epiduralFentanylCe: 0, // would come from activeMeds, not tracked separately
                  prevRostralMorphineConcentration: st.patient.rostralMorphineConcentration,
                  prevRespiratoryDepressionFromMorphine: !!st.patient.itMorphineRespDepression,
                  prevHighSpinalLogged: !!st.patient.prevHighSpinalLogged,
                  isPregnant: !!st.patient.isPregnant
              });
              if (neuraxialOutput.events && neuraxialOutput.events.length > 0) {
                  neuraxialOutput.events.forEach(evt => logEvent(evt));
              }
              st.patient.neuraxialBlockLevel = neuraxialOutput.predictedBlockLevel;
              st.patient.highSpinalRisk = neuraxialOutput.highSpinalRisk;
              st.patient.rostralMorphineConcentration = neuraxialOutput.rostralMorphineConcentration;
              st.patient.itMorphineRespDepression = neuraxialOutput.respiratoryDepressionFromMorphine;
              st.patient.prevHighSpinalLogged = neuraxialOutput.prevHighSpinalLogged;
              // IT morphine RR delta deferred to where totalRrDelta is accumulated
              st.patient.itMorphineRrDelta = neuraxialOutput.respiratoryDepressionFromMorphine ? -6 * neuraxialOutput.rostralMorphineConcentration : 0;

              // === HIGH / TOTAL SPINAL CONSEQUENCES ===
              // NeuraxialPKModel fires a narrative event and sets highSpinalRisk=true when
              // predicted block level ≤ T4 (thoracic level 4), but previously applied NO
              // hemodynamic or respiratory penalties. Wire those now.
              if (st.patient.highSpinalRisk) {
                  const blockLevel = st.patient.neuraxialBlockLevel; // 1=C1 ... 12=T1 ... 28=L5
                  // Cardiac accelerator block (T1-T4 = levels 12-15 in dermatome numbering):
                  // Vagal dominance → bradycardia + decreased inotropy + SVR reduction
                  if (blockLevel !== undefined && blockLevel <= 15) {
                      totalHrDelta -= 18; // cardiac accelerator blocked → bradycardia
                      drugSvrMod *= 0.60; // high sympathectomy → vasodilation
                      drugInotropyMod *= 0.75; // cardiac sympatholysis
                  }
                  // Phrenic nerve block (C3-C5 = levels ~3-5): apnea
                  // Cervical levels map approximately: level ≤ 6 in NeuraxialPKModel notation
                  if (blockLevel !== undefined && blockLevel <= 6) {
                      totalRrDelta -= 14; // approaching phrenic block → hypoventilation → apnea
                      if (!st.patient.highSpinalApneaLogged) {
                          logEvent('🚨 TOTAL SPINAL / PHRENIC NERVE BLOCK: Neuraxial block has reached cervical dermatomes (C3-C5 = phrenic nerve). RESPIRATORY PARALYSIS imminent — secure airway IMMEDIATELY. Phenylephrine/ephedrine for hypotension; atropine for bradycardia. Maintain CO with vasopressors. If patient loses consciousness: RSI now. This is a life-threatening emergency requiring simultaneous airway management and hemodynamic resuscitation.');
                          st.patient.highSpinalApneaLogged = true;
                      }
                  }
              } else {
                  st.patient.highSpinalApneaLogged = false;
              }
          }

          // === ISB PHRENIC NERVE PALSY ===
          // Interscalene brachial plexus block: 100% incidence of ipsilateral phrenic nerve
          // palsy (C3-C5 roots blocked) → hemidiaphragm paralysis → 25% FVC reduction.
          // Clinically tolerated by healthy patients; hazardous in COPD, contralateral palsy,
          // or if patient requires high FiO2 to maintain SpO2. Horner's syndrome (ptosis/
          // miosis/anhidrosis) from stellate ganglion spread in ~25% of ISB.
          // (Neal JM, Anesthesiology 2002; Urmey WF, Anesth Analg 1991)
          if (st.patient.isbActive) {
            // ~25% compliance reduction from loss of ipsilateral hemidiaphragm contribution
            const isbCompliancePenalty = 0.22;
            // Store for RespiratoryEngine (similar to other compliance penalties)
            st.patient.isbCompliancePenalty = isbCompliancePenalty;
            if (!st.patient.isbPhrenicPalsyLogged) {
              logEvent('⚠️ ISB PHRENIC NERVE PALSY: Interscalene block has caused 100% ipsilateral hemidiaphragm paralysis (C3-C5 involvement). FVC reduced ~25%. In healthy patients: usually tolerated. CAUTION: COPD (FEV1 < 50%), contralateral phrenic palsy, or high ventilatory demand. Monitor SpO2 closely. Horner\'s syndrome (ptosis/miosis/anhidrosis) may develop from stellate ganglion spread (~25% incidence). Hoarseness from recurrent laryngeal nerve involvement (~12%). Voice changes resolve with block.');
              st.patient.isbPhrenicPalsyLogged = true;
            }
          } else {
            st.patient.isbCompliancePenalty = 0;
          }

          // Pulmonary Embolism Model -- intraoperative PE crisis
          const peModel_heparinModel = (st.activeMeds || []).find(m => m.name === 'Heparin');
          const peOutput = PulmonaryEmbolismModel.tick({
              active: !!st.patient.pulmonaryEmbolismActive,
              severity: st.patient.peiseverity || 'massive',
              occlusionFraction: st.patient.peOcclusionFraction || 0.6,
              minutesSinceOnset: st.patient.pulmonaryEmbolismActive ? (st.time - (st.patient.peOnsetTime || 0)) / 60 : 0,
              tpaActive: !!st.patient.tpaActive,
              heparinCe: peModel_heparinModel ? peModel_heparinModel.Ce : 0,
              prevCollapseLogged: !!st.patient.peCollapseLogged,
              prevEtco2DropLogged: !!st.patient.peEtco2DropLogged
          });
          if (peOutput.events && peOutput.events.length > 0) {
              peOutput.events.forEach(evt => logEvent(evt));
          }
          if (st.patient.pulmonaryEmbolismActive) {
              st.patient.peCollapseLogged = peOutput.prevCollapseLogged;
              st.patient.peEtco2DropLogged = peOutput.prevEtco2DropLogged;
              // PE feeds into hemodynamics via drugSvrMod (SVR drop in cardiogenic shock) + inotropyMod (RV failure)
              drugSvrMod *= (1 - peOutput.svrReductionFraction);
              drugInotropyMod *= (1 - peOutput.rvFailureSeverity * 0.5);
          }

          // Venous Air Embolism Model
          const vaeOutput = VenousAirEmbolismModel.tick({
              active: !!st.patient.venousAirEmbolismActive,
              airVolumeMl: st.patient.vaeAirVolumeMl || 0,
              hasN2O: (currentEtN2O > 0.5),
              durantsManeuvreActive: !!st.patient.durantsManeuvreActive,
              aspiratingCVC: !!st.patient.aspiratingCVCForVAE,
              fiO2100: deliveredFiO2 >= 0.98,
              hasPFO: !!st.patient.hasPFO,
              minutesSinceOnset: st.patient.venousAirEmbolismActive ? (st.time - (st.patient.vaeOnsetTime || 0)) / 60 : 0,
              prevMillWheelLogged: !!st.patient.vaeMillWheelLogged,
              prevParadoxLogged: !!st.patient.vaeParadoxLogged
          });
          if (vaeOutput.events && vaeOutput.events.length > 0) {
              vaeOutput.events.forEach(evt => logEvent(evt));
          }
          if (st.patient.venousAirEmbolismActive) {
              st.patient.vaeMillWheelLogged = vaeOutput.prevMillWheelLogged;
              st.patient.vaeParadoxLogged = vaeOutput.prevParadoxLogged;
              drugSvrMod *= (1 - vaeOutput.pvrIncreaseFraction * 0.05);
              drugInotropyMod *= vaeOutput.cardiacOutputFraction;
          }

          // Pneumoperitoneum Model -- laparoscopic CO2 + IAP physiologic effects
          const pneumoOutput = PneumoperitoneumModel.tick({
              active: !!st.patient.pneumoperitoneumActive,
              iapMmHg: st.patient.iapMmHg || 12,
              position: pos,
              durationMinutes: st.patient.pneumoperitoneumActive ? (st.time - (st.patient.pneumoperitoneumStartTime || 0)) / 60 : 0,
              hasSubcutaneousEmphysema: !!st.patient.subcutaneousEmphysema,
              prevVagalBradycardiaLogged: !!st.patient.pneumoVagalLogged,
              prevEmphysemaLogged: !!st.patient.pneumoEmphysemaLogged
          });
          if (pneumoOutput.events && pneumoOutput.events.length > 0) {
              pneumoOutput.events.forEach(evt => logEvent(evt));
          }
          if (st.patient.pneumoperitoneumActive) {
              st.patient.pneumoVagalLogged = pneumoOutput.prevVagalBradycardiaLogged;
              st.patient.pneumoEmphysemaLogged = pneumoOutput.prevEmphysemaLogged;
              // Apply IAP-driven SVR increase (mechanical aortic compression)
              drugSvrMod *= (1 + pneumoOutput.svrIncreaseFraction);
              // Apply preload modification (pneumo adds or reduces preload by position and IAP)
              positionPreloadMod += pneumoOutput.preloadModMl;
          }

          // Phase 6F: Sex hormone physiology (progesterone MAC reduction, estrogen coagulation, testosterone Hgb)
          const sexHormoneOutput = SexHormoneModel.tick({
              sex: st.patient.sex,
              age: st.patient.age,
              isPregnant: !!st.patient.isPregnant,
              menstrualCycleDay: st.patient.menstrualCycleDay,
              isPostmenopausal: !!st.patient.isPostmenopausal,
              chronicProgestinTherapy: !!st.patient.chronicProgestinTherapy,
              estrogenTherapy: !!st.patient.estrogenTherapy,
              testosteroneTherapy: !!st.patient.testosteroneTherapy
          });
          st.patient.sexHormoneMacReduction = sexHormoneOutput.macReductionFromProgesterone;
          st.patient.ponvRiskFromHormones = sexHormoneOutput.ponvRiskFromHormones;
          // Estrogen eNOS-mediated vasodilation: up to -6% SVR in premenopausal females (Phase 6F)
          if (sexHormoneOutput.estrogenSvrReduction > 0) {
              drugSvrMod *= (1 - sexHormoneOutput.estrogenSvrReduction);
          }

          // Phase 6E: HPA axis suppression + perioperative adrenal crisis
          const hpaDexamethasoneModel = (st.activeMeds || []).find(m => m.name === 'Dexamethasone');
          const hpaHydrocortisoneModel = (st.activeMeds || []).find(m => m.name === 'Hydrocortisone');
          const hpaOutput = HpaAxisModel.tick({
              chronicPrednisoneDoseEquivMgPerDay: st.patient.chronicPrednisoneDoseMgPerDay || 0,
              chronicSteroidDurationWeeks: st.patient.chronicSteroidDurationWeeks || 0,
              surgicalStressLevel: (st.surgicalPhase === 'Induction' || st.surgicalPhase === 'Incision' || st.surgicalPhase === 'Maintenance') ? (st.patient.manipulationIndex > 0.5 ? 'major' : 'moderate') : 'none',
              isIntraoperative: !!(st.surgicalPhase === 'Induction' || st.surgicalPhase === 'Incision' || st.surgicalPhase === 'Maintenance'),
              hydrocortisoneCe: hpaHydrocortisoneModel ? hpaHydrocortisoneModel.Ce : 0,
              dexamethasoneCe: hpaDexamethasoneModel ? hpaDexamethasoneModel.Ce : 0,
              mapMmHg: st.vitals.map || 90,
              sepsisScore: sepsisOutput.sepsisScore || 0,
              prevAdrenalCrisisLogged: !!st.patient.adrenalCrisisLogged
          });
          if (hpaOutput.events && hpaOutput.events.length > 0) {
              hpaOutput.events.forEach(evt => logEvent(evt));
          }
          if (hpaOutput.adrenalCrisisActive && !st.patient.adrenalCrisisLogged) {
              logQualityEvent({
                  category: 'CrisisManagement',
                  severity: 'critical',
                  description: 'Acute perioperative adrenal crisis developed due to untreated HPA axis suppression under surgical stress.',
                  idealAction: 'Administer preoperative stress-dose corticosteroid coverage (e.g., Hydrocortisone 100 mg IV or Dexamethasone 8 mg IV) for patients with risk of HPA axis suppression.',
                  actualAction: 'Surgical incision was made without active glucocorticoid stress-dose coverage, causing vasodilatory shock.',
                  impact: 'Severe, catecholamine-resistant vasodilatory shock risking organ hypoperfusion and cardiac arrest.',
                  chapterSource: 'Ch32 / Ch35, Miller\'s 9th Ed'
              });
          }
          st.patient.adrenalCrisisLogged = hpaOutput.prevAdrenalCrisisLogged;
          st.patient.hpaSuppressionFraction = hpaOutput.hpaSuppressionFraction;
          st.patient.adrenalCrisisActive = hpaOutput.adrenalCrisisActive;
          // Adrenal crisis direct vasodilation (Phase 6E): cortisol is required for
          // normal catecholamine receptor expression in vascular smooth muscle. Without
          // cortisol, baseline vascular tone collapses independently of vasopressor activity.
          if (hpaOutput.adrenalCrisisActive) {
              drugSvrMod *= 0.65; // ~35% SVR drop from cortisol-deficient vasodilation
          }

          // Phase 6I: PONV Model -- Apfel score and receptor-specific antiemetics
          const ponvOutput = PONVModel.tick({
              femaleSex: st.patient.sex === 'female',
              isNonSmoker: !st.patient.tobaccoSmoker,
              historyPONV: !!st.patient.historyPONV,
              postopOpioidUse: opioidEff > 0.1,
              usedVolatileAnesthesia: currentMac > 0.1,
              usedN2O: !!st.patient.n2oExposureActive,
              durationHours: st.time / 3600,
              ondansetronCe: ondansetronModelForDDI ? ondansetronModelForDDI.Ce : 0,
              dexamethasoneCe: hpaDexamethasoneModel ? hpaDexamethasoneModel.Ce : 0,
              metoclopramideCe: ((st.activeMeds || []).find(m => m.name === 'Metoclopramide') || {Ce:0}).Ce || 0,
              hormonalPONVRisk: sexHormoneOutput ? sexHormoneOutput.ponvRiskFromHormones : 0
          });
          st.patient.apfelScore = ponvOutput.apfelScore;
          st.patient.ponvRisk = ponvOutput.residualPONVRisk;
          st.patient.ponvProphylaxisRecommendation = ponvOutput.prophylaxisRecommendation;

          // Phase 6C: Pharmacogenomics -- CYP polymorphisms and G6PD, computed once early
          const codeineModelForPG = (st.activeMeds || []).find(m => m.name === 'Codeine');
          const tramadolModelForPG = (st.activeMeds || []).find(m => m.name === 'Tramadol');
          const ondansetronModelForPG = (st.activeMeds || []).find(m => m.name === 'Ondansetron');
          const clopidogrelModelForPG = (st.activeMeds || []).find(m => m.name === 'Clopidogrel');
          const methylenebluModelForPG = (st.activeMeds || []).find(m => m.name === 'Methylene Blue');
          const pgOutput = PharmacogenomicsEngine.tick({
              cyp2d6Phenotype: st.patient.cyp2d6Phenotype,
              cyp2c9Phenotype: st.patient.cyp2c9Phenotype,
              cyp2c19Phenotype: st.patient.cyp2c19Phenotype,
              vkorc1SensitiveAllele: !!st.patient.vkorc1SensitiveAllele,
              g6pdDeficiency: !!st.patient.g6pdDeficiency,
              codeineCe: codeineModelForPG ? codeineModelForPG.Ce : 0,
              tramadolCe: tramadolModelForPG ? tramadolModelForPG.Ce : 0,
              ondansetronCe: ondansetronModelForPG ? ondansetronModelForPG.Ce : 0,
              clopidogrelCe: clopidogrelModelForPG ? clopidogrelModelForPG.Ce : 0,
              methyleneBlueCe: methylenebluModelForPG ? methylenebluModelForPG.Ce : 0
          });
          if (pgOutput.events && pgOutput.events.length > 0) {
              pgOutput.events.forEach(evt => logEvent(evt));
          }
          // Store clopidogrel antiplatelet effect for potential use in coagulation wiring
          st.patient.clopidogrelAntiplateletEffect = pgOutput.clopidogrelAntiplateletEffect;
          st.patient.g6pdMethyleneBlueContraindicated = pgOutput.g6pdMethyleneBlueContraindicated;

          // Phase 5, Stage 6: Adipose PK scaling -- obese patients have larger peripheral
          // compartments for lipophilic drugs (propofol, fentanyl, volatiles), effectively
          // slowing return from V2/V3 and extending context-sensitive half-times.
          const patientBmi = typeof st.patient.bmi === 'number' && Number.isFinite(st.patient.bmi) && st.patient.bmi > 10 ? st.patient.bmi : 22;
          const adiposeVolumeRatio = 1.0 + Math.max(0, (patientBmi - 25) / 30);

          const safeEbv = (st.patient && typeof st.patient.ebv === 'number' && Number.isFinite(st.patient.ebv) && st.patient.ebv > 0) ? st.patient.ebv : 5000;
          const safeEbl = (st.patient && typeof st.patient.ebl === 'number' && Number.isFinite(st.patient.ebl)) ? st.patient.ebl : 0;
          const safeAdded = typeof fluidicsOutput.intravascularVolumeAdded_mL === 'number' && Number.isFinite(fluidicsOutput.intravascularVolumeAdded_mL) ? fluidicsOutput.intravascularVolumeAdded_mL : 0;
          const currentBloodVolume = Math.max(100.0, safeEbv - safeEbl + safeIntravascularVolume + safeAdded);
          const v1VolumeRatio = Math.max(0.4, Math.min(10.0, currentBloodVolume / safeEbv));

          let renalRatio = 1.0;
          if (st.patient.gfr !== undefined) {
              renalRatio = Math.max(0.05, Math.min(1.0, st.patient.gfr / 100));
          } else if (st.patient.renalComorbidity) {
              const ren = st.patient.renalComorbidity.toLowerCase();
              if (ren.includes('stage 5') || ren.includes('dialysis')) renalRatio = 0.1;
              else if (ren.includes('stage 4')) renalRatio = 0.25;
              else if (ren.includes('stage 3')) renalRatio = 0.5;
              else if (ren.includes('stage 2')) renalRatio = 0.75;
              else if (ren.includes('aki')) renalRatio = 0.3;
          }

          let hepaticRatio = 1.0;
          if (st.patient.cirrhosis || st.patient.hasCirrhosis || st.patient.liverComorbidity) {
              // Use the live-computed childPughClass (from HepaticEngine) when available;
              // fall back to the static setup-time childPugh flag for initial ticks.
              const cp = (st.patient.childPughClass || st.patient.childPugh || '').toUpperCase();
              if (cp.includes('C')) hepaticRatio = 0.25;
              else if (cp.includes('B')) hepaticRatio = 0.50;
              else hepaticRatio = 0.80;
          }

          const hasMG = st.patient.mg || st.patient.hasMG || st.patient.myastheniaGravis || (st.patient.neurologicComorbidity && st.patient.neurologicComorbidity.toLowerCase().includes('myasthenia'));
          // Aggregate alpha-1/beta-2 receptor activity across all active exogenous
          // catecholamine-class drugs (Phase 2's receptor-unification piece) -- feeds
          // FourChamberCircuitModel.ts's per-vascular-bed redistribution, separate from
          // (and in addition to) the lumped drugSvrMod/drugInotropyMod above.
          let totalAlpha1ActivityIndex = 0;
          let totalBeta2ActivityIndex = 0;

          // const esmololModel = st.activeMeds?.find(m => m.name === 'Esmolol');
          // const labetalolModel = st.activeMeds?.find(m => m.name === 'Labetalol');
          // const metoprololModel = st.activeMeds?.find(m => m.name === 'Metoprolol');
          // const dexmedModel = st.activeMeds?.find(m => m.name === 'Dexmedetomidine');
          // const lidoModel = st.activeMeds?.find(m => m.name === 'Lidocaine');

          let bcheMultiplier = 1.0;
          if (st.patient.butyrylcholinesteraseVariant === 'heterozygous') {
              bcheMultiplier = 0.1;
          } else if (st.patient.butyrylcholinesteraseVariant === 'atypical') {
              bcheMultiplier = 0.01;
          }
          if (st.patient.pregnancy) {
              bcheMultiplier *= 0.8;
          }
          if (st.patient.cirrhosis || st.patient.childPugh === 'C') {
              bcheMultiplier *= 0.5;
          }
          const neostigmineModelForBche = st.activeMeds?.find(m => m.name === 'Neostigmine');
          const pyridostigmineModelForBche = st.activeMeds?.find(m => m.name === 'Pyridostigmine');
          if ((neostigmineModelForBche && neostigmineModelForBche.Ce > 0.01) || (pyridostigmineModelForBche && pyridostigmineModelForBche.Ce > 0.01)) {
              bcheMultiplier *= 0.1;
          }

          const currentTemp = st.vitals.temp || 37.0;
          const currentPhForHofmann = st.electrolytes.ph || 7.4;
          const hofmannMultiplier = Math.pow(1.07, currentTemp - 37.0) * Math.pow(10, currentPhForHofmann - 7.4);

          const cysteineModel = st.activeMeds?.find(m => m.name === 'L-Cysteine');
          const cysteineCe = cysteineModel ? cysteineModel.Ce : 0.0;

          let laudanosineAccumulated = 0;

          // Chapter 28: AChE competitive displacement calculation setup
          const neostigmineModel = st.activeMeds?.find(m => m.name === 'Neostigmine');
          const neostigmineCe = neostigmineModel ? neostigmineModel.Ce : 0;
          const pyridostigmineModel = st.activeMeds?.find(m => m.name === 'Pyridostigmine');
          const pyridostigmineCe = pyridostigmineModel ? pyridostigmineModel.Ce : 0;
          const edrophoniumModel = st.activeMeds?.find(m => m.name === 'Edrophonium');
          const edrophoniumCe = edrophoniumModel ? edrophoniumModel.Ce : 0;

          let E_neo = 0;
          if (neostigmineCe > 0) {
              E_neo = Math.pow(neostigmineCe, 2) / (Math.pow(neostigmineCe, 2) + Math.pow(0.02, 2));
          }
          let E_pyr = 0;
          if (pyridostigmineCe > 0) {
              E_pyr = Math.pow(pyridostigmineCe, 2) / (Math.pow(pyridostigmineCe, 2) + Math.pow(0.088, 2));
          }
          let E_edr = 0;
          if (edrophoniumCe > 0) {
              E_edr = Math.pow(edrophoniumCe, 2) / (Math.pow(edrophoniumCe, 2) + Math.pow(0.25, 2));
          }
          const E_AChE = Math.min(1.0, E_neo + E_pyr + E_edr);

          const applyDisplacement = (occupancyBase) => {
              if (occupancyBase <= 0) return 0;
              const ceilingPenalty = Math.max(0, Math.min(1.0, (occupancyBase - 0.85) / 0.10));
              const effOccupancy = occupancyBase * (1.0 - 0.85 * E_AChE * (1.0 - ceilingPenalty));
              return Math.max(0, effOccupancy);
          };

          // Chapter 12: Potentiation of NMBDs by non-NMBA drugs (Box 12.1, Fig 12.5, Miller 9th Ed)
          const lidocaineModel = st.activeMeds?.find(m => m.name === 'Lidocaine');
          const lidocaineCe = lidocaineModel ? lidocaineModel.Ce : 0;
          const verapamilModel = st.activeMeds?.find(m => m.name === 'Verapamil');
          const verapamilCe = verapamilModel ? verapamilModel.Ce : 0;
          const magnesiumModel = st.activeMeds?.find(m => m.name === 'Magnesium Sulfate');
          const magnesiumCe = magnesiumModel ? magnesiumModel.Ce : 0;

          const ageForVols = st.patient.age || 40;
          const sevoMacForVols = st.gasModels?.sevoflurane ? st.gasModels.sevoflurane.Fb / calculateAgeAdjustedMAC(INHALATIONAL_AGENTS.sevoflurane.mac40, ageForVols) : 0;
          const isoMacForVols = st.gasModels?.isoflurane ? st.gasModels.isoflurane.Fb / calculateAgeAdjustedMAC(INHALATIONAL_AGENTS.isoflurane.mac40, ageForVols) : 0;
          const haloMacForVols = st.gasModels?.halothane ? st.gasModels.halothane.Fb / calculateAgeAdjustedMAC(INHALATIONAL_AGENTS.halothane.mac40, ageForVols) : 0;
          const desMacForVols = st.gasModels?.desflurane ? st.gasModels.desflurane.Fb / calculateAgeAdjustedMAC(INHALATIONAL_AGENTS.desflurane.mac40, ageForVols) : 0;
          const volatilesMac = sevoMacForVols + isoMacForVols + haloMacForVols + desMacForVols;

          const potentiationMult = (1.0 + volatilesMac * 0.5) *
                                   (1.0 + (lidocaineCe / (lidocaineCe + 3.0)) * 0.4) *
                                   (1.0 + (verapamilCe / (verapamilCe + 0.3)) * 0.4) *
                                   (1.0 + (magnesiumCe / (magnesiumCe + 1.0)) * 1.0);

          // Adrenal Engine Tick (Phase 2, Stage A of mutable-roaming-newell.md) -- run
          // early, before the medication-effects loop below, so its
          // catecholamineSensitivityMultiplier (cortisol's permissive effect, replacing
          // the old fixed 0.6x adrenalSuppressionActive discount) is available both there
          // and later for PainEngine/CardiovascularEngine. Reads previous-tick vitals,
          // same convention as every other early-computed value in this function.
          const etomidateModelForAdrenal = st.activeMeds?.find(m => m.name === 'Etomidate');
          const dexamethasoneModelForAdrenal = st.activeMeds?.find(m => m.name === 'Dexamethasone');
          const bloodLossRatioForAdrenal = Math.max(0, Math.min(1, (st.patient.ebl || 0) / (st.patient.ebv || 5000)));
          const adrenalOutput = AdrenalEngine.tick(1, {
              patient: { cortisolLevel: st.patient.cortisolLevel, adrenalSuppressionActive: st.patient.adrenalSuppressionActive },
              vitals: { glucose: st.patient.glucose, spo2: st.vitals.spo2, map: st.vitals.map },
              time: st.time
          }, {
              bloodLossRatio: bloodLossRatioForAdrenal,
              etomidateCe: etomidateModelForAdrenal ? etomidateModelForAdrenal.Ce : 0,
              dexamethasoneCe: dexamethasoneModelForAdrenal ? dexamethasoneModelForAdrenal.Ce : 0
          });
          if (adrenalOutput.events && adrenalOutput.events.length > 0) {
              adrenalOutput.events.forEach(evt => logEvent(evt));
          }
          st.patient.cortisolLevel = adrenalOutput.cortisolLevel;
          patientAfterFluidics.cortisolLevel = adrenalOutput.cortisolLevel;
          // Phase 6E: compound HPA axis suppression into the catecholamine sensitivity multiplier
          const catecholamineSensitivityMultiplier = adrenalOutput.catecholamineSensitivityMultiplier * Math.max(0.1, 1 - (st.patient.hpaSuppressionFraction || 0) * (st.patient.hpaSuppressionFraction ? 0.6 : 0));

          // Thyroid Engine Tick (Phase 2, Stage B) -- run early so
          // thyroidMetabolicMultiplier is available before totalMetabolicMultiplier is
          // assembled below, and thyroidHrBaselineShift/thyroidTempBaselineShift are
          // available for CardiovascularEngine/temperature logic later this same tick.
          const thyroidOutput = ThyroidEngine.tick(1, {
              patient: {
                  thyroidFunctionIndex: st.patient.thyroidFunctionIndex,
                  hypothyroidism: st.patient.hypothyroidism,
                  hyperthyroidism: st.patient.hyperthyroidism,
                  thyroidStormActive: st.patient.thyroidStormActive,
                  thyroidStormLogged: st.patient.thyroidStormLogged,
                  onBetaBlocker: st.patient.onBetaBlocker,
                  onAntithyroidMeds: st.patient.onAntithyroidMeds
              },
              vitals: { hr: st.vitals.hr },
              time: st.time
          }, { surgicalStressIndex: Math.max(adrenalOutput.nonNociceptiveSympatheticStimulus, st.patient.C_cat || 0) });
          if (thyroidOutput.events && thyroidOutput.events.length > 0) {
              thyroidOutput.events.forEach(evt => logEvent(evt));
          }
          st.patient.thyroidFunctionIndex = thyroidOutput.thyroidFunctionIndex;
          st.patient.thyroidStormActive = thyroidOutput.thyroidStormActive;
          st.patient.thyroidStormLogged = thyroidOutput.thyroidStormLogged;
          patientAfterFluidics.thyroidFunctionIndex = thyroidOutput.thyroidFunctionIndex;
          patientAfterFluidics.thyroidStormActive = thyroidOutput.thyroidStormActive;
          patientAfterFluidics.thyroidStormLogged = thyroidOutput.thyroidStormLogged;
          const thyroidMetabolicMultiplier = thyroidOutput.thyroidMetabolicMultiplier;
          const thyroidHrBaselineShift = thyroidOutput.hrBaselineShift;
          const thyroidTempBaselineShift = thyroidOutput.tempBaselineShift;
          totalHrDelta += thyroidHrBaselineShift;

          // === THYROID STORM TREATMENT MODEL ===
          // Complements ThyroidEngine with specific treatment drug cascade
          if (st.patient.thyroidStormActive) {
            const ptuModel = (st.activeMeds || []).find(m => m.name === 'Propylthiouracil (PTU)' || m.name === 'Propylthiouracil');
            const methimazoleModel = (st.activeMeds || []).find(m => m.name === 'Methimazole');
            const lugolsModel = (st.activeMeds || []).find(m => m.name === 'Lugol\'s Iodide' || m.name === 'Potassium Iodide');
            const bbModelForThyroid = (st.activeMeds || []).find(m => m.name === 'Propranolol' || m.name === 'Esmolol');
            const hydroModelForThyroid = (st.activeMeds || []).find(m => m.name === 'Hydrocortisone');
            const dexModelForThyroid = (st.activeMeds || []).find(m => m.name === 'Dexamethasone');
            const tsOutput = ThyroidStormTreatmentModel.tick({
              thyroidStormActive: !!st.patient.thyroidStormActive,
              currentHR: st.vitals.hr,
              currentTemp: st.vitals.temp,
              hasAF: !!(st.patient.hasAFib || st.patient.cardiacRhythm === 'afib'),
              hasDeliriumOrSeizures: !!st.patient.seizureActive,
              ptuCe: ptuModel ? ptuModel.Ce : 0,
              methimazoleCe: methimazoleModel ? methimazoleModel.Ce : 0,
              lugolsIodideCe: lugolsModel ? lugolsModel.Ce : 0,
              ptuGivenBeforeIodide: !!(ptuModel && ptuModel.Ce > 0),
              betaBlockerCe: bbModelForThyroid ? bbModelForThyroid.Ce : 0,
              hydrocortisoneCe: hydroModelForThyroid ? hydroModelForThyroid.Ce : 0,
              dexamethasone_thyroidCe: dexModelForThyroid ? dexModelForThyroid.Ce : 0,
              prevStormLogged: !!st.patient.prevThyroidStormTxLogged,
              prevIodideTimingLogged: !!st.patient.prevIodideTimingLogged,
            });
            tsOutput.events.forEach(e => logEvent(e));
            st.patient.prevThyroidStormTxLogged = tsOutput.prevStormLogged;
            st.patient.prevIodideTimingLogged = tsOutput.prevIodideTimingLogged;
            // Treatment reduces HR and temperature
            if (tsOutput.hrTreatmentEffect < 0) {
              totalHrDelta += tsOutput.hrTreatmentEffect; // reduces storm-driven HR
            }
          }

          // Pancreas Engine Tick (Phase 2, Stage C) -- real glucose homeostasis, reading
          // this tick's cortisol/sympathetic-stress signal directly from AdrenalEngine.
          const insulinModelForPancreas = st.activeMeds?.find(m => m.name === 'Insulin' || m.name === 'Regular Insulin');
          const pancreasOutput = PancreasEngine.tick(1, {
              patient: {
                  glucose: st.patient.glucose,
                  insulinLevel: st.patient.insulinLevel,
                  glucagonLevel: st.patient.glucagonLevel,
                  diabetesMellitus: st.patient.diabetesMellitus,
                  diabetesSeverity: st.patient.diabetesSeverity
              },
              time: st.time
          }, {
              cortisolLevel: adrenalOutput.cortisolLevel,
              nonNociceptiveSympatheticStimulus: adrenalOutput.nonNociceptiveSympatheticStimulus,
              exogenousInsulinCe: insulinModelForPancreas ? insulinModelForPancreas.Ce : 0
          });
          if (pancreasOutput.events && pancreasOutput.events.length > 0) {
              pancreasOutput.events.forEach(evt => logEvent(evt));
          }
          st.patient.glucose = pancreasOutput.glucose;
          st.patient.insulinLevel = pancreasOutput.insulinLevel;
          st.patient.glucagonLevel = pancreasOutput.glucagonLevel;
          patientAfterFluidics.glucose = pancreasOutput.glucose;
          patientAfterFluidics.insulinLevel = pancreasOutput.insulinLevel;
          patientAfterFluidics.glucagonLevel = pancreasOutput.glucagonLevel;

          // Parathyroid Engine Tick (Phase 2, Stage D) -- the homeostatic correction
          // layer for calcium; FluidicsEngine.ts's citrate-binding mechanism (already
          // applied earlier this tick, before this point, via setElectrolytes) remains
          // the separate acute-depletion event this corrects against over time.
          const parathyroidOutput = ParathyroidEngine.tick(1, {
              patient: {
                  pthLevel: st.patient.pthLevel,
                  hypoparathyroidism: st.patient.hypoparathyroidism,
                  hypoparathyroidismSeverity: st.patient.hypoparathyroidismSeverity,
                  hypocalcemiaLogged: st.patient.hypocalcemiaLogged,
                  severeHypocalcemiaLogged: st.patient.severeHypocalcemiaLogged
              },
              time: st.time
          }, {
              calcium: st.electrolytes?.ca,
              renalFunctionRatio: renalRatio
          });
          if (parathyroidOutput.events && parathyroidOutput.events.length > 0) {
              parathyroidOutput.events.forEach(evt => logEvent(evt));
          }
          st.patient.pthLevel = parathyroidOutput.pthLevel;
          st.patient.hypocalcemiaLogged = parathyroidOutput.hypocalcemiaLogged;
          st.patient.severeHypocalcemiaLogged = parathyroidOutput.severeHypocalcemiaLogged;
          patientAfterFluidics.pthLevel = parathyroidOutput.pthLevel;
          patientAfterFluidics.hypocalcemiaLogged = parathyroidOutput.hypocalcemiaLogged;
          patientAfterFluidics.severeHypocalcemiaLogged = parathyroidOutput.severeHypocalcemiaLogged;
          if (st.electrolytes) {
              st.electrolytes = { ...st.electrolytes, ca: parathyroidOutput.calcium };
          }

          if (st.activeMeds) {
              st.activeMeds.forEach(model => {
                  const matchingId = Object.keys(MEDICATIONS).find(key => MEDICATIONS[key].name === model.name);
                  if (matchingId && lineMedicationRates[matchingId] !== undefined) {
                      if (!model.tciMode || model.tciMode === 'none') {
                          const medData = MEDICATIONS[matchingId];
                          const safePatientWeight = typeof st.patient.weight === 'number' && Number.isFinite(st.patient.weight) && st.patient.weight > 0 ? st.patient.weight : 70;
                          const safePatientIbw = typeof st.patient.ibw === 'number' && Number.isFinite(st.patient.ibw) && st.patient.ibw > 0 ? st.patient.ibw : 70;
                          const safePatientLbw = typeof st.patient.lbw === 'number' && Number.isFinite(st.patient.lbw) && st.patient.lbw > 0 ? st.patient.lbw : 60;
                          const dosingWeight = resolveDosingWeight(medData, 'Infusion', st.patient);
                          
                          let activeUnit = '';
                          for (const line of st.patient.accessLines || []) {
                              const medInf = line.activeMedInfusions?.find(mi => mi.medId === matchingId);
                              if (medInf) {
                                  activeUnit = medInf.unit;
                                  break;
                              }
                          }
                          
                          let rateDialed = lineMedicationRates[matchingId];
                          let rateMgPerSec = rateDialed;
                          if (activeUnit.includes('mcg/kg/min')) {
                              rateMgPerSec = (rateDialed * dosingWeight) / 1000 / 60;
                          } else if (activeUnit.includes('mL/kg/min') || activeUnit.includes('ml/kg/min')) {
                              rateMgPerSec = (rateDialed * dosingWeight) / 60;
                          } else if (activeUnit.includes('mg/kg/hr')) {
                              rateMgPerSec = (rateDialed * dosingWeight) / 3600;
                          } else if (activeUnit.includes('mcg/kg/hr')) {
                              rateMgPerSec = (rateDialed * dosingWeight) / 1000 / 3600;
                          } else if (activeUnit.includes('mcg/min')) {
                              rateMgPerSec = rateDialed / 1000 / 60;
                          } else if (activeUnit.includes('mg/hr')) {
                              rateMgPerSec = rateDialed / 3600;
                          } else {
                              rateMgPerSec = rateDialed / 3600;
                          }
                          model.currentInfusionRate = rateMgPerSec;
                      }
                  }

                  // Update patient age/sex/height and PK parameters dynamically (Miller 9th Ed, Ch 18)
                  model.patientAge = st.patient.age || 40;
                  model.patientSex = st.patient.sex || 'male';
                  model.patientHeight = st.patient.height || 170;
                  if (matchingId) {
                      model.updateModelParameters(model.tciMode !== 'none' ? model.tciModelName : (MEDICATIONS[matchingId]?.pkModel || 'none'), st.patient);
                  }

                  const isNDMR = model.classes.includes('NDMR');
                  let pdSens = 1.0;
                  if (isNDMR) {
                      const hasPediatricMG = (st.patient.age && st.patient.age < 2.0);
                      pdSens = (hasMG || hasPediatricMG) ? 4.0 : 1.0;
                      pdSens *= potentiationMult;
                      if (st.patient.cmt) {
                          pdSens *= 2.0;
                      }
                      if (st.patient.elms) {
                          pdSens *= 4.0;
                      }
                      if (st.patient.cip) {
                          pdSens *= 0.5;
                      }
                      // Chapter 35: HypoPP patients — long-acting NDMRs cause postoperative paralytic events;
                      // short/intermediate-acting (atracurium, mivacurium) documented safe (Miller 9th Ed, Ch 35 p. 1140)
                      if (st.patient.hypoPP && (model.name === 'Pancuronium' || model.name === 'dTubocurarine')) {
                          pdSens *= 3.0; // Long-acting NDMRs cause prolonged paralysis
                      }
                  } else if (model.name === 'Succinylcholine') {
                      if (st.patient.cmt) {
                          pdSens *= 0.5;
                      }
                      if (st.patient.elms) {
                          pdSens *= 2.0;
                      }
                      if (st.patient.cip) {
                          pdSens *= 1.5;
                      }
                      // Chapter 35: Succinylcholine in HyperPP causes contracture-like response and
                      // prolonged weakness (Miller 9th Ed, Ch 35 p. 1139)
                      if (st.patient.hyperPP) {
                          pdSens *= 3.0;
                      }
                      // Chapter 35: HypoPP — contracture-like responses to succinylcholine reported (Miller 9th Ed, Ch 35 p. 1140)
                      if (st.patient.hypoPP) {
                          pdSens *= 2.0;
                      }
                  }
                  const effects = model.tick(1, coRatio, v1VolumeRatio, renalRatio, pdSens, hepaticRatio, bcheMultiplier, hofmannMultiplier, cysteineCe, adiposeVolumeRatio, pgOutput.codeineK10Multiplier, pgOutput.warfarinK10Multiplier, st.patient.cyp3a4ActivityMultiplier || 1.0);
                  
                  if (model.name === 'Atracurium') {
                      laudanosineAccumulated += model.A1 * ((model.pk.k10 * hofmannMultiplier) / 60) * 0.30;
                  } else if (model.name === 'Cisatracurium') {
                      laudanosineAccumulated += model.A1 * ((model.pk.k10 * hofmannMultiplier) / 60) * 0.10;
                  }
                  
                  totalHrDelta += effects.hrDelta || 0;
                  totalRrDelta += effects.rrDelta || 0;
                  
                  if (effects.diaDelta) {
                      const scalingFactor = model.name === 'Propofol' ? (getAnatomicalParameter("Propofol SVR drop scaling factor", 1.5) * (st.patient.chronicHTN ? 1.6 : 1.0)) : 1.0;
                      drugSvrMod *= (1.0 + ((effects.diaDelta * scalingFactor) / 120));
                  }
                  if (effects.sysDelta) {
                      const pulsePressureDelta = effects.sysDelta - (effects.diaDelta || 0);
                      drugInotropyMod *= (1.0 + (pulsePressureDelta / 100));
                  }
                  
                  if (effects.svrMultiplier !== undefined) {
                      let mult = effects.svrMultiplier;
                      if (mult > 1.0) {
                          mult = 1.0 + (mult - 1.0) * catecholamineSensitivityMultiplier;
                      }
                      drugSvrMod *= mult;
                  }
                  if (effects.coMultiplier !== undefined) {
                      let mult = effects.coMultiplier;
                      if (mult > 1.0) {
                          mult = 1.0 + (mult - 1.0) * catecholamineSensitivityMultiplier;
                      }
                      drugInotropyMod *= mult;
                  }
                  totalAlpha1ActivityIndex += (effects.alpha1Activity || 0) * catecholamineSensitivityMultiplier;
                  totalBeta2ActivityIndex += (effects.beta2Activity || 0) * catecholamineSensitivityMultiplier;
                  
                  if (effects.group === 'Sedative') sedativeEff = 1 - (1 - sedativeEff) * (1 - effects.hypnoticEffect);
                  if (effects.group === 'Opioid') opioidEff = 1 - (1 - opioidEff) * (1 - effects.hypnoticEffect);
                  
                  let occupancy = effects.receptorOccupancy;
                  if (model.classes.includes('NDMR')) {
                      occupancy = applyDisplacement(occupancy);
                      if (st.patient.nAChR_state === 'downregulated' || (st.patient.age && st.patient.age < 2.0)) {
                          occupancy = Math.min(1.0, occupancy * 2.0);
                      } else if (st.patient.nAChR_state === 'upregulated') {
                          occupancy = occupancy * 0.5;
                      }
                  } else if (model.classes.includes('Depolarizing NMBA')) {
                      if (st.patient.nAChR_state === 'downregulated' || (st.patient.age && st.patient.age < 2.0)) {
                          occupancy = occupancy * 0.5;
                      } else if (st.patient.nAChR_state === 'upregulated') {
                          occupancy = Math.min(1.0, occupancy * 1.5);
                      }
                  }
                  if (occupancy > maxNMJOccupancy) maxNMJOccupancy = occupancy;
              });
              
              drugSvrMod = Math.max(0.55, drugSvrMod);
              drugInotropyMod = Math.max(0.50, drugInotropyMod);
          }

          // Chapter 18: PRIS hemodynamic overrides (Miller's 9th Ed, Ch 18 p. 463)
          if (st.patient.prisActive) {
              const minutesExceeded = Math.max(0, (st.patient.prisAccumulator || 0) - 120);
              totalHrDelta -= 0.2 * minutesExceeded;
              drugInotropyMod *= Math.max(0.3, 1.0 - 0.005 * minutesExceeded);
              drugSvrMod *= Math.max(0.4, 1.0 - 0.003 * minutesExceeded);
          }

          // Apply active metabolites of Midazolam and Ketamine to global effects
          let currentHydroxyMidazolam = st.patient.hydroxyMidazolam || 0;
          let currentNorketamine = st.patient.norketamine || 0;
          if (currentHydroxyMidazolam > 0.01) {
              sedativeEff = 1 - (1 - sedativeEff) * (1 - Math.min(0.95, currentHydroxyMidazolam * 1.5));
          }
          if (currentNorketamine > 0.01) {
              // Norketamine retains 20-30% of parent drug potency
              opioidEff = 1 - (1 - opioidEff) * (1 - Math.min(0.5, currentNorketamine * 0.3));
          }

          const naloxoneModel = st.activeMeds?.find(m => m.name === 'Naloxone');
          const naloxoneCe = naloxoneModel ? naloxoneModel.Ce : 0;
          if (naloxoneCe > 0) {
              const naloxoneAntagonism = naloxoneCe / (naloxoneCe + 0.001); // Ki = 0.001 mg/L for Naloxone
              opioidEff *= (1.0 - naloxoneAntagonism);
          }

          const rocuroniumModel = st.activeMeds?.find(m => m.name === 'Rocuronium');
          const rocuroniumCe = rocuroniumModel ? rocuroniumModel.Ce : 0;
          const vecuroniumModel = st.activeMeds?.find(m => m.name === 'Vecuronium');
          const vecuroniumCe = vecuroniumModel ? vecuroniumModel.Ce : 0;
          const cisatracuriumModel = st.activeMeds?.find(m => m.name === 'Cisatracurium');
          const cisatracuriumCe = cisatracuriumModel ? cisatracuriumModel.Ce : 0;
          const succinylcholineModel = st.activeMeds?.find(m => m.name === 'Succinylcholine');
          const succinylcholineCe = succinylcholineModel ? succinylcholineModel.Ce : 0;
          const atracuriumModel = st.activeMeds?.find(m => m.name === 'Atracurium');
          const atracuriumCe = atracuriumModel ? atracuriumModel.Ce : 0;
          const gantacuriumModel = st.activeMeds?.find(m => m.name === 'Gantacurium');
          const gantacuriumCe = gantacuriumModel ? gantacuriumModel.Ce : 0;
          const cw002Model = st.activeMeds?.find(m => m.name === 'CW002');
          const cw002Ce = cw002Model ? cw002Model.Ce : 0;
          // F12 fix: pancuronium (long-acting) and mivacurium (short-acting) are NDMRs but were absent
          // from the NMJ occupancy calc, so giving them produced NO paralysis (TOF stayed 4/4).
          const pancuroniumModel = st.activeMeds?.find(m => m.name === 'Pancuronium');
          const pancuroniumCe = pancuroniumModel ? pancuroniumModel.Ce : 0;
          const mivacuriumModel = st.activeMeds?.find(m => m.name === 'Mivacurium');
          const mivacuriumCe = mivacuriumModel ? mivacuriumModel.Ce : 0;

          const rocCeEff = rocuroniumCe * potentiationMult;
          let rocOccupancy = applyDisplacement(rocCeEff <= 0.15 ? (rocCeEff / 0.15) * 0.70 : 0.70 + Math.min(0.30, (rocCeEff - 0.15) * 0.5));
          if (st.patient.nAChR_state === 'downregulated' || (st.patient.age && st.patient.age < 2.0)) {
              rocOccupancy = Math.min(1.0, rocOccupancy * 2.0);
          } else if (st.patient.nAChR_state === 'upregulated') {
              rocOccupancy = rocOccupancy * 0.5;
          }
          if (rocOccupancy > maxNMJOccupancy) maxNMJOccupancy = rocOccupancy;

          const vecCeEff = vecuroniumCe * potentiationMult;
          let vecOccupancy = applyDisplacement(vecCeEff <= 0.05 ? (vecCeEff / 0.05) * 0.70 : 0.70 + Math.min(0.30, (vecCeEff - 0.05) * 1.5));
          if (st.patient.nAChR_state === 'downregulated' || (st.patient.age && st.patient.age < 2.0)) {
              vecOccupancy = Math.min(1.0, vecOccupancy * 2.0);
          } else if (st.patient.nAChR_state === 'upregulated') {
              vecOccupancy = vecOccupancy * 0.5;
          }
          if (vecOccupancy > maxNMJOccupancy) maxNMJOccupancy = vecOccupancy;

          const cisCeEff = cisatracuriumCe * potentiationMult;
          let cisOccupancy = applyDisplacement(cisCeEff <= 0.08 ? (cisCeEff / 0.08) * 0.70 : 0.70 + Math.min(0.30, (cisCeEff - 0.08) * 1.0));
          if (st.patient.nAChR_state === 'downregulated' || (st.patient.age && st.patient.age < 2.0)) {
              cisOccupancy = Math.min(1.0, cisOccupancy * 2.0);
          } else if (st.patient.nAChR_state === 'upregulated') {
              cisOccupancy = cisOccupancy * 0.5;
          }
          if (cisOccupancy > maxNMJOccupancy) maxNMJOccupancy = cisOccupancy;

          let suxOccupancy = succinylcholineCe <= 0.08 ? (succinylcholineCe / 0.08) * 0.70 : 0.70 + Math.min(0.30, (succinylcholineCe - 0.08) * 1.0);
          if (st.patient.nAChR_state === 'downregulated' || (st.patient.age && st.patient.age < 2.0)) {
              suxOccupancy = suxOccupancy * 0.5;
          } else if (st.patient.nAChR_state === 'upregulated') {
              suxOccupancy = Math.min(1.0, suxOccupancy * 1.5);
          }
          if (suxOccupancy > maxNMJOccupancy) maxNMJOccupancy = suxOccupancy;

          const atrCeEff = atracuriumCe * potentiationMult;
          let atrOccupancy = applyDisplacement(atrCeEff <= 0.08 ? (atrCeEff / 0.08) * 0.70 : 0.70 + Math.min(0.30, (atrCeEff - 0.08) * 1.0));
          if (st.patient.nAChR_state === 'downregulated' || (st.patient.age && st.patient.age < 2.0)) {
              atrOccupancy = Math.min(1.0, atrOccupancy * 2.0);
          } else if (st.patient.nAChR_state === 'upregulated') {
              atrOccupancy = atrOccupancy * 0.5;
          }
          if (atrOccupancy > maxNMJOccupancy) maxNMJOccupancy = atrOccupancy;

          const gantCeEff = gantacuriumCe * potentiationMult;
          let gantOccupancy = applyDisplacement(gantCeEff <= 0.04 ? (gantCeEff / 0.04) * 0.70 : 0.70 + Math.min(0.30, (gantCeEff - 0.04) * 2.0));
          if (st.patient.nAChR_state === 'downregulated' || (st.patient.age && st.patient.age < 2.0)) {
              gantOccupancy = Math.min(1.0, gantOccupancy * 2.0);
          } else if (st.patient.nAChR_state === 'upregulated') {
              gantOccupancy = gantOccupancy * 0.5;
          }
          if (gantOccupancy > maxNMJOccupancy) maxNMJOccupancy = gantOccupancy;

          const cwCeEff = cw002Ce * potentiationMult;
          let cwOccupancy = applyDisplacement(cwCeEff <= 0.03 ? (cwCeEff / 0.03) * 0.70 : 0.70 + Math.min(0.30, (cwCeEff - 0.03) * 2.5));
          if (st.patient.nAChR_state === 'downregulated' || (st.patient.age && st.patient.age < 2.0)) {
              cwOccupancy = Math.min(1.0, cwOccupancy * 2.0);
          } else if (st.patient.nAChR_state === 'upregulated') {
              cwOccupancy = cwOccupancy * 0.5;
          }
          if (cwOccupancy > maxNMJOccupancy) maxNMJOccupancy = cwOccupancy;

          // F12 fix: pancuronium (potent, long-acting) and mivacurium (short-acting) NMJ occupancy.
          const pancCeEff = pancuroniumCe * potentiationMult;
          let pancOccupancy = applyDisplacement(pancCeEff <= 0.06 ? (pancCeEff / 0.06) * 0.70 : 0.70 + Math.min(0.30, (pancCeEff - 0.06) * 1.5));
          if (st.patient.nAChR_state === 'downregulated' || (st.patient.age && st.patient.age < 2.0)) {
              pancOccupancy = Math.min(1.0, pancOccupancy * 2.0);
          } else if (st.patient.nAChR_state === 'upregulated') {
              pancOccupancy = pancOccupancy * 0.5;
          }
          if (pancOccupancy > maxNMJOccupancy) maxNMJOccupancy = pancOccupancy;

          const mivCeEff = mivacuriumCe * potentiationMult;
          let mivOccupancy = applyDisplacement(mivCeEff <= 0.08 ? (mivCeEff / 0.08) * 0.70 : 0.70 + Math.min(0.30, (mivCeEff - 0.08) * 1.0));
          if (st.patient.nAChR_state === 'downregulated' || (st.patient.age && st.patient.age < 2.0)) {
              mivOccupancy = Math.min(1.0, mivOccupancy * 2.0);
          } else if (st.patient.nAChR_state === 'upregulated') {
              mivOccupancy = mivOccupancy * 0.5;
          }
          if (mivOccupancy > maxNMJOccupancy) maxNMJOccupancy = mivOccupancy;

          // Active Metabolites
          const renalMult = (st.patient.isRenal || st.patient.renalFailure) ? 0.1 : 1.0;
          const vecCe = vecuroniumCe;
          const morModel = st.activeMeds?.find(m => m.name === 'Morphine');
          const morCe = morModel ? morModel.Ce : 0;
          const mepModel = st.activeMeds?.find(m => m.name === 'Meperidine');
          const mepCe = mepModel ? mepModel.Ce : 0;
          const midazolamModel = st.activeMeds?.find(m => m.name === 'Midazolam');
          const midazolamCe = midazolamModel ? midazolamModel.Ce : 0;
          const ketamineModel = st.activeMeds?.find(m => m.name === 'Ketamine');
          const esketamineModel = st.activeMeds?.find(m => m.name === 'Esketamine');
          // Esketamine (S(+)-isomer) is 3-4x more potent than racemic ketamine (Ch23, Miller's 9th
          // Ed); its Ce is converted to a racemic-ketamine-equivalent concentration (midpoint ratio
          // 3.5x) so it correctly drives the same downstream NMDA/emergence-delirium thresholds.
          const ketamineCe = (ketamineModel ? ketamineModel.Ce : 0) + (esketamineModel ? esketamineModel.Ce * 3.5 : 0);
          const dexmedModel = st.activeMeds?.find(m => m.name === 'Dexmedetomidine');
          const dexmedCe = dexmedModel ? dexmedModel.Ce : 0;
          const propofolModel = st.activeMeds?.find(m => m.name === 'Propofol');
          const propofolCe = propofolModel ? propofolModel.Ce : 0;
          const thiopentalModel = st.activeMeds?.find(m => m.name === 'Thiopental');
          const thiopentalCe = thiopentalModel ? thiopentalModel.Ce : 0;

          let currentVec3oh = st.patient.vec3oh || 0;
          let currentNormep = st.patient.normep || 0;
          let currentM6g = st.patient.m6g || 0;
          let currentM3g = st.patient.m3g || 0;
          let currentLaudanosine = st.patient.laudanosine || 0;
          // currentHydroxyMidazolam and currentNorketamine are already declared and initialized above

          if (vecCe > 0.01) {
              currentVec3oh = Math.max(0, currentVec3oh + vecCe * 0.01 - 0.002 * renalMult);
          } else {
              currentVec3oh = Math.max(0, currentVec3oh - 0.002 * renalMult);
          }

          if (mepCe > 0.01) {
              currentNormep = Math.max(0, currentNormep + mepCe * 0.01 - 0.002 * renalMult);
          } else {
              currentNormep = Math.max(0, currentNormep - 0.002 * renalMult);
          }

          // Morphine conjugation pathways (Miller 9th Ed, Ch 24 p. 716/728)
          const m6g_formed = morCe > 0.01 ? (morCe * 0.015 * hepaticRatio) * 0.10 * 1.617 : 0;
          const m3g_formed = morCe > 0.01 ? (morCe * 0.015 * hepaticRatio) * 0.60 * 1.617 : 0;
          const m6g_cleared = 0.003 * renalRatio * currentM6g;
          const m3g_cleared = 0.003 * renalRatio * currentM3g;
          currentM6g = Math.max(0, currentM6g + m6g_formed - m6g_cleared);
          currentM3g = Math.max(0, currentM3g + m3g_formed - m3g_cleared);

          if (midazolamCe > 0.01) {
              currentHydroxyMidazolam = Math.max(0, currentHydroxyMidazolam + midazolamCe * 0.02 - 0.003 * renalMult);
          } else {
              currentHydroxyMidazolam = Math.max(0, currentHydroxyMidazolam - 0.003 * renalMult);
          }

          if (ketamineCe > 0.01) {
              currentNorketamine = Math.max(0, currentNorketamine + ketamineCe * 0.02 - 0.004);
          } else {
              currentNorketamine = Math.max(0, currentNorketamine - 0.004);
          }

          // Laudanosine metabolism and clearance
          const laudanosineClearance = 0.005 * (0.3 * renalRatio + 0.7 * hepaticRatio);
          currentLaudanosine = Math.max(0, currentLaudanosine + laudanosineAccumulated - laudanosineClearance);

          if (currentVec3oh > 0) {
              maxNMJOccupancy = Math.min(1.0, maxNMJOccupancy + applyDisplacement(currentVec3oh * 0.8));
          }

          const dantroleneModelForPd = st.activeMeds?.find(m => m.name === 'Dantrolene');
          const dantroleneCeForPd = dantroleneModelForPd ? dantroleneModelForPd.Ce : 0;
          const dantroleneEffect = dantroleneCeForPd > 0 ? (dantroleneCeForPd / (dantroleneCeForPd + 1.5)) : 0;
          if (dantroleneEffect > 0) {
              maxNMJOccupancy = 1.0 - (1.0 - maxNMJOccupancy) * (1.0 - dantroleneEffect);
          }

          let isSeizure = false;
          let seizureMetabolicMultiplier = 1.0;
          
          // Normeperidine seizures
          if (currentNormep < 0.2) {
              st.patient.normepSeizureRolled = undefined;
          }
          if (currentNormep > 1.2) {
              if (st.patient.normepSeizureRolled === undefined) {
                  const baseProb = 0.15; // 15% base probability of seizures
                  const hasRisk = (st.patient.epilepsy || st.patient.seizureHistory) ? 3.0 : 1.0;
                  const prob = Math.min(1.0, baseProb * hasRisk);
                  st.patient.normepSeizureRolled = rng() < prob;
              }
              if (st.patient.forceNormepSeizure || st.patient.normepSeizureRolled) {
                  isSeizure = true;
                  seizureMetabolicMultiplier = 8.0;
                  logEvent("🚨 CRITICAL EMERGENCY: High levels of active metabolite Normeperidine have accumulated, triggering generalized tonic-clonic seizures!");
              } else {
                  st.patient.normepSeizureRolled = false;
                  logEvent("⚠️ Clinical Note: Normeperidine levels are elevated. Fortunately, generalized seizures were not triggered (neurological threshold remains stable).");
              }
          }

          // Laudanosine seizures
          if (currentLaudanosine < 0.2) {
              st.patient.laudanosineSeizureRolled = undefined;
          }
          if (currentLaudanosine > 2.0 && !st.patient.laudanosineSeizureTriggered && st.patient.laudanosineSeizureRolled === undefined) {
              const baseProb = 0.15;
              const hasRisk = (st.patient.epilepsy || st.patient.seizureHistory) ? 3.0 : 1.0;
              const prob = Math.min(1.0, baseProb * hasRisk);
              st.patient.laudanosineSeizureRolled = rng() < prob;
              if (st.patient.forceLaudanosineSeizure || st.patient.laudanosineSeizureRolled) {
                  st.patient.laudanosineSeizureTriggered = true;
                  logEvent("🚨 CRITICAL EMERGENCY: High levels of active metabolite Laudanosine have accumulated, triggering generalized seizures!");
              } else {
                  st.patient.laudanosineSeizureRolled = false;
                  logEvent("⚠️ Clinical Note: Laudanosine levels are elevated. Fortunately, generalized seizures were not triggered.");
              }
          }
          if (st.patient.laudanosineSeizureTriggered) {
              if (propofolCe > 1.2 || midazolamCe > 0.08) {
                  st.patient.laudanosineSeizureTriggered = false;
                  logEvent("✅ SUCCESS: Anticonvulsant sedative administered. Laudanosine-induced seizure activity aborted.");
              } else {
                  isSeizure = true;
                  seizureMetabolicMultiplier = 8.0;
              }
          }

          // Morphine-3-Glucuronide (M3G) seizures (Miller 9th Ed, Ch 24 p. 728)
          if (currentM3g < 0.2) {
              st.patient.m3gSeizureRolled = undefined;
          }
          if (currentM3g > 1.0 && !st.patient.m3gSeizureTriggered && st.patient.m3gSeizureRolled === undefined) {
              const baseProb = 0.15;
              const hasRisk = (st.patient.epilepsy || st.patient.seizureHistory) ? 3.0 : 1.0;
              const prob = Math.min(1.0, baseProb * hasRisk);
              st.patient.m3gSeizureRolled = rng() < prob;
              if (st.patient.forceM3gSeizure || st.patient.m3gSeizureRolled) {
                  st.patient.m3gSeizureTriggered = true;
                  logEvent("🚨 CRITICAL EMERGENCY: High levels of active metabolite Morphine-3-Glucuronide (M3G) have accumulated in renal failure, triggering myoclonus and generalized seizures!");
              } else {
                  st.patient.m3gSeizureRolled = false;
                  logEvent("⚠️ Clinical Note: Morphine-3-Glucuronide (M3G) levels are elevated. Fortunately, generalized seizures were not triggered.");
              }
          }
          if (st.patient.m3gSeizureTriggered) {
              if (propofolCe > 1.2 || midazolamCe > 0.08) {
                  st.patient.m3gSeizureTriggered = false;
                  st.patient.forceM3gSeizure = false;
                  logEvent("✅ SUCCESS: Anticonvulsant sedative administered. M3G-induced seizure activity aborted.");
              } else {
                  isSeizure = true;
                  seizureMetabolicMultiplier = 8.0;
              }
          }

          // Morphine-6-Glucuronide (M6G) respiratory depression (Miller 9th Ed, Ch 24 p. 728)
          let m6gRrDelta = 0;
          if (currentM6g > 0.01) {
              const gamma = 1.5;
              const ratio = currentM6g / 0.08;
              const power = Math.pow(ratio, gamma);
              const fraction = power / (1.0 + power);
              m6gRrDelta = -14.0 * fraction;
          }
          if (naloxoneCe > 0) {
              const naloxoneAntagonism = naloxoneCe / (naloxoneCe + 0.001);
              m6gRrDelta *= (1.0 - naloxoneAntagonism);
          }

          const nipModel = st.activeMeds?.find(m => m.name === 'Nitroprusside');
          const nipCe = nipModel ? nipModel.Ce : 0;
          let currentCyanide = st.patient.cyanide || 0;
          if (nipCe > 1.5) {
              currentCyanide = Math.min(1.0, currentCyanide + nipCe * 0.002);
          } else {
              currentCyanide = Math.max(0, currentCyanide - 0.005);
          }
          // Hydroxocobalamin antidote: high-affinity cobalt chelates cyanide → rapid elimination
          const hydroxocobalaminModel = (st.activeMeds || []).find(m => m.name === 'Hydroxocobalamin (Cyanokit)');
          if (hydroxocobalaminModel && hydroxocobalaminModel.Ce > 0.1 && currentCyanide > 0) {
              const chelationRate = Math.min(currentCyanide, hydroxocobalaminModel.Ce * 0.01); // fast chelation
              currentCyanide = Math.max(0, currentCyanide - chelationRate);
          }

          let cyanideVO2Mod = 1.0;
          if (currentCyanide > 0.01) {
              cyanideVO2Mod = Math.max(0.1, 1 - currentCyanide * 2.0);
          }

          // Chapter 18: Propofol Infusion Syndrome (PRIS) tracking (Miller's 9th Ed, Ch 18 p. 463)
          const safeWeightForPris = st.patient.weight || 70;
          const propofolInfMcgKgMin = propofolModel ? (propofolModel.currentInfusionRate * 1000 * 60) / safeWeightForPris : 0;
          let currentPrisAccum = st.patient.prisAccumulation || 0;
          let prisActive = st.patient.prisActive || false;

          if (propofolInfMcgKgMin > 67.0) {
              currentPrisAccum += 1;
          } else {
              currentPrisAccum = Math.max(0, currentPrisAccum - 0.5); // decay when rate is below threshold
          }

          if (currentPrisAccum === 0) {
              st.patient.prisRolled = undefined;
          }

          if (currentPrisAccum > 3600 && !prisActive) { // > 1 hour of continuous high-dose infusion
              if (st.patient.prisRolled === undefined) {
                  const baseProb = 0.01; // 1% baseline probability
                  const isYoung = typeof st.patient.age === 'number' && st.patient.age < 12;
                  const modifier = (st.patient.isSeptic || st.patient.trauma || isYoung) ? 4.0 : 1.0;
                  const prob = Math.min(1.0, baseProb * modifier);
                  st.patient.prisRolled = rng() < prob;
              }
              if (st.patient.forcePris || st.patient.prisRolled) {
                  prisActive = true;
                  logEvent(`🚨 CRITICAL EMERGENCY: Propofol Infusion Syndrome (PRIS) triggered! The patient has developed profound metabolic acidosis, hyperkalemia, rhabdomyolysis, and progressive myocardial failure!`);
                  logQualityEvent({
                      category: 'Vigilance', severity: 'critical',
                      description: 'Propofol Infusion Syndrome (PRIS) developed after prolonged high-dose propofol infusion.',
                      idealAction: 'Avoid sustained propofol infusion rates above ~67 mcg/kg/min (4 mg/kg/hr) for more than 48 hours; use an alternative sedative for prolonged cases.',
                      actualAction: 'High-dose propofol infusion was sustained beyond the recognized risk window.',
                      impact: 'Metabolic acidosis, hyperkalemia, rhabdomyolysis, and progressive myocardial failure - high mortality if unrecognized.',
                  });
              } else {
                  st.patient.prisRolled = false;
                  logEvent(`⚠️ Clinical Note: Propofol infusion rate was maintained above 67 mcg/kg/min for a prolonged period. Fortunately, PRIS did not manifest (occurs in <1% of elective cases). Close monitoring of pH and potassium is advised.`);
              }
          }

          // Recovery from PRIS if infusion stopped/reduced below threshold
          if (prisActive && currentPrisAccum < 2700) { // requires significant recovery decay
              prisActive = false;
              logEvent("✅ Propofol Infusion Syndrome (PRIS) resolving as propofol infusion has been reduced/stopped.");
          }

          st.patient.prisAccumulation = currentPrisAccum;
          st.patient.prisActive = prisActive;
          st.patient.prisTriggered = prisActive; // synchronize both flags for safety
          patientAfterFluidics.prisAccumulation = currentPrisAccum;
          patientAfterFluidics.prisActive = prisActive;
          patientAfterFluidics.prisTriggered = prisActive;

          // Lactic Acid modeling (anaerobic metabolism during shock, arrest, or sepsis).
          // Now driven by SepsisCascadeModel's dynamic lactateContributionMmolL (Phase 5, Stage 4)
          // rather than a flat isSeptic ? 4.5 : 1.0 constant.
          const baselineLactate = 1.0 + (sepsisOutput.lactateContributionMmolL || 0);
          let currentLactate = st.patient.lacticAcid || baselineLactate;
          
          if (st.patient.isArrest) {
              if (st.patient.cprActive) {
                  // CPR provides low-flow perfusion, slowing lactate accumulation
                  currentLactate += 0.01;
              } else {
                  // No flow in arrest causes rapid anaerobic conversion
                  currentLactate += 0.05;
              }
          } else if (coRatio < 0.8) {
              // Shock-induced hypoperfusion converts to anaerobic glycolysis
              const deficit = 0.8 - coRatio;
              currentLactate += deficit * 0.02;
          } else {
              // Normal perfusion allows hepatic/renal lactate clearance towards baseline
              currentLactate -= (currentLactate - baselineLactate) * 0.005;
          }

          if (prisActive) {
              // PRIS causes progressive lactic acid increase (+0.02 mmol/L per tick)
              currentLactate += 0.02;
          }
          currentLactate = Math.max(0.5, Math.min(25.0, currentLactate));

          // ==========================================
          // LOCAL ANESTHETIC KINETICS & LAST CRISES
          // ==========================================
          let lipidSinkVol = st.patient.lipidSinkVol || 0;
          const intralipidModel = st.activeMeds?.find(m => m.name === 'Intralipid 20%');
          if (intralipidModel && intralipidModel.currentInfusionRate > 0) {
              lipidSinkVol += intralipidModel.currentInfusionRate; // rate is in mL/sec
          }
          lipidSinkVol = Math.max(0, lipidSinkVol - 0.1); // 0.1 mL/s decay
          st.patient.lipidSinkVol = lipidSinkVol;

          // Phase 5, Stage 2: LAST (Local Anesthetic Systemic Toxicity) + Intralipid rescue.
          const lidocaineModelForLast = (st.activeMeds || []).find(m => m.name === 'Lidocaine');
          const bupivacaineModelForLast = (st.activeMeds || []).find(m => m.name === 'Bupivacaine');
          const ropivacaineModelForLast = (st.activeMeds || []).find(m => m.name === 'Ropivacaine');
          const levobupivacaineModelForLast = (st.activeMeds || []).find(m => m.name === 'Levobupivacaine');
          const mepivacaineModelForLast = (st.activeMeds || []).find(m => m.name === 'Mepivacaine');
          const intralipidModelForLast = (st.activeMeds || []).find(m => m.name === 'Intralipid 20%');

          const lastOutput = LastModel.tick({
              lidocaineCe: lidocaineModelForLast ? lidocaineModelForLast.Ce : 0,
              bupivacaineCe: bupivacaineModelForLast ? bupivacaineModelForLast.Ce : 0,
              ropivacaineCe: ropivacaineModelForLast ? ropivacaineModelForLast.Ce : 0,
              levobupivacaineCe: levobupivacaineModelForLast ? levobupivacaineModelForLast.Ce : 0,
              mepivacaineCe: mepivacaineModelForLast ? mepivacaineModelForLast.Ce : 0,
              intralipidCe: intralipidModelForLast ? intralipidModelForLast.Ce : 0,
              prevCnsToxicityLogged: !!st.patient.lastCnsToxicityLogged,
              prevSeizureFromLastLogged: !!st.patient.lastSeizureLogged,
              prevCvToxicityLogged: !!st.patient.lastCvToxicityLogged
          });

          if (lastOutput.events && lastOutput.events.length > 0) {
              lastOutput.events.forEach(evt => logEvent(evt));
          }

          st.patient.lastCnsToxicityLogged = lastOutput.prevCnsToxicityLogged;
          st.patient.lastSeizureLogged = lastOutput.prevSeizureFromLastLogged;
          st.patient.lastCvToxicityLogged = lastOutput.prevCvToxicityLogged;
          st.patient.lastCnsToxicityActive = lastOutput.cnsToxicityActive;
          st.patient.lastCvToxicityActive = lastOutput.cvToxicityActive;

          // Seizure handling with anticonvulsant abort logic
          let lastSeizureTriggered = st.patient.lastSeizureTriggered || false;
          if (lastOutput.seizureFromLast && !lastSeizureTriggered) {
              lastSeizureTriggered = true;
          }
          if (lastSeizureTriggered) {
              const hasAnticonvulsant = propofolCe > 1.2 || midazolamCe > 0.08 || thiopentalCe > 15.0;
              if (hasAnticonvulsant) {
                  lastSeizureTriggered = false;
                  logEvent("✅ SUCCESS: Anticonvulsant sedative administered. LAST-induced tonic-clonic seizure aborted.");
              } else {
                  isSeizure = true;
                  seizureMetabolicMultiplier = 8.0;
              }
          }
          st.patient.lastSeizureTriggered = lastSeizureTriggered;

          // Carbamazepine dyscrasia agranulocytic sepsis metabolic check
          const cbzModelForMet = st.activeMeds?.find(m => m.name === 'Carbamazepine');
          const cbzCeForMet = cbzModelForMet ? cbzModelForMet.Ce : 0;
          const cbzDyscrasiaActiveForMet = cbzCeForMet > 6.0 || !!st.patient.forceCarbamazepineDyscrasia;
          if (cbzDyscrasiaActiveForMet) {
              seizureMetabolicMultiplier = Math.max(seizureMetabolicMultiplier, 2.0);
          }

          // Methemoglobinemia kinetics
          const benzocaineModel = st.activeMeds?.find(m => m.name === 'Benzocaine');
          const benzocaineCe = benzocaineModel ? benzocaineModel.Ce : 0;
          const prilocaineModel = st.activeMeds?.find(m => m.name === 'Prilocaine');
          const prilocaineCe = prilocaineModel ? prilocaineModel.Ce : 0;
          const methyleneBlueModel = st.activeMeds?.find(m => m.name === 'Methylene Blue');
          const methyleneBlueCe = methyleneBlueModel ? methyleneBlueModel.Ce : 0;

          let currentMetHb = st.patient.metHb !== undefined ? st.patient.metHb : 0.8;
          if (benzocaineCe > 0.2 || prilocaineCe > 0.5) {
              currentMetHb = Math.min(35.0, currentMetHb + 0.1);
              const currentTime = st.time || 0;
              if (!st.patient.hasMetHbLog || (currentTime - (st.patient.lastMetHbLogTime || 0) >= 15)) {
                  logEvent(`⚠️ CLINICAL ALERT: Methemoglobin levels are rising (${currentMetHb.toFixed(1)}%). Hemoglobin oxidation has induced Methemoglobinemia!`);
                  st.patient.hasMetHbLog = true;
                  st.patient.lastMetHbLogTime = currentTime;
              }
          } else if (methyleneBlueCe > 0.05) {
              currentMetHb = Math.max(0.8, currentMetHb - 0.5);
              const currentTime = st.time || 0;
              if (st.patient.hasMetHbLog || (currentTime - (st.patient.lastMetHbLogTime || 0) >= 15)) {
                  logEvent(`✅ Methylene Blue is reducing Methemoglobin back to active oxyhemoglobin. MetHb levels dropping (${currentMetHb.toFixed(1)}%).`);
                  st.patient.hasMetHbLog = false;
                  st.patient.lastMetHbLogTime = currentTime;
              }
          }
          st.patient.metHb = currentMetHb;
          setVitals({ metHb: currentMetHb });

          // Bleed rates & Haemoglobin dilution
          const baseHb = st.patient.trauma ? 11.2 : 14.5;
          let activeBleedRate = 0;
          if (st.patient.trauma) {
              activeBleedRate = st.patient.bleedRate !== undefined ? st.patient.bleedRate : 1.5;
          } else if (st.surgicalPhase === 'Incision' || st.surgicalPhase === 'Maintenance') {
              activeBleedRate = st.patient.bleedRate !== undefined ? st.patient.bleedRate : 0.05;
          }
          activeBleedRate += st.patient.activeHepaticBleedRate || 0.0;
          const safeCurrentEbl = typeof st.patient.ebl === 'number' && Number.isFinite(st.patient.ebl) ? st.patient.ebl : 0;
          const currentEbl = safeCurrentEbl + activeBleedRate;
          let bloodLossRatio = currentEbl / safeEbv;
          if (isNaN(bloodLossRatio) || !Number.isFinite(bloodLossRatio)) {
              bloodLossRatio = 0.05;
          }
          bloodLossRatio = Math.max(0, Math.min(0.95, bloodLossRatio));

          const safeVolumeAdded = typeof fluidicsOutput.intravascularVolumeAdded_mL === 'number' && Number.isFinite(fluidicsOutput.intravascularVolumeAdded_mL) ? fluidicsOutput.intravascularVolumeAdded_mL : 0;

          // Physics-based Hb: total Hb mass / total blood volume.
          // Critical fix: prior formula treated ALL intravascular volume as diluting, so 1 unit PRBC
          // (300 mL, retentionIntact=1.0) LOWERED Hb by 0.18 g/dL instead of raising it by ~1 g/dL.
          // PRBC adds Hb mass (density ≈ 0.22 g/mL at Hct=0.70, MCHC adjusted for storage solution).
          // Track cumulative PRBC Hb mass via prbcVolumeReceivedMl so each tick accumulates correctly.
          const safeRbcAdded = typeof fluidicsOutput.rbcVolumeAdded_mL === 'number' && Number.isFinite(fluidicsOutput.rbcVolumeAdded_mL) ? Math.max(0, fluidicsOutput.rbcVolumeAdded_mL) : 0;
          const cumulativePrbcVolML = Math.max(0, (st.patient.prbcVolumeReceivedMl || 0) + safeRbcAdded);
          st.patient.prbcVolumeReceivedMl = cumulativePrbcVolML; // persist for next tick
          const safeDilutingVol = Math.max(0, safeVolumeAdded - safeRbcAdded); // crystalloid/colloid only

          const initialHbMass = baseHb * (safeEbv / 100) * (1 - bloodLossRatio); // g: original Hb remaining
          const prbcHbMass = cumulativePrbcVolML * 0.22;                          // g: cumulative PRBC Hb
          const totalHbMass = Math.max(0, initialHbMass + prbcHbMass);
          const remainingBloodVolML = safeEbv * (1 - bloodLossRatio);
          const totalBloodVolDL = Math.max(safeEbv * 0.3, remainingBloodVolML + (safeIntravascularVolume || 0) + safeDilutingVol) / 100;
          let calculatedHb = totalHbMass / totalBloodVolDL;
          if (isNaN(calculatedHb) || !Number.isFinite(calculatedHb)) {
              calculatedHb = 12.0;
          }
          const currentHb = Math.max(3.0, Math.min(25.0, calculatedHb));

          // Gas kinetics
          let brainMac = 0;
          let displayedMac = 0;
          let currentEtAgent = 0;
          currentEtN2O = 0;
          deliveredFiO2 = 21;
          let n2oPercent = 0;
          let freshGasFlow = 2.0; // default 2 L/min

          const isPipelineConnected = !st.patient.isO2PipelineDisconnected;
          const isCrossover = st.patient.isO2PipelineCrossover;
          const isCylinderOpen = st.patient.isO2CylinderOpen;

          let o2SourceIsO2 = false;
          let o2SourceIsN2O = false;
          let hasO2Supply = false;

          if (isPipelineConnected) {
              hasO2Supply = true;
              if (isCrossover) {
                  o2SourceIsN2O = true;
              } else {
                  o2SourceIsO2 = true;
              }
          } else {
              if (isCylinderOpen) {
                  hasO2Supply = true;
                  o2SourceIsO2 = true;
              } else {
                  hasO2Supply = false;
              }
          }

          if (activeGasSettings) {
              // Link-25 proportioning + oxygen supply failure protection device ("fail-safe
              // valve") — Ch22, Miller's 9th Ed. See calculateLink25GasMixture() for citations.
              const gasMix = calculateLink25GasMixture(activeGasSettings, hasO2Supply, o2SourceIsO2, o2SourceIsN2O);

              if (gasMix.isO2PressureLow && !st.patient.hasLowO2PressureLog) {
                  st.patient.hasLowO2PressureLog = true;
                  logEvent("🚨 CRITICAL WARNING: Oxygen pipeline pressure is 0 psi and backup cylinder is closed! Oxygen supply pressure failure!");
              }
              if (!gasMix.isO2PressureLow && st.patient.hasLowO2PressureLog) {
                  st.patient.hasLowO2PressureLog = false;
              }

              if (gasMix.failSafeN2OCutoff && gasMix.n2oDialedFlow > 0 && !st.patient.hasFailSafeValveLog) {
                  st.patient.hasFailSafeValveLog = true;
                  logEvent("🚨 Oxygen supply failure protection device (\"fail-safe valve\") has shut off Nitrous Oxide flow due to loss of O2 supply pressure.");
              }
              if (!(gasMix.failSafeN2OCutoff && gasMix.n2oDialedFlow > 0) && st.patient.hasFailSafeValveLog) {
                  st.patient.hasFailSafeValveLog = false;
              }

              deliveredFiO2 = Number.isFinite(gasMix.deliveredFiO2) ? gasMix.deliveredFiO2 : 21;
              n2oPercent = Number.isFinite(gasMix.n2oPercent) ? gasMix.n2oPercent : 0;
              freshGasFlow = gasMix.freshGasFlow;
          }

          // Crossover warning log
          const isCrossoverActive = st.patient.isO2PipelineCrossover && !st.patient.isO2PipelineDisconnected;
          if (isCrossoverActive && !st.patient.hasCrossoverWarningLogged) {
              st.patient.hasCrossoverWarningLogged = true;
              logEvent("🚨 CRITICAL WARNING: Oxygen analyzer measures low inspired oxygen concentration (FiO2)! Low oxygen alarm active!");
          }
          if (!isCrossoverActive && st.patient.hasCrossoverWarningLogged) {
              st.patient.hasCrossoverWarningLogged = false;
          }

          // Oxygen Flush dilutes circuit volatile agents and pre-oxygenates
          if (st.patient.isOxygenFlushPressed) {
              const currentFRC = (st.patient.height * 0.02) - (st.patient.isObese ? 0.8 : 0);
              
              if (hasO2Supply) {
                  if (o2SourceIsN2O) {
                      patientAfterFluidics.oxygenBuffer = 0.1;
                  } else {
                      patientAfterFluidics.oxygenBuffer = Math.max(0.5, currentFRC);
                  }
                  
                  if (st.gasModels) {
                      Object.keys(st.gasModels).forEach(key => {
                          const model = st.gasModels[key];
                          if (model) {
                              model.Fi *= 0.5;
                              model.Fa *= 0.5;
                          }
                      });
                  }

                  const isVentilatingPPV = st.patient.ventilationStatus === 'mechanical' 
                    || (activeVentSettings && activeVentSettings.mode !== 'spontaneous' && activeVentSettings.rr > 0);
                  const isAplClosed = st.patient.aplValveSetting >= 30;
                  
                  if (isVentilatingPPV || isAplClosed) {
                      if (!st.patient.hasPneumothorax) {
                          st.patient.hasPneumothorax = true;
                          logEvent(o2SourceIsN2O
                              ? "🚨 CRITICAL EMERGENCY: Nitrous oxide flush valve pressed with closed circuit exhalation path or positive-pressure inspiration! PIP surged > 65 cmH2O, triggering a massive tension pneumothorax!"
                              : "🚨 CRITICAL EMERGENCY: Oxygen flush valve pressed with closed circuit exhalation path or positive-pressure inspiration! PIP surged > 65 cmH2O, triggering a massive tension pneumothorax!"
                          );
                      }
                  } else {
                      if (o2SourceIsN2O) {
                          logEvent("💨 Nitrous oxide flush pressed (pipeline crossover active). Circuit agent concentration diluted by 50%. FRC oxygen reserves washed out!");
                      } else {
                          logEvent("💨 Oxygen flush pressed. Circuit agent concentration diluted by 50%. FRC oxygen buffer filled.");
                      }
                  }
              } else {
                  logEvent("⚠️ Oxygen flush pressed, but there is no oxygen supply pressure! No gas flows.");
              }
              
              st.patient.isOxygenFlushPressed = false;
          }

          let currentFiAgent = 0;
          let currentFiN2O = 0;
          let n2oUptake_L_sec = 0;

          if (st.gasModels && Object.keys(st.gasModels).length > 0) {
              if (st.patient.charcoalFiltersPlaced) {
                  Object.keys(st.gasModels).forEach(key => {
                      const model = st.gasModels[key];
                      if (model) {
                          model.Fi *= 0.25;
                          model.Fa *= 0.25;
                          model.Fb *= 0.25;
                          model.F_vrg *= 0.25;
                          model.F_mg *= 0.25;
                          model.F_fg *= 0.25;
                          model.F_dial = 0;
                      }
                  });
              }

              const isParalyzed = maxNMJOccupancy > 0.90;
              const isApneic = isParalyzed || (st.vitals.rr !== undefined ? st.vitals.rr < 1 : false);
              const effectiveMv = st.patient.airwaySecured ? (st.vitals.mv || 0) : (isApneic ? 0 : 6.0);
              const currentFRC = (st.patient.height * 0.02) - (st.patient.isObese ? 0.8 : 0);

              // 1. Tick N2O first to calculate its uptake rate for the Second Gas Effect
              if (st.gasModels.n2o && INHALATIONAL_AGENTS.n2o) {
                  st.gasModels.n2o.setDial(!st.patient.charcoalFiltersPlaced ? n2oPercent : 0);
                  const n2oState = st.gasModels.n2o.tick(1, effectiveMv, currentCOForPK, currentFRC, st.patient.ibw, st.patient.shuntFraction, freshGasFlow);
                  currentEtN2O = n2oState.Fa;
                  currentFiN2O = st.gasModels.n2o.Fi * 100;
                  n2oUptake_L_sec = n2oState.uptake_vol_sec || 0;
                  
                  const n2oAdjMac = Math.max(0.01, calculateAgeAdjustedMAC(INHALATIONAL_AGENTS.n2o.mac40, st.patient.age || 40));
                  displayedMac += (n2oState.Fa / n2oAdjMac);
                  brainMac += (n2oState.Fb / n2oAdjMac);

                  // === FINK EFFECT (N2O DIFFUSION HYPOXIA) ===
                  // When N2O dial is off (n2oPercent=0) but blood N2O is still high,
                  // large N2O efflux from blood → alveoli dilutes alveolar O2.
                  // Peak effect 2-5 min post-N2O-off; resolves in ~10-15 min.
                  // Clinical significance: SpO2 can drop 3-8% without supplemental O2.
                  // Prevention: continue 100% O2 for ≥5 min after N2O discontinued.
                  const n2oDialOff = !n2oPercent || n2oPercent < 5;
                  const n2oBloodHigh = currentEtN2O > 25; // residual blood N2O (proxied by recent Et)
                  const finkShunt = n2oDialOff && n2oBloodHigh
                    ? Math.min(0.15, (currentEtN2O / 100) * 0.30) // up to 15% additional shunt
                    : 0;
                  if (finkShunt > 0 && !st.patient.finkEffectLogged) {
                      logEvent('⚠️ N₂O DIFFUSION HYPOXIA (Fink Effect): N₂O discontinued while blood N₂O still elevated. N₂O washout from blood is diluting alveolar O₂ → SpO₂ will fall over next 2-5 min. GIVE 100% O₂ for ≥5 min before room air. This is the classic "diffusion hypoxia" described by Fink (1955).');
                      st.patient.finkEffectLogged = true;
                  }
                  if (!n2oBloodHigh) st.patient.finkEffectLogged = false;
                  st.patient.n2oDiffusionHypoxiaShunt = finkShunt;
              }

              // 2. Tick volatile agents, passing the co-administered N2O uptake to model Second Gas Effect
              Object.keys(st.gasModels).forEach(key => {
                  const model = st.gasModels[key];
                  const agentData = INHALATIONAL_AGENTS[key];
                  if (key !== 'n2o' && agentData) {
                      if (activeGasSettings && activeGasSettings.agent === key && !st.patient.charcoalFiltersPlaced) model.setDial(activeGasSettings.dial || 0);
                      else model.setDial(0);
                      
                      const gasState = model.tick(1, effectiveMv, currentCOForPK, currentFRC, st.patient.ibw, st.patient.shuntFraction, freshGasFlow, n2oUptake_L_sec);
                      if (gasState.Fa > 0.01 || model.Fi > 0.0001) {
                          currentEtAgent = gasState.Fa;
                          currentFiAgent = model.Fi * 100;
                          
                          if (gasState.Fa > 0.01) {
                              let macModifier = 1.0;
                              if (st.vitals.temp < 36.0) macModifier -= (36.0 - st.vitals.temp) * 0.05;
                              if (st.patient.isSeptic) macModifier -= 0.1;
                              if (currentHb < 5.0) macModifier -= 0.1;

                              // Opioid-induced volatile MAC reduction (Miller's 9th Ed, Ch 18 Fig 18.26)
                              let opioidRatioSum = 0;
                              if (st.activeMeds) {
                                  st.activeMeds.forEach(m => {
                                      if ((m.classes?.some(c => c.includes('Opioid')) || m.name?.toLowerCase().includes('fentanyl') || m.name?.toLowerCase().includes('morphine') || m.name?.toLowerCase().includes('remifentanil')) && m.Ce > 0) {
                                          const c50 = m.pd.c50 || 0.001;
                                          opioidRatioSum += m.Ce / c50;
                                      }
                                  });
                              }
                              if (opioidRatioSum > 0) {
                                  // Synergistic non-linear reduction with a 65% ceiling (multiplier = 0.35)
                                  const fractionRed = 0.65 * (opioidRatioSum / (opioidRatioSum + 1.0));
                                  macModifier *= (1.0 - fractionRed);
                              }

                              macModifier = Math.max(0.2, macModifier);
                              
                              const safeAdjMac = Math.max(0.01, calculateAgeAdjustedMAC(agentData.mac40, st.patient.age || 40) * macModifier);
                              
                              displayedMac += gasState.Fa / safeAdjMac;
                              const brainMacContribution = gasState.Fb / safeAdjMac;
                              brainMac += brainMacContribution;
                              
                              sedativeEff = 1 - (1 - sedativeEff) * (1 - Math.min(1, brainMacContribution));
                              drugSvrMod = drugSvrMod * (1 - (brainMacContribution * 0.15));
                          }
                      }
                  }
              });
          }

          const f6Model = st.activeMeds?.find(m => m.name === 'F6 (Nonimmobilizer)');
          const f6Ce = f6Model ? f6Model.Ce : 0;
          const f3Model = st.activeMeds?.find(m => m.name === 'F3 (Anesthetic)');
          const f3Ce = f3Model ? f3Model.Ce : 0;
          const sIsoModel = st.activeMeds?.find(m => m.name === 'S-Isoflurane');
          const sIsofluraneCe = sIsoModel ? sIsoModel.Ce : 0;
          const rIsoModel = st.activeMeds?.find(m => m.name === 'R-Isoflurane');
          const rIsofluraneCe = rIsoModel ? rIsoModel.Ce : 0;

          const f3MacContribution = f3Ce / 1.2;
          const sIsoMacContribution = sIsofluraneCe / 0.9;
          const rIsoMacContribution = rIsofluraneCe / 1.8;

          displayedMac += f3MacContribution + sIsoMacContribution + rIsoMacContribution;
          brainMac += f3MacContribution + sIsoMacContribution + rIsoMacContribution;

          // Phase 6F: Apply progesterone MAC reduction (lower MAC requirement → same gas concentration
          // achieves a deeper plane). Equivalent to dividing by the effective MAC target.
          // Safe against full suppression by clamping the reduction to 0-0.4.
          const safeMacReduction = Math.min(0.40, st.patient.sexHormoneMacReduction || 0);
          if (safeMacReduction > 0) brainMac = brainMac / (1 - safeMacReduction);

          currentMac = brainMac;

          // Autonomic Nervous System Engine Tick (Phase 3, Stage B of mutable-roaming-
          // newell.md) -- a genuinely new, continuous parasympathetic (vagal) tone
          // signal (previously absent everywhere; existing vagal effects are all
          // separate ad hoc event triggers like the oculocardiac reflex). Added
          // additively into the existing totalHrDelta accumulator, leaving every other
          // existing autonomic mechanism (baroreflex, Bezold-Jarisch, neostigmine
          // bradycardia, etc.) completely unchanged.
          const atropineModelForAns = st.activeMeds?.find(m => m.name === 'Atropine');
          const glycopyrrolateModelForAns = st.activeMeds?.find(m => m.name === 'Glycopyrrolate');
          const ansOutput = AutonomicNervousSystemEngine.tick(
            { oculocardiacTriggered: st.patient.oculocardiacTriggered, laryngospasm: st.patient.laryngospasm },
            {
              currentMac,
              anticholinergicCe: (atropineModelForAns ? atropineModelForAns.Ce : 0) + (glycopyrrolateModelForAns ? glycopyrrolateModelForAns.Ce : 0),
              C_cat: st.patient.C_cat,
              nonNociceptiveSympatheticStimulus: adrenalOutput.nonNociceptiveSympatheticStimulus,
              cortisolLevel: adrenalOutput.cortisolLevel,
              baroreflexErrorMagnitude: Math.abs((st.vitals.map || 93) - (st.patient.MAP_set || 93))
            }
          );
          totalHrDelta += ansOutput.vagalHrEffect;

          // Brainstem Engine Tick (Phase 3, Stage C of mutable-roaming-newell.md) --
          // two confirmed-absent gaps: peripheral chemoreceptor hypoxic ventilatory
          // drive (disproportionately blunted by volatiles/opioids), and the
          // baroreflex's missing vasoconstrictive arm (previously HR-only). Both feed
          // additively into existing accumulators (totalRrDelta here; targetSVR inside
          // CardiovascularEngine.ts via a new drugEffects field below), leaving every
          // existing tested formula unchanged.
          const brainstemOutput = BrainstemEngine.tick({
            spo2: st.vitals.spo2,
            currentMac,
            opioidEffect: opioidEff,
            map: st.vitals.map,
            mapSet: st.patient.MAP_set
          });
          totalRrDelta += brainstemOutput.hypoxicDriveRR;
          totalRrDelta += st.patient.itMorphineRrDelta || 0;

          // Consciousness Engine Tick
          const sevoMac = st.gasModels?.sevoflurane ? st.gasModels.sevoflurane.Fb / calculateAgeAdjustedMAC(INHALATIONAL_AGENTS.sevoflurane.mac40, st.patient.age || 40) : 0;
          const isoMac = st.gasModels?.isoflurane ? st.gasModels.isoflurane.Fb / calculateAgeAdjustedMAC(INHALATIONAL_AGENTS.isoflurane.mac40, st.patient.age || 40) : 0;
          const haloMac = st.gasModels?.halothane ? st.gasModels.halothane.Fb / calculateAgeAdjustedMAC(INHALATIONAL_AGENTS.halothane.mac40, st.patient.age || 40) : 0;
          const n2oMac = st.gasModels?.n2o ? st.gasModels.n2o.Fb / calculateAgeAdjustedMAC(INHALATIONAL_AGENTS.n2o.mac40, st.patient.age || 40) : 0;
          const desMac = st.gasModels?.desflurane ? st.gasModels.desflurane.Fb / calculateAgeAdjustedMAC(INHALATIONAL_AGENTS.desflurane.mac40, st.patient.age || 40) : 0;
          const xenonMac = st.gasModels?.xenon ? st.gasModels.xenon.Fb / calculateAgeAdjustedMAC(INHALATIONAL_AGENTS.xenon.mac40, st.patient.age || 40) : 0;

          // const dexmedCe = dexmedModel ? dexmedModel.Ce : 0;
          // midazolamModel/midazolamCe and ketamineModel/ketamineCe already declared above (~L1211-1214)
          const etomidateModel = st.activeMeds?.find(m => m.name === 'Etomidate');
          const etomidateCe = etomidateModel ? etomidateModel.Ce : 0;
          const atipamezoleModel = st.activeMeds?.find(m => m.name === 'Atipamezole');
          const atipamezoleCe = atipamezoleModel ? atipamezoleModel.Ce : 0;
          const methylphenidateModel = st.activeMeds?.find(m => m.name === 'Methylphenidate');
          const methylphenidateCe = methylphenidateModel ? methylphenidateModel.Ce : 0;
          const scopolamineModel = st.activeMeds?.find(m => m.name === 'Scopolamine');
          const scopolamineCe = scopolamineModel ? scopolamineModel.Ce : 0;

          const f3Ce_total = f3Ce + (st.gasModels?.f3 ? st.gasModels.f3.Fb : 0);
          const sIsoCe_total = sIsofluraneCe + (st.gasModels?.s_isoflurane ? st.gasModels.s_isoflurane.Fb : 0);
          const rIsoCe_total = rIsofluraneCe + (st.gasModels?.r_isoflurane ? st.gasModels.r_isoflurane.Fb : 0);
          const f6Ce_total = f6Ce + (st.gasModels?.f6 ? st.gasModels.f6.Fb : 0);

          const methohexitalModel = st.activeMeds?.find(m => m.name === 'Methohexital');
          const methohexitalCe = methohexitalModel ? methohexitalModel.Ce : 0;

          const gabapentinModel = st.activeMeds?.find(m => m.name === 'Gabapentin');
          const gabapentinCe = gabapentinModel ? gabapentinModel.Ce : 0;
          const pregabalinModel = st.activeMeds?.find(m => m.name === 'Pregabalin');
          const pregabalinCe = pregabalinModel ? pregabalinModel.Ce : 0;
          const topiramateModel = st.activeMeds?.find(m => m.name === 'Topiramate');
          const topiramateCe = topiramateModel ? topiramateModel.Ce : 0;

          let effectivePropofolCe = propofolCe;
          let effectiveThiopentalCe = thiopentalCe;
          let effectiveMidazolamCe = midazolamCe;
          let effectiveEtomidateCe = etomidateCe;
          let effectiveMethohexitalCe = methohexitalCe;

          if (st.patient.mitochondrial) {
              effectivePropofolCe *= 2.0;
              effectiveThiopentalCe *= 2.0;
              effectiveMidazolamCe *= 2.0;
              effectiveEtomidateCe *= 2.0;
              effectiveMethohexitalCe *= 2.0;
          }
          if (st.patient.cmt) {
              effectiveThiopentalCe *= 2.0;
          }

          // F14 fix: flumazenil competitively antagonizes the benzodiazepine GABA-A site, so it reverses
          // midazolam's sedation. Previously flumazenil had no effect on consciousness. Reduce the
          // effective midazolam Ce by a potent, saturating blockade of its Ce.
          const flumazenilModelForBenzo = st.activeMeds?.find(m => m.name === 'Flumazenil');
          const flumazenilCeForBenzo = flumazenilModelForBenzo ? flumazenilModelForBenzo.Ce : 0;
          if (flumazenilCeForBenzo > 0.0005) {
              const benzoBlockade = Math.min(0.95, flumazenilCeForBenzo * 40.0);
              effectiveMidazolamCe *= (1.0 - benzoBlockade);
          }

          const consciousnessOutput = ConsciousnessEngine.tick(1, st.patient, st.vitals, {
              propofolCe: effectivePropofolCe,
              dexmedCe,
              thiopentalCe: effectiveThiopentalCe,
              midazolamCe: effectiveMidazolamCe,
              ketamineCe,
              etomidateCe: effectiveEtomidateCe,
              atipamezoleCe,
              methylphenidateCe,
              scopolamineCe,
              sevoMac,
              isoMac,
              haloMac,
              n2oMac,
              desMac,  // desflurane MAC fraction — absent before, caused BIS≈98 during desflurane GA
              isSyncShock: false,
              time: st.time,
              f3Ce: f3Ce_total,
              sIsofluraneCe: sIsoCe_total,
              rIsofluraneCe: rIsoCe_total,
              f6Ce: f6Ce_total,
              methohexitalCe: effectiveMethohexitalCe,
              gabapentinCe,
              pregabalinCe,
              topiramateCe,
              suvorexantCe: st.activeMeds?.find(m => m.name === 'Suvorexant')?.Ce || 0,
              surgicalStimulus: st.surgicalPhase === 'Incision' || st.surgicalPhase === 'Maintenance',
              spo2: st.vitals.spo2,
              paco2: st.vitals.paco2
          });

          // Chapter 19: Compute receptor-binding occupancies (0.0 - 1.0)
          const gabaa_sum = (effectivePropofolCe / 2.5) + (effectiveMidazolamCe / 0.05) + (effectiveEtomidateCe / 0.3) + (effectiveThiopentalCe / 1.0) + (effectiveMethohexitalCe * (15.0 / 3.5) / 1.0) + sevoMac + isoMac + haloMac + desMac + (f3Ce_total / 1.2) + (sIsoCe_total / 0.9) + (rIsoCe_total / 1.8);
          const gabaa_occupancy = Math.max(0.0, Math.min(1.0, gabaa_sum / (1.0 + gabaa_sum)));

          const glycine_sum = sevoMac + isoMac + haloMac + desMac + (f3Ce_total / 1.2) + (sIsoCe_total / 0.9) + (rIsoCe_total / 1.8) + (effectivePropofolCe / 5.0);
          const glycine_occupancy = Math.max(0.0, Math.min(1.0, glycine_sum / (1.0 + glycine_sum)));

          const k2p_sum = sevoMac + isoMac + haloMac + desMac + n2oMac + xenonMac + (f3Ce_total / 1.2) + (sIsoCe_total / 0.9) + (rIsoCe_total / 1.8);
          const k2p_mult = 1.0 - (st.patient.isTASK1Knockout ? 0.3 : 0.0) - (st.patient.isTASK3Knockout ? 0.3 : 0.0) - (st.patient.isTREK1Knockout ? 0.4 : 0.0);
          const k2p_activation = Math.max(0.0, Math.min(1.0, k2p_mult * (k2p_sum / (1.0 + k2p_sum))));

          const nmda_sum = (ketamineCe / 1.0) + (n2oMac * 1.5) + (xenonMac * 2.0) + (sevoMac + isoMac + haloMac + desMac + (f3Ce_total / 1.2) + (sIsoCe_total / 0.9) + (rIsoCe_total / 1.8)) * 0.5;
          const nmda_blockade = Math.max(0.0, Math.min(1.0, nmda_sum / (1.0 + nmda_sum)));

          const hcn_sum = sevoMac + isoMac + haloMac + desMac + (f3Ce_total / 1.2) + (sIsoCe_total / 0.9) + (rIsoCe_total / 1.8);
          const hcn_mult = st.patient.isHCN1Knockout ? 0.25 : 1.0;
          const hcn_inhibition = Math.max(0.0, Math.min(1.0, hcn_mult * (hcn_sum / (1.0 + hcn_sum))));

          const nav_sum = (lidocaineCe / 2.0) + (sevoMac + isoMac + haloMac + desMac + (f3Ce_total / 1.2) + (sIsoCe_total / 0.9) + (rIsoCe_total / 1.8)) * 0.3;
          const nav_blockade = Math.max(0.0, Math.min(1.0, nav_sum / (1.0 + nav_sum)));

          const cisModel = st.activeMeds?.find(m => m.name === 'Cisatracurium');
          const cisCe = cisModel ? cisModel.Ce : 0;
          const nachr_sum = (f6Ce_total / 2.0) * 3.0 + (sevoMac + isoMac + haloMac + desMac + (f3Ce_total / 1.2) + (sIsoCe_total / 0.9) + (rIsoCe_total / 1.8)) * 2.0 + (scopolamineCe / 0.05) + (rocuroniumCe / 1.5) + (vecuroniumCe / 0.2) + (cisCe / 0.3);
          const nachr_inhibition = Math.max(0.0, Math.min(1.0, nachr_sum / (1.0 + nachr_sum)));

          const receptorOutputs = {
              gabaa_occupancy,
              glycine_occupancy,
              k2p_activation,
              nmda_blockade,
              hcn_inhibition,
              nav_blockade,
              nachr_inhibition
          };

          // Merge consciousnessOutput and receptorOutputs into st.patient and patientAfterFluidics
          Object.assign(st.patient, consciousnessOutput, receptorOutputs);
          Object.assign(patientAfterFluidics, consciousnessOutput, receptorOutputs);

          // Chapter 9: Clinical Crises & Reflex Loops
          const isParalyzed = maxNMJOccupancy > 0.90;
          // Awareness gate: ketamine > 1 mcg/mL = dissociative state — no silent awareness
          // even though patient is "unconscious" (ketamine keeps EEG active, BIS elevated).
          const ketamineCeForAwareness = ketamineCe || 0;
          const isLightAnesthesia = currentMac < 0.4 && (effectivePropofolCe < 0.8) && (effectiveThiopentalCe < 1.0) && (effectiveMidazolamCe < 0.05) && (effectiveEtomidateCe < 0.1) && (ketamineCeForAwareness < 1.0);
          const surgicalStimulus = st.surgicalPhase === 'Incision' || st.surgicalPhase === 'Maintenance';
          const hasAwarenessTrigger = isParalyzed && isLightAnesthesia && surgicalStimulus;

          let isAwarenessActive = st.patient.isAwarenessActive || false;
          let ptsdScore = st.patient.ptsdScore || 0.0;
          let hasExplicitRecall = st.patient.hasExplicitRecall || false;
          let hasImplicitRecall = st.patient.hasImplicitRecall || false;

          let awarenessHrOffset = 0;
          let awarenessSvrOffset = 0;

          if (hasAwarenessTrigger) {
              if (!isAwarenessActive) {
                  isAwarenessActive = true;
                  logEvent(`🚨 WARNING: Patient is PARALYZED but experiencing CONNECTED AWARENESS due to inadequate anesthesia!`);
              }
              
              // Severe sympathetic surge: spikes HR by +35, SBP/DBP by +45 (implemented as offsets)
              awarenessHrOffset = 35;
              awarenessSvrOffset = 45;

              // Midazolam administration during awareness (Ce > 0.08) prevents explicit memory consolidation
              // Midazolam during awareness blocks consolidation (doesn't clear PTSD score, but noted)
              const midazolamAmnestic = midazolamCe > 0.08;
              if (!midazolamAmnestic) {
                  // Accumulate PTSD risk
                  ptsdScore = Math.min(100.0, ptsdScore + 1.2);
                  if (ptsdScore > 60.0 && !st.patient.ptsdLogged) {
                      logEvent(`🚨 CRITICAL ERROR: Patient experienced connected intraoperative awareness during surgery! Sympathetic storm occurred with severe risk of PTSD.`);
                      st.patient.ptsdLogged = true;
                  }
                  // Consolidate explicit recall if encoding is active
                  if (consciousnessOutput.explicitEncoding > 0.5 && consciousnessOutput.explicitConsolidation < 1.0) {
                      hasExplicitRecall = true;
                  }
              }

              // Nonconscious implicit memory (priming) can occur even in deeper levels (propofolCe < 1.5)
              if (propofolCe < 1.5 && currentMac < 0.6) {
                  hasImplicitRecall = true;
              }
          }

          // Resolution criteria for Connected Awareness:
          // Volatile MAC increased to >0.8 OR propofol infusion is started (Ce > 1.5)
          // Awareness risk drops significantly at MAC > 0.6 or propofol Ce > 1.2 mcg/mL (Avidan 2008).
          // Prior thresholds (0.8/1.5) were too high — awareness could persist unnecessarily.
          const restoredDepth = currentMac > 0.6 || propofolCe > 1.2;
          if (isAwarenessActive && restoredDepth) {
              isAwarenessActive = false;
              logEvent(`✅ SUCCESS: Anesthetic depth restored. Connected consciousness suppressed.`);
          }

          // B. Narcolepsy Emergence Lag (Hysteresis)
          let displayEmergenceLag = false;
          if (st.surgicalPhase === 'Emergence' && currentMac < 0.1 && propofolCe < 0.1) {
              if (consciousnessOutput.neuralInertiaLag > 0.15) {
                  displayEmergenceLag = true;
                  if (!st.patient.emergenceLagLogged) {
                      logEvent(`ℹ️ CLINICAL UPDATE: Patient is in emergence lag. Neural inertia is preventing immediate wakefulness despite clearance of anesthetic agents.`);
                      st.patient.emergenceLagLogged = true;
                  }
              } else if (st.patient.emergenceLagLogged && !st.patient.emergenceLagResolved) {
                  logEvent(`✅ SUCCESS: Patient has emerged from anesthesia. Neural inertia overcome.`);
                  st.patient.emergenceLagResolved = true;
              }
          }

          if (st.patient.isF6Active) {
              st.patient.explicitEncoding = 0;
              patientAfterFluidics.explicitEncoding = 0;
          }

          // Apply updates to the patient state object
          st.patient.isAwarenessActive = isAwarenessActive;
          st.patient.ptsdScore = ptsdScore;
          st.patient.hasExplicitRecall = hasExplicitRecall;
          st.patient.hasImplicitRecall = hasImplicitRecall;
          st.patient.displayEmergenceLag = displayEmergenceLag;

          patientAfterFluidics.isAwarenessActive = isAwarenessActive;
          patientAfterFluidics.ptsdScore = ptsdScore;
          patientAfterFluidics.hasExplicitRecall = hasExplicitRecall;
          patientAfterFluidics.hasImplicitRecall = hasImplicitRecall;
          patientAfterFluidics.displayEmergenceLag = displayEmergenceLag;

          // Thermoregulation: Pennes bioheat-based core temperature physics (Phase 4,
          // ThermoregulationModel.ts), replacing the prior flat tempDropRate constant.
          // The shivering/MH metabolic multipliers below still apply to `totalMetabolicMultiplier`
          // used for VO2/CO2 effects; the TEMPERATURE effect now comes from the bioheat balance.
          const thermoOutput = ThermoregulationModel.tick({
              prevCoreTemp: st.vitals.temp || 37.0,
              weightKg: st.patient.weight,
              heightCm: st.patient.height,
              metabolicHeatMultiplier: 1.0, // shivering/MH will be applied BELOW; passed here pre-MH
              environmentTempC: st.patient.orRoomTemp || 20,
              bsaExposureFraction: typeof st.patient.bsaExposureFraction === 'number' ? st.patient.bsaExposureFraction : (currentMac > 0.3 ? 0.45 : 0.2),
              isAnesthetized: currentMac > 0.3,
              anesthesiaTimeSeconds: (currentMac > 0.3) ? (st.patient.anesthesiaStartTime !== undefined ? Math.max(0, st.time - st.patient.anesthesiaStartTime) : st.time) : 0,
              surgicalWoundOpenFraction: st.patient.manipulationIndex || 0,
              forcedAirWarmingActive: !!st.patient.forcedAirWarmingActive,
              warmBlanketActive: !!st.patient.warmBlanketActive,
              dt: 1
          });
          // fluidicsOutput.fluidInducedTempDrop is already a per-tick delta in °C (negative = cold
          // fluids cooling) -- add directly alongside the bioheat delta, NOT converted to Watts.
          let newTemp = (st.vitals.temp || 37.0) + thermoOutput.coreTemperatureDeltaPerSec + (fluidicsOutput.fluidInducedTempDrop || 0);
          if (st.patient.cprActive) newTemp -= 0.002;
          newTemp += ruleTempOffset;

          // Malignant Hyperthermia logic (Ch35)
          const suxModelForMh = st.activeMeds?.find(m => m.name === 'Succinylcholine');
          const suxCeForMh = suxModelForMh ? suxModelForMh.Ce : 0;
          
          let mhActive = st.patient.mhActive || false;
          let mhStartTime = st.patient.mhStartTime !== undefined ? st.patient.mhStartTime : null;
          
          if (st.patient.mhSusceptible && !mhActive) {
              if (currentEtAgent > 0.01 || suxCeForMh > 0.01) {
                  mhActive = true;
                  mhStartTime = st.time;
                  logQualityEvent({
                      category: 'CrisisManagement',
                      severity: 'critical',
                      description: `Malignant Hyperthermia crisis triggered by exposure to ${currentEtAgent > 0.01 ? 'volatile agent' : 'succinylcholine'} in a susceptible patient.`,
                      idealAction: 'Avoid volatile anesthetics and succinylcholine; use Total Intravenous Anesthesia (TIVA).',
                      actualAction: `Administered ${currentEtAgent > 0.01 ? 'volatile agent' : 'succinylcholine'}.`,
                      impact: 'Severe hypermetabolic state, hypercapnia, lactic acidosis, life-threatening hyperkalemia, and cardiovascular collapse.',
                      chapterSource: "Miller's Anesthesia Chapter 35"
                  });
              }
          }

          const dantroleneModelForMh = st.activeMeds?.find(m => m.name === 'Dantrolene');
          const dantroleneCeForMh = dantroleneModelForMh ? dantroleneModelForMh.Ce : 0;
          const isHalothaneActiveInCircuit = st.gasModels?.halothane && st.gasModels.halothane.Fa > 0.01;
          const magnesiumModelForMh = st.activeMeds?.find(m => m.name === 'Magnesium Sulfate');
          const magnesiumCeForMh = magnesiumModelForMh ? magnesiumModelForMh.Ce : 0;
          const isReversedByDantrolene = dantroleneCeForMh > 0.5 || (isHalothaneActiveInCircuit && dantroleneCeForMh > 0.25 && magnesiumCeForMh > 0.1);
          
          if (mhActive && isReversedByDantrolene) {
              mhActive = false;
              st.patient.mhActive = false;
              patientAfterFluidics.mhActive = false;
              logEvent("✅ SUCCESS: Dantrolene administered. Malignant Hyperthermia crisis resolved. Hypermetabolic state terminating.");
          }

          let mhMetabolicMultiplier = 1.0;
          if (mhActive) {
              mhMetabolicMultiplier = 5.0;
              if (st.patient.coolingMeasuresActive) {
                  newTemp = Math.max(38.0, newTemp - 0.15);
              } else {
                  newTemp = Math.min(43.0, newTemp + 0.05);
              }
          }

          // Save the updated MH variables
          st.patient.mhActive = mhActive;
          st.patient.mhStartTime = mhStartTime;
          patientAfterFluidics.mhActive = mhActive;
          patientAfterFluidics.mhStartTime = mhStartTime;

          let shiveringMultiplier = 1.0;
          if (newTemp < 35.5 && currentMac < 0.2 && maxNMJOccupancy < 0.5 && st.surgicalPhase === 'Emergence') {
              shiveringMultiplier = Math.min(5.0, 1.0 + ((35.5 - newTemp) * 2.5));
          }

          // Intraoperative hypothermia quality event — fires once per threshold crossed.
          // Without active warming, patients cool ~1-2°C/hr under GA. Never warned until now.
          {
              const isActivelyWarming = !!st.patient.forcedAirWarmingActive || !!st.patient.warmBlanketActive;
              const isIntraop = st.surgicalPhase === 'Induction' || st.surgicalPhase === 'Incision' || st.surgicalPhase === 'Maintenance';
              if (isIntraop && !isActivelyWarming) {
                  if (newTemp < 36.0 && !st.patient.prevHypothermia36Logged) {
                      st.patient.prevHypothermia36Logged = true;
                      logQualityEvent({
                          category: 'ChecklistAdherence', severity: 'minor',
                          description: `Core temperature dropped to ${newTemp.toFixed(1)}°C without active warming. Hypothermia increases SSI risk, coagulopathy, shivering at emergence, and prolongs drug effect.`,
                          idealAction: 'Apply forced-air warming (Bair Hugger) at induction; maintain throughout.',
                          actualAction: `Temperature reached ${newTemp.toFixed(1)}°C without warming device active.`,
                      });
                  }
                  if (newTemp < 35.0 && !st.patient.prevHypothermia35Logged) {
                      st.patient.prevHypothermia35Logged = true;
                      logQualityEvent({
                          category: 'ChecklistAdherence', severity: 'moderate',
                          description: `Core temperature ${newTemp.toFixed(1)}°C — moderate hypothermia. Platelet dysfunction begins; VF risk at <32°C. Apply forced-air warming and warm IV fluids immediately.`,
                          idealAction: 'Forced-air warming + warm IV fluids. Consider fluid warmer for large-volume cases.',
                          actualAction: `Temperature ${newTemp.toFixed(1)}°C reached with no active warming in place.`,
                      });
                  }
              }
          }

          if (st.patient.serotoninSyndromeTriggered) {
              newTemp += 0.05;
          }
          if (st.patient.carbamazepineDyscrasiaActive) {
              if (newTemp < 39.5) {
                  newTemp = Math.min(39.5, newTemp + 0.05);
              }
          } else {
              // Thyroid status shifts the passive equilibration target (Phase 2, Stage B
              // of mutable-roaming-newell.md) -- hypothyroid patients' baseline runs
              // slightly cool (reduced heat production), hyperthyroid/heat-intolerant
              // patients' baseline runs slightly warm, rather than every patient
              // equilibrating to the exact same 37.0 regardless of thyroid status.
              const thyroidAdjustedTempTarget = 37.0 + thyroidTempBaselineShift;
              if (newTemp > thyroidAdjustedTempTarget && !st.patient.serotoninSyndromeTriggered && !st.patient.isHepatitisActive && !mhActive) {
                  newTemp = Math.max(thyroidAdjustedTempTarget, newTemp - 0.05);
              }
          }

          // === CHAPTER 20: METABOLISM & TOXICITY LOOPS ===
          
          // Initialize absorbent if missing
          if (!st.patient.absorbent) {
              st.patient.absorbent = { waterContent: 15.0, temperature: 22.0, type: 'soda_lime' };
          }
          
          // Desiccation logic: High FGF over time reduces water content
          if (freshGasFlow > 10.0) {
              st.patient.absorbent.waterContent = Math.max(0.5, st.patient.absorbent.waterContent - 0.005);
          }

          // 1. Halothane Hepatitis Loop
          const isHalothaneActive = st.gasSettings?.agent === 'halothane';
          const faHalo = isHalothaneActive ? currentEtAgent : 0.0;
          let tfaAdducts = st.patient.tfaAdducts || 0.0;
          if (isHalothaneActive) {
              tfaAdducts += 0.03 * faHalo; // generates TFA neoantigens
          }
          st.patient.tfaAdducts = tfaAdducts;

          let ast = st.patient.AST || 25.0;
          let alt = st.patient.ALT || 25.0;
          let bilirubin = st.patient.bilirubin || 1.0;
          let inr = st.patient.inr || 1.0;
          let albumin = st.patient.albumin || 4.0;
          const priorExposure = st.patient.priorAnestheticExposure || false;
          let isHepatitisActive = st.patient.isHepatitisActive || false;

          if (!isHalothaneActive && tfaAdducts > 0) {
              tfaAdducts = Math.max(0, tfaAdducts - 0.02);
          }
          if (tfaAdducts < 1.0) {
              st.patient.halothaneHepatitisRolled = undefined;
          }
          if (tfaAdducts > 15.0 && !isHepatitisActive && st.patient.halothaneHepatitisRolled === undefined) {
              const baseProb = 0.005; // 0.5% base probability when threshold is crossed
              const age = typeof st.patient.age === 'number' ? st.patient.age : 40;
              const isObese = st.patient.isObese || (st.patient.bmi && st.patient.bmi > 30.0);
              const hasRisk = (priorExposure ? 10.0 : 1.0) * (isObese ? 2.0 : 1.0) * (st.patient.sex === 'female' ? 2.0 : 1.0) * (age > 30 && age < 60 ? 2.0 : 1.0);
              const prob = Math.min(1.0, baseProb * hasRisk);
              st.patient.halothaneHepatitisRolled = rng() < prob;
              
              if (st.patient.forceHalothaneHepatitis || st.patient.halothaneHepatitisRolled) {
                  isHepatitisActive = true;
                  logEvent("🚨 CRITICAL EMERGENCY: Massive immune-mediated hepatocellular injury (Halothane Hepatitis) has been triggered by toxic trifluoroacetyl (TFA) neoantigens!");
              } else {
                  st.patient.halothaneHepatitisRolled = false;
                  logEvent("⚠️ Clinical Note: High levels of TFA neoantigens detected. Fortunately, immune-mediated Halothane Hepatitis did not trigger (baseline clinical susceptibility is limited).");
              }
          }

          if (isHepatitisActive) {
              ast = Math.min(1500, ast + 15.0);
              alt = Math.min(1600, alt + 18.0);
              bilirubin = Math.min(15.0, bilirubin + 0.1);
              inr = Math.min(4.0, inr + 0.03);
              albumin = Math.max(1.5, albumin - 0.02);
              // Systemic inflammatory response spikes temperature
              newTemp = Math.min(41.0, newTemp + 0.02);
          }

          // Resolution of hepatitis: stop halothane and administer dexamethasone
          const hasDexamethasone = st.activeMeds?.find(m => m.name === 'Dexamethasone')?.Ce > 0.01;
          if (isHepatitisActive && !isHalothaneActive && hasDexamethasone) {
              isHepatitisActive = false;
              logEvent("✅ SUCCESS: Halothane Hepatitis is resolving under high-dose corticosteroid therapy and volatile drug removal.");
          }

          if (!isHepatitisActive && (ast > 25.0 || alt > 25.0)) {
              ast = Math.max(25.0, ast - 5.0);
              alt = Math.max(25.0, alt - 5.0);
              bilirubin = Math.max(1.0, bilirubin - 0.05);
              inr = Math.max(1.0, inr - 0.01);
              albumin = Math.min(4.0, albumin + 0.01);
              newTemp = Math.max(37.0, newTemp - 0.02);
          }
          
          st.patient.AST = ast;
          st.patient.ALT = alt;
          st.patient.bilirubin = bilirubin;
          st.patient.inr = inr;
          st.patient.albumin = albumin;
          st.patient.isHepatitisActive = isHepatitisActive;

          // 2. Methoxyflurane Fluoride-Induced Nephrotoxicity Loop
          const isMethoxyfluraneActive = st.gasSettings?.agent === 'methoxyflurane';
          const faMeth = isMethoxyfluraneActive ? currentEtAgent : 0.0;
          let serumFluoride = st.patient.serumFluoride || 0.0;
          let accumulatedFluorideTime = st.patient.accumulatedFluorideTime || 0.0;

          if (isMethoxyfluraneActive) {
              serumFluoride += 0.5 * faMeth - 0.02 * serumFluoride;
          } else {
              serumFluoride = Math.max(0.0, serumFluoride - 0.05);
          }

          if (serumFluoride > 50.0) {
              // 1s sim = 1min patient time (1/60 hours)
              accumulatedFluorideTime += (serumFluoride - 50.0) * (1.0 / 60.0);
          }
          st.patient.serumFluoride = serumFluoride;
          st.patient.accumulatedFluorideTime = accumulatedFluorideTime;

          let hasFluorideNephrotoxicity = st.patient.hasFluorideNephrotoxicity || false;
          if (serumFluoride < 5.0) {
              st.patient.methoxyfluraneNephrotoxicityRolled = undefined;
          }
          if (accumulatedFluorideTime > 150.0 && !hasFluorideNephrotoxicity && st.patient.methoxyfluraneNephrotoxicityRolled === undefined) {
              const baseProb = 0.15; // 15% base probability when cumulative dose is reached
              const isElderly = typeof st.patient.age === 'number' && st.patient.age > 65;
              const hasRenalDisease = st.patient.isRenal || st.patient.renalFailure || st.patient.hasAki;
              const modifier = (isElderly ? 2.0 : 1.0) * (hasRenalDisease ? 3.0 : 1.0);
              const prob = Math.min(1.0, baseProb * modifier);
              st.patient.methoxyfluraneNephrotoxicityRolled = rng() < prob;
              
              if (st.patient.forceMethoxyfluraneNephrotoxicity || st.patient.methoxyfluraneNephrotoxicityRolled) {
                  hasFluorideNephrotoxicity = true;
                  logEvent("🚨 CRITICAL ALERT: Toxic fluoride threshold exceeded (>50 µM for >150 µM-hours)! Methoxyflurane-induced high-output renal failure triggered.");
              } else {
                  st.patient.methoxyfluraneNephrotoxicityRolled = false;
                  logEvent("⚠️ Clinical Note: High accumulated fluoride exposure from Methoxyflurane. Fortunately, severe high-output nephrotoxicity did not trigger (baseline clinical susceptibility is limited).");
              }
          }

          if (hasFluorideNephrotoxicity) {
              st.patient.urineOutputRate = 4.5 * st.patient.weight; // polyuria
              st.patient.urineOsmolality = 300.0; // isosthenuria
              st.patient.feNa = 3.5; // sodium wasting
              st.patient.creatinine = Math.min(8.0, st.patient.creatinine + 0.01);
              st.patient.bun = Math.min(120.0, st.patient.bun + 0.5);
              st.patient.akiStage = 3;
              st.patient.akiDamage = Math.min(1.0, st.patient.akiDamage + 0.005);
              st.patient.hasAki = true;
              // Dehydration increases EBL to drain intravascular volume
              st.patient.ebl = (st.patient.ebl || 0.0) + 1.5;
          }

          // Resolution: stop methoxyflurane and flush
          if (!isMethoxyfluraneActive && serumFluoride < 30.0 && hasFluorideNephrotoxicity) {
              st.patient.urineOutputRate = Math.max(70.0, st.patient.urineOutputRate - 5.0);
              if (st.patient.urineOutputRate <= 70.0) {
                  hasFluorideNephrotoxicity = false;
                  logEvent("✅ SUCCESS: High-output renal failure resolved. Renal concentration function has recovered.");
              }
          }
          st.patient.hasFluorideNephrotoxicity = hasFluorideNephrotoxicity;

          // 3. Carbon Dioxide Absorbent Chemical Degradation
          const isDesfluraneActive = st.gasSettings?.agent === 'desflurane';
          const isIsofluraneActive = st.gasSettings?.agent === 'isoflurane';
          const isSevofluraneActive = st.gasSettings?.agent === 'sevoflurane';

          // Carbon Monoxide Poisoning
          if (st.patient.absorbent.waterContent < 1.4 && (isDesfluraneActive || isIsofluraneActive)) {
              const coRate = isDesfluraneActive ? 0.3 : 0.08;
              st.patient.coHb = Math.min(80.0, (st.patient.coHb || 1.0) + coRate * currentEtAgent);
              if (st.patient.coHb > 15.0 && !st.patient.hasCoPoisoningLog) {
                  logEvent("🚨 CRITICAL EMERGENCY: Desiccated CO2 absorbent reacting with difluoromethyl group! Carbon Monoxide (CO) poisoning in progress.");
                  st.patient.hasCoPoisoningLog = true;
              }
          }

          // Sevoflurane & Compound A
          if (isSevofluraneActive && freshGasFlow < 2.0 && currentEtAgent > 0.1) {
              st.patient.compoundA = (st.patient.compoundA || 0.0) + 0.05 * currentEtAgent * (2.0 - freshGasFlow);
              if (st.patient.compoundA > 150.0 && !st.patient.hasCompoundALog) {
                  logEvent("⚠️ CLINICAL ALERT: Low fresh gas flow with Sevoflurane has produced nephrotoxic Compound A exceeding 150 ppm-hours in the loop!");
                  st.patient.hasCompoundALog = true;
              }
          }

          // Exothermic Canister Reaction & Airway Fire
          if (st.patient.absorbent.waterContent < 1.4 && isSevofluraneActive && currentEtAgent > 0.5) {
              st.patient.absorbent.temperature = (st.patient.absorbent.temperature || 22.0) + 0.5 * currentEtAgent;
              if (st.patient.absorbent.temperature < 40.0) {
                  st.patient.airwayFireRolled = undefined;
              }
              if (st.patient.absorbent.temperature > 80.0 && !st.patient.isAirwayFire && st.patient.airwayFireRolled === undefined) {
                  const baseProb = 0.02; // 2% chance of runaway exothermic reaction leading to active fire
                  st.patient.airwayFireRolled = rng() < baseProb;
                  if (st.patient.forceAirwayFire || st.patient.airwayFireRolled) {
                      st.patient.isAirwayFire = true;
                      logEvent("🚨🚨 CRITICAL EMERGENCY: Desiccated CO2 absorbent has undergone a runaway exothermic reaction with Sevoflurane! Canister temperature has exceeded 80°C, melting circuit plastics and triggering an active AIRWAY FIRE!");
                  } else {
                      st.patient.airwayFireRolled = false;
                      logEvent("⚠️ Clinical Note: Carbon dioxide canister temperature is dangerously high (>80°C) due to Sevoflurane reacting with desiccated soda lime. Fortunately, a runaway exothermic ignition did not trigger an active airway fire. Swap the CO2 absorbent canister immediately!");
                  }
              }
          }

          // If airway fire is active, damage respiratory tree and drop SpO2
          if (st.patient.isAirwayFire) {
              ruleSpo2Offset -= 2.0; 
              ruleComplScale *= 0.15;
              rulePipOffset += 30; // PIP spikes
          }

          // 4. Nitrous Oxide-Induced Vitamin B12 & Methionine Synthase Shutdown
          const isN2OActive = currentEtN2O > 30.0;
          let methionineSynthaseActivity = st.patient.methionineSynthaseActivity !== undefined ? st.patient.methionineSynthaseActivity : 1.0;
          let homocysteine = st.patient.homocysteine || 10.0;
          const b12Baseline = st.patient.b12Baseline || 400.0;

          if (isN2OActive && b12Baseline < 200.0) {
              methionineSynthaseActivity = Math.max(0.0, methionineSynthaseActivity - 0.05);
              if (methionineSynthaseActivity === 0.0 && !st.patient.hasB12ShutdownLog) {
                  logEvent("🚨 CRITICAL ALERT: Nitrous Oxide has irreversibly oxidized Vitamin B12, causing complete shutdown of Methionine Synthase activity!");
                  st.patient.hasB12ShutdownLog = true;
              }
          }

          if (methionineSynthaseActivity < 0.2) {
              homocysteine += 1.5;
              if (homocysteine > 100.0 && !st.patient.hasHomocysteineLog) {
                  logEvent("🚨 WARNING: Severe hyperhomocysteinemia! Vascular endothelial inflammation and risk of subacute combined degeneration of the spinal cord is high.");
                  st.patient.hasHomocysteineLog = true;
              }
          }
          st.patient.methionineSynthaseActivity = methionineSynthaseActivity;
          st.patient.homocysteine = homocysteine;

          // 5. Pediatric Anesthesia Neurodevelopmental Risk & Postoperative Cognitive Decline (POCD)
          let pediatricNeuroRisk = st.patient.pediatricNeuroRisk || 0.0;
          let pocdRisk = st.patient.pocdRisk || 0.0;
          const isAnestheticActive = currentMac > 0.4 || (propofolCe || 0) > 0.5;

          if (isAnestheticActive && st.time > 240.0) { // >4 hours exposure
              if (st.patient.age < 2.0) {
                  pediatricNeuroRisk += 0.05;
                  if (pediatricNeuroRisk > 5.0 && !st.patient.hasPediatricNeuroLog) {
                      logEvent("🚨 CLINICAL ALERT: Prolonged exposure to general anesthesia in a patient under 2 years old has exceeded 4 hours. Neurodevelopmental apoptotic injury risk is accumulating.");
                      st.patient.hasPediatricNeuroLog = true;
                  }
              } else if (st.patient.age > 65.0) {
                  pocdRisk += 0.05;
                  if (pocdRisk > 5.0 && !st.patient.hasPocdLog) {
                      logEvent("🚨 CLINICAL ALERT: Prolonged exposure to general anesthesia in an elderly patient has exceeded 4 hours. Postoperative Cognitive Decline (POCD) risk is accumulating.");
                      st.patient.hasPocdLog = true;
                  }
              }
          }
          st.patient.pediatricNeuroRisk = pediatricNeuroRisk;
          st.patient.pocdRisk = pocdRisk;
          
          // === CHAPTER 21: PULMONARY PHARMACOLOGY & RESPIRATORY DRIVE ===
          const activeAgent = st.gasSettings?.agent;

          // === PEDIATRIC PHYSIOLOGY ===
          // Must run before agentMac computation — MAC correction changes all downstream depth signals.
          const pediatricOutput = PediatricPhysiologyEngine.tick({
            ageYears: st.patient.age,
            weightKg: st.patient.weight,
            currentAgent: activeAgent,
            currentHR: st.vitals.hr,
            currentMAP: st.vitals.map,
            currentSpo2: st.vitals.spo2,
            hasPFO: st.patient.hasPFO,
            currentPvr: (st.vitals.mPAP || 16) / 16, // PVR relative to normal (mPAP proxy)
            prevPediatricBradycardiaLogged: !!st.patient.prevPediatricBradycardiaLogged,
          });
          pediatricOutput.events.forEach(e => logEvent(e));
          st.patient.ageMacMultiplier = pediatricOutput.ageMacMultiplier;
          st.patient.pediatricHRTarget = pediatricOutput.pediatricHRTarget;
          st.patient.pediatricMAPFloor = pediatricOutput.pediatricMAPFloor;
          st.patient.pfoShuntContribution = pediatricOutput.pfoShuntContribution;
          st.patient.hepaticMaturityFactor = pediatricOutput.hepaticMaturityFactor;
          st.patient.prevPediatricBradycardiaLogged = pediatricOutput.prevPediatricBradycardiaLogged;

          // Age-corrected MAC: agentMac = currentMac / ageMacMultiplier
          // E.g., ET-sevo 2.0% in a 3-month infant: currentMac=1.0 (adult), agentMac=1.0/1.6=0.625 (actual depth)
          const agentMac = currentMac / (pediatricOutput.ageMacMultiplier || 1.0); // pediatric-corrected MAC

          // 1. Cilia Beat Frequency & Mucus Transport
          let ciliaBeatFrequency = st.patient.ciliaBeatFrequency !== undefined ? st.patient.ciliaBeatFrequency : 100.0;
          ciliaBeatFrequency = 100.0 - 25.0 * agentMac - (st.patient.tobaccoSmoker ? 30.0 : 0.0) - (st.gasSettings?.freshGasFlow > 5.0 ? 15.0 : 0.0);
          ciliaBeatFrequency = Math.max(10.0, ciliaBeatFrequency);
          st.patient.ciliaBeatFrequency = ciliaBeatFrequency;

          let ciliaryAtelectasisAccumulation = st.patient.ciliaryAtelectasisAccumulation || 0.0;
          let isMucusPlugged = st.patient.isMucusPlugged || false;
          if (ciliaBeatFrequency < 45.0) {
              ciliaryAtelectasisAccumulation += 0.015 * (45.0 - ciliaBeatFrequency) / 100.0;
              if (ciliaryAtelectasisAccumulation < 0.1) {
                  st.patient.mucusPlugRolled = undefined;
              }
              if (ciliaryAtelectasisAccumulation > 3.0 && !isMucusPlugged && st.patient.mucusPlugRolled === undefined) {
                  const baseProb = 0.05; // 5% base chance of thick mucus plug forming
                  const hasRisk = (st.patient.tobaccoSmoker ? 2.0 : 1.0) * (st.patient.copd ? 2.0 : 1.0) * (st.patient.asthma ? 2.0 : 1.0);
                  const prob = Math.min(1.0, baseProb * hasRisk);
                  st.patient.mucusPlugRolled = rng() < prob;
                  
                  if (st.patient.forceMucusPlug || st.patient.mucusPlugRolled) {
                      isMucusPlugged = true;
                      logEvent("🚨 CLINICAL ALERT: Severe ciliary beat frequency inhibition and mucous pooling have produced a focal mucous plug in the main bronchus!");
                  } else {
                      st.patient.mucusPlugRolled = false;
                      logEvent("⚠️ Clinical Note: Inadequate ciliary clearance and dry gases present. Fortunately, a focal mainstem bronchus mucus plug did not consolidate (occurs in ~5% of un-humidified circuits over time).");
                  }
              }
          }
          st.patient.ciliaryAtelectasisAccumulation = ciliaryAtelectasisAccumulation;
          st.patient.isMucusPlugged = isMucusPlugged;

          // 2. Surfactant Production (Alveolar Type II cells)
          let surfactantProduction = st.patient.surfactantProduction !== undefined ? st.patient.surfactantProduction : 100.0;
          surfactantProduction = Math.max(10.0, 100.0 - 20.0 * agentMac * (st.time > 600 ? 1.5 : 1.0));
          st.patient.surfactantProduction = surfactantProduction;

          // 3. Hypoxic Pulmonary Vasoconstriction (HPV) Inhibition
          // 20-30% HPV depression at 1 MAC, 50% at MAC 2 for older halogenated agents
          // (isoflurane, halothane). Modern agents (sevoflurane, desflurane) have little
          // effect; IV anesthetics do not inhibit HPV. Fig 13.22 & p.2348, Miller's 9th Ed.
          let hpvInhibition = 0.0;
          if (activeAgent) {
              const hpvPotency = INHALATIONAL_AGENTS[activeAgent]?.hpvPotency ?? 0.0;
              hpvInhibition = Math.min(0.90, agentMac * 0.25 * hpvPotency);
          }
          st.patient.hpvInhibition = hpvInhibition;

          // === PULMONARY HYPERTENSION ===
          {
            const phOutput = PulmonaryHypertensionModel.tick({
              phPresent: !!st.patient.phPresent,
              phWhoGroup: st.patient.phWhoGroup,
              phSeverity: st.patient.phSeverity || undefined,
              baselineMpap: st.patient.baselineMpap,
              pcwp: st.vitals.lvedp || 8,
              currentCO: st.vitals.co,
              currentMAP: st.vitals.map,
              currentCVP: st.vitals.cvp,
              currentPEEP: (activeVentSettings && activeVentSettings.peep) || 5,
              currentPaCO2: st.vitals.paco2,
              currentPaO2: st.vitals.pao2,
              currentPH: electrolytes ? electrolytes.ph : 7.4,
              sympatheticActivation: (st.patient.C_cat || 0) / 10,
              n2oActive: !!(activeGasSettings && activeGasSettings.agent === 'n2o'),
              inoActive: !!st.patient.inoActive,
              inoPpm: st.patient.inoPpm || 0,
              inhaledEpoprostenolActive: !!st.patient.inhaledEpoprostenolActive,
              inhaledEpoprostenolDose: st.patient.inhaledEpoprostenolDose || 0,
              milrinoneCe: (() => { const m = st.activeMeds?.find(x => x.name === 'Milrinone'); return m ? m.Ce : 0; })(),
              sildenafilCe: (() => { const m = st.activeMeds?.find(x => x.name === 'Sildenafil'); return m ? m.Ce : 0; })(),
              inoJustStopped: !!st.patient.inoJustStopped,
              prevPHCrisisLogged: !!st.patient.prevPHCrisisLogged,
              prevRVFailureLogged: !!st.patient.prevRVFailureLogged,
              prevInoStartLogged: !!st.patient.prevInoStartLogged,
              prevReboundLogged: !!st.patient.prevReboundLogged,
            });
            phOutput.events.forEach(e => logEvent(e));
            st.patient.prevPHCrisisLogged = phOutput.prevPHCrisisLogged;
            st.patient.prevRVFailureLogged = phOutput.prevRVFailureLogged;
            st.patient.prevInoStartLogged = phOutput.prevInoStartLogged;
            st.patient.prevReboundLogged = phOutput.prevReboundLogged;
            // Feed mPAP into vitals
            if (st.patient.phPresent) {
              st.vitals.mPAP = phOutput.currentMpap;
            }
            // RV failure reduces effective inotropy (accumulate before CV engine)
            // Store for use in the CV engine block (same pattern as maoiSVRSpikeContribution)
            st.patient.phRvInotropyPenalty = phOutput.rvInotropyPenalty;
          }

          // === ONE-LUNG VENTILATION ===
          {
            const olvOutput = OneLungVentilationModel.tick({
              olvActive: !!st.patient.olvActive,
              olvStartTimeSec: st.patient.olvStartTimeSec || st.time,
              currentTimeSec: st.time,
              hpvInhibitionFraction: hpvInhibition,
              olvCpapCmH2O: st.patient.olvCpapCmH2O || 0,
              olvLateralOperativeLungUp: !!st.patient.olvLateralOperativeLungUp,
              dltInPlace: !!st.patient.dltInPlace,
              dltMalpositioned: !!st.patient.dltMalpositioned,
              prevOlvOnsetLogged: !!st.patient.prevOlvOnsetLogged,
              prevOlvHypoxiaLogged: !!st.patient.prevOlvHypoxiaLogged,
              prevOlvMalpositionLogged: !!st.patient.prevOlvMalpositionLogged,
              currentSpO2: st.vitals.spo2,
            });
            olvOutput.events.forEach(e => logEvent(e));
            st.patient.olvShuntContribution = olvOutput.olvShuntContribution;
            st.patient.olvCompliancePenaltyFraction = olvOutput.olvCompliancePenaltyFraction;
            st.patient.prevOlvOnsetLogged = olvOutput.prevOlvOnsetLogged;
            st.patient.prevOlvHypoxiaLogged = olvOutput.prevOlvHypoxiaLogged;
            st.patient.prevOlvMalpositionLogged = olvOutput.prevOlvMalpositionLogged;
          }

          // === CARBON MONOXIDE POISONING ===
          {
            const coOutput = CarbonMonoxideModel.tick({
              coHbPercent: st.patient.coHb || 1.0,
              smokeExposureActive: !!st.patient.smokeExposureActive,
              smokeSeverity: st.patient.smokeSeverity || 0,
              currentFiO2: st.vitals.fio2 || 0.21,
              hyperbaricO2Active: !!st.patient.hyperbaricO2Active,
              prevCO20Logged: !!st.patient.prevCO20Logged,
              prevCO30Logged: !!st.patient.prevCO30Logged,
              prevCO40Logged: !!st.patient.prevCO40Logged,
              prevCO50Logged: !!st.patient.prevCO50Logged,
            });
            coOutput.events.forEach(e => logEvent(e));
            st.patient.coHb = coOutput.coHbPercent;
            st.patient.prevCO20Logged = coOutput.prevCO20Logged;
            st.patient.prevCO30Logged = coOutput.prevCO30Logged;
            st.patient.prevCO40Logged = coOutput.prevCO40Logged;
            st.patient.prevCO50Logged = coOutput.prevCO50Logged;
          }

          // === BURNS PHYSIOLOGY ===
          {
            const burnsOutput = BurnsPhysiologyModel.tick({
              burnsTBSAPercent: st.patient.burnsTBSAPercent || 0,
              hoursPostBurn: st.patient.hoursPostBurn || 0,
              weightKg: st.patient.weight,
              inhalationInjury: !!st.patient.inhalationInjury,
              inhalationSeverity: st.patient.inhalationSeverity || 0.5,
              airwaySecured: !!st.patient.airwaySecured,
              totalParklandGivenMl: st.patient.totalParklandGivenMl || 0,
              currentFiO2: st.vitals.fio2 || 0.21,
              prevBurnOnsetLogged: !!st.patient.prevBurnOnsetLogged,
              prevInhalationLogged: !!st.patient.prevInhalationLogged,
              prevAirwayEdemaLogged: !!st.patient.prevAirwayEdemaLogged,
              prevParklandAlertLogged: !!st.patient.prevParklandAlertLogged,
            });
            burnsOutput.events.forEach(e => logEvent(e));
            st.patient.prevBurnOnsetLogged = burnsOutput.prevBurnOnsetLogged;
            st.patient.prevInhalationLogged = burnsOutput.prevInhalationLogged;
            st.patient.prevAirwayEdemaLogged = burnsOutput.prevAirwayEdemaLogged;
            st.patient.prevParklandAlertLogged = burnsOutput.prevParklandAlertLogged;
            st.patient.inhalationInjuryCompliancePenalty = burnsOutput.inhalationInjuryCompliancePenalty;
            st.patient.inhalationInjuryResistancePenalty = burnsOutput.inhalationInjuryResistancePenalty;
            st.patient.inhalationInjuryShuntContribution = burnsOutput.inhalationInjuryShuntContribution;
            // Burns hypermetabolism feeds into the totalMetabolicMultiplier chain
            st.patient.burnsMetabolicMultiplier = burnsOutput.burnsMetabolicMultiplier;
          }

          // 4. Rib Cage vs Diaphragmatic breathing contributions
          let intercostalContribution = Math.max(0.1, 1.0 - 0.7 * agentMac);
          let diaphragmContribution = Math.max(0.5, 1.0 - 0.15 * agentMac);
          st.patient.intercostalContribution = intercostalContribution;
          st.patient.diaphragmContribution = diaphragmContribution;

          let isParadoxicalBreathing = st.patient.isParadoxicalBreathing || false;
          if (intercostalContribution < 0.4 && !isParadoxicalBreathing && !st.patient.isParalyzed && !st.patient.isApneic && st.patient.ventilationStatus === 'spontaneous') {
              isParadoxicalBreathing = true;
              logEvent("⚠️ CLINICAL ALERT: Rib cage muscle activity is severely depressed compared to the diaphragm. Paradoxical (abdominal) breathing observed.");
          }
          if ((intercostalContribution >= 0.4 || st.patient.isParalyzed || st.patient.isApneic) && isParadoxicalBreathing) {
              isParadoxicalBreathing = false;
          }
          st.patient.isParadoxicalBreathing = isParadoxicalBreathing;

          // 5. Genioglossus muscle tone & upper airway obstruction
          const remAtoniaPenalty = st.patient.sleepStage === 'R' ? 0.85 : 0.0;
          let dilatorMuscleTone = Math.max(0.01, 1.0 - maxNMJOccupancy - 0.7 * propofolCe - 0.5 * agentMac - remAtoniaPenalty);
          if (patientAfterFluidics.neostigmineWeakness) {
              dilatorMuscleTone = Math.min(0.79, dilatorMuscleTone);
          }
          st.patient.dilatorMuscleTone = dilatorMuscleTone;

          // Airway Obstruction Index
          let isAirwayObstruction = st.patient.isAirwayObstruction || false;
          const isOsa = st.patient.pulmonaryComorbidity?.toLowerCase().includes('osa') || st.patient.osa || false;
          const pcrit = isOsa ? 1.0 : -5.0;
          st.patient.pcrit = pcrit;
          patientAfterFluidics.pcrit = pcrit;
          let airwayObstructionIndex = 0.0;

          if (!st.patient.airwaySecured && st.patient.ventilationStatus === 'spontaneous') {
              airwayObstructionIndex = Math.max(0.0, Math.min(1.0, (1.0 - dilatorMuscleTone) * (pcrit + 6.0) / 7.0));
              if (st.patient.postExtubationLaryngealEdema) {
                  airwayObstructionIndex = Math.max(airwayObstructionIndex, 0.8);
              }

              // Jaw thrust / two-hand mask seal (bmvOptimized) mechanically displaces the
              // mandible anteriorly, lifting the tongue and epiglottis off the posterior
              // pharyngeal wall. Reduces obstruction index by 0.45 — enough to resolve
              // moderate drug-induced obstruction (index 0.6→0.15) but not laryngeal edema
              // (floor clamped to 0.8) which is anatomical, not just muscle-tone dependent.
              if (st.patient.bmvOptimized && !st.patient.postExtubationLaryngealEdema) {
                  airwayObstructionIndex = Math.max(0.0, airwayObstructionIndex - 0.45);
              }

              if (airwayObstructionIndex > 0.6 && !isAirwayObstruction) {
                  isAirwayObstruction = true;
                  if (st.patient.postExtubationLaryngealEdema) {
                      logEvent("🚨 CRITICAL ALERT: Severe post-extubation stridor and laryngeal edema! Airway is obstructed due to prolonged head-down positioning without a cuff leak test.");
                  } else {
                      logEvent("🚨 CRITICAL ALERT: Upper airway obstruction! Genioglossus muscle tone is insufficient to maintain pharyngeal patency. Patient is snoring/obstructed.");
                  }
              }
          }
          if (st.patient.airwaySecured || st.patient.ventilationStatus !== 'spontaneous' || airwayObstructionIndex <= 0.3) {
              if (isAirwayObstruction) {
                  isAirwayObstruction = false;
                  logEvent("✅ SUCCESS: Upper airway obstruction resolved.");
              }
          }
          st.patient.airwayObstructionIndex = airwayObstructionIndex;
          st.patient.isAirwayObstruction = isAirwayObstruction;

          // 6. Bronchial Smooth Muscle Calcium Concentration (for bronchodilation)
          let bronchialSmoothMuscleCa = 1.0;
          if (activeAgent && activeAgent !== 'xenon') {
              bronchialSmoothMuscleCa = Math.max(0.2, 1.0 - 0.5 * agentMac);
          }
          // Bronchodilator cascade — all additive, act through different mechanisms:
          // Albuterol (beta-2 agonist): primary bronchodilator — reduces bronchial Ca2+ → relaxation
          // Ipratropium (anticholinergic): M3 block → prevents ACh-mediated bronchoconstriction
          // Ketamine: catecholamine release + direct smooth muscle relaxation (used in status asthmaticus)
          // Magnesium sulfate: Ca2+ channel antagonist → bronchial smooth muscle relaxation
          // All act additively; albuterol fastest and most potent.
          {
            const albuterolForBronch = (st.activeMeds || []).find(m => m.name === 'Albuterol (Salbutamol)');
            const ipratropiumForBronch = (st.activeMeds || []).find(m => m.name === 'Ipratropium');
            const magnesiumForBronch = (st.activeMeds || []).find(m => m.name === 'Magnesium Sulfate');
            const albuterolBronchEffect = albuterolForBronch
              ? clamp(albuterolForBronch.Ce / (albuterolForBronch.Ce + 0.3) * 0.70, 0, 0.70) : 0;
            const ipratropiumBronchEffect = ipratropiumForBronch
              ? clamp(ipratropiumForBronch.Ce / (ipratropiumForBronch.Ce + 0.4) * 0.40, 0, 0.40) : 0;
            const ketamineBronchEffect = ketamineCe > 0.1
              ? clamp(ketamineCe / (ketamineCe + 0.5) * 0.35, 0, 0.35) : 0;
            const magnesiumBronchEffect = magnesiumForBronch && magnesiumForBronch.Ce > 0.2
              ? clamp(magnesiumForBronch.Ce / (magnesiumForBronch.Ce + 1.0) * 0.25, 0, 0.25) : 0;
            bronchialSmoothMuscleCa = Math.max(0.05,
              bronchialSmoothMuscleCa - albuterolBronchEffect - ipratropiumBronchEffect
              - ketamineBronchEffect - magnesiumBronchEffect);
          }
          st.patient.bronchialSmoothMuscleCa = bronchialSmoothMuscleCa;

          // 7. Atelectasis accumulation and recruitment (Fig 13.19 & Fig 13.20, Miller's 9th Ed)
          let atelectasis = st.patient.atelectasis !== undefined ? st.patient.atelectasis : 0.0;
          const currentFiO2Val = st.patient.airwaySecured ? Number(deliveredFiO2) : Number(st.patient.currentFiO2 || 21);
          const currentPeepVal = activeVentSettings?.peep || 0;
          const prevPipVal = st.vitals.pip || 0;
          const currentAirwayPressure = Math.max(prevPipVal, currentPeepVal);

          // Track recruitment time for PAW >= 40 cmH2O (sustained vital capacity maneuver)
          let recruitmentTime = st.patient.recruitmentTime || 0;
          if (currentAirwayPressure >= 40.0) {
              recruitmentTime += 1.0; // 1 second per tick
              if (recruitmentTime >= 7.0) { // Fig 13.19: 40 cmH2O for 7-8 seconds successfully opens almost all atelectasis
                  atelectasis = 0.0;
                  recruitmentTime = 0.0;
                  logEvent("✅ SUCCESS: Alveolar recruitment maneuver completed (sustained PAW >= 40 cmH2O for 7s). Atelectasis fully resolved!");
              }
          } else if (currentAirwayPressure >= 30.0) {
              // Fig 13.19: PAW >= 30 cmH2O required for initial opening
              atelectasis = Math.max(0.0, atelectasis - 0.08); // rapid opening at 30-40 cmH2O
              recruitmentTime = 0.0;
          } else {
              recruitmentTime = 0.0;
          }
          st.patient.recruitmentTime = recruitmentTime;

          if (currentFiO2Val > 21) {
              const rateBase = 0.0005 * ((currentFiO2Val - 21) / 79.0) - 0.0002 * currentPeepVal;
              const paralyzeFactor = st.patient.isParalyzed ? 2.0 : 1.0;
              const obeseFactor = st.patient.isObese ? 1.5 : 1.0;
              const change = rateBase * paralyzeFactor * obeseFactor;
              if (change > 0) {
                  atelectasis = Math.min(1.0, atelectasis + change);
              } else {
                  atelectasis = Math.max(0.0, atelectasis + change * 0.1);
              }
          } else {
              atelectasis = Math.max(0.0, atelectasis - 0.001);
          }
          
          if (currentPeepVal > 0) {
              atelectasis = Math.max(0.0, atelectasis - 0.002 * currentPeepVal);
          }
          st.patient.atelectasis = atelectasis;
          
          // CO2 absorbent canister depletion
          let co2AbsorptiveCapacity = st.patient.co2AbsorptiveCapacity !== undefined ? st.patient.co2AbsorptiveCapacity : 100.0;
          if (st.patient.breathingCircuitType === 'circle' && !st.patient.isApneic) {
              const co2ProductionFactor = shiveringMultiplier * seizureMetabolicMultiplier;
              co2AbsorptiveCapacity = Math.max(0.0, co2AbsorptiveCapacity - 0.015 * co2ProductionFactor);
          }
          st.patient.co2AbsorptiveCapacity = co2AbsorptiveCapacity;

          if (co2AbsorptiveCapacity < 10.0 && !st.patient.hasAbsorbentExhaustedLog) {
              st.patient.hasAbsorbentExhaustedLog = true;
              logEvent("⚠️ CLINICAL ALERT: CO2 absorbent is nearly exhausted (capacity < 10%). Inspired CO2 (FiCO2) is rising!");
          }
          if (co2AbsorptiveCapacity >= 10.0 && st.patient.hasAbsorbentExhaustedLog) {
              st.patient.hasAbsorbentExhaustedLog = false;
          }

          if (st.patient.hasPneumothorax && !st.patient.hasPneumothoraxWarningLogged) {
              st.patient.hasPneumothoraxWarningLogged = true;
              logEvent("🚨 CRITICAL EMERGENCY: Tension pneumothorax! Compliance collapsed by 75% and venous return compromised. SBP and MAP are crashing. Perform needle decompression immediately!");
          }
          if (!st.patient.hasPneumothorax && st.patient.hasPneumothoraxWarningLogged) {
              st.patient.hasPneumothoraxWarningLogged = false;
          }
          
          // Merge these properties to patientAfterFluidics as well
          Object.assign(patientAfterFluidics, {
              hasPneumothoraxWarningLogged: st.patient.hasPneumothoraxWarningLogged,
              tfaAdducts: st.patient.tfaAdducts,
              AST: st.patient.AST,
              ALT: st.patient.ALT,
              bilirubin: st.patient.bilirubin,
              inr: st.patient.inr,
              albumin: st.patient.albumin,
              isHepatitisActive: st.patient.isHepatitisActive,
              serumFluoride: st.patient.serumFluoride,
              accumulatedFluorideTime: st.patient.accumulatedFluorideTime,
              hasFluorideNephrotoxicity: st.patient.hasFluorideNephrotoxicity,
              coHb: st.patient.coHb,
              compoundA: st.patient.compoundA,
              absorbent: st.patient.absorbent,
              isAirwayFire: st.patient.isAirwayFire,
              methionineSynthaseActivity: st.patient.methionineSynthaseActivity,
              homocysteine: st.patient.homocysteine,
              pediatricNeuroRisk: st.patient.pediatricNeuroRisk,
              pocdRisk: st.patient.pocdRisk,
              ciliaBeatFrequency: st.patient.ciliaBeatFrequency,
              ciliaryAtelectasisAccumulation: st.patient.ciliaryAtelectasisAccumulation,
              isMucusPlugged: st.patient.isMucusPlugged,
              surfactantProduction: st.patient.surfactantProduction,
              hpvInhibition: st.patient.hpvInhibition,
              intercostalContribution: st.patient.intercostalContribution,
              diaphragmContribution: st.patient.diaphragmContribution,
              isParadoxicalBreathing: st.patient.isParadoxicalBreathing,
              dilatorMuscleTone: st.patient.dilatorMuscleTone,
              airwayObstructionIndex: st.patient.airwayObstructionIndex,
              isAirwayObstruction: st.patient.isAirwayObstruction,
              bronchialSmoothMuscleCa: st.patient.bronchialSmoothMuscleCa,
              atelectasis: st.patient.atelectasis,
              recruitmentTime: st.patient.recruitmentTime,
              isO2PipelineCrossover: st.patient.isO2PipelineCrossover,
              isO2CylinderOpen: st.patient.isO2CylinderOpen,
              isO2PipelineDisconnected: st.patient.isO2PipelineDisconnected,
              isOxygenFlushPressed: st.patient.isOxygenFlushPressed,
              breathingCircuitType: st.patient.breathingCircuitType,
              co2AbsorptiveCapacity: st.patient.co2AbsorptiveCapacity,
              stuckExpiratoryValve: st.patient.stuckExpiratoryValve,
              stuckInspiratoryValve: st.patient.stuckInspiratoryValve,
              aplValveSetting: st.patient.aplValveSetting,
              hasPneumothorax: st.patient.hasPneumothorax,
              postExtubationLaryngealEdema: st.patient.postExtubationLaryngealEdema,
              charcoalFiltersPlaced: st.patient.charcoalFiltersPlaced,
              olvShuntContribution: st.patient.olvShuntContribution || 0,
              olvCompliancePenaltyFraction: st.patient.olvCompliancePenaltyFraction || 0,
              inhalationInjuryCompliancePenalty: st.patient.inhalationInjuryCompliancePenalty || 0,
              inhalationInjuryResistancePenalty: st.patient.inhalationInjuryResistancePenalty || 0,
              inhalationInjuryShuntContribution: st.patient.inhalationInjuryShuntContribution || 0,
              pfoShuntContribution: st.patient.pfoShuntContribution || 0,
              n2oDiffusionHypoxiaShunt: st.patient.n2oDiffusionHypoxiaShunt || 0,
              femShuntContribution: st.patient.femShuntContribution || 0,
              femCompliancePenalty: st.patient.femCompliancePenalty || 0,
              femResistancePenalty: st.patient.femResistancePenalty || 0,
              isbCompliancePenalty: st.patient.isbCompliancePenalty || 0,
              cholinergicResistancePenalty: st.patient.cholinergicResistancePenalty || 0,
              tacoCompliancePenalty: st.patient.tacoCompliancePenalty || 0,
              tacoShuntContribution: st.patient.tacoShuntContribution || 0,
              tacoResistancePenalty: st.patient.tacoResistancePenalty || 0,
              acsShuntContribution: st.patient.acsShuntContribution || 0,
              acsCompliancePenalty: st.patient.acsCompliancePenalty || 0,
              angioedemaResistancePenalty: st.patient.angioedemaResistancePenalty || 0,
              hpsShuntContribution: st.patient.hpsShuntContribution || 0
          });

          const burnsMetabolicMult = st.patient.burnsMetabolicMultiplier || 1.0;
          const totalMetabolicMultiplier = shiveringMultiplier * seizureMetabolicMultiplier * mhMetabolicMultiplier * thyroidMetabolicMultiplier * pregnancyOutput.metabolicMultiplier * burnsMetabolicMult;
          // Peritoneal CO2 absorption adds to the CO2 load the respiratory system must clear.
          // Modeled as additional equivalent VO2 (CO2 production in L/s); RQ≈1 for absorbed CO2.
          const peritonealCO2_Lsec = pneumoOutput.active ? (pneumoOutput.peritonealCO2AbsorptionMlPerMin / 1000 / 60) : 0;
          const VO2_sec = (0.250 * totalMetabolicMultiplier * cyanideVO2Mod) / 60 + peritonealCO2_Lsec;
          // eslint-disable-next-line no-unused-vars
          const VCO2_sec = (0.200 * totalMetabolicMultiplier) / 60;
          let opioidRRDrop = opioidEff * 10;

          // Gabapentinoid-Opioid Synergistic Respiratory Depression (GOSRD)
          const gabapentinModelForGosrd = st.activeMeds?.find(m => m.name === 'Gabapentin');
          const gabapentinCeForGosrd = gabapentinModelForGosrd ? gabapentinModelForGosrd.Ce : 0;
          const pregabalinModelForGosrd = st.activeMeds?.find(m => m.name === 'Pregabalin');
          const pregabalinCeForGosrd = pregabalinModelForGosrd ? pregabalinModelForGosrd.Ce : 0;

          const gabapentinEffForGosrd = gabapentinCeForGosrd > 0 ? (Math.pow(gabapentinCeForGosrd, 1.5) / (Math.pow(gabapentinCeForGosrd, 1.5) + Math.pow(5.0, 1.5))) : 0;
          const pregabalinEffForGosrd = pregabalinCeForGosrd > 0 ? (Math.pow(pregabalinCeForGosrd, 1.5) / (Math.pow(pregabalinCeForGosrd, 1.5) + Math.pow(3.0, 1.5))) : 0;
          const gabapentinoidEffForGosrd = 1.0 - (1.0 - gabapentinEffForGosrd) * (1.0 - pregabalinEffForGosrd);

          let hasGOSRD = false;
          if ((gabapentinCeForGosrd > 2.0 || pregabalinCeForGosrd > 1.5) && opioidEff > 0.15) {
              hasGOSRD = true;
              opioidRRDrop = Math.min(18.0, opioidRRDrop * (1.0 + 2.0 * gabapentinoidEffForGosrd));
          }

          if (hasGOSRD && !st.patient.hasGOSRD) {
              logEvent("🚨 CLINICAL ALERT: Gabapentinoid-Opioid Synergistic Respiratory Depression (GOSRD) active! Combined therapy profoundly depresses respiratory rate.");
              logQualityEvent({
                  category: 'Vigilance', severity: 'moderate',
                  description: 'Gabapentinoid-opioid synergistic respiratory depression (GOSRD) developed.',
                  idealAction: 'Reduce/avoid co-administering gabapentinoids with opioids in patients already requiring significant opioid dosing, or monitor ventilation more closely if combined.',
                  actualAction: 'Both drug classes were active simultaneously at synergistic concentrations.',
                  impact: 'Respiratory rate is depressed beyond what either drug class alone would cause.',
                  chapterSource: 'Ch25, Miller\'s 9th Ed'
              });
          } else if (!hasGOSRD && st.patient.hasGOSRD) {
              logEvent("✅ SUCCESS: Gabapentinoid-Opioid Synergistic Respiratory Depression resolved.");
          }
          st.patient.hasGOSRD = hasGOSRD;
          patientAfterFluidics.hasGOSRD = hasGOSRD;

          // === Chapter 33: CAM & Herbal Medication Quality Hooks ===
          if (!st.patient.loggedCAMEvents) {
              st.patient.loggedCAMEvents = {};
          }
          if (!patientAfterFluidics.loggedCAMEvents) {
              patientAfterFluidics.loggedCAMEvents = {};
          }

          // 1. Herbal screening omission
          const hasHerbalOrDietary = (st.patient.herbalSupplements?.length > 0 || st.patient.dietarySupplements?.length > 0);
          if (hasHerbalOrDietary && !st.patient.herbalScreeningDone && st.surgicalPhase !== 'Pre-Op' && !st.patient.loggedCAMEvents?.herbalOmission) {
              st.patient.loggedCAMEvents.herbalOmission = true;
              patientAfterFluidics.loggedCAMEvents = { ...st.patient.loggedCAMEvents, herbalOmission: true };
              logQualityEvent({
                  category: 'ChecklistAdherence',
                  severity: 'moderate',
                  description: 'Omission of preoperative herbal and dietary supplement screening for a patient taking active outpatient CAM therapies.',
                  idealAction: 'Perform comprehensive preoperative herbal and dietary supplement assessment to determine perioperative risks and planning (Ch33).',
                  actualAction: 'Induction/surgery started without conducting outpatient herbal medication assessment.',
                  impact: 'Increased risk of unrecognized herb-drug interactions, bleeding, or hemodynamic instability.',
                  chapterSource: 'Ch33, Miller\'s 9th Ed'
              });
          }

          // 2. Valerian + sedative synergy
          const hasValerianKava = st.patient.herbalSupplements?.some(h => h === 'valerian' || h === 'kava');
          const activeGabaSedative = st.activeMeds?.find(m => (m.name === 'Midazolam' || m.name === 'Propofol') && m.Ce > 0.01);
          if (hasValerianKava && activeGabaSedative && !st.patient.loggedCAMEvents?.valerianSynergy) {
              st.patient.loggedCAMEvents.valerianSynergy = true;
              patientAfterFluidics.loggedCAMEvents = { ...st.patient.loggedCAMEvents, valerianSynergy: true };
              logQualityEvent({
                  category: 'PharmacologicChoice',
                  severity: 'minor',
                  description: `Valerian/Kava potentiates GABA-ergic sedatives. Patient is receiving active sedative ${activeGabaSedative.name} in system.`,
                  idealAction: 'Consider lowering doses of volatile anesthetics or intravenous sedatives/hypnotics in patients taking valerian or kava (Ch33).',
                  actualAction: `Standard dosing of ${activeGabaSedative.name} was administered.`,
                  impact: 'Additive or synergistic sedation, potentially delaying emergence or causing prolonged somnolence.',
                  chapterSource: 'Ch33, Miller\'s 9th Ed'
              });
          }

          // 3. St. John's Wort CYP3A4 induction
          const hasSjw = st.patient.herbalSupplements?.some(h => h === 'stjohnswort' || h === 'st. john\'s wort' || h === "st. john's wort" || h === 'stJohnsWort');
          const activeCyp3a4Substrate = st.activeMeds?.find(m => (m.name === 'Alfentanil' || m.name === 'Midazolam' || m.name === 'Lidocaine' || m.name === 'Fentanyl' || m.name === 'Ondansetron') && m.Ce > 0.01);
          if (hasSjw && activeCyp3a4Substrate && !st.patient.loggedCAMEvents?.sjwInduction) {
              st.patient.loggedCAMEvents.sjwInduction = true;
              patientAfterFluidics.loggedCAMEvents = { ...st.patient.loggedCAMEvents, sjwInduction: true };
              logQualityEvent({
                  category: 'PharmacologicChoice',
                  severity: 'moderate',
                  description: `St. John's Wort induces CYP3A4, which increases the metabolism of administered ${activeCyp3a4Substrate.name}.`,
                  idealAction: 'Be prepared to administer larger or more frequent doses of CYP3A4 substrates (alfentanil, midazolam, lidocaine, fentanyl, etc.) or discontinue St. John\'s Wort >= 5 days before surgery (Ch33).',
                  actualAction: `Administered standard dose of CYP3A4 substrate ${activeCyp3a4Substrate.name} in presence of St. John's Wort.`,
                  impact: 'Subtherapeutic drug concentrations or rapid clearance, potentially requiring rescue dosing.',
                  chapterSource: 'Ch33, Miller\'s 9th Ed'
              });
          }

          // 4. Bleeding risk herbs + neuraxial
          const bleedingCAMs = ['garlic', 'ginkgo', 'ginseng', 'sawPalmetto', 'ginger', 'green tea', 'fishOil', 'glucosamineChondroitin'];
          const hasBleedingCAM = st.patient.herbalSupplements?.some(h => bleedingCAMs.includes(h)) || st.patient.dietarySupplements?.some(s => bleedingCAMs.includes(s));
          const hasNeuraxialActive = st.patient.hasNeuraxial || st.patient.anesthesiaType?.neuraxial;
          if (hasBleedingCAM && hasNeuraxialActive && !st.patient.loggedCAMEvents?.bleedingNeuraxial) {
              st.patient.loggedCAMEvents.bleedingNeuraxial = true;
              patientAfterFluidics.loggedCAMEvents = { ...st.patient.loggedCAMEvents, bleedingNeuraxial: true };
              logQualityEvent({
                  category: 'Vigilance',
                  severity: 'major',
                  description: 'Attempted neuraxial anesthesia in a patient taking active outpatient herbal medications/dietary supplements that inhibit platelet aggregation.',
                  idealAction: 'Ensure all antiplatelet herbal therapies (garlic, ginkgo, ginseng, ginger, fish oil) are discontinued for the appropriate duration prior to neuraxial techniques to minimize epidural hematoma risk (Ch33).',
                  actualAction: 'Neuraxial technique initiated while antiplatelet herbal/dietary supplements were active.',
                  impact: 'Significantly elevated risk of spontaneous or traumatic epidural hematoma and spinal cord compression.',
                  chapterSource: 'Ch33, Miller\'s 9th Ed'
              });
          }

          // 5. Ephedra + volatile anesthetic
          const hasEphedra = st.patient.herbalSupplements?.some(h => h === 'ephedra' || h === 'ma huang');
          const activeVolatile = st.gasSettings?.agent;
          if (hasEphedra && activeVolatile && activeVolatile !== 'room_air' && activeVolatile !== 'none' && !st.patient.loggedCAMEvents?.ephedraArrhythmia) {
              st.patient.loggedCAMEvents.ephedraArrhythmia = true;
              patientAfterFluidics.loggedCAMEvents = { ...st.patient.loggedCAMEvents, ephedraArrhythmia: true };
              logQualityEvent({
                  category: 'CrisisManagement',
                  severity: 'major',
                  description: `Ephedra (Ma Huang) combined with volatile anesthetic (${activeVolatile}) increases risk of ventricular arrhythmias and hemodynamic instability.`,
                  idealAction: 'Avoid volatile anesthetics (especially halothane which sensitizes the myocardium) or discontinue Ephedra >= 24 hours prior to surgery. Be prepared to treat tachyarrhythmias and hypertension with beta-blockers (Ch33).',
                  actualAction: `Volatile agent ${activeVolatile} was administered in the presence of active ephedra/sympathomimetics.`,
                  impact: 'Predisposition to myocardial ischemia, stroke, and life-threatening ventricular arrhythmias.',
                  chapterSource: 'Ch33, Miller\'s 9th Ed'
              });
          }

          // 6. P6 stimulation for PONV
          if (st.patient.p6StimulationApplied && !st.patient.loggedCAMEvents?.p6Stimulation) {
              st.patient.loggedCAMEvents.p6Stimulation = true;
              patientAfterFluidics.loggedCAMEvents = { ...st.patient.loggedCAMEvents, p6Stimulation: true };
              logQualityEvent({
                  category: 'PharmacologicChoice',
                  severity: 'info',
                  description: 'P6 acupressure (PC6 Nei Guan point) applied to reduce postoperative nausea and vomiting.',
                  idealAction: 'Initiate P6 stimulation prior to induction of anesthesia. Efficacy is similar to pharmacological antiemetic drugs (Ch33).',
                  actualAction: 'P6 acupressure successfully applied.',
                  impact: 'Prophylactic PONV reduction via endogenous opioid pathway activation.',
                  chapterSource: 'Ch33, Miller\'s 9th Ed'
              });
          }

          // === Chapter 34: Patient Positioning Quality Hooks ===
          if (!st.patient.loggedPositioningEvents) {
              st.patient.loggedPositioningEvents = {};
          }
          if (!patientAfterFluidics.loggedPositioningEvents) {
              patientAfterFluidics.loggedPositioningEvents = {};
          }

          // Track time in head-down or prone positions for airway edema risk
          if (pos === 'Trendelenburg' || pos === 'Prone') {
              st.patient.timeInHeadDown = (st.patient.timeInHeadDown || 0) + 1;
              patientAfterFluidics.timeInHeadDown = st.patient.timeInHeadDown;
          }

          // 1. Positioning screening omission
          if (!st.patient.positioningAssessmentDone && st.surgicalPhase !== 'Pre-Op' && !st.patient.loggedPositioningEvents?.omission) {
              st.patient.loggedPositioningEvents.omission = true;
              patientAfterFluidics.loggedPositioningEvents = { ...st.patient.loggedPositioningEvents, omission: true };
              logQualityEvent({
                  category: 'ChecklistAdherence',
                  severity: 'moderate',
                  description: 'Omission of preoperative patient positioning risk assessment.',
                  idealAction: 'Perform comprehensive preoperative patient positioning screening to identify risk factors for nerve or visual injuries (Ch34).',
                  actualAction: 'Induction/surgery started without conducting positioning risk assessment.',
                  impact: 'Increased risk of positioning-related injuries including peripheral neuropathies or perioperative visual loss (POVL).',
                  chapterSource: 'Ch34, Miller\'s 9th Ed'
              });
          }

          // 2. Brachial plexus / ulnar nerve injury risk (Supine or Prone)
          const inSupineOrProne = pos === 'Supine' || pos === 'Prone';
          const activeSurgicalPhase = st.surgicalPhase === 'Incision' || st.surgicalPhase === 'Maintenance';
          if (inSupineOrProne && activeSurgicalPhase && !st.patient.armsPositionedCorrectly && !st.patient.loggedPositioningEvents?.armNerveRisk) {
              st.patient.loggedPositioningEvents.armNerveRisk = true;
              patientAfterFluidics.loggedPositioningEvents = { ...st.patient.loggedPositioningEvents, armNerveRisk: true };
              logQualityEvent({
                  category: 'Vigilance',
                  severity: 'minor',
                  description: `Patient arms are not padded or positioned correctly in ${pos} position during active surgery.`,
                  idealAction: 'Position hand/forearm in supinated or neutral position and limit arm abduction to <90 degrees to protect ulnar and brachial plexus nerves (Ch34).',
                  actualAction: 'Surgical phase active without arm padding or hyperabduction safeguards verified.',
                  impact: 'High risk of postoperative ulnar neuropathy (14% of claims) or brachial plexus stretch injury (19% of claims).',
                  chapterSource: 'Ch34, Miller\'s 9th Ed'
              });
          }

          // 3. Peroneal nerve compression risk (Lithotomy)
          if (pos === 'Lithotomy' && activeSurgicalPhase && !st.patient.peronealNervePadded && !st.patient.loggedPositioningEvents?.peronealRisk) {
              st.patient.loggedPositioningEvents.peronealRisk = true;
              patientAfterFluidics.loggedPositioningEvents = { ...st.patient.loggedPositioningEvents, peronealRisk: true };
              logQualityEvent({
                  category: 'Vigilance',
                  severity: 'moderate',
                  description: 'Patient legs/stirrups are unpadded in Lithotomy position, risking peroneal nerve compression.',
                  idealAction: 'Ensure stirrups and knee support areas are padded, avoiding pressure on the peroneal nerve at the fibular head (Ch34).',
                  actualAction: 'Active surgery in Lithotomy position without verifying fibular head padding.',
                  impact: 'Vulnerability to common peroneal nerve palsy, resulting in postoperative foot drop.',
                  chapterSource: 'Ch34, Miller\'s 9th Ed'
              });
          }

          // 4. Prolonged Lithotomy compartment syndrome risk
          if (pos === 'Lithotomy' && activeSurgicalPhase && (st.time - (st.patient.lastLegsLoweredTime || 0) > 120) && !st.patient.loggedPositioningEvents?.compartmentRisk) {
              st.patient.loggedPositioningEvents.compartmentRisk = true;
              patientAfterFluidics.loggedPositioningEvents = { ...st.patient.loggedPositioningEvents, compartmentRisk: true };
              logQualityEvent({
                  category: 'Vigilance',
                  severity: 'major',
                  description: 'Prolonged lithotomy positioning (>2 hours) without periodic lower extremity reperfusion.',
                  idealAction: 'Periodically lower legs out of stirrups to the level of the heart if surgical time exceeds 2-3 hours to prevent compartment syndrome (Ch34).',
                  actualAction: 'Lithotomy duration exceeded 120 minutes without leg lowering maneuver.',
                  impact: 'Risk of lower extremity ischemia, rhabdomyolysis, edema, and compartment syndrome.',
                  chapterSource: 'Ch34, Miller\'s 9th Ed'
              });
          }

          // 5. Prone POVL vigilance omission (prolonged prone spine fusion, Wilson frame, without checks)
          const isProlongedProne = st.time > 120;
          if (pos === 'Prone' && isProlongedProne && (st.time - (st.patient.lastHeadEyeCheckTime || 0) > 20) && !st.patient.loggedPositioningEvents?.povlVigilance) {
              st.patient.loggedPositioningEvents.povlVigilance = true;
              patientAfterFluidics.loggedPositioningEvents = { ...st.patient.loggedPositioningEvents, povlVigilance: true };
              logQualityEvent({
                  category: 'Vigilance',
                  severity: 'major',
                  description: 'Neglected periodic face and eye pressure checks during prolonged prone positioning.',
                  idealAction: 'Verify head alignment and ensure no direct pressure on eyes or malar bones at least every 20 minutes (Ch34).',
                  actualAction: 'Prone positioning check interval exceeded 20 minutes.',
                  impact: 'High risk of direct eye compression (causing CRAO) or ischemic optic neuropathy (ION) leading to permanent blindness.',
                  chapterSource: 'Ch34, Miller\'s 9th Ed'
              });
          }

          // Pain Engine Tick
          if (st.surgicalPhase === 'Incision' && st.patient.incisionStartTime === undefined) {
              st.patient.incisionStartTime = st.time;
          }

          const isTASK1 = st.patient.isTASK1Knockout;
          const isTASK3 = st.patient.isTASK3Knockout;
          const isTREK1 = st.patient.isTREK1Knockout;
          const macKnockoutResistFactor = 1.0 * (isTASK1 ? 1.3 : 1.0) * (isTASK3 ? 1.4 : 1.0) * (isTREK1 ? 1.5 : 1.0);
          const painOutput = PainEngine.tick(1, st.patient, st.vitals, st.activeMeds, currentMac / macKnockoutResistFactor, st.time, adrenalOutput.nonNociceptiveSympatheticStimulus, rng);
          // Endogenous catecholamines' receptor activity joins the exogenous-drug
          // accumulator above -- one combined per-vascular-bed redistribution signal
          // (Phase 2's receptor-unification piece) regardless of source.
          totalAlpha1ActivityIndex += painOutput.alpha1Activity || 0;
          totalBeta2ActivityIndex += painOutput.beta2Activity || 0;

          // Log bucking/movement events
          if (painOutput.somaticResponse.event && (!st.patient.lastPainEventTime || st.time - st.patient.lastPainEventTime >= 8)) {
              logEvent(painOutput.somaticResponse.event);
              st.patient.lastPainEventTime = st.time;
          }

          // Spasm Logic & Resolution
          let finalLaryngospasm = st.patient.laryngospasm || false;
          let finalBronchospasm = st.patient.bronchospasm || false;

          if (painOutput.somaticResponse.triggerLaryngospasm) {
              finalLaryngospasm = true;
              logEvent("🚨 CRITICAL ALERT: Laryngospasm triggered due to airway manipulation under inadequate anesthesia! Airway resistance is now infinite.");
              logQualityEvent({
                  category: 'Vigilance', severity: 'major',
                  description: 'Laryngospasm triggered by airway manipulation under inadequate anesthetic depth.',
                  idealAction: 'Ensure adequate anesthetic depth (or paralysis) before airway manipulation/instrumentation.',
                  actualAction: 'Airway was manipulated while anesthetic depth was insufficient to suppress airway reflexes.',
                  impact: 'Complete airway obstruction; risk of hypoxemia/negative-pressure pulmonary edema if not promptly resolved.',
              });
          }
          if (painOutput.somaticResponse.triggerBronchospasm) {
              finalBronchospasm = true;
              logEvent("🚨 CRITICAL ALERT: Bronchospasm triggered due to airway manipulation/pain under inadequate anesthesia! Compliance is halved and resistance is elevated.");
              logQualityEvent({
                  category: 'Vigilance', severity: 'major',
                  description: 'Bronchospasm triggered by airway manipulation/pain under inadequate anesthetic depth.',
                  idealAction: 'Ensure adequate anesthetic depth before airway manipulation; consider bronchodilator pretreatment in reactive-airway patients.',
                  actualAction: 'Airway was manipulated while anesthetic depth was insufficient.',
                  impact: 'Reduced compliance and elevated airway resistance; risk of hypoxemia and barotrauma.',
              });
          }

          // Spasm Resolution
          if (finalLaryngospasm && (maxNMJOccupancy > 0.90 || currentMac > 1.2)) {
              finalLaryngospasm = false;
              logEvent("✅ SUCCESS: Laryngospasm resolved (deep anesthesia or muscle relaxation achieved).");
          }
          const epiModelForSpasm = st.activeMeds?.find(m => m.name === 'Epinephrine');
          const epiActive = epiModelForSpasm ? epiModelForSpasm.Ce > 0.01 : false;
          if (finalBronchospasm && (currentMac > 1.2 || epiActive)) {
              finalBronchospasm = false;
              logEvent("✅ SUCCESS: Bronchospasm resolved (bronchodilation achieved via deep anesthesia or Epinephrine).");
          }

          // Propagating updated states to patient objects for subsequent calculations in this tick
          st.patient.C_cat = painOutput.C_cat;
          st.patient.MAP_set = painOutput.MAP_set;
          st.patient.laryngospasm = finalLaryngospasm;
          st.patient.bronchospasm = finalBronchospasm;
          st.patient.isBucking = painOutput.somaticResponse.isBucking;

          patientAfterFluidics.C_cat = painOutput.C_cat;
          patientAfterFluidics.MAP_set = painOutput.MAP_set;
          patientAfterFluidics.laryngospasm = finalLaryngospasm;
          patientAfterFluidics.bronchospasm = finalBronchospasm;
          patientAfterFluidics.isBucking = painOutput.somaticResponse.isBucking;

          const aggregateHypnosis = Math.min(1.0, sedativeEff + opioidEff + 1.8 * sedativeEff * opioidEff);
          const hrSympatheticSpike = painOutput.hrSpike + awarenessHrOffset;
          const contractilitySympatheticSpike = painOutput.contractilitySpike + (awarenessHrOffset > 0 ? 0.3 : 0.0);
          const svrSympatheticSpike = painOutput.svrSpike + awarenessSvrOffset;

          // Anaphylaxis triggers
          const unasynModel = st.activeMeds?.find(m => m.name === 'Ampicillin/Sulbactam (Unasyn)');
          const unasynCe = unasynModel ? unasynModel.Ce : 0;
          let anaphylaxisTriggered = st.patient.anaphylaxisTriggered || false;
          let anaphylaxisSvrMod = 1.0;
          let anaphylaxisCompliancePenalty = 0;
          let anaphylaxisResistancePenalty = 0;
          let anaphylaxisHrMod = 0;

          if (unasynCe < 0.01) {
              st.patient.penicillinAnaphylaxisRolled = undefined;
          }

          if (unasynCe > 0.05 && (st.patient.penicillinAllergy || (st.patient.allergies && st.patient.allergies.toLowerCase().includes('penicillin'))) && !anaphylaxisTriggered) {
              if (st.patient.penicillinAnaphylaxisRolled === undefined) {
                  const baseProb = 0.02;
                  const hasRisk = st.patient.copd || st.patient.asthma || st.patient.atopic || st.patient.highAnxiety;
                  const prob = Math.min(1.0, baseProb * (hasRisk ? 4.0 : 1.0));
                  st.patient.penicillinAnaphylaxisRolled = rng() < prob;
              }
              if (st.patient.forcePenicillinAnaphylaxis || st.patient.penicillinAnaphylaxisRolled) {
                  anaphylaxisTriggered = true;
                  st.patient.anaphylaxisTriggered = true;
                  st.patient.anaphylaxisTime = st.time;
                  logEvent(`🚨 CRITICAL EMERGENCY: Penicillin-containing Ampicillin/Sulbactam administered to a patient with severe Penicillin Allergy! Triggered hyperacute IgE-mediated anaphylactic shock! (Profound vasoplegic hypotension, severe bronchospasm, extreme airway resistance).`);
                  logQualityEvent({
                      category: 'CrisisManagement', severity: 'critical',
                      description: 'IgE-mediated anaphylactic shock triggered by penicillin-class antibiotic administered to an allergic patient.',
                      impact: 'Vasoplegic shock and bronchospasm; requires immediate epinephrine, fluid resuscitation, and airway support.',
                  });
              } else {
                  st.patient.penicillinAnaphylaxisRolled = false;
                  logEvent(`⚠️ Clinical Note: Penicillin-containing Ampicillin/Sulbactam administered to allergy-documented patient. Fortunately, no acute anaphylaxis occurred (only ~2% baseline clinical incidence).`);
              }
          }

          if (st.patient.anaphylaxisTriggered) {
              const startTime = st.patient.anaphylaxisTime || st.time;
              const dt_anaph = st.time - startTime;
              anaphylaxisSvrMod = 0.25 + 0.75 * Math.exp(-0.05 * dt_anaph);
              anaphylaxisCompliancePenalty = Math.min(45, 45 * (1 - Math.exp(-0.08 * dt_anaph)));
              anaphylaxisResistancePenalty = Math.min(45, 45 * (1 - Math.exp(-0.08 * dt_anaph)));
              anaphylaxisHrMod = Math.min(40, 40 * (1 - Math.exp(-0.08 * dt_anaph)));
              
              const epiModel = st.activeMeds?.find(m => m.name === 'Epinephrine');
              const epiCe = epiModel ? epiModel.Ce : 0;
              if (epiCe > 0.01) {
                  const recovery = Math.min(1.0, epiCe * 12);
                  anaphylaxisSvrMod = anaphylaxisSvrMod + (1.0 - anaphylaxisSvrMod) * recovery;
                  anaphylaxisCompliancePenalty *= (1 - recovery);
                  anaphylaxisResistancePenalty *= (1 - recovery);
                  anaphylaxisHrMod *= (1 - recovery);
                  if (recovery > 0.8 && !st.patient.anaphylaxisTreated) {
                      logEvent(`✅ SUCCESS: Epinephrine administered! Vasomotor tone restored and bronchospasm reversed in treating anaphylactic shock.`);
                      st.patient.anaphylaxisTreated = true;
                  }
              }
          }

          // === MULTIPLE ANAPHYLAXIS TRIGGERS ===
          {
            const rocForAnaph = (st.activeMeds || []).find(m => m.name === 'Rocuronium');
            const vecForAnaph = (st.activeMeds || []).find(m => m.name === 'Vecuronium');
            const atraForAnaph = (st.activeMeds || []).find(m => m.name === 'Atracurium');
            const cefForAnaph = (st.activeMeds || []).find(m => m.name === 'Cefazolin');
            const epiForAnaph = (st.activeMeds || []).find(m => m.name === 'Epinephrine');
            const diphForAnaph = (st.activeMeds || []).find(m => m.name === 'Diphenhydramine');
            const methylpredForAnaph = (st.activeMeds || []).find(m => m.name === 'Methylprednisolone');

            const multiAnaphOutput = MultipleAnaphylaxisModel.tick({
              rng,
              hasKnownLatexAllergy: !!st.patient.hasKnownLatexAllergy,
              hasSpinaOrBifida: !!st.patient.hasSpinaBifida,
              hasMultiplePriorSurgeries: (st.patient.priorAnestheticExposure && st.patient.age > 30),
              allergiesToCrossReactiveFoods: !!st.patient.latexCrossReactiveFood,
              rocuroniumCe: rocForAnaph ? rocForAnaph.Ce : 0,
              vecuroniumCe: vecForAnaph ? vecForAnaph.Ce : 0,
              atracuriumCe: atraForAnaph ? atraForAnaph.Ce : 0,
              cefazolinCe: cefForAnaph ? cefForAnaph.Ce : 0,
              chlorhexidineExposure: !!st.patient.chlorhexidineExposure,
              blueDyeExposure: !!st.patient.blueDyeExposure,
              latexExposure: !!st.patient.latexExposure,
              epinephrineCe: epiForAnaph ? epiForAnaph.Ce : 0,
              diphenhydramineCe: diphForAnaph ? diphForAnaph.Ce : 0,
              methylprednisoloneCe: methylpredForAnaph ? methylpredForAnaph.Ce : 0,
              existingAnaphylaxisActive: !!st.patient.anaphylaxisTriggered,
              prevNMBAAnaphLogged: !!st.patient.prevNMBAAnaphLogged,
              prevLatexAnaphLogged: !!st.patient.prevLatexAnaphLogged,
              prevCefAnaphLogged: !!st.patient.prevCefAnaphLogged,
              prevChlorhexLogged: !!st.patient.prevChlorhexLogged,
              prevBlueDyeLogged: !!st.patient.prevBlueDyeLogged,
            });
            multiAnaphOutput.events.forEach(e => logEvent(e));
            st.patient.prevNMBAAnaphLogged = multiAnaphOutput.prevNMBAAnaphLogged;
            st.patient.prevLatexAnaphLogged = multiAnaphOutput.prevLatexAnaphLogged;
            st.patient.prevCefAnaphLogged = multiAnaphOutput.prevCefAnaphLogged;
            st.patient.prevChlorhexLogged = multiAnaphOutput.prevChlorhexLogged;
            st.patient.prevBlueDyeLogged = multiAnaphOutput.prevBlueDyeLogged;

            if (multiAnaphOutput.anaphylaxisActive) {
              drugSvrMod *= (1 - multiAnaphOutput.svrDropFraction);
              drugInotropyMod *= (1 - multiAnaphOutput.svrDropFraction * 0.3);
              totalHrDelta += multiAnaphOutput.hrEffect;
              // Trigger the existing anaphylaxis flag so CardiovascularEngine handles it too
              if (!st.patient.anaphylaxisTriggered) {
                st.patient.anaphylaxisTriggered = true;
                st.patient.anaphylaxisTime = st.time;
              }
            }
            // Blue dye SpO2 artifact stored for monitor display
            st.patient.blueDyeSpO2Artifact = multiAnaphOutput.blueDyeSpO2Artifact;
          }

          // PRIS state variables are updated by the unified PRIS tracking block early in the tick.
          let prisTriggered = st.patient.prisTriggered || false;
          currentPrisAccum = st.patient.prisAccumulation || 0;
          
          let currentK = fluidicsOutput.electrolytes.k;
          let stunning = st.patient.myocardialStunning || 0;

          // Chapter 12: Succinylcholine dynamic potassium leak maintenance in upregulation (Fig 12.9, Miller 9th Ed)
          const suxModelForLeak = st.activeMeds?.find(m => m.name === 'Succinylcholine');
          const suxCeForLeak = suxModelForLeak ? suxModelForLeak.Ce : 0;
          if (st.patient.nAChR_state === 'upregulated' && suxCeForLeak > 0.01) {
              currentK = Math.min(10.0, currentK + 0.05);
          }
          
          // Malignant Hyperthermia dynamic changes (Ch35)
          let delayedDantroleneLogged = st.patient.delayedDantroleneLogged || false;
          if (mhActive) {
              currentK = Math.min(10.0, currentK + 0.08);
              currentLactate = Math.min(25.0, currentLactate + 0.1);
              totalHrDelta += 35;
              
              if (dantroleneCeForMh < 0.01 && mhStartTime !== null && (st.time - mhStartTime > 180)) {
                  if (!delayedDantroleneLogged) {
                      delayedDantroleneLogged = true;
                      logQualityEvent({
                          category: 'CrisisManagement',
                          severity: 'major',
                          description: 'Delayed dantrolene administration (>3 minutes since MH onset) in active Malignant Hyperthermia crisis.',
                          idealAction: 'Administer Dantrolene 2.5 mg/kg IV bolus immediately upon suspicion of MH.',
                          actualAction: 'No Dantrolene administered after 3 minutes of active MH.',
                          impact: 'Profound hypermetabolic organ injury and progressive severe hyperkalemia.',
                          chapterSource: "Miller's Anesthesia Chapter 35"
                      });
                  }
              }
              
              const hasCCBActive = st.activeMeds?.some(m => (m.name === 'Verapamil' || m.name === 'Nicardipine') && m.Ce > 0.01);
              if (hasCCBActive && dantroleneCeForMh > 0.01) {
                  currentK = 9.5;
                  patientAfterFluidics.isArrest = true;
                  patientAfterFluidics.cardiacRhythm = 'pea';
                  logQualityEvent({
                      category: 'PharmacologicChoice',
                      severity: 'critical',
                      description: 'Lethal drug-drug interaction: co-administration of Calcium Channel Blockers (verapamil/nicardipine) with Dantrolene during active Malignant Hyperthermia causes severe hyperkalemia and acute myocardial collapse.',
                      idealAction: 'Avoid Calcium Channel Blockers when Dantrolene is administered.',
                      actualAction: 'Co-administered calcium channel blockers with Dantrolene.',
                      impact: 'Lethal hyperkalemia and cardiovascular collapse (PEA arrest).',
                      chapterSource: "Miller's Anesthesia Chapter 35"
                  });
              }
          }
          
          // Mitochondrial myopathy lactic acidosis on LR
          let isLRInfusionActive = false;
          if (st.patient.accessLines) {
              st.patient.accessLines.forEach(line => {
                  if (line.activeInfusions && line.activeInfusions.length > 0 && !line.failed) {
                      const currentInf = line.activeInfusions[0];
                      if (currentInf && currentInf.name === 'Lactated Ringers (LR)' && currentInf.currentRate > 0) {
                          isLRInfusionActive = true;
                      }
                  }
              });
          }
          if (st.patient.mitochondrial && isLRInfusionActive) {
              currentLactate = Math.min(25.0, currentLactate + 0.1);
          }
          
          // DMD/BMD Succinylcholine PEA arrest (defensive pass in case not caught in processMed)
          let suxArrestTriggered = st.patient.suxArrestTriggered || false;
          if (suxCeForLeak > 0.01 && (st.patient.dmd || st.patient.bmd)) {
              currentK = 9.0;
              patientAfterFluidics.isArrest = true;
              patientAfterFluidics.cardiacRhythm = 'pea';
              if (!suxArrestTriggered) {
                  suxArrestTriggered = true;
                  logQualityEvent({
                      category: 'PharmacologicChoice',
                      severity: 'critical',
                      description: `Succinylcholine administered to patient with ${st.patient.dmd ? 'Duchenne' : 'Becker'} Muscular Dystrophy, triggering severe hyperkalemic cardiac arrest.`,
                      idealAction: 'Avoid succinylcholine in patients with muscular dystrophy; use non-depolarizing muscle relaxants.',
                      actualAction: 'Administered Succinylcholine.',
                      impact: 'Acute rhabdomyolysis, lethal hyperkalemia, and PEA cardiac arrest.',
                      chapterSource: "Miller's Anesthesia Chapter 35"
                  });
              }
          }

          st.patient.delayedDantroleneLogged = delayedDantroleneLogged;
          st.patient.suxArrestTriggered = suxArrestTriggered;
          patientAfterFluidics.delayedDantroleneLogged = delayedDantroleneLogged;
          patientAfterFluidics.suxArrestTriggered = suxArrestTriggered;

          // Chapter 35: Periodic Paralysis Electrolyte Dynamics (Miller 9th Ed, Ch 35 pp. 1138-1140)
          // HyperPP: NaV1.4 gain-of-function → baseline K+ drift upward during stress/cold/fasting
          if (st.patient.hyperPP) {
              const hyperPPKDrift = 0.02; // Mild K+ rise per tick from Na+ channel leak
              currentK = Math.min(7.0, currentK + hyperPPKDrift);
              // If attack is active (triggered by sux or neostigmine), accelerate
              if (st.patient.hyperPPAttackActive) {
                  currentK = Math.min(8.5, currentK + 0.05);
              }
          }
          // HypoPP: Glucose-containing IVF or catecholamines shift K+ intracellularly → hypokalemia → paralysis
          if (st.patient.hypoPP) {
              let isDextroseInfusionActive = false;
              if (st.patient.accessLines) {
                  st.patient.accessLines.forEach(line => {
                      if (line.activeInfusions && line.activeInfusions.length > 0 && !line.failed) {
                          const currentInf = line.activeInfusions[0];
                          if (currentInf && (currentInf.name === 'D5W' || currentInf.name === 'D5NS' || currentInf.name === 'D5LR' ||
                              (currentInf.name && currentInf.name.includes('Dextrose'))) && currentInf.currentRate > 0) {
                              isDextroseInfusionActive = true;
                          }
                      }
                  });
              }
              if (isDextroseInfusionActive) {
                  // Glucose triggers intracellular K+ shift → progressive hypokalemia
                  currentK = Math.max(1.5, currentK - 0.04);
                  if (!st.patient.hypoPPDextroseWarned) {
                      st.patient.hypoPPDextroseWarned = true;
                      patientAfterFluidics.hypoPPDextroseWarned = true;
                      logEvent(`⚠️ WARNING: Glucose-containing IV fluid administered to patient with Hypokalemic Periodic Paralysis! Glucose triggers intracellular potassium shift, precipitating paralytic attack.`);
                      logQualityEvent({
                          category: 'FluidManagement',
                          severity: 'major',
                          description: 'Glucose-containing IV fluid administered to patient with Hypokalemic Periodic Paralysis (HypoPP). Glucose triggers insulin-mediated intracellular K+ shift, precipitating paralytic attacks.',
                          idealAction: 'Use potassium-free, non-glucose-containing maintenance fluids (e.g., NS) in HypoPP patients.',
                          actualAction: 'Administered glucose-containing IV fluid.',
                          impact: 'Progressive hypokalemia and postoperative flaccid paralysis.',
                          chapterSource: "Miller's Anesthesia Chapter 35"
                      });
                  }
              }
              // Epinephrine-containing LAs also precipitate hypokalemia via beta-adrenergic K+ shift
              const epinephrineModel = st.activeMeds?.find(m => m.name === 'Epinephrine');
              const epinephrineCe = epinephrineModel ? epinephrineModel.Ce : 0;
              if (epinephrineCe > 0.01) {
                  currentK = Math.max(1.5, currentK - 0.02);
              }
          }
          
          if (prisTriggered) {
              const isInfusing = propofolModel && propofolModel.currentInfusionRate > 0;
              if (isInfusing) {
                  currentK += 0.03; // Progressive hyperkalemia from rhabdo
                  currentLactate += 0.08; // Progressive metabolic acidosis
                  stunning = Math.min(85, stunning + 0.5); // Myocardial stunning
              } else {
                  // Recovery if propofol is stopped
                  currentK = Math.max(4.0, currentK - 0.01);
                  currentLactate = Math.max(1.0, currentLactate - 0.015);
                  stunning = Math.max(0, stunning - 0.005);
              }
              
              // Treatment with Bicarbonate shifts K and treats acidosis
              const bicarbModel = st.activeMeds?.find(m => m.name === 'Bicarbonate');
              if (bicarbModel && bicarbModel.Ce > 0.02) {
                  currentK = Math.max(4.0, currentK - 0.05);
                  currentLactate = Math.max(1.0, currentLactate - 0.1);
              }
          }
          
          // Save updated potassium in fluidicsOutput.electrolytes
          fluidicsOutput.electrolytes.k = currentK;
          st.patient.prisAccumulation = currentPrisAccum;
          st.patient.prisTriggered = prisTriggered;
          st.patient.myocardialStunning = stunning;
          patientAfterFluidics.prisAccumulation = currentPrisAccum;
          patientAfterFluidics.prisTriggered = prisTriggered;
          patientAfterFluidics.myocardialStunning = stunning;

          // 2. Adrenocortical Suppression
          // etomidateModel and etomidateCe are already declared in this scope above
          let adrenalSuppressionActive = st.patient.adrenalSuppressionActive || false;
          
          if (etomidateCe < 0.01) {
              st.patient.adrenalSuppressionRolled = undefined;
          }
          if (etomidateCe > 0.05 && !adrenalSuppressionActive) {
              if (st.patient.adrenalSuppressionRolled === undefined) {
                  const baseProb = 0.10;
                  const isElderly = typeof st.patient.age === 'number' && st.patient.age > 65;
                  const modifier = (st.patient.isSeptic || st.patient.trauma || isElderly) ? 5.0 : 1.0;
                  const prob = Math.min(1.0, baseProb * modifier);
                  st.patient.adrenalSuppressionRolled = rng() < prob;
              }
              if (st.patient.forceAdrenalSuppression || st.patient.adrenalSuppressionRolled) {
                  adrenalSuppressionActive = true;
                  logEvent(`🚨 CLINICAL ALERT: Etomidate administration has inhibited 11-beta-hydroxylase, triggering adrenocortical suppression! Cortisol production has shut down, blunting endogenous sympathetic tone and vascular responsiveness to catecholamines.`);
              } else {
                  st.patient.adrenalSuppressionRolled = false;
                  logEvent(`⚠️ Clinical Note: Etomidate was administered. While biochemically 11-beta-hydroxylase inhibition occurs, no acute adrenocortical suppression or sympathetic blunting occurred in this patient (occurs in ~10% of elective cases).`);
              }
          }
          
          const dexaModel = st.activeMeds?.find(m => m.name === 'Dexamethasone');
          const dexaCe = dexaModel ? dexaModel.Ce : 0;
          if (dexaCe > 0.01 && adrenalSuppressionActive) {
              adrenalSuppressionActive = false;
              logEvent(`✅ SUCCESS: Dexamethasone administered! Corticosteroid activity restored, reversing etomidate-induced adrenocortical suppression and restoring vasopressor sensitivity.`);
          }
          
          st.patient.adrenalSuppressionActive = adrenalSuppressionActive;
          patientAfterFluidics.adrenalSuppressionActive = adrenalSuppressionActive;

          // 3. Ketamine Emergence Delirium
          // ketamineModel/ketamineCe already declared above (~L1213-1214)
          let emergenceDeliriumTriggered = st.patient.emergenceDeliriumTriggered || false;
          let deliriumHrMod = 0;
          let deliriumMapMod = 0;
          
          if (ketamineCe < 0.01) {
              st.patient.emergenceDeliriumRolled = undefined;
          }
          if (ketamineCe > 0.4) {
              st.patient.ketaminePeakAchieved = true;
              patientAfterFluidics.ketaminePeakAchieved = true;
          }
          if (ketamineCe > 0.02 && ketamineCe < 0.25 && sedativeEff < 0.2 && !emergenceDeliriumTriggered && st.patient.ketaminePeakAchieved) {
              if (st.patient.emergenceDeliriumRolled === undefined) {
                  const baseProb = 0.15;
                  const isAgeExtreme = typeof st.patient.age === 'number' && (st.patient.age < 18 || st.patient.age > 65);
                  const modifier = (st.patient.highAnxiety || st.patient.trauma || isAgeExtreme) ? 3.0 : 1.0;
                  const prob = Math.min(1.0, baseProb * modifier);
                  st.patient.emergenceDeliriumRolled = rng() < prob;
              }
              if (st.patient.forceEmergenceDelirium || st.patient.emergenceDeliriumRolled) {
                  emergenceDeliriumTriggered = true;
                  logEvent(`🚨 CLINICAL WARNING: Patient is emerging from Ketamine anesthesia and experiencing Emergence Delirium! Signs include severe psychomotor agitation, visual hallucinations, sialorrhea, tachycardia, and hypertension.`);
              } else {
                  st.patient.emergenceDeliriumRolled = false;
                  st.patient.ketaminePeakAchieved = false;
                  patientAfterFluidics.ketaminePeakAchieved = false;
                  logEvent(`⚠️ Clinical Note: Patient emerged from Ketamine anesthesia. No emergence delirium occurred (occurs in ~15% of cases without co-administered sedatives).`);
              }
          }
          if (emergenceDeliriumTriggered) {
              if (sedativeEff > 0.35) {
                  emergenceDeliriumTriggered = false;
                  logEvent(`✅ SUCCESS: Sedative administered! Emergence delirium successfully suppressed.`);
              } else {
                  deliriumHrMod = 20;
                  deliriumMapMod = 25;
                  
                  // In un-intubated patients, saliva can trigger laryngospasm
                  if (!st.patient.airwaySecured && st.patient.laryngospasm === false && rng() < 0.02) {
                      st.patient.laryngospasm = true;
                      patientAfterFluidics.laryngospasm = true;
                      logEvent(`🚨 CRITICAL ALERT: Sialorrhea from Ketamine emergence delirium has triggered a Laryngospasm! Airway resistance is now infinite.`);
                  }
              }
          }
          
          st.patient.emergenceDeliriumTriggered = emergenceDeliriumTriggered;
          patientAfterFluidics.emergenceDeliriumTriggered = emergenceDeliriumTriggered;

          // 4. Barbiturate Arterial Precipitation
          let barbiturateArterialPrecipitation = st.patient.barbiturateArterialPrecipitation || false;
          let arterialIschemiaHrMod = 0;
          let arterialIschemiaMapMod = 0;
          
          if (barbiturateArterialPrecipitation) {
              const lidoModel = st.activeMeds?.find(m => m.name === 'Lidocaine');
              const lidoCe = lidoModel ? lidoModel.Ce : 0;
              const papModel = st.activeMeds?.find(m => m.name === 'Papaverine');
              const papCe = papModel ? papModel.Ce : 0;
              
              if (lidoCe > 0.05 || papCe > 0.05) {
                  barbiturateArterialPrecipitation = false;
                  st.patient.barbiturateArterialPrecipitation = false;
                  logEvent(`✅ SUCCESS: Vasodilator administered into arterial line! Profound arterial vasospasm resolved, crystals dissolved, and distal tissue perfusion restored.`);
              } else {
                  arterialIschemiaHrMod = 30;
                  arterialIschemiaMapMod = 40;
              }
          }
          
          st.patient.barbiturateArterialPrecipitation = barbiturateArterialPrecipitation;
          patientAfterFluidics.barbiturateArterialPrecipitation = barbiturateArterialPrecipitation;

          // 5. Benzodiazepine Withdrawal Seizures
          const flumModel = st.activeMeds?.find(m => m.name === 'Flumazenil');
          const flumCe = flumModel ? flumModel.Ce : 0;
          // isSeizure and seizureMetabolicMultiplier are already declared in this scope above
          
          if (flumCe < 0.01) {
              st.patient.benzoWithdrawalSeizureRolled = undefined;
          }
          if (flumCe > 0.02 && st.patient.chronicBenzoUse && !st.patient.benzoWithdrawalSeizureTriggered && st.patient.benzoWithdrawalSeizureRolled === undefined) {
              if (st.patient.benzoWithdrawalSeizureRolled === undefined) {
                  const baseProb = 0.10;
                  const modifier = (st.patient.isSeptic || st.patient.trauma || st.patient.highAnxiety) ? 3.0 : 1.0;
                  const prob = Math.min(1.0, baseProb * modifier);
                  st.patient.benzoWithdrawalSeizureRolled = rng() < prob;
              }
              if (st.patient.forceBenzoWithdrawalSeizure || st.patient.benzoWithdrawalSeizureRolled) {
                  st.patient.benzoWithdrawalSeizureTriggered = true;
                  logEvent(`🚨 CRITICAL EMERGENCY: Flumazenil administered to a chronic benzodiazepine user! Triggered acute benzodiazepine withdrawal tonic-clonic seizures! Metabolic rate has surged, causing severe hypoxia risk.`);
              } else {
                  st.patient.benzoWithdrawalSeizureRolled = false;
                  logEvent(`⚠️ Clinical Note: Flumazenil was administered to a chronic benzodiazepine user. While acute withdrawal or anxiety commonly occurs, no withdrawal seizures were triggered (occurs in ~10% of cases).`);
              }
          }
          if (st.patient.benzoWithdrawalSeizureTriggered) {
              if (propofolCe > 1.2 || midazolamCe > 0.08) {
                  st.patient.benzoWithdrawalSeizureTriggered = false;
                  logEvent(`✅ SUCCESS: Anticonvulsant sedative administered. Seizure activity aborted.`);
              } else {
                  isSeizure = true;
                  seizureMetabolicMultiplier = 8.0;
              }
          }
          
          st.patient.isSeizure = isSeizure;
          patientAfterFluidics.isSeizure = isSeizure;

          // ==========================================
          // CHAPTER 24: OPIOID CRITICAL SCENARIOS
          // ==========================================
          const fentanylCe = st.activeMeds?.find(m => m.name === 'Fentanyl')?.Ce || 0;
          const remifentanilCe = st.activeMeds?.find(m => m.name === 'Remifentanil')?.Ce || 0;
          const sufentanilCe = st.activeMeds?.find(m => m.name === 'Sufentanil')?.Ce || 0;
          const morphineCe = st.activeMeds?.find(m => m.name === 'Morphine')?.Ce || 0;
          const hydromorphoneCe = st.activeMeds?.find(m => m.name === 'Hydromorphone')?.Ce || 0;

          // 1. Opioid-Induced Chest Wall Rigidity ("Wooden Chest Syndrome")
          let opioidRigidityActive = st.patient.opioidRigidityActive || false;
          if (fentanylCe < 0.0002 && remifentanilCe < 0.0002 && sufentanilCe < 0.00002) {
              st.patient.opioidRigidityRolled = undefined;
          }
          if (!opioidRigidityActive && maxNMJOccupancy < 0.8 && naloxoneCe < 0.001) {
              const hasHighOpioids = fentanylCe > 0.0015 || remifentanilCe > 0.003 || sufentanilCe > 0.00015;
              if (hasHighOpioids && st.patient.opioidRigidityRolled === undefined) {
                  if (st.patient.opioidRigidityRolled === undefined) {
                      const baseProb = 0.03;
                      const isAgeExtreme = typeof st.patient.age === 'number' && (st.patient.age < 12 || st.patient.age > 65);
                      const modifier = (isAgeExtreme || (sedativeEff < 0.1)) ? 4.0 : 1.0;
                      const prob = Math.min(1.0, baseProb * modifier);
                      st.patient.opioidRigidityRolled = rng() < prob;
                  }
                  if (st.patient.forceOpioidRigidity || st.patient.opioidRigidityRolled) {
                      opioidRigidityActive = true;
                      logEvent("🚨 CRITICAL EMERGENCY: Rapid bolus of potent lipophilic opioids has triggered Opioid-Induced Chest Wall Rigidity ('Wooden Chest Syndrome')! The chest wall is locked, compliance has dropped to 3 mL/cmH2O, and airway resistance is 999 cmH2O/L/s, making manual/bag-mask ventilation impossible.");
                  } else {
                      st.patient.opioidRigidityRolled = false;
                      logEvent("⚠️ Clinical Note: High dose of potent lipophilic opioid administered. Fortunately, chest wall rigidity was not triggered (baseline incidence ~3%). Spontaneous or manual ventilation remains patent.");
                  }
              }
          }
          if (opioidRigidityActive) {
              if (maxNMJOccupancy >= 0.8) {
                  opioidRigidityActive = false;
                  logEvent("✅ SUCCESS: Muscle relaxant administered! Nicotinic acetylcholine receptor blockade has resolved chest wall rigidity and restored chest wall compliance.");
              } else if (naloxoneCe > 0.001) {
                  opioidRigidityActive = false;
                  logEvent("✅ SUCCESS: Naloxone administered! Competitive mu-receptor antagonism has resolved chest wall rigidity.");
              }
          }
          st.patient.opioidRigidityActive = opioidRigidityActive;
          patientAfterFluidics.opioidRigidityActive = opioidRigidityActive;

          // 2. Remifentanil-Induced Hyperalgesia (OIH)
          let remifentanilInfusionDuration = st.patient.remifentanilInfusionDuration || 0;
          let remifentanilHyperalgesiaActive = st.patient.remifentanilHyperalgesiaActive || false;
          const remiModel = st.activeMeds?.find(m => m.name === 'Remifentanil');
          const remiInfRate = remiModel ? remiModel.currentInfusionRate : 0;

          if (remiInfRate > 0.15 || remifentanilCe > 0.003) {
              remifentanilInfusionDuration += 1;
              st.patient.remiHyperalgesiaRolled = undefined;
          }

          if (remifentanilInfusionDuration > 180 && remiInfRate === 0 && remifentanilCe < 0.0005 && !remifentanilHyperalgesiaActive && st.patient.remiHyperalgesiaRolled === undefined) {
              if (st.patient.remiHyperalgesiaRolled === undefined) {
                  const baseProb = 0.15;
                  const modifier = (st.patient.highAnxiety || st.patient.sex === 'female') ? 3.0 : 1.0;
                  const prob = Math.min(1.0, baseProb * modifier);
                  st.patient.remiHyperalgesiaRolled = rng() < prob;
              }
              if (st.patient.forceRemifentanilHyperalgesia || st.patient.remiHyperalgesiaRolled) {
                  remifentanilHyperalgesiaActive = true;
                  logEvent("🚨 CLINICAL ALERT: Prolonged high-dose Remifentanil infusion has been discontinued, triggering acute Opioid-Induced Hyperalgesia (OIH)! Central glutamate and substance P sensitization has amplified nociceptive transmission.");
              } else {
                  st.patient.remiHyperalgesiaRolled = false;
                  remifentanilInfusionDuration = 0;
                  logEvent("⚠️ Clinical Note: Prolonged Remifentanil infusion discontinued. Fortunately, no acute opioid-induced hyperalgesia (OIH) was triggered (baseline incidence ~15%).");
              }
          }

          // Lidocaine, Ketamine, or Magnesium reverses OIH
          if (remifentanilHyperalgesiaActive && (ketamineCe > 0.05 || magnesiumCe > 1.0 || lidocaineCe > 1.0)) {
              remifentanilHyperalgesiaActive = false;
              remifentanilInfusionDuration = 0; // reset
              logEvent("✅ SUCCESS: Non-opioid adjuvant administered! Central hyperalgesia pathways blocked, successfully reversing opioid-induced hyperalgesia.");
          }

          // Slow recovery of OIH: half-life of 15 ticks (minutes)
          if (remifentanilHyperalgesiaActive) {
              remifentanilInfusionDuration *= 0.955; // decay
              if (remifentanilInfusionDuration < 1.0) {
                  remifentanilHyperalgesiaActive = false;
                  remifentanilInfusionDuration = 0;
                  logEvent("✅ Opioid-Induced Hyperalgesia and tolerance resolved. Pain threshold restored to baseline.");
              }
          }

          const opioidToleranceMultiplier = remifentanilHyperalgesiaActive ? 2.0 : 1.0;
          st.patient.remifentanilInfusionDuration = remifentanilInfusionDuration;
          st.patient.remifentanilHyperalgesiaActive = remifentanilHyperalgesiaActive;
          st.patient.opioidToleranceMultiplier = opioidToleranceMultiplier;
          patientAfterFluidics.remifentanilInfusionDuration = remifentanilInfusionDuration;
          patientAfterFluidics.remifentanilHyperalgesiaActive = remifentanilHyperalgesiaActive;
          patientAfterFluidics.opioidToleranceMultiplier = opioidToleranceMultiplier;

          const meperidineModel = st.activeMeds?.find(m => m.name === 'Meperidine');
          const meperidineCe = meperidineModel ? meperidineModel.Ce : 0;
          const nitroglycerinModel = st.activeMeds?.find(m => m.name === 'Nitroglycerin');
          const nitroglycerinCe = nitroglycerinModel ? nitroglycerinModel.Ce : 0;

          // 3. Sphincter of Oddi Spasm
          let sphincterOfOddiSpasmActive = st.patient.sphincterOfOddiSpasmActive || false;
          const oddiStimulation = 20 * morphineCe + 500 * fentanylCe + 3000 * sufentanilCe + 80 * hydromorphoneCe + 800 * remifentanilCe - 5 * meperidineCe;
          
          if (oddiStimulation < 0.2) {
              st.patient.sphincterOfOddiRolled = undefined;
          }
          if (!sphincterOfOddiSpasmActive) {
              const hasTriggerAgonists = oddiStimulation > 0.8;
              if (hasTriggerAgonists && st.patient.sphincterOfOddiRolled === undefined) {
                  if (st.patient.sphincterOfOddiRolled === undefined) {
                      const baseProb = 0.02;
                      const isElderly = typeof st.patient.age === 'number' && st.patient.age > 50;
                      let modifier = 1.0;
                      if (st.patient.biliaryDisease || st.patient.cholecystectomy) {
                          modifier = 10.0;
                      } else if (isElderly) {
                          modifier = 4.0;
                      }
                      const prob = Math.min(1.0, baseProb * modifier);
                      st.patient.sphincterOfOddiRolled = rng() < prob;
                  }
                  if (st.patient.forceSphincterOfOddiSpasm || st.patient.sphincterOfOddiRolled) {
                      sphincterOfOddiSpasmActive = true;
                      logEvent("🚨 CLINICAL ALERT: Opioid administration has induced spasm of the sphincter of Oddi! Common bile duct pressure has spiked, causing severe biliary colic pain.");
                  } else {
                      st.patient.sphincterOfOddiRolled = false;
                      logEvent("⚠️ Clinical Note: Opioids administered. Sphincter of Oddi tone remained stable (biliary spasm occurs in ~2% of patients).");
                  }
              }
          }
          let oddiHrMod = 0;
          let oddiMapMod = 0;
          if (sphincterOfOddiSpasmActive) {
              const atropineModel = st.activeMeds?.find(m => m.name === 'Atropine');
              const atropineCe = atropineModel ? atropineModel.Ce : 0;
              if (naloxoneCe > 0.001) {
                  sphincterOfOddiSpasmActive = false;
                  logEvent("✅ SUCCESS: Naloxone administered! Competitive mu-receptor antagonism has resolved sphincter of Oddi spasm.");
              } else if (atropineCe > 0.01) {
                  sphincterOfOddiSpasmActive = false;
                  logEvent("✅ SUCCESS: Atropine administered! Muscarinic receptor blockade has relaxed the sphincter of Oddi and resolved spasm.");
              } else if (nitroglycerinCe > 0.01) {
                  sphincterOfOddiSpasmActive = false;
                  logEvent("✅ SUCCESS: Nitroglycerin administered! Nitric oxide-mediated smooth muscle relaxation has resolved sphincter of Oddi spasm.");
              } else {
                  oddiHrMod = 15;
                  oddiMapMod = 20;
              }
          }
          st.patient.sphincterOfOddiSpasmActive = sphincterOfOddiSpasmActive;
          patientAfterFluidics.sphincterOfOddiSpasmActive = sphincterOfOddiSpasmActive;

          // 4. Opioid-Induced Pruritus
          let opioidPruritusActive = st.patient.opioidPruritusActive || false;
          if (morphineCe < 0.01) {
              st.patient.opioidPruritusRolled = undefined;
          }
          if (morphineCe > 0.03 && !opioidPruritusActive && st.patient.opioidPruritusRolled === undefined) {
              if (st.patient.opioidPruritusRolled === undefined) {
                  const baseProb = 0.10;
                  const modifier = (st.patient.sex === 'female') ? 3.0 : 1.0;
                  const prob = Math.min(1.0, baseProb * modifier);
                  st.patient.opioidPruritusRolled = rng() < prob;
              }
              if (st.patient.forceOpioidPruritus || st.patient.opioidPruritusRolled) {
                  opioidPruritusActive = true;
                  logEvent("🚨 CLINICAL ALERT: Morphine administration has triggered significant opioid-induced pruritus (facial itching)! This is mediated by central mu-receptor and gastrin-releasing peptide receptor co-activation.");
              } else {
                  st.patient.opioidPruritusRolled = false;
                  logEvent("⚠️ Clinical Note: Morphine administered. Facial itching was not triggered (baseline clinical incidence ~10%).");
              }
          }
          if (opioidPruritusActive) {
              const ondansetronModel = st.activeMeds?.find(m => m.name === 'Ondansetron');
              const ondansetronCe = ondansetronModel ? ondansetronModel.Ce : 0;
              if (ondansetronCe > 0.02) {
                  opioidPruritusActive = false;
                  logEvent("✅ SUCCESS: Ondansetron administered! 5-HT3 receptor blockade has successfully treated opioid-induced pruritus.");
              } else if (naloxoneCe > 0.0002 && naloxoneCe < 0.002) {
                  opioidPruritusActive = false;
                  logEvent("✅ SUCCESS: Low-dose Naloxone titrated! Competitive mu-receptor antagonism has resolved pruritus while preserving systemic analgesia.");
              } else if (naloxoneCe >= 0.002) {
                  opioidPruritusActive = false;
                  logEvent("✅ SUCCESS: Naloxone administered! Pruritus resolved, but warning: full dose has antagonized all opioid analgesia!");
              }
          }
          st.patient.opioidPruritusActive = opioidPruritusActive;
          patientAfterFluidics.opioidPruritusActive = opioidPruritusActive;

          // 4b. Opioid-Induced Urinary Retention
          let urinaryRetentionActive = st.patient.urinaryRetentionActive || false;
          let bladderVolume = st.patient.bladderVolume || 0.0;
          let hasFoley = st.patient.hasFoley || false;

          if (hasFoley) {
              urinaryRetentionActive = false;
          }

          if (opioidEff < 0.05) {
              st.patient.urinaryRetentionRolled = undefined;
          }

          if (!urinaryRetentionActive && !hasFoley) {
              if (opioidEff > 0.3 && st.patient.urinaryRetentionRolled === undefined) {
                  const baseProb = 0.15;
                  const isMale = st.patient.sex === 'male';
                  const isElderly = typeof st.patient.age === 'number' && st.patient.age > 60;
                  let modifier = 1.0;
                  if (isMale && isElderly) {
                      modifier = 3.0; // BPH + aging detrusor
                  } else if (isMale) {
                      modifier = 1.8;
                  } else if (isElderly) {
                      modifier = 1.5;
                  }
                  const prob = Math.min(1.0, baseProb * modifier);
                  st.patient.urinaryRetentionRolled = rng() < prob;
                  
                  if (st.patient.forceUrinaryRetention || st.patient.urinaryRetentionRolled) {
                      urinaryRetentionActive = true;
                      logEvent("🚨 CLINICAL ALERT: Opioid administration has induced urinary retention! Detrusor relaxation and sphincter contraction prevent voiding.");
                  } else {
                      st.patient.urinaryRetentionRolled = false;
                  }
              }
          }

          // Resolution criteria: Naloxone or Foley catheter placement
          if (urinaryRetentionActive) {
              if (naloxoneCe > 0.001) {
                  urinaryRetentionActive = false;
                  logEvent("✅ SUCCESS: Naloxone administered! Competitive mu-receptor antagonism has resolved urinary retention.");
              } else if (hasFoley) {
                  urinaryRetentionActive = false;
                  logEvent("✅ SUCCESS: Foley catheter inserted. Bladder drained and urinary retention resolved.");
              }
          }

          // Bladder distension sympathetic response (Phase 4, Stage B): graded by actual
          // bladder pressure from last tick's BladderModel.ts output (RenalEngine.tick() runs
          // later this same tick and recomputes it -- one-tick lag, the same established
          // pattern used elsewhere for cross-engine values, e.g. the CO2/RR coupling), replacing
          // the old flat +5/+5 on/off offset. Autonomic dysreflexia (spinal cord injury above
          // T6) produces a separate, far more severe paroxysmal HTN+bradycardia pattern,
          // triggered at a much lower bladder pressure than the generic response.
          const safeDistensionSympatheticIndex = typeof st.patient.distensionSympatheticIndex === 'number' && Number.isFinite(st.patient.distensionSympatheticIndex) ? st.patient.distensionSympatheticIndex : 0;
          let retentionHrMod = 8 * safeDistensionSympatheticIndex;
          let retentionMapMod = 8 * safeDistensionSympatheticIndex;
          if (st.patient.autonomicDysreflexiaActive) {
              const dysreflexiaSeverity = typeof st.patient.autonomicDysreflexiaSeverity === 'number' && Number.isFinite(st.patient.autonomicDysreflexiaSeverity) ? st.patient.autonomicDysreflexiaSeverity : 0;
              retentionHrMod -= 20 * dysreflexiaSeverity;
              retentionMapMod += 60 * dysreflexiaSeverity;
              if (!st.patient.autonomicDysreflexiaLogged) {
                  logEvent("🚨 CRITICAL EMERGENCY: Autonomic dysreflexia triggered by bladder distension! Unopposed sympathetic reflex below the level of spinal cord injury is causing severe paroxysmal hypertension with reflex bradycardia -- empty the bladder immediately (Foley catheterization) and treat hypertension.");
                  st.patient.autonomicDysreflexiaLogged = true;
              }
          } else {
              st.patient.autonomicDysreflexiaLogged = false;
          }

          st.patient.urinaryRetentionActive = urinaryRetentionActive;
          st.patient.bladderVolume = bladderVolume;
          st.patient.hasFoley = hasFoley;
          patientAfterFluidics.urinaryRetentionActive = urinaryRetentionActive;
          patientAfterFluidics.bladderVolume = bladderVolume;
          patientAfterFluidics.hasFoley = hasFoley;

          // 5. Naloxone Sympathetic Surge
          let naloxoneSurgeTriggered = st.patient.naloxoneSurgeTriggered || false;
          let naloxoneSurgeActive = st.patient.naloxoneSurgeActive || false;
          let naloxoneSurgeTime = st.patient.naloxoneSurgeTime !== undefined ? st.patient.naloxoneSurgeTime : 0;

          if (naloxoneCe < 0.0005) {
              st.patient.naloxoneSurgeRolled = undefined;
          }
          if (naloxoneCe > 0.002 && !naloxoneSurgeTriggered && opioidEff > 0.4 && st.patient.naloxoneSurgeRolled === undefined) {
              if (st.patient.naloxoneSurgeRolled === undefined) {
                  const baseProb = 0.05;
                  const modifier = (st.patient.cad || st.patient.chf || st.patient.highAnxiety) ? 5.0 : 1.0;
                  const prob = Math.min(1.0, baseProb * modifier);
                  st.patient.naloxoneSurgeRolled = rng() < prob;
              }
              if (st.patient.forceNaloxoneSurge || st.patient.naloxoneSurgeRolled) {
                  naloxoneSurgeTriggered = true;
                  naloxoneSurgeActive = true;
                  naloxoneSurgeTime = 120; // 120 seconds duration
                  logEvent("🚨 CRITICAL ALERT: Rapid Naloxone reversal has triggered an acute autonomic sympathetic surge! Release of endogenous catecholamines causes severe hypertension and tachycardia.");
              } else {
                  st.patient.naloxoneSurgeRolled = false;
                  logEvent("⚠️ Clinical Note: Rapid Naloxone reversal performed. Fortunately, no acute sympathetic surge occurred (occurs in ~5% of reversals). Hemodynamics remain stable.");
              }
          }
          let surgeHrMod = 0;
          let surgeMapMod = 0;
          if (naloxoneSurgeActive && naloxoneSurgeTime > 0) {
              naloxoneSurgeTime--;
              const factor = naloxoneSurgeTime / 120;
              surgeHrMod = Math.round(30 * factor);
              surgeMapMod = Math.round(35 * factor);
              if (naloxoneSurgeTime === 0) {
                  naloxoneSurgeActive = false;
                  logEvent("✅ SUCCESS: Naloxone-induced sympathetic surge has resolved and hemodynamics have stabilized.");
              }
          }
          st.patient.naloxoneSurgeTriggered = naloxoneSurgeTriggered;
          st.patient.naloxoneSurgeActive = naloxoneSurgeActive;
          st.patient.naloxoneSurgeTime = naloxoneSurgeTime;
          patientAfterFluidics.naloxoneSurgeTriggered = naloxoneSurgeTriggered;
          patientAfterFluidics.naloxoneSurgeActive = naloxoneSurgeActive;
          patientAfterFluidics.naloxoneSurgeTime = naloxoneSurgeTime;

          // 6. Renarcotization
          let renarcotizationActive = st.patient.renarcotizationActive || false;
          if (naloxoneSurgeTriggered && naloxoneCe < 0.0005 && !renarcotizationActive) {
              const longAgonistActive = (fentanylCe > 0.002) || (morphineCe > 0.04) || (sufentanilCe > 0.0004) || (hydromorphoneCe > 0.015);
              if (longAgonistActive) {
                  renarcotizationActive = true;
                  logEvent("🚨 CRITICAL EMERGENCY: Naloxone levels have decayed below the therapeutic threshold while high levels of long-acting opioid agonists remain! Renarcotization has occurred, re-triggering central respiratory arrest.");
              }
          }
          if (renarcotizationActive && naloxoneCe >= 0.001) {
              renarcotizationActive = false;
              logEvent("✅ SUCCESS: Repeat Naloxone dose administered! Renarcotization reversed and spontaneous respiration restored.");
          }
          st.patient.renarcotizationActive = renarcotizationActive;
          patientAfterFluidics.renarcotizationActive = renarcotizationActive;

          // 6b. Carbamazepine agranulocytosis & sepsis
          const cbzModel = st.activeMeds?.find(m => m.name === 'Carbamazepine');
          const cbzCe = cbzModel ? cbzModel.Ce : 0;
          let cbzDyscrasiaActive = st.patient.carbamazepineDyscrasiaActive || false;

          if (!cbzDyscrasiaActive) {
              if (cbzCe > 6.0 || !!st.patient.forceCarbamazepineDyscrasia) {
                  cbzDyscrasiaActive = true;
                  logEvent("🚨 CRITICAL EMERGENCY: Carbamazepine has triggered acute severe agranulocytosis and dyscrasia! Agranulocytic sepsis manifests with hyperpyrexia, hypermetabolism, and severe vasodilation.");
              }
          } else {
              if (cbzCe < 4.0 && !st.patient.forceCarbamazepineDyscrasia) {
                  cbzDyscrasiaActive = false;
                  logEvent("✅ SUCCESS: Carbamazepine dyscrasia and agranulocytic sepsis resolved. Bone marrow suppression has ceased.");
              }
          }

          let cbzWBC = typeof st.patient.whiteBloodCellCount === 'number' ? st.patient.whiteBloodCellCount : 7.5;
          if (cbzDyscrasiaActive) {
              cbzWBC = 0.5;
              drugSvrMod *= 0.70; // 30% reduction in SVR
              ruleHrOffset += 30; // HR rise +30 bpm
          } else {
              if (cbzWBC < 7.5) {
                  cbzWBC = Math.min(7.5, cbzWBC + 0.1);
              }
          }

          st.patient.carbamazepineDyscrasiaActive = cbzDyscrasiaActive;
          st.patient.whiteBloodCellCount = cbzWBC;
          patientAfterFluidics.carbamazepineDyscrasiaActive = cbzDyscrasiaActive;
          patientAfterFluidics.whiteBloodCellCount = cbzWBC;

          // 6c. Ziconotide Postural Hypotension
          const zicModel = st.activeMeds?.find(m => m.name === 'Ziconotide');
          const zicCe = zicModel ? zicModel.Ce : 0;
          let zicHypotensionActive = zicCe > 0.002;

          if (zicHypotensionActive && !st.patient.ziconotideHypotensionActive) {
              logEvent("🚨 CLINICAL ALERT: Ziconotide has induced postural hypotension! Selective N-type calcium channel blockade has blunted sympathetic vascular tone.");
          } else if (!zicHypotensionActive && st.patient.ziconotideHypotensionActive) {
              logEvent("✅ SUCCESS: Ziconotide postural hypotension has resolved.");
          }
          st.patient.ziconotideHypotensionActive = zicHypotensionActive;
          patientAfterFluidics.ziconotideHypotensionActive = zicHypotensionActive;

          // 6d. Oxcarbazepine Hyponatremia
          const oxcModel = st.activeMeds?.find(m => m.name === 'Oxcarbazepine');
          const oxcCe = oxcModel ? oxcModel.Ce : 0;
          let sodiumLevel = typeof st.patient.sodiumLevel === 'number' ? st.patient.sodiumLevel : 140.0;
          let isHyponatremic = !!st.patient.isHyponatremic;

          if (oxcCe > 4.0) {
              sodiumLevel = Math.max(122.0, sodiumLevel - 0.1);
          } else {
              if (sodiumLevel < 140.0) {
                  sodiumLevel = Math.min(140.0, sodiumLevel + 0.1);
              }
          }

          if (sodiumLevel < 125.0) {
              if (!isHyponatremic) {
                  isHyponatremic = true;
                  logEvent("🚨 CLINICAL ALERT: Patient has developed severe hyponatremia (Sodium < 125 mEq/L) due to Oxcarbazepine-induced water retention!");
              }
          } else {
              if (isHyponatremic && sodiumLevel >= 128.0) {
                  isHyponatremic = false;
                  logEvent("✅ SUCCESS: Hyponatremia has resolved. Sodium level restored above clinical alert threshold.");
              }
          }
          st.patient.sodiumLevel = sodiumLevel;
          st.patient.isHyponatremic = isHyponatremic;
          patientAfterFluidics.sodiumLevel = sodiumLevel;
          patientAfterFluidics.isHyponatremic = isHyponatremic;

          // Apply clinical offsets
          ruleHrOffset += deliriumHrMod + arterialIschemiaHrMod + oddiHrMod + surgeHrMod + retentionHrMod;
          ruleMapOffset += deliriumMapMod + arterialIschemiaMapMod + oddiMapMod + surgeMapMod + retentionMapMod;

          // Position modifiers
          let positionPreloadMod = 0;
          let positionHydrostaticMod = 0; 
          if (pos === 'Ramped' || pos === 'Rev Trendelenburg') {
              positionPreloadMod = -200; positionHydrostaticMod = -14.8; 
          } else if (pos === 'Sitting' || pos === 'Beach Chair') {
              positionPreloadMod = -400; positionHydrostaticMod = -29.6; 
          } else if (pos === 'Trendelenburg') {
              positionPreloadMod = 300; positionHydrostaticMod = +14.8; 
          } else if (pos === 'Lithotomy') {
              positionPreloadMod = 400; 
          } else if (pos === 'Prone') {
              positionPreloadMod = st.patient.proneSupportsPlaced ? -100 : -350;
          }

          // Pregnancy's blood volume expansion (a chronic, position-independent preload
          // increase) and aortocaval compression (a position-DEPENDENT preload penalty, only
          // when supine-like and not relieved by left uterine displacement) both feed the same
          // mL-equivalent preload channel position changes already use.
          positionPreloadMod += pregnancyOutput.bloodVolumeExpansionMl - pregnancyOutput.aortocavalCompressionPreloadPenaltyMl;

          // Gastrointestinal Engine Tick
          const isParalyzedCurrent = maxNMJOccupancy > 0.90;
          const isApneicCurrent = isParalyzedCurrent || (st.vitals.rr !== undefined && Number.isFinite(st.vitals.rr) ? st.vitals.rr < 1 : false);
          const spontaneousBreathingActive = !isParalyzedCurrent && !isApneicCurrent;
          const isVentilatingPPV = st.patient.ventilationStatus === 'mechanical' || (activeVentSettings && activeVentSettings.mode !== 'spontaneous') || (st.vitals.pip && st.vitals.pip > 15);

          const giOutput = GastrointestinalEngine.tick(1, {
              patient: {
                  ...st.patient,
                  hasAspirated: st.patient.hasAspirated || false
              },
              vitals: {
                  ...st.vitals,
                  bowelGasVolume: st.vitals.bowelGasVolume,
                  inflammatoryIleus: st.vitals.inflammatoryIleus,
                  postoperativeIleus: st.vitals.postoperativeIleus
              },
              time: st.time
          }, st.activeMeds || [], {
              EtN_2O: currentEtN2O,
              currentMac,
              C_cat: painOutput.C_cat || 0,
              positivePressureVentilationActive: isVentilatingPPV,
              spontaneousBreathingActive,
              pregnancyLesTonePenalty: pregnancyOutput.lesTonePenaltyFraction,
              pregnancyGiSlowing: pregnancyOutput.giMotilitySlowingActive
          });

          if (giOutput.events && giOutput.events.length > 0) {
              giOutput.events.forEach(evt => logEvent(evt));
          }

          if (giOutput.hasRegurgitated && !st.patient.hasRegurgitated) {
              logEvent("⚠️ WARNING: Gastric regurgitation detected! Acidic stomach contents are rising into the pharynx.");
              st.patient.hasRegurgitated = true;
          }

          // Phase 4 GI subdivision: real gastric volume/pH (replacing the orphaned gastricVolume
          // field) and the GI engine's own internal Mendelson-severity freeze (used when ITS OWN
          // aspiration trigger fires; the legacy secondary trigger below has its own fallback).
          st.patient.gastricVolume = giOutput.gastricVolume;
          st.patient.gastricPH = giOutput.gastricPH;
          st.patient.ppiSuppressionLevel = giOutput.ppiSuppressionLevel;
          st.patient.aspirationEventSeverity = giOutput.aspirationEventSeverity;
          patientAfterFluidics.gastricVolume = giOutput.gastricVolume;
          patientAfterFluidics.gastricPH = giOutput.gastricPH;
          patientAfterFluidics.ppiSuppressionLevel = giOutput.ppiSuppressionLevel;
          patientAfterFluidics.aspirationEventSeverity = giOutput.aspirationEventSeverity;

          // Hepatic Engine Tick
          const safeEbvForCvp = st.patient.ebv || 5000;
          const safeEblForCvp = st.patient.ebl || 0;
          const safeAddedForCvp = fluidicsOutput.intravascularVolumeAdded_mL || 0;
          const safeVolForCvp = safeEbvForCvp - safeEblForCvp + safeIntravascularVolume + safeAddedForCvp + positionPreloadMod;
          const peepValCvp = (activeVentSettings && activeVentSettings.peep) ? activeVentSettings.peep : 0;
          const calculatedCVP = 4.0 + 3.0 * ((safeVolForCvp - safeEbvForCvp) / 250) + peepValCvp;
          const cvp = Math.max(0.0, Math.min(25.0, calculatedCVP));

          const hepaticOutput = HepaticEngine.tick(1, {
              patient: st.patient,
              vitals: {
                  mPAP: st.vitals.mPAP,
                  HVPG: st.vitals.HVPG,
                  pbf: st.vitals.pbf,
                  habf: st.vitals.habf,
                  thbf: st.vitals.thbf,
                  renalArteryResistance: st.vitals.renalArteryResistance
              },
              time: st.time
          }, st.activeMeds || [], {
              coRatio: coRatio,
              map: st.vitals.map || 90.0,
              sys: st.vitals.sys || 120.0,
              spo2: st.vitals.spo2 || 98.0,
              paco2: st.vitals.paco2 || 40.0,
              temp: newTemp,
              cvp: cvp,
              surgicalPhase: st.surgicalPhase,
              renalRatio: renalRatio,
              FiO2: deliveredFiO2,
              sevoMac: sevoMac,
              isoMac: isoMac,
              desMac: desMac,
              haloMac: haloMac,
              rng
          });

          if (hepaticOutput.events && hepaticOutput.events.length > 0) {
              hepaticOutput.events.forEach(evt => logEvent(evt));
          }

          // Propagate hepatic values to patient states
          st.patient.creatinine = hepaticOutput.creatinine;
          st.patient.varicealBleedingActive = hepaticOutput.varicealBleedingActive;
          st.patient.varicealBleedTime = hepaticOutput.varicealBleedTime;
          st.patient.hasPoPHCollapse = hepaticOutput.hasPoPHCollapse;
          st.patient.activeHepaticBleedRate = hepaticOutput.activeBleedRate;
          st.patient.childPughScore = hepaticOutput.childPughScore;
          st.patient.childPughClass = hepaticOutput.childPughClass;
          st.patient.meldScore = hepaticOutput.meldScore;
          st.patient.hpsShunt = hepaticOutput.hpsShunt;
          st.patient.varicealBleedRolled = hepaticOutput.varicealBleedRolled;
          st.patient.poPHCollapseRolled = hepaticOutput.poPHCollapseRolled;
          st.patient.operativeMortality = hepaticOutput.operativeMortality;
          st.patient.encephalopathyDescription = hepaticOutput.encephalopathyDescription;

          patientAfterFluidics.creatinine = hepaticOutput.creatinine;
          patientAfterFluidics.varicealBleedingActive = hepaticOutput.varicealBleedingActive;
          patientAfterFluidics.varicealBleedTime = hepaticOutput.varicealBleedTime;
          patientAfterFluidics.hasPoPHCollapse = hepaticOutput.hasPoPHCollapse;
          patientAfterFluidics.activeHepaticBleedRate = hepaticOutput.activeBleedRate;
          patientAfterFluidics.childPughScore = hepaticOutput.childPughScore;
          patientAfterFluidics.childPughClass = hepaticOutput.childPughClass;
          patientAfterFluidics.meldScore = hepaticOutput.meldScore;
          patientAfterFluidics.hpsShunt = hepaticOutput.hpsShunt;
          patientAfterFluidics.varicealBleedRolled = hepaticOutput.varicealBleedRolled;
          patientAfterFluidics.poPHCollapseRolled = hepaticOutput.poPHCollapseRolled;
          patientAfterFluidics.operativeMortality = hepaticOutput.operativeMortality;
          patientAfterFluidics.encephalopathyDescription = hepaticOutput.encephalopathyDescription;

          // Renal Engine Tick
          const netFluidBalance = (st.patient.netFluidBalance || 0.0) + fluidicsOutput.intravascularVolumeAdded_mL - (st.patient.urineOutputRate || 70.0) * (1.0 / 3600.0);
          
          const isSevoFluorideNephrotoxic = (st.patient.sevoLowFlowTime || 0) > 600;
          const finalHasFluorideNephrotoxicity = !!(st.patient.hasFluorideNephrotoxicity || isSevoFluorideNephrotoxic);
          const hasMismatchedTransfusion = st.patient.hasTransfusionReaction || false;
          const hasRhabdomyolysis = !!(st.patient.suxUpregulatedPotassiumLeakActive || (st.patient.ckLevel && st.patient.ckLevel > 5000));
          const hasContrastNephropathy = st.patient.contrastAdministered || false;

          const renalOutput = RenalEngine.tick(1, {
              patient: st.patient,
              vitals: {
                  gfr: st.vitals.gfr,
                  rbf: st.vitals.rbf,
                  bun: st.vitals.bun,
                  creatinine: st.patient.creatinine, // Use the post-hepatic creatinine value
                  urineOutput: st.vitals.urineOutput,
                  urineOutputRate: st.vitals.urineOutputRate,
                  urineOsmolality: st.vitals.urineOsmolality,
                  feNa: st.vitals.feNa,
                  akiStage: st.vitals.akiStage,
                  akiDamage: st.vitals.akiDamage,
                  uopOliguriaTimer: st.vitals.uopOliguriaTimer,
                  uopAnuriaTimer: st.vitals.uopAnuriaTimer,
                  vasopressinLevel: st.vitals.vasopressinLevel,
                  aldosteroneLevel: st.vitals.aldosteroneLevel,
                  osm: st.vitals.osm,
                  spo2: st.vitals.spo2 || 98.0,
                  mapUnder60Time: st.vitals.mapUnder60Time,
                  mapUnder55Time: st.vitals.mapUnder55Time,
                  mapUnder60AlertTriggered: st.vitals.mapUnder60AlertTriggered,
                  mapUnder55AlertTriggered: st.vitals.mapUnder55AlertTriggered
              },
              time: st.time,
              electrolytes: st.electrolytes
          }, st.activeMeds || [], {
              coRatio: coRatio,
              map: st.vitals.map || 90.0,
              sys: st.vitals.sys || 120.0,
              cvp: cvp,
              peep: peepValCvp,
              rng,
              temp: newTemp,
              currentMac: currentMac,
              C_cat: painOutput.C_cat || 0.0,
              ebl: safeEblForCvp,
              ebv: safeEbvForCvp,
              netFluidBalance: netFluidBalance,
              hasFluorideNephrotoxicity: finalHasFluorideNephrotoxicity,
              hasMismatchedTransfusion,
              hasRhabdomyolysis,
              hasContrastNephropathy
          });

          if (renalOutput.events && renalOutput.events.length > 0) {
              renalOutput.events.forEach(evt => logEvent(evt));
          }

          // Propagate renal values to patient and vitals state
          st.patient.gfr = renalOutput.gfr;
          st.patient.rbf = renalOutput.rbf;
          st.patient.bun = renalOutput.bun;
          st.patient.creatinine = renalOutput.creatinine;
          st.patient.urineOutput = renalOutput.urineOutput;
          st.patient.urineOutputRate = renalOutput.urineOutputRate;
          st.patient.urineOsmolality = renalOutput.urineOsmolality;
          st.patient.feNa = renalOutput.feNa;
          st.patient.akiStage = renalOutput.akiStage;
          st.patient.akiDamage = renalOutput.akiDamage;
          st.patient.uopOliguriaTimer = renalOutput.uopOliguriaTimer;
          st.patient.uopAnuriaTimer = renalOutput.uopAnuriaTimer;
          st.patient.vasopressinLevel = renalOutput.vasopressinLevel;
          st.patient.aldosteroneLevel = renalOutput.aldosteroneLevel;
          st.patient.angiotensinIILevel = renalOutput.angiotensinIILevel;
          st.patient.osm = renalOutput.osm;
          st.patient.hasAki = renalOutput.hasAki;
          st.patient.hasPrerenalOliguria = renalOutput.hasPrerenalOliguria;
          st.patient.hasFluidOverloadEdema = renalOutput.hasFluidOverloadEdema;
          st.patient.netFluidBalance = netFluidBalance;
          st.patient.fluidOverloadEdemaRolled = renalOutput.fluidOverloadEdemaRolled;
          st.patient.fluidOverloadEdemaLogged = renalOutput.fluidOverloadEdemaLogged;
          st.patient.fluidOverloadNoteLogged = renalOutput.fluidOverloadNoteLogged;
          st.patient.mapUnder60Time = renalOutput.mapUnder60Time;
          st.patient.mapUnder55Time = renalOutput.mapUnder55Time;
          st.patient.mapUnder60AlertTriggered = renalOutput.mapUnder60AlertTriggered;
          st.patient.mapUnder55AlertTriggered = renalOutput.mapUnder55AlertTriggered;
          st.patient.cortexRbf = renalOutput.cortexRbf;
          st.patient.medullaRbf = renalOutput.medullaRbf;
          st.patient.cortexPo2 = renalOutput.cortexPo2;
          st.patient.medullaPo2 = renalOutput.medullaPo2;
          st.patient.cortexO2Extraction = renalOutput.cortexO2Extraction;
          st.patient.medullaO2Extraction = renalOutput.medullaO2Extraction;
          st.patient.glomerularCapillaryPressure = renalOutput.glomerularCapillaryPressure;
          st.patient.bowmanSpacePressure = renalOutput.bowmanSpacePressure;
          st.patient.glomerularOncoticPressure = renalOutput.glomerularOncoticPressure;
          st.patient.netFiltrationPressure = renalOutput.netFiltrationPressure;
          st.patient.bladderVolume = renalOutput.bladderVolume;
          st.patient.urinaryRetentionActive = renalOutput.urinaryRetentionActive;
          st.patient.bladderPressure = renalOutput.bladderPressure;
          st.patient.overflowLeakActive = renalOutput.overflowLeakActive;
          st.patient.distensionSympatheticIndex = renalOutput.distensionSympatheticIndex;
          st.patient.autonomicDysreflexiaActive = renalOutput.autonomicDysreflexiaActive;
          st.patient.autonomicDysreflexiaSeverity = renalOutput.autonomicDysreflexiaSeverity;

          patientAfterFluidics.gfr = renalOutput.gfr;
          patientAfterFluidics.rbf = renalOutput.rbf;
          patientAfterFluidics.bun = renalOutput.bun;
          patientAfterFluidics.creatinine = renalOutput.creatinine;
          patientAfterFluidics.urineOutput = renalOutput.urineOutput;
          patientAfterFluidics.urineOutputRate = renalOutput.urineOutputRate;
          patientAfterFluidics.urineOsmolality = renalOutput.urineOsmolality;
          patientAfterFluidics.feNa = renalOutput.feNa;
          patientAfterFluidics.akiStage = renalOutput.akiStage;
          patientAfterFluidics.akiDamage = renalOutput.akiDamage;
          patientAfterFluidics.uopOliguriaTimer = renalOutput.uopOliguriaTimer;
          patientAfterFluidics.uopAnuriaTimer = renalOutput.uopAnuriaTimer;
          patientAfterFluidics.vasopressinLevel = renalOutput.vasopressinLevel;
          patientAfterFluidics.aldosteroneLevel = renalOutput.aldosteroneLevel;
          patientAfterFluidics.angiotensinIILevel = renalOutput.angiotensinIILevel;
          patientAfterFluidics.osm = renalOutput.osm;
          patientAfterFluidics.hasAki = renalOutput.hasAki;
          patientAfterFluidics.hasPrerenalOliguria = renalOutput.hasPrerenalOliguria;
          patientAfterFluidics.hasFluidOverloadEdema = renalOutput.hasFluidOverloadEdema;
          patientAfterFluidics.netFluidBalance = netFluidBalance;
          patientAfterFluidics.fluidOverloadEdemaRolled = renalOutput.fluidOverloadEdemaRolled;
          patientAfterFluidics.fluidOverloadEdemaLogged = renalOutput.fluidOverloadEdemaLogged;
          patientAfterFluidics.fluidOverloadNoteLogged = renalOutput.fluidOverloadNoteLogged;
          patientAfterFluidics.mapUnder60Time = renalOutput.mapUnder60Time;
          patientAfterFluidics.mapUnder55Time = renalOutput.mapUnder55Time;
          patientAfterFluidics.mapUnder60AlertTriggered = renalOutput.mapUnder60AlertTriggered;
          patientAfterFluidics.mapUnder55AlertTriggered = renalOutput.mapUnder55AlertTriggered;
          patientAfterFluidics.cortexRbf = renalOutput.cortexRbf;
          patientAfterFluidics.medullaRbf = renalOutput.medullaRbf;
          patientAfterFluidics.cortexPo2 = renalOutput.cortexPo2;
          patientAfterFluidics.medullaPo2 = renalOutput.medullaPo2;
          patientAfterFluidics.cortexO2Extraction = renalOutput.cortexO2Extraction;
          patientAfterFluidics.medullaO2Extraction = renalOutput.medullaO2Extraction;
          patientAfterFluidics.glomerularCapillaryPressure = renalOutput.glomerularCapillaryPressure;
          patientAfterFluidics.bowmanSpacePressure = renalOutput.bowmanSpacePressure;
          patientAfterFluidics.glomerularOncoticPressure = renalOutput.glomerularOncoticPressure;
          patientAfterFluidics.netFiltrationPressure = renalOutput.netFiltrationPressure;
          patientAfterFluidics.bladderVolume = renalOutput.bladderVolume;
          patientAfterFluidics.urinaryRetentionActive = renalOutput.urinaryRetentionActive;
          patientAfterFluidics.bladderPressure = renalOutput.bladderPressure;
          patientAfterFluidics.overflowLeakActive = renalOutput.overflowLeakActive;
          patientAfterFluidics.distensionSympatheticIndex = renalOutput.distensionSympatheticIndex;
          patientAfterFluidics.autonomicDysreflexiaActive = renalOutput.autonomicDysreflexiaActive;
          patientAfterFluidics.autonomicDysreflexiaSeverity = renalOutput.autonomicDysreflexiaSeverity;

          // Lymphatic System / Interstitial Fluid Balance Engine (Phase 1, Stage B/C of
          // mutable-roaming-newell.md) -- runs after Renal (shares the same `cvp` this
          // tick) and before Cardiovascular, which reads `thirdSpacedVolumeMl` to reduce
          // effective circulating blood volume by whatever has accumulated as edema.
          const lymphaticOutput = LymphaticSystemModel.tick(1, {
              patient: st.patient,
              vitals: { cvp: cvp },
              time: st.time
          });
          if (lymphaticOutput.events && lymphaticOutput.events.length > 0) {
              lymphaticOutput.events.forEach(evt => logEvent(evt));
          }
          st.patient.interstitialVolumeMl = lymphaticOutput.interstitialVolumeMl;
          st.patient.thirdSpacedVolumeMl = lymphaticOutput.thirdSpacedVolumeMl;
          st.patient.edemaSeverity = lymphaticOutput.edemaSeverity;
          if (lymphaticOutput.edemaSeverity === 'severe' && lymphaticOutput.thirdSpacedVolumeMl > 4000) {
              st.patient.severeEdemaLogged = true;
          }
          patientAfterFluidics.interstitialVolumeMl = lymphaticOutput.interstitialVolumeMl;
          patientAfterFluidics.thirdSpacedVolumeMl = lymphaticOutput.thirdSpacedVolumeMl;
          patientAfterFluidics.edemaSeverity = lymphaticOutput.edemaSeverity;

          // Gastric Aspiration triggers
          let hasAspirated = st.patient.hasAspirated || giOutput.hasAspirated || false;
          let aspirationCompliancePenalty = 0;
          let aspirationResistancePenalty = 0;
          
          if (!st.patient.airwaySecured && st.patient.stomach === 'full') {
              if (isVentilatingPPV && !hasAspirated) {
                  hasAspirated = true;
                  logEvent(`🚨 CRITICAL EMERGENCY: Positive Pressure Ventilation delivered on a full stomach without a secured airway! Mass aspiration of acidic gastric contents occurred, causing chemical pneumonitis and severe bronchospasm!`);
              }
          }

          if (hasAspirated) {
              // Severity grading (Phase 4): Mendelson's syndrome criteria (pH<2.5 AND volume>25mL
              // predict severe chemical pneumonitis) replace a single flat penalty. GI engine's own
              // trigger freezes severity into st.patient.aspirationEventSeverity above; this legacy
              // secondary trigger (PPV-on-full-stomach, no sux fasciculation required) can fire the
              // hasAspirated transition without that freeze ever having run, so it falls back to the
              // current live severity index here, on first occurrence only.
              if (!st.patient.aspirationEventSeverity) {
                  st.patient.aspirationEventSeverity = giOutput.aspirationSeverityIndex || 0;
              }
              const severityMultiplier = 0.4 + 1.0 * st.patient.aspirationEventSeverity;
              let complPenalty = 30 * severityMultiplier;
              let resPenalty = 25 * severityMultiplier;
              if (st.patient.isSuctioned && st.patient.position === 'Trendelenburg') {
                  complPenalty = 10 * severityMultiplier;
                  resPenalty = 8 * severityMultiplier;
                  if (!st.patient.aspirationMitigated) {
                      logEvent(`✅ SUCCESS: Airway suctioned in Trendelenburg position! Acidic aspirate cleared, reducing bronchospastic and compliance penalties.`);
                      st.patient.aspirationMitigated = true;
                  }
              }
              aspirationCompliancePenalty = complPenalty;
              aspirationResistancePenalty = resPenalty;
          }

          // 4. RespiratoryEngine Tick
          const safePaCO2 = st.vitals.paco2 || 40;
          const safePaO2 = st.vitals.pao2 || 100;
          const safeSys = st.vitals.sys || 120;

          // HVR and HCVR Blunting
          let hvrBlunting = 0.0;
          if (activeAgent === 'desflurane' || activeAgent === 'xenon') {
              if (agentMac > 0.1) {
                  hvrBlunting = Math.min(1.0, (agentMac - 0.1) / 1.0);
              }
          } else if (activeAgent) { // sevoflurane, isoflurane, halothane, methoxyflurane
              if (agentMac <= 0.1) {
                  hvrBlunting = (agentMac / 0.1) * 0.7;
              } else {
                  hvrBlunting = Math.min(1.0, 0.7 + (agentMac - 0.1) * 0.3);
              }
          }

          let hcvrBlunting = 0.0;
          if (activeAgent && activeAgent !== 'xenon') {
              hcvrBlunting = Math.min(1.0, agentMac * 0.6);
          }

          // F10 fix: opioids potently blunt BOTH the hypoxic (HVR) and hypercapnic (HCVR) ventilatory
          // responses — the core mechanism of opioid respiratory depression. Previously only volatile
          // agentMac blunted these, so a high opioid load plus hypoxia produced a PARADOXICAL
          // compensatory tachypnea instead of the expected sustained depression/apnea. Fold the opioid
          // effect into both blunting factors so the chemoreceptor drive is suppressed under opioids.
          const opioidVentBlunt = Math.min(0.95, Math.max(0, opioidEff) * 0.7);
          hvrBlunting = Math.min(1.0, hvrBlunting + opioidVentBlunt);
          hcvrBlunting = Math.min(1.0, hcvrBlunting + opioidVentBlunt);

          let compensatoryRR = 0;
          if (safePaCO2 > 45) {
              compensatoryRR += Math.max(0, (safePaCO2 - 45) * 0.8 * (1.0 - hcvrBlunting));
          }
          if (safePaO2 < 70) {
              compensatoryRR += Math.max(0, (70 - safePaO2) * 0.4 * (1.0 - hvrBlunting));
          }
          if (safeSys < 90) compensatoryRR += 6; 

          // === SPECIAL SURGERY PHYSIOLOGY ===
          {
            const suxForIOP = (st.activeMeds || []).find(m => m.name === 'Succinylcholine');
            const ssOut = SpecialSurgeryPhysiology.tick({
              position: st.patient.position,
              durationMinutes: st.surgicalPhase === 'Pre-Op' ? 0 : (st.time / 60),
              headDownAngleDegrees: st.patient.headDownAngleDegrees || 0,
              adequateEyePads: st.patient.adequateEyePads !== false,
              tourniquetActive: !!st.patient.tourniquetActive,
              tourniquetDurationMinutes: st.patient.tourniquetActive && st.patient.tourniquetStartTime
                ? (st.time - st.patient.tourniquetStartTime) / 60 : 0,
              laserActive: !!st.patient.laserActive,
              currentFiO2: deliveredFiO2,
              n2oActive: currentEtN2O > 30,
              laserResistantETT: !!st.patient.laserResistantETT,
              openGlobeInjury: !!st.patient.openGlobeInjury,
              currentMAP: st.vitals.map,
              succinylcholineCe: suxForIOP ? suxForIOP.Ce : 0,
              currentVolatileMac: agentMac,
              iapMmHg: st.patient.iapMmHg || 0,
              prevEyePressureLogged: !!st.patient.prevEyePressureLogged,
              prevFacialEdemaLogged: !!st.patient.prevFacialEdemaLogged,
              prevTourniquetPainLogged: !!st.patient.prevTourniquetPainLogged,
              prevFireRiskLogged: !!st.patient.prevFireRiskLogged,
              prevIopLogged: !!st.patient.prevIopLogged,
            });
            ssOut.events.forEach(e => logEvent(e));
            st.patient.prevEyePressureLogged = ssOut.prevEyePressureLogged;
            st.patient.prevFacialEdemaLogged = ssOut.prevFacialEdemaLogged;
            st.patient.prevTourniquetPainLogged = ssOut.prevTourniquetPainLogged;
            st.patient.prevFireRiskLogged = ssOut.prevFireRiskLogged;
            st.patient.prevIopLogged = ssOut.prevIopLogged;
            st.patient.iopEstimate = ssOut.iopEstimate;
            // Tourniquet pain contributes to sympathetic drive (HR + SVR)
            if (ssOut.tourniquetPainIndex > 0) {
              totalHrDelta += ssOut.tourniquetHRContribution;
              drugSvrMod *= (1 + ssOut.tourniquetSVRContribution);
            }
            // Steep Trendelenburg ICP contribution
            if (ssOut.icpContribution > 0) {
              st.patient.specialSurgeryIcpContrib = ssOut.icpContribution;
            } else {
              st.patient.specialSurgeryIcpContrib = 0;
            }
          }

          // Phase 5, Stage 1: AcidBaseModel.ts (Stewart SID) replaces the prior flat
          // `hco3 = 24 - baseDeficit` formula with real strong-ion-difference physics.
          // FluidicsEngine's tracked electrolytes.cl/na/ca/buf are the key inputs -- this
          // is what makes NS vs. LR vs. PlasmaLyte mechanistically distinct for the first time.
          // F13 fix: administered IV sodium bicarbonate is tracked as a med (Ce) but never fed the
          // acid-base model's buffer input, so it didn't alkalinize. Translate its Ce into a buffered
          // bicarbonate load (~2.5 mEq per unit Ce; 100 mEq -> Ce ~1.9 -> +~4.8 -> ~+3-4 base excess).
          const bicarbModelForAB = st.activeMeds?.find(m => m.name === 'Sodium Bicarbonate');
          const bicarbBufferEq = bicarbModelForAB ? bicarbModelForAB.Ce * 2.5 : 0;
          const acidBaseOutput = AcidBaseModel.tick({
              sodiumMeqL: fluidicsOutput.electrolytes.na,
              chlorideMeqL: fluidicsOutput.electrolytes.cl,
              lactateMmolL: currentLactate,
              albuminGdL: st.patient.albumin,
              paco2MmHg: st.vitals.paco2 || 40,
              bufferedBicarbEq: (fluidicsOutput.electrolytes.buf || 0) + bicarbBufferEq,
              isSeptic: !!st.patient.isSeptic,
              bloodLossRatio,
              akiDamage: st.patient.akiDamage || 0,
              prevHypochloremiaLogged: !!st.patient.hyperchloremicAcidosisLogged,
              prevCitratHypocalcemiaLogged: !!st.patient.citrateHypocalcemiaLogged,
              ionizedCalciumMmolL: fluidicsOutput.electrolytes.ca
          });
          if (acidBaseOutput.events && acidBaseOutput.events.length > 0) {
              acidBaseOutput.events.forEach(evt => logEvent(evt));
          }
          st.patient.hyperchloremicAcidosisLogged = acidBaseOutput.prevHypochloremiaLogged;
          st.patient.citrateHypocalcemiaLogged = acidBaseOutput.prevCitratHypocalcemiaLogged;
          st.patient.anionGap = acidBaseOutput.anionGap;
          st.patient.correctedAnionGap = acidBaseOutput.correctedAg;
          st.patient.baseExcess = acidBaseOutput.baseExcess;
          st.patient.ionizedCalcium = acidBaseOutput.ionizedCalciumMmolL;
          const hco3 = acidBaseOutput.computedHco3;
          const baselinePaCO2 = st.patient.copd ? 55 : (st.patient.isObese ? 48 : (st.patient.isPregnant ? pregnancyOutput.baselinePaCO2Target : Math.max(35, 40 + (sexHormoneOutput.basePaCO2Adjustment || 0))));

          const respOutput = RespiratoryEngine.tick(1, {
              patient: {
                  ...patientAfterFluidics,
                  isApneic: st.patient.isApneic,
                  isParalyzed: st.patient.isParalyzed,
                  swallowingActive: !!st.patient.swallowingActive
              },
              vitals: {
                  ...st.vitals,
                  temp: newTemp,
                  bowelGasVolume: giOutput.bowelGasVolume,
                  n2oUptakeRate: st.vitals.n2oUptakeRate || 0
              },
              time: st.time
          }, activeVentSettings, deliveredFiO2, {
              maxNMJOccupancy,
              totalRrDelta,
              ruleRrScale,
              ruleRrOffset: ruleRrOffset + painOutput.rrSpike,
              ruleComplScale: ruleComplScale * painOutput.somaticResponse.complianceMultiplier,
              rulePipOffset: rulePipOffset + painOutput.somaticResponse.pipOffset,
              ruleSpo2Offset,
              ruleKOffset
          }, {
              VO2_sec,
              totalMetabolicMultiplier,
              compensatoryRR,
              opioidRRDrop,
              m6gRrDelta,
              shiveringRRDrive: (shiveringMultiplier > 1.5) ? (shiveringMultiplier * 4) : 0,
              currentHb,
              targetMAP: st.vitals.map,
              targetCO: currentCOForPK,
              hco3,
              volatileRightShift: currentMac * 0.05,
              dpgDepletionShift: Math.min(0.15, ((st.intravascularVolume + fluidicsOutput.intravascularVolumeAdded_mL) / 5000) * 0.1),
              baselinePaCO2,
              anaphylaxisCompliancePenalty,
              anaphylaxisResistancePenalty,
              aspirationCompliancePenalty,
              aspirationResistancePenalty,
              hpsShunt: st.patient.hpsShunt || 0.0,
              fluidOverloadCompliancePenalty: st.patient.hasFluidOverloadEdema ? 25 : 0,
              pregnancyFrcMultiplier: pregnancyOutput.frcMultiplier,
              agent: activeGasSettings?.agent,
              etAgent: currentEtAgent,
              currentMac: currentMac,
              isMucusPlugged: st.patient.isMucusPlugged,
              bronchialSmoothMuscleCa: st.patient.bronchialSmoothMuscleCa,
              intercostalContribution: st.patient.intercostalContribution,
              airwayObstructionIndex: st.patient.airwayObstructionIndex,
              hpvInhibition: st.patient.hpvInhibition,
              fgf_L_min: freshGasFlow
          });

          // Calculate safePh early for LAST protein binding check and CV acidosis blunting
          const safePh = Math.max(6.5, Math.min(7.8, 6.1 + Math.log10((acidBaseOutput.computedHco3 / Math.max(1e-9, 0.0307 * (respOutput.newPaCO2 || 40))))));

          // Apply LAST CV consequences to drugSvrMod / drugInotropyMod before CV engine tick.
          // (using the early-computed lastOutput from the top of the tick loop)

          // Apply LAST CV consequences to drugSvrMod / drugInotropyMod before CV engine tick.
          if (lastOutput.cvToxicityActive) {
              drugSvrMod *= (1 + lastOutput.svrModFromLast);
              drugInotropyMod *= (1 + lastOutput.inotropyModFromLast);
          }

          // Apply PH RV inotropy penalty (RV failure reduces effective pump output)
          if (st.patient.phRvInotropyPenalty && st.patient.phRvInotropyPenalty > 0) {
              drugInotropyMod *= (1.0 - st.patient.phRvInotropyPenalty);
          }

          // F11 fix: alpha-2 agonists (dexmedetomidine, clonidine) cause central sympatholytic
          // bradycardia, and labetalol's beta-blockade lowers HR — all three are antihypertensives, so
          // without a direct HR effect they lower BP and the baroreflex produces PARADOXICAL reflex
          // tachycardia. Add a direct bradycardic contribution strong enough to dominate that reflex.
          const dexmedForBrady = (st.activeMeds || []).find(m => m.name === 'Dexmedetomidine');
          const clonidineForBrady = (st.activeMeds || []).find(m => m.name === 'Clonidine');
          const labetalolForBrady = (st.activeMeds || []).find(m => m.name === 'Labetalol');
          const alpha2BradyIndex = Math.min(1.0, (dexmedForBrady ? dexmedForBrady.Ce : 0) * 200 + (clonidineForBrady ? clonidineForBrady.Ce : 0) * 700);
          const labetalolBradyIndex = Math.min(1.0, (labetalolForBrady ? labetalolForBrady.Ce : 0) * 5.0);
          totalHrDelta -= 26 * alpha2BradyIndex;   // alpha-2 central sympatholytic bradycardia
          totalHrDelta -= 34 * labetalolBradyIndex; // labetalol beta-1 blockade must dominate the reflex from its larger BP drop

          // F17/F18/F19: other rate-control drugs had no HR wiring. Non-dihydropyridine CCBs (diltiazem,
          // verapamil) slow AV conduction -> bradycardia (must dominate the reflex from their
          // vasodilation); amiodarone slows the rate; glucagon is a positive chronotrope (β-independent).
          const diltiazemForHr = (st.activeMeds || []).find(m => m.name === 'Diltiazem');
          const verapamilForHr = (st.activeMeds || []).find(m => m.name === 'Verapamil');
          const amiodaroneForHr = (st.activeMeds || []).find(m => m.name === 'Amiodarone');
          const glucagonForHr = (st.activeMeds || []).find(m => m.name === 'Glucagon');
          const ccbBradyIndex = Math.min(1.0, (diltiazemForHr ? diltiazemForHr.Ce : 0) * 5.0 + (verapamilForHr ? verapamilForHr.Ce : 0) * 40.0);
          totalHrDelta -= 24 * ccbBradyIndex;
          totalHrDelta -= 14 * Math.min(1.0, (amiodaroneForHr ? amiodaroneForHr.Ce : 0) * 7.0);
          totalHrDelta += 18 * Math.min(1.0, (glucagonForHr ? glucagonForHr.Ce : 0) * 20.0);

          // 5. CardiovascularEngine Tick
          const cvOutput = CardiovascularEngine.tick(1, {
              patient: {
                  ...patientAfterFluidics,
                  intravascularVolume: safeIntravascularVolume + safeAdded,
                  hasAspirated,
                  anaphylaxisTriggered,
                  anaphylaxisTreated: st.patient.anaphylaxisTreated,
                  myocardialStunning: st.patient.myocardialStunning || 0,
                  vec3oh: currentVec3oh,
                  normep: currentNormep,
                  m6g: currentM6g,
                  cyanide: currentCyanide,
                  lacticAcid: currentLactate,
                  temp: newTemp
              },
              vitals: {
                  ...respOutput.vitals,
                  ph: safePh,
                  co: st.vitals.co || 5.0,
                  svr: st.vitals.svr || 1200
              },
              electrolytes: fluidicsOutput.electrolytes,
              time: st.time
          }, {
              drugSvrMod,
              drugInotropyMod,
              svrSympatheticSpike,
              contractilitySympatheticSpike,
              hrSympatheticSpike,
              shiveringHRDrive: (shiveringMultiplier > 1.0) ? ((shiveringMultiplier - 1.0) * 15) : 0,
              anaphylaxisHrMod,
              anaphylaxisSvrMod,
              totalHrDelta,
              ruleHrScale,
              ruleHrOffset: ruleHrOffset,
              ruleHrClamp,
              ruleMapScale,
              ruleMapOffset: ruleMapOffset,
              ruleKOffset,
              ruleSpo2Offset,
              catecholamineSensitivityMultiplier,
              alpha1ActivityIndex: totalAlpha1ActivityIndex,
              beta2ActivityIndex: totalBeta2ActivityIndex,
              vasomotorSvrContribution: brainstemOutput.vasomotorSvrContribution + maoiSVRSpikeContribution,
              pregnancySvrMultiplier: pregnancyOutput.svrMultiplier
          }, {
              rng,
              currentMac,
              bloodLossRatio,
              currentEbl,
              positionPreloadMod,
              positionHydrostaticMod,
              shiveringMultiplier,
              seizureMetabolicMultiplier,
              cyanideVO2Mod,
              VO2_sec,
              currentBuffer: respOutput.oxygenBuffer,
              currentFRC_L: respOutput.lungVolumes.frc_L,
              newTemp,
              newPaCO2: respOutput.newPaCO2,
              activeMeds: st.activeMeds || [],
              getAnatomicalParameter,
              currentHb,
              vasopressinLevel: renalOutput.vasopressinLevel,
              angiotensinIILevel: renalOutput.angiotensinIILevel,
              lastCvSeverity: lastOutput.cvToxicitySeverity,
              lastCvToxicityActive: lastOutput.cvToxicityActive
          });

          // Log CV events
          if (cvOutput.events && cvOutput.events.length > 0) {
              cvOutput.events.forEach(evt => logEvent(evt));
          }

          // 6. Post-Tick calculations
          const finalPatient = {
              ...patientAfterFluidics,
              ...cvOutput.patient,
              rng: st.patient.rng, // Layer 1A: pin advanced RNG state so it survives the React flush.
              oxygenBuffer: respOutput.oxygenBuffer,
              isApneic: respOutput.isApneic,
              isParalyzed: respOutput.isParalyzed,
              lungVolumes: respOutput.lungVolumes,
              ventilationStatus: (st.patient.airwaySecured && activeVentSettings && activeVentSettings.mode !== 'spontaneous')
                  ? 'mechanical'
                  : st.patient.ventilationStatus,
              isSeizure: isSeizure,
              hasRegurgitated: giOutput.hasRegurgitated || st.patient.hasRegurgitated || false,
              hasAspirated: hasAspirated,
              celiacBlockActive: !!st.patient.celiacBlockActive,
              epiduralBlockActive: !!st.patient.epiduralBlockActive,
              swallowingActive: !!st.patient.swallowingActive,
              manipulationIndex: typeof st.patient.manipulationIndex === 'number' ? st.patient.manipulationIndex : 0.0,
              
              // Hepatic states
              cirrhosisFactor: st.patient.cirrhosisFactor,
              bilirubin: st.patient.bilirubin,
              inr: st.patient.inr,
              creatinine: st.patient.creatinine,
              albumin: st.patient.albumin,
              encephalopathyGrade: st.patient.encephalopathyGrade,
              ascitesDegree: st.patient.ascitesDegree,
              varicealBleedingActive: st.patient.varicealBleedingActive,
              varicealBleedTime: st.patient.varicealBleedTime,
              hasPoPHCollapse: st.patient.hasPoPHCollapse,
              activeHepaticBleedRate: st.patient.activeHepaticBleedRate,
              childPughScore: st.patient.childPughScore,
              childPughClass: st.patient.childPughClass,
              meldScore: st.patient.meldScore,
              hpsShunt: st.patient.hpsShunt,
              hasTIPS: st.patient.hasTIPS,
              operativeMortality: st.patient.operativeMortality,
              encephalopathyDescription: st.patient.encephalopathyDescription,
              
              // Renal microenvironment states
              mapUnder60Time: st.patient.mapUnder60Time,
              mapUnder55Time: st.patient.mapUnder55Time,
              mapUnder60AlertTriggered: st.patient.mapUnder60AlertTriggered,
              mapUnder55AlertTriggered: st.patient.mapUnder55AlertTriggered,
              cortexRbf: st.patient.cortexRbf,
              medullaRbf: st.patient.medullaRbf,
              cortexPo2: st.patient.cortexPo2,
              medullaPo2: st.patient.medullaPo2,
              cortexO2Extraction: st.patient.cortexO2Extraction,
              medullaO2Extraction: st.patient.medullaO2Extraction,
              glomerularCapillaryPressure: st.patient.glomerularCapillaryPressure,
              bowmanSpacePressure: st.patient.bowmanSpacePressure,
              glomerularOncoticPressure: st.patient.glomerularOncoticPressure,
              netFiltrationPressure: st.patient.netFiltrationPressure,
              isO2PipelineCrossover: st.patient.isO2PipelineCrossover,
              isO2CylinderOpen: st.patient.isO2CylinderOpen,
              isO2PipelineDisconnected: st.patient.isO2PipelineDisconnected,
              isOxygenFlushPressed: st.patient.isOxygenFlushPressed,
              breathingCircuitType: st.patient.breathingCircuitType,
              co2AbsorptiveCapacity: st.patient.co2AbsorptiveCapacity,
              stuckExpiratoryValve: st.patient.stuckExpiratoryValve,
              stuckInspiratoryValve: st.patient.stuckInspiratoryValve,
              aplValveSetting: st.patient.aplValveSetting,
              hasPneumothorax: st.patient.hasPneumothorax,
              hasPneumothoraxWarningLogged: st.patient.hasPneumothoraxWarningLogged,
              cortisolLevel: st.patient.cortisolLevel,
              adrenalSuppressionActive: st.patient.adrenalSuppressionActive,
              prisAccumulation: st.patient.prisAccumulation,
              prisTriggered: st.patient.prisTriggered,
              emergenceDeliriumTriggered: st.patient.emergenceDeliriumTriggered,
              barbiturateArterialPrecipitation: st.patient.barbiturateArterialPrecipitation,
              hydroxyMidazolam: st.patient.hydroxyMidazolam || 0,
              norketamine: st.patient.norketamine || 0,
              laudanosine: currentLaudanosine,
              laudanosineSeizureTriggered: st.patient.laudanosineSeizureTriggered || false,
              suxPhase2Accumulation: st.patient.suxPhase2Accumulation || 0,
              cumulativeSuxDose: st.patient.cumulativeSuxDose || 0,
              butyrylcholinesteraseVariant: st.patient.butyrylcholinesteraseVariant || 'normal',
              dibucaineNumber: st.patient.dibucaineNumber || 80,
              chronicBenzoUse: st.patient.chronicBenzoUse,
              opioidRigidityActive: st.patient.opioidRigidityActive,
              remifentanilHyperalgesiaActive: st.patient.remifentanilHyperalgesiaActive,
              remifentanilInfusionDuration: st.patient.remifentanilInfusionDuration,
              sphincterOfOddiSpasmActive: st.patient.sphincterOfOddiSpasmActive,
              opioidPruritusActive: st.patient.opioidPruritusActive,
              renarcotizationActive: st.patient.renarcotizationActive,
              sodiumLevel: st.patient.sodiumLevel,
              whiteBloodCellCount: st.patient.whiteBloodCellCount,
              hasGOSRD: st.patient.hasGOSRD,
              ziconotideHypotensionActive: st.patient.ziconotideHypotensionActive,
              forceCarbamazepineDyscrasia: st.patient.forceCarbamazepineDyscrasia,
              isHyponatremic: st.patient.isHyponatremic,
              carbamazepineDyscrasiaActive: st.patient.carbamazepineDyscrasiaActive,
              urinaryRetentionActive: st.patient.urinaryRetentionActive || false,
              bladderVolume: st.patient.bladderVolume || 0,
              hasFoley: st.patient.hasFoley || false,
              opioidReceptorGenotype: st.patient.opioidReceptorGenotype || 'A118A',
              forceUrinaryRetention: st.patient.forceUrinaryRetention || false,
              naloxoneSurgeTriggered: st.patient.naloxoneSurgeTriggered,
              naloxoneSurgeActive: st.patient.naloxoneSurgeActive,
              naloxoneSurgeTime: st.patient.naloxoneSurgeTime,
              forcePenicillinAnaphylaxis: st.patient.forcePenicillinAnaphylaxis,
              forcePris: st.patient.forcePris,
              forceAdrenalSuppression: st.patient.forceAdrenalSuppression,
              forceEmergenceDelirium: st.patient.forceEmergenceDelirium,
              forceBarbituratePrecipitation: st.patient.forceBarbituratePrecipitation,
              forceBenzoWithdrawalSeizure: st.patient.forceBenzoWithdrawalSeizure,
              forceOpioidRigidity: st.patient.forceOpioidRigidity,
              forceRemifentanilHyperalgesia: st.patient.forceRemifentanilHyperalgesia,
              forceSphincterOfOddiSpasm: st.patient.forceSphincterOfOddiSpasm,
              forceOpioidPruritus: st.patient.forceOpioidPruritus,
              forceNaloxoneSurge: st.patient.forceNaloxoneSurge,
              forceHalothaneHepatitis: st.patient.forceHalothaneHepatitis,
              forceMethoxyfluraneNephrotoxicity: st.patient.forceMethoxyfluraneNephrotoxicity,
              forceAirwayFire: st.patient.forceAirwayFire,
              forceMucusPlug: st.patient.forceMucusPlug,
              forceVaricealBleed: st.patient.forceVaricealBleed,
              forcePoPHCollapse: st.patient.forcePoPHCollapse,
              forceFluidOverloadEdema: st.patient.forceFluidOverloadEdema,
              forceNormepSeizure: st.patient.forceNormepSeizure,
              forceLaudanosineSeizure: st.patient.forceLaudanosineSeizure,
              halothaneHepatitisRolled: st.patient.halothaneHepatitisRolled,
              methoxyfluraneNephrotoxicityRolled: st.patient.methoxyfluraneNephrotoxicityRolled,
              airwayFireRolled: st.patient.airwayFireRolled,
              mucusPlugRolled: st.patient.mucusPlugRolled,
              varicealBleedRolled: st.patient.varicealBleedRolled,
              poPHCollapseRolled: st.patient.poPHCollapseRolled,
              fluidOverloadEdemaRolled: st.patient.fluidOverloadEdemaRolled,
              normepSeizureRolled: st.patient.normepSeizureRolled,
              laudanosineSeizureRolled: st.patient.laudanosineSeizureRolled,
              neostigmineWeakness: st.patient.neostigmineWeakness || false,
              transientBradycardia: st.patient.transientBradycardia || false,
              maxNMJOccupancy: maxNMJOccupancy
          };

          // Phase 6B: Transfusion Immunology (TRALI, HIT, ABO incompatibility).
          // Cumulative blood product volumes estimated from per-tick coags offsets (same
          // method already used in CoagulationCascadeModel wiring for FFP/platelets).
          const prevCoacgsRForTxImm = (st.coags && typeof st.coags.r_offset === 'number') ? st.coags.r_offset : 0;
          const prevCoagsMaForTxImm = (st.coags && typeof st.coags.ma_offset === 'number') ? st.coags.ma_offset : 0;
          const ffpVolMlThisTick = Math.max(0, -(fluidicsOutput.coags.r_offset - prevCoacgsRForTxImm) / 4 * 250);
          const pltVolMlThisTick = Math.max(0, (fluidicsOutput.coags.ma_offset - prevCoagsMaForTxImm) / 15 * 250);
          st.patient.totalFfpMl = (st.patient.totalFfpMl || 0) + ffpVolMlThisTick;
          st.patient.totalPlateletsMl = (st.patient.totalPlateletsMl || 0) + pltVolMlThisTick;
          const heparinModelForTxImm = (st.activeMeds || []).find(m => m.name === 'Heparin');

          const txImmOutput = TransfusionImmunologyModel.tick({
              ffpVolumeReceivedMl: st.patient.totalFfpMl,
              plateletsVolumeReceivedMl: st.patient.totalPlateletsMl,
              existingInflammation: !!(st.patient.isSeptic || st.patient.trauma || st.patient.copd || st.patient.chf),
              prevTraliRisk: st.patient.traliRisk,
              heparinCe: heparinModelForTxImm ? heparinModelForTxImm.Ce : 0,
              heparinExposureDays: st.patient.heparinExposureDays || 0,
              prevPlateletCountK: st.patient.baselinePlateletCount || 250,
              currentPlateletCountK: finalPatient.plateletCount || 250,
              newThrombosisDetected: !!st.patient.newThrombosisDetected,
              prevHitAntibodyScore: st.patient.hitAntibodyScore || 0,
              prevHitLogged: !!st.patient.hitLogged,
              bloodTypeMismatch: !!st.patient.bloodTypeMismatch,
              dt: 1
          });

          if (txImmOutput.events && txImmOutput.events.length > 0) {
              txImmOutput.events.forEach(evt => logEvent(evt));
          }

          if (txImmOutput.hemolysisActive && !st.patient.hemolysisActive) {
              logQualityEvent({
                  category: 'PharmacologicChoice', severity: 'critical',
                  description: 'Complement-mediated intravascular hemolytic transfusion reaction occurred due to ABO-incompatible blood administration.',
                  idealAction: 'Verify recipient and donor identification/blood type matches (Type & Screen / Crossmatch checks) before starting blood product transfusion.',
                  actualAction: 'Administered ABO-incompatible blood products.',
                  impact: 'Severe complement-mediated hemolysis, acute kidney injury, shock, and DIC.',
                  chapterSource: 'Ch31, Miller\'s 9th Ed'
              });
          }
          if (txImmOutput.traliActive && !st.patient.traliActive) {
              logQualityEvent({
                  category: 'CrisisManagement', severity: 'major',
                  description: 'Transfusion-Related Acute Lung Injury (TRALI) developed.',
                  idealAction: 'Minimize transfusion of plasma-containing blood products (especially FFP/platelets) unless strictly indicated, particularly in patients with baseline inflammatory conditions.',
                  actualAction: 'Transfused significant volumes of FFP/platelets to a patient, activating neutrophils and lung injury.',
                  impact: 'Severe hypoxemia and respiratory distress from non-cardiogenic pulmonary edema.',
                  chapterSource: 'Ch31, Miller\'s 9th Ed'
              });
          }
          if (txImmOutput.hitActive && !st.patient.hitActive) {
              logQualityEvent({
                  category: 'CrisisManagement', severity: 'major',
                  description: 'Heparin-Induced Thrombocytopenia (HIT) active with intermediate-to-high 4T score probability.',
                  idealAction: 'Avoid heparin re-exposure in patients with history of HIT or suspicious thrombocytopenia timing, and switch to non-heparin anticoagulants (e.g. argatroban, bivalirudin).',
                  actualAction: 'Heparin exposure continued despite developing HIT antibodies and thrombocytopenia.',
                  impact: 'High risk of paradoxical limb/organ-threatening thromboembolism.',
                  chapterSource: 'Ch31, Miller\'s 9th Ed'
              });
          }

          finalPatient.traliRisk = txImmOutput.traliRisk;
          finalPatient.traliActive = txImmOutput.traliActive;
          finalPatient.hitActive = txImmOutput.hitActive;
          finalPatient.hitProbability = txImmOutput.hitProbability;
          finalPatient.fourTScore = txImmOutput.fourTScore;
          finalPatient.hitAntibodyScore = txImmOutput.hitAntibodyScore;
          finalPatient.heparinExposureDays = txImmOutput.heparinExposureDays;
          finalPatient.hemolysisActive = txImmOutput.hemolysisActive;
          st.patient.traliRisk = txImmOutput.traliRisk;
          st.patient.traliActive = txImmOutput.traliActive;
          st.patient.hitActive = txImmOutput.hitActive;
          st.patient.hitAntibodyScore = txImmOutput.hitAntibodyScore;
          st.patient.heparinExposureDays = txImmOutput.heparinExposureDays;
          st.patient.hitLogged = txImmOutput.prevHitLogged;
          st.patient.hemolysisActive = txImmOutput.hemolysisActive;

          // TRALI compliance/resistance penalties feed into RespiratoryEngine next tick
          // via aspirationCompliancePenalty channel (same additive pattern established)
          if (txImmOutput.traliActive) {
              st.patient.traliCompliancePenalty = txImmOutput.traliCompliance;
              st.patient.traliResistancePenalty = txImmOutput.traliResistance;
          } else {
              st.patient.traliCompliancePenalty = 0;
              st.patient.traliResistancePenalty = 0;
          }

          // Phase 4 genitourinary/reproductive, Stages C/D/E: uterine tone/postpartum
          // hemorrhage, fetal monitoring, and TURP syndrome. Placed after cvOutput/respOutput
          // are available (fetal monitoring needs this tick's final maternal MAP/SpO2) and
          // after finalPatient exists (so EBL/sodium/temperature adjustments land on the
          // object that actually gets returned, not a copy that's about to be overwritten).
          const oxytocinModel = (st.activeMeds || []).find(m => m.name === 'Oxytocin');
          const methylergonovineModel = (st.activeMeds || []).find(m => m.name === 'Methylergonovine');
          const carboprostModel = (st.activeMeds || []).find(m => m.name === 'Carboprost');
          const misoprostolModel = (st.activeMeds || []).find(m => m.name === 'Misoprostol');

          if (st.patient.deliveryOccurred) {
              const uterineToneOutput = UterineToneModel.tick({
                  deliveryOccurred: true,
                  prevUterineTone: st.patient.uterineTone,
                  volatileMac: currentMac,
                  magnesiumCe: magnesiumModel ? magnesiumModel.Ce : 0,
                  oxytocinCe: oxytocinModel ? oxytocinModel.Ce : 0,
                  methylergonovineCe: methylergonovineModel ? methylergonovineModel.Ce : 0,
                  carboprostCe: carboprostModel ? carboprostModel.Ce : 0,
                  misoprostolCe: misoprostolModel ? misoprostolModel.Ce : 0,
                  retainedPlacentaActive: !!st.patient.retainedPlacentaActive,
                  prolongedLaborRisk: !!st.patient.prolongedLaborRisk,
                  chorioamnionitisActive: !!st.patient.chorioamnionitisActive,
                  dt: 1
              });

              finalPatient.uterineTone = uterineToneOutput.uterineTone;
              st.patient.uterineTone = uterineToneOutput.uterineTone;

              // First continuous bleeding-RATE mechanism in this codebase -- follows the
              // existing discrete-increment convention for patient.ebl (e.g. the
              // methoxyflurane-nephrotoxicity dehydration term above) rather than a new pattern.
              const pphMlThisTick = uterineToneOutput.postpartumHemorrhageRateMlPerMin / 60;
              finalPatient.ebl = (st.patient.ebl || 0) + pphMlThisTick;
              st.patient.ebl = finalPatient.ebl;

              const hasHypertensionOrPreeclampsia = !!(st.patient.htn || st.patient.hasPreeclampsia);
              if (methylergonovineModel && methylergonovineModel.Ce > 0.05 && hasHypertensionOrPreeclampsia && !st.patient.methylergonovineContraindicationLogged) {
                  logQualityEvent({
                      category: 'PharmacologicChoice', severity: 'critical',
                      description: 'Methylergonovine administered to a patient with hypertension/preeclampsia.',
                      idealAction: 'Avoid ergot alkaloids in hypertensive/preeclamptic patients; use Oxytocin, Carboprost, or Misoprostol instead.',
                      actualAction: 'Administered Methylergonovine despite hypertension/preeclampsia.',
                      impact: 'Generalized vasoconstriction risks precipitating a hypertensive crisis.',
                  });
                  st.patient.methylergonovineContraindicationLogged = true;
                  finalPatient.methylergonovineContraindicationLogged = true;
              }
              if (carboprostModel && carboprostModel.Ce > 0.03 && st.patient.asthma && !st.patient.carboprostContraindicationLogged) {
                  logQualityEvent({
                      category: 'PharmacologicChoice', severity: 'critical',
                      description: 'Carboprost administered to a patient with asthma.',
                      idealAction: 'Avoid prostaglandin F2-alpha analogs in asthmatic patients; use Oxytocin, Methylergonovine, or Misoprostol instead.',
                      actualAction: 'Administered Carboprost despite a documented asthma history.',
                      impact: 'Prostaglandin-mediated bronchoconstriction risks precipitating severe bronchospasm.',
                  });
                  st.patient.carboprostContraindicationLogged = true;
                  finalPatient.carboprostContraindicationLogged = true;
              }

              if (uterineToneOutput.postpartumHemorrhageRateMlPerMin > 100 && !st.patient.severePphLogged) {
                  logEvent("🚨 CRITICAL EMERGENCY: Uterine atony with massive postpartum hemorrhage! Uterotonic therapy and/or manual exploration for retained products is urgently indicated.");
                  st.patient.severePphLogged = true;
                  finalPatient.severePphLogged = true;
              } else if (uterineToneOutput.postpartumHemorrhageRateMlPerMin <= 100 && st.patient.severePphLogged) {
                  logEvent("✅ CLINICAL UPDATE: Postpartum hemorrhage rate has improved below the massive-hemorrhage threshold.");
                  st.patient.severePphLogged = false;
                  finalPatient.severePphLogged = false;
              }
          }

          const fetalOutput = FetalMonitoringModel.tick({
              isPregnant: !!st.patient.isPregnant,
              deliveryOccurred: !!st.patient.deliveryOccurred,
              maternalMAP: cvOutput.vitals.map,
              maternalSpO2: respOutput.vitals.spo2,
              oxytocinCe: oxytocinModel ? oxytocinModel.Ce : 0,
              opioidEffect: opioidEff,
              dt: 1
          });
          if (st.patient.isPregnant && !st.patient.deliveryOccurred) {
              finalPatient.fetalHR = fetalOutput.fetalHR;
              finalPatient.fetalVariabilityIndex = fetalOutput.variabilityIndex;
              finalPatient.lateDecelerationActive = fetalOutput.lateDecelerationActive;
              finalPatient.fetalBradycardiaActive = fetalOutput.fetalBradycardiaActive;
              finalPatient.fetalBradycardiaSeverity = fetalOutput.fetalBradycardiaSeverity;
              finalPatient.uterineHyperstimulationActive = fetalOutput.uterineHyperstimulationActive;
              st.patient.fetalHR = fetalOutput.fetalHR;

              if (fetalOutput.fetalBradycardiaActive && !st.patient.fetalBradycardiaLogged) {
                  logEvent("🚨 CRITICAL ALERT: Fetal bradycardia detected! Late decelerations suggest uteroplacental insufficiency -- optimize maternal MAP/SpO2 and consider left uterine displacement.");
                  st.patient.fetalBradycardiaLogged = true;
                  finalPatient.fetalBradycardiaLogged = true;
              } else if (!fetalOutput.fetalBradycardiaActive && st.patient.fetalBradycardiaLogged) {
                  logEvent("✅ CLINICAL UPDATE: Fetal heart rate has recovered above the bradycardia threshold.");
                  st.patient.fetalBradycardiaLogged = false;
                  finalPatient.fetalBradycardiaLogged = false;
              }
              if (fetalOutput.uterineHyperstimulationActive && !st.patient.uterineHyperstimulationLogged) {
                  logQualityEvent({
                      category: 'PharmacologicChoice', severity: 'major',
                      description: 'Oxytocin dosed into the uterine hyperstimulation (tachysystole) range prior to delivery.',
                      idealAction: 'Titrate pre-delivery Oxytocin to the lowest effective dose; discontinue/reduce if hyperstimulation occurs.',
                      actualAction: 'Oxytocin effect-site concentration exceeded the hyperstimulation threshold.',
                      impact: 'Reduced inter-contraction recovery window for fetal oxygenation, risking fetal distress.',
                  });
                  st.patient.uterineHyperstimulationLogged = true;
                  finalPatient.uterineHyperstimulationLogged = true;
              } else if (!fetalOutput.uterineHyperstimulationActive && st.patient.uterineHyperstimulationLogged) {
                  st.patient.uterineHyperstimulationLogged = false;
                  finalPatient.uterineHyperstimulationLogged = false;
              }
          }

          const turpOutput = TurpSyndromeModel.tick({
              turpSurgeryActive: !!st.patient.turpSurgeryActive,
              resectionSeverity: st.patient.turpResectionSeverity,
              dt: 1
          });
          if (st.patient.turpSurgeryActive) {
              const safeSodiumForTurp = typeof finalPatient.sodiumLevel === 'number' && Number.isFinite(finalPatient.sodiumLevel) ? finalPatient.sodiumLevel : 140.0;
              finalPatient.sodiumLevel = Math.max(100.0, safeSodiumForTurp - turpOutput.sodiumDropRateMEqPerMin / 60);
              st.patient.sodiumLevel = finalPatient.sodiumLevel;
              finalPatient.ebl = (finalPatient.ebl !== undefined ? finalPatient.ebl : (st.patient.ebl || 0));
              finalPatient.intravascularVolume = (typeof finalPatient.intravascularVolume === 'number' ? finalPatient.intravascularVolume : (st.patient.intravascularVolume || 0)) + turpOutput.irrigationAbsorptionRateMlPerMin / 60;
              st.patient.intravascularVolume = finalPatient.intravascularVolume;
              finalPatient.temp = (typeof finalPatient.temp === 'number' ? finalPatient.temp : newTemp) - turpOutput.temperatureDropRateCPerMin / 60;
              st.patient.temp = finalPatient.temp;

              if (finalPatient.sodiumLevel < 125.0 && !st.patient.isHyponatremic) {
                  logEvent("🚨 CRITICAL EMERGENCY: TURP syndrome -- severe dilutional hyponatremia from irrigation fluid absorption! Stop the procedure, restrict free water, consider hypertonic saline.");
                  finalPatient.isHyponatremic = true;
                  st.patient.isHyponatremic = true;
              }
          }

          // Phase 4 Musculoskeletal: MusculoskeletalModel.ts. Rhabdomyolysis (CK/myoglobin),
          // positioning nerve injury risk, and compartment syndrome (lithotomy).
          {
              const suxModelForMsk = (st.activeMeds || []).find(m => m.name === 'Succinylcholine');
              const succinylcholineInMyopathy = !!(suxModelForMsk && suxModelForMsk.Ce > 0.05 && (st.patient.dmd || st.patient.bmd));
              const mskOut = MusculoskeletalModel.tick({
                  prevCkLevelUPerL: st.patient.ckLevel,
                  prevMyoglobinUgL: st.patient.myoglobinLevel,
                  prevNerveInjuryRiskIndex: st.patient.nerveInjuryRiskIndex,
                  prevCompartmentSyndromeRisk: st.patient.compartmentSyndromeRisk,
                  prevRhabdomyolysisLogged: !!st.patient.rhabdomyolysisLogged,
                  prevMyoglobinuriaLogged: !!st.patient.myoglobinuriaLogged,
                  prevCompartmentSyndromeLogged: !!st.patient.compartmentSyndromLogged,
                  mhActive: !!st.patient.mhActive,
                  succinylcholineMyopathyRhabdo: succinylcholineInMyopathy,
                  position: pos,
                  positionDurationSeconds: st.time,
                  paddingAdequate: !!(st.patient.peronealNervePadded || st.patient.armsPositionedCorrectly || st.patient.paddingAdequate),
                  dt: 1
              });
              if (mskOut.events && mskOut.events.length > 0) {
                  mskOut.events.forEach(evt => logEvent(evt));
              }
              finalPatient.ckLevel = mskOut.ckLevelUPerL;
              finalPatient.myoglobinLevel = mskOut.myoglobinUgL;
              finalPatient.nerveInjuryRiskIndex = mskOut.nerveInjuryRiskIndex;
              finalPatient.compartmentSyndromeRisk = mskOut.compartmentSyndromeRisk;
              finalPatient.rhabdomyolysisLogged = mskOut.rhabdomyolysisActive;
              finalPatient.myoglobinuriaLogged = mskOut.myoglobinuriaRisk;
              finalPatient.compartmentSyndromLogged = mskOut.compartmentSyndromeRisk > 0.5;
              st.patient.ckLevel = mskOut.ckLevelUPerL;
              st.patient.myoglobinLevel = mskOut.myoglobinUgL;
              st.patient.nerveInjuryRiskIndex = mskOut.nerveInjuryRiskIndex;
              st.patient.compartmentSyndromeRisk = mskOut.compartmentSyndromeRisk;
          }

          // Phase 4 Hematology/Coagulation: CoagulationCascadeModel.ts. Called after all
          // EBL/temperature/sodium modifications this tick are finalized, so blood-loss-rate,
          // temperature, and pH inputs reflect this tick's fully computed state.
          {
              // Use AcidBaseModel's unified pH (Phase 5, Stage 1) which already accounts for
              // SID/chloride/buffer/lactate/sepsis/AKI in one consistent computation. Re-derive
              // with this tick's freshly-computed PaCO2 so the coag model sees the same pH
              // the Stewart model would produce at the exact current CO2 level.
              // Use AcidBaseModel's unified pH (Phase 5, Stage 1) which already accounts for
              // SID/chloride/buffer/lactate/sepsis/AKI in one consistent computation. Re-derive
              // with this tick's freshly-computed PaCO2 so the coag model sees the same pH
              // the Stewart model would produce at the exact current CO2 level.
              const coagPh = Math.max(6.5, Math.min(7.8, 6.1 + Math.log10((acidBaseOutput.computedHco3 / Math.max(1e-9, 0.0307 * (respOutput.newPaCO2 || 40))))));
              const eblDeltaThisTick = Math.max(0, (finalPatient.ebl || 0) - prevEblBeforeThisTick);
              const totalInfusedMl = fluidicsOutput.intravascularVolumeAdded_mL || 0;
              const rbcInfusedMl = fluidicsOutput.rbcVolumeAdded_mL || 0;
              const crystalloidRateMlPerSec = Math.max(0, totalInfusedMl - rbcInfusedMl);

              // Blood products this tick, estimated from coags offset delta (disclosed proxy)
              const prevCoagsMa = (st.coags && typeof st.coags.ma_offset === 'number') ? st.coags.ma_offset : 0;
              const prevCoacgsAngle = (st.coags && typeof st.coags.angle_offset === 'number') ? st.coags.angle_offset : 0;
              const prevCoacgsR = (st.coags && typeof st.coags.r_offset === 'number') ? st.coags.r_offset : 0;
              const ffpVolMl = Math.max(0, -(fluidicsOutput.coags.r_offset - prevCoacgsR) / 4 * 250);
              const pltVolMl = Math.max(0, (fluidicsOutput.coags.ma_offset - prevCoagsMa) / 15 * 250);
              const cryoVolMl = Math.max(0, (fluidicsOutput.coags.angle_offset - prevCoacgsAngle) / 15 * 10);

              const heparinModelForCoag = (st.activeMeds || []).find(m => m.name === 'Heparin');
              const protamineModelForCoag = (st.activeMeds || []).find(m => m.name === 'Protamine Sulfate');
              const txaModelForCoag = (st.activeMeds || []).find(m => m.name === 'Tranexamic Acid (TXA)');
              const hepaticInrForCoag = typeof st.patient.inr === 'number' && Number.isFinite(st.patient.inr) ? st.patient.inr : 1.0;
              // Estrogen boosts hepatic synthesis of factors II/VII/IX/X/fibrinogen (Phase 6F)
              const estrogenFactorBoost = sexHormoneOutput ? sexHormoneOutput.estrogenCoagulantBoost : 0;
              const hepaticSyntheticFractionForCoag = Math.min(1.15, Math.max(0, 1 - (hepaticInrForCoag - 1) / 3 + estrogenFactorBoost));

              // AFE and FES DIC consumption: apply per-tick losses before CoagulationCascadeModel
              const afeFibLoss = (st.patient.afeDicFibConsumptionRate || 0) / 60; // per second
              const afePlatLoss = (st.patient.afeDicPlateletConsumptionRate || 0) / 60;
              const afeFactorLoss = (st.patient.afeDicFactorConsumptionRate || 0) / 60;
              const fesPlatLoss = (st.patient.femPlateletConsumptionRate || 0) / 60;

              const coagOutput = CoagulationCascadeModel.tick({
                  prevPlateletCountK: Math.max(0, (st.patient.plateletCount || 200) - afePlatLoss - fesPlatLoss),
                  prevFibrinogenMgDl: Math.max(0, (st.patient.fibrinogenMgDl || 350) - afeFibLoss),
                  prevFactorActivityFraction: Math.max(0, (st.patient.factorActivityFraction || 1.0) - afeFactorLoss),
                  prevFibrinolysisIndex: st.patient.fibrinolysisIndex,
                  prevLethalTriadLogged: !!st.patient.lethalTriadLogged,
                  isDICLogged: !!st.patient.isDICLogged,
                  temperature: finalPatient.temp || newTemp,
                  pH: coagPh,
                  bloodLossRateMlPerSec: eblDeltaThisTick,
                  ebv: safeEbvForCvp || 5000,
                  crystalloidInfusionRateMlPerSec: crystalloidRateMlPerSec,
                  isActiveDIC: !!st.patient.isActiveDIC,
                  heparinCe: heparinModelForCoag ? heparinModelForCoag.Ce : 0,
                  protamineCe: protamineModelForCoag ? protamineModelForCoag.Ce : 0,
                  txaCe: txaModelForCoag ? txaModelForCoag.Ce : 0,
                  ffpVolumeMlThisTick: ffpVolMl,
                  plateletsVolumeMlThisTick: pltVolMl,
                  cryoprecipitateVolumeMlThisTick: cryoVolMl,
                  hepaticSyntheticFraction: hepaticSyntheticFractionForCoag,
                  dt: 1
              });

              if (coagOutput.events && coagOutput.events.length > 0) {
                  coagOutput.events.forEach(evt => logEvent(evt));
              }

              finalPatient.plateletCount = coagOutput.plateletCountK;
              finalPatient.fibrinogenMgDl = coagOutput.fibrinogenMgDl;
              finalPatient.factorActivityFraction = coagOutput.factorActivityFraction;
              finalPatient.fibrinolysisIndex = coagOutput.fibrinolysisIndex;
              finalPatient.inr = coagOutput.inr;
              finalPatient.aptt = coagOutput.aptt;
              finalPatient.tegR = coagOutput.tegR;
              finalPatient.tegK = coagOutput.tegK;
              finalPatient.tegAlpha = coagOutput.tegAlpha;
              finalPatient.tegMA = coagOutput.tegMA;
              finalPatient.tegLY30 = coagOutput.tegLY30;
              finalPatient.lethalTriadActive = coagOutput.lethalTriadActive;
              finalPatient.lethalTriadLogged = coagOutput.prevLethalTriadLogged;
              finalPatient.isDICLogged = coagOutput.isDICLogged;

              st.patient.plateletCount = coagOutput.plateletCountK;
              st.patient.fibrinogenMgDl = coagOutput.fibrinogenMgDl;
              st.patient.factorActivityFraction = coagOutput.factorActivityFraction;
              st.patient.fibrinolysisIndex = coagOutput.fibrinolysisIndex;
              st.patient.inr = coagOutput.inr;
              st.patient.aptt = coagOutput.aptt;
              st.patient.tegR = coagOutput.tegR;
              st.patient.tegK = coagOutput.tegK;
              st.patient.tegAlpha = coagOutput.tegAlpha;
              st.patient.tegMA = coagOutput.tegMA;
              st.patient.tegLY30 = coagOutput.tegLY30;
              st.patient.lethalTriadActive = coagOutput.lethalTriadActive;
              st.patient.lethalTriadLogged = coagOutput.prevLethalTriadLogged;
              st.patient.isDICLogged = coagOutput.isDICLogged;
          }

          // Phase 6D: Capnography waveform physics + SpO2 artifact correction
          const capnoOutput = CapnographyModel.tick({
              etco2MmHg: respOutput.vitals.etco2 || 38,
              co2AbsorberExhausted: (st.patient.co2AbsorptiveCapacity !== undefined) && (st.patient.co2AbsorptiveCapacity < 0.1),
              stuckInspiratoryValve: !!st.patient.stuckInspiratoryValve,
              stuckExpiratoryValve: !!st.patient.stuckExpiratoryValve,
              bronchospasmSeverity: Math.max(0, ((respOutput.resistance || 20) - 20) / 40),
              isEsophagealIntubation: !!(st.patient.esophagealIntubation),
              ventRR: respOutput.vitals.rr || 12,
              trueSao2: respOutput.vitals.spo2 || 98,
              metHbPercent: st.patient.metHb || 0,
              coHbPercent: st.patient.coHb || 0,
              perfusionIndex: Math.min(1, Math.max(0, (cvOutput.vitals.co || 5) / 5 * (cvOutput.vitals.map || 90) / 90))
          });
          // Update the final SpO2 display with artifact-corrected value (if artifacts active)
          if (capnoOutput.metHbArtifact || capnoOutput.coHbArtifact || capnoOutput.signalQualityLost) {
              finalPatient.displayedSpO2 = capnoOutput.displayedSpO2;
          }
          finalPatient.capnoWaveformPattern = capnoOutput.waveformPattern;
          finalPatient.phaseIBaselineMmHg = capnoOutput.phaseIBaselineMmHg;
          finalPatient.phaseIIISlopeMmHgPerSec = capnoOutput.phaseIIISlopeMmHgPerSec;
          finalPatient.metHbSpO2Artifact = capnoOutput.metHbArtifact;
          finalPatient.coHbSpO2Artifact = capnoOutput.coHbArtifact;

          // Cerebral Engine Tick (Chapter 11)
          const cerebralOutput = CerebralEngine.tick(1, {
              patient: st.patient,
              vitals: {
                  cbf: st.patient.cbf,
                  cmro2: st.patient.cmro2,
                  cpp: st.patient.cpp,
                  cbv: st.patient.cbv,
                  icp: st.patient.icp,
                  rso2: st.patient.rso2
              },
              time: st.time
          }, st.activeMeds || [], {
              map: cvOutput.vitals.map || 90.0,
              sys: cvOutput.vitals.sys || 120.0,
              paco2: respOutput.newPaCO2 || 40.0,
              pao2: respOutput.vitals.pao2 || 100.0,
              spo2: respOutput.vitals.spo2 || 98.0,
              temp: newTemp,
              cvp: cvp,
              sevoMac: sevoMac,
              isoMac: isoMac,
              desMac: desMac,
              haloMac: haloMac,
              n2oMac: n2oMac,
              xenonMac: xenonMac,
              positionHydrostaticMod: positionHydrostaticMod
          });

          if (cerebralOutput.events && cerebralOutput.events.length > 0) {
              cerebralOutput.events.forEach(evt => logEvent(evt));
          }

          // Cerebellar Engine Tick: nystagmus/ataxia anesthesia-depth signs + tonsillar
          // herniation risk. prevIcp/prevCpp are read BEFORE this tick's cerebral writeback below,
          // mirroring CerebralEngine.ts's own internal prevICP/prevCPP transition-detection pattern.
          const ketamineModelForCerebellar = (st.activeMeds || []).find(m => m.name === 'Ketamine');
          const midazolamModelForCerebellar = (st.activeMeds || []).find(m => m.name === 'Midazolam');
          const cerebellarOutput = CerebellarEngine.tick({
              icp: cerebralOutput.icp,
              prevIcp: st.patient.icp,
              cpp: cerebralOutput.cpp,
              prevCpp: st.patient.cpp,
              complianceState: st.patient.complianceState,
              dt: 1,
              currentMac: currentMac,
              ketamineCe: ketamineModelForCerebellar ? ketamineModelForCerebellar.Ce : 0,
              midazolamCe: midazolamModelForCerebellar ? midazolamModelForCerebellar.Ce : 0
          });

          if (cerebellarOutput.events && cerebellarOutput.events.length > 0) {
              cerebellarOutput.events.forEach(evt => logEvent(evt));
          }

          st.patient.nystagmusPresent = cerebellarOutput.nystagmusPresent;
          st.patient.nystagmusSeverity = cerebellarOutput.nystagmusSeverity;
          st.patient.ataxiaIndex = cerebellarOutput.ataxiaIndex;
          st.patient.tonsillarHerniationRisk = cerebellarOutput.tonsillarHerniationRisk;
          st.patient.herniationImminent = cerebellarOutput.herniationImminent;

          finalPatient.nystagmusPresent = cerebellarOutput.nystagmusPresent;
          finalPatient.nystagmusSeverity = cerebellarOutput.nystagmusSeverity;
          finalPatient.ataxiaIndex = cerebellarOutput.ataxiaIndex;
          finalPatient.tonsillarHerniationRisk = cerebellarOutput.tonsillarHerniationRisk;
          finalPatient.herniationImminent = cerebellarOutput.herniationImminent;

          st.patient.cbf = cerebralOutput.cbf;
          st.patient.cmro2 = cerebralOutput.cmro2;
          st.patient.cpp = cerebralOutput.cpp;
          st.patient.cbv = cerebralOutput.cbv;
          st.patient.icp = cerebralOutput.icp;
          st.patient.brainVolume = cerebralOutput.brainVolume;
          st.patient.csfVolume = cerebralOutput.csfVolume;
          st.patient.hasCerebralIschemia = cerebralOutput.hasCerebralIschemia;
          st.patient.rso2 = cerebralOutput.rso2;
          st.patient.neuronalInjury = cerebralOutput.neuronalInjury;

          finalPatient.cbf = cerebralOutput.cbf;
          finalPatient.cmro2 = cerebralOutput.cmro2;
          finalPatient.cpp = cerebralOutput.cpp;
          finalPatient.cbv = cerebralOutput.cbv;
          finalPatient.icp = cerebralOutput.icp;
          finalPatient.brainVolume = cerebralOutput.brainVolume;
          finalPatient.csfVolume = cerebralOutput.csfVolume;
          finalPatient.hasCerebralIschemia = cerebralOutput.hasCerebralIschemia;
          finalPatient.rso2 = cerebralOutput.rso2;
          finalPatient.neuronalInjury = cerebralOutput.neuronalInjury;

          // === PPV / SVV (PULSE PRESSURE VARIATION / STROKE VOLUME VARIATION) ===
          // Valid ONLY in: mechanically ventilated, sinus rhythm, no spontaneous breaths, TV ≥ 8 mL/kg IBW.
          // Threshold for fluid responsiveness: PPV > 13%, SVV > 13% (Marik PE, Crit Care Med 2009).
          // Physics: positive-pressure breath → oscillating intrathoracic pressure → cyclical preload variation
          // → larger swings in preload-dependent patients (steep Frank-Starling slope = hypovolemia).
          const ppvValidConditions = (
            st.patient.ventilationStatus === 'mechanical' &&
            !(st.patient.hasAFib || st.patient.afib || st.patient.cardiacRhythm === 'afib') &&
            !st.patient.isArrest
          );
          let computedPPV = 5; // baseline ~5% in euvolemic mechanically ventilated patient
          let computedSVV = 4;
          if (ppvValidConditions) {
            const ibwKg = st.patient.ibw || st.patient.weight || 70;
            const sexFactor = (st.patient.sex || 'male').toLowerCase().includes('f') ? 65 : 70;
            const normalEBV = ibwKg * sexFactor; // mL
            const currentEBL = st.patient.ebl || 0;
            // Rough effective volume: normal EBV minus blood loss plus cumulative IV fluid
            const effectiveVol = Math.max(500, normalEBV - currentEBL + Math.max(0, safeIntravascularVolume));
            const volumeDeficit = Math.max(0, 1.0 - effectiveVol / normalEBV);
            // PPV scales with volume deficit (hypovolemia → steep Frank-Starling → bigger swings)
            const volumeComponent = volumeDeficit * 35; // 35% PPV at severe hypovolemia
            // TV scaling: PPV ∝ tidal volume (only valid at TV ≥ 8 mL/kg IBW)
            const tvMlKg = activeVentSettings ? (activeVentSettings.vt || 0) / Math.max(20, ibwKg) : 8;
            const tvScaling = Math.max(0.5, tvMlKg / 8.0);
            // Third-spacing worsens responsiveness profile
            const thirdSpaceEffect = (st.patient.thirdSpacedVolumeMl || 0) / normalEBV * 15;
            computedPPV = Math.round(Math.max(3, Math.min(40, (5 + volumeComponent + thirdSpaceEffect) * tvScaling)));
            computedSVV = Math.round(Math.max(2, Math.min(35, computedPPV * 0.85)));
          }

          const finalVitals = {
              ...cvOutput.vitals,
              cmap: Math.max(0, cvOutput.vitals.map + positionHydrostaticMod),
              spo2: respOutput.vitals.spo2,
              etco2: respOutput.vitals.etco2,
              rr: respOutput.vitals.rr,
              pip: respOutput.vitals.pip,
              pplat: respOutput.vitals.pplat,
              vte: respOutput.vitals.vte,
              pmean: respOutput.vitals.pmean,
              mv: respOutput.vitals.mv,
              peep: respOutput.vitals.peep,
              fico2: respOutput.vitals.fico2 || 0,
              ph: respOutput.newPh,
              paco2: respOutput.newPaCO2,
              pao2: respOutput.vitals.pao2,
              compl: Math.round(respOutput.compliance),
              res: Math.round(respOutput.resistance),
              shunt: respOutput.actualShunt,
              vdVt: respOutput.vdVtRatio,
              cao2: respOutput.vitals.cao2,
              cvo2: respOutput.vitals.cvo2,
              temp: newTemp,
              etAgent: currentEtAgent,
              fiAgent: currentFiAgent,
              etN2O: currentEtN2O,
              fiN2O: currentFiN2O,
              fiO2: deliveredFiO2,
              etO2: respOutput.lungVolumes?.frc_L > 0
                ? Math.round((respOutput.oxygenBuffer / respOutput.lungVolumes.frc_L) * 100)
                : 21,
              n2oUptakeRate: n2oUptake_L_sec,
              ppv: computedPPV,
              svv: computedSVV,
              glucose: st.patient.glucose || 100,
              troponinNgL: st.patient.troponinNgL || 3,
              mac: displayedMac,
              lesTone: giOutput.lesTone,
              gastricPressure: giOutput.gastricPressure,
              bowelGasVolume: giOutput.bowelGasVolume,
              gutMotility: giOutput.gutMotility,
              inflammatoryIleus: giOutput.inflammatoryIleus,
              postoperativeIleus: giOutput.postoperativeIleus,
              stomachMotility: giOutput.stomachMotility,
              smallBowelMotility: giOutput.smallBowelMotility,
              colonicMotility: giOutput.colonicMotility,
              stomachIleusDurationHours: giOutput.stomachIleusDurationHours,
              smallBowelIleusDurationHours: giOutput.smallBowelIleusDurationHours,
              colonicIleusDurationHours: giOutput.colonicIleusDurationHours,
              mPAP: hepaticOutput.mPAP,
              HVPG: hepaticOutput.HVPG,
              pbf: hepaticOutput.pbf,
              habf: hepaticOutput.habf,
              thbf: hepaticOutput.thbf,
              renalArteryResistance: hepaticOutput.renalArteryResistance,
              cvp: cvp,

              // Renal microenvironment vitals
              mapUnder60Time: renalOutput.mapUnder60Time,
              mapUnder55Time: renalOutput.mapUnder55Time,
              mapUnder60AlertTriggered: renalOutput.mapUnder60AlertTriggered,
              mapUnder55AlertTriggered: renalOutput.mapUnder55AlertTriggered,
              cortexRbf: renalOutput.cortexRbf,
              medullaRbf: renalOutput.medullaRbf,
              cortexPo2: renalOutput.cortexPo2,
              medullaPo2: renalOutput.medullaPo2,
              cortexO2Extraction: renalOutput.cortexO2Extraction,
              medullaO2Extraction: renalOutput.medullaO2Extraction,
              glomerularCapillaryPressure: renalOutput.glomerularCapillaryPressure,
              bowmanSpacePressure: renalOutput.bowmanSpacePressure,
              glomerularOncoticPressure: renalOutput.glomerularOncoticPressure,
              netFiltrationPressure: renalOutput.netFiltrationPressure,

              // Cerebral vitals (Chapter 11)
              cbf: cerebralOutput.cbf,
              cmro2: cerebralOutput.cmro2,
              cpp: cerebralOutput.cpp,
              cbv: cerebralOutput.cbv,
              icp: cerebralOutput.icp,
              rso2: cerebralOutput.rso2,

              // Phase 4 & 5 new vitals surfaced for monitor display
              fetalHR: finalPatient.fetalHR,
              lateDecelerationActive: finalPatient.lateDecelerationActive,
              fetalBradycardiaActive: finalPatient.fetalBradycardiaActive,
              uterineTone: finalPatient.uterineTone,
              sepsisScore: sepsisOutput.sepsisScore,
              plateletCount: finalPatient.plateletCount,
              fibrinogenMgDl: finalPatient.fibrinogenMgDl,
              inr: finalPatient.inr,
              anionGap: finalPatient.anionGap,
              correctedAnionGap: finalPatient.correctedAnionGap,
              baseExcess: finalPatient.baseExcess,
              ionizedCalcium: finalPatient.ionizedCalcium,
              ckLevel: finalPatient.ckLevel,
              nerveInjuryRiskIndex: finalPatient.nerveInjuryRiskIndex,
              compartmentSyndromeRisk: finalPatient.compartmentSyndromeRisk,
              lethalTriadActive: finalPatient.lethalTriadActive,
              bladderPressure: renalOutput.bladderPressure,
              autonomicDysreflexiaActive: renalOutput.autonomicDysreflexiaActive
          };

          // Apply natural wave-like fluctuations in non-arrest states
          if (!finalPatient.isArrest && finalVitals.hr > 0 && finalPatient.cardiacRhythm !== 'asystole') {
              const hrOsc = Math.sin(st.time * 0.1) * 0.8 + Math.cos(st.time * 0.03) * 0.4;
              finalVitals.hr = Math.round(finalVitals.hr + hrOsc);

              const bpOsc = Math.sin(st.time * 0.07) * 1.5 + Math.cos(st.time * 0.02) * 1.0;
              if (finalVitals.sys > 0) finalVitals.sys = Math.round(finalVitals.sys + bpOsc);
              if (finalVitals.dia > 0) finalVitals.dia = Math.round(finalVitals.dia + bpOsc);
              if (finalVitals.map > 0) finalVitals.map = Math.round(finalVitals.map + bpOsc);
              if (finalVitals.cmap > 0) finalVitals.cmap = Math.round(finalVitals.cmap + bpOsc);

              if (finalVitals.rr > 0 && finalPatient.ventilationStatus === 'spontaneous') {
                  const rrOsc = Math.sin(st.time * 0.05) * 0.5;
                  finalVitals.rr = Math.round(finalVitals.rr + rrOsc);
              }

              if (finalVitals.spo2 > 50 && finalVitals.spo2 <= 100) {
                  const spo2Osc = Math.sin(st.time * 0.04) * 0.3;
                  finalVitals.spo2 = Math.round(Math.max(0, Math.min(100, finalVitals.spo2 + spo2Osc)));
              }
          }

          // Processed EEG metrics (SEF95, BSR, and BIS) based on subcortical arousal & pathways
          let bsrVal = 0;
          if (displayedMac > 1.5) {
              bsrVal = (displayedMac - 1.5) * 70;
          }
          if (propofolCe > 4.5) {
              bsrVal = Math.max(bsrVal, (propofolCe - 4.5) * 20);
          }
          bsrVal = Math.round(Math.max(0, Math.min(100, bsrVal)));

          let bisBase = 98;
          if (finalPatient.lcActivity !== undefined) {
              const pathwayCoherence = (
                  finalPatient.thalamocorticalConn * 0.4 + 
                  finalPatient.frontoparietalFeedback * 0.4 + 
                  ((finalPatient.lcActivity + finalPatient.tmnActivity + finalPatient.orexinLevel) / 3.0) * 0.2
              );
              bisBase = 98 * Math.max(0.0, Math.min(1.0, pathwayCoherence));
          } else {
              bisBase = 98 - (aggregateHypnosis * 55);
          }

          if (displayEmergenceLag) {
              bisBase = Math.min(bisBase, 40 + (1.0 - finalPatient.neuralInertiaLag) * 20);
          }

          let targetBis = bisBase * (1.0 - bsrVal / 100);
          if (finalVitals.cmap < 50) {
              const ischemicSlowing = (50 - finalVitals.cmap) * 1.5;
              targetBis -= ischemicSlowing;
          }

          let finalBis = Math.max(0, Math.min(98, targetBis + painOutput.bisSpike));
          if (finalPatient.isArrest) {
              finalBis = finalPatient.biologicalDeath ? 0 : Math.max(0, (st.vitals.bis || 98) - 5);
          }

          let sefVal = 30.0;
          if (finalPatient.frontoparietalFeedback !== undefined) {
              sefVal = Math.max(1.0, 30.0 * (0.8 * finalPatient.frontoparietalFeedback + 0.2 * finalPatient.thalamocorticalConn));
              sefVal = sefVal * (1.0 - bsrVal / 100);
              if (finalBis < 5) sefVal = 0;
          } else {
              sefVal = 30.0 - (aggregateHypnosis * 25);
          }
          sefVal = parseFloat(sefVal.toFixed(1));

          const isSuxActive = succinylcholineCe > 0.01;
          const hasNDMR = st.activeMeds?.some(m => m.classes.includes('NDMR') && m.Ce > 0.01);
          
          let suxPhase2Accumulation = st.patient.suxPhase2Accumulation || 0;
          if (isSuxActive) {
              suxPhase2Accumulation += 1;
          } else {
              suxPhase2Accumulation = Math.max(0, suxPhase2Accumulation - 0.5);
          }
          st.patient.suxPhase2Accumulation = suxPhase2Accumulation;
          
          const cumulativeSuxDose = st.patient.cumulativeSuxDose || 0;
          const isSuxPhaseII = isSuxActive && (cumulativeSuxDose > 300 || suxPhase2Accumulation > 120);

          let t1 = 1.0; let t4 = 1.0;
          let t2 = 1.0; let t3 = 1.0;
          let targetTofCount = 4;
          let targetTofRatio = 1.0;

          if (maxNMJOccupancy > 0.0) {
              if (isSuxActive && !isSuxPhaseII && !hasNDMR) {
                  // Phase I depolarizing block: no fade, all four twitches decrease together
                  t1 = maxNMJOccupancy <= 0.75 ? 1.0 : Math.max(0, 1.0 - (maxNMJOccupancy - 0.75) / (0.95 - 0.75));
                  t2 = t1;
                  t3 = t1;
                  t4 = t1;
                  targetTofRatio = 1.0;
                  targetTofCount = t1 > 0.05 ? 4 : 0;
              } else {
                  // Non-depolarizing block or Phase II block: exhibits fade.
                  // Corrected thresholds (Miller's Ch29, Naguib 2018): TOF count transitions
                  // span 50-95% occupancy, not the compressed 80-95% window from before.
                  // Prior: 4→3→2→1→0 over 15% occupancy band → reversal training incorrect.
                  // Fixed: 4→3→2→1→0 now spans a 25% occupancy band (70→80→90→95%).
                  t1 = maxNMJOccupancy <= 0.90 ? 1.0 : Math.max(0, 1.0 - (maxNMJOccupancy - 0.90) / 0.05);
                  t2 = maxNMJOccupancy <= 0.80 ? 1.0 : Math.max(0, 1.0 - (maxNMJOccupancy - 0.80) / 0.10);
                  t3 = maxNMJOccupancy <= 0.70 ? 1.0 : Math.max(0, 1.0 - (maxNMJOccupancy - 0.70) / 0.10);
                  t4 = maxNMJOccupancy <= 0.55 ? 1.0 : Math.max(0, 1.0 - (maxNMJOccupancy - 0.55) / 0.15);

                  if (maxNMJOccupancy >= 0.95) {
                      targetTofCount = 0;           // >95%: no twitches
                  } else if (maxNMJOccupancy >= 0.90) {
                      targetTofCount = 1;           // 90-95%: T1 only
                  } else if (maxNMJOccupancy >= 0.80) {
                      targetTofCount = 2;           // 80-90%: T1+T2
                  } else if (maxNMJOccupancy >= 0.70) {
                      targetTofCount = 3;           // 70-80%: T1+T2+T3
                  } else {
                      targetTofCount = 4;           // <70%: all 4 (fade 40-70%, no fade <40%)
                  }
                  targetTofRatio = (targetTofCount === 4 && t1 > 0.001) ? (t4 / t1) : 0.0;
              }

              // Nullify twitches that are blocked based on count
              if (targetTofCount < 4) t4 = 0;
              if (targetTofCount < 3) t3 = 0;
              if (targetTofCount < 2) t2 = 0;
              if (targetTofCount < 1) t1 = 0;
          }
          if (isNaN(targetTofRatio) || targetTofRatio < 0) targetTofRatio = 0;
          targetTofRatio = Math.min(1.0, targetTofRatio);
          if (finalPatient.neostigmineWeakness) {
              targetTofRatio = Math.min(0.89, targetTofRatio);
          }

          // Chapter 28, Miller's 9th Ed (Fig 28.2, p.835): qualitative (manual tactile/visual peripheral
          // nerve stimulator) monitoring cannot detect fade once the true TOF ratio exceeds ~0.30-0.40 -
          // a clinician relying on it perceives full recovery (no fade) despite clinically significant
          // residual blockade up to a ratio of 0.89. Twitch COUNT (0-4 missing twitches) is still reliably
          // perceived, since gross absence of a twitch is visually/tactilely obvious; only the FADE RATIO
          // within an intact 4/4 train is imperceptible above this threshold.
          const QUALITATIVE_FADE_DETECTION_THRESHOLD = 0.40;
          const perceivedTofCount = targetTofCount;
          const perceivedTofRatio = (targetTofCount === 4 && targetTofRatio > QUALITATIVE_FADE_DETECTION_THRESHOLD)
              ? 1.0
              : targetTofRatio;

          // Initialize airwaySecuredTime when airway becomes secured
          if (finalPatient.airwaySecured && !st.patient.airwaySecured) {
              finalPatient.airwaySecuredTime = st.time;
          } else if (!finalPatient.airwaySecured) {
              finalPatient.airwaySecuredTime = undefined;
              finalPatient.incisionStartTime = undefined;
          }

          // Auto-transitions based on the surgical timeline & Time-Out authorization
          if (st.surgicalPhase === 'Induction' && finalPatient.airwaySecured && finalPatient.airwaySecuredTime !== undefined && finalPatient.timeOutAuthorized) {
              const secondsSinceSecured = st.time - finalPatient.airwaySecuredTime;
              if (secondsSinceSecured >= 5) {
                  setSurgicalPhase('Incision');
                  finalPatient.incisionStartTime = st.time;
                  logEvent(`➡️ Airway Secured. Prepping & draping complete. Surgical incision performed.`);
              }
          }

          if (st.surgicalPhase === 'Incision' && finalPatient.incisionStartTime !== undefined) {
              const secondsSinceIncision = st.time - finalPatient.incisionStartTime;
              if (secondsSinceIncision >= 30) {
                  setSurgicalPhase('Maintenance');
                  logEvent(`➡️ Surgical Timeline: Incision complete. Maintenance phase initiated.`);
              }
          }

          // Auto-transition from Maintenance to Emergence when anesthetic agents are winding down
          if (st.surgicalPhase === 'Maintenance') {
              const isVolatileOff = !st.gasSettings || st.gasSettings.dial === 0;
              const isPropofolOff = !st.activeMeds || !st.activeMeds.some(m => m.name === 'Propofol' && m.currentInfusionRate > 0);
              const isAnestheticLow = currentMac < 0.55 && propofolCe < 1.5;
              if (isVolatileOff && isPropofolOff && isAnestheticLow) {
                  setSurgicalPhase('Emergence');
                  logEvent(`➡️ Anesthetic agents winding down (MAC ${currentMac.toFixed(2)}, Propofol Ce ${propofolCe.toFixed(2)}). Surgical Timeline Auto-Advanced: EMERGENCE phase initiated.`);
              }
          }

          // Auto-transition from Emergence to PACU when patient is fully awake
          if (st.surgicalPhase === 'Emergence' && currentMac < 0.1 && propofolCe < 0.1 && finalBis >= 90) {
              setSurgicalPhase('PACU');
              logEvent(`➡️ Patient is fully awake (BIS ${Math.round(finalBis)}, MAC ${currentMac.toFixed(2)}). Surgical Timeline Auto-Advanced: PACU phase initiated.`);
          }

          if (st.activeMeds && finalPatient.accessLines) {
              const safePatientWeight = typeof finalPatient.weight === 'number' && finalPatient.weight > 0 ? finalPatient.weight : 70;
              const safePatientIbw = typeof finalPatient.ibw === 'number' && finalPatient.ibw > 0 ? finalPatient.ibw : 70;
              const safePatientLbw = typeof finalPatient.lbw === 'number' && finalPatient.lbw > 0 ? finalPatient.lbw : 60;

              st.activeMeds.forEach(model => {
                  if (model.tciMode && model.tciMode !== 'none') {
                      const matchingId = Object.keys(MEDICATIONS).find(key => MEDICATIONS[key].name === model.name);
                      if (matchingId) {
                          const medData = MEDICATIONS[matchingId];
                          finalPatient.accessLines.forEach(line => {
                              if (line.activeMedInfusions) {
                                  const medInf = line.activeMedInfusions.find(mi => mi.medId === matchingId);
                                  if (medInf) {
                                      const dosingWeight = resolveDosingWeight(medData, 'Infusion', st.patient);
                                      if (medInf.unit.includes('mcg/kg/min')) {
                                          medInf.rate = parseFloat(((model.currentInfusionRate * 1000 * 60) / dosingWeight).toFixed(2));
                                      } else if (medInf.unit.includes('mL/kg/min') || medInf.unit.includes('ml/kg/min')) {
                                          medInf.rate = parseFloat(((model.currentInfusionRate * 60) / dosingWeight).toFixed(2));
                                      } else if (medInf.unit.includes('mg/kg/hr')) {
                                          medInf.rate = parseFloat(((model.currentInfusionRate * 3600) / dosingWeight).toFixed(2));
                                      } else if (medInf.unit.includes('mcg/kg/hr')) {
                                          medInf.rate = parseFloat(((model.currentInfusionRate * 1000 * 3600) / dosingWeight).toFixed(2));
                                      } else if (medInf.unit.includes('mcg/min')) {
                                          medInf.rate = parseFloat((model.currentInfusionRate * 1000 * 60).toFixed(2));
                                      } else if (medInf.unit.includes('mg/hr')) {
                                          medInf.rate = parseFloat((model.currentInfusionRate * 3600).toFixed(2));
                                      } else {
                                          medInf.rate = parseFloat((model.currentInfusionRate * 3600).toFixed(2));
                                      }
                                  }
                              }
                          });
                      }
                  }
              });
          }

          // Fast-forward kinetics decrement and safety pauses
          let ffRemaining = ffRemainingRef.current;
          if (ffRemaining > 0) {
            const nextRemaining = Math.max(0, ffRemaining - 1);
            ffRemainingRef.current = nextRemaining;
            finalPatient.fastForwardRemaining = nextRemaining;
            
            finalPatient.fastForwardTotal = ffTotalRef.current;
            if (nextRemaining === 0) {
              ffTotalRef.current = 0;
              finalPatient.fastForwardTotal = 0;
            }

            // Safety pause trigger: if patient becomes unstable, halt fast-forward and pause simulation
            const hrVal = finalVitals.hr || 0;
            const mapVal = finalVitals.map || 90.0;
            const spo2Val = finalVitals.spo2 || 98.0;

            const isCardiacArrest = hrVal <= 0;
            const hasHypoxemia = spo2Val < 90.0;
            const hasSevereHypotension = mapVal < 55.0;
            const hasSevereTachycardia = hrVal > 140.0;

            if (isCardiacArrest || hasHypoxemia || hasSevereHypotension || hasSevereTachycardia) {
              ffRemainingRef.current = 0;
              ffTotalRef.current = 0;
              finalPatient.fastForwardRemaining = 0;
              finalPatient.fastForwardTotal = 0;
              logEvent(`🚨 FAST-FORWARD HALTED: Patient became unstable (HR ${Math.round(hrVal)} bpm, BP ${Math.round(finalVitals.sys)}/${Math.round(finalVitals.dia)} mmHg, SpO2 ${Math.round(spo2Val)}%).`);
              setIsRunning(false);
            }
          }

          // Update ref states directly inside the loop to avoid React overhead
          stateRef.current.patient = finalPatient;
          stateRef.current.activeMeds = [...st.activeMeds];
          stateRef.current.vitals = {
              ...finalVitals,
              bis: Math.round(finalBis),
              sef95: sefVal,
              bsr: bsrVal,
              tofCount: targetTofCount,
              tofRatio: targetTofRatio,
              perceivedTofCount: perceivedTofCount,
              perceivedTofRatio: perceivedTofRatio,
              t1: t1,
              t2: t2,
              t3: t3,
              t4: t4,
          };

  return { skipped: false };
}

/**
 * Layer 1B: pure case-initialization, extracted verbatim from the init useEffect so a faithful
 * starting sim-state can be built headless (for golden-master / fuzz harnesses) using the exact
 * same logic production uses. Local setter shims collect into __s instead of touching React.
 * ventSettings/gasSettings/msmaidsComplete are supplied separately by the caller (they are props,
 * not case-derived). See docs/architecture/audit_layer1_physics_core.md.
 */
export function createInitialSimState(activeCase) {
  const __s = {};
  const setVitals = (u) => { __s.vitals = typeof u === 'function' ? u(__s.vitals || {}) : { ...(__s.vitals || {}), ...u }; };
  const setTargetVitals = (u) => { __s.targetVitals = typeof u === 'function' ? u(__s.targetVitals || {}) : { ...(__s.targetVitals || {}), ...u }; };
  const setPatient = (u) => { __s.patient = typeof u === 'function' ? u(__s.patient || {}) : { ...(__s.patient || {}), ...u }; };
  const setElectrolytes = (u) => { __s.electrolytes = typeof u === 'function' ? u(__s.electrolytes || {}) : { ...(__s.electrolytes || {}), ...u }; };
  const setCoags = (u) => { __s.coags = typeof u === 'function' ? u(__s.coags || {}) : { ...(__s.coags || {}), ...u }; };
  const setTime = (u) => { __s.time = typeof u === 'function' ? u(__s.time ?? 0) : u; };
  const setActiveMeds = (u) => { __s.activeMeds = typeof u === 'function' ? u(__s.activeMeds ?? []) : u; };
  const setIntravascularVolume = (u) => { __s.intravascularVolume = typeof u === 'function' ? u(__s.intravascularVolume ?? 0) : u; };
  const setTotalBodyWaterLiters = (u) => { __s.totalBodyWaterLiters = typeof u === 'function' ? u(__s.totalBodyWaterLiters ?? 0) : u; };
  const setSurgicalPhase = (u) => { __s.surgicalPhase = typeof u === 'function' ? u(__s.surgicalPhase ?? 'Pre-Op') : u; };
  const setGasModels = (u) => { __s.gasModels = typeof u === 'function' ? u(__s.gasModels ?? {}) : u; };

        const safeBaseVitals = activeCase.baseVitals || {};
        const baseDia = typeof safeBaseVitals.dia === 'number' && Number.isFinite(safeBaseVitals.dia) ? safeBaseVitals.dia : 80;
        const baseSys = typeof safeBaseVitals.sys === 'number' && Number.isFinite(safeBaseVitals.sys) ? safeBaseVitals.sys : 120;
        const baseHr = typeof safeBaseVitals.hr === 'number' && Number.isFinite(safeBaseVitals.hr) && safeBaseVitals.hr > 0 ? safeBaseVitals.hr : 70;

        const initialMap = baseDia + ((baseSys - baseDia) / 3);
        const safePatientObj = activeCase.patient || {};
        const assumedBaseSV = safePatientObj.isObese ? 85 : 70; 
        let initialCO = (baseHr * assumedBaseSV) / 1000;
        if (isNaN(initialCO) || !Number.isFinite(initialCO) || initialCO <= 0.1) {
          initialCO = 5.0;
        }
        // Calculate SVR based on the closed-loop four-chamber model calibration (fitted linear model)
        const formulaHr = Math.max(40, Math.min(140, baseHr));
        let calculatedBaseSVR = (initialMap + 95.0 - 0.64 * formulaHr) / (0.165 - 0.000723 * formulaHr);
        if (isNaN(calculatedBaseSVR) || !Number.isFinite(calculatedBaseSVR) || calculatedBaseSVR <= 100.0) {
          calculatedBaseSVR = 1200.0;
        }
        calculatedBaseSVR = Math.max(500, Math.min(3000, calculatedBaseSVR));

        setVitals({ 
          ...safeBaseVitals, pip: 0, pplat: 0, vte: 0, bis: 98, temp: 37.0, 
          tofCount: 4, tofRatio: 1.0, perceivedTofCount: 4, perceivedTofRatio: 1.0, mac: 0, etAgent: 0, fiAgent: 0, etN2O: 0, fiN2O: 0, fiO2: 21, etO2: 21,
          pao2: safePatientObj.isObese ? 75 : 100, 
          paco2: safePatientObj.isObese ? 52 : 40, 
          ph: safePatientObj.isSeptic ? 7.22 : (safePatientObj.isObese ? 7.36 : 7.4), 
          co: initialCO, svr: calculatedBaseSVR, map: Math.round(initialMap), cmap: Math.round(initialMap), 
          metHb: 0.8, coHb: activeCase.id === 'trauma' ? 12.0 : 1.0, cyanide: 0.0, lacticAcid: safePatientObj.isSeptic ? 4.5 : 1.0,
          cao2: 20.0, cvo2: 15.0, p50: 26.6, r_ratio: 0.90,
          lesTone: 25.0, gastricPressure: 7.0, bowelGasVolume: 1.0, gutMotility: 1.0, inflammatoryIleus: 0.0, postoperativeIleus: 0.0,
          mPAP: 15.0, HVPG: 5.0, pbf: 1000.0, habf: 300.0, thbf: 1300.0, renalArteryResistance: 1.0, cvp: 5.0,
          mapUnder60Time: 0.0, mapUnder55Time: 0.0,
          mapUnder60AlertTriggered: false, mapUnder55AlertTriggered: false
        });
        setTargetVitals({ ...safeBaseVitals });
        
        const heightCm = typeof safePatientObj.height === 'number' && Number.isFinite(safePatientObj.height) ? safePatientObj.height : 170;
        const weightKg = typeof safePatientObj.weight === 'number' && Number.isFinite(safePatientObj.weight) ? safePatientObj.weight : 70;
        const sex = typeof safePatientObj.sex === 'string' ? safePatientObj.sex : 'male';
        
        const clampedHeight = Math.max(50.0, Math.min(250.0, heightCm));
        const clampedWeight = Math.max(5.0, Math.min(300.0, weightKg));
        const clampedAge = Math.max(1.0, Math.min(120.0, typeof safePatientObj.age === 'number' && Number.isFinite(safePatientObj.age) ? safePatientObj.age : 40));
        
        const ebv = typeof safePatientObj.ebv === 'number' && Number.isFinite(safePatientObj.ebv) && safePatientObj.ebv > 0 
          ? safePatientObj.ebv 
          : (clampedWeight * (sex.toLowerCase() === 'female' ? 65 : 75));
        const baseBleedRate = typeof safePatientObj.bleedRate === 'number' && Number.isFinite(safePatientObj.bleedRate) ? safePatientObj.bleedRate : (activeCase.id === 'trauma' ? 1.5 : 0.05); 

        const bmi = typeof safePatientObj.bmi === 'number' && Number.isFinite(safePatientObj.bmi) && safePatientObj.bmi > 0 
          ? safePatientObj.bmi 
          : (clampedWeight / Math.pow(clampedHeight / 100, 2));
        const position = typeof safePatientObj.position === 'string' ? safePatientObj.position : 'Supine';
        const lungVols = calculateLungVolumes(clampedHeight, clampedAge, sex, bmi, position, safePatientObj.copd || false, safePatientObj.restrictive || false);

        setPatient({
          ...safePatientObj, height: clampedHeight, weight: clampedWeight, sex, ebv, ebl: safePatientObj.ebl || 0, bleedRate: baseBleedRate,
          ibw: calculateIBW(clampedHeight, sex), 
          lbw: calculateLBW(clampedHeight, clampedWeight, sex),
          lbm: calculateHumeLBM(clampedHeight, clampedWeight, sex),
          ffm: calculateJanmahasatianFFM(clampedHeight, clampedWeight, sex),
          cbw: calculateCBW(clampedHeight, clampedWeight, sex),
          mffm: calculateMFFM(clampedHeight, clampedWeight, sex),
          pkm: calculatePKM(clampedWeight),
          lungVolumes: lungVols,
          position: position,
          isApneic: false, isParalyzed: false, isTopicalized: false,
          airwaySecured: false, airwayExamined: false, ventilationStatus: 'spontaneous',
          hasIV: false, hasALine: false, currentO2Device: 'Room Air', currentO2Flow: 0, currentFiO2: 21,
          oxygenBuffer: lungVols.frc_L * 0.21, 
          hasBisMonitor: false, hasTofMonitor: false, tofMonitorMode: 'quantitative',
          qualityEvents: [],
          // Captured once at case start for PACU/Aldrete-style readiness scoring ("circulation
          // within 20% of baseline" criterion) - see OutcomeScoringEngine.ts.
          baselineMap: Math.round(initialMap), baselineHr: baseHr,
          isArrest: false, cardiacRhythm: 'normal', cprActive: false, ischemicDamage: 0, biologicalDeath: false, myocardialStunning: 0,
          arrestThreshold: 1200, codeStartTime: null, apneaStartTime: null,
          shuntFraction: activeCase.id === 'trauma' ? 0.20 : (safePatientObj.isObese ? 0.12 : 0.05),
          // Disease models that multiply drugSvrMod (PEC +40%, sepsis -40%) will double-count
          // if patientBaseSVR is computed from the already-diseased starting vitals. Use the
          // normotensive equivalent so the model's multiplier reproduces the correct initial MAP.
          patientBaseSVR: safePatientObj.hasPreeclampsia ? Math.round(calculatedBaseSVR / 1.4) :
                          safePatientObj.isSeptic ? Math.round(calculatedBaseSVR / 0.6) :
                          calculatedBaseSVR,
          // Sepsis: start at maximum score (3) so sepsisVasoplegiaMod=0.6 × adjusted
          // patientBaseSVR reproduces the initial vitals on the first tick instead of
          // defaulting to 0.5 and crashing further below the presenting MAP.
          sepsisScore: safePatientObj.isSeptic ? 3.0 : 0,
          patientBaseSV: assumedBaseSV,
          patientBaseHR: baseHr,
          patientBaseSBP: safeBaseVitals.sys || 120,
          patientBaseDBP: safeBaseVitals.dia || 80,
          oculocardiacTriggered: false,
          patientBaseRR: safeBaseVitals.rr || 12,
          lastAirwayManipulationTime: -999,
          lastAirwayManipulationType: '',
          laryngoscopyActive: false,
          laryngoscopyTime: -999,
          cricPlacedTime: -999,
          cricSympatheticSurgeActive: false,
          ioPlacedTime: -999,
          ioSympatheticSurgeActive: false,
          lastLinePlacementTime: -999,
          lastLineCategory: '',
          
          metHb: 0.8,
          coHb: activeCase.id === 'trauma' ? 12.0 : 1.0,
          cyanide: 0.0,
          lacticAcid: safePatientObj.isSeptic ? 4.5 : 1.0,
          glp1Held: activeCase.id === 'obese' ? false : true,
          nAChR_state: activeCase.id === 'trauma' ? 'upregulated' : 'normal',
          ivGauge: '18G',
          fluidLine: 'gravity',
          stomach: activeCase.id === 'obese' ? 'full' : (activeCase.id === 'trauma' ? 'full' : 'empty'),
          fluidInfusing: null,
          suxPotassiumLeaked: false,
          mhActive: false,
          charcoalFiltersPlaced: false,
          mhStartTime: null,
          dantroleneGiven: false,
          isSeizure: false,
          celiacBlockActive: safePatientObj.celiacBlockActive || false,
          epiduralBlockActive: safePatientObj.epiduralBlockActive || false,
          epiduralLevel: typeof safePatientObj.epiduralLevel === 'number' ? safePatientObj.epiduralLevel : null,
          swallowingActive: safePatientObj.swallowingActive || false,
          manipulationIndex: typeof safePatientObj.manipulationIndex === 'number' ? safePatientObj.manipulationIndex : 0.0,
          hasRegurgitated: false,
          hasAspirated: false,

          // Hepatic states
          cirrhosisFactor: safePatientObj.cirrhosisFactor || 0.0,
          bilirubin: safePatientObj.bilirubin || 1.0,
          inr: safePatientObj.inr || 1.0,
          creatinine: (() => {
              if (safePatientObj.creatinine !== undefined) return safePatientObj.creatinine;
              if (safePatientObj.renalComorbidity) {
                  const ren = safePatientObj.renalComorbidity.toLowerCase();
                  if (ren.includes('stage 5') || ren.includes('dialysis')) return 5.2;
                  if (ren.includes('stage 4')) return 2.8;
                  if (ren.includes('stage 3')) return 1.8;
                  if (ren.includes('stage 2')) return 1.3;
                  if (ren.includes('aki')) return 2.2;
              }
              return 0.85;
          })(),
          albumin: safePatientObj.albumin || 4.0,
          encephalopathyGrade: safePatientObj.encephalopathyGrade || 0,
          ascitesDegree: safePatientObj.ascitesDegree || 0,
          surgicalProcedure: safePatientObj.surgicalProcedure || '',
          varicealBleedingActive: false,
          varicealBleedTime: null,
          hasPoPHCollapse: false,
          hasTIPS: safePatientObj.hasTIPS || false,

          // Renal states
          gfr: (() => {
              if (safePatientObj.gfr !== undefined) return safePatientObj.gfr;
              if (safePatientObj.renalComorbidity) {
                  const ren = safePatientObj.renalComorbidity.toLowerCase();
                  if (ren.includes('stage 5') || ren.includes('dialysis')) return 12.5;
                  if (ren.includes('stage 4')) return 25.0;
                  if (ren.includes('stage 3')) return 45.0;
                  if (ren.includes('stage 2')) return 75.0;
                  if (ren.includes('aki')) return 35.0;
              }
              return 125.0;
          })(),
          rbf: 1100.0,
          bun: (() => {
              if (safePatientObj.bun !== undefined) return safePatientObj.bun;
              if (safePatientObj.renalComorbidity) {
                  const ren = safePatientObj.renalComorbidity.toLowerCase();
                  if (ren.includes('stage 5') || ren.includes('dialysis')) return 74.0;
                  if (ren.includes('stage 4')) return 42.0;
                  if (ren.includes('stage 3')) return 28.0;
                  if (ren.includes('stage 2')) return 18.0;
                  if (ren.includes('aki')) return 32.0;
              }
              return 12.0;
          })(),
          urineOutput: 0.0,
          urineOutputRate: 70.0,
          urineOsmolality: 350.0,
          feNa: 1.0,
          akiStage: 0,
          akiDamage: 0.0,
          uopOliguriaTimer: 0,
          uopAnuriaTimer: 0,
          baselineCreatinine: (() => {
              if (safePatientObj.baselineCreatinine !== undefined) return safePatientObj.baselineCreatinine;
              if (safePatientObj.creatinine !== undefined) return safePatientObj.creatinine;
              if (safePatientObj.renalComorbidity) {
                  const ren = safePatientObj.renalComorbidity.toLowerCase();
                  if (ren.includes('stage 5') || ren.includes('dialysis')) return 5.2;
                  if (ren.includes('stage 4')) return 2.8;
                  if (ren.includes('stage 3')) return 1.8;
                  if (ren.includes('stage 2')) return 1.3;
                  if (ren.includes('aki')) return 2.2;
              }
              return 0.85;
          })(),
          baselineBun: (() => {
              if (safePatientObj.baselineBun !== undefined) return safePatientObj.baselineBun;
              if (safePatientObj.bun !== undefined) return safePatientObj.bun;
              if (safePatientObj.renalComorbidity) {
                  const ren = safePatientObj.renalComorbidity.toLowerCase();
                  if (ren.includes('stage 5') || ren.includes('dialysis')) return 74.0;
                  if (ren.includes('stage 4')) return 42.0;
                  if (ren.includes('stage 3')) return 28.0;
                  if (ren.includes('stage 2')) return 18.0;
                  if (ren.includes('aki')) return 32.0;
              }
              return 12.0;
          })(),
          vasopressinLevel: 0.1,
          aldosteroneLevel: 0.1,
          angiotensinIILevel: 0.1,
          osm: 285.0,
          hasAki: false,
          hasPrerenalOliguria: false,
          hasFluidOverloadEdema: false,
          netFluidBalance: 0.0,
          mapUnder60Time: 0.0,
          mapUnder55Time: 0.0,
          mapUnder60AlertTriggered: false,
          mapUnder55AlertTriggered: false,
          cortexRbf: 1034.0,
          medullaRbf: 66.0,
          cortexPo2: 50.0,
          medullaPo2: 8.0,
          cortexO2Extraction: 0.18,
          medullaO2Extraction: 0.79,
          glomerularCapillaryPressure: 60.0,
          bowmanSpacePressure: 18.0,
          glomerularOncoticPressure: 32.0,
          netFiltrationPressure: 10.0,

          // Consciousness & Memory states
          lcActivity: 1.0,
          tmnActivity: 1.0,
          vlpoActivity: 0.0,
          mnpoActivity: 0.0,
          ldtPptActivity: 1.0,
          prfActivity: 1.0,
          vtaActivity: 1.0,
          orexinLevel: safePatientObj.narcolepsy ? 0.1 : 1.0,
          slowOscillationPower: 0.1,
          thalamocorticalConn: 1.0,
          frontoparietalFeedback: 1.0,
          corticocorticalConn: 1.0,
          basalGangliaConn: 1.0,
          explicitEncoding: 1.0,
          explicitConsolidation: 0.1,
          ltpInductionInhibited: false,
          neuralInertiaLag: 0.0,
          alpha5Knockout: safePatientObj.alpha5Knockout || false,
          alpha4Knockout: safePatientObj.alpha4Knockout || false,
          tmnPropofolResistant: safePatientObj.tmnPropofolResistant || false,
          narcolepsy: safePatientObj.narcolepsy || false,
          alpha2AKnockout: safePatientObj.alpha2AKnockout || false,
          sleepStage: safePatientObj.sleepStage || 'W',
          sleepTimeInStage: safePatientObj.sleepTimeInStage || 0,
          sleepDebt: typeof safePatientObj.sleepDebt === 'number' ? safePatientObj.sleepDebt : 0.0,
          postOpSleepNight: typeof safePatientObj.postOpSleepNight === 'number' ? safePatientObj.postOpSleepNight : 0,
          remReboundIntensity: typeof safePatientObj.remReboundIntensity === 'number' ? safePatientObj.remReboundIntensity : 1.0,
          
          isAwarenessActive: false,
          ptsdScore: 0.0,
          hasExplicitRecall: false,
          hasImplicitRecall: false,
          isDreaming: false,
          displayEmergenceLag: false,
          isF6Active: false,
          isF3Active: false,
          rightAmygdaloHippocampalConn: 1.0,
          leftAmygdaloHippocampalConn: 1.0,
          nbmHippocampalConn: 1.0,
          soPhaseCouplingDecay: 0.0,
          hippocampalRecollection: 1.0,
          perirhinalFamiliarity: 1.0,
          caudateProcedural: 1.0,
          isTASK1Knockout: safePatientObj.isTASK1Knockout || false,
          isTASK3Knockout: safePatientObj.isTASK3Knockout || false,
          isTREK1Knockout: safePatientObj.isTREK1Knockout || false,
          isHCN1Knockout: safePatientObj.isHCN1Knockout || false,
          gabaa_occupancy: 0.0,
          glycine_occupancy: 0.0,
          k2p_activation: 0.0,
          nmda_blockade: 0.0,
          hcn_inhibition: 0.0,
          nav_blockade: 0.0,
          nachr_inhibition: 0.0,
          tfaAdducts: 0.0,
          AST: safePatientObj.AST || 25.0,
          ALT: safePatientObj.ALT || 25.0,
          bilirubin: safePatientObj.bilirubin || 1.0,
          inr: safePatientObj.inr || 1.0,
          albumin: safePatientObj.albumin || 4.0,
          isHepatitisActive: false,
          priorAnestheticExposure: safePatientObj.priorAnestheticExposure || false,
          serumFluoride: 0.0,
          accumulatedFluorideTime: 0.0,
          hasFluorideNephrotoxicity: false,
          coHb: activeCase.id === 'trauma' ? 12.0 : 1.0,
          compoundA: 0.0,
          absorbent: { waterContent: 15.0, temperature: 22.0, type: 'soda_lime' },
          isAirwayFire: false,
          methionineSynthaseActivity: 1.0,
          homocysteine: 10.0,
          b12Baseline: safePatientObj.b12Baseline || 400.0,
          pediatricNeuroRisk: 0.0,
          pocdRisk: 0.0,
          ciliaBeatFrequency: 100.0,
          ciliaryAtelectasisAccumulation: 0.0,
          isMucusPlugged: false,
          surfactantProduction: 100.0,
          hpvInhibition: 0.0,
          intercostalContribution: 1.0,
          diaphragmContribution: 1.0,
          isParadoxicalBreathing: false,
          dilatorMuscleTone: 1.0,
          airwayObstructionIndex: 0.0,
          isAirwayObstruction: false,
          postExtubationLaryngealEdema: false,
          bronchialSmoothMuscleCa: 1.0,
          atelectasis: 0.0,
          recruitmentTime: 0.0,
          isO2PipelineCrossover: false,
          isO2CylinderOpen: false,
          isO2PipelineDisconnected: false,
          isOxygenFlushPressed: false,
          breathingCircuitType: 'circle',
          co2AbsorptiveCapacity: 100.0,
          stuckExpiratoryValve: false,
          stuckInspiratoryValve: false,
          aplValveSetting: 0.0,
          hasPneumothorax: false,
          lipidSinkVol: 0.0,
          prInterval: 160.0,
          qrsDuration: 80.0,
          isLAST: false,
          lastSeizureTriggered: false,
          hasMetHbLog: false,
          lastMetHbLogTime: 0,

          // Cerebral states (Chapter 11)
          cbf: 50.0,
          cmro2: 3.3,
          cpp: 80.0,
          cbv: 1.0,
          icp: 10.0,
          brainVolume: 1300.0,
          csfVolume: 130.0,
          intracranialVolumeOffset: safePatientObj.intracranialVolumeOffset || 0.0,
          complianceState: safePatientObj.complianceState || 'normal',
          hasCerebralIschemia: false,
          rso2: 70.0,
          isBBBOpen: safePatientObj.isBBBOpen || false,
          cerebralElastance: safePatientObj.cerebralElastance,
          urinaryRetentionActive: false,
          bladderVolume: 0.0,
          hasFoley: false,
          opioidReceptorGenotype: safePatientObj.opioidReceptorGenotype || 'A118A',

          highSpinalApneaLogged: false,

          // === PREECLAMPSIA ===
          hasPreeclampsia: !!safePatientObj.hasPreeclampsia,
          prevPECHypertensiveLogged: false,
          prevEclampsiaLogged: false,
          prevHELLPLogged: false,
          prevMgToxicLogged: false,
          prevPECAirwayEdemaLogged: false,
          pecSvrContribution: 0,

          // === AMNIOTIC FLUID EMBOLISM ===
          afeActive: !!safePatientObj.afeActive,
          afeOnsetTime: null,
          prevAFEOnsetLogged: false,
          prevAFEPhase2Logged: false,

          // === ACETAMINOPHEN HEPATOTOXICITY ===
          apapCumulativeDoseMg: 0,
          apapFirstDoseTime: null,
          nacActive: false,
          prevAPAPHepToxLogged: false,
          prevAPAPALFLogged: false,
          prevNACSuccessLogged: false,

          finkEffectLogged: false,
          n2oDiffusionHypoxiaShunt: 0,
          isbActive: !!safePatientObj.isbActive,
          isbPhrenicPalsyLogged: false,

          // === CARDIOPULMONARY BYPASS ===
          cpbActive: false,
          cpbStartTime: null,
          cpbFlowRateLMin: 4.5,
          cpbTemperatureC: 37,
          aortaClamped: false,
          cpbPrimeVolumeMl: 1500,
          prevCPBOnsetLogged: false,
          prevCPBClampLogged: false,
          prevProtamineLogged: false,
          prevCPBWeaningLogged: false,

          // === PERIOPERATIVE GLUCOSE ===
          prevHyperglycemiaLogged: false,
          prevHypoglycemiaLogged: false,
          prevSGLT2Logged: false,
          prevMetforminLogged: false,
          sglt2Inhibitor: !!safePatientObj.sglt2Inhibitor,
          glp1Agonist: !!safePatientObj.glp1Agonist,
          sulfonylurea: !!safePatientObj.sulfonylurea,
          metforminOnDayOfSurgery: !!safePatientObj.metformin,
          previousGlucose: 100,

          // === MASSIVE TRANSFUSION ===
          isActiveMTP: false,
          txaGiven: false,
          txaAdminTime: null,
          prevMTPLogged: false,
          prevMTPTXALogged: false,
          prevMTPCalciumLogged: false,

          // === LABOR EPIDURAL ===
          laborEpiduralActive: false,
          laborStage: 1,
          laborBupiConc: 0.0625,
          laborFentanylConc: 2,
          isCSEActive: false,
          prevLaborEpiduralLogged: false,
          prevHighBlockLogged: false,
          prevFetalBradyLogged: false,
          prevLaborEpiHypotensionLogged: false,

          // === MALNUTRITION / FRAILTY ===
          prevMalnutritionLogged: false,
          prevRefeedingLogged: false,
          prevFrailtyLogged: false,
          isStarved: !!safePatientObj.isStarved,
          starvationDays: safePatientObj.starvationDays || 0,

          // === LIVER TRANSPLANT ===
          meldScore: safePatientObj.meldScore || 10,
          isALF: !!safePatientObj.isALF,
          hasHepPulmonarySyndrome: !!safePatientObj.hasHepPulmonarySyndrome,
          oltPhase: safePatientObj.oltPhase || 'pre_anhepatic',
          anhepticStartTimeSec: null,
          reperfusionStartTimeSec: null,
          prevAnhepaticLogged: false,
          prevReperfusionLogged: false,
          prevHPSLogged: false,

          // === CHRONIC OPIOID TOLERANCE + DELIRIUM ===
          isChronicOpioidUser: !!safePatientObj.chronicOpioidUser,
          morphineEquivalentDosePerDay: safePatientObj.medd || 0,
          onMethadone: !!safePatientObj.methadone,
          onBuprenorphine: !!safePatientObj.buprenorphine,
          hasBaselineCognitivImpairment: !!safePatientObj.dementia,
          hasFrailty: !!safePatientObj.frailty,
          prevChronicOpioidLogged: false,
          prevWithdrawalLogged: false,
          prevDeliriumLogged: false,

          // === CKD/ESRD PERIOPERATIVE ===
          isOnDialysis: !!safePatientObj.dialysis,
          daysSinceLastDialysis: safePatientObj.daysSinceLastDialysis || 1,
          prevCKDWarningLogged: false,
          prevUremiaPlateletLogged: false,
          prevHyperKSuxCKDLogged: false,

          // === ARRHYTHMIA MANAGEMENT ===
          hasWPW: !!safePatientObj.hasWPW,
          wpwHasAF: false,
          prevSVTLogged: false,
          prevWPWLogged: false,
          prevVTLogged: false,

          // === ANGIOEDEMA + STATUS ASTHMATICUS ===
          angioedemaPresent: !!safePatientObj.angioedemaPresent,
          angioedemaOnsetTime: null,
          hasHAE: !!safePatientObj.hasHAE,
          aceInhibitorActive: !!safePatientObj.aceInhibitorActive,
          statusAsthmaticusActive: false,
          statusAsthmaticusOnsetTime: null,
          helioxActive: false,
          prevAngioedemaLogged: false,
          prevAngioedemaAirwayLogged: false,
          prevStatusAsthmaLogged: false,
          prevAutoPEEPLogged: false,

          // === CARDIAC TAMPONADE + TAKOTSUBO ===
          pericardialEffusionMl: safePatientObj.pericardialEffusionMl || 0,
          effusionAccumulationRateMlMin: 0,
          isChronicEffusion: !!safePatientObj.isChronicEffusion,
          pericardiocentesisDone: false,
          pericardiocentesisVolumeMl: 0,
          takotsuboActive: false,
          takotsuboOnsetTime: null,
          prevTamponadeLogged: false,
          prevTakotsuboLogged: false,

          // === MULTIPLE ANAPHYLAXIS ===
          hasKnownLatexAllergy: !!safePatientObj.latexAllergy,
          hasSpinaBifida: !!safePatientObj.spinaBifida,
          latexExposure: false,
          chlorhexidineExposure: false,
          blueDyeExposure: false,
          prevNMBAAnaphLogged: false,
          prevLatexAnaphLogged: false,
          prevCefAnaphLogged: false,
          prevChlorhexLogged: false,
          prevBlueDyeLogged: false,

          // === DIFFICULT AIRWAY ===
          prevDifficultyAirwayLogged: false,
          prevFailedIntubLogged: false,
          prevCICOLogged: false,
          intubationAttemptsMade: 0,
          cormackLehaneGrade: 1,
          sgaInPlace: false,
          sgaVentilating: false,
          cicoActive: false,
          cricothyroidotomyDone: false,

          // === TUMOR LYSIS / ELECTROLYTE ===
          tlsActive: !!safePatientObj.tlsActive,
          tlsRiskLevel: safePatientObj.tlsRiskLevel || 'intermediate',
          tlsOnsetTime: null,
          allopurinolActive: false,
          rasburicaseActive: false,
          prevTLSLogged: false,
          prevHypoCaLogged: false,
          prevHypoMgLogged: false,
          prevHypoNaLogged: false,
          magnesiumLevel: safePatientObj.magnesiumLevel || 1.8,
          phosphorusLevel: safePatientObj.phosphorusLevel || 3.5,

          // === DIGOXIN TOXICITY ===
          prevDigoxinToxLogged: false,
          prevDigoxinSevereLogged: false,

          // === HYPERTENSIVE EMERGENCY ===
          aorticDissectionPresent: !!safePatientObj.aorticDissectionPresent,
          dissectionType: safePatientObj.dissectionType || 'B',
          prevHyperEmergencyLogged: false,
          prevDissectionLogged: false,
          prevEncephalopathyLogged: false,

          // === SICKLE CELL ===
          hasSickleCellDisease: !!safePatientObj.hasSickleCellDisease,
          hbSPercent: safePatientObj.hbSPercent || 85,
          vocActive: false,
          acsActive: false,
          acsOnsetTime: null,
          prevVOCLogged: false,
          prevACSLogged: false,

          // === ACUTE PORPHYRIA ===
          hasAcutePorphyria: !!safePatientObj.hasAcutePorphyria,
          porphyriaAttackActive: false,
          porphyriaAttackStartTime: null,
          heminGiven: false,
          prevPorphyriaLogged: false,
          prevPorphyriaParalysisLogged: false,

          // === SPECIAL SURGERY ===
          tourniquetActive: false,
          tourniquetStartTime: null,
          laserActive: false,
          laserResistantETT: false,
          openGlobeInjury: !!safePatientObj.openGlobeInjury,
          adequateEyePads: true,
          headDownAngleDegrees: 0,
          prevEyePressureLogged: false,
          prevFacialEdemaLogged: false,
          prevTourniquetPainLogged: false,
          prevFireRiskLogged: false,
          prevIopLogged: false,

          // === PDPH ===
          dptOccurred: !!safePatientObj.dptOccurred,
          dptNeedleGauge: safePatientObj.dptNeedleGauge || 17,
          dptNeedleType: safePatientObj.dptNeedleType || 'cutting',
          dptTimeHours: 0,
          bloodPatchGiven: false,
          caffeineActive: false,
          caffeineDose: 0,
          prevPDPHOnsetLogged: false,
          prevBloodPatchLogged: false,

          // === TACO ===
          prbcVolumeReceivedMl: 0,
          ffpVolumeReceivedMl: 0,
          prevTACOLogged: false,
          prevTACOSevereLogged: false,

          // === TOXIDROME ===
          organophosphatePoisoning: !!safePatientObj.organophosphatePoisoning,
          organophosphateConcentration: safePatientObj.organophosphateConcentration || 0,
          prevAnticholinLogged: false,
          prevCholinergicLogged: false,
          prevCholinergicSevereLogged: false,

          // === CEA / REPERFUSION ===
          ceaActive: !!safePatientObj.ceaActive,
          carotidClamped: false,
          carotidShuntInPlace: false,
          carotidStumpPressureMmHg: 60,
          ipsilateralRSO2Baseline: 68,
          carotidBodyManipulation: false,
          reperfusionActive: false,
          reperfusionType: safePatientObj.reperfusionType || 'hepatic',
          ischemicDurationMinutes: 0,
          reperfusionStartTime: null,
          coldPreservationSolution: false,
          preservationKMEqL: 115,
          prevCEAClampLogged: false,
          prevCEAIschemiaLogged: false,
          prevReperfusionLogged: false,
          prevHyperperfusionLogged: false,
          prevCarotidBodyLogged: false,

          // === PERIOPERATIVE MI ===
          ischemicBurdenAccumulator: 0,
          troponinNgL: 3,
          troponinPeakNgL: 3,
          miActiveType1: false,
          miActiveType2: false,
          miOnsetTime: null,
          prevIschemiaLogged: false,
          prevMIType1Logged: false,
          prevMIType2Logged: false,
          prevTroponinAlertLogged: false,

          // === FAT EMBOLISM ===
          femActive: !!safePatientObj.femActive,
          femTriggerType: safePatientObj.femTriggerType || 'fracture',
          femOnsetTime: null,
          prevFEMOnsetLogged: false,
          prevFEMSevereLogged: false,

          // === PULMONARY HYPERTENSION ===
          phPresent: !!safePatientObj.phPresent,
          phWhoGroup: safePatientObj.phWhoGroup || null,
          phSeverity: safePatientObj.phSeverity || null,
          baselineMpap: safePatientObj.baselineMpap || null,
          inoActive: false,
          inoPpm: 0,
          inoJustStopped: false,
          inhaledEpoprostenolActive: false,
          inhaledEpoprostenolDose: 0,
          phRvInotropyPenalty: 0,
          prevPHCrisisLogged: false,
          prevRVFailureLogged: false,
          prevInoStartLogged: false,
          prevReboundLogged: false,

          // === ONE-LUNG VENTILATION ===
          olvActive: !!safePatientObj.olvActive,
          olvStartTimeSec: null,
          olvCpapCmH2O: 0,
          olvLateralOperativeLungUp: !!(safePatientObj.position === 'Lateral' || safePatientObj.olvLateralOperativeLungUp),
          dltInPlace: !!safePatientObj.dltInPlace,
          dltMalpositioned: false,
          olvShuntContribution: 0,
          olvCompliancePenaltyFraction: 0,
          prevOlvOnsetLogged: false,
          prevOlvHypoxiaLogged: false,

          // === CO POISONING ===
          smokeExposureActive: !!safePatientObj.smokeExposureActive,
          smokeSeverity: safePatientObj.smokeSeverity || 0,
          hyperbaricO2Active: false,
          prevCO20Logged: false,
          prevCO30Logged: false,
          prevCO40Logged: false,
          prevCO50Logged: false,

          // === BURNS ===
          burnsTBSAPercent: safePatientObj.burnsTBSAPercent || 0,
          hoursPostBurn: safePatientObj.hoursPostBurn || 0,
          inhalationInjury: !!safePatientObj.inhalationInjury,
          inhalationSeverity: safePatientObj.inhalationSeverity || 0.5,
          totalParklandGivenMl: 0,
          prevBurnOnsetLogged: false,
          prevInhalationLogged: false,
          prevAirwayEdemaLogged: false,
          prevParklandAlertLogged: false,
          inhalationInjuryCompliancePenalty: 0,
          inhalationInjuryResistancePenalty: 0,
          inhalationInjuryShuntContribution: 0
        });
        
        setTime(0); setActiveMeds([]); setIntravascularVolume(0); setSurgicalPhase('Pre-Op');
        
        const safeGasModels = {};
        Object.keys(INHALATIONAL_AGENTS).forEach(key => {
            if (INHALATIONAL_AGENTS[key]) {
                safeGasModels[key] = new GasKineticsModel(INHALATIONAL_AGENTS[key]);
            }
        });
        setGasModels(safeGasModels);
        
        setTotalBodyWaterLiters(clampedWeight * 0.6); 
        setElectrolytes({ na: 140, k: safePatientObj.trauma ? 5.2 : 4.0, cl: 100, ca: 9.0, ph: safePatientObj.isSeptic ? 7.2 : 7.4 });
        setCoags({ r_offset: safePatientObj.trauma ? 6 : 0, ma_offset: safePatientObj.trauma ? -15 : 0, angle_offset: safePatientObj.trauma ? -15 : 0 });

  return __s;
}

/**
 * Layer 1 (action handlers): the drug-administration handler, extracted verbatim from the hook so
 * the fuzzer can drive real medication pushes/infusions headless. ctx-injected exactly like
 * runPhysicsStep. See docs/architecture/audit_layer1_physics_core.md.
 */
export function processMedCore(ctx, medId, doseInput, route, type, unit, lineId = null, modelName = null) {
  const { stateRef, patient, activeMeds, setPatient, setActiveMeds, logEvent, logQualityEvent, setSurgicalPhase, setElectrolytes } = ctx;
    const currentPatient = stateRef.current.patient || patient;
    const currentActiveMeds = stateRef.current.activeMeds || activeMeds;

    const targetLine = lineId ? currentPatient.accessLines?.find(l => l.id === lineId) : null;
    let injectedArterial = false;
    if (targetLine && targetLine.category?.includes('Arterial')) {
        injectedArterial = true;
        if (medId === 'thiopental' || medId === 'methohexital') {
            const baseProb = 0.50;
            const willPrecipitate = currentPatient.forceBarbituratePrecipitation || (ensureRng(currentPatient, currentPatient.rngSeed)() < baseProb);
            if (willPrecipitate) {
                logEvent(`🚨 CRITICAL EMERGENCY: Injected Barbiturate ${medId === 'thiopental' ? 'Thiopental' : 'Methohexital'} into Arterial Line: ${targetLine.name}! This triggers immediate chemical endarteritis, microvascular crystal precipitation, profound arterial vasospasm, and severe distal limb ischemia!`);
                setPatient(prev => ({
                    ...prev,
                    barbiturateArterialPrecipitation: true,
                    barbiturateArterialPrecipitationTime: stateRef.current.time,
                    barbiturateArterialDrugName: medId === 'thiopental' ? 'Thiopental' : 'Methohexital'
                }));
            } else {
                logEvent(`⚠️ Clinical Note: Injected Barbiturate ${medId === 'thiopental' ? 'Thiopental' : 'Methohexital'} into Arterial Line: ${targetLine.name}. Fortunately, microvascular crystal precipitation did not occur (occurs in ~50% of intra-arterial injections). Monitor extremity for delayed vasospasm.`);
            }
        } else {
            logEvent(`🚨 CRITICAL ERROR: Injected ${medId} into Arterial Line: ${targetLine.name}! This causes immediate profound arterial vasospasm and endothelial irritation!`);
            setPatient(prev => ({
                ...prev,
                genericArterialSpasm: true,
                genericArterialSpasmTime: stateRef.current.time
            }));
        }
    }
    if (targetLine && targetLine.failed) {
        logEvent(`❌ FAILED: Cannot administer ${medId}. Access Line: ${targetLine.name} has been BLOWN OUT!`);
        return false;
    }
    const hasCVC = currentPatient.accessLines?.some(l => !l.failed && (l.category?.includes('CVC') || l.type?.includes('CVC') || l.category?.includes('Central') || l.type?.includes('Central') || l.type?.includes('Cordis') || l.type?.includes('Introducer')));
    const hasPIV = currentPatient.accessLines?.some(l => !l.failed && (l.category?.includes('PIV') || l.name?.includes('PIV') || l.category?.includes('IV') || l.name?.includes('IV') || l.category?.includes('Peripheral')));
    const hasIO = currentPatient.accessLines?.some(l => !l.failed && (l.category?.includes('IO') || l.name?.includes('IO') || l.type?.includes('IO') || l.type?.includes('Intraosseous')));
    const hasArt = currentPatient.accessLines?.some(l => l.category?.includes('Arterial') || l.name?.includes('Arterial'));

    if (route === 'IV' && !hasCVC && !hasPIV && !hasIO && !injectedArterial) {
        logEvent(`❌ FAILED: No venous access available for ${medId}!`);
        return false; 
    }

    const medData = MEDICATIONS[medId]; if (!medData) return false;

    // PharmacologicChoice quality event: administering a penicillin-class drug to a
    // documented-allergic patient is itself a decision error worth recording, independent of
    // whether anaphylaxis actually occurs this tick (that probabilistic outcome is handled
    // separately in the main tick loop's anaphylaxis trigger logic).
    if ((medId === 'unasyn' || medId === 'piperacillin_tazobactam') && (currentPatient.penicillinAllergy || (currentPatient.allergies || '').toLowerCase().includes('penicillin'))) {
        logQualityEvent({
            category: 'PharmacologicChoice', severity: 'critical',
            description: `Administered a penicillin-class antibiotic (${medData.name}) to a patient with a documented penicillin allergy.`,
            idealAction: 'Verify allergy history before administering a penicillin-class drug; select a non-cross-reacting alternative.',
            actualAction: `Administered ${medData.name} despite documented penicillin allergy.`,
            impact: 'Risk of IgE-mediated anaphylaxis (vasoplegic shock, bronchospasm) - probabilistically elevated 4x in patients with COPD/asthma/atopy/high anxiety.',
        });
    }

    const safePatientWeight = typeof currentPatient.weight === 'number' && Number.isFinite(currentPatient.weight) && currentPatient.weight > 0 ? currentPatient.weight : 70;
    const safePatientIbw = typeof currentPatient.ibw === 'number' && Number.isFinite(currentPatient.ibw) && currentPatient.ibw > 0 ? currentPatient.ibw : 70;
    const safePatientLbw = typeof currentPatient.lbw === 'number' && Number.isFinite(currentPatient.lbw) && currentPatient.lbw > 0 ? currentPatient.lbw : 60;

    if (type === 'TCI_Cp' || type === 'TCI_Ce') {
      const targetConc = parseFloat(doseInput);
      if (isNaN(targetConc) || targetConc <= 0) {
        logEvent(`❌ FAILED: Invalid target concentration specified!`);
        return false;
      }
      
      const mode = type === 'TCI_Cp' ? 'Cp' : 'Ce';
      const selectedModelName = modelName || medData.pkModel || 'Schnider';
      
      let existingModel = currentActiveMeds.find(m => m.name === medData.name);
      let updatedMeds = [...currentActiveMeds];
      if (!existingModel) { 
        existingModel = new PKPDModel(medData, safePatientWeight); 
        updatedMeds.push(existingModel); 
      }
      
      existingModel.setTci(mode, targetConc, selectedModelName, currentPatient);
      existingModel.displayDose = `target: ${targetConc}`;
      existingModel.displayUnit = 'mcg/mL';
      existingModel.medId = medId;

      const targetLineId = lineId || 
        (currentPatient.accessLines || []).find(l => !l.failed && (l.category?.includes('PIV') || l.name?.includes('PIV') || l.category?.includes('Peripheral')))?.id ||
        (currentPatient.accessLines || []).find(l => !l.category?.includes('Arterial'))?.id;
      if (targetLineId) {
        setPatient(prev => {
          const updatedLines = (prev.accessLines || []).map(l => {
            if (l.id !== targetLineId) return l;
            const meds = [...(l.activeMedInfusions || [])];
            const idx = meds.findIndex(m => m.medId === medId);
            const infItem = { medId, rate: 0.0, unit: `mcg/mL (TCI ${mode} - ${selectedModelName})` };
            if (idx >= 0) {
              meds[idx] = infItem;
            } else {
              meds.push(infItem);
            }
            return { ...l, activeMedInfusions: meds };
          });
          return { ...prev, accessLines: updatedLines };
        });
      }
      
      setActiveMeds(updatedMeds);
      logEvent(`🔁 Started TCI (${mode}-controlled) for ${medData.name} targeting ${targetConc} mcg/mL using ${selectedModelName} model.`);
      return true;
    }

    if (route === 'IV' && !hasCVC && (hasPIV || hasIO)) {
        if (type === 'Infusion' && medData.classes.some(c => c.includes('Vasopressor')) && medId !== 'phenylephrine') {
            logEvent(`⚠️ WARNING: Infusing ${medData.name} via Peripheral IV. High risk of extravasation and severe tissue necrosis. Central line strongly recommended.`);
        }
        if (medId === 'calcium') {
            logEvent(`⚠️ WARNING: Administering Calcium Chloride via PIV. High risk of severe phlebitis and tissue necrosis. Calcium Gluconate or CVC preferred.`);
        }
        if (medId === 'amiodarone' && type === 'Infusion') {
            logEvent(`⚠️ WARNING: Continuous Amiodarone infusion via PIV risks severe chemical phlebitis.`);
        }
    }

    let doseInMg = parseFloat(doseInput);
    if (isNaN(doseInMg) || !Number.isFinite(doseInMg) || doseInMg <= 0) {
        logEvent(`❌ FAILED: Invalid medication dose specified!`);
        return false;
    }

    const dosingWeight = resolveDosingWeight(medData, 'Bolus', currentPatient);
    const safeUnit = typeof unit === 'string' ? unit : '';
    if (safeUnit.includes('mcg/kg/min')) doseInMg = (doseInMg * dosingWeight) / 1000;
    else if (safeUnit.includes('mcg')) doseInMg = doseInMg / 1000;
    else if (safeUnit.includes('mg/kg') || safeUnit.includes('mL/kg') || safeUnit.includes('ml/kg') || safeUnit.includes('mL/kg/min') || safeUnit.includes('ml/kg/min')) doseInMg = doseInMg * dosingWeight;

    if (isNaN(doseInMg) || !Number.isFinite(doseInMg) || doseInMg <= 0) {
        logEvent(`❌ FAILED: Invalid calculated medication dose in mg!`);
        return false;
    }

    let existingModel = currentActiveMeds.find(m => m.name === medData.name);
    let updatedMeds = [...currentActiveMeds];
    if (!existingModel) { 
      existingModel = new PKPDModel(medData, safePatientWeight); 
      updatedMeds.push(existingModel); 
    }

    if (type === 'Bolus') {
      const bio = route === 'IV' ? 1.0 : (route === 'IM' ? 0.8 : 0.5);
      existingModel.giveBolus(doseInMg * bio);
      logEvent(`💉 Pushed ${doseInput} ${unit} of ${medData.name} via ${route}.`);

      // ACLS timing tracker: record when epinephrine is given during arrest.
      // Used by the ACLS console to display the inter-dose interval timer (every 3-5 min per AHA).
      if (medId === 'epinephrine') {
          setPatient(prev => ({ ...prev, lastEpiPushTime: stateRef.current.time || 0 }));
      }
      // Track amiodarone doses for second-dose guidance (300mg first, 150mg second)
      if (medId === 'amiodarone' && stateRef.current.patient?.isArrest) {
          setPatient(prev => ({
              ...prev,
              amioDosesGivenInArrest: (prev.amioDosesGivenInArrest || 0) + 1,
              lastAmioPushTime: stateRef.current.time || 0
          }));
      }

      if (medId === 'intralipid') {
          const volInMl = doseInMg * bio;
          setPatient(prev => ({
              ...prev,
              lipidSinkVol: (prev.lipidSinkVol || 0) + volInMl
          }));
          logEvent(`⚡ Administered Intralipid 20% rescue bolus: ${volInMl.toFixed(1)} mL.`);
      }

      if (medId === 'pcc') {
          setPatient(prev => ({
              ...prev,
              pccGiven: true
          }));
          logEvent(`⚡ 4-Factor PCC (Kcentra) active -- warfarin reversal initiated.`);
      }

      if (medId === 'andexanet') {
          setPatient(prev => ({
              ...prev,
              andexanetGiven: true
          }));
          logEvent(`⚡ Andexanet Alfa (Andexxa) active -- Factor Xa inhibitor reversal initiated.`);
      }

      if (medId === 'idarucizumab') {
          setPatient(prev => ({
              ...prev,
              idarucizumabGiven: true
          }));
          logEvent(`⚡ Idarucizumab (Praxbind) active -- dabigatran reversal initiated.`);
      }

      if (medId === 'rfviia') {
          const doseVal = parseFloat(doseInput);
          const incrementalMcgKg = safeUnit.includes('mcg/kg') ? doseVal : 90;
          setPatient(prev => ({
              ...prev,
              fviiaBolusMg: (prev.fviiaBolusMg || 0) + incrementalMcgKg
          }));
          logEvent(`⚡ Recombinant Factor VIIa (NovoSeven) active -- bypass pathway initiated. Cumulative dose: ${(currentPatient.fviiaBolusMg || 0) + incrementalMcgKg} mcg/kg.`);
      }

      if (medId === 'factor_viii') {
          const doseVal = parseFloat(doseInput);
          setPatient(prev => ({
              ...prev,
              fviiiBolusMg: (prev.fviiiBolusMg || 0) + doseVal
          }));
          logEvent(`⚡ Factor VIII Concentrate administered. Cumulative dose: ${(currentPatient.fviiiBolusMg || 0) + doseVal} Units/kg.`);
      }
      
      if (medId === 'sugammadex') {
        const roc = currentActiveMeds.find(m => m.name === 'Rocuronium');
        const vec = currentActiveMeds.find(m => m.name === 'Vecuronium');
        const doseMgPerKg = doseInMg / currentPatient.weight;
        // Dose-graded encapsulation. Now that chelate() reduces the effect-site Ce (F8 fix), these
        // fractions map to actual TOF recovery, so the high-dose tiers must reach ~complete: an
        // adequate rescue dose (>=16 mg/kg, or >=4 mg/kg for a deep block) restores TOF to 4/4, while
        // an under-dose (2 mg/kg on a deep block) only partially reverses — the clinically correct
        // dose/depth behaviour.
        let chelateFraction = 1.0;
        if (doseMgPerKg >= 16) chelateFraction = 1.0;
        else if (doseMgPerKg >= 8) chelateFraction = 0.99;
        else if (doseMgPerKg >= 4) chelateFraction = 0.97;
        else if (doseMgPerKg >= 2) chelateFraction = 0.85;
        else chelateFraction = doseMgPerKg / 2.0 * 0.85;
        
        chelateFraction = Math.min(1.0, chelateFraction);
        
        if (roc) {
          roc.chelate(chelateFraction);
          logEvent(`⚡ Sugammadex encapsulated Rocuronium (chelated ${Math.round(chelateFraction * 100)}%).`);
        }
        if (vec) {
          vec.chelate(chelateFraction);
          setPatient(prev => ({
            ...prev,
            vec3oh: Math.max(0, (prev.vec3oh || 0) * (1 - chelateFraction))
          }));
          logEvent(`⚡ Sugammadex encapsulated Vecuronium and its active 3-OH metabolite (chelated ${Math.round(chelateFraction * 100)}%).`);
        }
      }
 
      if (medId === 'succinylcholine') {
        let leak = 0.5; 
        let logMsg = `⚡ Succinylcholine administered. Normal transient potassium release (+0.5 mEq/L) observed.`;
        
        if (currentPatient.dmd || currentPatient.bmd) {
          leak = Math.max(0, 9.0 - (stateRef.current.electrolytes?.k || 4.0));
          logMsg = `🚨🚨 CRITICAL CLINICAL EMERGENCY: Succinylcholine given to patient with ${currentPatient.dmd ? 'Duchenne' : 'Becker'} Muscular Dystrophy! Triggered massive rhabdomyolysis and life-threatening hyperkalemic cardiac arrest!`;
          setPatient(prev => ({
              ...prev,
              isArrest: true,
              cardiacRhythm: 'pea',
              suxArrestTriggered: true
          }));
          logQualityEvent({
              category: 'PharmacologicChoice',
              severity: 'critical',
              description: `Succinylcholine administered to patient with ${currentPatient.dmd ? 'Duchenne' : 'Becker'} Muscular Dystrophy, triggering severe hyperkalemic cardiac arrest.`,
              idealAction: 'Avoid succinylcholine in patients with muscular dystrophy; use non-depolarizing muscle relaxants.',
              actualAction: 'Administered Succinylcholine.',
              impact: 'Acute rhabdomyolysis, lethal hyperkalemia, and PEA cardiac arrest.',
              chapterSource: "Miller's Anesthesia Chapter 35"
          });
        } else if (currentPatient.nAChR_state === 'upregulated') {
          leak = getAnatomicalParameter("Succinylcholine upregulated potassium leak", 5.2);
          logMsg = `🚨 CRITICAL CLINICAL EMERGENCY: Succinylcholine given to patient with nAChR upregulation! Extrajunctional receptors opened, triggering massive potassium leak (+${leak.toFixed(1)} mEq/L)!`;
        } else if (currentPatient.cmt) {
          leak = 4.2;
          logMsg = `🚨 CRITICAL CLINICAL EMERGENCY: Succinylcholine given to patient with Charcot-Marie-Tooth! Extra-junctional receptors opened, triggering severe potassium leak (+4.2 mEq/L)!`;
        } else if (currentPatient.cip) {
          leak = 4.8;
          logMsg = `🚨 CRITICAL CLINICAL EMERGENCY: Succinylcholine given to patient with Critical Illness Polyneuropathy! Extra-junctional receptors opened, triggering severe potassium leak (+4.8 mEq/L)!`;
        } else if (currentPatient.hyperPP) {
          // Chapter 35: Succinylcholine CONTRAINDICATED in HyperPP — aggravates myotonia, masseter spasm,
          // prolonged weakness, and worsens hyperkalemia via NaV1.4 channelopathy (Miller 9th Ed, Ch 35 p. 1139)
          leak = 2.5;
          logMsg = `🚨 CRITICAL: Succinylcholine given to patient with Hyperkalemic Periodic Paralysis! Prolonged muscle weakness, masseter spasm, and aggravated hyperkalemia (+2.5 mEq/L) triggered via NaV1.4 channelopathy!`;
          setPatient(prev => ({ ...prev, hyperPPAttackActive: true }));
          logQualityEvent({
              category: 'PharmacologicChoice',
              severity: 'critical',
              description: 'Succinylcholine administered to patient with Hyperkalemic Periodic Paralysis (HyperPP). This is CONTRAINDICATED — aggravates myotonia via NaV1.4 sustained sodium currents, causing masseter spasm and prolonged flaccid weakness.',
              idealAction: 'Avoid succinylcholine entirely in HyperPP; use non-depolarizing muscle relaxants.',
              actualAction: 'Administered Succinylcholine.',
              impact: 'Masseter spasm, prolonged skeletal muscle weakness, hyperkalemic exacerbation.',
              chapterSource: "Miller's Anesthesia Chapter 35"
          });
        }
        
        logEvent(logMsg);
        setElectrolytes(prev => ({ ...prev, k: prev.k + leak }));
        setPatient(prev => ({ ...prev, suxPotassiumLeaked: true }));
      }

      if (medId === 'neostigmine' || medId === 'pyridostigmine' || medId === 'edrophonium') {
        // Chapter 35: Cholinesterase inhibitors CONTRAINDICATED in HyperPP — aggravate myotonia (Miller 9th Ed, Ch 35 p. 1139)
        if (currentPatient.hyperPP) {
            setPatient(prev => ({ ...prev, hyperPPAttackActive: true }));
            logEvent(`🚨 CRITICAL: ${medData.name} administered to patient with Hyperkalemic Periodic Paralysis! Cholinesterase inhibitors aggravate myotonia in HyperPP patients — prolonged muscle stiffness and respiratory compromise triggered.`);
            logQualityEvent({
                category: 'PharmacologicChoice',
                severity: 'major',
                description: `${medData.name} administered to patient with Hyperkalemic Periodic Paralysis (HyperPP). Cholinesterase inhibitors are CONTRAINDICATED — they aggravate NaV1.4 myotonia.`,
                idealAction: 'Use sugammadex for NMB reversal in HyperPP patients; avoid neostigmine/pyridostigmine.',
                actualAction: `Administered ${medData.name}.`,
                impact: 'Aggravated myotonia, masseter spasm, respiratory muscle stiffness.',
                chapterSource: "Miller's Anesthesia Chapter 35"
            });
        }
        const glyco = currentActiveMeds.find(m => m.name === 'Glycopyrrolate');
        const glycoCe = glyco ? glyco.Ce : 0;
        const atropine = currentActiveMeds.find(m => m.name === 'Atropine');
        const atropineCe = atropine ? atropine.Ce : 0;
        
        const doseMgPerKg = doseInMg / currentPatient.weight;
        const lastOccupancy = stateRef.current.patient?.maxNMJOccupancy || 0;
        const noActiveBlock = lastOccupancy <= 0.15;
        
        let isOverdose = false;
        if (medId === 'neostigmine' && doseMgPerKg > 0.08) isOverdose = true;
        if (medId === 'pyridostigmine' && doseMgPerKg > 0.35) isOverdose = true;
        if (medId === 'edrophonium' && doseMgPerKg > 1.0) isOverdose = true;
        
        if (noActiveBlock || isOverdose) {
          setPatient(prev => ({ ...prev, neostigmineWeakness: true }));
          logEvent(`⚠️ WARNING: ${medData.name} administered ${noActiveBlock ? 'in the absence of active neuromuscular blockade' : 'in overdose'}. Paradoxical anticholinesterase-associated muscle weakness induced.`);
        }
        
        if (medId === 'neostigmine' || medId === 'pyridostigmine') {
          if (glycoCe < 0.05 && atropineCe < 0.05) {
            setPatient(prev => ({
              ...prev,
              bradycardiaTriggered: true,
              bradycardiaTime: stateRef.current.time || 0
            }));
            logEvent(`🚨 CRITICAL CLINICAL EMERGENCY: ${medData.name} administered without anticholinergic protection! Unopposed muscarinic activation is causing profound vagal bradycardia and salivation!`);
          } else if (glycoCe < 0.05 && atropineCe >= 0.05) {
            logEvent(`⚡ ${medData.name} administered with Atropine. Safe reversal of neuromuscular blockade initiated, although transient tachycardia may occur due to Atropine's rapid onset.`);
          } else {
            logEvent(`⚡ ${medData.name} administered with Glycopyrrolate. Safe reversal of neuromuscular blockade initiated.`);
          }
        } else if (medId === 'edrophonium') {
          if (atropineCe < 0.05 && glycoCe < 0.05) {
            setPatient(prev => ({
              ...prev,
              bradycardiaTriggered: true,
              bradycardiaTime: stateRef.current.time || 0
            }));
            logEvent(`🚨 CRITICAL CLINICAL EMERGENCY: Edrophonium administered without anticholinergic protection! Unopposed muscarinic activation is causing profound vagal bradycardia and salivation!`);
          } else if (atropineCe < 0.05 && glycoCe >= 0.05) {
            setPatient(prev => ({
              ...prev,
              bradycardiaTriggered: true,
              bradycardiaTime: stateRef.current.time || 0,
              transientBradycardia: true
            }));
            logEvent(`⚠️ CLINICAL ALERT: Edrophonium administered with Glycopyrrolate. Due to onset mismatch (Edrophonium onset is 1 min, Glycopyrrolate is 2-3 min), the patient will experience transient bradycardia before anticholinergic blockade takes effect.`);
          } else {
            logEvent(`⚡ Edrophonium administered with Atropine. Safe and rapid reversal of neuromuscular blockade initiated.`);
          }
        }
      }

      if (medId === 'glycopyrrolate' || medId === 'atropine') {
        if (currentPatient.bradycardiaTriggered) {
          setPatient(prev => ({ ...prev, bradycardiaTriggered: false, transientBradycardia: false }));
          logEvent(`✅ ${medData.name} administered. Muscarinic bradycardia successfully resolved. Heart rate recovering.`);
        }
      }

      if (medId === 'calcium') {
        setPatient(prev => ({
          ...prev,
          calciumStabilized: true,
          calciumStabilizedTime: stateRef.current.time || 0
        }));
        logEvent(`⚡ Calcium Chloride administered. Myocardial membranes stabilized. Hyperkalemic cardiac arrest risk mitigated.`);
      }

      if (stateRef.current.surgicalPhase === 'Pre-Op' && (medData.classes.includes('Sedative') || medData.classes.includes('Hypnotic') || medData.classes.includes('Dissociative'))) {
        setSurgicalPhase('Induction');
        logEvent(`➡️ Surgical Timeline Auto-Advanced: INDUCTION phase initiated.`);
        if (!currentPatient.timeOutAuthorized) {
          logQualityEvent({
            category: 'SafetyChecklist',
            severity: 'major',
            phase: 'Pre-Op',
            description: `Induction agent (${medData.name}) administered before the preoperative safety Time-Out checklist was conducted.`,
            idealAction: 'Perform the WHO Surgical Safety Checklist (Time-Out) before administering sedatives or hypnotics.',
            actualAction: `Administered ${medData.name} in Pre-Op.`,
            impact: 'Critical safety violation. Increases the risk of wrong-patient, wrong-procedure, or wrong-site medication errors.'
          });
        }
      }

    } else if (type === 'Infusion') {
      existingModel.setInfusion(doseInMg / 60);
      existingModel.displayDose = doseInput;
      existingModel.displayUnit = unit;
      existingModel.medId = medId; 

      const targetLineId = lineId || 
        (currentPatient.accessLines || []).find(l => !l.failed && (l.category?.includes('PIV') || l.name?.includes('PIV') || l.category?.includes('Peripheral')))?.id ||
        (currentPatient.accessLines || []).find(l => !l.category?.includes('Arterial'))?.id;

      if (targetLineId) {
        setPatient(prev => {
          const updatedLines = (prev.accessLines || []).map(l => {
            if (l.id !== targetLineId) return l;
            const meds = [...(l.activeMedInfusions || [])];
            const idx = meds.findIndex(m => m.medId === medId);
            if (idx >= 0) {
              meds[idx] = { ...meds[idx], rate: parseFloat(doseInput), unit };
            } else {
              meds.push({ medId, rate: parseFloat(doseInput), unit });
            }
            return { ...l, activeMedInfusions: meds };
          });
          return { ...prev, accessLines: updatedLines };
        });
      }
      logEvent(`🔁 Started/Updated ${medData.name} infusion at ${doseInput} ${unit}.`);
    } else if (type === 'Stop Infusion') {
      existingModel.setInfusion(0);
      existingModel.displayDose = 0;
      existingModel.tciMode = 'none';
      existingModel.tciTarget = 0;
      
      setPatient(prev => {
        const updatedLines = (prev.accessLines || []).map(l => ({
          ...l,
          activeMedInfusions: (l.activeMedInfusions || []).filter(m => m.medId !== medId)
        }));
        return { ...prev, accessLines: updatedLines };
      });
      logEvent(`⏹ Stopped ${medData.name} infusion.`);
    }
    setActiveMeds(updatedMeds);
}

export function usePhysiology({ activeCase, isRunning, setIsRunning, isPaused, ventSettings, gasSettings, logEvent, msmaidsComplete }) {
  const [timeVal, setTimeState] = useState(0);
  const [vitalsVal, setVitalsState] = useState({});
  const [targetVitalsVal, setTargetVitalsState] = useState({});
  const [patientVal, setPatientState] = useState({});
  const [activeMedsVal, setActiveMedsState] = useState([]);
  const [gasModels, setGasModels] = useState({});
  
  const [intravascularVolumeVal, setIntravascularVolumeState] = useState(0); 
  const [totalBodyWaterLitersVal, setTotalBodyWaterLitersState] = useState(42);
  const [electrolytesVal, setElectrolytesState] = useState({ na: 140, k: 4.0, cl: 100, ca: 9.0, ph: 7.4 });
  const [coagsVal, setCoagsState] = useState({ r_offset: 0, ma_offset: 0, angle_offset: 0 });
  const [surgicalPhaseVal, setSurgicalPhaseState] = useState('Pre-Op');
  const [prevCaseId, setPrevCaseId] = useState(null);

  const ffRemainingRef = useRef(0);
  const ffTotalRef = useRef(0);

  // Synchronous State Setter Wrappers to synchronously bridge changes into stateRef
  const stateRef = useRef({ time: timeVal, vitals: vitalsVal, targetVitals: targetVitalsVal, patient: patientVal, activeMeds: activeMedsVal, gasModels, intravascularVolume: intravascularVolumeVal, electrolytes: electrolytesVal, ventSettings, gasSettings, surgicalPhase: surgicalPhaseVal, msmaidsComplete });

  const setTime = (update) => {
    const prev = stateRef.current.time !== undefined ? stateRef.current.time : timeVal;
    const next = typeof update === 'function' ? update(prev) : update;
    stateRef.current.time = next;
    setTimeState(next);
  };

  const setVitals = (update) => {
    const prev = stateRef.current.vitals || vitalsVal;
    const next = typeof update === 'function' ? update(prev) : { ...prev, ...update };
    stateRef.current.vitals = next;
    setVitalsState(next);
  };

  const setTargetVitals = (update) => {
    const prev = stateRef.current.targetVitals || targetVitalsVal;
    const next = typeof update === 'function' ? update(prev) : { ...prev, ...update };
    stateRef.current.targetVitals = next;
    setTargetVitalsState(next);
  };

  const setPatient = (update) => {
    const prev = stateRef.current.patient || patientVal;
    const next = typeof update === 'function' ? update(prev) : { ...prev, ...update };
    
    // Sync fast-forward refs ONLY if they were explicitly changed by the update (not just spread from prev)
    if (next.fastForwardRemaining !== undefined && next.fastForwardRemaining !== prev.fastForwardRemaining) {
      ffRemainingRef.current = next.fastForwardRemaining || 0;
    }
    if (next.fastForwardTotal !== undefined && next.fastForwardTotal !== prev.fastForwardTotal) {
      ffTotalRef.current = next.fastForwardTotal || 0;
    }

    stateRef.current.patient = next;
    setPatientState(next);
  };

  const setActiveMeds = (update) => {
    const prev = stateRef.current.activeMeds || activeMedsVal;
    const next = typeof update === 'function' ? update(prev) : update;
    stateRef.current.activeMeds = next;
    setActiveMedsState(next);
  };

  const setIntravascularVolume = (update) => {
    const prev = stateRef.current.intravascularVolume !== undefined ? stateRef.current.intravascularVolume : intravascularVolumeVal;
    const next = typeof update === 'function' ? update(prev) : update;
    stateRef.current.intravascularVolume = next;
    setIntravascularVolumeState(next);
  };

  const setTotalBodyWaterLiters = (update) => {
    const prev = stateRef.current.totalBodyWaterLiters !== undefined ? stateRef.current.totalBodyWaterLiters : totalBodyWaterLitersVal;
    const next = typeof update === 'function' ? update(prev) : update;
    stateRef.current.totalBodyWaterLiters = next;
    setTotalBodyWaterLitersState(next);
  };

  const setElectrolytes = (update) => {
    const prev = stateRef.current.electrolytes || electrolytesVal;
    const next = typeof update === 'function' ? update(prev) : { ...prev, ...update };
    stateRef.current.electrolytes = next;
    setElectrolytesState(next);
  };

  const setCoags = (update) => {
    const prev = stateRef.current.coags || coagsVal;
    const next = typeof update === 'function' ? update(prev) : { ...prev, ...update };
    stateRef.current.coags = next;
    setCoagsState(next);
  };

  const setSurgicalPhase = (update) => {
    const prev = stateRef.current.surgicalPhase || surgicalPhaseVal;
    const next = typeof update === 'function' ? update(prev) : update;
    stateRef.current.surgicalPhase = next;
    setSurgicalPhaseState(next);
  };

  // Structured, scorable quality-of-care event log (distinct from the narrative `logEvent`
  // text log). Introduced as part of the Ch9-30 retroactive sweep to give a future
  // debrief/outcome-score feature (see OutcomeScoringEngine.ts) real data to consume.
  // Mapping from the simulator's existing 5-stage surgical timeline to the broader 4-phase
  // continuum-of-care model (PreOp/Intraoperative/PACU/PostDischarge) used by quality events.
  const mapSurgicalPhaseToCareOfPhase = (surgPhase) => {
    if (surgPhase === 'Pre-Op') return 'PreOp';
    if (surgPhase === 'PACU') return 'PACU';
    return 'Intraoperative';
  };

  const logQualityEvent = (input) => {
    const currentPhase = input?.phase || mapSurgicalPhaseToCareOfPhase(stateRef.current.surgicalPhase);
    const event = createQualityEvent({
      ...input,
      time: typeof input?.time === 'number' ? input.time : stateRef.current.time,
      phase: currentPhase
    });
    const currentPatient = stateRef.current.patient || patientVal;
    const existingEvents = Array.isArray(currentPatient.qualityEvents) ? currentPatient.qualityEvents : [];
    setPatient(prev => ({ ...prev, qualityEvents: [...existingEvents, event] }));
    if (logEvent && event.description) {
      logEvent(`📋 [${event.category}/${event.severity.toUpperCase()}] ${event.description}`);
    }
  };

  const time = timeVal;
  const vitals = vitalsVal;
  const targetVitals = targetVitalsVal;
  const patient = patientVal;
  const activeMeds = activeMedsVal;
  const intravascularVolume = intravascularVolumeVal;
  const totalBodyWaterLiters = totalBodyWaterLitersVal;
  const electrolytes = electrolytesVal;
  const coags = coagsVal;
  const surgicalPhase = surgicalPhaseVal;

  useEffect(() => {
    stateRef.current = { 
      time, vitals, targetVitals, patient, activeMeds, gasModels, intravascularVolume, totalBodyWaterLiters, electrolytes, coags, ventSettings, gasSettings, surgicalPhase, msmaidsComplete 
    };
  });

  useEffect(() => {
    if (activeCase && activeCase.id !== prevCaseId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPrevCaseId(activeCase.id);
      DynamicMedicationRegistry.hydrate();
        const __init = createInitialSimState(activeCase);
        setVitals(__init.vitals);
        setTargetVitals(__init.targetVitals);
        setPatient(__init.patient);
        setTime(__init.time); setActiveMeds(__init.activeMeds); setIntravascularVolume(__init.intravascularVolume); setSurgicalPhase(__init.surgicalPhase);
        setGasModels(__init.gasModels);
        setTotalBodyWaterLiters(__init.totalBodyWaterLiters);
        setElectrolytes(__init.electrolytes);
        setCoags(__init.coags);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCase, prevCaseId]);

  const pushFluid = (fluidName, volumeStr, lineId, rateStr = undefined) => {
    const currentPatient = stateRef.current.patient || patient;
    const volume = parseFloat(volumeStr);
    if (isNaN(volume) || !Number.isFinite(volume) || volume <= 0) {
        logEvent(`❌ FAILED: Cannot administer ${fluidName}. Invalid volume specified!`);
        return false;
    }
    const targetLine = currentPatient.accessLines?.find(l => l.id === lineId);
    
    if (!targetLine) {
        logEvent(`❌ FAILED: Cannot administer ${fluidName}. No valid venous access line selected!`);
        return false;
    }
    
    if (targetLine.failed) {
        logEvent(`❌ FAILED: Cannot administer ${fluidName}. Access Line: ${targetLine.name} has been BLOWN OUT!`);
        return false;
    }
    
    if (targetLine.category.includes('Arterial')) {
        logEvent(`🚨 CRITICAL ERROR: Attempted fluid resuscitation via Arterial Line! Arteries cannot accommodate high volume infusion. Retrograde flow risks cerebral embolization and severe limb ischemia!`);
        return false;
    }

    const fluidData = FLUIDS[fluidName]; if (!fluidData) return false;
    const isBlood = fluidData.type === 'Blood Product';
    
    if (isBlood) {
        const bb = currentPatient.bloodBank || { status: 'none', unitsInOR: 0, deliveryCountdown: 0, totalDeliveryTime: 0, preOpWorkup: 'none' };

        if (bb.status === 'available' && bb.unitsInOR > 0) {
            const requestedUnits = volume;
            if (requestedUnits > bb.unitsInOR) {
                logEvent(`❌ FAILED: Requested ${requestedUnits} unit(s) of ${fluidName}, but only ${bb.unitsInOR} unit(s) remain in the OR cooler. Order more from Blood Bank.`);
                return false;
            }
            setPatient(prev => ({
                ...prev,
                bloodBank: {
                    ...prev.bloodBank,
                    unitsInOR: prev.bloodBank.unitsInOR - requestedUnits
                }
            }));
            if (bb.unitsInOR - requestedUnits <= 0) {
                logEvent(`⚠️ Blood Bank: Last unit(s) from OR cooler being administered. Order additional units if hemorrhage continues.`);
            }
        } else if (bb.status === 'ordered') {
            const remaining = Math.ceil(bb.deliveryCountdown);
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            logEvent(`❌ FAILED: Blood products have not arrived yet! Cooler ETA: ${mins}m ${secs}s remaining (${remaining}s). Blood Bank is processing.`);
            return false;
        } else {
            const hasTypeAndScreen = currentPatient.preOpOrders?.labs?.typeAndScreen || false;
            const hasTypeAndCross = currentPatient.preOpOrders?.labs?.typeAndCross || false;

            if (hasTypeAndCross && bb.status === 'none') {
                logEvent(`✅ Blood Bank: Type & Crossmatch was completed pre-operatively. 2 crossmatched units of PRBCs are in the OR cooler. Proceeding with transfusion.`);
                const requestedUnits = volume;
                setPatient(prev => ({
                    ...prev,
                    bloodBank: {
                        status: 'available',
                        unitsInOR: Math.max(0, 2 - requestedUnits),
                        deliveryCountdown: 0,
                        totalDeliveryTime: 0,
                        preOpWorkup: 'crossmatch'
                    }
                }));
            } else {
                const baselineDelay = 600; 
                const delaySeconds = hasTypeAndScreen ? (baselineDelay * 0.50) : baselineDelay;
                const deliveryUnits = 4; 

                const rationale = hasTypeAndCross
                    ? `Previous crossmatch on file. Reorder delivery: ${Math.round(delaySeconds)}s. Blood Bank pulling ${deliveryUnits} additional units.`
                    : hasTypeAndScreen
                        ? `Type & Screen on file — ABO/Rh and antibody screen already completed. Electronic crossmatch in progress. Delivery: ${Math.round(delaySeconds)}s (${Math.round(delaySeconds/60)} min). ${deliveryUnits} units being prepared.`
                        : `NO pre-operative blood workup on file! Emergency uncrossmatched O-Negative release protocol initiated. Full ABO/Rh typing and antibody screen running concurrently. Delivery: ${Math.round(delaySeconds)}s (${Math.round(delaySeconds/60)} min). ${deliveryUnits} uncrossmatched units being dispatched.`;

                logEvent(`🚨 Blood Bank: Emergency order placed for ${fluidName}. ${rationale}`);

                setPatient(prev => ({
                    ...prev,
                    bloodBank: {
                        status: 'ordered',
                        unitsInOR: 0,
                        deliveryCountdown: delaySeconds,
                        totalDeliveryTime: delaySeconds,
                        pendingUnits: deliveryUnits,
                        preOpWorkup: hasTypeAndCross ? 'crossmatch' : (hasTypeAndScreen ? 'screen' : 'none')
                    }
                }));
                return false;
            }
        }
    }

    const isUnit = isBlood || fluidData.type === 'Colloid';
    
    if (isUnit) {
        if (volume > 20) {
            logEvent(`❌ FAILED: Attempted to infuse ${volume} units of ${fluidName}. That is physiologically impossible and clinically absurd.`);
            return false;
        }
    } else {
        if (volume > 5000) {
            logEvent(`❌ FAILED: Attempted to infuse ${volume} mL of ${fluidName} in a single bolus. That is clinically absurd.`);
            return false;
        }
    }

    const effectiveVolumeML = fluidName.includes('Fibrinogen') ? volume * 50 : (isUnit ? volume * (fluidData.defaultVol || 300) : volume);

    let initialUserRate = undefined;
    if (rateStr !== undefined && rateStr !== null && rateStr !== '') {
        const parsedRate = parseFloat(rateStr);
        if (!isNaN(parsedRate) && Number.isFinite(parsedRate) && parsedRate > 0) {
            initialUserRate = parsedRate;
        }
    }

    setPatient(prev => {
        const newLines = [...(prev.accessLines || [])];
        const lineIndex = newLines.findIndex(l => l.id === lineId);
        if (lineIndex >= 0) {
            newLines[lineIndex] = {
                ...newLines[lineIndex],
                activeInfusions: [
                    ...(newLines[lineIndex].activeInfusions || []),
                    { id: Date.now().toString(), name: fluidName, remainingVolume: effectiveVolumeML, startingVolume: effectiveVolumeML, userRate: initialUserRate, currentRate: 0 }
                ]
            };
        }
        return { ...prev, accessLines: newLines };
    });

    logEvent(`💧 Attached: ${volume} ${isUnit ? 'Units' : (fluidName.includes('Fibrinogen') ? 'g' : 'mL')} of ${fluidName} to ${targetLine.name}.`);
    return true;
  };

  const updateFluidRate = (lineId, infusionId, newRate_ml_hr) => {
    setPatient(prev => {
        const newLines = (prev.accessLines || []).map(l => {
            if (l.id !== lineId) return l;
            return {
                ...l,
                activeInfusions: (l.activeInfusions || []).map(inf => {
                    if (inf.id !== infusionId) return inf;
                    return { ...inf };
                })
            };
        });
        const lineIndex = newLines.findIndex(l => l.id === lineId);
        if (lineIndex >= 0) {
            const line = newLines[lineIndex];
            const infusions = line.activeInfusions;
            const infIndex = infusions.findIndex(i => i.id === infusionId);
            if (infIndex >= 0) {
                if (newRate_ml_hr === '' || newRate_ml_hr === null || isNaN(parseFloat(newRate_ml_hr))) {
                    delete infusions[infIndex].userRate;
                    logEvent(`Max flow enabled for ${infusions[infIndex].name} on ${line.name}.`);
                } else {
                    let rate = parseFloat(newRate_ml_hr);
                    if (isNaN(rate) || !Number.isFinite(rate) || rate < 0) {
                        logEvent(`❌ FAILED: Invalid flow rate requested!`);
                        return prev;
                    }
                    const lType = line.fluidLine || prev.fluidLine || 'gravity';
                    let pInfusion = 74; 
                    if (lType === 'ranger') pInfusion = 150;
                    else if (lType === 'belmont') pInfusion = 300;
                    
                    const pv = line.venousPressure !== undefined ? line.venousPressure : 10;
                    const rv = line.veinResistance !== undefined ? line.veinResistance : 500;
                    let deltaP = pInfusion - pv;
                    if (deltaP < 0) deltaP = 0;
                    
                    const fluidData = FLUIDS[infusions[infIndex].name];
                    const eta = fluidData ? Math.max(0.01, fluidData.viscosity || 1.0) : 1.0;
                    
                    let rTubing = 150;
                    if (lType === 'ranger') rTubing = 800;
                    else if (lType === 'belmont') rTubing = 200;
                    
                    const safeRadius = Math.max(0.01, line.radius || 0.475);
                    const safeLength = Math.max(1, line.length || 30);
                    const rCath = safeLength / Math.pow(safeRadius, 4);
                    const rTotal = Math.max(1.0, rTubing + rCath + rv);
                    
                    let q_ml_min = 1200 * deltaP / (eta * rTotal);
                    if (isNaN(q_ml_min) || !Number.isFinite(q_ml_min) || q_ml_min < 0) {
                        q_ml_min = 0;
                    }
                    if (lType === 'belmont' && q_ml_min > 500) q_ml_min = 500;
                    
                    const max_ml_hr = q_ml_min * 60;
                    if (rate > max_ml_hr) {
                        rate = max_ml_hr;
                        logEvent(`⚠️ Requested rate exceeds physical limits of ${line.name}. Capped at ${Math.round(rate)} mL/hr.`);
                    }
                    infusions[infIndex].userRate = rate;
                }
            }
        }
        return { ...prev, accessLines: newLines };
    });
  };

  const removeFluid = (lineId, infusionId) => {
    setPatient(prev => {
        const newLines = [...(prev.accessLines || [])];
        const lineIndex = newLines.findIndex(l => l.id === lineId);
        if (lineIndex >= 0) {
            const infusions = [...(newLines[lineIndex].activeInfusions || [])];
            const filtered = infusions.filter(i => i.id !== infusionId);
            newLines[lineIndex] = { ...newLines[lineIndex], activeInfusions: filtered };
        }
        return { ...prev, accessLines: newLines };
    });
    logEvent(`Stopped and removed fluid infusion.`);
  };

  const processMed = (medId, doseInput, route, type, unit, lineId = null, modelName = null) =>
    processMedCore({ stateRef, patient, activeMeds, setPatient, setActiveMeds, logEvent, logQualityEvent, setSurgicalPhase, setElectrolytes }, medId, doseInput, route, type, unit, lineId, modelName);

  const pushMed = (medName) => { 
    if (medName.includes('Topical')) { 
      logEvent(`Administered Topical Lidocaine.`); 
      setPatient(prev => ({...prev, isTopicalized: true})); 
    } 
  };

  const toggleCPR = () => {
    setPatient(p => {
      const newState = !p.cprActive;
      logEvent(newState ? "🩺 Initiated Chest Compressions." : "⏹ Stopped Chest Compressions.");
      return { ...p, cprActive: newState, cprStartTime: newState ? (stateRef.current.time ?? 0) : null };
    });
  };

  // Thoracic Epidural / Celiac Plexus Block (Ch15, Miller's 9th Ed: regional sympathetic
  // blockade of the GI tract). Epidural coverage of gut/splanchnic sympathetic outflow is
  // dermatome-graded by `epiduralLevel` (TABLE 15.2); celiac plexus block targets the ganglion
  // directly (Fig 15.4/15.5) for complete splanchnic block regardless of level.
  const placeEpidural = (level) => {
    const safeLevel = typeof level === 'number' && Number.isFinite(level) ? level : 8;
    setPatient(p => {
      logEvent(`🦴 Thoracic epidural catheter placed at T${safeLevel}, local anesthetic bolus dosed and active.`);
      return { ...p, epiduralBlockActive: true, epiduralLevel: safeLevel };
    });
  };

  const removeEpidural = () => {
    setPatient(p => {
      logEvent("⏹ Thoracic epidural infusion stopped/catheter removed.");
      return { ...p, epiduralBlockActive: false };
    });
  };

  const toggleCeliacBlock = () => {
    setPatient(p => {
      const newState = !p.celiacBlockActive;
      logEvent(newState ? "🩹 Celiac plexus block performed — complete splanchnic sympathetic block achieved." : "⏹ Celiac plexus block resolved/reversed.");
      return { ...p, celiacBlockActive: newState };
    });
  };

  const deliverShock = (joules, isSync) => {
    const currentPatient = stateRef.current.patient || patient;
    const bloodLossRatio = (currentPatient.ebl || 0) / (currentPatient.ebv || 5000);
    const patLungVols = calculateLungVolumes(
      currentPatient.height || 170,
      currentPatient.age || 40,
      currentPatient.sex || 'male',
      currentPatient.bmi || 25,
      currentPatient.position || 'Supine',
      currentPatient.copd || false,
      currentPatient.restrictive || false,
      !!currentPatient.airwaySecured || !!currentPatient.isParalyzed
    );
    const currentFRC_L = patLungVols.frc_L;

    const result = CardiovascularEngine.deliverShock({
      patient: currentPatient,
      activeMeds: stateRef.current.activeMeds || activeMeds,
      currentBuffer: currentPatient.oxygenBuffer || (currentFRC_L * 0.21),
      currentFRC_L,
      bloodLossRatio,
      joules,
      isSync,
      simulationTime: stateRef.current.time || time,
      // Layer 1A: seed the defibrillation ROSC roll from the same serializable RNG the tick uses.
      rng: currentPatient ? ensureRng(currentPatient, currentPatient.rngSeed) : Math.random
    });

    setPatient(result.patient);
    result.events.forEach(msg => logEvent(msg));
  };
  useEffect(() => {
    let interval;
    const actualPaused = isPaused && !patient?.isFuzzing;
    if (isRunning && !actualPaused) {
      interval = setInterval(() => {
        const ffRemainingInitial = ffRemainingRef.current;
        let stepsToRun = 1;
        if (ffRemainingInitial > 0) {
          // Each physics tick now runs ~100 engine functions. Cap at 5 ticks per
          // 100ms interval → 50x real-time max, ~125ms of CPU per slot — the browser
          // stays responsive between intervals and the progress bar can update.
          // (The old 80-tick cap was set before Phase 6 engines existed and caused
          // the main thread to block for 1-2s per interval, crashing the tab.)
          stepsToRun = Math.min(5, ffRemainingInitial);
        } else {
          const scale = stateRef.current.patient?.timeScale || 1;
          if (scale === 30) {
            stepsToRun = 3;
          } else if (scale === 60) {
            // 5 ticks × 100ms interval = 50x speed (6 was overshooting the 100ms budget)
            stepsToRun = 5;
          }
        }

        // Real-time budget guard: break the loop if a single interval exceeds 80ms.
        // Prevents any accumulation of slow ticks from freezing the UI regardless of
        // which engines fire (crash events, TRALI, crisis alerts, etc.).
        const intervalBudgetMs = 80;
        const intervalStartMs = typeof performance !== 'undefined' ? performance.now() : Date.now();

        for (let step = 0; step < stepsToRun; step++) {
          try {
            if (step > 0) {
              const currentSt = stateRef.current;
              if (!(currentSt.patient?.fastForwardRemaining > 0)) {
                break;
              }
              // Yield if we have already spent our time budget for this interval
              const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - intervalStartMs;
              if (elapsed > intervalBudgetMs) break;
            }
            const __ctx = {
              stateRef, ventSettings, gasSettings, logEvent, logQualityEvent, setVitals, setElectrolytes, setCoags, setTotalBodyWaterLiters, setIntravascularVolume, setSurgicalPhase, setIsRunning, ffRemainingRef, ffTotalRef, electrolytes
            };
            const __step = runPhysicsStep(__ctx);
            if (__step && __step.skipped) return;
          } catch (error) {
            console.error("Physics Engine Tick Failed: ", error);
            break;
          }
        }

        // Flush final accumulated states to React once after the loop finishes to prevent UI lag
        const finalSt = stateRef.current;
        setTimeState(finalSt.time);
        setPatientState(finalSt.patient);
        setActiveMedsState(finalSt.activeMeds);
        setVitalsState(finalSt.vitals);
      }, (typeof patient?.fastForwardRemaining === 'number' && patient.fastForwardRemaining > 0) ? 100 : (patient?.isFuzzing ? 50 : (() => {
        const scale = patient?.timeScale || 1;
        if (scale === 30 || scale === 60) return 100;
        return 1000 / scale;
      })()));
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, isPaused, patient?.simulationSpeed, patient?.isFuzzing, patient?.timeScale, (patient?.fastForwardRemaining || 0) > 0]); 

  const createSnapshot = () => {
    const clonedMeds = activeMeds.map(m => {
        const proto = Object.getPrototypeOf(m);
        const clone = Object.create(proto);
        return Object.assign(clone, JSON.parse(JSON.stringify(m)));
    });

    const clonedGas = {};
    Object.keys(gasModels).forEach(k => {
        const proto = Object.getPrototypeOf(gasModels[k]);
        const clone = Object.create(proto);
        clonedGas[k] = Object.assign(clone, JSON.parse(JSON.stringify(gasModels[k])));
    });

    return {
        time,
        vitals: JSON.parse(JSON.stringify(vitals)),
        targetVitals: JSON.parse(JSON.stringify(targetVitals)),
        patient: JSON.parse(JSON.stringify(patient)),
        intravascularVolume,
        totalBodyWaterLiters,
        electrolytes: JSON.parse(JSON.stringify(electrolytes)),
        coags: JSON.parse(JSON.stringify(coags)),
        surgicalPhase,
        activeMeds: clonedMeds,
        gasModels: clonedGas
    };
  };

  const restoreSnapshot = (snap) => {
    if (!snap) return;
    setTime(snap.time);
    setVitals(snap.vitals);
    setTargetVitals(snap.targetVitals);
    setPatient(snap.patient);
    setIntravascularVolume(snap.intravascularVolume);
    setTotalBodyWaterLiters(snap.totalBodyWaterLiters);
    setElectrolytes(snap.electrolytes);
    setCoags(snap.coags);
    setSurgicalPhase(snap.surgicalPhase);
    setActiveMeds(snap.activeMeds);
    setGasModels(snap.gasModels);

    ffRemainingRef.current = snap.patient?.fastForwardRemaining || 0;
    ffTotalRef.current = snap.patient?.fastForwardTotal || 0;

    stateRef.current = {
        time: snap.time,
        vitals: snap.vitals,
        targetVitals: snap.targetVitals,
        patient: snap.patient,
        activeMeds: snap.activeMeds,
        gasModels: snap.gasModels,
        intravascularVolume: snap.intravascularVolume,
        totalBodyWaterLiters: snap.totalBodyWaterLiters,
        electrolytes: snap.electrolytes,
        coags: snap.coags,
        ventSettings,
        gasSettings,
        surgicalPhase: snap.surgicalPhase,
        msmaidsComplete
    };
  };

  return { time, setTime, vitals, setVitals, targetVitals, setTargetVitals, patient, setPatient, processMed, pushMed, pushFluid, updateFluidRate, removeFluid, activeMeds, intravascularVolume, electrolytes, coags, deliverShock, toggleCPR, placeEpidural, removeEpidural, toggleCeliacBlock, surgicalPhase, setSurgicalPhase, createSnapshot, restoreSnapshot, logQualityEvent };
}