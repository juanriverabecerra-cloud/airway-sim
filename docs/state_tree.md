# Full Application State Tree Reference (§8) + Constraints (§10)

> Part of the `goldenversion.md` ground-truth set. Relocated here because nearly every
> chapter-integration session needs to check "does this flag already exist" before adding
> a new patient/vitals field — this file is the canonical answer, kept separate from the
> engine-formula files (§4-6) so it can be read on its own. Section numbering preserved.
> Being assembled in parts — see progress marker at end of file.

### 8. Full Application State Tree

The following lists the exact variables, structures, and data types stored in the active React coordinate state hooks and ref state bridge memory during a simulation session:

#### 8.1 Global Application Hooks (`App.jsx`)
*   `activeCase`: `Object | null` (Active scenario config properties, including baseline vitals, patient descriptions).
*   `isRunning`: `boolean` (Active simulation execution clock running state).
*   `nibp`: `Object` (Last measured cuff blood pressure and timestamp):
    *   `sys`: `number`, `dia`: `number`, `time`: `number`
*   `nibpIntervalMs`: `number` (Periodic automatic cuff cycle frequency in ms, e.g. $60000$ for 1 minute).
*   `logs`: `string[]` (Chronological console notifications log history).
*   `history`: `Object[]` (Chronological stack of snapshot objects for the undo history stack). Each entry contains:
    *   `appState`: `Object` (Vitals, vent settings, logs)
    *   `engineSnapshot`: `Object` (Serialized snapshot of the physiology engine states)
*   `labs`: `Record<string, Record<string, { val: string; ref: string; unit: string }>>` (ABG, CBC, CMP, TEG).
*   `showLabPanel`: `boolean` (Diagnostic panel visibility overlay).
*   `showFidelityPanel`: `boolean` (Fidelity Auditor overlay visibility).
*   `airwayQuizModal`: `Object` (Airway Mallampati diagnostic quiz state):
    *   `show`: `boolean`, `description`: `string`, `trueMallampati`: `number` (1 to 4)
*   `accessModal`: `Object` (Vascular access line placement UI modal category state):
    *   `show`: `boolean`, `category`: `string` ('Peripheral IV', 'Central Line', 'Intraosseous (IO)', 'Arterial Line')
*   `tubeConfirmModal`: `Object` (Auscultation confirmation box state):
    *   `show`: `boolean`, `result`: `string`
*   `viewModal`: `Object` (Glottic laryngoscopy video overlay state):
    *   `show`: `boolean`, `blade`: `string`, `bladeSize`: `string`, `tubeSize`: `string`, `adjunct`: `string`, `description`: `string`, `trueGrade`: `number` (Cormack-Lehane Grade 1 to 4)
*   `setupModal`: `boolean` (Laryngoscopy blade setup overlay toggle).
*   `pocusModal`: `Object` (POCUS ultrasound display):
    *   `show`: `boolean`, `title`: `string`, `finding`: `string`
*   `isCyclingNibp`: `boolean` (Indicates active 15s non-invasive cuff cycle).
*   `isAirwayCollapsed`: `boolean` (Indicates complete soft tissue upper airway obstruction).
*   `preopModal`: `boolean`, `preOpEMR`: `boolean`, `showPreOp`: `boolean`
*   `stagedCase`: `Object | null` (Config staged for initialization).
*   `msmaidsModal`: `boolean`, `msmaidsComplete`: `boolean`
*   `attendingMode`: `string` ('observing' | 'coaching' | 'teaching').
*   `postIntubationModal`: `boolean`, `extubationModal`: `boolean`, `ekgModalOpen`: `boolean`
*   `ventSettings`: `Object` (Ventilator manifold dial values):
    *   `mode`: `string` ('PCV-VG', 'VCV', 'PCV', 'PSV')
    *   `vt`: `number`, `rr`: `number`, `peep`: `number`, `fio2`: `number`, `pinsp`: `number`, `ieRatio`: `number`, `pmax`: `number`, `ps`: `number`, `air`: `number`, `o2`: `number`
*   `gasSettings`: `Object` (Anesthetic vaporizer manifold dials):
    *   `agent`: `string`, `dial`: `number`, `airFlow`: `number`, `o2Flow`: `number`, `n2oFlow`: `number`
*   `defibSettings`: `Object` (ACLS shock configurations):
    *   `joules`: `number`, `sync`: `boolean`

#### 8.2 Core Physiology Engine State Bridge Ref (`stateRef.current`)
*   `time`: `number` (Running simulation second).
*   `vitals`: `Object` (Primary vital signs parameters updated by loops):
    *   `sleepStage`: `'W' | 'N1' | 'N2' | 'N3' | 'R'` (Active sleep stage)
    *   `cbf`: `number` (Cerebral Blood Flow, mL/100 g/min)
    *   `cmro2`: `number` (Cerebral Metabolic Rate of Oxygen, mL/100 g/min)
    *   `icp`: `number` (Intracranial Pressure, mmHg)
    *   `cpp`: `number` (Cerebral Perfusion Pressure, mmHg)
    *   `intracranialCompliance`: `'normal' | 'impaired' | 'exhausted'` (Intracranial compliance state)
    *   `intracranialVolumeOffset`: `number` (Cranial space-occupying volume offset, mL)
    *   `cbv`: `number` (Cerebral Blood Volume index, 0.0 - 1.0)
    *   `hasCerebralIschemia`: `boolean` (Active cerebral ischemia flag)
    *   `cushingsTriadActive`: `boolean` (Active Cushing's reflex flag)
    *   `nystagmusPresent`: `boolean` (Active cerebellar/vestibular nystagmus sign, from `CerebellarEngine.ts`)
    *   `nystagmusSeverity`: `number` (Nystagmus severity index, 0.0 - 1.0)
    *   `ataxiaIndex`: `number` (Cerebellar/vestibular ataxia index, 0.0 - 1.0)
    *   `tonsillarHerniationRisk`: `number` (Continuous tonsillar herniation risk index, 0.0 - 1.0)
    *   `herniationImminent`: `boolean` (Active tonsillar herniation crisis flag, distinct from `cushingsTriadActive`)
    *   `sjvo2`: `number` (Jugular venous oxygen saturation, %)
    *   `rso2`: `number` (Regional cerebral oxygen saturation, %)
    *   `nAChR_mature_occupancy`: `number` (Occupancy of mature postjunctional receptors)
    *   `nAChR_immature_occupancy`: `number` (Occupancy of extrajunctional fetal receptors)
    *   `nAChR_presynaptic_occupancy`: `number` (Occupancy of presynaptic receptors)
    *   `nmjSafetyMargin`: `number` (Neuromuscular transmission safety factor)
    *   `atelectasisFraction`: `number` (Alveolar collapse fraction, 0.0 - 1.0)
    *   `hpvInhibition`: `number` (Hypoxic Pulmonary Vasoconstriction inhibition, 0.0 - 1.0)
    *   `recruitmentManeuverTimer`: `number` (Timer for sustained recruitment pressure, seconds)
    *   `recruitmentPressureActive`: `boolean` (Active recruitment pressure flag)
    *   `do2`: `number` (Systemic oxygen delivery rate, mL/min)
    *   `lvedp`: `number` (Left ventricular end-diastolic pressure, mmHg)
    *   `cpp_coronary`: `number` (Coronary perfusion pressure, mmHg)
    *   `diastoleTimeRatio`: `number` (Ratio of diastolic time to total cardiac cycle)
    *   `mvo2`: `number` (Myocardial oxygen consumption index)
    *   `mvo2Supply`: `number` (Myocardial oxygen supply index)
    *   `lesTone`: `number` (Lower Esophageal Sphincter tone, mmHg)
    *   `gastricPressure`: `number` (Intragastric pressure, mmHg)
    *   `bowelGasVolume`: `number` (Bowel gas volume expansion index, 1.0 - 2.5)
    *   `gutMotility`: `number` (Gut motility index, 0.0 - 1.0; composite average of the three segment indices below)
    *   `inflammatoryIleus`: `number` (Inflammatory ileus factor, 0.0 - 1.0)
    *   `postoperativeIleus`: `number` (Postoperative ileus duration, hours; composite max of the three segment estimates below)
    *   `stomachMotility`, `smallBowelMotility`, `colonicMotility`: `number` (Per-segment motility indices, 0.0 - 1.0, from `GastrointestinalEngine.ts`'s Phase 4 subdivision)
    *   `stomachIleusDurationHours`, `smallBowelIleusDurationHours`, `colonicIleusDurationHours`: `number` (Per-segment postoperative ileus duration estimates, hours)
    *   `mPAP`: `number` (Mean Pulmonary Artery Pressure, mmHg)
    *   `cvp`: `number` (Central Venous Pressure mean, mmHg — pre-existing scalar; Ch36 added the `CvpWaveformModel.js`/`PulmonaryArteryCatheterModel.js` waveform-display consumers of this and `mPAP`/`lvedp` above, see `docs/engines/physiology.md` §4.1.1)
    *   `HVPG`: `number` (Hepatic Venous Pressure Gradient, mmHg)
    *   `pbf`: `number` (Portal Blood Flow, mL/min)
    *   `habf`: `number` (Hepatic Arterial Blood Flow, mL/min)
    *   `thbf`: `number` (Total Hepatic Blood Flow, mL/min)
    *   `renalArteryResistance`: `number` (Renal Artery Resistance index)
    *   `gfr`: `number` (Glomerular Filtration Rate, mL/min)
    *   `rbf`: `number` (Renal Blood Flow, mL/min)
    *   `bun`: `number` (Blood Urea Nitrogen, mg/dL)
    *   `creatinine`: `number` (Serum Creatinine, mg/dL)
    *   `urineOutput`: `number` (Total cumulative urine output, mL)
    *   `urineOutputRate`: `number` (Urine output rate, mL/h)
    *   `urineOsmolality`: `number` (Urine osmolality, mOsm/kg)
    *   `bladderVolume`: `number` (mL, pre-existing accumulator, fills during active urinary retention without a Foley)
    *   `bladderPressure`: `number` (cmH2O, Phase 4 §4.26 `BladderModel.ts` -- real compliance curve, previously nonexistent)
    *   `overflowLeakActive`: `boolean` (Phase 4 §4.26, sex-specific urethral-closure-pressure overflow incontinence flag)
    *   `distensionSympatheticIndex`: `number` (0.0 - 1.0, Phase 4 §4.26, replaces a prior flat +5 HR/MAP on/off offset)
    *   `autonomicDysreflexiaActive` / `autonomicDysreflexiaSeverity`: `boolean` / `number` (0.0 - 1.0, Phase 4 §4.26, spinal cord injury above T6 -- gated on the new, currently UI-unconnected `hasSpinalCordInjuryAboveT6` flag)
    *   `bphSeverity`: `number` (0.0 - 1.0, Phase 4 §4.29, benign prostatic hyperplasia outflow obstruction -- raises the effective male urethral closure pressure in `BladderModel.ts`)
    *   `ureteralObstructionActive` / `ureteralObstructionSeverity` / `ureteralObstructionEventLogged`: `boolean` / `number` / `boolean` (Phase 4 §4.29, simplified single-compartment hydronephrosis proxy -- `severity` represents the fraction of total renal mass affected, not a separate kidney)
    *   `uterineTone`: `number` (0.0 - 1.0, Phase 4 §4.27 `UterineToneModel.ts` -- postpartum myometrial contraction; only meaningful when `deliveryOccurred` is true)
    *   `isPregnant` / `gestationalAgeWeeks` / `deliveryOccurred`: `boolean` / `number` / `boolean` (Phase 4 §4.25/§4.27, gates `PregnancyPhysiologyEngine.ts`/`UterineToneModel.ts`/`FetalMonitoringModel.ts`)
    *   `retainedPlacentaActive` / `prolongedLaborRisk` / `chorioamnionitisActive` / `hasPreeclampsia`: `boolean` (Phase 4 §4.27, uterine atony risk factors / Methylergonovine contraindication check)
    *   `fetalHR` / `fetalVariabilityIndex` / `lateDecelerationActive` / `fetalBradycardiaActive` / `fetalBradycardiaSeverity` / `uterineHyperstimulationActive`: Phase 4 §4.28 `FetalMonitoringModel.ts` outputs -- only populated pre-delivery
    *   `turpSurgeryActive` / `turpResectionSeverity`: `boolean` / `number` (Phase 4 §4.29 `TurpSyndromeModel.ts` -- drives irrigation-fluid-absorption rate deltas applied to the existing `sodiumLevel`/`intravascularVolume`/`temp` tracking)
    *   `plateletCount`: `number` (k/μL, Phase 4 §4.30 `CoagulationCascadeModel.ts`)
    *   `fibrinogenMgDl`: `number` (mg/dL, Phase 4 §4.30)
    *   `factorActivityFraction`: `number` (0.0 - 1.0, composite extrinsic/common pathway, Phase 4 §4.30)
    *   `fibrinolysisIndex`: `number` (0.0 - 1.0, TXA-suppressible, drives TEG LY30, Phase 4 §4.30)
    *   `lethalTriadActive` / `lethalTriadLogged`: `boolean` (Phase 4 §4.30, simultaneous hypothermia + acidosis + coagulopathy)
    *   `ckLevel`: `number` (U/L, creatine kinase, Phase 4 §4.32 `MusculoskeletalModel.ts`)
    *   `myoglobinLevel`: `number` (μg/L, Phase 4 §4.32)
    *   `nerveInjuryRiskIndex`: `number` (0.0 - 1.0, Phase 4 §4.32)
    *   `compartmentSyndromeRisk`: `number` (0.0 - 1.0, Phase 4 §4.32, lithotomy-specific)
    *   `forcedAirWarmingActive` / `warmBlanketActive` / `orRoomTemp` / `bsaExposureFraction`: Phase 4 §4.31 `ThermoregulationModel.ts` inputs
    *   `feNa`: `number` (Fractional excretion of sodium, %)
    *   `akiStage`: `number` (KDIGO AKI stage, 0 - 3)
    *   `akiDamage`: `number` (Tubular cellular damage index, 0.0 - 1.0)
    *   `uopOliguriaTimer`: `number` (Oliguria duration timer, seconds)
    *   `uopAnuriaTimer`: `number` (Anuria duration timer, seconds)
    *   `vasopressinLevel`: `number` (Circulating ADH level, 0.0 - 1.0)
    *   `aldosteroneLevel`: `number` (Circulating Aldosterone level, 0.0 - 1.0)
    *   `osm`: `number` (Calculated plasma osmolality, mOsm/kg)
    *   `sleepArousalThreshold`: `number` (Vigilance threshold for sensory arousal)
    *   `loopGain`: `number` (Respiratory feedback instability factor)
    *   `controllerGain`: `number` (Chemoreceptor sensitivity multiplier)
    *   `plantGain`: `number` (Lung CO2 excretion efficiency)
    *   `mixingGain`: `number` (Circulatory transport time delay)
    *   `dilatorMuscleTone`: `number` (Genioglossus muscle tone index)
    *   `pharyngealCollapseThreshold`: `number` ($P_{\text{crit}}$, pharyngeal closing pressure)
    *   `sleepDebt`: `number` (Cumulative sleep deprivation hours)
    *   `postOpSleepNight`: `number` (Postoperative night count)
    *   `remReboundIntensity`: `number` (REM sleep pressure modifier)
    *   `suvorexantCe`: `number` (Suvorexant effect-site concentration)
    *   `solriamfetolCe`: `number` (Solriamfetol effect-site concentration)
    *   `ahi`: `number` (Apnea-Hypopnea Index events/hr)
    *   `rdi`: `number` (Respiratory Disturbance Index events/hr)
    *   `isCSRActive`: `boolean` (Active Cheyne-Stokes respiration flag)
    *   `isOHSActive`: `boolean` (Active Obesity Hypoventilation Syndrome flag)
    *   `apneicThresholdPaCO2`: `number` (PCO2 drive boundary condition)
    *   `hr`: `number`, `sys`: `number`, `dia`: `number`, `map`: `number`, `co`: `number`, `svr`: `number`, `cmap`: `number`, `bis`: `number`, `temp`: `number`, `spo2`: `number`, `paco2`: `number`, `etco2`: `number`, `pip`: `number`, `pplat`: `number`, `vte`: `number`, `pmean`: `number`, `mv`: `number`, `peep`: `number`, `tofCount`: `number`, `tofRatio`: `number`, `mac`: `number`, `etAgent`: `number`, `etN2O`: `number`, `pao2`: `number`, `metHb`: `number`, `coHb`: `number`, `cyanide`: `number`, `lacticAcid`: `number`, `cao2`: `number`, `cvo2`: `number`, `p50`: `number`, `r_ratio`: `number`
    *   `sef95`: `number` (Spectral edge frequency in Hz)
    *   `bsr`: `number` (Burst suppression ratio percentage 0 to 100)
    *   `p300Amplitude`: `number`, `n2p3Amplitude`: `number`, `p2Amplitude`: `number`, `oldNewEffect`: `number`, `mismatchNegativity`: `number`, `p1Amplitude`: `number`, `n2Latency`: `number` (EEG ERP parameters)
*   `targetVitals`: `Object` (Physiological target attractor baseline values).
*   `patient`: `Object` (State flags, clinical modifiers, and anthropometric data):
    *   `age`: `number`, `sex`: `string`, `weight`: `number`, `height`: `number`
    *   `ibw`: `number`, `bmi`: `number`, `ebv`: `number`, `ebl`: `number`, `bleedRate`: `number`
    *   `oxygenBuffer`: `number | null`, `airwayBlood`: `boolean`, `isObese`: `boolean`, `isSeptic`: `boolean`, `hasCCollar`: `boolean`, `stomach`: `string` ('empty' | 'full'), `gastricVolume`: `number` (mL, Phase 4 `GastricEmptyingModel.ts` -- real continuous content volume, previously an orphaned never-assigned field), `gastricPH`: `number` (Phase 4, continuous gastric content pH), `ppiSuppressionLevel`: `number` (0.0 - 1.0, irreversible PPI/Pantoprazole proton-pump suppression, decoupled from plasma Ce, Phase 4 §4.24), `aspirationEventSeverity`: `number` (0.0 - 1.0, Mendelson-criteria severity frozen at the moment aspiration first occurs, weight-scaled, Phase 4), `isPregnant`: `boolean` (Phase 4 §4.25, `PregnancyPhysiologyEngine.ts` -- previously UI-only/inert), `gestationalAgeWeeks`: `number` (defaults to 38/near-term if `isPregnant` but unspecified), `leftUterineDisplacement`: `boolean` (mitigates aortocaval compression when supine), `aortocavalCompressionActive`: `boolean` (Phase 4, supine hypotensive syndrome of pregnancy flag, for narrative-event transition detection), `limitedMouth`: `boolean`, `trauma`: `boolean`, `chronicBetaBlockade`: `boolean`, `chronicHTN`: `boolean`, `highAnxiety`: `boolean`, `hasALine`: `boolean`, `hasCVC`: `boolean`, `hasPAC`: `boolean` (Ch36, pulmonary artery catheter placed — see `docs/engines/physiology.md` §4.1.1), `avDissociation`: `boolean` (Ch36, drives CVP cannon-a-waves), `tricuspidRegurgitation`: `boolean` (Ch36, drives a fused tall CVP c-v wave), `mitralRegurgitation`: `boolean` (Ch36, drives a tall early-systolic wedge v wave and PCWP overestimation of LVEDP), `alineDamping`: `string | undefined` ('underdamped' | 'overdamped', pre-existing — already drove `ArterialLineModel.js`'s live waveform; Ch36 added `calculateDynamicResponse()` mapping it to a natural-frequency/damping-coefficient pair), `pacWhipArtifact`: `boolean` (Ch36, catheter-motion artifact on the PA trace), `pacOverwedged`: `boolean` (Ch36, non-pulsatile overwedging artifact), `cardiacRhythm`: `string | undefined` ('normal' | 'afib' | 'vfib' | 'vtach' | 'asystole', pre-existing, previously undocumented here — read by `CvpWaveformModel.js` as an alternative to the boolean `afib` flag), `hasIV`: `boolean`, `currentO2Device`: `string`, `currentFiO2`: `number`, `currentO2Flow`: `number`, `oculocardiacTriggered`: `boolean`
    *   `isApneic`: `boolean`, `isParalyzed`: `boolean`, `isTopicalized`: `boolean`, `airwaySecured`: `boolean`, `airwayExamined`: `boolean`, `ventilationStatus`: `string` ('none' | 'assisted' | 'successful' | 'failed' | 'spontaneous'), `tubePosition`: `string | null` ('trachea' | 'right_mainstem' | 'left_mainstem' | 'esophagus' | `null`), `isCuffDeflated`: `boolean`, `bmvOptimized`: `boolean`
    *   `vec3oh`: `number`, `normep`: `number`, `m6g`: `number`, `isSeizure`: `boolean`, `calciumStabilized`: `boolean`, `calciumStabilizedTime`: `number`, `bradycardiaTriggered`: `boolean`, `bradycardiaTime`: `number`, `laryngospasm`: `boolean`, `bronchospasm`: `boolean`, `isBucking`: `boolean`, `celiacBlockActive`: `boolean`, `epiduralBlockActive`: `boolean`, `swallowingActive`: `boolean`, `manipulationIndex`: `number`, `hasRegurgitated`: `boolean`, `hasAspirated`: `boolean`, `suxInjectionTime`: `number`
    *   `cirrhosisFactor`: `number` (Hepatic cirrhosis score, 0.0 - 1.0)
    *   `bilirubin`: `number` (Serum bilirubin level, mg/dL)
    *   `inr`: `number` (International Normalized Ratio)
    *   `creatinine`: `number` (Serum creatinine level, mg/dL)

    *   `albumin`: `number` (Serum albumin level, g/dL)
    *   `encephalopathyGrade`: `number` (West Haven criteria encephalopathy grade, 0 - 4)
    *   `ascitesDegree`: `number` (Ascites severity degree, 0 - 2)
    *   `surgicalProcedure`: `string` (Current scheduled surgical procedure)
    *   `varicealBleedingActive`: `boolean` (Active gastroesophageal varices rupture flag)
    *   `varicealBleedTime`: `number | null` (Timestamp of variceal rupture initiation)
    *   `hasPoPHCollapse`: `boolean` (Portopulmonary acute RV collapse flag)
    *   `hasTIPS`: `boolean` (Presence of Transjugular Intrahepatic Portosystemic Shunt)
    *   `gfr`: `number` (Glomerular Filtration Rate, mL/min)
    *   `rbf`: `number` (Renal Blood Flow, mL/min)
    *   `bun`: `number` (Blood Urea Nitrogen, mg/dL)
    *   `creatinine`: `number` (Serum Creatinine, mg/dL)
    *   `urineOutput`: `number` (Total cumulative urine output, mL)
    *   `urineOutputRate`: `number` (Urine output rate, mL/h)
    *   `urineOsmolality`: `number` (Urine osmolality, mOsm/kg)
    *   `feNa`: `number` (Fractional excretion of sodium, %)
    *   `akiStage`: `number` (KDIGO AKI stage, 0 - 3)
    *   `akiDamage`: `number` (Tubular cellular damage index, 0.0 - 1.0)
    *   `uopOliguriaTimer`: `number` (Oliguria duration timer, seconds)
    *   `uopAnuriaTimer`: `number` (Anuria duration timer, seconds)
    *   `baselineCreatinine`: `number` (Baseline serum creatinine reference, mg/dL)
    *   `baselineBun`: `number` (Baseline BUN reference, mg/dL)
    *   `glucose`: `number` (Patient serum glucose level, mg/dL)
    *   `vasopressinLevel`: `number` (Circulating ADH level, 0.0 - 1.0)
    *   `aldosteroneLevel`: `number` (Circulating Aldosterone level, 0.0 - 1.0)
    *   `osm`: `number` (Calculated plasma osmolality, mOsm/kg)
    *   `hasAki`: `boolean` (Presence of acute kidney injury flag)
    *   `hasPrerenalOliguria`: `boolean` (Active prerenal oliguria state flag)
    *   `hasFluidOverloadEdema`: `boolean` (Active fluid overload pulmonary edema flag)
    *   `nAChR_state`: `'normal' | 'upregulated' | 'downregulated'` (Nicotinic receptor expression state)
    *   `suxPhaseII`: `boolean` (Active Succinylcholine Phase II block flag)
    *   `suxCumulativeDose`: `number` (Cumulative succinylcholine dose, mg)
    *   `neostigmineWeakness`: `boolean` (Active Neostigmine-induced muscle weakness flag)
    *   `C_cat`: `number` (Endogenous catecholamine level), `MAP_set`: `number` (Baroreceptor MAP attractor setpoint)
    *   `bloodBank`: `Object` (status, unitsInOR, deliveryCountdown, totalDeliveryTime, pendingUnits, preOpWorkup)
    *   `accessLines`: `Object[]` (id, name, category, type, location, radius, length, venousPressure, veinResistance, fluidLine, failed, activeInfusions, activeMedInfusions)
    *   `lcActivity`: `number` (Locus Ceruleus noradrenergic activity 0.0-1.0)
    *   `tmnActivity`: `number` (Tuberomammillary Nucleus histaminergic activity 0.0-1.0)
    *   `vlpoActivity`: `number` (Ventrolateral Preoptic sleep-active GABA/galanin activity 0.0-1.0)
    *   `mnpoActivity`: `number` (Median Preoptic sleep-pressure activity 0.0-1.0)
    *   `ldtPptActivity`: `number` (Laterodorsal/pedunculopontine tegmentum cholinergic activity 0.0-1.0)
    *   `prfActivity`: `number` (Pontine Reticular Formation activity 0.0-1.0)
    *   `vtaActivity`: `number` (Ventral Tegmental Area dopaminergic activity 0.0-1.0)
    *   `orexinLevel`: `number` (Hypothalamic orexin A/B level 0.0-1.0)
    *   `gabaa_occupancy`: `number` (Sedation & hypnosis receptor state)
*   `glycine_occupancy`: `number` (Spinal cord motor immobility receptor state)
*   `k2p_activation`: `number` (Leak potassium hyperpolarization state)
*   `nmda_blockade`: `number` (NMDA receptor inhibition state)
*   `hcn_inhibition`: `number` (HCN pacemaker current inhibition state)
*   `nav_blockade`: `number` (Voltage-gated sodium channel inhibition state)
*   `nachr_inhibition`: `number` (Nicotinic AChR inhibition state)
*   `isF6Active`: `boolean` (Amnestic nonimmobilizer active flag)
*   `isF3Active`: `boolean` (Anesthetic cyclobutane active flag)
*   `isTASK1Knockout`: `boolean` (TASK-1 gene knockout comorbidity)
*   `isTASK3Knockout`: `boolean` (TASK-3 gene knockout comorbidity)
*   `isTREK1Knockout`: `boolean` (TREK-1 gene knockout comorbidity)
*   `isHCN1Knockout`: `boolean` (HCN1 forebrain knockout comorbidity)
*   `slowOscillationPower`: `number` (Delta slow-wave power 0.0-10.0)
    *   `thalamocorticalConn`: `number` (Nonspecific thalamocortical connectivity 0.0-1.0)
    *   `frontoparietalFeedback`: `number` (Top-down FP directional connectivity 0.0-1.0)
    *   `corticocorticalConn`: `number` (Global corticocortical connectivity 0.0-1.0)
    *   `basalGangliaConn`: `number` (Basal ganglia pathway connectivity 0.0-1.0)
    *   `alpha5GabaaOccupancy`: `number` (Hippocampal alpha-5 GABA-A occupancy 0.0-1.0)
    *   `alpha4GabaaOccupancy`: `number` (Dentate gyrus/thalamus alpha-4 GABA-A occupancy 0.0-1.0)
    *   `explicitEncoding`: `number` (Explicit memory encoding strength lambda 0.0-1.0)
    *   `explicitConsolidation`: `number` (Explicit memory consolidation decay rate psi 0.1-5.0)
    *   `ltpInductionInhibited`: `boolean` (Long-Term Potentiation induction blockade flag)
    *   `p300Amplitude`: `number`, `n2p3Amplitude`: `number`, `p2Amplitude`: `number`, `oldNewEffect`: `number`, `mismatchNegativity`: `number`, `p1Amplitude`: `number`, `n2Latency`: `number` (ERP waveforms)
    *   `hippocampalThetaFreq`: `number` (Theta wave frequency in Hz)
    *   `hippocampalThetaPower`: `number` (Theta wave power 0.0-1.2)
    *   `amygdaloHippocampalConn`: `number` (Basolateral amygdala-hippocampal coupling 0.0-1.0)
    *   `neuralInertiaLag`: `number` (Hysteresis emergence lag tracker 0.0-1.0)
    *   `alpha5Knockout`: `boolean` (Genetic alpha-5 GABA-A mutation comorbidity)
    *   `alpha4Knockout`: `boolean` (Genetic alpha-4 GABA-A mutation comorbidity)
    *   `tmnPropofolResistant`: `boolean` (TMN histaminergic propofol resistance)
    *   `narcolepsy`: `boolean` (Orexin deficiency comorbidity)
    *   `alpha2AKnockout`: `boolean` (Alpha-2A receptor knockout comorbidity)
    *   `isAwarenessActive`: `boolean` (Intraoperative awareness active indicator)
    *   `ptsdScore`: `number` (Cumulative trauma/PTSD risk score 0.0-100.0)
    *   `hasExplicitRecall`: `boolean` (Patient consolidated explicit memory of surgery)
    *   `hasImplicitRecall`: `boolean` (Patient consolidated implicit memory familiarity)
    *   `isDreaming`: `boolean` (Disconnected consciousness active flag)
    *   `preopMemoryEncoded`: `boolean` (Indicates memory items encoded in pre-op)
    *   `retrogradeFacilitationRatio`: `number` (Pre-induction memory facilitation scaling factor)
    *   `fearMemoryRetrieved`: `boolean` (Fear memory retrieval cue presented indicator)
    *   `reconsolidationWindowOpen`: `boolean` (Reconsolidation window active state)
    *   `reconsolidationTimer`: `number` (Seconds remaining in the reconsolidation window)
    *   `fearConditioning`: `number` (Amygdala fear memory associative strength 0.0-1.0)
    *   `fearExtinguished`: `boolean` (Fear memory successfully erased indicator)
    *   `displayEmergenceLag`: `boolean` (Indicates emergence delay is active)
*   `activeMeds`: `PKPDModel[]` (Instantiated pharmacology models tracking compartment amounts $A_1, A_2, A_3$, effect site $C_e$, plasma concentration $C_p$, dynamic central volume `dynamicV1`, active infusion duration `infusionDurationSeconds`, and context-sensitive half-times `csht`).
*   `cortisolLevel`: `number` (Dynamic cortisol level in mcg/dL)
*   `adrenalSuppressionActive`: `boolean` (Adrenocortical 11-beta-hydroxylase blockade flag)
*   `prisAccumulation`: `number` (Cumulative seconds of high-dose propofol infusion)
*   `prisTriggered`: `boolean` (Propofol Infusion Syndrome crisis active flag)
*   `emergenceDeliriumTriggered`: `boolean` (Ketamine emergence delirium agitation active flag)
*   `barbiturateArterialPrecipitation`: `boolean` (Arterial crystal precipitation active flag)
*   `barbiturateArterialDrugName`: `string` (Name of injected precipitating barbiturate)
*   `chronicBenzoUse`: `boolean` (Chronic benzodiazepine tolerance flag)
*   `hydroxyMidazolam`: `number` (Active metabolite 1-hydroxymidazolam level)
*   `norketamine`: `number` (Active metabolite norketamine level)
*   `opioidRigidityActive`: `boolean` (Chest wall rigidity active flag)
*   `remifentanilHyperalgesiaActive`: `boolean` (Opioid-induced hyperalgesia active flag)
*   `remifentanilInfusionDuration`: `number` (Seconds of high-rate remifentanil infusion)
*   `sphincterOfOddiSpasmActive`: `boolean` (Sphincter of Oddi spasm active flag)
*   `opioidPruritusActive`: `boolean` (Opioid-induced pruritus active flag)
*   `renarcotizationActive`: `boolean` (Renarcotization central apnea active flag)
*   `naloxoneSurgeTriggered`: `boolean` (Naloxone sympathetic surge triggered flag)
*   `naloxoneSurgeActive`: `boolean` (Naloxone sympathetic surge active flag)
*   `naloxoneSurgeTime`: `number` (Remaining seconds of sympathetic surge)
*   `forcePenicillinAnaphylaxis`: `boolean` (Force IgE-mediated anaphylactic shock flag)
*   `forcePris`: `boolean` (Force Propofol Infusion Syndrome flag)
*   `forceAdrenalSuppression`: `boolean` (Force Etomidate adrenal suppression flag)
*   `forceEmergenceDelirium`: `boolean` (Force Ketamine emergence delirium flag)
*   `forceBarbituratePrecipitation`: `boolean` (Force Barbiturate arterial precipitation flag)
*   `forceBenzoWithdrawalSeizure`: `boolean` (Force Flumazenil benzo withdrawal seizure flag)
*   `forceOpioidRigidity`: `boolean` (Force Opioid chest wall rigidity flag)
*   `forceRemifentanilHyperalgesia`: `boolean` (Force Remifentanil-induced hyperalgesia flag)
*   `forceSphincterOfOddiSpasm`: `boolean` (Force Sphincter of Oddi spasm flag)
*   `forceOpioidPruritus`: `boolean` (Force Opioid-induced pruritus flag)
*   `forceNaloxoneSurge`: `boolean` (Force Naloxone sympathetic surge flag)
*   `forceHalothaneHepatitis`: `boolean` (Force Halothane hepatitis flag)
*   `forceMethoxyfluraneNephrotoxicity`: `boolean` (Force Methoxyflurane fluoride-induced nephrotoxicity flag)
*   `forceAirwayFire`: `boolean` (Force runaway exothermic CO2 absorbent fire flag)
*   `forceMucusPlug`: `boolean` (Force focal mucus plug formation flag)
*   `forceVaricealBleed`: `boolean` (Force variceal bleeding event flag)
*   `forcePoPHCollapse`: `boolean` (Force Portopulmonary Hypertension acute right ventricular collapse flag)
*   `forceFluidOverloadEdema`: `boolean` (Force Fluid Overload pulmonary edema flag)
*   `forceNormepSeizure`: `boolean` (Force Normeperidine-induced seizure flag)
*   `halothaneHepatitisRolled`: `boolean | undefined` (Indicates if Halothane hepatitis has been randomly rolled)
*   `methoxyfluraneNephrotoxicityRolled`: `boolean | undefined` (Indicates if Methoxyflurane nephrotoxicity has been randomly rolled)
*   `airwayFireRolled`: `boolean | undefined` (Indicates if runaway airway fire has been randomly rolled)
*   `mucusPlugRolled`: `boolean | undefined` (Indicates if mucus plug has been randomly rolled)
*   `varicealBleedRolled`: `boolean | undefined` (Indicates if variceal bleeding has been randomly rolled)
*   `poPHCollapseRolled`: `boolean | undefined` (Indicates if PoPH collapse has been randomly rolled)
*   `fluidOverloadEdemaRolled`: `boolean | undefined` (Indicates if fluid overload edema has been randomly rolled)
*   `normepSeizureRolled`: `boolean | undefined` (Indicates if normeperidine seizure has been randomly rolled)
*   `electrolytes`: `Object` (na, k, cl, ca, ph)
*   `coags`: `Object` (r_offset, ma_offset, angle_offset)

### 10. Constraints & Edge Cases

1.  **1-Second Tick Resolution**: The physics engine ticks at 1Hz. Events that require finer time divisions are handled using internal sub-stepping (10 steps per second). Decoupled graphical waveforms (60Hz) read from hooks.
2.  **Memory Limits on History Stack**: Every user action calls `saveState()` which deep-copies the entire state tree. Over long training sessions, the history array grows linearly in memory, which could cause browser tab slow-downs.
3.  **Textbook Rule Ambiguities**: The natural language parser uses regex patterns to extract relationships. This is prone to false positives if descriptions are metaphorical. Strictly validated via `isPhysiologicallyPlausible`.
4.  **Unsupported Clinical Complications**: High-frequency pathology waveforms like malignant hyperthermia or severe valvular stenoses are currently either unmodeled or modeled purely as static text alerts.
5.  **Unary Chelation Limitations**: Sugammadex chelation resolves muscle relaxant concentrations by scaling down A1 in a single step, rather than modeling binding affinity curves over time.
6.  **Sleep Stage Transition Modeling**: Sleep stage transitions are modeled on a 1-second interval grid. Fine-grained hypnogram features like micro-arousals (lasting $<3\text{ seconds}$) are smoothed out, which may slightly underestimate transient airway collapses.
7.  **Loop Gain Numerical Stability**: High loop gain values ($LG > 2.5$) can introduce numerical resonance oscillations in the respiratory rate and tidal volume calculations during Euler integration. Solved by clamping maximum oscillations and smoothing ventilatory updates.
8.  **Monro-Kellie Elastance Resolution**: The exponential ICP compliance model assumes uniform pressure distribution throughout the cranial vault. Local pressure gradients (such as tentorial or tonsillar herniation shear forces) are not modeled mechanically, but are represented via functional threshold triggers.
9.  **Cerebral Steal Approximation**: Steal and Robin Hood effects are modeled as local perfusion resistance offsets in the blood-gas exchange and target oxygenation equations rather than a full 3D vascular network simulation.
10. **Neuromuscular Receptor Subtype Simplification**: The three-compartment receptor pool assumes direct proportional equilibrium of effect-site concentration without representing complex multi-step binding kinetics or local synaptic clearance gradients.
11. **Phase II Block Threshold**: Transition to Phase II succinylcholine block is modeled as a binary step function based on cumulative dose rather than a continuous transition curve.
12. **Alveolar Gas Partitioning**: The single-alveolus FRC model simplifies ventilation-perfusion distribution. Gravitational West zones and regional ventilation heterogeneities are represented through overall shunt fraction and compliance multipliers rather than discrete anatomical compartments.
13. **Coronary Anatomy & Autoregulation**: The coronary system is modeled globally via left ventricular end-diastolic pressure and mean diastolic perfusion, representing local flow dynamics as a single lumped compartment with uniform stenosis scaling rather than independent regional vessel trees.
14. **Gastrointestinal Cavities & Gas Solubility**: The bowel gas compartment itself is still a single uniform cavity (`bowelGasVolume`); regional micro-peristalsis and stomach geometry are not modeled. Stomach/small-bowel/colon motility and postoperative ileus duration ARE now segment-specific (`stomachMotility`/`smallBowelMotility`/`colonicMotility`, Phase 4 of `mutable-roaming-newell.md`), partially superseding this simplification -- `gutMotility`/`inflammatoryIleus`/`postoperativeIleus` remain as derived composites for backward compatibility, not independently-modeled segments.
15. **Hepatic Blood Flow & Metabolism Autoregulation**: Liver circulation is represented as a lumped dual-supply system. Micro-lobular architecture, zone-specific hypoxia (Zones 1-3), and enzymatic induction rates for specific cytochrome P450 isoenzymes are simulated via aggregate flow rates and drug clearance ratios rather than detailed metabolic spatial maps.
