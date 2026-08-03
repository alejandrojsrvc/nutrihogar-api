import Decimal from 'decimal.js';
import { BodyMeasurementEntry } from '../../domain/entities/body-measurement-entry';
import { BodyWeightEntry } from '../../domain/entities/body-weight-entry';
import { MeasurementConfiguration } from '../../domain/entities/measurement-configuration';
import { BodyMeasurementRepository } from '../ports/body-measurement-repository.port';
import { BodyWeightListFilters, BodyWeightRepository } from '../ports/body-weight-repository.port';
import { MeasurementConfigurationRepository } from '../ports/measurement-configuration-repository.port';
import {
  CorrectBodyWeightUseCase,
  ListBodyWeightEntriesQuery,
  RegisterBodyMeasurementUseCase,
  RegisterBodyWeightUseCase,
  UpdateMeasurementConfigurationUseCase,
} from './health-tracking.use-cases';
import {
  HealthTrackingAccessDeniedError,
  MeasurementNotEnabledError,
} from '../errors/health-tracking-application.errors';

const now = new Date('2026-08-01T12:00:00.000Z');
const profile = (userId = 'user-1') =>
  ({ id: 'profile-1', userId, householdId: 'household-1' }) as never;
const deps = (userId = 'user-1', role: 'ADMIN' | 'MEMBER' = 'MEMBER') => ({
  profiles: { findActiveById: () => Promise.resolve(profile(userId)) },
  households: {
    findAccess: () => Promise.resolve({ household: {} as never, role, status: 'ACTIVE' as const }),
  },
  clock: { now: () => now },
});
function weight(id = 'weight-1') {
  return BodyWeightEntry.create({
    id,
    adultProfileId: 'profile-1',
    value: '80.25',
    unit: 'KG',
    recordedAt: now,
    source: 'MANUAL',
    now,
  });
}
function measurement(id = 'measurement-1') {
  return BodyMeasurementEntry.create({
    id,
    adultProfileId: 'profile-1',
    type: 'WAIST',
    value: '90',
    unit: 'CM',
    recordedAt: now,
    source: 'MANUAL',
    now,
  });
}

describe('health tracking application', () => {
  it('allows only the profile owner to register weight', async () => {
    const save = jest.fn((entry: BodyWeightEntry) => Promise.resolve(entry));
    const repository = {
      save,
    } as unknown as BodyWeightRepository;
    const useCase = new RegisterBodyWeightUseCase(repository, deps('different-user'));
    await expect(
      useCase.execute({
        actorId: 'user-1',
        adultProfileId: 'profile-1',
        value: 80,
        unit: 'KG',
        recordedAt: now,
        source: 'MANUAL',
      }),
    ).rejects.toBeInstanceOf(HealthTrackingAccessDeniedError);
    expect(save).not.toHaveBeenCalled();
  });

  it('creates a correction without changing the original', async () => {
    const original = weight();
    const save = jest.fn((entry: BodyWeightEntry) => Promise.resolve(entry));
    const repository = {
      findById: jest.fn(() => Promise.resolve(original)),
      save,
    } as unknown as BodyWeightRepository;
    const corrected = await new CorrectBodyWeightUseCase(repository, deps()).execute({
      actorId: 'user-1',
      entryId: original.id,
      value: new Decimal('79.5'),
      unit: 'KG',
      recordedAt: now,
      source: 'MANUAL',
    });
    expect(corrected.correctedFromId).toBe(original.id);
    expect(original.correctedFromId).toBeNull();
  });

  it('passes date, unit and pagination filters to the repository', async () => {
    const listByAdult = jest.fn((_id: string, filters: BodyWeightListFilters) =>
      Promise.resolve({ items: [], ...filters, total: 0 }),
    );
    const repository = {
      listByAdult,
    } as unknown as BodyWeightRepository;
    await new ListBodyWeightEntriesQuery(repository, deps()).execute({
      actorId: 'user-1',
      adultProfileId: 'profile-1',
      dateFrom: '2026-07-01',
      dateTo: '2026-08-01',
      unit: 'LB',
      page: 2,
      limit: 10,
    });
    expect(listByAdult).toHaveBeenCalledWith(
      'profile-1',
      expect.objectContaining({ unit: 'LB', page: 2, limit: 10 }),
    );
  });

  it('rejects disabled measurements and uses saveMany for a batch', async () => {
    const configurations = {
      findByAdult: jest.fn(() =>
        Promise.resolve(MeasurementConfiguration.createDefault('config-1')),
      ),
      save: jest.fn((config: MeasurementConfiguration) => Promise.resolve(config)),
    } as unknown as MeasurementConfigurationRepository;
    const saveMany = jest.fn((entries: BodyMeasurementEntry[]) => Promise.resolve(entries));
    const measurements = { saveMany } as unknown as BodyMeasurementRepository;
    const useCase = new RegisterBodyMeasurementUseCase(measurements, configurations, deps());
    await expect(
      useCase.execute('user-1', 'profile-1', [measurement().toProps() as never]),
    ).resolves.toHaveLength(1);
    await expect(
      useCase.execute('user-1', 'profile-1', [
        { ...measurement().toProps(), type: 'CUSTOM', customMeasurementName: 'Body fat' } as never,
      ]),
    ).rejects.toBeInstanceOf(MeasurementNotEnabledError);
    expect(saveMany).toHaveBeenCalledTimes(1);
  });

  it('updates a configuration only for its owner', async () => {
    const configurations = {
      findByAdult: () => Promise.resolve(null),
      save: jest.fn((config: MeasurementConfiguration) => Promise.resolve(config)),
    } as unknown as MeasurementConfigurationRepository;
    await expect(
      new UpdateMeasurementConfigurationUseCase(configurations, deps('different-user')).execute(
        'user-1',
        'profile-1',
        { enabledTypes: ['WAIST'] },
      ),
    ).rejects.toBeInstanceOf(HealthTrackingAccessDeniedError);
  });
});
