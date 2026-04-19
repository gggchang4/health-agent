import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";
import { AppStoreService } from "./store/app-store.service";
import { AuthController } from "./controllers/auth.controller";
import { AgentCommandsController } from "./controllers/agent-commands.controller";
import { AgentStateController } from "./controllers/agent-state.controller";
import { DashboardController } from "./controllers/dashboard.controller";
import { DietRecommendationController } from "./controllers/diet-recommendation.controller";
import { ExercisesController } from "./controllers/exercises.controller";
import { LogsController } from "./controllers/logs.controller";
import { MeController } from "./controllers/me.controller";
import { PlansController } from "./controllers/plans.controller";
import { AgentStateService } from "./services/agent-state.service";

@Module({
  controllers: [
    AuthController,
    MeController,
    AgentStateController,
    AgentCommandsController,
    DashboardController,
    DietRecommendationController,
    LogsController,
    PlansController,
    ExercisesController
  ],
  providers: [PrismaService, AppStoreService, AgentStateService]
})
export class AppModule {}
