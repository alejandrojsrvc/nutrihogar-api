import { BodyMeasurementEntry } from '../../domain/entities/body-measurement-entry';
import { BodyWeightEntry } from '../../domain/entities/body-weight-entry';
import { DigestiveSymptomEntry } from '../../domain/entities/digestive-symptom-entry';
import { AdultProfileRepository } from '../../../households/application/adult-profile-ports/adult-profile-repository.port';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { MealRepository } from '../../../meal-tracking/application/ports/meal-repository.port';
import { BodyMeasurementRepository } from '../ports/body-measurement-repository.port';
import { BodyWeightRepository } from '../ports/body-weight-repository.port';
import { DigestiveSymptomRepository } from '../ports/digestive-symptom-repository.port';
import {
  GetBodyProgressQuery,
  GetDigestiveSymptomInsightsQuery,
} from './health-tracking-analysis.use-cases';

const profile = { id: 'profile-1', userId: 'user-1', householdId: 'household-1' };
const deps = {
  profiles: { findActiveById: jest.fn().mockResolvedValue(profile) },
  households: { findAccess: jest.fn().mockResolvedValue({ status: 'ACTIVE', role: 'MEMBER' }) },
} as unknown as { profiles: AdultProfileRepository; households: HouseholdRepository };
const at = (value: string) => new Date(`2026-08-${value}T10:00:00.000Z`);
function weight(
  id: string,
  value: string,
  recordedAt: Date,
  correctedFromId: string | null = null,
) {
  return BodyWeightEntry.create({
    id,
    adultProfileId: 'profile-1',
    value,
    unit: 'KG',
    recordedAt,
    source: 'MANUAL',
    correctedFromId,
    now: at('05'),
  });
}
function measurement(id: string, value: string, recordedAt: Date) {
  return BodyMeasurementEntry.create({
    id,
    adultProfileId: 'profile-1',
    type: 'WAIST',
    value,
    unit: 'CM',
    recordedAt,
    source: 'MANUAL',
    now: at('05'),
  });
}
function symptom(id: string, type: 'BLOATING' | 'GAS', startAt: string) {
  return DigestiveSymptomEntry.create({
    id,
    adultProfileId: 'profile-1',
    type,
    intensity: 3,
    startAt,
    now: new Date('2026-08-05T00:00:00Z'),
  });
}

describe('health tracking analysis queries', () => {
  it('selects latest daily values, excludes corrections, converts units and calculates change', async () => {
    const weights = {
      listForProgress: jest
        .fn()
        .mockResolvedValue([
          weight('w1', '80', at('01')),
          weight('w2', '81', at('02')),
          weight('w2-correction', '79', at('02'), 'w2'),
        ]),
    } as unknown as BodyWeightRepository;
    const measurements = {
      listForProgress: jest
        .fn()
        .mockResolvedValue([measurement('m1', '90', at('01')), measurement('m2', '91', at('02'))]),
    } as unknown as BodyMeasurementRepository;
    const result = await new GetBodyProgressQuery(weights, measurements, deps).execute({
      actorId: 'user-1',
      adultProfileId: 'profile-1',
      granularity: 'DAILY',
      weightUnit: 'LB',
      lengthUnit: 'IN',
    });
    expect(result.periods).toHaveLength(2);
    expect(result.periods[1].weight.first).toMatch(/^174\./);
    expect(result.periods[1].weight.latest).toMatch(/^174\./);
    expect(result.periods[0].measurements.WAIST.unit).toBe('IN');
    expect(result.warnings).toEqual([]);
  });

  it('requires profile access before reading body progress', async () => {
    const denied = {
      profiles: { findActiveById: jest.fn().mockResolvedValue(profile) },
      households: { findAccess: jest.fn().mockResolvedValue(null) },
    } as unknown as { profiles: AdultProfileRepository; households: HouseholdRepository };
    await expect(
      new GetBodyProgressQuery(
        {} as unknown as BodyWeightRepository,
        {} as unknown as BodyMeasurementRepository,
        denied,
      ).execute({
        actorId: 'other',
        adultProfileId: 'profile-1',
      }),
    ).rejects.toThrow();
  });

  it('calculates descriptive symptom metrics and hides associations below the threshold', async () => {
    const entries = [
      symptom('s1', 'BLOATING', '2026-08-02T12:00:00Z'),
      symptom('s2', 'BLOATING', '2026-08-03T12:00:00Z'),
      symptom('s3', 'GAS', '2026-08-03T14:00:00Z'),
    ];
    entries[0].linkFood({
      foodId: 'food-1',
      source: 'FOOD_FROM_MEAL',
      mealId: 'meal-1',
      snapshot: { name: 'Historical food' },
    });
    const meals = {
      listForAnalysis: jest.fn().mockResolvedValue([
        {
          id: 'meal-1',
          consumedAt: new Date('2026-08-02T10:00:00Z'),
          items: [{ foodId: 'food-1' }],
        },
      ]),
    } as unknown as MealRepository;
    const symptoms = {
      listForInsights: jest.fn().mockResolvedValue(entries),
    } as unknown as DigestiveSymptomRepository;
    const result = await new GetDigestiveSymptomInsightsQuery(symptoms, {
      ...deps,
      meals,
    }).execute({
      actorId: 'user-1',
      adultProfileId: 'profile-1',
      minimumOccurrences: 2,
      dateFrom: '2026-08-01',
      dateTo: '2026-08-04',
    });
    expect(result.totalOccurrences).toBe(3);
    expect(result.byType.BLOATING).toEqual(
      expect.objectContaining({ occurrences: 2, averageIntensity: '3' }),
    );
    expect(result.associations.foods.selectedByUser).toEqual({});
    expect(result.associations.foods.calculatedFromMeals).toEqual({});
    expect(result.disclaimer).toContain('no demuestran causalidad');
    expect(result.symptomFreeDays).toEqual(['2026-08-01']);
  });
});
