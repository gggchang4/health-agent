import type { ExerciseItem } from "@/lib/types";

export type ExerciseCatalogItem = ExerciseItem & {
  category: string;
  mechanic: string | null;
  force: string | null;
  searchText: string;
};

export function buildEquipmentOptions(catalog: ExerciseCatalogItem[]) {
  return Array.from(
    new Map(
      catalog.map((item) => [
        item.equipmentKey ?? "other",
        {
          key: item.equipmentKey ?? "other",
          label: item.equipment
        }
      ])
    ).values()
  ).sort((left, right) => left.label.localeCompare(right.label, "en"));
}

function resolvePreferredGroup(todayFocus: string) {
  const focus = todayFocus.toLowerCase();

  if (focus.includes("lower") || focus.includes("leg") || focus.includes("glute")) {
    return "Legs";
  }

  if (focus.includes("core") || focus.includes("abs")) {
    return "Core";
  }

  if (focus.includes("pull") || focus.includes("back") || focus.includes("lat")) {
    return "Back";
  }

  if (focus.includes("push") || focus.includes("chest")) {
    return "Chest";
  }

  if (focus.includes("shoulder") || focus.includes("delt")) {
    return "Shoulders";
  }

  if (focus.includes("arm") || focus.includes("bicep") || focus.includes("tricep")) {
    return "Arms";
  }

  if (focus.includes("cardio") || focus.includes("conditioning") || focus.includes("run")) {
    return "Cardio";
  }

  return null;
}

function scoreExercise(item: ExerciseCatalogItem) {
  let score = 0;

  if (item.category === "Strength") {
    score += 5;
  } else if (item.category === "Cardio") {
    score += 4;
  }

  if (item.mechanic === "Compound") {
    score += 3;
  } else if (item.mechanic === "Isolation") {
    score += 1;
  }

  if (item.level === "novice") {
    score += 2;
  } else if (item.level === "novice_intermediate" || item.level === "intermediate") {
    score += 1;
  }

  if (item.equipmentKey && item.equipmentKey !== "accessory") {
    score += 1;
  }

  return score;
}

export function getRecommendedExercises(
  catalog: ExerciseCatalogItem[],
  todayFocus: string,
  count = 4
) {
  const preferredGroup = resolvePreferredGroup(todayFocus);
  const candidates =
    preferredGroup === null
      ? catalog
      : catalog.filter((item) => item.primaryGroup === preferredGroup);

  return [...candidates]
    .sort((left, right) => scoreExercise(right) - scoreExercise(left) || left.name.localeCompare(right.name))
    .slice(0, count);
}
