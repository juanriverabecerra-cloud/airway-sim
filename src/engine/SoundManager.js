// Anesthesia Monitor Sound Generator using Web Audio API

let audioCtx = null;
let masterGain = null;
let isRunning = false;

// Global settings synced from UI
let settings = {
  master: false,
  pulse: true,
  vent: true,
  alarms: true
};

// Global physiology state synced from loop
let vitals = null;
let patient = null;
let ventSettings = null;
let isPaused = false;

// Time trackers for scheduling loops
let lastPulseTime = 0;
let lastVentTime = 0;
let lastAlarmTime = 0;

let flatlineOsc = null;
let flatlineGain = null;

/**
 * Lazily initialize the Audio Context on user interaction/activation
 */
export const initAudio = () => {
  if (audioCtx) return;
  try {
    if (typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
        masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(0.6, audioCtx.currentTime); // 60% master volume
        masterGain.connect(audioCtx.destination);
      }
    }
  } catch (e) {
    console.error("Failed to initialize Web Audio API:", e);
  }
};

/**
 * Start the scheduler loop
 */
export const startAudioLoop = () => {
  if (isRunning) return;
  isRunning = true;
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(schedulerLoop);
  }
};

/**
 * Stop the scheduler loop
 */
export const stopAudioLoop = () => {
  isRunning = false;
  cleanupFlatline();
};

/**
 * Synced setter for vitals, patient and vent state
 */
export const updatePhysiology = (newVitals, newPatient, newVentSettings, isSimPaused) => {
  vitals = newVitals;
  patient = newPatient;
  ventSettings = newVentSettings;
  isPaused = isSimPaused;
};

/**
 * Synced setter for user sound preferences
 */
export const updateSettings = (newSettings) => {
  settings = { ...settings, ...newSettings };

  if (settings.master) {
    initAudio();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    startAudioLoop();
  } else {
    stopAudioLoop();
  }
};

/**
 * High-precision scheduler loop running on requestAnimationFrame
 */
function schedulerLoop() {
  if (!isRunning || !audioCtx) return;
  
  // If simulation is paused, suppress all cycling sounds (except flatline if arrest)
  const paused = isPaused;
  const now = audioCtx.currentTime;

  const hr = vitals?.hr || 0;
  const isArrest = patient?.isArrest || hr === 0;

  // 1. Schedule Pulse Beep on Heartbeats
  if (!isArrest && !paused && settings.pulse && settings.master) {
    const beatInterval = 60 / hr;
    // Schedule beat if interval elapsed
    if (now >= lastPulseTime + beatInterval) {
      // Prevent scheduling cascade if tab was backgrounded (snap lastPulseTime forward)
      if (now > lastPulseTime + beatInterval * 2) {
        lastPulseTime = now;
      } else {
        lastPulseTime += beatInterval;
      }
      playPulseBeep(lastPulseTime, vitals?.spo2 || 99);
    }
  }

  // 2. Schedule Ventilator Cycle Sounds
  const isVentActive = patient?.airwaySecured && ventSettings?.rr > 0;
  if (isVentActive && !isArrest && !paused && settings.vent && settings.master) {
    const ventInterval = 60 / ventSettings.rr;
    if (now >= lastVentTime + ventInterval) {
      if (now > lastVentTime + ventInterval * 2) {
        lastVentTime = now;
      } else {
        lastVentTime += ventInterval;
      }
      const ieRatioVal = ventSettings.ieRatio || 2;
      const inspTime = ventInterval * (1 / (1 + ieRatioVal));
      playVentBreath(lastVentTime, inspTime);
    }
  }

  // 3. Schedule Clinical Alarms (IEC 60601-1-8 priority tones)
  // Any out-of-range vital triggers the alarm; hypoxia uses a distinct high-priority 5-beep pattern.
  const spo2    = vitals?.spo2  || 100;
  const map     = vitals?.map   || 90;
  const etco2   = vitals?.etco2 ?? 38;

  const isHypoxic         = spo2  < 90;
  const isSevereBradycard = hr    < 40  && !isArrest;
  const isSevereTachy     = hr    > 150 && !isArrest;
  const isSevereHypotensi = map   < 55;
  const isApnea           = etco2 < 10  && patient?.airwaySecured;

  const hasAlarm = isHypoxic || isSevereBradycard || isSevereTachy || isSevereHypotensi || isApnea;

  if (hasAlarm && !paused && settings.alarms && settings.master) {
    // Repeat cadence: hypoxia/apnea = fast (3.5s), hemodynamic = slower (5s)
    const alarmInterval = (isHypoxic || isApnea) ? 3.5 : 5.0;
    if (now >= lastAlarmTime + alarmInterval) {
      if (now > lastAlarmTime + alarmInterval * 2) {
        lastAlarmTime = now;
      } else {
        lastAlarmTime += alarmInterval;
      }
      if (isHypoxic || isApnea) {
        playIECAlarm(lastAlarmTime);        // high-priority 5-beep (IEC 60601-1-8)
      } else {
        playLowPriorityAlarm(lastAlarmTime); // medium-priority 3-beep
      }
    }
  }

  // 4. Update Continuous Cardiac Arrest Flatline Sound
  updateFlatline(isArrest && !paused);

  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(schedulerLoop);
  }
}

/**
 * Play a heartbeat beep. Pitch decreases logarithmically with SpO2 saturation.
 */
function playPulseBeep(time, spo2) {
  if (!audioCtx || !masterGain) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  // Realistic oximeter pitch mapping: 100% SpO2 -> 800 Hz, 70% SpO2 -> 300 Hz
  const s = Math.max(70, Math.min(100, spo2));
  const freq = 300 + (s - 70) * 16.67;

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, time);

  // Soft envelope to make it sound exactly like a medical monitor pulse beep
  gain.gain.setValueAtTime(0.001, time);
  gain.gain.exponentialRampToValueAtTime(0.14, time + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start(time);
  osc.stop(time + 0.14);
}

/**
 * Play a ventilator mechanical breath (low soft bellows hum)
 */
function playVentBreath(time, duration) {
  if (!audioCtx || !masterGain) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'triangle'; // triangle wave has soft harmonic content
  osc.frequency.setValueAtTime(65, time); // 65 Hz mechanical bellows hum

  // Settle swell envelope
  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(0.08, time + 0.25);
  gain.gain.linearRampToValueAtTime(0.001, time + duration);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start(time);
  osc.stop(time + duration + 0.05);
}

/**
 * Play IEC 60601-1-8 High-Priority alarm sequence: 3 beeps, pause, 2 beeps
 */
function playIECAlarm(startTime) {
  if (!audioCtx || !masterGain) return;

  // Delays for the 5-beep sequence
  const beeps = [0.0, 0.15, 0.30, 0.65, 0.80];
  
  beeps.forEach(delay => {
    const time = startTime + delay;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(920, time); // standard high-pitched alert tone (920 Hz)

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.06, time + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.095);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(time);
    osc.stop(time + 0.11);
  });
}

/**
 * Play IEC 60601-1-8 Medium-Priority alarm: 3 equally-spaced beeps at lower pitch
 * Used for bradycardia, tachycardia, hypotension (important but not immediately fatal)
 */
function playLowPriorityAlarm(startTime) {
  if (!audioCtx || !masterGain) return;

  // 3 beeps at 660 Hz (lower than high-priority 920 Hz → distinct auditory category)
  const beeps = [0.0, 0.18, 0.36];
  beeps.forEach(delay => {
    const time = startTime + delay;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, time);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.05, time + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(time);
    osc.stop(time + 0.10);
  });
}

/**
 * Manage continuous flatline tone for Cardiac Arrest
 */
function updateFlatline(isArrest) {
  if (!audioCtx || !masterGain) return;

  if (isArrest && settings.master && settings.alarms) {
    if (!flatlineOsc) {
      flatlineOsc = audioCtx.createOscillator();
      flatlineGain = audioCtx.createGain();
      
      flatlineOsc.type = 'sine';
      flatlineOsc.frequency.setValueAtTime(520, audioCtx.currentTime); // Standard high-pitched clinical flatline alarm tone (520 Hz)
      flatlineGain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      
      flatlineOsc.connect(flatlineGain);
      flatlineGain.connect(masterGain);
      flatlineOsc.start();
    }
  } else {
    cleanupFlatline();
  }
}

/**
 * Safely tear down flatline nodes
 */
function cleanupFlatline() {
  if (flatlineOsc) {
    try {
      flatlineOsc.stop();
    } catch(e) {}
    flatlineOsc = null;
    flatlineGain = null;
  }
}
