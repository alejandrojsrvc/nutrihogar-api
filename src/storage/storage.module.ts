import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OBJECT_STORAGE, ObjectStorage } from './application/ports/object-storage.port';
import { InMemoryObjectStorage } from './infrastructure/in-memory/in-memory-object-storage';
import {
  S3CompatibleObjectStorageAdapter,
  S3CompatibleObjectStorageOptions,
} from './infrastructure/s3-compatible/s3-compatible-object-storage.adapter';

@Module({
  providers: [
    {
      provide: OBJECT_STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): ObjectStorage => {
        const driver = config.getOrThrow<'memory' | 'minio' | 'r2'>('STORAGE_DRIVER');
        if (driver === 'memory') return new InMemoryObjectStorage();

        return new S3CompatibleObjectStorageAdapter(createS3Options(config, driver));
      },
    },
  ],
  exports: [OBJECT_STORAGE],
})
export class StorageModule {}

function createS3Options(
  config: ConfigService,
  driver: 'minio' | 'r2',
): S3CompatibleObjectStorageOptions {
  if (driver === 'minio') {
    return {
      endpoint: config.getOrThrow<string>('MINIO_ENDPOINT'),
      region: 'us-east-1',
      bucket: config.getOrThrow<string>('MINIO_BUCKET'),
      accessKeyId: config.getOrThrow<string>('MINIO_ACCESS_KEY_ID'),
      secretAccessKey: config.getOrThrow<string>('MINIO_SECRET_ACCESS_KEY'),
    };
  }

  const accountId = config.getOrThrow<string>('R2_ACCOUNT_ID');
  return {
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    region: 'auto',
    bucket: config.getOrThrow<string>('R2_BUCKET'),
    accessKeyId: config.getOrThrow<string>('R2_ACCESS_KEY_ID'),
    secretAccessKey: config.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
  };
}
