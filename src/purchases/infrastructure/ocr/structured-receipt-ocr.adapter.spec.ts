/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/unbound-method */
import { ReceiptOcrDataError } from '../../application/errors/receipt-ocr.errors';
import { StructuredContentProvider } from '../../../ai/application/ports/structured-content-provider.port';
import { StructuredReceiptOcrAdapter } from './structured-receipt-ocr.adapter';

describe('StructuredReceiptOcrAdapter', () => {
  it('maps the structured receipt without changing currency or quantity', async () => {
    const payload = validReceipt();
    const client = {
      generateStructuredContent: jest.fn().mockResolvedValue(JSON.stringify(payload)),
    } as StructuredContentProvider;
    const adapter = new StructuredReceiptOcrAdapter(client, {
      model: 'receipt-model',
      timeoutMs: 9000,
      provider: 'GEMINI',
    });

    const result = await adapter.process({
      fileUrl: 'https://signed.test/receipt',
      fileName: 'ticket.pdf',
      contentType: 'application/pdf',
      content: Buffer.from('%PDF-1.7'),
    });

    expect(result.provider).toBe('GEMINI');
    expect(result.purchaseDate.toISOString()).toBe('2026-08-03T14:05:06.000Z');
    expect(result.currency).toBe('ARS');
    expect(result.items[0]).toMatchObject({
      name: 'Rice',
      quantity: '2.5',
      unit: 'KG',
      unitPrice: '4.2',
      total: '10.5',
    });
    expect(result.structuredPayload).toMatchObject(payload);
    expect(result.structuredPayload?.items[0]?.item_type).toBe('FOOD');
    expect(result.reviewRequired).toBe(false);
    expect(client.generateStructuredContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'receipt-model',
        timeoutMs: 9000,
        media: { mimeType: 'application/pdf', bytes: expect.any(Buffer) },
        responseSchema: expect.objectContaining({ required: expect.arrayContaining(['total']) }),
      }),
    );
  });

  it('recomputes reviewRequired for arithmetic inconsistencies and low confidence', async () => {
    const payload = validReceipt();
    payload.items[0]!.total = 11;
    payload.confidence = 0.4;
    const client = {
      generateStructuredContent: jest.fn().mockResolvedValue(JSON.stringify(payload)),
    } as StructuredContentProvider;
    const result = await new StructuredReceiptOcrAdapter(client, {
      model: 'receipt-model',
      provider: 'GEMINI',
    }).process({
      fileUrl: 'unused',
      fileName: 'ticket.jpg',
      contentType: 'image/jpeg',
      content: Buffer.from([0xff, 0xd8, 0xff]),
    });

    expect(result.reviewRequired).toBe(true);
    expect(result.warnings).toEqual(
      expect.arrayContaining(['Receipt item 1 arithmetic is inconsistent.']),
    );
  });

  it('defaults an unidentified unit to UNIT and requires review', async () => {
    const payload = validReceipt();
    (payload.items[0] as { unit: string | null }).unit = null;
    const client = {
      generateStructuredContent: jest.fn().mockResolvedValue(JSON.stringify(payload)),
    } as StructuredContentProvider;

    const result = await new StructuredReceiptOcrAdapter(client, {
      model: 'receipt-model',
      provider: 'GEMINI',
    }).process({
      fileUrl: 'unused',
      fileName: 'ticket.jpg',
      contentType: 'image/jpeg',
      content: Buffer.from([0xff, 0xd8, 0xff]),
    });

    expect(result.items[0]).toMatchObject({ unit: 'UNIT', needsReview: true });
    expect(result.warnings).toContain('Receipt item 1 unit was not identified; defaulted to UNIT.');
    expect(result.reviewRequired).toBe(true);
  });

  it('normalizes line totals after discounts and separates non-food items', async () => {
    const payload = validReceipt();
    payload.schema_version = 'receipt.v2';
    payload.subtotal = 150;
    payload.discounts = 30;
    payload.total = 120;
    payload.items = [
      {
        item_type: 'FOOD',
        description: 'Coffee',
        quantity: 1,
        unit: 'UNIT',
        unit_price: 100,
        discount: 30,
        total: 100,
      },
      {
        item_type: 'NON_FOOD',
        description: 'Sweater',
        quantity: 1,
        unit: 'UNIT',
        unit_price: 50,
        discount: 0,
        total: 50,
      },
    ];
    const client = {
      generateStructuredContent: jest.fn().mockResolvedValue(JSON.stringify(payload)),
    } as StructuredContentProvider;

    const result = await new StructuredReceiptOcrAdapter(client, {
      model: 'receipt-model',
      provider: 'GEMINI',
    }).process({
      fileUrl: 'unused',
      fileName: 'ticket.jpg',
      contentType: 'image/jpeg',
      content: Buffer.from([0xff, 0xd8, 0xff]),
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ name: 'Coffee', total: '70' });
    expect(result.nonFoodItems).toHaveLength(1);
    expect(result.nonFoodItems[0]).toMatchObject({ name: 'Sweater', total: '50' });
    expect(result.reviewRequired).toBe(false);
  });

  it('raises ReceiptOcrDataError for invalid JSON and incompatible shapes', async () => {
    const client = {
      generateStructuredContent: jest
        .fn()
        .mockResolvedValueOnce('{not-json')
        .mockResolvedValueOnce(
          JSON.stringify({ ...validReceipt(), items: [{ description: 'Rice' }] }),
        ),
    } as StructuredContentProvider;
    const adapter = new StructuredReceiptOcrAdapter(client, {
      model: 'receipt-model',
      provider: 'GEMINI',
    });
    const input = {
      fileUrl: 'unused',
      fileName: 'ticket.jpg',
      contentType: 'image/jpeg',
      content: Buffer.from([0xff, 0xd8, 0xff]),
    };

    await expect(adapter.process(input)).rejects.toBeInstanceOf(ReceiptOcrDataError);
    await expect(adapter.process(input)).rejects.toBeInstanceOf(ReceiptOcrDataError);
  });

  it('rejects numeric strings instead of silently converting them', async () => {
    const payload = validReceipt();
    (payload.items[0] as { quantity: unknown }).quantity = '2.5';
    const client = {
      generateStructuredContent: jest.fn().mockResolvedValue(JSON.stringify(payload)),
    } as StructuredContentProvider;

    await expect(
      new StructuredReceiptOcrAdapter(client, {
        model: 'receipt-model',
        provider: 'GEMINI',
      }).process({
        fileUrl: 'unused',
        fileName: 'ticket.jpg',
        contentType: 'image/jpeg',
        content: Buffer.from([0xff, 0xd8, 0xff]),
      }),
    ).rejects.toBeInstanceOf(ReceiptOcrDataError);
  });
});

function validReceipt() {
  return {
    schema_version: 'receipt.v1',
    store: { name: 'Market', branch: 'Downtown', cuit: '30-123' },
    date: '2026-08-03',
    time: '14:05:06',
    ticket_number: 'A-10',
    currency: 'ARS',
    items: [
      {
        description: 'Rice',
        quantity: 2.5,
        unit: 'KG',
        unit_price: 4.2,
        discount: 0,
        total: 10.5,
      },
    ],
    subtotal: 10.5,
    discounts: 0,
    taxes: 0,
    total: 10.5,
    payment_methods: ['CASH'],
    warnings: [],
    confidence: 0.95,
    requires_review: true,
  };
}
