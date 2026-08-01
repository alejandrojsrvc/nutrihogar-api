import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../../identity/presentation/http/supabase-auth.guard';
import { CurrentUser } from '../../../identity/presentation/http/current-user.decorator';
import type { CurrentUser as CurrentUserModel } from '../../../identity/application/models/current-user';
import {
  CancelPurchaseUseCase,
  ConfirmPurchaseUseCase,
  CreatePurchaseFromShoppingListUseCase,
  CreatePurchaseUseCase,
  GetPurchaseQuery,
  ListPurchasesQuery,
  UpdatePurchaseUseCase,
} from '../../application/use-cases/purchase.use-cases';
import {
  ConfirmPurchaseRequestDto,
  ConvertShoppingListRequestDto,
  CreatePurchaseRequestDto,
  ListPurchasesQueryDto,
  UpdatePurchaseRequestDto,
} from './dto/purchase.dto';
import { rethrowPurchaseHttpError, toPurchaseResponse } from './purchase-http.mapper';
@ApiTags('purchases')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller()
export class PurchaseController {
  constructor(
    @Inject('CREATE_PURCHASE_USE_CASE') private readonly create: CreatePurchaseUseCase,
    @Inject('UPDATE_PURCHASE_USE_CASE') private readonly update: UpdatePurchaseUseCase,
    @Inject('GET_PURCHASE_QUERY') private readonly get: GetPurchaseQuery,
    @Inject('LIST_PURCHASES_QUERY') private readonly list: ListPurchasesQuery,
    @Inject('CONFIRM_PURCHASE_USE_CASE') private readonly confirm: ConfirmPurchaseUseCase,
    @Inject('CANCEL_PURCHASE_USE_CASE') private readonly cancel: CancelPurchaseUseCase,
    @Inject('CREATE_PURCHASE_FROM_SHOPPING_LIST_USE_CASE')
    private readonly convert: CreatePurchaseFromShoppingListUseCase,
  ) {}
  @Post('households/:householdId/purchases') async createPurchase(
    @Param('householdId', ParseUUIDPipe) householdId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: CreatePurchaseRequestDto,
  ) {
    try {
      return toPurchaseResponse(
        await this.create.execute({
          ...body,
          actorId: user.id,
          householdId,
          purchaseDate: new Date(body.purchaseDate),
        }),
      );
    } catch (e) {
      rethrowPurchaseHttpError(e);
    }
  }
  @Get('households/:householdId/purchases') async listPurchases(
    @Param('householdId', ParseUUIDPipe) householdId: string,
    @CurrentUser() user: CurrentUserModel,
    @Query() query: ListPurchasesQueryDto,
  ) {
    try {
      const result = await this.list.execute(user.id, householdId, query);
      return { ...result, items: result.items.map(toPurchaseResponse) };
    } catch (e) {
      rethrowPurchaseHttpError(e);
    }
  }
  @Get('purchases/:purchaseId') async getPurchase(
    @Param('purchaseId', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserModel,
  ) {
    try {
      return toPurchaseResponse(await this.get.execute(user.id, id));
    } catch (e) {
      rethrowPurchaseHttpError(e);
    }
  }
  @Patch('purchases/:purchaseId') async updatePurchase(
    @Param('purchaseId', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: UpdatePurchaseRequestDto,
  ) {
    try {
      return toPurchaseResponse(
        await this.update.execute({
          ...body,
          purchaseId: id,
          actorId: user.id,
          purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
        }),
      );
    } catch (e) {
      rethrowPurchaseHttpError(e);
    }
  }
  @Post('purchases/:purchaseId/confirm') async confirmPurchase(
    @Param('purchaseId', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: ConfirmPurchaseRequestDto,
  ) {
    try {
      return toPurchaseResponse(
        await this.confirm.execute({
          actorId: user.id,
          purchaseId: id,
          selections: body.selections,
        }),
      );
    } catch (e) {
      rethrowPurchaseHttpError(e);
    }
  }
  @Delete('purchases/:purchaseId') @HttpCode(HttpStatus.NO_CONTENT) async cancelPurchase(
    @Param('purchaseId', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserModel,
  ) {
    try {
      await this.cancel.execute(user.id, id);
    } catch (e) {
      rethrowPurchaseHttpError(e);
    }
  }
  @Post('households/:householdId/shopping-list/convert-to-purchase') async convertShopping(
    @Param('householdId', ParseUUIDPipe) householdId: string,
    @CurrentUser() user: CurrentUserModel,
    @Headers('idempotency-key') headerKey: string | undefined,
    @Body() body: ConvertShoppingListRequestDto,
  ) {
    try {
      return toPurchaseResponse(
        await this.convert.execute({
          ...body,
          actorId: user.id,
          householdId,
          purchaseDate: new Date(body.purchaseDate),
          idempotencyKey: body.idempotencyKey || headerKey || '',
        }),
      );
    } catch (e) {
      rethrowPurchaseHttpError(e);
    }
  }
}
