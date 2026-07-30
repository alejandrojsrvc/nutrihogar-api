import { Household as PrismaHousehold, Prisma } from '@prisma/client';
import { HouseholdAccess } from '../../application/models/household-access';
import { HouseholdView } from '../../application/models/household-view';

type PrismaHouseholdAccess = Prisma.HouseholdMembershipGetPayload<{
  include: { household: true };
}>;

export class PrismaHouseholdMapper {
  static toView(household: PrismaHousehold): HouseholdView {
    return {
      id: household.id,
      name: household.name,
      timezone: household.timezone,
      currency: household.currency,
      weeklyBudget: household.weeklyBudget?.toString() ?? null,
      createdById: household.createdById,
      createdAt: household.createdAt,
      updatedAt: household.updatedAt,
    };
  }

  static toAccess(access: PrismaHouseholdAccess): HouseholdAccess {
    return {
      household: PrismaHouseholdMapper.toView(access.household),
      role: access.role,
      status: access.status,
    };
  }
}
