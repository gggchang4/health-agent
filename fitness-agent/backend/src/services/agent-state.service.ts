import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  CreateAgentMessageDto,
  CreateAgentProposalDto,
  CreateAgentRunDto
} from "../dtos/agent.dto";
import { AppStoreService } from "../store/app-store.service";
import { PrismaService } from "../prisma/prisma.service";

type TransactionClient = Prisma.TransactionClient | PrismaClient;

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function normalizeArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

@Injectable()
export class AgentStateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appStore: AppStoreService
  ) {}

  private async getActor(userId?: string) {
    return this.appStore.getUser(userId);
  }

  private async getThreadForActor(threadId: string, userId?: string) {
    const actor = await this.getActor(userId);
    const thread = await this.prisma.agentThread.findFirst({
      where: { id: threadId, userId: actor.id }
    });

    if (!thread) {
      throw new NotFoundException("Agent thread not found.");
    }

    return { actor, thread };
  }

  private async getRunForActor(runId: string, userId?: string) {
    const actor = await this.getActor(userId);
    const run = await this.prisma.agentRun.findFirst({
      where: {
        id: runId,
        thread: {
          userId: actor.id
        }
      },
      include: {
        steps: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!run) {
      throw new NotFoundException("Agent run not found.");
    }

    return { actor, run };
  }

  private async getProposalForActor(proposalId: string, userId?: string) {
    const actor = await this.getActor(userId);
    const proposal = await this.prisma.agentActionProposal.findFirst({
      where: {
        id: proposalId,
        userId: actor.id
      }
    });

    if (!proposal) {
      throw new NotFoundException("Agent proposal not found.");
    }

    return { actor, proposal };
  }

  private mapMessage(message: {
    id: string;
    role: string;
    content: string;
    reasoning: string | null;
    cards: Prisma.JsonValue | null;
    createdAt: Date;
  }) {
    return {
      id: message.id,
      role: message.role,
      content: message.content,
      reasoning_summary: message.reasoning,
      cards: Array.isArray(message.cards) ? message.cards : [],
      created_at: message.createdAt.toISOString()
    };
  }

  private mapProposal(proposal: {
    id: string;
    threadId: string;
    runId: string;
    status: string;
    actionType: string;
    entityType: string;
    entityId: string | null;
    title: string;
    summary: string;
    payload: Prisma.JsonValue;
    preview: Prisma.JsonValue;
    riskLevel: string;
    requiresConfirmation: boolean;
    expiresAt: Date | null;
    executedAt: Date | null;
    basePlanId: string | null;
    basePlanVersion: number | null;
    basePlanUpdatedAt: Date | null;
    expectedDayId: string | null;
    expectedDayUpdatedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: proposal.id,
      thread_id: proposal.threadId,
      run_id: proposal.runId,
      status: proposal.status,
      action_type: proposal.actionType,
      entity_type: proposal.entityType,
      entity_id: proposal.entityId,
      title: proposal.title,
      summary: proposal.summary,
      payload: proposal.payload,
      preview: proposal.preview,
      risk_level: proposal.riskLevel,
      requires_confirmation: proposal.requiresConfirmation,
      expires_at: proposal.expiresAt?.toISOString() ?? null,
      executed_at: proposal.executedAt?.toISOString() ?? null,
      base_plan_id: proposal.basePlanId,
      base_plan_version: proposal.basePlanVersion,
      base_plan_updated_at: proposal.basePlanUpdatedAt?.toISOString() ?? null,
      expected_day_id: proposal.expectedDayId,
      expected_day_updated_at: proposal.expectedDayUpdatedAt?.toISOString() ?? null,
      created_at: proposal.createdAt.toISOString(),
      updated_at: proposal.updatedAt.toISOString()
    };
  }

  async createThread(title?: string, userId?: string) {
    const actor = await this.getActor(userId);
    return this.prisma.agentThread.create({
      data: {
        userId: actor.id,
        title: title?.trim() || "Health Agent Chat"
      }
    });
  }

  async listMessages(threadId: string, userId?: string) {
    const { thread } = await this.getThreadForActor(threadId, userId);
    const messages = await this.prisma.agentMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: "asc" }
    });

    return messages.map((message) => this.mapMessage(message));
  }

  async appendMessage(threadId: string, payload: CreateAgentMessageDto, userId?: string) {
    const { thread } = await this.getThreadForActor(threadId, userId);
    const message = await this.prisma.agentMessage.create({
      data: {
        threadId: thread.id,
        role: payload.role,
        content: payload.content,
        reasoning: payload.reasoning,
        cards: payload.cards ? asJson(payload.cards) : Prisma.JsonNull
      }
    });

    return this.mapMessage(message);
  }

  async createRun(threadId: string, payload: CreateAgentRunDto, userId?: string) {
    const { thread } = await this.getThreadForActor(threadId, userId);
    const run = await this.prisma.agentRun.create({
      data: {
        id: payload.id,
        threadId: thread.id,
        status: payload.status,
        riskLevel: payload.risk_level,
        steps: {
          create: payload.steps.map((step) => ({
            id: step.id,
            stepType: step.step_type,
            title: step.title,
            payload: asJson(step.payload)
          }))
        }
      },
      include: {
        steps: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    return {
      id: run.id,
      thread_id: run.threadId,
      status: run.status,
      risk_level: run.riskLevel,
      steps: run.steps.map((step) => ({
        id: step.id,
        step_type: step.stepType,
        title: step.title,
        payload: step.payload,
        created_at: step.createdAt.toISOString()
      })),
      created_at: run.createdAt.toISOString()
    };
  }

  async getRun(runId: string, userId?: string) {
    const { run } = await this.getRunForActor(runId, userId);
    return {
      id: run.id,
      thread_id: run.threadId,
      status: run.status,
      risk_level: run.riskLevel,
      steps: run.steps.map((step) => ({
        id: step.id,
        step_type: step.stepType,
        title: step.title,
        payload: step.payload,
        created_at: step.createdAt.toISOString()
      })),
      created_at: run.createdAt.toISOString()
    };
  }

  async createProposals(threadId: string, payload: { runId: string; proposals: CreateAgentProposalDto[] }, userId?: string) {
    const { actor, thread } = await this.getThreadForActor(threadId, userId);
    await this.getRunForActor(payload.runId, actor.id);

    const expiresAtDefault = new Date(Date.now() + 1000 * 60 * 60 * 2);

    const proposals = await this.prisma.$transaction(
      payload.proposals.map((proposal) =>
        this.prisma.agentActionProposal.create({
          data: {
            threadId: thread.id,
            runId: payload.runId,
            userId: actor.id,
            status: "pending",
            actionType: proposal.actionType,
            entityType: proposal.entityType,
            entityId: proposal.entityId,
            title: proposal.title,
            summary: proposal.summary,
            payload: asJson(proposal.payload),
            preview: asJson(proposal.preview),
            riskLevel: proposal.riskLevel,
            requiresConfirmation: proposal.requiresConfirmation ?? true,
            expiresAt: proposal.expiresAt ? new Date(proposal.expiresAt) : expiresAtDefault,
            basePlanId: proposal.basePlanId,
            basePlanVersion: proposal.basePlanVersion,
            basePlanUpdatedAt: proposal.basePlanUpdatedAt ? new Date(proposal.basePlanUpdatedAt) : undefined,
            expectedDayId: proposal.expectedDayId,
            expectedDayUpdatedAt: proposal.expectedDayUpdatedAt ? new Date(proposal.expectedDayUpdatedAt) : undefined
          }
        })
      )
    );

    return proposals.map((proposal) => this.mapProposal(proposal));
  }

  async listProposals(threadId: string, userId?: string) {
    const { thread } = await this.getThreadForActor(threadId, userId);
    const proposals = await this.prisma.agentActionProposal.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: "asc" }
    });

    return proposals.map((proposal) => this.mapProposal(proposal));
  }

  async getProposal(proposalId: string, userId?: string) {
    const { proposal } = await this.getProposalForActor(proposalId, userId);
    return this.mapProposal(proposal);
  }

  async approveProposal(proposalId: string, userId?: string) {
    const { proposal } = await this.getProposalForActor(proposalId, userId);
    if (proposal.status !== "pending") {
      throw new ConflictException(`Only pending proposals can be approved. Current status: ${proposal.status}.`);
    }

    const updatedCount = await this.prisma.agentActionProposal.updateMany({
      where: { id: proposal.id, status: "pending" },
      data: { status: "approved" }
    });

    if (updatedCount.count !== 1) {
      const latest = await this.prisma.agentActionProposal.findUniqueOrThrow({ where: { id: proposal.id } });
      throw new ConflictException(`Only pending proposals can be approved. Current status: ${latest.status}.`);
    }

    const updated = await this.prisma.agentActionProposal.findUniqueOrThrow({ where: { id: proposal.id } });
    return this.mapProposal(updated);
  }

  async rejectProposal(proposalId: string, userId?: string) {
    const { proposal } = await this.getProposalForActor(proposalId, userId);
    if (!["pending", "approved"].includes(proposal.status)) {
      throw new ConflictException(`This proposal can no longer be rejected. Current status: ${proposal.status}.`);
    }

    const updatedCount = await this.prisma.agentActionProposal.updateMany({
      where: { id: proposal.id, status: { in: ["pending", "approved"] } },
      data: { status: "rejected" }
    });

    if (updatedCount.count !== 1) {
      const latest = await this.prisma.agentActionProposal.findUniqueOrThrow({ where: { id: proposal.id } });
      throw new ConflictException(`This proposal can no longer be rejected. Current status: ${latest.status}.`);
    }

    const updated = await this.prisma.agentActionProposal.findUniqueOrThrow({ where: { id: proposal.id } });
    return this.mapProposal(updated);
  }

  async confirmProposal(proposalId: string, idempotencyKey: string, userId?: string) {
    const { actor, proposal } = await this.getProposalForActor(proposalId, userId);
    if (proposal.status !== "pending") {
      throw new ConflictException(`Only pending proposals can be confirmed. Current status: ${proposal.status}.`);
    }

    const updatedCount = await this.prisma.agentActionProposal.updateMany({
      where: { id: proposal.id, status: "pending" },
      data: { status: "approved" }
    });

    if (updatedCount.count !== 1) {
      const latest = await this.prisma.agentActionProposal.findUniqueOrThrow({ where: { id: proposal.id } });
      throw new ConflictException(`Only pending proposals can be confirmed. Current status: ${latest.status}.`);
    }

    const approved = await this.prisma.agentActionProposal.findUniqueOrThrow({ where: { id: proposal.id } });
    const execution = await this.executeApprovedProposal(approved.id, idempotencyKey, actor.id, approved.actionType);
    const refreshed = await this.prisma.agentActionProposal.findUniqueOrThrow({ where: { id: approved.id } });
    return {
      proposal: this.mapProposal(refreshed),
      execution
    };
  }

  async executeProposal(proposalId: string, idempotencyKey: string, expectedActionType: string, userId?: string) {
    const { actor, proposal } = await this.getProposalForActor(proposalId, userId);

    return this.executeApprovedProposal(proposal.id, idempotencyKey, actor.id, expectedActionType);
  }

  private async executeApprovedProposal(
    proposalId: string,
    idempotencyKey: string,
    actorId: string,
    expectedActionType: string
  ) {
    const proposal = await this.prisma.agentActionProposal.findUnique({
      where: { id: proposalId }
    });

    if (!proposal) {
      throw new NotFoundException("Agent proposal not found.");
    }

    if (proposal.actionType !== expectedActionType) {
      throw new ConflictException("Proposal action type does not match this command.");
    }

    if (proposal.expiresAt && proposal.expiresAt.getTime() < Date.now()) {
      await this.prisma.agentActionProposal.update({
        where: { id: proposal.id },
        data: { status: "expired" }
      });
      throw new ConflictException("This proposal has expired. Refresh and try again.");
    }

    const existingExecution = await this.prisma.agentActionExecution.findUnique({
      where: {
        proposalId_idempotencyKey: {
          proposalId: proposal.id,
          idempotencyKey
        }
      }
    });

    if (existingExecution) {
      return {
        ok: existingExecution.status === "succeeded",
        status: existingExecution.status,
        result: existingExecution.resultPayload
      };
    }

    if (proposal.status === "executed") {
      throw new ConflictException("This proposal has already been executed.");
    }

    if (proposal.status !== "approved") {
      throw new ConflictException("This proposal cannot be executed in its current state.");
    }

    await this.assertProposalFresh(proposal.id, actorId);

    const payload = proposal.payload as Record<string, unknown>;

    try {
      const result = await this.dispatchAction(proposal.actionType, payload, actorId);
      await this.prisma.$transaction(async (tx) => {
        await tx.agentActionExecution.create({
          data: {
            proposalId: proposal.id,
            userId: actorId,
            status: "succeeded",
            requestPayload: asJson(proposal.payload),
            resultPayload: asJson(result),
            idempotencyKey
          }
        });

        await tx.agentActionProposal.update({
          where: { id: proposal.id },
          data: {
            status: "executed",
            executedAt: new Date()
          }
        });
      });

      return { ok: true, status: "succeeded", result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown execution error";

      await this.prisma.$transaction(async (tx) => {
        await tx.agentActionExecution.create({
          data: {
            proposalId: proposal.id,
            userId: actorId,
            status: "failed",
            requestPayload: asJson(proposal.payload),
            resultPayload: Prisma.JsonNull,
            errorMessage,
            idempotencyKey
          }
        });

        await tx.agentActionProposal.update({
          where: { id: proposal.id },
          data: { status: "failed" }
        });
      });

      throw error;
    }
  }

  private async assertProposalFresh(proposalId: string, actorId: string) {
    const proposal = await this.prisma.agentActionProposal.findUnique({
      where: { id: proposalId }
    });

    if (!proposal) {
      throw new NotFoundException("Agent proposal not found.");
    }

    if (!proposal.basePlanId && !proposal.expectedDayId) {
      return;
    }

    const snapshot = await this.appStore.getCurrentPlanSnapshot(actorId);
    const currentPlan = snapshot.plan;

    if (proposal.basePlanId) {
      if (!currentPlan || currentPlan.id !== proposal.basePlanId) {
        throw new ConflictException("The active plan has changed. Please regenerate the proposal.");
      }

      if (
        proposal.basePlanVersion !== null &&
        proposal.basePlanVersion !== undefined &&
        currentPlan.version !== proposal.basePlanVersion
      ) {
        throw new ConflictException("The active plan version has changed. Please regenerate the proposal.");
      }

      if (
        proposal.basePlanUpdatedAt &&
        new Date(currentPlan.updatedAt).getTime() !== proposal.basePlanUpdatedAt.getTime()
      ) {
        throw new ConflictException("The active plan has been updated since this proposal was created.");
      }
    }

    if (proposal.expectedDayId) {
      const currentDay = snapshot.days.find((day) => day.id === proposal.expectedDayId);
      if (!currentDay) {
        throw new ConflictException("The target plan day no longer exists. Please regenerate the proposal.");
      }

      if (
        proposal.expectedDayUpdatedAt &&
        currentDay.updatedAt &&
        new Date(currentDay.updatedAt).getTime() !== proposal.expectedDayUpdatedAt.getTime()
      ) {
        throw new ConflictException("The target plan day has changed. Please regenerate the proposal.");
      }
    }
  }

  private async dispatchAction(actionType: string, payload: Record<string, unknown>, userId: string) {
    switch (actionType) {
      case "generate_plan":
        return this.appStore.generatePlan(userId, typeof payload.goal === "string" ? payload.goal : "fat_loss");
      case "adjust_plan":
        return this.appStore.adjustPlan(userId, typeof payload.note === "string" ? payload.note : "Adjusted via agent");
      case "create_plan_day":
        return this.appStore.createCurrentPlanDay(
          {
            dayLabel: typeof payload.dayLabel === "string" ? payload.dayLabel : "New day",
            focus: typeof payload.focus === "string" ? payload.focus : "Planned session",
            duration: typeof payload.duration === "string" ? payload.duration : "45 min",
            exercises: normalizeArray(payload.exercises),
            recoveryTip: typeof payload.recoveryTip === "string" ? payload.recoveryTip : "Focus on recovery."
          },
          userId
        );
      case "update_plan_day":
        if (typeof payload.dayId !== "string") {
          throw new ConflictException("The proposal is missing the target day id.");
        }
        return this.appStore.updateCurrentPlanDay(
          payload.dayId,
          {
            dayLabel: typeof payload.dayLabel === "string" ? payload.dayLabel : undefined,
            focus: typeof payload.focus === "string" ? payload.focus : undefined,
            duration: typeof payload.duration === "string" ? payload.duration : undefined,
            exercises: Array.isArray(payload.exercises) ? normalizeArray(payload.exercises) : undefined,
            recoveryTip: typeof payload.recoveryTip === "string" ? payload.recoveryTip : undefined,
            isCompleted: typeof payload.isCompleted === "boolean" ? payload.isCompleted : undefined
          },
          userId
        );
      case "delete_plan_day":
        if (typeof payload.dayId !== "string") {
          throw new ConflictException("The proposal is missing the target day id.");
        }
        return this.appStore.deleteCurrentPlanDay(payload.dayId, userId);
      case "complete_plan_day":
        if (typeof payload.dayId === "string") {
          return this.appStore.updateCurrentPlanDay(payload.dayId, { isCompleted: payload.isCompleted !== false }, userId);
        }
        if (typeof payload.dayLabel === "string") {
          return this.appStore.completeSession(userId, payload.dayLabel);
        }
        throw new ConflictException("The proposal is missing the target day id or label.");
      case "create_body_metric":
        return this.appStore.addBodyMetric({
          userId,
          weightKg: Number(payload.weightKg ?? 0),
          bodyFatPct: payload.bodyFatPct === undefined ? undefined : Number(payload.bodyFatPct),
          waistCm: payload.waistCm === undefined ? undefined : Number(payload.waistCm)
        });
      case "create_daily_checkin":
        return this.appStore.addDailyCheckin({
          userId,
          sleepHours: Number(payload.sleepHours ?? 0),
          waterMl: Number(payload.waterMl ?? 0),
          steps: Number(payload.steps ?? 0),
          energyLevel: typeof payload.energyLevel === "string" ? payload.energyLevel : undefined,
          fatigueLevel: typeof payload.fatigueLevel === "string" ? payload.fatigueLevel : undefined,
          hungerLevel: typeof payload.hungerLevel === "string" ? payload.hungerLevel : undefined
        });
      case "create_workout_log":
        return this.appStore.addWorkoutLog({
          userId,
          workoutType: typeof payload.workoutType === "string" ? payload.workoutType : "general_workout",
          durationMin: Number(payload.durationMin ?? 0),
          intensity: typeof payload.intensity === "string" ? payload.intensity : "moderate",
          exerciseNote: typeof payload.exerciseNote === "string" ? payload.exerciseNote : undefined,
          completion: typeof payload.completion === "string" ? payload.completion : undefined,
          painFeedback: typeof payload.painFeedback === "string" ? payload.painFeedback : undefined,
          fatigueAfter: typeof payload.fatigueAfter === "string" ? payload.fatigueAfter : undefined
        });
      default:
        throw new ConflictException(`Unsupported action type: ${actionType}`);
    }
  }
}
