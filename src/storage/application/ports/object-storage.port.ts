export const OBJECT_STORAGE = Symbol('ObjectStorage');

export interface UploadObjectInput {
  key: string;
  contentType: string;
  body: Buffer;
  metadata?: Readonly<Record<string, string>>;
}

export interface StoredObject {
  key: string;
  contentType: string;
  size: number;
}

export interface ObjectStorage {
  upload(input: UploadObjectInput): Promise<StoredObject>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  createSignedDownloadUrl(key: string, expiresInSeconds: number): Promise<string>;
}
