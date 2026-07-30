import { Controller, Inject, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { CurrentUser as CurrentUserModel } from '../../../identity/application/models/current-user';
import { CurrentUser } from '../../../identity/presentation/http/current-user.decorator';
import { SupabaseAuthGuard } from '../../../identity/presentation/http/supabase-auth.guard';
import {
  GENERATE_NUTRITION_GOAL_SUGGESTION_USE_CASE,
  GenerateNutritionGoalSuggestionUseCase,
} from '../../application/use-cases/generate-nutrition-goal-suggestion.use-case';
import {
  NutritionGoalCalculationResponseDto,
  NutritionGoalSuggestionResponseDto,
  NutritionGoalValuesResponseDto,
} from './dto/nutrition-goal-suggestion-response.dto';
import { rethrowNutritionGoalHttpError } from './nutrition-goal-http.mapper';

@ApiTags('nutrition-goals')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token.' })
@Controller('adult-profiles/:profileId/nutrition-goal-suggestions')
@UseGuards(SupabaseAuthGuard)
export class NutritionGoalSuggestionsController {
  constructor(
    @Inject(GENERATE_NUTRITION_GOAL_SUGGESTION_USE_CASE)
    private readonly generateSuggestion: GenerateNutritionGoalSuggestionUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Calcula y guarda una propuesta nutricional pendiente',
    description:
      'La propuesta es una estimación editable y no constituye una prescripción médica ni se activa automáticamente.',
  })
  @ApiParam({ name: 'profileId', format: 'uuid' })
  @ApiCreatedResponse({ type: NutritionGoalSuggestionResponseDto })
  @ApiBadRequestResponse({
    description: 'El perfil está incompleto o no corresponde a un adulto válido.',
  })
  @ApiForbiddenResponse({ description: 'El usuario no pertenece al hogar del perfil.' })
  @ApiNotFoundResponse({ description: 'El perfil no existe.' })
  async create(
    @Param('profileId') profileId: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<NutritionGoalSuggestionResponseDto> {
    try {
      const result = await this.generateSuggestion.execute({
        actorId: user.id,
        adultProfileId: profileId,
      });

      return {
        id: result.suggestion.id,
        calculation: toCalculationResponse(result),
        suggestion: toValuesResponse(result),
        status: result.suggestion.status,
      };
    } catch (error) {
      rethrowNutritionGoalHttpError(error);
    }
  }
}

function toCalculationResponse(
  result: Awaited<ReturnType<GenerateNutritionGoalSuggestionUseCase['execute']>>,
): NutritionGoalCalculationResponseDto {
  return {
    bmr: result.suggestion.bmr.toNumber(),
    activityFactor: result.activityFactor.toNumber(),
    tdee: result.suggestion.tdee.toNumber(),
  };
}

function toValuesResponse(
  result: Awaited<ReturnType<GenerateNutritionGoalSuggestionUseCase['execute']>>,
): NutritionGoalValuesResponseDto {
  return {
    dailyCalories: result.suggestion.values.calories.toNumber(),
    proteinGrams: result.suggestion.values.proteinGrams.toNumber(),
    carbohydrateGrams: result.suggestion.values.carbohydrateGrams.toNumber(),
    fatGrams: result.suggestion.values.fatGrams.toNumber(),
    fiberGrams: result.suggestion.values.fiberGrams.toNumber(),
  };
}
