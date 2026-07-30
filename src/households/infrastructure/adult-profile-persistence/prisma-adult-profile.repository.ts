import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AdultProfileView } from '../../application/adult-profile-models/adult-profile-view';
import { AdultProfileRepository } from '../../application/adult-profile-ports/adult-profile-repository.port';
import { PrismaAdultProfileMapper } from './prisma-adult-profile.mapper';

const activeProfileWhere = {
  isActive: true,
  deletedAt: null,
} as const;

@Injectable()
export class PrismaAdultProfileRepository implements AdultProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByUserAndHousehold(
    userId: string,
    householdId: string,
  ): Promise<AdultProfileView | null> {
    const profile = await this.prisma.adultProfile.findFirst({
      where: {
        userId,
        householdId,
        ...activeProfileWhere,
      },
      include: { dietaryRestrictions: { orderBy: { createdAt: 'asc' } } },
    });

    return profile ? PrismaAdultProfileMapper.toView(profile) : null;
  }

  async findActiveById(profileId: string): Promise<AdultProfileView | null> {
    const profile = await this.prisma.adultProfile.findFirst({
      where: {
        id: profileId,
        ...activeProfileWhere,
      },
      include: { dietaryRestrictions: { orderBy: { createdAt: 'asc' } } },
    });

    return profile ? PrismaAdultProfileMapper.toView(profile) : null;
  }

  async listActiveByHousehold(householdId: string): Promise<AdultProfileView[]> {
    const profiles = await this.prisma.adultProfile.findMany({
      where: {
        householdId,
        ...activeProfileWhere,
      },
      include: { dietaryRestrictions: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });

    return profiles.map((profile) => PrismaAdultProfileMapper.toView(profile));
  }
}
