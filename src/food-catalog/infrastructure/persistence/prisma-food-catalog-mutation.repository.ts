import { Injectable } from '@nestjs/common';
import { HouseholdMembershipStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  FoodCatalogMutationRepository,
  FoodHouseholdAccessRepository,
  FoodMutationTarget,
} from '../../application/ports/food-catalog-mutation.port';

@Injectable()
export class PrismaFoodCatalogMutationRepository
  implements FoodCatalogMutationRepository, FoodHouseholdAccessRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async isActiveMember(actorId: string, householdId: string): Promise<boolean> {
    const membership = await this.prisma.householdMembership.findFirst({
      where: {
        userId: actorId,
        householdId,
        status: HouseholdMembershipStatus.ACTIVE,
        household: { isActive: true },
      },
      select: { id: true },
    });

    return membership !== null;
  }

  async findTarget(foodId: string): Promise<FoodMutationTarget | null> {
    const food = await this.prisma.food.findUnique({
      where: { id: foodId },
      select: {
        id: true,
        householdId: true,
        foodType: true,
        isGlobal: true,
        isActive: true,
        deletedAt: true,
      },
    });

    if (!food) return null;

    return food;
  }
}
