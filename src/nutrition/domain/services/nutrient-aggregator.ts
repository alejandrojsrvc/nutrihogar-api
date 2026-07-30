import Decimal from 'decimal.js';
import { NutrientAmounts } from '../models/nutrition-engine.models';

export class NutrientAggregator {
  sum(collections: NutrientAmounts[]): NutrientAmounts {
    const totals: NutrientAmounts = {};

    for (const nutrients of collections) {
      for (const [code, amount] of Object.entries(nutrients)) {
        totals[code] = (totals[code] ?? new Decimal(0)).add(amount);
      }
    }

    return totals;
  }
}
