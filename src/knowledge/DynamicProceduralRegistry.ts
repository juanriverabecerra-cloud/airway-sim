import { textbookProse, physiologicalMatrices } from './medical_truth_snapshot.ts';

export interface ProceduralStep {
  index: number;
  label: string;
  mandatory: boolean;
  validationField?: string;
  expectedValue?: any;
  failReason?: string;
}

export interface ProceduralPathway {
  name: string;
  steps: ProceduralStep[];
  description: string;
}

export class DynamicProceduralRegistry {
  private static pathways: Record<string, ProceduralPathway> = {};
  private static initialized = false;

  /**
   * Scans textbook snapshots, extracts procedural pathways, and initializes clinical check lists.
   */
  public static hydrate(): Record<string, ProceduralPathway> {
    if (this.initialized) {
      return this.pathways;
    }

    console.log(`[DynamicProceduralRegistry] Hydrating procedural pathways...`);

    // 1. Scan textbook prose for numbered procedural sequences
    for (const prose of textbookProse) {
      const heading = (prose.section_heading || '').toLowerCase();
      
      // Look for headings describing procedural techniques
      if (heading.includes('intubation') || heading.includes('rsi') || heading.includes('airway') || heading.includes('awake') || heading.includes('fiberoptic') || heading.includes('induction')) {
        const steps = this.extractStepsFromText(prose.body_text);
        if (steps.length > 0) {
          const pathwayName = this.determinePathwayName(prose.section_heading, prose.body_text);
          this.pathways[pathwayName.toLowerCase()] = {
            name: pathwayName,
            steps,
            description: prose.body_text.slice(0, 150) + '...'
          };
          console.log(`  ✓ Dynamically registered procedural pathway: ${pathwayName} (${steps.length} steps)`);
        }
      }
    }

    // 2. Scan timeline step charts
    for (const matrix of physiologicalMatrices) {
      if (matrix.archetype === 'TIMELINE_STEP_CHART_HYPNOGRAM' || matrix.caption.toLowerCase().includes('procedure') || matrix.caption.toLowerCase().includes('step') || matrix.caption.toLowerCase().includes('sequence')) {
        try {
          const payload = JSON.parse(matrix.structured_payload);
          const labels = payload.labels || (payload.details && payload.details.labels);
          if (labels && labels.length > 0) {
            const steps: ProceduralStep[] = labels.map((lbl: string, idx: number) => {
              const step: ProceduralStep = {
                index: idx + 1,
                label: lbl,
                mandatory: true
              };
              
              // Programmatically assign dynamic validation constraints based on standard vocabulary mapping
              const lowerLabel = lbl.toLowerCase();
              if (lowerLabel.includes('topicalize') || lowerLabel.includes('local anesthetic') || lowerLabel.includes('benzocaine') || lowerLabel.includes('lidocaine spray')) {
                step.validationField = 'isTopicalized';
                step.expectedValue = true;
                step.failReason = `Awake intubation failed! Severe, life-threatening laryngospasm triggered due to lack of adequate airway topicalization. Complete step: "${lbl}".`;
              } else if (lowerLabel.includes('paralyze') || lowerLabel.includes('paralytic') || lowerLabel.includes('succinylcholine') || lowerLabel.includes('rocuronium')) {
                step.validationField = 'isParalyzed';
                step.expectedValue = true;
                step.failReason = `Intubation attempt failed! Patient has active muscular tone and severe airway reflexes. Administer paralytic drug to secure step: "${lbl}".`;
              } else if (lowerLabel.includes('pre-oxygenate') || lowerLabel.includes('oxygenate') || lowerLabel.includes('fio2')) {
                step.validationField = 'isApneic';
                step.expectedValue = false;
              }
              
              return step;
            });
            const pathwayName = this.determinePathwayName(matrix.caption, matrix.structured_payload);
            this.pathways[pathwayName.toLowerCase()] = {
              name: pathwayName,
              steps,
              description: matrix.caption
            };
            console.log(`  ✓ Dynamically registered timeline pathway: ${pathwayName} (${steps.length} steps)`);
          }
        } catch (e) {
          // Silent catch
        }
      }
    }

    // Insert fallback/standard clinical rules if no textbook match is found to guarantee baseline safety
    this.ensureBaselinePathways();

    this.initialized = true;
    return this.pathways;
  }

  /**
   * Helper to manually register a pathway (e.g. during testing)
   */
  public static registerPathway(key: string, pathway: ProceduralPathway): void {
    this.pathways[key.toLowerCase().trim()] = pathway;
  }

  /**
   * Validates if the simulator state complies with a dynamically parsed pathway.
   * 
   * @param pathwayKey - Name of the procedure (e.g. "awake fiberoptic", "rsi")
   * @param state - The current ProceduralPatientState from the engine
   * @returns object with { success: boolean, failReason: string }
   */
  public static validateState(pathwayKey: string, state: any): { success: boolean; failReason: string } {
    this.hydrate();
    
    const key = pathwayKey.toLowerCase().trim();
    // Search for closest matching pathway
    let matchedPathway = this.pathways[key];
    if (!matchedPathway) {
      // Wildcard match
      const foundKey = Object.keys(this.pathways).find(k => k.includes(key) || key.includes(k));
      if (foundKey) matchedPathway = this.pathways[foundKey];
    }

    if (!matchedPathway) {
      return { success: true, failReason: "" }; // No dynamic constraints, pass through
    }

    for (const step of matchedPathway.steps) {
      if (step.mandatory && step.validationField) {
        const actualVal = state[step.validationField];
        if (actualVal !== step.expectedValue) {
          return {
            success: false,
            failReason: step.failReason || `Procedural violation of ${matchedPathway.name} step: "${step.label}" expected ${step.validationField} to be ${step.expectedValue} but got ${actualVal}.`
          };
        }
      }
    }

    return { success: true, failReason: "" };
  }

  /**
   * Resets the registry.
   */
  public static reset(): void {
    this.pathways = {};
    this.initialized = false;
  }

  /**
   * Parses textbook prose paragraphs for step indicators and extracts structured step rules.
   */
  private static extractStepsFromText(text: string): ProceduralStep[] {
    const steps: ProceduralStep[] = [];
    const lines = text.split('\n');
    let idx = 1;

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Match patterns like "Step 1: Topicalize the airway" or "1. Pre-oxygenate"
      const stepMatch = trimmed.match(/^(?:step\s*(\d+)[:.]|(\d+)\.)\s*(.+)$/i);
      if (stepMatch) {
        const label = (stepMatch[3] || '').trim();
        if (label.length > 5) {
          const step: ProceduralStep = {
            index: idx,
            label,
            mandatory: true
          };

          // Programmatically assign dynamic validation constraints based on standard vocabulary mapping
          const lowerLabel = label.toLowerCase();
          if (lowerLabel.includes('topicalize') || lowerLabel.includes('local anesthetic') || lowerLabel.includes('benzocaine') || lowerLabel.includes('lidocaine spray')) {
            step.validationField = 'isTopicalized';
            step.expectedValue = true;
            step.failReason = `Awake intubation failed! Severe, life-threatening laryngospasm triggered due to lack of adequate airway topicalization. Complete step: "${label}".`;
          } else if (lowerLabel.includes('paralyze') || lowerLabel.includes('paralytic') || lowerLabel.includes('succinylcholine') || lowerLabel.includes('rocuronium')) {
            step.validationField = 'isParalyzed';
            step.expectedValue = true;
            step.failReason = `Intubation attempt failed! Patient has active muscular tone and severe airway reflexes. Administer paralytic drug to secure step: "${label}".`;
          } else if (lowerLabel.includes('pre-oxygenate') || lowerLabel.includes('oxygenate') || lowerLabel.includes('fio2')) {
            step.validationField = 'isApneic';
            step.expectedValue = false; // Patient should be breathing or oxygenated
          }

          steps.push(step);
          idx++;
        }
      }
    }

    return steps;
  }

  /**
   * Helper to deduce an appropriate pathway name from section headers or content context.
   */
  private static determinePathwayName(header: string, content: string): string {
    const textToMatch = `${header} ${content}`.toLowerCase();
    if (textToMatch.includes('awake') || textToMatch.includes('fiberoptic')) {
      return 'Awake Fiberoptic Intubation';
    }
    if (textToMatch.includes('rsi') || textToMatch.includes('rapid sequence')) {
      return 'Rapid Sequence Induction';
    }
    if (textToMatch.includes('surgical') || textToMatch.includes('cric') || textToMatch.includes('cricothyroidotomy')) {
      return 'Surgical Cricothyroidotomy';
    }
    return header || 'Standard Airway Management';
  }

  /**
   * Guarantees high-fidelity clinical baselines are always loaded.
   */
  private static ensureBaselinePathways(): void {
    if (!this.pathways['awake fiberoptic intubation']) {
      this.pathways['awake fiberoptic intubation'] = {
        name: 'Awake Fiberoptic Intubation',
        description: 'Standard textbook awake intubation checklist requiring topicalization.',
        steps: [
          {
            index: 1,
            label: 'Airway examination and assessment',
            mandatory: false
          },
          {
            index: 2,
            label: 'Thorough mucosal topicalization with local anesthetics (e.g. lidocaine/benzocaine)',
            mandatory: true,
            validationField: 'isTopicalized',
            expectedValue: true,
            failReason: 'Awake fiberoptic intubation failed! Severe, life-threatening laryngospasm triggered due to lack of mucosal topicalization. The vocal cords snapped shut.'
          },
          {
            index: 3,
            label: 'Advance fiberoptic scope and direct tube into trachea',
            mandatory: true
          }
        ]
      };
    }

    if (!this.pathways['rapid sequence induction']) {
      this.pathways['rapid sequence induction'] = {
        name: 'Rapid Sequence Induction',
        description: 'Standard rapid sequence induction requiring neuromuscular blockade.',
        steps: [
          {
            index: 1,
            label: 'Pre-oxygenation and preparation',
            mandatory: false
          },
          {
            index: 2,
            label: 'Administer induction agent and immediately push rapid paralytic (succinylcholine or rocuronium)',
            mandatory: true,
            validationField: 'isParalyzed',
            expectedValue: true,
            failReason: 'Rapid Sequence Induction failed! Patient had active muscular tone, resulting in immediate severe laryngospasm and coughing on laryngoscopy.'
          },
          {
            index: 3,
            label: 'Perform laryngoscopy and place ETT',
            mandatory: true
          }
        ]
      };
    }
  }
}
