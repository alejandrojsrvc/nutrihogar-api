import { HouseholdAccessDeniedError } from '../errors/household-access-denied.error';
import { HouseholdRepository } from '../ports/household-repository.port';

export async function ensureHouseholdAdminAccess(
  households: HouseholdRepository,
  actorId: string,
  householdId: string,
): Promise<void> {
  const access = await households.findAccess(actorId, householdId);

  if (!access || access.status !== 'ACTIVE' || access.role !== 'ADMIN') {
    throw new HouseholdAccessDeniedError();
  }
}
