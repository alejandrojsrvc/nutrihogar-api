import {
  CancelledMealEditError,
  EmptyMealError,
  MealAlreadyCancelledError,
} from '../errors/meal.errors';
import { MealStatus, MealView } from '../models/meal.models';

export class Meal {
  static ensureHasItems(items: unknown[]): void {
    if (items.length === 0) throw new EmptyMealError();
  }

  static ensureCanBeEdited(status: MealStatus): void {
    if (status === 'CANCELLED') throw new CancelledMealEditError();
  }

  static ensureCanBeCancelled(status: MealStatus): void {
    if (status === 'CANCELLED') throw new MealAlreadyCancelledError();
  }

  static status(view: MealView): MealStatus {
    return view.status;
  }
}
