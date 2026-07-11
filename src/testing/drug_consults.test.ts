import { describe, it, expect } from 'vitest';
import { getPreloadedConsult } from '../engine/config/preloadedConsults';
import { MEDICATIONS } from '../engine/Pharmacology';

describe('Drug Consult Preloaded Database & Resolver', () => {
  it('should resolve hand-crafted preloaded consults for major agents', () => {
    // Propofol
    const propofolConsult = getPreloadedConsult('propofol');
    expect(propofolConsult).toContain('=== CLINICAL SUMMARY ===');
    expect(propofolConsult).toContain('=== DETAILED CONSULTATION ===');
    expect(propofolConsult).toContain('propofol');
    expect(propofolConsult).toContain('GABA-A');

    // Etomidate
    const etomidateConsult = getPreloadedConsult('etomidate');
    expect(etomidateConsult).toContain('=== CLINICAL SUMMARY ===');
    expect(etomidateConsult).toContain('=== DETAILED CONSULTATION ===');
    expect(etomidateConsult).toContain('11-beta-hydroxylase');

    // Sevoflurane
    const sevoConsult = getPreloadedConsult('sevoflurane');
    expect(sevoConsult).toContain('Compound A');
    expect(sevoConsult).toContain('Malignant Hyperthermia');

    // Lactated Ringer's
    const lrConsult = getPreloadedConsult('Lactated Ringers (LR)');
    expect(lrConsult.toLowerCase()).toContain('balanced, isotonic crystalloid');
    expect(lrConsult).toContain('calcium');
  });

  it('should resolve case-insensitive drug names and aliases correctly', () => {
    const nsConsult = getPreloadedConsult('ns');
    expect(nsConsult).toContain('Isotonic crystalloid solution');

    const ffpConsult = getPreloadedConsult('FFP');
    expect(ffpConsult).toContain('coagulation factors');

    const prbcConsult = getPreloadedConsult('prbc');
    expect(prbcConsult).toContain('oxygen-carrying capacity');
  });

  it('should fall back to dynamic generation if drug database has metadata', () => {
    // Furosemide is not in our hand-crafted database but is in MEDICATIONS
    const furosemideConsult = getPreloadedConsult('furosemide', MEDICATIONS);
    expect(furosemideConsult).toContain('=== CLINICAL SUMMARY ===');
    expect(furosemideConsult).toContain('=== DETAILED CONSULTATION ===');
    expect(furosemideConsult).toContain('Furosemide');
  });

  it('should return a generic template if drug is completely unknown and no DB is provided', () => {
    const unknownConsult = getPreloadedConsult('completely_unknown_agent');
    expect(unknownConsult).toContain('=== CLINICAL SUMMARY ===');
    expect(unknownConsult).toContain('=== DETAILED CONSULTATION ===');
    expect(unknownConsult).toContain('Pharmacological agent');
  });
});
