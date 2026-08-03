/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */

import { Purchase } from '../../domain/entities/purchase';
import { CreatePurchaseUseCase } from './purchase.use-cases';
import { CreatePurchaseDraftFromReceiptUseCase } from './create-purchase-draft-from-receipt.use-case';

describe('CreatePurchaseDraftFromReceiptUseCase', () => {
  const access = { status: 'ACTIVE', household: { currency: 'EUR' } } as any;
  const households = { findAccess: jest.fn().mockResolvedValue(access) } as any;
  const ocr = {
    process: jest.fn().mockResolvedValue({
      storeName: 'Market',
      purchaseDate: new Date('2026-08-03T00:00:00.000Z'),
      total: '12.50',
      currency: 'EUR',
      confidence: 0.91,
      warnings: [],
      providerDocumentId: 'veryfi-id',
      items: [{ name: 'Milk', quantity: '2', unit: 'L', confidence: 0.96, needsReview: false }],
    }),
  } as any;
  const storage = {
    upload: jest.fn().mockResolvedValue({
      key: 'households/household-id/receipts/file-id.jpg',
      contentType: 'image/jpeg',
      size: 300,
    }),
    delete: jest.fn().mockResolvedValue(undefined),
    exists: jest.fn(),
    createSignedDownloadUrl: jest.fn().mockResolvedValue('https://signed.test/receipt'),
  } as any;

  beforeEach(() => jest.clearAllMocks());

  it('creates an OCR draft and removes the temporary receipt', async () => {
    const purchases = {
      findByIdempotencyKey: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
    } as any;
    const create = new CreatePurchaseUseCase(households, purchases);
    const useCase = new CreatePurchaseDraftFromReceiptUseCase(
      households,
      purchases,
      create,
      ocr,
      storage,
    );

    const result = await useCase.execute({
      actorId: 'user-id',
      householdId: 'household-id',
      content: validJpegContent(),
      fileName: 'receipt.jpg',
      contentType: 'image/jpeg',
      idempotencyKey: 'request-id',
    });

    expect(result.purchase.source).toBe('OCR');
    expect(result.purchase.items[0]).toMatchObject({ nameSnapshot: 'Milk', unit: 'L' });
    expect(result.ocr.providerDocumentId).toBe('veryfi-id');
    expect(storage.upload).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringMatching(/^households\/household-id\/receipts\/.+\.jpg$/),
        contentType: 'image/jpeg',
        body: expect.any(Buffer),
        metadata: { 'original-name': 'receipt.jpg' },
      }),
    );
    expect(storage.createSignedDownloadUrl).toHaveBeenCalledWith(
      'households/household-id/receipts/file-id.jpg',
      600,
    );
    expect(storage.delete).toHaveBeenCalledWith('households/household-id/receipts/file-id.jpg');
    expect(purchases.save).toHaveBeenCalledTimes(1);
  });

  it('returns the existing draft without sending the document again', async () => {
    const existing = Purchase.create({
      id: 'purchase-id',
      householdId: 'household-id',
      registeredById: 'user-id',
      storeName: 'Market',
      purchaseDate: new Date('2026-08-03T00:00:00.000Z'),
      currency: 'EUR',
      total: '12.50',
      idempotencyKey: 'request-id',
      items: [{ id: 'item-id', nameSnapshot: 'Milk', unit: 'L', quantity: 2 }],
      createdAt: new Date('2026-08-03T00:00:00.000Z'),
    });
    const purchases = {
      findByIdempotencyKey: jest.fn().mockResolvedValue(existing),
      save: jest.fn(),
    } as any;
    const useCase = new CreatePurchaseDraftFromReceiptUseCase(
      households,
      purchases,
      new CreatePurchaseUseCase(households, purchases),
      ocr,
      storage,
    );

    const result = await useCase.execute({
      actorId: 'user-id',
      householdId: 'household-id',
      content: validJpegContent(),
      fileName: 'receipt.jpg',
      contentType: 'image/jpeg',
      idempotencyKey: 'request-id',
    });

    expect(result.purchase.id).toBe('purchase-id');
    expect(storage.upload).not.toHaveBeenCalled();
    expect(ocr.process).not.toHaveBeenCalled();
  });

  it('rejects unsupported files before storage or OCR', async () => {
    const purchases = { findByIdempotencyKey: jest.fn(), save: jest.fn() } as any;
    const useCase = new CreatePurchaseDraftFromReceiptUseCase(
      households,
      purchases,
      new CreatePurchaseUseCase(households, purchases),
      ocr,
      storage,
    );

    await expect(
      useCase.execute({
        actorId: 'user-id',
        householdId: 'household-id',
        content: validJpegContent(),
        fileName: 'receipt.txt',
        contentType: 'text/plain',
      }),
    ).rejects.toThrow('Unsupported receipt file type');
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('rejects files above the configured limit before storage', async () => {
    const purchases = { findByIdempotencyKey: jest.fn(), save: jest.fn() } as any;
    const useCase = new CreatePurchaseDraftFromReceiptUseCase(
      households,
      purchases,
      new CreatePurchaseUseCase(households, purchases),
      ocr,
      storage,
      1024 * 1024,
    );

    await expect(
      useCase.execute({
        actorId: 'user-id',
        householdId: 'household-id',
        content: Buffer.alloc(1024 * 1024 + 1),
        fileName: 'receipt.jpg',
        contentType: 'image/jpeg',
      }),
    ).rejects.toThrow('Receipt file cannot exceed 1 MB.');
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('rejects content whose signature does not match the declared MIME type', async () => {
    const purchases = { findByIdempotencyKey: jest.fn(), save: jest.fn() } as any;
    const useCase = new CreatePurchaseDraftFromReceiptUseCase(
      households,
      purchases,
      new CreatePurchaseUseCase(households, purchases),
      ocr,
      storage,
    );

    await expect(
      useCase.execute({
        actorId: 'user-id',
        householdId: 'household-id',
        content: Buffer.alloc(300),
        fileName: 'receipt.jpg',
        contentType: 'image/jpeg',
      }),
    ).rejects.toThrow('Receipt file content does not match its MIME type.');
    expect(storage.upload).not.toHaveBeenCalled();
  });
});

function validJpegContent(): Buffer {
  return Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(297)]);
}
