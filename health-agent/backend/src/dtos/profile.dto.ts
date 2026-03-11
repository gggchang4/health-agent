import { IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateProfileDto {
  @IsOptional()
  @IsNumber()
  age?: number;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsNumber()
  heightCm?: number;

  @IsOptional()
  @IsNumber()
  currentWeightKg?: number;

  @IsOptional()
  @IsNumber()
  targetWeightKg?: number;

  @IsOptional()
  @IsString()
  activityLevel?: string;

  @IsOptional()
  @IsString()
  trainingExperience?: string;

  @IsOptional()
  @IsNumber()
  trainingDaysPerWeek?: number;

  @IsOptional()
  @IsString()
  equipmentAccess?: string;

  @IsOptional()
  @IsString()
  limitations?: string;
}

