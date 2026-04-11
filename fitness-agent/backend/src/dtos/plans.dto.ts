import { IsOptional, IsString } from "class-validator";

export class GeneratePlanDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  goal?: string;
}

export class AdjustPlanDto {
  @IsString()
  userId!: string;

  @IsString()
  note!: string;
}

export class CompletePlanSessionDto {
  @IsString()
  userId!: string;

  @IsString()
  dayLabel!: string;
}

