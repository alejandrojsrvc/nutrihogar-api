import { PrismaService } from '../../../database/prisma.service';
import { PrismaFoodCatalogReadRepository } from './prisma-food-catalog-read.repository';

describe('PrismaFoodCatalogReadRepository', () => {
  it('searches names, brands and aliases only within visible foods', async () => {
    const findMany: jest.MockedFunction<
      (input: { where: unknown; skip: number; take: number }) => Promise<never[]>
    > = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      food: { findMany, count },
    } as unknown as PrismaService;
    const repository = new PrismaFoodCatalogReadRepository(prisma);

    await repository.search({
      actorId: 'user-id',
      query: 'pollo',
      categoryId: 'category-id',
      preparationState: 'COOKED',
      page: 1,
      limit: 20,
    });

    const input = findMany.mock.calls[0]?.[0];
    expect(input?.skip).toBe(0);
    expect(input?.take).toBe(20);
    expect(input?.where).toEqual(
      expect.objectContaining({
        isActive: true,
        deletedAt: null,
        categoryId: 'category-id',
        preparationState: 'COOKED',
      }),
    );
    const serializedWhere = JSON.stringify(input?.where);
    expect(serializedWhere).toContain('"isGlobal":true');
    expect(serializedWhere).toContain('"household"');
    expect(serializedWhere).toContain('"name":{"contains":"pollo","mode":"insensitive"}');
    expect(serializedWhere).toContain('"alias":{"contains":"pollo","mode":"insensitive"}');
    expect(count).toHaveBeenCalledTimes(1);
  });
});
