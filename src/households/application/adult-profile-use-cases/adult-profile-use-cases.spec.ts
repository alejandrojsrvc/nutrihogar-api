import {
  AdultProfileAlreadyExistsError,
  InvalidAdultProfileBirthDateError,
  InvalidAdultProfileHeightError,
} from '../adult-profile-errors/adult-profile.errors';
import { AdultProfileView } from '../adult-profile-models/adult-profile-view';
import { AdultProfileRepository } from '../adult-profile-ports/adult-profile-repository.port';
import { AdultProfileUnitOfWork } from '../adult-profile-ports/adult-profile-unit-of-work.port';
import { HouseholdAccessDeniedError } from '../errors/household-access-denied.error';
import { HouseholdAccess } from '../models/household-access';
import { HouseholdView } from '../models/household-view';
import { HouseholdRepository } from '../ports/household-repository.port';
import { CreateAdultProfileUseCase } from './create-adult-profile.use-case';
import { GetAdultProfileUseCase } from './get-adult-profile.use-case';
import { ListAdultProfilesUseCase } from './list-adult-profiles.use-case';
import { UpdateAdultProfileUseCase } from './update-adult-profile.use-case';

const household: HouseholdView = {
  id: 'household-id',
  name: 'Hogar Sojo',
  timezone: 'America/Argentina/Buenos_Aires',
  currency: 'ARS',
  weeklyBudget: null,
  createdById: 'admin-id',
  createdAt: new Date('2026-07-30T10:00:00.000Z'),
  updatedAt: new Date('2026-07-30T10:00:00.000Z'),
};

const activeMemberAccess: HouseholdAccess = {
  household,
  role: 'MEMBER',
  status: 'ACTIVE',
};

const profile: AdultProfileView = {
  id: 'profile-id',
  householdId: household.id,
  userId: 'member-id',
  name: 'Integrante',
  birthDate: new Date('1990-05-20T00:00:00.000Z'),
  age: 36,
  biologicalSex: 'MALE',
  heightCm: 175.5,
  activityLevel: 'MODERATE',
  primaryGoal: 'MAINTENANCE',
  hasKitchenScale: true,
  isActive: true,
  createdAt: new Date('2026-07-30T10:00:00.000Z'),
  updatedAt: new Date('2026-07-30T10:00:00.000Z'),
  deletedAt: null,
  dietaryRestrictions: [
    {
      id: 'restriction-id',
      adultProfileId: 'profile-id',
      type: 'ALLERGY',
      name: 'Maní',
      severity: 'Severa',
      notes: null,
      createdAt: new Date('2026-07-30T10:00:00.000Z'),
      updatedAt: new Date('2026-07-30T10:00:00.000Z'),
    },
  ],
};

describe('Adult profile use cases', () => {
  let households: jest.Mocked<HouseholdRepository>;
  let profiles: jest.Mocked<AdultProfileRepository>;
  let unitOfWork: jest.Mocked<AdultProfileUnitOfWork>;

  beforeEach(() => {
    households = {
      findActiveForUser: jest.fn(),
      findAccess: jest.fn(),
      updateName: jest.fn(),
    };
    profiles = {
      findActiveByUserAndHousehold: jest.fn(),
      findActiveById: jest.fn(),
      listActiveByHousehold: jest.fn(),
    };
    unitOfWork = {
      create: jest.fn(),
      update: jest.fn(),
    };
  });

  it('creates a valid profile with its dietary restrictions', async () => {
    households.findAccess.mockResolvedValue(activeMemberAccess);
    profiles.findActiveByUserAndHousehold.mockResolvedValue(null);
    unitOfWork.create.mockResolvedValue(profile);
    const useCase = new CreateAdultProfileUseCase(households, profiles, unitOfWork);

    await expect(
      useCase.execute({
        actorId: 'member-id',
        householdId: household.id,
        name: ' Integrante ',
        birthDate: '1990-05-20',
        biologicalSex: 'MALE',
        heightCm: 175.5,
        activityLevel: 'MODERATE',
        primaryGoal: 'MAINTENANCE',
        hasKitchenScale: true,
        dietaryRestrictions: [
          {
            type: 'ALLERGY',
            name: ' Maní ',
            severity: ' Severa ',
          },
        ],
      }),
    ).resolves.toEqual(profile);

    expect(unitOfWork.create.mock.calls[0]?.[0]).toEqual({
      householdId: household.id,
      userId: 'member-id',
      name: 'Integrante',
      birthDate: new Date('1990-05-20T00:00:00.000Z'),
      biologicalSex: 'MALE',
      heightCm: 175.5,
      activityLevel: 'MODERATE',
      primaryGoal: 'MAINTENANCE',
      hasKitchenScale: true,
      dietaryRestrictions: [
        {
          type: 'ALLERGY',
          name: 'Maní',
          severity: 'Severa',
          notes: null,
        },
      ],
    });
  });

  it('rejects a future birth date', async () => {
    households.findAccess.mockResolvedValue(activeMemberAccess);
    profiles.findActiveByUserAndHousehold.mockResolvedValue(null);
    const useCase = new CreateAdultProfileUseCase(households, profiles, unitOfWork);

    await expect(
      useCase.execute({
        actorId: 'member-id',
        householdId: household.id,
        name: 'Integrante',
        birthDate: '2999-01-01',
        biologicalSex: 'MALE',
        heightCm: 175,
        activityLevel: 'LIGHT',
        primaryGoal: 'MAINTENANCE',
        hasKitchenScale: false,
        dietaryRestrictions: [],
      }),
    ).rejects.toBeInstanceOf(InvalidAdultProfileBirthDateError);
  });

  it('rejects a non-positive height', async () => {
    households.findAccess.mockResolvedValue(activeMemberAccess);
    profiles.findActiveByUserAndHousehold.mockResolvedValue(null);
    const useCase = new CreateAdultProfileUseCase(households, profiles, unitOfWork);

    await expect(
      useCase.execute({
        actorId: 'member-id',
        householdId: household.id,
        name: 'Integrante',
        birthDate: '1990-05-20',
        biologicalSex: 'MALE',
        heightCm: -1,
        activityLevel: 'LIGHT',
        primaryGoal: 'MAINTENANCE',
        hasKitchenScale: false,
        dietaryRestrictions: [],
      }),
    ).rejects.toBeInstanceOf(InvalidAdultProfileHeightError);
  });

  it('rejects a second active profile for the same user and household', async () => {
    households.findAccess.mockResolvedValue(activeMemberAccess);
    profiles.findActiveByUserAndHousehold.mockResolvedValue(profile);
    const useCase = new CreateAdultProfileUseCase(households, profiles, unitOfWork);

    await expect(
      useCase.execute({
        actorId: 'member-id',
        householdId: household.id,
        name: 'Duplicado',
        birthDate: '1990-05-20',
        biologicalSex: 'MALE',
        heightCm: 175,
        activityLevel: 'LIGHT',
        primaryGoal: 'MAINTENANCE',
        hasKitchenScale: false,
        dietaryRestrictions: [],
      }),
    ).rejects.toBeInstanceOf(AdultProfileAlreadyExistsError);
    expect(unitOfWork.create.mock.calls).toHaveLength(0);
  });

  it('lists profiles for an active household member', async () => {
    households.findAccess.mockResolvedValue(activeMemberAccess);
    profiles.listActiveByHousehold.mockResolvedValue([profile]);
    const useCase = new ListAdultProfilesUseCase(households, profiles);

    await expect(useCase.execute('member-id', household.id)).resolves.toEqual([profile]);
  });

  it('denies profile detail access from another household', async () => {
    profiles.findActiveById.mockResolvedValue(profile);
    households.findAccess.mockResolvedValue(null);
    const useCase = new GetAdultProfileUseCase(households, profiles);

    await expect(useCase.execute('outsider-id', profile.id)).rejects.toBeInstanceOf(
      HouseholdAccessDeniedError,
    );
  });

  it('allows an administrator to edit another member profile', async () => {
    profiles.findActiveById.mockResolvedValue(profile);
    households.findAccess.mockResolvedValue({
      household,
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    const updatedProfile = { ...profile, heightCm: 180 };
    unitOfWork.update.mockResolvedValue(updatedProfile);
    const useCase = new UpdateAdultProfileUseCase(households, profiles, unitOfWork);

    await expect(
      useCase.execute({
        actorId: 'admin-id',
        profileId: profile.id,
        heightCm: 180,
      }),
    ).resolves.toEqual(updatedProfile);
    expect(unitOfWork.update.mock.calls[0]?.[0]).toBe(profile.id);
    expect(unitOfWork.update.mock.calls[0]?.[1]).toEqual({ heightCm: 180 });
  });

  it('allows a member to edit their own profile', async () => {
    profiles.findActiveById.mockResolvedValue(profile);
    households.findAccess.mockResolvedValue(activeMemberAccess);
    const updatedProfile = { ...profile, primaryGoal: 'MUSCLE_GAIN' as const };
    unitOfWork.update.mockResolvedValue(updatedProfile);
    const useCase = new UpdateAdultProfileUseCase(households, profiles, unitOfWork);

    await expect(
      useCase.execute({
        actorId: profile.userId,
        profileId: profile.id,
        primaryGoal: 'MUSCLE_GAIN',
      }),
    ).resolves.toEqual(updatedProfile);
  });

  it('denies editing another profile to a common household member', async () => {
    profiles.findActiveById.mockResolvedValue(profile);
    households.findAccess.mockResolvedValue(activeMemberAccess);
    const useCase = new UpdateAdultProfileUseCase(households, profiles, unitOfWork);

    await expect(
      useCase.execute({
        actorId: 'different-member-id',
        profileId: profile.id,
        heightCm: 180,
      }),
    ).rejects.toBeInstanceOf(HouseholdAccessDeniedError);
    expect(unitOfWork.update.mock.calls).toHaveLength(0);
  });
});
