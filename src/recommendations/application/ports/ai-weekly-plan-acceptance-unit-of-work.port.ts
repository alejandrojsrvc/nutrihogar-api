import type { AiProposalDecision } from '../../domain/entities/ai-proposal-decision';
import type { WeeklyPlan } from '../../../meal-planning/domain/entities/weekly-plan';

export const AI_WEEKLY_PLAN_ACCEPTANCE_UNIT_OF_WORK = Symbol('AiWeeklyPlanAcceptanceUnitOfWork');

export interface AiWeeklyPlanAcceptanceTransaction {
  saveWeeklyPlan(plan: WeeklyPlan): Promise<void>;
  saveProposalDecision(decision: AiProposalDecision): Promise<void>;
}

export interface AiWeeklyPlanAcceptanceUnitOfWork {
  execute<T>(work: (transaction: AiWeeklyPlanAcceptanceTransaction) => Promise<T>): Promise<T>;
}
