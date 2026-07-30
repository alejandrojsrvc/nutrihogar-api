import { HouseholdView } from '../../application/models/household-view';
import { HouseholdResponseDto } from './dto/household-response.dto';

export class HouseholdHttpMapper {
  static toResponse(household: HouseholdView): HouseholdResponseDto {
    return {
      id: household.id,
      name: household.name,
      timezone: household.timezone,
      currency: household.currency,
      weeklyBudget: household.weeklyBudget,
      createdById: household.createdById,
      createdAt: household.createdAt.toISOString(),
      updatedAt: household.updatedAt.toISOString(),
    };
  }

  static toResponseList(households: HouseholdView[]): HouseholdResponseDto[] {
    return households.map((household) =>
      HouseholdHttpMapper.toResponse(household),
    );
  }
}
