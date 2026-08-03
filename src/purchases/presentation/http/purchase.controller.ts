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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../../../identity/presentation/http/jwt-auth.guard';
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
import { CreatePurchaseDraftFromReceiptUseCase } from '../../application/use-cases/create-purchase-draft-from-receipt.use-case';
import {
  ConfirmPurchaseRequestDto,
  ConvertShoppingListRequestDto,
  CreatePurchaseFromReceiptRequestDto,
  CreatePurchaseRequestDto,
  ListPurchasesQueryDto,
  UpdatePurchaseRequestDto,
} from './dto/purchase.dto';
import { rethrowPurchaseHttpError, toPurchaseResponse } from './purchase-http.mapper';
import { ReceiptOcrFileError } from '../../application/errors/receipt-ocr.errors';
@ApiTags('purchases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
    @Inject('CREATE_PURCHASE_DRAFT_FROM_RECEIPT_USE_CASE')
    private readonly ocrDraft: CreatePurchaseDraftFromReceiptUseCase,
  ) {}
  @Post('households/:householdId/purchases/ocr-draft')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Clave para evitar crear dos drafts para el mismo documento.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        currency: { type: 'string', example: 'EUR' },
        locale: { type: 'string', example: 'es-ES' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Compra creada como draft a partir del ticket procesado por Veryfi.',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        householdId: { type: 'string', format: 'uuid' },
        registeredById: { type: 'string', format: 'uuid' },
        status: { type: 'string', enum: ['DRAFT'] },
        source: { type: 'string', enum: ['OCR'] },
        storeName: { type: 'string', example: 'Supermercado Ejemplo' },
        purchaseDate: { type: 'string', format: 'date-time' },
        currency: { type: 'string', example: 'EUR' },
        total: { type: 'string', example: '42.75' },
        reviewRequired: { type: 'boolean', example: true },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              foodId: { type: 'string', format: 'uuid', nullable: true },
              inventoryItemId: { type: 'string', format: 'uuid', nullable: true },
              sourceShoppingItemId: { type: 'string', format: 'uuid', nullable: true },
              nameSnapshot: { type: 'string', example: 'Leche entera' },
              unit: { type: 'string', example: 'L' },
              quantity: { type: 'string', example: '2' },
            },
          },
        },
        ocr: {
          type: 'object',
          properties: {
            provider: { type: 'string', enum: ['VERYFI'] },
            confidence: { type: 'number', nullable: true, example: 0.91 },
            documentId: { type: 'string', nullable: true },
            warnings: { type: 'array', items: { type: 'string' } },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  quantity: { type: 'string' },
                  unit: { type: 'string' },
                  confidence: { type: 'number', nullable: true },
                  needsReview: { type: 'boolean' },
                },
              },
            },
          },
        },
        receipt: {
          type: 'object',
          properties: {
            fileName: { type: 'string' },
            contentType: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Archivo inválido o faltante.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Token ausente o inválido.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'El usuario no tiene acceso al hogar.',
  })
  @ApiResponse({ status: HttpStatus.PAYLOAD_TOO_LARGE, description: 'El archivo supera 20 MB.' })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'El ticket no contiene ítems utilizables.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_GATEWAY,
    description: 'Veryfi no pudo procesar el documento.',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'El almacenamiento de recibos no está disponible.',
  })
  async createPurchaseDraftFromReceipt(
    @Param('householdId', ParseUUIDPipe) householdId: string,
    @CurrentUser() user: CurrentUserModel,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: CreatePurchaseFromReceiptRequestDto,
    @UploadedFile() file: UploadedReceiptFile | undefined,
  ) {
    try {
      if (!file) throw new ReceiptOcrFileError('Receipt file is required.');
      const result = await this.ocrDraft.execute({
        actorId: user.id,
        householdId,
        content: file.buffer,
        fileName: file.originalname,
        contentType: file.mimetype,
        idempotencyKey,
        currency: body.currency,
      });
      return {
        ...toPurchaseResponse(result.purchase),
        reviewRequired: true,
        ocr: {
          provider: 'VERYFI',
          confidence: result.ocr.confidence,
          documentId: result.ocr.providerDocumentId,
          warnings: result.ocr.warnings,
          items: result.ocr.items,
        },
        receipt: {
          fileName: file.originalname,
          contentType: file.mimetype,
        },
      };
    } catch (e) {
      rethrowPurchaseHttpError(e);
    }
  }
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

interface UploadedReceiptFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}
