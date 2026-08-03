import { randomUUID } from 'node:crypto';
import Decimal from 'decimal.js';
import { AdultProfileRepository } from '../../../households/application/adult-profile-ports/adult-profile-repository.port';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { Clock } from '../../../nutrition/application/ports/clock.port';
import { BodyMeasurementEntry } from '../../domain/entities/body-measurement-entry';
import { BodyWeightEntry } from '../../domain/entities/body-weight-entry';
import { MeasurementConfiguration } from '../../domain/entities/measurement-configuration';
import {
  MEASUREMENT_TYPES,
  MeasurementTypeValue,
} from '../../domain/value-objects/health-tracking.value-objects';
import {
  HealthTrackingAccessDeniedError,
  HealthTrackingCorrectionDeniedError,
  HealthTrackingEntryNotFoundError,
  HealthTrackingProfileNotFoundError,
  MeasurementNotEnabledError,
} from '../errors/health-tracking-application.errors';
import {
  BodyMeasurementListFilters,
  BodyMeasurementRepository,
} from '../ports/body-measurement-repository.port';
import { BodyWeightListFilters, BodyWeightRepository } from '../ports/body-weight-repository.port';
import { MeasurementConfigurationRepository } from '../ports/measurement-configuration-repository.port';

export const REGISTER_BODY_WEIGHT_USE_CASE = Symbol('RegisterBodyWeightUseCase');
export const CORRECT_BODY_WEIGHT_USE_CASE = Symbol('CorrectBodyWeightUseCase');
export const GET_BODY_WEIGHT_ENTRY_QUERY = Symbol('GetBodyWeightEntryQuery');
export const LIST_BODY_WEIGHT_ENTRIES_QUERY = Symbol('ListBodyWeightEntriesQuery');
export const GET_LATEST_BODY_WEIGHT_QUERY = Symbol('GetLatestBodyWeightQuery');
export const GET_MEASUREMENT_CONFIGURATION_QUERY = Symbol('GetMeasurementConfigurationQuery');
export const UPDATE_MEASUREMENT_CONFIGURATION_USE_CASE = Symbol(
  'UpdateMeasurementConfigurationUseCase',
);
export const REGISTER_BODY_MEASUREMENT_USE_CASE = Symbol('RegisterBodyMeasurementUseCase');
export const CORRECT_BODY_MEASUREMENT_USE_CASE = Symbol('CorrectBodyMeasurementUseCase');
export const LIST_BODY_MEASUREMENTS_QUERY = Symbol('ListBodyMeasurementsQuery');

type Access = {
  profile: NonNullable<Awaited<ReturnType<AdultProfileRepository['findActiveById']>>>;
  admin: boolean;
};
type Dependencies = {
  profiles: AdultProfileRepository;
  households: HouseholdRepository;
  clock: Clock;
};

async function access(deps: Dependencies, actorId: string, profileId: string): Promise<Access> {
  const profile = await deps.profiles.findActiveById(profileId);
  if (!profile) throw new HealthTrackingProfileNotFoundError();
  const membership = await deps.households.findAccess(actorId, profile.householdId);
  if (!membership || membership.status !== 'ACTIVE') throw new HealthTrackingAccessDeniedError();
  return { profile, admin: membership.role === 'ADMIN' };
}

function page(page = 1, limit = 20) {
  return { page: Math.max(1, page), limit: Math.min(100, Math.max(1, limit)) };
}
function date(value?: string): Date | undefined {
  return value ? new Date(value) : undefined;
}
function ensureDate(value?: Date): Date | undefined {
  return value && !Number.isNaN(value.getTime()) ? value : undefined;
}

export class RegisterBodyWeightUseCase {
  constructor(
    private readonly weights: BodyWeightRepository,
    private readonly deps: Dependencies,
  ) {}
  async execute(input: {
    actorId: string;
    adultProfileId: string;
    value: Decimal.Value;
    unit: 'KG' | 'LB';
    recordedAt: Date | string;
    source: 'MANUAL' | 'IMPORTED' | 'DEVICE';
  }) {
    const { profile } = await access(this.deps, input.actorId, input.adultProfileId);
    if (profile.userId !== input.actorId) throw new HealthTrackingAccessDeniedError();
    return this.weights.save(
      BodyWeightEntry.create({ ...input, id: randomUUID(), now: this.deps.clock.now() }),
    );
  }
}

export class CorrectBodyWeightUseCase {
  constructor(
    private readonly weights: BodyWeightRepository,
    private readonly deps: Dependencies,
  ) {}
  async execute(input: {
    actorId: string;
    entryId: string;
    value: Decimal.Value;
    unit: 'KG' | 'LB';
    recordedAt: Date | string;
    source: 'MANUAL' | 'IMPORTED' | 'DEVICE';
  }) {
    const original = await this.weights.findById(input.entryId);
    if (!original) throw new HealthTrackingEntryNotFoundError();
    const { profile, admin } = await access(
      this.deps,
      input.actorId,
      original.toProps().adultProfileId,
    );
    if (!admin && profile.userId !== input.actorId) throw new HealthTrackingCorrectionDeniedError();
    return this.weights.save(
      original.correct({ ...input, id: randomUUID(), now: this.deps.clock.now() }),
    );
  }
}

export class GetBodyWeightEntryQuery {
  constructor(
    private readonly weights: BodyWeightRepository,
    private readonly deps: Dependencies,
  ) {}
  async execute(actorId: string, entryId: string) {
    const entry = await this.weights.findById(entryId);
    if (!entry) throw new HealthTrackingEntryNotFoundError();
    await access(this.deps, actorId, entry.toProps().adultProfileId);
    return entry;
  }
}

export class ListBodyWeightEntriesQuery {
  constructor(
    private readonly weights: BodyWeightRepository,
    private readonly deps: Dependencies,
  ) {}
  async execute(input: {
    actorId: string;
    adultProfileId: string;
    dateFrom?: string;
    dateTo?: string;
    unit?: 'KG' | 'LB';
    page?: number;
    limit?: number;
  }) {
    await access(this.deps, input.actorId, input.adultProfileId);
    const paging = page(input.page, input.limit);
    const filters: BodyWeightListFilters = {
      ...paging,
      unit: input.unit,
      dateFrom: ensureDate(date(input.dateFrom)),
      dateTo: ensureDate(date(input.dateTo)),
    };
    return this.weights.listByAdult(input.adultProfileId, filters);
  }
}

export class GetLatestBodyWeightQuery {
  constructor(
    private readonly weights: BodyWeightRepository,
    private readonly deps: Dependencies,
  ) {}
  async execute(actorId: string, adultProfileId: string) {
    await access(this.deps, actorId, adultProfileId);
    return this.weights.findLatest(adultProfileId);
  }
}

export class GetMeasurementConfigurationQuery {
  constructor(
    private readonly configurations: MeasurementConfigurationRepository,
    private readonly deps: Dependencies,
  ) {}
  async execute(actorId: string, adultProfileId: string) {
    await access(this.deps, actorId, adultProfileId);
    const existing = await this.configurations.findByAdult(adultProfileId);
    if (existing) return existing;
    return this.configurations.save(
      MeasurementConfiguration.createDefault(randomUUID()),
      adultProfileId,
    );
  }
}

export type ConfigurationInput = {
  enabledTypes?: MeasurementTypeValue[];
  units?: Record<string, 'CM' | 'IN'>;
  customMeasurements?: Array<{ name: string; unit?: 'CM' | 'IN'; enabled?: boolean }>;
};
export class UpdateMeasurementConfigurationUseCase {
  constructor(
    private readonly configurations: MeasurementConfigurationRepository,
    private readonly deps: Dependencies,
  ) {}
  async execute(actorId: string, adultProfileId: string, input: ConfigurationInput) {
    const { profile } = await access(this.deps, actorId, adultProfileId);
    if (profile.userId !== actorId) throw new HealthTrackingAccessDeniedError();
    const current = await this.configurations.findByAdult(adultProfileId);
    const configuration = current ?? MeasurementConfiguration.createDefault(randomUUID());
    if (input.enabledTypes) {
      for (const type of MEASUREMENT_TYPES.filter((item) => item !== 'CUSTOM'))
        configuration.disable(type);
    }
    for (const type of input.enabledTypes ?? []) configuration.enable(type);
    for (const [type, unit] of Object.entries(input.units ?? {}))
      configuration.changeUnits(type as MeasurementTypeValue, unit);
    for (const custom of input.customMeasurements ?? []) {
      const definition = configuration.addCustomMeasurement(
        custom.name ? { name: custom.name, unit: custom.unit } : custom.name,
      );
      definition.enabled = custom.enabled ?? true;
    }
    return this.configurations.save(configuration, adultProfileId);
  }
}

type MeasurementInput = {
  type: MeasurementTypeValue;
  customMeasurementName?: string;
  value: Decimal.Value;
  unit: 'CM' | 'IN';
  recordedAt: Date | string;
  source: 'MANUAL' | 'IMPORTED' | 'DEVICE';
};
function validateMeasurement(configuration: MeasurementConfiguration, input: MeasurementInput) {
  if (!configuration.isEnabled(input.type, input.customMeasurementName))
    throw new MeasurementNotEnabledError();
}
export class RegisterBodyMeasurementUseCase {
  constructor(
    private readonly measurements: BodyMeasurementRepository,
    private readonly configurations: MeasurementConfigurationRepository,
    private readonly deps: Dependencies,
  ) {}
  async execute(
    actorId: string,
    adultProfileId: string,
    inputs: MeasurementInput[],
    enable?: ConfigurationInput,
  ) {
    const { profile } = await access(this.deps, actorId, adultProfileId);
    if (profile.userId !== actorId) throw new HealthTrackingAccessDeniedError();
    const configuration =
      (await this.configurations.findByAdult(adultProfileId)) ??
      MeasurementConfiguration.createDefault(randomUUID());
    if (enable) {
      for (const type of enable.enabledTypes ?? []) configuration.enable(type);
      for (const custom of enable.customMeasurements ?? []) {
        const definition = configuration.addCustomMeasurement({
          name: custom.name,
          unit: custom.unit,
        });
        definition.enabled = custom.enabled ?? true;
      }
      await this.configurations.save(configuration, adultProfileId);
    }
    inputs.forEach((input) => validateMeasurement(configuration, input));
    const entries = inputs.map((input) =>
      BodyMeasurementEntry.create({
        ...input,
        adultProfileId,
        id: randomUUID(),
        now: this.deps.clock.now(),
      }),
    );
    return this.measurements.saveMany(entries);
  }
}

export class CorrectBodyMeasurementUseCase {
  constructor(
    private readonly measurements: BodyMeasurementRepository,
    private readonly deps: Dependencies,
  ) {}
  async execute(input: { actorId: string; entryId: string } & MeasurementInput) {
    const original = await this.measurements.findById(input.entryId);
    if (!original) throw new HealthTrackingEntryNotFoundError();
    const { profile, admin } = await access(
      this.deps,
      input.actorId,
      original.toProps().adultProfileId,
    );
    if (!admin && profile.userId !== input.actorId) throw new HealthTrackingCorrectionDeniedError();
    return this.measurements.save(
      original.correct({ ...input, id: randomUUID(), now: this.deps.clock.now() }),
    );
  }
}

export class ListBodyMeasurementsQuery {
  constructor(
    private readonly measurements: BodyMeasurementRepository,
    private readonly deps: Dependencies,
  ) {}
  async execute(input: {
    actorId: string;
    adultProfileId: string;
    type?: MeasurementTypeValue;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    await access(this.deps, input.actorId, input.adultProfileId);
    const paging = page(input.page, input.limit);
    const filters: BodyMeasurementListFilters = {
      ...paging,
      type: input.type,
      dateFrom: ensureDate(date(input.dateFrom)),
      dateTo: ensureDate(date(input.dateTo)),
    };
    return this.measurements.listByAdult(input.adultProfileId, filters);
  }
}
