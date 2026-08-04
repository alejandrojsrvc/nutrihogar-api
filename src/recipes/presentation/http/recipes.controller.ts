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
  ARCHIVE_RECIPE_USE_CASE,
  ArchiveRecipeUseCase,
} from '../../application/use-cases/archive-recipe.use-case';
import {
  CALCULATE_RECIPE_NUTRITION_USE_CASE,
  CalculateRecipeNutritionUseCase,
} from '../../application/use-cases/calculate-recipe-nutrition.use-case';
import {
  CREATE_RECIPE_USE_CASE,
  CreateRecipeUseCase,
} from '../../application/use-cases/create-recipe.use-case';
import {
  GET_RECIPE_USE_CASE,
  GetRecipeUseCase,
} from '../../application/use-cases/get-recipe.use-case';
import {
  IMPORT_RECIPE_USE_CASE,
  ImportRecipeUseCase,
} from '../../application/use-cases/import-recipe.use-case';
import {
  LIST_RECIPES_USE_CASE,
  ListRecipesUseCase,
} from '../../application/use-cases/list-recipes.use-case';
import {
  UPDATE_RECIPE_USE_CASE,
  UpdateRecipeUseCase,
} from '../../application/use-cases/update-recipe.use-case';
import {
  CreateRecipeRequestDto,
  ImportRecipeRequestDto,
  UpdateRecipeRequestDto,
} from './dto/recipe-request.dto';
import { RecipeQueryDto } from './dto/recipe-query.dto';
import { RecipeListResponseDto, RecipeResponseDto } from './dto/recipe-response.dto';
import { RecipeNutritionResponseDto } from './dto/recipe-nutrition-response.dto';
import {
  rethrowRecipeHttpError,
  toRecipeListResponse,
  toRecipeNutritionResponse,
  toRecipeResponse,
} from './recipe-http.mapper';

@ApiTags('recipes')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token.' })
@Controller()
@UseGuards(JwtAuthGuard)
export class RecipesController {
  constructor(
    @Inject(CREATE_RECIPE_USE_CASE) private readonly createRecipe: CreateRecipeUseCase,
    @Inject(UPDATE_RECIPE_USE_CASE) private readonly updateRecipe: UpdateRecipeUseCase,
    @Inject(GET_RECIPE_USE_CASE) private readonly getRecipe: GetRecipeUseCase,
    @Inject(LIST_RECIPES_USE_CASE) private readonly listRecipes: ListRecipesUseCase,
    @Inject(ARCHIVE_RECIPE_USE_CASE) private readonly archiveRecipe: ArchiveRecipeUseCase,
    @Inject(IMPORT_RECIPE_USE_CASE) private readonly importRecipe: ImportRecipeUseCase,
    @Inject(CALCULATE_RECIPE_NUTRITION_USE_CASE)
    private readonly calculateRecipeNutrition: CalculateRecipeNutritionUseCase,
  ) {}

  @Post('households/:householdId/recipes')
  @ApiOperation({ summary: 'Crea una receta del hogar' })
  @ApiParam({ name: 'householdId', format: 'uuid' })
  @ApiCreatedResponse({ type: RecipeResponseDto })
  @ApiBadRequestResponse({ description: 'Los datos o ingredientes son inválidos.' })
  @ApiConflictResponse({ description: 'Ya existe una receta con ese nombre.' })
  @ApiForbiddenResponse({ description: 'El usuario no pertenece al hogar.' })
  async create(
    @Param('householdId') householdId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: CreateRecipeRequestDto,
  ): Promise<RecipeResponseDto> {
    try {
      return toRecipeResponse(
        await this.createRecipe.execute({
          actorId: user.id,
          householdId,
          name: body.name,
          description: body.description,
          category: body.category,
          defaultServings: body.defaultServings,
          estimatedPreparationMinutes: body.estimatedPreparationMinutes,
          tags: body.tags,
          ingredients: body.ingredients,
          instructions: body.instructions,
        }),
      );
    } catch (error) {
      rethrowRecipeHttpError(error);
    }
  }

  @Post('households/:householdId/recipes/import')
  @ApiOperation({ summary: 'Importa una receta global al hogar como copia editable' })
  @ApiParam({ name: 'householdId', format: 'uuid' })
  @ApiCreatedResponse({ type: RecipeResponseDto })
  @ApiConflictResponse({ description: 'Ya existe una receta con ese nombre en el hogar.' })
  @ApiForbiddenResponse({ description: 'El usuario no puede importar al hogar.' })
  @ApiNotFoundResponse({ description: 'La receta no existe.' })
  async import(
    @Param('householdId') householdId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: ImportRecipeRequestDto,
  ): Promise<RecipeResponseDto> {
    try {
      return toRecipeResponse(
        await this.importRecipe.execute({
          actorId: user.id,
          householdId,
          recipeId: body.recipeId,
        }),
      );
    } catch (error) {
      rethrowRecipeHttpError(error);
    }
  }

  @Get('households/:householdId/recipes')
  @ApiOperation({ summary: 'Lista las recetas activas del hogar' })
  @ApiParam({ name: 'householdId', format: 'uuid' })
  @ApiOkResponse({ type: RecipeListResponseDto })
  @ApiForbiddenResponse({ description: 'El usuario no pertenece al hogar.' })
  async list(
    @Param('householdId') householdId: string,
    @CurrentUser() user: CurrentUserModel,
    @Query() query: RecipeQueryDto,
  ): Promise<RecipeListResponseDto> {
    try {
      return toRecipeListResponse(await this.listRecipes.execute(user.id, householdId, query));
    } catch (error) {
      rethrowRecipeHttpError(error);
    }
  }

  @Get('recipes/:recipeId')
  @ApiOperation({ summary: 'Obtiene el detalle de una receta' })
  @ApiParam({ name: 'recipeId', format: 'uuid' })
  @ApiOkResponse({ type: RecipeResponseDto })
  @ApiForbiddenResponse({ description: 'El usuario no puede acceder a la receta.' })
  @ApiNotFoundResponse({ description: 'La receta no existe.' })
  async get(
    @Param('recipeId') recipeId: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<RecipeResponseDto> {
    try {
      return toRecipeResponse(await this.getRecipe.execute(user.id, recipeId));
    } catch (error) {
      rethrowRecipeHttpError(error);
    }
  }

  @Get('recipes/:recipeId/nutrition')
  @ApiOperation({ summary: 'Calcula los nutrientes estimados de una receta' })
  @ApiParam({ name: 'recipeId', format: 'uuid' })
  @ApiOkResponse({ type: RecipeNutritionResponseDto })
  @ApiForbiddenResponse({ description: 'El usuario no puede acceder a la receta.' })
  @ApiNotFoundResponse({ description: 'La receta o un alimento no existe.' })
  async nutrition(
    @Param('recipeId') recipeId: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<RecipeNutritionResponseDto> {
    try {
      return toRecipeNutritionResponse(
        await this.calculateRecipeNutrition.execute(user.id, recipeId),
      );
    } catch (error) {
      rethrowRecipeHttpError(error);
    }
  }

  @Patch('recipes/:recipeId')
  @ApiOperation({ summary: 'Edita una receta' })
  @ApiParam({ name: 'recipeId', format: 'uuid' })
  @ApiOkResponse({ type: RecipeResponseDto })
  @ApiBadRequestResponse({ description: 'Los datos o ingredientes son inválidos.' })
  @ApiConflictResponse({ description: 'La receta está archivada o el nombre ya existe.' })
  @ApiForbiddenResponse({ description: 'El usuario no puede editar la receta.' })
  @ApiNotFoundResponse({ description: 'La receta o alimento no existe.' })
  async update(
    @Param('recipeId') recipeId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: UpdateRecipeRequestDto,
  ): Promise<RecipeResponseDto> {
    try {
      return toRecipeResponse(
        await this.updateRecipe.execute({ actorId: user.id, recipeId, ...body }),
      );
    } catch (error) {
      rethrowRecipeHttpError(error);
    }
  }

  @Delete('recipes/:recipeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archiva una receta' })
  @ApiParam({ name: 'recipeId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'La receta fue archivada.' })
  @ApiConflictResponse({ description: 'La receta ya está archivada.' })
  @ApiForbiddenResponse({ description: 'Solo administradores pueden archivar.' })
  @ApiNotFoundResponse({ description: 'La receta no existe.' })
  async archive(
    @Param('recipeId') recipeId: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<void> {
    try {
      await this.archiveRecipe.execute(user.id, recipeId);
    } catch (error) {
      rethrowRecipeHttpError(error);
    }
  }
}
