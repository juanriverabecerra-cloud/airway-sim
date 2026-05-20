import React, { useState, useEffect } from 'react';
import { X, Activity, FileText, ClipboardList, CheckSquare, ShieldAlert, Award, Play, ArrowLeft, ArrowRight } from 'lucide-react';
import { calculateLungVolumes, calculateIBW, calculateLBW } from '../../engine/Pharmacology';

export const PreOpEMR = ({ show, close, stagedCase, setStagedCase, onStart, logEvent }) => {
  if (!show || !stagedCase) return null;

  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'orders' | 'results' | 'risk' | 'plan'
  
  // Extract patient/case details
  const patient = stagedCase.patient;
  const heightCm = patient.height || 170;
  const weightKg = patient.weight || 70;
  const age = patient.age || 40;
  const sex = patient.sex || 'male';
  const bmi = weightKg / Math.pow(heightCm / 100, 2);
  const ibw = calculateIBW(heightCm, sex);
  const lbw = calculateLBW(weightKg, heightCm, sex);
  const bsa = Math.sqrt((heightCm * weightKg) / 3600); // Mosteller formula
  const ebv = sex === 'male' ? weightKg * 70 : weightKg * 65;

  // Calculate pre-op lung volumes
  const lungVols = calculateLungVolumes(heightCm, age, sex, bmi, 'Sitting');

  // Pre-op Order Entry State
  const [orders, setOrders] = useState({
    labs: {
      cbc: false,
      bmp: false,
      coags: false,
      lfts: false,
      typeAndScreen: false,
      typeAndCross: false,
      hba1c: false,
      pregnancy: false,
      urinalysis: false,
      thyroid: false
    },
    diagnostics: {
      ecg: false,
      cxr: false,
      tte: false,
      pfts: false,
      stressTest: false
    },
    consults: {
      cardiology: false,
      pulmonology: false,
      hematology: false,
      endocrinology: false
    }
  });

  // Load saved orders if they already exist in stagedCase
  useEffect(() => {
    if (stagedCase.preOpOrders) {
      setOrders(stagedCase.preOpOrders);
    }
  }, [stagedCase]);

  const handleOrderChange = (category, test, value) => {
    const updated = {
      ...orders,
      [category]: {
        ...orders[category],
        [test]: value
      }
    };
    setOrders(updated);
    
    // Save to stagedCase state
    if (setStagedCase) {
      setStagedCase(prev => ({
        ...prev,
        preOpOrders: updated
      }));
    }
  };

  // Interactive Clinical Assessment Wizard States & Ground Truths
  const [assessment, setAssessment] = useState({
    rcriHighRisk: false,
    rcriIhd: false,
    rcriChf: false,
    rcriCva: false,
    rcriInsulin: false,
    rcriCr: false,
    mets: '',
    asa: '',
    mallampati: '',
    neckMobility: '',
    npoStatus: ''
  });
  const [assessmentVerified, setAssessmentVerified] = useState(false);
  const [assessmentErrors, setAssessmentErrors] = useState({});
  const [assessmentChecked, setAssessmentChecked] = useState(false);

  const getGroundTruth = () => {
    const id = stagedCase.id;
    if (id === 'normal') {
      return {
        rcriHighRisk: false,
        rcriIhd: false,
        rcriChf: false,
        rcriCva: false,
        rcriInsulin: false,
        rcriCr: false,
        mets: 'excellent',
        asa: 'ASA I',
        mallampati: 'Class I',
        neckMobility: 'Normal',
        npoStatus: 'Compliant',
        vignette: "Patient is a 45-year-old female scheduled for elective laparoscopic cholecystectomy. She reports running 3 miles every morning without chest pain or shortness of breath. She has no past medical history and takes no medications. She ate her last solid meal 12 hours ago. On physical exam, full opening of the mouth reveals completely visible soft palate, fauces, uvula, and pillars with a normal cervical spine range of motion."
      };
    } else if (id === 'trauma') {
      return {
        rcriHighRisk: true,
        rcriIhd: false,
        rcriChf: false,
        rcriCva: false,
        rcriInsulin: false,
        rcriCr: false,
        mets: 'poor',
        asa: 'ASA IV',
        mallampati: 'Class IV',
        neckMobility: 'Reduced',
        npoStatus: 'Aspiration Risk',
        vignette: "Patient is a 54-year-old male unrestrained passenger in a high-speed motor vehicle collision, brought in via EMS with a rigid cervical collar and a Glasgow Coma Scale of 7. There is active, profuse oropharyngeal bleeding from nasal and facial fractures, with thick pooling blood completely obscuring all soft tissue structures of the oral cavity. His spouse reports he ate a large burger and fries 2 hours before the crash."
      };
    } else if (id === 'septic') {
      return {
        rcriHighRisk: true,
        rcriIhd: true,
        rcriChf: false,
        rcriCva: false,
        rcriInsulin: false,
        rcriCr: true,
        mets: 'poor',
        asa: 'ASA IV',
        mallampati: 'Class II',
        neckMobility: 'Normal',
        npoStatus: 'Aspiration Risk',
        vignette: "Patient is a 68-year-old male from a nursing home with high fever and altered mental status. Blood pressure is 85/40 mmHg on a continuous norepinephrine infusion, with blood cultures positive for Gram-negative rods (urosepsis). EMR indicates a history of coronary artery disease (stented anterior MI 2 years ago) and chronic kidney disease stage III (baseline creatinine is 2.2 mg/dL). He was placed on NPO status 6 hours ago after a light breakfast, but has active shock-induced gastroparesis."
      };
    } else if (id === 'obese') {
      return {
        rcriHighRisk: false,
        rcriIhd: false,
        rcriChf: true,
        rcriCva: false,
        rcriInsulin: true,
        rcriCr: false,
        mets: 'poor',
        asa: 'ASA III',
        mallampati: 'Class III',
        neckMobility: 'Reduced',
        npoStatus: 'Aspiration Risk',
        vignette: "Patient is a 50-year-old male with a BMI of 45 scheduled for an elective umbilical hernia repair. He reports he can walk only about 1 block before getting severely short of breath. He has severe obstructive sleep apnea (uses CPAP). He has type 2 diabetes managed with daily insulin, and a history of heart failure (EF 35% on carvedilol). He fasted for 8 hours, but takes daily Semaglutide (Ozempic) which was NOT held pre-operatively. Exam shows a thick, short neck with restricted extension due to a prominent posterior fat pad, and mouth opening reveals only the base of the uvula."
      };
    }
    return {
      rcriHighRisk: false,
      rcriIhd: false,
      rcriChf: false,
      rcriCva: false,
      rcriInsulin: false,
      rcriCr: false,
      mets: 'excellent',
      asa: 'ASA II',
      mallampati: 'Class I',
      neckMobility: 'Normal',
      npoStatus: 'Compliant',
      vignette: "Pre-operative evaluation vignette."
    };
  };

  const verifyAssessment = () => {
    const truth = getGroundTruth();
    const errors = {};
    let hasError = false;

    // Check RCRI
    if (assessment.rcriHighRisk !== truth.rcriHighRisk) {
      errors.rcriHighRisk = truth.rcriHighRisk 
        ? "Emergency trauma/septic surgery counts as a high-risk surgical procedure." 
        : "Elective laparoscopic or hernia surgeries are not high-risk procedures (intermediate/low risk).";
      hasError = true;
    }
    if (assessment.rcriIhd !== truth.rcriIhd) {
      errors.rcriIhd = truth.rcriIhd 
        ? "Patient has a documented history of Ischemic Heart Disease (CAD, prior MI)." 
        : "Patient has no history of Ischemic Heart Disease.";
      hasError = true;
    }
    if (assessment.rcriChf !== truth.rcriChf) {
      errors.rcriChf = truth.rcriChf 
        ? "Patient has a documented history of heart failure (EF 35%)." 
        : "Patient has no history of congestive heart failure.";
      hasError = true;
    }
    if (assessment.rcriCva !== truth.rcriCva) {
      errors.rcriCva = "Patient has no history of stroke or cerebrovascular disease.";
      hasError = true;
    }
    if (assessment.rcriInsulin !== truth.rcriInsulin) {
      errors.rcriInsulin = truth.rcriInsulin 
        ? "Patient is on preoperative insulin treatment for diabetes." 
        : "Patient does not have insulin-dependent diabetes.";
      hasError = true;
    }
    if (assessment.rcriCr !== truth.rcriCr) {
      errors.rcriCr = truth.rcriCr 
        ? "Patient's baseline creatinine is > 2.0 mg/dL (CKD Stage III, Cr 2.2)." 
        : "Patient's baseline creatinine is normal (< 2.0 mg/dL).";
      hasError = true;
    }

    // Check METs
    if (assessment.mets !== truth.mets) {
      errors.mets = truth.mets === 'excellent' 
        ? "Correct functional capacity is Excellent (METs ≥ 4) - patient runs 3 miles daily." 
        : "Correct functional capacity is Poor (METs < 4) - walk capacity is severely limited or patient is comatose/GCS 7.";
      hasError = true;
    }

    // Check ASA
    if (assessment.asa !== truth.asa) {
      errors.asa = `Correct ASA classification is ${truth.asa}. ` + (
        truth.asa === 'ASA I' ? "Healthy patient without systemic illness." :
        truth.asa === 'ASA III' ? "Morbid obesity (BMI 45), severe OSA, insulin-dependent diabetes, and heart failure (EF 35%) qualify as severe, limiting systemic disease (ASA III)." :
        truth.asa === 'ASA IV' ? "Septic shock or acute traumatic hemorrhage with GCS 7 is a severe systemic disease that is a constant threat to life (ASA IV)." : "Mild/moderate systemic illness."
      );
      hasError = true;
    }

    // Check Mallampati
    if (assessment.mallampati !== truth.mallampati) {
      errors.mallampati = `Correct Mallampati class is ${truth.mallampati}. ` + (
        truth.mallampati === 'Class I' ? "Soft palate, fauces, uvula, and pillars are fully visible." :
        truth.mallampati === 'Class II' ? "Uvula and soft palate are partially visible." :
        truth.mallampati === 'Class III' ? "Only the base of the uvula and soft palate are visible." :
        "Airway bleeding completely obscures all visualization of the oral cavity (Class IV)."
      );
      hasError = true;
    }

    // Check Neck Mobility
    if (assessment.neckMobility !== truth.neckMobility) {
      errors.neckMobility = truth.neckMobility === 'Reduced' 
        ? "Correct neck mobility is Reduced (rigid cervical collar in trauma, or severe thick neck fat pad in obesity limits extension)." 
        : "Correct neck mobility is Normal (no anatomical limits to extension).";
      hasError = true;
    }

    // Check NPO
    if (assessment.npoStatus !== truth.npoStatus) {
      errors.npoStatus = truth.npoStatus === 'Aspiration Risk' 
        ? "Correct gastric status is Aspiration Risk: a full stomach is physiologically present due to eating recently, severe shock/sepsis-induced gastroparesis, or active Ozempic/Semaglutide delay." 
        : "Correct gastric status is NPO Compliant: fasted > 8 hours with no delay factors.";
      hasError = true;
    }

    setAssessmentErrors(errors);
    setAssessmentChecked(true);

    if (!hasError) {
      setAssessmentVerified(true);
      const score = (truth.rcriHighRisk?1:0) + (truth.rcriIhd?1:0) + (truth.rcriChf?1:0) + (truth.rcriCva?1:0) + (truth.rcriInsulin?1:0) + (truth.rcriCr?1:0);
      const verifiedData = {
        rcriHighRisk: truth.rcriHighRisk,
        rcriIhd: truth.rcriIhd,
        rcriChf: truth.rcriChf,
        rcriCva: truth.rcriCva,
        rcriInsulin: truth.rcriInsulin,
        rcriCr: truth.rcriCr,
        rcriScore: score,
        mets: truth.mets,
        asa: truth.asa,
        mallampati: truth.mallampati,
        neckMobility: truth.neckMobility,
        npoStatus: truth.npoStatus,
        verified: true
      };
      if (setStagedCase) {
        setStagedCase(prev => ({
          ...prev,
          patient: {
            ...prev.patient,
            verifiedRisk: verifiedData
          }
        }));
      }
    } else {
      setAssessmentVerified(false);
    }
  };

  // Generate dynamic results based on patient demographics and comorbidities
  const generatePreOpResults = () => {
    const res = {
      labs: {},
      diagnostics: {},
      consults: {}
    };

    // LABS
    if (orders.labs.cbc) {
      const isSeptic = patient.isSeptic;
      const hasBleeding = patient.trauma || (patient.ebl && patient.ebl > 0);
      const wbcVal = isSeptic ? 19.4 : 6.8;
      const hbVal = patient.anemia ? 8.9 : (isSeptic ? 11.2 : (hasBleeding ? 10.5 : 14.2));
      const hctVal = hbVal * 3;
      const pltVal = patient.thrombocytopenia ? 75 : (isSeptic ? 88 : 245);
      
      res.labs.cbc = {
        title: 'Complete Blood Count (CBC)',
        values: [
          { name: 'WBC', val: wbcVal.toFixed(1), range: '4.5 - 11.0 x10^3/µL', alert: wbcVal > 11.0 },
          { name: 'Hemoglobin (Hb)', val: hbVal.toFixed(1), range: '12.0 - 17.5 g/dL', alert: hbVal < 12.0 },
          { name: 'Hematocrit (Hct)', val: hctVal.toFixed(1), range: '36.0 - 50.0 %', alert: hctVal < 36.0 },
          { name: 'Platelets', val: pltVal, range: '150 - 450 x10^3/µL', alert: pltVal < 150 }
        ]
      };
    }

    if (orders.labs.bmp) {
      const isSeptic = patient.isSeptic;
      const isCkd = patient.ckd || (patient.renalStage && patient.renalStage > 0);
      const kVal = isCkd ? 5.4 : (patient.trauma ? 4.9 : 4.1);
      const crVal = isCkd ? 2.8 : (isSeptic ? 1.8 : 0.85);
      const glucVal = patient.diabetes ? 195 : (isSeptic ? 165 : 98);
      const bunVal = isCkd ? 48 : (isSeptic ? 28 : 12);
      
      res.labs.bmp = {
        title: 'Basic Metabolic Panel (BMP)',
        values: [
          { name: 'Sodium (Na)', val: '138', range: '135 - 145 mEq/L', alert: false },
          { name: 'Potassium (K)', val: kVal.toFixed(1), range: '3.5 - 5.1 mEq/L', alert: kVal > 5.1 },
          { name: 'Chloride (Cl)', val: '102', range: '96 - 106 mEq/L', alert: false },
          { name: 'CO2 (Bicarbonate)', val: isSeptic ? '17' : '24', range: '22 - 29 mEq/L', alert: isSeptic },
          { name: 'BUN', val: bunVal, range: '7 - 20 mg/dL', alert: bunVal > 20 },
          { name: 'Creatinine (Cr)', val: crVal.toFixed(2), range: '0.70 - 1.30 mg/dL', alert: crVal > 1.3 },
          { name: 'Glucose', val: glucVal, range: '70 - 100 mg/dL', alert: glucVal > 100 }
        ]
      };
    }

    if (orders.labs.coags) {
      const hasCoag = patient.coagulopathy || patient.cirrhosis;
      const inrVal = hasCoag ? 2.3 : 1.0;
      const ptVal = hasCoag ? 26.5 : 12.0;
      const pttVal = hasCoag ? 54.0 : 31.0;
      
      res.labs.coags = {
        title: 'Coagulation Panel',
        values: [
          { name: 'Prothrombin Time (PT)', val: ptVal.toFixed(1) + ' s', range: '11.0 - 13.5 s', alert: hasCoag },
          { name: 'INR', val: inrVal.toFixed(1), range: '0.8 - 1.2', alert: hasCoag },
          { name: 'Partial Thromboplastin Time (PTT)', val: pttVal.toFixed(1) + ' s', range: '25.0 - 35.0 s', alert: hasCoag }
        ]
      };
    }

    if (orders.labs.lfts) {
      const isCirrhosis = patient.cirrhosis;
      const astVal = isCirrhosis ? 134 : 22;
      const altVal = isCirrhosis ? 118 : 25;
      const alkVal = isCirrhosis ? 210 : 68;
      const biliVal = isCirrhosis ? 3.4 : 0.6;
      const albVal = isCirrhosis ? 2.5 : 4.1;

      res.labs.lfts = {
        title: 'Liver Function Tests (LFTs)',
        values: [
          { name: 'AST', val: astVal + ' U/L', range: '10 - 40 U/L', alert: isCirrhosis },
          { name: 'ALT', val: altVal + ' U/L', range: '7 - 56 U/L', alert: isCirrhosis },
          { name: 'Alkaline Phosphatase', val: alkVal + ' U/L', range: '44 - 147 U/L', alert: isCirrhosis },
          { name: 'Total Bilirubin', val: biliVal.toFixed(1) + ' mg/dL', range: '0.2 - 1.2 mg/dL', alert: isCirrhosis },
          { name: 'Albumin', val: albVal.toFixed(1) + ' g/dL', range: '3.5 - 5.0 g/dL', alert: isCirrhosis }
        ]
      };
    }

    if (orders.labs.typeAndScreen) {
      res.labs.typeAndScreen = {
        title: 'Type & Screen',
        values: [
          { name: 'ABO / Rh Type', val: sex === 'male' ? 'A Positive' : 'O Negative', range: 'N/A', alert: false },
          { name: 'Antibody Screen', val: 'Negative', range: 'Negative', alert: false }
        ]
      };
    }

    if (orders.labs.typeAndCross) {
      res.labs.typeAndCross = {
        title: 'Type & Crossmatch',
        values: [
          { name: 'Units Ordered', val: '2 Units PRBC', range: 'N/A', alert: false },
          { name: 'Crossmatch Status', val: 'Compatible - In Blood Bank', range: 'Compatible', alert: false }
        ]
      };
    }

    if (orders.labs.hba1c) {
      const a1c = patient.diabetes ? 8.4 : 5.3;
      res.labs.hba1c = {
        title: 'Glycated Hemoglobin (HbA1c)',
        values: [
          { name: 'HbA1c', val: a1c.toFixed(1) + ' %', range: '< 5.7 %', alert: patient.diabetes }
        ]
      };
    }

    if (orders.labs.pregnancy) {
      const isPregnant = patient.pregnancyStatus === 'pregnant' || patient.isPregnant;
      res.labs.pregnancy = {
        title: 'Pregnancy Screen (beta-hCG)',
        values: [
          { name: 'Urine beta-hCG', val: isPregnant ? 'POSITIVE' : 'NEGATIVE', range: 'NEGATIVE', alert: isPregnant }
        ]
      };
    }

    if (orders.labs.urinalysis) {
      const isSeptic = patient.isSeptic;
      res.labs.urinalysis = {
        title: 'Urinalysis',
        values: [
          { name: 'Appearance', val: isSeptic ? 'Cloudy' : 'Clear', range: 'Clear', alert: isSeptic },
          { name: 'Nitrite', val: isSeptic ? 'Positive' : 'Negative', range: 'Negative', alert: isSeptic },
          { name: 'Leukocyte Esterase', val: isSeptic ? 'Trace' : 'Negative', range: 'Negative', alert: isSeptic },
          { name: 'Protein', val: 'Negative', range: 'Negative', alert: false }
        ]
      };
    }

    if (orders.labs.thyroid) {
      const isHyper = patient.thyroid === 'hyper' || patient.hyperthyroid;
      const isHypo = patient.thyroid === 'hypo' || patient.hypothyroid;
      const tsh = isHyper ? 0.05 : (isHypo ? 14.5 : 1.8);
      const t4 = isHyper ? 3.2 : (isHypo ? 0.4 : 1.2);
      
      res.labs.thyroid = {
        title: 'Thyroid Panel',
        values: [
          { name: 'TSH', val: tsh.toFixed(2) + ' mIU/L', range: '0.40 - 4.00 mIU/L', alert: isHyper || isHypo },
          { name: 'Free T4', val: t4.toFixed(1) + ' ng/dL', range: '0.8 - 1.8 ng/dL', alert: isHyper || isHypo }
        ]
      };
    }

    // DIAGNOSTICS
    if (orders.diagnostics.ecg) {
      let finding = 'Normal sinus rhythm, normal axis, no acute ST-T wave abnormalities.';
      if (patient.cad) {
        finding = 'Sinus rhythm with deep Q waves in anterior leads (V1-V4), consistent with prior anteroseptal MI. Stable compared to prior ECG.';
      } else if (patient.chf || patient.htn) {
        finding = 'Sinus tachycardia, left ventricular hypertrophy (LVH) with lateral repolarization strain pattern. No acute ST elevations.';
      } else if (patient.afib) {
        finding = 'Atrial fibrillation with rapid ventricular response (RVR). Average ventricular rate 110 bpm. Normal axis, no acute ST segment changes.';
      }
      res.diagnostics.ecg = {
        title: '12-Lead Electrocardiogram (ECG)',
        finding
      };
    }

    if (orders.diagnostics.cxr) {
      let finding = 'Lungs are clear. Cardiothoracic ratio is normal. No pleural effusion or pneumothorax.';
      if (patient.chf) {
        finding = 'Cardiomegaly. Prominent pulmonary vasculature and mild peribronchial cuffing, consistent with chronic congestive heart failure. Small bilateral pleural effusions.';
      } else if (patient.copd) {
        finding = 'Hyperinflated lung fields, flattening of the diaphragms, and increased retrosternal clear space, typical of emphysematous changes. No active consolidations.';
      } else if (patient.isSeptic) {
        finding = 'Patchy bibasilar infiltrates, suspicious for early pneumonia. No large effusions or pneumothorax.';
      }
      res.diagnostics.cxr = {
        title: 'Chest X-Ray (PA & Lateral)',
        finding
      };
    }

    if (orders.diagnostics.tte) {
      let finding = 'Normal LV chamber size, EF 60%. No significant valvular disease, normal right ventricular size.';
      if (patient.chf) {
        finding = 'Severely dilated left ventricle, global hypokinesis, LVEF 25%. Moderate mitral regurgitation. Right ventricular systolic pressure elevated (35 mmHg).';
      } else if (patient.as) {
        finding = 'Severe calcific aortic stenosis. Valve area 0.8 cm², mean gradient 44 mmHg, peak velocity 4.2 m/s. Concentric LV hypertrophy, LVEF 55%.';
      } else if (patient.mr) {
        finding = 'Severe mitral regurgitation, posterior leaflet prolapse. LVEF 62%, dilated left atrium (5.1 cm). No pulmonary hypertension.';
      }
      res.diagnostics.tte = {
        title: 'Transthoracic Echocardiogram (TTE)',
        finding
      };
    }

    if (orders.diagnostics.pfts) {
      let finding = 'Normal spirometry: FEV1/FVC ratio 81%, FEV1 96% predicted, FVC 98% predicted.';
      if (patient.copd) {
        finding = 'Severe obstructive defect: FEV1/FVC ratio 44%, FEV1 38% predicted. Minimal improvement post-bronchodilator, indicating fixed obstruction.';
      } else if (patient.restrictive) {
        finding = 'Restrictive pattern: FEV1/FVC ratio 84% (normal), but FVC 48% predicted, TLC 52% predicted, indicating significant restriction.';
      }
      res.diagnostics.pfts = {
        title: 'Pulmonary Function Tests (PFTs)',
        finding
      };
    }

    if (orders.diagnostics.stressTest) {
      let finding = 'No evidence of inducible myocardial ischemia. Patient achieved submaximal target heart rate without symptoms or ECG changes.';
      if (patient.cad && (patient.mets === 'poor' || bmi > 35)) {
        finding = 'Positive Pharmacologic Stress Test: Reversible perfusion defect in the anterior wall and septum, suggestive of significant inducible ischemia in the LAD coronary artery territory.';
      }
      res.diagnostics.stressTest = {
        title: 'Pharmacologic Stress Test (Myocardial Perfusion)',
        finding
      };
    }

    // CONSULTS
    if (orders.consults.cardiology) {
      let advice = 'Low cardiac risk. Cleared to proceed with routine ASA standard monitoring.';
      if (patient.cad || patient.chf || patient.as) {
        advice = 'HIGH RISK CARDIAC PROFILE. 1) Continue aspirin, hold DOAC/Warfarin per guidelines. 2) Ensure beta-blocker and statin taken morning of surgery. 3) Maintain strict hemodynamic parameters: MAP > 65, avoid tachycardia (keep HR < 80). 4) Place pre-induction arterial line for beat-to-beat pressure monitoring. 5) Keep vasoactives (phenylephrine/norepinephrine) in line. 6) Transfusion threshold: Hb < 8.0 g/dL.';
      }
      res.consults.cardiology = {
        title: 'Cardiology Consultation Note',
        specialist: 'Dr. Elizabeth Vance, FACC',
        finding: advice
      };
    }

    if (orders.consults.pulmonology) {
      let advice = 'No active pulmonary concerns. Cleared for general anesthesia.';
      if (patient.copd) {
        advice = 'HIGH RISK OF BRONCHOSPASM & POST-OP VENTILATORY FAILURE. 1) Administer albuterol + ipratropium nebs pre-operatively. 2) Ensure deep plane of anesthesia and complete neuromuscular blockade prior to intubation. 3) Avoid histamine-releasing drugs (e.g. morphine, atracurium). 4) Vent settings: Volume control, tidal volume 6-8 mL/kg IBW, prolonged expiratory phase (I:E = 1:3 or 1:4) to prevent gas trapping / auto-PEEP. 5) Extubate fully awake and reversed.';
      }
      res.consults.pulmonology = {
        title: 'Pulmonology Consultation Note',
        specialist: 'Dr. Aaron Patel, FCCP',
        finding: advice
      };
    }

    if (orders.consults.hematology) {
      let advice = 'No hematological abnormalities noted. Routine surgical coagulation management.';
      if (patient.coagulopathy || patient.thrombocytopenia || patient.cirrhosis) {
        advice = 'HIGH COAGULOPATHY AND BLEEDING RISK. 1) Type & Crossmatch 2 units PRBC and 2 units FFP. 2) Check pre-op platelet count; if Platelets < 50,000, transfuse 1 pool of platelets pre-induction. 3) Avoid neuraxial anesthesia if platelets < 80,000 or INR > 1.5. 4) Use TEG intra-operatively to guide factor/platelet replacement. 5) Keep TXA (1g IV) available in the room.';
      }
      res.consults.hematology = {
        title: 'Hematology Consultation Note',
        specialist: 'Dr. Sarah Lin, MD',
        finding: advice
      };
    }

    if (orders.consults.endocrinology) {
      let advice = 'No active endocrinopathies requiring specialized management.';
      if (patient.diabetes) {
        advice = 'DIABETIC MANAGEMENT PLAN. 1) Check fingerstick blood glucose immediately pre-op. 2) Hold rapid-acting insulin. Take 50% of usual long-acting insulin (glargine/detemir) morning of surgery. 3) Hold oral hypoglycemics (metformin) and GLP-1 agonists (semaglutide) as per guidelines. 4) Intra-op target glucose: 140 - 180 mg/dL. 5) Check glucose Q2 hours intra-op; treat with IV insulin sliding scale if > 180.';
      }
      res.consults.endocrinology = {
        title: 'Endocrinology Consultation Note',
        specialist: 'Dr. Raymond Holt, MD',
        finding: advice
      };
    }

    return res;
  };

  const results = generatePreOpResults();

  // RCRI Cardiovascular Risk Score Matrix (2024 Guidelines)
  const [rcriScore, setRcriScore] = useState(0);
  const [rcriMets, setRcriMets] = useState(patient.mets || 'moderate'); // 'poor' | 'moderate' | 'excellent'

  // Calculate RCRI score based on comorbidities
  useEffect(() => {
    let score = 0;
    if (patient.isHighRiskSurgery || stagedCase.name?.toLowerCase().includes('trauma') || stagedCase.name?.toLowerCase().includes('sepsis') || patient.trauma || patient.isSeptic) score += 1;
    if (patient.cad || patient.pciMonthsAgo) score += 1;
    if (patient.chf) score += 1;
    if (patient.cva || patient.stroke) score += 1;
    if (patient.diabetes && patient.insulinDependent) score += 1;
    if (patient.ckd && patient.creatinine > 2.0) score += 1;
    setRcriScore(score);
  }, [patient]);

  // Derived Risk Class and ACC/AHA Action Recommendation
  let riskClass = '';
  let riskPercent = '';
  let accAction = '';
  let borderClass = '';

  if (rcriScore === 0) {
    riskClass = 'Class I';
    riskPercent = '0.4%';
    accAction = 'LOW RISK: Proceed to surgery without further workup.';
    borderClass = 'border-green-500 bg-green-950/20 text-green-400';
  } else if (rcriScore === 1) {
    riskClass = 'Class II';
    riskPercent = '0.9%';
    if (rcriMets === 'poor') {
      accAction = 'LOW-INTERMEDIATE RISK: 12-Lead ECG recommended pre-operatively. Proceed with routine precautions.';
      borderClass = 'border-yellow-500 bg-yellow-950/20 text-yellow-400';
    } else {
      accAction = 'LOW RISK: Proceed to surgery.';
      borderClass = 'border-green-500 bg-green-950/20 text-green-400';
    }
  } else if (rcriScore === 2) {
    riskClass = 'Class III';
    riskPercent = '6.6%';
    if (rcriMets === 'poor') {
      accAction = 'ELEVATED RISK: Pharmacologic Stress Test strongly recommended. Titrate beta-blockers and optimize cardiovascular therapies.';
      borderClass = 'border-orange-500 bg-orange-950/20 text-orange-400';
    } else {
      accAction = 'INTERMEDIATE RISK: Proceed with continuous intra-operative cardiovascular monitoring (A-line recommended).';
      borderClass = 'border-yellow-500 bg-yellow-950/20 text-yellow-400';
    }
  } else {
    riskClass = 'Class IV';
    riskPercent = '11.0%';
    accAction = 'HIGH RISK: Cardiology Consult required. Delay non-emergent surgery. Consider coronary angiography or cath lab referral.';
    borderClass = 'border-red-500 bg-red-950/20 text-red-400 animate-pulse';
  }

  // Anesthesia Plan State
  const [anesthesiaPlan, setAnesthesiaPlan] = useState({
    type: 'GA', // 'GA' | 'Regional' | 'MAC'
    airway: 'DL', // 'DL' | 'VL' | 'AwakeFiberoptic'
    monitoring: 'standard', // 'standard' | 'aline' | 'cvc' | 'tee'
    bloodConfirm: false
  });

  // Load saved plan if exists
  useEffect(() => {
    if (stagedCase.preOpPlan) {
      setAnesthesiaPlan(stagedCase.preOpPlan);
    }
  }, [stagedCase]);

  const handlePlanChange = (field, value) => {
    const updated = {
      ...anesthesiaPlan,
      [field]: value
    };
    setAnesthesiaPlan(updated);

    // Save to stagedCase state
    if (setStagedCase) {
      setStagedCase(prev => ({
        ...prev,
        preOpPlan: updated
      }));
    }
  };

  const handleProceed = () => {
    // Log the event
    logEvent(`📋 Pre-Op EMR Evaluation Complete. Plan locked: ${anesthesiaPlan.type} with ${anesthesiaPlan.airway} airway plan, ${anesthesiaPlan.monitoring} monitoring. Proceeding to OR.`);
    
    // Inject pre-op lab results into the stagedCase so they are carried forward
    // Map ALL ordered pre-op labs into the intra-op EMR history format.
    // Each panel is keyed by its canonical intra-op title so that subsequent
    // intra-op draws of the same panel append to the same history[] array,
    // enabling temporal trending (e.g., Pre-Op Hb vs. intra-op Hb after hemorrhage).
    const preOpLabRecords = {};

    const labKeyToTitleMap = {
      cbc: 'CBC',
      bmp: 'CMP',
      coags: 'Coagulation',
      lfts: 'LFTs',
      typeAndScreen: 'Type & Screen',
      typeAndCross: 'Type & Cross',
      hba1c: 'HbA1c',
      pregnancy: 'Pregnancy',
      urinalysis: 'Urinalysis',
      thyroid: 'Thyroid'
    };

    Object.keys(orders.labs).forEach(labKey => {
      if (orders.labs[labKey] && results.labs[labKey]) {
        const title = labKeyToTitleMap[labKey];
        if (!title) return;

        const resultsObj = {};
        const testNames = results.labs[labKey].values.map(v => v.name);
        results.labs[labKey].values.forEach(v => {
          resultsObj[v.name] = { val: parseFloat(v.val) || v.val, range: v.range, alert: v.alert };
        });

        preOpLabRecords[title] = {
          testNames,
          history: [
            { time: 'Pre-Op', results: resultsObj }
          ]
        };
      }
    });

    // Merge everything into the patient object that will be started
    const updatedCase = {
      ...stagedCase,
      preOpLabs: preOpLabRecords,
      patient: {
        ...stagedCase.patient,
        preOpOrders: orders,
        preOpPlan: anesthesiaPlan,
        bloodAvailable: anesthesiaPlan.bloodConfirm || orders.labs.typeAndCross,
        bloodPreOrdered: orders.labs.typeAndCross,
        hasALine: anesthesiaPlan.monitoring === 'aline' || anesthesiaPlan.monitoring === 'tee',
        hasCVC: anesthesiaPlan.monitoring === 'cvc',
        airwayPlan: anesthesiaPlan.airway,
        anesthesiaType: anesthesiaPlan.type,
        // Establish starting hemodynamic parameters based on pre-op findings
        startingHb: orders.labs.cbc ? parseFloat(results.labs.cbc.values.find(v => v.name.includes('Hemoglobin')).val) : 14.2,
        startingGlucose: orders.labs.bmp ? parseFloat(results.labs.bmp.values.find(v => v.name.includes('Glucose')).val) : 98,
        startingPotassium: orders.labs.bmp ? parseFloat(results.labs.bmp.values.find(v => v.name === 'Potassium (K)').val) : 4.1,
        startingCreatinine: orders.labs.bmp ? parseFloat(results.labs.bmp.values.find(v => v.name.includes('Creatinine')).val) : 0.85,
      }
    };

    // Close and start
    close();
    onStart(updatedCase);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border-2 border-indigo-500 rounded-xl max-w-6xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden font-mono text-white animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 px-6 py-4 border-b border-indigo-500/30 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-cyan-400 flex items-center gap-2">
              <ClipboardList className="text-indigo-400 animate-pulse"/> Pre-Operative EMR & Risk Assessment
            </h2>
            <p className="text-xs text-slate-400">Review Patient Chart, Order Pre-Op Workup, Perform Risk Staging, and Lock Anesthesia Plan</p>
          </div>
          <button onClick={close} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition">
            <X size={24}/>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-950 px-4 py-2 flex border-b border-slate-800 gap-1 shrink-0 overflow-x-auto custom-scrollbar">
          {[
            { id: 'chart', label: 'Patient Chart', icon: <FileText size={16}/> },
            { id: 'orders', label: 'Order Entry', icon: <CheckSquare size={16}/> },
            { id: 'results', label: 'Workup Results', icon: <Activity size={16}/> },
            { id: 'risk', label: 'Risk Assessment', icon: <ShieldAlert size={16}/> },
            { id: 'plan', label: 'Anesthesia Plan', icon: <Award size={16}/> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/60 custom-scrollbar">
          
          {/* TAB 1: PATIENT CHART */}
          {activeTab === 'chart' && (
            <div className="space-y-6">
              {/* Demographics Summary Card */}
              <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
                <h3 className="text-indigo-400 font-bold text-xs uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                  1. Clinical Demographics & Morphometrics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Patient Name</span>
                    <span className="text-white font-extrabold text-base">{patient.name || 'John Doe'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Age & Biological Sex</span>
                    <span className="text-white font-extrabold text-base">{age}yo / {sex.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Weight / Height</span>
                    <span className="text-white font-extrabold text-base">{weightKg} kg / {heightCm} cm</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Body Mass Index (BMI)</span>
                    <span className="text-white font-extrabold text-base">
                      {bmi.toFixed(1)} kg/m² ({bmi > 35 ? 'Obese Class II' : bmi > 30 ? 'Obese Class I' : 'Normal'})
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm mt-6 pt-6 border-t border-slate-800/50">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Ideal Body Weight (IBW)</span>
                    <span className="text-cyan-400 font-extrabold text-base">{ibw.toFixed(1)} kg</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Lean Body Weight (LBW)</span>
                    <span className="text-cyan-400 font-extrabold text-base">{lbw.toFixed(1)} kg</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Estimated Blood Volume</span>
                    <span className="text-cyan-400 font-extrabold text-base">{Math.round(ebv)} mL</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">BSA (Mosteller)</span>
                    <span className="text-cyan-400 font-extrabold text-base">{bsa.toFixed(2)} m²</span>
                  </div>
                </div>
              </div>

              {/* Spirometric Lung Volumes & Flow Metrics Card */}
              <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
                <h3 className="text-indigo-400 font-bold text-xs uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 flex justify-between">
                  <span>2. Predicted Spirometry & Lung Volumes (ECCS/ERS Reference)</span>
                  <span className="text-[10px] text-slate-500 lowercase font-normal italic">Quanjer et al. 1993 · Pelosi et al. 1998 (Obesity) · Rehder et al. 1977 (Position)</span>
                </h3>

                {/* PRIMARY CLINICAL METRIC: FEV1/FVC Ratio */}
                <div className={`mb-4 p-4 rounded-lg border-2 ${
                  lungVols.fev1FvcRatio < 70
                    ? 'border-red-500 bg-red-950/20'
                    : lungVols.fev1FvcRatio > 85
                      ? 'border-yellow-500 bg-yellow-950/15'
                      : 'border-green-500 bg-green-950/15'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">FEV₁/FVC Ratio (Primary Diagnostic Index)</span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                      lungVols.fev1FvcRatio < 70
                        ? 'bg-red-500/20 text-red-400'
                        : lungVols.fev1FvcRatio > 85
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-green-500/20 text-green-400'
                    }`}>
                      {lungVols.fev1FvcRatio < 70 ? 'OBSTRUCTIVE DEFECT' : lungVols.fev1FvcRatio > 85 ? 'POSSIBLE RESTRICTIVE PATTERN' : 'NORMAL'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className={`font-black text-3xl ${
                      lungVols.fev1FvcRatio < 70 ? 'text-red-400' : lungVols.fev1FvcRatio > 85 ? 'text-yellow-300' : 'text-green-400'
                    }`}>
                      {lungVols.fev1FvcRatio}%
                    </span>
                    <span className="text-slate-500 text-xs">(Normal ≥ 70% · Obstructive &lt; 70% · Restrictive: normal ratio but ↓↓ FVC)</span>
                  </div>
                  {lungVols.fev1FvcRatio < 70 && (
                    <p className="text-[10px] text-red-300/80 mt-2 leading-tight">
                      ⚠ Obstructive physiology confirmed. Prolonged expiratory phase required during mechanical ventilation (I:E ≥ 1:3). Risk of auto-PEEP, dynamic hyperinflation, and bronchospasm on intubation. Avoid histamine-releasing agents.
                    </p>
                  )}
                  {lungVols.fev1FvcRatio > 85 && lungVols.fvcPercentPredicted < 80 && (
                    <p className="text-[10px] text-yellow-300/80 mt-2 leading-tight">
                      ⚠ Restrictive pattern: FEV₁/FVC ratio preserved but FVC significantly reduced ({lungVols.fvcPercentPredicted}% predicted). Reduced tidal volumes and increased respiratory rate may be required. Monitor for rapid desaturation due to diminished total lung capacity.
                    </p>
                  )}
                </div>

                {/* Flow Metrics Row: FEV1, FVC with % Predicted */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-center">
                    <span className="text-cyan-400 block text-[10px] uppercase font-bold mb-1">FEV₁</span>
                    <span className="text-white font-extrabold text-lg">{lungVols.fev1_mL} mL</span>
                    <span className={`block text-xs font-bold mt-0.5 ${
                      lungVols.fev1PercentPredicted < 50 ? 'text-red-400' : lungVols.fev1PercentPredicted < 80 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {lungVols.fev1PercentPredicted}% predicted
                    </span>
                    <span className="text-[9px] text-slate-500 block">Forced Exp Vol 1s</span>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-center">
                    <span className="text-cyan-400 block text-[10px] uppercase font-bold mb-1">FVC</span>
                    <span className="text-white font-extrabold text-lg">{lungVols.fvc_mL} mL</span>
                    <span className={`block text-xs font-bold mt-0.5 ${
                      lungVols.fvcPercentPredicted < 50 ? 'text-red-400' : lungVols.fvcPercentPredicted < 80 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {lungVols.fvcPercentPredicted}% predicted
                    </span>
                    <span className="text-[9px] text-slate-500 block">Forced Vital Cap</span>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-center">
                    <span className="text-indigo-400 block text-[10px] uppercase font-bold mb-1">FRC</span>
                    <span className="text-indigo-300 font-extrabold text-lg">{lungVols.frc_mL} mL</span>
                    <span className="text-[9px] text-slate-500 block mt-0.5">Func Residual Cap</span>
                    {bmi > 25 && (
                      <span className="text-[8px] text-yellow-500/70 block mt-0.5">Pelosi decay: {lungVols.obesityFactor}</span>
                    )}
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-center">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">TLC</span>
                    <span className="text-white font-extrabold text-lg">{lungVols.tlc_mL} mL</span>
                    <span className="text-[9px] text-slate-500 block mt-0.5">Total Lung Cap</span>
                  </div>
                </div>

                {/* Secondary Volumes Row */}
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60 text-center">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold mb-0.5">VC</span>
                    <span className="text-slate-200 font-bold text-sm">{lungVols.vc_mL} mL</span>
                    <span className="text-[8px] text-slate-600 block">Vital Cap</span>
                  </div>
                  <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60 text-center">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold mb-0.5">RV</span>
                    <span className="text-slate-200 font-bold text-sm">{lungVols.rv_mL} mL</span>
                    <span className="text-[8px] text-slate-600 block">Residual Vol</span>
                  </div>
                  <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60 text-center">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold mb-0.5">ERV</span>
                    <span className="text-slate-200 font-bold text-sm">{lungVols.erv_mL} mL</span>
                    <span className="text-[8px] text-slate-600 block">Exp Reserve</span>
                  </div>
                  <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60 text-center">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold mb-0.5">IRV</span>
                    <span className="text-slate-200 font-bold text-sm">{lungVols.irv_mL} mL</span>
                    <span className="text-[8px] text-slate-600 block">Insp Reserve</span>
                  </div>
                  <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60 text-center">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold mb-0.5">V<sub>D</sub></span>
                    <span className="text-slate-200 font-bold text-sm">{lungVols.vd_mL} mL</span>
                    <span className="text-[8px] text-slate-600 block">Dead Space</span>
                  </div>
                </div>
              </div>

              {/* Comorbidities & Medical History */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5">
                  <h4 className="text-indigo-400 font-bold text-xs uppercase tracking-wider mb-3 border-b border-slate-800 pb-1">
                    Comorbidities & System Review
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {patient.cad && <span className="bg-red-950/40 border border-red-800 text-red-400 px-3 py-1 rounded-md text-xs font-bold">Coronary Artery Disease</span>}
                    {patient.chf && <span className="bg-red-950/40 border border-red-800 text-red-400 px-3 py-1 rounded-md text-xs font-bold">Congestive Heart Failure</span>}
                    {patient.as && <span className="bg-red-950/40 border border-red-800 text-red-400 px-3 py-1 rounded-md text-xs font-bold">Severe Aortic Stenosis</span>}
                    {patient.afib && <span className="bg-yellow-950/40 border border-yellow-800 text-yellow-400 px-3 py-1 rounded-md text-xs font-bold">Atrial Fibrillation</span>}
                    {patient.copd && <span className="bg-orange-950/40 border border-orange-800 text-orange-400 px-3 py-1 rounded-md text-xs font-bold">Severe COPD</span>}
                    {patient.asthma && <span className="bg-orange-950/40 border border-orange-800 text-orange-400 px-3 py-1 rounded-md text-xs font-bold">Asthma</span>}
                    {patient.ckd && <span className="bg-purple-950/40 border border-purple-800 text-purple-400 px-3 py-1 rounded-md text-xs font-bold">Chronic Kidney Disease</span>}
                    {patient.cirrhosis && <span className="bg-orange-950/40 border border-orange-800 text-orange-400 px-3 py-1 rounded-md text-xs font-bold">Liver Cirrhosis</span>}
                    {patient.diabetes && <span className="bg-yellow-950/40 border border-yellow-800 text-yellow-400 px-3 py-1 rounded-md text-xs font-bold">Diabetes Mellitus</span>}
                    {patient.mg && <span className="bg-purple-950/40 border border-purple-800 text-purple-400 px-3 py-1 rounded-md text-xs font-bold">Myasthenia Gravis</span>}
                    {patient.isTrauma && <span className="bg-red-950 border border-red-500 text-red-200 px-3 py-1 rounded-md text-xs font-extrabold animate-pulse">LEVEL 1 TRAUMA</span>}
                    {patient.isSeptic && <span className="bg-red-950 border border-red-500 text-red-200 px-3 py-1 rounded-md text-xs font-extrabold animate-pulse">SEVERE SEPSIS</span>}
                    
                    {!patient.cad && !patient.chf && !patient.copd && !patient.ckd && !patient.diabetes && !patient.isTrauma && !patient.isSeptic && (
                      <span className="text-slate-500 italic text-sm">No significant past medical history (ASA I/II equivalent).</span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5">
                  <h4 className="text-indigo-400 font-bold text-xs uppercase tracking-wider mb-3 border-b border-slate-800 pb-1">
                    Medications & Allergies
                  </h4>
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-500 font-bold uppercase block mb-1">Active Outpatient Medications</span>
                      <div className="text-slate-300">
                        {patient.diabetes && <span className="block">• Insulin Glargine 15U QHS, Metformin 1000mg BID</span>}
                        {patient.cad && <span className="block">• Aspirin 81mg daily, Atorvastatin 40mg daily</span>}
                        {patient.chf && <span className="block">• Carvedilol 6.25mg BID, Lisinopril 10mg daily, Furosemide 40mg daily</span>}
                        {patient.copd && <span className="block">• Albuterol HFA PRN, Symbicort 160/4.5mcg BID</span>}
                        {patient.afib && <span className="block">• Apixaban (Eliquis) 5mg BID (held 48 hours pre-op)</span>}
                        {!patient.diabetes && !patient.cad && !patient.chf && !patient.copd && !patient.afib && (
                          <span className="text-slate-500 italic">None reported.</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold uppercase block mb-1">Allergies & Reactions</span>
                      <div className="text-slate-300">
                        {patient.penicillinAllergy ? (
                          <span className="text-red-400 font-bold block">• PENICILLIN (Anaphylaxis - cross reactivity with cephalosporins possible!)</span>
                        ) : (
                          <span className="text-green-400 block">• No Known Drug Allergies (NKDA)</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ORDER ENTRY */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="bg-slate-950/40 p-4 border border-indigo-500/20 rounded-xl flex items-center gap-3">
                <ShieldAlert className="text-indigo-400 shrink-0" size={24}/>
                <p className="text-xs text-slate-300">
                  <strong className="text-indigo-300">Note:</strong> Pre-operative orders return <span className="text-green-400 font-bold">instantly</span> to populate the Results tab. In-OR labs (ordered intra-operatively) will model realistic point-of-care or central lab turnaround times.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Laboratory Panels */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-indigo-400 font-extrabold text-sm uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                    I. Laboratory Tests
                  </h3>
                  <div className="space-y-3">
                    {[
                      { id: 'cbc', label: 'Complete Blood Count (CBC)' },
                      { id: 'bmp', label: 'Basic Metabolic Panel (BMP)' },
                      { id: 'coags', label: 'Coagulation (PT / INR / PTT)' },
                      { id: 'lfts', label: 'Liver Function Tests (LFTs)' },
                      { id: 'typeAndScreen', label: 'Type & Screen' },
                      { id: 'typeAndCross', label: 'Type & Crossmatch' },
                      { id: 'hba1c', label: 'Hemoglobin A1c (HbA1c)' },
                      { id: 'pregnancy', label: 'Pregnancy Screen (beta-hCG)' },
                      { id: 'urinalysis', label: 'Urinalysis (UA)' },
                      { id: 'thyroid', label: 'Thyroid Panel (TSH / Free T4)' }
                    ].map(test => (
                      <label key={test.id} className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer hover:text-white transition">
                        <input
                          type="checkbox"
                          checked={orders.labs[test.id]}
                          onChange={(e) => handleOrderChange('labs', test.id, e.target.checked)}
                          className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-4 h-4"
                        />
                        <span>{test.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Diagnostics */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-indigo-400 font-extrabold text-sm uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                    II. Diagnostic Imaging & Tests
                  </h3>
                  <div className="space-y-3">
                    {[
                      { id: 'ecg', label: '12-Lead Electrocardiogram' },
                      { id: 'cxr', label: 'Chest X-Ray (PA & Lateral)' },
                      { id: 'tte', label: 'Transthoracic Echocardiogram' },
                      { id: 'pfts', label: 'Pulmonary Function Tests (PFTs)' },
                      { id: 'stressTest', label: 'Pharmacologic Stress Test' }
                    ].map(test => (
                      <label key={test.id} className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer hover:text-white transition">
                        <input
                          type="checkbox"
                          checked={orders.diagnostics[test.id]}
                          onChange={(e) => handleOrderChange('diagnostics', test.id, e.target.checked)}
                          className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-4 h-4"
                        />
                        <span>{test.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Consults */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-indigo-400 font-extrabold text-sm uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                    III. Clinical Consultations
                  </h3>
                  <div className="space-y-3">
                    {[
                      { id: 'cardiology', label: 'Cardiology Consult' },
                      { id: 'pulmonology', label: 'Pulmonology Consult' },
                      { id: 'hematology', label: 'Hematology Consult' },
                      { id: 'endocrinology', label: 'Endocrinology Consult' }
                    ].map(test => (
                      <label key={test.id} className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer hover:text-white transition">
                        <input
                          type="checkbox"
                          checked={orders.consults[test.id]}
                          onChange={(e) => handleOrderChange('consults', test.id, e.target.checked)}
                          className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-4 h-4"
                        />
                        <span>{test.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: WORKUP RESULTS */}
          {activeTab === 'results' && (
            <div className="space-y-6">
              {Object.keys(results.labs).length === 0 &&
               Object.keys(results.diagnostics).length === 0 &&
               Object.keys(results.consults).length === 0 ? (
                <div className="text-center py-20 text-slate-500 bg-slate-950/30 rounded-xl border border-slate-800 border-dashed">
                  <ClipboardList className="mx-auto text-slate-600 mb-3" size={48}/>
                  <p className="text-sm font-bold">No tests have been ordered yet.</p>
                  <p className="text-xs text-slate-500 mt-1">Navigate to the "Order Entry" tab to request preoperative diagnostics.</p>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in duration-200">
                  
                  {/* Labs Results Table */}
                  {Object.keys(results.labs).length > 0 && (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                      <div className="bg-indigo-950/30 px-4 py-3 font-extrabold text-sm text-indigo-300 border-b border-slate-800">
                        LABORATORY PANELS
                      </div>
                      <div className="divide-y divide-slate-800">
                        {Object.entries(results.labs).map(([labKey, labData]) => (
                          <div key={labKey} className="p-4">
                            <h4 className="text-xs font-black text-cyan-400 uppercase tracking-wider mb-3">{labData.title}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {labData.values.map((v, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                                  <span className="text-xs font-bold text-slate-400">{v.name}</span>
                                  <div className="text-right">
                                    <span className={`text-sm font-black mr-2 ${v.alert ? 'text-red-500 font-bold' : 'text-green-400'}`}>
                                      {v.val}
                                    </span>
                                    <span className="text-[10px] text-slate-500 italic">({v.range})</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Diagnostics Results */}
                  {Object.keys(results.diagnostics).length > 0 && (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                      <div className="bg-indigo-950/30 px-4 py-3 font-extrabold text-sm text-indigo-300 border-b border-slate-800">
                        DIAGNOSTIC FINDINGS
                      </div>
                      <div className="divide-y divide-slate-800">
                        {Object.entries(results.diagnostics).map(([diagKey, diagData]) => {
                          const vols = calculateLungVolumes(heightCm, age, sex, bmi, 'Sitting', patient.copd || false, patient.restrictive || false);
                          return (
                            <div key={diagKey} className="p-4">
                              <h4 className="text-xs font-black text-cyan-400 uppercase tracking-wider mb-2">{diagData.title}</h4>
                              {diagKey === 'pfts' ? (
                                <div className="space-y-4">
                                  <p className="text-sm text-slate-300 italic mb-2 bg-slate-900/40 p-2 rounded border border-slate-800">"{diagData.finding}"</p>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {[
                                      { label: 'FEV1 (L)', val: (vols.fev1_mL / 1000).toFixed(2), desc: 'Forced Exp. Vol. 1s' },
                                      { label: 'FVC (L)', val: (vols.fvc_mL / 1000).toFixed(2), desc: 'Forced Vital Capacity' },
                                      { label: 'FEV1/FVC Ratio', val: vols.fev1FvcRatio + '%', desc: 'FEV1% (Obstructive <70%)', highlight: vols.fev1FvcRatio < 70 },
                                      { label: 'FEV1 % Predicted', val: vols.fev1PercentPredicted + '%', desc: 'Mild >80% | Mod 50-80% | Sev <50%', highlight: vols.fev1PercentPredicted < 80 },
                                      { label: 'FVC % Predicted', val: vols.fvcPercentPredicted + '%', desc: 'Restriction indicator', highlight: vols.fvcPercentPredicted < 80 },
                                      { label: 'TLC (L)', val: vols.tlc_L.toFixed(2), desc: 'Total Lung Volume', highlight: patient.restrictive }
                                    ].map((card, idx) => (
                                      <div key={idx} className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 flex flex-col justify-between hover:border-indigo-500/50 transition duration-200">
                                        <div>
                                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{card.label}</span>
                                          <span className={`text-xl font-black block mt-1 ${card.highlight ? 'text-red-400' : 'text-emerald-400'}`}>{card.val}</span>
                                        </div>
                                        <span className="text-[9px] text-slate-500 mt-2 block leading-snug">{card.desc}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 italic leading-relaxed">
                                  "{diagData.finding}"
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Consults Results */}
                  {Object.keys(results.consults).length > 0 && (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                      <div className="bg-indigo-950/30 px-4 py-3 font-extrabold text-sm text-indigo-300 border-b border-slate-800">
                        CONSULTATION REVIEWS
                      </div>
                      <div className="divide-y divide-slate-800">
                        {Object.entries(results.consults).map(([consKey, consData]) => (
                          <div key={consKey} className="p-4">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="text-xs font-black text-cyan-400 uppercase tracking-wider">{consData.title}</h4>
                              <span className="text-[10px] text-slate-500 font-bold uppercase">{consData.specialist}</span>
                            </div>
                            <p className="text-sm text-slate-300 bg-slate-900/60 p-4 border border-indigo-900/40 rounded-lg italic leading-relaxed">
                              {consData.finding}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

          {/* TAB 4: RISK ASSESSMENT */}
          {activeTab === 'risk' && (
            <div className="space-y-6">
              
              {/* Cardiac Risk Calculator Details */}
              <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-xl p-5 md:p-6 shadow-lg">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-extrabold text-white">2024 ACC/AHA Risk Evaluation Matrix</h3>
                    <p className="text-xs text-indigo-400 mt-1">Revised Cardiac Risk Index (RCRI) + Functional Capacity Staging</p>
                  </div>
                  <div className="flex items-center gap-4 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Functional METs</span>
                      <select
                        value={rcriMets}
                        onChange={(e) => setRcriMets(e.target.value)}
                        className="bg-transparent text-white font-bold text-xs outline-none cursor-pointer border-none p-0 focus:ring-0"
                      >
                        <option value="excellent" className="bg-slate-950 text-white">Excellent (METs ≥ 4)</option>
                        <option value="poor" className="bg-slate-950 text-white">Poor (METs &lt; 4 or Unknown)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Comorbidities Checklist (Read-Only review of risk predictors) */}
                  <div className="lg:col-span-2 space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Active RCRI Risk Factors</h4>
                    {[
                      { checked: stagedCase.name?.toLowerCase().includes('trauma') || stagedCase.name?.toLowerCase().includes('sepsis') || patient.trauma || patient.isSeptic, label: 'High-risk surgical procedure (Intrathoracic, Vascular, Sepsis, Trauma)' },
                      { checked: patient.cad || patient.pciMonthsAgo, label: 'History of Ischemic Heart Disease (CAD, Prior MI or Angina)' },
                      { checked: patient.chf, label: 'History of Congestive Heart Failure' },
                      { checked: patient.cva || patient.stroke, label: 'History of Cerebrovascular Disease (Stroke, TIA)' },
                      { checked: patient.diabetes && patient.insulinDependent, label: 'Preoperative treatment with Insulin for Diabetes' },
                      { checked: patient.ckd && patient.creatinine > 2.0, label: 'Preoperative Creatinine > 2.0 mg/dL' }
                    ].map((factor, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-xs">
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${factor.checked ? 'border-red-500 text-red-500 bg-red-950/20' : 'border-slate-800 text-slate-700 bg-slate-950'}`}>
                          {factor.checked ? '✓' : '✗'}
                        </span>
                        <span className={factor.checked ? 'text-slate-200 font-bold' : 'text-slate-500'}>{factor.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Staging Decision Output Box */}
                  <div className={`p-5 rounded-xl border flex flex-col justify-between ${borderClass} transition-all duration-300`}>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Score & Class</span>
                        <span className="text-lg font-black text-white">{rcriScore} Points</span>
                      </div>
                      <h4 className="text-xl font-black mb-1">{riskClass}</h4>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-4">CV Event Risk: {riskPercent}</p>
                    </div>
                    <div className="border-t border-current/20 pt-4 mt-2">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500 block mb-1">ACC/AHA Clinical Action</span>
                      <p className="text-xs font-bold leading-relaxed">{accAction}</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* General Pre-Op Staging (ASA, Mallampati, NPO) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* ASA Staging */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5">
                  <h4 className="text-indigo-400 font-bold text-xs uppercase tracking-wider mb-3 border-b border-slate-800 pb-1">
                    Suggested ASA Physical Status
                  </h4>
                  <div className="space-y-2">
                    <span className="text-3xl font-black text-indigo-300 block">
                      ASA {patient.isSeptic || patient.isTrauma ? 'IV' : (patient.cad || patient.chf || patient.copd ? 'III' : 'II')}
                    </span>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Suggested automatically based on systemic comorbidities. Severe systemic pathologies (Sepsis, acute Trauma/Bleed) are classified as ASA IV (threat to life). Chronic stable cardiovascular or pulmonary illnesses are classified as ASA III.
                    </p>
                  </div>
                </div>

                {/* Airway Staging */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5">
                  <h4 className="text-indigo-400 font-bold text-xs uppercase tracking-wider mb-3 border-b border-slate-800 pb-1">
                    Airway Staging
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Mallampati Score:</span>
                      <span className="text-sm font-black text-yellow-400">Class {patient.mallampati || 1}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Neck Mobility:</span>
                      <span className="text-sm font-bold text-white capitalize">{patient.neckMobility || 'Normal'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Oropharyngeal Blood:</span>
                      <span className={`text-sm font-bold ${patient.airwayBlood ? 'text-red-400 animate-pulse' : 'text-slate-400'}`}>
                        {patient.airwayBlood ? 'Present (Hemorrhage)' : 'None'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed border-t border-slate-800/80 pt-2">
                      Anatomy indicates: {patient.mallampati >= 3 || patient.neckMobility === 'reduced' || patient.airwayBlood ? '⚠️ ANTICIPATED DIFFICULT AIRWAY. Prepare video laryngoscope or fiberoptic.' : 'Straightforward direct laryngoscopy anticipated.'}
                    </p>
                  </div>
                </div>

                {/* NPO Staging */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5">
                  <h4 className="text-indigo-400 font-bold text-xs uppercase tracking-wider mb-3 border-b border-slate-800 pb-1">
                    NPO & Gastric Staging
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Solid Food NPO:</span>
                      <span className="font-bold text-white">{patient.npoDuration || 8} Hours</span>
                    </div>
                    {patient.glp1Active && (
                      <div className="bg-red-950/40 border border-red-900/60 p-2 rounded text-[10px] text-red-300 font-bold mt-1">
                        ⚠️ GLP-1 AGONIST THERAPY ACTIVE: Gastric motility delayed! Model as FULL STOMACH regardless of NPO duration. Indicated for Rapid Sequence Induction (RSI).
                      </div>
                    )}
                    {patient.isTrauma && (
                      <div className="bg-red-950/40 border border-red-900/60 p-2 rounded text-[10px] text-red-300 font-bold mt-1">
                        ⚠️ EMERGENCY SURGERY / TRAUMA: Full stomach physiological assumption! RSI indicated.
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 5: ANESTHESIA PLAN */}
          {activeTab === 'plan' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Mode of Anesthesia */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-indigo-400 font-extrabold text-sm uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                    I. Anesthetic Modality
                  </h3>
                  <div className="space-y-3">
                    {[
                      { id: 'GA', label: 'General Anesthesia (GA)' },
                      { id: 'Regional', label: 'Regional (Spinal / Epidural / Nerve Block)' },
                      { id: 'MAC', label: 'Monitored Anesthesia Care (MAC / Sedation)' }
                    ].map(type => (
                      <label key={type.id} className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer hover:text-white transition">
                        <input
                          type="radio"
                          name="anesthesiaType"
                          checked={anesthesiaPlan.type === type.id}
                          onChange={() => handlePlanChange('type', type.id)}
                          className="rounded-full bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-4 h-4"
                        />
                        <span>{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Airway Management */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-indigo-400 font-extrabold text-sm uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                    II. Airway Plan
                  </h3>
                  <div className="space-y-3">
                    {[
                      { id: 'DL', label: 'Direct Laryngoscopy (DL)' },
                      { id: 'VL', label: 'Video Laryngoscopy (VL - GlideScope)' },
                      { id: 'AwakeFiberoptic', label: 'Awake Fiberoptic Intubation (AFOI)' }
                    ].map(airway => (
                      <label key={airway.id} className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer hover:text-white transition">
                        <input
                          type="radio"
                          name="airwayPlan"
                          checked={anesthesiaPlan.airway === airway.id}
                          onChange={() => handlePlanChange('airway', airway.id)}
                          className="rounded-full bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-4 h-4"
                        />
                        <span>{airway.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Hemodynamic Monitoring */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-indigo-400 font-extrabold text-sm uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                    III. Monitoring Plan
                  </h3>
                  <div className="space-y-3">
                    {[
                      { id: 'standard', label: 'Standard ASA Monitors Only' },
                      { id: 'aline', label: 'Arterial Line (Continuous BP)' },
                      { id: 'cvc', label: 'Central Venous Catheter (CVC)' },
                      { id: 'tee', label: 'Transesophageal Echo (TEE) + A-Line' }
                    ].map(mon => (
                      <label key={mon.id} className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer hover:text-white transition">
                        <input
                          type="radio"
                          name="monitoringPlan"
                          checked={anesthesiaPlan.monitoring === mon.id}
                          onChange={() => handlePlanChange('monitoring', mon.id)}
                          className="rounded-full bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-4 h-4"
                        />
                        <span>{mon.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

              </div>

              {/* Safety & Verification Checklist */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-800 pb-1">
                  IV. Patient Safety Verification
                </h3>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <label className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer hover:text-white transition">
                    <input
                      type="checkbox"
                      checked={anesthesiaPlan.bloodConfirm}
                      onChange={(e) => handlePlanChange('bloodConfirm', e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-4 h-4"
                    />
                    <span>Verify blood product availability in the blood bank (PRBC/FFP compatible)</span>
                  </label>
                  
                  {anesthesiaPlan.bloodConfirm && (
                    <span className="text-[10px] bg-green-950 border border-green-800 text-green-400 px-2 py-0.5 rounded font-bold">
                      ✓ BLOOD RESERVES VERIFIED
                    </span>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex justify-between shrink-0">
          <button
            onClick={() => {
              if (activeTab === 'plan') setActiveTab('risk');
              else if (activeTab === 'risk') setActiveTab('results');
              else if (activeTab === 'results') setActiveTab('orders');
              else if (activeTab === 'orders') setActiveTab('chart');
            }}
            disabled={activeTab === 'chart'}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 font-bold rounded-lg text-xs flex items-center gap-2 transition"
          >
            <ArrowLeft size={16}/> Previous Tab
          </button>
          
          <div className="flex gap-3">
            {activeTab !== 'plan' ? (
              <button
                onClick={() => {
                  if (activeTab === 'chart') setActiveTab('orders');
                  else if (activeTab === 'orders') setActiveTab('results');
                  else if (activeTab === 'results') setActiveTab('risk');
                  else if (activeTab === 'risk') setActiveTab('plan');
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs flex items-center gap-2 transition"
              >
                Next Tab <ArrowRight size={16}/>
              </button>
            ) : (
              <button
                onClick={handleProceed}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 font-black text-white rounded-lg text-xs flex items-center gap-2 transition shadow-[0_0_15px_rgba(37,99,235,0.4)]"
              >
                Lock Plan & Proceed to OR <Play size={16}/>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
