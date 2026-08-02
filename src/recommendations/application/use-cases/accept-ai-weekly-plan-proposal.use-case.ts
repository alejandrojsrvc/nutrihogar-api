import type { AiProposalRepository } from '../ports/ai-proposal-repository.port';
import type { AiWeeklyPlanAcceptanceUnitOfWork } from '../ports/ai-weekly-plan-acceptance-unit-of-work.port';
import { AiGeneratedProposalId } from '../../domain/value-objects/ai-recommendation.value-objects';
import { WeeklyPlan } from '../../../meal-planning/domain/entities/weekly-plan';
import {
  PlannedMealSource,
  PlannedMealType,
} from '../../../meal-planning/domain/value-objects/planned-meal';

export interface AcceptAiWeeklyPlanProposalCommand {
  householdId: string;
  actorId: string;
  proposalId: string;
  selectedItems?: string[];
  editedPayload?: Record<string, unknown> | null;
}

export class AcceptAiWeeklyPlanProposalUseCase {
  constructor(
    private readonly proposals: AiProposalRepository,
    private readonly transaction: AiWeeklyPlanAcceptanceUnitOfWork,
  ) {}

  async execute(command: AcceptAiWeeklyPlanProposalCommand): Promise<WeeklyPlan> {
    const proposal = await this.proposals.findByIdForHousehold(
      AiGeneratedProposalId.from(command.proposalId),
      command.householdId,
    );
    if (!proposal) throw new Error('AI proposal was not found.');
    const payload = command.editedPayload ?? proposal.structuredPayload;
    const weekStart = readString(payload.weekStart);
    const now = new Date();
    const plan = WeeklyPlan.create({
      id: crypto.randomUUID(),
      householdId: command.householdId,
      weekStart,
      createdBy: command.actorId,
      createdAt: now,
    });
    addMeals(plan, payload, now, command.selectedItems);
    const decision = proposal.accept({
      selectedItems: command.selectedItems,
      editedPayload: command.editedPayload,
      decidedBy: command.actorId,
      decidedAt: now,
    });
    await this.transaction.execute(async (unit) => {
      await unit.saveWeeklyPlan(plan);
      await unit.saveProposalDecision(decision);
      return undefined;
    });
    return plan;
  }
}

function addMeals(
  plan: WeeklyPlan,
  payload: Record<string, unknown>,
  occurredAt: Date,
  selectedItems?: string[],
): void {
  const days = Array.isArray(payload.days) ? payload.days : [];
  let position = 1;
  for (const day of days) {
    if (!isObject(day) || !Array.isArray(day.meals)) continue;
    for (const rawMeal of day.meals) {
      if (!isObject(rawMeal)) continue;
      const id = readString(rawMeal.id, crypto.randomUUID());
      if (selectedItems && selectedItems.length > 0 && !selectedItems.includes(id)) continue;
      plan.addMeal({
        id,
        date: readString(day.date),
        type: readEnum(rawMeal.type, Object.values(PlannedMealType), PlannedMealType.LUNCH),
        source: readEnum(
          rawMeal.source,
          Object.values(PlannedMealSource),
          PlannedMealSource.RECIPE,
        ),
        recipeId: readNullableString(rawMeal.recipeId),
        nameSnapshot: readNullableString(rawMeal.name),
        notes: readNullableString(rawMeal.notes),
        nutritionSnapshot: isObject(rawMeal.nutritionSnapshot) ? rawMeal.nutritionSnapshot : null,
        position: position++,
        occurredAt,
      });
    }
  }
}

function readString(value: unknown, fallback?: string): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (fallback) return fallback;
  throw new Error('AI proposal contains a required string with an invalid value.');
}

function readNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readEnum<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
