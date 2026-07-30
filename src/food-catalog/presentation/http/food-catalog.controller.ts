import { Controller, Get, Inject, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { CurrentUser as CurrentUserModel } from '../../../identity/application/models/current-user';
import { CurrentUser } from '../../../identity/presentation/http/current-user.decorator';
import { SupabaseAuthGuard } from '../../../identity/presentation/http/supabase-auth.guard';
import { FoodNotFoundError } from '../../application/errors/food-not-found.error';
import {
  GET_FOOD_DETAIL_USE_CASE,
  GetFoodDetailUseCase,
  LIST_FOOD_CATEGORIES_USE_CASE,
  LIST_NUTRIENTS_USE_CASE,
  ListFoodCategoriesUseCase,
  ListNutrientsUseCase,
  SEARCH_FOODS_USE_CASE,
  SearchFoodsUseCase,
} from '../../application/use-cases/food-catalog-queries';
import {
  CategoryResponseDto,
  FoodDetailResponseDto,
  FoodSearchResponseDto,
  NutrientDefinitionResponseDto,
} from './dto/food-catalog-response.dto';
import { SearchFoodsQueryDto } from './dto/search-foods-query.dto';
import { NotFoundException } from '@nestjs/common';

@ApiTags('food-catalog')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token.' })
@UseGuards(SupabaseAuthGuard)
@Controller()
export class FoodCatalogController {
  constructor(
    @Inject(SEARCH_FOODS_USE_CASE) private readonly searchFoods: SearchFoodsUseCase,
    @Inject(GET_FOOD_DETAIL_USE_CASE) private readonly getFood: GetFoodDetailUseCase,
    @Inject(LIST_FOOD_CATEGORIES_USE_CASE)
    private readonly listCategories: ListFoodCategoriesUseCase,
    @Inject(LIST_NUTRIENTS_USE_CASE) private readonly listNutrients: ListNutrientsUseCase,
  ) {}

  @Get('foods')
  @ApiOperation({ summary: 'Busca alimentos visibles para el usuario' })
  @ApiOkResponse({ type: FoodSearchResponseDto })
  async search(
    @CurrentUser() user: CurrentUserModel,
    @Query() query: SearchFoodsQueryDto,
  ): Promise<FoodSearchResponseDto> {
    const result = await this.searchFoods.execute({
      actorId: user.id,
      query: query.query,
      categoryId: query.categoryId,
      preparationState: query.preparationState,
      foodType: query.foodType,
      page: query.page,
      limit: query.limit,
    });
    return {
      items: result.items,
      pagination: { page: result.page, limit: result.limit, total: result.total },
    };
  }

  @Get('foods/:foodId')
  @ApiOperation({ summary: 'Obtiene el detalle de un alimento visible' })
  @ApiOkResponse({ type: FoodDetailResponseDto })
  @ApiNotFoundResponse({ description: 'El alimento no existe o no es visible.' })
  async detail(
    @CurrentUser() user: CurrentUserModel,
    @Param('foodId') foodId: string,
  ): Promise<FoodDetailResponseDto> {
    try {
      return await this.getFood.execute(user.id, foodId);
    } catch (error) {
      if (error instanceof FoodNotFoundError) throw new NotFoundException(error.message);
      throw error;
    }
  }

  @Get('food-categories')
  @ApiOperation({ summary: 'Lista las categorías activas' })
  @ApiOkResponse({ type: CategoryResponseDto, isArray: true })
  listFoodCategories(): Promise<CategoryResponseDto[]> {
    return this.listCategories.execute();
  }

  @Get('nutrients')
  @ApiOperation({ summary: 'Lista las definiciones dinámicas de nutrientes' })
  @ApiOkResponse({ type: NutrientDefinitionResponseDto, isArray: true })
  listNutrientDefinitions(): Promise<NutrientDefinitionResponseDto[]> {
    return this.listNutrients.execute();
  }
}
