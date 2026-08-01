import Decimal from 'decimal.js';
import { BodyMeasurementEntry } from '../../domain/entities/body-measurement-entry';
import { BodyMeasurementEntryProps } from '../../domain/models/health-tracking.models';
import { PrismaBodyMeasurementRecord } from './prisma-health-tracking.types';

export class PrismaBodyMeasurementMapper {
  static toDomain(record: PrismaBodyMeasurementRecord, now = new Date()): BodyMeasurementEntry {
    return BodyMeasurementEntry.create({
      id: record.id,
      adultProfileId: record.adultProfileId,
      type: record.type as BodyMeasurementEntryProps['type'],
      customMeasurementName: record.customMeasurementName,
      value: new Decimal(record.value.toString()),
      unit: record.unit as 'CM' | 'IN',
      recordedAt: new Date(record.recordedAt),
      source: record.source as 'MANUAL' | 'IMPORTED' | 'DEVICE',
      correctedFromId: record.correctedFromId,
      now,
    });
  }

  static toPersistence(entry: BodyMeasurementEntry) {
    const props: BodyMeasurementEntryProps = entry.toProps();
    return {
      id: props.id,
      adultProfileId: props.adultProfileId,
      type: props.type,
      customMeasurementName: props.customMeasurementName,
      value: props.value.toString(),
      unit: props.unit,
      recordedAt: new Date(props.recordedAt),
      source: props.source,
      correctedFromId: props.correctedFromId,
    };
  }
}
