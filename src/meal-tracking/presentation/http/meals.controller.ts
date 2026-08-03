import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
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
  REGISTER_MEAL_USE_CASE,
  RegisterMealUseCase,
} from '../../application/use-cases/register-meal.use-case';
import {
  DUPLICATE_MEAL_USE_CASE,
  DuplicateMealUseCase,
} from '../../application/use-cases/duplicate-meal.use-case';
import { GET_MEAL_USE_CASE, GetMealUseCase } from '../../application/use-cases/get-meal.use-case';
import {
  LIST_MEALS_USE_CASE,
  ListMealsUseCase,
} from '../../application/use-cases/list-meals.use-case';
import {
  CANCEL_MEAL_USE_CASE,
  CancelMealUseCase,
} from '../../application/use-cases/cancel-meal.use-case';
import {
  UPDATE_MEAL_USE_CASE,
  UpdateMealUseCase,
} from '../../application/use-cases/update-meal.use-case';
import { CreateMealRequestDto } from './dto/create-meal-request.dto';
import { ListMealsQueryDto } from './dto/list-meals-query.dto';
import { MealListResponseDto } from './dto/meal-list-response.dto';
import { MealResponseDto } from './dto/meal-response.dto';
import { DuplicateMealRequestDto } from './dto/duplicate-meal-request.dto';
import { UpdateMealRequestDto } from './dto/update-meal-request.dto';
import { rethrowMealHttpError, toMealResponse } from './meal-http.mapper';

@ApiTags('meals')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token.' })
@Controller()
@UseGuards(JwtAuthGuard)
export class MealsController {
  constructor(
    @Inject(REGISTER_MEAL_USE_CASE)
    private readonly registerMeal: RegisterMealUseCase,
    @Inject(DUPLICATE_MEAL_USE_CASE)
    private readonly duplicateMeal: DuplicateMealUseCase,
    @Inject(GET_MEAL_USE_CASE)
    private readonly getMeal: GetMealUseCase,
    @Inject(LIST_MEALS_USE_CASE)
    private readonly listMeals: ListMealsUseCase,
    @Inject(UPDATE_MEAL_USE_CASE)
    private readonly updateMeal: UpdateMealUseCase,
    @Inject(CANCEL_MEAL_USE_CASE)
    private readonly cancelMeal: CancelMealUseCase,
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

  @Post('meals/:mealId/duplicate')
  @ApiOperation({ summary: 'Duplica una comida recalculando sus snapshots' })
  @ApiParam({ name: 'mealId', format: 'uuid' })
  @ApiCreatedResponse({ type: MealResponseDto })
  @ApiBadRequestResponse({ description: 'La fecha o los datos de duplicación son inválidos.' })
  @ApiConflictResponse({ description: 'No se puede duplicar una comida cancelada.' })
  @ApiForbiddenResponse({ description: 'El usuario no puede acceder a la comida.' })
  @ApiNotFoundResponse({ description: 'La comida, perfil o alimento no existe.' })
  async duplicate(
    @Param('mealId') mealId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: DuplicateMealRequestDto,
  ): Promise<MealResponseDto> {
    try {
      const meal = await this.duplicateMeal.execute({
        actorId: user.id,
        mealId,
        adultProfileId: body.adultProfileId,
        mealType: body.mealType,
        consumedAt: new Date(body.consumedAt),
      });

      return toMealResponse(meal);
    } catch (error) {
      rethrowMealHttpError(error);
    }
  }

  @Get('households/:householdId/meals')
  @ApiOperation({ summary: 'Consulta las comidas del hogar' })
  @ApiParam({ name: 'householdId', format: 'uuid' })
  @ApiOkResponse({ type: MealListResponseDto })
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
  @ApiOkResponse({ type: MealResponseDto })
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

  @Patch('meals/:mealId')
  @ApiOperation({ summary: 'Edita una comida y recalcula sus snapshots' })
  @ApiParam({ name: 'mealId', format: 'uuid' })
  @ApiOkResponse({ type: MealResponseDto })
  @ApiBadRequestResponse({ description: 'Los datos de la comida son inválidos.' })
  @ApiConflictResponse({ description: 'La comida está cancelada.' })
  @ApiForbiddenResponse({ description: 'El usuario no puede editar la comida.' })
  @ApiNotFoundResponse({ description: 'La comida o sus alimentos no existen.' })
  async update(
    @Param('mealId') mealId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: UpdateMealRequestDto,
  ): Promise<MealResponseDto> {
    try {
      const meal = await this.updateMeal.execute({
        actorId: user.id,
        mealId,
        mealType: body.mealType,
        consumedAt: body.consumedAt ? new Date(body.consumedAt) : undefined,
        notes: body.notes,
        items: body.items?.map((item) => ({
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

  @Delete('meals/:mealId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancela lógicamente una comida' })
  @ApiParam({ name: 'mealId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'La comida fue cancelada.' })
  @ApiConflictResponse({ description: 'La comida ya estaba cancelada.' })
  @ApiForbiddenResponse({ description: 'El usuario no puede cancelar la comida.' })
  @ApiNotFoundResponse({ description: 'La comida no existe.' })
  async delete(
    @Param('mealId') mealId: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<void> {
    try {
      await this.cancelMeal.execute(user.id, mealId);
    } catch (error) {
      rethrowMealHttpError(error);
    }
  }
}
