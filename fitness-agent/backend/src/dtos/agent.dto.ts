import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";

class AgentCardDto {
  @IsString()
  type!: string;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bullets?: string[];

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

export class CreateAgentThreadDto {
  @IsOptional()
  @IsString()
  title?: string;
}

export class CreateAgentMessageDto {
  @IsIn(["user", "assistant"])
  role!: "user" | "assistant";

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  reasoning?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgentCardDto)
  cards?: AgentCardDto[];
}

class CreateAgentRunStepDto {
  @IsString()
  id!: string;

  @IsString()
  step_type!: string;

  @IsString()
  title!: string;

  @IsObject()
  payload!: Record<string, unknown>;
}

export class CreateAgentRunDto {
  @IsString()
  id!: string;

  @IsIn(["completed", "failed"])
  status!: "completed" | "failed";

  @IsIn(["low", "medium", "high"])
  risk_level!: "low" | "medium" | "high";

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAgentRunStepDto)
  steps!: CreateAgentRunStepDto[];
}

export class CreateAgentProposalDto {
  @IsString()
  actionType!: string;

  @IsString()
  entityType!: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsString()
  title!: string;

  @IsString()
  summary!: string;

  @IsObject()
  payload!: Record<string, unknown>;

  @IsObject()
  preview!: Record<string, unknown>;

  @IsIn(["low", "medium", "high"])
  riskLevel!: "low" | "medium" | "high";

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  requiresConfirmation?: boolean;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}

export class CreateAgentProposalsDto {
  @IsString()
  runId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAgentProposalDto)
  proposals!: CreateAgentProposalDto[];
}

export class ProposalDecisionDto {
  @IsString()
  proposalId!: string;
}

export class ProposalExecutionDto {
  @IsString()
  proposalId!: string;

  @IsString()
  idempotencyKey!: string;
}
