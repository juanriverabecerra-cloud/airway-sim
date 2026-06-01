import type { VisualDataEngine } from '../types/index.ts';
import type { IArchetypeHandler } from './handlers/IArchetypeHandler.ts';
import { NetworkMapsHandler } from './handlers/NetworkMapsHandler.ts';
import { ContinuousWaveformHandler } from './handlers/ContinuousWaveformHandler.ts';
import { TimelineStepChartHandler } from './handlers/TimelineStepChartHandler.ts';
import { ClinicalTablesHandler } from './handlers/ClinicalTablesHandler.ts';

export class StrategyRouter {
  private handlers: IArchetypeHandler[];

  constructor() {
    this.handlers = [
      new TimelineStepChartHandler(),
      new ClinicalTablesHandler(),
      new ContinuousWaveformHandler(),
      new NetworkMapsHandler()
    ];
  }

  /**
   * Route the visual engine to the correct strategy handler based on caption or text labels.
   */
  public async route(engine: VisualDataEngine): Promise<VisualDataEngine> {
    for (const handler of this.handlers) {
      if (handler.supports(engine)) {
        try {
          return await handler.handle(engine);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error(`  [STRATEGY ROUTER ERROR] Handler failed for ${engine.id}: ${errMsg}`);
        }
      }
    }
    
    // Fallback default: Route to NetworkMapsHandler
    const fallback = new NetworkMapsHandler();
    return await fallback.handle(engine);
  }
}
