import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  BodyWeightListFilters,
  BodyWeightPage,
  BodyWeightRepository,
} from '../../application/ports/body-weight-repository.port';
import { BodyWeightEntry } from '../../domain/entities/body-weight-entry';
import { PrismaBodyWeightMapper } from './prisma-body-weight.mapper';
import { HealthTrackingPrismaClient } from './prisma-health-tracking.types';

@Injectable()
export class PrismaBodyWeightRepository implements BodyWeightRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, adultProfileId?: string): Promise<BodyWeightEntry | null> {
    const record = await this.client().bodyWeightEntry.findFirst({
      where: { id, ...(adultProfileId ? { adultProfileId } : {}) },
    });
    return record ? PrismaBodyWeightMapper.toDomain(record) : null;
  }

  async save(entry: BodyWeightEntry): Promise<BodyWeightEntry> {
    const record = await this.client().bodyWeightEntry.create({
      data: PrismaBodyWeightMapper.toPersistence(entry),
    });
    return PrismaBodyWeightMapper.toDomain(record);
  }

  async listByAdult(
    adultProfileId: string,
    filters: BodyWeightListFilters,
  ): Promise<BodyWeightPage> {
    const where = {
      adultProfileId,
      ...(filters.unit ? { unit: filters.unit } : {}),
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
      this.client().bodyWeightEntry.findMany({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
      }),
      this.client().bodyWeightEntry.count({ where }),
    ]);
    return {
      items: records.map((record) => PrismaBodyWeightMapper.toDomain(record)),
      page: filters.page,
      limit: filters.limit,
      total,
    };
  }

  async findLatest(adultProfileId: string): Promise<BodyWeightEntry | null> {
    const record = await this.client().bodyWeightEntry.findFirst({
      where: { adultProfileId },
      orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
    });
    return record ? PrismaBodyWeightMapper.toDomain(record) : null;
  }

  async listForProgress(adultProfileId: string, filters: { dateFrom?: Date; dateTo?: Date }) {
    const records = await this.client().bodyWeightEntry.findMany({
      where: {
        adultProfileId,
        ...(filters.dateFrom || filters.dateTo
          ? {
              recordedAt: {
                ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
                ...(filters.dateTo ? { lte: filters.dateTo } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ recordedAt: 'asc' }, { id: 'asc' }],
    });
    return records.map((record) => PrismaBodyWeightMapper.toDomain(record));
  }

  private client(): HealthTrackingPrismaClient {
    return this.prisma as unknown as HealthTrackingPrismaClient;
  }
}
