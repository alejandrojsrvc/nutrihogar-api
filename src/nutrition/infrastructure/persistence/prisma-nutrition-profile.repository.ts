import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  NutritionCalculationProfile,
  NutritionProfileRepository,
} from '../../application/ports/nutrition-profile-repository.port';

@Injectable()
export class PrismaNutritionProfileRepository implements NutritionProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveById(profileId: string): Promise<NutritionCalculationProfile | null> {
    const profile = await this.prisma.adultProfile.findFirst({
      where: { id: profileId, isActive: true, deletedAt: null },
      select: {
        id: true,
        birthDate: true,
        biologicalSex: true,
        weightKg: true,
        heightCm: true,
        activityLevel: true,
        primaryGoal: true,
      },
    });

    return profile
      ? {
          ...profile,
          weightKg: profile.weightKg?.toNumber() ?? null,
          heightCm: profile.heightCm?.toNumber() ?? null,
        }
      : null;
  }
}
