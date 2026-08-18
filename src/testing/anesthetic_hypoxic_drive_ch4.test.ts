import { describe, it, expect } from 'vitest';
import { createHeadlessSim, stepN, HEALTHY_CASE } from './harness/headlessSim';
import { giveMed } from './harness/metamorphic';

/**
 * Layer 4 · F40 — general anesthesia must abolish the hypoxic ventilatory rescue drive.
 *
 * Found in the blind induction-scenario review: a deeply-anesthetized apneic patient (propofol Ce ~8,
 * BIS ~1) desaturating on room air mounted a vigorous hypoxic ventilatory drive (RR ~30) that
 * reoxygenated them 31→88% — clinically impossible and dangerous for training, because it self-corrects
 * the lethal consequence of failing to ventilate under GA. Root cause: the hypoxic drive (BrainstemEngine
 * + the compensatory-RR term) was blunted by volatile MAC and opioids but NOT by IV hypnotics. Propofol
 * profoundly blunts the hypoxic ventilatory response — that's why it causes apnea. Fixed with an
 * IV-hypnotic-depth blunting term (excludes ketamine, which preserves drive). These guard the corrected
 * behaviour: the anesthetized apneic patient stays apneic and keeps desaturating; the awake one does not.
 */
describe('Layer 4 — anesthetic suppression of hypoxic drive (F40)', () => {
  it('a deep-propofol apneic patient does NOT hypoxic-rescue-breathe (RR stays low while hypoxic)', () => {
    const s = createHeadlessSim(HEALTHY_CASE, { seed: 5, withPIV: true });
    stepN(s, 20);
    giveMed(s, 'propofol', 160, { unit: 'mg' });   // deep induction dose
    giveMed(s, 'rocuronium', 50, { unit: 'mg' });   // apnea, no ventilation given
    let maxRrWhileHypoxic = 0;
    let sawHypoxia = false;
    for (let i = 0; i < 12; i++) {
      stepN(s, 10);
      const spo2 = s.state.vitals.spo2 ?? 100;
      const rr = s.state.vitals.rr ?? 0;
      if (spo2 < 60) { sawHypoxia = true; maxRrWhileHypoxic = Math.max(maxRrWhileHypoxic, rr); }
    }
    expect(sawHypoxia, 'patient should desaturate (unventilated apnea)').toBe(true);
    // Corrected: no phantom hypoxic rescue drive — RR stays agonal/low (was ~30 pre-fix).
    expect(maxRrWhileHypoxic, `max RR while SpO2<60 = ${maxRrWhileHypoxic}`).toBeLessThan(15);
  }, 60000);

  it('an AWAKE hypoxic patient (no hypnotic) still mounts a tachypneic drive', () => {
    const s = createHeadlessSim(HEALTHY_CASE, { seed: 3, withPIV: true });
    stepN(s, 10);
    (s.state.vitals as any).pao2 = 45; (s.state.vitals as any).spo2 = 80;
    stepN(s, 15);
    expect(s.state.vitals.rr ?? 0, 'awake hypoxic drive intact').toBeGreaterThan(15);
  }, 60000);
});
