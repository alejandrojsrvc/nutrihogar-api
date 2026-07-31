import Decimal from 'decimal.js';
import { MealType } from '../../../meal-tracking/domain/models/meal.models';
import { PortionRemainderDisposition } from '../../domain/models/served-portion.models';

export interface ConfirmServedPortionConsumptionCommand {
  actorId: string;
  portionId: string;
  remainderWeight?: Decimal.Value;
  remainderDisposition?: PortionRemainderDisposition;
  mealType: MealType;
  consumedAt: Date;
}

export interface ConfirmServedPortionConsumptionResult {
  portionId: string;
  adultProfileId: string;
  servedWeight: Decimal;
  consumedWeight: Decimal;
  remainderWeight: Decimal | null;
  remainderDisposition: PortionRemainderDisposition | null;
  mealId: string | null;
  nutrients: Array<{
    code: string;
    name: string;
    unit: string;
    amount: Decimal;
  }>;
}
