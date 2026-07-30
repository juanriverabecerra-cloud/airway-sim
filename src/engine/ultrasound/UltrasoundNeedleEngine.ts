/**
 * UltrasoundNeedleEngine.ts
 * Simulates needle trajectory, ultrasound beam intersection,
 * acoustic reverberation artifacts, local anesthetic hydrodissection spread,
 * and nerve block success scoring.
 */

export interface NeedleState {
  approach: 'in_plane' | 'out_of_plane';
  depthCm: number; // Current depth of needle tip
  angleDeg: number; // Angle relative to probe face (0 = parallel, 90 = perpendicular)
  xOffsetPercent: number; // 0 to 100 on ultrasound canvas
  isInserted: boolean;
  injectedVolumeMl: number;
  anestheticType: string;
}

export interface HydrodissectionPocket {
  xPercent: number;
  yPercent: number;
  radiusPercent: number;
  volumeMl: number;
  isEffectiveSpread: boolean;
}

export class UltrasoundNeedleEngine {
  /**
   * Calculates the echogenicity (brightness 0.0 - 1.0) of needle shaft based on beam incidence angle.
   */
  static calculateNeedleEchogenicity(approach: 'in_plane' | 'out_of_plane', angleDeg: number): number {
    if (approach === 'out_of_plane') {
      return 0.95;
    }
    const safeAngle = isNaN(angleDeg) ? 30 : Math.abs(angleDeg % 90);
    const specularFactor = Math.cos((safeAngle * Math.PI) / 180.0);
    return Math.max(0.35, Math.min(1.0, 0.4 + specularFactor * 0.6));
  }

  /**
   * Simulates local anesthetic hydrodissection fluid injection.
   * Calculates fluid pocket growth and determines if target structure is encircled.
   */
  static injectLocalAnesthetic(
    currentNeedle: NeedleState,
    doseMl: number,
    targetXPercent: number,
    targetYPercent: number,
    targetRadiusPercent: number,
    maxDepthCm: number = 5.0
  ): { updatedNeedle: NeedleState; pocket: HydrodissectionPocket; blockScorePercent: number } {
    const safeDose = Math.max(0, isNaN(doseMl) ? 0 : doseMl);
    const newVolume = (currentNeedle?.injectedVolumeMl || 0) + safeDose;
    const safeMaxDepth = Math.max(1.0, isNaN(maxDepthCm) ? 5.0 : maxDepthCm);
    
    // Calculate fluid pocket radius based on volume (10 mL ~ 12% canvas radius)
    const pocketRadius = Math.min(35, Math.sqrt(newVolume) * 3.8);

    // Map needle depth in cm to Y percent on canvas (0 to 100%)
    const needleYPercent = (Math.max(0, currentNeedle.depthCm) / safeMaxDepth) * 100;

    // Distance from needle tip to target structure center
    const dx = (currentNeedle.xOffsetPercent || 50) - targetXPercent;
    const dy = needleYPercent - targetYPercent;
    const distanceToTarget = Math.sqrt(dx * dx + dy * dy);

    // The fluid pocket "covers" the target only when it actually engulfs it:
    // the anechoic spread, growing from the needle tip, must reach across the
    // gap to the target center AND out to the far edge of the target radius.
    // (The previous form `pocketRadius + distanceToTarget >= targetRadius` was
    // satisfied by almost any deposit and never measured circumferential spread.)
    const isTargetCovered = pocketRadius >= distanceToTarget + targetRadiusPercent;
    
    // Block score: 0 to 100% based on proximity and volume
    let score = 0;
    if (distanceToTarget <= targetRadiusPercent * 1.5) {
      score = Math.min(100, (newVolume / 15.0) * 100);
      if (distanceToTarget > targetRadiusPercent) {
        score *= 0.7; // Sub-optimal circumferential spread
      }
    } else {
      score = Math.min(30, (newVolume / 20.0) * 30); // Remote deposit
    }

    const updatedNeedle: NeedleState = {
      ...currentNeedle,
      injectedVolumeMl: newVolume
    };

    const pocket: HydrodissectionPocket = {
      xPercent: currentNeedle.xOffsetPercent,
      yPercent: needleYPercent,
      radiusPercent: pocketRadius,
      volumeMl: newVolume,
      isEffectiveSpread: isTargetCovered && score > 60
    };

    return { updatedNeedle, pocket, blockScorePercent: Math.round(score) };
  }
}
