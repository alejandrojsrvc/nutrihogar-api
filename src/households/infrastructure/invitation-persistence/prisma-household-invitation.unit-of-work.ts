import { Injectable } from '@nestjs/common';
import {
  HouseholdInvitationStatus as PrismaHouseholdInvitationStatus,
  HouseholdMembershipStatus,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  HouseholdInvitationAlreadyHandledError,
  HouseholdInvitationAlreadyMemberError,
  HouseholdInvitationExpiredError,
} from '../../application/invitation-errors/household-invitation.errors';
import {
  AcceptHouseholdInvitationInput,
  HouseholdInvitationUnitOfWork,
} from '../../application/invitation-ports/household-invitation-unit-of-work.port';
import { HouseholdInvitationView } from '../../application/invitation-models/household-invitation-view';
import { PrismaHouseholdInvitationMapper } from './prisma-household-invitation.mapper';

@Injectable()
export class PrismaHouseholdInvitationUnitOfWork implements HouseholdInvitationUnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  async accept(input: AcceptHouseholdInvitationInput): Promise<HouseholdInvitationView> {
    return this.prisma.$transaction(async (transaction) => {
      const invitation = await transaction.householdInvitation.findUnique({
        where: { id: input.invitationId },
      });

      if (!invitation || invitation.status !== PrismaHouseholdInvitationStatus.PENDING) {
        throw new HouseholdInvitationAlreadyHandledError();
      }

      if (invitation.expiresAt <= input.now) {
        throw new HouseholdInvitationExpiredError();
      }

      const existingMembership = await transaction.householdMembership.findUnique({
        where: {
          householdId_userId: {
            householdId: invitation.householdId,
            userId: input.userId,
          },
        },
      });

      if (existingMembership?.status === HouseholdMembershipStatus.ACTIVE) {
        throw new HouseholdInvitationAlreadyMemberError();
      }

      const accepted = await transaction.householdInvitation.updateMany({
        where: {
          id: invitation.id,
          status: PrismaHouseholdInvitationStatus.PENDING,
          expiresAt: { gt: input.now },
        },
        data: {
          status: PrismaHouseholdInvitationStatus.ACCEPTED,
          acceptedById: input.userId,
        },
      });

      if (accepted.count === 0) {
        throw new HouseholdInvitationAlreadyHandledError();
      }

      if (existingMembership) {
        await transaction.householdMembership.update({
          where: { id: existingMembership.id },
          data: {
            role: input.role,
            status: HouseholdMembershipStatus.ACTIVE,
            joinedAt: input.now,
          },
        });
      } else {
        await transaction.householdMembership.create({
          data: {
            householdId: invitation.householdId,
            userId: input.userId,
            role: input.role,
            status: HouseholdMembershipStatus.ACTIVE,
          },
        });
      }

      const acceptedInvitation = await transaction.householdInvitation.findUniqueOrThrow({
        where: { id: invitation.id },
      });

      return PrismaHouseholdInvitationMapper.toView(acceptedInvitation);
    });
  }
}
