import Decimal from 'decimal.js';
import { BodyMeasurementEntryProps } from '../models/health-tracking.models';
import { InvalidHealthTrackingValueError } from '../errors/health-tracking.errors';
import { BodyMeasurementValue, BodyMeasurementEntryId, MeasurementRecordedAt, MeasurementSource, MeasurementType, MeasurementUnit } from '../value-objects/health-tracking.value-objects';

type Input = { id: string; adultProfileId: string; type: 'WAIST' | 'HIPS' | 'CHEST' | 'ARM_LEFT' | 'ARM_RIGHT' | 'THIGH_LEFT' | 'THIGH_RIGHT' | 'NECK' | 'CALF_LEFT' | 'CALF_RIGHT' | 'CUSTOM'; customMeasurementName?: string | null; value: Decimal.Value; unit: 'CM' | 'IN'; recordedAt: Date | string; source: 'MANUAL' | 'IMPORTED' | 'DEVICE'; now: Date; correctedFromId?: string | null };
export class BodyMeasurementEntry {
  private constructor(private readonly props: BodyMeasurementEntryProps) {}
  static create(input: Input): BodyMeasurementEntry { return BodyMeasurementEntry.build(input); }
  correct(input: Omit<Input, 'correctedFromId' | 'adultProfileId'> & { id: string }): BodyMeasurementEntry { return BodyMeasurementEntry.build({ ...input, adultProfileId: this.props.adultProfileId, correctedFromId: this.props.id, customMeasurementName: input.customMeasurementName ?? this.props.customMeasurementName, type: input.type ?? this.props.type }); }
  private static build(input: Input): BodyMeasurementEntry {
    const type = MeasurementType.from(input.type);
    if (!input.adultProfileId?.trim()) throw new InvalidHealthTrackingValueError('Adult profile id is required.');
    if (type.value === 'CUSTOM' && !input.customMeasurementName?.trim()) throw new InvalidHealthTrackingValueError('Custom measurement name is required.');
    if (type.value !== 'CUSTOM' && input.customMeasurementName) throw new InvalidHealthTrackingValueError('Standard measurements cannot have a custom name.');
    const unit = MeasurementUnit.from(input.unit);
    if (!unit.isLength()) throw new InvalidHealthTrackingValueError('Body measurement requires a length unit.');
    const value = BodyMeasurementValue.from(input.value);
    const recordedAt = MeasurementRecordedAt.from(input.recordedAt, input.now);
    MeasurementSource.from(input.source);
    return new BodyMeasurementEntry({ id: new BodyMeasurementEntryId(input.id).value, adultProfileId: input.adultProfileId, type: type.value, customMeasurementName: input.customMeasurementName?.trim() || null, value: value.toDecimal(), unit: input.unit, recordedAt: recordedAt.toDate(), source: input.source, correctedFromId: input.correctedFromId ?? null });
  }
  toProps(): BodyMeasurementEntryProps { return { ...this.props, value: new Decimal(this.props.value), recordedAt: new Date(this.props.recordedAt) }; }
  get id(): string { return this.props.id; }
  get value(): Decimal { return new Decimal(this.props.value); }
  get correctedFromId(): string | null { return this.props.correctedFromId; }
}
