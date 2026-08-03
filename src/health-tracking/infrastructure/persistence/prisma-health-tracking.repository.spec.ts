/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import Decimal from 'decimal.js';
import { PrismaService } from '../../../database/prisma.service';
import { BodyWeightEntry } from '../../domain/entities/body-weight-entry';
import { MeasurementConfiguration } from '../../domain/entities/measurement-configuration';
import { PrismaBodyWeightRepository } from './prisma-body-weight.repository';
import { PrismaMeasurementConfigurationRepository } from './prisma-measurement-configuration.repository';
import type { HealthTrackingPrismaClient } from './prisma-health-tracking.types';

describe('Prisma health-tracking repositories', () => {
  const entry = BodyWeightEntry.create({
    id: 'weight-2',
    adultProfileId: 'adult-1',
    value: new Decimal('72.123456'),
    unit: 'KG',
    recordedAt: new Date('2026-08-01T10:00:00.000Z'),
    source: 'MANUAL',
    now: new Date('2026-08-01T12:00:00.000Z'),
    correctedFromId: 'weight-1',
  });

  it('scopes reads to the adult profile and preserves precise persistence values', async () => {
    const create = jest.fn().mockResolvedValue({
      ...entry.toProps(),
      value: { toString: () => '72.123456' },
    });
    const findFirst = jest.fn().mockResolvedValue(null);
    const repository = new PrismaBodyWeightRepository({
      bodyWeightEntry: { create, findFirst },
    } as PrismaService);

    await repository.save(entry);
    await repository.findLatest('adult-1');

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        adultProfileId: 'adult-1',
        value: '72.123456',
        correctedFromId: 'weight-1',
      }),
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: { adultProfileId: 'adult-1' },
      orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
    });
  });

  it('writes configuration and custom definitions in one transaction', async () => {
    const configuration = MeasurementConfiguration.createDefault('configuration-1');
    configuration.addCustomMeasurement({ name: 'Brazo alto', unit: 'IN' });
    const upsert = jest.fn().mockResolvedValue({
      id: 'configuration-1',
      adultProfileId: 'adult-1',
      enabledTypes: ['WAIST'],
      units: { WAIST: 'CM' },
    });
    const deleteMany = jest.fn().mockResolvedValue({ count: 0 });
    const create = jest.fn().mockImplementation((input: { data: Record<string, unknown> }) => ({
      id: 'custom-1',
      ...input.data,
    }));
    const transaction = jest.fn((callback: (client: HealthTrackingPrismaClient) => unknown) =>
      callback({
        measurementConfiguration: { upsert },
        customMeasurementDefinition: { deleteMany, create },
      } as HealthTrackingPrismaClient),
    );
    const repository = new PrismaMeasurementConfigurationRepository({
      $transaction: transaction,
    } as PrismaService);

    await repository.save(configuration, 'adult-1');

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(deleteMany).toHaveBeenCalledWith({ where: { configurationId: 'configuration-1' } });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        configurationId: 'configuration-1',
        normalizedName: 'brazo alto',
      }),
    });
  });
});
