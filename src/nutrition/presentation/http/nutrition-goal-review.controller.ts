import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
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
import { SupabaseAuthGuard } from '../../../identity/presentation/http/supabase-auth.guard';
import {
  GET_NUTRITION_GOAL_REVIEW_QUERY,
  GetNutritionGoalReviewQuery,
} from '../../application/use-cases/get-nutrition-goal-review.query';
import {
  GENERATE_REVIEWED_NUTRITION_GOAL_PROPOSAL_USE_CASE,
  GenerateReviewedNutritionGoalProposalUseCase,
} from '../../application/use-cases/generate-reviewed-nutrition-goal-proposal.use-case';
import {
  ACCEPT_NUTRITION_GOAL_REVIEW_USE_CASE,
  AcceptNutritionGoalReviewUseCase,
} from '../../application/use-cases/accept-nutrition-goal-review.use-case';
import {
  REJECT_NUTRITION_GOAL_REVIEW_USE_CASE,
  RejectNutritionGoalReviewUseCase,
} from '../../application/use-cases/reject-nutrition-goal-review.use-case';
import {
  POSTPONE_NUTRITION_GOAL_REVIEW_USE_CASE,
  PostponeNutritionGoalReviewUseCase,
} from '../../application/use-cases/postpone-nutrition-goal-review.use-case';
import {
  NutritionGoalReviewResponseDto,
  PostponeNutritionGoalReviewRequestDto,
} from './dto/nutrition-goal-review.dto';
import { NutritionGoalResponseDto } from './dto/nutrition-goal-response.dto';
import type { NutritionGoalView } from '../../domain/models/nutrition-goal.models';
import { rethrowNutritionGoalHttpError } from './nutrition-goal-http.mapper';
import type {
  NutritionGoalReviewResult,
  NutritionGoalReviewView,
} from '../../domain/models/nutrition-goal-review.models';

@ApiTags('nutrition-goal-review')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token.' })
@Controller('adult-profiles/:adultProfileId/nutrition-goal-review')
@UseGuards(SupabaseAuthGuard)
export class NutritionGoalReviewController {
  constructor(
    @Inject(GET_NUTRITION_GOAL_REVIEW_QUERY)
    private readonly getReview: GetNutritionGoalReviewQuery,
    @Inject(GENERATE_REVIEWED_NUTRITION_GOAL_PROPOSAL_USE_CASE)
    private readonly generateProposal: GenerateReviewedNutritionGoalProposalUseCase,
    @Inject(ACCEPT_NUTRITION_GOAL_REVIEW_USE_CASE)
    private readonly acceptReview: AcceptNutritionGoalReviewUseCase,
    @Inject(REJECT_NUTRITION_GOAL_REVIEW_USE_CASE)
    private readonly rejectReview: RejectNutritionGoalReviewUseCase,
    @Inject(POSTPONE_NUTRITION_GOAL_REVIEW_USE_CASE)
    private readonly postponeReview: PostponeNutritionGoalReviewUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Consulta el estado de revisión de la meta nutricional' })
  @ApiParam({ name: 'adultProfileId', format: 'uuid' })
  @ApiOkResponse({ type: NutritionGoalReviewResponseDto })
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async get(
    @Param('adultProfileId') adultProfileId: string,
    @CurrentUser() user: CurrentUserModel,
  ) {
    return toReviewResponse(
      await this.handle(() => this.getReview.execute({ actorId: user.id, adultProfileId })),
    );
  }

  @Post('generate-proposal')
  @ApiOperation({ summary: 'Genera una vista previa de propuesta para la revisión' })
  @ApiOkResponse({ type: NutritionGoalReviewResponseDto })
  async generate(
    @Param('adultProfileId') adultProfileId: string,
    @CurrentUser() user: CurrentUserModel,
  ) {
    return toReviewResponse(
      await this.handle(() => this.generateProposal.execute({ actorId: user.id, adultProfileId })),
    );
  }

  @Post('accept')
  @ApiOperation({ summary: 'Acepta explícitamente la propuesta de revisión' })
  @ApiOkResponse({ type: NutritionGoalResponseDto })
  @ApiConflictResponse()
  async accept(
    @Param('adultProfileId') adultProfileId: string,
    @CurrentUser() user: CurrentUserModel,
  ) {
    return toGoalResponse(
      await this.handle(() => this.acceptReview.execute({ actorId: user.id, adultProfileId })),
    );
  }

  @Post('reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async reject(
    @Param('adultProfileId') adultProfileId: string,
    @CurrentUser() user: CurrentUserModel,
  ): Promise<void> {
    await this.handle(() => this.rejectReview.execute({ actorId: user.id, adultProfileId }));
  }

  @Post('postpone')
  @ApiOperation({ summary: 'Pospone la revisión hasta una fecha futura' })
  @ApiOkResponse({ type: NutritionGoalReviewResponseDto })
  async postpone(
    @Param('adultProfileId') adultProfileId: string,
    @Body() body: PostponeNutritionGoalReviewRequestDto,
    @CurrentUser() user: CurrentUserModel,
  ) {
    return toReviewResponse(
      await this.handle(() =>
        this.postponeReview.execute({
          actorId: user.id,
          adultProfileId,
          postponedUntil: new Date(body.postponedUntil),
        }),
      ),
    );
  }

  private async handle<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      rethrowNutritionGoalHttpError(error);
    }
  }
}

function toReviewResponse(
  result: NutritionGoalReviewResult | NutritionGoalReviewView,
): NutritionGoalReviewResponseDto {
  const review = 'review' in result ? result.review : result;
  const proposal = 'review' in result ? result.proposal : null;
  const differences = 'review' in result ? result.differences : null;
  return {
    ...review,
    reasons: [...review.reasons],
    proposal: proposal
      ? {
          id: proposal.id,
          dailyCalories: proposal.values.calories.toNumber(),
          proteinGrams: proposal.values.proteinGrams.toNumber(),
          carbohydrateGrams: proposal.values.carbohydrateGrams.toNumber(),
          fatGrams: proposal.values.fatGrams.toNumber(),
          fiberGrams: proposal.values.fiberGrams.toNumber(),
        }
      : null,
    differences: differences
      ? {
          calories: differences.calories.toNumber(),
          proteinGrams: differences.proteinGrams.toNumber(),
          carbohydrateGrams: differences.carbohydrateGrams.toNumber(),
          fatGrams: differences.fatGrams.toNumber(),
          fiberGrams: differences.fiberGrams.toNumber(),
        }
      : null,
  };
}

function toGoalResponse(goal: NutritionGoalView): NutritionGoalResponseDto {
  return {
    id: goal.id,
    adultProfileId: goal.adultProfileId,
    validFrom: goal.validFrom,
    validUntil: goal.validUntil,
    dailyCalories: goal.values.calories.toNumber(),
    proteinGrams: goal.values.proteinGrams.toNumber(),
    carbohydrateGrams: goal.values.carbohydrateGrams.toNumber(),
    fatGrams: goal.values.fatGrams.toNumber(),
    fiberGrams: goal.values.fiberGrams.toNumber(),
    goalType: goal.goalType,
    calculationMethod: goal.calculationMethod,
    confirmedById: goal.confirmedById,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
}
