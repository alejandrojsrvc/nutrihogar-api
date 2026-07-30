import { FoodNotFoundError } from '../errors/food-not-found.error';
import { FoodCatalogReadRepository } from '../ports/food-catalog-read-repository.port';
import { GetFoodDetailUseCase, SearchFoodsUseCase } from './food-catalog-queries';

describe('Food catalog queries', () => {
  const foods: jest.Mocked<FoodCatalogReadRepository> = {
    search: jest.fn(),
    findVisibleById: jest.fn(),
    listCategories: jest.fn(),
    listNutrients: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('normalizes an empty search and keeps pagination and filters', async () => {
    foods.search.mockResolvedValue({ items: [], page: 2, limit: 10, total: 0 });
    const useCase = new SearchFoodsUseCase(foods);

    await useCase.execute({
      actorId: 'user-id',
      query: '  ',
      categoryId: 'category-id',
      preparationState: 'COOKED',
      page: 2,
      limit: 10,
    });

    expect(foods.search.mock.calls[0]?.[0]).toEqual({
      actorId: 'user-id',
      query: undefined,
      categoryId: 'category-id',
      preparationState: 'COOKED',
      page: 2,
      limit: 10,
    });
  });

  it('returns not found when food is not visible to the user', async () => {
    foods.findVisibleById.mockResolvedValue(null);
    const useCase = new GetFoodDetailUseCase(foods);

    await expect(useCase.execute('user-id', 'other-household-food')).rejects.toBeInstanceOf(
      FoodNotFoundError,
    );
  });
});
