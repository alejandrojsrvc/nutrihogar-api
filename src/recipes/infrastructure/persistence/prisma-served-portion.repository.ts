import { Injectable } from '@nestjs/common';
import { Prisma, ServedPortionStatus } from '@prisma/client';
import Decimal from 'decimal.js';
import { PrismaService } from '../../../database/prisma.service';
import {
  PreparedBatchAvailability,
  PreparedBatchAvailabilityRepository,
  ServedPortionRepository,
  ServedPortionUnitOfWork,
} from '../../application/ports/served-portion-repository.port';
import { PreparedBatchNotFinalizedError } from '../../domain/errors/prepared-batch.errors';
import { PortionAvailabilityExceededError } from '../../domain/errors/served-portion.errors';
import { ServedPortion } from '../../domain/entities/served-portion';
import { PrismaServedPortionMapper, servedPortionInclude } from './prisma-served-portion.mapper';

@Injectable()
export class PrismaServedPortionRepository
  implements ServedPortionRepository, PreparedBatchAvailabilityRepository, ServedPortionUnitOfWork
{
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ServedPortion | null> {
    const record = await this.prisma.servedPortion.findUnique({
      where: { id },
      include: servedPortionInclude,
    });
    return record ? PrismaServedPortionMapper.toDomain(record) : null;
  }

  async sumAllocatedWeight(batchId: string): Promise<Decimal> {
    const result = await this.prisma.servedPortion.aggregate({
      where: { preparedBatchId: batchId, status: { not: ServedPortionStatus.CANCELLED } },
      _sum: { servedWeight: true },
    });
    return new Decimal(result._sum.servedWeight?.toString() ?? 0);
  }

  async getAvailability(batchId: string): Promise<PreparedBatchAvailability | null> {
    const batch = await this.prisma.preparedBatch.findUnique({
      where: { id: batchId },
      select: { status: true, finalCookedWeight: true },
    });
    if (batch?.status !== 'FINALIZED' || !batch.finalCookedWeight) return null;

    const portions = await this.prisma.servedPortion.findMany({
      where: { preparedBatchId: batchId, status: { not: ServedPortionStatus.CANCELLED } },
      select: {
        servedWeight: true,
        remainder: { select: { weight: true, disposition: true } },
      },
    });
    const servedWeight = portions.reduce(
      (total, portion) => total.add(portion.servedWeight.toString()),
      new Decimal(0),
    );
    const savedRemainderWeight = portions.reduce(
      (total, portion) =>
        portion.remainder?.disposition === 'SAVED'
          ? total.add(portion.remainder.weight.toString())
          : total,
      new Decimal(0),
    );
    const discardedWeight = portions.reduce(
      (total, portion) =>
        portion.remainder?.disposition === 'DISCARDED'
          ? total.add(portion.remainder.weight.toString())
          : total,
      new Decimal(0),
    );
    const finalCookedWeight = new Decimal(batch.finalCookedWeight.toString());

    return {
      finalCookedWeight,
      servedWeight,
      savedRemainderWeight,
      discardedWeight,
      availableWeight: finalCookedWeight.sub(servedWeight),
    };
  }

  async save(portion: ServedPortion): Promise<void> {
    const data = PrismaServedPortionMapper.toPersistence(portion);
    await this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.servedPortion.findUnique({
        where: { id: data.id },
        select: { id: true },
      });
      const portionData = toPortionData(data);
      const nutrients = {
        create: data.nutrients.map((nutrient) => ({
          nutrientCode: nutrient.code,
          nutrientName: nutrient.name,
          unit: nutrient.unit,
          amount: nutrient.amount,
        })),
      };

      if (!existing) {
        await transaction.servedPortion.create({
          data: {
            ...portionData,
            ...(data.remainder
              ? {
                  remainder: {
                    create: {
                      id: data.remainder.id,
                      weight: data.remainder.weight,
                      disposition: data.remainder.disposition,
                      createdAt: data.remainder.createdAt,
                    },
                  },
                }
              : {}),
            nutrientSnapshots: nutrients,
          },
        });
        return;
      }

      await transaction.servedPortion.update({
        where: { id: data.id },
        data: {
          ...portionData,
          nutrientSnapshots: { deleteMany: {}, ...nutrients },
        },
      });
      await transaction.portionRemainder.deleteMany({ where: { servedPortionId: data.id } });
      if (data.remainder) {
        await transaction.portionRemainder.create({
          data: {
            id: data.remainder.id,
            servedPortionId: data.id,
            weight: data.remainder.weight,
            disposition: data.remainder.disposition,
            createdAt: data.remainder.createdAt,
          },
        });
      }
    });
  }

  async saveMany(batchId: string, portions: ServedPortion[]): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw<{ id: string }[]>(
        Prisma.sql`SELECT "id" FROM "prepared_batches" WHERE "id" = ${batchId} FOR UPDATE`,
      );
      const batch = await transaction.preparedBatch.findUnique({
        where: { id: batchId },
        select: { status: true, finalCookedWeight: true },
      });
      if (batch?.status !== 'FINALIZED' || !batch.finalCookedWeight) {
        throw new PreparedBatchNotFinalizedError();
      }
      const allocated = await transaction.servedPortion.aggregate({
        where: { preparedBatchId: batchId, status: { not: ServedPortionStatus.CANCELLED } },
        _sum: { servedWeight: true },
      });
      const requested = portions.reduce(
        (total, portion) => total.add(portion.servedWeight),
        new Decimal(0),
      );
      const current = new Decimal(allocated._sum.servedWeight?.toString() ?? 0);
      if (current.add(requested).gt(batch.finalCookedWeight.toString())) {
        throw new PortionAvailabilityExceededError();
      }

      await transaction.servedPortion.createMany({
        data: portions.map((portion) =>
          toPortionData(PrismaServedPortionMapper.toPersistence(portion)),
        ),
      });
    });
  }
}

function toPortionData(data: ReturnType<typeof PrismaServedPortionMapper.toPersistence>) {
  return {
    id: data.id,
    preparedBatchId: data.preparedBatchId,
    adultProfileId: data.adultProfileId,
    servedWeight: data.servedWeight,
    servedAt: data.servedAt,
    status: data.status,
    remainderWeight: data.remainderWeight,
    consumedWeight: data.consumedWeight,
    mealId: data.mealId,
    createdById: data.createdById,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    cancelledAt: data.cancelledAt,
  } satisfies Prisma.ServedPortionUncheckedCreateInput;
}
