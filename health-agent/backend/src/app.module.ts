import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";
import { AppStoreService } from "./store/app-store.service";
import { AuthController } from "./controllers/auth.controller";
import { DashboardController } from "./controllers/dashboard.controller";
import { ExercisesController } from "./controllers/exercises.controller";
import { LogsController } from "./controllers/logs.controller";
import { MeController } from "./controllers/me.controller";
import { PlansController } from "./controllers/plans.controller";

@Module({
  controllers: [
    AuthController,
    MeController,
    DashboardController,
    LogsController,
    PlansController,
    ExercisesController
  ],
  providers: [PrismaService, AppStoreService]
})
export class AppModule {}
