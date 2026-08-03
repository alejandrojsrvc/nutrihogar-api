import { Injectable } from '@nestjs/common';
import { PreparedBatchStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { PreparedBatchRepository } from '../../application/ports/prepared-batch-repository.port';
import { PreparedBatch } from '../../domain/entities/prepared-batch';
import { PrismaPreparedBatchMapper, preparedBatchInclude } from './prisma-prepared-batch.mapper';

@Injectable()
export class PrismaPreparedBatchRepository implements PreparedBatchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PreparedBatch | null> {
    const record = await this.prisma.preparedBatch.findUnique({
      where: { id },
      include: preparedBatchInclude,
    });
    return record ? PrismaPreparedBatchMapper.toDomain(record) : null;
  }

  async findByPlannedMealId(plannedMealId: string): Promise<PreparedBatch | null> {
    const record = await this.prisma.preparedBatch.findFirst({
      where: { plannedMeals: { some: { id: plannedMealId } } },
      include: preparedBatchInclude,
    });
    return record ? PrismaPreparedBatchMapper.toDomain(record) : null;
  }

  async listAvailableByHousehold(householdId: string): Promise<PreparedBatch[]> {
    const records = await this.prisma.preparedBatch.findMany({
      where: { householdId, status: PreparedBatchStatus.FINALIZED },
      include: preparedBatchInclude,
      orderBy: [{ preparedAt: 'desc' }, { id: 'desc' }],
    });
    return records.map((record) => PrismaPreparedBatchMapper.toDomain(record));
  }

  async save(batch: PreparedBatch): Promise<void> {
    const data = PrismaPreparedBatchMapper.toPersistence(batch);

    await this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.preparedBatch.findUnique({
        where: { id: data.id },
        select: { id: true },
      });
      const batchData = {
        householdId: data.householdId,
        recipeId: data.recipeId,
        recipeNameSnapshot: data.recipeNameSnapshot,
        preparedAt: data.preparedAt,
        status: data.status,
        finalCookedWeight: data.finalCookedWeight,
        createdById: data.createdById,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        finalizedAt: data.finalizedAt,
        cancelledAt: data.cancelledAt,
      } satisfies Prisma.PreparedBatchUncheckedCreateInput;
      const ingredients = data.ingredients.map((ingredient) => ({
        id: ingredient.id,
        foodId: ingredient.foodId,
        foodServingId: ingredient.foodServingId,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        position: ingredient.position,
        notes: ingredient.notes,
        foodNameSnapshot: ingredient.foodNameSnapshot,
        brandSnapshot: ingredient.brandSnapshot,
        preparationStateSnapshot: ingredient.preparationStateSnapshot,
        confidenceLevel: ingredient.confidenceLevel,
        baseQuantity: ingredient.baseQuantity,
        baseUnit: ingredient.baseUnit,
        nutrientSnapshots: {
          create: ingredient.nutrients.map((nutrient) => ({
            nutrientCode: nutrient.code,
            nutrientName: nutrient.name,
            unit: nutrient.unit,
            amount: nutrient.amount,
          })),
        },
      }));
      const totalNutrients = data.totalNutrients.map((nutrient) => ({
        nutrientCode: nutrient.code,
        nutrientName: nutrient.name,
        unit: nutrient.unit,
        amount: nutrient.amount,
      }));

      if (!existing) {
        await transaction.preparedBatch.create({
          data: {
            id: data.id,
            ...batchData,
            ingredients: { create: ingredients },
            nutrientSnapshots: { create: totalNutrients },
          },
        });
        return;
      }

      await transaction.preparedBatch.update({
        where: { id: data.id },
        data: {
          ...batchData,
          ingredients: {
            deleteMany: {},
            create: ingredients,
          },
          nutrientSnapshots: {
            deleteMany: {},
            create: totalNutrients,
          },
        },
      });
    });
  }
}
