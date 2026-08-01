import { SymptomFoodLinkProps } from '../models/digestive-symptom.models';
import {
  FoodId,
  MealId,
  SymptomFoodLinkSourceValue,
} from '../value-objects/digestive-symptom.value-objects';

export class SymptomFoodLink {
  private constructor(private readonly props: SymptomFoodLinkProps) {}
  static create(input: {
    foodId: string;
    source: SymptomFoodLinkSourceValue;
    mealId?: string | null;
    snapshot?: Record<string, unknown> | null;
  }): SymptomFoodLink {
    return new SymptomFoodLink({
      foodId: new FoodId(input.foodId).value,
      source: input.source,
      mealId: input.mealId == null ? null : new MealId(input.mealId).value,
      snapshot: input.snapshot ? { ...input.snapshot } : null,
    });
  }
  toProps(): SymptomFoodLinkProps {
    return {
      ...this.props,
      snapshot: this.props.snapshot ? { ...this.props.snapshot } : null,
    };
  }
}
