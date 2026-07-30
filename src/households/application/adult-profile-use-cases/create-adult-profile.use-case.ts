import { AdultProfileAlreadyExistsError } from '../adult-profile-errors/adult-profile.errors';
import {
  ActivityLevel,
  AdultProfileView,
  BiologicalSex,
  DietaryRestrictionInput,
  PrimaryGoal,
} from '../adult-profile-models/adult-profile-view';
import { AdultProfileRepository } from '../adult-profile-ports/adult-profile-repository.port';
import { AdultProfileUnitOfWork } from '../adult-profile-ports/adult-profile-unit-of-work.port';
import { HouseholdRepository } from '../ports/household-repository.port';
import { ensureHouseholdMemberAccess } from './ensure-household-member-access';
import { normalizeDietaryRestrictions } from './adult-profile-input';
import { ensureValidHeight, parseBirthDate } from './adult-profile-validation';

export const CREATE_ADULT_PROFILE_USE_CASE = Symbol('CreateAdultProfileUseCase');

export interface CreateAdultProfileCommand {
  actorId: string;
  householdId: string;
  name: string;
  birthDate: string;
  biologicalSex: BiologicalSex;
  heightCm: number;
  activityLevel: ActivityLevel;
  primaryGoal: PrimaryGoal;
  hasKitchenScale: boolean;
  dietaryRestrictions: DietaryRestrictionInput[];
}

export class CreateAdultProfileUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly profiles: AdultProfileRepository,
    private readonly unitOfWork: AdultProfileUnitOfWork,
  ) {}

  async execute(command: CreateAdultProfileCommand): Promise<AdultProfileView> {
    await ensureHouseholdMemberAccess(this.households, command.actorId, command.householdId);

    const existingProfile = await this.profiles.findActiveByUserAndHousehold(
      command.actorId,
      command.householdId,
    );
    if (existingProfile) {
      throw new AdultProfileAlreadyExistsError();
    }

    ensureValidHeight(command.heightCm);

    return this.unitOfWork.create({
      householdId: command.householdId,
      userId: command.actorId,
      name: command.name.trim(),
      birthDate: parseBirthDate(command.birthDate),
      biologicalSex: command.biologicalSex,
      heightCm: command.heightCm,
      activityLevel: command.activityLevel,
      primaryGoal: command.primaryGoal,
      hasKitchenScale: command.hasKitchenScale,
      dietaryRestrictions: normalizeDietaryRestrictions(command.dietaryRestrictions),
    });
  }
}
