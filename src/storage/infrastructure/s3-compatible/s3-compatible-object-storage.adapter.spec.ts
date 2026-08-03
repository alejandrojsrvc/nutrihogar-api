import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3CompatibleObjectStorageAdapter } from './s3-compatible-object-storage.adapter';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('S3CompatibleObjectStorageAdapter', () => {
  const options = {
    endpoint: 'http://127.0.0.1:9000',
    region: 'us-east-1',
    bucket: 'nutrihogar',
    accessKeyId: 'access-key',
    secretAccessKey: 'secret-key',
  };

  it('uploads and signs a private object without exposing provider types', async () => {
    const client = new S3Client({ region: options.region });
    const send = jest.spyOn(client, 'send').mockResolvedValue({} as never);
    jest.mocked(getSignedUrl).mockResolvedValue('http://signed.test/object');
    const storage = new S3CompatibleObjectStorageAdapter(options, client);

    await expect(
      storage.upload({
        key: 'households/household-id/receipts/file.jpg',
        contentType: 'image/jpeg',
        body: Buffer.from('receipt'),
        metadata: { 'original-name': 'receipt.jpg' },
      }),
    ).resolves.toEqual({
      key: 'households/household-id/receipts/file.jpg',
      contentType: 'image/jpeg',
      size: 7,
    });
    const signedUrl = await storage.createSignedDownloadUrl(
      'households/household-id/receipts/file.jpg',
      600,
    );

    expect(signedUrl).toBe('http://signed.test/object');
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0].input).toMatchObject({
      Bucket: 'nutrihogar',
      Key: 'households/household-id/receipts/file.jpg',
      ContentType: 'image/jpeg',
      Metadata: { 'original-name': 'receipt.jpg' },
    });
    expect(getSignedUrl).toHaveBeenCalledWith(
      client,
      expect.objectContaining({
        input: { Bucket: 'nutrihogar', Key: 'households/household-id/receipts/file.jpg' },
      }),
      { expiresIn: 600 },
    );
  });

  it('treats a missing object as nonexistent and deletes objects idempotently', async () => {
    const client = new S3Client({ region: options.region });
    const notFound = new Error('missing');
    notFound.name = 'NotFound';
    const send = jest
      .spyOn(client, 'send')
      .mockRejectedValueOnce(notFound)
      .mockResolvedValueOnce({} as never);
    const storage = new S3CompatibleObjectStorageAdapter(options, client);

    await expect(storage.exists('households/household-id/receipts/missing.jpg')).resolves.toBe(
      false,
    );
    await expect(
      storage.delete('households/household-id/receipts/missing.jpg'),
    ).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('rejects unsafe keys and excessive signed URL lifetimes', async () => {
    const storage = new S3CompatibleObjectStorageAdapter(
      options,
      new S3Client({ region: options.region }),
    );

    await expect(
      storage.upload({
        key: 'households/../secret',
        contentType: 'text/plain',
        body: Buffer.from('x'),
      }),
    ).rejects.toThrow('Storage key is invalid.');
    expect(() => storage.createSignedDownloadUrl('safe/key', 3600)).toThrow(
      'Signed URL expiration must be between 60 and 900 seconds.',
    );
  });
});
