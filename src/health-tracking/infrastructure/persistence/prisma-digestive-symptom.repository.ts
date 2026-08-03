import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  DigestiveSymptomListFilters,
  DigestiveSymptomPage,
  DigestiveSymptomRepository,
} from '../../application/ports/digestive-symptom-repository.port';
import { DigestiveSymptomEntry } from '../../domain/entities/digestive-symptom-entry';
import { PrismaDigestiveSymptomMapper } from './prisma-digestive-symptom.mapper';
import {
  DigestiveSymptomDelegate,
  DigestiveSymptomFoodLinkDelegate,
  DigestiveSymptomMealLinkDelegate,
  PrismaDigestiveSymptomRecord,
} from './prisma-digestive-symptom.types';

const include = { mealLinks: true, foodLinks: true };
@Injectable()
export class PrismaDigestiveSymptomRepository implements DigestiveSymptomRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const { digestiveSymptomEntry } = this.client();
    const record = await digestiveSymptomEntry.findFirst({ where: { id }, include });
    return record ? PrismaDigestiveSymptomMapper.toDomain(record) : null;
  }

  async save(entry: DigestiveSymptomEntry) {
    const saved = await this.persist([entry]);
    return saved[0];
  }

  async saveCorrection(original: DigestiveSymptomEntry, corrected: DigestiveSymptomEntry) {
    const saved = await this.persist([original, corrected]);
    return saved[saved.length - 1];
  }

  private async persist(entries: DigestiveSymptomEntry[]) {
    return this.prisma.$transaction(async (transaction) => {
      const client = this.client(transaction);
      const { digestiveSymptomEntry, digestiveSymptomMealLink, digestiveSymptomFoodLink } = client;
      for (const entry of entries) {
        const data = PrismaDigestiveSymptomMapper.toPersistence(entry);
        await digestiveSymptomEntry.upsert({
          where: { id: data.id },
          create: {
            id: data.id,
            adultProfileId: data.adultProfileId,
            type: data.type,
            customTypeName: data.customTypeName,
            intensity: data.intensity,
            startAt: data.startAt,
            endAt: data.endAt,
            notes: data.notes,
            status: data.status,
            correctedFromId: data.correctedFromId,
          },
          update: {
            type: data.type,
            customTypeName: data.customTypeName,
            intensity: data.intensity,
            startAt: data.startAt,
            endAt: data.endAt,
            notes: data.notes,
            status: data.status,
            correctedFromId: data.correctedFromId,
          },
          include,
        });
        if (data.mealLinks.length)
          await digestiveSymptomMealLink.createMany({
            data: data.mealLinks.map((link) => ({ symptomId: data.id, mealId: link.mealId })),
            skipDuplicates: true,
          });
        if (data.foodLinks.length)
          await digestiveSymptomFoodLink.createMany({
            data: data.foodLinks.map((link) => ({
              symptomId: data.id,
              foodId: link.foodId,
              mealId: link.mealId,
              source: link.source,
              snapshot: link.snapshot,
            })),
            skipDuplicates: true,
          });
      }
      return Promise.all(
        entries.map(async (entry) => {
          const record = await digestiveSymptomEntry.findFirst({
            where: { id: entry.id },
            include,
          });
          return PrismaDigestiveSymptomMapper.toDomain(record as PrismaDigestiveSymptomRecord);
        }),
      );
    });
  }

  async listByAdult(
    adultProfileId: string,
    filters: DigestiveSymptomListFilters,
  ): Promise<DigestiveSymptomPage> {
    const where = {
      adultProfileId,
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.intensity ? { intensity: filters.intensity } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            startAt: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            },
          }
        : {}),
    };
    const [records, total] = await Promise.all([
      this.client().digestiveSymptomEntry.findMany({
        where,
        include,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: [{ startAt: 'desc' }, { id: 'desc' }],
      }),
      this.client().digestiveSymptomEntry.count({ where }),
    ]);
    return {
      items: records.map((record) => PrismaDigestiveSymptomMapper.toDomain(record)),
      page: filters.page,
      limit: filters.limit,
      total,
    };
  }

  async listForInsights(
    adultProfileId: string,
    filters: {
      dateFrom?: Date;
      dateTo?: Date;
      type?: import('../../domain/value-objects/digestive-symptom.value-objects').DigestiveSymptomTypeValue;
    },
  ) {
    const where = {
      adultProfileId,
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            startAt: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            },
          }
        : {}),
    };
    const { digestiveSymptomEntry } = this.client();
    const records = await digestiveSymptomEntry.findMany({
      where,
      include,
      orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
    });
    return records.map((record) => PrismaDigestiveSymptomMapper.toDomain(record));
  }

  private client(transaction?: unknown) {
    const client = (transaction ?? this.prisma) as {
      digestiveSymptomEntry: DigestiveSymptomDelegate;
      digestiveSymptomMealLink: DigestiveSymptomMealLinkDelegate;
      digestiveSymptomFoodLink: DigestiveSymptomFoodLinkDelegate;
    };
    return client;
  }
}
