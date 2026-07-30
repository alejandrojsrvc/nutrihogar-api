import { Injectable } from '@nestjs/common';
import { HouseholdMembershipStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { HouseholdAccess } from '../../application/models/household-access';
import { HouseholdView } from '../../application/models/household-view';
import { HouseholdRepository } from '../../application/ports/household-repository.port';
import { PrismaHouseholdMapper } from './prisma-household.mapper';

@Injectable()
export class PrismaHouseholdRepository implements HouseholdRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveForUser(userId: string): Promise<HouseholdView[]> {
    const memberships = await this.prisma.householdMembership.findMany({
      where: {
        userId,
        status: HouseholdMembershipStatus.ACTIVE,
        household: { deletedAt: null },
      },
      include: { household: true },
      orderBy: { joinedAt: 'asc' },
    });

    return memberships.map(({ household }) =>
      PrismaHouseholdMapper.toView(household),
    );
  }

  async findAccess(
    userId: string,
    householdId: string,
  ): Promise<HouseholdAccess | null> {
    const membership = await this.prisma.householdMembership.findUnique({
      where: {
        householdId_userId: { householdId, userId },
      },
      include: { household: true },
    });

    if (!membership || membership.household.deletedAt) {
      return null;
    }

    return PrismaHouseholdMapper.toAccess(membership);
  }

  async updateName(
    householdId: string,
    name: string,
  ): Promise<HouseholdView | null> {
    const result = await this.prisma.household.updateMany({
      where: { id: householdId, deletedAt: null },
      data: { name },
    });

    if (result.count === 0) {
      return null;
    }

    const household = await this.prisma.household.findUnique({
      where: { id: householdId },
    });

    return household ? PrismaHouseholdMapper.toView(household) : null;
  }
}
