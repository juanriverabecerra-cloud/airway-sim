/**
 * OUTCOME SCORING ENGINE
 *
 * Cross-cutting infrastructure introduced as part of the retroactive Ch9-30 architecture
 * sweep. The simulator has historically only kept a human-readable narrative event log
 * (`logEvent` in usePhysiology.js). That log is not structured enough to ever drive an
 * explainable outcome score ("who/what/where/why a decision impacted the patient") or a
 * future PACU-readiness/debrief view, since it cannot be filtered, weighted, or attributed
 * to a specific phase of care or clinical domain without re-parsing prose.
 *
 * This engine defines a parallel, structured `QualityEvent` record that existing and future
 * trigger sites can emit alongside (not instead of) the narrative log, plus a pure scoring
 * function that aggregates those records into a 0-100 outcome score with a category
 * breakdown. No UI/scoreboard is built yet — this is the explicitly-scoped groundwork
 * described in the Ch9-30 retroactive sweep, intended to be consumed by a future debrief/
 * leaderboard feature.
 */

export type QualityEventCategory =
  | 'Vigilance'            // failure/success to recognize a developing problem in time
  | 'PharmacologicChoice'  // drug/dose/technique selection appropriateness
  | 'CrisisManagement'     // response once a crisis (anaphylaxis, arrest, LAST, etc.) is underway
  | 'Monitoring'           // appropriate use/non-use of monitoring equipment or modality
  | 'ChecklistAdherence'   // pre-induction/handoff/safety checklist compliance
  | 'PostopReadiness';     // PACU/discharge-readiness criteria

export type QualityEventSeverity = 'info' | 'minor' | 'moderate' | 'major' | 'critical';

export type PhaseOfCare = 'PreOp' | 'Intraoperative' | 'PACU' | 'PostDischarge';

export interface QualityEvent {
  time: number;
  phase: PhaseOfCare;
  category: QualityEventCategory;
  severity: QualityEventSeverity;
  description: string;
  idealAction?: string;
  actualAction?: string;
  impact?: string;
  chapterSource?: string;
}

export interface QualityEventInput {
  time?: number;
  phase?: PhaseOfCare;
  category?: QualityEventCategory;
  severity?: QualityEventSeverity;
  description?: string;
  idealAction?: string;
  actualAction?: string;
  impact?: string;
  chapterSource?: string;
}

const VALID_CATEGORIES: QualityEventCategory[] = ['Vigilance', 'PharmacologicChoice', 'CrisisManagement', 'Monitoring', 'ChecklistAdherence', 'PostopReadiness'];
const VALID_SEVERITIES: QualityEventSeverity[] = ['info', 'minor', 'moderate', 'major', 'critical'];
const VALID_PHASES: PhaseOfCare[] = ['PreOp', 'Intraoperative', 'PACU', 'PostDischarge'];

// Severity-weighted point penalties against a 100-point baseline outcome score.
// 'info' events are recorded for the debrief narrative but do not deduct points -
// they represent neutral/positive observations (e.g. "appropriate antiemetic given").
const SEVERITY_PENALTY: Record<QualityEventSeverity, number> = {
  info: 0,
  minor: 2,
  moderate: 5,
  major: 15,
  critical: 30
};

/**
 * Creates a defensively-validated QualityEvent record. Invalid/missing category, severity,
 * or phase fall back to safe, conservative defaults rather than throwing, consistent with
 * the rest of this codebase's defensive-engineering pattern (NaN/bounds guards, no silent
 * crashes on malformed input from call sites that may not exist yet).
 */
export function createQualityEvent(input: QualityEventInput): QualityEvent {
  const safeTime = typeof input.time === 'number' && Number.isFinite(input.time) && input.time >= 0 ? input.time : 0;
  const safePhase = input.phase && VALID_PHASES.includes(input.phase) ? input.phase : 'Intraoperative';
  const safeCategory = input.category && VALID_CATEGORIES.includes(input.category) ? input.category : 'Vigilance';
  const safeSeverity = input.severity && VALID_SEVERITIES.includes(input.severity) ? input.severity : 'minor';
  const safeDescription = typeof input.description === 'string' && input.description.length > 0 ? input.description : 'Unspecified quality-of-care event.';

  return {
    time: safeTime,
    phase: safePhase,
    category: safeCategory,
    severity: safeSeverity,
    description: safeDescription,
    idealAction: typeof input.idealAction === 'string' ? input.idealAction : undefined,
    actualAction: typeof input.actualAction === 'string' ? input.actualAction : undefined,
    impact: typeof input.impact === 'string' ? input.impact : undefined,
    chapterSource: typeof input.chapterSource === 'string' ? input.chapterSource : undefined,
  };
}

export interface OutcomeScoreResult {
  score: number; // 0-100, clamped
  categoryBreakdown: Record<QualityEventCategory, number>; // points deducted per category
  phaseBreakdown: Record<PhaseOfCare, number>; // points deducted per phase of care
  criticalEventCount: number;
  majorEventCount: number;
}

/**
 * Pure aggregation of a list of QualityEvents into a 0-100 outcome score plus a breakdown,
 * for eventual consumption by a debrief/scoreboard UI (not built yet - see file header).
 */
export function scoreQualityEvents(events: QualityEvent[] | undefined | null): OutcomeScoreResult {
  const categoryBreakdown: Record<QualityEventCategory, number> = {
    Vigilance: 0, PharmacologicChoice: 0, CrisisManagement: 0, Monitoring: 0, ChecklistAdherence: 0, PostopReadiness: 0
  };
  const phaseBreakdown: Record<PhaseOfCare, number> = { PreOp: 0, Intraoperative: 0, PACU: 0, PostDischarge: 0 };

  if (!Array.isArray(events) || events.length === 0) {
    return { score: 100, categoryBreakdown, phaseBreakdown, criticalEventCount: 0, majorEventCount: 0 };
  }

  let totalPenalty = 0;
  let criticalEventCount = 0;
  let majorEventCount = 0;

  for (const ev of events) {
    if (!ev || typeof ev !== 'object') continue;
    const severity = VALID_SEVERITIES.includes(ev.severity) ? ev.severity : 'minor';
    const category = VALID_CATEGORIES.includes(ev.category) ? ev.category : 'Vigilance';
    const phase = VALID_PHASES.includes(ev.phase) ? ev.phase : 'Intraoperative';
    const penalty = SEVERITY_PENALTY[severity];

    totalPenalty += penalty;
    categoryBreakdown[category] += penalty;
    phaseBreakdown[phase] += penalty;
    if (severity === 'critical') criticalEventCount += 1;
    if (severity === 'major') majorEventCount += 1;
  }

  const score = Math.max(0, Math.min(100, 100 - totalPenalty));
  return { score, categoryBreakdown, phaseBreakdown, criticalEventCount, majorEventCount };
}

export interface PacuReadinessCriterion {
  label: string;
  points: 0 | 1 | 2;
  maxPoints: 2;
  detail: string;
}

export interface PacuReadinessResult {
  totalScore: number; // 0-10, Aldrete-style
  maxScore: 10;
  criteria: {
    activity: PacuReadinessCriterion;
    respiration: PacuReadinessCriterion;
    circulation: PacuReadinessCriterion;
    consciousness: PacuReadinessCriterion;
    oxygenation: PacuReadinessCriterion;
  };
  isReadyForDischarge: boolean; // conventional threshold: total >= 9 with no single criterion at 0
}

/**
 * Approximates the Aldrete Post-Anesthesia Recovery Score using the physiology data this
 * simulator already tracks. The original Aldrete score (Activity, Respiration, Circulation,
 * Consciousness, O2 Saturation; 0-2 points each, 10 max) is a bedside clinical observation
 * tool rather than a chapter-tabulated formula, so several criteria here are necessarily
 * proxied from the nearest available simulator signal rather than a literal textbook
 * citation - each proxy is documented inline. This is exactly the kind of "best-reasoned
 * estimate, disclosed, pending future source material" the Ch9-30 retroactive sweep calls
 * for: the underlying clinical concept (5-domain recovery readiness) is well-established and
 * widely used, even though this simulator does not yet have a chapter directly tabulating it.
 */
export function calculatePacuReadiness(vitals: any, patient: any): PacuReadinessResult {
  const safeVitals = vitals || {};
  const safePatient = patient || {};

  // Activity: Aldrete defines this as voluntary movement of all 4 extremities. Proxied here
  // by neuromuscular recovery (TOF ratio), since residual block is this simulator's direct
  // analogue of "cannot move extremities on command."
  const tofRatio = typeof safeVitals.tofRatio === 'number' && Number.isFinite(safeVitals.tofRatio) ? safeVitals.tofRatio : 1.0;
  const tofCount = typeof safeVitals.tofCount === 'number' ? safeVitals.tofCount : 4;
  let activityPoints: 0 | 1 | 2 = 2;
  if (tofCount < 4 || tofRatio < 0.40) activityPoints = 0;
  else if (tofRatio < 0.90) activityPoints = 1;
  const activity: PacuReadinessCriterion = {
    label: 'Activity', points: activityPoints, maxPoints: 2,
    detail: `Proxied from neuromuscular recovery: TOF ${tofCount}/4 (${Math.round(tofRatio * 100)}%).`
  };

  // Respiration: able to breathe deeply/cough freely (2), limited/dyspneic (1), apneic (0).
  const rr = typeof safeVitals.rr === 'number' && Number.isFinite(safeVitals.rr) ? safeVitals.rr : 12;
  const isApneic = !!safePatient.isApneic || safePatient.ventilationStatus === 'failed';
  let respirationPoints: 0 | 1 | 2 = 2;
  if (isApneic || rr < 6 || rr > 30) respirationPoints = 0;
  else if (rr < 10 || rr > 24) respirationPoints = 1;
  const respiration: PacuReadinessCriterion = {
    label: 'Respiration', points: respirationPoints, maxPoints: 2,
    detail: `RR ${Math.round(rr)} bpm${isApneic ? ', apneic' : ''}.`
  };

  // Circulation: BP within 20% of baseline (2), 20-50% (1), >50% deviation (0).
  const map = typeof safeVitals.map === 'number' && Number.isFinite(safeVitals.map) ? safeVitals.map : 80;
  const baselineMap = typeof safePatient.baselineMap === 'number' && safePatient.baselineMap > 0 ? safePatient.baselineMap : map;
  const mapDeviationPct = baselineMap > 0 ? Math.abs(map - baselineMap) / baselineMap : 0;
  let circulationPoints: 0 | 1 | 2 = 2;
  if (mapDeviationPct > 0.50) circulationPoints = 0;
  else if (mapDeviationPct > 0.20) circulationPoints = 1;
  const circulation: PacuReadinessCriterion = {
    label: 'Circulation', points: circulationPoints, maxPoints: 2,
    detail: `MAP ${Math.round(map)} mmHg vs. baseline ${Math.round(baselineMap)} mmHg (${Math.round(mapDeviationPct * 100)}% deviation).`
  };

  // Consciousness: fully awake (2), arousable on calling (1), not responding (0). Proxied
  // from processed EEG (BIS) where available, since this simulator does not yet model a
  // discrete verbal-response/arousal state machine.
  const bis = typeof safeVitals.bis === 'number' && Number.isFinite(safeVitals.bis) ? safeVitals.bis : 98;
  let consciousnessPoints: 0 | 1 | 2 = 2;
  if (bis < 60) consciousnessPoints = 0;
  else if (bis < 90) consciousnessPoints = 1;
  const consciousness: PacuReadinessCriterion = {
    label: 'Consciousness', points: consciousnessPoints, maxPoints: 2,
    detail: `Processed EEG (BIS) ${Math.round(bis)}.`
  };

  // O2 Saturation: maintains SpO2 > 92% on room air (2), needs supplemental O2 to maintain
  // > 90% (1), SpO2 < 90% even with O2 (0).
  const spo2 = typeof safeVitals.spo2 === 'number' && Number.isFinite(safeVitals.spo2) ? safeVitals.spo2 : 98;
  const onRoomAir = safePatient.currentO2Device === 'Room Air' || !safePatient.currentO2Device;
  let oxygenationPoints: 0 | 1 | 2 = 2;
  if (spo2 < 90) oxygenationPoints = 0;
  else if (spo2 <= 92 || !onRoomAir) oxygenationPoints = 1;
  const oxygenation: PacuReadinessCriterion = {
    label: 'O2 Saturation', points: oxygenationPoints, maxPoints: 2,
    detail: `SpO2 ${Math.round(spo2)}%${onRoomAir ? ' on room air' : ' with supplemental O2'}.`
  };

  const totalScore = activity.points + respiration.points + circulation.points + consciousness.points + oxygenation.points;
  const noZeroCriterion = [activity, respiration, circulation, consciousness, oxygenation].every(c => c.points > 0);

  return {
    totalScore,
    maxScore: 10,
    criteria: { activity, respiration, circulation, consciousness, oxygenation },
    isReadyForDischarge: totalScore >= 9 && noZeroCriterion
  };
}
