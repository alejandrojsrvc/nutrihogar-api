import { DigestiveSymptomEntryProps } from '../models/digestive-symptom.models';
import {
  DigestiveSymptomEntryId,
  DigestiveSymptomType,
  DigestiveSymptomTypeValue,
  FoodId,
  MealId,
  SymptomFoodLinkSourceValue,
  SymptomIntensity,
  SymptomOccurredAt,
  SymptomStatus,
} from '../value-objects/digestive-symptom.value-objects';
import {
  InvalidDigestiveSymptomStateError,
  InvalidHealthTrackingValueError,
} from '../errors/health-tracking.errors';
import { SymptomFoodLink } from './symptom-food-link';
import { SymptomMealLink } from './symptom-meal-link';

type CreateInput = {
  id: string;
  adultProfileId: string;
  type: DigestiveSymptomTypeValue;
  name?: string | null;
  notes?: string | null;
  intensity: number;
  startAt: Date | string;
  endAt?: Date | string | null;
  now: Date;
  toleranceMs?: number;
};

export class DigestiveSymptomEntry {
  private constructor(private readonly props: DigestiveSymptomEntryProps) {}

  static create(input: CreateInput): DigestiveSymptomEntry {
    return DigestiveSymptomEntry.build(input, null);
  }

  private static build(input: CreateInput, correctedFromId: string | null): DigestiveSymptomEntry {
    const type = DigestiveSymptomType.from(input.type);
    const name = input.name ? input.name.trim().replace(/\s+/g, ' ').normalize('NFC') : null;
    if (type.value === 'OTHER' && !name) {
      throw new InvalidHealthTrackingValueError('Other symptoms require a name.');
    }
    if (type.value !== 'OTHER' && name) {
      throw new InvalidHealthTrackingValueError('Standard symptoms cannot have a custom name.');
    }
    if (!input.adultProfileId?.trim()) {
      throw new InvalidHealthTrackingValueError('Adult profile id is required.');
    }
    const occurredAt = SymptomOccurredAt.from(
      input.startAt,
      input.endAt,
      input.now,
      input.toleranceMs,
    );
    SymptomIntensity.from(input.intensity);
    return new DigestiveSymptomEntry({
      id: new DigestiveSymptomEntryId(input.id).value,
      adultProfileId: input.adultProfileId,
      type: type.value,
      name,
      notes: input.notes?.trim() || null,
      intensity: input.intensity,
      startAt: occurredAt.startAt,
      endAt: occurredAt.endAt,
      status: 'ACTIVE',
      correctedFromId,
      mealLinks: [],
      foodLinks: [],
    });
  }

  static fromPersistence(input: DigestiveSymptomEntryProps): DigestiveSymptomEntry {
    return new DigestiveSymptomEntry({
      ...input,
      startAt: new Date(input.startAt),
      endAt: input.endAt ? new Date(input.endAt) : null,
      mealLinks: input.mealLinks.map((link) => ({ ...link })),
      foodLinks: input.foodLinks.map((link) => ({
        ...link,
        snapshot: link.snapshot ? { ...link.snapshot } : null,
      })),
    });
  }

  resolve(): void {
    this.changeStatus('RESOLVED');
  }

  cancel(): void {
    this.changeStatus('CANCELLED');
  }

  linkMeal(mealId: string): void {
    this.ensureActive();
    const id = new MealId(mealId).value;
    if (!this.props.mealLinks.some((link) => link.mealId === id)) {
      this.props.mealLinks.push(SymptomMealLink.create(id).toProps());
    }
  }

  unlinkMeal(mealId: string): void {
    this.ensureActive();
    const id = new MealId(mealId).value;
    this.props.mealLinks = this.props.mealLinks.filter((link) => link.mealId !== id);
  }

  linkFood(input: {
    foodId: string;
    source: SymptomFoodLinkSourceValue;
    mealId?: string | null;
    snapshot?: Record<string, unknown> | null;
  }): void {
    this.ensureActive();
    const foodId = new FoodId(input.foodId).value;
    const mealId = input.mealId == null ? null : new MealId(input.mealId).value;
    if ((input.source === 'MEAL_SELECTED' || input.source === 'FOOD_FROM_MEAL') && !mealId) {
      throw new InvalidHealthTrackingValueError('Meal-derived food links require a meal id.');
    }
    if (input.source === 'MANUAL_HYPOTHESIS' && mealId) {
      throw new InvalidHealthTrackingValueError('Manual food hypotheses cannot have a meal id.');
    }
    if (!['MEAL_SELECTED', 'FOOD_FROM_MEAL', 'MANUAL_HYPOTHESIS'].includes(input.source)) {
      throw new InvalidHealthTrackingValueError('Invalid symptom food link source.');
    }
    if (!this.props.foodLinks.some((link) => link.foodId === foodId && link.mealId === mealId)) {
      this.props.foodLinks.push(SymptomFoodLink.create({ ...input, foodId, mealId }).toProps());
    }
  }

  correct(
    input: Omit<CreateInput, 'adultProfileId' | 'toleranceMs'> & { toleranceMs?: number },
  ): DigestiveSymptomEntry {
    this.ensureActive();
    const corrected = DigestiveSymptomEntry.build(
      {
        ...input,
        adultProfileId: this.props.adultProfileId,
        toleranceMs: input.toleranceMs,
      },
      this.props.id,
    );
    this.props.status = 'CORRECTED';
    return corrected;
  }

  toProps(): DigestiveSymptomEntryProps {
    return {
      ...this.props,
      startAt: new Date(this.props.startAt),
      endAt: this.props.endAt ? new Date(this.props.endAt) : null,
      mealLinks: this.props.mealLinks.map((link) => ({ ...link })),
      foodLinks: this.props.foodLinks.map((link) => ({
        ...link,
        snapshot: link.snapshot ? { ...link.snapshot } : null,
      })),
    };
  }

  get id(): string {
    return this.props.id;
  }
  get status(): DigestiveSymptomEntryProps['status'] {
    return this.props.status;
  }
  get correctedFromId(): string | null {
    return this.props.correctedFromId;
  }
  get durationMs(): number | null {
    return this.props.endAt ? this.props.endAt.getTime() - this.props.startAt.getTime() : null;
  }

  private changeStatus(status: 'RESOLVED' | 'CANCELLED'): void {
    this.ensureActive();
    this.props.status = SymptomStatus.from(status).value;
  }

  private ensureActive(): void {
    if (this.props.status !== 'ACTIVE') {
      throw new InvalidDigestiveSymptomStateError('Only active symptoms can be changed.');
    }
  }
}
