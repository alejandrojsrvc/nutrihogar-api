import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Get,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { CurrentUser as CurrentUserModel } from '../../../identity/application/models/current-user';
import { CurrentUser } from '../../../identity/presentation/http/current-user.decorator';
import { JwtAuthGuard } from '../../../identity/presentation/http/jwt-auth.guard';
import {
  GENERATE_NUTRITION_GOAL_SUGGESTION_USE_CASE,
  GenerateNutritionGoalSuggestionUseCase,
} from '../../application/use-cases/generate-nutrition-goal-suggestion.use-case';
import {
  CONFIRM_NUTRITION_GOAL_SUGGESTION_USE_CASE,
  ConfirmNutritionGoalSuggestionUseCase,
} from '../../application/use-cases/confirm-nutrition-goal-suggestion.use-case';
import {
  REJECT_NUTRITION_GOAL_SUGGESTION_USE_CASE,
  RejectNutritionGoalSuggestionUseCase,
} from '../../application/use-cases/reject-nutrition-goal-suggestion.use-case';
import {
  GET_CURRENT_NUTRITION_GOAL_USE_CASE,
  GetCurrentNutritionGoalUseCase,
} from '../../application/use-cases/get-current-nutrition-goal.use-case';
import {
  LIST_NUTRITION_GOALS_USE_CASE,
  ListNutritionGoalsUseCase,
} from '../../application/use-cases/list-nutrition-goals.use-case';
import { NutritionGoalResponseDto } from './dto/nutrition-goal-response.dto';
import { ConfirmNutritionGoalSuggestionRequestDto } from './dto/confirm-nutrition-goal-suggestion-request.dto';
import {
  NutritionGoalCalculationResponseDto,
  NutritionGoalSuggestionResponseDto,
  NutritionGoalValuesResponseDto,
} from './dto/nutrition-goal-suggestion-response.dto';
import { rethrowNutritionGoalHttpError } from './nutrition-goal-http.mapper';

@ApiTags('nutrition-goals')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token.' })
@Controller()
@UseGuards(JwtAuthGuard)
export class NutritionGoalSuggestionsController {
  constructor(
    @Inject(GENERATE_NUTRITION_GOAL_SUGGESTION_USE_CASE)
    private readonly generateSuggestion: GenerateNutritionGoalSuggestionUseCase,
    @Inject(CONFIRM_NUTRITION_GOAL_SUGGESTION_USE_CASE)
    private readonly confirmSuggestion: ConfirmNutritionGoalSuggestionUseCase,
    @Inject(REJECT_NUTRITION_GOAL_SUGGESTION_USE_CASE)
    private readonly rejectSuggestion: RejectNutritionGoalSuggestionUseCase,
    @Inject(GET_CURRENT_NUTRITION_GOAL_USE_CASE)
    private readonly getCurrentGoal: GetCurrentNutritionGoalUseCase,
    @Inject(LIST_NUTRITION_GOALS_USE_CASE)
    private readonly listGoals: ListNutritionGoalsUseCase,
  ) {}

  @Post('adult-profiles/:profileId/nutrition-goal-suggestions')
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

  @Post('nutrition-goal-suggestions/:suggestionId/confirm')
  @ApiOperation({ summary: 'Confirma una propuesta nutricional' })
  @ApiParam({ name: 'suggestionId', format: 'uuid' })
  @ApiCreatedResponse({ type: NutritionGoalResponseDto })
  @ApiBadRequestResponse({ description: 'Los valores nutricionales son inválidos.' })
  @ApiConflictResponse({ description: 'La propuesta ya fue procesada o expiró.' })
  @ApiForbiddenResponse({ description: 'El usuario no puede acceder al perfil.' })
  @ApiNotFoundResponse({ description: 'La propuesta no existe.' })
  async confirm(
    @Param('suggestionId') suggestionId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: ConfirmNutritionGoalSuggestionRequestDto,
  ): Promise<NutritionGoalResponseDto> {
    try {
      const goal = await this.confirmSuggestion.execute({
        actorId: user.id,
        suggestionId,
        dailyCalories: body.dailyCalories,
        proteinGrams: body.proteinGrams,
        carbohydrateGrams: body.carbohydrateGrams,
        fatGrams: body.fatGrams,
        fiberGrams: body.fiberGrams,
      });

      return toGoalResponse(goal);
    } catch (error) {
      rethrowNutritionGoalHttpError(error);
    }
  }

  @Post('nutrition-goal-suggestions/:suggestionId/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Rechaza una propuesta nutricional' })
  @ApiParam({ name: 'suggestionId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'La propuesta fue rechazada.' })
  @ApiConflictResponse({ description: 'La propuesta ya fue procesada o expiró.' })
  @ApiForbiddenResponse({ description: 'El usuario no puede acceder al perfil.' })
  @ApiNotFoundResponse({ description: 'La propuesta no existe.' })
  async reject(
    @Param('suggestionId') suggestionId: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<void> {
    try {
      await this.rejectSuggestion.execute({ actorId: user.id, suggestionId });
    } catch (error) {
      rethrowNutritionGoalHttpError(error);
    }
  }

  @Get('adult-profiles/:profileId/nutrition-goals/current')
  @ApiOperation({ summary: 'Obtiene la meta nutricional actual' })
  @ApiParam({ name: 'profileId', format: 'uuid' })
  @ApiOkResponse({ type: NutritionGoalResponseDto, nullable: true })
  @ApiForbiddenResponse({ description: 'El usuario no puede acceder al perfil.' })
  async current(
    @Param('profileId') profileId: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<NutritionGoalResponseDto | null> {
    try {
      const goal = await this.getCurrentGoal.execute({
        actorId: user.id,
        adultProfileId: profileId,
      });

      return goal ? toGoalResponse(goal) : null;
    } catch (error) {
      rethrowNutritionGoalHttpError(error);
    }
  }

  @Get('adult-profiles/:profileId/nutrition-goals')
  @ApiOperation({ summary: 'Obtiene el historial de metas nutricionales' })
  @ApiParam({ name: 'profileId', format: 'uuid' })
  @ApiOkResponse({ type: NutritionGoalResponseDto, isArray: true })
  @ApiForbiddenResponse({ description: 'El usuario no puede acceder al perfil.' })
  async history(
    @Param('profileId') profileId: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<NutritionGoalResponseDto[]> {
    try {
      const goals = await this.listGoals.execute({
        actorId: user.id,
        adultProfileId: profileId,
      });

      return goals.map(toGoalResponse);
    } catch (error) {
      rethrowNutritionGoalHttpError(error);
    }
  }
}

function toGoalResponse(goal: Awaited<ReturnType<GetCurrentNutritionGoalUseCase['execute']>>) {
  if (!goal) throw new Error('A nutrition goal is required.');

  return {
    id: goal.id,
    adultProfileId: goal.adultProfileId,
    validFrom: goal.validFrom,
    validUntil: goal.validUntil,
    dailyCalories: goal.values.calories.toNumber(),
    proteinGrams: goal.values.proteinGrams.toNumber(),
    carbohydrateGrams: goal.values.carbohydrateGrams.toNumber(),
    fatGrams: goal.values.fatGrams.toNumber(),
    fiberGrams: goal.values.fiberGrams.toNumber(),
    goalType: goal.goalType,
    calculationMethod: goal.calculationMethod,
    confirmedById: goal.confirmedById,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
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
