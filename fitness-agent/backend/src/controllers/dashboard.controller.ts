import { Controller, Get, Headers } from "@nestjs/common";
import { AppStoreService } from "../store/app-store.service";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly store: AppStoreService) {}

  @Get()
  async getDashboard(@Headers("x-user-id") userId?: string) {
    return this.store.getDashboard(userId);
  }
}
