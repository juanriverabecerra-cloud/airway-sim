import type { VisualDataEngine } from '../../types/index.ts';

export interface IArchetypeHandler {
  /**
   * Returns true if this handler supports the given visual engine based on caption or text labels.
   */
  supports(engine: VisualDataEngine): boolean;

  /**
   * Process the raw visual data engine and populate its details schema.
   */
  handle(engine: VisualDataEngine): Promise<VisualDataEngine>;
}
