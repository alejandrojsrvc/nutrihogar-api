import {
  CreateHouseholdInput,
  HouseholdUnitOfWork,
} from '../ports/household-unit-of-work.port';
import { HouseholdView } from '../models/household-view';

export const CREATE_HOUSEHOLD_USE_CASE = Symbol('CreateHouseholdUseCase');

const defaultTimezone = 'America/Argentina/Buenos_Aires';
const defaultCurrency = 'ARS';

export interface CreateHouseholdCommand {
  actorId: string;
  name: string;
  timezone?: string;
  currency?: string;
}

export class CreateHouseholdUseCase {
  constructor(private readonly unitOfWork: HouseholdUnitOfWork) {}

  execute(command: CreateHouseholdCommand): Promise<HouseholdView> {
    const input: CreateHouseholdInput = {
      createdById: command.actorId,
      name: command.name,
      timezone: command.timezone ?? defaultTimezone,
      currency: command.currency ?? defaultCurrency,
    };

    return this.unitOfWork.createWithAdminMembership(input);
  }
}
