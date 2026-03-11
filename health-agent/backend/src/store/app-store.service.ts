import { Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface HealthProfileRecord {
  age?: number;
  gender?: string;
  heightCm?: number;
  currentWeightKg?: number;
  targetWeightKg?: number;
  activityLevel?: string;
  trainingExperience?: string;
  trainingDaysPerWeek?: number;
  equipmentAccess?: string;
  limitations?: string;
}

export interface BodyMetricRecord {
  userId: string;
  weightKg: number;
  bodyFatPct?: number;
  waistCm?: number;
}

export interface DailyCheckinRecord {
  userId: string;
  sleepHours: number;
  waterMl: number;
  steps: number;
  energyLevel?: string;
  fatigueLevel?: string;
  hungerLevel?: string;
}

export interface WorkoutLogRecord {
  userId: string;
  workoutType: string;
  durationMin: number;
  intensity: string;
  exerciseNote?: string;
  completion?: string;
  painFeedback?: string;
  fatigueAfter?: string;
}

export interface WorkoutPlanDayRecord {
  dayLabel: string;
  focus: string;
  duration: string;
  exercises: string[];
  recoveryTip: string;
}

function basePlanDays(): WorkoutPlanDayRecord[] {
  return [
    {
      dayLabel: "Monday",
      focus: "Upper body strength + core",
      duration: "55 min",
      exercises: ["Bench press 4x8", "Lat pulldown 4x10", "DB shoulder press 3x10", "Plank 3 rounds"],
      recoveryTip: "Hydrate after training and stretch the upper body at night"
    },
    {
      dayLabel: "Tuesday",
      focus: "Low-intensity cardio + recovery",
      duration: "35 min",
      exercises: ["Incline walk 35 min", "Hip mobility 8 min"],
      recoveryTip: "Prioritize sleep and keep total steps up"
    },
    {
      dayLabel: "Wednesday",
      focus: "Knee-friendly lower body",
      duration: "50 min",
      exercises: ["Box squat 4x8", "Romanian deadlift 4x10", "Glute bridge 3x12"],
      recoveryTip: "Reduce squat depth if the knee feels irritated"
    }
  ];
}

@Injectable()
export class AppStoreService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seed();
  }

  async seed() {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: "demo@health-agent.local" }
    });

    if (existingUser) {
      return;
    }

    const user = await this.prisma.user.create({
      data: {
        email: "demo@health-agent.local",
        passwordHash: "demo-password",
        healthProfile: {
          create: {
            age: 28,
            heightCm: 176,
            currentWeightKg: 72.4,
            targetWeightKg: 67,
            activityLevel: "moderate",
            trainingExperience: "novice",
            trainingDaysPerWeek: 4,
            equipmentAccess: "commercial_gym",
            limitations: "mild knee discomfort"
          }
        }
      }
    });

    await this.prisma.bodyMetricLog.create({
      data: {
        userId: user.id,
        weightKg: 72.4,
        bodyFatPct: 18.1,
        waistCm: 82
      }
    });

    await this.prisma.dailyCheckin.create({
      data: {
        userId: user.id,
        sleepHours: 6.2,
        waterMl: 2200,
        steps: 7250,
        fatigueLevel: "moderate",
        energyLevel: "medium"
      }
    });

    await this.prisma.workoutLog.create({
      data: {
        userId: user.id,
        workoutType: "lower_body_strength",
        durationMin: 58,
        intensity: "moderate",
        exerciseNote: "Goblet squat, leg press, RDL, walking lunges",
        completion: "completed",
        fatigueAfter: "high",
        painFeedback: "left knee mildly sore"
      }
    });

    await this.prisma.workoutPlan.create({
      data: {
        userId: user.id,
        title: "Fat loss starter week",
        goal: "fat_loss",
        weekOf: new Date(),
        version: 1,
        status: "active",
        days: {
          create: basePlanDays().map((day) => ({
            dayLabel: day.dayLabel,
            focus: day.focus,
            duration: day.duration,
            exercises: day.exercises as unknown as Prisma.JsonArray,
            recoveryTip: day.recoveryTip
          }))
        }
      }
    });

    await this.prisma.exercise.createMany({
      data: [
        {
          id: "goblet-squat",
          name: "Goblet squat",
          targetMuscles: ["quads", "glutes", "core"],
          equipment: "dumbbell/kettlebell",
          level: "novice",
          steps: ["Brace", "Sit down between hips", "Drive through mid-foot"],
          commonMistakes: ["Knees collapsing", "Chest dropping"],
          contraindicates: ["Irritated knee if depth is too aggressive"],
          recoveryNotes: ["Use a box if knee tolerance is poor"]
        },
        {
          id: "lat-pulldown",
          name: "Lat pulldown",
          targetMuscles: ["lats", "biceps"],
          equipment: "cable machine",
          level: "novice_intermediate",
          steps: ["Set shoulders down", "Pull to upper chest", "Control the return"],
          commonMistakes: ["Shrugging", "Pulling behind the neck"],
          contraindicates: ["Shoulder irritation without control"],
          recoveryNotes: ["Lower the load if shoulder fatigue is high"]
        },
        {
          id: "incline-walk",
          name: "Incline walk",
          targetMuscles: ["cardio", "calves", "glutes"],
          equipment: "treadmill",
          level: "all",
          steps: ["Keep a sustainable pace", "Stay in conversational effort"],
          commonMistakes: ["Holding the rails", "Going too hard on recovery days"],
          contraindicates: ["Acute ankle pain"],
          recoveryNotes: ["Useful on low-intensity days"]
        }
      ],
      skipDuplicates: true
    });
  }

  async createUser(email: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      return existing;
    }

    return this.prisma.user.create({
      data: {
        email,
        passwordHash: password,
        healthProfile: {
          create: {}
        }
      }
    });
  }

  async authenticate(email: string, password: string) {
    return this.prisma.user.findFirst({
      where: {
        email,
        passwordHash: password
      }
    });
  }

  async getUser(userId?: string) {
    const user = await this.prisma.user.findFirst({
      where: userId ? { id: userId } : { email: "demo@health-agent.local" },
      include: {
        healthProfile: true
      }
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  async getProfile(userId?: string) {
    const user = await this.getUser(userId);
    return user.healthProfile;
  }

  async updateProfile(userId: string, payload: Partial<HealthProfileRecord>) {
    return this.prisma.healthProfile.upsert({
      where: { userId },
      update: payload,
      create: {
        userId,
        ...payload
      }
    });
  }

  async addBodyMetric(payload: BodyMetricRecord) {
    return this.prisma.bodyMetricLog.create({
      data: {
        userId: payload.userId,
        weightKg: payload.weightKg,
        bodyFatPct: payload.bodyFatPct,
        waistCm: payload.waistCm
      }
    });
  }

  async getBodyMetrics(userId?: string) {
    const user = await this.getUser(userId);
    return this.prisma.bodyMetricLog.findMany({
      where: { userId: user.id },
      orderBy: { recordedAt: "desc" }
    });
  }

  async addDailyCheckin(payload: DailyCheckinRecord) {
    return this.prisma.dailyCheckin.create({
      data: payload
    });
  }

  async getDailyCheckins(userId?: string) {
    const user = await this.getUser(userId);
    return this.prisma.dailyCheckin.findMany({
      where: { userId: user.id },
      orderBy: { recordedAt: "desc" }
    });
  }

  async addWorkoutLog(payload: WorkoutLogRecord) {
    return this.prisma.workoutLog.create({
      data: payload
    });
  }

  async getWorkoutLogs(userId?: string) {
    const user = await this.getUser(userId);
    return this.prisma.workoutLog.findMany({
      where: { userId: user.id },
      orderBy: { recordedAt: "desc" }
    });
  }

  async getCurrentPlan(userId?: string) {
    const user = await this.getUser(userId);
    return this.prisma.workoutPlan.findFirst({
      where: { userId: user.id, status: "active" },
      include: {
        days: {
          orderBy: { dayLabel: "asc" }
        }
      }
    });
  }

  async generatePlan(userId: string, goal = "fat_loss") {
    await this.prisma.workoutPlan.updateMany({
      where: { userId, status: "active" },
      data: { status: "archived" }
    });

    return this.prisma.workoutPlan.create({
      data: {
        userId,
        title: "Generated weekly plan",
        goal,
        weekOf: new Date(),
        version: 1,
        status: "active",
        days: {
          create: [
            {
              dayLabel: "Monday",
              focus: "Full body strength",
              duration: "50 min",
              exercises: ["Goblet squat 4x8", "DB bench 4x10", "Lat pulldown 4x10"] as unknown as Prisma.JsonArray,
              recoveryTip: "Stretch the lower body and upper back after training"
            },
            {
              dayLabel: "Wednesday",
              focus: "Cardio + core",
              duration: "40 min",
              exercises: ["Incline walk 30 min", "Dead bug 3x12", "Plank 3x30 sec"] as unknown as Prisma.JsonArray,
              recoveryTip: "Aim for at least 9000 steps on this day"
            },
            {
              dayLabel: "Friday",
              focus: "Upper body + glute assistance",
              duration: "55 min",
              exercises: ["Seated row 4x10", "DB shoulder press 3x10", "Glute bridge 3x12"] as unknown as Prisma.JsonArray,
              recoveryTip: "Drop one assistance movement if sleep is poor"
            }
          ]
        }
      },
      include: { days: true }
    });
  }

  async adjustPlan(userId: string, note: string) {
    const current = await this.getCurrentPlan(userId);
    if (!current) {
      throw new NotFoundException("Plan not found");
    }

    await this.prisma.workoutPlan.update({
      where: { id: current.id },
      data: { version: { increment: 1 } }
    });

    const adjustableDay = current.days[1];
    if (adjustableDay) {
      await this.prisma.workoutPlanDay.update({
        where: { id: adjustableDay.id },
        data: {
          focus: `${adjustableDay.focus} (adjusted)`,
          recoveryTip: `${adjustableDay.recoveryTip}; adjustment note: ${note}`
        }
      });
    }

    return this.getCurrentPlan(userId);
  }

  async completeSession(userId: string, dayLabel: string) {
    return {
      ok: true,
      userId,
      dayLabel,
      completedAt: new Date().toISOString()
    };
  }

  async getExercises() {
    return this.prisma.exercise.findMany({
      orderBy: { name: "asc" }
    });
  }

  async getDashboard(userId?: string) {
    const user = await this.getUser(userId);
    const [metrics, checkins, workouts] = await Promise.all([
      this.prisma.bodyMetricLog.findMany({
        where: { userId: user.id },
        orderBy: { recordedAt: "desc" },
        take: 14
      }),
      this.prisma.dailyCheckin.findMany({
        where: { userId: user.id },
        orderBy: { recordedAt: "desc" },
        take: 7
      }),
      this.prisma.workoutLog.findMany({
        where: { userId: user.id },
        orderBy: { recordedAt: "desc" },
        take: 7
      })
    ]);

    return {
      weightTrend: metrics.length > 0 ? "Weight trend available from recent logs" : "No weight data yet",
      weeklyCompletionRate: workouts.length > 0 ? `${Math.min(workouts.length * 25, 100)}% weekly completion` : "No workout logs yet",
      todayFocus:
        checkins.length > 0
          ? "Protect recovery first, then decide whether to add extra training"
          : "Log today's state first",
      recoveryStatus:
        checkins.length > 0 && checkins[0].sleepHours < 7
          ? "Recent sleep is low; prioritize recovery"
          : "Recovery status looks manageable",
      advice: [
        {
          type: "recovery",
          priority: "medium",
          summary: "Recent fatigue signals suggest protecting recovery before adding volume.",
          actionItems: ["Do 30-40 minutes of easy cardio", "Sleep at least 7 hours", "Trim one lower-body accessory if needed"]
        }
      ]
    };
  }
}
