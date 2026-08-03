import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  ObjectStorage,
  StoredObject,
  UploadObjectInput,
} from '../../application/ports/object-storage.port';

export interface S3CompatibleObjectStorageOptions {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export class S3CompatibleObjectStorageAdapter implements ObjectStorage {
  private readonly client: S3Client;

  constructor(
    private readonly options: S3CompatibleObjectStorageOptions,
    client?: S3Client,
  ) {
    this.client =
      client ??
      new S3Client({
        endpoint: options.endpoint,
        region: options.region,
        forcePathStyle: true,
        credentials: {
          accessKeyId: options.accessKeyId,
          secretAccessKey: options.secretAccessKey,
        },
      });
  }

  async upload(input: UploadObjectInput): Promise<StoredObject> {
    assertSafeKey(input.key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        Metadata: input.metadata ? { ...input.metadata } : undefined,
      }),
    );

    return {
      key: input.key,
      contentType: input.contentType,
      size: input.body.length,
    };
  }

  async delete(key: string): Promise<void> {
    assertSafeKey(key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.options.bucket, Key: key }));
  }

  async exists(key: string): Promise<boolean> {
    assertSafeKey(key);
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.options.bucket, Key: key }));
      return true;
    } catch (error) {
      if (isNotFound(error)) return false;
      throw error;
    }
  }

  createSignedDownloadUrl(key: string, expiresInSeconds: number): Promise<string> {
    assertSafeKey(key);
    if (!Number.isInteger(expiresInSeconds) || expiresInSeconds < 60 || expiresInSeconds > 900) {
      throw new Error('Signed URL expiration must be between 60 and 900 seconds.');
    }

    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.options.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }
}

function assertSafeKey(key: string): void {
  if (!key || key.startsWith('/') || key.includes('\\') || key.includes('\0')) {
    throw new Error('Storage key is invalid.');
  }

  if (key.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')) {
    throw new Error('Storage key is invalid.');
  }
}

function isNotFound(error: unknown): boolean {
  return error instanceof S3ServiceException
    ? error.$metadata.httpStatusCode === 404 || error.name === 'NotFound'
    : error instanceof Error && error.name === 'NotFound';
}
