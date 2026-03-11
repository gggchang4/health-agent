import { Body, Controller, Get, Headers, Post } from "@nestjs/common";
import { AdjustPlanDto, CompletePlanSessionDto, GeneratePlanDto } from "../dtos/plans.dto";
import { AppStoreService } from "../store/app-store.service";

@Controller("plans")
export class PlansController {
  constructor(private readonly store: AppStoreService) {}

  @Post("generate")
  async generatePlan(@Body() body: GeneratePlanDto) {
    return this.store.generatePlan(body.userId, body.goal);
  }

  @Get("current")
  async getCurrentPlan(@Headers("x-user-id") userId?: string) {
    const plan = await this.store.getCurrentPlan(userId);
    return plan?.days ?? [];
  }

  @Post("current/adjust")
  async adjustCurrentPlan(@Body() body: AdjustPlanDto) {
    return this.store.adjustPlan(body.userId, body.note);
  }

  @Post("current/complete-session")
  async completeCurrentPlan(@Body() body: CompletePlanSessionDto) {
    return this.store.completeSession(body.userId, body.dayLabel);
  }
}
