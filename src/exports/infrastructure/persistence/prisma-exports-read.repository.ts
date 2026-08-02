import { Injectable } from '@nestjs/common';
import { HouseholdMembershipStatus, MealStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { ExportsReadRepository } from '../../application/ports/exports-read-repository.port';
import type { ExportDateRange } from '../../application/models/export.models';

@Injectable()
export class PrismaExportsReadRepository implements ExportsReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAccessibleProfile(actorId: string, profileId: string) {
    const profile = await this.prisma.adultProfile.findFirst({
      where: {
        id: profileId,
        isActive: true,
        deletedAt: null,
        household: {
          deletedAt: null,
          memberships: { some: { userId: actorId, status: HouseholdMembershipStatus.ACTIVE } },
        },
      },
      select: { id: true, householdId: true, household: { select: { timezone: true } } },
    });
    return profile
      ? { id: profile.id, householdId: profile.householdId, timezone: profile.household.timezone }
      : null;
  }

  async listBodyTracking(profileId: string, range: ExportDateRange) {
    const [weights, measurements] = await Promise.all([
      this.prisma.bodyWeightEntry.findMany({
        where: { adultProfileId: profileId, recordedAt: { gte: range.from, lt: range.to } },
        orderBy: [{ recordedAt: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.bodyMeasurementEntry.findMany({
        where: { adultProfileId: profileId, recordedAt: { gte: range.from, lt: range.to } },
        orderBy: [{ recordedAt: 'asc' }, { id: 'asc' }],
      }),
    ]);
    return [
      ...weights.map((row) => ({
        recordedAt: row.recordedAt,
        kind: 'weight' as const,
        name: 'weight',
        value: row.value.toString(),
        unit: row.unit,
      })),
      ...measurements.map((row) => ({
        recordedAt: row.recordedAt,
        kind: 'measurement' as const,
        name: row.customMeasurementName ?? row.type,
        value: row.value.toString(),
        unit: row.unit,
      })),
    ].sort(
      (a, b) =>
        a.recordedAt.getTime() - b.recordedAt.getTime() ||
        (a.name < b.name ? -1 : a.name > b.name ? 1 : 0) ||
        (a.kind < b.kind ? -1 : 1),
    );
  }

  async listNutrition(profileId: string, range: ExportDateRange) {
    const meals = await this.prisma.meal.findMany({
      where: {
        adultProfileId: profileId,
        status: MealStatus.CONFIRMED,
        consumedAt: { gte: range.from, lt: range.to },
      },
      include: {
        items: {
          include: { nutrientSnapshots: { orderBy: { nutrientCode: 'asc' } } },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ consumedAt: 'asc' }, { id: 'asc' }],
    });
    return meals.flatMap((meal) =>
      meal.items.flatMap((item) =>
        item.nutrientSnapshots.map((nutrient) => ({
          consumedAt: meal.consumedAt,
          mealType: meal.mealType,
          itemName: item.nameSnapshot,
          quantity: item.quantity.toString(),
          quantityUnit: item.unit,
          nutrientCode: nutrient.nutrientCode,
          nutrientName: nutrient.nutrientName,
          amount: nutrient.amount.toString(),
          nutrientUnit: nutrient.unit,
        })),
      ),
    );
  }

  async listDigestiveSymptoms(profileId: string, range: ExportDateRange) {
    const rows = await this.prisma.digestiveSymptomEntry.findMany({
      where: { adultProfileId: profileId, startAt: { gte: range.from, lt: range.to } },
      orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => ({
      startAt: row.startAt,
      endAt: row.endAt,
      type: row.customTypeName ?? row.type,
      intensity: row.intensity,
      status: row.status,
      notes: row.notes,
    }));
  }

  async listInventoryMovements(householdId: string, range: ExportDateRange) {
    const rows = await this.prisma.inventoryMovement.findMany({
      where: { item: { householdId }, occurredAt: { gte: range.from, lt: range.to } },
      include: { item: { select: { nameSnapshot: true } } },
      orderBy: [{ occurredAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => ({
      occurredAt: row.occurredAt,
      itemName: row.item.nameSnapshot,
      movementType: row.type,
      quantity: row.quantity.toString(),
      unit: row.unit,
      reason: row.reason,
    }));
  }

  async listPurchases(householdId: string, range: ExportDateRange) {
    const rows = await this.prisma.purchase.findMany({
      where: { householdId, purchaseDate: { gte: range.from, lt: range.to } },
      include: { items: { orderBy: [{ id: 'asc' }] } },
      orderBy: [{ purchaseDate: 'asc' }, { id: 'asc' }],
    });
    return rows.flatMap((purchase) =>
      purchase.items.map((item) => ({
        purchaseDate: purchase.purchaseDate,
        storeName: purchase.storeName,
        status: purchase.status,
        currency: purchase.currency,
        total: purchase.total.toString(),
        itemName: item.nameSnapshot,
        quantity: item.quantity.toString(),
        unit: item.unit,
      })),
    );
  }
}
