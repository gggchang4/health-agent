CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HealthProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "age" INTEGER,
  "gender" TEXT,
  "heightCm" DOUBLE PRECISION,
  "currentWeightKg" DOUBLE PRECISION,
  "targetWeightKg" DOUBLE PRECISION,
  "activityLevel" TEXT,
  "trainingExperience" TEXT,
  "trainingDaysPerWeek" INTEGER,
  "equipmentAccess" TEXT,
  "limitations" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "HealthProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BodyMetricLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "weightKg" DOUBLE PRECISION NOT NULL,
  "bodyFatPct" DOUBLE PRECISION,
  "waistCm" DOUBLE PRECISION,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" TEXT NOT NULL DEFAULT 'manual',

  CONSTRAINT "BodyMetricLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DailyCheckin" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sleepHours" DOUBLE PRECISION NOT NULL,
  "waterMl" INTEGER NOT NULL,
  "steps" INTEGER NOT NULL,
  "energyLevel" TEXT,
  "fatigueLevel" TEXT,
  "hungerLevel" TEXT,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" TEXT NOT NULL DEFAULT 'manual',

  CONSTRAINT "DailyCheckin_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkoutLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "workoutType" TEXT NOT NULL,
  "durationMin" INTEGER NOT NULL,
  "intensity" TEXT NOT NULL,
  "exerciseNote" TEXT,
  "completion" TEXT,
  "painFeedback" TEXT,
  "fatigueAfter" TEXT,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" TEXT NOT NULL DEFAULT 'manual',

  CONSTRAINT "WorkoutLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkoutPlan" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "goal" TEXT NOT NULL,
  "weekOf" TIMESTAMP(3) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WorkoutPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkoutPlanDay" (
  "id" TEXT NOT NULL,
  "workoutPlanId" TEXT NOT NULL,
  "dayLabel" TEXT NOT NULL,
  "focus" TEXT NOT NULL,
  "duration" TEXT NOT NULL,
  "exercises" JSONB NOT NULL,
  "recoveryTip" TEXT NOT NULL,

  CONSTRAINT "WorkoutPlanDay_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DietRecommendationSnapshot" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "userGoal" TEXT NOT NULL,
  "totalCalorie" INTEGER NOT NULL,
  "targetCalorie" INTEGER NOT NULL,
  "nutritionRatio" JSONB NOT NULL,
  "nutritionDetail" JSONB NOT NULL,
  "meals" JSONB NOT NULL,
  "agentTips" TEXT[] NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DietRecommendationSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Exercise" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "targetMuscles" TEXT[] NOT NULL,
  "equipment" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "steps" TEXT[] NOT NULL,
  "commonMistakes" TEXT[] NOT NULL,
  "contraindicates" TEXT[] NOT NULL,
  "recoveryNotes" TEXT[] NOT NULL,

  CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExerciseVariant" (
  "id" TEXT NOT NULL,
  "exerciseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,

  CONSTRAINT "ExerciseVariant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrainingTemplate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "splitType" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "daysPerWeek" INTEGER NOT NULL,

  CONSTRAINT "TrainingTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdviceSnapshot" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "priority" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "reasoningTags" TEXT[] NOT NULL,
  "actionItems" TEXT[] NOT NULL,
  "riskFlags" TEXT[] NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AdviceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentThread" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AgentThread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentMessage" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "reasoning" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AgentMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentRun" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "riskLevel" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentRunStep" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "stepType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AgentRunStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ToolInvocationLog" (
  "id" TEXT NOT NULL,
  "toolName" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "requestData" JSONB NOT NULL,
  "responseData" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ToolInvocationLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlaceRecommendationSnapshot" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "distanceM" INTEGER,
  "address" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlaceRecommendationSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "HealthProfile_userId_key" ON "HealthProfile"("userId");
CREATE UNIQUE INDEX "DietRecommendationSnapshot_userId_date_key" ON "DietRecommendationSnapshot"("userId", "date");

ALTER TABLE "HealthProfile"
ADD CONSTRAINT "HealthProfile_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BodyMetricLog"
ADD CONSTRAINT "BodyMetricLog_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DailyCheckin"
ADD CONSTRAINT "DailyCheckin_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkoutLog"
ADD CONSTRAINT "WorkoutLog_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkoutPlan"
ADD CONSTRAINT "WorkoutPlan_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkoutPlanDay"
ADD CONSTRAINT "WorkoutPlanDay_workoutPlanId_fkey"
FOREIGN KEY ("workoutPlanId") REFERENCES "WorkoutPlan"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DietRecommendationSnapshot"
ADD CONSTRAINT "DietRecommendationSnapshot_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExerciseVariant"
ADD CONSTRAINT "ExerciseVariant_exerciseId_fkey"
FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdviceSnapshot"
ADD CONSTRAINT "AdviceSnapshot_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgentThread"
ADD CONSTRAINT "AgentThread_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgentMessage"
ADD CONSTRAINT "AgentMessage_threadId_fkey"
FOREIGN KEY ("threadId") REFERENCES "AgentThread"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgentRun"
ADD CONSTRAINT "AgentRun_threadId_fkey"
FOREIGN KEY ("threadId") REFERENCES "AgentThread"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgentRunStep"
ADD CONSTRAINT "AgentRunStep_runId_fkey"
FOREIGN KEY ("runId") REFERENCES "AgentRun"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
