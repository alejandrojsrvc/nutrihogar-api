import Decimal from 'decimal.js';
import { AdultProfileRepository } from '../../../households/application/adult-profile-ports/adult-profile-repository.port';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { MealRepository } from '../../../meal-tracking/application/ports/meal-repository.port';
import { BodyMeasurementEntry } from '../../domain/entities/body-measurement-entry';
import { BodyWeightEntry } from '../../domain/entities/body-weight-entry';
import { DigestiveSymptomEntry } from '../../domain/entities/digestive-symptom-entry';
import { MeasurementTypeValue } from '../../domain/value-objects/health-tracking.value-objects';
import { DigestiveSymptomTypeValue } from '../../domain/value-objects/digestive-symptom.value-objects';
import {
  HealthTrackingAccessDeniedError,
  HealthTrackingProfileNotFoundError,
} from '../errors/health-tracking-application.errors';
import { BodyMeasurementRepository } from '../ports/body-measurement-repository.port';
import { BodyWeightRepository } from '../ports/body-weight-repository.port';
import { DigestiveSymptomRepository } from '../ports/digestive-symptom-repository.port';

export const GET_BODY_PROGRESS_QUERY = Symbol('GetBodyProgressQuery');
export const GET_DIGESTIVE_SYMPTOM_INSIGHTS_QUERY = Symbol('GetDigestiveSymptomInsightsQuery');

type AccessDeps = { profiles: AdultProfileRepository; households: HouseholdRepository };
async function verifyAccess(deps: AccessDeps, actorId: string, profileId: string) {
  const profile = await deps.profiles.findActiveById(profileId);
  if (!profile) throw new HealthTrackingProfileNotFoundError();
  const membership = await deps.households.findAccess(actorId, profile.householdId);
  if (!membership || membership.status !== 'ACTIVE') throw new HealthTrackingAccessDeniedError();
  return profile;
}
function parsedDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
function number(value: Decimal) {
  return value.toString();
}
function corrected<T extends { toProps(): { id: string; correctedFromId: string | null } }>(
  entries: T[],
) {
  const replaced = new Set(entries.map((entry) => entry.toProps().correctedFromId).filter(Boolean));
  return entries.filter((entry) => !replaced.has(entry.toProps().id));
}
function bucketStart(date: Date, granularity: 'DAILY' | 'WEEKLY' | 'MONTHLY') {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  if (granularity === 'MONTHLY')
    return new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth(), 1));
  if (granularity === 'WEEKLY') {
    const day = result.getUTCDay() || 7;
    result.setUTCDate(result.getUTCDate() - day + 1);
  }
  return result;
}
function bucketEnd(start: Date, granularity: 'DAILY' | 'WEEKLY' | 'MONTHLY') {
  const end = new Date(start);
  if (granularity === 'MONTHLY') end.setUTCMonth(end.getUTCMonth() + 1);
  else end.setUTCDate(end.getUTCDate() + (granularity === 'WEEKLY' ? 7 : 1));
  return new Date(end.getTime() - 1);
}
function convert(value: Decimal, from: string, to: string) {
  if (from === to) return new Decimal(value);
  if (from === 'KG' && to === 'LB') return value.mul('2.20462262185');
  if (from === 'LB' && to === 'KG') return value.div('2.20462262185');
  if (from === 'CM' && to === 'IN') return value.div('2.54');
  if (from === 'IN' && to === 'CM') return value.mul('2.54');
  return new Decimal(value);
}
function range(input: { dateFrom?: string; dateTo?: string }) {
  return { dateFrom: parsedDate(input.dateFrom), dateTo: parsedDate(input.dateTo) };
}

export class GetBodyProgressQuery {
  constructor(
    private readonly weights: BodyWeightRepository,
    private readonly measurements: BodyMeasurementRepository,
    private readonly deps: AccessDeps,
  ) {}
  async execute(input: {
    actorId: string;
    adultProfileId: string;
    dateFrom?: string;
    dateTo?: string;
    granularity?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    measurementTypes?: MeasurementTypeValue[];
    weightUnit?: 'KG' | 'LB';
    lengthUnit?: 'CM' | 'IN';
  }) {
    await verifyAccess(this.deps, input.actorId, input.adultProfileId);
    const granularity = input.granularity ?? 'DAILY';
    const dates = range(input);
    const [rawWeights, rawMeasurements] = await Promise.all([
      this.weights.listForProgress(input.adultProfileId, dates),
      this.measurements.listForProgress(input.adultProfileId, { ...dates }),
    ]);
    const weights = corrected(rawWeights).map((entry) => ({
      entry,
      value: convert(entry.toProps().value, entry.toProps().unit, input.weightUnit ?? 'KG'),
    }));
    const measurements = corrected(rawMeasurements)
      .filter(
        (entry) =>
          !input.measurementTypes?.length || input.measurementTypes.includes(entry.toProps().type),
      )
      .map((entry) => ({
        entry,
        value: convert(entry.toProps().value, entry.toProps().unit, input.lengthUnit ?? 'CM'),
      }));
    const periods = new Map<
      string,
      { start: Date; weights: typeof weights; measurements: typeof measurements }
    >();
    for (const item of weights)
      addPeriod(periods, item.entry.toProps().recordedAt, granularity, 'weights', item);
    for (const item of measurements)
      addPeriod(periods, item.entry.toProps().recordedAt, granularity, 'measurements', item);
    const result = [...periods.values()]
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .map((period) => {
        const latestWeight = period.weights
          .sort(
            (a, b) =>
              a.entry.toProps().recordedAt.getTime() - b.entry.toProps().recordedAt.getTime(),
          )
          .at(-1);
        const byType = new Map<MeasurementTypeValue, (typeof measurements)[number]>();
        for (const item of period.measurements) {
          const type = item.entry.toProps().type;
          if (
            !byType.has(type) ||
            item.entry.toProps().recordedAt > byType.get(type)!.entry.toProps().recordedAt
          )
            byType.set(type, item);
        }
        return {
          period: {
            from: period.start.toISOString(),
            to: bucketEnd(period.start, granularity).toISOString(),
          },
          weight: latestWeight
            ? {
                first: number(latestWeight.value),
                latest: number(latestWeight.value),
                change: '0',
                unit: input.weightUnit ?? 'KG',
                points: [point(latestWeight.entry.toProps().recordedAt, latestWeight.value)],
              }
            : null,
          measurements: Object.fromEntries(
            [...byType].map(([type, item]) => [
              type,
              {
                value: number(item.value),
                unit: input.lengthUnit ?? 'CM',
                point: point(item.entry.toProps().recordedAt, item.value),
              },
            ]),
          ),
        };
      });
    const allWeightPoints = weights.sort(
      (a, b) => a.entry.toProps().recordedAt.getTime() - b.entry.toProps().recordedAt.getTime(),
    );
    for (const period of result) {
      const items = allWeightPoints.filter(
        ({ entry }) =>
          bucketStart(entry.toProps().recordedAt, granularity).toISOString() === period.period.from,
      );
      if (items.length) {
        period.weight!.first = number(items[0].value);
        period.weight!.latest = number(items.at(-1)!.value);
        period.weight!.change = number(items.at(-1)!.value.minus(items[0].value));
        period.weight!.points = items.map((item) =>
          point(item.entry.toProps().recordedAt, item.value),
        );
      }
    }
    const warnings = [
      ...(weights.length < 2 ? ['Hay pocos registros de peso para observar una tendencia.'] : []),
      ...(measurements.length < 2
        ? ['Hay pocos registros de medidas para observar una tendencia.']
        : []),
    ];
    return {
      dateFrom: input.dateFrom ?? null,
      dateTo: input.dateTo ?? null,
      granularity,
      weightUnit: input.weightUnit ?? 'KG',
      lengthUnit: input.lengthUnit ?? 'CM',
      periods: result,
      warnings,
    };
  }
}
function addPeriod(
  map: Map<
    string,
    {
      start: Date;
      weights: Array<{ entry: BodyWeightEntry; value: Decimal }>;
      measurements: Array<{ entry: BodyMeasurementEntry; value: Decimal }>;
    }
  >,
  date: Date,
  granularity: 'DAILY' | 'WEEKLY' | 'MONTHLY',
  key: 'weights' | 'measurements',
  value:
    { entry: BodyWeightEntry; value: Decimal } | { entry: BodyMeasurementEntry; value: Decimal },
) {
  const start = bucketStart(date, granularity);
  const item = map.get(start.toISOString()) ?? { start, weights: [], measurements: [] };
  (item[key] as unknown[]).push(value);
  map.set(start.toISOString(), item);
}
function point(date: Date, value: Decimal) {
  return { recordedAt: date.toISOString(), value: number(value) };
}

type InsightDeps = AccessDeps & { meals: MealRepository };
export class GetDigestiveSymptomInsightsQuery {
  constructor(
    private readonly symptoms: DigestiveSymptomRepository,
    private readonly deps: InsightDeps,
  ) {}
  async execute(input: {
    actorId: string;
    adultProfileId: string;
    dateFrom?: string;
    dateTo?: string;
    symptomTypes?: DigestiveSymptomTypeValue[];
    minimumOccurrences?: number;
  }) {
    const profile = await verifyAccess(this.deps, input.actorId, input.adultProfileId);
    const dates = range(input);
    const minimum = Math.max(1, input.minimumOccurrences ?? 2);
    const entries = corrected(
      await this.symptoms.listForInsights(input.adultProfileId, { ...dates }),
    ).filter(
      (entry) => !input.symptomTypes?.length || input.symptomTypes.includes(entry.toProps().type),
    );
    const meals = await this.deps.meals.listForAnalysis({
      householdId: profile.householdId,
      adultProfileId: profile.id,
      dateFrom: dates.dateFrom,
      dateTo: dates.dateTo,
      includeCancelled: false,
    });
    const byType = new Map<DigestiveSymptomTypeValue, DigestiveSymptomEntry[]>();
    for (const entry of entries) {
      const type = entry.toProps().type;
      byType.set(type, [...(byType.get(type) ?? []), entry]);
    }
    const symptomsByHour = count(
      entries.map((entry) => String(entry.toProps().startAt.getUTCHours())),
    );
    const symptomsByDay = count(
      entries.map((entry) => String(entry.toProps().startAt.getUTCDay() || 7)),
    );
    const selectedMeals = count(
      entries.flatMap((entry) => entry.toProps().mealLinks.map((link) => link.mealId)),
    );
    const selectedFoodLinks = entries.flatMap((entry) =>
      entry
        .toProps()
        .foodLinks.filter(
          (link) => link.source === 'FOOD_FROM_MEAL' || link.source === 'MANUAL_HYPOTHESIS',
        ),
    );
    const selectedFoods = count(selectedFoodLinks.map((link) => link.foodId));
    const selectedFoodSnapshots = Object.fromEntries(
      selectedFoodLinks.filter((link) => link.snapshot).map((link) => [link.foodId, link.snapshot]),
    );
    const calculatedMeals: string[] = [];
    const calculatedFoods: string[] = [];
    const elapsed: number[] = [];
    for (const entry of entries) {
      const symptom = entry.toProps().startAt;
      const meal = meals
        .filter(
          (item) =>
            item.consumedAt <= symptom &&
            symptom.getTime() - item.consumedAt.getTime() <= 4 * 60 * 60 * 1000,
        )
        .at(-1);
      if (meal) {
        calculatedMeals.push(meal.id);
        elapsed.push((symptom.getTime() - meal.consumedAt.getTime()) / 60000);
        meal.items.forEach((item) => item.foodId && calculatedFoods.push(item.foodId));
      }
    }
    const start = dates.dateFrom ?? entries[0]?.toProps().startAt ?? new Date();
    const end = dates.dateTo ?? entries.at(-1)?.toProps().startAt ?? start;
    const endExclusive = dates.dateTo
      ? dates.dateTo
      : new Date(end.getTime() + 24 * 60 * 60 * 1000);
    const symptomDays = new Set(
      entries.map((entry) => entry.toProps().startAt.toISOString().slice(0, 10)),
    );
    const symptomFreeDays: string[] = [];
    for (
      let day = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
      day < endExclusive;
      day.setUTCDate(day.getUTCDate() + 1)
    )
      if (!symptomDays.has(day.toISOString().slice(0, 10)))
        symptomFreeDays.push(day.toISOString().slice(0, 10));
    return {
      disclaimer:
        'Estos patrones son descriptivos, no demuestran causalidad y no constituyen una evaluación médica.',
      totalOccurrences: entries.length,
      byType: Object.fromEntries(
        [...byType].map(([type, values]) => [
          type,
          {
            occurrences: values.length,
            averageIntensity: new Decimal(
              values.reduce((sum, item) => sum + item.toProps().intensity, 0),
            )
              .div(values.length)
              .toDecimalPlaces(2)
              .toString(),
          },
        ]),
      ),
      distributions: { hour: symptomsByHour, dayOfWeek: symptomsByDay },
      associations: {
        meals: {
          selectedByUser: above(selectedMeals, minimum),
          calculatedFromTiming: above(count(calculatedMeals), minimum),
        },
        foods: {
          selectedByUser: aboveWithSnapshots(selectedFoods, minimum, selectedFoodSnapshots),
          calculatedFromMeals: above(count(calculatedFoods), minimum),
        },
        averageMinutesFromMealToSymptom: elapsed.length
          ? new Decimal(elapsed.reduce((a, b) => a + b, 0))
              .div(elapsed.length)
              .toDecimalPlaces(2)
              .toString()
          : null,
      },
      symptomFreeDays,
      warnings: entries.length < minimum ? ['Hay pocos registros para mostrar asociaciones.'] : [],
    };
  }
}
function count(values: string[]) {
  const result: Record<string, number> = {};
  for (const value of values) result[value] = (result[value] ?? 0) + 1;
  return result;
}
function above(values: Record<string, number>, minimum: number) {
  return Object.fromEntries(
    Object.entries(values)
      .filter(([, occurrences]) => occurrences >= minimum)
      .map(([id, occurrences]) => [id, { id, occurrences }]),
  );
}
function aboveWithSnapshots(
  values: Record<string, number>,
  minimum: number,
  snapshots: Record<string, unknown>,
) {
  return Object.fromEntries(
    Object.entries(values)
      .filter(([, occurrences]) => occurrences >= minimum)
      .map(([id, occurrences]) => [id, { id, occurrences, snapshot: snapshots[id] ?? null }]),
  );
}
