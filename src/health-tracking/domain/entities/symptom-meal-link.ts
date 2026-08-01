import { SymptomMealLinkProps } from '../models/digestive-symptom.models';
import { MealId } from '../value-objects/digestive-symptom.value-objects';

export class SymptomMealLink {
  private constructor(private readonly props: SymptomMealLinkProps) {}
  static create(mealId: string): SymptomMealLink {
    return new SymptomMealLink({ mealId: new MealId(mealId).value });
  }
  toProps(): SymptomMealLinkProps {
    return { ...this.props };
  }
}
