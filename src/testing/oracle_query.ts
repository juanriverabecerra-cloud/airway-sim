import { textbookProse, physiologicalMatrices } from '../knowledge/medical_truth_snapshot.ts';

/**
 * Performs a rapid local wildcard match against textbook prose and physiological matrices.
 * Synchronous and 100% browser-safe (runs in React, Vite, Node.js, and tests).
 * 
 * @param subsystemKeyword - Search term or keyword (e.g. "locus ceruleus", "propofol")
 * @returns Array of matched unabridged text strings (prose bodies and structured payloads)
 */
export function getAnatomicalTruth(subsystemKeyword: string): string[] {
  if (!subsystemKeyword || subsystemKeyword.trim().length === 0) {
    return [];
  }

  const term = subsystemKeyword.toLowerCase();
  const results: string[] = [];

  // 1. Search textbook_prose
  for (const row of textbookProse) {
    const titleMatch = row.chapter_title && row.chapter_title.toLowerCase().includes(term);
    const headingMatch = row.section_heading && row.section_heading.toLowerCase().includes(term);
    const bodyMatch = row.body_text && row.body_text.toLowerCase().includes(term);

    if (titleMatch || headingMatch || bodyMatch) {
      if (row.body_text && row.body_text.trim().length > 0) {
        results.push(row.body_text);
      }
    }
  }

  // 2. Search physiological_matrices
  for (const row of physiologicalMatrices) {
    const archMatch = row.archetype && row.archetype.toLowerCase().includes(term);
    const capMatch = row.caption && row.caption.toLowerCase().includes(term);
    const payloadMatch = row.structured_payload && row.structured_payload.toLowerCase().includes(term);

    if (archMatch || capMatch || payloadMatch) {
      if (row.structured_payload && row.structured_payload.trim().length > 0) {
        results.push(row.structured_payload);
      }
    }
  }

  return results;
}

/**
 * Dynamically parses numeric parameters from natural language textbook sentences or tables.
 * Synchronous and 100% browser-safe.
 * 
 * @param keyword - Parameter search query
 * @param defaultValue - Fallback value if no match is found
 * @returns Parsed parameter value or defaultValue
 */
export function getAnatomicalParameter(keyword: string, defaultValue: number): number {
  const matches = getAnatomicalTruth(keyword);
  if (matches.length === 0) {
    return defaultValue;
  }

  for (const match of matches) {
    const matchLower = match.toLowerCase();
    
    // Pattern A: Match percent values like "drop of 30%" or "30% SVR drop"
    const percentMatch = matchLower.match(/(?:drop|reduction|decreased?|fall|change|depress)\s+(?:of|by|to)?\s*(\d+(?:\.\d+)?)\s*%/i) || 
                         matchLower.match(/(\d+(?:\.\d+)?)\s*%\s*(?:drop|reduction|decreased?|fall|change|depress)/i);
    if (percentMatch) {
      const val = parseFloat(percentMatch[1]);
      if (!isNaN(val)) return val;
    }

    // Pattern B: Match unit values like "+5.2 mEq/L" or "leak of 5.2" or "gradient of 29.6 mmHg"
    const unitMatch = matchLower.match(/(?:\+|-)?\s*(\d+(?:\.\d+)?)\s*(?:meq\/l|meq|mmhg|cmh2o|bpm|%)/i) ||
                      matchLower.match(/(?:leak|efflux|gradient|drop|stabilized)\s+(?:of|by|to)?\s*(?:\+|-)?\s*(\d+(?:\.\d+)?)/i);
    if (unitMatch) {
      const val = parseFloat(unitMatch[1]);
      if (!isNaN(val)) return val;
    }
    
    // Pattern C: Fallback match any float/number in the text
    const numberMatch = matchLower.match(/(\d+(?:\.\d+)?)/);
    if (numberMatch) {
      const val = parseFloat(numberMatch[1]);
      if (!isNaN(val)) return val;
    }
  }

  return defaultValue;
}

export interface TextbookRule {
  condition: string;       // e.g. "burns", "trendelenburg", "amiodarone"
  targetVital: 'hr' | 'rr' | 'map' | 'spo2' | 'k' | 'compl' | 'pip' | 'temp';
  operator: '+' | '-' | 'scale' | 'clamp';
  value: number;
}

export function extractTextbookRules(): TextbookRule[] {
  const conditionKeywords = [
    // Drugs
    'amiodarone', 'propofol', 'succinylcholine', 'sux', 'neostigmine', 'glycopyrrolate', 'lidocaine', 'epinephrine', 'rocuronium', 'vecuronium', 'sugammadex', 'atropine', 'esmolol', 'phenylephrine', 'ketamine', 'fentanyl', 'midazolam', 'sevoflurane', 'isoflurane', 'desflurane',
    // Positioning
    'trendelenburg', 'reverse trendelenburg', 'prone', 'supine', 'beach chair', 'sitting', 'head down', 'head up',
    // Pathological
    'sepsis', 'septic', 'burns', 'burn', 'trauma', 'obese', 'obesity', 'copd', 'anaphylaxis', 'bronchospasm', 'laryngospasm', 'hyperkalemia', 'hypokalemia', 'seizure'
  ];

  const canonicalCondition = (cond: string): string => {
    if (cond === 'sux') return 'succinylcholine';
    if (cond === 'septic') return 'sepsis';
    if (cond === 'burns') return 'burn';
    if (cond === 'obesity') return 'obese';
    return cond;
  };

  const rules: TextbookRule[] = [];

  for (const row of textbookProse) {
    if (!row.body_text) continue;
    // Split sentences using lookbehind for periods followed by spaces
    const sentences = row.body_text.split(/(?<=[.!?])\s+/);
    
    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      
      // Find matching condition
      let matchedCond: string | null = null;
      for (const cond of conditionKeywords) {
        if (sentenceLower.includes(cond)) {
          matchedCond = canonicalCondition(cond);
          break;
        }
      }
      
      if (!matchedCond) continue;

      // Find target vital
      let targetVital: 'hr' | 'rr' | 'map' | 'spo2' | 'k' | 'compl' | 'pip' | 'temp' | null = null;
      if (sentenceLower.match(/(heart\s*rate|pulse|beats\s*per\s*minute)/i)) {
        targetVital = 'hr';
      } else if (sentenceLower.match(/(respiratory\s*rate|breathing\s*rate|breaths\s*per\s*minute)/i)) {
        targetVital = 'rr';
      } else if (sentenceLower.match(/(mean\s*arterial\s*pressure|map|blood\s*pressure|systolic|diastolic)/i)) {
        targetVital = 'map';
      } else if (sentenceLower.match(/(spo2|oxygen\s*saturation|sao2)/i)) {
        targetVital = 'spo2';
      } else if (sentenceLower.match(/(potassium|k\+)/i)) {
        targetVital = 'k';
      } else if (sentenceLower.match(/(compliance|lung\s*compliance|chest\s*wall\s*compliance)/i)) {
        targetVital = 'compl';
      } else if (sentenceLower.match(/(peak\s*inspiratory\s*pressure|pip|airway\s*pressure)/i)) {
        targetVital = 'pip';
      } else if (sentenceLower.match(/(temperature|temp|body\s*temperature|core\s*temperature)/i)) {
        targetVital = 'temp';
      }

      if (!targetVital) continue;

      // Extract operator and value
      let operator: '+' | '-' | 'scale' | 'clamp' | null = null;
      let value = 0;

      // 1. Percentage-based decrease: "decreases compliance by 20%" or "compliance drops by 20%"
      const decPercentMatch = sentenceLower.match(/(?:reduces?|decreases?|drops?|falls?|declines?|depress(?:es|ed)?|loss|deficit)\s+(?:.*?\s+)?(?:by|of|to)?\s*(\d+(?:\.\d+)?)\s*%/i) ||
                             sentenceLower.match(/(\d+(?:\.\d+)?)\s*%\s*(?:drop|reduction|decrease|fall|decline)/i);
      if (decPercentMatch) {
        operator = 'scale';
        value = 1 - parseFloat(decPercentMatch[1]) / 100;
      }

      // 2. Percentage-based increase: "increases heart rate by 15%"
      if (!operator) {
        const incPercentMatch = sentenceLower.match(/(?:increases?|raises?|elevates?|rises?|goes\s+up|enhances?)\s+(?:.*?\s+)?(?:by|of|to)?\s*(?:\+)?\s*(\d+(?:\.\d+)?)\s*%/i) ||
                               sentenceLower.match(/(\d+(?:\.\d+)?)\s*%\s*(?:increase|rise|elevation|enhancement)/i);
        if (incPercentMatch) {
          operator = 'scale';
          value = 1 + parseFloat(incPercentMatch[1]) / 100;
        }
      }

      // 3. Absolute decrease: "reduces heart rate by 15 bpm"
      if (!operator) {
        const decAbsMatch = sentenceLower.match(/(?:reduces?|decreases?|drops?|falls?|declines?|depress(?:es|ed)?|loss|deficit)\s+(?:.*?\s+)?(?:by|of|to)?\s*(\d+(?:\.\d+)?)/i);
        if (decAbsMatch) {
          operator = '-';
          value = parseFloat(decAbsMatch[1]);
        }
      }

      // 4. Absolute increase: "increases respiratory rate by 8 breaths"
      if (!operator) {
        const incAbsMatch = sentenceLower.match(/(?:increases?|raises?|elevates?|rises?|goes\s+up|enhances?)\s+(?:.*?\s+)?(?:by|of|to)?\s*(?:\+)?\s*(\d+(?:\.\d+)?)/i);
        if (incAbsMatch) {
          operator = '+';
          value = parseFloat(incAbsMatch[1]);
        }
      }

      // 5. Clamp: "limits heart rate to 40 bpm"
      if (!operator) {
        const clampMatch = sentenceLower.match(/(?:limits?|clamps?|stabilizes?|holds?|caps?)\s+(?:.*?\s+)?(?:to|at)?\s*(\d+(?:\.\d+)?)/i);
        if (clampMatch) {
          operator = 'clamp';
          value = parseFloat(clampMatch[1]);
        }
      }

      if (operator !== null) {
        rules.push({
          condition: matchedCond,
          targetVital,
          operator,
          value
        });
      }
    }
  }

  return rules;
}

/**
 * Stub function for CJS connection cleanup compatibility.
 */
export function closeQueryBridge(): void {}
