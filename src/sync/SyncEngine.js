/**
 * SyncEngine.js
 * Central Synchronization Manager for Aetheris Multi-Display & Multi-Device Simulation.
 *
 * Supports:
 * 1. BroadcastChannel API: Zero-latency, 0-bandwidth instant sync across multi-monitor browser windows on the same machine.
 * 2. Room Session Manager: Room code generation (e.g. SIM-8492), role assignments, micro-delta state payloading.
 * 3. Event Bus: Publishes state updates, instructor incident triggers (AFib, Bronchospasm), blind exam toggles, and audio sync.
 */

const CHANNEL_NAME = 'aetheris_sim_sync';

// Generate a random 6-character room code (e.g., SIM-9482)
export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'SIM-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

class SynchronizationEngine {
  constructor() {
    this.channel = null;
    this.roomCode = generateRoomCode();
    this.role = 'host'; // 'host' | 'vent_monitor' | 'patient_monitor' | 'mechanics_station' | 'instructor_control' | 'spectator'
    this.listeners = new Set();
    this.state = {
      roomCode: this.roomCode,
      patient: null,
      vitals: null,
      ventSettings: null,
      activeTriggers: {},
      blindMode: false,
      poppedOutPanels: {
        vitals: false,
        vent: false,
        meds: false,
        attending: false,
        log: false,
        receptors: false,
        loops: false,
      },
      lastEvent: null,
      timestamp: Date.now(),
    };

    this.initBroadcastChannel();
  }

  initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event) => {
        this.handleIncomingMessage(event.data);
      };
    }
  }

  // Subscribe to state updates
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(data) {
    this.listeners.forEach((listener) => listener(data));
  }

  handleIncomingMessage(msg) {
    if (!msg || typeof msg !== 'object') return;

    switch (msg.type) {
      case 'STATE_SYNC':
        this.state = { ...this.state, ...msg.payload, timestamp: Date.now() };
        this.notifyListeners({ type: 'STATE_SYNC', state: this.state });
        break;

      case 'TRIGGER_INCIDENT':
        this.state.activeTriggers = {
          ...this.state.activeTriggers,
          [msg.payload.incidentId]: msg.payload.active,
        };
        this.notifyListeners({ type: 'TRIGGER_INCIDENT', payload: msg.payload });
        break;

      case 'TOGGLE_BLIND':
        this.state.blindMode = msg.payload.blindMode;
        this.notifyListeners({ type: 'TOGGLE_BLIND', payload: msg.payload });
        break;

      case 'TOGGLE_POPOUT':
        this.state.poppedOutPanels = {
          ...this.state.poppedOutPanels,
          [msg.payload.panelId]: msg.payload.isPoppedOut,
        };
        this.notifyListeners({ type: 'TOGGLE_POPOUT', payload: msg.payload });
        break;

      case 'PUSH_MED':
        this.notifyListeners({ type: 'PUSH_MED', payload: msg.payload });
        break;

      case 'PUSH_FLUID':
        this.notifyListeners({ type: 'PUSH_FLUID', payload: msg.payload });
        break;

      case 'UPDATE_PATIENT':
        this.notifyListeners({ type: 'UPDATE_PATIENT', payload: msg.payload });
        break;

      case 'UPDATE_VENT_SETTINGS':
        if (this.state.ventSettings) {
          this.state.ventSettings = { ...this.state.ventSettings, ...msg.payload };
        }
        this.notifyListeners({ type: 'UPDATE_VENT_SETTINGS', payload: msg.payload });
        break;

      case 'AUDIO_EVENT':
        this.notifyListeners({ type: 'AUDIO_EVENT', payload: msg.payload });
        break;

      default:
        this.notifyListeners(msg);
        break;
    }
  }

  // Broadcast state snapshot to all open windows/monitors
  broadcastState(fullState) {
    this.state = { ...this.state, ...fullState, timestamp: Date.now() };
    const payload = {
      type: 'STATE_SYNC',
      payload: {
        roomCode: this.roomCode,
        patient: fullState.patient,
        vitals: fullState.vitals,
        ventSettings: fullState.ventSettings,
        activeMeds: fullState.activeMeds || [],
        logs: fullState.logs || [],
        history: fullState.history || [],
        activeCase: fullState.activeCase || null,
        surgicalPhase: fullState.surgicalPhase || 'Pre-Op',
        time: fullState.time || 0,
        activeTriggers: fullState.activeTriggers || this.state.activeTriggers,
        blindMode: fullState.blindMode ?? this.state.blindMode,
        poppedOutPanels: this.state.poppedOutPanels,
      },
    };

    if (this.channel) {
      this.channel.postMessage(payload);
    }
  }

  // Trigger an incident from Instructor Control (e.g. AFib, Bronchospasm)
  triggerIncident(incidentId, active = true, extraParams = {}) {
    const payload = {
      type: 'TRIGGER_INCIDENT',
      payload: { incidentId, active, extraParams, timestamp: Date.now() },
    };
    this.handleIncomingMessage(payload);
    if (this.channel) {
      this.channel.postMessage(payload);
    }
  }

  // Toggle Blind Exam Mode (hides SpO2 / Loops on student screens)
  toggleBlindMode(blindMode) {
    const payload = {
      type: 'TOGGLE_BLIND',
      payload: { blindMode, timestamp: Date.now() },
    };
    this.handleIncomingMessage(payload);
    if (this.channel) {
      this.channel.postMessage(payload);
    }
  }

  // Update ventilator settings from a Trainee or Vent Display node
  updateVentSettings(newSettings) {
    const payload = {
      type: 'UPDATE_VENT_SETTINGS',
      payload: newSettings,
    };
    this.handleIncomingMessage(payload);
    if (this.channel) {
      this.channel.postMessage(payload);
    }
  }

  // Toggle pop-out panel state for main window minimization
  togglePopoutPanel(panelId, isPoppedOut) {
    const payload = {
      type: 'TOGGLE_POPOUT',
      payload: { panelId, isPoppedOut, timestamp: Date.now() },
    };
    this.handleIncomingMessage(payload);
    if (this.channel) {
      this.channel.postMessage(payload);
    }
  }

  // Push medication from popout Pharmacopoeia window
  pushMedication(drugId, amount, isWeightBased = true) {
    const payload = {
      type: 'PUSH_MED',
      payload: { drugId, amount, isWeightBased, timestamp: Date.now() },
    };
    this.handleIncomingMessage(payload);
    if (this.channel) {
      this.channel.postMessage(payload);
    }
  }

  // Push fluid / blood product from popout window
  pushFluid(type, volume) {
    const payload = {
      type: 'PUSH_FLUID',
      payload: { type, volume, timestamp: Date.now() },
    };
    this.handleIncomingMessage(payload);
    if (this.channel) {
      this.channel.postMessage(payload);
    }
  }

  // Open a popout window for multi-monitor setups
  openPopoutWindow(displayType) {
    this.togglePopoutPanel(displayType, true);

    const width = displayType === 'instructor' ? 900 : 1280;
    const height = displayType === 'instructor' ? 700 : 800;
    const url = `${window.location.origin}${window.location.pathname}?display=${displayType}&room=${this.roomCode}`;
    const windowName = `Aetheris_${displayType}_${Date.now()}`;

    const win = window.open(
      url,
      windowName,
      `width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`
    );

    if (win) {
      const timer = setInterval(() => {
        if (win.closed) {
          clearInterval(timer);
          this.togglePopoutPanel(displayType, false);
        }
      }, 1000);
    }
  }
}

export const syncEngine = new SynchronizationEngine();
