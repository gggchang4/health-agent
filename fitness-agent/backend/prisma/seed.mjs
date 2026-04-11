import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const demoEmail = "demo@health-agent.local";
const today = new Date();
today.setHours(0, 0, 0, 0);

const addDays = (input, amount) => {
  const next = new Date(input);
  next.setDate(next.getDate() + amount);
  return next;
};

async function seedUserAndProfile() {
  const user = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {
      passwordHash: "demo-password"
    },
    create: {
      email: demoEmail,
      passwordHash: "demo-password"
    }
  });

  await prisma.healthProfile.upsert({
    where: { userId: user.id },
    update: {
      age: 27,
      gender: "male",
      heightCm: 176,
      currentWeightKg: 72.4,
      targetWeightKg: 67,
      activityLevel: "moderate",
      trainingExperience: "novice",
      trainingDaysPerWeek: 4,
      equipmentAccess: "commercial_gym",
      limitations: "mild knee discomfort after heavy squat days"
    },
    create: {
      userId: user.id,
      age: 27,
      gender: "male",
      heightCm: 176,
      currentWeightKg: 72.4,
      targetWeightKg: 67,
      activityLevel: "moderate",
      trainingExperience: "novice",
      trainingDaysPerWeek: 4,
      equipmentAccess: "commercial_gym",
      limitations: "mild knee discomfort after heavy squat days"
    }
  });

  return user;
}

async function seedBodyMetrics(userId) {
  await prisma.bodyMetricLog.deleteMany({ where: { userId } });

  await prisma.bodyMetricLog.createMany({
    data: [
      { userId, weightKg: 73.6, bodyFatPct: 19.6, waistCm: 84, recordedAt: addDays(today, -21) },
      { userId, weightKg: 73.0, bodyFatPct: 19.1, waistCm: 83.5, recordedAt: addDays(today, -14) },
      { userId, weightKg: 72.7, bodyFatPct: 18.7, waistCm: 82.8, recordedAt: addDays(today, -7) },
      { userId, weightKg: 72.4, bodyFatPct: 18.2, waistCm: 82, recordedAt: addDays(today, -1) }
    ]
  });
}

async function seedDailyCheckins(userId) {
  await prisma.dailyCheckin.deleteMany({ where: { userId } });

  await prisma.dailyCheckin.createMany({
    data: [
      {
        userId,
        sleepHours: 7.3,
        waterMl: 2300,
        steps: 9200,
        energyLevel: "high",
        fatigueLevel: "low",
        hungerLevel: "normal",
        recordedAt: addDays(today, -3)
      },
      {
        userId,
        sleepHours: 6.7,
        waterMl: 2100,
        steps: 8100,
        energyLevel: "medium",
        fatigueLevel: "moderate",
        hungerLevel: "normal",
        recordedAt: addDays(today, -2)
      },
      {
        userId,
        sleepHours: 6.1,
        waterMl: 1900,
        steps: 7200,
        energyLevel: "low",
        fatigueLevel: "moderate",
        hungerLevel: "high",
        recordedAt: addDays(today, -1)
      },
      {
        userId,
        sleepHours: 7.0,
        waterMl: 2200,
        steps: 8600,
        energyLevel: "medium",
        fatigueLevel: "low",
        hungerLevel: "normal",
        recordedAt: today
      }
    ]
  });
}

async function seedWorkoutLogs(userId) {
  await prisma.workoutLog.deleteMany({ where: { userId } });

  await prisma.workoutLog.createMany({
    data: [
      {
        userId,
        workoutType: "upper_body_strength",
        durationMin: 55,
        intensity: "moderate",
        exerciseNote: "Bench press, row, shoulder press, planks",
        completion: "completed",
        painFeedback: "none",
        fatigueAfter: "moderate",
        recordedAt: addDays(today, -6)
      },
      {
        userId,
        workoutType: "recovery_cardio",
        durationMin: 35,
        intensity: "low",
        exerciseNote: "Incline walk and mobility work",
        completion: "completed",
        painFeedback: "none",
        fatigueAfter: "low",
        recordedAt: addDays(today, -4)
      },
      {
        userId,
        workoutType: "lower_body_strength",
        durationMin: 52,
        intensity: "moderate",
        exerciseNote: "Box squat, RDL, glute bridge",
        completion: "completed",
        painFeedback: "left knee mildly sore",
        fatigueAfter: "high",
        recordedAt: addDays(today, -1)
      }
    ]
  });
}

async function seedWorkoutPlan(userId) {
  await prisma.workoutPlan.deleteMany({ where: { userId } });

  await prisma.workoutPlan.create({
    data: {
      userId,
      title: "Adaptive fat-loss week",
      goal: "fat_loss",
      weekOf: today,
      version: 1,
      status: "active",
      days: {
        create: [
          {
            dayLabel: "Monday",
            focus: "Upper body strength + core",
            duration: "55 min",
            exercises: ["Bench press 4x8", "Lat pulldown 4x10", "DB shoulder press 3x10", "Plank 3 rounds"],
            recoveryTip: "Hydrate after training and stretch the upper body before bed"
          },
          {
            dayLabel: "Wednesday",
            focus: "Knee-friendly lower body",
            duration: "50 min",
            exercises: ["Box squat 4x8", "Romanian deadlift 4x10", "Glute bridge 3x12"],
            recoveryTip: "Reduce squat depth and keep the day submaximal if the knee feels irritated"
          },
          {
            dayLabel: "Friday",
            focus: "Low-intensity cardio + core",
            duration: "40 min",
            exercises: ["Incline walk 30 min", "Dead bug 3x12", "Side plank 3x30 sec"],
            recoveryTip: "Prioritize total steps and avoid adding extra fatigue"
          },
          {
            dayLabel: "Sunday",
            focus: "Full-body consistency session",
            duration: "50 min",
            exercises: ["Goblet squat 4x10", "Seated row 4x10", "Push-up 3x12", "Hip mobility 8 min"],
            recoveryTip: "Keep 1-2 reps in reserve on every movement"
          }
        ]
      }
    }
  });
}

async function seedDietSnapshot(userId) {
  const snapshot = {
    userGoal: "fat_loss",
    totalCalorie: 1940,
    targetCalorie: 2100,
    nutritionRatio: { carbohydrate: 42, protein: 34, fat: 24 },
    nutritionDetail: {
      protein: { target: 145, recommend: 141, remaining: 4 },
      carbohydrate: { target: 210, recommend: 188, remaining: 22 },
      fat: { target: 60, recommend: 52, remaining: 8 },
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
            replaceable: []
          }
        ]
      },
      {
        mealType: "lunch",
        totalCalorie: 690,
        foods: [
          {
            name: "chicken breast",
            weight: 160,
            calorie: 260,
            cooking: "pan seared",
            nutrition: { protein: 42, carbohydrate: 0, fat: 8, fiber: 0 },
            replaceable: []
          },
          {
            name: "brown rice",
            weight: 180,
            calorie: 220,
            cooking: "steamed",
            nutrition: { protein: 5, carbohydrate: 46, fat: 2, fiber: 3 },
            replaceable: []
          },
          {
            name: "broccoli",
            weight: 180,
            calorie: 160,
            cooking: "steamed",
            nutrition: { protein: 10, carbohydrate: 18, fat: 2, fiber: 7 },
            replaceable: []
          }
        ]
      },
      {
        mealType: "dinner",
        totalCalorie: 790,
        foods: [
          {
            name: "salmon",
            weight: 150,
            calorie: 300,
            cooking: "oven baked",
            nutrition: { protein: 34, carbohydrate: 0, fat: 18, fiber: 0 },
            replaceable: []
          },
          {
            name: "quinoa",
            weight: 160,
            calorie: 190,
            cooking: "boiled",
            nutrition: { protein: 7, carbohydrate: 33, fat: 3, fiber: 4 },
            replaceable: []
          },
          {
            name: "mixed greens",
            weight: 170,
            calorie: 120,
            cooking: "olive oil toss",
            nutrition: { protein: 5, carbohydrate: 14, fat: 4, fiber: 7 },
            replaceable: []
          },
          {
            name: "olive oil",
            weight: 14,
            calorie: 180,
            cooking: "dressing",
            nutrition: { protein: 0, carbohydrate: 0, fat: 20, fiber: 0 },
            replaceable: []
          }
        ]
      }
    ],
    agentTips: [
      "Keep lunch as the highest-volume meal for better afternoon satiety.",
      "Keep protein spread across 3 meals to support training recovery.",
      "If hunger rises at night, add vegetables before increasing carbs."
    ]
  };

  await prisma.dietRecommendationSnapshot.upsert({
    where: {
      userId_date: {
        userId,
        date: today
      }
    },
    update: snapshot,
    create: {
      userId,
      date: today,
      ...snapshot
    }
  });
}

async function seedExercises() {
  const exercises = [
    {
      id: "goblet-squat",
      name: "Goblet squat",
      targetMuscles: ["quads", "glutes", "core"],
      equipment: "dumbbell/kettlebell",
      level: "novice",
      steps: ["Brace your trunk", "Sit down between the hips", "Drive through mid-foot"],
      commonMistakes: ["Knees collapsing inward", "Chest dropping too early"],
      contraindicates: ["Use a box if knee irritation is present"],
      recoveryNotes: ["Keep the load submaximal when recovery is poor"],
      variants: [
        {
          title: "Box goblet squat",
          description: "Shorten the depth to reduce knee stress while keeping the pattern."
        },
        {
          title: "Bodyweight squat",
          description: "Home-friendly version for low-equipment or recovery days."
        }
      ]
    },
    {
      id: "lat-pulldown",
      name: "Lat pulldown",
      targetMuscles: ["lats", "biceps"],
      equipment: "cable machine",
      level: "novice_intermediate",
      steps: ["Set shoulders down", "Pull toward upper chest", "Control the return"],
      commonMistakes: ["Shrugging", "Pulling behind the neck"],
      contraindicates: ["Reduce load if shoulder irritation appears"],
      recoveryNotes: ["Good main pull on moderate fatigue days"],
      variants: [
        {
          title: "Neutral-grip pulldown",
          description: "Often more shoulder-friendly than a wide grip."
        }
      ]
    },
    {
      id: "romanian-deadlift",
      name: "Romanian deadlift",
      targetMuscles: ["hamstrings", "glutes", "lower back"],
      equipment: "barbell/dumbbell",
      level: "novice_intermediate",
      steps: ["Push hips back", "Keep ribs stacked", "Stop when the hinge range ends"],
      commonMistakes: ["Rounding the low back", "Turning it into a squat"],
      contraindicates: ["Reduce load if low-back irritation is active"],
      recoveryNotes: ["Useful for posterior chain work without high knee stress"],
      variants: [
        {
          title: "Dumbbell RDL",
          description: "Simpler setup and easier load control."
        }
      ]
    },
    {
      id: "incline-walk",
      name: "Incline walk",
      targetMuscles: ["cardio", "calves", "glutes"],
      equipment: "treadmill",
      level: "all",
      steps: ["Maintain a sustainable pace", "Stay in conversational effort", "Do not grip the rails"],
      commonMistakes: ["Going too hard on recovery days", "Leaning heavily on the rails"],
      contraindicates: ["Reduce incline if ankle pain is present"],
      recoveryNotes: ["Useful for fat-loss phases and recovery days"],
      variants: [
        {
          title: "Outdoor brisk walk",
          description: "Simple alternative when no treadmill is available."
        }
      ]
    }
  ];

  for (const exercise of exercises) {
    await prisma.exercise.upsert({
      where: { id: exercise.id },
      update: {
        name: exercise.name,
        targetMuscles: exercise.targetMuscles,
        equipment: exercise.equipment,
        level: exercise.level,
        steps: exercise.steps,
        commonMistakes: exercise.commonMistakes,
        contraindicates: exercise.contraindicates,
        recoveryNotes: exercise.recoveryNotes
      },
      create: {
        id: exercise.id,
        name: exercise.name,
        targetMuscles: exercise.targetMuscles,
        equipment: exercise.equipment,
        level: exercise.level,
        steps: exercise.steps,
        commonMistakes: exercise.commonMistakes,
        contraindicates: exercise.contraindicates,
        recoveryNotes: exercise.recoveryNotes
      }
    });

    await prisma.exerciseVariant.deleteMany({ where: { exerciseId: exercise.id } });
    await prisma.exerciseVariant.createMany({
      data: exercise.variants.map((variant) => ({
        exerciseId: exercise.id,
        title: variant.title,
        description: variant.description
      }))
    });
  }
}

async function main() {
  const user = await seedUserAndProfile();
  await seedBodyMetrics(user.id);
  await seedDailyCheckins(user.id);
  await seedWorkoutLogs(user.id);
  await seedWorkoutPlan(user.id);
  await seedDietSnapshot(user.id);
  await seedExercises();

  console.log(`Seeded fitness-agent demo data for ${demoEmail}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
