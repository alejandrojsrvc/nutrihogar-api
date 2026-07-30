import { HouseholdAccessDeniedError } from '../errors/household-access-denied.error';
import { HouseholdRepository } from '../ports/household-repository.port';

export async function ensureHouseholdMemberAccess(
  households: HouseholdRepository,
  actorId: string,
  householdId: string,
): Promise<void> {
  const access = await households.findAccess(actorId, householdId);

  if (!access || access.status !== 'ACTIVE') {
    throw new HouseholdAccessDeniedError();
  }
}
