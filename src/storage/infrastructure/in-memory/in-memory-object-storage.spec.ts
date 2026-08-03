import { InMemoryObjectStorage } from './in-memory-object-storage';

describe('InMemoryObjectStorage', () => {
  it('stores, checks, signs and deletes an object', async () => {
    const storage = new InMemoryObjectStorage();

    await expect(
      storage.upload({
        key: 'households/household-id/receipts/file.jpg',
        contentType: 'image/jpeg',
        body: Buffer.from('receipt'),
      }),
    ).resolves.toEqual({
      key: 'households/household-id/receipts/file.jpg',
      contentType: 'image/jpeg',
      size: 7,
    });
    await expect(storage.exists('households/household-id/receipts/file.jpg')).resolves.toBe(true);
    await expect(
      storage.createSignedDownloadUrl('households/household-id/receipts/file.jpg', 600),
    ).resolves.toContain('expiresIn=600');

    await storage.delete('households/household-id/receipts/file.jpg');

    await expect(storage.exists('households/household-id/receipts/file.jpg')).resolves.toBe(false);
  });

  it('rejects unsafe keys', async () => {
    const storage = new InMemoryObjectStorage();

    await expect(
      storage.upload({ key: '../secret.txt', contentType: 'text/plain', body: Buffer.from('x') }),
    ).rejects.toThrow('Storage key is invalid.');
  });
});
