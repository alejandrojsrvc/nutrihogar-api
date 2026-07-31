import { Body, Controller, Inject, Param, Post, UseGuards } from '@nestjs/common';
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
import { CreateMealRequestDto } from './dto/create-meal-request.dto';
import { MealResponseDto } from './dto/meal-response.dto';
import { rethrowMealHttpError, toMealResponse } from './meal-http.mapper';

@ApiTags('meals')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token.' })
@Controller('households/:householdId/meals')
@UseGuards(SupabaseAuthGuard)
export class MealsController {
  constructor(
    @Inject(REGISTER_MEAL_USE_CASE)
    private readonly registerMeal: RegisterMealUseCase,
  ) {}

  @Post()
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
}
