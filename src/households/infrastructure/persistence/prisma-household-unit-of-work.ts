import { Injectable } from '@nestjs/common';
import { HouseholdMembershipRole, HouseholdMembershipStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateHouseholdInput,
  HouseholdUnitOfWork,
} from '../../application/ports/household-unit-of-work.port';
import { HouseholdView } from '../../application/models/household-view';
import { PrismaHouseholdMapper } from './prisma-household.mapper';
import { seedStarterRecipes } from '../../../recipes/infrastructure/seed/starter-recipes.seeder';

@Injectable()
export class PrismaHouseholdUnitOfWork implements HouseholdUnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  async createWithAdminMembership(input: CreateHouseholdInput): Promise<HouseholdView> {
    const household = await this.prisma.$transaction(
      async (transaction) => {
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

        await seedStarterRecipes(transaction, createdHousehold.id, input.createdById);

        return createdHousehold;
      },
      {
        maxWait: 15_000,
        timeout: 120_000,
      },
    );

    return PrismaHouseholdMapper.toView(household);
  }
}
