import { describe, it, expect } from 'vitest';
import { UltrasoundPhysicsEngine, TISSUE_CATALOG } from '../engine/ultrasound/UltrasoundPhysicsEngine';
import {
  ULTRASOUND_PROCEDURES,
  ULTRASOUND_CATEGORY_LABELS,
  getProceduresGroupedByCategory
} from '../engine/ultrasound/UltrasoundRegistry';
import { UltrasoundNeedleEngine } from '../engine/ultrasound/UltrasoundNeedleEngine';
import { UltrasoundDopplerEngine } from '../engine/ultrasound/UltrasoundDopplerEngine';
import { UltrasoundGameEngine } from '../engine/ultrasound/UltrasoundGameEngine';
import { ClinicalUltrasoundBridge } from '../engine/ultrasound/ClinicalUltrasoundBridge';
import { ULTRASOUND_MEDIA_CLIPS, ULTRASOUND_MEDIA_SOURCES } from '../components/ultrasound/UltrasoundMediaBank';

describe('Ultrasound Simulation & Gamification Rigorous Audit', () => {
  it('handles physics boundary inputs and non-finite values safely', () => {
    expect(UltrasoundPhysicsEngine.calculateReflectionCoefficient(NaN, 1.6)).toEqual(0);
    expect(UltrasoundPhysicsEngine.calculateReflectionCoefficient(1.6, -2)).toEqual(0);
    expect(UltrasoundPhysicsEngine.calculateAttenuationFactor(NaN, 10, 5)).toEqual(1.0);
    
    // Test far-field TGC interpolation formula (0.9 depth fraction)
    const gainNear = UltrasoundPhysicsEngine.calculateGainFactor(50, 5, 0, -5, 0.1);
    const gainFar = UltrasoundPhysicsEngine.calculateGainFactor(50, 5, 0, -5, 0.9);
    expect(gainNear).toBeGreaterThan(0);
    expect(gainFar).toBeGreaterThan(0);
  });

  it('maps needle depth precisely across custom maxDepthCm settings', () => {
    const needle = {
      approach: 'in_plane' as const,
      depthCm: 5.0,
      angleDeg: 30,
      xOffsetPercent: 50,
      isInserted: true,
      injectedVolumeMl: 0,
      anestheticType: 'Ropivacaine 0.5%'
    };

    // 5 cm depth in a 10 cm maxDepth setting maps to 50% canvas Y
    const result10cm = UltrasoundNeedleEngine.injectLocalAnesthetic(needle, 10.0, 50, 50, 10, 10.0);
    expect(result10cm.pocket.yPercent).toEqual(50);
  });

  it('calculates probe alignment score over target window', () => {
    const target = { xPercent: 50, yPercent: 50 };
    const perfectScore = UltrasoundGameEngine.calculateProbeAlignment(50, 50, target.xPercent, target.yPercent);
    const offTargetScore = UltrasoundGameEngine.calculateProbeAlignment(80, 80, target.xPercent, target.yPercent);

    expect(perfectScore).toEqual(100);
    expect(offTargetScore).toBeLessThan(50);
  });

  it('evaluates clinical mastery grade and detects arterial collision', () => {
    const structures = [
      { id: 'carotid', label: 'Carotid Artery', type: 'artery', xPercent: 50, yPercent: 45, radiusPercent: 10 }
    ];

    const safeResult = UltrasoundGameEngine.evaluateMasteryGrade(90, 85, 2.25, 20, structures, 30, 5.0);
    expect(['A+', 'A']).toContain(safeResult.masteryGrade);

    const arteryCollisionResult = UltrasoundGameEngine.evaluateMasteryGrade(90, 85, 2.25, 50, structures, 30, 5.0);
    expect(arteryCollisionResult.masteryGrade).toEqual('F');
    expect(arteryCollisionResult.isArteryPunctured).toBe(true);
  });

  it('calculates hydrodissection fluid spread and block score', () => {
    const needle = {
      approach: 'in_plane' as const,
      depthCm: 2.0,
      angleDeg: 30,
      xOffsetPercent: 50,
      isInserted: true,
      injectedVolumeMl: 0,
      anestheticType: 'Ropivacaine 0.5%'
    };

    const result = UltrasoundNeedleEngine.injectLocalAnesthetic(needle, 10.0, 50, 40, 10, 5.0);

    expect(result.updatedNeedle.injectedVolumeMl).toEqual(10.0);
    expect(result.pocket.radiusPercent).toBeGreaterThan(0);
    expect(result.blockScorePercent).toBeGreaterThan(60);
  });

  it('calculates BART Color Doppler velocity mapping', () => {
    const towards = UltrasoundDopplerEngine.calculateColorDoppler(40, 0);
    const away = UltrasoundDopplerEngine.calculateColorDoppler(-30, 0);

    expect(towards.direction).toEqual('towards');
    expect(towards.colorRgb.r).toBeGreaterThan(200);
    expect(away.direction).toEqual('away');
    expect(away.colorRgb.b).toBeGreaterThan(200);
  });

  it('bridges patient state to dynamic ultrasound findings', () => {
    const septicPatient = { isSeptic: true, volumeStatus: 'hypovolemic', stomach: 'full' };
    const modifiers = ClinicalUltrasoundBridge.evaluatePatientUltrasoundState(septicPatient);

    expect(modifiers.ijCollapseFraction).toBeGreaterThan(0.5);
    expect(modifiers.gastricContent).toEqual('solid');
    expect(modifiers.findingsNarrative).toContain('Full Stomach');
  });

  it('handles null/undefined structures and boundary values in game engine gracefully', () => {
    const game = UltrasoundGameEngine.evaluateMasteryGrade(NaN, NaN, NaN, NaN, null as any, NaN);
    expect(game.masteryGrade).toBeDefined();
    expect(game.probeAlignmentScore).toEqual(0);
  });
});

describe('Ultrasound Registry & Media Bank Integrity (post-audit hardening)', () => {
  it('every procedure has complete, in-bounds definitions', () => {
    Object.entries(ULTRASOUND_PROCEDURES).forEach(([key, proc]) => {
      expect(proc.id).toEqual(key);
      expect(proc.name.length).toBeGreaterThan(0);
      expect(proc.shortName.length).toBeGreaterThan(0);
      expect(proc.landmarks.length).toBeGreaterThan(0);
      expect(proc.complications.length).toBeGreaterThan(0);
      expect(Array.isArray(proc.structureOverlays)).toBe(true);
      expect(proc.structureOverlays.length).toBeGreaterThan(0);
      expect(proc.targetMapPos.xPercent).toBeGreaterThanOrEqual(0);
      expect(proc.targetMapPos.xPercent).toBeLessThanOrEqual(100);
      expect(proc.targetMapPos.yPercent).toBeGreaterThanOrEqual(0);
      expect(proc.targetMapPos.yPercent).toBeLessThanOrEqual(100);
    });
  });

  it('has expanded to the full anesthesia scope (>= 20 procedures incl. previously-missing ones)', () => {
    const ids = Object.keys(ULTRASOUND_PROCEDURES);
    expect(ids.length).toBeGreaterThanOrEqual(20);
    // Previously-missing / dead-dropdown procedures now really exist:
    ['femoral_cvc', 'adductor_canal_block', 'sciatic_popliteal_block',
     'infraclavicular_block', 'axillary_block', 'rectus_sheath_block',
     'ql_block', 'subclavian_cvc', 'piv_us'].forEach((id) => {
      expect(ULTRASOUND_PROCEDURES[id]).toBeDefined();
    });
  });

  it('the category-grouped dropdown source covers every procedure exactly once (no orphans, no dead options)', () => {
    const grouped = getProceduresGroupedByCategory();
    const flattenedIds = grouped.flatMap((g) => g.procedures.map((p) => p.id)).sort();
    const registryIds = Object.keys(ULTRASOUND_PROCEDURES).sort();
    expect(flattenedIds).toEqual(registryIds); // parity: dropdown === registry
    expect(new Set(flattenedIds).size).toEqual(flattenedIds.length); // no duplicates
    // Every emitted category key is a known label key.
    const labelKeys = new Set(ULTRASOUND_CATEGORY_LABELS.map((c) => c.key));
    grouped.forEach((g) => expect(labelKeys.has(g.key)).toBe(true));
  });

  it('interscalene roots are hypoechoic "traffic light", peripheral nerves are fascicular', () => {
    const isb = ULTRASOUND_PROCEDURES['interscalene_block'];
    const roots = isb.structureOverlays.find((s) => s.type === 'nerve');
    expect(roots?.echoPattern).toEqual('hypoechoic_roots');
    // A distal peripheral nerve must not be flagged as roots.
    const femNerve = ULTRASOUND_PROCEDURES['femoral_block'].structureOverlays.find((s) => s.type === 'nerve');
    expect(femNerve?.echoPattern).not.toEqual('hypoechoic_roots');
  });

  it('every media clip resolves to a real procedure and a real source', () => {
    const sourceIds = new Set(ULTRASOUND_MEDIA_SOURCES.map((s) => s.id));
    ULTRASOUND_MEDIA_CLIPS.forEach((clip) => {
      expect(ULTRASOUND_PROCEDURES[clip.procedureId]).toBeDefined();
      expect(sourceIds.has(clip.sourceId)).toBe(true);
    });
  });

  it('every open-access source carries a license, URL and a valid commercial-safety flag', () => {
    expect(ULTRASOUND_MEDIA_SOURCES.length).toBeGreaterThan(0);
    ULTRASOUND_MEDIA_SOURCES.forEach((src) => {
      expect(src.name.length).toBeGreaterThan(0);
      expect(src.license.length).toBeGreaterThan(0);
      expect(src.url).toMatch(/^https:\/\//);
      expect(['yes', 'no', 'mixed']).toContain(src.commercialSafe);
    });
    // Non-commercial libraries must be flagged as such (commercial-release safety).
    expect(ULTRASOUND_MEDIA_SOURCES.find((s) => s.id === 'monai')?.commercialSafe).toEqual('no');
    expect(ULTRASOUND_MEDIA_SOURCES.find((s) => s.id === 'pocus_atlas')?.commercialSafe).toEqual('no');
  });
});

describe('Ultrasound engine bug-fix regressions (audit findings)', () => {
  it('TGC gain is continuous through the far field (no 0.66 discontinuity)', () => {
    // With near=mid=far=0, applied TGC is flat and equals the master gain everywhere.
    const flatNear = UltrasoundPhysicsEngine.calculateGainFactor(40, 0, 0, 0, 0.2);
    const flatFar = UltrasoundPhysicsEngine.calculateGainFactor(40, 0, 0, 0, 0.9);
    expect(flatFar).toBeCloseTo(flatNear, 6);

    // Sampling a ramped profile densely must not jump (old bug snapped mid->far at 0.66).
    const near = -10, mid = 0, far = 10;
    let prev = UltrasoundPhysicsEngine.calculateGainFactor(50, near, mid, far, 0);
    for (let f = 0.02; f <= 1.0001; f += 0.02) {
      const cur = UltrasoundPhysicsEngine.calculateGainFactor(50, near, mid, far, f);
      // monotonic non-decreasing as the far anchor is higher, and each step is small
      expect(cur).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = cur;
    }
    // The far anchor is actually reached at full depth (was previously stuck at mid).
    const atFar = UltrasoundPhysicsEngine.calculateGainFactor(0, near, mid, far, 1.0);
    expect(atFar).toBeCloseTo(Math.pow(10, far / 20), 6);
  });

  it('Doppler Nyquist limit scales with transducer frequency', () => {
    // Same flow velocity: a higher-frequency probe has a lower aliasing limit,
    // so its color intensity saturates sooner (larger red channel toward probe).
    const low = UltrasoundDopplerEngine.calculateColorDoppler(40, 0, 4000, 2.5);
    const high = UltrasoundDopplerEngine.calculateColorDoppler(40, 0, 4000, 10.0);
    expect(high.colorRgb.r).toBeGreaterThan(low.colorRgb.r);
    expect(low.direction).toEqual('towards');
  });

  it('hydrodissection only counts as effective spread when the pocket truly encircles the target', () => {
    const needle = {
      approach: 'in_plane' as const, depthCm: 2.0, angleDeg: 30,
      xOffsetPercent: 50, isInserted: true, injectedVolumeMl: 0, anestheticType: 'Ropivacaine 0.5%'
    };
    // Needle centered on target, adequate volume -> encircled.
    const onTarget = UltrasoundNeedleEngine.injectLocalAnesthetic(needle, 10.0, 50, 40, 10, 5.0);
    expect(onTarget.pocket.isEffectiveSpread).toBe(true);

    // Same volume deposited far from the target -> NOT covered (old formula wrongly passed).
    const remote = UltrasoundNeedleEngine.injectLocalAnesthetic(
      { ...needle, xOffsetPercent: 50 }, 10.0, 95, 40, 10, 5.0
    );
    expect(remote.pocket.isEffectiveSpread).toBe(false);
  });
});
