/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { PrismaService } from '../../../database/prisma.service';
import { WeeklyPlan } from '../../domain/entities/weekly-plan';
import { HouseholdId, WeeklyPlanId } from '../../domain/value-objects/identifiers';
import { PlannedMealSource, PlannedMealType } from '../../domain/value-objects/planned-meal';
import { PrismaWeeklyPlanRepository } from './prisma-weekly-plan.repository';

describe('PrismaWeeklyPlanRepository', () => {
  it('saves the aggregate in one transaction without deleting history', async () => {
    const upsertPlan = jest.fn().mockResolvedValue(undefined);
    const upsertMeal = jest.fn().mockResolvedValue(undefined);
    const upsertParticipant = jest.fn().mockResolvedValue(undefined);
    const transaction = jest.fn((callback: (client: unknown) => unknown) =>
      callback({
        weeklyPlan: { upsert: upsertPlan },
        plannedMeal: { upsert: upsertMeal },
        plannedMealParticipant: { upsert: upsertParticipant },
      }),
    );
    const repository = new PrismaWeeklyPlanRepository({
      $transaction: transaction,
    } as unknown as PrismaService);
    const plan = createPlan();
    plan.addMeal({
      id: 'meal-1',
      date: '2026-08-03',
      type: PlannedMealType.LUNCH,
      source: PlannedMealSource.FREE_MEAL,
      position: 1,
      occurredAt: new Date('2026-08-03T10:00:00.000Z'),
      nutritionSnapshot: { calories: 500 },
    });
    plan.assignParticipant('meal-1', {
      id: 'participant-1',
      adultProfileId: 'adult-1',
      occurredAt: new Date('2026-08-03T10:00:00.000Z'),
    });

    await repository.save(plan);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(upsertPlan.mock.calls[0]?.[0].create).toMatchObject({
      id: 'plan-1',
      weekStart: new Date('2026-08-03T00:00:00.000Z'),
    });
    expect(upsertMeal.mock.calls[0]?.[0].create).toMatchObject({
      id: 'meal-1',
      nutritionSnapshot: { calories: 500 },
    });
    expect(upsertParticipant.mock.calls[0]?.[0].create).toMatchObject({
      adultProfileId: 'adult-1',
    });
  });

  it('isolates household queries and paginates reconstructed aggregates', async () => {
    const findMany = jest.fn().mockResolvedValue([createRecord('household-1')]);
    const count = jest.fn().mockResolvedValue(1);
    const repository = new PrismaWeeklyPlanRepository({
      weeklyPlan: { findMany, count },
    } as unknown as PrismaService);

    const result = await repository.listByHousehold(HouseholdId.from('household-1'), {
      page: 2,
      limit: 5,
    });

    expect(findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { householdId: 'household-1' },
      skip: 5,
      take: 5,
    });
    expect(result.items[0]).toBeInstanceOf(WeeklyPlan);
    expect(result.items[0]?.householdId).toBe('household-1');
    expect(result.total).toBe(1);
  });

  it('finds by domain id and returns null when Prisma has no aggregate', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const repository = new PrismaWeeklyPlanRepository({
      weeklyPlan: { findUnique },
    } as unknown as PrismaService);

    expect(await repository.findById(WeeklyPlanId.from('missing'))).toBeNull();
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'missing' } }));
  });
});

function createPlan(): WeeklyPlan {
  return WeeklyPlan.create({
    id: 'plan-1',
    householdId: 'household-1',
    weekStart: '2026-08-03',
    createdBy: 'user-1',
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
  });
}

function createRecord(householdId: string) {
  return {
    id: 'plan-1',
    householdId,
    weekStart: new Date('2026-08-03T00:00:00.000Z'),
    weekEnd: new Date('2026-08-09T00:00:00.000Z'),
    status: 'DRAFT',
    weeklyBudget: { toString: () => '125.50' },
    currency: 'ARS',
    createdById: 'user-1',
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    publishedAt: null,
    meals: [],
  };
}
