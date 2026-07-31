import crypto from 'node:crypto';
import Decimal from 'decimal.js';
import {
  InvalidRemainderWeightError,
  InvalidServedWeightError,
  RemainderAlreadyRecordedError,
  RemainderExceedsServedWeightError,
  ServedPortionAlreadyConsumedError,
  ServedPortionCancelledError,
  ServedPortionNotServedError,
} from '../errors/served-portion.errors';
import {
  PortionRemainderDisposition,
  PortionRemainderProps,
  ServedPortionCreateProps,
  ServedPortionNutrientSnapshotProps,
  ServedPortionProps,
  ServedPortionStatus,
} from '../models/served-portion.models';

export class ServedPortion {
  private constructor(private readonly props: ServedPortionProps) {}

  static create(input: ServedPortionCreateProps): ServedPortion {
    const servedWeight = positiveDecimal(input.servedWeight);
    if (!servedWeight) throw new InvalidServedWeightError();

    return new ServedPortion({
      ...input,
      servedWeight,
      status: 'SERVED',
      remainder: null,
      consumedWeight: null,
      nutritionSnapshot: [],
      mealId: null,
      cancelledAt: null,
    });
  }

  static reconstitute(props: ServedPortionProps): ServedPortion {
    const servedWeight = positiveDecimal(props.servedWeight);
    if (!servedWeight) throw new InvalidServedWeightError();

    return new ServedPortion({
      ...props,
      servedWeight,
      remainder: props.remainder ? copyRemainder(props.remainder) : null,
      consumedWeight: copyDecimal(props.consumedWeight),
      nutritionSnapshot: copyNutrients(props.nutritionSnapshot),
      servedAt: new Date(props.servedAt),
      createdAt: new Date(props.createdAt),
      updatedAt: new Date(props.updatedAt),
      cancelledAt: props.cancelledAt ? new Date(props.cancelledAt) : null,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get preparedBatchId(): string {
    return this.props.preparedBatchId;
  }

  get adultProfileId(): string {
    return this.props.adultProfileId;
  }

  get servedWeight(): Decimal {
    return new Decimal(this.props.servedWeight);
  }

  get servedAt(): Date {
    return new Date(this.props.servedAt);
  }

  get status(): ServedPortionStatus {
    return this.props.status;
  }

  get remainder(): PortionRemainderProps | null {
    return this.props.remainder ? copyRemainder(this.props.remainder) : null;
  }

  get consumedWeight(): Decimal | null {
    return copyDecimal(this.props.consumedWeight);
  }

  get nutritionSnapshot(): ServedPortionNutrientSnapshotProps[] {
    return copyNutrients(this.props.nutritionSnapshot);
  }

  get mealId(): string | null {
    return this.props.mealId;
  }

  get createdById(): string {
    return this.props.createdById;
  }

  get createdAt(): Date {
    return new Date(this.props.createdAt);
  }

  get updatedAt(): Date {
    return new Date(this.props.updatedAt);
  }

  get cancelledAt(): Date | null {
    return this.props.cancelledAt ? new Date(this.props.cancelledAt) : null;
  }

  recordRemainder(
    weight: Decimal.Value,
    disposition: PortionRemainderDisposition,
    createdAt: Date,
  ): void {
    this.ensureServed();
    if (this.props.remainder) throw new RemainderAlreadyRecordedError();

    const remainderWeight = nonNegativeDecimal(weight);
    if (remainderWeight === null) throw new InvalidRemainderWeightError();
    if (remainderWeight.gt(this.props.servedWeight)) {
      throw new RemainderExceedsServedWeightError();
    }

    this.props.remainder = {
      id: crypto.randomUUID(),
      weight: remainderWeight,
      disposition,
      createdAt: new Date(createdAt),
    };
    this.props.consumedWeight = this.props.servedWeight.sub(remainderWeight);
    this.touch(createdAt);
  }

  confirmConsumption(
    nutrients: ServedPortionNutrientSnapshotProps[],
    confirmedAt: Date,
    mealId: string | null = null,
  ): void {
    this.ensureServed();
    this.props.consumedWeight ??= new Decimal(this.props.servedWeight);
    this.props.nutritionSnapshot = copyNutrients(nutrients);
    this.props.mealId = mealId;
    this.props.status = 'CONSUMED';
    this.touch(confirmedAt);
  }

  cancel(cancelledAt: Date): void {
    if (this.props.status === 'CANCELLED') throw new ServedPortionCancelledError();
    if (this.props.status === 'CONSUMED') throw new ServedPortionAlreadyConsumedError();
    this.props.status = 'CANCELLED';
    this.props.cancelledAt = new Date(cancelledAt);
    this.touch(cancelledAt);
  }

  toProps(): ServedPortionProps {
    return {
      ...this.props,
      servedWeight: new Decimal(this.props.servedWeight),
      servedAt: new Date(this.props.servedAt),
      remainder: this.remainder,
      consumedWeight: this.consumedWeight,
      nutritionSnapshot: this.nutritionSnapshot,
      createdAt: new Date(this.props.createdAt),
      updatedAt: new Date(this.props.updatedAt),
      cancelledAt: this.cancelledAt,
    };
  }

  private ensureServed(): void {
    if (this.props.status === 'CANCELLED') throw new ServedPortionCancelledError();
    if (this.props.status === 'CONSUMED') throw new ServedPortionAlreadyConsumedError();
    if (this.props.status !== 'SERVED') throw new ServedPortionNotServedError();
  }

  private touch(date: Date): void {
    this.props.updatedAt = new Date(date);
  }
}

function positiveDecimal(value: Decimal.Value): Decimal | null {
  try {
    const decimal = new Decimal(value);
    return decimal.isFinite() && decimal.gt(0) ? decimal : null;
  } catch {
    return null;
  }
}

function nonNegativeDecimal(value: Decimal.Value): Decimal | null {
  try {
    const decimal = new Decimal(value);
    return decimal.isFinite() && decimal.gte(0) ? decimal : null;
  } catch {
    return null;
  }
}

function copyDecimal(value: Decimal | null): Decimal | null {
  return value ? new Decimal(value) : null;
}

function copyRemainder(remainder: PortionRemainderProps): PortionRemainderProps {
  return {
    ...remainder,
    weight: new Decimal(remainder.weight),
    createdAt: new Date(remainder.createdAt),
  };
}

function copyNutrients(
  nutrients: ServedPortionNutrientSnapshotProps[],
): ServedPortionNutrientSnapshotProps[] {
  return nutrients.map((nutrient) => ({ ...nutrient, amount: new Decimal(nutrient.amount) }));
}
