import { useState, useEffect } from 'react';
import { syncEngine } from './SyncEngine';

/**
 * useSimState Hook
 * Unified state mirror & action dispatcher for all pop-out windows.
 *
 * Checks window.opener.__AETHERIS_HOST__ for instant 0ms in-memory access
 * when popped out on the same computer, or falls back to BroadcastChannel state.
 */
export function useSimState() {
  const [state, setState] = useState(() => {
    if (typeof window !== 'undefined' && window.opener && window.opener.__AETHERIS_HOST__) {
      return window.opener.__AETHERIS_HOST__;
    }
    return syncEngine.state;
  });

  useEffect(() => {
    let animId;
    if (typeof window !== 'undefined' && window.opener && window.opener.__AETHERIS_HOST__) {
      const updateFromOpener = () => {
        if (window.opener && window.opener.__AETHERIS_HOST__) {
          setState({ ...window.opener.__AETHERIS_HOST__ });
        }
        animId = requestAnimationFrame(updateFromOpener);
      };
      animId = requestAnimationFrame(updateFromOpener);
      return () => cancelAnimationFrame(animId);
    }

    const unsubscribe = syncEngine.subscribe((event) => {
      if (event.type === 'STATE_SYNC') {
        setState(event.state);
      }
    });
    return unsubscribe;
  }, []);

  const actions = {
    pushMed: (drugId, amount, isWeightBased = true) => {
      if (typeof window !== 'undefined' && window.opener && window.opener.__AETHERIS_HOST__?.pushMed) {
        window.opener.__AETHERIS_HOST__.pushMed(drugId, amount, isWeightBased);
      } else {
        syncEngine.pushMedication(drugId, amount, isWeightBased);
      }
    },
    pushFluid: (type, volume) => {
      if (typeof window !== 'undefined' && window.opener && window.opener.__AETHERIS_HOST__?.pushFluid) {
        window.opener.__AETHERIS_HOST__.pushFluid(type, volume);
      } else {
        syncEngine.pushFluid(type, volume);
      }
    },
    cycleNibp: () => {
      if (typeof window !== 'undefined' && window.opener && window.opener.__AETHERIS_HOST__?.cycleNibp) {
        window.opener.__AETHERIS_HOST__.cycleNibp();
      }
    },
    setNibpIntervalMs: (val) => {
      if (typeof window !== 'undefined' && window.opener && window.opener.__AETHERIS_HOST__?.setNibpIntervalMs) {
        window.opener.__AETHERIS_HOST__.setNibpIntervalMs(val);
      }
    },
    setVentSettings: (updater) => {
      if (typeof window !== 'undefined' && window.opener && window.opener.__AETHERIS_HOST__?.setVentSettings) {
        window.opener.__AETHERIS_HOST__.setVentSettings(updater);
      } else {
        const next = typeof updater === 'function' ? updater(state.ventSettings) : updater;
        syncEngine.updateVentSettings(next);
      }
    },
    setPatient: (updater) => {
      if (typeof window !== 'undefined' && window.opener && window.opener.__AETHERIS_HOST__?.setPatient) {
        window.opener.__AETHERIS_HOST__.setPatient(updater);
      }
    },
    setVitals: (updater) => {
      if (typeof window !== 'undefined' && window.opener && window.opener.__AETHERIS_HOST__?.setVitals) {
        window.opener.__AETHERIS_HOST__.setVitals(updater);
      }
    },
    setGasSettings: (updater) => {
      if (typeof window !== 'undefined' && window.opener && window.opener.__AETHERIS_HOST__?.setGasSettings) {
        window.opener.__AETHERIS_HOST__.setGasSettings(updater);
      }
    },
    setSoundSettings: (updater) => {
      if (typeof window !== 'undefined' && window.opener && window.opener.__AETHERIS_HOST__?.setSoundSettings) {
        window.opener.__AETHERIS_HOST__.setSoundSettings(updater);
      }
    },
    logEvent: (msg) => {
      if (typeof window !== 'undefined' && window.opener && window.opener.__AETHERIS_HOST__?.logEvent) {
        window.opener.__AETHERIS_HOST__.logEvent(msg);
      }
    },
  };

  return { state, actions };
}
