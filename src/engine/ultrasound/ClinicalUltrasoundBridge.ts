/**
 * ClinicalUltrasoundBridge.ts
 * Bridges AirwaySim patient state (sepsis, hypovolemia, trauma, full stomach, pneumothorax, intubation status)
 * into dynamic ultrasound rendering modifications.
 */

export interface PatientUltrasoundModifiers {
  ijCollapseFraction: number; // 0.0 (distended) to 0.9 (collapsed)
  ivcCollapsibilityPercent: number; // 15% (normal) to 75% (hypovolemic)
  gastricContent: 'empty' | 'fluid' | 'solid';
  gastricAntrumCsaCm2: number; // 2.5 cm^2 (empty) to 12.0 cm^2 (full)
  hasLungSliding: boolean;
  hasPneumothorax: boolean;
  isEsophagealIntubation: boolean;
  fastFreeFluidPresent: boolean;
  cardiacContractility: 'hyperdynamic' | 'normal' | 'depressed';
  findingsNarrative: string;
}

export class ClinicalUltrasoundBridge {
  /**
   * Evaluates patient state and returns ultrasound modifier flags.
   */
  static evaluatePatientUltrasoundState(patientState: any): PatientUltrasoundModifiers {
    const p = patientState || {};
    const isSeptic = !!p.isSeptic || p.shockState === 'septic';
    const isHypovolemic = p.volumeStatus === 'hypovolemic' || p.map < 65;
    const trauma = !!p.trauma || !!p.isTrauma;
    const stomach = p.stomach || 'empty';
    const tubePosition = p.tubePosition || 'none';
    const isApneic = !!p.isApneic;
    const airwaySecured = !!p.airwaySecured;

    let ijCollapseFraction = 0.2;
    let ivcCollapsibilityPercent = 20;
    if (isSeptic || isHypovolemic) {
      ijCollapseFraction = 0.85;
      ivcCollapsibilityPercent = 70;
    }

    const gastricContent = stomach === 'full' ? 'solid' : 'empty';
    const gastricAntrumCsaCm2 = stomach === 'full' ? 10.5 : 2.8;

    const hasPneumothorax = !!p.hasPneumothorax;
    const hasLungSliding = !hasPneumothorax && (!isApneic || airwaySecured);

    const isEsophagealIntubation = tubePosition === 'esophagus';
    const fastFreeFluidPresent = trauma;

    let cardiacContractility: 'hyperdynamic' | 'normal' | 'depressed' = 'normal';
    if (isSeptic) cardiacContractility = 'hyperdynamic';
    else if (p.heartFailure || p.ef < 40) cardiacContractility = 'depressed';

    let narrative = [];
    if (ijCollapseFraction > 0.6) narrative.push('Vein is heavily collapsed with inspiratory variation (Hypovolemia/Vasodilation).');
    if (stomach === 'full') narrative.push('Gastric antrum is distended with hyperechoic particulate matter (Full Stomach / High Aspiration Risk).');
    if (hasPneumothorax) narrative.push('Absent lung sliding with pathognomonic Lung Point (Pneumothorax).');
    if (isEsophagealIntubation) narrative.push('Double-tract sign visible anterior to esophagus (Esophageal Intubation).');
    if (fastFreeFluidPresent) narrative.push('Anechoic free fluid collection in Morison\'s Pouch (Positive eFAST).');

    if (narrative.length === 0) narrative.push('Normal ultrasound anatomy and physiological findings.');

    return {
      ijCollapseFraction,
      ivcCollapsibilityPercent,
      gastricContent,
      gastricAntrumCsaCm2,
      hasLungSliding,
      hasPneumothorax,
      isEsophagealIntubation,
      fastFreeFluidPresent,
      cardiacContractility,
      findingsNarrative: narrative.join(' ')
    };
  }
}
