import { Body, Controller, Headers, Post } from "@nestjs/common";
import { ProposalExecutionDto } from "../dtos/agent.dto";
import { AgentStateService } from "../services/agent-state.service";

@Controller("agent/commands")
export class AgentCommandsController {
  constructor(private readonly agentState: AgentStateService) {}

  @Post("generate-plan")
  async generatePlan(@Body() body: ProposalExecutionDto, @Headers("x-user-id") userId?: string) {
    return this.agentState.executeProposal(body.proposalId, body.idempotencyKey, "generate_plan", userId);
  }

  @Post("adjust-plan")
  async adjustPlan(@Body() body: ProposalExecutionDto, @Headers("x-user-id") userId?: string) {
    return this.agentState.executeProposal(body.proposalId, body.idempotencyKey, "adjust_plan", userId);
  }

  @Post("create-plan-day")
  async createPlanDay(@Body() body: ProposalExecutionDto, @Headers("x-user-id") userId?: string) {
    return this.agentState.executeProposal(body.proposalId, body.idempotencyKey, "create_plan_day", userId);
  }

  @Post("update-plan-day")
  async updatePlanDay(@Body() body: ProposalExecutionDto, @Headers("x-user-id") userId?: string) {
    return this.agentState.executeProposal(body.proposalId, body.idempotencyKey, "update_plan_day", userId);
  }

  @Post("delete-plan-day")
  async deletePlanDay(@Body() body: ProposalExecutionDto, @Headers("x-user-id") userId?: string) {
    return this.agentState.executeProposal(body.proposalId, body.idempotencyKey, "delete_plan_day", userId);
  }

  @Post("complete-plan-day")
  async completePlanDay(@Body() body: ProposalExecutionDto, @Headers("x-user-id") userId?: string) {
    return this.agentState.executeProposal(body.proposalId, body.idempotencyKey, "complete_plan_day", userId);
  }

  @Post("create-body-metric")
  async createBodyMetric(@Body() body: ProposalExecutionDto, @Headers("x-user-id") userId?: string) {
    return this.agentState.executeProposal(body.proposalId, body.idempotencyKey, "create_body_metric", userId);
  }

  @Post("create-daily-checkin")
  async createDailyCheckin(@Body() body: ProposalExecutionDto, @Headers("x-user-id") userId?: string) {
    return this.agentState.executeProposal(body.proposalId, body.idempotencyKey, "create_daily_checkin", userId);
  }

  @Post("create-workout-log")
  async createWorkoutLog(@Body() body: ProposalExecutionDto, @Headers("x-user-id") userId?: string) {
    return this.agentState.executeProposal(body.proposalId, body.idempotencyKey, "create_workout_log", userId);
  }
}
