import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
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
  REGISTER_MEAL_USE_CASE,
  RegisterMealUseCase,
} from '../../application/use-cases/register-meal.use-case';
import { GET_MEAL_USE_CASE, GetMealUseCase } from '../../application/use-cases/get-meal.use-case';
import {
  LIST_MEALS_USE_CASE,
  ListMealsUseCase,
} from '../../application/use-cases/list-meals.use-case';
import { CreateMealRequestDto } from './dto/create-meal-request.dto';
import { ListMealsQueryDto } from './dto/list-meals-query.dto';
import { MealListResponseDto } from './dto/meal-list-response.dto';
import { MealResponseDto } from './dto/meal-response.dto';
import { rethrowMealHttpError, toMealResponse } from './meal-http.mapper';

@ApiTags('meals')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token.' })
@Controller()
@UseGuards(SupabaseAuthGuard)
export class MealsController {
  constructor(
    @Inject(REGISTER_MEAL_USE_CASE)
    private readonly registerMeal: RegisterMealUseCase,
    @Inject(GET_MEAL_USE_CASE)
    private readonly getMeal: GetMealUseCase,
    @Inject(LIST_MEALS_USE_CASE)
    private readonly listMeals: ListMealsUseCase,
  ) {}

  @Post('households/:householdId/meals')
  @ApiOperation({ summary: 'Registra una comida manual con snapshots nutricionales' })
  @ApiParam({ name: 'householdId', format: 'uuid' })
  @ApiCreatedResponse({ type: MealResponseDto })
  @ApiBadRequestResponse({ description: 'La comida o sus cantidades son inválidas.' })
  @ApiForbiddenResponse({ description: 'El usuario no pertenece al hogar.' })
  @ApiNotFoundResponse({ description: 'El perfil o alimento no existe o no es visible.' })
  async create(
    @Param('householdId') householdId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: CreateMealRequestDto,
  ): Promise<MealResponseDto> {
    try {
      const meal = await this.registerMeal.execute({
        actorId: user.id,
        householdId,
        adultProfileId: body.adultProfileId,
        mealType: body.mealType,
        consumedAt: new Date(body.consumedAt),
        notes: body.notes,
        items: body.items.map((item) => ({
          foodId: item.foodId,
          servingId: item.servingId,
          quantity: item.quantity,
          unit: item.unit,
          measurementMethod: item.measurementMethod,
        })),
      });

      return toMealResponse(meal);
    } catch (error) {
      rethrowMealHttpError(error);
    }
  }

  @Get('households/:householdId/meals')
  @ApiOperation({ summary: 'Consulta las comidas del hogar' })
  @ApiParam({ name: 'householdId', format: 'uuid' })
  @ApiCreatedResponse({ type: MealListResponseDto })
  @ApiForbiddenResponse({ description: 'El usuario no pertenece al hogar o no es administrador.' })
  @ApiBadRequestResponse({ description: 'Los filtros de consulta son inválidos.' })
  async list(
    @Param('householdId') householdId: string,
    @CurrentUser() user: CurrentUserModel,
    @Query() query: ListMealsQueryDto,
  ): Promise<MealListResponseDto> {
    try {
      const result = await this.listMeals.execute({
        actorId: user.id,
        householdId,
        adultProfileId: query.adultProfileId,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        mealType: query.mealType,
        page: query.page,
        limit: query.limit,
        includeCancelled: query.includeCancelled,
      });

      return {
        items: result.items.map(toMealResponse),
        page: result.page,
        limit: result.limit,
        total: result.total,
      };
    } catch (error) {
      rethrowMealHttpError(error);
    }
  }

  @Get('meals/:mealId')
  @ApiOperation({ summary: 'Obtiene el detalle de una comida' })
  @ApiParam({ name: 'mealId', format: 'uuid' })
  @ApiCreatedResponse({ type: MealResponseDto })
  @ApiForbiddenResponse({ description: 'El usuario no puede acceder a la comida.' })
  @ApiNotFoundResponse({ description: 'La comida no existe.' })
  async get(
    @Param('mealId') mealId: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<MealResponseDto> {
    try {
      return toMealResponse(await this.getMeal.execute(user.id, mealId));
    } catch (error) {
      rethrowMealHttpError(error);
    }
  }
}
