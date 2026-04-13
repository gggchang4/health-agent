import { Controller, Get, Headers } from "@nestjs/common";
import { AppStoreService } from "../store/app-store.service";

@Controller("diet-recommendation")
export class DietRecommendationController {
  constructor(private readonly store: AppStoreService) {}

  @Get("today")
  async getTodayDietRecommendation(@Headers("x-user-id") userId?: string) {
    return this.store.getTodayDietRecommendation(userId);
  }
}
