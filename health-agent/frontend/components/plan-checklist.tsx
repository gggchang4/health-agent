"use client";

import { WorkoutPlanDay } from "@/lib/types";
import { CSSProperties, useEffect, useMemo, useState } from "react";

export function PlanChecklist({ plan }: { plan: WorkoutPlanDay[] }) {
  const [completed, setCompleted] = useState<string[]>([]);
  const [celebrating, setCelebrating] = useState<string | null>(null);
  const [allCelebrating, setAllCelebrating] = useState(false);

  const progress = useMemo(
    () => Math.round((completed.length / Math.max(plan.length, 1)) * 100),
    [completed.length, plan.length]
  );

  const nextUp = plan.find((day) => !completed.includes(day.dayLabel)) ?? null;

  useEffect(() => {
    if (plan.length === 0 || completed.length !== plan.length) {
      setAllCelebrating(false);
      return;
    }

    setAllCelebrating(true);
    const timer = window.setTimeout(() => setAllCelebrating(false), 1600);
    return () => window.clearTimeout(timer);
  }, [completed.length, plan.length]);

  function toggleComplete(dayLabel: string) {
    const isDone = completed.includes(dayLabel);

    if (isDone) {
      setCompleted((current) => current.filter((item) => item !== dayLabel));
      return;
    }

    setCompleted((current) => [...current, dayLabel]);
    setCelebrating(dayLabel);
    window.setTimeout(() => {
      setCelebrating((current) => (current === dayLabel ? null : current));
    }, 900);
  }

  return (
    <div className="dash-grid">
      <section className="todo-list">
        {plan.map((day) => {
          const isDone = completed.includes(day.dayLabel);
          const isCelebrating = celebrating === day.dayLabel;

          return (
            <article className={`todo-item ${isDone ? "done" : ""}`} key={day.dayLabel}>
              <button
                type="button"
                className={`todo-check-button ${isDone ? "done" : ""}`}
                onClick={() => toggleComplete(day.dayLabel)}
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
                <div className="todo-detail">
                  <p>{day.exercises.slice(0, 2).join(" / ")}</p>
                  <span className="todo-note">{day.recoveryTip}</span>
                </div>
              </div>

              <span className="plan-duration">{day.duration}</span>
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
              {completed.length} / {plan.length}
            </span>
          </div>

          <div className="plan-progress-head">
            <strong>{progress}%</strong>
            <p className="muted">
              {progress === 100
                ? "本周已全部完成。"
                : `还剩 ${Math.max(plan.length - completed.length, 0)} 项待完成。`}
            </p>
          </div>

          <div className="plan-progress-rail" aria-hidden="true">
            {plan.map((day) => (
              <span
                key={day.dayLabel}
                className={`plan-progress-step ${completed.includes(day.dayLabel) ? "done" : ""}`}
              />
            ))}
          </div>

          <div className="plan-progress-track" aria-hidden="true">
            <span className="plan-progress-fill" style={{ width: `${progress}%` }} />
          </div>

          <div className="plan-side-list">
            <div className="plan-side-row">
              <span className="metric-label">下一项 Next</span>
              <strong>{nextUp?.focus ?? "本周清单已清空"}</strong>
              <small>{nextUp?.duration ?? "可以重置计划，开始下一轮。"} </small>
            </div>
            <div className="plan-side-row">
              <span className="metric-label">节奏 Rhythm</span>
              <strong>{completed.length >= 2 ? "执行节奏已经稳定" : "先把连续性建立起来"}</strong>
              <small>先把容易完成的训练做完，再考虑继续加量。</small>
            </div>
            <div className="plan-side-row">
              <span className="metric-label">规则 Rule</span>
              <strong>恢复状态始终优先</strong>
              <small>睡眠偏低或疲劳偏高时，先减负荷，再谈推进训练节奏。</small>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
