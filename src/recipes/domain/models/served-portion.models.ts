import Decimal from 'decimal.js';

export type ServedPortionStatus = 'SERVED' | 'CONSUMED' | 'CANCELLED';
export type PortionRemainderDisposition = 'SAVED' | 'DISCARDED' | 'SHARED' | 'CONSUMED_LATER';

export interface ServedPortionNutrientSnapshotProps {
  code: string;
  name: string;
  unit: string;
  amount: Decimal;
}

export interface PortionRemainderProps {
  id: string;
  weight: Decimal;
  disposition: PortionRemainderDisposition;
  createdAt: Date;
}

export interface ServedPortionProps {
  id: string;
  preparedBatchId: string;
  adultProfileId: string;
  servedWeight: Decimal;
  servedAt: Date;
  status: ServedPortionStatus;
  remainder: PortionRemainderProps | null;
  consumedWeight: Decimal | null;
  nutritionSnapshot: ServedPortionNutrientSnapshotProps[];
  mealId: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
}

export interface ServedPortionCreateProps {
  id: string;
  preparedBatchId: string;
  adultProfileId: string;
  servedWeight: Decimal.Value;
  servedAt: Date;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}
