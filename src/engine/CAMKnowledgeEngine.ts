/**
 * Chapter 33: Anesthetic Implications of Complementary and Alternative Therapies
 * Data and evaluation routines sourced from Miller's Anesthesia, 9th Edition.
 */

export interface HerbInteraction {
  interactingDrug: string;
  mechanism: string;
  clinicalConsequence: string;
}

export type PerioperativeConcernType =
  | 'bleeding'
  | 'sedation'
  | 'cardiovascular'
  | 'hepatic'
  | 'immune'
  | 'enzymeInduction'
  | 'withdrawal';

export interface HerbalMedicine {
  id: string;
  commonName: string;
  scientificName: string;
  aliases: string[];
  allegedUses: string;
  pharmacologicEffects: string;
  perioperativeConcerns: string[];
  concernTypes: PerioperativeConcernType[];
  bleedingRisk: boolean;
  sedativeInteraction: boolean;
  cyp3a4Induction: boolean;
  discontinueDays: number | null; // null means no data
  drugInteractions: HerbInteraction[];
}

export interface DietarySupplement {
  id: string;
  name: string;
  pharmacologicEffects: string;
  perioperativeConcerns: string[];
  discontinueDays: number;
  drugInteractions: HerbInteraction[];
}

export interface CAMTherapy {
  id: string;
  name: string;
  description: string;
  evidence: string;
  clinicalTiming?: string;
  quantitativeData?: string;
}

export const HERBAL_MEDICINES: HerbalMedicine[] = [
  {
    id: 'echinacea',
    commonName: 'Echinacea',
    scientificName: 'Echinacea spp.',
    aliases: ['purple coneflower root'],
    allegedUses: 'Prophylaxis/treatment of viral, bacterial, and fungal infections (upper respiratory; common cold)',
    pharmacologicEffects: 'Activation of cell-mediated immunity; immunostimulatory (short-term), immunosuppressive (long-term >8 weeks), antiinflammatory.',
    perioperativeConcerns: [
      'Allergic reactions',
      'Decreases effectiveness of immunosuppressants',
      'Potential for immunosuppression with long-term use (>8 weeks) leading to poor wound healing and opportunistic infections',
      'Caution with preexisting liver dysfunction'
    ],
    concernTypes: ['immune', 'hepatic'],
    bleedingRisk: false,
    sedativeInteraction: false,
    cyp3a4Induction: false,
    discontinueDays: null,
    drugInteractions: [
      {
        interactingDrug: 'immunosuppressants',
        mechanism: 'Immunostimulatory effect opposes immunosuppression',
        clinicalConsequence: 'Diminished immunosuppressive effectiveness'
      },
      {
        interactingDrug: 'warfarin',
        mechanism: 'Reduced plasma concentrations of S-warfarin',
        clinicalConsequence: 'Potential decreased anticoagulation (but didn\'t significantly affect warfarin pharmacodynamics)'
      }
    ]
  },
  {
    id: 'ephedra',
    commonName: 'Ephedra',
    scientificName: 'Ephedra spp.',
    aliases: ['ma huang'],
    allegedUses: 'Weight loss, increased energy, respiratory conditions (asthma, bronchitis)',
    pharmacologicEffects: 'Increases heart rate and blood pressure through direct and indirect sympathomimetic effects (alpha-1, beta-1, beta-2 activity); noncatecholamine sympathomimetic releasing endogenous norepinephrine.',
    perioperativeConcerns: [
      'Risk of myocardial ischemia and stroke from tachycardia and hypertension',
      'Ventricular arrhythmias with halothane (volatile anesthetic interaction)',
      'Long-term use depletes endogenous catecholamines leading to intraoperative hemodynamic instability',
      'Life-threatening interaction with MAO inhibitors (hyperpyrexia, hypertension, coma)',
      'Acute angle-closure glaucoma'
    ],
    concernTypes: ['cardiovascular'],
    bleedingRisk: false,
    sedativeInteraction: false,
    cyp3a4Induction: false,
    discontinueDays: 1, // >=24 hours
    drugInteractions: [
      {
        interactingDrug: 'halothane',
        mechanism: 'Myocardial sensitization to catecholamines',
        clinicalConsequence: 'Ventricular arrhythmias'
      },
      {
        interactingDrug: 'MAO inhibitors',
        mechanism: 'Synergistic sympathomimetic excess',
        clinicalConsequence: 'Life-threatening hyperpyrexia, severe hypertension, coma'
      }
    ]
  },
  {
    id: 'garlic',
    commonName: 'Garlic',
    scientificName: 'Allium sativum',
    aliases: ['ajo'],
    allegedUses: 'Reduce risk of atherosclerosis, lower blood pressure, reduce thrombus formation, lower serum lipid/cholesterol',
    pharmacologicEffects: 'Inhibits platelet aggregation (may be irreversible via ajoene); increases fibrinolysis; equivocal antihypertensive activity.',
    perioperativeConcerns: [
      'May increase risk of bleeding, especially when combined with other platelet inhibitors or anticoagulants',
      'Spontaneous epidural hematoma risk (consider for neuraxial techniques)'
    ],
    concernTypes: ['bleeding'],
    bleedingRisk: true,
    sedativeInteraction: false,
    cyp3a4Induction: false,
    discontinueDays: 7, // >=7 days
    drugInteractions: [
      {
        interactingDrug: 'warfarin',
        mechanism: 'Synergistic antiplatelet/anticoagulant effect',
        clinicalConsequence: 'Increased INR and bleeding risk'
      },
      {
        interactingDrug: 'platelet inhibitors',
        mechanism: 'Additive antiplatelet aggregation effects',
        clinicalConsequence: 'Increased bleeding risk'
      }
    ]
  },
  {
    id: 'ginger',
    commonName: 'Ginger',
    scientificName: 'Zingiber officinale',
    aliases: [],
    allegedUses: 'Arthritis, rheumatism, aches, nausea/vomiting, hypertension, fever, infections',
    pharmacologicEffects: 'Antiemetic (motion sickness, laparoscopy-associated nausea); antiplatelet aggregation (potency similar to aspirin via COX-1 inhibition).',
    perioperativeConcerns: [
      'May increase risk of bleeding, especially when combined with other antiplatelet drugs or anticoagulants'
    ],
    concernTypes: ['bleeding'],
    bleedingRisk: true,
    sedativeInteraction: false,
    cyp3a4Induction: false,
    discontinueDays: 14, // Text recommends >= 2 weeks
    drugInteractions: [
      {
        interactingDrug: 'phenprocoumon',
        mechanism: 'Synergistic bleeding effects',
        clinicalConsequence: 'Increased INR and epistaxis'
      }
    ]
  },
  {
    id: 'ginkgo',
    commonName: 'Ginkgo',
    scientificName: 'Ginkgo biloba',
    aliases: ['duck-foot tree', 'maidenhair tree', 'silver apricot'],
    allegedUses: 'Cognitive disorders, peripheral vascular disease, macular degeneration, vertigo, tinnitus, erectile dysfunction',
    pharmacologicEffects: 'Inhibits platelet-activating factor (PAF); alters vasoregulation; antioxidant; modulates neurotransmitter activity.',
    perioperativeConcerns: [
      'May increase risk of bleeding, especially combined with other antiplatelet drugs',
      'Cases of spontaneous intracranial bleeding and postop bleeding'
    ],
    concernTypes: ['bleeding'],
    bleedingRisk: true,
    sedativeInteraction: false,
    cyp3a4Induction: false,
    discontinueDays: 2, // >=36 hours in Table 33.1 (text says 2 weeks)
    drugInteractions: [
      {
        interactingDrug: 'antiplatelet drugs',
        mechanism: 'Inhibits platelet-activating factor',
        clinicalConsequence: 'Additive risk of spontaneous or postop bleeding'
      }
    ]
  },
  {
    id: 'ginseng',
    commonName: 'Ginseng',
    scientificName: 'Panax ginseng',
    aliases: ['american ginseng', 'asian ginseng', 'chinese ginseng', 'korean ginseng'],
    allegedUses: 'Adaptogen (stress protection), fatigue, immune function, diabetes, cognitive/sexual function',
    pharmacologicEffects: 'Lowers blood glucose; inhibits platelet aggregation (may be irreversible via panaxynol); increased PT/PTT in animals.',
    perioperativeConcerns: [
      'Hypoglycemia (especially after fasting)',
      'May increase risk of bleeding',
      'American ginseng interferes with warfarin-induced anticoagulation'
    ],
    concernTypes: ['bleeding', 'cardiovascular'],
    bleedingRisk: true,
    sedativeInteraction: false,
    cyp3a4Induction: false,
    discontinueDays: 7, // >=7 days (text says 24-48h PK-based, but 2 weeks for platelet inhibition)
    drugInteractions: [
      {
        interactingDrug: 'warfarin',
        mechanism: 'Interferes with warfarin-induced anticoagulation / increases clearance',
        clinicalConsequence: 'Decreased anticoagulant effect'
      },
      {
        interactingDrug: 'insulin / oral hypoglycemics',
        mechanism: 'Additive blood glucose lowering effect',
        clinicalConsequence: 'Preoperative hypoglycemia'
      }
    ]
  },
  {
    id: 'green tea',
    commonName: 'Green Tea',
    scientificName: 'Camellia sinensis',
    aliases: [],
    allegedUses: 'Antioxidant, general health',
    pharmacologicEffects: 'Inhibits platelet aggregation; inhibits thromboxane A2 formation.',
    perioperativeConcerns: [
      'May increase risk of bleeding',
      'Contains vitamin K which may decrease anticoagulant effect of warfarin'
    ],
    concernTypes: ['bleeding'],
    bleedingRisk: true,
    sedativeInteraction: false,
    cyp3a4Induction: false,
    discontinueDays: 7, // >=7 days before surgery
    drugInteractions: [
      {
        interactingDrug: 'warfarin',
        mechanism: 'Vitamin K content antagonizes warfarin',
        clinicalConsequence: 'Decreased anticoagulant effect / decreased INR'
      }
    ]
  },
  {
    id: 'kava',
    commonName: 'Kava',
    scientificName: 'Piper methysticum',
    aliases: ['awa', 'intoxicating pepper', 'kawa'],
    allegedUses: 'Anxiolytic, sedative',
    pharmacologicEffects: 'Sedation, anxiolysis; potentiates GABA neurotransmission; inhibits cyclooxygenase (decreases renal blood flow).',
    perioperativeConcerns: [
      'May increase sedative effect of anesthetics',
      'Alprazolam-kava interaction can lead to coma',
      'Potential hepatotoxicity'
    ],
    concernTypes: ['sedation', 'hepatic'],
    bleedingRisk: false,
    sedativeInteraction: true,
    cyp3a4Induction: false,
    discontinueDays: 1, // >=24 hours before surgery
    drugInteractions: [
      {
        interactingDrug: 'alprazolam',
        mechanism: 'Additive GABA-ergic sedative effect',
        clinicalConsequence: 'Coma'
      },
      {
        interactingDrug: 'general anesthetics / sedatives',
        mechanism: 'Potentiates GABA receptor activity',
        clinicalConsequence: 'Profound sedation, prolonged emergence'
      }
    ]
  },
  {
    id: 'saw palmetto',
    commonName: 'Saw Palmetto',
    scientificName: 'Serenoa repens',
    aliases: ['dwarf palm', 'sabal'],
    allegedUses: 'Benign prostatic hypertrophy',
    pharmacologicEffects: 'Inhibits 5alpha-reductase; inhibits cyclooxygenase; antiinflammatory.',
    perioperativeConcerns: [
      'May increase risk of bleeding (cases of excessive bleeding reported)'
    ],
    concernTypes: ['bleeding'],
    bleedingRisk: true,
    sedativeInteraction: false,
    cyp3a4Induction: false,
    discontinueDays: null, // No data
    drugInteractions: []
  },
  {
    id: 'st. john\'s wort',
    commonName: "St. John's Wort",
    scientificName: 'Hypericum perforatum',
    aliases: ['amber', 'goat weed', 'hardhay', 'hypericum', 'klamath weed'],
    allegedUses: 'Mild to moderate depression, mental health',
    pharmacologicEffects: 'Inhibits neurotransmitter reuptake (serotonin, norepinephrine, dopamine); strong induction of CYP3A4 and CYP2C9.',
    perioperativeConcerns: [
      'Induction of CYP450 3A4 and 2C9 enzymes -> accelerates metabolism of midazolam, lidocaine, alfentanil, CCBs, 5-HT3 antagonists, cyclosporine, warfarin',
      'Risk of Serotonin Syndrome when combined with SSRIs or other serotonergic drugs',
      'Delayed emergence'
    ],
    concernTypes: ['enzymeInduction', 'sedation'],
    bleedingRisk: false,
    sedativeInteraction: false,
    cyp3a4Induction: true,
    discontinueDays: 5, // >=5 days before surgery
    drugInteractions: [
      {
        interactingDrug: 'cyclosporine',
        mechanism: 'Induction of CYP3A4 metabolism',
        clinicalConsequence: 'Profound decrease in blood level (average 49%), risking acute organ rejection'
      },
      {
        interactingDrug: 'warfarin',
        mechanism: 'Induction of CYP2C9 metabolism',
        clinicalConsequence: 'Decreased anticoagulant effect / decreased INR'
      },
      {
        interactingDrug: 'midazolam',
        mechanism: 'Induction of CYP3A4 metabolism',
        clinicalConsequence: 'Decreased sedative effect / faster clearance'
      },
      {
        interactingDrug: 'alfentanil',
        mechanism: 'Induction of CYP3A4 metabolism',
        clinicalConsequence: 'Decreased analgesic effect'
      },
      {
        interactingDrug: 'SSRIs',
        mechanism: 'Additive serotonin reuptake inhibition',
        clinicalConsequence: 'Serotonin Syndrome (autonomic instability, hyperthermia, delirium)'
      }
    ]
  },
  {
    id: 'valerian',
    commonName: 'Valerian',
    scientificName: 'Valeriana officinalis',
    aliases: ['all heal', 'garden heliotrope', 'vandal root'],
    allegedUses: 'Sedative, treatment of insomnia',
    pharmacologicEffects: 'Sedation (dose-dependent); modulates GABA neurotransmission and receptor function.',
    perioperativeConcerns: [
      'May increase sedative effect of anesthetics (potentiates GABA-acting agents)',
      'Abrupt discontinuation in long-term users risks acute benzodiazepine-like withdrawal (delirium, tachycardia)'
    ],
    concernTypes: ['sedation', 'withdrawal'],
    bleedingRisk: false,
    sedativeInteraction: true,
    cyp3a4Induction: false,
    discontinueDays: null, // Taper gradually or continue until surgery
    drugInteractions: [
      {
        interactingDrug: 'midazolam / propofol',
        mechanism: 'Synergistic GABA-A receptor modulation',
        clinicalConsequence: 'Profound sedation, delayed emergence'
      }
    ]
  }
];

export const DIETARY_SUPPLEMENTS: DietarySupplement[] = [
  {
    id: 'fishOil',
    name: 'Fish Oil (Omega-3 Fatty Acids)',
    pharmacologicEffects: 'Inhibits platelet aggregation (decreases thromboxane A2 and increases prostacyclin).',
    perioperativeConcerns: [
      'Inhibits platelet aggregation, potentially increasing risk of bleeding (though clinical trials show minimal impact)',
      'May interact with warfarin to extremely elevate INR'
    ],
    discontinueDays: 14, // >=2 weeks
    drugInteractions: [
      {
        interactingDrug: 'warfarin',
        mechanism: 'Synergistic anticoagulant action',
        clinicalConsequence: 'Extremely elevated INR and bleeding risk'
      }
    ]
  },
  {
    id: 'coq10',
    name: 'Coenzyme Q10 (CoQ10)',
    pharmacologicEffects: 'Antioxidant; prevents mitochondrial membrane transition pore opening.',
    perioperativeConcerns: [
      'May decrease warfarin effect (structural similarity to vitamin K)',
      'May increase bleeding risk in some cohorts (conflicting data)'
    ],
    discontinueDays: 14, // >=2 weeks
    drugInteractions: [
      {
        interactingDrug: 'warfarin',
        mechanism: 'Vitamin K structural similarity / clearance changes',
        clinicalConsequence: 'Variable: decreased warfarin anticoagulation OR increased bleeding risk'
      }
    ]
  },
  {
    id: 'glucosamineChondroitin',
    name: 'Glucosamine and Chondroitin Sulfate',
    pharmacologicEffects: 'Essential components of proteoglycan in cartilage.',
    perioperativeConcerns: [
      'Glucosamine may worsen glycemic control (diabetes risk)',
      'Widespread FDA reports of increased INR and bleeding when combined with warfarin'
    ],
    discontinueDays: 14, // >=2 weeks
    drugInteractions: [
      {
        interactingDrug: 'warfarin',
        mechanism: 'Unknown synergistic effect',
        clinicalConsequence: 'Increased INR, bleeding, and bruising'
      }
    ]
  }
];

export const CAM_THERAPIES: CAMTherapy[] = [
  {
    id: 'acupuncture_p6',
    name: 'Acupuncture / Acupressure (P6 Point)',
    description: 'Neiguan/PC6 point stimulation (between palmaris longus and flexor carpi radialis tendons, 4 cm proximal to wrist crease). Stimulates high-threshold, small-diameter nerves to trigger endogenous opioid mechanisms.',
    evidence: 'Prevents PONV with similar efficacy to antiemetic drugs. Recommended pre-induction (or immediately postop / before emergence).',
    clinicalTiming: 'Initiate before anesthesia induction.',
    quantitativeData: 'Lao et al. dental pain RCT: Acupuncture group had a mean pain-free postop time of 172.9 minutes vs. 93.8 minutes for placebo (84% improvement).'
  },
  {
    id: 'music_therapy',
    name: 'Music Therapy',
    description: 'Use of patient-preferred music to decrease preoperative anxiety, reduce intraoperative sedative and analgesic requirements, and increase patient satisfaction.',
    evidence: 'Reduces sedative requirements during spinal anesthesia; reduces anxiety without changing physiologic stress measures.'
  },
  {
    id: 'deep_breathing',
    name: 'Slow Deep Breathing',
    description: 'Gentle, slow, and smooth deep breathing exercises.',
    evidence: 'Reduces sensation of pain and postoperative nausea via vagal activation. CAUTION: Fast/forced deep breathing can increase postoperative pain.'
  }
];

export interface HerbalRiskSummary {
  bleedingRiskHerbs: string[];
  sedationRiskHerbs: string[];
  enzymeInductionHerbs: string[];
  warfarinInteractions: HerbInteraction[];
  summary: string;
}

export function assessHerbalRisks(
  herbs: string[],
  dietary: string[] = []
): HerbalRiskSummary {
  const bleedingRiskHerbs: string[] = [];
  const sedationRiskHerbs: string[] = [];
  const enzymeInductionHerbs: string[] = [];
  const warfarinInteractions: HerbInteraction[] = [];

  // Evaluate herbs
  for (const herbId of herbs) {
    const herb = HERBAL_MEDICINES.find(h => h.id === herbId.toLowerCase());
    if (!herb) continue;

    if (herb.bleedingRisk) {
      bleedingRiskHerbs.push(herb.commonName);
    }
    if (herb.sedativeInteraction) {
      sedationRiskHerbs.push(herb.commonName);
    }
    if (herb.cyp3a4Induction) {
      enzymeInductionHerbs.push(herb.commonName);
    }

    const warfarinInt = herb.drugInteractions.find(i => i.interactingDrug === 'warfarin');
    if (warfarinInt) {
      warfarinInteractions.push(warfarinInt);
    }
  }

  // Evaluate dietary supplements
  for (const supplementId of dietary) {
    const supp = DIETARY_SUPPLEMENTS.find(s => s.id === supplementId);
    if (!supp) continue;

    if (supplementId === 'fishOil' || supplementId === 'glucosamineChondroitin') {
      bleedingRiskHerbs.push(supp.name);
    }

    const warfarinInt = supp.drugInteractions.find(i => i.interactingDrug === 'warfarin');
    if (warfarinInt) {
      warfarinInteractions.push(warfarinInt);
    }
  }

  // Build summary text
  let summary = 'Complementary and alternative therapy profile: ';
  if (bleedingRiskHerbs.length > 0) {
    summary += `Increased bleeding risk due to: ${bleedingRiskHerbs.join(', ')}. `;
  }
  if (sedationRiskHerbs.length > 0) {
    summary += `Potentiated sedation risk due to: ${sedationRiskHerbs.join(', ')}. `;
  }
  if (enzymeInductionHerbs.length > 0) {
    summary += `CYP3A4 enzyme induction risk due to: ${enzymeInductionHerbs.join(', ')}. `;
  }
  if (bleedingRiskHerbs.length === 0 && sedationRiskHerbs.length === 0 && enzymeInductionHerbs.length === 0) {
    summary += 'No significant acute perioperative drug interactions identified.';
  }

  return {
    bleedingRiskHerbs,
    sedationRiskHerbs,
    enzymeInductionHerbs,
    warfarinInteractions,
    summary: summary.trim()
  };
}

export function getDiscontinuationGuidance(herbId: string): string {
  const herb = HERBAL_MEDICINES.find(h => h.id === herbId.toLowerCase());
  if (herb) {
    if (herb.discontinueDays === null) {
      if (herb.id === 'echinacea') {
        return 'No specific data. Discontinue as far in advance as possible when hepatic compromise is anticipated (Ch33).';
      }
      if (herb.id === 'valerian') {
        return 'No specific data. Taper gradually over weeks before surgery to avoid acute benzodiazepine-like withdrawal (Ch33).';
      }
      return 'No specific pharmacokinetic data. General recommendation is 2 weeks before surgery (Ch33).';
    }
    return `Discontinue >= ${herb.discontinueDays} day(s) before surgery (Ch33).`;
  }

  const supp = DIETARY_SUPPLEMENTS.find(s => s.id === herbId);
  if (supp) {
    return `Discontinue >= ${supp.discontinueDays} day(s) (2 weeks) before surgery (Ch33).`;
  }

  return 'General ASA recommendation is to discontinue all herbal supplements 2 weeks before surgery (Ch33).';
}
