# Walkthrough: Inhaled Anesthetics Delivery Systems & Safety (Chapter 22 Simulator Integration)

This walkthrough documents the complete implementation of the anesthesia machine systems, physical circuit kinematics, pressure leaks, safety interlocks, barotrauma physiology, and interactive UI controls for Chapter 22 (*Inhaled Anesthetics: Delivery Systems*).

---

## 🛠️ Codebase Implementation Details

### 1. State Variables & Initial Patient State
The patient state tree in `usePhysiology.js` and `App.jsx` was updated with Chapter 22 default states:
*   `isO2PipelineCrossover`: `false` (controls if the O2 pipeline delivers Nitrous Oxide due to contaminated pipeline).
*   `isO2PipelineDisconnected`: `false` (controls whether the wall pipeline is connected).
*   `isO2CylinderOpen`: `false` (backup oxygen tank).
*   `isOxygenFlushPressed`: `false` (momentary flush trigger).
*   `breathingCircuitType`: `'circle'` (`'circle' | 'Mapleson A' | 'Mapleson D'`).
*   `co2AbsorptiveCapacity`: `100.0` (canister capacity percentage).
*   `stuckInspiratoryValve`: `false` / `stuckExpiratoryValve`: `false` (stuck unidirectional valves).
*   `aplValveSetting`: `0.0` (APL limit in cmH2O).
*   `hasPneumothorax`: `false` (tension pneumothorax state).

### 2. Physical & Physiological Engine Refactors

#### A. Gas Supply & Crossover Override Logic (`usePhysiology.js`)
*   *Pressure Override*: Higher wall pipeline pressure ($50-55\text{ psi}$) shuts off the backup cylinder regulator ($45\text{ psi}$). The backup cylinder is only drawn from if the pipeline is disconnected (`isO2PipelineDisconnected === true`).
*   *Crossover effect*: If a crossover is simulated, the O2 flowmeter delivers N2O, dropping inspired oxygen ($FiO_2$) and raising $FiN_2O$, inducing a hypoxic arrest loop.
*   *Pressure Alarm*: A critical alarm is logged if the O2 flowmeter is open but no oxygen supply pressure exists (pipeline disconnected and cylinder closed).

#### B. Link-25 Proportioning System (`App.jsx`)
*   Enforces a minimum $1:3$ ratio of $O_2$ to $N_2O$ flow rates (`o2Flow >= n2oFlow / 3.0`), ensuring that the fresh gas mixture never falls below $25\%$ oxygen content.

#### C. APL Valve Leak Model (`RespiratoryEngine.ts`)
*   During manual/assisted bagging, positive-pressure ventilation leaks gas through an open APL valve. Effective minute ventilation (`effectiveMV_L_min`) drops to $0.0$ if `aplValveSetting < 5.0` or is scaled down proportionally if `< 15.0`. This impairs pre-oxygenation and induces hypercapnia.

#### D. Breathing Circuit Rebreathing Fraction (`RespiratoryEngine.ts`)
*   *Circle System*: Rebreathing is driven by depleted absorbent capacity (`rebreathingAbsorbent = 1.0 - co2AbsorptiveCapacity / 100.0`) or stuck unidirectional valves (`rebreathingValves = 0.40`). The final rebreathing fraction is $R_f = \max(rebreathingAbsorbent, rebreathingValves)$, leading to inspired CO2 ($FiCO_2 = R_f \cdot EtCO_2$) and shifting arterial $PaCO_2$.
*   *Mapleson Systems (A & D)*: Rebreathing occurs if the fresh gas flow ($FGF$) falls below the circuit-specific spontaneous/controlled minute ventilation requirements:
    - Mapleson A Spontaneous: $FGF_{\text{req}} = MV$.
    - Mapleson A Controlled: $FGF_{\text{req}} = \max(20.0, 3.0 \cdot MV)$.
    - Mapleson D Spontaneous: $FGF_{\text{req}} = 2.5 \cdot MV$.
    - Mapleson D Controlled: $FGF_{\text{req}} = 2.0 \cdot MV$.

#### E. Tension Pneumothorax & Needle Decompression (`CardiovascularEngine.ts` & `RespiratoryEngine.ts`)
*   *Flush Barotrauma Trigger*: Pressing the oxygen flush valve momentously dilutes circuit volatile agents by $50\%$ and pre-oxygenates FRC, but triggers barotrauma (`hasPneumothorax = true`) if pressed during active positive-pressure inspiration or when the APL valve is closed ($\ge 30\text{ cmH2O}$).
*   *Cardiovascular Collapse*: Compression of the vena cava drops stroke volume (`currentSV`) by $70\%$ and MAP by $30\text{ mmHg}$, causing a severe hemodynamic crash (narrowed pulse pressure, SBP/DBP crash).
*   *Respiratory Restrictions*: Pulmonary compliance is restricted to $25\%$ of baseline.
*   *Resolution*: Performing needle decompression resets `hasPneumothorax = false`, restoring compliance, SV, and MAP.

---

## 🖥️ UI/UX Changes: Where to See Them

### 1. Anesthesia Delivery & Safety Controls (`ActionPanel.jsx`)
*   **Location**: Left Action panel in the dashboard, filterable with keywords: `delivery`, `crossover`, `pipeline`, `cylinder`, `flush`, `decompression`.
*   **New Controls**:
    *   `CROSSOVER PIPELINE` / `FIX CROSSOVER` (Simulate pipeline contaminated with N2O).
    *   `DISCONNECT PIPELINE` / `CONNECT PIPELINE` (Toggle wall pipeline socket connection).
    *   `OPEN O2 CYLINDER` / `CLOSE O2 CYLINDER` (Backup E-cylinder supply control).
    *   `STICK CIR. VALVE` / `UNSTICK VALVES` (Toggle stuck unidirectional valves).
    *   `Press Oxygen Flush Valve` (Trigger momentary dilution, pre-oxygenation, and barotrauma risk).
    *   `Perform Needle Decompression` (Decompress chest to treat tension pneumothorax, active only during a pneumothorax crisis).

### 2. Breathing Circuit & APL Setup (`BottomBar.jsx`)
*   **Location**: Lower horizontal bar.
*   **Changes**:
    *   **Persistent Pre-induction Display**: The bottom bar now renders even before the patient is intubated, allowing pre-oxygenation setup.
    *   **Ventilator Condition**: The mechanical ventilator configuration block is hidden unless the patient's airway is secured (`patient?.airwaySecured`).
    *   **Circuit Selector & APL Control**: Added a **Breathing Circuit** configuration panel containing a circuit select dropdown (`Circle System`, `Mapleson A`, `Mapleson D`) and an APL Valve pressure adjuster ($0$ to $70\text{ cmH2O}$).

---

## 🧪 Verification & Testing Results

### 1. Automated Test Suite (`delivery_systems_ch22.test.ts`)
A comprehensive test suite was written in `src/testing/delivery_systems_ch22.test.ts` verifying all delivery mechanics:
1.  **Link-25**: Enforces minimum inspired oxygen ratio.
2.  **Gas Source**: Pipeline overrides cylinder; crossover delivers N2O; disconnect without cylinder fails pressure.
3.  **APL Valve Leak**: Open APL leaks pressure and prevents pre-oxygenation.
4.  **Stuck Valves & Absorbent**: Stuck unidirectional valves and depleted capacity raise rebreathing fraction and $FiCO_2$.
5.  **Mapleson systems**: FGF deficit drives Mapleson rebreathing and $FiCO_2$ elevation.
6.  **Tension Pneumothorax**: SV/MAP collapse and needle decompression recovery.

*   **Vitest Output**: Run `npm run test`. All **213/213 tests** pass successfully.
*   **Production Build**: Run `npm run build`. Vite environment compiles the production bundle successfully.
