import { HouseholdRepository } from '../ports/household-repository.port';
import { HouseholdView } from '../models/household-view';

export const LIST_HOUSEHOLDS_USE_CASE = Symbol('ListHouseholdsUseCase');

export class ListHouseholdsUseCase {
  constructor(private readonly households: HouseholdRepository) {}

  execute(actorId: string): Promise<HouseholdView[]> {
    return this.households.findActiveForUser(actorId);
  }
}
