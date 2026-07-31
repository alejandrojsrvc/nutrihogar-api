import Decimal from 'decimal.js';
import {
  InvalidPreparedFoodLeftoverWeightError,
  PreparedFoodLeftoverAlreadyClosedError,
} from '../errors/prepared-food-leftover.errors';
import {
  PreparedFoodLeftoverCreateProps,
  PreparedFoodLeftoverNutrientSnapshotProps,
  PreparedFoodLeftoverProps,
  PreparedFoodLeftoverStatus,
} from '../models/prepared-food-leftover.models';

export class PreparedFoodLeftover {
  private constructor(private readonly props: PreparedFoodLeftoverProps) {}

  static create(input: PreparedFoodLeftoverCreateProps): PreparedFoodLeftover {
    const availableWeight = positiveDecimal(input.availableWeight);
    if (!availableWeight) throw new InvalidPreparedFoodLeftoverWeightError();

    return new PreparedFoodLeftover({
      ...input,
      availableWeight,
      storageLocation: input.storageLocation ?? null,
      notes: input.notes ?? null,
      status: 'AVAILABLE',
      nutrientDensitySnapshot: copyNutrients(input.nutrientDensitySnapshot),
    });
  }

  static reconstitute(props: PreparedFoodLeftoverProps): PreparedFoodLeftover {
    const availableWeight = positiveDecimal(props.availableWeight);
    if (!availableWeight) throw new InvalidPreparedFoodLeftoverWeightError();

    return new PreparedFoodLeftover({
      ...props,
      availableWeight,
      nutrientDensitySnapshot: copyNutrients(props.nutrientDensitySnapshot),
      storedAt: new Date(props.storedAt),
      createdAt: new Date(props.createdAt),
      updatedAt: new Date(props.updatedAt),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get preparedBatchId(): string {
    return this.props.preparedBatchId;
  }

  get householdId(): string {
    return this.props.householdId;
  }

  get availableWeight(): Decimal {
    return new Decimal(this.props.availableWeight);
  }

  get nutrientDensitySnapshot(): PreparedFoodLeftoverNutrientSnapshotProps[] {
    return copyNutrients(this.props.nutrientDensitySnapshot);
  }

  get storedAt(): Date {
    return new Date(this.props.storedAt);
  }

  get storageLocation(): string | null {
    return this.props.storageLocation;
  }

  get notes(): string | null {
    return this.props.notes;
  }

  get status(): PreparedFoodLeftoverStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return new Date(this.props.createdAt);
  }

  get updatedAt(): Date {
    return new Date(this.props.updatedAt);
  }

  changeStatus(status: PreparedFoodLeftoverStatus, changedAt: Date): void {
    if (this.props.status !== 'AVAILABLE') {
      throw new PreparedFoodLeftoverAlreadyClosedError();
    }
    if (status === 'AVAILABLE') return;

    this.props.status = status;
    this.props.updatedAt = new Date(changedAt);
  }

  toProps(): PreparedFoodLeftoverProps {
    return {
      ...this.props,
      availableWeight: new Decimal(this.props.availableWeight),
      nutrientDensitySnapshot: this.nutrientDensitySnapshot,
      storedAt: new Date(this.props.storedAt),
      createdAt: new Date(this.props.createdAt),
      updatedAt: new Date(this.props.updatedAt),
    };
  }
}

function positiveDecimal(value: Decimal.Value): Decimal | null {
  const decimal = new Decimal(value);
  return decimal.isFinite() && decimal.gt(0) ? decimal : null;
}

function copyNutrients(
  nutrients: PreparedFoodLeftoverNutrientSnapshotProps[],
): PreparedFoodLeftoverNutrientSnapshotProps[] {
  return nutrients.map((nutrient) => ({
    ...nutrient,
    amountPerGram: new Decimal(nutrient.amountPerGram),
  }));
}
