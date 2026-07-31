import { Injectable } from '@nestjs/common';
import { Prisma, PreparedBatchStatus } from '@prisma/client';
import Decimal from 'decimal.js';
import { PrismaService } from '../../../database/prisma.service';
import {
  PreparedFoodLeftoverListCriteria,
  PreparedFoodLeftoverRepository,
} from '../../application/ports/prepared-food-leftover-repository.port';
import { calculatePreparedBatchAvailability } from '../../application/services/calculate-prepared-batch-availability';
import { PreparedBatchNotFinalizedError } from '../../domain/errors/prepared-batch.errors';
import {
  PreparedFoodLeftoverAlreadyClosedError,
  PreparedFoodLeftoverAvailabilityExceededError,
} from '../../domain/errors/prepared-food-leftover.errors';
import { PreparedFoodLeftover } from '../../domain/entities/prepared-food-leftover';
import {
  PrismaPreparedFoodLeftoverMapper,
  preparedFoodLeftoverInclude,
} from './prisma-prepared-food-leftover.mapper';

@Injectable()
export class PrismaPreparedFoodLeftoverRepository implements PreparedFoodLeftoverRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PreparedFoodLeftover | null> {
    const record = await this.prisma.preparedFoodLeftover.findUnique({
      where: { id },
      include: preparedFoodLeftoverInclude,
    });
    return record ? PrismaPreparedFoodLeftoverMapper.toDomain(record) : null;
  }

  async listByPreparedBatchId(batchId: string): Promise<PreparedFoodLeftover[]> {
    const records = await this.prisma.preparedFoodLeftover.findMany({
      where: { preparedBatchId: batchId },
      include: preparedFoodLeftoverInclude,
      orderBy: [{ storedAt: 'asc' }, { id: 'asc' }],
    });
    return records.map((record) => PrismaPreparedFoodLeftoverMapper.toDomain(record));
  }

  async list(criteria: PreparedFoodLeftoverListCriteria): Promise<PreparedFoodLeftover[]> {
    const records = await this.prisma.preparedFoodLeftover.findMany({
      where: {
        householdId: criteria.householdId,
        ...(criteria.status ? { status: criteria.status } : {}),
      },
      include: preparedFoodLeftoverInclude,
      orderBy: [{ storedAt: 'desc' }, { id: 'desc' }],
    });
    return records.map((record) => PrismaPreparedFoodLeftoverMapper.toDomain(record));
  }

  async save(leftover: PreparedFoodLeftover): Promise<void> {
    const data = PrismaPreparedFoodLeftoverMapper.toPersistence(leftover);
    await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw<{ id: string }[]>(
        Prisma.sql`SELECT "id" FROM "prepared_batches" WHERE "id" = ${data.preparedBatchId} FOR UPDATE`,
      );
      const batch = await transaction.preparedBatch.findUnique({
        where: { id: data.preparedBatchId },
        select: { status: true, finalCookedWeight: true },
      });
      if (batch?.status !== PreparedBatchStatus.FINALIZED || !batch.finalCookedWeight) {
        throw new PreparedBatchNotFinalizedError();
      }

      const allocatedPortions = await transaction.servedPortion.aggregate({
        where: { preparedBatchId: data.preparedBatchId, status: { not: 'CANCELLED' } },
        _sum: { servedWeight: true },
      });
      const allocatedLeftovers = await transaction.preparedFoodLeftover.aggregate({
        where: { preparedBatchId: data.preparedBatchId },
        _sum: { availableWeight: true },
      });
      const currentAvailability = calculatePreparedBatchAvailability({
        finalCookedWeight: new Decimal(batch.finalCookedWeight.toString()),
        servedWeight: new Decimal(allocatedPortions._sum.servedWeight?.toString() ?? 0),
        storedLeftoverWeight: new Decimal(allocatedLeftovers._sum.availableWeight?.toString() ?? 0),
        savedRemainderWeight: new Decimal(0),
        discardedWeight: new Decimal(0),
      });
      if (new Decimal(data.availableWeight).gt(currentAvailability.availableWeight)) {
        throw new PreparedFoodLeftoverAvailabilityExceededError();
      }

      await transaction.preparedFoodLeftover.create({
        data: {
          id: data.id,
          preparedBatchId: data.preparedBatchId,
          householdId: data.householdId,
          availableWeight: data.availableWeight,
          storedAt: data.storedAt,
          storageLocation: data.storageLocation,
          notes: data.notes,
          status: data.status,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          nutrientSnapshots: {
            create: data.nutrients.map((nutrient) => ({
              nutrientCode: nutrient.code,
              nutrientName: nutrient.name,
              unit: nutrient.unit,
              amountPerGram: nutrient.amountPerGram,
            })),
          },
        },
      });
    });
  }

  async updateStatus(leftover: PreparedFoodLeftover): Promise<void> {
    const data = PrismaPreparedFoodLeftoverMapper.toPersistence(leftover);
    const result = await this.prisma.preparedFoodLeftover.updateMany({
      where: { id: data.id, status: 'AVAILABLE' },
      data: { status: data.status, updatedAt: data.updatedAt },
    });
    if (result.count === 0) {
      throw new PreparedFoodLeftoverAlreadyClosedError();
    }
  }
}
