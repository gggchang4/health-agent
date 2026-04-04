"use client";

import { WorkoutPlanDay } from "@/lib/types";
import { CSSProperties, FormEvent, useEffect, useMemo, useState } from "react";

interface EditableWorkoutPlanDay extends WorkoutPlanDay {
  id: string;
}

interface PlanDraft {
  dayLabel: string;
  focus: string;
  duration: string;
  exercisesText: string;
  recoveryTip: string;
}

interface StoredPlanChecklistState {
  items: EditableWorkoutPlanDay[];
  completed: string[];
}

const planChecklistStorageKey = "health-agent.plan-checklist.v1";
const emptyDraft: PlanDraft = {
  dayLabel: "",
  focus: "",
  duration: "",
  exercisesText: "",
  recoveryTip: ""
};

function createPlanId() {
  return `plan-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function createEditablePlanItem(day: WorkoutPlanDay): EditableWorkoutPlanDay {
  return {
    ...day,
    id: createPlanId()
  };
}

function draftFromItem(day: WorkoutPlanDay): PlanDraft {
  return {
    dayLabel: day.dayLabel,
    focus: day.focus,
    duration: day.duration,
    exercisesText: day.exercises.join("\n"),
    recoveryTip: day.recoveryTip
  };
}

function parseExercises(exercisesText: string) {
  return exercisesText
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildPlanFromDraft(draft: PlanDraft, id = createPlanId()): EditableWorkoutPlanDay {
  return {
    id,
    dayLabel: draft.dayLabel.trim() || "未命名",
    focus: draft.focus.trim() || "待补充计划",
    duration: draft.duration.trim() || "待安排",
    exercises: parseExercises(draft.exercisesText),
    recoveryTip: draft.recoveryTip.trim() || "暂无恢复提醒"
  };
}

function isStoredPlanItem(value: unknown): value is EditableWorkoutPlanDay {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "string" &&
    typeof item.dayLabel === "string" &&
    typeof item.focus === "string" &&
    typeof item.duration === "string" &&
    typeof item.recoveryTip === "string" &&
    Array.isArray(item.exercises) &&
    item.exercises.every((exercise) => typeof exercise === "string")
  );
}

export function PlanChecklist({ plan }: { plan: WorkoutPlanDay[] }) {
  const [items, setItems] = useState<EditableWorkoutPlanDay[]>(() => plan.map(createEditablePlanItem));
  const [completed, setCompleted] = useState<string[]>([]);
  const [celebrating, setCelebrating] = useState<string | null>(null);
  const [allCelebrating, setAllCelebrating] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [newDraft, setNewDraft] = useState<PlanDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<PlanDraft>(emptyDraft);

  const progress = useMemo(
    () => Math.round((completed.length / Math.max(items.length, 1)) * 100),
    [completed.length, items.length]
  );

  const nextUp = items.find((day) => !completed.includes(day.id)) ?? null;

  useEffect(() => {
    try {
      const rawState = window.localStorage.getItem(planChecklistStorageKey);

      if (!rawState) {
        setStorageReady(true);
        return;
      }

      const parsed = JSON.parse(rawState) as Partial<StoredPlanChecklistState>;
      const storedItems = Array.isArray(parsed.items) ? parsed.items.filter(isStoredPlanItem) : [];
      const validIds = new Set(storedItems.map((item) => item.id));
      const storedCompleted = Array.isArray(parsed.completed)
        ? parsed.completed.filter((id): id is string => typeof id === "string" && validIds.has(id))
        : [];

      if (storedItems.length > 0) {
        setItems(storedItems);
        setCompleted(storedCompleted);
      }
    } catch {
      setItems(plan.map(createEditablePlanItem));
      setCompleted([]);
    } finally {
      setStorageReady(true);
    }
  }, [plan]);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    const validIds = new Set(items.map((item) => item.id));
    const syncedCompleted = completed.filter((id) => validIds.has(id));

    if (syncedCompleted.length !== completed.length) {
      setCompleted(syncedCompleted);
      return;
    }

    window.localStorage.setItem(
      planChecklistStorageKey,
      JSON.stringify({
        items,
        completed: syncedCompleted
      } satisfies StoredPlanChecklistState)
    );
  }, [completed, items, storageReady]);

  useEffect(() => {
    if (items.length === 0 || completed.length !== items.length) {
      setAllCelebrating(false);
      return;
    }

    setAllCelebrating(true);
    const timer = window.setTimeout(() => setAllCelebrating(false), 1600);
    return () => window.clearTimeout(timer);
  }, [completed.length, items.length]);

  function toggleComplete(itemId: string) {
    const isDone = completed.includes(itemId);

    if (isDone) {
      setCompleted((current) => current.filter((item) => item !== itemId));
      return;
    }

    setCompleted((current) => [...current, itemId]);
    setCelebrating(itemId);
    window.setTimeout(() => {
      setCelebrating((current) => (current === itemId ? null : current));
    }, 900);
  }

  function handleAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextItem = buildPlanFromDraft(newDraft);
    setItems((current) => [...current, nextItem]);
    setNewDraft(emptyDraft);
  }

  function startEditing(item: EditableWorkoutPlanDay) {
    setEditingId(item.id);
    setEditingDraft(draftFromItem(item));
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingDraft(emptyDraft);
  }

  function handleSaveEdit(event: FormEvent<HTMLFormElement>, itemId: string) {
    event.preventDefault();
    const nextItem = buildPlanFromDraft(editingDraft, itemId);
    setItems((current) => current.map((item) => (item.id === itemId ? nextItem : item)));
    cancelEditing();
  }

  function handleDeleteItem(itemId: string) {
    setItems((current) => current.filter((item) => item.id !== itemId));
    setCompleted((current) => current.filter((item) => item !== itemId));

    if (editingId === itemId) {
      cancelEditing();
    }
  }

  return (
    <div className="dash-grid">
      <section className="todo-list">
        <div className="todo-list-top">
          <div className="section-copy">
            <span className="section-label">Todo</span>
            <h3>计划清单</h3>
            <p className="muted">悬停查看详情。列表会随着条目增加和详情展开自然向下延伸。</p>
          </div>

          <div className="chip-row">
            <span className="mini-chip">{items.length} 条计划</span>
            <span className="mini-chip">{completed.length} 条已完成</span>
          </div>

          <form className="todo-composer" onSubmit={handleAddItem}>
            <div className="form-grid two">
              <label className="field">
                <span className="form-label">日期标签</span>
                <input
                  value={newDraft.dayLabel}
                  onChange={(event) => setNewDraft((current) => ({ ...current, dayLabel: event.target.value }))}
                  placeholder="例如：周二"
                />
              </label>
              <label className="field">
                <span className="form-label">时长</span>
                <input
                  value={newDraft.duration}
                  onChange={(event) => setNewDraft((current) => ({ ...current, duration: event.target.value }))}
                  placeholder="例如：40 分钟"
                />
              </label>
              <label className="field span-2">
                <span className="form-label">计划标题</span>
                <input
                  value={newDraft.focus}
                  onChange={(event) => setNewDraft((current) => ({ ...current, focus: event.target.value }))}
                  placeholder="例如：低冲击下肢与步数补齐"
                />
              </label>
              <label className="field span-2">
                <span className="form-label">动作明细</span>
                <textarea
                  value={newDraft.exercisesText}
                  onChange={(event) =>
                    setNewDraft((current) => ({ ...current, exercisesText: event.target.value }))
                  }
                  placeholder={"每行一个动作，例如：\n快走 35 分钟\n臀桥 3x15"}
                />
              </label>
              <label className="field span-2">
                <span className="form-label">恢复提醒</span>
                <input
                  value={newDraft.recoveryTip}
                  onChange={(event) =>
                    setNewDraft((current) => ({ ...current, recoveryTip: event.target.value }))
                  }
                  placeholder="例如：今晚尽量保证 7 小时以上睡眠"
                />
              </label>
            </div>
            <div className="action-row">
              <button className="button" type="submit">
                新增计划
              </button>
            </div>
          </form>
        </div>

        {items.length === 0 ? (
          <div className="todo-empty">
            <strong>当前没有计划条目</strong>
            <p className="muted">可以先从上面的表单新增一条，列表会从这里继续向下生长。</p>
          </div>
        ) : null}

        {items.map((day) => {
          const isDone = completed.includes(day.id);
          const isCelebrating = celebrating === day.id;
          const isEditing = editingId === day.id;

          return (
            <article
              className={`todo-item ${isDone ? "done" : ""} ${isEditing ? "is-editing" : ""}`}
              key={day.id}
            >
              <button
                type="button"
                className={`todo-check-button ${isDone ? "done" : ""}`}
                onClick={() => toggleComplete(day.id)}
                aria-label={`mark ${day.dayLabel} complete`}
              >
                <span className="todo-check" />
                {isCelebrating ? (
                  <span className="todo-confetti" aria-hidden="true">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <span
                        key={index}
                        className="todo-confetti-piece"
                        style={
                          {
                            ["--piece-rotate" as string]: `${index * 45}deg`
                          } as CSSProperties
                        }
                      />
                    ))}
                  </span>
                ) : null}
              </button>

              <div className="todo-main">
                <div className="todo-main-head">
                  <span className="todo-meta">{day.dayLabel}</span>
                  <h3>{day.focus}</h3>
                </div>
              </div>

              <span className="plan-duration">{day.duration}</span>

              <div className="todo-detail">
                <div className="todo-detail-inner">
                  {isEditing ? (
                    <form className="todo-inline-form" onSubmit={(event) => handleSaveEdit(event, day.id)}>
                      <div className="form-grid two">
                        <label className="field">
                          <span className="form-label">日期标签</span>
                          <input
                            value={editingDraft.dayLabel}
                            onChange={(event) =>
                              setEditingDraft((current) => ({ ...current, dayLabel: event.target.value }))
                            }
                          />
                        </label>
                        <label className="field">
                          <span className="form-label">时长</span>
                          <input
                            value={editingDraft.duration}
                            onChange={(event) =>
                              setEditingDraft((current) => ({ ...current, duration: event.target.value }))
                            }
                          />
                        </label>
                        <label className="field span-2">
                          <span className="form-label">计划标题</span>
                          <input
                            value={editingDraft.focus}
                            onChange={(event) =>
                              setEditingDraft((current) => ({ ...current, focus: event.target.value }))
                            }
                          />
                        </label>
                        <label className="field span-2">
                          <span className="form-label">动作明细</span>
                          <textarea
                            value={editingDraft.exercisesText}
                            onChange={(event) =>
                              setEditingDraft((current) => ({
                                ...current,
                                exercisesText: event.target.value
                              }))
                            }
                          />
                        </label>
                        <label className="field span-2">
                          <span className="form-label">恢复提醒</span>
                          <input
                            value={editingDraft.recoveryTip}
                            onChange={(event) =>
                              setEditingDraft((current) => ({
                                ...current,
                                recoveryTip: event.target.value
                              }))
                            }
                          />
                        </label>
                      </div>
                      <div className="action-row">
                        <button className="button" type="submit">
                          保存修改
                        </button>
                        <button className="ghost-button" type="button" onClick={cancelEditing}>
                          取消
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="todo-detail-copy">
                        <p>{day.exercises.length > 0 ? day.exercises.join(" / ") : "暂无动作明细"}</p>
                        <span className="todo-note">{day.recoveryTip}</span>
                      </div>
                      <div className="todo-item-tools">
                        <button className="chip-button" type="button" onClick={() => startEditing(day)}>
                          编辑
                        </button>
                        <button
                          className="ghost-button todo-danger-button"
                          type="button"
                          onClick={() => handleDeleteItem(day.id)}
                        >
                          删除
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <aside className="plan-quick-panel">
        <div className={`plan-progress-panel ${allCelebrating ? "complete" : ""}`}>
          {allCelebrating ? (
            <span className="plan-complete-burst" aria-hidden="true">
              {Array.from({ length: 12 }).map((_, index) => (
                <span
                  key={index}
                  style={
                    {
                      ["--burst-rotate" as string]: `${index * 30}deg`
                    } as CSSProperties
                  }
                />
              ))}
            </span>
          ) : null}

          <div className="plan-progress-kicker">
            <span className="section-label">进度 Progress</span>
            <span className="mini-chip">
              {completed.length} / {items.length}
            </span>
          </div>

          <div className="plan-progress-head">
            <strong>{progress}%</strong>
            <p className="muted">
              {progress === 100
                ? "本周计划已经全部完成。"
                : `还剩 ${Math.max(items.length - completed.length, 0)} 项待完成。`}
            </p>
          </div>

          <div className="plan-progress-rail" aria-hidden="true">
            {items.map((day) => (
              <span
                key={day.id}
                className={`plan-progress-step ${completed.includes(day.id) ? "done" : ""}`}
              />
            ))}
          </div>

          <div className="plan-progress-track" aria-hidden="true">
            <span className="plan-progress-fill" style={{ width: `${progress}%` }} />
          </div>

          <div className="plan-side-list">
            <div className="plan-side-row">
              <span className="metric-label">下一项 Next</span>
              <strong>{nextUp?.focus ?? "当前清单已完成"}</strong>
              <small>{nextUp?.duration ?? "可以新增下一条计划，或者继续优化现有安排。"}</small>
            </div>
            <div className="plan-side-row">
              <span className="metric-label">节奏 Rhythm</span>
              <strong>{completed.length >= 2 ? "执行节奏已经逐步稳定" : "先把连续性建立起来"}</strong>
              <small>先完成容易执行的条目，再慢慢补齐训练量，会比硬顶更稳。</small>
            </div>
            <div className="plan-side-row">
              <span className="metric-label">规则 Rule</span>
              <strong>恢复状态始终优先</strong>
              <small>如果睡眠偏低或疲劳偏高，优先下调负荷，再谈推进训练节奏。</small>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
