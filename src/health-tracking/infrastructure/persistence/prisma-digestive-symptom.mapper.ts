import { DigestiveSymptomEntry } from '../../domain/entities/digestive-symptom-entry';
import { DigestiveSymptomEntryProps } from '../../domain/models/digestive-symptom.models';
import { PrismaDigestiveSymptomRecord } from './prisma-digestive-symptom.types';

export class PrismaDigestiveSymptomMapper {
  static toDomain(record: PrismaDigestiveSymptomRecord): DigestiveSymptomEntry {
    return DigestiveSymptomEntry.fromPersistence({
      id: record.id,
      adultProfileId: record.adultProfileId,
      type: record.type as DigestiveSymptomEntryProps['type'],
      name: record.customTypeName,
      notes: record.notes,
      intensity: record.intensity,
      startAt: new Date(record.startAt),
      endAt: record.endAt ? new Date(record.endAt) : null,
      status: record.status as DigestiveSymptomEntryProps['status'],
      correctedFromId: record.correctedFromId,
      mealLinks: record.mealLinks.map((link) => ({ mealId: link.mealId as string })),
      foodLinks: record.foodLinks.map((link) => ({
        foodId: link.foodId as string,
        source: link.source as DigestiveSymptomEntryProps['foodLinks'][number]['source'],
        mealId: link.mealId ?? null,
        snapshot: link.snapshot ?? null,
      })),
    });
  }

  static toPersistence(entry: DigestiveSymptomEntry) {
    const props = entry.toProps();
    return {
      id: props.id,
      adultProfileId: props.adultProfileId,
      type: props.type,
      customTypeName: props.name,
      intensity: props.intensity,
      startAt: props.startAt,
      endAt: props.endAt,
      notes: props.notes,
      status: props.status,
      correctedFromId: props.correctedFromId,
      mealLinks: props.mealLinks,
      foodLinks: props.foodLinks,
    };
  }
}
