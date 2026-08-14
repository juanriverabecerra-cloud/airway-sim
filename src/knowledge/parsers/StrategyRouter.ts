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
    // Deterministic X-Y graph structure (axes/units/ticks/series) is computed by the
    // Python parser and lives in details.graph_structure. Handlers rebuild `details`,
    // which would drop it — so capture it here and re-attach if it was lost.
    const graphStructure = (engine.details as Record<string, unknown> | undefined)?.graph_structure;

    let result: VisualDataEngine | null = null;
    for (const handler of this.handlers) {
      if (handler.supports(engine)) {
        try {
          result = await handler.handle(engine);
          break;
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error(`  [STRATEGY ROUTER ERROR] Handler failed for ${engine.id}: ${errMsg}`);
        }
      }
    }
    if (!result) {
      // Fallback default: Route to NetworkMapsHandler
      result = await new NetworkMapsHandler().handle(engine);
    }

    if (graphStructure && result.details && !(result.details as Record<string, unknown>).graph_structure) {
      result.details = { ...(result.details as Record<string, unknown>), graph_structure: graphStructure };
    }
    return result;
  }
}
