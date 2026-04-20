import * as assert from "node:assert/strict";
import { test } from "node:test";
import { ConflictException } from "@nestjs/common";
import { AgentStateService } from "../src/services/agent-state.service";
import { getProposalActionState } from "../../frontend/lib/proposal-state";

function makeProposal(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-04-20T12:00:00.000Z");
  return {
    id: "proposal-1",
    threadId: "thread-1",
    runId: "run-1",
    userId: "user-1",
    status: "pending",
    actionType: "update_plan_day",
    entityType: "workout_plan_day",
    entityId: "day-1",
    title: "Update plan day",
    summary: "Change Wednesday to recovery walk.",
    payload: { dayId: "day-1", focus: "Recovery walk" },
    preview: { dayLabel: "Wednesday", nextFocus: "Recovery walk" },
    riskLevel: "medium",
    requiresConfirmation: true,
    expiresAt: new Date("2026-04-20T14:00:00.000Z"),
    executedAt: null,
    basePlanId: null,
    basePlanVersion: null,
    basePlanUpdatedAt: null,
    expectedDayId: null,
    expectedDayUpdatedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function createService() {
  const prisma = {
    agentActionProposal: {
      updateMany: async () => ({ count: 1 }),
      findUniqueOrThrow: async () => makeProposal({ status: "approved" }),
      findUnique: async () => makeProposal({ status: "approved" }),
      findFirst: async () => makeProposal()
    },
    agentActionExecution: {
      findUnique: async () => null
    },
    $transaction: async (input: unknown) => {
      if (typeof input === "function") {
        return input(prisma);
      }

      return Promise.all(input as Promise<unknown>[]);
    }
  };

  const appStore = {
    getUser: async (userId?: string) => ({ id: userId ?? "user-1" }),
    getCurrentPlanSnapshot: async () => ({
      plan: {
        id: "plan-1",
        title: "Current plan",
        goal: "fat_loss",
        status: "active",
        version: 1,
        weekOf: "2026-04-20T00:00:00.000Z",
        createdAt: "2026-04-20T00:00:00.000Z",
        updatedAt: "2026-04-20T00:00:00.000Z"
      },
      days: [
        {
          id: "day-1",
          dayLabel: "Wednesday",
          focus: "Lower body",
          duration: "45 min",
          exercises: ["Squat"],
          recoveryTip: "Stretch",
          isCompleted: false,
          sortOrder: 0,
          updatedAt: "2026-04-20T00:00:00.000Z"
        }
      ]
    })
  };

  return {
    prisma,
    appStore,
    service: new AgentStateService(prisma as never, appStore as never)
  };
}

test("confirmProposal resumes execution when the proposal is already approved", async () => {
  const { service, prisma } = createService();

  (service as any).getProposalForActor = async () => ({
    actor: { id: "user-1" },
    proposal: makeProposal({ status: "approved", actionType: "update_plan_day" })
  });

  let findCount = 0;
  prisma.agentActionProposal.findUniqueOrThrow = async () => {
    findCount += 1;
    return findCount === 1
      ? makeProposal({ status: "approved", actionType: "update_plan_day" })
      : makeProposal({ status: "executed", actionType: "update_plan_day", executedAt: new Date("2026-04-20T12:30:00.000Z") });
  };

  (service as any).executeApprovedProposal = async () => ({
    ok: true,
    status: "succeeded",
    result: { ok: true, id: "day-1" }
  });

  const result = await service.confirmProposal("proposal-1", "idem-1", "user-1");

  assert.equal(result.execution.ok, true);
  assert.equal(result.execution.status, "succeeded");
  assert.equal(result.proposal.status, "executed");
});

test("confirmProposal rejects terminal proposal states", async () => {
  const { service } = createService();

  (service as any).getProposalForActor = async () => ({
    actor: { id: "user-1" },
    proposal: makeProposal({ status: "rejected" })
  });

  await assert.rejects(
    () => service.confirmProposal("proposal-1", "idem-1", "user-1"),
    (error: unknown) => error instanceof ConflictException && error.message.includes("can no longer be confirmed")
  );
});

test("assertProposalFresh fails when the active plan has changed", async () => {
  const { service, prisma, appStore } = createService();

  prisma.agentActionProposal.findUnique = async () =>
    makeProposal({
      basePlanId: "plan-old",
      basePlanVersion: 1,
      basePlanUpdatedAt: new Date("2026-04-20T00:00:00.000Z")
    });

  appStore.getCurrentPlanSnapshot = async () => ({
    plan: {
      id: "plan-new",
      title: "Replacement plan",
      goal: "fat_loss",
      status: "active",
      version: 2,
      weekOf: "2026-04-20T00:00:00.000Z",
      createdAt: "2026-04-20T00:00:00.000Z",
      updatedAt: "2026-04-20T01:00:00.000Z"
    },
    days: []
  });

  await assert.rejects(
    () => (service as any).assertProposalFresh("proposal-1", "user-1"),
    (error: unknown) => error instanceof ConflictException && error.message.includes("active plan has changed")
  );
});

test("proposal action state exposes resumable approved proposals", () => {
  assert.deepEqual(getProposalActionState("pending"), {
    canAct: true,
    canReject: true,
    approveLabel: "确认执行",
    rejectLabel: "拒绝"
  });

  assert.deepEqual(getProposalActionState("approved"), {
    canAct: true,
    canReject: false,
    approveLabel: "继续执行",
    rejectLabel: "已锁定"
  });

  assert.deepEqual(getProposalActionState("executed"), {
    canAct: false,
    canReject: false,
    approveLabel: "已结束",
    rejectLabel: "已结束"
  });
});
