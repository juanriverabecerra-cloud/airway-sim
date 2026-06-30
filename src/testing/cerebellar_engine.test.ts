import { describe, it, expect } from 'vitest';
import { CerebellarEngine } from '../engine/CerebellarEngine';

describe('CerebellarEngine — anesthesia-depth eye/coordination signs + tonsillar herniation risk', () => {
  it('produces no signs and zero herniation risk at normal baseline', () => {
    const out = CerebellarEngine.tick({ icp: 10, prevIcp: 10, cpp: 80, prevCpp: 80 });
    expect(out.nystagmusPresent).toBe(false);
    expect(out.nystagmusSeverity).toBe(0);
    expect(out.ataxiaIndex).toBe(0);
    expect(out.tonsillarHerniationRisk).toBe(0);
    expect(out.herniationImminent).toBe(false);
  });

  it('ketamine produces dose-dependent nystagmus even with zero volatile MAC', () => {
    const low = CerebellarEngine.tick({ ketamineCe: 0.2, currentMac: 0 });
    const high = CerebellarEngine.tick({ ketamineCe: 2.0, currentMac: 0 });
    expect(low.nystagmusSeverity).toBeGreaterThan(0);
    expect(high.nystagmusSeverity).toBeGreaterThan(low.nystagmusSeverity);
    expect(high.nystagmusPresent).toBe(true);
  });

  it('light-plane volatile anesthesia (Guedel Stage II) produces nystagmus that peaks mid-range and vanishes at depth', () => {
    const awake = CerebellarEngine.tick({ currentMac: 0 });
    const light = CerebellarEngine.tick({ currentMac: 0.5 });
    const surgical = CerebellarEngine.tick({ currentMac: 1.0 });
    expect(awake.nystagmusSeverity).toBe(0);
    expect(light.nystagmusSeverity).toBeGreaterThan(0);
    expect(surgical.nystagmusSeverity).toBe(0);
  });

  it('midazolam produces dose-dependent ataxia', () => {
    const low = CerebellarEngine.tick({ midazolamCe: 0.01 });
    const high = CerebellarEngine.tick({ midazolamCe: 0.1 });
    expect(low.ataxiaIndex).toBeGreaterThan(0);
    expect(high.ataxiaIndex).toBeGreaterThan(low.ataxiaIndex);
  });

  it('emergence-range light MAC produces ataxia that vanishes by MAC 0.5 and at full wakefulness', () => {
    const awake = CerebellarEngine.tick({ currentMac: 0 });
    const emergence = CerebellarEngine.tick({ currentMac: 0.25 });
    const surgical = CerebellarEngine.tick({ currentMac: 0.5 });
    expect(awake.ataxiaIndex).toBe(0);
    expect(emergence.ataxiaIndex).toBeGreaterThan(0);
    expect(surgical.ataxiaIndex).toBe(0);
  });

  it('tonsillar herniation risk rises with absolute ICP', () => {
    const normal = CerebellarEngine.tick({ icp: 10, prevIcp: 10 });
    const elevated = CerebellarEngine.tick({ icp: 30, prevIcp: 30 });
    const severe = CerebellarEngine.tick({ icp: 45, prevIcp: 45 });
    expect(normal.tonsillarHerniationRisk).toBe(0);
    expect(elevated.tonsillarHerniationRisk).toBeGreaterThan(0);
    expect(severe.tonsillarHerniationRisk).toBeGreaterThan(elevated.tonsillarHerniationRisk);
  });

  it('a rapid rate of ICP rise increases risk beyond the same absolute ICP reached slowly', () => {
    const slow = CerebellarEngine.tick({ icp: 30, prevIcp: 29.9, dt: 1 });
    const fast = CerebellarEngine.tick({ icp: 30, prevIcp: 20, dt: 1 });
    expect(fast.tonsillarHerniationRisk).toBeGreaterThan(slow.tonsillarHerniationRisk);
  });

  it('exhausted intracranial compliance amplifies herniation risk relative to normal compliance at the same ICP/CPP', () => {
    const normalCompliance = CerebellarEngine.tick({ icp: 35, cpp: 45, complianceState: 'normal' });
    const exhausted = CerebellarEngine.tick({ icp: 35, cpp: 45, complianceState: 'exhausted' });
    expect(exhausted.tonsillarHerniationRisk).toBeGreaterThan(normalCompliance.tonsillarHerniationRisk);
  });

  it('fires a herniationImminent crisis transition at a more severe icp/cpp combination than Cushing\'s reflex (icp>20/cpp<50)', () => {
    const cushingsRange = CerebellarEngine.tick({ icp: 25, prevIcp: 25, cpp: 45, prevCpp: 45 });
    const herniationRange = CerebellarEngine.tick({ icp: 40, prevIcp: 25, cpp: 35, prevCpp: 45 });
    expect(cushingsRange.herniationImminent).toBe(false);
    expect(herniationRange.herniationImminent).toBe(true);
    expect(herniationRange.events.some(e => e.includes('herniation'))).toBe(true);
  });

  it('only fires the herniationImminent narrative event on the false->true transition, not every tick', () => {
    const alreadyImminent = CerebellarEngine.tick({ icp: 40, prevIcp: 41, cpp: 35, prevCpp: 30 });
    expect(alreadyImminent.herniationImminent).toBe(true);
    expect(alreadyImminent.events.length).toBe(0);
  });

  it('fires a resolution event on the true->false transition', () => {
    const out = CerebellarEngine.tick({ icp: 25, prevIcp: 40, cpp: 50, prevCpp: 35 });
    expect(out.herniationImminent).toBe(false);
    expect(out.events.some(e => e.includes('resolved'))).toBe(true);
  });

  it('falls back to sane defaults and never throws on malformed/missing input', () => {
    expect(() => CerebellarEngine.tick(undefined as any)).not.toThrow();
    expect(() => CerebellarEngine.tick({ icp: NaN, cpp: NaN, currentMac: NaN, ketamineCe: NaN, midazolamCe: NaN } as any)).not.toThrow();
    const out = CerebellarEngine.tick({ icp: -50, currentMac: -5, ketamineCe: -1, midazolamCe: -1, dt: 0 });
    expect(Number.isFinite(out.nystagmusSeverity)).toBe(true);
    expect(Number.isFinite(out.ataxiaIndex)).toBe(true);
    expect(Number.isFinite(out.tonsillarHerniationRisk)).toBe(true);
  });
});
