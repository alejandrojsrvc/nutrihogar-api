import { HouseholdAccess } from '../models/household-access';
import { HouseholdView } from '../models/household-view';
import { HouseholdRepository } from '../ports/household-repository.port';
import { HouseholdUnitOfWork } from '../ports/household-unit-of-work.port';
import { HouseholdAccessDeniedError } from '../errors/household-access-denied.error';
import { CreateHouseholdUseCase } from './create-household.use-case';
import { GetHouseholdUseCase } from './get-household.use-case';
import { ListHouseholdsUseCase } from './list-households.use-case';
import { UpdateHouseholdUseCase } from './update-household.use-case';

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

describe('Household use cases', () => {
  let repository: jest.Mocked<HouseholdRepository>;
  let unitOfWork: jest.Mocked<HouseholdUnitOfWork>;

  beforeEach(() => {
    repository = {
      findActiveForUser: jest.fn(),
      findAccess: jest.fn(),
      updateName: jest.fn(),
    };
    unitOfWork = {
      createWithAdminMembership: jest.fn(),
    };
  });

  it('creates a household with the creator as administrator', async () => {
    unitOfWork.createWithAdminMembership.mockResolvedValue(household);
    const useCase = new CreateHouseholdUseCase(unitOfWork);

    await expect(
      useCase.execute({ actorId: 'admin-id', name: household.name }),
    ).resolves.toEqual(household);

    expect(unitOfWork.createWithAdminMembership.mock.calls[0]?.[0]).toEqual({
      createdById: 'admin-id',
      name: household.name,
      timezone: 'America/Argentina/Buenos_Aires',
      currency: 'ARS',
    });
  });

  it('lists only the households returned for the active user', async () => {
    repository.findActiveForUser.mockResolvedValue([household]);
    const useCase = new ListHouseholdsUseCase(repository);

    await expect(useCase.execute('admin-id')).resolves.toEqual([household]);
    expect(repository.findActiveForUser.mock.calls[0]?.[0]).toBe('admin-id');
  });

  it('denies detail access to a non-member', async () => {
    repository.findAccess.mockResolvedValue(null);
    const useCase = new GetHouseholdUseCase(repository);

    await expect(
      useCase.execute({ actorId: 'other-user-id', householdId: household.id }),
    ).rejects.toBeInstanceOf(HouseholdAccessDeniedError);
  });

  it('allows an administrator to edit the household name', async () => {
    const access: HouseholdAccess = {
      household,
      role: 'ADMIN',
      status: 'ACTIVE',
    };
    const updatedHousehold = { ...household, name: 'Hogar actualizado' };
    repository.findAccess.mockResolvedValue(access);
    repository.updateName.mockResolvedValue(updatedHousehold);
    const useCase = new UpdateHouseholdUseCase(repository);

    await expect(
      useCase.execute({
        actorId: 'admin-id',
        householdId: household.id,
        name: updatedHousehold.name,
      }),
    ).resolves.toEqual(updatedHousehold);
  });

  it('denies household edits to a common member', async () => {
    repository.findAccess.mockResolvedValue({
      household,
      role: 'MEMBER',
      status: 'ACTIVE',
    });
    const useCase = new UpdateHouseholdUseCase(repository);

    await expect(
      useCase.execute({
        actorId: 'member-id',
        householdId: household.id,
        name: 'Cambio no permitido',
      }),
    ).rejects.toBeInstanceOf(HouseholdAccessDeniedError);
    expect(repository.updateName.mock.calls).toHaveLength(0);
  });
});
