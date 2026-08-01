import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import type {
  PaginatedWeeklyPlans,
  WeeklyPlanFilters,
  WeeklyPlanRepository,
} from '../../application/ports/weekly-plan-repository.port';
import type { WeeklyPlanId, HouseholdId } from '../../domain/value-objects/identifiers';
import type { WeekStart } from '../../domain/value-objects/planning-date';
import { WeeklyPlan } from '../../domain/entities/weekly-plan';
import { PrismaPlannedMealMapper } from './prisma-planned-meal.mapper';
import { PrismaPlannedMealParticipantMapper } from './prisma-planned-meal-participant.mapper';
import { PrismaWeeklyPlanMapper } from './prisma-weekly-plan.mapper';
import type { PrismaWeeklyPlanRecord } from './prisma-weekly-plan.mapper';

interface WeeklyPlanDelegate {
  findUnique(args: unknown): Promise<PrismaWeeklyPlanRecord | null>;
  findFirst(args: unknown): Promise<PrismaWeeklyPlanRecord | null>;
  findMany(args: unknown): Promise<PrismaWeeklyPlanRecord[]>;
  count(args: unknown): Promise<number>;
  upsert(args: unknown): Promise<unknown>;
}

interface PlannedMealDelegate {
  upsert(args: unknown): Promise<unknown>;
}

interface PlannedMealParticipantDelegate {
  upsert(args: unknown): Promise<unknown>;
  delete(args: unknown): Promise<unknown>;
}

interface WeeklyPlanClient {
  weeklyPlan: WeeklyPlanDelegate;
  plannedMeal: PlannedMealDelegate;
  plannedMealParticipant: PlannedMealParticipantDelegate;
}

const includeAggregate = {
  meals: {
    orderBy: [{ date: 'asc' }, { position: 'asc' }, { id: 'asc' }],
    include: { participants: { orderBy: { id: 'asc' } } },
  },
};

@Injectable()
export class PrismaWeeklyPlanRepository implements WeeklyPlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: WeeklyPlanId): Promise<WeeklyPlan | null> {
    const record = await this.client(this.prisma).weeklyPlan.findUnique({
      where: { id: id.value },
      include: includeAggregate,
    });
    return record ? PrismaWeeklyPlanMapper.toDomain(record) : null;
  }

  async findByMealId(mealId: string): Promise<WeeklyPlan | null> {
    const record = await this.client(this.prisma).weeklyPlan.findFirst({
      where: { meals: { some: { id: mealId } } },
      include: includeAggregate,
    });
    return record ? PrismaWeeklyPlanMapper.toDomain(record) : null;
  }

  async findByParticipantId(participantId: string): Promise<WeeklyPlan | null> {
    const record = await this.client(this.prisma).weeklyPlan.findFirst({
      where: { meals: { some: { participants: { some: { id: participantId } } } } },
      include: includeAggregate,
    });
    return record ? PrismaWeeklyPlanMapper.toDomain(record) : null;
  }

  async findByHouseholdAndWeek(
    householdId: HouseholdId,
    weekStart: WeekStart,
  ): Promise<WeeklyPlan | null> {
    const record = await this.client(this.prisma).weeklyPlan.findFirst({
      where: { householdId: householdId.value, weekStart: weekStart.toDate() },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      include: includeAggregate,
    });
    return record ? PrismaWeeklyPlanMapper.toDomain(record) : null;
  }

  async save(plan: WeeklyPlan): Promise<void> {
    const data = PrismaWeeklyPlanMapper.toPersistence(plan);
    await this.prisma.$transaction(async (transaction) => {
      const client = this.client(transaction);
      await client.weeklyPlan.upsert({
        where: { id: data.id },
        create: {
          id: data.id,
          householdId: data.householdId,
          weekStart: data.weekStart,
          weekEnd: data.weekEnd,
          status: data.status,
          weeklyBudget: data.weeklyBudget,
          currency: data.currency,
          createdById: data.createdById,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          publishedAt: data.publishedAt,
        },
        update: {
          status: data.status,
          weeklyBudget: data.weeklyBudget,
          currency: data.currency,
          updatedAt: data.updatedAt,
          publishedAt: data.publishedAt,
        },
      });

      for (const meal of data.meals) {
        await client.plannedMeal.upsert({
          where: { id: meal.id },
          create: withoutParticipants(meal),
          update: mealUpdate(meal),
        });
        for (const participant of meal.participants) {
          await client.plannedMealParticipant.upsert({
            where: { id: participant.id },
            create: participant,
            update: participantUpdate(participant),
          });
        }
      }
    });
  }

  async deleteParticipant(participantId: string): Promise<void> {
    await this.prisma.plannedMealParticipant.delete({ where: { id: participantId } });
  }

  async listByHousehold(
    householdId: HouseholdId,
    filters: WeeklyPlanFilters,
  ): Promise<PaginatedWeeklyPlans> {
    const where = {
      householdId: householdId.value,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.from || filters.to
        ? {
            weekStart: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    };
    const client = this.client(this.prisma);
    const [records, total] = await Promise.all([
      client.weeklyPlan.findMany({
        where,
        include: includeAggregate,
        orderBy: [{ weekStart: 'desc' }, { id: 'desc' }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      client.weeklyPlan.count({ where }),
    ]);
    return {
      items: records.map((record) => PrismaWeeklyPlanMapper.toDomain(record)),
      page: filters.page,
      limit: filters.limit,
      total,
    };
  }

  private client(value: unknown): WeeklyPlanClient {
    return value as WeeklyPlanClient;
  }
}

function withoutParticipants(meal: ReturnType<typeof PrismaPlannedMealMapper.toPersistence>) {
  const { participants, ...data } = meal;
  void participants;
  return data;
}

function mealUpdate(meal: ReturnType<typeof PrismaPlannedMealMapper.toPersistence>) {
  const { id, weeklyPlanId, createdAt, participants, ...data } = meal;
  void id;
  void weeklyPlanId;
  void createdAt;
  void participants;
  return data;
}

function participantUpdate(
  participant: ReturnType<typeof PrismaPlannedMealParticipantMapper.toPersistence>,
) {
  const { id, plannedMealId, createdAt, ...data } = participant;
  void id;
  void plannedMealId;
  void createdAt;
  return data;
}
