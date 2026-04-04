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

export interface DietMacroTargetRecord {
  target: number;
  recommend: number;
  remaining: number;
}

export interface DietFoodNutritionRecord {
  protein: number;
  carbohydrate: number;
  fat: number;
  fiber?: number;
}

export interface DietFoodReplacementRecord {
  name: string;
  weight: number;
  calorie: number;
  cooking: string;
  nutrition: DietFoodNutritionRecord;
}

export interface DietFoodRecord {
  name: string;
  weight: number;
  calorie: number;
  cooking: string;
  nutrition: DietFoodNutritionRecord;
  replaceable: DietFoodReplacementRecord[];
}

export interface DietMealRecord {
  mealType: "breakfast" | "lunch" | "dinner";
  totalCalorie: number;
  foods: DietFoodRecord[];
}

export interface DietRecommendationRecord {
  id: string;
  date: string;
  userGoal: string;
  totalCalorie: number;
  targetCalorie: number;
  nutritionRatio: {
    carbohydrate: number;
    protein: number;
    fat: number;
  };
  nutritionDetail: {
    protein: DietMacroTargetRecord;
    carbohydrate: DietMacroTargetRecord;
    fat: DietMacroTargetRecord;
    fiber: DietMacroTargetRecord;
  };
  meals: DietMealRecord[];
  agentTips: string[];
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

function normalizeDateToDay(input: Date) {
  const normalized = new Date(input);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function addDays(input: Date, amount: number) {
  const next = new Date(input);
  next.setDate(next.getDate() + amount);
  return next;
}

function roundNutrition(value: number) {
  return Math.round(value * 10) / 10;
}

function buildDietRecommendationFallback(date = new Date()): Omit<DietRecommendationRecord, "id"> {
  return {
    date: normalizeDateToDay(date).toISOString(),
    userGoal: "fat_loss",
    totalCalorie: 1710,
    targetCalorie: 1900,
    nutritionRatio: {
      carbohydrate: 43,
      protein: 33,
      fat: 24
    },
    nutritionDetail: {
      protein: { target: 145, recommend: 142, remaining: 3 },
      carbohydrate: { target: 210, recommend: 186, remaining: 24 },
      fat: { target: 56, recommend: 46, remaining: 10 },
      fiber: { target: 28, recommend: 26, remaining: 2 }
    },
    meals: [
      {
        mealType: "breakfast",
        totalCalorie: 460,
        foods: [
          {
            name: "Greek yogurt bowl",
            weight: 320,
            calorie: 260,
            cooking: "cold prep",
            nutrition: { protein: 24, carbohydrate: 32, fat: 6, fiber: 5 },
            replaceable: [
              {
                name: "soy yogurt bowl",
                weight: 300,
                calorie: 240,
                cooking: "cold prep",
                nutrition: { protein: 20, carbohydrate: 30, fat: 7, fiber: 6 }
              }
            ]
          },
          {
            name: "oats",
            weight: 55,
            calorie: 200,
            cooking: "boiled",
            nutrition: { protein: 8, carbohydrate: 28, fat: 5, fiber: 4 },
            replaceable: [
              {
                name: "whole-grain toast",
                weight: 90,
                calorie: 190,
                cooking: "toasted",
                nutrition: { protein: 7, carbohydrate: 31, fat: 3, fiber: 4 }
              }
            ]
          }
        ]
      },
      {
        mealType: "lunch",
        totalCalorie: 640,
        foods: [
          {
            name: "chicken breast",
            weight: 160,
            calorie: 260,
            cooking: "pan seared",
            nutrition: { protein: 42, carbohydrate: 0, fat: 8, fiber: 0 },
            replaceable: [
              {
                name: "shrimp",
                weight: 170,
                calorie: 220,
                cooking: "steamed",
                nutrition: { protein: 40, carbohydrate: 2, fat: 3, fiber: 0 }
              }
            ]
          },
          {
            name: "brown rice",
            weight: 180,
            calorie: 220,
            cooking: "steamed",
            nutrition: { protein: 5, carbohydrate: 46, fat: 2, fiber: 3 },
            replaceable: [
              {
                name: "sweet potato",
                weight: 210,
                calorie: 210,
                cooking: "roasted",
                nutrition: { protein: 4, carbohydrate: 43, fat: 1, fiber: 6 }
              }
            ]
          },
          {
            name: "broccoli",
            weight: 180,
            calorie: 160,
            cooking: "steamed",
            nutrition: { protein: 10, carbohydrate: 18, fat: 2, fiber: 7 },
            replaceable: [
              {
                name: "asparagus",
                weight: 180,
                calorie: 90,
                cooking: "grilled",
                nutrition: { protein: 8, carbohydrate: 10, fat: 1, fiber: 5 }
              }
            ]
          }
        ]
      },
      {
        mealType: "dinner",
        totalCalorie: 610,
        foods: [
          {
            name: "salmon",
            weight: 150,
            calorie: 300,
            cooking: "oven baked",
            nutrition: { protein: 34, carbohydrate: 0, fat: 18, fiber: 0 },
            replaceable: [
              {
                name: "lean beef",
                weight: 140,
                calorie: 280,
                cooking: "stir fried",
                nutrition: { protein: 31, carbohydrate: 0, fat: 16, fiber: 0 }
              }
            ]
          },
          {
            name: "quinoa",
            weight: 160,
            calorie: 190,
            cooking: "boiled",
            nutrition: { protein: 7, carbohydrate: 33, fat: 3, fiber: 4 },
            replaceable: [
              {
                name: "corn",
                weight: 180,
                calorie: 180,
                cooking: "steamed",
                nutrition: { protein: 6, carbohydrate: 34, fat: 2, fiber: 4 }
              }
            ]
          },
          {
            name: "mixed greens",
            weight: 170,
            calorie: 120,
            cooking: "olive oil toss",
            nutrition: { protein: 5, carbohydrate: 14, fat: 4, fiber: 7 },
            replaceable: [
              {
                name: "spinach salad",
                weight: 170,
                calorie: 105,
                cooking: "light dressing",
                nutrition: { protein: 5, carbohydrate: 11, fat: 4, fiber: 6 }
              }
            ]
          }
        ]
      }
    ],
    agentTips: [
      "Keep lunch as the highest-volume meal to improve afternoon satiety.",
      "Prioritize the dinner protein serving within 60 minutes after training.",
      "If hunger rises at night, add low-calorie vegetables before increasing carbs."
    ]
  };
}

function isDietFoodNutrition(value: unknown): value is DietFoodNutritionRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const nutrition = value as Record<string, unknown>;
  return (
    typeof nutrition.protein === "number" &&
    nutrition.protein >= 0 &&
    typeof nutrition.carbohydrate === "number" &&
    nutrition.carbohydrate >= 0 &&
    typeof nutrition.fat === "number" &&
    nutrition.fat >= 0 &&
    (nutrition.fiber === undefined || (typeof nutrition.fiber === "number" && nutrition.fiber >= 0))
  );
}

function isDietMacroTarget(value: unknown): value is DietMacroTargetRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const target = value as Record<string, unknown>;
  return (
    typeof target.target === "number" &&
    typeof target.recommend === "number" &&
    typeof target.remaining === "number"
  );
}

function isDietFoodReplacement(value: unknown): value is DietFoodReplacementRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const food = value as Record<string, unknown>;
  return (
    typeof food.name === "string" &&
    typeof food.weight === "number" &&
    typeof food.calorie === "number" &&
    typeof food.cooking === "string" &&
    isDietFoodNutrition(food.nutrition)
  );
}

function isDietFood(value: unknown): value is DietFoodRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const food = value as Record<string, unknown>;
  const replacements = food.replaceable;
  return (
    typeof food.name === "string" &&
    typeof food.weight === "number" &&
    typeof food.calorie === "number" &&
    typeof food.cooking === "string" &&
    isDietFoodNutrition(food.nutrition) &&
    Array.isArray(replacements) &&
    replacements.every(isDietFoodReplacement)
  );
}

function isDietMeal(value: unknown): value is DietMealRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const meal = value as Record<string, unknown>;
  return (
    (meal.mealType === "breakfast" || meal.mealType === "lunch" || meal.mealType === "dinner") &&
    typeof meal.totalCalorie === "number" &&
    Array.isArray(meal.foods) &&
    meal.foods.every(isDietFood)
  );
}

function normalizeNutritionRatio(ratio: DietRecommendationRecord["nutritionRatio"]) {
  const total = ratio.carbohydrate + ratio.protein + ratio.fat;
  if (total <= 0) {
    return null;
  }

  const normalized = {
    carbohydrate: Math.round((ratio.carbohydrate / total) * 100),
    protein: Math.round((ratio.protein / total) * 100),
    fat: 0
  };

  normalized.fat = Math.max(0, 100 - normalized.carbohydrate - normalized.protein);
  return normalized;
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
      await this.seedDietRecommendation(existingUser.id);
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
            exercises: day.exercises,
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

    await this.seedDietRecommendation(user.id);
  }

  private async seedDietRecommendation(userId: string) {
    const date = normalizeDateToDay(new Date());
    const fallback = buildDietRecommendationFallback(date);

    await this.prisma.dietRecommendationSnapshot.upsert({
      where: {
        userId_date: {
          userId,
          date
        }
      },
      update: {
        userGoal: fallback.userGoal,
        totalCalorie: fallback.totalCalorie,
        targetCalorie: fallback.targetCalorie,
        nutritionRatio: fallback.nutritionRatio as unknown as Prisma.InputJsonObject,
        nutritionDetail: fallback.nutritionDetail as unknown as Prisma.InputJsonObject,
        meals: fallback.meals as unknown as Prisma.InputJsonArray,
        agentTips: fallback.agentTips
      },
      create: {
        userId,
        date,
        userGoal: fallback.userGoal,
        totalCalorie: fallback.totalCalorie,
        targetCalorie: fallback.targetCalorie,
        nutritionRatio: fallback.nutritionRatio as unknown as Prisma.InputJsonObject,
        nutritionDetail: fallback.nutritionDetail as unknown as Prisma.InputJsonObject,
        meals: fallback.meals as unknown as Prisma.InputJsonArray,
        agentTips: fallback.agentTips
      }
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
              exercises: ["Goblet squat 4x8", "DB bench 4x10", "Lat pulldown 4x10"],
              recoveryTip: "Stretch the lower body and upper back after training"
            },
            {
              dayLabel: "Wednesday",
              focus: "Cardio + core",
              duration: "40 min",
              exercises: ["Incline walk 30 min", "Dead bug 3x12", "Plank 3x30 sec"],
              recoveryTip: "Aim for at least 9000 steps on this day"
            },
            {
              dayLabel: "Friday",
              focus: "Upper body + glute assistance",
              duration: "55 min",
              exercises: ["Seated row 4x10", "DB shoulder press 3x10", "Glute bridge 3x12"],
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

  private mapDietRecommendationRecord(
    snapshot: {
      id: string;
      date: Date;
      userGoal: string;
      totalCalorie: number;
      targetCalorie: number;
      nutritionRatio: unknown;
      nutritionDetail: unknown;
      meals: unknown;
      agentTips: string[];
    } | null
  ): DietRecommendationRecord | null {
    if (!snapshot) {
      return null;
    }

    if (
      !snapshot.nutritionRatio ||
      typeof snapshot.nutritionRatio !== "object" ||
      !snapshot.nutritionDetail ||
      typeof snapshot.nutritionDetail !== "object" ||
      !Array.isArray(snapshot.meals)
    ) {
      return null;
    }

    const ratioCandidate = snapshot.nutritionRatio as Record<string, unknown>;
    const detailCandidate = snapshot.nutritionDetail as Record<string, unknown>;
    if (
      typeof ratioCandidate.carbohydrate !== "number" ||
      ratioCandidate.carbohydrate < 0 ||
      typeof ratioCandidate.protein !== "number" ||
      ratioCandidate.protein < 0 ||
      typeof ratioCandidate.fat !== "number" ||
      ratioCandidate.fat < 0
    ) {
      return null;
    }

    if (
      !isDietMacroTarget(detailCandidate.protein) ||
      !isDietMacroTarget(detailCandidate.carbohydrate) ||
      !isDietMacroTarget(detailCandidate.fat) ||
      !isDietMacroTarget(detailCandidate.fiber)
    ) {
      return null;
    }

    if (!snapshot.meals.every(isDietMeal)) {
      return null;
    }

    const normalizedRatio = normalizeNutritionRatio({
      carbohydrate: ratioCandidate.carbohydrate,
      protein: ratioCandidate.protein,
      fat: ratioCandidate.fat
    });

    if (!normalizedRatio) {
      return null;
    }

    return {
      id: snapshot.id,
      date: snapshot.date.toISOString(),
      userGoal: snapshot.userGoal,
      totalCalorie: snapshot.totalCalorie,
      targetCalorie: snapshot.targetCalorie,
      nutritionRatio: normalizedRatio,
      nutritionDetail: {
        protein: detailCandidate.protein,
        carbohydrate: detailCandidate.carbohydrate,
        fat: detailCandidate.fat,
        fiber: detailCandidate.fiber
      },
      meals: snapshot.meals,
      agentTips: Array.isArray(snapshot.agentTips) ? snapshot.agentTips.filter((item) => typeof item === "string") : []
    };
  }

  async getTodayDietRecommendation(userId?: string): Promise<DietRecommendationRecord> {
    const user = await this.getUser(userId);
    const today = normalizeDateToDay(new Date());
    const tomorrow = addDays(today, 1);

    const snapshot = await this.prisma.dietRecommendationSnapshot.findFirst({
      where: {
        userId: user.id,
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      orderBy: { date: "desc" }
    });

    const mapped = this.mapDietRecommendationRecord(snapshot);
    if (mapped) {
      return mapped;
    }

    const fallback = buildDietRecommendationFallback(today);
    return {
      id: "diet-fallback",
      ...fallback
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
