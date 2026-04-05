import fs from "node:fs";

const inputPath = new URL("../data/free-exercise-db.json", import.meta.url);
const outputPath = new URL("../data/exercise-catalog.generated.json", import.meta.url);

const rawCatalog = JSON.parse(fs.readFileSync(inputPath, "utf8"));

const muscleLabelMap = {
  abdominals: "腹肌",
  abductors: "髋外展",
  adductors: "髋内收",
  biceps: "肱二头",
  calves: "小腿",
  chest: "胸肌",
  forearms: "前臂",
  glutes: "臀部",
  hamstrings: "股二头",
  lats: "背阔肌",
  "lower back": "下背",
  "middle back": "中背",
  neck: "颈部",
  quadriceps: "股四头",
  shoulders: "三角肌",
  traps: "斜方肌",
  triceps: "肱三头"
};

const primaryGroupMap = {
  abdominals: "核心",
  abductors: "腿部",
  adductors: "腿部",
  biceps: "手臂",
  calves: "腿部",
  chest: "胸部",
  forearms: "手臂",
  glutes: "腿部",
  hamstrings: "腿部",
  lats: "背部",
  "lower back": "背部",
  "middle back": "背部",
  neck: "颈部",
  quadriceps: "腿部",
  shoulders: "肩部",
  traps: "背部",
  triceps: "手臂"
};

const levelMap = {
  beginner: "初级",
  intermediate: "中级",
  expert: "高级"
};

const categoryMap = {
  cardio: "有氧",
  "olympic weightlifting": "奥举",
  plyometrics: "增强式",
  powerlifting: "力量举",
  strength: "力量",
  stretching: "拉伸",
  strongman: "大力士"
};

const mechanicMap = {
  compound: "复合",
  isolation: "孤立"
};

const forceMap = {
  pull: "拉",
  push: "推",
  static: "静态"
};

function inferEquipment(name, rawEquipment) {
  const lower = `${name} ${rawEquipment || ""}`.toLowerCase();

  if (rawEquipment === "barbell") return { key: "barbell", label: "杠铃" };
  if (rawEquipment === "dumbbell") return { key: "dumbbell", label: "哑铃" };
  if (rawEquipment === "kettlebells") return { key: "kettlebell", label: "壶铃" };
  if (rawEquipment === "cable") return { key: "cable", label: "拉力器" };
  if (rawEquipment === "machine") return { key: "machine", label: "固定器械" };
  if (rawEquipment === "e-z curl bar") return { key: "ez_bar", label: "EZ 曲杆" };
  if (rawEquipment === "bands") return { key: "resistance_band", label: "弹力带" };
  if (rawEquipment === "body only") return { key: "bodyweight", label: "自重" };
  if (rawEquipment === "exercise ball") return { key: "exercise_ball", label: "健身球" };
  if (rawEquipment === "medicine ball") return { key: "medicine_ball", label: "药球" };
  if (rawEquipment === "foam roll") return { key: "foam_roller", label: "泡沫轴" };

  if (lower.includes("ab roller") || lower.includes("ab wheel")) {
    return { key: "ab_wheel", label: "腹肌轮" };
  }

  if (lower.includes("trap bar")) {
    return { key: "trap_bar", label: "六角杠" };
  }

  if (lower.includes("axle")) {
    return { key: "axle_bar", label: "粗杆杠铃" };
  }

  if (lower.includes("sandbag")) {
    return { key: "sandbag", label: "沙袋" };
  }

  if (lower.includes("tire")) {
    return { key: "tire", label: "轮胎" };
  }

  if (
    lower.includes("sled") ||
    lower.includes("prowler") ||
    lower.includes("drag") ||
    lower.includes("harness")
  ) {
    return { key: "sled", label: "雪橇" };
  }

  if (lower.includes("ring")) {
    return { key: "rings", label: "吊环" };
  }

  if (lower.includes("straps") || lower.includes("suspended") || lower.includes("trx")) {
    return { key: "suspension_trainer", label: "悬挂带" };
  }

  if (lower.includes("battle") || lower.includes("battling ropes")) {
    return { key: "battle_rope", label: "战绳" };
  }

  if (lower.includes("rope jump")) {
    return { key: "jump_rope", label: "跳绳" };
  }

  if (lower.includes("rope climb")) {
    return { key: "climbing_rope", label: "攀绳" };
  }

  if (lower.includes("rope")) {
    return { key: "battle_rope", label: "绳索器械" };
  }

  if (
    lower.includes("pull-up") ||
    lower.includes("pull up") ||
    lower.includes("chin") ||
    lower.includes("muscle up") ||
    lower.includes("hang")
  ) {
    return { key: "pullup_bar", label: "单杠" };
  }

  if (lower.includes("dip") || lower.includes("parallel bar")) {
    return { key: "dip_bar", label: "双杠" };
  }

  if (lower.includes("bench")) {
    return { key: "bench", label: "训练凳" };
  }

  if (lower.includes("box") || lower.includes("platform")) {
    return { key: "plyo_box", label: "跳箱" };
  }

  if (lower.includes("plate")) {
    return { key: "weight_plate", label: "杠铃片" };
  }

  if (lower.includes("bag")) {
    return { key: "heavy_bag", label: "训练沙袋" };
  }

  if (lower.includes("balance board")) {
    return { key: "balance_board", label: "平衡板" };
  }

  if (
    lower.includes("atlas") ||
    lower.includes("stone") ||
    lower.includes("keg") ||
    lower.includes("log lift") ||
    lower.includes("circus bell") ||
    lower.includes("conan") ||
    lower.includes("farmer") ||
    lower.includes("rickshaw") ||
    lower.includes("car deadlift") ||
    lower.includes("sledgehammer")
  ) {
    return { key: "strongman", label: "大力士器械" };
  }

  if (lower.includes("weighted")) {
    return { key: "weighted_vest", label: "负重器械" };
  }

  return { key: "accessory", label: "综合附件" };
}

function getPrescription(category, mechanic) {
  if (category === "stretching") return "2-4 组 x 20-40 秒";
  if (category === "cardio") return "10-30 分钟";
  if (category === "plyometrics") return "3-5 组 x 3-8 次";
  if (category === "powerlifting") return "4-6 组 x 3-6 次";
  if (category === "olympic weightlifting") return "4-6 组 x 2-5 次";
  if (category === "strongman") return "4-6 轮 / 20-40 米";
  if (category === "strength" && mechanic === "isolation") return "3-4 组 x 10-15 次";
  return "3-5 组 x 6-12 次";
}

function toSentence(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

const catalog = rawCatalog.map((item) => {
  const equipment = inferEquipment(item.name, item.equipment);
  const primaryMuscle = item.primaryMuscles?.[0] || "abdominals";
  const primaryGroup = primaryGroupMap[primaryMuscle] || "全身";
  const secondaryGroup = muscleLabelMap[primaryMuscle] || "综合";
  const targetMuscles = [
    ...new Set([...(item.primaryMuscles || []), ...(item.secondaryMuscles || [])])
  ].map((muscle) => muscleLabelMap[muscle] || muscle);
  const categoryLabel = categoryMap[item.category] || "训练";
  const mechanicLabel = item.mechanic ? mechanicMap[item.mechanic] || item.mechanic : "";
  const forceLabel = item.force ? forceMap[item.force] || item.force : "";
  const level = levelMap[item.level] || "中级";
  const summaryLead = [categoryLabel, mechanicLabel, forceLabel].filter(Boolean).join(" / ");
  const instructions = (item.instructions || []).map(toSentence).filter(Boolean);
  const cues = instructions.slice(0, 3);
  const notes = instructions.slice(3, 5);

  return {
    id: item.id,
    name: item.name,
    primaryGroup,
    secondaryGroup,
    targetMuscles,
    equipment: equipment.label,
    equipmentKey: equipment.key,
    level,
    summary: `${summaryLead || "训练动作"}，主要刺激${targetMuscles.slice(0, 3).join("、")}。`,
    prescription: getPrescription(item.category, item.mechanic),
    cues: cues.length ? cues : [`保持动作稳定，优先感受${targetMuscles[0] || secondaryGroup}发力。`],
    notes: notes.length ? notes : [`器材：${equipment.label}`, `难度：${level}`, `分类：${categoryLabel}`],
    category: categoryLabel,
    mechanic: mechanicLabel || null,
    force: forceLabel || null,
    searchText: [
      item.name,
      primaryGroup,
      secondaryGroup,
      ...targetMuscles,
      item.equipment || "",
      equipment.label,
      level,
      item.level || "",
      categoryLabel,
      item.category || "",
      mechanicLabel,
      item.mechanic || "",
      forceLabel,
      item.force || ""
    ]
      .join(" ")
      .toLowerCase()
  };
});

fs.writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Generated ${catalog.length} exercises at ${outputPath.pathname}`);
