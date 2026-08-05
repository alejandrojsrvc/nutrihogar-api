import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common';
import { CurrentUser } from '../../../identity/presentation/http/current-user.decorator';
import type { CurrentUser as CurrentUserModel } from '../../../identity/application/models/current-user';
import { JwtAuthGuard } from '../../../identity/presentation/http/jwt-auth.guard';
import { CreateNutritionLabelDraftUseCase } from '../../application/use-cases/create-nutrition-label-draft.use-case';
import { ConfirmNutritionLabelDraftUseCase } from '../../application/use-cases/confirm-nutrition-label-draft.use-case';
import {
  GET_NUTRITION_LABEL_DRAFT_USE_CASE,
  GetNutritionLabelDraftUseCase,
} from '../../application/use-cases/get-nutrition-label-draft.use-case';
import {
  NutritionLabelDraftNotFoundError,
  NutritionLabelFileError,
} from '../../application/errors/nutrition-label.errors';
import {
  ConfirmNutritionLabelDraftResponseDto,
  ConfirmNutritionLabelDraftRequestDto,
  CreateNutritionLabelDraftRequestDto,
  NutritionLabelDraftResponseDto,
} from './dto/nutrition-label.dto';
import { rethrowNutritionLabelHttpError } from './nutrition-label-http-error.mapper';

@ApiTags('nutrition-labels')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('households/:householdId/foods/nutrition-label-drafts')
export class NutritionLabelsController {
  constructor(
    @Inject('CREATE_NUTRITION_LABEL_DRAFT')
    private readonly createDraft: CreateNutritionLabelDraftUseCase,
    @Inject('CONFIRM_NUTRITION_LABEL_DRAFT')
    private readonly confirmDraft: ConfirmNutritionLabelDraftUseCase,
    @Inject(GET_NUTRITION_LABEL_DRAFT_USE_CASE)
    private readonly getDraft: GetNutritionLabelDraftUseCase,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        name: { type: 'string' },
        brand: { type: 'string' },
        packageQuantity: { type: 'string', example: '500' },
        packageUnit: { type: 'string', enum: ['GRAM', 'MILLILITER'] },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: NutritionLabelDraftResponseDto })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid document or multipart fields.',
  })
  @ApiResponse({
    status: HttpStatus.PAYLOAD_TOO_LARGE,
    description: 'Document exceeds the configured limit.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Active household membership required.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_GATEWAY,
    description: 'Structured label extraction failed.',
  })
  async create(
    @Param('householdId', ParseUUIDPipe) householdId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: CreateNutritionLabelDraftRequestDto,
    @UploadedFile() file?: UploadedNutritionLabelFile,
  ) {
    try {
      if (!file) throw new NutritionLabelFileError('Nutrition label file is required.');
      return await this.createDraft.execute({
        ...body,
        packageUnit: body.packageUnit,
        actorId: user.id,
        householdId,
        content: file.buffer,
        fileName: file.originalname,
        contentType: file.mimetype,
      });
    } catch (error) {
      rethrowNutritionLabelHttpError(error);
    }
  }

  @Get(':draftId')
  @ApiResponse({ status: HttpStatus.OK, type: NutritionLabelDraftResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Nutrition label draft not found.' })
  async get(
    @Param('householdId', ParseUUIDPipe) householdId: string,
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @CurrentUser() user: CurrentUserModel,
  ) {
    try {
      const draft = await this.getDraft.execute(user.id, householdId, draftId);
      if (!draft) {
        throw new NutritionLabelDraftNotFoundError();
      }
      return draft;
    } catch (error) {
      rethrowNutritionLabelHttpError(error);
    }
  }

  @Post(':draftId/confirm')
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Commercial food and inventory created atomically.',
    type: ConfirmNutritionLabelDraftResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Active household administrator required.',
  })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Draft already confirmed.' })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Invalid corrected nutrition data.',
  })
  async confirm(
    @Param('householdId', ParseUUIDPipe) householdId: string,
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @CurrentUser() user: CurrentUserModel,
    @Body() body: ConfirmNutritionLabelDraftRequestDto,
  ) {
    try {
      return await this.confirmDraft.execute({
        ...body,
        preparationState: body.preparationState,
        packageUnit: body.packageUnit,
        basisUnit: body.basisUnit,
        actorId: user.id,
        householdId,
        draftId,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      });
    } catch (error) {
      rethrowNutritionLabelHttpError(error);
    }
  }
}

interface UploadedNutritionLabelFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}
