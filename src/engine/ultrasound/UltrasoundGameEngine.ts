/**
 * UltrasoundGameEngine.ts
 * Gamification engine for ultrasound procedural simulation.
 * Computes live probe alignment score, WASD needle steering collisions,
 * hydrodissection accuracy, and Clinical Mastery Grade (A+ to F).
 */

export interface GameScoreState {
  probeAlignmentScore: number; // 0 to 100%
  hydrodissectionAccuracy: number; // 0 to 100%
  timeElapsedSec: number;
  masteryGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  isArteryPunctured: boolean;
  isIntraneural: boolean;
  isPneumothoraxCaused: boolean;
  statusMessage: string;
  badge: string;
}

export class UltrasoundGameEngine {
  /**
   * Calculates live probe alignment score based on probe position relative to anatomical target window.
   */
  static calculateProbeAlignment(
    probeXPercent: number,
    probeYPercent: number,
    targetXPercent: number,
    targetYPercent: number
  ): number {
    const pX = isNaN(probeXPercent) ? 50 : probeXPercent;
    const pY = isNaN(probeYPercent) ? 50 : probeYPercent;
    const tX = isNaN(targetXPercent) ? 50 : targetXPercent;
    const tY = isNaN(targetYPercent) ? 50 : targetYPercent;

    const dx = pX - tX;
    const dy = pY - tY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 0% alignment if > 30% off-target, 100% if directly over window
    const score = Math.max(0, Math.min(100, 100 - dist * 3.33));
    return Math.round(score);
  }

  /**
   * Evaluates needle collisions and computes overall Clinical Mastery Grade.
   */
  static evaluateMasteryGrade(
    probeAlignment: number,
    blockScore: number,
    needleDepthCm: number,
    needleXPercent: number,
    structures: any[],
    timeSec: number,
    maxDepthCm: number = 5.0
  ): GameScoreState {
    let isArteryPunctured = false;
    let isIntraneural = false;
    let isPneumothoraxCaused = false;

    const safeAlignment = isNaN(probeAlignment) ? 0 : Math.max(0, Math.min(100, probeAlignment));
    const safeBlockScore = isNaN(blockScore) ? 0 : Math.max(0, Math.min(100, blockScore));
    const safeTimeSec = isNaN(timeSec) ? 0 : Math.max(0, timeSec);
    const safeMaxDepth = Math.max(1.0, isNaN(maxDepthCm) ? 5.0 : maxDepthCm);
    const needleYPercent = (Math.max(0, isNaN(needleDepthCm) ? 0 : needleDepthCm) / safeMaxDepth) * 100;
    const safeStructures = Array.isArray(structures) ? structures : [];

    // Check collisions with anatomical structures
    safeStructures.forEach((st) => {
      if (!st) return;
      const dx = needleXPercent - st.xPercent;
      const dy = needleYPercent - st.yPercent;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < (st.radiusPercent || 10) * 0.7) {
        if (st.type === 'artery') isArteryPunctured = true;
        if (st.type === 'nerve' && safeBlockScore < 10) isIntraneural = true;
        if (st.type === 'pleura') isPneumothoraxCaused = true;
      }
    });

    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'C';
    let statusMessage = 'Procedure in progress...';
    let badge = '🎯 TRAINEE';

    if (isArteryPunctured) {
      grade = 'F';
      statusMessage = '🚨 COMPLICATION: Inadvertent Arterial Puncture! Hematoma / Intravascular risk!';
      badge = '⚠️ CRITICAL FAIL';
    } else if (isPneumothoraxCaused) {
      grade = 'F';
      statusMessage = '🚨 COMPLICATION: Pleural Puncture! Pneumothorax caused!';
      badge = '⚠️ CRITICAL FAIL';
    } else if (isIntraneural) {
      grade = 'D';
      statusMessage = '⚠️ WARNING: Intraneural needle position! High risk of nerve trauma / neuropathy!';
      badge = '⚡ NERVE RISK';
    } else if (safeBlockScore >= 85 && safeAlignment >= 80) {
      grade = safeTimeSec < 60 ? 'A+' : 'A';
      statusMessage = '🌟 OUTSTANDING: Perfect circumferential spread in target plane!';
      badge = '🏆 EXPERT SONOGRAPHER';
    } else if (safeBlockScore >= 60) {
      grade = 'B';
      statusMessage = '✅ ADEQUATE: Effective hydrodissection spread achieved.';
      badge = '🎓 PROFICIENT';
    } else if (safeAlignment < 40) {
      grade = 'D';
      statusMessage = '⚠️ POOR VIEW: Adjust probe position over anatomical target window.';
      badge = '🔍 OFF-TARGET';
    }

    return {
      probeAlignmentScore: safeAlignment,
      hydrodissectionAccuracy: safeBlockScore,
      timeElapsedSec: safeTimeSec,
      masteryGrade: grade,
      isArteryPunctured,
      isIntraneural,
      isPneumothoraxCaused,
      statusMessage,
      badge
    };
  }
}
