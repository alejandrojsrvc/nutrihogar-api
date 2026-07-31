import Decimal from 'decimal.js';

export type PreparedFoodLeftoverStatus = 'AVAILABLE' | 'CONSUMED' | 'DISCARDED' | 'EXPIRED';

export interface PreparedFoodLeftoverNutrientSnapshotProps {
  code: string;
  name: string;
  unit: string;
  amountPerGram: Decimal;
}

export interface PreparedFoodLeftoverProps {
  id: string;
  preparedBatchId: string;
  householdId: string;
  availableWeight: Decimal;
  nutrientDensitySnapshot: PreparedFoodLeftoverNutrientSnapshotProps[];
  storedAt: Date;
  storageLocation: string | null;
  notes: string | null;
  status: PreparedFoodLeftoverStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PreparedFoodLeftoverCreateProps {
  id: string;
  preparedBatchId: string;
  householdId: string;
  availableWeight: Decimal.Value;
  nutrientDensitySnapshot: PreparedFoodLeftoverNutrientSnapshotProps[];
  storedAt: Date;
  storageLocation?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
