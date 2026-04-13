import { Body, Controller, Get, Headers, Patch } from "@nestjs/common";
import { UpdateProfileDto } from "../dtos/profile.dto";
import { AppStoreService } from "../store/app-store.service";

@Controller()
export class MeController {
  constructor(private readonly store: AppStoreService) {}

  @Get("me")
  async me(@Headers("x-user-id") userId?: string) {
    const user = await this.store.getUser(userId);
    return {
      ...user,
      profile: user.healthProfile
    };
  }

  @Patch("me/profile")
  async updateProfile(@Body() body: UpdateProfileDto, @Headers("x-user-id") userId?: string) {
    const user = await this.store.getUser(userId);
    return this.store.updateProfile(user.id, body);
  }
}
