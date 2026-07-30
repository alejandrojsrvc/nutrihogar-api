import { Injectable } from '@nestjs/common';
import {
  HouseholdInvitationStatus as PrismaHouseholdInvitationStatus,
  HouseholdMembershipStatus,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateHouseholdInvitationInput,
  HouseholdInvitationRepository,
} from '../../application/invitation-ports/household-invitation-repository.port';
import { HouseholdInvitationView } from '../../application/invitation-models/household-invitation-view';
import { PrismaHouseholdInvitationMapper } from './prisma-household-invitation.mapper';

@Injectable()
export class PrismaHouseholdInvitationRepository implements HouseholdInvitationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(invitationId: string): Promise<HouseholdInvitationView | null> {
    const invitation = await this.prisma.householdInvitation.findUnique({
      where: { id: invitationId },
    });

    return invitation ? PrismaHouseholdInvitationMapper.toView(invitation) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<HouseholdInvitationView | null> {
    const invitation = await this.prisma.householdInvitation.findUnique({
      where: { tokenHash },
    });

    return invitation ? PrismaHouseholdInvitationMapper.toView(invitation) : null;
  }

  async findByHouseholdAndEmail(
    householdId: string,
    email: string,
  ): Promise<HouseholdInvitationView | null> {
    const invitation = await this.prisma.householdInvitation.findFirst({
      where: {
        householdId,
        email,
        status: PrismaHouseholdInvitationStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitation ? PrismaHouseholdInvitationMapper.toView(invitation) : null;
  }

  async hasActiveMembershipForEmail(householdId: string, email: string): Promise<boolean> {
    const membership = await this.prisma.householdMembership.findFirst({
      where: {
        householdId,
        status: HouseholdMembershipStatus.ACTIVE,
        user: { email },
      },
      select: { id: true },
    });

    return membership !== null;
  }

  async hasActiveMembershipForUser(householdId: string, userId: string): Promise<boolean> {
    const membership = await this.prisma.householdMembership.findUnique({
      where: {
        householdId_userId: { householdId, userId },
      },
      select: { status: true },
    });

    return membership?.status === HouseholdMembershipStatus.ACTIVE;
  }

  async listByHousehold(householdId: string): Promise<HouseholdInvitationView[]> {
    const invitations = await this.prisma.householdInvitation.findMany({
      where: { householdId },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map((invitation) => PrismaHouseholdInvitationMapper.toView(invitation));
  }

  async create(input: CreateHouseholdInvitationInput): Promise<HouseholdInvitationView> {
    const invitation = await this.prisma.householdInvitation.create({
      data: {
        householdId: input.householdId,
        email: input.email,
        role: input.role,
        status: PrismaHouseholdInvitationStatus.PENDING,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        invitedById: input.invitedById,
      },
    });

    return PrismaHouseholdInvitationMapper.toView(invitation);
  }

  async cancel(invitationId: string): Promise<HouseholdInvitationView | null> {
    const result = await this.prisma.householdInvitation.updateMany({
      where: {
        id: invitationId,
        status: PrismaHouseholdInvitationStatus.PENDING,
      },
      data: { status: PrismaHouseholdInvitationStatus.CANCELLED },
    });

    if (result.count === 0) {
      return null;
    }

    return this.findById(invitationId);
  }
}
