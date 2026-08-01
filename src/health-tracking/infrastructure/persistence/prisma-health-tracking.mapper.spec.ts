import { PrismaBodyMeasurementMapper } from './prisma-body-measurement.mapper';
import { PrismaBodyWeightMapper } from './prisma-body-weight.mapper';
import { PrismaMeasurementConfigurationMapper } from './prisma-measurement-configuration.mapper';
import type {
  PrismaBodyMeasurementRecord,
  PrismaBodyWeightRecord,
  PrismaMeasurementConfigurationRecord,
} from './prisma-health-tracking.types';

describe('Prisma health-tracking mappers', () => {
  const now = new Date('2026-08-01T12:00:00.000Z');

  it('reconstructs decimal weight values and correction links', () => {
    const record: PrismaBodyWeightRecord = {
      id: 'weight-2',
      adultProfileId: 'adult-1',
      value: { toString: () => '72.123456' },
      unit: 'KG',
      recordedAt: new Date('2026-08-01T10:00:00.000Z'),
      source: 'MANUAL',
      correctedFromId: 'weight-1',
    };
    const entry = PrismaBodyWeightMapper.toDomain(record, now);

    expect(entry.toProps()).toMatchObject({
      adultProfileId: 'adult-1',
      correctedFromId: 'weight-1',
    });
    expect(entry.value.toString()).toBe('72.123456');
  });

  it('round-trips custom measurement names and configuration state', () => {
    const measurementRecord: PrismaBodyMeasurementRecord = {
      id: 'measurement-1',
      adultProfileId: 'adult-1',
      type: 'CUSTOM',
      customMeasurementName: '  Muslo alto  ',
      value: { toString: () => '41.500000' },
      unit: 'CM',
      recordedAt: new Date('2026-08-01T10:00:00.000Z'),
      source: 'IMPORTED',
      correctedFromId: null,
    };
    const measurement = PrismaBodyMeasurementMapper.toDomain(measurementRecord);
    const configurationRecord: PrismaMeasurementConfigurationRecord = {
      id: 'configuration-1',
      adultProfileId: 'adult-1',
      enabledTypes: ['WAIST', 'CUSTOM'],
      units: { WAIST: 'IN' },
      customMeasurements: [
        {
          id: 'custom-1',
          configurationId: 'configuration-1',
          name: 'Muslo alto',
          normalizedName: 'muslo alto',
          unit: 'CM',
          enabled: false,
        },
      ],
    };
    const configuration = PrismaMeasurementConfigurationMapper.toDomain(configurationRecord);

    expect(measurement.toProps().customMeasurementName).toBe('Muslo alto');
    expect(configuration.toProps()).toMatchObject({
      enabledTypes: ['WAIST'],
      units: { WAIST: 'IN' },
      customMeasurements: [{ normalizedName: 'muslo alto', enabled: false }],
    });
  });
});
