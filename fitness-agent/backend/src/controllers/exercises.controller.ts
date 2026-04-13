import { Controller, Get, Param } from "@nestjs/common";
import { AppStoreService } from "../store/app-store.service";

@Controller("exercises")
export class ExercisesController {
  constructor(private readonly store: AppStoreService) {}

  @Get()
  async listExercises() {
    return this.store.getExercises();
  }

  @Get(":id")
  async getExercise(@Param("id") id: string) {
    const exercises = await this.store.getExercises();
    return exercises.find((item) => item.id === id) ?? null;
  }
}
