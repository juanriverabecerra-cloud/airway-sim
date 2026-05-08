const fs = require('fs');

let code = fs.readFileSync('src/App.jsx', 'utf-8');

// 1. Add import
if (!code.includes('usePhysiology')) {
    code = code.replace("import { Activity", "import { usePhysiology } from './engine/usePhysiology';\nimport { Activity");
}

// 2. Remove old state from App
const oldStateBlock = `  const [time, setTime] = useState(0);
  const [vitals, setVitals] = useState({});
  const [targetVitals, setTargetVitals] = useState({});
  const [nibp, setNibp] = useState({ sys: 0, dia: 0, time: 0 });
  const [patient, setPatient] = useState({});`;

const newStateBlock = `  const [nibp, setNibp] = useState({ sys: 0, dia: 0, time: 0 });`;

code = code.replace(oldStateBlock, newStateBlock);

// 3. Remove the old engine block
const engineStart = "  // --- THE TIME-DELAYED PHYSIOLOGIC ENGINE ---";
const engineEnd = "  // --- ACTION HELPERS ---";

const startIdx = code.indexOf(engineStart);
const endIdx = code.indexOf(engineEnd);

if (startIdx !== -1 && endIdx !== -1) {
    code = code.slice(0, startIdx) + engineEnd + code.slice(endIdx + engineEnd.length);
}

// 4. Inject the hook right above startCase
const hookInjection = `  const formatTime = (seconds) => \`\${Math.floor(seconds / 60).toString().padStart(2, '0')}:\${(seconds % 60).toString().padStart(2, '0')}\`;
  const logEvent = (msg) => setLogs(prev => [\`\${formatTime(time)} - \${msg}\`, ...prev]);

  const {
    time, setTime,
    vitals, setVitals,
    targetVitals, setTargetVitals,
    patient, setPatient,
    pushMed, activeMeds
  } = usePhysiology({
    activeCase,
    isRunning,
    isPaused: viewModal.show || setupModal || pocusModal.show,
    logEvent
  });

  const startCase`;

code = code.replace("  const startCase", hookInjection);

// 5. Remove the duplicate formatTime and logEvent definitions from ACTION HELPERS
code = code.replace(/  const formatTime =.*?;\n\n  const logEvent =.*?;/, "");

// 6. Remove the old pushMed function entirely
const pushMedStartStr = `  const pushMed = (medName, hrChange, sysChange, inducesApnea = false, inducesParalysis = false) => {`;
const pushMedEndStr = `  const handleSuction = () => {`;

const pmStartIdx = code.indexOf(pushMedStartStr);
const pmEndIdx = code.indexOf(pushMedEndStr);

if (pmStartIdx !== -1 && pmEndIdx !== -1) {
    code = code.slice(0, pmStartIdx) + pushMedEndStr + code.slice(pmEndIdx + pushMedEndStr.length);
}

// 7. Replace old pushMed button calls with new pushMed(medId, dose, inducesApnea, inducesParalysis) calls
code = code.replace(/pushMed\('Propofol 1.5mg\/kg', -15, patient.isSeptic \? -50 : -30, true, false\)/g, "pushMed('propofol', 100, true, false)");
code = code.replace(/pushMed\('Ketamine 1.5mg\/kg', 15, 20, true, false\)/g, "pushMed('ketamine', 100, true, false)");
code = code.replace(/pushMed\('Etomidate 0.3mg\/kg', 0, 0, true, false\)/g, "pushMed('etomidate', 20, true, false)");
code = code.replace(/pushMed\('Midazolam 2mg', 0, -10, false, false\)/g, "pushMed('midazolam', 2, false, false)");
code = code.replace(/pushMed\('Succinylcholine 1.5mg\/kg', 0, 0, false, true\)/g, "pushMed('succinylcholine', 100, false, true)");
code = code.replace(/pushMed\('Rocuronium 1.2mg\/kg', 0, 0, false, true\)/g, "pushMed('rocuronium', 100, false, true)");
code = code.replace(/pushMed\('Vecuronium 0.1mg\/kg', 0, 0, false, true\)/g, "pushMed('vecuronium', 10, false, true)");
code = code.replace(/pushMed\('Fentanyl 100mcg', -10, -10\)/g, "pushMed('fentanyl', 100)");
code = code.replace(/pushMed\('Hydromorphone 1mg', -5, -5\)/g, "pushMed('Hydromorphone 1mg', 1)"); // Fallback
code = code.replace(/pushMed\('Epinephrine 10mcg push', 20, 30\)/g, "pushMed('epinephrine', 10)");
code = code.replace(/pushMed\('Phenylephrine 100mcg push', -10, 25\)/g, "pushMed('phenylephrine', 100)");
code = code.replace(/pushMed\('Ephedrine 10mg push', 15, 15\)/g, "pushMed('Ephedrine 10mg push', 10)"); // Fallback
code = code.replace(/pushMed\('Norepinephrine Gtt started', 5, 40\)/g, "pushMed('Norepinephrine Gtt started', 1)"); // Fallback
code = code.replace(/pushMed\('Esmolol 10mg', -15, -10\)/g, "pushMed('esmolol', 10)");
code = code.replace(/pushMed\('Labetalol 10mg', -10, -20\)/g, "pushMed('Labetalol 10mg', 10)"); // Fallback
code = code.replace(/pushMed\('Nitroglycerin 50mcg', 5, -25\)/g, "pushMed('nitroglycerin', 50)");
code = code.replace(/pushMed\('Amiodarone 150mg \(Class III\)', -5, -15\)/g, "pushMed('amiodarone', 150)");
code = code.replace(/pushMed\('Lidocaine 100mg \(Class Ib\)', 0, 0\)/g, "pushMed('lidocaine', 100)");
code = code.replace(/pushMed\('Adenosine 6mg', -50, -10\)/g, "pushMed('adenosine', 6)");
code = code.replace(/pushMed\('Atropine 0.5mg', 30, 10\)/g, "pushMed('atropine', 0.5)");
code = code.replace(/pushMed\('Epinephrine 1mg \(ACLS\)', 50, 60\)/g, "pushMed('epinephrine', 1000)");
code = code.replace(/pushMed\('Amiodarone 300mg \(ACLS\)', -10, -20\)/g, "pushMed('amiodarone', 300)");
code = code.replace(/pushMed\('Topical Lidocaine 4% \(Atomizer\)', 0, 0\)/g, "pushMed('Topical Lidocaine 4% (Atomizer)', 0)");

fs.writeFileSync('src/App.jsx', code, 'utf-8');
console.log('App.jsx refactored successfully!');
