import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import {
  AdultProfileAlreadyExistsError,
  AdultProfileNotFoundError,
  InvalidAdultProfileBirthDateError,
  InvalidAdultProfileHeightError,
} from '../../application/adult-profile-errors/adult-profile.errors';
import { HouseholdAccessDeniedError } from '../../application/errors/household-access-denied.error';
import { HouseholdNotFoundError } from '../../application/errors/household-not-found.error';
import {
  HouseholdInvitationAlreadyExistsError,
  HouseholdInvitationAlreadyHandledError,
  HouseholdInvitationAlreadyMemberError,
  HouseholdInvitationEmailMismatchError,
  HouseholdInvitationExpiredError,
  HouseholdInvitationNotFoundError,
} from '../../application/invitation-errors/household-invitation.errors';

export function rethrowHouseholdHttpError(error: unknown): never {
  if (
    error instanceof InvalidAdultProfileBirthDateError ||
    error instanceof InvalidAdultProfileHeightError
  ) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof HouseholdAccessDeniedError) {
    throw new ForbiddenException('You do not have access to this household.');
  }

  if (error instanceof HouseholdNotFoundError) {
    throw new NotFoundException('Household not found.');
  }

  if (error instanceof AdultProfileNotFoundError) {
    throw new NotFoundException('Adult profile not found.');
  }

  if (error instanceof AdultProfileAlreadyExistsError) {
    throw new ConflictException(
      'An active adult profile already exists for this user and household.',
    );
  }

  if (error instanceof HouseholdInvitationNotFoundError) {
    throw new NotFoundException('Household invitation not found.');
  }

  if (error instanceof HouseholdInvitationExpiredError) {
    throw new GoneException('Household invitation has expired.');
  }

  if (error instanceof HouseholdInvitationEmailMismatchError) {
    throw new ForbiddenException('The authenticated email does not match the invitation.');
  }

  if (
    error instanceof HouseholdInvitationAlreadyExistsError ||
    error instanceof HouseholdInvitationAlreadyMemberError ||
    error instanceof HouseholdInvitationAlreadyHandledError
  ) {
    throw new ConflictException('The household invitation cannot be processed.');
  }

  throw error;
}
