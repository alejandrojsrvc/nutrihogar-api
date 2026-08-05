import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  PurchaseRepository,
  PurchaseFilters,
  PaginatedPurchases,
} from '../../application/ports/purchase-repository.port';
import { Purchase } from '../../domain/entities/purchase';
import { PurchaseId } from '../../domain/value-objects/purchase-id';
import { HouseholdId } from '../../domain/value-objects/household-id';
import { PrismaPurchaseMapper, PurchaseRecord } from './prisma-purchase.mapper';

interface PurchaseDelegate {
  findUnique(args: unknown): Promise<PurchaseRecord | null>;
  findMany(args: unknown): Promise<PurchaseRecord[]>;
  count(args: unknown): Promise<number>;
  upsert(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
  findFirst(args: unknown): Promise<PurchaseRecord | null>;
}

interface PurchaseItemDelegate {
  deleteMany(args: unknown): Promise<unknown>;
  createMany(args: unknown): Promise<unknown>;
}

interface PurchaseClient {
  purchase: PurchaseDelegate;
  purchaseItem: PurchaseItemDelegate;
}

const includeItems = { items: { orderBy: { id: 'asc' } } };

@Injectable()
export class PrismaPurchaseRepository implements PurchaseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: PurchaseId): Promise<Purchase | null> {
    const record = await this.client(this.prisma).purchase.findUnique({
      where: { id: id.value },
      include: includeItems,
    });
    return record ? PrismaPurchaseMapper.toDomain(record) : null;
  }

  async findByIdempotencyKey(householdId: string, key: string): Promise<Purchase | null> {
    const record = await this.client(this.prisma).purchase.findFirst({
      where: { householdId, idempotencyKey: key },
      include: includeItems,
    });
    return record ? PrismaPurchaseMapper.toDomain(record) : null;
  }

  async save(purchase: Purchase): Promise<void> {
    const data = PrismaPurchaseMapper.toPersistence(purchase);
    await this.prisma.$transaction(async (transaction) => {
      const client = this.client(transaction);
      await client.purchase.upsert({
        where: { id: data.id },
        create: {
          id: data.id,
          householdId: data.householdId,
          registeredById: data.registeredById,
          storeName: data.storeName,
          purchaseDate: data.purchaseDate,
          status: data.status,
          source: data.source,
          currency: data.currency,
          total: data.total,
          idempotencyKey: data.idempotencyKey,
          ocrProvider: data.ocrProvider,
          ocrSchemaVersion: data.ocrSchemaVersion,
          ocrPayload: data.ocrPayload,
          ocrConfidence: data.ocrConfidence,
          ocrWarnings: data.ocrWarnings,
          ocrRequiresReview: data.ocrRequiresReview,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        },
        update: {
          storeName: data.storeName,
          purchaseDate: data.purchaseDate,
          status: data.status,
          source: data.source,
          currency: data.currency,
          total: data.total,
          idempotencyKey: data.idempotencyKey,
          ocrProvider: data.ocrProvider,
          ocrSchemaVersion: data.ocrSchemaVersion,
          ocrPayload: data.ocrPayload,
          ocrConfidence: data.ocrConfidence,
          ocrWarnings: data.ocrWarnings,
          ocrRequiresReview: data.ocrRequiresReview,
          updatedAt: data.updatedAt,
        },
      });
      await client.purchaseItem.deleteMany({ where: { purchaseId: data.id } });
      if (data.items.length > 0) await client.purchaseItem.createMany({ data: data.items });
    });
  }

  async listByHousehold(
    householdId: HouseholdId,
    filters: PurchaseFilters,
  ): Promise<PaginatedPurchases> {
    const where = {
      householdId: householdId.value,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.from || filters.to
        ? {
            purchaseDate: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
      ...(filters.storeName
        ? { storeName: { contains: filters.storeName.trim(), mode: 'insensitive' } }
        : {}),
    };
    const client = this.client(this.prisma);
    const [records, total] = await Promise.all([
      client.purchase.findMany({
        where,
        include: includeItems,
        orderBy: [{ purchaseDate: 'desc' }, { id: 'desc' }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      client.purchase.count({ where }),
    ]);
    return {
      items: records.map((record) => PrismaPurchaseMapper.toDomain(record)),
      page: filters.page,
      limit: filters.limit,
      total,
    };
  }

  private client(value: unknown): PurchaseClient {
    return value as PurchaseClient;
  }
}
