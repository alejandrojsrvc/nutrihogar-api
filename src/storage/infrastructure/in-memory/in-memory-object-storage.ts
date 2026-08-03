import {
  ObjectStorage,
  StoredObject,
  UploadObjectInput,
} from '../../application/ports/object-storage.port';

interface MemoryObject extends StoredObject {
  body: Buffer;
  metadata: Readonly<Record<string, string>>;
}

export class InMemoryObjectStorage implements ObjectStorage {
  private readonly objects = new Map<string, MemoryObject>();

  upload(input: UploadObjectInput): Promise<StoredObject> {
    try {
      assertSafeKey(input.key);
    } catch (error) {
      return Promise.reject(toError(error));
    }
    const object: MemoryObject = {
      key: input.key,
      contentType: input.contentType,
      size: input.body.length,
      body: Buffer.from(input.body),
      metadata: input.metadata ?? {},
    };
    this.objects.set(input.key, object);
    return Promise.resolve(toStoredObject(object));
  }

  delete(key: string): Promise<void> {
    try {
      assertSafeKey(key);
    } catch (error) {
      return Promise.reject(toError(error));
    }
    this.objects.delete(key);
    return Promise.resolve();
  }

  exists(key: string): Promise<boolean> {
    try {
      assertSafeKey(key);
    } catch (error) {
      return Promise.reject(toError(error));
    }
    return Promise.resolve(this.objects.has(key));
  }

  createSignedDownloadUrl(key: string, expiresInSeconds: number): Promise<string> {
    try {
      assertSafeKey(key);
      if (!this.objects.has(key)) throw new Error('Object does not exist.');
    } catch (error) {
      return Promise.reject(toError(error));
    }
    return Promise.resolve(`memory://${encodeURIComponent(key)}?expiresIn=${expiresInSeconds}`);
  }

  get(key: string): MemoryObject | undefined {
    return this.objects.get(key);
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

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function toStoredObject(object: MemoryObject): StoredObject {
  return { key: object.key, contentType: object.contentType, size: object.size };
}
