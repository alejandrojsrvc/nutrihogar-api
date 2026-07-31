import Decimal from 'decimal.js';
import { PreparedFoodLeftover } from '../../domain/entities/prepared-food-leftover';
import { PreparedFoodLeftoverStatus } from '../../domain/models/prepared-food-leftover.models';

export interface RegisterPreparedFoodLeftoverCommand {
  actorId: string;
  batchId: string;
  availableWeight: Decimal.Value;
  storedAt: Date;
  storageLocation?: string | null;
  notes?: string | null;
}

export interface ListPreparedFoodLeftoversCommand {
  actorId: string;
  householdId: string;
  status?: PreparedFoodLeftoverStatus;
}

export interface UpdatePreparedFoodLeftoverStatusCommand {
  actorId: string;
  leftoverId: string;
  status: Exclude<PreparedFoodLeftoverStatus, 'AVAILABLE'>;
}

export type PreparedFoodLeftoverResult = PreparedFoodLeftover;
