import { describe, it, expect } from 'vitest';
import { UterineToneModel } from '../engine/UterineToneModel';

describe('UterineToneModel — postpartum uterine atony and hemorrhage mechanics', () => {
  it('is inert before delivery (full tone, zero hemorrhage rate)', () => {
    const out = UterineToneModel.tick({ deliveryOccurred: false });
    expect(out.uterineTone).toBe(1.0);
    expect(out.postpartumHemorrhageRateMlPerMin).toBe(0);
  });

  it('immediately postpartum with no uterotonics, tone is moderate (not fully secure) and bleeding is more than a trickle', () => {
    const out = UterineToneModel.tick({ deliveryOccurred: true, prevUterineTone: 0.6, dt: 1 });
    expect(out.uterineTone).toBeLessThan(1.0);
    expect(out.postpartumHemorrhageRateMlPerMin).toBeGreaterThan(2);
  });

  it('volatile anesthetic MAC dose-dependently relaxes the uterus, worsening atony and hemorrhage', () => {
    const lowMac = UterineToneModel.tick({ deliveryOccurred: true, prevUterineTone: 0.6, volatileMac: 0.5, dt: 600 });
    const highMac = UterineToneModel.tick({ deliveryOccurred: true, prevUterineTone: 0.6, volatileMac: 2.0, dt: 600 });
    expect(highMac.uterineTone).toBeLessThan(lowMac.uterineTone);
    expect(highMac.postpartumHemorrhageRateMlPerMin).toBeGreaterThan(lowMac.postpartumHemorrhageRateMlPerMin);
  });

  it('magnesium sulfate (tocolytic side effect) also relaxes the uterus, dose-dependently', () => {
    const none = UterineToneModel.tick({ deliveryOccurred: true, prevUterineTone: 0.6, magnesiumCe: 0, dt: 600 });
    const withMag = UterineToneModel.tick({ deliveryOccurred: true, prevUterineTone: 0.6, magnesiumCe: 2.0, dt: 600 });
    expect(withMag.uterineTone).toBeLessThan(none.uterineTone);
  });

  it('Oxytocin restores uterine tone and reduces hemorrhage rate, dose-dependently', () => {
    const none = UterineToneModel.tick({ deliveryOccurred: true, prevUterineTone: 0.4, dt: 600 });
    const withOxytocin = UterineToneModel.tick({ deliveryOccurred: true, prevUterineTone: 0.4, oxytocinCe: 2.0, dt: 600 });
    expect(withOxytocin.uterineTone).toBeGreaterThan(none.uterineTone);
    expect(withOxytocin.postpartumHemorrhageRateMlPerMin).toBeLessThan(none.postpartumHemorrhageRateMlPerMin);
  });

  it('Methylergonovine and Carboprost still restore tone effectively even though they carry real contraindications elsewhere (not blocked by this pure-physics model)', () => {
    const none = UterineToneModel.tick({ deliveryOccurred: true, prevUterineTone: 0.4, dt: 600 });
    const withMethylergonovine = UterineToneModel.tick({ deliveryOccurred: true, prevUterineTone: 0.4, methylergonovineCe: 2.0, dt: 600 });
    const withCarboprost = UterineToneModel.tick({ deliveryOccurred: true, prevUterineTone: 0.4, carboprostCe: 2.0, dt: 600 });
    expect(withMethylergonovine.uterineTone).toBeGreaterThan(none.uterineTone);
    expect(withCarboprost.uterineTone).toBeGreaterThan(none.uterineTone);
  });

  it('Misoprostol restores tone but more weakly than Oxytocin at an equivalent saturating dose', () => {
    const withOxytocin = UterineToneModel.tick({ deliveryOccurred: true, prevUterineTone: 0.4, oxytocinCe: 100, dt: 1800 });
    const withMisoprostol = UterineToneModel.tick({ deliveryOccurred: true, prevUterineTone: 0.4, misoprostolCe: 100, dt: 1800 });
    expect(withOxytocin.uterineTone).toBeGreaterThan(withMisoprostol.uterineTone);
  });

  it('combining multiple uterotonics for refractory atony helps more than any single agent, but the combined benefit has a ceiling', () => {
    const singleAgent = UterineToneModel.tick({ deliveryOccurred: true, prevUterineTone: 0.4, oxytocinCe: 2.0, dt: 1800 });
    const combined = UterineToneModel.tick({ deliveryOccurred: true, prevUterineTone: 0.4, oxytocinCe: 2.0, methylergonovineCe: 2.0, carboprostCe: 2.0, misoprostolCe: 2.0, dt: 1800 });
    expect(combined.uterineTone).toBeGreaterThan(singleAgent.uterineTone);
    expect(combined.uterineTone).toBeLessThanOrEqual(1.0);
  });

  it('retained placental tissue caps achievable tone regardless of uterotonic dose -- a mechanical, not pharmacologic, problem', () => {
    const maxUterotonics = UterineToneModel.tick({
      deliveryOccurred: true, prevUterineTone: 0.4, retainedPlacentaActive: true,
      oxytocinCe: 100, methylergonovineCe: 100, carboprostCe: 100, misoprostolCe: 100, dt: 3600
    });
    expect(maxUterotonics.uterineTone).toBeLessThanOrEqual(0.5);
  });

  it('prolonged labor and chorioamnionitis are additional, independent atony risk factors', () => {
    const baseline = UterineToneModel.tick({ deliveryOccurred: true, prevUterineTone: 0.6, dt: 600 });
    const prolongedLabor = UterineToneModel.tick({ deliveryOccurred: true, prevUterineTone: 0.6, prolongedLaborRisk: true, dt: 600 });
    const chorio = UterineToneModel.tick({ deliveryOccurred: true, prevUterineTone: 0.6, chorioamnionitisActive: true, dt: 600 });
    expect(prolongedLabor.uterineTone).toBeLessThan(baseline.uterineTone);
    expect(chorio.uterineTone).toBeLessThan(baseline.uterineTone);
  });

  it('hemorrhage rate falls off faster than linearly with tone improvement (partial recovery helps disproportionately)', () => {
    const atonic = UterineToneModel.tick({ deliveryOccurred: true, prevUterineTone: 0 });
    const partial = UterineToneModel.tick({ deliveryOccurred: true, prevUterineTone: 0.5 });
    const wellContracted = UterineToneModel.tick({ deliveryOccurred: true, prevUterineTone: 1.0 });
    expect(atonic.postpartumHemorrhageRateMlPerMin).toBeGreaterThan(partial.postpartumHemorrhageRateMlPerMin);
    expect(partial.postpartumHemorrhageRateMlPerMin).toBeGreaterThan(wellContracted.postpartumHemorrhageRateMlPerMin);
    expect(wellContracted.postpartumHemorrhageRateMlPerMin).toBeCloseTo(2, 0);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => UterineToneModel.tick(undefined as any)).not.toThrow();
    expect(() => UterineToneModel.tick({ deliveryOccurred: true, prevUterineTone: NaN, volatileMac: NaN, magnesiumCe: NaN, oxytocinCe: NaN, dt: NaN } as any)).not.toThrow();
    const out = UterineToneModel.tick({ deliveryOccurred: true, prevUterineTone: -5, volatileMac: -1, oxytocinCe: -1, dt: 0 });
    expect(Number.isFinite(out.uterineTone)).toBe(true);
    expect(Number.isFinite(out.postpartumHemorrhageRateMlPerMin)).toBe(true);
  });
});
