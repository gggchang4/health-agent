import { Body, Controller, Get, Headers, Post } from "@nestjs/common";
import { BodyMetricDto, DailyCheckinDto, WorkoutLogDto } from "../dtos/logs.dto";
import { AppStoreService } from "../store/app-store.service";

@Controller("logs")
export class LogsController {
  constructor(private readonly store: AppStoreService) {}

  @Post("body-metrics")
  async createBodyMetric(@Body() body: BodyMetricDto) {
    return this.store.addBodyMetric(body);
  }

  @Get("body-metrics")
  async getBodyMetrics(@Headers("x-user-id") userId?: string) {
    return this.store.getBodyMetrics(userId);
  }

  @Post("daily-checkins")
  async createDailyCheckin(@Body() body: DailyCheckinDto) {
    return this.store.addDailyCheckin(body);
  }

  @Get("daily-checkins")
  async getDailyCheckins(@Headers("x-user-id") userId?: string) {
    return this.store.getDailyCheckins(userId);
  }

  @Post("workouts")
  async createWorkoutLog(@Body() body: WorkoutLogDto) {
    return this.store.addWorkoutLog(body);
  }

  @Get("workouts")
  async getWorkoutLogs(@Headers("x-user-id") userId?: string) {
    return this.store.getWorkoutLogs(userId);
  }
}
