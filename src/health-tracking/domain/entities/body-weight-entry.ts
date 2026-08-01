import Decimal from 'decimal.js';
import { BodyWeightEntryProps } from '../models/health-tracking.models';
import { InvalidHealthTrackingValueError } from '../errors/health-tracking.errors';
import { BodyWeight, BodyWeightEntryId, MeasurementRecordedAt, MeasurementSource, MeasurementUnit } from '../value-objects/health-tracking.value-objects';

type Input = { id: string; adultProfileId: string; value: Decimal.Value; unit: 'KG' | 'LB'; recordedAt: Date | string; source: 'MANUAL' | 'IMPORTED' | 'DEVICE'; now: Date; correctedFromId?: string | null };
export class BodyWeightEntry {
  private constructor(private readonly props: BodyWeightEntryProps) {}
  static create(input: Input): BodyWeightEntry { return BodyWeightEntry.build(input); }
  correct(input: Omit<Input, 'correctedFromId' | 'adultProfileId'> & { id: string }): BodyWeightEntry {
    return BodyWeightEntry.build({ ...input, adultProfileId: this.props.adultProfileId, correctedFromId: this.props.id });
  }
  private static build(input: Input): BodyWeightEntry {
    const id = new BodyWeightEntryId(input.id).value;
    if (!input.adultProfileId?.trim()) throw new InvalidHealthTrackingValueError('Adult profile id is required.');
    const unit = MeasurementUnit.from(input.unit);
    if (!unit.isWeight()) throw new InvalidHealthTrackingValueError('Body weight requires a weight unit.');
    const value = BodyWeight.from(input.value);
    const recordedAt = MeasurementRecordedAt.from(input.recordedAt, input.now);
    MeasurementSource.from(input.source);
    return new BodyWeightEntry({ id, adultProfileId: input.adultProfileId, value: value.toDecimal(), unit: input.unit, recordedAt: recordedAt.toDate(), source: input.source, correctedFromId: input.correctedFromId ?? null });
  }
  toProps(): BodyWeightEntryProps { return { ...this.props, value: new Decimal(this.props.value), recordedAt: new Date(this.props.recordedAt) }; }
  get id(): string { return this.props.id; }
  get value(): Decimal { return new Decimal(this.props.value); }
  get correctedFromId(): string | null { return this.props.correctedFromId; }
}
