import { describe, it, expect } from 'vitest';
import { ContinuousWaveformHandler } from '../knowledge/parsers/handlers/ContinuousWaveformHandler.ts';
import type { VisualDataEngine } from '../knowledge/types/index.ts';

describe('Continuous Waveform Taxonomy Tests (Ch36 pipeline fix)', () => {
  const handler = new ContinuousWaveformHandler();

  const mockEngine = (caption: string, id = 'FIG_TEST_1'): VisualDataEngine => ({
    id,
    sourceFile: 'test.pdf',
    pageNumber: 1,
    caption,
    text_bounding_boxes: []
  });

  it('classifies a real ECG caption as modality "ecg", not the old EEG-only bucket', async () => {
    const engine = mockEngine(
      'Fig. 36.1 Digital heart rate (HR) displays may fail to warn of dangerous bradyarrhythmias. ' +
      'Direct observation of the electrocardiogram (ECG) and the arterial blood pressure traces ' +
      'reveals complete heart block and a 4-second period of asystole.'
    );
    const result = await handler.handle(engine);
    expect(result.archetype).toBe('CONTINUOUS_WAVEFORM');
    expect((result.details as any).modality).toBe('ecg');
  });

  it('classifies a real EEG caption as modality "eeg", distinct from ECG', async () => {
    const engine = mockEngine(
      'Fig. 9.4 Polysomnographic recording showing electroencephalogram (EEG) channels during stage 2 sleep.'
    );
    const result = await handler.handle(engine);
    expect(result.archetype).toBe('CONTINUOUS_WAVEFORM');
    expect((result.details as any).modality).toBe('eeg');
  });

  it('classifies a capnography caption as modality "capnography"', async () => {
    const engine = mockEngine(
      'Fig. 36.40 Capnogram showing an obstructive shark-fin pattern during bronchospasm.'
    );
    const result = await handler.handle(engine);
    expect((result.details as any).modality).toBe('capnography');
  });

  it('does NOT route prose containing "leadership" or "wavelength" through this handler', () => {
    const leadershipEngine = mockEngine(
      'Fig. 2.1 The anesthesia department\'s leadership structure and reporting lines.'
    );
    const wavelengthEngine = mockEngine(
      'Fig. 14.3 Pulse oximetry relies on two wavelength bands of light absorption.'
    );
    expect(handler.supports(leadershipEngine)).toBe(false);
    expect(handler.supports(wavelengthEngine)).toBe(false);
  });

  it('still routes a genuine ECG lead-placement caption through this handler', () => {
    const engine = mockEngine(
      'Fig. 36.2 Standard ECG limb lead placement for patient monitoring. LA, Left arm; LL, left leg; RA, right arm; RL, right leg.'
    );
    expect(handler.supports(engine)).toBe(true);
  });
});
