import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { ShoppingListRepository } from '../../application/ports/shopping-list-repository.port';
import { ShoppingList } from '../../domain/entities/shopping-list';
import { PrismaShoppingListMapper, ShoppingListRecord } from './prisma-shopping-list.mapper';

interface Client {
  shoppingList: {
    findUnique(args: unknown): Promise<ShoppingListRecord | null>;
    upsert(args: unknown): Promise<unknown>;
  };
  shoppingListItem: {
    findUnique(args: unknown): Promise<{ shoppingList: ShoppingListRecord } | null>;
    deleteMany(args: unknown): Promise<unknown>;
    createMany(args: unknown): Promise<unknown>;
  };
}
const include = { items: { orderBy: { createdAt: 'asc' } } };

@Injectable()
export class PrismaShoppingListRepository implements ShoppingListRepository {
  constructor(private readonly prisma: PrismaService) {}
  async findByHousehold(householdId: string) {
    const row = await this.client(this.prisma).shoppingList.findUnique({
      where: { householdId },
      include,
    });
    return row ? PrismaShoppingListMapper.toDomain(row) : null;
  }
  async findByItemId(itemId: string) {
    const row = await this.client(this.prisma).shoppingListItem.findUnique({
      where: { id: itemId },
      include: { shoppingList: include },
    });
    return row ? PrismaShoppingListMapper.toDomain(row.shoppingList) : null;
  }
  async save(list: ShoppingList): Promise<void> {
    const data = PrismaShoppingListMapper.toPersistence(list);
    await this.prisma.$transaction(async (tx) => {
      const client = this.client(tx);
      await client.shoppingList.upsert({
        where: { id: data.id },
        create: {
          id: data.id,
          householdId: data.householdId,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        },
        update: { updatedAt: data.updatedAt },
      });
      await client.shoppingListItem.deleteMany({ where: { shoppingListId: data.id } });
      if (data.items.length)
        await client.shoppingListItem.createMany({
          data: data.items.map((item) => ({
            id: item.id,
            shoppingListId: data.id,
            foodId: item.foodId,
            name: item.name,
            normalizedName: item.normalizedName,
            quantity: item.quantity,
            unit: item.unit,
            source: item.source,
            sourceReferenceId: item.sourceReferenceId,
            status: item.status,
            actorId: item.actorId,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            purchasedAt: item.purchasedAt,
            purchasedById: item.purchasedById,
            removedAt: item.removedAt,
            removedById: item.removedById,
          })),
        });
    });
  }
  private client(value: unknown): Client {
    return value as Client;
  }
}
