import Decimal from 'decimal.js';
import { BodyWeightEntry } from '../../domain/entities/body-weight-entry';
import { BodyWeightEntryProps } from '../../domain/models/health-tracking.models';
import { PrismaBodyWeightRecord } from './prisma-health-tracking.types';

export class PrismaBodyWeightMapper {
  static toDomain(record: PrismaBodyWeightRecord, now = new Date()): BodyWeightEntry {
    return BodyWeightEntry.create({
      id: record.id,
      adultProfileId: record.adultProfileId,
      value: new Decimal(record.value.toString()),
      unit: record.unit as 'KG' | 'LB',
      recordedAt: new Date(record.recordedAt),
      source: record.source as 'MANUAL' | 'IMPORTED' | 'DEVICE',
      correctedFromId: record.correctedFromId,
      now,
    });
  }

  static toPersistence(entry: BodyWeightEntry) {
    const props: BodyWeightEntryProps = entry.toProps();
    return {
      id: props.id,
      adultProfileId: props.adultProfileId,
      value: props.value.toString(),
      unit: props.unit,
      recordedAt: new Date(props.recordedAt),
      source: props.source,
      correctedFromId: props.correctedFromId,
    };
  }
}
