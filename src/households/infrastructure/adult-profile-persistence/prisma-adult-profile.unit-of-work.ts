import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AdultProfileAlreadyExistsError } from '../../application/adult-profile-errors/adult-profile.errors';
import { AdultProfileView } from '../../application/adult-profile-models/adult-profile-view';
import {
  AdultProfileUnitOfWork,
  CreateAdultProfileInput,
  UpdateAdultProfileInput,
} from '../../application/adult-profile-ports/adult-profile-unit-of-work.port';
import { PrismaAdultProfileMapper } from './prisma-adult-profile.mapper';

@Injectable()
export class PrismaAdultProfileUnitOfWork implements AdultProfileUnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAdultProfileInput): Promise<AdultProfileView> {
    try {
      const profile = await this.prisma.$transaction(async (transaction) => {
        return transaction.adultProfile.create({
          data: {
            householdId: input.householdId,
            userId: input.userId,
            name: input.name,
            birthDate: input.birthDate,
            biologicalSex: input.biologicalSex,
            heightCm: input.heightCm,
            activityLevel: input.activityLevel,
            primaryGoal: input.primaryGoal,
            hasKitchenScale: input.hasKitchenScale,
            dietaryRestrictions: {
              create: input.dietaryRestrictions,
            },
          },
          include: {
            dietaryRestrictions: { orderBy: { createdAt: 'asc' } },
          },
        });
      });

      return PrismaAdultProfileMapper.toView(profile);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AdultProfileAlreadyExistsError();
      }

      throw error;
    }
  }

  async update(
    profileId: string,
    input: UpdateAdultProfileInput,
  ): Promise<AdultProfileView | null> {
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.adultProfile.updateMany({
        where: { id: profileId, isActive: true, deletedAt: null },
        data: {
          name: input.name,
          birthDate: input.birthDate,
          biologicalSex: input.biologicalSex,
          heightCm: input.heightCm,
          activityLevel: input.activityLevel,
          primaryGoal: input.primaryGoal,
          hasKitchenScale: input.hasKitchenScale,
        },
      });

      if (result.count === 0) {
        return null;
      }

      if (input.dietaryRestrictions !== undefined) {
        await transaction.dietaryRestriction.deleteMany({
          where: { adultProfileId: profileId },
        });

        if (input.dietaryRestrictions.length > 0) {
          await transaction.dietaryRestriction.createMany({
            data: input.dietaryRestrictions.map((restriction) => ({
              adultProfileId: profileId,
              ...restriction,
            })),
          });
        }
      }

      const profile = await transaction.adultProfile.findUnique({
        where: { id: profileId },
        include: {
          dietaryRestrictions: { orderBy: { createdAt: 'asc' } },
        },
      });

      return profile ? PrismaAdultProfileMapper.toView(profile) : null;
    });
  }
}
