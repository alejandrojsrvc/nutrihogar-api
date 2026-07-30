import { AdultProfileNotFoundError } from '../adult-profile-errors/adult-profile.errors';
import {
  ActivityLevel,
  AdultProfileView,
  BiologicalSex,
  DietaryRestrictionInput,
  PrimaryGoal,
} from '../adult-profile-models/adult-profile-view';
import { AdultProfileRepository } from '../adult-profile-ports/adult-profile-repository.port';
import {
  AdultProfileUnitOfWork,
  UpdateAdultProfileInput,
} from '../adult-profile-ports/adult-profile-unit-of-work.port';
import { HouseholdAccessDeniedError } from '../errors/household-access-denied.error';
import { HouseholdRepository } from '../ports/household-repository.port';
import { normalizeDietaryRestrictions } from './adult-profile-input';
import { ensureValidHeight, parseBirthDate } from './adult-profile-validation';

export const UPDATE_ADULT_PROFILE_USE_CASE = Symbol('UpdateAdultProfileUseCase');

export interface UpdateAdultProfileCommand {
  actorId: string;
  profileId: string;
  name?: string;
  birthDate?: string;
  biologicalSex?: BiologicalSex;
  heightCm?: number;
  activityLevel?: ActivityLevel;
  primaryGoal?: PrimaryGoal;
  hasKitchenScale?: boolean;
  dietaryRestrictions?: DietaryRestrictionInput[];
}

export class UpdateAdultProfileUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly profiles: AdultProfileRepository,
    private readonly unitOfWork: AdultProfileUnitOfWork,
  ) {}

  async execute(command: UpdateAdultProfileCommand): Promise<AdultProfileView> {
    const profile = await this.profiles.findActiveById(command.profileId);
    if (!profile) {
      throw new AdultProfileNotFoundError();
    }

    const access = await this.households.findAccess(command.actorId, profile.householdId);
    const canEdit =
      access?.status === 'ACTIVE' &&
      (profile.userId === command.actorId || access.role === 'ADMIN');

    if (!canEdit) {
      throw new HouseholdAccessDeniedError();
    }

    const input: UpdateAdultProfileInput = {};
    if (command.name !== undefined) input.name = command.name.trim();
    if (command.birthDate !== undefined) {
      input.birthDate = parseBirthDate(command.birthDate);
    }
    if (command.biologicalSex !== undefined) {
      input.biologicalSex = command.biologicalSex;
    }
    if (command.heightCm !== undefined) {
      ensureValidHeight(command.heightCm);
      input.heightCm = command.heightCm;
    }
    if (command.activityLevel !== undefined) {
      input.activityLevel = command.activityLevel;
    }
    if (command.primaryGoal !== undefined) {
      input.primaryGoal = command.primaryGoal;
    }
    if (command.hasKitchenScale !== undefined) {
      input.hasKitchenScale = command.hasKitchenScale;
    }
    if (command.dietaryRestrictions !== undefined) {
      input.dietaryRestrictions = normalizeDietaryRestrictions(command.dietaryRestrictions);
    }

    const updatedProfile = await this.unitOfWork.update(command.profileId, input);
    if (!updatedProfile) {
      throw new AdultProfileNotFoundError();
    }

    return updatedProfile;
  }
}
