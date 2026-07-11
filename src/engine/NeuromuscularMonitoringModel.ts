/**
 * Neuromuscular Monitoring Model (Train-of-Four Physics)
 *
 * NMB monitoring is essential for: (1) verifying adequate block for intubation,
 * (2) maintaining appropriate intraoperative depth, (3) ensuring FULL reversal
 * before extubation (CRITICAL — residual NMB causes airway obstruction in PACU).
 *
 * === TRAIN-OF-FOUR (TOF) STIMULATION ===
 * Four supramaximal electrical stimuli at 2 Hz → four muscle twitches (T1-T4).
 *
 * TOF RATIO = T4/T1 amplitude
 * - 0.00: No response = 100% block (deep block, intubating conditions if T1 gone too)
 * - 0.25-0.50: Moderate block (surgical conditions)
 * - 0.70: Traditional "adequate reversal" threshold (WRONG — many patients have clinically
 *          significant weakness at this level)
 * - ≥ 0.90: MINIMUM for adequate neuromuscular recovery (ASA/ESRA 2023 guidelines)
 * - ≥ 1.0: Complete recovery (impossible to tell from fade without monitoring)
 *
 * FADE: T4 < T1 amplitude = residual neuromuscular blockade.
 * Clinically significant residual block (TOFR 0.7-0.9):
 * - Impaired hypoxic ventilatory response (can't detect hypoxia normally)
 * - Impaired upper airway muscle function → obstructed airway
 * - Aspiration risk from impaired laryngeal reflexes
 * - Patient feels weak/cannot move, may be distressed
 *
 * === FADE PATTERNS BY BLOCK LEVEL ===
 * Very deep (>99% block): No twitches at all (TOFR not assessable)
 * Deep (95-99%): Post-Tetanic Count (PTC) useful (see below)
 * Moderate (90-95%): T1 present, T4 absent (TOFR = 0)
 * Moderate-light (80-90%): T1 + T2 present (TOFR = 0)
 * Light (70-80%): T1 + T2 + T3 present, T4 weak (TOFR 0.3-0.5)
 * Partial recovery: All 4 present, fade evident (TOFR 0.5-0.9)
 * Full recovery: TOFR ≥ 0.9 (TOFR 1.0 = no fade)
 *
 * === POST-TETANIC COUNT (PTC) ===
 * Used when TOF shows NO RESPONSE (very deep block).
 * 50 Hz tetanic stimulus for 5 seconds, then single stimuli at 1 Hz.
 * Count twitches after tetanic stimulus (post-tetanic potentiation).
 * PTC 1-2: Very deep block (cannot reverse yet — antagonists ineffective)
 * PTC 3-7: Deep block (can attempt sugammadex 4 mg/kg, not neostigmine)
 * PTC ≥ 10: Moderate block (neostigmine or sugammadex can reverse)
 * TOF T2 present: Sugammadex 2 mg/kg effective; neostigmine also effective at TOFR ≥ 0.4
 *
 * === REVERSAL ===
 * NEOSTIGMINE: acetylcholinesterase inhibitor. LIMITATIONS:
 * - Maximum effect: cannot fully reverse if TOFR < 0.4 (ceiling effect)
 * - Onset 5-10 min; peak 10-20 min
 * - Requires muscarinic protection (glycopyrrolate/atropine)
 * - CANNOT reverse deep block (PTC < 3)
 * - Associated with residual block even when "apparently reversed"
 *
 * SUGAMMADEX (rocuronium/vecuronium): gamma-cyclodextrin encapsulates NDMR.
 * - DOSE: 2 mg/kg (TOFR T2), 4 mg/kg (deep block, PTC ≥ 2), 16 mg/kg (immediate reversal)
 * - Onset: 3-5 min (vs 10-20 for neostigmine)
 * - Complete reversal at ALL depths (unlike neostigmine)
 * - SUPERIOR to neostigmine across all block depths (multiple RCTs, 2022 meta-analysis)
 *
 * Sources: Naguib M, Anesthesiology 2018; Brull SJ, Anesth Analg 2020;
 * Murphy GS, BJA 2013; Sacan O, Anesthesiology 2007; Miller's 9th Ed Ch 29 (NMB Monitoring).
 */

export interface NMBMonitoringInputs {
  // Current TOF data
  t1Amplitude?: number;         // 0-100% of control amplitude
  t4Amplitude?: number;         // 0-100%
  tofRatio?: number;            // 0-1.0 (T4/T1)
  tofCount?: number;            // 0-4 visible twitches
  ptcCount?: number;            // post-tetanic count (if TOF = 0)

  // NMB drug
  isRocuroniumOrVecuronium?: boolean; // sugammadex-reversible
  isSuccinylcholine?: boolean;         // self-limited; monitor phase 2 block

  // Reversal drugs
  neostigmineCe?: number;
  sugammadexCe?: number;

  // Context
  isIntubationPhase?: boolean;       // intubating conditions needed
  isSurgicalPhase?: boolean;         // maintenance NMB
  isEmergencePhase?: boolean;        // preparing for extubation

  // Event guards
  prevResidualBlockLogged?: boolean;
  prevDeepBlockLogged?: boolean;
  prevIntubReadyLogged?: boolean;
}

export interface NMBMonitoringOutput {
  // Block assessment
  blockDepth: 'complete' | 'deep' | 'moderate' | 'light' | 'partial' | 'recovered';
  tofRatio: number;
  tofCount: number;
  ptcCount: number;

  // Clinical status
  intubatingConditions: boolean;          // T1 suppressed ≥ 95%
  surgicalRelaxationAdequate: boolean;    // T1 suppressed ≥ 90%
  safeToExtubate: boolean;                // TOFR ≥ 0.90
  residualBlockPresent: boolean;          // TOFR < 0.90 AND patient breathing

  // Reversal guidance
  neostigmineFeasible: boolean;           // can neostigmine work here?
  sugammadexDoseRecommended: number;      // mg/kg
  reversalAgent: string;

  prevResidualBlockLogged: boolean;
  prevDeepBlockLogged: boolean;
  prevIntubReadyLogged: boolean;
  events: string[];
}

function safeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class NeuromuscularMonitoringModel {
  static tick(inputs: NMBMonitoringInputs = {}): NMBMonitoringOutput {
    const events: string[] = [];
    let prevResidualBlockLogged = !!inputs.prevResidualBlockLogged;
    let prevDeepBlockLogged = !!inputs.prevDeepBlockLogged;
    let prevIntubReadyLogged = !!inputs.prevIntubReadyLogged;

    const tofRatioInput = clamp(safeNumber(inputs.tofRatio, 1.0), 0, 1.0);
    const tofCountInput = clamp(safeNumber(inputs.tofCount, 4), 0, 4);
    const ptcCountInput = clamp(safeNumber(inputs.ptcCount, 0), 0, 30);
    const t1Amp = clamp(safeNumber(inputs.t1Amplitude, 100), 0, 100);
    const neostCe = clamp(safeNumber(inputs.neostigmineCe, 0), 0, 10);
    const sugCe = clamp(safeNumber(inputs.sugammadexCe, 0), 0, 20);
    const isROC_VEC = !!inputs.isRocuroniumOrVecuronium;
    const isEmergence = !!inputs.isEmergencePhase;
    const isSurgical = !!inputs.isSurgicalPhase;

    // ===========================
    // BLOCK DEPTH CLASSIFICATION
    // ===========================
    let blockDepth: 'complete' | 'deep' | 'moderate' | 'light' | 'partial' | 'recovered';
    let intubatingConditions = false;
    let surgicalRelaxationAdequate = false;

    if (tofCountInput === 0 && ptcCountInput === 0) {
      blockDepth = 'complete'; // Profound/complete block
      intubatingConditions = true;
    } else if (tofCountInput === 0 && ptcCountInput <= 10) {
      blockDepth = 'deep';
      intubatingConditions = t1Amp < 5;
      surgicalRelaxationAdequate = true;
    } else if (tofCountInput <= 2) {
      blockDepth = 'moderate';
      intubatingConditions = t1Amp < 10;
      surgicalRelaxationAdequate = true;
    } else if (tofCountInput === 3 || tofRatioInput < 0.4) {
      blockDepth = 'light';
      surgicalRelaxationAdequate = tofRatioInput < 0.3;
    } else if (tofRatioInput < 0.9) {
      blockDepth = 'partial';
      surgicalRelaxationAdequate = false;
    } else {
      blockDepth = 'recovered';
    }

    const safeToExtubate = tofRatioInput >= 0.9 && blockDepth === 'recovered';
    const residualBlockPresent = isEmergence && tofRatioInput < 0.9 && blockDepth !== 'complete';

    // ===========================
    // REVERSAL GUIDANCE
    // ===========================
    // Neostigmine: feasible only when TOFR ≥ 0.4 (TOF T2 is present)
    const neostigmineFeasible = tofCountInput >= 2 && !isROC_VEC;
    // Neostigmine ceiling: cannot fully reverse deep block
    const neostigmineAdequate = neostCe > 0 && tofCountInput >= 2
      ? clamp(neostCe / (neostCe + 1.0) * (tofRatioInput + 0.3), 0, 0.95) > 0.9
      : false;

    // Sugammadex dose based on block depth (rocuronium/vecuronium only)
    let sugammadexDoseRecommended = 0;
    if (isROC_VEC) {
      if (blockDepth === 'complete' || blockDepth === 'deep') {
        sugammadexDoseRecommended = ptcCountInput < 2 ? 16 : 4; // 16 mg/kg for immediate rescue
      } else if (blockDepth === 'moderate' || tofCountInput >= 2) {
        sugammadexDoseRecommended = 2;
      } else if (residualBlockPresent) {
        sugammadexDoseRecommended = 2;
      }
    }

    const reversalAgent = isROC_VEC
      ? `Sugammadex ${sugammadexDoseRecommended} mg/kg IV (3-5 min onset, complete reversal)`
      : `Neostigmine 0.04-0.07 mg/kg IV + Glycopyrrolate 0.2 mg per 1 mg neostigmine (10-20 min onset, limited by ceiling at TOFR < 0.4)`;

    // ===========================
    // EVENTS
    // ===========================
    if (residualBlockPresent && !prevResidualBlockLogged) {
      events.push(
        `⚠️ RESIDUAL NEUROMUSCULAR BLOCKADE: TOFR ${(tofRatioInput * 100).toFixed(0)}% (< 90% = clinically significant residual block). Patient may be unable to maintain airway, has impaired upper airway reflexes, diminished hypoxic ventilatory response. CRITICAL — DO NOT EXTUBATE until TOFR ≥ 0.90. ${isROC_VEC ? `SUGAMMADEX ${sugammadexDoseRecommended} mg/kg IV (immediate, complete reversal).` : 'NEOSTIGMINE 50-70 mcg/kg IV + glycopyrrolate. Note ceiling effect at TOFR < 0.4.'} Monitor for re-curarization (redistribute from peripheral compartment).`,
      );
      prevResidualBlockLogged = true;
    }
    if (!residualBlockPresent) prevResidualBlockLogged = false;

    if ((blockDepth === 'deep' || blockDepth === 'complete') && isEmergence && !prevDeepBlockLogged) {
      events.push(
        `🚨 DEEP BLOCK AT EMERGENCE: TOFR ${(tofRatioInput * 100).toFixed(0)}%, TOF count ${tofCountInput}, PTC ${ptcCountInput}. ${isROC_VEC ? `SUGAMMADEX REQUIRED — neostigmine INEFFECTIVE at this depth. Dose: ${ptcCountInput < 2 ? '16 mg/kg (emergency reversal)' : '4 mg/kg (deep block)'} IV.` : 'Allow natural recovery. Consider re-dosing NDMR (dosed too late for planned case duration). CANNOT proceed with extubation.'}`,
      );
      prevDeepBlockLogged = true;
    }
    if (blockDepth !== 'deep' && blockDepth !== 'complete') prevDeepBlockLogged = false;

    if (intubatingConditions && inputs.isIntubationPhase && !prevIntubReadyLogged) {
      events.push(
        `✅ INTUBATING CONDITIONS: T1 suppressed ${(100 - t1Amp).toFixed(0)}% (target ≥ 95%). TOFR ${(tofRatioInput * 100).toFixed(0)}%. Conditions appropriate for laryngoscopy and intubation. Standard induction block achieved.`,
      );
      prevIntubReadyLogged = true;
    }

    return {
      blockDepth,
      tofRatio: tofRatioInput,
      tofCount: tofCountInput,
      ptcCount: ptcCountInput,
      intubatingConditions,
      surgicalRelaxationAdequate,
      safeToExtubate,
      residualBlockPresent,
      neostigmineFeasible,
      sugammadexDoseRecommended,
      reversalAgent,
      prevResidualBlockLogged,
      prevDeepBlockLogged,
      prevIntubReadyLogged,
      events,
    };
  }
}
