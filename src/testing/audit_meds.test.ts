import { describe, it, expect } from 'vitest';
import { MEDICATIONS } from '../engine/Pharmacology';
import { MEDICATIONS_CONFIG } from '../engine/config/meds.config';

describe('Pharmacology Databases Audit', () => {
  it('should verify that MEDICATIONS and MEDICATIONS_CONFIG are in sync', () => {
    const productionKeys = Object.keys(MEDICATIONS).sort();
    const configKeys = Object.keys(MEDICATIONS_CONFIG).sort();

    console.log(`Production database has ${productionKeys.length} drugs.`);
    console.log(`Config database has ${configKeys.length} drugs.`);

    // 1. Check for key mismatch
    const missingInConfig = productionKeys.filter(k => !configKeys.includes(k));
    const missingInProduction = configKeys.filter(k => !productionKeys.includes(k));

    if (missingInConfig.length > 0) {
      console.warn('Drugs in production but missing in config:', missingInConfig);
    }
    if (missingInProduction.length > 0) {
      console.warn('Drugs in config but missing in production:', missingInProduction);
    }

    // 2. Check for parameter differences
    const mismatches: string[] = [];

    const commonKeys = productionKeys.filter(k => configKeys.includes(k));

    commonKeys.forEach(key => {
      const prodDrug = MEDICATIONS[key];
      const confDrug = MEDICATIONS_CONFIG[key];

      // Compare name
      if (prodDrug.name !== confDrug.name) {
        mismatches.push(`${key}: name mismatch ('${prodDrug.name}' vs '${confDrug.name}')`);
      }

      // Compare classes
      if (JSON.stringify(prodDrug.classes) !== JSON.stringify(confDrug.classes)) {
        mismatches.push(`${key}: classes mismatch ('${JSON.stringify(prodDrug.classes)}' vs '${JSON.stringify(confDrug.classes)}')`);
      }

      // Compare pk parameters
      const pkKeys = ['V1', 'V2', 'V3', 'k10', 'k12', 'k21', 'k13', 'k31', 'ke0'] as const;
      pkKeys.forEach(pkKey => {
        const prodVal = prodDrug.pk[pkKey];
        const confVal = confDrug.pk[pkKey];
        if (prodVal !== confVal) {
          mismatches.push(`${key}.pk.${pkKey} mismatch (${prodVal} vs ${confVal})`);
        }
      });

      // Compare pd parameters
      const pdKeys = ['c50', 'gamma', 'sysMax', 'diaMax', 'hrMax', 'rrMax', 'inducesApneaAtCe', 'inducesParalysisAtCe'] as const;
      pdKeys.forEach(pdKey => {
        const prodVal = prodDrug.pd[pdKey];
        const confVal = confDrug.pd[pdKey];
        if (prodVal !== confVal) {
          mismatches.push(`${key}.pd.${pdKey} mismatch (${prodVal} vs ${confVal})`);
        }
      });

      // Compare receptors if present
      if (prodDrug.pd.receptors || confDrug.pd.receptors) {
        if (!prodDrug.pd.receptors || !confDrug.pd.receptors) {
          mismatches.push(`${key}.pd.receptors mismatch (one lacks receptors)`);
        } else {
          const recKeys = ['Alpha1', 'Beta1', 'Beta2', 'V1'] as const;
          recKeys.forEach(recKey => {
            const prodVal = prodDrug.pd.receptors[recKey];
            const confVal = confDrug.pd.receptors[recKey];
            if (prodVal !== confVal) {
              mismatches.push(`${key}.pd.receptors.${recKey} mismatch (${prodVal} vs ${confVal})`);
            }
          });
        }
      }
    });

    if (mismatches.length > 0) {
      console.error('Mismatches found in shared drugs:', mismatches);
    }
    
    expect(missingInConfig).toEqual([]);
    expect(missingInProduction).toEqual([]);
    expect(mismatches).toEqual([]);
  });
});
