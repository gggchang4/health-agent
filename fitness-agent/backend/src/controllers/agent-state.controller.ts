import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import {
  CreateAgentMessageDto,
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
  async createThread(@Body() body: CreateAgentThreadDto, @Headers("x-user-id") userId?: string) {
    return this.agentState.createThread(body.title, userId);
  }

  @Get("threads/:threadId/messages")
  async listMessages(@Param("threadId") threadId: string, @Headers("x-user-id") userId?: string) {
    return this.agentState.listMessages(threadId, userId);
  }

  @Post("threads/:threadId/messages")
  async appendMessage(
    @Param("threadId") threadId: string,
    @Body() body: CreateAgentMessageDto,
    @Headers("x-user-id") userId?: string
  ) {
    return this.agentState.appendMessage(threadId, body, userId);
  }

  @Post("threads/:threadId/runs")
  async createRun(
    @Param("threadId") threadId: string,
    @Body() body: CreateAgentRunDto,
    @Headers("x-user-id") userId?: string
  ) {
    return this.agentState.createRun(threadId, body, userId);
  }

  @Get("runs/:runId")
  async getRun(@Param("runId") runId: string, @Headers("x-user-id") userId?: string) {
    return this.agentState.getRun(runId, userId);
  }

  @Post("threads/:threadId/proposals")
  async createProposals(
    @Param("threadId") threadId: string,
    @Body() body: CreateAgentProposalsDto,
    @Headers("x-user-id") userId?: string
  ) {
    return this.agentState.createProposals(threadId, body, userId);
  }

  @Get("threads/:threadId/proposals")
  async listProposals(@Param("threadId") threadId: string, @Headers("x-user-id") userId?: string) {
    return this.agentState.listProposals(threadId, userId);
  }

  @Get("proposals/:proposalId")
  async getProposal(@Param("proposalId") proposalId: string, @Headers("x-user-id") userId?: string) {
    return this.agentState.getProposal(proposalId, userId);
  }

  @Post("proposals/:proposalId/approve")
  async approveProposal(
    @Param("proposalId") proposalId: string,
    @Body() _body: ProposalDecisionDto,
    @Headers("x-user-id") userId?: string
  ) {
    return this.agentState.approveProposal(proposalId, userId);
  }

  @Post("proposals/:proposalId/reject")
  async rejectProposal(
    @Param("proposalId") proposalId: string,
    @Body() _body: ProposalDecisionDto,
    @Headers("x-user-id") userId?: string
  ) {
    return this.agentState.rejectProposal(proposalId, userId);
  }
}
