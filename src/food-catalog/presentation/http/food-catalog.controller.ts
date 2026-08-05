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
  CREATE_CUSTOM_FOOD_USE_CASE,
  CreateCustomFoodUseCase,
  DELETE_CUSTOM_FOOD_USE_CASE,
  DeleteCustomFoodUseCase,
  UPDATE_CUSTOM_FOOD_USE_CASE,
  UpdateCustomFoodUseCase,
} from '../../application/use-cases/custom-food-use-cases';
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
import {
  CreateCustomFoodRequestDto,
  UpdateCustomFoodRequestDto,
} from './dto/custom-food-request.dto';
import { SearchFoodsQueryDto } from './dto/search-foods-query.dto';
import { rethrowFoodCatalogHttpError } from './food-catalog-http-error.mapper';

@ApiTags('food-catalog')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token.' })
@UseGuards(JwtAuthGuard)
@Controller()
export class FoodCatalogController {
  constructor(
    @Inject(SEARCH_FOODS_USE_CASE) private readonly searchFoods: SearchFoodsUseCase,
    @Inject(GET_FOOD_DETAIL_USE_CASE) private readonly getFood: GetFoodDetailUseCase,
    @Inject(LIST_FOOD_CATEGORIES_USE_CASE)
    private readonly listCategories: ListFoodCategoriesUseCase,
    @Inject(LIST_NUTRIENTS_USE_CASE) private readonly listNutrients: ListNutrientsUseCase,
    @Inject(CREATE_CUSTOM_FOOD_USE_CASE)
    private readonly createCustomFood: CreateCustomFoodUseCase,
    @Inject(UPDATE_CUSTOM_FOOD_USE_CASE)
    private readonly updateCustomFood: UpdateCustomFoodUseCase,
    @Inject(DELETE_CUSTOM_FOOD_USE_CASE)
    private readonly deleteCustomFood: DeleteCustomFoodUseCase,
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
      rethrowFoodCatalogHttpError(error);
    }
  }

  @Post('households/:householdId/foods')
  @ApiOperation({ summary: 'Crea un alimento personalizado para un hogar' })
  @ApiParam({ name: 'householdId', format: 'uuid' })
  @ApiCreatedResponse({ type: FoodDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Los datos nutricionales son inválidos.' })
  @ApiForbiddenResponse({ description: 'El usuario no es integrante activo del hogar.' })
  async create(
    @Param('householdId') householdId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: CreateCustomFoodRequestDto,
  ): Promise<FoodDetailResponseDto> {
    try {
      return await this.createCustomFood.execute({
        actorId: user.id,
        householdId,
        ...body,
      });
    } catch (error) {
      rethrowFoodCatalogHttpError(error);
    }
  }

  @Patch('foods/:foodId')
  @ApiOperation({ summary: 'Edita un alimento personalizado o comercial del hogar' })
  @ApiParam({ name: 'foodId', format: 'uuid' })
  @ApiOkResponse({ type: FoodDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Los datos nutricionales son inválidos.' })
  @ApiForbiddenResponse({
    description: 'El alimento es global o pertenece a otro hogar.',
  })
  @ApiNotFoundResponse({ description: 'El alimento no existe o fue eliminado.' })
  async update(
    @Param('foodId') foodId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: UpdateCustomFoodRequestDto,
  ): Promise<FoodDetailResponseDto> {
    try {
      return await this.updateCustomFood.execute({
        actorId: user.id,
        foodId,
        ...body,
      });
    } catch (error) {
      rethrowFoodCatalogHttpError(error);
    }
  }

  @Delete('foods/:foodId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina lógicamente un alimento personalizado o comercial' })
  @ApiParam({ name: 'foodId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'El alimento fue eliminado lógicamente.' })
  @ApiForbiddenResponse({
    description: 'El alimento es global o pertenece a otro hogar.',
  })
  @ApiNotFoundResponse({ description: 'El alimento no existe o fue eliminado.' })
  async remove(
    @Param('foodId') foodId: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<void> {
    try {
      await this.deleteCustomFood.execute(user.id, foodId);
    } catch (error) {
      rethrowFoodCatalogHttpError(error);
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
