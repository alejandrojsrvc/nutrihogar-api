import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

const testDatabaseUrl = 'postgresql://postgres:postgres@127.0.0.1:5432/nutrihogar';

@Injectable()
export class PrismaService extends PrismaClient {
  private readonly logger = new Logger(PrismaService.name);
  private readonly isTestEnvironment: boolean;

  constructor(configService: ConfigService) {
    const nodeEnvironment = configService.get<string>('NODE_ENV');
    const databaseUrl = configService.get<string>('DATABASE_URL') || testDatabaseUrl;

    super({ datasourceUrl: databaseUrl });
    this.isTestEnvironment = nodeEnvironment === 'test';
  }

  async onModuleInit(): Promise<void> {
    if (this.isTestEnvironment) {
      return;
    }

    try {
      await this.$connect();
      this.logger.log('Conexión con PostgreSQL establecida.');
    } catch {
      this.logger.error(
        'No se pudo conectar con PostgreSQL. Revisa DATABASE_URL y que PostgreSQL esté iniciado.',
      );
      throw new Error('No se pudo establecer la conexión con PostgreSQL.');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
