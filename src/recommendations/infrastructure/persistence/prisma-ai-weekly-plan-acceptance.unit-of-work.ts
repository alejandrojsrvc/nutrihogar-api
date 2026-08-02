import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '@prisma/client';
import type {
  AiWeeklyPlanAcceptanceTransaction,
  AiWeeklyPlanAcceptanceUnitOfWork,
} from '../../application/ports/ai-weekly-plan-acceptance-unit-of-work.port';
import type { AiProposalDecision } from '../../domain/entities/ai-proposal-decision';
import type { WeeklyPlan } from '../../../meal-planning/domain/entities/weekly-plan';
import { PrismaAiProposalDecisionMapper } from './prisma-ai-proposal-decision.mapper';
import { PrismaPlannedMealMapper } from '../../../meal-planning/infrastructure/persistence/prisma-planned-meal.mapper';
import { PrismaWeeklyPlanMapper } from '../../../meal-planning/infrastructure/persistence/prisma-weekly-plan.mapper';

@Injectable()
export class PrismaAiWeeklyPlanAcceptanceUnitOfWork implements AiWeeklyPlanAcceptanceUnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  execute<T>(work: (transaction: AiWeeklyPlanAcceptanceTransaction) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (client) => {
      const transaction: AiWeeklyPlanAcceptanceTransaction = {
        saveWeeklyPlan: (plan) => savePlan(client, plan),
        saveProposalDecision: (decision) => saveDecision(client, decision),
      };
      return work(transaction);
    });
  }
}

async function savePlan(client: Prisma.TransactionClient, plan: WeeklyPlan): Promise<void> {
  const data = PrismaWeeklyPlanMapper.toPersistence(plan);
  const existing = await client.weeklyPlan.findFirst({
    where: {
      householdId: data.householdId,
      weekStart: data.weekStart,
      status: { not: 'CANCELLED' },
    },
    select: { id: true },
  });
  if (existing) throw new Error('A weekly plan already exists for this household and week.');
  await client.weeklyPlan.create({
    data: {
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
      meals: {
        create: data.meals.map((meal) => ({
          ...withoutParticipants(meal),
          nutritionSnapshot:
            meal.nutritionSnapshot === null ? Prisma.JsonNull : toInputJson(meal.nutritionSnapshot),
          participants: {
            create: meal.participants.map(({ plannedMealId, ...participant }) => participant),
          },
        })) as unknown as Prisma.PlannedMealCreateWithoutWeeklyPlanInput[],
      },
    },
  });
}

async function saveDecision(
  client: Prisma.TransactionClient,
  decision: AiProposalDecision,
): Promise<void> {
  const data = PrismaAiProposalDecisionMapper.toPersistence(decision);
  await client.aiProposalDecision.create({ data });
  await client.aiGeneratedProposal.update({
    where: { id: data.proposalId },
    data: { status: decision.decision === 'ACCEPT' ? 'ACCEPTED' : 'PARTIALLY_ACCEPTED' },
  });
}

function withoutParticipants(meal: ReturnType<typeof PrismaPlannedMealMapper.toPersistence>) {
  const { participants, ...data } = meal;
  void participants;
  return data;
}

function toInputJson(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
