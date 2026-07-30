export interface PreloadedConsult {
  readonly text: string;
}

export const PRELOADED_CONSULTS: Record<string, string> = {
  propofol: `=== CLINICAL SUMMARY ===
- 🧬 **Mechanism**: Alkylphenol derivative that acts as a potent selective GABA-A receptor positive allosteric modulator, increasing chloride conductance to hyperpolarize postsynaptic membranes.
- 💊 **Dosing**: Induction dose is 1.5–2.5 mg/kg IV; rapid onset (30–40 seconds), short duration (3–8 minutes) due to rapid redistribution (t½α ≈ 2–4 min). Maintenance: 50–200 mcg/kg/min IV.
- 🫁 **Physiology**: Causes profound dose-dependent hypotension via systemic vasodilation (decreases SVR) and direct myocardial depression; depresses airway reflexes and causes apnea.
- ⚠️ **Adverse**: Pain on injection, high risk of hypotension/apnea, bradycardia, and Propofol Infusion Syndrome (PRIS) with prolonged high-dose infusions (>4 mg/kg/hr or >67 mcg/kg/min for >48 hours).
- 📖 **Pearls**: Drug of choice for rapid sequence induction (RSI) due to superior suppression of laryngeal reflexes; possesses antiemetic, antipruritic, and anticonvulsant properties.

=== DETAILED CONSULTATION ===
### 🧬 Mechanism & Receptor Pharmacology
- **GABA-A Receptor Modulation**: Propofol binds to the \(\beta\)-subunits of the ligand-gated GABA-A receptor channel in the central nervous system. It decreases the rate of dissociation of GABA from its receptor, thereby increasing the duration of GABA-activated opening of the chloride channel and resulting in hyperpolarization of cell membranes.
- **Direct Activation**: At higher concentrations, propofol directly activates GABA-A receptors even in the absence of GABA.
- **Other Targets**: Also displays mild inhibition of NMDA receptors and slows Na+ channel inactivation, contributing to its sedative-hypnotic properties.

### 💊 Clinical Dosing & Pharmacokinetics
- **Induction**: 1.5 to 2.5 mg/kg IV (reduced to 1.0–1.5 mg/kg in elderly, ASA III/IV, or hemodynamically compromised patients; increased in pediatric patients due to larger Vd).
- **Maintenance (TIVA)**: 50 to 200 mcg/kg/min IV.
- **Onset & Redistribution**: Onset occurs within 30–40 seconds (one arm-to-brain circulation time). Consciousness is regained in 3–8 minutes, which depends on rapid redistribution from the brain (vessel-rich group) to muscles and fat.
- **Metabolism**: Rapidly cleared by hepatic conjugation to glucuronides and sulfates (excreted in urine), with a clearance rate exceeding hepatic blood flow (suggesting extrahepatic metabolism, e.g., lungs/kidneys).

### 🫁 Physiological Effects & Clinical Indications
- **Cardiovascular**: Decreases SVR (vasodilation) and causes direct myocardial contractility depression, resulting in a 15–25% reduction in mean arterial pressure (MAP). It also blunts the baroreceptor heart rate response to hypotension.
- **Respiratory**: Causes dose-dependent respiratory depression and apnea. It decreases tidal volume and respiratory rate, and blunts the ventilatory response to hypercapnia and hypoxia. It is a potent bronchodilator.
- **Neurological**: Decreases cerebral blood flow (CBF), cerebral metabolic rate of oxygen (\(\text{CMRO}_2\)), and intracranial pressure (ICP) while maintaining or slightly reducing cerebral perfusion pressure (CPP).

### ⚠️ Adverse Effects, Warnings & Contraindications
- **Propofol Infusion Syndrome (PRIS)**: A rare but highly lethal complication characterized by severe metabolic acidosis, rhabdomyolysis, hyperkalemia, hepatomegaly, renal failure, and refractory bradyarrhythmias progressing to asystole.
- **Pain on Injection**: Common due to venous irritation. Mitigated by pre-treatment with lidocaine (40 mg IV) or utilizing larger antecubital veins.
- **Egg/Soy Allergy Caution**: Formulated in a lipid emulsion containing soybean oil, egg lecithin, and glycerol. Although once strictly contraindicated, current evidence indicates that most patients with egg allergies can safely receive propofol unless they have had anaphylaxis to egg lecithin specifically.

### 📖 Clinical Pearls & General Notes
- **Antiemetic Effect**: Subanesthetic doses of propofol (10–20 mg IV bolus or 10–20 mcg/kg/min infusion) are highly effective in treating postoperative nausea and vomiting (PONV).
- **Airway Reflex Suppression**: Propofol provides excellent suppression of laryngeal and pharyngeal reflexes, making it the preferred induction agent when placing a Laryngeal Mask Airway (LMA).
- **Eduction/Delirium**: Associated with a low incidence of postoperative delirium and high patient satisfaction ("dream-like" state upon emergence).`,

  etomidate: `=== CLINICAL SUMMARY ===
- 🧬 **Mechanism**: Carboxylated imidazole derivative that acts as a potent selective GABA-A receptor positive allosteric modulator, increasing chloride conductance to hyperpolarize membranes.
- 💊 **Dosing**: Induction dose is 0.2–0.3 mg/kg IV; rapid onset (30–60 seconds), short duration (3–10 minutes) driven by rapid redistribution.
- 🫁 **Physiology**: Exceptional hemodynamic stability with minimal changes to SVR, MAP, or myocardial contractility; preserves cerebral perfusion pressure.
- ⚠️ **Adverse**: Causes transient adrenal suppression via dose-dependent inhibition of 11-beta-hydroxylase (lasts 4–8 hours), myoclonus, injection pain, and high incidence of PONV.
- 📖 **Pearls**: The induction agent of choice for hemodynamically unstable patients (sepsis, trauma, severe cardiac disease), but avoid or cover with stress-dose steroids if adrenal crisis is suspected.

=== DETAILED CONSULTATION ===
### 🧬 Mechanism & Receptor Pharmacology
- **GABA-A Positive Allosteric Modulation**: Etomidate binds selectively to the \(\beta\)-subunit (specifically the \(\beta_2\) and \(\beta_3\) subunits containing a methionine residue) of the GABA-A receptor in the central nervous system. It enhances the receptor's affinity for GABA, increasing the frequency of chloride channel opening, causing chloride influx, cellular hyperpolarization, and subsequent postsynaptic inhibition.
- **Enantiomeric Selectivity**: It is administered as the active R-(+) isomer, which possesses 20–30 times the anesthetic potency of the S-(-) isomer.
- **Lack of Analgesic Activity**: Etomidate does not possess intrinsic analgesic properties; administration requires co-administration of an opioid (e.g., fentanyl) to blunt the sympathetic response to noxious stimuli (e.g., laryngoscopy).

### 💊 Clinical Dosing & Pharmacokinetics
- **Induction Dosage**: The standard intravenous induction dose is 0.2 to 0.3 mg/kg IV (e.g., 20 mg for a typical adult).
- **Rapid Onset & Recovery**: Onset occurs within one arm-to-brain circulation time (30–60 seconds) with peak effect at 1 minute. Recovery of consciousness occurs in 3–10 minutes, mirroring rapid redistribution of the drug from the brain to inactive tissue compartments (redistribution half-life of 2–4 minutes).
- **Metabolism & Elimination**: Metabolized rapidly by ester hydrolysis in both the liver (CYP450 enzymes) and plasma esterases to an inactive carboxylic acid metabolite. Renal excretion of metabolites accounts for 85% of clearance, with a terminal elimination half-life of 2–5 hours.
- **Protein Binding**: Approximately 76% bound to plasma albumin; increased free fraction in patients with renal disease, hepatic dysfunction, or hypoalbuminemia requires downward dose titration.

### 🫁 Physiological Effects & Clinical Indications
- **Cardiovascular Stability**: Unlike propofol or thiopental, etomidate preserves myocardial contractility, systemic vascular resistance (SVR), and cardiac output. This stability is mediated by its preservation of sympathetic baroreceptor reflexes and lack of direct peripheral vasodilating properties.
- **Central Nervous System**: Decreases cerebral metabolic rate of oxygen (\(\text{CMRO}_2\)) by up to 35–45% and cerebral blood flow (CBF) by 35%, leading to a significant reduction in intracranial pressure (ICP) while maintaining cerebral perfusion pressure (CPP). It is also known to activate epileptogenic foci, making it useful during intraoperative mapping but requiring caution in patients with active epilepsy.
- **Respiratory Stability**: Causes a transient, mild decrease in minute ventilation and tidal volume, but preserves ventilatory responses to hypoxia and hypercapnia better than other hypnotics. Less likely to trigger apnea unless co-administered with opioids.

### ⚠️ Adverse Effects, Warnings & Contraindications
- **Adrenocortical Suppression**: Etomidate causes dose-dependent, reversible inhibition of 11-\(\beta\)-hydroxylase, an essential enzyme in the synthetic pathway of cortisol and aldosterone. A single induction dose suppresses adrenal cortisol production for 4 to 8 hours (and up to 24 hours in vulnerable patients), which has been linked to increased vasopressor requirements in septic patients.
- **Myoclonus**: Occurs in 50–80% of patients receiving etomidate without pre-medication. This is caused by disinhibition of subcortical pathways and can be attenuated by pre-treatment with low-dose opioids (e.g., fentanyl) or benzodiazepines.
- **Thrombophlebitis & Pain on Injection**: Formulated in 35% propylene glycol (pH 6.9), which causes significant venous irritation and pain upon injection into small vessels.
- **Postoperative Nausea & Vomiting (PONV)**: Known to have one of the highest rates of PONV among intravenous induction agents.

### 📖 Clinical Pearls & General Notes
- **Laryngoscopy Blunting**: Because etomidate does not blunt the sympathetic response to laryngoscopy, always co-administer fentanyl (1.5–3 mcg/kg) or lidocaine (1.5 mg/kg) during induction to prevent tachycardic and hypertensive surges, especially in patients with coronary artery disease or aortic stenosis.
- **Sepsis Caution**: While etomidate is hemodynamically stable, the associated adrenal suppression can worsen outcomes in severe septic shock. If used for induction in severe sepsis, ensure the clinical team considers hydrocortisone (100 mg IV) stress-dosing.
- **Myoclonic Prevention**: Administering a small "defasciculating" or pre-induction dose of midazolam (1–2 mg) or fentanyl (50–100 mcg) 1–2 minutes before etomidate significantly reduces the severity of myoclonus.`,

  ketamine: `=== CLINICAL SUMMARY ===
- 🧬 **Mechanism**: Phencyclidine derivative that acts as a non-competitive antagonist at the NMDA receptor, preventing glutamate binding and calcium influx to dissociate thalamocortical and limbic systems.
- 💊 **Dosing**: Induction: 1.0–2.0 mg/kg IV (4.0–6.0 mg/kg IM). Onset is 30–60 seconds; duration of anesthesia is 10–15 minutes (redistribution-driven).
- 🫁 **Physiology**: Stimulates the cardiovascular system (increases HR, BP, CO) via central sympathetic stimulation and neuronal uptake blockade of catecholamines; preserves airway reflexes and breathing.
- ⚠️ **Adverse**: Increases salivary secretions (risks laryngospasm), causes emergence delirium and hallucinations, and increases intraocular pressure.
- 📖 **Pearls**: Excellent bronchodilator (induction agent of choice for severe asthma) and provides profound somatic analgesia. Often co-administered with a benzodiazepine (e.g. midazolam) to prevent psychomimetic side effects.

=== DETAILED CONSULTATION ===
### 🧬 Mechanism & Receptor Pharmacology
- **NMDA Receptor Antagonism**: Ketamine binds non-competitively to the phencyclidine site inside the channel pore of the N-methyl-D-aspartate (NMDA) receptor, blocking the influx of calcium ions. This inhibits glutamate transmission in the thalamocortical and limbic pathways.
- **Dissociative Anesthesia**: Characterized by electrophysiological dissociation between the limbic and cortical systems, resulting in a state where the patient appears awake (eyes open, slow nystagmus, intact reflexes) but is detached from the environment and insensible to pain.
- **Other Pathways**: Interacts with opioid receptors (mu, kappa, delta), monoaminergic receptors, muscarinic receptors, and voltage-sensitive calcium channels, contributing to its multi-modal analgesic and sedative properties.

### 💊 Clinical Dosing & Pharmacokinetics
- **Induction**: 1.0 to 2.0 mg/kg IV, or 4.0 to 6.0 mg/kg IM.
- **Analgesia (Sub-anesthetic)**: 0.1 to 0.3 mg/kg IV bolus or low-dose infusion (0.1–0.5 mg/kg/hr).
- **Onset & Duration**: Onset occurs within 30–60 seconds after IV administration (2–4 minutes IM). Recovery of consciousness takes 10–15 minutes, driven by rapid redistribution to skeletal muscle and fat.
- **Metabolism**: Extensively metabolized in the liver by CYP450 enzymes (CYP3A4 and CYP2C9) via N-demethylation to Norketamine, an active metabolite with approximately 20–30% of the parent drug's anesthetic potency. Norketamine is subsequently hydroxylated and excreted in urine.

### 🫁 Physiological Effects & Clinical Indications
- **Cardiovascular**: Indirectly stimulates the cardiovascular system, increasing HR, SBP, DBP, and CO. This is mediated by central sympathetic activation and inhibition of catecholamine reuptake at nerve terminals. *Caution*: In catecholamine-depleted patients (e.g., chronic severe shock), ketamine's direct myocardial depressant effect is unmasked, which can cause severe hypotension.
- **Respiratory**: Airway reflexes (laryngeal and pharyngeal) are largely preserved. Minute ventilation is maintained, and apnea is rare unless rapidly pushed or co-administered with opioids. It is a potent bronchodilator, reversing bronchoconstriction.
- **CNS**: Increases cerebral blood flow (CBF), cerebral metabolic rate of oxygen (\(\text{CMRO}_2\)), and intracranial pressure (ICP) under spontaneous breathing conditions. However, under controlled ventilation and co-administration of GABAergic agents, ICP changes are minimal.

### ⚠️ Adverse Effects, Warnings & Contraindications
- **Emergence Delirium**: Occurs in 10–30% of adults. Symptoms include vivid dreams, hallucinations, excitement, confusion, and fear. Incidence is reduced by pre-treatment with midazolam or propofol.
- **Hypersalivation**: Increases salivary and tracheobronchial secretions. Co-administration of an anticholinergic (glycopyrrolate 0.1–0.2 mg IV) is highly recommended.
- **Contraindications**: Relatives include severe uncontrolled hypertension, unstable coronary artery disease, active aneurysm, or elevated intraocular pressure (e.g., open globe injury).

### 📖 Clinical Pearls & General Notes
- **Bronchospasm Rescue**: Ketamine is the induction agent of choice for patients with severe status asthmaticus or reactive airway disease.
- **Somatic Analgesia**: Provides excellent analgesia at sub-anesthetic doses. Useful for painful procedures (e.g., dressing changes, regional block placement) and as an adjunct to reduce opioid consumption.
- **Emergence Hallucinations**: More common in females, patients older than 15 years, and those with a history of psychiatric illness. Avoid placing these patients in loud environments during recovery.`,

  esketamine: `=== CLINICAL SUMMARY ===
- 🧬 **Mechanism**: The S(+) enantiomer of ketamine; acts as a non-competitive NMDA receptor antagonist with 3–4 times greater affinity for the NMDA channel pore than R-ketamine.
- 💊 **Dosing**: Induction: 0.5–1.0 mg/kg IV; sub-anesthetic analgesia: 0.05–0.15 mg/kg IV. Faster clearance and quicker recovery of cognitive functions than racemic ketamine.
- 🫁 **Physiology**: Simulates the sympathetic nervous system (increases HR, BP, CO); maintains airway reflexes and respiratory drive; potent bronchodilator.
- ⚠️ **Adverse**: Tachycardia, hypertension, hypersalivation, and mild psychomimetic emergence phenomena (though reported to be less severe than racemic ketamine).
- 📖 **Pearls**: Offers identical clinical advantages to racemic ketamine (analgesia, bronchodilation, sympathomimetic stability) but at half the dose, enabling faster discharge in outpatient settings.

=== DETAILED CONSULTATION ===
### 🧬 Mechanism & Receptor Pharmacology
- **Stereoselective NMDA Blockade**: Esketamine is the pure S-(+) enantiomer of ketamine. It binds with 3 to 4 times higher affinity to the NMDA receptor channel pore compared to the R-(-) isomer, resulting in a potency that is double that of the racemic mixture.
- **Opioid Receptor Synergy**: Exhibits greater affinity for \(\mu\) and \(\kappa\) opioid receptors than the R-enantiomer, which may contribute to its enhanced analgesic profile.
- **Limbic Dissociation**: Induces the same state of dissociative anesthesia by decoupling sensory inputs from cortical integration.

### 💊 Clinical Dosing & Pharmacokinetics
- **Induction Dose**: 0.5 to 1.0 mg/kg IV (roughly half the racemic dose).
- **Analgesia / Adjunct**: 0.05 to 0.15 mg/kg IV.
- **Kinetics & Recovery**: Possesses a higher clearance rate and shorter elimination half-life than the R-isomer or racemic mixture, leading to faster emergence and speedier recovery of psychomotor function.
- **Metabolism**: Hydroxylated in the liver to active S-norketamine, which is further conjugated and renal-excreted.

### 🫁 Physiological Effects & Clinical Indications
- **Sympathetic Stimulation**: Promotes catecholamine release and prevents reuptake, resulting in predictable increases in heart rate, systemic vascular resistance, and cardiac index.
- **Airway Preservation**: Keeps protective upper airway reflexes active. Preserves the CO2 response curve. Excellent bronchodilator.
- **Neuroprotection**: Like ketamine, decreases NMDA-mediated excitotoxicity; however, it increases cerebral metabolic demand and blood flow, requiring caution in severe intracranial pathology unless hyperventilation and propofol co-administration are used.

### ⚠️ Adverse Effects, Warnings & Contraindications
- **Emergence Phenomena**: Can cause hallucinations, alterations in body image, and delirium during recovery, though patients emerge with greater cognitive clarity than with racemic ketamine.
- **Sympathetic Overdrive**: Avoid in patients with acute myocardial infarction, severe ischemic heart disease, or aortic dissection due to increased myocardial oxygen demand.
- **Secretions**: Promotes significant salivary flow. Pre-medication with glycopyrrolate is advised.

### 📖 Clinical Pearls & General Notes
- **Outpatient TIVA**: Highly suitable for outpatient anesthesia protocols when combined with propofol (ketofol) due to faster psychomotor recovery compared to racemic ketamine.
- **Dosing Reduction**: Because of its high potency, reduce the target induction dose by 50% relative to standard racemic calculations to avoid accidental overdosage.`,

  dexmedetomidine: `=== CLINICAL SUMMARY ===
- 🧬 **Mechanism**: Highly selective alpha-2 adrenergic receptor agonist (alpha-2:alpha-1 selectivity of 1620:1) that acts in the locus coeruleus to inhibit adenylate cyclase and reduce cAMP, leading to sedation.
- 💊 **Dosing**: Loading dose is 0.5–1.0 mcg/kg IV over 10 minutes. Maintenance infusion: 0.2–1.5 mcg/kg/hr. Rapid distribution, elimination half-life of 2 hours.
- 🫁 **Physiology**: Produces "cooperative sedation" and analgesia without respiratory depression. Causes bradycardia and hypotension (transient hypertension with rapid loading).
- ⚠️ **Adverse**: Severe bradycardia, sinus arrest, hypotension, dry mouth, and withdrawal symptoms (rebound hypertension) if abruptly discontinued after prolonged use (>24 hours).
- 📖 **Pearls**: Ideal for awake fiberoptic intubation (AFOI) because it preserves spontaneous ventilation and airway reflexes. Reduces postoperative delirium and opioid requirements.

=== DETAILED CONSULTATION ===
### 🧬 Mechanism & Receptor Pharmacology
- **Locus Coeruleus Sedation**: Dexmedetomidine acts as an agonist at presynaptic and postsynaptic \(\alpha_2\) adrenergic receptors. Agonism at presynaptic \(\alpha_2\) receptors (Gi-coupled) inhibits adenylate cyclase, decreases intracellular cAMP, and inhibits voltage-gated calcium channels, preventing norepinephrine release. This mimics natural sleep pathways by acting on the locus coeruleus.
- **Spinal Cord Analgesia**: Agonism at postsynaptic \(\alpha_2\) receptors in the dorsal horn of the spinal cord (substantia gelatinosa) reduces pain transmission by hyperpolarizing nociceptive neurons.
- **Alpha Selectivity**: Displays a selectivity ratio for \(\alpha_2\) over \(\alpha_1\) receptors of approximately 1620:1, compared to clonidine which is 220:1.

### 💊 Clinical Dosing & Pharmacokinetics
- **Intraoperative Loading**: 0.5 to 1.0 mcg/kg IV infused slowly over 10 to 15 minutes. Rapid bolus administration can trigger severe transient hypertension and bradycardia due to peripheral \(\alpha_{2b}\) vasoconstriction before central sympatholysis occurs.
- **Maintenance Infusion**: 0.2 to 1.5 mcg/kg/hr.
- **Kinetics**: Highly protein bound (94% to albumin). Metabolized in the liver by direct glucuronidation and CYP2D6-mediated hydroxylation. Elimination half-life is approximately 2 hours.

### 🫁 Physiological Effects & Clinical Indications
- **Hemodynamics**: Dual-phasic response: initial transient rise in BP and fall in HR (peripheral \(\alpha_{2b}\) stimulation), followed by sustained decreases in BP and HR (central \(\alpha_{2a}\) sympatholysis). Can cause profound bradycardia.
- **Respiratory**: Remarkable lack of respiratory depression. Minute ventilation, respiratory rate, and arterial blood gas values remain normal even at high sedative doses. Preserves upper airway patency better than propofol.
- **CNS**: Reduces MAC of volatile anesthetics by up to 35–50% and reduces opioid requirements. Decreases CBF and ICP slightly.

### ⚠️ Adverse Effects, Warnings & Contraindications
- **Bradycardia & Sinus Arrest**: Severe bradycardia has been reported, especially in young healthy athletes or when combined with beta-blockers. Treated with glycopyrrolate or atropine.
- **Hypotension**: Common during maintenance infusions; managed by volume expansion or decreasing infusion rate.
- **Contraindications**: Advanced heart block (second- or third-degree block), severe bradycardia, or severe ventricular dysfunction unless pacing is available.

### 📖 Clinical Pearls & General Notes
- **Awake Intubation**: The gold standard sedative for awake fiberoptic intubation. The patient remains cooperative, easily arousable, is breathing spontaneously, and does not have respiratory depression.
- **EEG Patterns**: Sleep induced by dexmedetomidine closely mimics non-REM Stage N3 sleep, explaining the low rate of emergence delirium and cognitive preservation.
- **Sparing Opioids**: Excellent adjunct for multi-modal postop pain control, significantly reducing total opioid requirements.`,

  midazolam: `=== CLINICAL SUMMARY ===
- 🧬 **Mechanism**: Water-soluble benzodiazepine that binds to the benzodiazepine site on the GABA-A receptor, enhancing GABA-mediated chloride current to hyperpolarize membranes.
- 💊 **Dosing**: Pre-medication: 1.0–2.0 mg IV (0.25–0.5 mg/kg oral in pediatrics). Induction: 0.1–0.3 mg/kg IV. Rapid onset (1–2 minutes), elimination half-life of 2 hours.
- 🫁 **Physiology**: Causes mild systemic vasodilation and respiratory depression (potentiated by opioids). Provides potent anterograde amnesia and anxiolysis.
- ⚠️ **Adverse**: Paradoxical excitement (especially in children/elderly), respiratory depression, and prolonged sedation in renal/hepatic impairment. Reversed by flumazenil.
- 📖 **Pearls**: Excellent for pre-operative anxiolysis. Possesses anticonvulsant properties. Avoid in elderly patients due to high risk of postoperative delirium.

=== DETAILED CONSULTATION ===
### 🧬 Mechanism & Receptor Pharmacology
- **GABA-A Allosteric Modulation**: Midazolam binds to the benzodiazepine receptor site located at the junction of the \(\alpha\) and \(\gamma\) subunits of the pentameric GABA-A receptor. It increases the frequency of channel opening in response to GABA, leading to increased chloride influx, hyperpolarization of the neuronal membrane, and general central nervous system depression.
- **Anxiolysis vs Sedation**: Lower doses produce anxiolysis, anticonvulsant activity, and anterograde amnesia, while higher doses induce sedation and hypnosis.
- **Water Solubility**: Its imidazole ring is open in an acidic formulation (pH < 4.0), making the drug highly water-soluble and preventing pain on injection. At physiological pH (7.4), the ring closes, rendering the drug highly lipid-soluble and allowing rapid CNS entry.

### 💊 Clinical Dosing & Pharmacokinetics
- **Pre-operative Sedation**: 1.0 to 2.0 mg IV (adults); titration in 0.5 mg increments is recommended. For pediatric pre-medication: 0.25 to 0.5 mg/kg orally (maximum 15–20 mg) given 20–30 minutes before induction.
- **Induction**: 0.1 to 0.3 mg/kg IV.
- **Metabolism**: Metabolized in the liver by CYP3A4 to 1-hydroxymidazolam, which possesses mild active sedative properties. This metabolite is conjugated to glucuronide and excreted by the kidneys. Accumulates in renal failure.
- **Elimination Half-Life**: 1.5 to 3 hours, but prolonged in elderly patients, obese individuals, and those with hepatic impairment.

### 🫁 Physiological Effects & Clinical Indications
- **Cardiovascular**: Triggers a mild decrease in systemic vascular resistance and blood pressure, with a slight compensatory increase in heart rate. Hemodynamic changes are exaggerated in hypovolemic patients.
- **Respiratory**: Causes dose-dependent respiratory depression. It decreases tidal volume and blunts the ventilatory response to CO2. Synergistic respiratory depression occurs when combined with opioids.
- **Anticonvulsant**: Highly effective in terminating status epilepticus and raising the seizure threshold.

### ⚠️ Adverse Effects, Warnings & Contraindications
- **Paradoxical Reactions**: Talkative, aggressive, or hostile behavior occurs in <1% of patients, treated with flumazenil (0.2 mg IV).
- **Postoperative Delirium**: Significantly increases the incidence of postoperative delirium and cognitive dysfunction in elderly patients. Use with extreme caution or avoid in patients older than 65 years.
- **Reversal**: Flumazenil (0.2 to 1.0 mg IV, in 0.2 mg increments) is a selective benzodiazepine antagonist. Watch for re-sedation as flumazenil's half-life (1 hour) is shorter than midazolam's.

### 📖 Clinical Pearls & General Notes
- **Anterograde Amnesia**: Midazolam does not cause retrograde amnesia (memories before administration remain intact), but provides reliable anterograde amnesia, preventing the formation of new memories during its peak effect.
- **Synergy**: Extremely synergistic with propofol and opioids; reduce doses of co-administered hypnotics and narcotics by 30–50% to prevent severe hypotension or apnea.`,

  thiopental: `=== CLINICAL SUMMARY ===
- 🧬 **Mechanism**: Ultra-short-acting barbiturate that binds to GABA-A receptors, prolonging the opening time of the chloride channel to hyperpolarize neurons.
- 💊 **Dosing**: Induction: 3.0–5.0 mg/kg IV. Ultra-rapid onset (10–20 seconds) and short duration of induction (5–10 minutes) driven by redistribution.
- 🫁 **Physiology**: Causes venodilation and transient hypotension; depresses respiratory drive; decreases CBF, CMRO2, and ICP (potent neuroprotectant).
- ⚠️ **Adverse**: Intra-arterial injection causes severe vasospasm and tissue necrosis, severe laryngeal reflexes preservation (risks laryngospasm), and histamine release.
- 📖 **Pearls**: Excellent drug for electroconvulsive therapy (ECT) and brain protection during neurosurgical ischemia. Contraindicated in acute intermittent porphyria.

=== DETAILED CONSULTATION ===
### 🧬 Mechanism & Receptor Pharmacology
- **GABA-A Modulation**: Thiopental binds to specific barbiturate binding sites on the \(\beta\)-subunits of the GABA-A receptor. It decreases the rate of GABA dissociation, prolonging the duration of chloride channel opening.
- **Direct Activation**: Like propofol, at high concentrations it directly opens chloride channels and can inhibit transmission at excitatory synapses (glutamate/AMPAR blockade).
- **Porphyria Trigger**: Potent inducer of delta-aminolevulinic acid (ALA) synthetase, which can trigger life-threatening crises in patients with porphyria.

### 💊 Clinical Dosing & Pharmacokinetics
- **Induction**: 3.0 to 5.0 mg/kg IV.
- **Onset & Redistribution**: Rapid onset within 10–20 seconds. Duration of action is 5–10 minutes, determined by redistribution from brain to muscle tissue.
- **Accumulation**: Highly lipid-soluble; prolonged infusions saturate skeletal muscle and fat, leading to significant drug accumulation and prolonged recovery ("barbiturate coma").

### 🫁 Physiological Effects & Clinical Indications
- **Cardiovascular**: Peripheral vasodilation (venodilation) leads to decreased venous return (preload) and blood pressure, accompanied by a compensatory reflex tachycardia.
- **Respiratory**: Causes central respiratory depression and transient apnea. It does not suppress airway reflexes as effectively as propofol, making laryngospasm or bronchospasm more likely during light anesthesia.
- **CNS**: Potent cerebral vasoconstrictor. Decreases CBF, \(\text{CMRO}_2\), and ICP, making it the classic agent for "burst suppression" on EEG to protect the brain during focal ischemic events (e.g., carotid endarterectomy).

### ⚠️ Adverse Effects, Warnings & Contraindications
- **Intra-arterial Injection**: Accidental injection into an artery leads to crystal formation, severe chemical endarteritis, intense vasospasm, and tissue necrosis/gangrene. Treated with intra-arterial papaverine, heparin, or sympathetic block.
- **Histamine Release**: Triggers mast cell degranulation, which can cause severe hypotension and bronchospasm.
- **Contraindications**: Absolute contraindications include acute intermittent porphyria or status asthmaticus.

### 📖 Clinical Pearls & General Notes
- **Garlic Taste**: Patients frequently report a garlic-like or metallic taste immediately after thiopental injection.
- **Neurosurgery Protection**: Frequently utilized during high-risk neurosurgical clipping or bypass procedures to reduce metabolic oxygen demand.`,

  fentanyl: `=== CLINICAL SUMMARY ===
- 🧬 **Mechanism**: Synthetic phenylpiperidine opioid that acts as a highly selective agonist at the \(\mu\) (mu) opioid receptor (Gi-coupled), inhibiting adenylate cyclase to decrease cAMP.
- 💊 **Dosing**: Pre-induction/Laryngoscopy blunt: 1.0–2.0 mcg/kg IV. Intraoperative analgesia: 1.0–5.0 mcg/kg IV boluses. Elimination half-life is 3–4 hours.
- 🫁 **Physiology**: Provides profound analgesia with minimal direct hemodynamic changes (preserves cardiac output); causes dose-dependent respiratory depression and bradycardia.
- ⚠️ **Adverse**: Respiratory depression (shifts CO2 response curve down and right), chest wall rigidity ("wooden chest") with high-dose rapid administration, and PONV.
- 📖 **Pearls**: The primary opioid used in the OR due to lack of histamine release and hemodynamic stability. Titrate carefully in patients with severe pulmonary disease.

=== DETAILED CONSULTATION ===
### 🧬 Mechanism & Receptor Pharmacology
- **Mu Agonist**: Fentanyl binds to G-protein coupled \(\mu\)-opioid receptors in the brain, spinal cord, and peripheral tissues. It inhibits adenylate cyclase, reducing cAMP. This decreases calcium influx presynaptically (preventing neurotransmitter release) and increases potassium efflux postsynaptically (hyperpolarizing the membrane), blocking pain transmission.
- **High Lipid Solubility**: Approximately 100 times more potent than morphine due to its high lipid solubility, allowing rapid penetration of the blood-brain barrier.
- **Reversal**: Rapidly reversed by naloxone (40 mcg IV increments).

### 💊 Clinical Dosing & Pharmacokinetics
- **Laryngoscopy Blunting**: 1.0 to 3.0 mcg/kg IV administered 3–5 minutes before laryngoscopy to prevent the sympathetic hypertensive and tachycardic reflex.
- **Intraoperative Analgesia**: 1.0 to 5.0 mcg/kg IV boluses, or titrated as an infusion (0.5–2.0 mcg/kg/hr).
- **Onset & Redistribution**: Peak analgesic effect occurs 3–5 minutes after IV injection. Recovery from a single bolus is driven by redistribution to inactive tissues (half-life of redistribution is 5–15 minutes).
- **Context-Sensitive Half-Life**: Markedly prolonged after infusions due to saturation of peripheral compartments.

### 🫁 Physiological Effects & Clinical Indications
- **Cardiovascular**: Excellent hemodynamic stability. Does not cause histamine release. Can cause vagally mediated bradycardia, which is treatable with anticholinergics.
- **Respiratory**: Dose-dependent respiratory depression. Decreases respiratory rate with a compensatory increase in tidal volume. High doses can lead to central apnea.
- **Chest Wall Rigidity**: High-dose rapid boluses can trigger severe truncal muscle rigidity, making manual ventilation impossible. Reversible with neuromuscular blockers or naloxone.

### ⚠️ Adverse Effects, Warnings & Contraindications
- **Atelectasis & Hypoxia**: Opioid-induced respiratory depression increases the risk of postoperative atelectasis and hypercapnia.
- **Miosis**: Stimulates the Edinger-Westphal nucleus of the oculomotor nerve, causing pupillary constriction.
- **PONV**: Stimulates the chemoreceptor trigger zone (CTZ) in the area postrema, causing nausea and vomiting.

### 📖 Clinical Pearls & General Notes
- **Blunting Reflected Sympathetics**: Indispensable when intubating patients with coronary artery disease, aortic stenosis, or intracranial aneurysms, where a surge in blood pressure or heart rate must be prevented.
- **Synergy with Sedatives**: Synergizes with all intravenous hypnotics and inhalational agents. Co-administration drastically reduces the required dose of propofol or sevoflurane.`,

  remifentanil: `=== CLINICAL SUMMARY ===
- 🧬 **Mechanism**: Ultra-short-acting selective \(\mu\)-opioid receptor agonist containing an ester linkage, making it susceptible to rapid hydrolysis by non-specific plasma and tissue esterases.
- 💊 **Dosing**: Maintenance infusion: 0.05–0.5 mcg/kg/min IV. Virtually no accumulation; context-sensitive half-life remains stable at 3–4 minutes regardless of infusion duration.
- 🫁 **Physiology**: Causes dose-dependent respiratory depression and bradycardia; preserves myocardial contractility but can cause significant hypotension when combined with propofol.
- ⚠️ **Adverse**: Severe respiratory depression, chest wall rigidity, bradycardia, and rapid onset of acute opioid-induced hyperalgesia (OIH) upon discontinuation.
- 📖 **Pearls**: Ideal for TIVA where rapid emergence and immediate neurologic assessment are required (neurosurgery). Requires a proactive postop transition pain plan.

=== DETAILED CONSULTATION ===
### 🧬 Mechanism & Receptor Pharmacology
- **Ester Hydrolysis Kinetics**: Remifentanil is a piperidine-derivative opioid that binds selectively to \(\mu\)-opioid receptors. It is unique due to an ester linkage that undergoes rapid degradation by non-specific esterases in blood and interstitial tissues to inactive metabolites.
- **Intracellular Effects**: Inhibits adenylate cyclase via Gi coupling, preventing pain signal propagation.
- **No Renal/Hepatic Reliance**: Metabolism is completely independent of renal or hepatic function, or pseudocholinesterase levels.

### 💊 Clinical Dosing & Pharmacokinetics
- **Infusion Rate**: Typically run at 0.05 to 0.5 mcg/kg/min IV.
- **Context-Sensitive Half-Life**: Stays constant at approximately 3 to 4 minutes even after a 12-hour infusion, allowing predictable emergence.
- **Onset**: Ultra-rapid onset, achieving blood-brain equilibration within 1–1.5 minutes.

### 🫁 Physiological Effects & Clinical Indications
- **Hemodynamics**: Decreases heart rate and blood pressure dose-dependently. Often used to induce controlled hypotension during ENT or spinal surgeries to reduce blood loss.
- **Ventilation**: Highly potent respiratory depressant; causes rapid apnea if given as a bolus.
- **Indications**: Used in neurosurgery (allows rapid postop neurologic examination), tracheal intubation without paralytics (in high doses), and monitored anesthesia care (MAC).

### ⚠️ Adverse Effects, Warnings & Contraindications
- **Chest Wall Rigidity**: High risk if bolused or run at high rates. Can prevent mask ventilation.
- **Opioid-Induced Hyperalgesia (OIH)**: Rapid washout can trigger severe acute hyperalgesia and sympathetic discharge. A longer-acting analgesic (e.g., fentanyl, morphine, ketorolac) must be administered before turning off remifentanil.
- **Bradyarrhythmias**: Severe sinus bradycardia can occur, treatable with glycopyrrolate.

### 📖 Clinical Pearls & General Notes
- **Transition Pain Management**: Always administer a longer-acting opioid (e.g. fentanyl 50–100 mcg or hydromorphone 0.5–1 mg) 20–30 minutes before turning off the remifentanil infusion, otherwise the patient will emerge in immediate, severe pain.
- **TCI Dosing**: Commonly run using the Minto pharmacokinetic model for Target Controlled Infusions.`,

  rocuronium: `=== CLINICAL SUMMARY ===
- 🧬 **Mechanism**: Monoquaternary aminosteroid non-depolarizing neuromuscular blocking agent that acts as a competitive antagonist at nicotinic acetylcholine receptors at the motor endplate.
- 💊 **Dosing**: Intubation: 0.6 mg/kg IV (RSI: 1.2 mg/kg IV). Onset is 60–90 seconds; duration is intermediate (30–60 minutes).
- 🫁 **Physiology**: Paralysis of all skeletal muscles (including diaphragm and vocal cords); lacks direct cardiovascular effects and does not cause histamine release.
- ⚠️ **Adverse**: Prolonged paralysis in hepatic failure, anaphylaxis (rare but severe), and risk of residual neuromuscular blockade in the PACU.
- 📖 **Pearls**: RSI dosing of 1.2 mg/kg provides intubating conditions matching succinylcholine in 60 seconds. Reversible at any depth of blockade with sugammadex.

=== DETAILED CONSULTATION ===
### 🧬 Mechanism & Receptor Pharmacology
- **Competitive Acetylcholine Antagonism**: Rocuronium binds competitively to the \(\alpha\)-subunits of postsynaptic nicotinic acetylcholine receptors (nAChR) at the neuromuscular junction. It prevents acetylcholine from binding, thereby inhibiting channel opening, preventing muscle membrane depolarization, and blocking muscle contraction.
- **Aminosteroidal Structure**: Free of active metabolites in clinical ranges, and does not cause significant histamine release or ganglionic blockade.
- **Reversal Mechanics**: Reversed competitively by anticholinesterases (neostigmine) or by direct encapsulation and chelation (sugammadex).

### 💊 Clinical Dosing & Pharmacokinetics
- **Standard Intubation**: 0.6 mg/kg IV (onset 90–120 seconds, duration 30–45 minutes).
- **Rapid Sequence Induction (RSI)**: 1.2 mg/kg IV (onset 60–90 seconds, duration 60–90 minutes).
- **Maintenance Boluses**: 0.1 to 0.2 mg/kg IV.
- **Elimination**: Primarily cleared by hepatic uptake and biliary excretion (70%), with some renal excretion (30%). Duration is significantly prolonged in patients with liver cirrhosis or renal failure.

### 🫁 Physiological Effects & Clinical Indications
- **Hemodynamics**: Remarkably cardiovascularly stable. No ganglionic blockade or vagolysis at clinical doses.
- **Neuromuscular Paralysis**: Paralysis follows a predictable sequence: small, fast-moving muscles first (eyes, face), then limbs, trunk, and finally the diaphragm. Recovery occurs in reverse order.
- **Monitoring**: Monitored using a Train-of-Four (TOF) peripheral nerve stimulator (e.g. adductor pollicis muscle).

### ⚠️ Adverse Effects, Warnings & Contraindications
- **Residual Neuromuscular Block**: Associated with a high risk of postoperative pulmonary complications if the TOF ratio is <0.9 at the time of extubation.
- **Anaphylaxis**: Rocuronium is the most common neuromuscular blocker implicated in IgE-mediated anaphylaxis in the OR.
- **Prolongation**: Prolonged block when combined with volatile anesthetics, magnesium sulfate, lithium, or aminoglycoside antibiotics.

### 📖 Clinical Pearls & General Notes
- **Sugammadex Reversal**: Sugammadex encapsulates rocuronium in a 1:1 ratio. A dose of 2.0 mg/kg reverses moderate block (TOF 2/4), 4.0 mg/kg reverses deep block (post-tetanic count 1-2), and 16.0 mg/kg is used for emergency reversal 3 minutes after a 1.2 mg/kg RSI dose.
- **RSI Advantage**: Offers a safe alternative to succinylcholine in patients where succinylcholine is contraindicated (e.g. hyperkalemia, burns, spinal cord injury).`,

  succinylcholine: `=== CLINICAL SUMMARY ===
- 🧬 **Mechanism**: Depolarizing neuromuscular blocker consisting of two joined acetylcholine molecules; acts as a nicotinic receptor agonist, causing prolonged endplate depolarization and phase I block.
- 💊 **Dosing**: Intubation: 1.0–1.5 mg/kg IV. Ultra-rapid onset (30–60 seconds) and short duration of action (5–10 minutes) due to rapid hydrolysis by pseudocholinesterase.
- 🫁 **Physiology**: Causes initial muscle fasciculations followed by flaccid paralysis; can cause bradycardia (especially in children or with repeat dosing) and transient increases in ICP/IOP.
- ⚠️ **Adverse**: Malignant Hyperthermia trigger, life-threatening hyperkalemia in susceptible patients (burns, denervation, muscle disease), myalgia, and prolonged block in pseudocholinesterase deficiency.
- 📖 **Pearls**: The gold standard for rapid sequence induction (RSI) due to unmatched speed of onset and short duration. Ensure no contraindications exist before administering.

=== DETAILED CONSULTATION ===
### 🧬 Mechanism & Receptor Pharmacology
- **Nicotinic Agonism**: Succinylcholine binds to nicotinic acetylcholine receptors at the motor endplate, acting as an agonist. It causes opening of the channel, depolarization of the endplate, and a single muscle contraction (visualized as fasciculations).
- **Phase I Block**: Because succinylcholine is metabolized slowly compared to acetylcholine, it remains at the junction, keeping the endplate depolarized and insensitive to subsequent stimulation (flaccid paralysis).
- **Phase II Block**: With prolonged exposure or high doses, the membrane repolarizes but becomes desensitized to acetylcholine, mimicking a non-depolarizing block.

### 💊 Clinical Dosing & Pharmacokinetics
- **Intubation**: 1.0 to 1.5 mg/kg IV (up to 2.0 mg/kg IV in infants due to larger extracellular fluid volume).
- **Onset & Duration**: Fastest onset of all neuromuscular blockers (30–60 seconds). Duration of action is 5–10 minutes.
- **Metabolism**: Rapidly hydrolyzed by butyrylcholinesterase (pseudocholinesterase) in the plasma. Only a small fraction of the injected dose reaches the neuromuscular junction.

### 🫁 Physiological Effects & Clinical Indications
- **Hemodynamics**: Can cause bradycardia or sinus arrest due to stimulation of cardiac muscarinic receptors (particularly in children, or after a second dose in adults). Can also trigger arrhythmias.
- **Intracranial & Intraocular Pressures**: Causes a transient, mild increase in intracranial pressure (ICP) and intraocular pressure (IOP), though of little clinical significance if the airway is secured promptly.
- **Muscle Fasciculations**: Causes generalized muscle twitching, which can lead to postoperative myalgia (muscle soreness).

### ⚠️ Adverse Effects, Warnings & Contraindications
- **Hyperkalemia**: Increases serum potassium by ~0.5 mEq/L in healthy patients. Can cause lethal hyperkalemia (up to 5–10 mEq/L increase) in patients with up-regulated extrajunctional receptors: burns (>24–48 hours old), spinal cord injury, severe trauma, prolonged immobility, or muscular dystrophies.
- **Malignant Hyperthermia (MH)**: Triggering agent for MH, a life-threatening pharmacogenetic disorder of skeletal muscle calcium regulation.
- **Pseudocholinesterase Deficiency**: Homozygous genetic mutations lead to prolonged paralysis (lasting 2–6 hours) from a single dose. Requires mechanical ventilation until block resolves.

### 📖 Clinical Pearls & General Notes
- **Defasciculating Dose**: Pre-treatment with a small dose of a non-depolarizing blocker (e.g. rocuronium 3 mg IV) 3 minutes before succinylcholine can prevent fasciculations and reduce postoperative myalgia. If used, increase the succinylcholine dose to 1.5–2.0 mg/kg.
- **Malignant Hyperthermia Treatment**: If MH is triggered (tachycardia, hypercarbia, rigidity, rapid fever), immediately stop succinylcholine/volatiles, ventilate with 100% O2, and administer dantrolene (2.5 mg/kg IV increments).`,

  sugammadex: `=== CLINICAL SUMMARY ===
- 🧬 **Mechanism**: Modified gamma-cyclodextrin selective relaxant binding agent that encapsulates and chelates non-depolarizing aminosteroid blockers (rocuronium > vecuronium) in plasma in a 1:1 ratio.
- 💊 **Dosing**: Moderate block (TOF 2/4): 2.0 mg/kg IV. Deep block (PTC 1-2): 4.0 mg/kg IV. Immediate rescue (3 min post-1.2 mg/kg rocuronium): 16.0 mg/kg IV.
- 🫁 **Physiology**: Complete, rapid restoration of neuromuscular transmission; does not trigger autonomic side effects (no bradycardia or bronchospasm).
- ⚠️ **Adverse**: Anaphylaxis (rare but documented), transient prolongation of coags (PT/aPTT), and binds/inactivates hormonal contraceptives (requires alternative contraception for 7 days).
- 📖 **Pearls**: Revolutionary reversal agent that eliminates the need for anticholinesterases (neostigmine) and anticholinergics (glycopyrrolate), avoiding their cardiovascular side effects.

=== DETAILED CONSULTATION ===
### 🧬 Mechanism & Receptor Pharmacology
- **Host-Guest Chelator**: Sugammadex is a water-soluble modified \(\gamma\)-cyclodextrin. The molecule features a hollow cavity surrounded by 8 carboxyl groups. These negatively charged groups bind to the positively charged quaternary nitrogen of rocuronium or vecuronium, encapsulating the blocker in a 1:1 ratio.
- **Concentration Gradient Shift**: Encapsulation decreases the concentration of free blocker in the plasma, creating a steep concentration gradient that pulls the blocker off nicotinic receptors back into the plasma, where it is bound and inactivated.
- **Selectivity**: Highly selective for rocuronium, moderately selective for vecuronium, and minimally effective against pancuronium. Ineffective against benzylisoquinolines (cisatracurium, atracurium) or depolarizers (succinylcholine).

### 💊 Clinical Dosing & Pharmacokinetics
- **Moderate Block (TOF >= 2/4)**: 2.0 mg/kg IV.
- **Deep Block (Post-Tetanic Count 1–2, TOF 0/4)**: 4.0 mg/kg IV.
- **Rescue Reversal (3 min post-1.2 mg/kg Rocuronium)**: 16.0 mg/kg IV.
- **Excretion**: The sugammadex-rocuronium complex is highly stable and excreted unchanged in the urine. Clearance is reduced in severe renal impairment (GFR < 30 mL/min), where its use is currently not recommended.

### 🫁 Physiological Effects & Clinical Indications
- **Hemodynamics**: Extremely stable. Unlike neostigmine, it does not inhibit acetylcholinesterase, avoiding muscarinic surges (bradycardia, salivation, bronchospasm). Thus, co-administration of an anticholinergic like glycopyrrolate is unnecessary.
- **Speed of Action**: Reverses moderate rocuronium block within 2 minutes and deep block within 3 minutes, significantly faster than neostigmine (which can take 10–30 minutes).

### ⚠️ Adverse Effects, Warnings & Contraindications
- **Contraceptive Interaction**: Encapsulates progesterone-based oral contraceptives, reducing their effectiveness. Inform patients that a single dose of sugammadex is equivalent to missing one pill; they must use non-hormonal backup contraception for the next 7 days.
- **Coagulation Changes**: Can cause transient, mild prolongation of PT and aPTT (resolves within 1 hour).
- **Anaphylaxis**: Documented risk of hypersensitivity reactions (approximately 1 in 3,500 exposures), usually presenting within 5 minutes of injection.

### 📖 Clinical Pearls & General Notes
- **Recurarization**: Extremely rare if dosed correctly. Can occur if underdosed (e.g. giving 2.0 mg/kg for deep block), as redistribution of rocuronium back to the junction can overwhelm the unbound sugammadex.
- **Re-paralyzing After Sugammadex**: If a patient requires re-intubation with paralysis after receiving sugammadex, use a benzylisoquinoline (e.g., cisatracurium) or succinylcholine. Alternatively, rocuronium can be re-administered at a higher dose (e.g. 1.2 mg/kg) if enough time has passed.`,

  glycopyrrolate: `=== CLINICAL SUMMARY ===
- 🧬 **Mechanism**: Synthetic quaternary ammonium anticholinergic that competitively antagonizes muscarinic acetylcholine receptors, preventing vagal stimulation.
- 💊 **Dosing**: Reversal adjunct: 0.2 mg IV per 1.0 mg neostigmine administered. Antisialagogue: 0.1–0.2 mg IV. Onset: 1 minute.
- 🫁 **Physiology**: Increases heart rate (tachycardia), dries secretions (antisialagogue), and causes bronchodilation. Does not cross the blood-brain barrier.
- ⚠️ **Adverse**: Tachycardia, dry mouth, urinary retention, blurred vision, and pupillary dilation (mydriasis).
- 📖 **Pearls**: Co-administered with neostigmine to prevent the profound bradycardia induced by acetylcholinesterase inhibition. Because it does not cross the BBB, it does not cause central anticholinergic syndrome.

=== DETAILED CONSULTATION ===
### 🧬 Mechanism & Receptor Pharmacology
- **Muscarinic Antagonism**: Glycopyrrolate is a competitive antagonist at muscarinic acetylcholine receptors (primarily M2 on the heart and M3 on smooth muscle/secretory glands).
- **Quaternary Structure**: Contains a quaternary ammonium group, making it highly polar and lipid-insoluble. As a result, it does not cross the blood-brain barrier or the placenta.
- **Comparison to Atropine**: Atropine is a tertiary amine and readily enters the CNS, causing sedation, confusion, or central anticholinergic syndrome. Glycopyrrolate is twice as potent as atropine as an antisialagogue.

### 💊 Clinical Dosing & Pharmacokinetics
- **Neuromuscular Reversal**: 0.2 mg IV for every 1.0 mg of neostigmine (typically drawn up together in a 1:5 ratio, e.g. neostigmine 2.5 mg + glycopyrrolate 0.5 mg).
- **Antisialagogue**: 0.1 to 0.2 mg IV or IM.
- **Kinetics**: Onset occurs within 1 minute after IV administration, matching the onset of neostigmine (which minimizes HR fluctuations). Duration is 2–4 hours.

### 🫁 Physiological Effects & Clinical Indications
- **Cardiovascular**: Increases heart rate and cardiac output by blocking vagal inhibitory signals at the sinoatrial node. Tachycardia is less pronounced and more gradual than with atropine.
- **Secretions**: Strongly suppresses salivary, bronchial, and pharyngeal secretions.
- **Gastrointestinal**: Reduces gastric volume and acidity, and decreases intestinal motility.

### ⚠️ Adverse Effects, Warnings & Contraindications
- **Tachycardia / Arrhythmias**: Can precipitate myocardial ischemia or tachydysrhythmias in vulnerable patients.
- **Urinary Retention**: Causes relaxation of the detrusor muscle and contraction of the bladder sphincter.
- **Contraindications**: Absolute contraindications include narrow-angle glaucoma. Use with caution in patients with severe coronary artery disease, tachyarrhythmias, or prostatic hypertrophy.

### 📖 Clinical Pearls & General Notes
- **Ideal Reversal Pairing**: The onset of glycopyrrolate (1–2 minutes) matches the onset of neostigmine (1–3 minutes), making it the preferred pairing to maintain heart rate stability.
- **No Placental Transfer**: Due to its polar structure, it is the anticholinergic of choice in obstetric anesthesia when muscarinic blockade is needed without affecting fetal heart rate.`,

  epinephrine: `=== CLINICAL SUMMARY ===
- 🧬 **Mechanism**: Endogenous catecholamine that acts as a potent agonist at \(\alpha_1\), \(\alpha_2\), \(\beta_1\), and \(\beta_2\) adrenergic receptors, triggering G-protein mediated cascades.
- 💊 **Dosing**: ACLS: 1.0 mg IV every 3–5 minutes. Anaphylaxis: 10–50 mcg IV bolus for severe hypotension, or 0.3 mg IM. Infusion: 0.01–0.1 mcg/kg/min IV.
- 🫁 **Physiology**: Increases MAP, SVR, heart rate, cardiac output, and contractility; causes potent bronchodilation and vasoconstriction.
- ⚠️ **Adverse**: Severe tachycardia, myocardial ischemia, tachyarrhythmias (VF/VT), lactic acidosis, and renal/splanchnic vasoconstriction.
- 📖 **Pearls**: The primary rescue vasopressor for cardiac arrest and anaphylactic shock. Potent \(\beta_2\) agonist action makes it an excellent rescue bronchodilator.

=== DETAILED CONSULTATION ===
### 🧬 Mechanism & Receptor Pharmacology
- **Mixed Adrenergic Agonism**: Epinephrine is a potent stimulant of \(\alpha_1\) (causes vasoconstriction), \(\beta_1\) (increases heart rate, contractility, and conduction), and \(\beta_2\) (causes bronchodilation and skeletal muscle vasodilation) receptors.
- **Intracellular Cascades**:
  - \(\alpha_1\) (Gq-coupled) -> activates phospholipase C -> increases IP3 and DAG -> releases calcium.
  - \(\beta\) (Gs-coupled) -> activates adenylate cyclase -> increases cAMP.
- **Dose-Dependent Action**:
  - **Low dose** (0.01–0.05 mcg/kg/min): Dominant \(\beta\) effects (increased CO, decreased SVR due to \(\beta_2\) vasodilation).
  - **High dose** (>0.1 mcg/kg/min): Dominant \(\alpha_1\) effects (severe vasoconstriction, increased SVR, increased MAP).

### 💊 Clinical Dosing & Pharmacokinetics
- **Cardiac Arrest (ACLS)**: 1.0 mg IV (10 mL of 1:10,000 solution) every 3–5 minutes.
- **Anaphylaxis / Severe Shock**: 10 to 50 mcg IV boluses titrated to effect. For out-of-hospital rescue: 0.3 mg IM (1:1,000 solution) in the lateral thigh.
- **Continuous Infusion**: 0.01 to 0.2 mcg/kg/min IV.
- **Kinetics**: Rapidly metabolized by Catechol-O-methyltransferase (COMT) and Monoamine Oxidase (MAO) in tissue and liver. Half-life is 1–2 minutes.

### 🫁 Physiological Effects & Clinical Indications
- **Cardiovascular**: Increases stroke volume, contractility, heart rate, and SVR, leading to a dramatic increase in myocardial oxygen demand.
- **Respiratory**: Potent bronchodilator via \(\beta_2\)-mediated relaxation of bronchial smooth muscle. Decreases mucosal congestion and edema.
- **Metabolic**: Stimulates glycogenolysis and lipolysis, causing hyperglycemia and transient hyperlactatemia (lactic acidosis).

### ⚠️ Adverse Effects, Warnings & Contraindications
- **Myocardial Ischemia**: Can precipitate angina, myocardial infarction, or ventricular fibrillation due to severe oxygen supply/demand mismatch.
- **Extravasation Injury**: Can cause severe localized vasoconstriction and tissue necrosis if infused through a peripheral IV. Treated with phentolamine (5–10 mg diluted in saline).
- **Tachyarrhythmias**: High risk of triggering ventricular ectopy, VT, or VF.

### 📖 Clinical Pearls & General Notes
- **Lactic Acidosis Confusion**: Epinephrine infusions frequently trigger a benign, type B lactic acidosis due to \(\beta_2\)-stimulated hypermetabolism. Do not confuse this with worsening tissue hypoperfusion if hemodynamics are stable.
- **Epinephrine in Local Anesthetics**: Often added to local anesthetics (e.g. 1:200,000 or 5 mcg/mL) to cause localized vasoconstriction, which decreases systemic absorption, extends block duration, and provides an indicator of accidental intravascular injection.`,

  norepinephrine: `=== CLINICAL SUMMARY ===
- 🧬 **Mechanism**: Endogenous catecholamine that acts as a potent agonist at \(\alpha_1\) (primary) and \(\beta_1\) (moderate) adrenergic receptors, with minimal \(\beta_2\) activity.
- 💊 **Dosing**: Continuous infusion: 0.02–0.3 mcg/kg/min IV. Titrated to maintain MAP > 65 mmHg. Ultra-short half-life (1–2 minutes).
- 🫁 **Physiology**: Increases SVR, SBP, DBP, and MAP; contractility is preserved or increased, while heart rate may stay stable or decrease due to reflex bradycardia.
- ⚠️ **Adverse**: Splanchnic, renal, and peripheral ischemia, myocardial ischemia, and arrhythmias. Extravasation causes tissue necrosis.
- 📖 **Pearls**: First-line vasopressor for septic, cardiogenic, and distributive shock. Less likely to trigger severe tachycardia than epinephrine or dopamine.

=== DETAILED CONSULTATION ===
### 🧬 Mechanism & Receptor Pharmacology
- **Alpha-1 Vasoconstriction**: Norepinephrine binds to postsynaptic \(\alpha_1\) receptors on vascular smooth muscle, causing profound vasoconstriction in arterial and venous beds.
- **Beta-1 Inotropy**: Agonism at cardiac \(\beta_1\) receptors increases contractility and heart rate. However, the elevation in MAP frequently triggers a carotid sinus baroreceptor reflex that offsets the direct chronotropic effect, resulting in a stable or slightly decreased heart rate.
- **Receptor Selectivity**: \(\alpha_1 > \beta_1 \gg \beta_2\).

### 💊 Clinical Dosing & Pharmacokinetics
- **Infusion Rate**: Standard dosing is 0.02 to 0.3 mcg/kg/min IV (can go higher in refractory shock).
- **Central Line Administration**: Must be administered through a central venous catheter to avoid peripheral extravasation risk.
- **Kinetics**: Rapidly cleared from plasma by cellular reuptake and metabolism (COMT and MAO).

### 🫁 Physiological Effects & Clinical Indications
- **Hemodynamics**: Increases venous return (venoconstriction increases preload) and SVR, leading to significant increases in MAP. Myocardial oxygen consumption increases.
- **Organ Perfusion**: While it causes renal vasoconstriction, the increase in perfusion pressure (MAP) in distributive shock frequently increases renal blood flow and urine output.
- **Shock Management**: The gold standard vasopressor in hyperdynamic, vasodilated septic shock.

### ⚠️ Adverse Effects, Warnings & Contraindications
- **Extravasation Necrosis**: Can cause severe ischemia and sloughing of skin. If extravasation occurs, immediately infiltrate the area with phentolamine (5–10 mg).
- **Excessive Vasoconstriction**: Can lead to digital ischemia ("dead toes"), limb ischemia, and mesenteric ischemia if SVR is driven excessively high.
- **Pulmonary Hypertension**: Increases pulmonary vascular resistance slightly.

### 📖 Clinical Pearls & General Notes
- **First-Line Shock Choice**: Proven superior to dopamine in septic shock, showing a lower incidence of arrhythmias and a survival benefit.
- **Venoconstriction Preload**: Its venoconstrictive effect recruits blood from the splanchnic venous reservoir into the central circulation, acting as an autotransfusion of ~500 mL.`,

  phenylephrine: `=== CLINICAL SUMMARY ===
- 🧬 **Mechanism**: Synthetic selective direct-acting \(\alpha_1\) adrenergic receptor agonist (Gq-coupled), causing arterial and venous vasoconstriction.
- 💊 **Dosing**: Bolus: 50–200 mcg IV (often prepared as 100 mcg/mL). Continuous infusion: 0.1–1.5 mcg/kg/min IV. Onset: immediate. Duration: 15–20 minutes.
- 🫁 **Physiology**: Increases SVR and MAP; causes a predictable reflex bradycardia and decreases cardiac output.
- ⚠️ **Adverse**: Bradycardia, severe hypertension, splanchnic/renal vasoconstriction, and decreases coronary perfusion if MAP is driven excessively high without adequate inotropy.
- 📖 **Pearls**: First-line choice for treating hypotension under general or spinal anesthesia. Ideal when tachycardia must be avoided (e.g. aortic stenosis, CAD).

=== DETAILED CONSULTATION ===
### 🧬 Mechanism & Receptor Pharmacology
- **Pure Alpha-1 Agonism**: Phenylephrine acts directly on \(\alpha_1\) receptors, with negligible \(\beta\) activity. It stimulates Gq-coupled proteins, activating phospholipase C, increasing intracellular calcium, and causing contraction of vascular smooth muscle.
- **Venopressor Preload**: Strongly constricts veins, which decreases venous capacitance and increases venous return (preload) to the heart.
- **No Direct Inotropy**: Lacks direct inotropic or chronotropic activity.

### 💊 Clinical Dosing & Pharmacokinetics
- **IV Bolus**: 50 to 200 mcg IV (standard syringe is 100 mcg/mL; typically bolused in 100 mcg increments).
- **IV Infusion**: 0.1 to 1.5 mcg/kg/min (or a flat rate of 20–100 mcg/min).
- **Onset & Duration**: Immediate onset after IV bolus. Duration of action is 15–20 minutes, cleared by monoamine oxidase (MAO) metabolism.

### 🫁 Physiological Effects & Clinical Indications
- **Hemodynamics**: Increases SVR, SBP, DBP, and MAP. The rise in arterial pressure stimulates baroreceptors, triggering a reflex increase in vagal tone that causes reflex bradycardia. Cardiac output frequently falls.
- **Obstetric Anesthesia**: The vasopressor of choice for preventing or treating hypotension from spinal anesthesia during cesarean delivery, associated with less fetal acidosis than ephedrine.
- **Hypercyanotic Spells**: Used to treat Tetralogy of Fallot "tet spells" by increasing SVR, which reverses the right-to-left shunt.

### ⚠️ Adverse Effects, Warnings & Contraindications
- **Reflex Bradycardia**: Heart rate can drop precipitously. Avoid in patients with pre-existing severe bradycardia or heart block.
- **Excessive Afterload**: Can cause myocardial ischemia or ventricular failure in patients with a failing left ventricle due to the sudden increase in SVR (afterload).
- **Extravasation**: Peripheral infusion can cause local tissue necrosis.

### 📖 Clinical Pearls & General Notes
- **Avoid in Depressed LVEF**: Contraindicated as a primary pressor in cardiogenic shock, where an increase in afterload will worsen cardiac output.
- **Aortic Stenosis**: In patients with severe aortic stenosis, maintaining diastolic pressure (to preserve coronary perfusion) and keeping the heart rate slow (to allow adequate diastolic filling time) is critical. Phenylephrine is the pressor of choice for these patients.`,

  esmolol: `=== CLINICAL SUMMARY ===
- 🧬 **Mechanism**: Ultra-short-acting, highly cardioselective \(\beta_1\) adrenergic receptor antagonist (beta-blocker) that lacks intrinsic sympathomimetic activity.
- 💊 **Dosing**: Bolus: 10–50 mg IV (or 0.5 mg/kg IV). Continuous infusion: 50–300 mcg/kg/min IV. Onset: 1–2 minutes. Duration: 10–15 minutes.
- 🫁 **Physiology**: Decreases heart rate (bradycardia), myocardial contractility (negative inotropy), and cardiac output; decreases blood pressure.
- ⚠️ **Adverse**: Hypotension, bradycardia, heart block, and bronchospasm (mild risk in asthmatics due to weak \(\beta_2\) blockade at high doses).
- 📖 **Pearls**: Ideal for blunting transient sympathetic surges associated with intubation, surgical incision, or emergence. Rapidly cleared by red blood cell esterases.

=== DETAILED CONSULTATION ===
### 🧬 Mechanism & Receptor Pharmacology
- **Cardioselective Beta-1 Blockade**: Esmolol competitively blocks \(\beta_1\) receptors on cardiac muscle, inhibiting adenylate cyclase activity and decreasing intracellular cAMP. This decreases calcium influx, leading to negative chronotropic (HR), inotropic (contractility), and dromotropic (conduction velocity) effects.
- **Selectivity Ratio**: Displays a 30-fold selectivity for \(\beta_1\) over \(\beta_2\) receptors, limiting bronchoconscriptive effects.
- **Ester Structure**: The molecule contains an ester methyl group that is rapidly cleaved by esterases in the cytoplasm of red blood cells, completely independent of liver or kidney function.

### 💊 Clinical Dosing & Pharmacokinetics
- **IV Bolus**: 10 to 50 mg IV (e.g., 20–30 mg titrated to blunting HR).
- **IV Infusion**: 50 to 300 mcg/kg/min.
- **Rapid Offset**: Distribution half-life is 2 minutes, and elimination half-life is 9 minutes. The drug effect is completely terminated 15–20 minutes after stopping the infusion.

### 🫁 Physiological Effects & Clinical Indications
- **Sympathetic Blunting**: The first-line drug for blunting the hypertensive and tachycardic reflex to laryngoscopy or head pin placement in neurosurgery.
- **Aortic Dissection**: Used in combination with a vasodilator (e.g. nitroprusside or clevidipine) to control heart rate and shear stress (\(dP/dt\)) in acute aortic dissection. Esmolol must be started *before* the vasodilator to prevent reflex tachycardia.
- **Arrhythmias**: Used to control ventricular rate in atrial fibrillation, atrial flutter, or supraventricular tachycardia.

### ⚠️ Adverse Effects, Warnings & Contraindications
- **Hypotension**: The most common side effect; rapidly reverses upon discontinuing the drug.
- **Bradycardia / Heart Block**: Can cause severe bradycardia or precipitate heart block. Contraindicated in sinus bradycardia, cardiogenic shock, or second- or third-degree heart block.
- **Reactive Airway Disease**: Use with caution in patients with severe asthma or COPD, as high doses can block \(\beta_2\) receptors, triggering bronchospasm.

### 📖 Clinical Pearls & General Notes
- **Pheochromocytoma Warning**: Never administer esmolol (or any beta-blocker) to a patient with an untreated pheochromocytoma before adequate \(\alpha\)-blockade has been established. Doing so will block \(\beta_2\)-mediated vasodilation, leaving \(\alpha_1\)-mediated vasoconstriction unopposed and triggering a catastrophic hypertensive crisis.
- **Red Blood Cell Esterase**: Metabolism is distinct from plasma pseudocholinesterase; esmolol is safe to use in patients with pseudocholinesterase deficiency.`,

  lidocaine: `=== CLINICAL SUMMARY ===
- 🧬 **Mechanism**: Amide local anesthetic and Class Ib antiarrhythmic that binds to the intracellular vestibule of voltage-gated sodium (Na+) channels, blocking sodium influx.
- 💊 **Dosing**: IV blunting: 1.0–1.5 mg/kg IV (given 2 minutes before intubation). Local infiltration: max 4.5 mg/kg (7.0 mg/kg with epinephrine). Infusion: 1.0–2.0 mg/min.
- 🫁 **Physiology**: Suppresses airway reflexes and cough; decreases MAC of volatile gases; possesses anti-inflammatory and mild analgesic properties.
- ⚠️ **Adverse**: Local Anesthetic Systemic Toxicity (LAST) (tinnitus, metallic taste, seizures, cardiac collapse), myocardial depression, and bradycardia.
- 📖 **Pearls**: Used intravenously during induction to blunt the cough reflex and bronchospasm during intubation. The drug of choice for treating ventricular arrhythmias in the OR.

=== DETAILED CONSULTATION ===
### 🧬 Mechanism & Receptor Pharmacology
- **Sodium Channel Blockade**: Lidocaine binds to the receptor site inside the pore of open or inactivated voltage-gated sodium channels (NaV1.5 in heart, NaV1.7/1.8 in nerves). It prevents sodium influx, blocking depolarization and preventing the propagation of action potentials.
- **Amide Class**: Metabolized in the liver by CYP450 (CYP1A2 and CYP3A4) to active metabolites (glycinexylidide and monoethylglycinexylidide). Clearance is dependent on hepatic blood flow.
- **Class Ib Antiarrhythmic**: Exerts electrophysiological effects on Purkinje fibers and ventricular myocytes, shortening the action potential duration and refractory period, suppressing ventricular automaticity.

### 💊 Clinical Dosing & Pharmacokinetics
- **IV Intubation Adjunct**: 1.0 to 1.5 mg/kg IV administered 2–3 minutes before laryngoscopy to prevent coughing and bronchial reactivity.
- **Local Infiltration Limits**:
  - Plain lidocaine: 4.5 mg/kg (maximum 300 mg).
  - Lidocaine with epinephrine: 7.0 mg/kg (maximum 500 mg).
- **IV Infusion (Perioperative Analgesia)**: 1.0 to 2.0 mg/min (or 1.0–2.0 mg/kg/hr).

### 🫁 Physiological Effects & Clinical Indications
- **Airway Blunting**: Extremely effective at preventing bronchospasm in patients with reactive airway disease (asthma/COPD) when given intravenously before airway instrumentation.
- **Cerebral Effects**: Decreases cerebral blood flow and ICP. Possesses anticonvulsant properties at low doses, but triggers seizures at toxic levels.
- **Analgesic Adjunct**: Intravenous lidocaine infusions reduce postoperative pain, decrease bowel ileus, and shorten hospital stay in abdominal surgeries.

### ⚠️ Adverse Effects, Warnings & Contraindications
- **Local Anesthetic Systemic Toxicity (LAST)**:
  - **CNS symptoms** (occurs first): Metallic taste, tinnitus, perioral numbness, visual disturbances, muscle twitching, progressing to generalized tonic-clonic seizures.
  - **CV symptoms** (occurs at higher doses): Hypotension, conduction blocks, bradycardia, ventricular arrhythmias, and cardiac arrest.
  - **Treatment**: Stop local anesthetic, secure airway (100% O2, avoid acidosis which increases toxicity), control seizures (benzodiazepines/propofol), and immediately initiate Intralipid 20% rescue therapy (1.5 mL/kg IV bolus, followed by 0.25 mL/kg/min infusion).
- **Methemoglobinemia**: Prilocaine or benzocaine are more common triggers, but lidocaine metabolites can cause it at very high doses.

### 📖 Clinical Pearls & General Notes
- **Epinephrine Marker**: Epinephrine constricts vessels, reducing the rate of systemic absorption of lidocaine by 30–50%, extending the duration of local blocks, and acting as a marker for accidental intravascular injection (heart rate spikes >20 bpm).
- **Acidosis Toxicity**: Acidosis increases the free fraction of lidocaine by decreasing protein binding, and increases its intracellular penetration, worsening toxicity. Hypercapnia also lowers the seizure threshold.`,

  sevoflurane: `=== CLINICAL SUMMARY ===
- 🧬 **Mechanism**: Halogenated ether volatile anesthetic that acts on multiple ligand-gated channels, enhancing inhibitory GABA-A and glycine currents, and inhibiting excitatory NMDA and nicotinic channels.
- 💊 **Dosing**: Maintenance: titrated to MAC 0.8–1.2 (1.0 MAC in a 40-year-old is 2.05%). Blood/gas partition coefficient is 0.65, allowing rapid wash-in/wash-out.
- 🫁 **Physiology**: Causes dose-dependent systemic vasodilation and hypotension; depresses ventilation; causes potent bronchodilation and blunts airway reflexes.
- ⚠️ **Adverse**: Malignant Hyperthermia trigger, emergence delirium in children, nephrotoxic Compound A formation in dry CO2 absorbents, and fluoride ion accumulation.
- 📖 **Pearls**: The agent of choice for inhalational induction due to its pleasant, sweet smell and non-pungency. Ensure fresh gas flows are >2 L/min to prevent Compound A accumulation.

=== DETAILED CONSULTATION ===
### 🧬 Mechanism & Receptor Pharmacology
- **Multi-receptor Action**: Sevoflurane acts via physical interactions with lipid bilayer membranes and membrane proteins. It enhances inhibitory currents at GABA-A and glycine receptors, and inhibits excitatory pathways at NMDA, nicotinic acetylcholine, and AMPA receptors. It also activates two-pore-domain potassium channels (TREK-1), hyperpolarizing neurons.
- **MAC (Minimum Alveolar Concentration)**: The alveolar concentration at 1 atm that prevents movement in 50% of patients in response to a noxious stimulus. 1.0 MAC of sevoflurane is 2.05% in adults, but decreases with age (Mapleson equation) and increases in infants (up to 3.2% at 1–6 months).

### 💊 Clinical Dosing & Pharmacokinetics
- **Low Blood Solubility**: Blood/gas partition coefficient is 0.65. This allows rapid changes in alveolar concentration (\(F_A/F_I\) curve rises quickly), resulting in fast induction and rapid recovery.
- **Inhalational Induction**: 4% to 8% inspired concentration in 100% O2 or a mixture of O2/N2O.
- **Maintenance**: Typically run at 1.5% to 2.5% inspired concentration, titrated to clinical state and BIS (goal 40–60).

### 🫁 Physiological Effects & Clinical Indications
- **Cardiovascular**: Decreases SVR dose-dependently, causing hypotension. Heart rate is preserved. Does not sensitize the myocardium to catecholamines.
- **Respiratory**: Rapidly depresses ventilation, decreasing tidal volume and increasing respiratory rate. Suppresses the ventilatory response to CO2. Strong bronchodilator; relaxes airway smooth muscle.
- **CNS**: Vasodilator; increases CBF and ICP at concentrations > 0.6 MAC, which can be blunted by hyperventilation. Decreases cerebral metabolic rate.

### ⚠️ Adverse Effects, Warnings & Contraindications
- **Malignant Hyperthermia**: Potent trigger of MH. Contraindicated in patients with a history of MH or central core disease.
- **Compound A**: Sevoflurane reacts with alkaline CO2 absorbents (soda lime, Baralyme) to form Compound A, a vinyl ether that is nephrotoxic in rats. To prevent this, FDA guidelines recommend maintaining fresh gas flows of at least 1–2 L/min.
- **Dry Absorbent Hazard**: Desiccated absorbent reacts with sevoflurane to produce carbon monoxide and extreme heat, which can melt circuit plastics or cause an airway fire.

### 📖 Clinical Pearls & General Notes
- **Pediatric Emergence Delirium**: Common in children (up to 30–40% incidence), presenting as crying, thrashing, and agitation. Mitigated by pre-op midazolam, intraoperative dexmedetomidine, or propofol.
- **Fluoride Accumulation**: Metabolism by CYP2E6 releases inorganic fluoride ions. While levels can exceed 50 micromoles/L, clinical renal dysfunction has not been demonstrated.`,

  isoflurane: `=== CLINICAL SUMMARY ===
- 🧬 **Mechanism**: Halogenated methyl ethyl ether volatile anesthetic that modulates GABA-A, glycine, NMDA, and potassium channels to produce immobility and hypnosis.
- 💊 **Dosing**: Maintenance: titrated to MAC 0.8–1.2 (1.0 MAC in a 40-year-old is 1.15%). Blood/gas partition coefficient is 1.4.
- 🫁 **Physiology**: Potent vasodilator that decreases SVR and MAP; increases heart rate slightly; depresses ventilation; provides myocardial protection (ischemic preconditioning).
- ⚠️ **Adverse**: Malignant Hyperthermia trigger, pungent airway irritation (not suitable for inhalational induction), and coronary steal syndrome (theoretical).
- 📖 **Pearls**: Highly stable and economical agent for long cases. The preferred volatile for neurosurgery when mild hypocapnia is used to prevent ICP surges.

=== DETAILED CONSULTATION ===
### 🧬 Mechanism & Receptor Pharmacology
- **GABA-A and Glycine Agonism**: Isoflurane enhances inhibitory GABA-A and glycine receptor currents, hyperpolarizing membranes.
- **Excitatory Inhibition**: Inhibits NMDA glutamate and nicotinic acetylcholine receptors.
- **MAC Value**: 1.0 MAC is 1.15% in a 40-year-old adult.

### 💊 Clinical Dosing & Pharmacokinetics
- **Intermediate Solubility**: Blood/gas partition coefficient is 1.4. Induction and recovery are slower than with sevoflurane or desflurane.
- **Pungency**: Extremely pungent, sweet odor that irritates the upper airway, triggering coughing, breath-holding, or laryngospasm at concentrations > 1.5%. *Contraindicated for inhalational induction*.
- **Metabolism**: Highly resistant to biodegradation; only 0.2% is metabolized by the liver, minimizing any risk of hepatotoxicity.

### 🫁 Physiological Effects & Clinical Indications
- **Cardiovascular**: Produces significant arterial vasodilation, decreasing SVR and blood pressure. Heart rate increases slightly due to baroreceptor reflexes.
- **Coronary Steal**: Can dilate small coronary arteries, theoretically diverting blood away from stenotic areas to non-ischemic areas; however, this is rarely clinically significant.
- **Respiratory**: Causes dose-dependent respiratory depression and is a bronchodilator.

### ⚠️ Adverse Effects, Warnings & Contraindications
- **Malignant Hyperthermia**: Triggering agent.
- **Airway Reactivity**: Can trigger severe bronchospasm or coughing in awake/light asthmatics.
- **Desiccated Absorbent**: Reacts with dry soda lime to produce carbon monoxide, though less than desflurane.

### 📖 Clinical Pearls & General Notes
- **Ischemic Preconditioning**: Activates ATP-sensitive potassium channels, mimicking the cellular changes of ischemia and protecting the myocardium from subsequent prolonged ischemic injury.
- **EEG Suppression**: Can produce a flat EEG (isoelectricity) at 2.0 MAC, reducing cerebral metabolic oxygen demand to its minimum.`,

  desflurane: `=== CLINICAL SUMMARY ===
- 🧬 **Mechanism**: Fluorinated methyl ethyl ether volatile anesthetic that acts on GABA-A, glycine, and two-pore domain potassium channels.
- 💊 **Dosing**: Maintenance: titrated to MAC 0.8–1.2 (1.0 MAC in a 40-year-old is 6.0%). Blood/gas partition coefficient is 0.42, allowing ultra-fast wash-in and wash-out.
- 🫁 **Physiology**: Causes vasodilation and hypotension; rapid dial increases trigger a transient sympathetic surge (tachycardia and hypertension); pungent airway irritant.
- ⚠️ **Adverse**: Lower respiratory irritation (apnea, laryngospasm), carbon monoxide formation in desiccated absorbents, and requires a heated vaporizer.
- 📖 **Pearls**: Rapid emergence makes it ideal for morbidly obese patients, reducing recovery time. Do not increase concentrations rapidly to avoid sympathetic surges.

=== DETAILED CONSULTATION ===
### 🧬 Mechanism & Receptor Pharmacology
- **Target Receptor Agonism**: Agonizes GABA-A and glycine receptors, and inhibits NMDA receptors.
- **MAC Value**: 1.0 MAC is 6.0% in a 40-year-old adult.

### 💊 Clinical Dosing & Pharmacokinetics
- **Ultra-low Solubility**: Blood/gas partition coefficient of 0.42. Wash-out is extremely fast, resulting in the quickest emergence of all halogenated volatiles.
- **Vaporizer Requirements**: High vapor pressure (669 mmHg) and low boiling point (22.8°C) mean it boils at room temperature at high altitudes. Requires a specialized heated, pressurized vaporizer (Tec 6) to deliver consistent concentrations.
- **Airway Irritation**: Highly pungent. Causes severe coughing, breath-holding, and laryngospasm if used for induction.

### 🫁 Physiological Effects & Clinical Indications
- **Sympathetic Activation**: Rapid increases in desflurane concentration (e.g., dialing from 3% to 9% quickly) irritate airway receptors, triggering a transient, reflex sympathetic surge characterized by severe tachycardia (HR > 120 bpm) and hypertension.
- **Cardiovascular**: Decreases SVR and MAP dose-dependently.
- **Respiratory**: Strong respiratory depressant.

### ⚠️ Adverse Effects, Warnings & Contraindications
- **Malignant Hyperthermia**: Potent trigger.
- **Carbon Monoxide**: Reacts with desiccated alkaline absorbents to form high concentrations of carboxyhemoglobin, significantly more than other volatiles.
- **Greenhouse Gas**: High global warming potential; remains in the atmosphere for 14 years.

### 📖 Clinical Pearls & General Notes
- **Morbid Obesity**: The agent of choice for super-obese patients, where its low solubility prevents accumulation in fat tissue, resulting in faster airway reflex recovery and quicker discharge.
- **Sympathetic Blunting**: If you must increase the desflurane concentration, do so in small increments (0.5–1.0%) or pre-medicate with fentanyl or esmolol to prevent tachycardia.`,

  n2o: `=== CLINICAL SUMMARY ===
- 🧬 **Mechanism**: Inorganic gas that acts as a non-competitive NMDA receptor antagonist and potassium channel activator, with minimal activity at GABA-A receptors.
- 💊 **Dosing**: Maintenance: run at 50–70% inspired concentration in combination with oxygen and volatiles or propofol. 1.0 MAC is 104%, making it unable to produce surgical anesthesia alone.
- 🫁 **Physiology**: Causes mild sympathetic stimulation (stabilizes blood pressure); does not depress ventilation significantly; diffuses into air-filled cavities.
- ⚠️ **Adverse**: Diffusion hypoxia (requires 100% O2 washout), expands closed air spaces (pneumothorax, bowel gas, middle ear), and inhibits Vitamin B12 (methionine synthase).
- 📖 **Pearls**: Provides excellent analgesia. Contraindicated in bowel obstruction, pneumothorax, air embolism, or when an intraocular gas bubble is present.

=== DETAILED CONSULTATION ===
### 🧬 Mechanism & Receptor Pharmacology
- **NMDA Blockade**: Inhibits NMDA receptors in the CNS.
- **Lack of GABA Effect**: Unlike volatiles, it has almost no effect on GABA-A or glycine channels, which explains why it does not cause immobility at clinical concentrations.
- **MAC**: 104% (requires a hyperbaric chamber to achieve 1.0 MAC of pure N2O).

### 💊 Clinical Dosing & Pharmacokinetics
- **Fast Kinetics**: Blood/gas partition coefficient is 0.47. It washes in and out very quickly.
- **Second Gas Effect**: When co-administered with a volatile anesthetic (e.g. sevoflurane), the rapid uptake of N2O concentrates the volatile agent in the alveoli, speeding up the rate of induction of the volatile gas.
- **Diffusion Hypoxia**: Upon discontinuation, N2O floods out of the blood into the alveoli, diluting oxygen and causing hypoxia. *Mitigated by administering 100% O2 for 5–10 minutes after turning off N2O*.

### 🫁 Physiological Effects & Clinical Indications
- **Hemodynamics**: Mild direct myocardial depressant, but offset by mild central sympathetic stimulation. SVR, HR, and MAP remain stable.
- **Closed Gas Spaces**: Diffuses into air-filled cavities 34 times faster than nitrogen can escape. This rapidly increases the volume or pressure of closed spaces.
- **Neurological**: Increases CBF and ICP slightly.

### ⚠️ Adverse Effects, Warnings & Contraindications
- **B12 Inactivation**: Oxidizes the cobalt atom of Vitamin B12, irreversibly inactivating methionine synthase. This impairs DNA synthesis, leading to megaloblastic anemia and subacute combined degeneration of the spinal cord after prolonged exposure.
- **Contraindications**:
  - Pneumothorax, pulmonary blebs, air embolism.
  - Acute bowel obstruction, tympanoplasty.
  - Recent retinal surgery with intraocular gas bubble (sulfur hexafluoride) (must hold N2O for 7–10 days).

### 📖 Clinical Pearls & General Notes
- **N2O washout**: Always ventilate the patient with 100% O2 for at least 5 minutes before extubation to prevent diffusion hypoxia.
- **Teratogenicity**: Avoid in pregnant patients due to potential interference with DNA synthesis.`,

  'Normal Saline (0.9% NS)': `=== CLINICAL SUMMARY ===
- 🧬 **Mechanism**: Isotonic crystalloid solution containing 154 mEq/L of sodium and 154 mEq/L of chloride (osmolarity 308 mOsm/L).
- 💊 **Dosing**: Volume replacement: typical infusion of 500–1000 mL IV. Distributes rapidly; only 20–25% remains in the intravascular space after 1 hour (75–80% shifts to interstitium).
- 🫁 **Physiology**: Expands intravascular volume; high chloride load can cause hyperchloremic metabolic acidosis and renal vasoconstriction.
- ⚠️ **Adverse**: Hyperchloremic metabolic acidosis, fluid overload, pulmonary edema, and dilutional coagulopathy.
- 📖 **Pearls**: The fluid of choice for traumatic brain injury (prevents cerebral edema due to osmolarity of 308 mOsm/L), severe hypochloremic metabolic alkalosis, and hyperkalemia.

=== DETAILED CONSULTATION ===
### 🧬 Composition & Biophysics
- **Constituents**: Contains 154 mEq/L of Na+ and 154 mEq/L of Cl-. Osmolarity is 308 mOsm/L.
- **Acidosis Risk**: The high chloride concentration (compared to plasma Cl- of 100 mEq/L) reduces the strong ion difference (SID), triggering a hyperchloremic metabolic acidosis.
- **Volume Distribution**: One-quarter rule: 1000 mL of saline expands intravascular volume by only 200–250 mL after equilibration.

### 🫁 Physiological Effects & Clinical Indications
- **Renal Effects**: High chloride load constricts renal afferent arterioles, decreasing glomerular filtration rate (GFR) and delaying excretion.
- **Neurological**: Isotonic/slightly hypertonic relative to brain tissue; does not increase brain water content, making it preferred in neurosurgery.
- **Indications**: Hyponatremia, hypochloremic metabolic alkalosis (e.g. from severe vomiting), and resuscitation in brain injuries.

### ⚠️ Adverse Effects & Contraindications
- **Acidosis**: Hyperchloremic acidosis can be confused with lactic acidosis.
- **Coagulopathy**: Dilutes clotting factors at high volumes.
- **Fluid Overload**: Can trigger heart failure or pulmonary edema in susceptible patients.`,

  'Lactated Ringers (LR)': `=== CLINICAL SUMMARY ===
- 🧬 **Mechanism**: Balanced, isotonic crystalloid solution containing sodium (130 mEq/L), chloride (109 mEq/L), potassium (4 mEq/L), calcium (2.7 mEq/L), and lactate (28 mEq/L) as a buffer.
- 💊 **Dosing**: Resuscitation/Maintenance: 500–1000 mL IV. Distributes rapidly; 25% remains intravascular after 1 hour.
- 🫁 **Physiology**: Expands plasma volume; lactate is metabolized by the liver to bicarbonate, exerting a net alkalinizing effect that prevents acidosis.
- ⚠️ **Adverse**: Fluid overload, dilutional coagulopathy, and calcium content can bind/clot blood if co-infused in the same line.
- 📖 **Pearls**: First-line balanced crystalloid for general surgical resuscitation and burns. Lactate does not worsen lactic acidosis (it is converted to bicarbonate in the liver).

=== DETAILED CONSULTATION ===
### 🧬 Composition & Biophysics
- **Constituents**: Na+ 130, Cl- 109, K+ 4, Ca2+ 2.7, Lactate 28 mEq/L. Osmolarity is 273 mOsm/L (slightly hypotonic to plasma).
- **Lactate Buffer**: The 28 mEq/L of sodium lactate is metabolized by the liver into bicarbonate (requires oxygen and functioning hepatocytes), helping maintain physiological pH.
- **Blood Compatibility Warning**: Contains calcium. If co-infused in the same line with citrated blood products (PRBC), calcium can bind to the citrate anticoagulant, neutralizing it and triggering clot formation inside the IV line. *Avoid co-infusion*.

### 🫁 Physiological Effects & Clinical Indications
- **Acid-Base Stability**: Prevents the hyperchloremic metabolic acidosis associated with normal saline.
- **Indications**: The fluid of choice for major abdominal surgery, hemorrhagic shock resuscitation, and burn resuscitation (Parkland formula).

### ⚠️ Adverse Effects & Contraindications
- **Hypotonicity**: Osmolarity of 273 mOsm/L can cross the BBB, increasing brain water content and ICP. *Contraindicated in severe traumatic brain injury*.
- **Liver Disease**: In severe hepatic failure, the liver cannot metabolize lactate, leading to lactate accumulation (though not acidosis itself, as lactate is not lactic acid).`,

  'Packed Red Blood Cells (PRBC)': `=== CLINICAL SUMMARY ===
- 🧬 **Mechanism**: Concentrated red blood cells suspended in anticoagulant/preservative solution; restores oxygen-carrying capacity by increasing hemoglobin and hematocrit.
- 💊 **Dosing**: Transfused in units (~300 mL per unit). One unit typically increases Hemoglobin by 1 g/dL and Hematocrit by 3% in an adult.
- 🫁 **Physiology**: Increases intravascular volume and red cell mass, improving arterial oxygen content (\(CaO_2\)) and tissue oxygen delivery (\(DO_2\)).
- ⚠️ **Adverse**: Transfusion-related acute lung injury (TRALI), transfusion-associated circulatory overload (TACO), hemolytic reactions, hypocalcemia (citrate chelation), and hyperkalemia.
- 📖 **Pearls**: Transfuse based on restrictive trigger (Hb < 7 g/dL) in stable patients, or higher (Hb < 8–9 g/dL) in active coronary ischemia. Warm and check compatibility.

=== DETAILED CONSULTATION ===
### 🧬 Composition & Biophysics
- **Constituents**: Red blood cells, minimal plasma, citrate anticoagulant, and preservatives (SAGM). Hematocrit is ~65–70%.
- **Oxygen Delivery**: Increases the oxygen-carrying capacity of blood, calculated as:
  \(CaO_2 = (1.34 \times Hb \times SaO_2) + (0.003 \times PaO_2)\)
- **Citrate Toxicity**: Citrate binds calcium to prevent clotting. Rapid transfusion of multiple units can chelate systemic calcium, causing severe hypocalcemia (bradycardia, hypotension, prolonged QT). Treated with calcium chloride (500–1000 mg IV) or calcium gluconate.

### 🫁 Physiological Effects & Clinical Indications
- **Hemodynamics**: Expands blood volume. Can increase blood viscosity at high hematocrits.
- **Indications**: Acute blood loss with signs of inadequate tissue oxygenation, or severe anemia.

### ⚠️ Adverse Effects & Warnings
- **TRALI**: The leading cause of transfusion-related mortality; characterized by acute respiratory distress and bilateral pulmonary infiltrates within 6 hours.
- **TACO**: Circulatory overload causing hydrostatic pulmonary edema, common in elderly or cardiac patients. Treat with diuretics.
- **Hyperkalemia**: Stored blood leaks potassium over time; rapid infusion can trigger hyperkalemic arrhythmias.`,

  'Fresh Frozen Plasma (FFP)': `=== CLINICAL SUMMARY ===
- 🧬 **Mechanism**: The liquid portion of whole blood frozen within 8 hours of collection; contains all soluble coagulation factors (fibrinogen, factors II, V, VII, IX, X, XI, AT-III).
- 💊 **Dosing**: Standard dose is 10–15 mL/kg IV (typically 2–4 units in an adult). One unit is ~250 mL. Onset is immediate; clearance depends on factor half-lives.
- 🫁 **Physiology**: Reconstitutes coagulation cascade, reverses dilutional coagulopathy, and expands intravascular volume.
- ⚠️ **Adverse**: High risk of TRALI/TACO, allergic reactions, febrile non-hemolytic reactions, and citrate-induced hypocalcemia.
- 📖 **Pearls**: Indicated for reversing warfarin (INR > 1.5 with active bleeding), correcting coagulopathy during massive transfusion, or treating factor deficiencies.

=== DETAILED CONSULTATION ===
### 🧬 Composition & Biophysics
- **Constituents**: Contains all clotting factors, albumin, globulins, and citrate anticoagulant.
- **Anticoagulation Reversal**: Commonly used to rapidly reverse warfarin therapy, though Prothrombin Complex Concentrate (PCC) is preferred as it does not cause volume overload.

### 🫁 Physiological Effects & Clinical Indications
- **Hemodynamics**: Effective volume expander, but should not be used solely for volume expansion due to transfusion risks.
- **Indications**: Massive transfusion protocols (ratio of 1:1:1 or 1:1:2 of PRBC:FFP:Platelets), correction of bleeding in hepatic failure, and therapeutic plasma exchange.
- **Toxicity**: High risk of TRALI/TACO due to donor antibodies.
- **Allergic Reactions**: IgE-mediated reactions to donor plasma proteins are common, ranging from hives to anaphylaxis.`
};

export function getPreloadedConsult(id: string, medDatabase?: any): string {
  const normId = id.toLowerCase().trim();
  
  if (PRELOADED_CONSULTS[normId]) {
    return PRELOADED_CONSULTS[normId];
  }
  
  if (normId.includes('normal saline') || normId === 'ns') {
    return PRELOADED_CONSULTS['Normal Saline (0.9% NS)'];
  }
  if (normId.includes('lactated') || normId === 'lr') {
    return PRELOADED_CONSULTS['Lactated Ringers (LR)'];
  }
  if (normId.includes('plasmalyte')) {
    return PRELOADED_CONSULTS['Lactated Ringers (LR)']; // Plasmalyte balanced fallback
  }
  if (normId.includes('prbc') || normId.includes('packed red')) {
    return PRELOADED_CONSULTS['Packed Red Blood Cells (PRBC)'];
  }
  if (normId.includes('fresh frozen') || normId === 'ffp') {
    return PRELOADED_CONSULTS['Fresh Frozen Plasma (FFP)'];
  }
  
  if (medDatabase && medDatabase[normId]) {
    return generateDynamicConsult(id, medDatabase[normId]);
  }
  
  return `=== CLINICAL SUMMARY ===
- 🧬 **Mechanism**: Pharmacological agent acting on cellular targets to modulate physiological function.
- 💊 **Dosing**: Dose and rate must be titrated to patient response, age, weight, and comorbidities.
- 🫁 **Physiology**: Alters organ system physiology aligned with class profile. Monitor vitals.
- ⚠️ **Adverse**: Risks include hypersensitivity, hemodynamic instability, or localized tissue irritation.
- 📖 **Pearls**: Always verify patient allergies, IV line patency, and cross-sensitivity prior to drug administration.

=== DETAILED CONSULTATION ===
### 🧬 Mechanism & Receptor Pharmacology
- **Pharmacodynamics**: This agent interacts with specific receptors or cellular pathways to achieve therapeutic effects.
- **Selectivity**: Refer to a standard anesthesia reference text for exact affinity constants and selectivity profiles.

### 💊 Clinical Dosing & Pharmacokinetics
- **Administration Guidelines**: Administer intravenously or via approved routes. Titrate to effect.
- **Kinetics**: Elimination is typically mediated via hepatic metabolism, renal excretion, or plasma esterase hydrolysis.

### 🫁 Physiological Effects & Clinical Indications
- **Systemic Changes**: Exerts dose-dependent changes in cardiovascular parameters (MAP, HR, SVR) and respiratory parameters (tidal volume, airway resistance).

### ⚠️ Adverse Effects, Warnings & Contraindications
- **Safety Concerns**: Monitor for signs of toxicity, allergic reaction, or cardiorespiratory depression.
- **Contraindications**: Avoid in patients with documented hypersensitivity or specific relative contraindications.

### 📖 Clinical Pearls & General Notes
- **Key Note**: Standard anesthesia clinical safety protocols must be followed during administration. Keep rescue medications immediately available.`;
}

function generateDynamicConsult(id: string, med: any): string {
  const name = med.name || id;
  const classes = med.classes?.join(', ') || 'Anesthesia Agent';
  const target = med.targetReceptor || 'N/A';
  const cascade = med.intracellularCascade || 'N/A';
  const metabolism = med.metabolism || 'N/A';
  const notes = med.notes || '';
  const dosingWeight = med.dosingWeight || 'TBW';
  
  let indicationsText = '';
  if (med.indications) {
    indicationsText = Object.entries(med.indications)
      .map(([ind, data]: [string, any]) => `- **${ind}**: ${data.dose} ${data.unit} (${data.type})`)
      .join('\n');
  }

  return `=== CLINICAL SUMMARY ===
- 🧬 **Mechanism**: ${name} targets the ${target} receptor. Cascade: ${cascade}.
- 💊 **Dosing**: Weight-based using ${dosingWeight}. Indications:\n${indicationsText || '- N/A'}
- 🫁 **Physiology**: Class: ${classes}. Metabolism is via ${metabolism}.
- ⚠️ **Adverse**: Monitor hemodynamic stability, airway reflexes, and watch for hypersensitivity.
- 📖 **Pearls**: ${notes}

=== DETAILED CONSULTATION ===
### 🧬 Mechanism & Receptor Pharmacology
- **Receptor Target**: **${name}** primarily acts on the **${target}** receptor.
- **Intracellular Cascade**: ${cascade}
- **Action Mode**: Functions as a **${classes}** to modulate perioperative physiology.

### 💊 Clinical Dosing & Pharmacokinetics
- **Dosing Basis**: Weight-based calculations are grounded in **${dosingWeight}**.
- **Clinical Guidelines**:\n${indicationsText || '- Titrate clinical dosing according to standard guidelines.'}
- **Clearance & Half-life**: Metabolism and elimination are mediated via **${metabolism}**.

### 🫁 Physiological Effects & Clinical Indications
- **Systemic Class Profile**: As a **${classes}**, it exerts systemic effects matching its target receptor distribution.
- **Indications**: Indicated for anesthetic maintenance, induction, or adjunct care as described above.
- **Organ System Effects**: Causes changes in hemodynamics and/or ventilatory parameters aligned with class pathways.

### ⚠️ Adverse Effects, Warnings & Contraindications
- **Precautions**: Adjust dosing in patients with organ dysfunction matching its clearance pathway (${metabolism}).
- **Monitoring**: Close monitoring of vitals, ventilation, and depth of anesthesia is required.

### 📖 Clinical Pearls & General Notes
- **Key Highlight**: ${notes || 'No specific clinical pearls recorded in the default profile.'}`;
}
