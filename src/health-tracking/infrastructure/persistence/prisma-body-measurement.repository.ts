import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  BodyMeasurementListFilters,
  BodyMeasurementPage,
  BodyMeasurementRepository,
} from '../../application/ports/body-measurement-repository.port';
import { BodyMeasurementEntry } from '../../domain/entities/body-measurement-entry';
import { PrismaBodyMeasurementMapper } from './prisma-body-measurement.mapper';
import { HealthTrackingPrismaClient } from './prisma-health-tracking.types';

@Injectable()
export class PrismaBodyMeasurementRepository implements BodyMeasurementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, adultProfileId?: string): Promise<BodyMeasurementEntry | null> {
    const record = await this.client().bodyMeasurementEntry.findFirst({
      where: { id, ...(adultProfileId ? { adultProfileId } : {}) },
    });
    return record ? PrismaBodyMeasurementMapper.toDomain(record) : null;
  }

  async save(entry: BodyMeasurementEntry): Promise<BodyMeasurementEntry> {
    const record = await this.client().bodyMeasurementEntry.create({
      data: PrismaBodyMeasurementMapper.toPersistence(entry),
    });
    return PrismaBodyMeasurementMapper.toDomain(record);
  }

  async saveMany(entries: BodyMeasurementEntry[]): Promise<BodyMeasurementEntry[]> {
    return this.prisma.$transaction(async (transaction) => {
      const client = transaction as unknown as HealthTrackingPrismaClient;
      const saved = [] as BodyMeasurementEntry[];
      for (const entry of entries) {
        const record = await client.bodyMeasurementEntry.create({
          data: PrismaBodyMeasurementMapper.toPersistence(entry),
        });
        saved.push(PrismaBodyMeasurementMapper.toDomain(record));
      }
      return saved;
    });
  }

  async listByAdult(
    adultProfileId: string,
    filters: BodyMeasurementListFilters,
  ): Promise<BodyMeasurementPage> {
    const where = {
      adultProfileId,
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            recordedAt: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            },
          }
        : {}),
    };
    const [records, total] = await Promise.all([
      this.client().bodyMeasurementEntry.findMany({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
      }),
      this.client().bodyMeasurementEntry.count({ where }),
    ]);
    return {
      items: records.map((record) => PrismaBodyMeasurementMapper.toDomain(record)),
      page: filters.page,
      limit: filters.limit,
      total,
    };
  }

  private client(): HealthTrackingPrismaClient {
    return this.prisma as unknown as HealthTrackingPrismaClient;
  }
}
