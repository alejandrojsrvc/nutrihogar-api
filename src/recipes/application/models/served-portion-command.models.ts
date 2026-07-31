import Decimal from 'decimal.js';

export interface ServedPortionCommand {
  adultProfileId: string;
  servedWeight: number | string;
}

export interface ServePreparedBatchPortionsCommand {
  actorId: string;
  batchId: string;
  servedAt?: Date;
  portions: ServedPortionCommand[];
}

export interface ServedPortionResult {
  id: string;
  adultProfileId: string;
  servedWeight: Decimal;
  estimatedNutrition: Record<string, Decimal>;
}

export interface ServePreparedBatchPortionsResult {
  preparedBatchId: string;
  portions: ServedPortionResult[];
  availableWeight: Decimal;
}
