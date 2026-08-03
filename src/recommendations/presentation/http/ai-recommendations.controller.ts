import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../identity/presentation/http/current-user.decorator';
import type { CurrentUser as CurrentUserModel } from '../../../identity/application/models/current-user';
import { JwtAuthGuard } from '../../../identity/presentation/http/jwt-auth.guard';
import { AiProviderError } from '../../application/errors/ai-provider.error';
import { AiGeneratedProposalId } from '../../domain/value-objects/ai-recommendation.value-objects';
import { AcceptAiWeeklyPlanProposalUseCase } from '../../application/use-cases/accept-ai-weekly-plan-proposal.use-case';
import { GenerateAiRecipeSuggestionsUseCase } from '../../application/use-cases/generate-ai-recipe-suggestions.use-case';
import { GenerateAiWeeklyPlanProposalUseCase } from '../../application/use-cases/generate-ai-weekly-plan-proposal.use-case';
import {
  GetAiWeeklyPlanProposalQuery,
  RejectAiWeeklyPlanProposalUseCase,
  UpdateAiWeeklyPlanProposalUseCase,
} from '../../application/use-cases/manage-ai-weekly-plan-proposal.use-cases';
import {
  ACCEPT_AI_WEEKLY_PLAN_PROPOSAL_USE_CASE,
  GENERATE_AI_RECIPE_SUGGESTIONS_USE_CASE,
  GENERATE_AI_WEEKLY_PLAN_PROPOSAL_USE_CASE,
  GET_AI_WEEKLY_PLAN_PROPOSAL_QUERY,
  REJECT_AI_WEEKLY_PLAN_PROPOSAL_USE_CASE,
  UPDATE_AI_WEEKLY_PLAN_PROPOSAL_USE_CASE,
} from '../../application/use-cases/recommendation-use-case.tokens';
import {
  AcceptAiProposalDto,
  GenerateRecipeSuggestionsDto,
  GenerateWeeklyPlanProposalDto,
  RejectAiProposalDto,
  UpdateAiProposalDto,
} from './dto/ai-recommendation.dto';
import {
  HOUSEHOLD_REPOSITORY,
  type HouseholdRepository,
} from '../../../households/application/ports/household-repository.port';
import {
  AI_PROPOSAL_REPOSITORY,
  type AiProposalRepository,
} from '../../application/ports/ai-proposal-repository.port';

@ApiTags('ai-recommendations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class AiRecommendationsController {
  constructor(
    @Inject(GENERATE_AI_WEEKLY_PLAN_PROPOSAL_USE_CASE)
    private readonly generatePlan: GenerateAiWeeklyPlanProposalUseCase,
    @Inject(GENERATE_AI_RECIPE_SUGGESTIONS_USE_CASE)
    private readonly generateRecipes: GenerateAiRecipeSuggestionsUseCase,
    @Inject(GET_AI_WEEKLY_PLAN_PROPOSAL_QUERY)
    private readonly getProposal: GetAiWeeklyPlanProposalQuery,
    @Inject(UPDATE_AI_WEEKLY_PLAN_PROPOSAL_USE_CASE)
    private readonly updateProposal: UpdateAiWeeklyPlanProposalUseCase,
    @Inject(ACCEPT_AI_WEEKLY_PLAN_PROPOSAL_USE_CASE)
    private readonly acceptProposal: AcceptAiWeeklyPlanProposalUseCase,
    @Inject(REJECT_AI_WEEKLY_PLAN_PROPOSAL_USE_CASE)
    private readonly rejectProposal: RejectAiWeeklyPlanProposalUseCase,
    @Inject(HOUSEHOLD_REPOSITORY) private readonly households: HouseholdRepository,
    @Inject(AI_PROPOSAL_REPOSITORY) private readonly proposals: AiProposalRepository,
  ) {}

  @Post('households/:householdId/ai/weekly-plan-proposals')
  @ApiOperation({ summary: 'Genera una propuesta de plan semanal con IA' })
  generateWeekly(
    @Param('householdId') householdId: string,
    @Body() body: GenerateWeeklyPlanProposalDto,
    @CurrentUser() user: CurrentUserModel,
  ) {
    return this.run(async () => {
      await this.assertAccess(user.id, householdId);
      return this.generatePlan.execute({
        ...body,
        actorId: user.id,
        householdId,
        adultProfileIds: body.adultProfileIds,
      });
    });
  }

  @Post('households/:householdId/ai/recipe-suggestions')
  @ApiOperation({ summary: 'Genera sugerencias de recetas con IA' })
  generateRecipe(
    @Param('householdId') householdId: string,
    @Body() body: GenerateRecipeSuggestionsDto,
    @CurrentUser() user: CurrentUserModel,
  ) {
    return this.run(async () => {
      await this.assertAccess(user.id, householdId);
      return this.generateRecipes.execute({
        ...body,
        actorId: user.id,
        householdId,
        maximumPreparationMinutes: body.maximumPreparationMinutes ?? null,
      });
    });
  }

  @Get('ai/weekly-plan-proposals/:proposalId')
  get(@Param('proposalId') proposalId: string, @CurrentUser() user: CurrentUserModel) {
    return this.run(async () =>
      this.getProposal.execute({
        proposalId,
        householdId: await this.proposalHousehold(user.id, proposalId),
      }),
    );
  }

  @Patch('ai/weekly-plan-proposals/:proposalId')
  update(
    @Param('proposalId') proposalId: string,
    @Body() body: UpdateAiProposalDto,
    @CurrentUser() user: CurrentUserModel,
  ) {
    return this.run(async () =>
      this.updateProposal.execute({
        ...body,
        proposalId,
        householdId: await this.proposalHousehold(user.id, proposalId),
        actorId: user.id,
      }),
    );
  }

  @Post('ai/weekly-plan-proposals/:proposalId/accept')
  @HttpCode(HttpStatus.OK)
  accept(
    @Param('proposalId') proposalId: string,
    @Body() body: AcceptAiProposalDto,
    @CurrentUser() user: CurrentUserModel,
  ) {
    return this.run(async () =>
      this.acceptProposal.execute({
        ...body,
        proposalId,
        householdId: await this.proposalHousehold(user.id, proposalId),
        actorId: user.id,
      }),
    );
  }

  @Post('ai/weekly-plan-proposals/:proposalId/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @Param('proposalId') proposalId: string,
    @Body() body: RejectAiProposalDto,
    @CurrentUser() user: CurrentUserModel,
  ) {
    return this.run(async () =>
      this.rejectProposal.execute({
        ...body,
        proposalId,
        householdId: await this.proposalHousehold(user.id, proposalId),
        actorId: user.id,
      }),
    );
  }

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof AiProviderError) {
        if (error.code === 'AI_PROVIDER_UNAVAILABLE' || error.code === 'AI_CONFIGURATION_ERROR')
          throw new ServiceUnavailableException(error.message);
        throw new BadRequestException(error.message);
      }
      if (error instanceof Error && error.message.startsWith('AI rate limit'))
        throw new HttpException(error.message, HttpStatus.TOO_MANY_REQUESTS);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid AI recommendation request.',
      );
    }
  }

  private async assertAccess(userId: string, householdId: string): Promise<void> {
    if (!(await this.households.findAccess(userId, householdId)))
      throw new BadRequestException('Household was not found or is not accessible.');
  }

  private async proposalHousehold(userId: string, proposalId: string): Promise<string> {
    const id = AiGeneratedProposalId.from(proposalId);
    const proposal = await this.proposals.findById(id);
    if (!proposal) throw new BadRequestException('AI proposal was not found.');
    const households = await this.households.findActiveForUser(userId);
    for (const household of households) {
      if (await this.proposals.findByIdForHousehold(id, household.id)) return household.id;
    }
    throw new BadRequestException('AI proposal was not found.');
  }
}
