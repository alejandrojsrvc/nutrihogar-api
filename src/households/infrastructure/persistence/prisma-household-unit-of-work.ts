import { Injectable } from '@nestjs/common';
import {
  HouseholdMembershipRole,
  HouseholdMembershipStatus,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateHouseholdInput,
  HouseholdUnitOfWork,
} from '../../application/ports/household-unit-of-work.port';
import { HouseholdView } from '../../application/models/household-view';
import { PrismaHouseholdMapper } from './prisma-household.mapper';

@Injectable()
export class PrismaHouseholdUnitOfWork implements HouseholdUnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  async createWithAdminMembership(
    input: CreateHouseholdInput,
  ): Promise<HouseholdView> {
    const household = await this.prisma.$transaction(async (transaction) => {
      const createdHousehold = await transaction.household.create({
        data: {
          name: input.name,
          timezone: input.timezone,
          currency: input.currency,
          createdById: input.createdById,
        },
      });

      await transaction.householdMembership.create({
        data: {
          householdId: createdHousehold.id,
          userId: input.createdById,
          role: HouseholdMembershipRole.ADMIN,
          status: HouseholdMembershipStatus.ACTIVE,
        },
      });

      return createdHousehold;
    });

    return PrismaHouseholdMapper.toView(household);
  }
}
