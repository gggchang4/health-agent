import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../auth/auth.decorators";
import type { AuthTokenClaims } from "../auth/auth-token.service";
import {
  CreateAgentMessageDto,
  ProposalConfirmDto,
  CreateAgentProposalsDto,
  CreateAgentRunDto,
  CreateAgentThreadDto,
  ProposalDecisionDto
} from "../dtos/agent.dto";
import { AgentStateService } from "../services/agent-state.service";

@Controller("agent/state")
export class AgentStateController {
  constructor(private readonly agentState: AgentStateService) {}

  @Post("threads")
  async createThread(@Body() body: CreateAgentThreadDto, @CurrentUser() user: AuthTokenClaims) {
    return this.agentState.createThread(body.title, user.sub);
  }

  @Get("threads/:threadId/messages")
  async listMessages(@Param("threadId") threadId: string, @CurrentUser() user: AuthTokenClaims) {
    return this.agentState.listMessages(threadId, user.sub);
  }

  @Post("threads/:threadId/messages")
  async appendMessage(
    @Param("threadId") threadId: string,
    @Body() body: CreateAgentMessageDto,
    @CurrentUser() user: AuthTokenClaims
  ) {
    return this.agentState.appendMessage(threadId, body, user.sub);
  }

  @Post("threads/:threadId/runs")
  async createRun(
    @Param("threadId") threadId: string,
    @Body() body: CreateAgentRunDto,
    @CurrentUser() user: AuthTokenClaims
  ) {
    return this.agentState.createRun(threadId, body, user.sub);
  }

  @Get("runs/:runId")
  async getRun(@Param("runId") runId: string, @CurrentUser() user: AuthTokenClaims) {
    return this.agentState.getRun(runId, user.sub);
  }

  @Post("threads/:threadId/proposals")
  async createProposals(
    @Param("threadId") threadId: string,
    @Body() body: CreateAgentProposalsDto,
    @CurrentUser() user: AuthTokenClaims
  ) {
    return this.agentState.createProposals(threadId, body, user.sub);
  }

  @Get("threads/:threadId/proposals")
  async listProposals(@Param("threadId") threadId: string, @CurrentUser() user: AuthTokenClaims) {
    return this.agentState.listProposals(threadId, user.sub);
  }

  @Get("proposals/:proposalId")
  async getProposal(@Param("proposalId") proposalId: string, @CurrentUser() user: AuthTokenClaims) {
    return this.agentState.getProposal(proposalId, user.sub);
  }

  @Post("proposals/:proposalId/approve")
  async approveProposal(
    @Param("proposalId") proposalId: string,
    @Body() _body: ProposalDecisionDto,
    @CurrentUser() user: AuthTokenClaims
  ) {
    return this.agentState.approveProposal(proposalId, user.sub);
  }

  @Post("proposals/:proposalId/reject")
  async rejectProposal(
    @Param("proposalId") proposalId: string,
    @Body() _body: ProposalDecisionDto,
    @CurrentUser() user: AuthTokenClaims
  ) {
    return this.agentState.rejectProposal(proposalId, user.sub);
  }

  @Post("proposals/:proposalId/confirm")
  async confirmProposal(
    @Param("proposalId") proposalId: string,
    @Body() body: ProposalConfirmDto,
    @CurrentUser() user: AuthTokenClaims
  ) {
    return this.agentState.confirmProposal(proposalId, body.idempotencyKey, user.sub);
  }
}
