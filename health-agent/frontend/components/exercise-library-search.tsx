"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ExerciseEquipmentIcon } from "@/components/exercise-equipment-icon";

type ExerciseCatalogItem = {
  id: string;
  name: string;
  primaryGroup: string;
  secondaryGroup: string;
  targetMuscles: string[];
  equipment: string;
  equipmentKey: string;
  level: string;
  summary: string;
  prescription: string;
  cues: string[];
  notes: string[];
};

const exerciseCatalog: ExerciseCatalogItem[] = [
  {
    id: "incline-dumbbell-press",
    name: "上斜哑铃卧推",
    primaryGroup: "胸部",
    secondaryGroup: "上胸",
    targetMuscles: ["上胸", "前三角", "肱三头"],
    equipment: "哑铃",
    equipmentKey: "dumbbell",
    level: "初中级",
    summary: "更强调上胸发力，也更容易观察左右两侧输出是否均衡。",
    prescription: "4 组 x 8-10 次",
    cues: ["凳面建议 30-45 度", "下放到上胸外侧", "顶端不要碰撞哑铃"],
    notes: ["适合作为推训练日主动作", "肩不舒服时可降低角度"]
  },
  {
    id: "barbell-bench-press",
    name: "杠铃平板卧推",
    primaryGroup: "胸部",
    secondaryGroup: "中胸",
    targetMuscles: ["胸大肌", "前三角", "肱三头"],
    equipment: "杠铃",
    equipmentKey: "barbell",
    level: "中级",
    summary: "经典基础推举动作，适合建立整体胸部力量。",
    prescription: "4 组 x 5-8 次",
    cues: ["肩胛后缩下沉", "脚跟稳定发力", "杠铃落点在下胸上方"],
    notes: ["建议使用保护杠或保护者", "适合作为胸日开场动作"]
  },
  {
    id: "seated-dumbbell-press",
    name: "坐姿哑铃推举",
    primaryGroup: "肩部",
    secondaryGroup: "前束",
    targetMuscles: ["前三角", "中束", "肱三头"],
    equipment: "哑铃",
    equipmentKey: "dumbbell",
    level: "初中级",
    summary: "更容易稳定躯干，适合作为肩部主推动作。",
    prescription: "4 组 x 8-10 次",
    cues: ["腰背稳定贴凳", "手肘略在手腕下方", "顶端保持肩不过耸"],
    notes: ["适合肩日开场", "可与侧平举搭配"]
  },
  {
    id: "dumbbell-lateral-raise",
    name: "哑铃侧平举",
    primaryGroup: "肩部",
    secondaryGroup: "中束",
    targetMuscles: ["三角肌中束"],
    equipment: "哑铃",
    equipmentKey: "dumbbell",
    level: "新手友好",
    summary: "最直接的肩中束孤立动作之一，适合雕刻肩宽线条。",
    prescription: "4 组 x 12-15 次",
    cues: ["手肘微屈固定", "上抬到与肩同高", "离心阶段放慢"],
    notes: ["重量轻一些更容易做准", "不要借腰摆动"]
  },
  {
    id: "lat-pulldown",
    name: "高位下拉",
    primaryGroup: "背部",
    secondaryGroup: "背阔肌",
    targetMuscles: ["背阔肌", "大圆肌", "肱二头"],
    equipment: "拉力器",
    equipmentKey: "cable",
    level: "新手到初中级",
    summary: "建立背阔发力路径最直接的基础动作之一。",
    prescription: "4 组 x 8-12 次",
    cues: ["先沉肩再下拉", "横杆靠近上胸", "避免大幅后仰借力"],
    notes: ["适合作为拉训练日主动作", "节奏稳定比重量更重要"]
  },
  {
    id: "chest-supported-row",
    name: "胸托划船",
    primaryGroup: "背部",
    secondaryGroup: "中背",
    targetMuscles: ["菱形肌", "斜方肌中下束", "背阔肌"],
    equipment: "固定器械",
    equipmentKey: "machine",
    level: "新手友好",
    summary: "躯干更稳定，能把注意力更集中放在中背夹紧感上。",
    prescription: "4 组 x 10-12 次",
    cues: ["肩胛先向后收", "手肘贴近身体后拉", "顶端停顿半秒"],
    notes: ["很适合与高位下拉搭配", "减少下背代偿"]
  },
  {
    id: "romanian-deadlift",
    name: "罗马尼亚硬拉",
    primaryGroup: "腿部",
    secondaryGroup: "后链",
    targetMuscles: ["股二头", "臀大肌", "竖脊肌"],
    equipment: "杠铃",
    equipmentKey: "barbell",
    level: "中级",
    summary: "经典后链动作，适合强化髋主导力量和拉伸感。",
    prescription: "4 组 x 6-8 次",
    cues: ["髋向后坐", "杠铃贴腿下放", "脊柱保持中立"],
    notes: ["适合下肢后链训练日", "加重量前先稳住动作轨迹"]
  },
  {
    id: "goblet-squat",
    name: "高脚杯深蹲",
    primaryGroup: "腿部",
    secondaryGroup: "股四头",
    targetMuscles: ["股四头", "臀大肌", "核心"],
    equipment: "壶铃",
    equipmentKey: "kettlebell",
    level: "新手友好",
    summary: "学习深蹲轨迹和核心稳定非常高效的入门动作。",
    prescription: "4 组 x 10-12 次",
    cues: ["躯干立住再下蹲", "膝盖方向跟脚尖一致", "底部保持全脚掌受力"],
    notes: ["可作为热身或主动作", "也适合恢复期训练"]
  },
  {
    id: "bulgarian-split-squat",
    name: "保加利亚分腿蹲",
    primaryGroup: "腿部",
    secondaryGroup: "臀腿",
    targetMuscles: ["臀大肌", "股四头", "股二头"],
    equipment: "哑铃",
    equipmentKey: "dumbbell",
    level: "初中级",
    summary: "适合补足左右腿差异，也能提高单腿稳定。",
    prescription: "3 组 x 8-10 次 / 侧",
    cues: ["前脚站稳再下沉", "躯干轻微前倾", "底部感受臀腿共同发力"],
    notes: ["适合作为主动作后的补充", "不要过度追求步幅"]
  },
  {
    id: "cable-crunch",
    name: "绳索卷腹",
    primaryGroup: "核心",
    secondaryGroup: "腹直肌",
    targetMuscles: ["腹直肌", "腹横肌"],
    equipment: "拉力器",
    equipmentKey: "cable",
    level: "新手友好",
    summary: "比普通卷腹更容易形成明确负重刺激。",
    prescription: "3 组 x 12-15 次",
    cues: ["骨盆相对固定", "胸骨朝骨盆卷动", "不要用手臂拉绳"],
    notes: ["适合作为力量训练后补充", "动作节奏尽量慢"]
  },
  {
    id: "hanging-knee-raise",
    name: "悬垂举膝",
    primaryGroup: "核心",
    secondaryGroup: "下腹",
    targetMuscles: ["下腹", "髂腰肌", "腹直肌"],
    equipment: "单杠",
    equipmentKey: "pullup_bar",
    level: "初中级",
    summary: "适合训练骨盆控制和下腹参与感。",
    prescription: "3 组 x 10-12 次",
    cues: ["先收骨盆再抬膝", "尽量减少摆动", "下放阶段有控制"],
    notes: ["摆动明显时可退阶到仰卧举腿", "注意肩胛稳定"]
  },
  {
    id: "dead-bug",
    name: "Dead Bug",
    primaryGroup: "核心",
    secondaryGroup: "稳定",
    targetMuscles: ["腹横肌", "腹直肌", "核心稳定"],
    equipment: "自重",
    equipmentKey: "bodyweight",
    level: "新手友好",
    summary: "很适合建立抗伸展能力和呼吸控制。",
    prescription: "3 组 x 10 次 / 侧",
    cues: ["腰背稳定贴地", "呼气时伸展", "动作范围不要破坏稳定"],
    notes: ["适合热身激活", "也适合恢复日"]
  }
];

function getRecommendedIds(todayFocus: string) {
  const focus = todayFocus.toLowerCase();

  if (focus.includes("下肢") || focus.includes("lower")) {
    return ["goblet-squat", "romanian-deadlift", "bulgarian-split-squat", "dead-bug"];
  }

  if (focus.includes("核心") || focus.includes("core")) {
    return ["dead-bug", "cable-crunch", "hanging-knee-raise", "goblet-squat"];
  }

  if (focus.includes("背") || focus.includes("pull")) {
    return ["lat-pulldown", "chest-supported-row", "romanian-deadlift", "hanging-knee-raise"];
  }

  return [
    "incline-dumbbell-press",
    "barbell-bench-press",
    "seated-dumbbell-press",
    "lat-pulldown"
  ];
}

export function ExerciseLibrarySearch({ todayFocus }: { todayFocus: string }) {
  const [query, setQuery] = useState("");
  const [primaryGroup, setPrimaryGroup] = useState("全部");
  const [secondaryGroup, setSecondaryGroup] = useState("全部");
  const [equipmentKey, setEquipmentKey] = useState("all");
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseCatalogItem | null>(null);

  const recommendedIds = useMemo(() => getRecommendedIds(todayFocus), [todayFocus]);
  const recommended = useMemo(
    () =>
      [
        ...recommendedIds
          .map((id) => exerciseCatalog.find((item) => item.id === id))
          .filter((item): item is ExerciseCatalogItem => Boolean(item)),
        ...exerciseCatalog.filter((item) => !recommendedIds.includes(item.id))
      ].slice(0, 4),
    [recommendedIds]
  );

  const primaryGroups = useMemo(
    () => ["全部", ...Array.from(new Set(exerciseCatalog.map((item) => item.primaryGroup)))],
    []
  );

  const secondaryGroups = useMemo(() => {
    const source =
      primaryGroup === "全部"
        ? exerciseCatalog
        : exerciseCatalog.filter((item) => item.primaryGroup === primaryGroup);

    return ["全部", ...Array.from(new Set(source.map((item) => item.secondaryGroup)))];
  }, [primaryGroup]);

  useEffect(() => {
    if (!secondaryGroups.includes(secondaryGroup)) {
      setSecondaryGroup("全部");
    }
  }, [secondaryGroup, secondaryGroups]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedExercise(null);
      }
    }

    if (selectedExercise) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener("keydown", onKeyDown);
      };
    }
  }, [selectedExercise]);

  const filteredExercises = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return exerciseCatalog.filter((item) => {
      const matchesPrimary = primaryGroup === "全部" || item.primaryGroup === primaryGroup;
      const matchesSecondary = secondaryGroup === "全部" || item.secondaryGroup === secondaryGroup;
      const matchesEquipment = equipmentKey === "all" || item.equipmentKey === equipmentKey;
      const haystack = [
        item.name,
        item.primaryGroup,
        item.secondaryGroup,
        item.equipment,
        item.level,
        item.summary,
        ...item.targetMuscles,
        ...item.cues,
        ...item.notes
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);

      return matchesPrimary && matchesSecondary && matchesEquipment && matchesQuery;
    });
  }, [equipmentKey, primaryGroup, query, secondaryGroup]);

  const hasActiveCriteria =
    query.trim().length > 0 ||
    primaryGroup !== "全部" ||
    secondaryGroup !== "全部" ||
    equipmentKey !== "all";

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSearched(hasActiveCriteria);
  };

  const handleReset = () => {
    setQuery("");
    setPrimaryGroup("全部");
    setSecondaryGroup("全部");
    setEquipmentKey("all");
    setHasSearched(false);
  };

  return (
    <>
      <div className="exercise-library-shell">
        <section className="exercise-recommend-strip refined">
          <div className="exercise-search-head compact">
            <div className="section-copy">
              <span className="section-label">Recommended</span>
              <h3>今日推荐</h3>
            </div>
            <span className="mini-chip">{todayFocus}</span>
          </div>

          <div className="exercise-card-row">
            {recommended.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                className="exercise-mini-card recommended"
                onClick={() => setSelectedExercise(exercise)}
              >
                <ExerciseEquipmentIcon equipmentKey={exercise.equipmentKey} />
                <div className="exercise-mini-copy">
                  <strong>{exercise.name}</strong>
                  <span>{exercise.primaryGroup}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="exercise-search-lab">
          <div className="exercise-search-head compact">
            <div className="section-copy">
              <span className="section-label">Search</span>
              <h3>检索动作库</h3>
            </div>
            <span className="mini-chip">{hasSearched ? `${filteredExercises.length} 个结果` : "未搜索"}</span>
          </div>

          <form className="exercise-search-form" onSubmit={handleSearch}>
            <label className="exercise-query-field">
              <span className="form-label">关键词</span>
              <input
                value={query}
                placeholder="例如：卧推、背阔、哑铃、核心"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>

            <div className="exercise-search-grid">
              <label className="exercise-select-field">
                <span className="form-label">训练部位</span>
                <select value={primaryGroup} onChange={(event) => setPrimaryGroup(event.target.value)}>
                  {primaryGroups.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </label>

              <label className="exercise-select-field">
                <span className="form-label">细分部位</span>
                <select
                  value={secondaryGroup}
                  onChange={(event) => setSecondaryGroup(event.target.value)}
                >
                  {secondaryGroups.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </label>

              <label className="exercise-select-field">
                <span className="form-label">训练器材</span>
                <select value={equipmentKey} onChange={(event) => setEquipmentKey(event.target.value)}>
                  <option value="all">全部器材</option>
                  <option value="dumbbell">哑铃</option>
                  <option value="barbell">杠铃</option>
                  <option value="cable">拉力器</option>
                  <option value="machine">固定器械</option>
                  <option value="kettlebell">壶铃</option>
                  <option value="pullup_bar">单杠</option>
                  <option value="bodyweight">自重</option>
                </select>
              </label>
            </div>

            <div className="exercise-search-actions">
              <button type="submit" className="button" disabled={!hasActiveCriteria}>
                开始检索
              </button>
              <button type="button" className="ghost-button" onClick={handleReset}>
                清空
              </button>
            </div>
          </form>
        </section>

        {hasSearched ? (
          <section className="exercise-results-shell">
            {filteredExercises.length === 0 ? (
              <div className="exercise-results-empty">
                <span className="section-label">No results</span>
                <h3>没有找到匹配动作</h3>
                <p className="muted">试着放宽筛选条件，或者换一个关键词重新检索。</p>
              </div>
            ) : (
              <>
                <div className="exercise-results-head">
                  <div className="section-copy">
                    <span className="section-label">Results</span>
                    <h3>检索结果</h3>
                  </div>
                  <span className="mini-chip">{filteredExercises.length} 个动作</span>
                </div>

                <div className="exercise-result-grid">
                  {filteredExercises.map((exercise) => (
                    <button
                      key={exercise.id}
                      type="button"
                      className="exercise-mini-card"
                      onClick={() => setSelectedExercise(exercise)}
                    >
                      <ExerciseEquipmentIcon equipmentKey={exercise.equipmentKey} />
                      <div className="exercise-mini-copy">
                        <strong>{exercise.name}</strong>
                        <span>{exercise.primaryGroup}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        ) : null}
      </div>

      {selectedExercise ? (
        <div
          className="exercise-modal-overlay"
          onClick={() => setSelectedExercise(null)}
          role="presentation"
        >
          <div
            className="exercise-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exercise-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="exercise-modal-header">
              <div className="exercise-modal-title">
                <ExerciseEquipmentIcon
                  equipmentKey={selectedExercise.equipmentKey}
                  className="large"
                />
                <div>
                  <span className="section-label">{selectedExercise.equipment}</span>
                  <h3 id="exercise-modal-title">{selectedExercise.name}</h3>
                  <p className="muted">
                    {selectedExercise.primaryGroup} / {selectedExercise.secondaryGroup} /{" "}
                    {selectedExercise.level}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="diet-icon-button"
                onClick={() => setSelectedExercise(null)}
                aria-label="关闭动作详情"
              >
                x
              </button>
            </div>

            <div className="exercise-modal-body">
              <section className="exercise-detail-overview">
                <div className="exercise-detail-copy">
                  <span className="section-label">Overview</span>
                  <p>{selectedExercise.summary}</p>
                </div>
                <div className="exercise-detail-kpis">
                  <div>
                    <span className="metric-label">推荐组数</span>
                    <strong>{selectedExercise.prescription}</strong>
                  </div>
                  <div>
                    <span className="metric-label">主要刺激</span>
                    <strong>{selectedExercise.targetMuscles.join(" / ")}</strong>
                  </div>
                </div>
              </section>

              <section className="exercise-detail-grid">
                <div className="exercise-detail-block">
                  <span className="section-label">Cues</span>
                  <div className="exercise-detail-list">
                    {selectedExercise.cues.map((cue) => (
                      <p key={cue}>{cue}</p>
                    ))}
                  </div>
                </div>

                <div className="exercise-detail-block">
                  <span className="section-label">Notes</span>
                  <div className="exercise-detail-list">
                    {selectedExercise.notes.map((note) => (
                      <p key={note}>{note}</p>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
