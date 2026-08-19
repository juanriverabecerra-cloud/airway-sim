import React from 'react';
import { createRoot } from 'react-dom/client';
import { BottomBar } from '/src/components/controls/BottomBar.jsx';
import '/src/index.css';
const patient = { airwaySecured: true, ibw: 70, aplValveSetting: 0, breathingCircuitType: 'circle', isO2CylinderOpen: true };
const gasSettings = { agent: 'sevoflurane', dial: 2.0, o2Flow: 2.0, airFlow: 0.0, n2oFlow: 0.0 };
const ventSettings = { mode: 'PCV-VG', vt: 500, rr: 12, peep: 5, pmax: 40, ieRatio: 2, pinsp: 15, ps: 10 };
const vitals = { fiO2: 100, etO2: 100, fiN2O: 0, etN2O: 0, fiAgent: 0.3, etAgent: 0.1, mv: 6.0 };
createRoot(document.getElementById('root')).render(
  <div style={{ background:'#020617', padding:'8px' }}>
    <BottomBar gasSettings={gasSettings} setGasSettings={()=>{}} ventSettings={ventSettings}
      setVentSettings={()=>{}} patient={patient} setPatient={()=>{}} vitals={vitals} logEvent={()=>{}} />
  </div>
);
