import { MealAdministrativeAccessDeniedError } from '../errors/meal-application.errors';
import { MealRepository } from '../ports/meal-repository.port';
import { ListMealsUseCase } from './list-meals.use-case';

describe('ListMealsUseCase', () => {
  let meals: jest.Mocked<MealRepository>;
  let list: jest.Mock;
  let useCase: ListMealsUseCase;

  beforeEach(() => {
    list = jest.fn().mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });
    meals = {
      findHouseholdAccess: jest
        .fn()
        .mockResolvedValue({ role: 'MEMBER', timezone: 'America/Argentina/Buenos_Aires' }),
      hasActiveProfile: jest.fn(),
      findById: jest.fn(),
      list,
    };
    useCase = new ListMealsUseCase(meals);
  });

  it('converts household-local dates to UTC and excludes cancelled meals by default', async () => {
    await useCase.execute({
      actorId: 'user-id',
      householdId: 'household-id',
      dateFrom: '2026-07-29',
      dateTo: '2026-07-29',
      page: 1,
      limit: 20,
      includeCancelled: false,
    });

    expect(list).toHaveBeenCalledWith({
      householdId: 'household-id',
      adultProfileId: undefined,
      dateFrom: new Date('2026-07-29T03:00:00.000Z'),
      dateTo: new Date('2026-07-30T03:00:00.000Z'),
      mealType: undefined,
      includeCancelled: false,
      page: 1,
      limit: 20,
    });
  });

  it('allows cancelled meals only to household administrators', async () => {
    await expect(
      useCase.execute({
        actorId: 'user-id',
        householdId: 'household-id',
        page: 1,
        limit: 20,
        includeCancelled: true,
      }),
    ).rejects.toBeInstanceOf(MealAdministrativeAccessDeniedError);
    expect(list).not.toHaveBeenCalled();
  });
});
