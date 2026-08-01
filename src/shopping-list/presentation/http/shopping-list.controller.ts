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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../../identity/presentation/http/supabase-auth.guard';
import { CurrentUser } from '../../../identity/presentation/http/current-user.decorator';
import type { CurrentUser as CurrentUserModel } from '../../../identity/application/models/current-user';
import {
  AddShoppingListItemUseCase,
  GenerateInventoryShoppingListItemsUseCase,
  GetShoppingListQuery,
  MarkShoppingListItemPurchasedUseCase,
  RemoveShoppingListItemUseCase,
  UpdateShoppingListItemUseCase,
  AddMissingIngredientsToShoppingListUseCase,
} from '../../application/use-cases/shopping-list.use-cases';
import {
  AddShoppingListItemRequestDto,
  AddMissingIngredientsRequestDto,
  ShoppingListResponseDto,
  UpdateShoppingListItemRequestDto,
} from './dto/shopping-list.dto';
import {
  rethrowShoppingListHttpError,
  toItemResponse,
  toListResponse,
} from './shopping-list-http.mapper';

@ApiTags('shopping-list')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller()
export class ShoppingListController {
  constructor(
    @Inject('GET_SHOPPING_LIST_QUERY') private readonly getList: GetShoppingListQuery,
    @Inject('ADD_SHOPPING_LIST_ITEM_USE_CASE') private readonly add: AddShoppingListItemUseCase,
    @Inject('UPDATE_SHOPPING_LIST_ITEM_USE_CASE')
    private readonly update: UpdateShoppingListItemUseCase,
    @Inject('MARK_SHOPPING_LIST_ITEM_PURCHASED_USE_CASE')
    private readonly purchased: MarkShoppingListItemPurchasedUseCase,
    @Inject('REMOVE_SHOPPING_LIST_ITEM_USE_CASE')
    private readonly remove: RemoveShoppingListItemUseCase,
    @Inject('GENERATE_INVENTORY_SHOPPING_LIST_ITEMS_USE_CASE')
    private readonly generate: GenerateInventoryShoppingListItemsUseCase,
    @Inject('ADD_MISSING_INGREDIENTS_TO_SHOPPING_LIST_USE_CASE')
    private readonly addMissing: AddMissingIngredientsToShoppingListUseCase,
  ) {}
  @Get('households/:householdId/shopping-list')
  @ApiOperation({ summary: 'Consulta la lista compartida del hogar' })
  @ApiOkResponse({ type: ShoppingListResponseDto })
  async get(
    @Param('householdId', new ParseUUIDPipe()) householdId: string,
    @CurrentUser() user: CurrentUserModel,
  ) {
    try {
      return toListResponse(await this.getList.execute(user.id, householdId));
    } catch (e) {
      rethrowShoppingListHttpError(e);
    }
  }
  @Post('households/:householdId/shopping-list/items')
  @ApiCreatedResponse({ type: Object })
  async addItem(
    @Param('householdId', new ParseUUIDPipe()) householdId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: AddShoppingListItemRequestDto,
  ) {
    try {
      return toItemResponse(await this.add.execute({ ...body, actorId: user.id, householdId }));
    } catch (e) {
      rethrowShoppingListHttpError(e);
    }
  }
  @Patch('shopping-list/items/:itemId') async updateItem(
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: UpdateShoppingListItemRequestDto,
  ) {
    try {
      return toItemResponse(await this.update.execute({ ...body, itemId, actorId: user.id }));
    } catch (e) {
      rethrowShoppingListHttpError(e);
    }
  }
  @Post('shopping-list/items/:itemId/mark-purchased') async markPurchased(
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @CurrentUser() user: CurrentUserModel,
  ) {
    try {
      return toItemResponse(await this.purchased.execute(user.id, itemId));
    } catch (e) {
      rethrowShoppingListHttpError(e);
    }
  }
  @Delete('shopping-list/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async delete(
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @CurrentUser() user: CurrentUserModel,
  ) {
    try {
      await this.remove.execute(user.id, itemId);
    } catch (e) {
      rethrowShoppingListHttpError(e);
    }
  }
  @Post('households/:householdId/shopping-list/generate-from-inventory')
  @ApiCreatedResponse({ type: ShoppingListResponseDto })
  async generateItems(
    @Param('householdId', new ParseUUIDPipe()) householdId: string,
    @CurrentUser() user: CurrentUserModel,
  ) {
    try {
      return toListResponse(await this.generate.execute(user.id, householdId));
    } catch (e) {
      rethrowShoppingListHttpError(e);
    }
  }

  @Post('weekly-plans/:weeklyPlanId/shopping-list/items')
  async addMissingItems(
    @Param('weeklyPlanId', new ParseUUIDPipe()) weeklyPlanId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: AddMissingIngredientsRequestDto,
  ) {
    try {
      const list = await this.addMissing.execute({
        actorId: user.id,
        planId: weeklyPlanId,
        items: body.items,
      });
      return toListResponse(list);
    } catch (e) {
      rethrowShoppingListHttpError(e);
    }
  }

  @Get('weekly-plans/:weeklyPlanId/shopping-list/items')
  async getMealPlanItems(
    @Param('weeklyPlanId', new ParseUUIDPipe()) weeklyPlanId: string,
    @CurrentUser() user: CurrentUserModel,
  ) {
    try {
      return (await this.addMissing.get(user.id, weeklyPlanId)).map(toItemResponse);
    } catch (e) {
      rethrowShoppingListHttpError(e);
    }
  }
}
