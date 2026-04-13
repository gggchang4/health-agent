import { Injectable, Logger, NotFoundException } from "@nestjs/common";
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

function normalizeDateToDay(input: Date) {
  const result = new Date(input);
  result.setHours(0, 0, 0, 0);
  return result;
}

function buildPlanDays() {
  return [
    {
      dayLabel: "Monday",
      focus: "Upper body strength + core",
      duration: "55 min",
      exercises: ["Bench press 4x8", "Lat pulldown 4x10", "DB shoulder press 3x10", "Plank 3 rounds"],
      recoveryTip: "Hydrate after training and stretch the upper body before bed."
    },
    {
      dayLabel: "Wednesday",
      focus: "Knee-friendly lower body",
      duration: "50 min",
      exercises: ["Box squat 4x8", "Romanian deadlift 4x10", "Glute bridge 3x12"],
      recoveryTip: "Reduce squat depth and keep the day submaximal if the knee feels irritated."
    },
    {
      dayLabel: "Friday",
      focus: "Low-intensity cardio + core",
      duration: "40 min",
      exercises: ["Incline walk 30 min", "Dead bug 3x12", "Side plank 3x30 sec"],
      recoveryTip: "Prioritize total steps and avoid adding extra fatigue."
    },
    {
      dayLabel: "Sunday",
      focus: "Full-body consistency session",
      duration: "50 min",
      exercises: ["Goblet squat 4x10", "Seated row 4x10", "Push-up 3x12", "Hip mobility 8 min"],
      recoveryTip: "Keep 1-2 reps in reserve on every movement."
    }
  ];
}

@Injectable()
export class AppStoreService {
  private readonly logger = new Logger(AppStoreService.name);

  constructor(private readonly prisma: PrismaService) {}

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
    const user = userId
      ? await this.prisma.user.findUnique({
          where: { id: userId },
          include: { healthProfile: true }
        })
      : await this.prisma.user.findFirst({
          include: { healthProfile: true },
          orderBy: { createdAt: "asc" }
        });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    this.logger.log(
      `Loaded user from PostgreSQL id=${user.id} email=${user.email} via ${userId ? "explicit user header" : "default DB user"}`
    );

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
    const metrics = await this.prisma.bodyMetricLog.findMany({
      where: { userId: user.id },
      orderBy: { recordedAt: "desc" }
    });
    this.logger.log(`Loaded ${metrics.length} body metric record(s) from PostgreSQL for user=${user.id}`);
    return metrics;
  }

  async addDailyCheckin(payload: DailyCheckinRecord) {
    return this.prisma.dailyCheckin.create({
      data: payload
    });
  }

  async getDailyCheckins(userId?: string) {
    const user = await this.getUser(userId);
    const checkins = await this.prisma.dailyCheckin.findMany({
      where: { userId: user.id },
      orderBy: { recordedAt: "desc" }
    });
    this.logger.log(`Loaded ${checkins.length} daily check-in record(s) from PostgreSQL for user=${user.id}`);
    return checkins;
  }

  async addWorkoutLog(payload: WorkoutLogRecord) {
    return this.prisma.workoutLog.create({
      data: payload
    });
  }

  async getWorkoutLogs(userId?: string) {
    const user = await this.getUser(userId);
    const logs = await this.prisma.workoutLog.findMany({
      where: { userId: user.id },
      orderBy: { recordedAt: "desc" }
    });
    this.logger.log(`Loaded ${logs.length} workout log record(s) from PostgreSQL for user=${user.id}`);
    return logs;
  }

  async getCurrentPlan(userId?: string) {
    const user = await this.getUser(userId);
    const plan = await this.prisma.workoutPlan.findFirst({
      where: { userId: user.id, status: "active" },
      include: {
        days: {
          orderBy: { dayLabel: "asc" }
        }
      }
    });
    this.logger.log(
      `Loaded current workout plan from PostgreSQL for user=${user.id} found=${plan ? "yes" : "no"}`
    );
    return plan;
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
        weekOf: normalizeDateToDay(new Date()),
        version: 1,
        status: "active",
        days: {
          create: buildPlanDays().map((day) => ({
            dayLabel: day.dayLabel,
            focus: day.focus,
            duration: day.duration,
            exercises: day.exercises,
            recoveryTip: day.recoveryTip
          }))
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
    const exercises = await this.prisma.exercise.findMany({
      orderBy: { name: "asc" }
    });
    this.logger.log(`Loaded ${exercises.length} exercise record(s) from PostgreSQL.`);
    return exercises;
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

    this.logger.log(
      `Loaded dashboard source data from PostgreSQL for user=${user.id} metrics=${metrics.length} checkins=${checkins.length} workouts=${workouts.length}`
    );

    return {
      weightTrend: metrics.length > 0 ? "Weight trend available from recent logs" : "No weight data yet",
      weeklyCompletionRate:
        workouts.length > 0 ? `${Math.min(workouts.length * 25, 100)}% weekly completion` : "No workout logs yet",
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

  async getTodayDietRecommendation(userId?: string) {
    const user = await this.getUser(userId);
    const today = normalizeDateToDay(new Date());

    const snapshot = await this.prisma.dietRecommendationSnapshot.findFirst({
      where: {
        userId: user.id,
        date: today
      },
      orderBy: { date: "desc" }
    });

    if (!snapshot) {
      throw new NotFoundException("Today's diet recommendation was not found in the database.");
    }

    this.logger.log(`Loaded today's diet recommendation from PostgreSQL for user=${user.id}`);

    return snapshot;
  }
}
