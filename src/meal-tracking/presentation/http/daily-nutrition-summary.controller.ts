import { Controller, Get, Inject, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { CurrentUser as CurrentUserModel } from '../../../identity/application/models/current-user';
import { CurrentUser } from '../../../identity/presentation/http/current-user.decorator';
import { SupabaseAuthGuard } from '../../../identity/presentation/http/supabase-auth.guard';
import {
  GET_DAILY_NUTRITION_SUMMARY_USE_CASE,
  GetDailyNutritionSummaryUseCase,
} from '../../application/use-cases/get-daily-nutrition-summary.use-case';
import { DailyNutritionSummaryResponseDto } from './dto/daily-nutrition-summary-response.dto';
import { rethrowMealHttpError } from './meal-http.mapper';

@ApiTags('nutrition-summaries')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token.' })
@Controller('adult-profiles/:profileId/daily-nutrition-summary')
@UseGuards(SupabaseAuthGuard)
export class DailyNutritionSummaryController {
  constructor(
    @Inject(GET_DAILY_NUTRITION_SUMMARY_USE_CASE)
    private readonly getSummary: GetDailyNutritionSummaryUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Obtiene el resumen nutricional diario de un adulto' })
  @ApiParam({ name: 'profileId', format: 'uuid' })
  @ApiOkResponse({ type: DailyNutritionSummaryResponseDto })
  @ApiBadRequestResponse({ description: 'La fecha consultada es inválida.' })
  @ApiForbiddenResponse({ description: 'El perfil no es accesible para el usuario.' })
  @ApiNotFoundResponse({ description: 'El perfil no existe.' })
  async get(
    @Param('profileId') profileId: string,
    @Query('date') date: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<DailyNutritionSummaryResponseDto> {
    try {
      const summary = await this.getSummary.execute({
        actorId: user.id,
        adultProfileId: profileId,
        date,
      });

      return {
        date: summary.date,
        profileId: summary.profile.id,
        profileName: summary.profile.name,
        goal: summary.goal,
        consumed: summary.consumed,
        remaining: summary.remaining,
        meals: summary.meals,
      };
    } catch (error) {
      rethrowMealHttpError(error);
    }
  }
}
