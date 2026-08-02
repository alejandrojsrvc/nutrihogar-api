import { PrismaService } from '../../../database/prisma.service';
import { DigestiveSymptomEntry } from '../../domain/entities/digestive-symptom-entry';
import { PrismaDigestiveSymptomRepository } from './prisma-digestive-symptom.repository';

describe('PrismaDigestiveSymptomRepository', () => {
  it('saves the aggregate and source links in one transaction without deleting history', async () => {
    const entry = DigestiveSymptomEntry.create({
      id: 'symptom-1',
      adultProfileId: 'adult-1',
      type: 'BLOATING',
      intensity: 3,
      startAt: '2026-08-01T10:00:00Z',
      now: new Date('2026-08-01T12:00:00Z'),
      notes: 'note',
    });
    entry.linkMeal('meal-1');
    const upsert = jest
      .fn()
      .mockResolvedValue({ ...entry.toProps(), mealLinks: [], foodLinks: [] });
    const findFirst = jest
      .fn()
      .mockResolvedValue({ ...entry.toProps(), mealLinks: [{ mealId: 'meal-1' }], foodLinks: [] });
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const transaction = jest.fn((callback: (client: unknown) => unknown) =>
      callback({
        digestiveSymptomEntry: { upsert, findFirst },
        digestiveSymptomMealLink: { createMany },
        digestiveSymptomFoodLink: { createMany },
      }),
    );
    const repository = new PrismaDigestiveSymptomRepository({
      $transaction: transaction,
    } as PrismaService);

    await repository.save(entry);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(createMany).toHaveBeenCalledWith({
      data: [{ symptomId: 'symptom-1', mealId: 'meal-1' }],
      skipDuplicates: true,
    });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'symptom-1' } }));
  });
});
