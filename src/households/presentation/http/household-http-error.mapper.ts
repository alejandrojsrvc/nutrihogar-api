import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { HouseholdAccessDeniedError } from '../../application/errors/household-access-denied.error';
import { HouseholdNotFoundError } from '../../application/errors/household-not-found.error';

export function rethrowHouseholdHttpError(error: unknown): never {
  if (error instanceof HouseholdAccessDeniedError) {
    throw new ForbiddenException('You do not have access to this household.');
  }

  if (error instanceof HouseholdNotFoundError) {
    throw new NotFoundException('Household not found.');
  }

  throw error;
}
