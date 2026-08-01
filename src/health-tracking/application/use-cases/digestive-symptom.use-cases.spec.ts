import { RegisterDigestiveSymptomUseCase } from './digestive-symptom.use-cases';

describe('digestive symptom use cases', () => {
  it('rejects a food link that is not present in its selected meal', async () => {
    const meal = {
      id: 'meal-1',
      householdId: 'household-1',
      adultProfileId: 'adult-1',
      status: 'CONFIRMED',
      items: [{ foodId: 'food-2' }],
    };
    const useCase = new RegisterDigestiveSymptomUseCase(
      { save: jest.fn(), findById: jest.fn(), listByAdult: jest.fn() },
      {
        profiles: {
          findActiveById: jest
            .fn()
            .mockResolvedValue({ id: 'adult-1', householdId: 'household-1', userId: 'user-1' }),
        } as never,
        households: {
          findAccess: jest.fn().mockResolvedValue({ status: 'ACTIVE', role: 'MEMBER' }),
        } as never,
        meals: { findById: jest.fn().mockResolvedValue(meal) } as never,
        foods: { findVisibleById: jest.fn().mockResolvedValue({ id: 'food-1' }) },
        clock: { now: jest.fn().mockReturnValue(new Date('2026-08-01T12:00:00Z')) },
      },
    );
    await expect(
      useCase.execute({
        actorId: 'user-1',
        adultProfileId: 'adult-1',
        type: 'BLOATING',
        intensity: 3,
        startAt: '2026-08-01T10:00:00Z',
        foodLinks: [{ foodId: 'food-1', mealId: 'meal-1', source: 'FOOD_FROM_MEAL' }],
      }),
    ).rejects.toThrow();
  });
});
