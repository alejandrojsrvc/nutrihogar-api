import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'node:crypto';
import { ReceiptStorage } from '../../application/ports/receipt-ocr.port';
import { ReceiptOcrProcessingError } from '../../application/errors/receipt-ocr.errors';

@Injectable()
export class SupabaseReceiptStorage implements ReceiptStorage {
  private readonly url: string;
  private readonly bucket: string;
  private readonly key: string;

  constructor(config: ConfigService) {
    this.url = (config.get<string>('SUPABASE_URL') ?? '').replace(/\/+$/, '');
    this.bucket = config.get<string>('SUPABASE_STORAGE_BUCKET') ?? 'user-files';
    this.key = config.get<string>('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  }

  async upload(input: {
    content: Buffer;
    contentType: string;
    fileName: string;
  }): Promise<{ path: string; url: string }> {
    if (!this.url || !this.key)
      throw new ReceiptOcrProcessingError('Receipt storage is not configured.');
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
    const path = `receipt-ocr/${crypto.randomUUID()}-${safeName}`;
    const response = await fetch(`${this.url}/storage/v1/object/${this.bucket}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.key}`,
        apikey: this.key,
        'Content-Type': input.contentType,
        'x-upsert': 'false',
      },
      // Node fetch accepts the Buffer at runtime; cast only bridges its DOM BodyInit typings.
      body: input.content as unknown as BodyInit,
    });
    if (!response.ok) throw new ReceiptOcrProcessingError('The receipt could not be uploaded.');

    const signed = await fetch(`${this.url}/storage/v1/object/sign/${this.bucket}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.key}`,
        apikey: this.key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: 300 }),
    });
    if (!signed.ok) {
      await this.remove(path);
      throw new ReceiptOcrProcessingError('The receipt URL could not be created.');
    }
    const body = (await signed.json()) as { signedURL?: string };
    if (!body.signedURL) {
      await this.remove(path);
      throw new ReceiptOcrProcessingError('The receipt URL could not be created.');
    }
    return {
      path,
      url: body.signedURL.startsWith('http') ? body.signedURL : `${this.url}${body.signedURL}`,
    };
  }

  async remove(path: string): Promise<void> {
    if (!this.url || !this.key) return;
    await fetch(`${this.url}/storage/v1/object/${this.bucket}/${path}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.key}`, apikey: this.key },
    });
  }
}
