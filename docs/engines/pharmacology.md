# Pharmacology (PK/PD) Engine Reference (§5)

> Part of the `goldenversion.md` ground-truth set. Relocated here so a chapter-integration
> session only loads this file when its content touches PK/PD, the medication table, or
> consciousness/EEG engines. Section numbering (§5.x) is preserved exactly as it was in
> `goldenversion.md`. This file is being assembled in parts — see end of file for progress.

### 5. Pharmacology (PK/PD) Engine

#### 5.1 Mammillary Multi-Compartment PK Model (`PKPDEngine.ts`)
Medications are modeled using a mammillary three-compartment model (Central $V_1$, Rapid Peripheral $V_2$, and Slow Peripheral $V_3$), linked to an effect-site compartment ($V_e$):

```
        [ Rapid Peripheral V2 ]
             ^         |
             | k12     | k21
             v         v
-----> [ Central Compartment V1 ] -----> [ Elimination k10 ]
             ^         |
             | k13     | k31
             v         v
        [ Slow Peripheral V3 ]
               |
               | k1e (ke0)
               v
        [ Effect Site Ve ]
```

*   **Pharmacokinetic Differential Equations**:
    $$\frac{dA_1}{dt} = \text{InfusionRate} - (k_{10} + k_{12} + k_{13}) \cdot A_1 + k_{21} \cdot A_2 + k_{31} \cdot A_3$$
    $$\frac{dA_2}{dt} = k_{12} \cdot A_1 - k_{21} \cdot A_2 \quad \text{and} \quad \frac{dA_3}{dt} = k_{13} \cdot A_1 - k_{31} \cdot A_3$$
    $$\frac{dC_e}{dt} = k_{e0} \cdot (C_p - C_e) \quad \text{where } C_p = \frac{A_1}{V_1}$$

*   **Minto Remifentanil PK Model**:
    The Minto three-compartment model dynamically calculates volumes and clearances based on age and Hume lean body mass ($LBM$) centered at age 40 and LBM 55 kg (Miller's 9th Ed, Ch 18 p. 485):
    - $V_1 = 5.1 - 0.0201 \cdot (Age - 40) + 0.072 \cdot (LBM - 55)\text{ L}$
    - $V_2 = 9.82 - 0.0811 \cdot (Age - 40) + 0.108 \cdot (LBM - 55)\text{ L}$
    - $V_3 = 5.42\text{ L}$
    - $Cl_1 = 2.6 - 0.0162 \cdot (Age - 40) + 0.0191 \cdot (LBM - 55)\text{ L/min}$
    - $Cl_2 = 2.05 - 0.0301 \cdot (Age - 40)\text{ L/min}$
    - $Cl_3 = 0.076 - 0.00113 \cdot (Age - 40)\text{ L/min}$
    - $ke_0 = 0.595 - 0.007 \cdot (Age - 40)\text{ min}^{-1}$

#### 5.2 Numerical Integration (Euler Sub-stepping)
To maintain numerical stability when simulating high drug concentration changes (such as large rapid boluses), the solver splits the 1-second clock tick ($dt = 1$) into 10 sub-steps ($dt_{\text{sub}} = 0.1\text{ s}$):
```typescript
const subSteps = 10;
const subDt = dt / subSteps;
for (let i = 0; i < subSteps; i++) {
  A1 += infusionRate * subDt;
  const flux10 = k10 * A1 * subDt;
  const flux12 = k12 * A1 * subDt;
  const flux21 = k21 * A2 * subDt;
  const flux13 = k13 * A1 * subDt;
  const flux31 = k31 * A3 * subDt;

  A1 = Math.max(0, A1 - flux10 - flux12 + flux21 - flux13 + flux31);
  A2 = Math.max(0, A2 + flux12 - flux21);
  A3 = Math.max(0, A3 + flux13 - flux31);

  const Cp = (A1 / V_1) * freeFraction;
  Ce += ke0 * (Cp - Ce) * subDt;
}
```

#### 5.3 Flow-Dependent Clearance, Distribution Autoregulation & Front-End Recirculatory Kinetics
*   **Cardiac Output Scaling Modifier ($coMod$)**:
    $$coMod = \max\left(0, 1.0 + (\text{CoRatio} - 1.0) \cdot CoSensitivity\right) \quad \text{where } \text{CoRatio} = \frac{CO_{\text{current}}}{CO_{\text{baseline}}}$$
    *   *Autoregulated Rates*: $k_{10} = k_{10,\text{baseline}} \cdot coMod$, $k_{12} = k_{12,\text{baseline}} \cdot coMod$, $k_{13} = k_{13,\text{baseline}} \cdot coMod$.
*   **Effect-Site Equilibration ($ke_0$) Autoregulation**:
    Cerebral autoregulation maintains brain perfusion until severe shock occurs. For sedatives and opioids, $ke_0$ scales as:
    $$ke_0 = ke_{0,\text{baseline}} \cdot \text{BrainFlowMod} \quad \text{where } \text{BrainFlowMod} = \begin{cases} \text{CoRatio} \cdot 2 & \text{if } \text{CoRatio} < 0.5 \\ 1.0 & \text{otherwise} \end{cases}$$
    For other peripheral drugs (e.g. paralytics, vasopressors), onset delays linearly with perfusion:
    $$ke_0 = ke_{0,\text{baseline}} \cdot \max(0.1, \text{CoRatio})$$
*   **Front-End Recirculatory Volume ($dynamicV_1$)**:
    To model how low cardiac output states reduce mixing volume and elevate peak concentrations, the central volume $V_1$ scales dynamically:
    $$dynamicV_1 = \max\left(0.1, V_1 \cdot v_1VolumeRatio \cdot (0.6 + 0.4 \cdot coRatio)\right)$$
    where $v_1VolumeRatio$ is the ratio of current blood volume to baseline estimated blood volume, and $coRatio$ is the ratio of current cardiac output to baseline.

#### 5.4 Organ Impairment & Protein Binding Corrections
*   **Organ Clearance Fractions**:
    $$k_{10,\text{effective}} = k_{10} \cdot (Frac_{\text{independent}} + Frac_{\text{renal}} \cdot \text{renalRatio} + Frac_{\text{hepatic}} \cdot \text{hepaticRatio})$$
*   **Hemodilution & Protein Binding**:
    $$Cp_{\text{effective}} = \frac{A_1}{V_1} \cdot FreeFraction_{\text{effective}}$$
    In severe hemodilution (intravascular volume expansion $V_{1,\text{ratio}} > 1.2$), plasma protein levels fall, increasing the free fraction:
    $$FreeFraction_{\text{effective}} = \min\left(1.0, (1.0 - ProteinBinding) \cdot 1.2\right)$$

#### 5.5 Receptor-Level Pharmacodynamics (Sigmoid Emax Hill Equation)
Effect-site concentrations ($C_e$) drive clinical responses using the Hill equation:
$$Effect = \frac{E_{\max} \cdot C_{e,\text{active}}^\gamma}{EC_{50,\text{effective}}^\gamma + C_{e,\text{active}}^\gamma} \quad \text{implemented ratio-wise as} \quad Effect = \frac{\text{Ratio}^\gamma}{1.0 + \text{Ratio}^\gamma} \quad \text{where } \text{Ratio} = \frac{C_{e,\text{active}}}{EC_{50,\text{effective}}}$$

*   **Age-Dependent PD Sensitivity Scaling** (Miller's 9th Ed, Ch 18 p. 486):
    Elderly patients exhibit heightened brain sensitivity to sedatives and opioids. The simulator scales the effective effect-site concentration via an age sensitivity multiplier ($AgeSens$, clamped between $0.2$ and $4.0$):
    - *Propofol*: $AgeSens = 1.0 + (Age - 40) \cdot 0.025$ (yielding 65% dose reduction at age 80 relative to age 20).
    - *Opioids*: $AgeSens = 1.0 + (Age - 40) \cdot 0.018$ (yielding 55% dose reduction at age 80 relative to age 20).
    - *Other Sedatives*: $AgeSens = 1.0 + (Age - 40) \cdot 0.015$.
    The active effect-site concentration is computed as: $C_{e,\text{active}} = C_e \cdot pdSensitivityCoeff \cdot AgeSens$.

*   **Opioid Tolerance Sensitivity Scaling**:
    Chronic opioid exposure or acute tolerance shifts the pharmacodynamic sensitivity threshold:
    $$EC_{50,\text{effective}} = EC_{50} \cdot \text{opioidToleranceMultiplier}$$
    where the `opioidToleranceMultiplier` is normally $1.0$, but rises to $2.0$ (doubling the threshold) in acute tolerance and Opioid-Induced Hyperalgesia (OIH).

#### 5.6 Receptor-Level Vasoactive Chronotropic & Vasomotor Coupling
Vasoactive medications act directly on cardiovascular receptors ($\alpha_1, \beta_1, \beta_2, V_1$):
*   **Systemic Vascular Resistance (SVR)**:
    $$SVR_{\text{multiplier}} = 1.0 + \left(\alpha_1 \cdot 0.25 \cdot Effect_{\alpha 1} + V_1 \cdot 0.30 \cdot Effect_{V1}\right) - \beta_2 \cdot 0.15 \cdot Effect_{\beta 2}$$
*   **Cardiac Contractility (Inotropy)**: $CO_{\text{multiplier}} = 1.0 + \beta_1 \cdot 0.25 \cdot Effect_{\beta 1}$
*   **Chronotropy (Heart Rate)**: $HR_{\text{delta}} = \beta_1 \cdot 15 \cdot Effect_{\beta 1}$
*   **Baroreceptor Reflex Chronotropic Offset**: Pure vasopressors induce a reflex bradycardia offset in heart rate:
    $$HR_{\text{baroreflex\_offset}} = -(\text{Alpha1} \cdot 5 \cdot Effect_{\alpha 1}) - (V_1 \cdot 5 \cdot Effect_{V1})$$

#### 5.7 Neuromuscular Blockade, Receptor Subtypes, Fade (TOF Count/Ratio) & Pseudocholinesterase Variants
Neuromuscular blocking agents (NMBAs) block nicotinic acetylcholine receptors ($nAChR$) at the motor endplate. The simulator models three distinct receptor populations representing mature, extrajunctional, and presynaptic sites:
*   **Nicotinic Receptor Subtypes**:
    1.  *Mature Junctional ($nAChR_{\text{mature}}$)*: Pentameric structure of $\alpha_2\beta\delta\epsilon$. Found strictly at the postjunctional endplate crests. Exhibits short channel opening time and high electrical conductance.
    2.  *Immature / Extrajunctional Fetal ($nAChR_{\text{immature}}$)*: Pentameric structure of $\alpha_2\beta\delta\gamma$. Synthesized in states of denervation, burns, immobility, or severe trauma. Extends across the entire extrajunctional muscle membrane, exhibits long open times (2-10x longer than mature), and low conductance. Additionally, the homopentameric $\alpha_7$ neuronal subtype is co-expressed, showing high Calcium/Potassium permeability.
    3.  *Presynaptic Neuronal ($nAChR_{\text{presynaptic}}$)*: Pentameric structure of $\alpha_3\beta_2$. Facilitates positive-feedback release of acetylcholine during repetitive nerve stimulation.
*   **Safety Margin of Neuromuscular Transmission**:
    Under normal physiology, there is a large safety buffer. At least $75\%$ of mature postjunctional receptors must be occupied before twitch height ($T_1$) begins to decline. Full transmission block (TOF twitches $= 0/4$) is reached when mature occupancy exceeds $95\%$:
    *   *Receptor Occupancy ($Occupancy_{\text{mature}}$)*:
        *   If $Occupancy_{\text{mature}} \le 0.75$: All 4 twitches present, TOF ratio is $1.0$.
        *   If $0.75 < Occupancy_{\text{mature}} \le 0.80$: 4 twitches present, muscle response fades (TOF ratio $< 0.90$).
        *   If $0.80 < Occupancy_{\text{mature}} \le 0.85$: 3 twitches present.
        *   If $0.85 < Occupancy_{\text{mature}} \le 0.90$: 2 twitches present.
        *   If $0.90 < Occupancy_{\text{mature}} \le 0.95$: 1 twitch present.
        *   If $Occupancy_{\text{mature}} > 0.95$: 0 twitches present (profound paralysis).
*   **Fade Physics (Presynaptic positive feedback)**:
    Fade is caused by competitive blockade of presynaptic $\alpha_3\beta_2$ receptors, which halts the positive feedback replenishment of acetylcholine:
    $$\text{TOF Ratio} = 1.0 - nAChR_{\text{presynaptic\_occupancy}} \cdot 0.95$$
    - *Nondepolarizers (NDMRs)*: Bind competitively to presynaptic receptors, causing immediate dose-dependent fade.
    - *Succinylcholine Phase I*: Does not block presynaptic receptors ($nAChR_{\text{presynaptic\_occupancy}} = 0$), producing non-fade blockade (TOF ratio $= 1.0$, equal twitch height depression).
    - *Succinylcholine Phase II*: Under high cumulative doses ($>4\text{ mg/kg}$ or $>300\text{ mg}$ or $>120$ seconds of exposure), receptors undergo desensitization. The block transitions to exhibit fade:
      $$nAChR_{\text{presynaptic\_occupancy}} = suxOccupancy \cdot 0.85$$

*   **Pseudocholinesterase (Butyrylcholinesterase / BChE) Genotypes & Clearance**:
    Succinylcholine clearance is mediated by plasma butyrylcholinesterase (BChE). The simulator models genetic variants that alter this clearance multiplier ($bcheMultiplier$):
    1. *Normal ($E_1^u E_1^u$)*: Dibucaine Number $\approx 80$. Clearance multiplier $= 1.0$. Block duration is 5-10 minutes.
    2. *Heterozygous ($E_1^u E_1^a$)*: Dibucaine Number $\approx 50$. Clearance multiplier $= 0.1$. Block duration is prolonged to 20-30 minutes.
    3. *Atypical Homozygous ($E_1^a E_1^a$)*: Dibucaine Number $\approx 20$. Clearance multiplier $= 0.01$. Block duration is severely prolonged to 4-6 hours.
    4. *Acquired / Physiological Blunting*: Plasma BChE activity is further blunted in pregnancy (activity multiplier $= 0.8$), liver cirrhosis / Child-Pugh C ($= 0.5$), and neostigmine administration ($= 0.1$ due to competitive AChE/BChE inhibition).

*   **Hofmann Spontaneous Elimination**:
    Atracurium and Cisatracurium clearance occurs via Hofmann elimination, a temperature- and pH-dependent spontaneous chemical degradation independent of organ function:
    $$hofmannMultiplier = 1.07^{(\text{temp} - 37.0)} \cdot 10^{(\text{pH} - 7.4)}$$
    Hypothermia (temp $< 35^{\circ}\text{C}$) and acidosis (pH $< 7.2$) slow elimination, while hyperthermia and alkalosis accelerate it.
*   **Qualitative vs. Quantitative Monitoring Blind Spot (Ch28, Miller's 9th Ed, Fig 28.2, p.835)**:
    Investigators have consistently observed that clinicians using manual/tactile peripheral nerve stimulation are unable to detect fade once the true TOF ratio exceeds $0.30$ to $0.40$, meaning clinically significant residual blockade (true TOF ratio $0.40-0.89$) is invisible to "qualitative" assessment. Quantitative monitors (e.g., acceleromyography, AMG) display the true ratio at all times. The simulator now models this as a selectable `tofMonitorMode` (`'quantitative'` default, or `'qualitative'`) on the patient, computed in `usePhysiology.js` alongside the ground-truth TOF values:
    $$perceivedTofRatio = \begin{cases} 1.0 & \text{if } targetTofCount = 4 \text{ and } targetTofRatio > 0.40 \\ targetTofRatio & \text{otherwise} \end{cases}$$
    Twitch *count* (0-4 missing twitches) is always perceived accurately, since gross absence of a twitch is visually/tactilely obvious — only the fade *ratio* within an intact 4/4 train is imperceptible above the threshold. In `MemoryPanel.jsx`, switching to Qualitative mode replaces the AMG twitch-height bars with a binary present/absent display and can produce a false-positive "Safe to Extubate" reading at a true TOF ratio as low as $0.40$ — directly reproducing this chapter's central patient-safety teaching point.
*   **Mivacurium: Shared Pseudocholinesterase Substrate with Succinylcholine**:
    TABLE 27.1, Miller's 9th Ed groups Mivacurium with Succinylcholine as substrates of the same plasma butyrylcholinesterase enzyme: dibucaine number 70-80 (normal) gives normal clearance, 50-60 (heterozygous atypical) lengthens block by 50%-100%, and 20-30 (homozygous atypical) prolongs block to hours. The simulator's `bcheMultiplier` (computed once per tick from `butyrylcholinesteraseVariant`/pregnancy/cirrhosis/neostigmine state) now scales Mivacurium's $k_{10}$ identically to Succinylcholine's, rather than only Succinylcholine's.
*   **Autonomic & Histamine-Mediated Hemodynamic Effects of NMBAs (TABLE 27.9/27.10)**:
    Nondepolarizing blockers were previously modeled with zero direct cardiovascular effect (`sysMax`/`diaMax`/`hrMax` all $0$) regardless of class. TABLE 27.9's autonomic margins of safety and TABLE 27.10's clinical autonomic effects are now reflected via each drug's existing Hill-equation hemodynamic deltas (driven by the same $C_e$/$c_{50}$/$\gamma$ curve already used for paralysis onset):
    *   *Histamine release ("Slight" clinically, TABLE 27.10)*: Atracurium ($hrMax{=}8$, $sysMax{=}{-}8$, $diaMax{=}{-}6$) and Mivacurium ($hrMax{=}10$, $sysMax{=}{-}10$, $diaMax{=}{-}8$, the higher of the two per TABLE 27.9's lower 3.0x vs. 2.5x autonomic margin) cause mild, transient hypotension with reflex/direct tachycardia.
    *   *Vagolytic (cardiac M2 muscarinic blockade)*: Pancuronium "blocks moderately" ($hrMax{=}20$, the strongest tachycardic NDMR in the database) and Rocuronium "blocks weakly" ($hrMax{=}6$); both have $sysMax{=}diaMax{=}0$ since neither releases histamine nor blocks autonomic ganglia (TABLE 27.9's $>10$x-$>250$x ganglionic margins).
    *   *No autonomic effect ("None", TABLE 27.10)*: Cisatracurium and Vecuronium remain at $hrMax{=}sysMax{=}diaMax{=}0$.
*   **Mivacurium & Pancuronium Added**: Previously absent from the medication database despite being directly profiled across TABLE 27.2-27.5/27.9-27.12. Mivacurium (short-acting, Table 27.2, BChE-hydrolyzed) and Pancuronium (long-acting, Table 27.2, vagolytic) are now selectable medications with full chat/syringe UI wiring, alongside the pre-existing but previously UI-inaccessible Atracurium/Gantacurium/CW002/L-Cysteine. d-Tubocurarine was deliberately not added — see §12.

#### 5.8 Drug-Drug Synergism, Chelation Reversal, Anticholinesterase ceiling, & Back-End CSHT decrement curves
*   **MAC-BAR Suppression Synergy (Minto/Greco concept)**:
    Opioids shift the concentration curves of volatiles and hypnotics required to suppress the somatic response to pain:
    $$MAC_{\text{BAR,50}} = 1.2 \cdot e^{-3.0 \cdot Effect_{\text{opioid}}} \quad Hypnotic_{\text{BAR,50}} = 1.5 \cdot e^{-3.0 \cdot Effect_{\text{opioid}}}$$
    $$BAR_{\text{suppression}} = 1.0 - (1.0 - Effect_{\text{volatile}}) \cdot (1.0 - Effect_{\text{hypnotic}})$$
    $$\text{Surge}_{\text{sympathetic}} = C_{\text{cat}} \cdot (1.0 - BAR_{\text{suppression}})$$
*   **GABA-Opioid Synergistic Hypnosis (Inward-Bowing Isoboles)**:
    Instead of simple independent probability, the simulator models GABA-opioid synergistic hypnosis (inward-bowing isoboles representing Figure 18.30) for processed EEG metrics (BIS and SEF95):
    $$aggregateHypnosis = \min\left(1.0, sedativeEff + opioidEff + 1.8 \cdot sedativeEff \cdot opioidEff\right)$$
*   **Back-End Decrement Times / Context-Sensitive Half-Times (CSHT)**:
    Cumulative active infusion durations ($t_{\text{inf}}$ in minutes) are tracked continuously. Context-sensitive half-times (CSHT, in minutes) are calculated at runtime using empirical rational fits matching Figure 18.16:
    - *Remifentanil*: $CSHT = 3.5\text{ minutes}$ (constant/context-insensitive due to blood/tissue esterase clearance).
    - *Propofol*: $CSHT = 3.0 + 37.0 \cdot \frac{t_{\text{inf}}}{t_{\text{inf}} + 80.0}\text{ minutes}$
    - *Fentanyl*: $CSHT = 5.0 + 300.0 \cdot \frac{t_{\text{inf}}^{1.2}}{t_{\text{inf}}^{1.2} + 120.0}\text{ minutes}$
    - *Sufentanil*: $CSHT = 4.0 + 80.0 \cdot \frac{t_{\text{inf}}}{t_{\text{inf}} + 240.0}\text{ minutes}$
    - *Midazolam*: $CSHT = 5.0 + 150.0 \cdot \frac{t_{\text{inf}}}{t_{\text{inf}} + 180.0}\text{ minutes}$

*   **Context-Sensitive 80% Decrement Times ($CSDT_{80}$)**:
    Empirical fits matching Figure 18.16 of Miller's 9th Ed are calculated dynamically based on active infusion duration ($t_{\text{inf}}$ in minutes):
    - *Remifentanil*: $CSDT_{80} = 9.0\text{ minutes}$ (context-insensitive).
    - *Propofol*: $CSDT_{80} = 10.0 + 120.0 \cdot \frac{t_{\text{inf}}}{t_{\text{inf}} + 90.0}\text{ minutes}$
    - *Fentanyl*: $CSDT_{80} = 30.0 + 600.0 \cdot \frac{t_{\text{inf}}^{1.1}}{t_{\text{inf}}^{1.1} + 120.0}\text{ minutes}$
    - *Sufentanil*: $CSDT_{80} = 20.0 + 320.0 \cdot \frac{t_{\text{inf}}}{t_{\text{inf}} + 180.0}\text{ minutes}$
    - *Midazolam*: $CSDT_{80} = 30.0 + 450.0 \cdot \frac{t_{\text{inf}}}{t_{\text{inf}} + 150.0}\text{ minutes}$
*   **Drug Chelation Reversal (Sugammadex)**:
    Sugammadex encapsulates steroidal NMBAs (Rocuronium, Vecuronium) in the plasma ($V_1$), removing active drug molecules from circulation:
    $$A_{1,\text{effective}} = A_{1,\text{initial}} \cdot (1 - ChelateRatio)$$
    This creates a steep concentration gradient that pulls drug molecules out of the effect-site ($V_e$) and peripheral tissues back into $V_1$ to be cleared, rapidly reversing paralysis.
*   **Anticholinesterase Reversal & Ceiling Effect (Neostigmine)**:
    Neostigmine inhibits acetylcholinesterase (AChE) to increase synaptic ACh. However, it exhibits a clear ceiling effect at $0.07 - 0.08\text{ mg/kg}$ ($5.0\text{ mg}$ total in adults), corresponding to $100\%$ enzyme inhibition. Higher doses are ineffective at accelerating recovery, and instead cause channel block, causing depolarizing weakness.

#### 5.9 Consciousness, Sleep Stages, Memory, & Processed EEG Engine (`ConsciousnessEngine.ts`)

##### 1. Subcortical Sleep-Wake Nuclei
*   **Locus Ceruleus (LC)**: Noradrenergic wake-promoting core. Active at baseline ($1.0$). Hyperpolarized by dexmedetomidine, propofol, thiopental, halothane, and sleep-active inputs from VLPO and MnPO.
    $$\text{LC}_{\text{target}} = \max\left(0.01, 1.0 - 0.9 \cdot \text{Dex}_{\text{effective}} - 0.5 \cdot \text{Propofol}_{Ce} - 0.4 \cdot \text{Thiopental}_{Ce} - 0.4 \cdot \text{Halo}_{\text{MAC}} + 0.3 \cdot \text{Ketamine}_{Ce} - 0.8 \cdot \text{VLPO} - 0.5 \cdot \text{MnPO}\right)$$
*   **Tuberomammillary Nucleus (TMN)**: Histaminergic wake-promoting center. Inhibited by propofol (unless TMN-propofol resistant comorbidity), thiopental, halothane, VLPO, and MnPO.
    $$\text{TMN}_{\text{target}} = \max\left(0.01, 1.0 - \text{PropEffect}_{\text{TMN}} - 0.7 \cdot \text{Thiopental}_{Ce} - 0.6 \cdot \text{Halo}_{\text{MAC}} - 0.8 \cdot \text{VLPO} - 0.6 \cdot \text{MnPO}\right)$$
*   **Ventrolateral Preoptic Nucleus (VLPO)**: GABA/galanin sleep-active core. Activated by propofol, thiopental, dexmedetomidine, and isoflurane.
*   **Median Preoptic Nucleus (MnPO)**: Sleep-active center located at the rostral end of the third ventricle. Inhibits AAS wake-promoting nuclei, co-mediating sleep induction:
    $$\text{MnPO}_{\text{target}} = \min\left(1.0, 0.75 \cdot \text{Propofol}_{Ce} + 0.6 \cdot \text{Thiopental}_{Ce} + 0.8 \cdot \text{Dex}_{\text{effective}} + 0.4 \cdot \text{Iso}_{\text{MAC}}\right)$$
*   **Orexinergic Neurons (Lateral Hypothalamus)**: Wake-promoting orexin A/B pathway. Inhibited by propofol, sevoflurane, and isoflurane (spared by halothane). A baseline deficiency models narcolepsy. Receptors ($OX_1R$ and $OX_2R$) are competitively blocked by Suvorexant:
    $$\text{Orexin}_{\text{effective}} = \frac{\text{Orexin}_{\text{level}}}{1.0 + \text{Suvorexant}_{Ce} \cdot 5.0}$$

##### 2. Thalamocortical & Cortico-cortical Connectivity
*   **Thalamocortical Connectivity ($TC$)**: Models nonspecific thalamic relay integration. Disrupted by propofol, sevoflurane, isoflurane, and midazolam. Spared/enhanced by ketamine.
    $$TC = \max\left(0, \min\left(1.0, 1.0 - 0.9 \cdot \text{Propofol}_{Ce} - 0.85 \cdot \text{Sevo}_{\text{MAC}} - 0.8 \cdot \text{Iso}_{\text{MAC}} - 0.7 \cdot \text{Midaz}_{Ce} + 0.15 \cdot \text{Ketamine}_{Ce}\right)\right)$$
*   **Frontoparietal Feedback ($FP$)**: Causal top-down feedback connectivity, preferentially disrupted by all anesthetics.
    $$FP = \max\left(0, \min\left(1.0, 1.0 - 0.95 \cdot \text{Propofol}_{Ce} - 0.9 \cdot \text{Sevo}_{\text{MAC}} - 0.85 \cdot \text{Iso}_{\text{MAC}} - 0.85 \cdot \text{Midaz}_{Ce} - 0.8 \cdot \text{Thio}_{Ce} - 0.7 \cdot \text{Ket}_{Ce}\right)\right)$$
*   **Global Corticocortical Coherence ($CC$)**: Derived from top-down connectivity modulated by slow delta-wave power fragmentation.
    $$CC = FP \cdot (1.0 - \min(0.8, \text{soPower} \cdot 0.1))$$

##### 3. Receptor Binding & Memory Decay (Power-Law Model)
*   **Sleep Stage Transition Rules**: Transition probabilities between Wake ($W$), N1, N2, N3 (slow-wave sleep), and R (REM) are driven by the balance of sleep-promoting ($S_{\text{drive}}$) and wake-promoting ($W_{\text{drive}}$) inputs:
    $$\text{Wake Drive } (W_{\text{drive}}) = \frac{LC + TMN + Orexin_{\text{effective}}}{3}$$
    $$\text{Sleep Drive } (S_{\text{drive}}) = \frac{VLPO + MnPO}{2}$$
    - Transition $W \rightarrow N1$ occurs when $S_{\text{drive}} > 0.6$ and $W_{\text{drive}} < 0.4$.
    - Transition $N1 \rightarrow N2$ occurs after $300\text{ seconds}$ in $N1$ (vertex sharp waves resolve to sleep spindles and K-complexes).
    - Transition $N2 \rightarrow N3$ occurs when homeostatic sleep pressure $H_{\text{sleep}} > 0.7$, driving slow wave delta power ($\delta$-power $> 1.5$).
    - Transition $N2 \rightarrow R$ (REM Sleep) occurs when pontine REM-on pathways are disinhibited by low monoaminergic tone (low $LC$ and $TMN$):
      $$P_{\text{REM-on}} = \max(0, 1.0 - LC - TMN)$$
      REM sleep is characterized by marked chin electromyogram atonia ( Chin EMG $\approx 0$), rapid ocular movements, and high heart rate and respiratory rate variability.
*   **Postoperative Sleep Disruption & REM Rebound**:
    - *Night 1*: High postoperative pain, localized tissue inflammation, and surgical stress (elevated cortisol/epinephrine) cause extreme sympathetic drive, suppressing N3 and REM sleep to $<10\%$ of normal baseline.
    - *Night 2-4*: The accumulated sleep debt triggers a massive REM rebound:
      $$\text{REM Rebound Drive } (R_{\text{rebound}}) = 2.5 \cdot \text{sleepDebt}$$
      This leads to prolonged, high-intensity REM sleep episodes in the PACU or ward, predisposing the patient to severe upper airway muscle atonia.
*   **The VLPO-Lesion Paradox**: complete lesions of the VLPO severely fragment sleep but do not prevent general anesthesia, as volatile anesthetics directly suppress the AAS wake nuclei (TMN, LC) and bypass the preoptic flip-flop switch. However, VLPO lesions increase baseline sensitivity to Isoflurane due to pre-existing sleep debt.
*   **Receptor Occupancies**: Models hippocampal $\alpha_5$-GABA_A and dentate/thalamic $\alpha_4$-GABA_A receptor activation driving amnesia (blocked in knockouts).
    $$\text{Occupancy}_{\alpha 5} = \frac{\text{Etomidate}_{\text{effective}} + \text{Iso}_{\text{MAC}}}{K_d + \text{Etomidate}_{\text{effective}} + \text{Iso}_{\text{MAC}}} \quad (K_d = 0.5)$$
*   **Memory Encoding Strength ($\lambda$)**: Encodes new episodic traces. Driven by subcortical arousal levels, and depressed by thiopental, dexmedetomidine, midazolam, propofol, and scopolamine.
    $$\lambda = \max\left(0, \text{Arousal}_{\text{base}} \cdot (1.0 - 0.85 \cdot \text{Thio}_{Ce} - 0.9 \cdot \text{Dex}_{Ce} - 0.75 \cdot \text{Midaz}_{\text{eff}} - 0.25 \cdot \text{Prop}_{Ce} - 0.85 \cdot \text{Scopo}_{Ce})\right)$$
*   **Consolidation Failure Rate ($\psi$)**: Coefficient governing the power law decay of episodic memory ($m(t) = \lambda \cdot t^{-\psi}$). Controlled by GABAA receptor subunits.
    $$\psi = 0.1 + 0.85 \cdot \text{Prop}_{Ce} + 0.8 \cdot \text{Midaz}_{\text{active}} + 0.4 \cdot \text{Sevo}_{\text{MAC}} + 0.4 \cdot \text{Iso}_{\text{MAC}}$$
    *   *LTP Blockade*: If $\alpha_5$ or $\alpha_4$ GABAA activation is high, or propofol concentration is high ($C_e > 0.5$), Long-Term Potentiation is blocked, causing memory decay to accelerate instantly ($\psi \ge 3.5$).

##### 4. Electrophysiology & Processed EEG Metrics
*   **Event-Related Potentials (ERPs)**: Models voltage amplitudes of cortical responses.
    *   *P300 / N2P3*: Depressed dose-dependently by propofol, midazolam, and dexmedetomidine.
    *   *Primary Sensory P1*: Robustly spared ($4.0\text{ }\mu\text{V}$) across all anesthetic levels.
*   **Processed EEG Parameters**:
    *   *BIS (Bispectral Index)*: Approximated dynamically from pathway connectivities.
        $$BIS = \text{bisBase} \cdot \left(1.0 - \frac{BSR}{100}\right) \quad \text{where } \text{bisBase} = 98 \cdot (TC \cdot 0.4 + FP \cdot 0.4 + \text{Arousal}_{\text{sub}} \cdot 0.2)$$
    *   *SEF95 (Spectral Edge Frequency)*: Shifts from baseline wake ($30\text{ Hz}$) down to delta range as connectivity falls:
        $$\text{SEF95} = \max\left(1.0, 30.0 \cdot \left(0.8 \cdot FP + 0.2 \cdot TC\right)\right) \cdot \left(1.0 - \frac{BSR}{100}\right)$$
    *   *BSR (Burst Suppression Ratio)*: Active when MAC or drug concentration is extremely high, representing isoelectric flatline intervals alternating with delta burst waveforms.
        $$BSR = \max\left(0, \min\left(100, \max\left((\text{MAC} - 1.5) \cdot 70, (\text{Prop}_{Ce} - 4.5) \cdot 20\right)\right)\right)$$

#### 5.10 High-Fidelity Medication Data Table

| Drug Name | Class / Type | PK Parameters ($V_1, k_{10}, ke_0$) | PD Parameters ($EC_{50}, \gamma$) | Primary Clinical Effect | Secondary Side Effects |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Propofol** | Sedative / Hypnotic | $V_1: 4.27\text{ L}$<br>$k_{10}: 0.443$<br>$ke_0: 1.2$ | $EC_{50}: 2.5\text{ mcg/mL}$<br>$\gamma: 2.0$ | GABA-A agonist. Triggers deep hypnosis, suppresses BIS to $<40$. | Direct venodilator. Decreases SVR (up to $-40\%$) and MAP. Induces apnea at $C_e \ge 2.5$. |
| **Fentanyl** | Opioid Analgesic | $V_1: 13.0\text{ L}$<br>$k_{10}: 0.05$<br>$ke_0: 0.15$ | $EC_{50}: 0.002\text{ mcg/mL}$<br>$\gamma: 1.5$ | Mu-Opioid agonist. Robust analgesia, blunts laryngoscopy stress response. | Respiratory depressant. Blunts ventilatory drive. Induces apnea at $C_e \ge 0.003$. |
| **Alfentanil** | Opioid Analgesic | $V_1: 7.77\text{ L}$<br>$k_{10}: 0.0458$<br>$ke_0: 0.77$ | $EC_{50}: 0.25\text{ mcg/mL}$<br>$\gamma: 1.5$ | Mu-Opioid agonist. Rapid onset/offset relative to fentanyl due to small $V_1$ and high hepatic extraction (Ch26, Miller's 9th Ed). | Respiratory depressant. Induces apnea at $C_e \ge 0.2$ (Table 26.2 spontaneous-ventilation $C_{50}$ midpoint). |
| **Succinylcholine** | Depolarizing NMB | $V_1: 4.00\text{ L}$<br>$k_{10}: 0.80$<br>$ke_0: 1.6$ | $EC_{50}: 0.8\text{ mcg/mL}$<br>$\gamma: 3.0$ | Nicotinic AChR agonist. Ultra-rapid paralysis. TOF twitches fall to $0/4$ within 45s. | **Upregulated AChR Danger**: Triggers massive hyperkalemic potassium leak and cardiac arrest. |
| **Rocuronium** | Non-Depolarizing NMB | $V_1: 5.50\text{ L}$<br>$k_{10}: 0.09$<br>$ke_0: 0.18$ | $EC_{50}: 1.2\text{ mcg/mL}$<br>$\gamma: 2.5$ | Competitive Nicotinic antagonist. Safe alternative to Sux. TOF twitches to $0/4$ in 90s. | Prolonged paralysis ($C_e > 1.2$ blocks twitches). Reversible with Sugammadex. Weak vagolytic (mild tachycardia, Table 27.10, Ch27). |
| **Mivacurium** | Non-Depolarizing NMB (Short-acting) | $V_1: 8.0\text{ L}$<br>$k_{10}: 0.4$<br>$ke_0: 0.12$ | $EC_{50}: 0.2\text{ mcg/mL}$<br>$\gamma: 4.0$ | Competitive Nicotinic antagonist. Short-acting (Table 27.2, Ch27). Hydrolyzed by plasma butyrylcholinesterase, same enzyme as Succinylcholine (Table 27.1). | Highest histamine-release potency of the benzylisoquinoliniums (mild hypotension/tachycardia). NOT reversible with Sugammadex. |
| **Pancuronium** | Non-Depolarizing NMB (Long-acting) | $V_1: 15.0\text{ L}$<br>$k_{10}: 0.015$<br>$ke_0: 0.05$ | $EC_{50}: 0.4\text{ mcg/mL}$<br>$\gamma: 4.0$ | Competitive Nicotinic antagonist. Long-acting (Table 27.2, Ch27). | Vagolytic: blocks cardiac M2 muscarinic receptors moderately, the strongest tachycardia of any NDMR (Table 27.10). Renally eliminated, accumulates in renal failure. NOT reversible with Sugammadex. |
| **Epinephrine** | Vasopressor / Inotrope | $V_1: 5.00\text{ L}$<br>$k_{10}: 0.90$<br>$ke_0: 2.0$ | $EC_{50}: 0.08\text{ ng/mL}$<br>$\gamma: 1.5$ | $\alpha_1$, $\beta_1$, $\beta_2$ agonist. Profound raise in SVR ($+120\%$) and HR ($+60\%$). | Tachycardia, risks myocardial ischemia under high coronary demand. |
| **Phenylephrine** | Pure Vasopressor | $V_1: 6.00\text{ L}$<br>$k_{10}: 0.30$<br>$ke_0: 0.8$ | $EC_{50}: 0.15\text{ ng/mL}$<br>$\gamma: 1.2$ | Pure $\alpha_1$ agonist. Raises SVR ($+80\%$). Treats vasoplegia. | Reflex bradycardia due to carotid baroreceptor trigger (HR drops up to $-25\%$). |
| **Glycopyrrolate** | Anticholinergic | $V_1: 8.00\text{ L}$<br>$k_{10}: 0.12$<br>$ke_0: 0.4$ | $EC_{50}: 0.5\text{ mcg/mL}$<br>$\gamma: 1.5$ | Muscarinic antagonist. Increases HR, resolves hypoxemic bradycardia. | Mild tachycardia, xerostomia (dry mouth). |
| **Neostigmine** | AChE Inhibitor | $V_1: 20.00\text{ L}$<br>$k_{10}: 0.04$<br>$ke_0: 0.2$ | $EC_{50}: 0.02\text{ mcg/mL}$<br>$\gamma: 2.0$ | AChE inhibitor. Reverses NDMR block by raising synaptic ACh levels. | Muscarinic chronotropic surge (severe bradycardia / salivation) when unopposed. Inhibits BChE. |
| **Edrophonium** | AChE Inhibitor | $V_1: 15.00\text{ L}$<br>$k_{10}: 0.06$<br>$ke_0: 1.5$ | $EC_{50}: 0.25\text{ mcg/mL}$<br>$\gamma: 2.0$ | AChE inhibitor. Ultra-rapid onset ($0.8-2$ min) reversal. | Electrostatic binding. Triggers rapid muscarinic bradycardia. Pairing mismatch with glycopyrrolate. |
| **Pyridostigmine** | AChE Inhibitor | $V_1: 20.00\text{ L}$<br>$k_{10}: 0.02$<br>$ke_0: 0.08$ | $EC_{50}: 0.088\text{ mcg/mL}$<br>$\gamma: 2.0$ | AChE inhibitor. Slow onset ($12-16$ min), long-acting reversal. | Carbamylose covalent binding. Inhibits BChE by 90%. Transient tachycardia with fast anticholinergics. |
| **Calcium Chloride** | Electrolyte | Instant distribution | $EC_{50}: N/A$<br>$\gamma: N/A$ | Myocardial membrane stabilizer. Counteracts potassium hyperkalemia danger. | Negligible at therapeutic doses. |
| **Methylphenidate** | Dopamine Agonist / CNS Stimulant | $V_1: 15.00\text{ L}$<br>$k_{10}: 0.08$<br>$ke_0: 1.0$ | $EC_{50}: 2.0\text{ ng/mL}$<br>$\gamma: 1.5$ | Dopamine/norepinephrine reuptake inhibitor. Reverses/accelerates emergence via VTA activation. | Tachycardia, hypertension (systolic/diastolic elevations). |
| **Atipamezole** | Alpha-2 Antagonist | $V_1: 10.00\text{ L}$<br>$k_{10}: 0.10$<br>$ke_0: 1.0$ | $EC_{50}: 1.0\text{ ng/mL}$<br>$\gamma: 1.0$ | Specific competitive $\alpha_2$ antagonist. Specifically reverses sedation and cardiovascular actions of dexmedetomidine. | Mild tachycardia, transient hypertension. |
| **Scopolamine** | Anticholinergic / Amnestic | $V_1: 15.00\text{ L}$<br>$k_{10}: 0.04$<br>$ke_0: 0.5$ | $EC_{50}: 0.05\text{ ng/mL}$<br>$\gamma: 1.5$ | Muscarinic antagonist. Crosses blood-brain barrier. Induces profound anterograde amnesia. | Mild tachycardia, accelerates hippocampal theta frequency while decreasing power. |
| **Suvorexant** | Dual Orexin Receptor Antagonist | $V_1: 15.00\text{ L}$<br>$k_{10}: 0.08$<br>$ke_0: 1.0$ | $EC_{50}: 2.0\text{ ng/mL}$<br>$\gamma: 1.5$ | Reversibly binds $OX_1R$/$OX_2R$, blocking orexinergic arousal and promoting sleep onset. | Daytime drowsiness, sleep paralysis. Contraindicated in narcolepsy. |
| **Solriamfetol** | Dopamine-Norepinephrine Reuptake Inhibitor | $V_1: 18.00\text{ L}$<br>$k_{10}: 0.05$<br>$ke_0: 1.2$ | $EC_{50}: 4.0\text{ ng/mL}$<br>$\gamma: 1.2$ | Selective DAT/NET inhibitor. Excites VTA/AAS, promoting wakefulness. | Mild tachycardia, hypertension, palpitations. |
| **F6 (Nonimmobilizer)** | Cyclobutane / Nonimmobilizer | $V_1: 10.00\text{ L}$<br>$k_{10}: 0.15$<br>$ke_0: 1.0$ | $EC_{50}: 2.0\text{ vol\%}$<br>$\gamma: 1.5$ | Selective amnesic cyclobutane. Blocks learning/fear memory. | Does NOT cause sedation, hypnosis, or immobility (no effect on MAC). |
| **F3 (Anesthetic)** | Halogenated Cyclobutane | $V_1: 10.00\text{ L}$<br>$k_{10}: 0.10$<br>$ke_0: 0.8$ | $EC_{50}: 1.2\text{ vol\%}$<br>$\gamma: 2.5$ | Volatile anesthetic. Produces immobility, sedation, and amnesia. | Vasodilation, cardiodepression, and respiratory depression. |
| **S-Isoflurane** | Chiral Volatile (Active) | $V_1: 1.40\text{ L}$<br>$k_{10}: 0.08$<br>$ke_0: 0.8$ | $EC_{50}: 0.9\text{ vol\%}$<br>$\gamma: 2.0$ | Active enantiomer of Isoflurane. High-affinity binding to proteins. | More potent vasodilation, bradycardia, and sedation. |
| **R-Isoflurane** | Chiral Volatile (Less Active) | $V_1: 1.40\text{ L}$<br>$k_{10}: 0.08$<br>$ke_0: 0.8$ | $EC_{50}: 1.8\text{ vol\%}$<br>$\gamma: 2.0$ | Less active enantiomer of Isoflurane. Lower-affinity protein binding. | Requires twice the dose of S-enantiomer for same clinical effect. |
| **Xenon** | Gaseous Anesthetic | $V_1: 5.00\text{ L}$<br>$k_{10}: 0.80$<br>$ke_0: 1.5$ | $EC_{50}: 63-71\text{ vol\%}$<br>$\gamma: 2.5$ | NMDA antagonist. Fast wash-in/wash-out due to low blood-gas partition coefficient ($0.115$). | High viscosity and density increase airway resistance. Depresses spontaneous respiratory rate. Does not blunt HVR or inhibit HPV. |
| **Atracurium** | Non-Depolarizing NMB | $V_1: 10.0\text{ L}$<br>$k_{10}: 0.08$<br>$ke_0: 0.12$ | $EC_{50}: 0.4\text{ mcg/mL}$<br>$\gamma: 4.0$ | Competitive postsynaptic Nicotinic antagonist. Intermediate block duration. Cleared by Hofmann elimination. | Generates active metabolite laudanosine (30% of cleared dose), which clears renal/hepatic and triggers seizures in organ failure. |
| **Gantacurium** | Non-Depolarizing NMB | $V_1: 8.0\text{ L}$<br>$k_{10}: 0.12$<br>$ke_0: 0.18$ | $EC_{50}: 0.2\text{ mcg/mL}$<br>$\gamma: 4.0$ | Ultrashort-acting asymmetric mixed-onium chlorofumarate. Rapid paralysis onset. Reversed by L-cysteine adduction. | Minimal. High density increases airway resistance when given with Xenon. |
| **CW002** | Non-Depolarizing NMB | $V_1: 10.0\text{ L}$<br>$k_{10}: 0.06$<br>$ke_0: 0.10$ | $EC_{50}: 0.15\text{ mcg/mL}$<br>$\gamma: 4.0$ | Intermediate-acting asymmetric fumarate NDMR. Reversed immediately by L-cysteine. | Extremely clean safety profile. |
| **L-Cysteine** | Specific Reversal Agent | $V_1: 15.0\text{ L}$<br>$k_{10}: 0.10$<br>$ke_0: 1.0$ | $EC_{50}: 0.5\text{ mcg/mL}$<br>$\gamma: 1.0$ | Specific chemical rescue reversal agent. Covalently adducts to fumarate double bond of gantacurium/CW002. | Endogenous amino acid. High safety margin. |
| **Bupivacaine** | Local Anesthetic | $V_1: 10.0\text{ L}$<br>$k_{10}: 0.015$<br>$ke_0: 0.1$ | $EC_{50}: 0.3\text{ mcg/mL}$<br>$\gamma: 2.0$ | Amide local anesthetic. Blocks voltage-gated sodium channels. Highly lipid soluble. | Profound cardiotoxicity ($T_{\text{CV}}$) due to slow cardiac sodium channel dissociation. |
| **Ropivacaine** | Local Anesthetic | $V_1: 12.0\text{ L}$<br>$k_{10}: 0.02$<br>$ke_0: 0.15$ | $EC_{50}: 0.4\text{ mcg/mL}$<br>$\gamma: 2.0$ | Pure S-enantiomer. Blocks voltage-gated sodium channels. Reduced cardiotoxicity. | Lower lipid solubility than bupivacaine. Transient vasoconstriction. |
| **Levobupivacaine** | Local Anesthetic | $V_1: 10.0\text{ L}$<br>$k_{10}: 0.018$<br>$ke_0: 0.12$ | $EC_{50}: 0.33\text{ mcg/mL}$<br>$\gamma: 2.0$ | Pure S-enantiomer of bupivacaine. Blocks sodium channels with reduced cardiotoxicity. | Moderately high cardiotoxicity compared to ropivacaine, but safer than racemic bupivacaine. |
| **Cocaine** | Local Anesthetic | $V_1: 15.0\text{ L}$<br>$k_{10}: 0.04$<br>$ke_0: 0.8$ | $EC_{50}: 0.1\text{ mcg/mL}$<br>$\gamma: 1.5$ | Ester local anesthetic. Blocks sodium channels and inhibits NET catecholamine reuptake. | Sympathomimetic surge (marked hypertension, tachycardia, vasoconstriction, coronary vasospasm). |
| **Tetracaine** | Local Anesthetic | $V_1: 20.0\text{ L}$<br>$k_{10}: 0.02$<br>$ke_0: 0.3$ | $EC_{50}: 0.5\text{ mcg/mL}$<br>$\gamma: 2.0$ | Ester local anesthetic. High lipid solubility, long duration. Used topically/spinally. | Elevated systemic absorption risks LAST cardiotoxicity. |
| **Chloroprocaine** | Local Anesthetic | $V_1: 25.0\text{ L}$<br>$k_{10}: 2.0$<br>$ke_0: 2.0$ | $EC_{50}: 2.0\text{ mcg/mL}$<br>$\gamma: 1.5$ | Ester local anesthetic. Rapidly hydrolyzed by plasma pseudocholinesterase. | Short duration. Extremely low systemic toxicity risk due to fast clearance. |
| **Benzocaine** | Local Anesthetic | $V_1: 25.0\text{ L}$<br>$k_{10}: 0.05$<br>$ke_0: 1.0$ | $EC_{50}: 2.0\text{ mcg/mL}$<br>$\gamma: 1.5$ | Ester local anesthetic. Used topically for mucous membranes. Low pKa, uncharged base. | Methemoglobinemia risk via active metabolite o-toluidine oxidation of hemoglobin. |
| **Prilocaine** | Local Anesthetic | $V_1: 15.0\text{ L}$<br>$k_{10}: 0.03$<br>$ke_0: 0.5$ | $EC_{50}: 2.0\text{ mcg/mL}$<br>$\gamma: 1.5$ | Amide local anesthetic. Moderate lipid solubility. | Methemoglobinemia risk. Active metabolite o-toluidine causes oxidative hemoglobin damage. |
| **Mepivacaine** | Local Anesthetic | $V_1: 22.0\text{ L}$<br>$k_{10}: 0.06$<br>$ke_0: 0.6$ | $EC_{50}: 1.1\text{ mcg/mL}$<br>$\gamma: 1.5$ | Amide local anesthetic, intermediate potency/duration (Table 29.2, Ch29: 1.5x Procaine's conduction-blocking potency, pKa 7.7). Commonly used for peripheral nerve blocks and dental/infiltration anesthesia. | LAST cardiotoxicity risk by analogy to Lidocaine (CC/CNS ratio 7.0, same intermediate-potency class). |
| **Intralipid 20%** | Rescue Agent | $V_1: 10.0\text{ L}$<br>$k_{10}: 0.03$<br>$ke_0: 1.0$ | $EC_{50}: 1.0\text{ mg/mL}$<br>$\gamma: 1.0$ | Lipid emulsion. Sequesters lipophilic drugs ("lipid sink") to rescue from LAST. | Transient hyperlipidemia, lipemic plasma interference with lab analysis. |
| **Methylene Blue** | Rescue Agent | $V_1: 15.0\text{ L}$<br>$k_{10}: 0.05$<br>$ke_0: 1.0$ | $EC_{50}: 1.0\text{ mcg/mL}$<br>$\gamma: 1.0$ | Electron donor. Reductant that converts Methemoglobin (Fe3+) back to Hemoglobin (Fe2+). | Serotonin syndrome risk in patients on SSRIs due to MAO-A inhibition. |
| **Dantrolene** | Muscle Relaxant / MH Treatment | $V_1: 15.0\text{ L}$<br>$k_{10}: 0.00115$<br>$ke_0: 0.1$ | $EC_{50}: 1.5\text{ mcg/mL}$<br>$\gamma: 2.0$ | Ryanodine receptor 1 (RyR1) antagonist. Restores calcium homeostasis to abort Malignant Hyperthermia crisis. | Directly causes muscle weakness (increases NMJ block occupancy). Avoid co-administration with CCBs. |

#### 5.11 High-Fidelity Inhalational Gas Kinetics & Multi-Gas Interactions

*   **Solubility and Partition Coefficients**:
    The simulator uses agent-specific blood-gas ($\lambda_{bg}$) and oil-gas ($\lambda_{og}$) partition coefficients to model pharmacokinetic distribution. The fat-blood partition coefficient ($\lambda_{fg}$) and other tissue-blood coefficients are used to calculate tissue time constants ($	au = V_{	ext{eff}} / \dot{Q}$), representing the duration required for tissue equilibration (Table 20.2):

    | Anesthetic Agent | Blood/Gas ($\lambda_{bg}$) | Oil/Gas ($\lambda_{og}$) | Brain/Blood ($\lambda_{	ext{brain}/b}$) | Muscle/Blood ($\lambda_{	ext{muscle}/b}$) | Fat/Blood ($\lambda_{	ext{fat}/b}$) | Vessel-Poor/Blood ($\lambda_{	ext{vpt}/b}$) |
    | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
    | **Nitrous Oxide** | $0.47$ | $1.3$ | $1.1$ | $1.2$ | $2.3$ | $1.4$ |
    | **Halothane** | $2.50$ | $197.0$ | $2.7$ | $2.5$ | $65.0$ | $2.3$ |
    | **Methoxyflurane** | $12.00$ | $950.0$ | $2.0$ | $1.6$ | $76.0$ | $1.2$ |
    | **Enflurane** | $1.90$ | $98.5$ | $1.4$ | $1.7$ | $36.0$ | $2.0$ |
    | **Isoflurane** | $1.40$ | $90.8$ | $1.5$ | $2.9$ | $45.0$ | $2.0$ |
    | **Desflurane** | $0.45$ | $19.0$ | $1.3$ | $2.0$ | $27.0$ | $2.0$ |
    | **Sevoflurane** | $0.65$ | $47.0$ | $1.7$ | $3.1$ | $48.0$ | $2.0$ |
    | **Xenon** | $0.14$ | $1.9$ | $1.2$ | $1.2$ | $16.5$ | $1.2$ |

    *(Table corrected against the chapter's raw extracted data, Ch20 — the Muscle/Blood column previously contained transcription errors for Halothane, Methoxyflurane, and Enflurane; N2O's Oil/Gas and VPT/Blood values were also corrected. `GasKineticsEngine.ts`'s muscle compartment (`lambda_mg`) is now sourced per-agent from this Muscle/Blood column via `muscleBgPartition` in `Pharmacology.js`, replacing a previous flat $1.5$ constant applied to every agent regardless of its actual muscle solubility.)*

*   **Vaporizer Output & Circuit Wash-in Kinetics**:
    Anesthetic gas wash-in replaces the volume of the breathing circuit ($V_{	ext{circ}}$) with fresh gas flow ($FGF$) from the vaporizer. Vaporizer output delivery (in L/min of gas-phase agent) is:
    $$V_{	ext{del}} = P_{	ext{del}} \cdot FGF$$
    The rate of change of circuit anesthetic partial pressure ($P_{	ext{circ}}$) is:
    $$rac{dP_{	ext{circ}}}{dt} = rac{FGF}{V_{	ext{circ}}} \cdot (P_{	ext{del}} - P_{	ext{circ}})$$
    Assuming constant $P_{	ext{del}}$, integrating yields:
    $$P_{	ext{circ}}(t) = P_{	ext{circ}}(0) + (P_{	ext{del}} - P_{	ext{circ}}(0)) \cdot \left(1 - e^{-t / 	au}
ight) \quad 	ext{where } 	au = rac{V_{	ext{circ}}}{FGF}$$
    *Adsorption Correction*: Circuit tubing and CO2 absorbents absorb volatile anesthetics dose-dependently, increasing the effective circuit volume:
    $$V_{	ext{circ, effective}} = V_{	ext{circ}} + k_{	ext{adsorption}} \cdot \lambda_{og}$$

*   **Circuit and Alveolar Ventilation Equilibration**:
    Rebreathing of expired gases depends on the balance between $FGF$ and minute ventilation ($MV$):
    $$rac{dP_{	ext{circ}}}{dt} = rac{FGF}{V_{	ext{circ}}} \cdot (P_{	ext{del}} - P_{	ext{circ}}) - rac{MV}{V_{	ext{pulm}}} \cdot (P_{	ext{circ}} - P_{	ext{pulm}})$$
    Alveolar concentration ($F_A$ or $P_{	ext{alv}}$) exchange across the alveolar-capillary membrane is driven by ventilation delivery and uptake into pulmonary blood flow ($\dot{Q}$):
    $$rac{dPa_{	ext{alv}}}{dt} = rac{\dot{V}_A}{V_{	ext{alv}}} \cdot (P_{	ext{circ}} - P_{	ext{alv}}) - rac{\dot{Q} \cdot \lambda_{bg}}{V_{	ext{alv}}} \cdot (P_{	ext{alv}} - P_{	ext{MV}})$$
    where $\dot{V}_A$ is alveolar ventilation, $V_{	ext{alv}}$ is alveolar lung volume (FRC), and $P_{	ext{MV}}$ is mixed venous partial pressure.

*   **Concentration and Second Gas Effects (Gas Shrinkage)**:
    When a highly soluble gaseous agent (like Nitrous Oxide, $N_2O$) is administered in high concentrations ($50-70\%$), its rapid uptake into pulmonary capillary blood shrinks the remaining alveolar gas volume. This concentrates co-administered gases (such as Oxygen and volatile anesthetics), accelerating their alveolar rate of rise and uptake (the second gas effect):
    $$	ext{dFa}_j = rac{\dot{V}_A \cdot (F_{I,j} - F_{A,j}) - 	ext{Uptake}_j + \left(\sum_k 	ext{Uptake}_k
ight) \cdot F_{I,j}}{V_{FRC}}$$
    where $\sum_k 	ext{Uptake}_k$ represents the sum of the volumetric uptake rates of all active gases (specifically $N_2O$ uptake drawing circuit gas into the lungs).

*   **Ventilation-Perfusion (V/Q) Mismatches & Shunt**:
    A right-to-left pulmonary shunt bypasses gas exchange. Arterial partial pressure ($P_{	ext{art}}$) represents a mixture of equilibrated capillary blood and shunted mixed venous blood ($P_{	ext{MV}}$):
    $$P_{	ext{art}} = P_{	ext{MV}} \cdot 	ext{shunt} + P_{	ext{alv}} \cdot (1 - 	ext{shunt})$$
    Right-to-left shunting reduces transcapillary gas exchange, slowing alveolar uptake and maintaining higher circuit concentrations. The dilution effect on $P_{	ext{art}}$ relative to $P_{	ext{alv}}$ is more pronounced for insoluble agents ($N_2O$, desflurane) than for soluble agents (halothane, methoxyflurane).

*   **Washout Kinetics & Diffusion Hypoxia (Fink Effect)**:
    Upon discontinuation of Nitrous Oxide, the low blood solubility and large volume of dissolved $N_2O$ in tissues causes it to rapidly diffuse out of pulmonary capillaries back into the alveoli ($	ext{Uptake}_{N2O} < 0$). This dilutes alveolar oxygen ($PAO_2$) and carbon dioxide ($PACO_2$):
    $$	ext{O2Buffer} -= \left(rac{	ext{O2Buffer}}{FRC_{	ext{recruited}}}
ight) \cdot (-	ext{Uptake}_{N_2O}) \cdot dt$$
    If the patient is breathing room air ($FiO_2 = 21\%$), this alveolar oxygen dilution reduces $PaO_2$, causing arterial hypoxemia and desaturation ($SpO_2 < 90\%$). This fink effect is mitigated by administering $100\%$ oxygen during washout.
    *Context-Sensitive Half-Times*: Emergence rates are context-sensitive. Long anesthetic exposures saturate muscle and fat reservoirs, causing volatile agents to diffuse back into circulation for extended periods, slowing recovery.

#### 5.12 Molecular Mechanisms of Inhalational Anesthetics

The pharmacology of inhaled anesthetics is governed by direct binding to specific hydrophobic and amphiphilic cavities in critical neuronal signaling proteins, rather than non-specific lipid membrane disruptions. This is demonstrated by the enantiomeric stereoselectivity of chiral anesthetics (e.g. S-isoflurane being twice as potent as R-isoflurane) and the distinct receptor profiles of nonimmobilizers like F6.

1.  **GABA-A Receptor Potentiation (Sedation, Hypnosis, and Amnesia)**:
    Volatile anesthetics (Isoflurane, Sevoflurane, Desflurane, Halothane) directly potentiate $\gamma$-aminobutyric acid type A ($GABA_A$) receptors:
    - *Synaptic IPSC Prolongation*: Slows the decay rate of inhibitory postsynaptic currents (IPSCs), prolonging synaptic inhibition.
    - *Extrasynaptic Tone*: Enhances tonic currents at extrasynaptic GABA-A receptors, hyperpolarizing resting potentials.
    - *Subtype Specialization*: $lpha_1$-containing subtypes mediate sedation and hypnosis (unconsciousness), while $lpha_5$ (hippocampus) and $lpha_4$ (dentate gyrus/thalamus) mediate amnesia.
    - *Gaseous Exceptions*: Nitrous oxide and Xenon do NOT modulate GABA-A receptors.

2.  **Glycine Receptor Potentiation (Immobility)**:
    Volatile anesthetics enhance glycine receptors postsynaptically in the spinal cord. Potentiation of glycine receptors containing the $lpha_1$-subunit suppresses motor efferent outputs from the ventral horn (nocifensive withdrawal reflex arc), mediating the immobility component of anesthesia (measured by MAC).

3.  **Two-Pore-Domain Potassium Channel (K2P) Activation (Hyperpolarization)**:
    Both volatile and gaseous agents directly activate leak potassium channels ($K_{2P}$), specifically the TASK-1, TASK-3, and TREK-1 subfamilies. This increases $K^+$ conductance, hyperpolarizing resting membrane potentials and reducing neuronal excitability. TASK-3 channels are required for halothane-induced EEG theta rhythm slowing, and TREK-1 activation mediates neuroprotective preconditioning during ischemic insult.

4.  **Glutamate Receptor Inhibition (Excitatory Suppression)**:
    Anesthetics suppress excitatory glutamatergic transmission:
    - *NMDA Blockade*: Gaseous anesthetics (Nitrous oxide and Xenon) are potent antagonists of N-methyl-D-aspartate ($NMDA$) receptors. They compete with co-agonists (Glycine at the GluN1 site and Glutamate at the GluN2 site) to block calcium influx. Volatiles also inhibit NMDA receptors at clinical concentrations.
    - *AMPA/Kainate Receptors*: Volatiles weakly inhibit $lpha$-amino-3-hydroxy-5-methyl-4-isoxazolepropionic acid ($AMPA$) receptors.
    - *Presynaptic Release*: Volatiles reduce presynaptic glutamate release from excitatory terminals by blocking presynaptic voltage-gated sodium and calcium channels.

5.  **HCN Pacemaker Current Inhibition (Integrative Functions)**:
    Volatiles inhibit hyperpolarization-activated cyclic nucleotide-gated ($HCN1$ and $HCN2$) channels, reducing the hyperpolarization-activated pacemaker current ($I_h$). This slows spontaneous neuronal firing and dendritic integration.

6.  **Voltage-Gated Sodium Channel Blockade (Presynaptic Release)**:
    Volatiles inhibit major mammalian voltage-gated sodium channel ($Na^+$) isoforms, including neuronal ($Nav1.2$, $Nav1.6$) and presynaptic terminal sodium channels. This blockade reduces the amplitude of action potentials arriving at synaptic terminals, suppressing presynaptic calcium influx and subsequent neurotransmitter release.

7.  **Nicotinic Acetylcholine Receptor Blockade (Amnesia)**:
    Neuronal nicotinic acetylcholine receptors ($nnAChR$, specifically the $lpha_4eta_2$ and $lpha_7$ pentamers) are highly sensitive to volatiles, being inhibited at sub-MAC concentrations ($<0.25	ext{ MAC}$), contributing to anterograde amnesia.

8.  **Receptor Profile Discrimination: F6 vs. F3**:
    - **F6 (1,2-dichlorohexafluorocyclobutane)**: An amnestic nonimmobilizer. It does NOT produce immobility or sedation (does not affect MAC, does not affect GABA-A, glycine, or Na+ channels), but it DOES produce amnesia by selectively inhibiting neuronal nicotinic, M1 muscarinic, 5-HT2C, and mGluR5 receptors.
    - **F3 (1-chloro-1,2,2-trifluorocyclobutane)**: A volatile anesthetic. It produces immobility, sedation, and amnesia by modulating GABA-A, glycine, AMPA, kainate, 5-HT3, nicotinic, and Na+ channels.

#### 5.13 Inhaled Anesthetic Metabolism & Toxicities

*   **CYP-Mediated Hepatic Biotransformation**:
    Volatile anesthetics undergo hepatic clearance primarily via cytochrome P450 enzymes in the endoplasmic reticulum of hepatocytes. The major oxidative enzyme is the **CYP2E1** isoform (inducible by ethanol and isoniazid; inhibited by disulfiram and hepatic disease). Under hypoxic conditions, cytochromes CYP2A6 and CYP3A4 can catalyze reductive dechlorination/defluorination pathways.

    *Metabolism Extents*: Methoxyflurane ($70\%$) > Halothane ($25\%$) > Sevoflurane ($2-5\%$) > Enflurane ($2.5\%$) > Isoflurane ($0.2\%$) > Desflurane ($0.02\%$) > Nitrous Oxide/Xenon ($0\%$).

*   **Halothane Hepatotoxicity**:
    1.  *Subclinical Hepatotoxicity*: Occurs in $20\%$ of adult patients, characterized by transient, reversible elevations in transaminases (ALT/AST). It is mediated by anaerobic reductive metabolism of halothane via CYP2A6, yielding a reactive 2-chloro-1,1,1-trifluoroethyl radical that causes lipid peroxidation.
    2.  *Fulminant Halothane Hepatitis*: Rare (1:20,000 administrations) but fatal in $50-75\%$ of cases. It is caused by an immune-mediated hypersensitivity reaction. CYP2E1-mediated oxidative metabolism of halothane produces a highly reactive intermediate, **trifluoroacetyl chloride (TFA-Cl)**. TFA-Cl covalently binds to hepatocellular proteins, forming **trifluoroacetylated neoantigens (neohaptens)**. In genetically susceptible individuals, subsequent exposure triggers a cytotoxic T-cell response against hepatocytes, causing massive hepatic necrosis.
    3.  *Cross-Sensitization*: Enflurane, isoflurane, and desflurane also oxidize to form TFA intermediates that can acylate proteins (halothane $\gg$ enflurane $>$ isoflurane $>$ desflurane). Prior exposure can sensitize patients, leading to cross-reactive hepatic necrosis upon subsequent volatile anesthetic exposure. Sevoflurane forms a stable hexafluoroisopropanol intermediate and does not form TFA adducts.

*   **Fluoride-Associated Nephrotoxicity**:
    Oxidative metabolism of fluorinated ether anesthetics releases inorganic fluoride ($F^-$) ions.
    1.  *Methoxyflurane Nephrotoxicity*: Methoxyflurane is metabolized extensively ($70\%$), releasing high concentrations of inorganic fluoride. Serum fluoride levels exceeding the nephrotoxic threshold of **$50	ext{ }\mu	ext{M}$** lead to polyuric (high-output) renal failure. Factors enhancing its nephrotoxicity include high tissue solubility (fat reservoir prolongation), slow clearance, and extensive intrarenal defluorination by renal CYPs, causing high local fluoride levels in the renal parenchyma.
    2.  *Sevoflurane Defluorination*: Sevoflurane undergoes $2-5\%$ defluorination via CYP2E1. Although peak blood fluoride levels can exceed $50	ext{ }\mu	ext{M}$ during prolonged cases, it is NOT associated with nephrotoxicity. This is because of rapid pulmonary clearance (low solubility) and extremely low renal **\(eta\)-lyase** activity in humans compared to rodents.

*   **Carbon Dioxide Absorbent Chemical Degradation**:
    1.  *Sevoflurane & Compound A*: In the presence of strong bases (NaOH, KOH) in soda lime or Baralyme, sevoflurane undergoes proton extraction from its isopropyl group, forming a volatile haloalkene: **Compound A**.
        - *Nephrotoxicity*: Compound A is nephrotoxic in rodents, causing proximal tubular necrosis above a cumulative exposure of $150	ext{ ppm-hours}$. In rats, Compound A is metabolized via glutathione conjugation in the liver, followed by renal **\(eta\)-lyase** degradation to form a highly reactive thionoacyl fluoride that acylates tubular proteins.
        - *Human Safety*: Humans have very low renal \(eta\)-lyase activity, preventing thionoacyl fluoride formation. Extensive clinical studies show no nephrotoxicity in humans. Compound A production is minimized by maintaining fresh gas flows $\ge 2	ext{ L/min}$ and avoiding KOH-containing absorbents.
    2.  *Carbon Monoxide (CO) Production*: In desiccated CO2 absorbents (water content $<1.4\%$ for soda lime, $<5\%$ for Baralyme), volatile anesthetics containing a difluoromethyl group (Desflurane $>$ Enflurane $>$ Isoflurane) undergo degradation, releasing carbon monoxide (CO).
        - CO binds to hemoglobin with 250-fold higher affinity than $O_2$, forming **carboxyhemoglobin (COHb)** and causing severe cellular hypoxia. Standard pulse oximeters cannot distinguish COHb from oxyhemoglobin, masking the hypoxemia.
    3.  *Exothermic Canister Reactions*: Sevoflurane degradation on desiccated absorbents is highly exothermic. Canister temperatures can exceed $80^{\circ}	ext{C}$, creating risks of breathing circuit melting, explosions, and airway fires. This is prevented by using newer absorbents (e.g., Amsorb) that lack strong bases (NaOH, KOH).

*   **Nitrous Oxide, Vitamin B12, and Homocysteine**:
    Nitrous oxide ($N_2O$) irreversibly oxidizes the monovalent cobalt ($Co(I)$) cofactor of cobalamin (Vitamin B12) to the inactive trivalent state ($Co(III)$).
    - *Methionine Synthase Shutdown*: Cobalamin is an essential cofactor for **methionine synthase**, which converts homocysteine to methionine (Fig 20.21). Methionine is converted to S-adenosylmethionine, the primary methyl donor for DNA, RNA, myelin sheath, and catecholamine synthesis.
    - *Hyperhomocysteinemia*: Inactivation of methionine synthase leads to an accumulation of homocysteine in blood. Elevated homocysteine induces vascular endothelial inflammation and hypercoagulability, increasing the risk of coronary and cerebral thrombosis.
    - *Neurological & Hematological Injury*: In patients with baseline B12 deficiency (pernicious anemia, malabsorption, malnutrition, strict vegetarianism) or genetic mutations in **methyltetrahydrofolate reductase (MTHFR)**, $N_2O$ exposure causes rapid toxicity. Prolonged exposure ($>12$ hours) or repeated recreational abuse causes megaloblastic bone marrow changes, myelopathy (**subacute combined degeneration** of the spinal cord), and peripheral neuropathy.

#### 5.14 Inhaled Anesthetics, Environmental Effects, & Long-Term Neurocognition

*   **Global Warming Potential (GWP) & Ozone Depletion**:
    Inhaled anesthetics are greenhouse gases that are excreted unchanged into the atmosphere via waste gas scavenging systems:
    - *Global Warming Potential (GWP)*: Integrated radiative heat retention relative to Carbon Dioxide ($CO_2 = 1$). Nitrous Oxide has a $GWP_{100}$ of $298$ and an atmospheric lifetime of $114$ years. Volatile agents have high GWPs: Isoflurane $350$, Sevoflurane $575$, and Desflurane $3714$ (highly greenhouse-active, lifetime $10$ years).
    - *Ozone Depletion Potential (ODP)*: Chlorine-containing agents (Halothane, Enflurane, Isoflurane) undergo photolysis in the stratosphere, releasing chlorine radicals that catalytically destroy ozone. Halothane has an ODP of $0.36$. Desflurane and Sevoflurane contain only fluorine and have an ODP of $0$.
    - *Mitigation*: Environmental impact is reduced by using low fresh gas flows ($<1	ext{ L/min}$), avoiding desflurane and $N_2O$, and using cryogenic waste gas traps to condense, reclaim, and recycle agents.

*   **Pediatric Anesthetic Neurotoxicity**:
    Exposure of general anesthetics (both GABA-A agonists and NMDA antagonists) in developing animal models (including nonhuman primates) during peak synaptogenesis alters neural circuit formation and triggers widespread neuronal apoptosis.
    - *Clinical Correlation*: Clinical studies (PANDA, GAS trials) show that a single brief exposure ($<1$ hour) before age 3 does not produce detectable neurocognitive deficits. However, repeated or lengthy exposures ($>3-4$ hours) are associated with small but detectable neurocognitive deficits.

*   **Postoperative Cognitive Decline (POCD) in Elderly**:
    POCD is characterized by persistent memory impairment, attention deficits, and cognitive decline in elderly patients weeks to months after anesthesia and surgery. Its pathogenesis is multifactorial, involving anesthetic-induced neuroinflammation, blood-brain barrier disruption, micro-embolization, and postoperative sleep disturbances.

#### 5.15 Intravenous Anesthetics: Sedative-Hypnotic Receptor Profiles
The simulator integrates the comparative pharmacodynamics and receptor-level interactions of intravenous sedatives, hypnotics, and adjuvants.

*   **Propofol & Etomidate (GABA-A Beta-2/3 Subtypes)**:
    - *Mechanism*: Directly bind and potentiate GABA-A receptors, primarily those containing $\beta_2$ or $\beta_3$ subunits, which mediate clinical sedation, hypnosis, and EEG slowing.
    - *Adrenal Side Effects*: Etomidate selectively inhibits the enzyme 11-$\beta$-hydroxylase, completely shutting down cortisol synthesis even after a single induction dose.
    - *PRIS Pathophysiology*: Propofol Infusion Syndrome (PRIS) is triggered by high-dose propofol ($>67\text{ mcg/kg/min}$) over prolonged periods, leading to mitochondrial respiratory chain failure, lactic acidosis, rhabdomyolysis, hyperkalemia, lipemic plasma, and progressive myocardial stunning.

*   **Dexmedetomidine (Alpha-2 Adrenergic Receptors)**:
    - *Mechanism*: High affinity selective $\alpha_2$-adrenoceptor agonist. Acts on pre-synaptic receptors in the locus coeruleus (LC) to decrease noradrenaline release, inducing a natural-like NREM sleep state (sparing respiratory drive).
    - *Reversal*: Atipamezole acts as a competitive antagonist, rapidly reversing LC suppression and restoring wakefulness.

*   **Ketamine (NMDA Receptor Blockade)**:
    - *Mechanism*: Non-competitive antagonist of N-methyl-D-aspartate (NMDA) receptors. Restricts excitatory glutamate neurotransmission, producing dissociative anesthesia and analgesia.
    - *Washout Agitation*: Rapid clearance can lead to emergence delirium and intense psychotomimetic surges, characterized by tachycardia, hypertension, and sialorrhea.
    - *Esketamine (S(+)-Isomer)*: "The S(+)-isomer (Ketanest) is 3 to 4 times more potent as an analgesic with a faster clearance and recovery and with fewer psychomimetic side effects" (Ch23, Miller's 9th Ed). Modeled as a distinct medication (`esketamine` in `Pharmacology.js`) with $c_{50} = c_{50,\text{ketamine}} / 3.5$ (midpoint of the cited 3-4x range); PK compartment volumes/rate constants are kept identical to racemic ketamine since the source does not quantify "faster clearance" with a specific number. Its $C_e$ is converted to a racemic-ketamine-equivalent concentration ($\times 3.5$) wherever it must be pooled with racemic ketamine's $C_e$ for shared downstream effects (NMDA/CMRO2 contribution in `CerebralEngine.ts`, emergence-delirium/norketamine thresholds in `usePhysiology.js`, sedative-detection in `AttendingEngine.js`); its own dedicated analgesic effect in `PainEngine.ts` uses its own potency-scaled $c_{50}$ directly and is merged with racemic ketamine's analgesia via the same independent-probability combination already used for opioids.

*   **Benzodiazepines (GABA-A Alpha-Subtypes & Reversal)**:
    - *Mechanism*: Positive allosteric modulators that bind to the interface of $\alpha$ and $\gamma$ subunits on GABA-A receptors.
    - *Reversal*: Flumazenil acts as a competitive antagonist. In patients with chronic benzodiazepine dependence, rapid flumazenil administration triggers severe withdrawal seizures.

*   **Barbiturates (Thiopental & Methohexital)**:
    - *Mechanism*: Bind to distinct sites on GABA-A receptors, prolonging channel open state. At high doses, they directly activate the channel, causing profound cerebral metabolic rate depression (burst suppression) and cardiovascular vasodilation.
    - *Intra-arterial Crystal Precipitation*: Barbiturate solutions are highly alkaline (pH 10.5). If injected into an arterial line, contact with blood triggers immediate acid-base precipitation, forming micro-crystals that occlude microvasculature, triggering severe chemical endarteritis, intense spasm, and distal limb gangrene. Papaverine (direct vasodilator) or Lidocaine can reverse this spasm.

#### 5.16 Active Metabolites Kinetics: 1-Hydroxymidazolam & Norketamine
Active metabolites of intravenous anesthetics are cleared by distinct metabolic routes:
- **1-Hydroxymidazolam**: Midazolam undergoes hepatic CYP3A4/5 metabolism to 1-hydroxymidazolam. This metabolite retains significant sedative potency ($60-80\%$ of parent) and is cleared exclusively by renal excretion (glucuronidated to 1-hydroxymidazolam glucuronide). In renal impairment, this active metabolite accumulates, causing prolonged, refractory sedation.
- **Norketamine**: Ketamine is metabolized by CYP2B6/3A4 to norketamine, which retains $20-30\%$ of parent anesthetic potency and undergoes hepatic elimination. Esketamine contributes to the same norketamine pool via its racemic-equivalent $C_e$ (§5.15).

#### 5.17 Opioid Physiology & Pharmacodynamics
Opioids selectively bind to G-protein coupled Mu-opioid receptors ($\mu_1, \mu_2$), triggering Gi-protein activation, inhibition of adenylate cyclase, decreased intracellular cAMP, closing of voltage-gated calcium channels, and opening of inward-rectifying potassium channels. This hyperpolarizes neurons, suppressing nociceptive transmission.
*   **Genotype Sensitivity (A118G Exon 1 SNP)**: Patients heterozygous or homozygous for the A118G allele exhibit significantly reduced analgesic/hypnosis sensitivity to mu-opioid receptor agonists (e.g., Morphine). This is modeled by scaling the analgesia/hypnosis $C_{50}$ by $3.0\times$ (i.e., $C_{50,\text{A118G}} = 3.0 \cdot C_{50,\text{wildtype}}$) when `opioidReceptorGenotype` is `'A118G'`. Crucially, respiratory depression sensitivity remains identical to wildtype (`'A118A'`), separating the therapeutic window (Ch24, Miller's 9th Ed, p.726).
*   **Morphine Active Metabolites (M3G/M6G)**: Morphine undergoes hepatic glucuronidation (via UGT2B7) into Morphine-6-Glucuronide (M6G, 10% yield) and Morphine-3-Glucuronide (M3G, 60% yield). M6G is an active mu-receptor agonist that causes respiratory depression, competitively antagonized by Naloxone ($K_i = 0.001\text{ mg/L}$). M3G is neuroexcitatory, causing seizures that are aborted by GABA-A agonists (Propofol or Midazolam). Both metabolites accumulate in renal failure and are cleared proportionally to the patient's `renalRatio` ($Cl_{\text{metabolite}} = Cl_{\text{baseline}} \cdot \text{renalRatio}$) (Ch24, Miller's 9th Ed, p.728).
*   **Respiratory Depression**: Opioids depress the hypercapnic and hypoxic ventilatory response curves by acting directly on Mu receptors in the pre-Bötzinger complex.
*   **Chest Wall Rigidity**: High doses or rapid administration of lipophilic agonists (Fentanyl, Remifentanil, Sufentanil) lock the chest wall, creating severe apnea, compliance drops to $3\text{ mL/cmH2O}$, and airway resistance of $999\text{ cmH2O/L/s}$.
*   **Sphincter of Oddi Spasm**: Agonist accumulation leads to severe choledochoduodenal spasm, causing bile duct pressure spikes and intense biliary colic pain (Ch24, Miller's 9th Ed, p.730).
*   **Pruritus**: Induced centrally via Mu-receptor co-activation with gastrin-releasing peptide receptors, manifesting as severe facial itching.

#### 5.18 Naloxone Pharmacokinetics, Competitive Antagonism & Renarcotization
Naloxone is a pure competitive opioid receptor antagonist.
*   **Competitive Antagonism Math**: Shifts the concentration-effect curve of agonists to the right:
    \[EC_{50,\text{apparent}} = EC_{50} \cdot \left(1 + \frac{[\text{Naloxone}]}{K_i}\right)\]
    where $K_i = 0.001\text{ mg/L}$.
*   **Sympathetic Surge**: Rapid reversal of high agonist concentrations causes a massive sympathetic discharge, triggering severe hypertension and tachycardia.
*   **Renarcotization**: Naloxone has a short half-life ($\approx 30-45\text{ minutes}$). Agonists like Morphine or Fentanyl have much longer durations. As Naloxone decays ($Ce < 0.0005\text{ mg/L}$), remaining agonist levels re-depress respiration, triggering secondary apnea.

#### 5.19 Nonopioid Pain Medications: Pharmacokinetics & Pharmacodynamics
Chapter 25 introduces nonopioid pain medications to support multimodal analgesia strategies. These drugs act synergistically with opioids and ketamine to blunt nociceptive pathways while sparing bowel function and reducing opioid-induced side effects.
*   **Analgesic Sparing Factor**: Combines nonopioid pain medication effects:
    \[egin{aligned}
    E_{	ext{nonopioid}} = 1.0 - & (1.0 - E_{	ext{acetaminophen}} \cdot 0.35) \cdot (1.0 - E_{	ext{ketorolac}} \cdot 0.40) \cdot (1.0 - E_{	ext{gabapentin}} \cdot 0.30) \
    \cdot & (1.0 - E_{	ext{pregabalin}} \cdot 0.35) \cdot (1.0 - E_{	ext{mexiletine}} \cdot 0.25) \cdot (1.0 - E_{	ext{topiramate}} \cdot 0.20) \
    \cdot & (1.0 - E_{	ext{carbamazepine}} \cdot 0.25) \cdot (1.0 - E_{	ext{oxcarbazepine}} \cdot 0.25) \cdot (1.0 - E_{	ext{lamotrigine}} \cdot 0.30) \
    \cdot & (1.0 - E_{	ext{zonisamide}} \cdot 0.20) \cdot (1.0 - E_{	ext{levetiracetam}} \cdot 0.20) \cdot (1.0 - E_{	ext{ziconotide}} \cdot 0.45)
    \end{aligned}\]
*   **Pharmacokinetics & Pharmacodynamics Table**:
    *   *Acetaminophen*: $V_1 = 20.0	ext{ L}$, $C_{50} = 10.0	ext{ mcg/mL}$, $\gamma = 1.5$.
    *   *Ketorolac*: $V_1 = 10.0	ext{ L}$, $C_{50} = 1.0	ext{ mcg/mL}$, $\gamma = 1.5$.
    *   *Gabapentin*: $V_1 = 15.0	ext{ L}$, $C_{50} = 5.0	ext{ mcg/mL}$, $\gamma = 1.5$.
    *   *Pregabalin*: $V_1 = 15.0	ext{ L}$, $C_{50} = 3.0	ext{ mcg/mL}$, $\gamma = 1.5$.
    *   *Mexiletine*: $V_1 = 20.0	ext{ L}$, $C_{50} = 1.0	ext{ mcg/mL}$, $\gamma = 1.5$.
    *   *Topiramate*: $V_1 = 20.0	ext{ L}$, $C_{50} = 4.0	ext{ mcg/mL}$, $\gamma = 1.5$.
    *   *Carbamazepine*: $V_1 = 18.0	ext{ L}$, $V_2 = 30.0	ext{ L}$, $C_{50} = 6.0	ext{ mcg/mL}$, $\gamma = 1.5$.
    *   *Oxcarbazepine*: $V_1 = 18.0	ext{ L}$, $V_2 = 30.0	ext{ L}$, $C_{50} = 8.0	ext{ mcg/mL}$, $\gamma = 1.5$.
    *   *Lamotrigine*: $V_1 = 18.0	ext{ L}$, $V_2 = 30.0	ext{ L}$, $C_{50} = 4.0	ext{ mcg/mL}$, $\gamma = 1.5$.
    *   *Zonisamide*: $V_1 = 18.0	ext{ L}$, $V_2 = 30.0	ext{ L}$, $C_{50} = 5.0	ext{ mcg/mL}$, $\gamma = 1.5$.
    *   *Levetiracetam*: $V_1 = 18.0	ext{ L}$, $V_2 = 30.0	ext{ L}$, $C_{50} = 10.0	ext{ mcg/mL}$, $\gamma = 1.5$, renalFraction = 1.0.
    *   *Ziconotide*: $V_1 = 12.0	ext{ L}$, $C_{50} = 0.005	ext{ mcg/mL}$, $\gamma = 1.5$.
*   **CNS Pathways & processed EEG**: Gabapentinoids and Topiramate depress noradrenergic tone in the Locus Coeruleus (LC), stimulate sleep-promoting pathways in the Ventrolateral Preoptic Area (VLPO), and decrease frontoparietal connectivity, thereby reducing anesthetic requirements and processed EEG (BIS) values.

#### 5.20 Intravenous Drug Delivery Systems & Target-Controlled Infusion (TCI)
Chapter 26 details pharmacokinetic-pharmacodynamic model-driven intravenous drug delivery. TCI systems calculate infusion rates required to achieve and maintain a user-specified target concentration in plasma ($C_p$) or effect site ($C_e$).
*   **Dynamic PK Model Covariate Scaling**:
    *   *Marsh Model* (Propofol): $V_1 = 0.228 \cdot \text{weight}$, $V_2 = 0.363 \cdot \text{weight}$, $V_3 = 2.893 \cdot \text{weight}$, $k_{10} = 0.119$, $k_{12} = 0.112$, $k_{13} = 0.042$, $k_{21} = 0.055$, $k_{31} = 0.0033$, $k_{e0} = 0.26$.
    *   *Schnider Model* (Propofol): $V_1 = 4.27\text{ L}$, $V_2 = 18.9 - 0.391 \cdot (\text{age} - 53)$, $V_3 = 238.0\text{ L}$, $Cl_1 = 1.29 - 0.024 \cdot (\text{age} - 53)$, $k_{10} = Cl_1 / V_1$, $k_{12} = 0.302 - 0.0056 \cdot (\text{age} - 53)$, $k_{13} = 0.196$, $k_{21} = Cl_1 / V_2$, $k_{31} = 0.0035$, $k_{e0} = 0.456$.
    *   *Paedfusor Model* (Pediatric Propofol): $V_1 = 0.458 \cdot \text{weight}$, $V_2 = 1.34 \cdot \text{weight}$, $V_3 = 8.20 \cdot \text{weight}$, $k_{10} = 70 \cdot \text{weight}^{-0.3} / 458.3$, $k_{12} = 0.12$, $k_{13} = 0.034$, $k_{21} = 0.041$, $k_{31} = 0.0019$, $k_{e0} = 0.26$.
    *   *Kataria Model* (Pediatric Propofol): $V_1 = 0.52 \cdot \text{weight}$, $V_2 = 1.0 \cdot \text{weight}$, $V_3 = 8.2 \cdot \text{weight}$, $k_{10} = 0.066$, $k_{12} = 0.113$, $k_{13} = 0.051$, $k_{21} = 0.059$, $k_{31} = 0.0032$, $k_{e0} = 0.26$.
    *   *Domino Model* (Ketamine): $V_1 = 0.063 \cdot \text{weight}$, $V_2 = 0.207 \cdot \text{weight}$, $V_3 = 1.51 \cdot \text{weight}$, $k_{10} = 0.4381$, $k_{12} = 0.5921$, $k_{13} = 0.59$, $k_{21} = 0.2470$, $k_{31} = 0.0146$, $k_{e0} = 0.15$.
    *   *Minto Model* (Remifentanil, see §5.3): age/LBM-scaled. Now exposed directly in the TCI UI (`Pharmacopoeia.jsx`) in addition to its existing front-end/back-end kinetics role.
    *   *Gepts Model* (Sufentanil, Table 26.7, Miller's 9th Ed): fixed (non-covariate-scaled) parameters: $V_1 = 14.3\text{ L}$, $V_2 = 63.4\text{ L}$, $V_3 = 251.9\text{ L}$, $k_{10} = 0.0645$, $k_{12} = 0.1086$, $k_{13} = 0.0229$, $k_{21} = 0.0245$, $k_{31} = 0.0013$. The source lists $ke_0$ as "NA" for this model, so the medication's existing static $ke_0$ default is left unmodified rather than invented.
    *   *Shafer Model* (Fentanyl, Table 26.7, Miller's 9th Ed): fixed parameters: $V_1 = 6.09\text{ L}$, $V_2 = 28.1\text{ L}$, $V_3 = 228.0\text{ L}$, $k_{10} = 0.083$, $k_{12} = 0.4713$, $k_{13} = 0.22496$, $k_{21} = 0.1021$, $k_{31} = 0.00601$, $k_{e0} = 0.147$.
    *   *Maitre Model* (Alfentanil, Table 26.7, Miller's 9th Ed): sex- and age-dependent: $V_1 = 0.111 \cdot \text{weight}\text{ L}$ (male) or $1.15 \cdot 0.111 \cdot \text{weight}\text{ L}$ (female), $V_2 = 12.0\text{ L}$, $V_3 = 10.5\text{ L}$, $k_{10} = \left(\text{age} \le 40 ? 0.356 : 0.356 - 0.00269 \cdot (\text{age}-40)\right) / V_1$, $k_{12} = 0.104$, $k_{13} = 0.017$, $k_{21} = 0.067$, $k_{31} = \text{age} \le 40 ? 0.0126 : 0.0126 - 0.000113 \cdot (\text{age}-40)$, $k_{e0} = 0.77$.
*   **Numerical Integration & Backward-Solving**: Continuous infusion rates $I(t)$ are computed inside the Euler integration loop (10x sub-steps per physical tick) to maintain numerical stability:
    \[I(t) = \max\left(0, \frac{\text{targetA}_1 - A_1(t)}{\Delta t} + (k_{10} + k_{12} + k_{13})A_1(t) - k_{21}A_2(t) - k_{31}A_3(t)\right)\]
*   **Ce-Targeted Overdrive Control**: To minimize time-to-target at the effect site ($C_e$), the system calculates a dynamic plasma target ($C_{p,\text{target}}$) with a safety limit of 3x the effect-site target:
    \[C_{p,\text{target}} = \max\left(0, \min\left(3.0 \cdot C_{e,\text{target}}, C_{e,\text{target}} + (C_{e,\text{target}} - C_e) \cdot 1.5\right)\right)\]
