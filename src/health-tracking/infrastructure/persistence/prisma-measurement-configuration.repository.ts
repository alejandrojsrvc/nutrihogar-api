import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { MeasurementConfigurationRepository } from '../../application/ports/measurement-configuration-repository.port';
import { MeasurementConfiguration } from '../../domain/entities/measurement-configuration';
import { PrismaMeasurementConfigurationMapper } from './prisma-measurement-configuration.mapper';
import {
  HealthTrackingPrismaClient,
  PrismaCustomMeasurementRecord,
} from './prisma-health-tracking.types';

@Injectable()
export class PrismaMeasurementConfigurationRepository implements MeasurementConfigurationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByAdult(adultProfileId: string): Promise<MeasurementConfiguration | null> {
    const record = await this.client().measurementConfiguration.findUnique({
      where: { adultProfileId },
      include: { customMeasurements: true },
    });
    return record ? PrismaMeasurementConfigurationMapper.toDomain(record) : null;
  }

  async save(
    configuration: MeasurementConfiguration,
    adultProfileId: string,
  ): Promise<MeasurementConfiguration> {
    const persistence = PrismaMeasurementConfigurationMapper.toPersistence(configuration);
    const record = await this.prisma.$transaction(async (transaction) => {
      const client = transaction as unknown as HealthTrackingPrismaClient;
      const saved = await client.measurementConfiguration.upsert({
        where: { adultProfileId },
        create: {
          id: persistence.id,
          adultProfileId,
          enabledTypes: persistence.enabledTypes,
          units: persistence.units,
        },
        update: {
          enabledTypes: persistence.enabledTypes,
          units: persistence.units,
        },
      });
      await client.customMeasurementDefinition.deleteMany({ where: { configurationId: saved.id } });
      const customMeasurements: PrismaCustomMeasurementRecord[] = [];
      for (const custom of persistence.customMeasurements) {
        customMeasurements.push(
          await client.customMeasurementDefinition.create({
            data: {
              ...custom,
              configurationId: saved.id,
            },
          }),
        );
      }
      return {
        ...saved,
        customMeasurements,
      };
    });
    return PrismaMeasurementConfigurationMapper.toDomain(record);
  }

  private client(): HealthTrackingPrismaClient {
    return this.prisma as unknown as HealthTrackingPrismaClient;
  }
}
