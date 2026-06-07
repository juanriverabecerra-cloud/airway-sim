/**
 * BoardQuestions — Structured Anesthesiology Board Exam Question Bank
 * 
 * Contains 10 high-fidelity, multi-layered clinical vignettes covering:
 * - Neuro-anesthesia, sleep physiology, EEG waveforms, and anesthetic mechanisms.
 * - Grounded strictly in Miller's Anesthesia Chapters 9 and 10.
 * 
 * Each question has an automatic background search query mapped to the textbook database.
 */

export const boardQuestions = [
  {
    id: 'Q1',
    category: 'Physiology',
    title: 'Thalamic Hypersynchrony & EEG',
    vignette: 'During a total intravenous anesthetic (TIVA) with propofol for a 45-year-old female, the raw EEG shows prominent frontal alpha activity (8-13 Hz). According to current neurophysiological models, which mechanism best explains this electrophysiological signature?',
    options: [
      'A) Direct activation of sleep-promoting GABAergic neurons in the ventrolateral preoptic nucleus (VLPO).',
      'B) Propofol action on reticular thalamic GABA receptors generating frontal thalamocortical alpha hypersynchrony.',
      'C) Selective depression of the median raphe nucleus leading to decreased serotonergic transmission.',
      'D) Blockade of voltage-gated sodium channels in primary sensory thalamic relay nuclei.'
    ],
    correctIdx: 1,
    explanation: 'Propofol enhances GABAergic activity in the nucleus reticularis of the thalamus. This generates a hypersynchronous alpha rhythm (8-13 Hz) between the thalamus and prefrontal cortex, blocking the flexible corticocortical communication required for conscious processing (Miller Ch. 10).',
    searchQuery: 'propofol reticularis hypersynchronous alpha rhythm'
  },
  {
    id: 'Q2',
    category: 'Pharmacology',
    title: 'Histaminergic Neurons & Propofol Resistance',
    vignette: 'A research study evaluates the behavioral and electrophysiological effects of propofol in mice. If histaminergic neurons are genetically modified to remove GABAA receptors, which behavioral outcome is observed in response to a standard induction dose of propofol?',
    options: [
      'A) Complete resistance to propofol-induced loss-of-righting reflex (LORR).',
      'B) Exaggerated prolongations in the duration of anesthetic emergence.',
      'C) No significant change in the loss-of-righting reflex despite neuronal resistance to the drug.',
      'D) Development of spontaneous generalized epileptiform seizures under anesthesia.'
    ],
    correctIdx: 2,
    explanation: 'Genetic studies show that removing GABAA receptors renders histaminergic TMN neurons resistant to propofol. However, at the behavioral level, there is no change in the loss-of-righting reflex, suggesting histaminergic transmission is not the sole mediator of anesthetic unconsciousness (Miller Ch. 9).',
    searchQuery: 'histaminergic neurons resistant propofol loss-of-righting'
  },
  {
    id: 'Q3',
    category: 'Physiology',
    title: 'VLPO Lesions & Isoflurane Sensitivity',
    vignette: 'An animal model is prepared with chronic lesions of the ventrolateral preoptic nucleus (VLPO). When exposed to isoflurane, how is the subject\'s anesthetic sensitivity affected compared to wild-type controls?',
    options: [
      'A) Decreased sensitivity (resistance) due to loss of sleep-active GABAergic neurons.',
      'B) Increased sensitivity (prolonged sleep time) due to chronic sleep-deprivation effects.',
      'C) Unchanged sensitivity because isoflurane does not act on sleep-active paths.',
      'D) Permanent inability to be anesthetized by any halogenated volatile agents.'
    ],
    correctIdx: 1,
    explanation: 'While acute lesions of the VLPO sleep-active neurons confer resistance to isoflurane, chronic VLPO ablation results in severe sleep deprivation. The cumulative sleep debt overwhelms the lesion effect, conferring increased sensitivity to isoflurane (Miller Ch. 9).',
    searchQuery: 'ablation VLPO sleep deprivation increased sensitivity isoflurane'
  },
  {
    id: 'Q4',
    category: 'Pharmacology',
    title: 'Orexin & Emergence Dynamics',
    vignette: 'A patient with narcolepsy demonstrates a significant delay in emergence from sevoflurane anesthesia. In mouse models, how does the orexinergic system differentially affect induction versus emergence from volatile anesthetics?',
    options: [
      'A) Orexin knockouts show delayed induction but accelerated emergence.',
      'B) Orexin plays a critical role in emergence dynamics but does not affect induction time.',
      'C) Orexin accelerates induction while having no effect on emergence.',
      'D) Orexinergic stimulation blocks induction but shortens emergence.'
    ],
    correctIdx: 1,
    explanation: 'Genetic and pharmacologic studies show that orexins play a key role in emergence from sevoflurane and isoflurane, but not induction. This forms the basis of "neural inertia" (asymmetrical paths between induction and emergence) (Miller Ch. 9).',
    searchQuery: 'orexins emerge sevoflurane isoflurane induction neural inertia'
  },
  {
    id: 'Q5',
    category: 'Physiology',
    title: 'Thalamic Switch Theory',
    vignette: 'During general anesthesia, metabolic imaging demonstrates global depression of thalamic activity. Neuroimaging studies suggest that which sub-regions of the thalamus are most critically involved in anesthetic-induced unconsciousness?',
    options: [
      'A) Specific sensory relay nuclei (lateral and medial geniculate bodies).',
      'B) Higher-order, nonspecific integrative nuclei regulating corticocortical communication.',
      'C) Ventral posterolateral (VPL) nuclei transmitting peripheral pain pathways.',
      'D) Anterior thalamic nuclei modulating limbic and emotional responses.'
    ],
    correctIdx: 1,
    explanation: 'Disconnection of higher-order (nonspecific) integrative thalamic nuclei from the cortex is the primary correlate of anesthetic unconsciousness. Primary sensory relay connections remain relatively preserved during anesthesia (Miller Ch. 10).',
    searchQuery: 'thalamic connectivity nonspecific nuclei cortex reduction level'
  },
  {
    id: 'Q6',
    category: 'Physiology',
    title: 'Sevoflurane & Corticothalamic Disconnection',
    vignette: 'A patient is anesthetized with 1.0 MAC sevoflurane. Functional MRI (fMRI) is performed. Which pattern of functional connectivity changes is typically observed under sevoflurane?',
    options: [
      'A) Disconnection of primary visual and auditory cortical networks from the thalamus.',
      'B) Preservation of higher-order frontal-parietal network connections.',
      'C) Disconnection between the thalamus and cortex, particularly involving the frontal cortex.',
      'D) Uniform hyper-connectivity across all subcortical and cortical nodes.'
    ],
    correctIdx: 2,
    explanation: 'Sevoflurane has been shown to functionally disconnect the thalamus and cortex, particularly the frontal cortex, while primary sensory network connectivity remains relatively preserved (Miller Ch. 10).',
    searchQuery: 'sevoflurane functionally disconnect thalamus cortex frontal'
  },
  {
    id: 'Q7',
    category: 'Physiology',
    title: 'Anesthetic Impact on Cortical Connectivity',
    vignette: 'High-density EEG is used to evaluate directional and effective connectivity in a volunteer during propofol induction. What is the typical directional pattern of information exchange disruption observed at loss of consciousness?',
    options: [
      'A) Disruption of feedback (top-down) connectivity, particularly from frontal to parietal areas.',
      'B) Selective disruption of feedforward (bottom-up) sensory signaling to the cortex.',
      'C) Global increase in feedback connectivity from parietal to frontal regions.',
      'D) Preservation of all effective connectivity paths with only amplitude reductions.'
    ],
    correctIdx: 0,
    explanation: 'A common mediator of anesthetic-induced unconsciousness across diverse drugs is the preferential disruption of feedback (top-down) directional connectivity, especially in frontal-parietal networks (Miller Ch. 10).',
    searchQuery: 'disruption frontal-parietal connectivity information exchange'
  },
  {
    id: 'Q8',
    category: 'Pharmacology',
    title: 'Midazolam & Evoked Cortical Potentials',
    vignette: 'A study utilizes combined transcranial magnetic stimulation (TMS) and high-density EEG (HD-EEG) to investigate benzodiazepine-induced unconsciousness. Following midazolam administration, what response is observed upon local magnetic stimulation of the motor cortex?',
    options: [
      'A) Absence of any local cortical activation at the site of stimulation.',
      'B) Local cortical activation is preserved, but propagation of evoked potentials to distant areas is blocked.',
      'C) Hyper-propagation of high-frequency oscillations to contralateral hemispheres.',
      'D) Conversion of local evoked potentials into generalized slow-wave discharges.'
    ],
    correctIdx: 1,
    explanation: 'Following midazolam administration, local cortical activation is observed at the TMS stimulation site, but distant propagation of evoked potentials (effective connectivity) is blocked, indicating cortical information exchange is disrupted (Miller Ch. 10).',
    searchQuery: 'magnetic stimulation midazolam local cortical activation evoked potentials'
  },
  {
    id: 'Q9',
    category: 'Physiology',
    title: 'Sleep-Wake Reciprocal Inhibition',
    vignette: 'In the neurobiology of sleep and arousal, which anatomical structure provides sleep-promoting GABAergic projections that reciprocally inhibit the histaminergic tuberomammillary nucleus (TMN)?',
    options: [
      'A) Locus coeruleus (LC).',
      'B) Nucleus reticularis of the thalamus.',
      'C) Ventrolateral preoptic nucleus (VLPO).',
      'D) Lateral hypothalamus orexinergic center.'
    ],
    correctIdx: 2,
    explanation: 'The sleep-promoting GABAergic neurons of the ventrolateral preoptic nucleus (VLPO) have a relationship of reciprocal inhibition with the arousal-promoting histaminergic neurons of the tuberomammillary nucleus (TMN) (Miller Ch. 9).',
    searchQuery: 'reciprocal inhibition sleep-promoting GABAergic neurons VLPO TMN'
  },
  {
    id: 'Q10',
    category: 'Physiology',
    title: 'Neural Inertia & State Transitions',
    vignette: 'A researcher observes that the concentration of sevoflurane at which a patient loses consciousness during induction is significantly higher than the concentration at which consciousness returns during emergence. This hysteresis is termed:',
    options: [
      'A) Pharmacokinetic delay.',
      'B) Context-sensitive half-time.',
      'C) Neural inertia.',
      'D) Minimum alveolar concentration (MAC) gradient.'
    ],
    correctIdx: 2,
    explanation: 'Neural inertia refers to the neurobiological resistance to state transitions between consciousness and unconsciousness, manifesting as a hysteresis loop where the induction and emergence paths are asymmetric (Miller Ch. 9).',
    searchQuery: 'neural inertia state transitions sevoflurane induction emergence'
  }
];
