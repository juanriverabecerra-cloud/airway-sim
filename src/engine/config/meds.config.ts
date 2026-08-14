import { MedicationProfile } from './types';

export const MEDICATIONS_CONFIG: Record<string, MedicationProfile> = {
  dexmedetomidine: {
    "name": "Dexmedetomidine",
    "classes": [
      "Alpha-2 Agonist"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (CYP2E6)",
    "proteinBinding": 0.94,
    "synergyGroup": "Sedative",
    "pkModel": "Hannivoort-Colin",
    "targetReceptor": "Alpha-2",
    "intracellularCascade": "a2 (Gi-coupled) -> inhibits adenylate cyclase -> decreases cAMP in locus coeruleus",
    "indications": {
      "Sedation": {
        "dose": "0.2-1.5",
        "unit": "mcg/kg/hr",
        "type": "Infusion"
      },
      "Loading Dose": {
        "dose": "1.0",
        "unit": "mcg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 8,
      "V2": 25,
      "V3": 40,
      "k10": 0.06,
      "k12": 0.08,
      "k21": 0.04,
      "k13": 0.02,
      "k31": 0.01,
      "ke0": 0.5,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 0.001,
      "gamma": 1.5,
      "sysMax": -20,
      "diaMax": -20,
      "hrMax": -30,
      "rrMax": -2,
      "inducesApneaAtCe": 999
    },
    "notes": "Bradycardia and hypotension (initial hypertension with fast bolus due to peripheral alpha-2b stimulation). Mimics natural sleep N3 EEG. Reduces postoperative delirium."
  },
  etomidate: {
    "name": "Etomidate",
    "classes": [
      "Sedative",
      "Hypnotic"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Plasma Esterase / Hepatic",
    "proteinBinding": 0.77,
    "synergyGroup": "Sedative",
    "pkModel": "Standard Compartmental",
    "targetReceptor": "GABA-A",
    "intracellularCascade": "Enhances GABA binding -> increases Chloride (Cl-) influx -> cellular hyperpolarization",
    "indications": {
      "Induction (Cardio-stable)": {
        "dose": "0.2-0.3",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 10.3,
      "V2": 40,
      "V3": 120,
      "k10": 0.1,
      "k12": 0.15,
      "k21": 0.08,
      "k13": 0.05,
      "k31": 0.01,
      "ke0": 0.43,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.3,
      "gamma": 3,
      "sysMax": -5,
      "diaMax": -5,
      "hrMax": 0,
      "rrMax": -12,
      "inducesApneaAtCe": 0.4
    },
    "notes": "Maintains hemodynamic stability (minimal direct cardiac or SVR changes). Side effects include severe myoclonus, thrombophlebitis, and transient adrenocortical inhibition (lasts 4-8 hours due to 11-beta-hydroxylase blockade). High PONV risk."
  },
  ketamine: {
    "name": "Ketamine",
    "classes": [
      "Dissociative",
      "Analgesic"
    ],
    "routes": [
      "IV",
      "IM"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "IBW",
    "metabolism": "Hepatic (CYP3A4/2C9) to active Norketamine",
    "proteinBinding": 0.12,
    "synergyGroup": "Dissociative",
    "pkModel": "Domino/Clements250",
    "targetReceptor": "NMDA Antagonist",
    "intracellularCascade": "Non-competitive NMDA receptor antagonist -> blocks Glutamate/Ca2+ influx",
    "indications": {
      "Induction": {
        "dose": "1.0-2.0",
        "unit": "mg/kg",
        "type": "Bolus"
      },
      "Pain/Agitation": {
        "dose": "0.1-0.3",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 20,
      "V2": 45,
      "V3": 150,
      "k10": 0.15,
      "k12": 0.2,
      "k21": 0.1,
      "k13": 0.05,
      "k31": 0.02,
      "ke0": 1.5,
      "coSensitivity": 0.4
    },
    "pd": {
      "c50": 1,
      "gamma": 2,
      "sysMax": 30,
      "diaMax": 20,
      "hrMax": 20,
      "rrMax": -2,
      "inducesApneaAtCe": 5
    },
    "notes": "Sympathomimetic (increases BP, HR, and CO via neuronal uptake blockade of catecholamines; can cause profound hypotension in catech-depleted shock). Increases secretions (often co-admin Glycopyrrolate) and triggers emergence delirium/hallucinations (prevented by Midazolam)."
  },
  midazolam: {
    "name": "Midazolam",
    "classes": [
      "Benzodiazepine"
    ],
    "routes": [
      "IV",
      "IM"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (CYP3A4) to active 1-hydroxymidazolam",
    "proteinBinding": 0.94,
    "synergyGroup": "Sedative",
    "pkModel": "Greenblatt",
    "targetReceptor": "GABA-A",
    "intracellularCascade": "Allosteric GABA-A modulator -> increases frequency of Chloride (Cl-) channel opening",
    "indications": {
      "Pre-op Anxiolysis": {
        "dose": "0.02-0.04",
        "unit": "mg/kg",
        "type": "Bolus"
      },
      "Sedation": {
        "dose": "1-5",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 12,
      "V2": 30,
      "V3": 80,
      "k10": 0.01,
      "k12": 0.08,
      "k21": 0.04,
      "k13": 0.02,
      "k31": 0.01,
      "ke0": 0.8,
      "coSensitivity": 0.2,
      "renalFraction": 0,
      "hepaticFraction": 1
    },
    "pd": {
      "c50": 0.05,
      "gamma": 1.5,
      "sysMax": -10,
      "diaMax": -10,
      "hrMax": 0,
      "rrMax": -6,
      "inducesApneaAtCe": 0.2
    },
    "notes": "Anterograde amnesia, anxiolysis, anticonvulsant. Heavy synergy with opioids (induces respiratory depression). Reversible with Flumazenil."
  },
  propofol: {
    "name": "Propofol",
    "classes": [
      "Sedative",
      "Hypnotic"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "LBW",
    "metabolism": "Hepatic and Extrahepatic (conjugation)",
    "proteinBinding": 0.97,
    "synergyGroup": "Sedative",
    "pkModel": "Schnider",
    "targetReceptor": "GABA-A",
    "intracellularCascade": "Enhances GABA binding -> increases Chloride (Cl-) influx -> cellular hyperpolarization",
    "indications": {
      "Induction": {
        "dose": "1.5-2.5",
        "unit": "mg/kg",
        "type": "Bolus"
      },
      "Maintenance (TIVA)": {
        "dose": "100-200",
        "unit": "mcg/kg/min",
        "type": "Infusion"
      },
      "Sedation": {
        "dose": "25-50",
        "unit": "mcg/kg/min",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 4.27,
      "V2": 18.9,
      "V3": 238,
      "k10": 0.443,
      "k12": 0.303,
      "k21": 0.055,
      "k13": 0.196,
      "k31": 0.0033,
      "ke0": 0.456,
      "coSensitivity": 0.6,
      "renalFraction": 0,
      "hepaticFraction": 1
    },
    "pd": {
      "c50": 2.5,
      "gamma": 2.76,
      "sysMax": -24,
      "diaMax": -18,
      "hrMax": -2,
      "rrMax": -14,
      "inducesApneaAtCe": 2.5
    },
    "notes": "Decreases CMRO2, CBF, and ICP. Anticonvulsant. Potent venodilator and direct myocardial depressant. Antiemetic at sub-hypnotic doses. Prolonged high dose (>67 mcg/kg/min or 4 mg/kg/hr for >48h) risks Propofol Infusion Syndrome (PRIS: acidosis, rhabdo, bradycardia, lipemic plasma)."
  },
  fentanyl: {
    "name": "Fentanyl",
    "classes": [
      "Opioid"
    ],
    "routes": [
      "IV",
      "IM"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "IBW",
    "metabolism": "Hepatic (CYP3A4) to inactive norfentanyl",
    "proteinBinding": 0.84,
    "synergyGroup": "Opioid",
    "pkModel": "Shafer",
    "targetReceptor": "Mu-Opioid (u1/u2)",
    "intracellularCascade": "Mu (Gi-coupled) -> inhibits adenylate cyclase (decreased cAMP) -> closes VGCCs, opens K+ channels (hyperpolarization)",
    "indications": {
      "Analgesia": {
        "dose": "25-100",
        "unit": "mcg",
        "type": "Bolus"
      },
      "Induction": {
        "dose": "1-3",
        "unit": "mcg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 6.09,
      "V2": 28.1,
      "V3": 228,
      "k10": 0.083,
      "k12": 0.471,
      "k21": 0.102,
      "k13": 0.225,
      "k31": 0.006,
      "ke0": 0.147,
      "coSensitivity": 0.8,
      "renalFraction": 0,
      "hepaticFraction": 1
    },
    "pd": {
      "c50": 0.004,
      "gamma": 1.5,
      "sysMax": -10,
      "diaMax": -10,
      "hrMax": -20,
      "rrMax": -12,
      "inducesApneaAtCe": 0.006
    },
    "notes": "Highly lipophilic. Highly synergistic with volatiles/sedatives. Can cause chest wall rigidity (stiff joint syndrome) with large rapid boluses."
  },
  alfentanil: {
    "name": "Alfentanil",
    "classes": [
      "Opioid"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (CYP3A4)",
    "proteinBinding": 0.92,
    "synergyGroup": "Opioid",
    "pkModel": "Maitre",
    "targetReceptor": "Mu-Opioid (u1/u2)",
    "intracellularCascade": "Mu (Gi-coupled) -> inhibits adenylate cyclase (decreased cAMP) -> closes VGCCs, opens K+ channels (hyperpolarization)",
    "indications": {
      "Analgesia": {
        "dose": "10-25",
        "unit": "mcg/kg",
        "type": "Bolus"
      },
      "Induction": {
        "dose": "50-150",
        "unit": "mcg/kg",
        "type": "Bolus"
      },
      "Maintenance": {
        "dose": "0.5-3",
        "unit": "mcg/kg/min",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 7.77,
      "V2": 12,
      "V3": 10.5,
      "k10": 0.0458,
      "k12": 0.104,
      "k21": 0.067,
      "k13": 0.017,
      "k31": 0.0126,
      "ke0": 1.5,
      "coSensitivity": 0.8
    },
    "pd": {
      "c50": 0.25,
      "gamma": 1.5,
      "sysMax": -13,
      "diaMax": -13,
      "hrMax": -18,
      "rrMax": -14,
      "inducesApneaAtCe": 0.2
    },
    "notes": "Rapid onset, short context-sensitive half-time relative to fentanyl due to a small V1 and high hepatic extraction. Table 26.7 (Miller's 9th Ed) gives the Maitre TCI model: V1 is sex-dependent (female V1 = 1.15x male V1 per kg), and k10/k31 are age-dependent above 40 years."
  },
  hydromorphone: {
    "name": "Hydromorphone",
    "classes": [
      "Opioid"
    ],
    "routes": [
      "IV",
      "IM"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "IBW",
    "metabolism": "Hepatic (glucuronidation) to inactive H3G",
    "proteinBinding": 0.19,
    "synergyGroup": "Opioid",
    "targetReceptor": "Mu-Opioid (u1/u2)",
    "intracellularCascade": "Mu (Gi-coupled) -> inhibits adenylate cyclase (decreased cAMP) -> closes VGCCs, opens K+ channels (hyperpolarization)",
    "indications": {
      "Analgesia": {
        "dose": "0.2-1.0",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 25,
      "V2": 40,
      "V3": 150,
      "k10": 0.006,
      "k12": 0.05,
      "k21": 0.02,
      "k13": 0.02,
      "k31": 0.01,
      "ke0": 0.2,
      "coSensitivity": 0.5
    },
    "pd": {
      "c50": 0.015,
      "gamma": 1.5,
      "sysMax": -5,
      "diaMax": -5,
      "hrMax": -10,
      "rrMax": -14,
      "inducesApneaAtCe": 0.02
    },
    "notes": "7x more potent than morphine. Safe in renal failure (no active metabolites accumulate)."
  },
  morphine: {
    "name": "Morphine",
    "classes": [
      "Opioid"
    ],
    "routes": [
      "IV",
      "IM"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "IBW",
    "metabolism": "Hepatic (Glucuronidation) to active metabolites",
    "proteinBinding": 0.35,
    "synergyGroup": "Opioid",
    "targetReceptor": "Mu-Opioid (u1/u2)",
    "intracellularCascade": "Mu (Gi-coupled) -> inhibits adenylate cyclase (decreased cAMP) -> closes VGCCs, opens K+ channels (hyperpolarization)",
    "activeMetabolites": [
      "Morphine-6-glucuronide",
      "Morphine-3-glucuronide"
    ],
    "indications": {
      "Analgesia": {
        "dose": "2.0-4.0",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 30,
      "V2": 50,
      "V3": 200,
      "k10": 0.005,
      "k12": 0.04,
      "k21": 0.02,
      "k13": 0.01,
      "k31": 0.005,
      "ke0": 0.05,
      "coSensitivity": 0.5
    },
    "pd": {
      "c50": 0.05,
      "gamma": 1.5,
      "sysMax": -15,
      "diaMax": -20,
      "hrMax": -5,
      "rrMax": -14,
      "inducesApneaAtCe": 0.08
    },
    "notes": "Triggers heavy histamine release (hypotension, flushing, pruritus). STRICT renal warning: Morphine-6-glucuronide (M6G) is highly active and accumulates in renal failure causing prolonged respiratory depression; Morphine-3-glucuronide (M3G) accumulates causing neuroexcitation and seizures."
  },
  remifentanil: {
    "name": "Remifentanil",
    "classes": [
      "Opioid (Ultra-short)"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Infusion",
      "Bolus"
    ],
    "dosingWeight": "IBW",
    "metabolism": "Nonspecific Blood & Tissue Esterases",
    "proteinBinding": 0.7,
    "synergyGroup": "Opioid",
    "pkModel": "Minto",
    "targetReceptor": "Mu-Opioid (u1/u2)",
    "intracellularCascade": "Mu (Gi-coupled) -> inhibits adenylate cyclase (decreased cAMP) -> closes VGCCs, opens K+ channels (hyperpolarization)",
    "indications": {
      "Maintenance": {
        "dose": "0.1-0.5",
        "unit": "mcg/kg/min",
        "type": "Infusion"
      },
      "Intubation Spike": {
        "dose": "1.0",
        "unit": "mcg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 5.1,
      "V2": 9.82,
      "V3": 5.42,
      "k10": 0.51,
      "k12": 0.35,
      "k21": 0.27,
      "k13": 0.11,
      "k31": 0.047,
      "ke0": 0.6,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.001,
      "gamma": 2.5,
      "sysMax": -20,
      "diaMax": -15,
      "hrMax": -30,
      "rrMax": -14,
      "inducesApneaAtCe": 0.0015
    },
    "notes": "Context-independent half-life (constant 3-5 min offset regardless of infusion duration). Fast bolus causes severe bradycardia. Prolonged infusion at >0.15 mcg/kg/min triggers acute opioid tolerance and Opioid-Induced Hyperalgesia (OIH)."
  },
  sufentanil: {
    "name": "Sufentanil",
    "classes": [
      "Opioid"
    ],
    "routes": [
      "IV",
      "IM"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "IBW",
    "metabolism": "Hepatic",
    "proteinBinding": 0.92,
    "synergyGroup": "Opioid",
    "pkModel": "Gepts",
    "targetReceptor": "Mu-Opioid (u1/u2)",
    "intracellularCascade": "Mu (Gi-coupled) -> inhibits adenylate cyclase (decreased cAMP) -> closes VGCCs, opens K+ channels (hyperpolarization)",
    "indications": {
      "Analgesia": {
        "dose": "5-10",
        "unit": "mcg",
        "type": "Bolus"
      },
      "Induction": {
        "dose": "0.1-0.3",
        "unit": "mcg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 14.3,
      "V2": 63.4,
      "V3": 251.9,
      "k10": 0.0645,
      "k12": 0.1086,
      "k21": 0.0245,
      "k13": 0.0229,
      "k31": 0.0013,
      "ke0": 0.12,
      "coSensitivity": 0.8
    },
    "pd": {
      "c50": 0.0006,
      "gamma": 1.5,
      "sysMax": -15,
      "diaMax": -15,
      "hrMax": -25,
      "rrMax": -15,
      "inducesApneaAtCe": 0.001
    },
    "notes": "5-10x more potent than fentanyl. Extremely potent, highly lipophilic. Causes cardiovascular stability but severe respiratory depression."
  },
  cisatracurium: {
    "name": "Cisatracurium",
    "classes": [
      "NDMR"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "IBW",
    "metabolism": "Hoffmann Elimination",
    "proteinBinding": 0.82,
    "targetReceptor": "nAChR (Antagonist)",
    "intracellularCascade": "Competitive antagonist -> blocks ACh binding -> prevents Na+ influx/depolarization",
    "indications": {
      "Intubation": {
        "dose": "0.15-0.2",
        "unit": "mg/kg",
        "type": "Bolus"
      },
      "Infusion": {
        "dose": "1-3",
        "unit": "mcg/kg/min",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 5.4,
      "V2": 12,
      "V3": 0,
      "k10": 0.090,
      "k12": 0.091,
      "k21": 0.076,
      "k13": 0,
      "k31": 0,
      "ke0": 0.04,
      "coSensitivity": 0
    },
    "pd": {
      "c50": 0.15,
      "gamma": 4,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": -20,
      "inducesParalysisAtCe": 0.1,
      "inducesApneaAtCe": 0.1,
      "receptorAffinity": 0.85
    },
    "notes": "Organ-independent clearance (spontaneous chemical degradation in blood/tissues via temperature/pH-dependent Hoffmann elimination). Ideal for renal and liver failure. Slowly forms active metabolite laudanosine (seizure threshold lowering, but rarely clinically relevant)."
  },
  glycopyrrolate: {
    "name": "Glycopyrrolate",
    "classes": [
      "Anticholinergic"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal (Unchanged)",
    "proteinBinding": 0,
    "targetReceptor": "Muscarinic (M2/M3)",
    "intracellularCascade": "Antagonizes M2 (Gi-coupled) at SA/AV node -> prevents cAMP decrease -> increases HR",
    "indications": {
      "Reversal Adjunct": {
        "dose": "0.2",
        "unit": "mg",
        "type": "Bolus"
      },
      "Bradycardia": {
        "dose": "0.2-0.4",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 0,
      "V3": 0,
      "k10": 0.05,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 0.5,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.01,
      "gamma": 2,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 35,
      "rrMax": 0,
      "receptorAffinity": 0.9
    },
    "notes": "Quaternary amine. Does NOT cross the Blood-Brain Barrier (no central anticholinergic syndrome). Specifically targets peripheral muscarinic receptors. Co-administered with Neostigmine to block severe muscarinic bradycardia."
  },
  neostigmine: {
    "name": "Neostigmine",
    "classes": [
      "AChE Inhibitor"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic and Renal (50%)",
    "proteinBinding": 0.2,
    "targetReceptor": "Acetylcholinesterase",
    "intracellularCascade": "Inhibits AChE -> ACh accumulates -> massive M2 (Gi) activation -> severe bradycardia if unopposed",
    "indications": {
      "Reversal": {
        "dose": "0.04-0.05",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 20,
      "V2": 0,
      "V3": 0,
      "k10": 0.04,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 0.2,
      "coSensitivity": 0.1,
      "renalFraction": 0.5,
      "hepaticFraction": 0
    },
    "pd": {
      "c50": 0.02,
      "gamma": 2,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": -40,
      "rrMax": 0,
      "achDisplacementPower": 1.5
    },
    "notes": "Reverses NDMR block by inhibiting Acetylcholinesterase, raising synaptic ACh levels to outcompete paralytics. MUST be co-administered with Glycopyrrolate. Omitting Glycopyrrolate triggers profound muscarinic activation: severe bradycardia (HR to 20 or asystole), salivation, bronchospasm, pupillary constriction."
  },
  edrophonium: {
    "name": "Edrophonium",
    "classes": [
      "AChE Inhibitor"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal (70%) and Hepatic",
    "proteinBinding": 0.2,
    "targetReceptor": "Acetylcholinesterase",
    "intracellularCascade": "Rapid competitive inhibition of AChE -> ACh accumulates -> M2 (Gi) activation -> bradycardia if unopposed",
    "indications": {
      "Reversal": {
        "dose": "0.5-1.0",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 0,
      "V3": 0,
      "k10": 0.06,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 1.5,
      "coSensitivity": 0.1,
      "renalFraction": 0.7,
      "hepaticFraction": 0.3
    },
    "pd": {
      "c50": 0.25,
      "gamma": 2,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": -50,
      "rrMax": 0
    },
    "notes": "Rapid onset (0.8-2 minutes), short-acting AChE inhibitor. Dissociates quickly. Must be co-administered with Atropine due to rapid vagal onset. Pairing with Glycopyrrolate causes transient bradycardia due to onset mismatch."
  },
  pyridostigmine: {
    "name": "Pyridostigmine",
    "classes": [
      "AChE Inhibitor"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal (75%) and Hepatic",
    "proteinBinding": 0.15,
    "targetReceptor": "Acetylcholinesterase",
    "intracellularCascade": "Carbamylose covalent inhibition of AChE -> ACh accumulates -> M2 (Gi) activation -> bradycardia if unopposed",
    "indications": {
      "Reversal": {
        "dose": "0.2-0.35",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 20,
      "V2": 0,
      "V3": 0,
      "k10": 0.02,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 0.08,
      "coSensitivity": 0.1,
      "renalFraction": 0.75,
      "hepaticFraction": 0.25
    },
    "pd": {
      "c50": 0.088,
      "gamma": 2,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": -30,
      "rrMax": 0
    },
    "notes": "Slow onset (12-16 minutes), long-acting AChE inhibitor. Paired with Glycopyrrolate. Carbamylose mechanism inhibits pseudocholinesterase (BChE) by 90%, prolonging succinylcholine block."
  },
  rocuronium: {
    "name": "Rocuronium",
    "classes": [
      "NDMR"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "IBW",
    "metabolism": "Hepatic (excreted unchanged in bile >70%, renal 10-20%)",
    "proteinBinding": 0.3,
    "targetReceptor": "nAChR (Antagonist)",
    "intracellularCascade": "Competitive antagonist -> blocks ACh binding -> prevents Na+ influx/depolarization",
    "indications": {
      "Intubation": {
        "dose": "0.6",
        "unit": "mg/kg",
        "type": "Bolus"
      },
      "RSI": {
        "dose": "1.2",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 3.5,
      "V2": 14.5,
      "V3": 0,
      "k10": 0.041,
      "k12": 0.039,
      "k21": 0.009,
      "k13": 0,
      "k31": 0,
      "ke0": 0.18,
      "coSensitivity": 0.3,
      "renalFraction": 0.3,
      "hepaticFraction": 0.7
    },
    "pd": {
      "c50": 1.2,
      "gamma": 4,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 6,
      "rrMax": -20,
      "inducesParalysisAtCe": 0.9,
      "inducesApneaAtCe": 0.9,
      "receptorAffinity": 0.7
    },
    "notes": "Rapid onset, intermediate-acting NDMR. Can be fully encapsulated and reversed by Sugammadex at any depth. Interacts with Sugammadex on a 1:1 molar basis. Weak vagolytic (mild tachycardia at high Ce, Table 27.10, Ch27, Miller's 9th Ed)."
  },
  succinylcholine: {
    "name": "Succinylcholine",
    "classes": [
      "Depolarizing NMBA"
    ],
    "routes": [
      "IV",
      "IM"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Pseudocholinesterase (butyrylcholinesterase) to succinylmonocholine",
    "targetReceptor": "nAChR (Agonist)",
    "intracellularCascade": "Depolarizing agonist -> opens Na+/K+ channels -> fasciculations -> desensitization phase",
    "indications": {
      "RSI": {
        "dose": "1.0-1.5",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 5,
      "V2": 0,
      "V3": 0,
      "k10": 0.35,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 2,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.5,
      "gamma": 4,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 15,
      "rrMax": -20,
      "inducesParalysisAtCe": 0.3,
      "inducesApneaAtCe": 0.3,
      "receptorAffinity": 1.2
    },
    "notes": "Ultra-rapid depolarizing NMBA. Fasciculations are common. STRICTLY CONTRAINDICATED in patients with: pre-existing hyperkalemia, severe burns (>24 hours to 1-2 years), massive trauma/crush injury, upper motor neuron disease, muscular dystrophy, prolonged immobility, open globe injuries, or history of Malignant Hyperthermia (MH) due to lethal hyperkalemic cardiac arrest via extrajunctional nAChR upregulation."
  },
  sugammadex: {
    "name": "Sugammadex",
    "classes": [
      "Reversal"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal excretion (unchanged)",
    "targetReceptor": "Rocuronium/Vecuronium",
    "indications": {
      "Routine Reversal": {
        "dose": "2.0-4.0",
        "unit": "mg/kg",
        "type": "Bolus"
      },
      "Immediate Rescue": {
        "dose": "16.0",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 0,
      "V3": 0,
      "k10": 0.1,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 1,
      "renalFraction": 1,
      "hepaticFraction": 0
    },
    "pd": {
      "c50": 0,
      "gamma": 1,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0,
      "chelationRatio": 1
    },
    "notes": "Modified gamma-cyclodextrin. Encapsulates and inactivates Rocuronium and Vecuronium. Deep reversal (TOF 0, PTC >= 2) requires 4 mg/kg. Immediate rescue reversal for \"Cannot Intubate Cannot Ventilate\" (CICV) after 1.2 mg/kg Rocuronium requires exactly 16 mg/kg."
  },
  vecuronium: {
    "name": "Vecuronium",
    "classes": [
      "NDMR"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "IBW",
    "metabolism": "Hepatic (deacetylation 30-40%) to active metabolites, renal 20-30%",
    "proteinBinding": 0.7,
    "targetReceptor": "nAChR (Antagonist)",
    "intracellularCascade": "Competitive antagonist -> blocks ACh binding -> prevents Na+ influx/depolarization",
    "activeMetabolite": "3-desacetylvecuronium",
    "indications": {
      "Intubation": {
        "dose": "0.1",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 4.5,
      "V2": 12,
      "V3": 0,
      "k10": 0.100,
      "k12": 0.082,
      "k21": 0.078,
      "k13": 0,
      "k31": 0,
      "ke0": 0.06,
      "coSensitivity": 0.2,
      "renalFraction": 0.4,
      "hepaticFraction": 0.6
    },
    "pd": {
      "c50": 0.13,
      "gamma": 4,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": -20,
      "inducesParalysisAtCe": 0.1,
      "inducesApneaAtCe": 0.1,
      "receptorAffinity": 0.75
    },
    "notes": "Intermediate-acting NDMR. STRICT renal warning: Hepatic deacetylation forms 3-desacetylvecuronium, an active metabolite (has 80% potency of parent compound) which is renal-excreted and accumulates heavily in renal failure, causing severe prolonged paralysis. Can be reversed by Sugammadex."
  },
  dantrolene: {
    "name": "Dantrolene",
    "classes": [
      "Muscle Relaxant",
      "MH Treatment"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (CYP3A4) to active 5-hydroxydantrolene, renal excretion",
    "proteinBinding": 0.9,
    "targetReceptor": "Ryanodine Receptor 1 (RyR1)",
    "intracellularCascade": "Inhibits Ca2+ release from sarcoplasmic reticulum -> restores resting Ca2+ balance in muscle fibers",
    "indications": {
      "MH Crisis": {
        "dose": "2.5",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 25,
      "V3": 0,
      "k10": 0.00115,
      "k12": 0.05,
      "k21": 0.05,
      "k13": 0,
      "k31": 0,
      "ke0": 0.1,
      "coSensitivity": 0,
      "renalFraction": 0.2,
      "hepaticFraction": 0.8
    },
    "pd": {
      "c50": 1.5,
      "gamma": 2,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0,
      "inducesParalysisAtCe": 999,
      "inducesApneaAtCe": 999
    },
    "notes": "Direct-acting skeletal muscle relaxant (RyR1 antagonist). Used for treating Malignant Hyperthermia. Reconstitute in sterile water only. Reversal of hypermetabolic state. Side effects include muscle weakness (C50 1.5 for twitch depression), phlebitis, and respiratory insufficiency."
  },
  atracurium: {
    "name": "Atracurium",
    "classes": [
      "NDMR"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "IBW",
    "metabolism": "Hofmann Elimination & Ester Hydrolysis",
    "proteinBinding": 0.82,
    "targetReceptor": "nAChR (Antagonist)",
    "intracellularCascade": "Competitive antagonist -> blocks ACh binding -> prevents Na+ influx/depolarization",
    "indications": {
      "Intubation": {
        "dose": "0.4-0.5",
        "unit": "mg/kg",
        "type": "Bolus"
      },
      "Infusion": {
        "dose": "5-10",
        "unit": "mcg/kg/min",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 10,
      "V2": 20,
      "V3": 0,
      "k10": 0.16,
      "k12": 0.05,
      "k21": 0.05,
      "k13": 0,
      "k31": 0,
      "ke0": 0.06,
      "coSensitivity": 0,
      "renalFraction": 0,
      "hepaticFraction": 0
    },
    "pd": {
      "c50": 0.2,
      "gamma": 4,
      "sysMax": -8,
      "diaMax": -6,
      "hrMax": 8,
      "rrMax": -20,
      "inducesParalysisAtCe": 0.13,
      "inducesApneaAtCe": 0.13,
      "receptorAffinity": 0.8
    },
    "notes": "Intermediate-acting benzylisoquinoline NDMR. Undergoes spontaneous chemical degradation (Hofmann elimination) and non-specific ester hydrolysis. Cleared independently of organ function, but generates active metabolite laudanosine, which can accumulate in renal failure and lower seizure threshold. Histamine release causes slight, transient hypotension/tachycardia (Table 27.9/27.10, Ch27, Miller's 9th Ed)."
  },
  mivacurium: {
    "name": "Mivacurium",
    "classes": [
      "NDMR"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "IBW",
    "metabolism": "Plasma Butyrylcholinesterase (same enzyme as Succinylcholine)",
    "proteinBinding": 0.3,
    "targetReceptor": "nAChR (Antagonist)",
    "intracellularCascade": "Competitive antagonist -> blocks ACh binding -> prevents Na+ influx/depolarization",
    "indications": {
      "Intubation": {
        "dose": "0.2-0.25",
        "unit": "mg/kg",
        "type": "Bolus"
      },
      "Infusion": {
        "dose": "3-15",
        "unit": "mcg/kg/min",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 8,
      "V2": 15,
      "V3": 0,
      "k10": 0.25,
      "k12": 0.1,
      "k21": 0.08,
      "k13": 0,
      "k31": 0,
      "ke0": 0.12,
      "coSensitivity": 0,
      "renalFraction": 0,
      "hepaticFraction": 0
    },
    "pd": {
      "c50": 0.15,
      "gamma": 4,
      "sysMax": -10,
      "diaMax": -8,
      "hrMax": 10,
      "rrMax": -20,
      "inducesParalysisAtCe": 0.10,
      "inducesApneaAtCe": 0.10,
      "receptorAffinity": 0.78
    },
    "notes": "Short-acting benzylisoquinolinium NDMR (Table 27.2, Ch27, Miller's 9th Ed). Hydrolyzed by plasma butyrylcholinesterase - the same enzyme responsible for Succinylcholine metabolism - so block is similarly prolonged under heterozygous/atypical pseudocholinesterase genotypes, pregnancy, or cirrhosis (Table 27.1). Highest histamine-release potency of the benzylisoquinolinium NDMRs, causing slight transient hypotension/tachycardia. NOT reversible with Sugammadex (not a steroidal compound)."
  },
  gantacurium: {
    "name": "Gantacurium",
    "classes": [
      "NDMR"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "IBW",
    "metabolism": "L-Cysteine adduction & ester hydrolysis",
    "proteinBinding": 0.35,
    "targetReceptor": "nAChR (Antagonist)",
    "intracellularCascade": "Competitive antagonist -> blocks ACh binding -> prevents Na+ influx/depolarization",
    "indications": {
      "Intubation": {
        "dose": "0.2",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 8,
      "V2": 15,
      "V3": 0,
      "k10": 0.12,
      "k12": 0.08,
      "k21": 0.08,
      "k13": 0,
      "k31": 0,
      "ke0": 0.18,
      "coSensitivity": 0.1,
      "renalFraction": 0,
      "hepaticFraction": 0
    },
    "pd": {
      "c50": 0.2,
      "gamma": 4,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": -20,
      "inducesParalysisAtCe": 0.15,
      "inducesApneaAtCe": 0.15,
      "receptorAffinity": 0.75
    },
    "notes": "Ultrashort-acting asymmetric mixed-onium chlorofumarate NDMR. Has a rapid onset similar to succinylcholine. Undergoes rapid chemical inactivation by L-cysteine adduction. Reversible by L-cysteine."
  },
  cw002: {
    "name": "CW002",
    "classes": [
      "NDMR"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "IBW",
    "metabolism": "L-Cysteine adduction",
    "proteinBinding": 0.5,
    "targetReceptor": "nAChR (Antagonist)",
    "intracellularCascade": "Competitive antagonist -> blocks ACh binding -> prevents Na+ influx/depolarization",
    "indications": {
      "Intubation": {
        "dose": "0.08-0.12",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 10,
      "V2": 20,
      "V3": 0,
      "k10": 0.06,
      "k12": 0.06,
      "k21": 0.06,
      "k13": 0,
      "k31": 0,
      "ke0": 0.1,
      "coSensitivity": 0.2,
      "renalFraction": 0,
      "hepaticFraction": 0
    },
    "pd": {
      "c50": 0.15,
      "gamma": 4,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": -20,
      "inducesParalysisAtCe": 0.1,
      "inducesApneaAtCe": 0.1,
      "receptorAffinity": 0.8
    },
    "notes": "Intermediate-acting asymmetric fumarate NDMR. Cleared via slow chemical inactivation by L-cysteine. Can be reversed immediately with L-cysteine infusion."
  },
  l_cysteine: {
    "name": "L-Cysteine",
    "classes": [
      "Reversal"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal excretion / endogenous metabolization",
    "proteinBinding": 0,
    "targetReceptor": "Asymmetric fumarate double bond",
    "intracellularCascade": "Covalent adduction -> chemical inactivation of gantacurium/CW002",
    "indications": {
      "Specific Rescue": {
        "dose": "10.0",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 0,
      "V3": 0,
      "k10": 0.1,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 1,
      "renalFraction": 1,
      "hepaticFraction": 0
    },
    "pd": {
      "c50": 0.5,
      "gamma": 1,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0,
      "chelationRatio": 1
    },
    "notes": "Endogenous amino acid. Acts as a specific rescue reversal agent for gantacurium and CW002 by rapidly adducting to their fumarate double bond, terminating blockade within 1-2 minutes."
  },
  dobutamine: {
    "name": "Dobutamine",
    "classes": [
      "Inotrope"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (COMT/conjugation)",
    "targetReceptor": "Beta-1 > Beta-2",
    "intracellularCascade": "Low Dose: B1 (Gs -> cAMP), High Dose: B1/B2 (Gs -> cAMP) + a1 (Gq -> IP3/DAG/Ca2+)",
    "indications": {
      "Low CO": {
        "dose": "2.5-10",
        "unit": "mcg/kg/min",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 10,
      "V2": 0,
      "V3": 0,
      "k10": 0.5,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 1.5,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.12,
      "gamma": 1.5,
      "sysMax": 20,
      "diaMax": -15,
      "hrMax": 30,
      "rrMax": 0
    },
    "notes": "Synthetic catecholamine. Increases cardiac output and heart rate; causes mild peripheral vasodilation (Beta-2) that can lower SVR. Dose-response spans 2.5-20 mcg/kg/min."
  },
  dopamine: {
    "name": "Dopamine",
    "classes": [
      "Inotrope/Pressor"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "MAO/COMT",
    "targetReceptor": "D1, Beta-1, Alpha-1",
    "intracellularCascade": "Low: D1 (Gs -> cAMP). Med: B1 (Gs -> cAMP). High: a1 (Gq -> IP3/DAG/Ca2+)",
    "indications": {
      "Support": {
        "dose": "5-15",
        "unit": "mcg/kg/min",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 0,
      "V3": 0,
      "k10": 0.4,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 1.2,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.10,
      "gamma": 1.5,
      "sysMax": 30,
      "diaMax": 20,
      "hrMax": 40,
      "rrMax": 0
    },
    "notes": "Dose-dependent receptor profiles: low dose (1-3 mcg/kg/min) is dopaminergic D1 vasodilation; intermediate (3-10 mcg/kg/min) is Beta-1 inotropic; high dose (10-20 mcg/kg/min) is Alpha-1 vasopressor."
  },
  ephedrine: {
    "name": "Ephedrine",
    "classes": [
      "Mixed Agonist"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (minimal), mostly excreted unchanged",
    "targetReceptor": "Alpha-1, Beta-1, Beta-2 (Direct & Indirect)",
    "intracellularCascade": "Indirect NE release + Direct: a1 (Gq->Ca2+), B1/B2 (Gs->cAMP)",
    "indications": {
      "Hypotension": {
        "dose": "5-10",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 25,
      "V2": 0,
      "V3": 0,
      "k10": 0.05,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 2.0,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 0.30,
      "gamma": 1.5,
      "sysMax": 40,
      "diaMax": 25,
      "hrMax": 30,
      "rrMax": 0,
      "receptors": {
        "Alpha1": 3,
        "Beta1": 2,
        "Beta2": 1
      }
    },
    "notes": "Mixed-acting synthetic amine (direct agonist + stimulates endogenous NE release from nerve terminals). NE release is Alpha1/Beta1-dominant. Causes tachyphylaxis with repeated dosing. Restores BP while maintaining HR and CO."
  },
  epinephrine: {
    "name": "Epinephrine",
    "classes": [
      "Vasopressor",
      "Inotrope"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "MAO/COMT",
    "targetReceptor": "Alpha-1, Beta-1, Beta-2",
    "intracellularCascade": "a1 (Gq -> IP3/DAG/Ca2+), B1/B2 (Gs -> adenylate cyclase -> cAMP)",
    "indications": {
      "Push Dose": {
        "dose": "10-20",
        "unit": "mcg",
        "type": "Bolus"
      },
      "Code": {
        "dose": "1.0",
        "unit": "mg",
        "type": "Bolus"
      },
      "Infusion": {
        "dose": "0.01-0.1",
        "unit": "mcg/kg/min",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 5,
      "V2": 0,
      "V3": 0,
      "k10": 0.8,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 2,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.002,
      "gamma": 1.5,
      "sysMax": 60,
      "diaMax": 30,
      "hrMax": 50,
      "rrMax": 0,
      "receptors": {
        "Alpha1": 3,
        "Beta1": 3,
        "Beta2": 2
      }
    },
    "notes": "Endogenous catecholamine. Potent inotrope and chronotrope (Beta-1) and vasopressor (Alpha-1). Low doses cause peripheral vasodilation (Beta-2). Primary ACLS arrest code drug."
  },
  milrinone: {
    "name": "Milrinone",
    "classes": [
      "PDE3 Inhibitor"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Infusion",
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal (80% unchanged)",
    "targetReceptor": "PDE3",
    "intracellularCascade": "Inhibits PDE3 -> Prevents cAMP degradation -> increased intracellular Ca2+ (inotropy) & smooth muscle relaxation",
    "indications": {
      "Inotropy": {
        "dose": "0.375-0.75",
        "unit": "mcg/kg/min",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 30,
      "V2": 0,
      "V3": 0,
      "k10": 0.02,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 0.1,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.1,
      "gamma": 1.5,
      "sysMax": 10,
      "diaMax": -20,
      "hrMax": 10,
      "rrMax": 0
    },
    "notes": "Inodilator. Inhibits phosphodiesterase III, increasing intracellular cAMP in myocardium (inotropy) and vascular smooth muscle (vasodilation, lowers SVR and pulmonary artery pressure). Highly renal dependent."
  },
  norepinephrine: {
    "name": "Norepinephrine",
    "classes": [
      "Vasopressor"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Infusion",
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "MAO/COMT",
    "targetReceptor": "Alpha-1 > Beta-1",
    "intracellularCascade": "a1 (Gq -> IP3/DAG/Ca2+), B1/B2 (Gs -> adenylate cyclase -> cAMP)",
    "indications": {
      "Shock / Vasoplegia": {
        "dose": "0.01-0.3",
        "unit": "mcg/kg/min",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 8,
      "V2": 0,
      "V3": 0,
      "k10": 0.6,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 1.5,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.001,
      "gamma": 1.5,
      "sysMax": 40,
      "diaMax": 50,
      "hrMax": 10,
      "rrMax": 0,
      "receptors": {
        "Alpha1": 3,
        "Beta1": 2,
        "Beta2": 1
      }
    },
    "notes": "Endogenous catecholamine. Powerful vasoconstrictor (Alpha-1) with mild inotropic cardiac support (Beta-1). Primary vasopressor for septic and vasodilatory shock."
  },
  phenylephrine: {
    "name": "Phenylephrine",
    "classes": [
      "Alpha-1 Agonist"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (MAO)",
    "targetReceptor": "Alpha-1",
    "intracellularCascade": "Selective a1 (Gq-coupled -> Phospholipase C -> IP3/DAG -> intracellular Ca2+ release)",
    "indications": {
      "Push Dose": {
        "dose": "50-100",
        "unit": "mcg",
        "type": "Bolus"
      },
      "Infusion": {
        "dose": "0.1-0.5",
        "unit": "mcg/kg/min",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 5,
      "V2": 0,
      "V3": 0,
      "k10": 0.5,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 3,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 0.02,
      "gamma": 1,
      "sysMax": 30,
      "diaMax": 45,
      "hrMax": -35,
      "rrMax": 0,
      "receptors": {
        "Alpha1": 3,
        "Beta1": 0,
        "Beta2": 0
      }
    },
    "notes": "Pure direct-acting Alpha-1 agonist. Causes selective arteriolar vasoconstriction. Triggers baroreceptor-mediated reflex bradycardia (reduces HR while raising BP). Neutral to slightly negative effect on CO."
  },
  vasopressin: {
    "name": "Vasopressin",
    "classes": [
      "V1 Agonist"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Tissue Peptidases",
    "targetReceptor": "V1 Receptors",
    "intracellularCascade": "V1 (Gq-coupled -> Phospholipase C -> IP3/DAG -> intracellular Ca2+ release in vascular smooth muscle)",
    "indications": {
      "Push Dose": {
        "dose": "1-2",
        "unit": "Unit",
        "type": "Bolus"
      },
      "Infusion": {
        "dose": "0.04",
        "unit": "Unit/min",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 12,
      "V2": 0,
      "V3": 0,
      "k10": 0.1,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 0.8,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.05,
      "gamma": 2,
      "sysMax": 20,
      "diaMax": 35,
      "hrMax": -5,
      "rrMax": 0,
      "receptors": {
        "V1": 3
      }
    },
    "notes": "Endogenous antidiuretic hormone. Binds vascular V1 receptors, inducing constriction. Bypasses adrenergic receptor pathways (highly effective in acidic and refractory sympathoplegic shock)."
  },
  clevidipine: {
    "name": "Clevidipine",
    "classes": [
      "CCB"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Plasma Esterases (hydrolysis)",
    "targetReceptor": "L-type Calcium",
    "intracellularCascade": "Dihydropyridine CCB -> blocks L-type VGCCs in vascular smooth muscle -> prevents Ca2+ influx",
    "indications": {
      "HTN": {
        "dose": "2-4",
        "unit": "mg/hr",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 4,
      "V2": 0,
      "V3": 0,
      "k10": 0.3,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 1.2,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.02,
      "gamma": 2,
      "sysMax": -30,
      "diaMax": -40,
      "hrMax": 15,
      "rrMax": 0
    },
    "notes": "Dihydropyridine calcium channel blocker. Fast-acting arterial dilator. Extremely short half-life (~1 min) due to rapid blood esterase metabolism."
  },
  clonidine: {
    "name": "Clonidine",
    "classes": [
      "Alpha-2 Agonist"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic / Renal",
    "targetReceptor": "Alpha-2",
    "intracellularCascade": "a2 (Gi-coupled) -> inhibits adenylate cyclase -> decreases cAMP",
    "indications": {
      "HTN / Sympatholysis": {
        "dose": "150-300",
        "unit": "mcg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 40,
      "V3": 0,
      "k10": 0.03,
      "k12": 0.05,
      "k21": 0.04,
      "k13": 0,
      "k31": 0,
      "ke0": 0.1,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 0.001,
      "gamma": 1.5,
      "sysMax": -25,
      "diaMax": -15,
      "hrMax": -20,
      "rrMax": -2
    },
    "notes": "Centrally-acting Alpha-2 agonist. Reduces sympathetic outflow, lowering SVR and HR. IV dose 150-300 mcg produces meaningful hemodynamic effects."
  },
  enalaprilat: {
    "name": "Enalaprilat",
    "classes": [
      "ACE Inhibitor"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal",
    "targetReceptor": "ACE",
    "indications": {
      "HTN": {
        "dose": "1.25-5.0",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 10,
      "V2": 20,
      "V3": 0,
      "k10": 0.02,
      "k12": 0.05,
      "k21": 0.05,
      "k13": 0,
      "k31": 0,
      "ke0": 0.015,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.3,
      "gamma": 1.5,
      "sysMax": -25,
      "diaMax": -20,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Active IV form of enalapril. Inhibits Angiotensin Converting Enzyme. Can cause refractory intraoperative hypotension if not held on day of surgery."
  },
  esmolol: {
    "name": "Esmolol",
    "classes": [
      "Beta-1 Blocker"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "RBC Esterases",
    "targetReceptor": "Beta-1",
    "intracellularCascade": "B1 antagonist -> blocks Gs-coupled activation -> decreases cAMP in myocardium",
    "indications": {
      "Tachycardia": {
        "dose": "10-20",
        "unit": "mg",
        "type": "Bolus"
      },
      "Infusion": {
        "dose": "50-100",
        "unit": "mcg/kg/min",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 3.3,
      "V2": 0,
      "V3": 0,
      "k10": 0.077,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 1.5,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 1,
      "gamma": 1.5,
      "sysMax": -15,
      "diaMax": -10,
      "hrMax": -30,
      "rrMax": 0
    },
    "notes": "Ultra-short acting cardioselective Beta-1 blocker. Metabolized via red blood cell esterases (half-life ~9 mins). Lowers HR and BP rapidly."
  },
  hydralazine: {
    "name": "Hydralazine",
    "classes": [
      "Arterial Vasodilator"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (N-acetylation)",
    "targetReceptor": "Arterial Smooth Muscle",
    "indications": {
      "HTN": {
        "dose": "5-20",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 20,
      "V2": 50,
      "V3": 0,
      "k10": 0.05,
      "k12": 0.1,
      "k21": 0.05,
      "k13": 0,
      "k31": 0,
      "ke0": 0.02,
      "coSensitivity": 0.3
    },
    "pd": {
      "c50": 0.03,
      "gamma": 1.5,
      "sysMax": -40,
      "diaMax": -30,
      "hrMax": 25,
      "rrMax": 0
    },
    "notes": "Direct arterial smooth muscle vasodilator. Prompts slow, progressive BP reduction but triggers profound reflex tachycardia. Slow onset (15-20 min)."
  },
  labetalol: {
    "name": "Labetalol",
    "classes": [
      "Mixed Alpha/Beta"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic",
    "targetReceptor": "Alpha-1, Beta-1/2",
    "intracellularCascade": "Mixed antagonist -> blocks a1 (Gq), B1/B2 (Gs) -> prevents Ca2+ release and cAMP production",
    "indications": {
      "HTN": {
        "dose": "10-20",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 60,
      "V2": 0,
      "V3": 0,
      "k10": 0.007,
      "k12": 0.05,
      "k21": 0.02,
      "k13": 0,
      "k31": 0,
      "ke0": 0.8,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 0.25,
      "gamma": 2,
      "sysMax": -40,
      "diaMax": -35,
      "hrMax": -20,
      "rrMax": 0
    },
    "notes": "Mixed competitive antagonist. 1:7 Alpha-1 to Beta blockade ratio when given IV. Lowers SVR and SBP while preventing reflex tachycardia."
  },
  metoprolol: {
    "name": "Metoprolol",
    "classes": [
      "Beta-1 Blocker"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (CYP2D6)",
    "proteinBinding": 0.12,
    "targetReceptor": "Beta-1",
    "intracellularCascade": "B1 antagonist -> blocks Gs-coupled activation -> decreases cAMP in myocardium",
    "indications": {
      "Tachycardia": {
        "dose": "2.5-5.0",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 40,
      "V2": 0,
      "V3": 0,
      "k10": 0.02,
      "k12": 0.04,
      "k21": 0.02,
      "k13": 0,
      "k31": 0,
      "ke0": 0.5,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.1,
      "gamma": 1.5,
      "sysMax": -20,
      "diaMax": -15,
      "hrMax": -35,
      "rrMax": 0
    },
    "notes": "Cardioselective Beta-1 adrenergic blocker. Intermediate acting. Lowers heart rate and contractility."
  },
  propranolol: {
    "name": "Propranolol",
    "classes": [
      "Beta-Blocker",
      "Non-Selective"
    ],
    "routes": [
      "IV",
      "PO"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (extensive first-pass, CYP2D6)",
    "targetReceptor": "Beta-1, Beta-2",
    "indications": {
      "Thyroid Storm": {
        "dose": "0.5-1",
        "unit": "mg",
        "type": "Bolus"
      },
      "Rate Control / HTN": {
        "dose": "1-3",
        "unit": "mg",
        "type": "Bolus"
      },
      "Prophylaxis": {
        "dose": "40-80",
        "unit": "mg/day",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 30,
      "V2": 0,
      "V3": 0,
      "k10": 0.006,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 0.6,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 0.03,
      "gamma": 2,
      "sysMax": -25,
      "diaMax": -20,
      "hrMax": -35,
      "rrMax": -1
    },
    "notes": "Non-selective beta-blocker. Also blocks T4→T3 conversion → preferred in thyroid storm. 1mg IV → 55% effect; 2mg → 83% effect.",
    "proteinBinding": 0.93,
    "intracellularCascade": "Non-selective beta antagonist -> blocks Gs-coupled cAMP signaling in heart (B1) and vasculature/bronchi (B2)"
  },
  atenolol: {
    "name": "Atenolol",
    "classes": [
      "Beta-1 Blocker",
      "Cardioselective"
    ],
    "routes": [
      "PO",
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal (unchanged)",
    "targetReceptor": "Beta-1 (cardioselective)",
    "indications": {
      "Hypertension": {
        "dose": "25-50",
        "unit": "mg/day",
        "type": "Bolus"
      },
      "Rate Control": {
        "dose": "25-100",
        "unit": "mg/day",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 60,
      "V2": 0,
      "V3": 0,
      "k10": 0.012,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 0.3,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.10,
      "gamma": 1.5,
      "sysMax": -18,
      "diaMax": -14,
      "hrMax": -30,
      "rrMax": 0
    },
    "notes": "Cardioselective B1 blocker. Renally excreted → dose reduce in CKD. Hydrophilic → less CNS side effects than propranolol. 5mg IV gives 43% effect; 10mg gives 68%.",
    "proteinBinding": 0.03,
    "intracellularCascade": "Selective B1 antagonist -> reduced heart rate and contractility; minimal B2 effects at therapeutic doses"
  },
  digoxinFab: {
    "name": "Digoxin Immune Fab",
    "classes": [
      "Antidote",
      "Cardiac Glycoside Reversal"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal (Fab-digoxin complex)",
    "targetReceptor": "Digoxin",
    "indications": {
      "Digoxin Toxicity": {
        "dose": "10-20",
        "unit": "vials",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 30,
      "V2": 0,
      "V3": 0,
      "k10": 0.008,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 0.5,
      "coSensitivity": 0
    },
    "pd": {
      "c50": 1,
      "gamma": 2,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Specific antidote for digoxin toxicity. Binds free digoxin. Post-reversal K+ drops — monitor closely.",
    "proteinBinding": 0
  },
  nifedipine: {
    "name": "Nifedipine",
    "classes": [
      "CCB",
      "Dihydropyridine"
    ],
    "routes": [
      "PO"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (CYP3A4)",
    "targetReceptor": "L-type Calcium",
    "intracellularCascade": "Dihydropyridine CCB -> blocks L-type VGCCs in vascular smooth muscle (selectivity: vascular >> cardiac) -> reduced Ca2+ influx -> vasodilation",
    "pk": {
      "V1": 40,
      "V2": 0,
      "V3": 0,
      "k10": 0.04,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 0.4,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.4,
      "gamma": 1.5,
      "sysMax": -35,
      "diaMax": -30,
      "hrMax": 12,
      "rrMax": 0
    },
    "notes": "Dihydropyridine CCB. Oral antihypertensive, first-line for acute PEC severe hypertension.",
    "proteinBinding": 0.92,
    "indications": {
      "Hypertension (PEC)": {
        "dose": "10",
        "unit": "mg",
        "type": "Bolus"
      },
      "Hypertension (Chronic)": {
        "dose": "30-60",
        "unit": "mg/day",
        "type": "Bolus"
      }
    }
  },
  methyldopa: {
    "name": "Methyldopa",
    "classes": [
      "Central Alpha-2 Agonist"
    ],
    "routes": [
      "PO",
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic / Renal",
    "targetReceptor": "Alpha-2 Adrenergic (Central)",
    "intracellularCascade": "Central alpha-2 agonist -> reduces sympathetic outflow from NTS -> decreased NE release -> vasodilation and bradycardia",
    "pk": {
      "V1": 30,
      "V2": 0,
      "V3": 0,
      "k10": 0.015,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 0.2,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 1,
      "gamma": 1.5,
      "sysMax": -25,
      "diaMax": -20,
      "hrMax": -10,
      "rrMax": 0
    },
    "notes": "First-line chronic antihypertensive in pregnancy (decades of safety data). Slow onset — not for acute severe HTN.",
    "proteinBinding": 0.15,
    "indications": {
      "Chronic HTN in Pregnancy": {
        "dose": "250-500",
        "unit": "mg",
        "type": "Bolus"
      },
      "Hypertensive Urgency IV": {
        "dose": "250-500",
        "unit": "mg",
        "type": "Bolus"
      }
    }
  },
  nicardipine: {
    "name": "Nicardipine",
    "classes": [
      "CCB"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic",
    "targetReceptor": "L-type Calcium",
    "intracellularCascade": "Dihydropyridine CCB -> blocks L-type VGCCs in vascular smooth muscle -> prevents Ca2+ influx",
    "indications": {
      "HTN": {
        "dose": "5-15",
        "unit": "mg/hr",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 25,
      "V2": 0,
      "V3": 0,
      "k10": 0.05,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 0.5,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.1,
      "gamma": 2,
      "sysMax": -25,
      "diaMax": -35,
      "hrMax": 10,
      "rrMax": 0
    },
    "notes": "Dihydropyridine calcium channel blocker. Strong selective arterial vasodilator. Excellent for stable, titrated SVR and SBP reduction."
  },
  nitroglycerin: {
    "name": "Nitroglycerin",
    "classes": [
      "Venodilator"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic / Blood (rapid enzymatic conversion)",
    "targetReceptor": "Venous Smooth Muscle",
    "indications": {
      "Ischemia": {
        "dose": "10-20",
        "unit": "mcg/min",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 0,
      "V3": 0,
      "k10": 0.25,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 1.5,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 0.005,
      "gamma": 1.5,
      "sysMax": -20,
      "diaMax": -30,
      "hrMax": 10,
      "rrMax": 0
    },
    "notes": "Selective venous vasodilator (reduces cardiac preload and wall tension). Promotes coronary collateral perfusion. High dose triggers arterial dilation. Risks Methemoglobinemia in high continuous doses."
  },
  nitroprusside: {
    "name": "Nitroprusside",
    "classes": [
      "Mixed Dilator"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "RBCs (Cyanide release)",
    "targetReceptor": "Arterial/Venous Muscle",
    "indications": {
      "HTN Crisis": {
        "dose": "0.3-0.5",
        "unit": "mcg/kg/min",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 10,
      "V2": 0,
      "V3": 0,
      "k10": 0.3,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 1.5,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.002,
      "gamma": 2,
      "sysMax": -40,
      "diaMax": -40,
      "hrMax": 20,
      "rrMax": 0
    },
    "notes": "Balanced arterial and venous smooth muscle dilator. High potency, immediate effect. STRICT safety warning: Photodegradable. Releases 5 cyanide groups per molecule. Prolonged or high-dose infusion (>2 mcg/kg/min) risks lethal Cyanide Toxicity (inhibits cytochrome c oxidase, blocking oxidative phosphorylation, causing profound cellular hypoxia, lactic acidosis, and elevated mixed venous oxygen)."
  },
  phentolamine: {
    "name": "Phentolamine",
    "classes": [
      "Alpha Blocker"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic",
    "targetReceptor": "Alpha-1, Alpha-2",
    "indications": {
      "Pheochromocytoma": {
        "dose": "1-5",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 0,
      "V3": 0,
      "k10": 0.15,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 0.5,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 0.5,
      "gamma": 2,
      "sysMax": -50,
      "diaMax": -40,
      "hrMax": 30,
      "rrMax": 0
    },
    "notes": "Nonselective competitive alpha-adrenergic blocker. Fast-acting. Triggers reflex tachycardia due to Alpha-2 blockade."
  },
  acetazolamide: {
    "name": "Acetazolamide",
    "classes": [
      "CA Inhibitor"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal (Unchanged)",
    "targetReceptor": "Carbonic Anhydrase",
    "indications": {
      "Metabolic Alkalosis": {
        "dose": "250-500",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 30,
      "V3": 0,
      "k10": 0.02,
      "k12": 0.05,
      "k21": 0.05,
      "k13": 0,
      "k31": 0,
      "ke0": 0.05,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 5,
      "gamma": 1,
      "sysMax": -5,
      "diaMax": -5,
      "hrMax": 0,
      "rrMax": 5
    },
    "notes": "Inhibits proximal tubule carbonic anhydrase, blocking bicarbonate reabsorption and inducing metabolic acidosis."
  },
  bumetanide: {
    "name": "Bumetanide",
    "classes": [
      "Loop Diuretic"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic / Renal",
    "targetReceptor": "Na-K-2Cl Symporter",
    "indications": {
      "Edema / Oliguria": {
        "dose": "0.5-2.0",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 6,
      "V2": 10,
      "V3": 0,
      "k10": 0.04,
      "k12": 0.05,
      "k21": 0.05,
      "k13": 0,
      "k31": 0,
      "ke0": 0.1,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 0.05,
      "gamma": 1.5,
      "sysMax": -15,
      "diaMax": -15,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Potent loop diuretic, 40x more potent than furosemide. Blocks thick ascending limb Na-K-2Cl transport."
  },
  furosemide: {
    "name": "Furosemide",
    "classes": [
      "Loop Diuretic"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal and Hepatic",
    "targetReceptor": "Na-K-2Cl Symporter",
    "indications": {
      "Edema / Oliguria": {
        "dose": "20-80",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 8,
      "V2": 12,
      "V3": 0,
      "k10": 0.03,
      "k12": 0.05,
      "k21": 0.05,
      "k13": 0,
      "k31": 0,
      "ke0": 0.1,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 2,
      "gamma": 1.5,
      "sysMax": -15,
      "diaMax": -15,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Classic loop diuretic. Exerts moderate direct venous vasodilatory effect prior to diuresis. Prompts renal excretion of potassium."
  },
  mannitol: {
    "name": "Mannitol 20%",
    "classes": [
      "Osmotic Diuretic"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal (Unchanged)",
    "targetReceptor": "Tubular Lumen",
    "indications": {
      "Elevated ICP": {
        "dose": "50-100",
        "unit": "g",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 0,
      "V3": 0,
      "k10": 0.02,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 0.1,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 50,
      "gamma": 1,
      "sysMax": 5,
      "diaMax": 5,
      "hrMax": -5,
      "rrMax": 0
    },
    "notes": "Osmotic diuretic. Increases intravascular volume initially (pre-diuresis, caution in HF/pulmonary edema), then draws water from brain parenchyma to reduce intracranial pressure."
  },
  adenosine: {
    "name": "Adenosine",
    "classes": [
      "Purinergic"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "RBC and Endothelial cell uptake (rapid deamination)",
    "targetReceptor": "A1 Receptors",
    "intracellularCascade": "A1 (Gi-coupled) -> inhibits adenylate cyclase (decreased cAMP) -> activates K-ACh channels -> hyperpolarization",
    "indications": {
      "SVT": {
        "dose": "6-12",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 5,
      "V2": 0,
      "V3": 0,
      "k10": 5,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 5,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.2,
      "gamma": 4,
      "sysMax": -25,
      "diaMax": -15,
      "hrMax": -50,
      "rrMax": 0
    },
    "notes": "Activates G-protein-coupled A1 receptors, increasing potassium efflux and hyperpolarizing AV nodal tissue to terminate SVT. Extremely short half-life (<10 sec). Bolus must be rapid."
  },
  amiodarone: {
    "name": "Amiodarone",
    "classes": [
      "Class III"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (CYP3A4) to active desethylamiodarone",
    "targetReceptor": "Potassium Channels",
    "indications": {
      "VT/VF Arrest": {
        "dose": "300",
        "unit": "mg",
        "type": "Bolus"
      },
      "Stable VT": {
        "dose": "150",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 500,
      "V2": 0,
      "V3": 0,
      "k10": 0.005,
      "k12": 0.02,
      "k21": 0.01,
      "k13": 0,
      "k31": 0,
      "ke0": 0.5,
      "coSensitivity": 0.5
    },
    "pd": {
      "c50": 2,
      "gamma": 1.5,
      "sysMax": -25,
      "diaMax": -20,
      "hrMax": -20,
      "rrMax": 0
    },
    "notes": "Broad-spectrum antiarrhythmic exhibiting characteristics of all 4 Vaughan Williams classes. Extremely high volume of distribution and half-life (weeks)."
  },
  atropine: {
    "name": "Atropine",
    "classes": [
      "Anticholinergic"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (50%), renal unchanged (50%)",
    "targetReceptor": "Muscarinic (M2/M3)",
    "intracellularCascade": "Antagonizes M2 (Gi-coupled) at SA/AV node -> prevents cAMP decrease -> increases HR",
    "indications": {
      "Bradycardia": {
        "dose": "0.5-1.0",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 20,
      "V2": 0,
      "V3": 0,
      "k10": 0.08,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 4.0,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.02,
      "gamma": 2,
      "sysMax": 5,
      "diaMax": 5,
      "hrMax": 55,
      "rrMax": 0
    },
    "notes": "Tertiary amine. Crosses BBB (can cause central anticholinergic syndrome in elderly). Blocks vagal stimulation to SA/AV nodes, increasing HR."
  },
  bicarbonate: {
    "name": "Sodium Bicarbonate",
    "classes": [
      "Buffer"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Reacts to release CO2 via lungs",
    "targetReceptor": "Plasma pH",
    "indications": {
      "Metabolic Acidosis": {
        "dose": "50",
        "unit": "mEq",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 0,
      "V3": 0,
      "k10": 0.1,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 0.5,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 1,
      "gamma": 1,
      "sysMax": 5,
      "diaMax": 5,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Buffers excess hydrogen ions. Generates heavy CO2 load (requires adequate ventilation to eliminate). Precipitously shifts potassium intracellularly."
  },
  calcium: {
    "name": "Calcium Chloride",
    "classes": [
      "Electrolyte"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Skeletal / Renal",
    "targetReceptor": "Myocardium",
    "indications": {
      "Hypocalcemia/Inotropy": {
        "dose": "0.5-1.0",
        "unit": "g",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 10,
      "V2": 0,
      "V3": 0,
      "k10": 0.1,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 0.5,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.1,
      "gamma": 1.5,
      "sysMax": 25,
      "diaMax": 15,
      "hrMax": -5,
      "rrMax": 0
    },
    "notes": "Contains 3x more elemental calcium than calcium gluconate. Stabilizes myocardial resting membranes in severe hyperkalemia. Boosts inotropy. Highly irritating to veins (causes severe phlebitis/necrosis if extravasated, CVC preferred). Strict warning: Do NOT mix with Bicarbonate in same IV line (precipitates)."
  },
  digoxin: {
    "name": "Digoxin",
    "classes": [
      "Cardiac Glycoside"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "LBW",
    "metabolism": "Renal excretion (unchanged)",
    "targetReceptor": "Na+/K+-ATPase",
    "indications": {
      "Rate Control": {
        "dose": "0.25-0.5",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 50,
      "V2": 300,
      "V3": 0,
      "k10": 0.00016,
      "k12": 0.001,
      "k21": 0.0005,
      "k13": 0,
      "k31": 0,
      "ke0": 0.05,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 1.5,
      "gamma": 1.5,
      "sysMax": 10,
      "diaMax": 5,
      "hrMax": -20,
      "rrMax": 0
    },
    "notes": "Inhibits Na+/K+-ATPase, indirectly increasing intracellular Ca2+ (inotropic) while increasing vagal tone (slowing AV conduction). Highly renal dependent."
  },
  diltiazem: {
    "name": "Diltiazem",
    "classes": [
      "Class IV CCB"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (CYP3A4) to active deacetyldiltiazem",
    "targetReceptor": "L-type Calcium",
    "intracellularCascade": "Non-DHP CCB -> blocks L-type VGCCs in myocardium/AV node -> prevents Ca2+ influx",
    "indications": {
      "Afib / Rate Control": {
        "dose": "10-20",
        "unit": "mg",
        "type": "Bolus"
      },
      "Infusion": {
        "dose": "5-15",
        "unit": "mg/hr",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 30,
      "V2": 60,
      "V3": 0,
      "k10": 0.1,
      "k12": 0.05,
      "k21": 0.05,
      "k13": 0,
      "k31": 0,
      "ke0": 0.3,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 0.5,
      "gamma": 2,
      "sysMax": -20,
      "diaMax": -20,
      "hrMax": -25,
      "rrMax": 0
    },
    "notes": "Benzothiazepine CCB. Slows AV nodal conduction. Negatively inotropic and vasodilatory."
  },
  ibutilide: {
    "name": "Ibutilide",
    "classes": [
      "Class III"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic",
    "targetReceptor": "Slow Inward Na+",
    "indications": {
      "Chemical Cardioversion": {
        "dose": "1.0",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 10,
      "V2": 20,
      "V3": 0,
      "k10": 0.05,
      "k12": 0.05,
      "k21": 0.05,
      "k13": 0,
      "k31": 0,
      "ke0": 0.2,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 0.005,
      "gamma": 1.5,
      "sysMax": -5,
      "diaMax": -5,
      "hrMax": -10,
      "rrMax": 0
    },
    "notes": "Class III antiarrhythmic. Prolongs action potential duration. High risk of Torsades de Pointes (QT prolongation)."
  },
  lidocaine: {
    "name": "Lidocaine",
    "classes": [
      "Class IB"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (CYP1A2/3A4) to active MEGX",
    "proteinBinding": 0.6,
    "targetReceptor": "Fast Na+ Channels",
    "indications": {
      "Arrhythmia": {
        "dose": "1.0-1.5",
        "unit": "mg/kg",
        "type": "Bolus"
      },
      "Airway Blunting": {
        "dose": "1.5",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 25,
      "V2": 50,
      "V3": 150,
      "k10": 0.05,
      "k12": 0.1,
      "k21": 0.05,
      "k13": 0.02,
      "k31": 0.01,
      "ke0": 0.5,
      "coSensitivity": 0.3,
      "proteinBinding": 0.6,
      "renalFraction": 0,
      "hepaticFraction": 1
    },
    "pd": {
      "c50": 1,
      "gamma": 1,
      "sysMax": -10,
      "diaMax": -10,
      "hrMax": -10,
      "rrMax": 0,
      "ccCnsRatio": 7
    },
    "notes": "Class IB sodium channel blocker. Suppresses ventricular arrhythmias (VT/VF) and blunts sympathetic responses to intubation. Risks Local Anesthetic Systemic Toxicity (LAST: seizures, bradycardia, arrest) at high plasma levels."
  },
  benzocaine: {
    "name": "Benzocaine",
    "classes": [
      "Local Anesthetic"
    ],
    "routes": [
      "Topical"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Plasma Cholinesterase",
    "proteinBinding": 0,
    "targetReceptor": "Sodium Channels",
    "indications": {
      "Topical Anesthesia": {
        "dose": "1.0-2.0",
        "unit": "sprays",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 20,
      "V2": 0,
      "V3": 0,
      "k10": 0.1,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 1,
      "coSensitivity": 0.1,
      "proteinBinding": 0,
      "renalFraction": 0,
      "hepaticFraction": 0
    },
    "pd": {
      "c50": 1,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0,
      "ccCnsRatio": 8
    },
    "notes": "Ester local anesthetic. Used for topical mucosal anesthesia. High risk of inducing Methemoglobinemia due to oxidation of hemoglobin to methemoglobin."
  },
  prilocaine: {
    "name": "Prilocaine",
    "classes": [
      "Local Anesthetic"
    ],
    "routes": [
      "Topical",
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic to o-toluidine active metabolite",
    "proteinBinding": 0.55,
    "targetReceptor": "Sodium Channels",
    "indications": {
      "Local Infiltration": {
        "dose": "1.0-2.0",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 25,
      "V2": 40,
      "V3": 0,
      "k10": 0.05,
      "k12": 0.05,
      "k21": 0.05,
      "k13": 0,
      "k31": 0,
      "ke0": 1,
      "coSensitivity": 0.1,
      "proteinBinding": 0.55,
      "renalFraction": 0,
      "hepaticFraction": 1
    },
    "pd": {
      "c50": 2,
      "gamma": 1.5,
      "sysMax": -5,
      "diaMax": -5,
      "hrMax": -5,
      "rrMax": 0,
      "ccCnsRatio": 8
    },
    "notes": "Amide local anesthetic. Metabolized to o-toluidine, which oxidizes hemoglobin to methemoglobin, risking severe Methemoglobinemia."
  },
  mepivacaine: {
    "name": "Mepivacaine",
    "classes": [
      "Local Anesthetic"
    ],
    "routes": [
      "Infiltration",
      "Epidural",
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic",
    "proteinBinding": 0.75,
    "targetReceptor": "Sodium Channels",
    "indications": {
      "Local Infiltration": {
        "dose": "1.0-2.0",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 22,
      "V2": 45,
      "V3": 0,
      "k10": 0.06,
      "k12": 0.05,
      "k21": 0.05,
      "k13": 0,
      "k31": 0,
      "ke0": 0.6,
      "coSensitivity": 0.2,
      "proteinBinding": 0.75,
      "renalFraction": 0,
      "hepaticFraction": 1
    },
    "pd": {
      "c50": 1.1,
      "gamma": 1.5,
      "sysMax": -8,
      "diaMax": -8,
      "hrMax": -8,
      "rrMax": 0,
      "ccCnsRatio": 7
    },
    "notes": "Amide local anesthetic, intermediate potency and duration (Table 29.2, Ch29, Miller's 9th Ed). Commonly used for peripheral nerve blocks and dental/infiltration anesthesia."
  },
  bupivacaine: {
    "name": "Bupivacaine",
    "classes": [
      "Local Anesthetic"
    ],
    "routes": [
      "IV",
      "Epidural",
      "Spinal"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic",
    "proteinBinding": 0.95,
    "targetReceptor": "Sodium Channels",
    "indications": {
      "Local Infiltration": {
        "dose": "1.0-2.5",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 10,
      "V2": 30,
      "V3": 150,
      "k10": 0.015,
      "k12": 0.05,
      "k21": 0.02,
      "k13": 0.01,
      "k31": 0.005,
      "ke0": 0.1,
      "coSensitivity": 0.4,
      "proteinBinding": 0.95,
      "renalFraction": 0,
      "hepaticFraction": 1
    },
    "pd": {
      "c50": 0.3,
      "gamma": 2,
      "sysMax": -20,
      "diaMax": -20,
      "hrMax": -15,
      "rrMax": 0,
      "ccCnsRatio": 2
    },
    "notes": "Racemic amide local anesthetic. High potency, long duration. Extremely high cardiotoxicity due to slow dissociation from cardiac sodium channels (\"fast-in, slow-out\") and mitochondrial inhibition. CC/CNS ratio ~2.0."
  },
  ropivacaine: {
    "name": "Ropivacaine",
    "classes": [
      "Local Anesthetic"
    ],
    "routes": [
      "IV",
      "Epidural",
      "Spinal"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic",
    "proteinBinding": 0.94,
    "targetReceptor": "Sodium Channels",
    "indications": {
      "Local Infiltration": {
        "dose": "1.0-3.0",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 12,
      "V2": 35,
      "V3": 160,
      "k10": 0.02,
      "k12": 0.06,
      "k21": 0.025,
      "k13": 0.01,
      "k31": 0.006,
      "ke0": 0.15,
      "coSensitivity": 0.35,
      "proteinBinding": 0.94,
      "renalFraction": 0,
      "hepaticFraction": 1
    },
    "pd": {
      "c50": 0.4,
      "gamma": 2,
      "sysMax": -15,
      "diaMax": -15,
      "hrMax": -10,
      "rrMax": 0,
      "ccCnsRatio": 4
    },
    "notes": "Pure S-enantiomer amide local anesthetic. Reduced cardiotoxicity compared to bupivacaine (CC/CNS ratio ~4.0) due to faster dissociation from sodium channels."
  },
  levobupivacaine: {
    "name": "Levobupivacaine",
    "classes": [
      "Local Anesthetic"
    ],
    "routes": [
      "IV",
      "Epidural",
      "Spinal"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic",
    "proteinBinding": 0.97,
    "targetReceptor": "Sodium Channels",
    "indications": {
      "Local Infiltration": {
        "dose": "1.0-2.5",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 10,
      "V2": 30,
      "V3": 150,
      "k10": 0.018,
      "k12": 0.05,
      "k21": 0.02,
      "k13": 0.01,
      "k31": 0.005,
      "ke0": 0.12,
      "coSensitivity": 0.38,
      "proteinBinding": 0.97,
      "renalFraction": 0,
      "hepaticFraction": 1
    },
    "pd": {
      "c50": 0.33,
      "gamma": 2,
      "sysMax": -18,
      "diaMax": -18,
      "hrMax": -12,
      "rrMax": 0,
      "ccCnsRatio": 3.3
    },
    "notes": "Pure S-enantiomer of bupivacaine. Reduced cardiotoxicity compared to racemic bupivacaine (CC/CNS ratio ~3.3)."
  },
  cocaine: {
    "name": "Cocaine",
    "classes": [
      "Local Anesthetic",
      "Sympathomimetic"
    ],
    "routes": [
      "Topical",
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Plasma and Hepatic Esterases",
    "proteinBinding": 0.9,
    "targetReceptor": "Norepinephrine Transporter",
    "indications": {
      "Topical Vasoconst": {
        "dose": "1.5-3.0",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 30,
      "V3": 0,
      "k10": 0.04,
      "k12": 0.05,
      "k21": 0.03,
      "k13": 0,
      "k31": 0,
      "ke0": 0.8,
      "coSensitivity": 0.2,
      "proteinBinding": 0.9,
      "renalFraction": 0,
      "hepaticFraction": 0.5
    },
    "pd": {
      "c50": 0.1,
      "gamma": 1.5,
      "sysMax": 40,
      "diaMax": 30,
      "hrMax": 35,
      "rrMax": 0,
      "ccCnsRatio": 3
    },
    "notes": "Ester local anesthetic. Blocks sodium channels and inhibits catecholamine reuptake (NET blocker), causing marked vasoconstriction, tachycardia, and hypertension."
  },
  tetracaine: {
    "name": "Tetracaine",
    "classes": [
      "Local Anesthetic"
    ],
    "routes": [
      "Topical",
      "Spinal"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Plasma Cholinesterase",
    "proteinBinding": 0.76,
    "targetReceptor": "Sodium Channels",
    "indications": {
      "Spinal Anesthesia": {
        "dose": "5.0-15.0",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 20,
      "V2": 40,
      "V3": 0,
      "k10": 0.02,
      "k12": 0.05,
      "k21": 0.03,
      "k13": 0,
      "k31": 0,
      "ke0": 0.3,
      "coSensitivity": 0.3,
      "proteinBinding": 0.76,
      "renalFraction": 0,
      "hepaticFraction": 0
    },
    "pd": {
      "c50": 0.5,
      "gamma": 2,
      "sysMax": -12,
      "diaMax": -12,
      "hrMax": -8,
      "rrMax": 0,
      "ccCnsRatio": 2.5
    },
    "notes": "Potent, long-acting ester local anesthetic. Highly lipid-soluble. Used predominantly for spinal and topical anesthesia."
  },
  chloroprocaine: {
    "name": "Chloroprocaine",
    "classes": [
      "Local Anesthetic"
    ],
    "routes": [
      "Epidural",
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Plasma Cholinesterase",
    "proteinBinding": 0,
    "targetReceptor": "Sodium Channels",
    "indications": {
      "Local Infiltration": {
        "dose": "5.0-11.0",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 25,
      "V2": 0,
      "V3": 0,
      "k10": 2,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 2,
      "coSensitivity": 0.1,
      "proteinBinding": 0,
      "renalFraction": 0,
      "hepaticFraction": 0
    },
    "pd": {
      "c50": 2,
      "gamma": 1.5,
      "sysMax": -5,
      "diaMax": -5,
      "hrMax": -5,
      "rrMax": 0,
      "ccCnsRatio": 12
    },
    "notes": "Ultra-short-acting ester local anesthetic. Extremely rapid hydrolysis by pseudocholinesterase (half-life < 30 seconds), making systemic toxicity (LAST) virtually impossible."
  },
  intralipid: {
    "name": "Intralipid 20%",
    "classes": [
      "Rescue Agent",
      "Lipid Emulsion"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Lipolysis / Hepatic clearance",
    "proteinBinding": 0,
    "targetReceptor": "Lipid Sink",
    "indications": {
      "LAST Rescue Bolus": {
        "dose": "1.5",
        "unit": "mL/kg",
        "type": "Bolus"
      },
      "LAST Rescue Infusion": {
        "dose": "0.25",
        "unit": "mL/kg/min",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 10,
      "V2": 0,
      "V3": 0,
      "k10": 0.03,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 1,
      "coSensitivity": 0.1,
      "proteinBinding": 0,
      "renalFraction": 0,
      "hepaticFraction": 1
    },
    "pd": {
      "c50": 1,
      "gamma": 1,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Intravenous lipid emulsion for rescue of local anesthetic systemic toxicity (LAST). Sequesters lipophilic local anesthetics (\"lipid sink\") and restores myocardial mitochondrial metabolism."
  },
  methyleneBlue: {
    "name": "Methylene Blue",
    "classes": [
      "Antidote"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal clearance",
    "proteinBinding": 0,
    "targetReceptor": "Methemoglobin Reductase",
    "indications": {
      "Methemoglobinemia": {
        "dose": "1.0-2.0",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 0,
      "V3": 0,
      "k10": 0.05,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 1,
      "coSensitivity": 0.1,
      "proteinBinding": 0,
      "renalFraction": 0.9,
      "hepaticFraction": 0.1
    },
    "pd": {
      "c50": 1,
      "gamma": 1,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Antidote for Methemoglobinemia. Acts as an electron donor to reduce Methemoglobin (Fe3+) back to functional oxygen-carrying Hemoglobin (Fe2+)."
  },
  methylene_blue: {
    "name": "Methylene Blue",
    "classes": [
      "Vasopressor Adjunct",
      "Antidote"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Tissue reduction to leucomethylene blue",
    "proteinBinding": 0,
    "targetReceptor": "NO Synthase / sGC",
    "indications": {
      "Vasoplegic Shock": {
        "dose": "1-2",
        "unit": "mg/kg",
        "type": "Bolus"
      },
      "Methemoglobinemia": {
        "dose": "1-2",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 20,
      "V2": 50,
      "V3": 0,
      "k10": 0.02,
      "k12": 0.05,
      "k21": 0.03,
      "k13": 0,
      "k31": 0,
      "ke0": 0.1,
      "coSensitivity": 0.2,
      "proteinBinding": 0,
      "renalFraction": 0,
      "hepaticFraction": 1
    },
    "pd": {
      "c50": 2,
      "gamma": 1.5,
      "sysMax": 30,
      "diaMax": 35,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "DUAL ACTION: (1) VASOPLEGIA: Inhibits NO synthase + soluble guanylyl cyclase → blocks NO-mediated vasodilation → potent vasopressor for CPB vasoplegia and other refractory distributive shock; (2) METHEMOGLOBINEMIA ANTIDOTE: Accepts electrons from NADPH → reduces MetHb → OxyHb restoration. CONTRAINDICATED in G6PD deficiency (for methemoglobinemia use) and serotonin syndrome context (MAO inhibitor properties → potentially worsens SS). CAUTION: turns urine/skin blue-green (SpO2 artifact at 660nm → reads low)."
  },
  magnesium: {
    "name": "Magnesium Sulfate",
    "classes": [
      "Electrolyte"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal",
    "targetReceptor": "L-type Calcium / NMDA",
    "indications": {
      "Torsades / Eclampsia": {
        "dose": "1.0-2.0",
        "unit": "g",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 30,
      "V3": 0,
      "k10": 0.04,
      "k12": 0.05,
      "k21": 0.05,
      "k13": 0,
      "k31": 0,
      "ke0": 0.2,
      "coSensitivity": 0.1,
      "proteinBinding": 0,
      "renalFraction": 1,
      "hepaticFraction": 0
    },
    "pd": {
      "c50": 0.5,
      "gamma": 1.5,
      "sysMax": -15,
      "diaMax": -15,
      "hrMax": -5,
      "rrMax": -2
    },
    "notes": "Calcium antagonist. Stabilizes membrane potentials. Treatment of choice for Torsades de Pointes. Enhances neuromuscular blockade."
  },
  albumin: {
    "name": "Albumin 5%",
    "classes": [
      "Colloid"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Reticuloendothelial system",
    "targetReceptor": "Oncotic Pressure",
    "indications": {
      "Volume Resuscitation": {
        "dose": "250-500",
        "unit": "mL",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 0,
      "V3": 0,
      "k10": 0.005,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 0,
      "coSensitivity": 0.1,
      "proteinBinding": 0,
      "renalFraction": 0,
      "hepaticFraction": 0
    },
    "pd": {
      "c50": 0,
      "gamma": 1,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Natural colloid volume expander. Expands intravascular volume 1:1. Retained in vascular space longer than crystalloids."
  },
  esketamine: {
    "name": "Esketamine",
    "classes": [
      "Dissociative",
      "Analgesic"
    ],
    "routes": [
      "IV",
      "IM"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "IBW",
    "metabolism": "Hepatic (CYP3A4/2C9) to active Norketamine",
    "proteinBinding": 0.12,
    "synergyGroup": "Dissociative",
    "pkModel": "Domino/Clements250",
    "targetReceptor": "NMDA Antagonist",
    "indications": {
      "Induction": {
        "dose": "0.5-1.0",
        "unit": "mg/kg",
        "type": "Bolus"
      },
      "Pain/Agitation": {
        "dose": "0.05-0.15",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 20,
      "V2": 45,
      "V3": 150,
      "k10": 0.15,
      "k12": 0.2,
      "k21": 0.1,
      "k13": 0.05,
      "k31": 0.02,
      "ke0": 1.5,
      "coSensitivity": 0.4,
      "renalFraction": 0,
      "hepaticFraction": 1
    },
    "pd": {
      "c50": 0.29,
      "gamma": 2,
      "sysMax": 30,
      "diaMax": 20,
      "hrMax": 20,
      "rrMax": -2,
      "inducesApneaAtCe": 1.43
    },
    "notes": "S(+)-enantiomer of ketamine. 3-4x more potent analgesic than the racemate, with fewer psychomimetic side effects (Ch23, Miller's 9th Ed). Shares the same sympathomimetic, secretory, and emergence-delirium liabilities as racemic ketamine (see ketamine notes); contributes to the shared ketamine-class Ce pool for those effects, scaled by its potency ratio.",
    "intracellularCascade": "Non-competitive NMDA receptor antagonist -> blocks Glutamate/Ca2+ influx"
  },
  potassium: {
    "name": "Potassium Chloride",
    "classes": [
      "Electrolyte"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Intracellular shift / Renal",
    "targetReceptor": "Membrane Potential",
    "indications": {
      "Hypokalemia": {
        "dose": "10-20",
        "unit": "mEq",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 30,
      "V3": 0,
      "k10": 0.03,
      "k12": 0.05,
      "k21": 0.05,
      "k13": 0,
      "k31": 0,
      "ke0": 0.2,
      "coSensitivity": 0.1,
      "proteinBinding": 0,
      "renalFraction": 0.5,
      "hepaticFraction": 0
    },
    "pd": {
      "c50": 1,
      "gamma": 1,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": -10,
      "rrMax": 0
    },
    "notes": "Restores serum potassium. Highly irritating to peripheral veins (infusion rate strictly capped at 10 mEq/hr peripherally, 20 mEq/hr centrally to avoid local burning, chemical phlebitis, and hyperkalemic arrest)."
  },
  procainamide: {
    "name": "Procainamide",
    "classes": [
      "Class IA Antiarrhythmic"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (N-acetyltransferase) to active NAPA",
    "targetReceptor": "Na⁺ Channel + IKr (hERG)",
    "indications": {
      "WPW + AF": {
        "dose": "15",
        "unit": "mg/kg",
        "type": "Bolus"
      },
      "VT": {
        "dose": "10-17",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 40,
      "V2": 60,
      "V3": 0,
      "k10": 0.08,
      "k12": 0.05,
      "k21": 0.04,
      "k13": 0,
      "k31": 0,
      "ke0": 0.3,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 2,
      "gamma": 1.5,
      "sysMax": -15,
      "diaMax": -10,
      "hrMax": -10,
      "rrMax": 0
    },
    "notes": "SAFE in WPW + AF (unlike adenosine/verapamil). Blocks accessory pathway AND AV node. Slow IV essential.",
    "proteinBinding": 0.15
  },
  sotalol: {
    "name": "Sotalol",
    "classes": [
      "Class III / Beta-Blocker"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal (Unchanged)",
    "targetReceptor": "Potassium / Beta-1/2",
    "indications": {
      "Afib / VT": {
        "dose": "75-150",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 20,
      "V2": 0,
      "V3": 0,
      "k10": 0.02,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 0.1,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 2,
      "gamma": 1.5,
      "sysMax": -15,
      "diaMax": -15,
      "hrMax": -30,
      "rrMax": 0
    },
    "notes": "Nonselective beta blocker with strong Class III antiarrhythmic (K+ channel blocking) characteristics."
  },
  verapamil: {
    "name": "Verapamil",
    "classes": [
      "Class IV CCB"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic",
    "targetReceptor": "L-type Calcium",
    "intracellularCascade": "Non-DHP CCB -> blocks L-type VGCCs in myocardium/AV node -> prevents Ca2+ influx",
    "indications": {
      "SVT / Rate Control": {
        "dose": "2.5-5.0",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 40,
      "V2": 80,
      "V3": 0,
      "k10": 0.08,
      "k12": 0.05,
      "k21": 0.05,
      "k13": 0,
      "k31": 0,
      "ke0": 0.2,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 0.3,
      "gamma": 2,
      "sysMax": -25,
      "diaMax": -25,
      "hrMax": -35,
      "rrMax": 0
    },
    "notes": "Phenylalkylamine calcium channel blocker. Acts selectively on AV/SA nodes. Strongly negatively inotropic."
  },
  thiopental: {
    "name": "Thiopental",
    "classes": [
      "Barbiturate"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "LBW",
    "metabolism": "Hepatic (CYP2C19)",
    "proteinBinding": 0.85,
    "synergyGroup": "Sedative",
    "pkModel": "Stanski",
    "targetReceptor": "GABA-A",
    "indications": {
      "Induction": {
        "dose": "3-5",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 7,
      "V2": 40,
      "V3": 150,
      "k10": 0.05,
      "k12": 0.1,
      "k21": 0.08,
      "k13": 0.02,
      "k31": 0.01,
      "ke0": 3.0,
      "coSensitivity": 0.3
    },
    "pd": {
      "c50": 15,
      "gamma": 2,
      "sysMax": -25,
      "diaMax": -20,
      "hrMax": 15,
      "rrMax": -12,
      "inducesApneaAtCe": 10
    },
    "notes": "Potent barbiturate. Fast onset/offset due to brain-to-tissue redistribution. STRICT safety warning: Highly alkaline (pH 10.5). If injected intra-arterially (e.g. into an arterial line), it immediately precipitates into crystals, blocking microvasculature, causing profound endothelial destruction, severe vasospasm, gangrene, and necrosis (Treat immediately with Papaverine, Lidocaine, or stellate ganglion block).",
    "intracellularCascade": "Enhances GABA-A receptor opening duration -> increases Chloride (Cl-) influx -> hyperpolarization"
  },
  methohexital: {
    "name": "Methohexital",
    "classes": [
      "Barbiturate"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "LBW",
    "metabolism": "Hepatic (rapid, hepatic extraction ratio is higher than thiopental)",
    "proteinBinding": 0.73,
    "synergyGroup": "Sedative",
    "pkModel": "Hudson",
    "targetReceptor": "GABA-A",
    "indications": {
      "Induction": {
        "dose": "1.0-2.0",
        "unit": "mg/kg",
        "type": "Bolus"
      },
      "ECT Sedation": {
        "dose": "0.75-1.5",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 30,
      "V3": 90,
      "k10": 0.15,
      "k12": 0.12,
      "k21": 0.09,
      "k13": 0.04,
      "k31": 0.015,
      "ke0": 5.0,
      "coSensitivity": 0.3,
      "proteinBinding": 0.73,
      "hepaticFraction": 0.9,
      "renalFraction": 0.1
    },
    "pd": {
      "c50": 3.5,
      "gamma": 2,
      "sysMax": -20,
      "diaMax": -15,
      "hrMax": 20,
      "rrMax": -10,
      "inducesApneaAtCe": 2.5
    },
    "notes": "Ultra-short acting barbiturate. Rapid redistribution and fast hepatic clearance lead to quicker emergence compared to thiopental. Lowers seizure threshold, making it the preferred induction agent for Electroconvulsive Therapy (ECT). Highly alkaline, same intra-arterial warning.",
    "intracellularCascade": "Enhances GABA-A receptor opening duration -> increases Chloride (Cl-) influx -> hyperpolarization"
  },
  lorazepam: {
    "name": "Lorazepam",
    "classes": [
      "Benzodiazepine"
    ],
    "routes": [
      "IV",
      "IM"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (glucuronidation only, no active metabolites)",
    "proteinBinding": 0.85,
    "synergyGroup": "Sedative",
    "pkModel": "Greenblatt",
    "targetReceptor": "GABA-A",
    "indications": {
      "Anxiolysis / Seizure": {
        "dose": "1-2",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 35,
      "V3": 0,
      "k10": 0.003,
      "k12": 0.03,
      "k21": 0.02,
      "k13": 0,
      "k31": 0,
      "ke0": 0.08,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.05,
      "gamma": 1.5,
      "sysMax": -5,
      "diaMax": -5,
      "hrMax": 0,
      "rrMax": -4,
      "inducesApneaAtCe": 0.5
    },
    "notes": "Intermediate-acting benzodiazepine. Slower onset than midazolam. Highly stable profile."
  },
  flumazenil: {
    "name": "Flumazenil",
    "classes": [
      "GABA Antagonist"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic",
    "proteinBinding": 0.5,
    "targetReceptor": "Benzodiazepine (GABA-A)",
    "indications": {
      "Benzo Reversal": {
        "dose": "0.2-0.5",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 25,
      "V3": 0,
      "k10": 0.018,
      "k12": 0.08,
      "k21": 0.05,
      "k13": 0,
      "k31": 0,
      "ke0": 3.0,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.002,
      "gamma": 1,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0,
      "receptorAffinity": 1.8
    },
    "notes": "Competitive antagonist at the GABA-A benzodiazepine binding site. Dose: 0.2mg IV, repeat q1 min to 1mg max. Duration of action is 45-90 minutes. STRICT clinical constraint: Must monitor for re-sedation for 2-3 hours because benzodiazepine half-life often exceeds Flumazenil (renarcotization/resedation risk)."
  },
  papaverine: {
    "name": "Papaverine",
    "classes": [
      "Vasodilator"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic",
    "proteinBinding": 0.9,
    "targetReceptor": "Phosphodiesterase",
    "indications": {
      "Vasospasm Reversal": {
        "dose": "30-40",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 20,
      "V2": 40,
      "V3": 0,
      "k10": 0.15,
      "k12": 0.1,
      "k21": 0.08,
      "k13": 0,
      "k31": 0,
      "ke0": 1,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 1,
      "gamma": 2,
      "sysMax": -15,
      "diaMax": -15,
      "hrMax": 5,
      "rrMax": 0
    },
    "notes": "Direct-acting smooth muscle relaxant / phosphodiesterase inhibitor. Direct vasodilator. Used to treat arterial vasospasm, especially in response to intra-arterial barbiturate crystal precipitation."
  },
  meperidine: {
    "name": "Meperidine (Pethidine)",
    "classes": [
      "Opioid"
    ],
    "routes": [
      "IV",
      "IM"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (CYP2B6/3A4 to normeperidine)",
    "proteinBinding": 0.6,
    "targetReceptor": "Mu-Opioid",
    "indications": {
      "Post-Op Shivering": {
        "dose": "25",
        "unit": "mg",
        "type": "Bolus"
      },
      "Acute Pain (limited)": {
        "dose": "25-50",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 20,
      "V2": 60,
      "V3": 200,
      "k10": 0.025,
      "k12": 0.05,
      "k21": 0.02,
      "k13": 0.02,
      "k31": 0.002,
      "ke0": 0.5,
      "coSensitivity": 0.5
    },
    "pd": {
      "c50": 0.5,
      "gamma": 1.5,
      "sysMax": -10,
      "diaMax": -5,
      "hrMax": 8,
      "rrMax": -10
    },
    "notes": "ABSOLUTE CONTRAINDICATION with MAO inhibitors (serotonin syndrome/fatal). Drug of choice for post-op shivering at 25mg IV. Normeperidine metabolite causes seizures in renal failure."
  },
  naloxone: {
    "name": "Naloxone",
    "classes": [
      "Opioid Antagonist"
    ],
    "routes": [
      "IV",
      "IM"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (glucuronidation)",
    "proteinBinding": 0.45,
    "targetReceptor": "Mu-Opioid",
    "indications": {
      "Opioid Reversal": {
        "dose": "0.04-0.4",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 30,
      "V3": 0,
      "k10": 0.012,
      "k12": 0.08,
      "k21": 0.08,
      "k13": 0,
      "k31": 0,
      "ke0": 2,
      "coSensitivity": 0.1,
      "proteinBinding": 0.45,
      "renalFraction": 0,
      "hepaticFraction": 1
    },
    "pd": {
      "c50": 0.001,
      "gamma": 2,
      "sysMax": 15,
      "diaMax": 10,
      "hrMax": 20,
      "rrMax": 12
    },
    "notes": "Competitive mu-opioid receptor antagonist. Fast onset, short half-life (~45 min, risks re-narcotization). Fast reversal of chronic opioid users causes severe sympathetic surge (pulmonary edema, tachycardia, arrest)."
  },
  pancuronium: {
    "name": "Pancuronium",
    "classes": [
      "NDMR"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "IBW",
    "metabolism": "Renal (mostly unchanged 40-70%), hepatic 10-20%",
    "proteinBinding": 0.87,
    "targetReceptor": "nAChR (Antagonist)",
    "indications": {
      "Intubation": {
        "dose": "0.08-0.1",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 5,
      "V2": 30,
      "V3": 0,
      "k10": 0.020,
      "k12": 0.03,
      "k21": 0.02,
      "k13": 0,
      "k31": 0,
      "ke0": 0.08,
      "coSensitivity": 0.1,
      "renalFraction": 0.6,
      "hepaticFraction": 0.4
    },
    "pd": {
      "c50": 0.2,
      "gamma": 4,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 20,
      "rrMax": -20,
      "inducesParalysisAtCe": 0.15,
      "inducesApneaAtCe": 0.15,
      "receptorAffinity": 0.8
    },
    "notes": "Long-acting aminosteroid NDMR. Blocks cardiac muscarinic M2 receptors, causing significant tachycardia (Table 27.10, Ch27, Miller's 9th Ed). Wide ganglionic safety margin (>250x) and no histamine release, so no direct hypotensive effect.",
    "intracellularCascade": "Competitive antagonist -> blocks ACh binding -> prevents Na+ influx/depolarization"
  },
  angiotensin_ii: {
    "name": "Angiotensin II",
    "classes": [
      "Vasopressor"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Plasma Peptidases (immediate)",
    "targetReceptor": "AT1",
    "indications": {
      "Refractory Shock": {
        "dose": "20-80",
        "unit": "ng/kg/min",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 5,
      "V2": 0,
      "V3": 0,
      "k10": 2.5,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 3,
      "coSensitivity": 0.05
    },
    "pd": {
      "c50": 0.005,
      "gamma": 2,
      "sysMax": 60,
      "diaMax": 70,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Synthetic human angiotensin II. Binds G-protein coupled AT1 receptors. Specifically designed for vasodilatory, catecholamine-refractory shock."
  },
  heparin: {
    "name": "Heparin",
    "classes": [
      "Anticoagulant"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Reticuloendothelial clearance",
    "proteinBinding": 0.95,
    "targetReceptor": "Antithrombin III",
    "indications": {
      "Cardiopulmonary Bypass": {
        "dose": "300-400",
        "unit": "Units/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 5,
      "V2": 0,
      "V3": 0,
      "k10": 0.015,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 1,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 1.5,
      "gamma": 1,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Accelerates antithrombin III activity 1000-fold, inactivating thrombin and factor Xa. Reversed by protamine on a 1mg : 100 Units Heparin ratio."
  },
  protamine: {
    "name": "Protamine Sulfate",
    "classes": [
      "Reversal"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Plasma Peptidases",
    "targetReceptor": "Heparin",
    "indications": {
      "Heparin Reversal": {
        "dose": "1.0",
        "unit": "mg/100U Heparin",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 10,
      "V2": 0,
      "V3": 0,
      "k10": 0.05,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 1,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.5,
      "gamma": 1,
      "sysMax": -15,
      "diaMax": -15,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Highly basic protein derived from salmon sperm. Forms stable, inactive ionic complex with highly acidic heparin. STRICT safety warning (Protamine Reactions): Type I is isolated hypotension from rapid administration (histamine release); Type II is true IgE-mediated anaphylaxis; Type III is catastrophic pulmonary vasoconstriction, acute right ventricular failure, and severe refractory systemic shock (Thromboxane A2-mediated). Avoid rapid infusion.",
    "proteinBinding": 0
  },
  tranexamicAcid: {
    "name": "Tranexamic Acid (TXA)",
    "classes": [
      "Antifibrinolytic"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal (mostly unchanged >90%)",
    "proteinBinding": 0.03,
    "targetReceptor": "Plasminogen",
    "indications": {
      "Massive Hemorrhage": {
        "dose": "1.0",
        "unit": "g",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 25,
      "V3": 0,
      "k10": 0.02,
      "k12": 0.04,
      "k21": 0.03,
      "k13": 0,
      "k31": 0,
      "ke0": 0.2,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 10,
      "gamma": 1,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Competitive inhibitor of plasminogen activation. Blocks lysine-binding sites, preventing fibrinolysis. First line agent for trauma-induced coagulopathy and postpartum hemorrhage."
  },
  ondansetron: {
    "name": "Ondansetron",
    "classes": [
      "Antiemetic"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (CYP3A4/2D6)",
    "proteinBinding": 0.73,
    "targetReceptor": "5-HT3",
    "indications": {
      "PONV Prophylaxis": {
        "dose": "4.0",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 20,
      "V2": 50,
      "V3": 0,
      "k10": 0.05,
      "k12": 0.05,
      "k21": 0.04,
      "k13": 0,
      "k31": 0,
      "ke0": 0.5,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.1,
      "gamma": 1,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Selective 5-HT3 serotonin receptor antagonist. First line antiemetic. Side effects include mild headache and QT prolongation."
  },
  dexamethasone: {
    "name": "Dexamethasone",
    "classes": [
      "Corticosteroid"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic",
    "proteinBinding": 0.7,
    "targetReceptor": "Glucocorticoid",
    "indications": {
      "PONV Prophylaxis / Swelling": {
        "dose": "4-8",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 30,
      "V2": 40,
      "V3": 0,
      "k10": 0.01,
      "k12": 0.02,
      "k21": 0.01,
      "k13": 0,
      "k31": 0,
      "ke0": 0.05,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.5,
      "gamma": 1,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Potent long-acting corticosteroid. Strongly reduces post-op swelling and acts as highly effective secondary antiemetic."
  },
  albuterol: {
    "name": "Albuterol (Salbutamol)",
    "classes": [
      "Beta-2 Agonist",
      "Bronchodilator"
    ],
    "routes": [
      "IV",
      "Inhaled"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic / GI",
    "proteinBinding": 0.1,
    "targetReceptor": "Beta-2 Adrenergic",
    "indications": {
      "Bronchospasm": {
        "dose": "2.5",
        "unit": "mg",
        "type": "Bolus"
      },
      "Hyperkalemia": {
        "dose": "20",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 30,
      "V2": 60,
      "V3": 0,
      "k10": 0.03,
      "k12": 0.04,
      "k21": 0.025,
      "k13": 0,
      "k31": 0,
      "ke0": 0.6,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 0.05,
      "gamma": 1.5,
      "sysMax": -8,
      "diaMax": -5,
      "hrMax": 15,
      "rrMax": 0
    },
    "notes": "Selective beta-2 agonist. First-line bronchospasm treatment and hyperkalemia management (shifts K+ intracellularly)."
  },
  unasyn: {
    "name": "Ampicillin/Sulbactam (Unasyn)",
    "classes": [
      "Antibiotic"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal (Unchanged)",
    "proteinBinding": 0.28,
    "targetReceptor": "Penicillin-Binding Proteins",
    "indications": {
      "Surgical Prophylaxis": {
        "dose": "1.5-3.0",
        "unit": "g",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 12,
      "V2": 18,
      "V3": 0,
      "k10": 0.05,
      "k12": 0.04,
      "k21": 0.04,
      "k13": 0,
      "k31": 0,
      "ke0": 0.1,
      "coSensitivity": 0.1,
      "proteinBinding": 0.28,
      "renalFraction": 1,
      "hepaticFraction": 0
    },
    "pd": {
      "c50": 0.1,
      "gamma": 1,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Penicillin antibiotic with beta-lactamase inhibitor. Highly effective for intra-abdominal and soft-tissue prophylaxis. Pushing this bolus in patients with documented severe penicillin allergy triggers life-threatening Penicillin Anaphylaxis (IgE-mediated severe vasodilation, hypotension, bradycardia, and severe bronchospasm/apnea)."
  },
  cefazolin: {
    "name": "Cefazolin",
    "classes": [
      "Antibiotic",
      "1st-Gen Cephalosporin"
    ],
    "routes": [
      "IV",
      "IM"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal (Unchanged >90%)",
    "proteinBinding": 0.74,
    "targetReceptor": "Penicillin-Binding Proteins",
    "indications": {
      "Surgical Prophylaxis": {
        "dose": "2.0",
        "unit": "g",
        "type": "Bolus"
      },
      "Gram-Positive Infection": {
        "dose": "1-2",
        "unit": "g",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 10,
      "V2": 5,
      "V3": 0,
      "k10": 0.0064,
      "k12": 0.03,
      "k21": 0.04,
      "k13": 0,
      "k31": 0,
      "ke0": 1,
      "coSensitivity": 0.3
    },
    "pd": {
      "c50": 1,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "First-generation cephalosporin. Time-dependent killing (T>MIC). First-line surgical prophylaxis and MSSA coverage. t1/2 ≈1.8h."
  },
  vancomycin: {
    "name": "Vancomycin",
    "classes": [
      "Antibiotic",
      "Glycopeptide"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal (Unchanged)",
    "proteinBinding": 0.55,
    "targetReceptor": "D-Ala-D-Ala Peptidoglycan",
    "indications": {
      "MRSA Infection": {
        "dose": "25-35",
        "unit": "mg/kg/day",
        "type": "Infusion"
      },
      "Gram-Positive Bacteremia": {
        "dose": "15-20",
        "unit": "mg/kg",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 12,
      "V2": 38,
      "V3": 0,
      "k10": 0.00193,
      "k12": 0.05,
      "k21": 0.012,
      "k13": 0,
      "k31": 0,
      "ke0": 0.5,
      "coSensitivity": 0.4
    },
    "pd": {
      "c50": 10,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Glycopeptide. AUC/MIC-driven PD (target ≥400-600 mg·h/L). Red man syndrome with rapid infusion. Nephrotoxic. Covers MRSA. t1/2 ≈6h."
  },
  piperacillin_tazobactam: {
    "name": "Piperacillin/Tazobactam",
    "classes": [
      "Antibiotic",
      "Extended-Spectrum Penicillin"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal (Unchanged ~68%)",
    "proteinBinding": 0.3,
    "targetReceptor": "Penicillin-Binding Proteins",
    "indications": {
      "Broad-Spectrum Infection": {
        "dose": "3.375",
        "unit": "g",
        "type": "Infusion"
      },
      "Febrile Neutropenia": {
        "dose": "4.5",
        "unit": "g",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 18,
      "V2": 12,
      "V3": 0,
      "k10": 0.01155,
      "k12": 0.05,
      "k21": 0.04,
      "k13": 0,
      "k31": 0,
      "ke0": 1,
      "coSensitivity": 0.3
    },
    "pd": {
      "c50": 1,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Extended-spectrum penicillin + BLI. Time-dependent killing. Broad gram-negative + anaerobic coverage including Pseudomonas. t1/2 ≈1h."
  },
  meropenem: {
    "name": "Meropenem",
    "classes": [
      "Antibiotic",
      "Carbapenem"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal (Unchanged ~70%)",
    "proteinBinding": 0.02,
    "targetReceptor": "Penicillin-Binding Proteins",
    "indications": {
      "Severe/Resistant Infection": {
        "dose": "1.0-2.0",
        "unit": "g",
        "type": "Infusion"
      },
      "Febrile Neutropenia": {
        "dose": "1.0",
        "unit": "g",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 10,
      "V3": 0,
      "k10": 0.0116,
      "k12": 0.04,
      "k21": 0.035,
      "k13": 0,
      "k31": 0,
      "ke0": 1,
      "coSensitivity": 0.3
    },
    "pd": {
      "c50": 1,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Broadest-spectrum carbapenem. Covers ESBL-producers and Pseudomonas. Last-line for resistant gram-negatives. t1/2 ≈1h."
  },
  gentamicin: {
    "name": "Gentamicin",
    "classes": [
      "Antibiotic",
      "Aminoglycoside"
    ],
    "routes": [
      "IV",
      "IM"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal (Unchanged)",
    "proteinBinding": 0.1,
    "targetReceptor": "30S Ribosomal Subunit",
    "indications": {
      "Gram-Negative Sepsis": {
        "dose": "5-7",
        "unit": "mg/kg",
        "type": "Bolus"
      },
      "Synergy (Endocarditis)": {
        "dose": "1",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 17,
      "V2": 5,
      "V3": 0,
      "k10": 0.00462,
      "k12": 0.02,
      "k21": 0.03,
      "k13": 0,
      "k31": 0,
      "ke0": 1.5,
      "coSensitivity": 0.5
    },
    "pd": {
      "c50": 4,
      "gamma": 2,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Aminoglycoside. Concentration-dependent killing (Cmax/MIC ≥8). Nephrotoxic and ototoxic. Extended-interval dosing preferred. t1/2 ≈2.5h."
  },
  metronidazole: {
    "name": "Metronidazole",
    "classes": [
      "Antibiotic",
      "Nitroimidazole"
    ],
    "routes": [
      "IV",
      "PO"
    ],
    "types": [
      "Infusion",
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (CYP oxidation)",
    "proteinBinding": 0.1,
    "targetReceptor": "Anaerobic Electron Transport Chain",
    "indications": {
      "Anaerobic Infection": {
        "dose": "500",
        "unit": "mg",
        "type": "Infusion"
      },
      "C. diff Colitis": {
        "dose": "500",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 20,
      "V2": 30,
      "V3": 0,
      "k10": 0.00144,
      "k12": 0.03,
      "k21": 0.025,
      "k13": 0,
      "k31": 0,
      "ke0": 0.5,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 1,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Nitroimidazole. Excellent anaerobic and protozoal coverage. Disulfiram-like reaction with alcohol. QT-prolonging at high doses. t1/2 ≈8h."
  },
  ciprofloxacin: {
    "name": "Ciprofloxacin",
    "classes": [
      "Antibiotic",
      "Fluoroquinolone"
    ],
    "routes": [
      "IV",
      "PO"
    ],
    "types": [
      "Infusion",
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic / Renal (mixed)",
    "proteinBinding": 0.3,
    "targetReceptor": "Bacterial Topoisomerase",
    "indications": {
      "Gram-Negative Infection": {
        "dose": "400",
        "unit": "mg",
        "type": "Infusion"
      },
      "UTI": {
        "dose": "200-400",
        "unit": "mg",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 30,
      "V2": 180,
      "V3": 0,
      "k10": 0.00231,
      "k12": 0.04,
      "k21": 0.008,
      "k13": 0,
      "k31": 0,
      "ke0": 0.8,
      "coSensitivity": 0.3
    },
    "pd": {
      "c50": 0.5,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Fluoroquinolone. AUC/MIC-driven PD. Large Vd (2-3 L/kg). QT prolongation. Growing resistance. Excellent PO bioavailability. t1/2 ≈5h."
  },
  ceftriaxone: {
    "name": "Ceftriaxone",
    "classes": [
      "Antibiotic",
      "3rd-Gen Cephalosporin"
    ],
    "routes": [
      "IV",
      "IM"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Biliary / Renal (dual)",
    "proteinBinding": 0.95,
    "targetReceptor": "Penicillin-Binding Proteins",
    "indications": {
      "Community-Acquired Pneumonia": {
        "dose": "2.0",
        "unit": "g",
        "type": "Bolus"
      },
      "Meningitis": {
        "dose": "2.0",
        "unit": "g",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 9,
      "V2": 5,
      "V3": 0,
      "k10": 0.00144,
      "k12": 0.02,
      "k21": 0.02,
      "k13": 0,
      "k31": 0,
      "ke0": 0.5,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 1,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Third-generation cephalosporin. Time-dependent killing. Community pneumonia first-line. CSF penetrant (meningitis). Long t1/2 ≈8h -- once-daily dosing. Does NOT cover Pseudomonas or MRSA."
  },
  dextrose: {
    "name": "Dextrose 50%",
    "classes": [
      "Hypertonic Glucose"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Cellular metabolism",
    "proteinBinding": 0,
    "synergyGroup": "None",
    "pkModel": "Standard Compartmental",
    "targetReceptor": "GLUT Transporters",
    "intracellularCascade": "Glycolysis / Krebs Cycle",
    "indications": {
      "Hypoglycemia": {
        "dose": "25",
        "unit": "g",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 0,
      "V3": 0,
      "k10": 0.05,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 0.5,
      "coSensitivity": 0,
      "proteinBinding": 0,
      "renalFraction": 0,
      "hepaticFraction": 0
    },
    "pd": {
      "c50": 1,
      "gamma": 1,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Hypertonic dextrose (D50) used for treatment of acute hypoglycemia. Administered as a bolus of 25g/50mL. Corrects hypoglycemic states."
  },
  methylphenidate: {
    "name": "Methylphenidate",
    "classes": [
      "Dopamine Agonist",
      "CNS Stimulant"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic",
    "proteinBinding": 0.15,
    "targetReceptor": "DAT / NET",
    "indications": {
      "Emergence Reversal": {
        "dose": "10",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 30,
      "V3": 0,
      "k10": 0.08,
      "k12": 0.05,
      "k21": 0.05,
      "k13": 0,
      "k31": 0,
      "ke0": 1,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 0.3,
      "gamma": 1.5,
      "sysMax": 15,
      "diaMax": 10,
      "hrMax": 20,
      "rrMax": 2
    },
    "notes": "CNS stimulant. Inhibits dopamine and norepinephrine reuptake. Reverses/accelerates emergence from general anesthetics (propofol, isoflurane) via VTA activation."
  },
  atipamezole: {
    "name": "Atipamezole",
    "classes": [
      "Alpha-2 Antagonist",
      "Reversal"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic",
    "proteinBinding": 0.5,
    "targetReceptor": "Alpha-2",
    "indications": {
      "Dexmedetomidine Reversal": {
        "dose": "5",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 10,
      "V2": 20,
      "V3": 0,
      "k10": 0.1,
      "k12": 0.08,
      "k21": 0.05,
      "k13": 0,
      "k31": 0,
      "ke0": 1,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 1,
      "gamma": 1,
      "sysMax": 5,
      "diaMax": 5,
      "hrMax": 10,
      "rrMax": 0
    },
    "notes": "Specific alpha-2 adrenergic receptor antagonist. Specifically reverses the sedative and cardiovascular effects of dexmedetomidine."
  },
  scopolamine: {
    "name": "Scopolamine",
    "classes": [
      "Anticholinergic",
      "Amnestic"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic",
    "proteinBinding": 0,
    "targetReceptor": "Muscarinic",
    "indications": {
      "Pre-op Amnesia": {
        "dose": "0.4",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 30,
      "V3": 0,
      "k10": 0.04,
      "k12": 0.05,
      "k21": 0.04,
      "k13": 0,
      "k31": 0,
      "ke0": 0.5,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.05,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 15,
      "rrMax": 0
    },
    "notes": "Tertiary amine anticholinergic. Crosses the blood-brain barrier. Causes marked anterograde amnesia and sedation. Accelerates hippocampal theta oscillations while reducing absolute power."
  },
  f6: {
    "name": "F6 (Nonimmobilizer)",
    "classes": [
      "Cyclobutane",
      "Nonimmobilizer"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic / Pulmonary",
    "proteinBinding": 0.8,
    "synergyGroup": "Other",
    "pkModel": "Standard Compartmental",
    "targetReceptor": "nAChR / Muscarinic",
    "intracellularCascade": "Selectively inhibits neuronal nicotinic and muscarinic receptors",
    "indications": {
      "Selective Amnesia": {
        "dose": "2.0",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 10,
      "V2": 25,
      "V3": 80,
      "k10": 0.15,
      "k12": 0.1,
      "k21": 0.05,
      "k13": 0.03,
      "k31": 0.01,
      "ke0": 1,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 2,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Selective amnestic cyclobutane. Does NOT produce immobility or sedation."
  },
  f3: {
    "name": "F3 (Anesthetic)",
    "classes": [
      "Cyclobutane",
      "Volatile Anesthetic"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic / Pulmonary",
    "proteinBinding": 0.75,
    "synergyGroup": "Sedative",
    "pkModel": "Standard Compartmental",
    "targetReceptor": "GABA-A / Glycine",
    "intracellularCascade": "Enhances GABA-A and glycine receptor binding",
    "indications": {
      "General Anesthesia": {
        "dose": "1.5",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 10,
      "V2": 25,
      "V3": 80,
      "k10": 0.1,
      "k12": 0.1,
      "k21": 0.05,
      "k13": 0.03,
      "k31": 0.01,
      "ke0": 0.8,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 1.2,
      "gamma": 2.5,
      "sysMax": -20,
      "diaMax": -20,
      "hrMax": 0,
      "rrMax": -10,
      "inducesApneaAtCe": 2
    },
    "notes": "Halogenated cyclobutane. Produces immobility, sedation, and amnesia."
  },
  s_isoflurane: {
    "name": "S-Isoflurane",
    "classes": [
      "Chiral Volatile",
      "Active Enantiomer"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic / Pulmonary",
    "proteinBinding": 0.85,
    "synergyGroup": "Sedative",
    "pkModel": "Standard Compartmental",
    "targetReceptor": "GABA-A / Glycine / K2P",
    "intracellularCascade": "High-affinity stereoselective binding to GABA-A and Glycine receptors",
    "indications": {
      "General Anesthesia": {
        "dose": "1.0",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 1.4,
      "V2": 5,
      "V3": 20,
      "k10": 0.08,
      "k12": 0.12,
      "k21": 0.06,
      "k13": 0.04,
      "k31": 0.01,
      "ke0": 0.8,
      "coSensitivity": 0.3
    },
    "pd": {
      "c50": 0.9,
      "gamma": 2,
      "sysMax": -30,
      "diaMax": -30,
      "hrMax": 5,
      "rrMax": -15,
      "inducesApneaAtCe": 1.5
    },
    "notes": "Active enantiomer of Isoflurane. High-affinity binding, twice as potent as R-Isoflurane."
  },
  r_isoflurane: {
    "name": "R-Isoflurane",
    "classes": [
      "Chiral Volatile",
      "Inactive Enantiomer"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepating / Pulmonary",
    "proteinBinding": 0.85,
    "synergyGroup": "Sedative",
    "pkModel": "Standard Compartmental",
    "targetReceptor": "GABA-A / Glycine / K2P",
    "intracellularCascade": "Lower-affinity stereoselective binding to GABA-A and Glycine receptors",
    "indications": {
      "General Anesthesia": {
        "dose": "2.0",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 1.4,
      "V2": 5,
      "V3": 20,
      "k10": 0.08,
      "k12": 0.12,
      "k21": 0.06,
      "k13": 0.04,
      "k31": 0.01,
      "ke0": 0.8,
      "coSensitivity": 0.3
    },
    "pd": {
      "c50": 1.8,
      "gamma": 2,
      "sysMax": -15,
      "diaMax": -15,
      "hrMax": 5,
      "rrMax": -10,
      "inducesApneaAtCe": 3
    },
    "notes": "Less active enantiomer of Isoflurane. Lower potency, requires higher concentration."
  },
  acetaminophen: {
    "name": "Acetaminophen",
    "classes": [
      "Nonopioid Analgesic"
    ],
    "routes": [
      "IV",
      "PO"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (conjugation & CYP2E1 to NAPQI)",
    "proteinBinding": 0.2,
    "indications": {
      "Postoperative Pain": {
        "dose": "1000",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 20,
      "V2": 40,
      "V3": 0,
      "k10": 0.05,
      "k12": 0.05,
      "k21": 0.04,
      "k13": 0,
      "k31": 0,
      "ke0": 0.5,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 10,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Nonopioid analgesic. Potent central COX inhibition. Opioid-sparing, decreases postoperative ileus duration and opioid consumption.",
    "targetReceptor": "COX-1 / COX-2 / TRPV1"
  },
  ketorolac: {
    "name": "Ketorolac",
    "classes": [
      "NSAID"
    ],
    "routes": [
      "IV",
      "IM"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic / Renal",
    "proteinBinding": 0.99,
    "indications": {
      "Severe Acute Pain": {
        "dose": "30",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 10,
      "V2": 15,
      "V3": 0,
      "k10": 0.03,
      "k12": 0.04,
      "k21": 0.03,
      "k13": 0,
      "k31": 0,
      "ke0": 0.5,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 1,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Potent injectable NSAID. Non-selective cyclooxygenase inhibitor. Opioid-sparing, reduces constipation and postoperative ileus. Risks: renal impairment, platelet inhibition, GI bleeding.",
    "targetReceptor": "COX-1 / COX-2"
  },
  sodiumCitrate: {
    "name": "Sodium Citrate",
    "classes": [
      "Nonparticulate Antacid"
    ],
    "routes": [
      "PO"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Local (gastric chemical neutralization, no systemic metabolism)",
    "proteinBinding": 0,
    "targetReceptor": "N/A (direct chemical acid neutralization)",
    "indications": {
      "Aspiration Prophylaxis": {
        "dose": "30",
        "unit": "mL",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 5,
      "V2": 0,
      "V3": 0,
      "k10": 0.025,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 0.5,
      "coSensitivity": 0
    },
    "pd": {
      "c50": 2,
      "gamma": 1,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Nonparticulate oral antacid (e.g. Bicitra). Directly neutralizes existing gastric acid on contact, raising gastric pH within minutes -- a local chemical effect modeled here via the same Ce/effect-site framework as a disclosed proxy for \"remaining buffering capacity,\" not a literal systemic blood concentration. Effect wanes over ~30-60 min as buffered contents continue to empty/mix. Unlike H2 blockers/PPIs, has no effect on future acid secretion or gastric volume."
  },
  famotidine: {
    "name": "Famotidine",
    "classes": [
      "H2 Receptor Antagonist"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal (Unchanged)",
    "proteinBinding": 0.15,
    "targetReceptor": "Histamine H2 Receptor",
    "indications": {
      "Aspiration Prophylaxis": {
        "dose": "20",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 20,
      "V3": 0,
      "k10": 0.004,
      "k12": 0.02,
      "k21": 0.015,
      "k13": 0,
      "k31": 0,
      "ke0": 0.05,
      "coSensitivity": 0
    },
    "pd": {
      "c50": 0.3,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Competitive H2-receptor antagonist. Reduces future gastric acid secretion (raising gastric pH toward ~4-4.5 and modestly reducing secretion-driven gastric volume), reversibly and in proportion to effect-site concentration. Onset ~30-60 min IV; does not affect acid already present in the stomach. Clinically negligible hemodynamic effect (sysMax/diaMax/hrMax/rrMax intentionally zero, not an oversight)."
  },
  pantoprazole: {
    "name": "Pantoprazole",
    "classes": [
      "Proton Pump Inhibitor"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (CYP2C19/3A4)",
    "proteinBinding": 0.98,
    "targetReceptor": "H+/K+-ATPase (Proton Pump)",
    "indications": {
      "Aspiration Prophylaxis": {
        "dose": "40",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 20,
      "V3": 0,
      "k10": 0.012,
      "k12": 0.03,
      "k21": 0.02,
      "k13": 0,
      "k31": 0,
      "ke0": 0.15,
      "coSensitivity": 0
    },
    "pd": {
      "c50": 1,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Proton pump inhibitor. Covalently and IRREVERSIBLY inhibits the parietal cell H+/K+-ATPase -- pharmacodynamic effect is decoupled from plasma Ce (which clears with a ~1-1.5h half-life) and instead accumulates with cumulative pump exposure, persisting ~24-48h until new pumps are synthesized (GastricEmptyingModel.ts tracks this separately as patient.ppiSuppressionLevel). More potent than an H2 blocker at maximal effect (can raise gastric pH toward neutral) but slower to reach that maximum."
  },
  metoclopramide: {
    "name": "Metoclopramide",
    "classes": [
      "Prokinetic",
      "Antiemetic"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal (Unchanged)",
    "proteinBinding": 0.3,
    "targetReceptor": "Dopamine D2 / 5-HT3 / 5-HT4",
    "indications": {
      "Aspiration Prophylaxis / PONV": {
        "dose": "10",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 20,
      "V2": 30,
      "V3": 0,
      "k10": 0.0023,
      "k12": 0.03,
      "k21": 0.025,
      "k13": 0,
      "k31": 0,
      "ke0": 0.3,
      "coSensitivity": 0
    },
    "pd": {
      "c50": 0.5,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Dopamine D2 antagonist / 5-HT4 agonist prokinetic. Accelerates gastric emptying (enhanced antral contractions) AND increases lower esophageal sphincter tone, both reducing aspiration risk. Onset ~30-60 min IV. Extrapyramidal/sedative side effects are real but not mechanically modeled here (disclosed scope gap)."
  },
  oxytocin: {
    "name": "Oxytocin",
    "classes": [
      "Uterotonic"
    ],
    "routes": [
      "IV",
      "IM"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal / Hepatic (Oxytocinase)",
    "proteinBinding": 0.3,
    "targetReceptor": "Oxytocin Receptor",
    "indications": {
      "Postpartum Hemorrhage / Uterine Atony": {
        "dose": "10-40",
        "unit": "units",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 8,
      "V2": 12,
      "V3": 0,
      "k10": 0.15,
      "k12": 0.08,
      "k21": 0.06,
      "k13": 0,
      "k31": 0,
      "ke0": 0.8,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.3,
      "gamma": 1.5,
      "sysMax": -10,
      "diaMax": -10,
      "hrMax": 10,
      "rrMax": 0
    },
    "notes": "First-line uterotonic. Binds myometrial oxytocin receptors, the dominant driver of postpartum uterine contraction/tone. Rapid IV bolus causes transient vasodilation/flushing and reflex tachycardia. Fast onset (~1 min), short half-life (~4-5 min) -- sustained effect requires a continuous infusion, not a single bolus."
  },
  methylergonovine: {
    "name": "Methylergonovine",
    "classes": [
      "Uterotonic",
      "Ergot Alkaloid"
    ],
    "routes": [
      "IV",
      "IM"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic",
    "proteinBinding": 0.2,
    "targetReceptor": "Alpha-1 Adrenergic / Serotonergic",
    "indications": {
      "Postpartum Hemorrhage / Uterine Atony": {
        "dose": "0.2",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 25,
      "V3": 0,
      "k10": 0.01,
      "k12": 0.04,
      "k21": 0.03,
      "k13": 0,
      "k31": 0,
      "ke0": 0.3,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.008,
      "gamma": 1.5,
      "sysMax": 15,
      "diaMax": 10,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Potent ergot-alkaloid uterotonic, longer-acting than Oxytocin. CONTRAINDICATED in hypertension/preeclampsia -- generalized vasoconstriction can precipitate a hypertensive crisis."
  },
  carboprost: {
    "name": "Carboprost",
    "classes": [
      "Uterotonic",
      "Prostaglandin"
    ],
    "routes": [
      "IM"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Pulmonary / Hepatic",
    "proteinBinding": 0.7,
    "targetReceptor": "Prostaglandin F2-alpha Receptor",
    "indications": {
      "Postpartum Hemorrhage / Uterine Atony": {
        "dose": "0.25",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 20,
      "V3": 0,
      "k10": 0.03,
      "k12": 0.04,
      "k21": 0.03,
      "k13": 0,
      "k31": 0,
      "ke0": 0.4,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.3,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Potent prostaglandin F2-alpha analog uterotonic. CONTRAINDICATED in asthma -- prostaglandin-mediated bronchoconstriction can precipitate severe bronchospasm."
  },
  misoprostol: {
    "name": "Misoprostol",
    "classes": [
      "Uterotonic",
      "Prostaglandin"
    ],
    "routes": [
      "PO",
      "PR",
      "SL"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic",
    "proteinBinding": 0,
    "targetReceptor": "Prostaglandin E1 Receptor",
    "indications": {
      "Postpartum Hemorrhage / Uterine Atony": {
        "dose": "800-1000",
        "unit": "mcg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 20,
      "V2": 30,
      "V3": 0,
      "k10": 0.015,
      "k12": 0.03,
      "k21": 0.025,
      "k13": 0,
      "k31": 0,
      "ke0": 0.15,
      "coSensitivity": 0
    },
    "pd": {
      "c50": 0.5,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Prostaglandin E1 analog uterotonic. Slower onset and less potent than the others above, but lacks their major contraindications."
  },
  gabapentin: {
    "name": "Gabapentin",
    "classes": [
      "Gabapentinoid"
    ],
    "routes": [
      "PO"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal (Unchanged)",
    "proteinBinding": 0,
    "indications": {
      "Neuropathic Pain": {
        "dose": "300",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 30,
      "V3": 0,
      "k10": 0.03,
      "k12": 0.05,
      "k21": 0.04,
      "k13": 0,
      "k31": 0,
      "ke0": 0.3,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 5,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Anticonvulsant/gabapentinoid. Excellent for neuropathic pain and multimodal perioperative analgesia. Side effects: sedation, dizziness, synergizes with other sedative-hypnotics.",
    "targetReceptor": "alpha2-delta Ca2+ Subunit"
  },
  pregabalin: {
    "name": "Pregabalin",
    "classes": [
      "Gabapentinoid"
    ],
    "routes": [
      "PO"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal (Unchanged)",
    "proteinBinding": 0,
    "indications": {
      "Neuropathic Pain": {
        "dose": "75",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 25,
      "V3": 0,
      "k10": 0.04,
      "k12": 0.05,
      "k21": 0.04,
      "k13": 0,
      "k31": 0,
      "ke0": 0.4,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 3,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Gabapentinoid. Higher potency than Gabapentin. Blunts central excitatory drive, synergizes with sedatives, reduces postop hyperalgesia.",
    "targetReceptor": "alpha2-delta Ca2+ Subunit"
  },
  mexiletine: {
    "name": "Mexiletine",
    "classes": [
      "Class IB",
      "Sodium Channel Blocker"
    ],
    "routes": [
      "PO"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (CYP2D6)",
    "proteinBinding": 0.7,
    "indications": {
      "Neuropathic Pain / Arrhythmia": {
        "dose": "150",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 20,
      "V2": 40,
      "V3": 0,
      "k10": 0.04,
      "k12": 0.06,
      "k21": 0.04,
      "k13": 0,
      "k31": 0,
      "ke0": 0.5,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 1,
      "gamma": 1.5,
      "sysMax": -5,
      "diaMax": -5,
      "hrMax": -5,
      "rrMax": 0
    },
    "notes": "Orally active Class IB antiarrhythmic. Structurally similar to Lidocaine. Blocks sodium channels, dampening neuropathic ectopic discharges.",
    "targetReceptor": "Fast Na+ Channels"
  },
  topiramate: {
    "name": "Topiramate",
    "classes": [
      "Anticonvulsant"
    ],
    "routes": [
      "PO"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic / Renal",
    "proteinBinding": 0.15,
    "indications": {
      "Chronic Pain / Headaches": {
        "dose": "50",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 20,
      "V2": 35,
      "V3": 0,
      "k10": 0.03,
      "k12": 0.05,
      "k21": 0.04,
      "k13": 0,
      "k31": 0,
      "ke0": 0.4,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 4,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Sulfamate-substituted monosaccharide anticonvulsant. Attenuates chronic/neuropathic pain and tension/migraine headaches. Associated with weight loss and mild cognitive slowing.",
    "targetReceptor": "Sodium Channels / GABA-A / AMPA"
  },
  suvorexant: {
    "name": "Suvorexant",
    "classes": [
      "Dual Orexin Receptor Antagonist"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (CYP3A4)",
    "proteinBinding": 0.99,
    "synergyGroup": "Sedative",
    "pkModel": "Standard Compartmental",
    "targetReceptor": "OX1R/OX2R",
    "intracellularCascade": "Reversibly binds and blocks OX1R/OX2R, inhibiting orexinergic wakefulness drive",
    "indications": {
      "Insomnia": {
        "dose": "10-20",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 0,
      "V3": 0,
      "k10": 0.08,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 1,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 2,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0,
      "inducesApneaAtCe": 999
    },
    "notes": "Dual orexin receptor antagonist. Blocks wake-promoting neuropeptides orexin A and B. Can cause daytime drowsiness. Contraindicated in narcolepsy."
  },
  carbamazepine: {
    "name": "Carbamazepine",
    "classes": [
      "Anticonvulsant",
      "Sodium Channel Blocker"
    ],
    "routes": [
      "PO"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (CYP3A4, active 10,11-epoxide)",
    "proteinBinding": 0.75,
    "indications": {
      "Trigeminal Neuralgia": {
        "dose": "200",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 18,
      "V2": 30,
      "V3": 0,
      "k10": 0.02,
      "k12": 0.04,
      "k21": 0.03,
      "k13": 0,
      "k31": 0,
      "ke0": 0.35,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 6,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Approved for trigeminal neuralgia. Sodium channel blocker. Associated with hematologic toxicity (agranulocytosis, aplastic anemia) and drug-drug interactions.",
    "targetReceptor": "Fast Na+ Channels"
  },
  oxcarbazepine: {
    "name": "Oxcarbazepine",
    "classes": [
      "Anticonvulsant",
      "Sodium Channel Blocker"
    ],
    "routes": [
      "PO"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (reduction to active monohydroxy derivative)",
    "proteinBinding": 0.4,
    "indications": {
      "Neuropathic Pain": {
        "dose": "300",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 18,
      "V2": 30,
      "V3": 0,
      "k10": 0.02,
      "k12": 0.04,
      "k21": 0.03,
      "k13": 0,
      "k31": 0,
      "ke0": 0.35,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 8,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Carbamazepine analogue. Blocks sodium channels, stabilizes membranes. Lower drug-drug interactions, risk of hyponatremia.",
    "targetReceptor": "Fast Na+ Channels"
  },
  lamotrigine: {
    "name": "Lamotrigine",
    "classes": [
      "Anticonvulsant",
      "Sodium Channel Blocker"
    ],
    "routes": [
      "PO"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic glucuronidation",
    "proteinBinding": 0.55,
    "indications": {
      "Neuropathic Pain": {
        "dose": "100",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 18,
      "V2": 30,
      "V3": 0,
      "k10": 0.025,
      "k12": 0.04,
      "k21": 0.03,
      "k13": 0,
      "k31": 0,
      "ke0": 0.35,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 4,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Blocks sodium and calcium channels. Effective for trigeminal neuralgia and HIV neuropathy. Risk of Stevens-Johnson syndrome.",
    "targetReceptor": "Sodium / Calcium Channels"
  },
  zonisamide: {
    "name": "Zonisamide",
    "classes": [
      "Anticonvulsant",
      "Sodium/Calcium Channel Blocker"
    ],
    "routes": [
      "PO"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (CYP3A4 glucuronidation)",
    "proteinBinding": 0.4,
    "indications": {
      "Neuropathic Pain": {
        "dose": "100",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 18,
      "V2": 30,
      "V3": 0,
      "k10": 0.025,
      "k12": 0.04,
      "k21": 0.03,
      "k13": 0,
      "k31": 0,
      "ke0": 0.35,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 5,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Blocks sodium and N-type calcium channels. Effective for diabetic neuropathy and migraine prophylaxis.",
    "targetReceptor": "Sodium / N-type Calcium Channels"
  },
  levetiracetam: {
    "name": "Levetiracetam",
    "classes": [
      "Anticonvulsant"
    ],
    "routes": [
      "IV",
      "PO"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal (unchanged)",
    "proteinBinding": 0.1,
    "indications": {
      "Seizure Prophylaxis": {
        "dose": "500",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 18,
      "V2": 30,
      "V3": 0,
      "k10": 0.035,
      "k12": 0.04,
      "k21": 0.03,
      "k13": 0,
      "k31": 0,
      "ke0": 0.4,
      "coSensitivity": 0.2,
      "renalFraction": 1
    },
    "pd": {
      "c50": 10,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "SV2A vesicle binder, blocks N-type calcium channels. Highly renal cleared.",
    "targetReceptor": "SV2A / Calcium Channels"
  },
  ziconotide: {
    "name": "Ziconotide",
    "classes": [
      "Nonopioid Analgesic",
      "Calcium Channel Blocker"
    ],
    "routes": [
      "IT"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Systemic peptidase cleavage",
    "proteinBinding": 0.5,
    "indications": {
      "Severe Refractory Pain": {
        "dose": "0.1",
        "unit": "mcg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 12,
      "V2": 0,
      "V3": 0,
      "k10": 0.05,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 0.5,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.005,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Synthetic omega-conotoxin. Potent selective N-type calcium channel blocker. Approved for intrathecal (IT) use. Side effects: postural hypotension, confusion.",
    "targetReceptor": "N-type Calcium Channels"
  },
  desmopressin: {
    "name": "Desmopressin (DDAVP)",
    "classes": [
      "Vasopressin Analogue",
      "Hemostatic Agent"
    ],
    "routes": [
      "IV",
      "SubQ",
      "Intranasal"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal",
    "proteinBinding": 0,
    "targetReceptor": "V2 Vasopressin Receptor",
    "indications": {
      "Von Willebrand Disease Type 1": {
        "dose": "0.3",
        "unit": "mcg/kg",
        "type": "Bolus"
      },
      "Mild Hemophilia A": {
        "dose": "0.3",
        "unit": "mcg/kg",
        "type": "Bolus"
      },
      "Central Diabetes Insipidus": {
        "dose": "0.3",
        "unit": "mcg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 20,
      "V2": 15,
      "V3": 0,
      "k10": 0.004,
      "k12": 0.02,
      "k21": 0.015,
      "k13": 0,
      "k31": 0,
      "ke0": 0.3,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.5,
      "gamma": 1.5,
      "sysMax": -5,
      "diaMax": -3,
      "hrMax": 5,
      "rrMax": 0
    },
    "notes": "Synthetic V2-selective vasopressin analogue. Releases stored VWF and FVIII. CONTRAINDICATED in VWD Type 2B."
  },
  methylprednisolone: {
    "name": "Methylprednisolone",
    "classes": [
      "Corticosteroid"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (CYP3A4)",
    "targetReceptor": "Glucocorticoid Receptor",
    "indications": {
      "Anaphylaxis / Asthma": {
        "dose": "125",
        "unit": "mg",
        "type": "Bolus"
      },
      "Fat Embolism": {
        "dose": "6-7",
        "unit": "mg/kg",
        "type": "Bolus"
      },
      "Spinal Cord Injury (NASCIS)": {
        "dose": "30",
        "unit": "mg/kg",
        "type": "Bolus"
      },
      "Airway Edema": {
        "dose": "1-2",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 30,
      "V2": 30,
      "V3": 0,
      "k10": 0.012,
      "k12": 0.04,
      "k21": 0.04,
      "k13": 0,
      "k31": 0,
      "ke0": 0.08,
      "coSensitivity": 0
    },
    "pd": {
      "c50": 1.5,
      "gamma": 1,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 5,
      "rrMax": 0
    },
    "notes": "Synthetic glucocorticoid (5× potency of hydrocortisone). Fat embolism, anaphylaxis, asthma, spinal cord injury.",
    "proteinBinding": 0.77
  },
  pralidoxime: {
    "name": "Pralidoxime (2-PAM)",
    "classes": [
      "Antidote",
      "Cholinesterase Reactivator"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal (unchanged)",
    "targetReceptor": "Acetylcholinesterase",
    "indications": {
      "Organophosphate Poisoning": {
        "dose": "1000-2000",
        "unit": "mg",
        "type": "Bolus"
      },
      "Maintenance": {
        "dose": "200-500",
        "unit": "mg/hr",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 10,
      "V2": 10,
      "V3": 0,
      "k10": 0.06,
      "k12": 0.03,
      "k21": 0.03,
      "k13": 0,
      "k31": 0,
      "ke0": 0.3,
      "coSensitivity": 0
    },
    "pd": {
      "c50": 1,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Reactivates organophosphate-inhibited AChE. Give BEFORE aging. Works with atropine (not instead of).",
    "proteinBinding": 0
  },
  hydroxocobalamin: {
    "name": "Hydroxocobalamin (Cyanokit)",
    "classes": [
      "Antidote",
      "Cyanide Antidote"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Binds cyanide → cyanocobalamin → renal excretion",
    "targetReceptor": "Cyanide Ion",
    "indications": {
      "Cyanide Poisoning / Smoke Inhalation": {
        "dose": "5000",
        "unit": "mg",
        "type": "Bolus"
      },
      "Severe": {
        "dose": "10000",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 5,
      "V2": 0,
      "V3": 0,
      "k10": 0.003,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 0.5,
      "coSensitivity": 0
    },
    "pd": {
      "c50": 1,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "First-line for cyanide/smoke inhalation. DOES NOT cause metHb (unlike nitrites) — safe in CO co-poisoning.",
    "proteinBinding": 0
  },
  hydrocortisone: {
    "name": "Hydrocortisone",
    "classes": [
      "Corticosteroid"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic",
    "proteinBinding": 0.9,
    "indications": {
      "Adrenal Crisis": {
        "dose": "100",
        "unit": "mg",
        "type": "Bolus"
      },
      "Stress-Dose Coverage": {
        "dose": "50-100",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 15,
      "V3": 0,
      "k10": 0.008,
      "k12": 0.05,
      "k21": 0.05,
      "ke0": 0.1
    },
    "pd": {
      "c50": 1,
      "gamma": 1,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Short-acting corticosteroid. Physiological glucocorticoid with mineralocorticoid activity. Drug of choice for acute adrenal crisis (100mg IV bolus) and perioperative stress-dose coverage. Reverses glucocorticoid-suppression vasopressor blunting by restoring adrenergic receptor expression.",
    "targetReceptor": "Glucocorticoid Receptor"
  },
  pcc: {
    "name": "4-Factor PCC (Kcentra)",
    "classes": [
      "Coagulation Factor",
      "Reversal"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Catabolism",
    "proteinBinding": 0,
    "indications": {
      "Warfarin Reversal": {
        "dose": "25-50",
        "unit": "Unit/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 0,
      "V3": 0,
      "k10": 0.01,
      "k12": 0,
      "k21": 0,
      "ke0": 1
    },
    "pd": {
      "c50": 1,
      "gamma": 1,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "4-Factor Prothrombin Complex Concentrate (contains factors II, VII, IX, X, and proteins C and S). Rapidly reverses warfarin within 30 min. Preferred over FFP for urgent reversal of major bleeding.",
    "targetReceptor": "Coagulation Cascade"
  },
  andexanet: {
    "name": "Andexanet Alfa (Andexxa)",
    "classes": [
      "Decoy Receptor",
      "Reversal"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Catabolism",
    "proteinBinding": 0,
    "indications": {
      "Factor Xa Inhibitor Reversal": {
        "dose": "800",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 0,
      "V3": 0,
      "k10": 0.02,
      "k12": 0,
      "k21": 0,
      "ke0": 1
    },
    "pd": {
      "c50": 1,
      "gamma": 1,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Recombinant modified human Factor Xa decoy protein. Sequesters and reverses Factor Xa inhibitors (apixaban, rivaroxaban) within minutes. Indicated for life-threatening or uncontrolled bleeding.",
    "targetReceptor": "Factor Xa Inhibitors"
  },
  idarucizumab: {
    "name": "Idarucizumab (Praxbind)",
    "classes": [
      "Monoclonal Antibody",
      "Reversal"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal / Catabolism",
    "proteinBinding": 0,
    "indications": {
      "Dabigatran Reversal": {
        "dose": "5.0",
        "unit": "g",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 0,
      "V3": 0,
      "k10": 0.03,
      "k12": 0,
      "k21": 0,
      "ke0": 1
    },
    "pd": {
      "c50": 1,
      "gamma": 1,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Humanized monoclonal antibody fragment that binds specifically to dabigatran with 350x greater affinity than thrombin. Produces immediate and complete reversal of dabigatran anticoagulation.",
    "targetReceptor": "Dabigatran"
  },
  propylthiouracil: {
    "name": "Propylthiouracil (PTU)",
    "classes": [
      "Antithyroid Agent"
    ],
    "routes": [
      "PO"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic",
    "targetReceptor": "Thyroid Peroxidase",
    "indications": {
      "Thyroid Storm": {
        "dose": "500-1000",
        "unit": "mg",
        "type": "Bolus"
      },
      "Hyperthyroidism Maintenance": {
        "dose": "100",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 20,
      "V2": 0,
      "V3": 0,
      "k10": 0.02,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 0.3,
      "coSensitivity": 0
    },
    "pd": {
      "c50": 1.5,
      "gamma": 1,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": -5,
      "rrMax": 0
    },
    "notes": "Step 1 thyroid storm treatment. Blocks synthesis AND T4→T3 conversion. Give FIRST, then wait ≥1h before Lugol's.",
    "proteinBinding": 0.75
  },
  methimazole: {
    "name": "Methimazole",
    "classes": [
      "Antithyroid Agent"
    ],
    "routes": [
      "PO"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic",
    "targetReceptor": "Thyroid Peroxidase",
    "indications": {
      "Hyperthyroidism": {
        "dose": "10-40",
        "unit": "mg",
        "type": "Bolus"
      },
      "Thyroid Storm": {
        "dose": "40-60",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 25,
      "V2": 0,
      "V3": 0,
      "k10": 0.015,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 0.3,
      "coSensitivity": 0
    },
    "pd": {
      "c50": 1,
      "gamma": 1,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": -3,
      "rrMax": 0
    },
    "notes": "Preferred maintenance antithyroid agent. Does NOT block T4→T3 conversion. Give before Lugol's iodide.",
    "proteinBinding": 0
  },
  lugolsIodide: {
    "name": "Lugol's Iodide",
    "classes": [
      "Antithyroid Agent",
      "Thyroid Release Blocker"
    ],
    "routes": [
      "PO"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Iodine metabolism",
    "targetReceptor": "Thyroid Follicular Cell",
    "indications": {
      "Thyroid Storm": {
        "dose": "5-10",
        "unit": "drops",
        "type": "Bolus"
      },
      "Preoperative Iodide Loading": {
        "dose": "1-2",
        "unit": "drops",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 0,
      "V3": 0,
      "k10": 0.01,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 0.4,
      "coSensitivity": 0
    },
    "pd": {
      "c50": 1,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": -8,
      "rrMax": 0
    },
    "notes": "Wolff-Chaikoff — blocks hormone RELEASE. MUST be given ≥1h AFTER PTU (give first → worsens storm by providing substrate).",
    "proteinBinding": 0
  },
  rfviia: {
    "name": "Recombinant Factor VIIa (NovoSeven)",
    "classes": [
      "Coagulation Factor",
      "Reversal"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Catabolism",
    "proteinBinding": 0,
    "indications": {
      "Hemophilia with Inhibitors": {
        "dose": "90",
        "unit": "mcg/kg",
        "type": "Bolus"
      },
      "Refractory Hemorrhage": {
        "dose": "90",
        "unit": "mcg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 0,
      "V3": 0,
      "k10": 0.015,
      "k12": 0,
      "k21": 0,
      "ke0": 1
    },
    "pd": {
      "c50": 1,
      "gamma": 1,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Recombinant activated Factor VII (rFVIIa). Direct Factor X activation on platelet surfaces, bypassing FVIII/FIX. Used in hemophilia with inhibitors and refractory surgical hemorrhage. Supratherapeutic doses carry thromboembolism risks.",
    "targetReceptor": "Platelet Membrane"
  },
  ipratropium: {
    "name": "Ipratropium Bromide",
    "classes": [
      "Anticholinergic Bronchodilator"
    ],
    "routes": [
      "Inhaled"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hydrolysis",
    "proteinBinding": 0,
    "targetReceptor": "Muscarinic M3",
    "indications": {
      "Bronchospasm / COPD": {
        "dose": "0.5",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 20,
      "V2": 10,
      "V3": 0,
      "k10": 0.02,
      "k12": 0.03,
      "k21": 0.03,
      "k13": 0,
      "k31": 0,
      "ke0": 0.5,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 1,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 2,
      "rrMax": 0
    },
    "notes": "Quaternary anticholinergic bronchodilator. Does not cross BBB -- minimal systemic anticholinergic effects at inhaled doses."
  },
  regularInsulin: {
    "name": "Regular Insulin",
    "classes": [
      "Hormone",
      "Antidiabetic"
    ],
    "routes": [
      "IV",
      "SubQ"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal / Hepatic (insulinase)",
    "proteinBinding": 0.05,
    "targetReceptor": "Insulin Receptor",
    "indications": {
      "Hyperglycemia": {
        "dose": "0.1",
        "unit": "units/kg/hr",
        "type": "Infusion"
      },
      "Hyperkalemia": {
        "dose": "10",
        "unit": "units",
        "type": "Bolus"
      },
      "DKA": {
        "dose": "0.1",
        "unit": "units/kg/hr",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 8,
      "V2": 12,
      "V3": 0,
      "k10": 0.08,
      "k12": 0.05,
      "k21": 0.04,
      "k13": 0,
      "k31": 0,
      "ke0": 0.4,
      "coSensitivity": 0.3
    },
    "pd": {
      "c50": 0.5,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Short-acting insulin for hyperglycemia, hyperkalemia (drives K+ intracellularly), and DKA management."
  },
  glucagon: {
    "name": "Glucagon",
    "classes": [
      "Hormone",
      "Antidiabetic Adjunct"
    ],
    "routes": [
      "IV",
      "IM",
      "SubQ"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Proteolysis (liver, kidney)",
    "proteinBinding": 0,
    "targetReceptor": "Glucagon Receptor (Gs-coupled)",
    "indications": {
      "Hypoglycemia (No IV)": {
        "dose": "1.0",
        "unit": "mg",
        "type": "Bolus"
      },
      "Beta-Blocker Overdose": {
        "dose": "3-10",
        "unit": "mg",
        "type": "Bolus"
      },
      "CCB Overdose": {
        "dose": "3-10",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 0,
      "V3": 0,
      "k10": 0.2,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 1,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 1,
      "gamma": 1.5,
      "sysMax": 10,
      "diaMax": 5,
      "hrMax": 20,
      "rrMax": 0
    },
    "notes": "Counter-regulatory hormone. Treats hypoglycemia without IV access and beta-blocker/CCB overdose (bypasses receptor blockade)."
  },
  codeine: {
    "name": "Codeine",
    "classes": [
      "Opioid Prodrug"
    ],
    "routes": [
      "PO",
      "IM"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (CYP2D6 to morphine)",
    "proteinBinding": 0.25,
    "targetReceptor": "Mu-Opioid (via CYP2D6 conversion)",
    "indications": {
      "Mild-Moderate Pain": {
        "dose": "30-60",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 40,
      "V2": 100,
      "V3": 0,
      "k10": 0.015,
      "k12": 0.04,
      "k21": 0.025,
      "k13": 0,
      "k31": 0,
      "ke0": 0.2,
      "coSensitivity": 0.4
    },
    "pd": {
      "c50": 0.5,
      "gamma": 1.5,
      "sysMax": -5,
      "diaMax": -3,
      "hrMax": -3,
      "rrMax": -8
    },
    "notes": "CYP2D6 prodrug to morphine. Fatal in CYP2D6 ultra-rapid metabolizers. No analgesia in poor metabolizers. FDA black-box warning for post-tonsillectomy use in children."
  },
  tramadol: {
    "name": "Tramadol",
    "classes": [
      "Atypical Opioid",
      "SNRI"
    ],
    "routes": [
      "IV",
      "PO",
      "IM"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (CYP2D6 to O-desmethyltramadol, CYP3A4/2B6)",
    "proteinBinding": 0.2,
    "targetReceptor": "Mu-Opioid + Serotonin/Norepinephrine Transporters",
    "indications": {
      "Moderate Pain": {
        "dose": "50-100",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 25,
      "V2": 60,
      "V3": 0,
      "k10": 0.012,
      "k12": 0.04,
      "k21": 0.025,
      "k13": 0,
      "k31": 0,
      "ke0": 0.3,
      "coSensitivity": 0.4
    },
    "pd": {
      "c50": 0.8,
      "gamma": 1.5,
      "sysMax": -5,
      "diaMax": -3,
      "hrMax": -2,
      "rrMax": -6
    },
    "notes": "Dual mechanism: weak opioid + SNRI. CONTRAINDICATED with MAO inhibitors (serotonin syndrome). CYP2D6 pharmacogenomics apply."
  },
  oxycodone: {
    "name": "Oxycodone",
    "classes": [
      "Opioid"
    ],
    "routes": [
      "PO",
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "IBW",
    "metabolism": "Hepatic (CYP3A4 primary, CYP2D6 to oxymorphone secondary)",
    "proteinBinding": 0.45,
    "targetReceptor": "Mu-Opioid (predominantly)",
    "indications": {
      "Moderate-Severe Pain": {
        "dose": "5-10",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 40,
      "V3": 150,
      "k10": 0.018,
      "k12": 0.04,
      "k21": 0.02,
      "k13": 0.008,
      "k31": 0.002,
      "ke0": 0.3,
      "coSensitivity": 0.5
    },
    "pd": {
      "c50": 0.5,
      "gamma": 1.5,
      "sysMax": -8,
      "diaMax": -5,
      "hrMax": -4,
      "rrMax": -10
    },
    "notes": "Semi-synthetic opioid. CYP3A4 inhibitors (fluconazole, erythromycin) markedly increase plasma levels and toxicity."
  },
  palonosetron: {
    "name": "Palonosetron",
    "classes": [
      "Antiemetic",
      "5-HT3 Antagonist (Second Generation)"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (CYP2D6/3A4)",
    "proteinBinding": 0.62,
    "targetReceptor": "5-HT3",
    "indications": {
      "PONV Prophylaxis": {
        "dose": "0.075",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 35,
      "V2": 60,
      "V3": 0,
      "k10": 0.0009,
      "k12": 0.02,
      "k21": 0.015,
      "k13": 0,
      "k31": 0,
      "ke0": 0.5,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.02,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Second-generation 5-HT3 antagonist. Half-life ~40h vs ondansetron 6h. Allosteric binding. Lower QTc risk. Preferred for high-risk PONV."
  },
  granisetron: {
    "name": "Granisetron",
    "classes": [
      "Antiemetic",
      "5-HT3 Antagonist"
    ],
    "routes": [
      "IV",
      "PO",
      "Transdermal"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (CYP3A4)",
    "proteinBinding": 0.65,
    "targetReceptor": "5-HT3",
    "indications": {
      "PONV Prophylaxis": {
        "dose": "1.0",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 30,
      "V2": 55,
      "V3": 0,
      "k10": 0.006,
      "k12": 0.02,
      "k21": 0.015,
      "k13": 0,
      "k31": 0,
      "ke0": 0.5,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.1,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "5-HT3 antagonist. Lower QT prolongation risk than ondansetron. Half-life ~9h."
  },
  droperidol: {
    "name": "Droperidol",
    "classes": [
      "Antiemetic",
      "Antipsychotic (D2 Antagonist)"
    ],
    "routes": [
      "IV",
      "IM"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic",
    "proteinBinding": 0.85,
    "targetReceptor": "Dopamine D2 (CTZ)",
    "indications": {
      "PONV Prophylaxis": {
        "dose": "0.625-1.25",
        "unit": "mg",
        "type": "Bolus"
      },
      "PONV Rescue": {
        "dose": "0.625",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 25,
      "V2": 50,
      "V3": 0,
      "k10": 0.025,
      "k12": 0.04,
      "k21": 0.025,
      "k13": 0,
      "k31": 0,
      "ke0": 0.5,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.1,
      "gamma": 1.5,
      "sysMax": -8,
      "diaMax": -5,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "D2 antiemetic. FDA black-box QT warning. Extremely effective at low doses (0.625mg). QT monitoring required."
  },
  haloperidol: {
    "name": "Haloperidol",
    "classes": [
      "Antipsychotic (Typical)",
      "D2 Antagonist"
    ],
    "routes": [
      "IV",
      "IM",
      "PO"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (CYP2D6/3A4)",
    "proteinBinding": 0.92,
    "targetReceptor": "Dopamine D2",
    "indications": {
      "PACU Delirium / Agitation": {
        "dose": "0.5-2.0",
        "unit": "mg",
        "type": "Bolus"
      },
      "ICU Delirium": {
        "dose": "1.0-5.0",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 30,
      "V2": 100,
      "V3": 0,
      "k10": 0.005,
      "k12": 0.03,
      "k21": 0.015,
      "k13": 0,
      "k31": 0,
      "ke0": 0.3,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 0.5,
      "gamma": 1.5,
      "sysMax": -5,
      "diaMax": -3,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "D2 blocker for PACU delirium. NMS risk. Significant QT prolongation (see DrugInteractionModel.ts)."
  },
  promethazine: {
    "name": "Promethazine",
    "classes": [
      "Antiemetic",
      "Antihistamine",
      "Phenothiazine"
    ],
    "routes": [
      "IV",
      "IM",
      "PO",
      "PR"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic",
    "proteinBinding": 0.93,
    "targetReceptor": "H1 / D2 / Muscarinic",
    "indications": {
      "PONV / Motion Sickness": {
        "dose": "6.25-12.5",
        "unit": "mg",
        "type": "Bolus"
      },
      "Allergy / Pruritus": {
        "dose": "12.5-25",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 35,
      "V2": 80,
      "V3": 0,
      "k10": 0.008,
      "k12": 0.03,
      "k21": 0.02,
      "k13": 0,
      "k31": 0,
      "ke0": 0.4,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 0.5,
      "gamma": 1.5,
      "sysMax": -5,
      "diaMax": -3,
      "hrMax": -3,
      "rrMax": -3
    },
    "notes": "Multi-receptor antiemetic. IV extravasation risk of severe tissue necrosis. Contraindicated under 2 years."
  },
  diphenhydramine: {
    "name": "Diphenhydramine (Benadryl)",
    "classes": [
      "Antihistamine H1",
      "Antiemetic"
    ],
    "routes": [
      "IV",
      "IM",
      "PO"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (CYP2D6)",
    "proteinBinding": 0.98,
    "targetReceptor": "H1 Histamine",
    "indications": {
      "Allergic Reaction": {
        "dose": "25-50",
        "unit": "mg",
        "type": "Bolus"
      },
      "Opioid Pruritus": {
        "dose": "25",
        "unit": "mg",
        "type": "Bolus"
      },
      "PONV (vestibular)": {
        "dose": "25-50",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 40,
      "V2": 80,
      "V3": 0,
      "k10": 0.01,
      "k12": 0.03,
      "k21": 0.02,
      "k13": 0,
      "k31": 0,
      "ke0": 0.4,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 1,
      "gamma": 1.5,
      "sysMax": -5,
      "diaMax": -3,
      "hrMax": 5,
      "rrMax": -2
    },
    "notes": "First-generation H1 antihistamine. Adjunct in allergic reactions. BBB penetration causes CNS sedation."
  },
  aprepitant: {
    "name": "Aprepitant",
    "classes": [
      "Antiemetic",
      "NK1 Receptor Antagonist"
    ],
    "routes": [
      "PO"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (CYP3A4)",
    "proteinBinding": 0.95,
    "targetReceptor": "NK1 (Neurokinin-1/Substance P)",
    "indications": {
      "PONV Prevention (High Risk)": {
        "dose": "80",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 25,
      "V2": 40,
      "V3": 0,
      "k10": 0.005,
      "k12": 0.02,
      "k21": 0.015,
      "k13": 0,
      "k31": 0,
      "ke0": 0.3,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 1,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "NK1 antagonist. Most potent PONV drug. CYP3A4 inhibitor -- increases midazolam/fentanyl levels 20-50%."
  },
  fosaprepitant: {
    "name": "Fosaprepitant (Emend IV)",
    "classes": [
      "Antiemetic",
      "NK1 Antagonist (IV Prodrug)"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Rapid hydrolysis to aprepitant (CYP3A4)",
    "proteinBinding": 0.95,
    "targetReceptor": "NK1 (via aprepitant)",
    "indications": {
      "PONV Prevention (High Risk)": {
        "dose": "150",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 5,
      "V2": 20,
      "V3": 0,
      "k10": 0.3,
      "k12": 0.1,
      "k21": 0.04,
      "k13": 0,
      "k31": 0,
      "ke0": 0.6,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 1,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "IV prodrug of aprepitant. Single dose provides 3-day NK1 antagonism. Same CYP3A4 interactions as aprepitant."
  },
  isoproterenol: {
    "name": "Isoproterenol",
    "classes": [
      "Beta-1/Beta-2 Agonist",
      "Chronotrope"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Infusion",
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (COMT)",
    "proteinBinding": 0,
    "targetReceptor": "Beta-1 / Beta-2 Adrenergic",
    "indications": {
      "Bradycardia (Transplanted Heart)": {
        "dose": "2-10",
        "unit": "mcg/min",
        "type": "Infusion"
      },
      "Complete Heart Block": {
        "dose": "2-10",
        "unit": "mcg/min",
        "type": "Infusion"
      },
      "Brugada Syndrome Crisis": {
        "dose": "1-5",
        "unit": "mcg/min",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 30,
      "V3": 0,
      "k10": 0.15,
      "k12": 0.08,
      "k21": 0.05,
      "k13": 0,
      "k31": 0,
      "ke0": 1,
      "coSensitivity": 0.3
    },
    "pd": {
      "c50": 0.004,
      "gamma": 1.5,
      "sysMax": -10,
      "diaMax": -8,
      "hrMax": 30,
      "rrMax": 0
    },
    "notes": "Pure beta-1/beta-2 agonist. Only effective chronotrope for denervated heart (cardiac transplant). Causes vasodilation."
  },
  octreotide: {
    "name": "Octreotide",
    "classes": [
      "Somatostatin Analogue"
    ],
    "routes": [
      "IV",
      "SubQ"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic / Renal",
    "proteinBinding": 0.65,
    "targetReceptor": "Somatostatin Receptors (SSTR2/5)",
    "indications": {
      "Carcinoid Crisis": {
        "dose": "100-500",
        "unit": "mcg",
        "type": "Bolus"
      },
      "Esophageal Varices": {
        "dose": "50",
        "unit": "mcg",
        "type": "Bolus"
      },
      "Acromegaly": {
        "dose": "100",
        "unit": "mcg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 10,
      "V2": 20,
      "V3": 0,
      "k10": 0.02,
      "k12": 0.03,
      "k21": 0.025,
      "k13": 0,
      "k31": 0,
      "ke0": 0.5,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 1,
      "gamma": 1.5,
      "sysMax": 5,
      "diaMax": 3,
      "hrMax": -5,
      "rrMax": 0
    },
    "notes": "THE specific treatment for carcinoid crisis (blocks tumor hormone release). Also used for variceal bleeding and acromegaly."
  },
  bromocriptine: {
    "name": "Bromocriptine",
    "classes": [
      "Dopamine D2 Agonist",
      "NMS Treatment"
    ],
    "routes": [
      "PO"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (CYP3A4)",
    "proteinBinding": 0.96,
    "targetReceptor": "Dopamine D2",
    "indications": {
      "Neuroleptic Malignant Syndrome": {
        "dose": "2.5",
        "unit": "mg",
        "type": "Bolus"
      },
      "Parkinson (Adjunct)": {
        "dose": "1.25",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 50,
      "V2": 100,
      "V3": 0,
      "k10": 0.008,
      "k12": 0.03,
      "k21": 0.02,
      "k13": 0,
      "k31": 0,
      "ke0": 0.3,
      "coSensitivity": 0.2
    },
    "pd": {
      "c50": 1,
      "gamma": 1.5,
      "sysMax": -5,
      "diaMax": -3,
      "hrMax": 5,
      "rrMax": 0
    },
    "notes": "Dopamine agonist. Specific treatment for NMS (reverses dopaminergic blockade causally). Distinct from dantrolene which treats rigidity/hyperthermia symptomatically."
  },
  physostigmine: {
    "name": "Physostigmine",
    "classes": [
      "Cholinesterase Inhibitor (Central)",
      "Anticholinergic Antidote"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hydrolysis (cholinesterase)",
    "proteinBinding": 0.05,
    "targetReceptor": "Cholinesterase (Central + Peripheral)",
    "indications": {
      "Central Anticholinergic Syndrome": {
        "dose": "1.0-2.0",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 20,
      "V2": 15,
      "V3": 0,
      "k10": 0.04,
      "k12": 0.05,
      "k21": 0.04,
      "k13": 0,
      "k31": 0,
      "ke0": 0.5,
      "coSensitivity": 0.1
    },
    "pd": {
      "c50": 0.5,
      "gamma": 1.5,
      "sysMax": -5,
      "diaMax": -3,
      "hrMax": -10,
      "rrMax": 0
    },
    "notes": "Only CNS-penetrating cholinesterase inhibitor. Specific antidote for central anticholinergic syndrome (unlike neostigmine which is quaternary and cannot cross BBB)."
  },
  hypertonicSaline3: {
    "name": "Hypertonic Saline 3%",
    "classes": [
      "Hypertonic Crystalloid",
      "Osmotic Agent"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Renal excretion",
    "proteinBinding": 0,
    "targetReceptor": "N/A (osmotic effect)",
    "indications": {
      "Symptomatic Hyponatremia": {
        "dose": "100-150",
        "unit": "mL",
        "type": "Infusion"
      },
      "Raised ICP": {
        "dose": "1-2",
        "unit": "mL/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 3,
      "V2": 42,
      "V3": 0,
      "k10": 0.04,
      "k12": 0.3,
      "k21": 0.02,
      "k13": 0,
      "k31": 0,
      "ke0": 0.8,
      "coSensitivity": 0
    },
    "pd": {
      "c50": 5,
      "gamma": 1,
      "sysMax": 8,
      "diaMax": 5,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Hypertonic saline for symptomatic hyponatremia (max correction 10-12 mEq/L per 24h to avoid CPM) and raised ICP alternative to mannitol."
  },
  factorVIIIconcentrate: {
    "name": "Factor VIII Concentrate (rFVIII)",
    "classes": [
      "Coagulation Factor",
      "Hemostatic Agent"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Catabolism",
    "proteinBinding": 0,
    "targetReceptor": "Intrinsic Coagulation Pathway",
    "indications": {
      "Hemophilia A Bleeding": {
        "dose": "25-50",
        "unit": "units/kg",
        "type": "Bolus"
      },
      "Surgical Coverage Hemophilia A": {
        "dose": "50",
        "unit": "units/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 8,
      "V2": 0,
      "V3": 0,
      "k10": 0.006,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 1,
      "coSensitivity": 0
    },
    "pd": {
      "c50": 1,
      "gamma": 1,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Recombinant FVIII for Hemophilia A. Each unit/kg raises FVIII by 2%. Surgical target 80-100%. Monitor for inhibitor development."
  },
  rasburicase: {
    "name": "Rasburicase",
    "classes": [
      "Antidote",
      "Urate Oxidase"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Intracellular degradation",
    "targetReceptor": "Uric Acid",
    "indications": {
      "Tumor Lysis Syndrome": {
        "dose": "0.2",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 5,
      "V2": 0,
      "V3": 0,
      "k10": 0.005,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 0.5,
      "coSensitivity": 0
    },
    "pd": {
      "c50": 1,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Recombinant urate oxidase. Contraindicated in G6PD deficiency. Most rapid treatment for TLS hyperuricemia.",
    "proteinBinding": 0
  },
  c1InhConcentrate: {
    "name": "C1-INH Concentrate",
    "classes": [
      "Antidote",
      "Complement Inhibitor"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Catabolism",
    "targetReceptor": "Complement Cascade / Kallikrein-Kinin",
    "indications": {
      "Hereditary Angioedema (HAE)": {
        "dose": "20",
        "unit": "units/kg",
        "type": "Bolus"
      },
      "ACE-I Angioedema": {
        "dose": "1000",
        "unit": "units",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 5,
      "V2": 0,
      "V3": 0,
      "k10": 0.01,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 0.3,
      "coSensitivity": 0
    },
    "pd": {
      "c50": 1,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "C1-INH for HAE and ACE-I bradykinin angioedema. NOT effective for histamine-mediated (allergic) angioedema.",
    "proteinBinding": 0
  },
  icatibant: {
    "name": "Icatibant",
    "classes": [
      "Antidote",
      "Bradykinin B2 Antagonist"
    ],
    "routes": [
      "SC",
      "IV"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Proteolytic degradation",
    "targetReceptor": "Bradykinin B2 Receptor",
    "indications": {
      "HAE / ACE-I Angioedema": {
        "dose": "30",
        "unit": "mg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 0,
      "V3": 0,
      "k10": 0.02,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 0.5,
      "coSensitivity": 0
    },
    "pd": {
      "c50": 1,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Bradykinin B2 receptor antagonist for HAE and ACE-I angioedema (bradykinin-mediated, NOT histamine).",
    "proteinBinding": 0.44
  },
  hemin: {
    "name": "Hemin (Panhematin)",
    "classes": [
      "Antidote",
      "Heme Synthesis"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Incorporated into heme pool",
    "targetReceptor": "ALA-Synthase-1 (ALAS1)",
    "indications": {
      "Acute Porphyria": {
        "dose": "4",
        "unit": "mg/kg",
        "type": "Infusion"
      }
    },
    "pk": {
      "V1": 5,
      "V2": 0,
      "V3": 0,
      "k10": 0.003,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 0.1,
      "coSensitivity": 0
    },
    "pd": {
      "c50": 1,
      "gamma": 1.5,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Mainstay treatment for acute porphyria. Suppresses ALAS1 → reduces porphyrin precursors. Reconstitute with 25% albumin.",
    "proteinBinding": 0.85
  },
  caffeine: {
    "name": "Caffeine",
    "classes": [
      "Methylxanthine",
      "Adenosine Antagonist"
    ],
    "routes": [
      "IV",
      "PO"
    ],
    "types": [
      "Bolus"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Hepatic (CYP1A2)",
    "targetReceptor": "Adenosine Receptors",
    "indications": {
      "Post-Dural Puncture Headache": {
        "dose": "300-500",
        "unit": "mg",
        "type": "Bolus"
      },
      "Apnea of Prematurity": {
        "dose": "20",
        "unit": "mg/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 40,
      "V2": 0,
      "V3": 0,
      "k10": 0.03,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 0.5,
      "coSensitivity": 0
    },
    "pd": {
      "c50": 5,
      "gamma": 1.5,
      "sysMax": 10,
      "diaMax": 5,
      "hrMax": 12,
      "rrMax": 2
    },
    "notes": "Adenosine antagonist. Treats PDPH (cerebral vasoconstriction). Reduces adenosine efficacy for SVT if present in system.",
    "proteinBinding": 0.35
  },
  factorIXconcentrate: {
    "name": "Factor IX Concentrate (rFIX)",
    "classes": [
      "Coagulation Factor",
      "Hemostatic Agent"
    ],
    "routes": [
      "IV"
    ],
    "types": [
      "Bolus",
      "Infusion"
    ],
    "dosingWeight": "TBW",
    "metabolism": "Catabolism",
    "proteinBinding": 0,
    "targetReceptor": "Intrinsic Coagulation Pathway",
    "indications": {
      "Hemophilia B Bleeding": {
        "dose": "25-50",
        "unit": "units/kg",
        "type": "Bolus"
      },
      "Surgical Coverage Hemophilia B": {
        "dose": "50-100",
        "unit": "units/kg",
        "type": "Bolus"
      }
    },
    "pk": {
      "V1": 15,
      "V2": 0,
      "V3": 0,
      "k10": 0.004,
      "k12": 0,
      "k21": 0,
      "k13": 0,
      "k31": 0,
      "ke0": 1,
      "coSensitivity": 0
    },
    "pd": {
      "c50": 1,
      "gamma": 1,
      "sysMax": 0,
      "diaMax": 0,
      "hrMax": 0,
      "rrMax": 0
    },
    "notes": "Recombinant FIX for Hemophilia B. Each unit/kg raises FIX by only 1% (larger Vd than FVIII). Half-life ~18-24h."
  },
};
