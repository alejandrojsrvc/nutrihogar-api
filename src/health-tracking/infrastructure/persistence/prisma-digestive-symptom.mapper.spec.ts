import { PrismaDigestiveSymptomMapper } from './prisma-digestive-symptom.mapper';

describe('PrismaDigestiveSymptomMapper', () => {
  it('round-trips status, notes, corrections and source snapshots', () => {
    const entry = PrismaDigestiveSymptomMapper.toDomain({
      id: 'symptom-2',
      adultProfileId: 'adult-1',
      type: 'OTHER',
      customTypeName: 'Cramp',
      intensity: 4,
      startAt: new Date('2026-08-01T10:00:00Z'),
      endAt: null,
      notes: 'reported twice',
      status: 'CORRECTED',
      correctedFromId: 'symptom-1',
      mealLinks: [{ mealId: 'meal-1' }],
      foodLinks: [
        {
          foodId: 'food-1',
          mealId: 'meal-1',
          source: 'FOOD_FROM_MEAL',
          snapshot: { name: 'Yogurt' },
        },
      ],
    });
    expect(entry.toProps()).toMatchObject({
      status: 'CORRECTED',
      notes: 'reported twice',
      correctedFromId: 'symptom-1',
    });
    expect(entry.toProps().foodLinks[0].snapshot).toEqual({ name: 'Yogurt' });
  });
});
