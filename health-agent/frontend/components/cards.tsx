import type { AgentCard } from "@/lib/types";

const toneByType: Record<AgentCard["type"], { label: string; tone: string }> = {
  health_advice_card: { label: "健康建议", tone: "sage" },
  workout_plan_card: { label: "训练计划", tone: "sand" },
  exercise_card: { label: "动作说明", tone: "slate" },
  recovery_card: { label: "恢复建议", tone: "amber" },
  place_result_card: { label: "地点结果", tone: "marine" },
  reasoning_summary_card: { label: "推理摘要", tone: "mist" },
  tool_activity_card: { label: "工具活动", tone: "mist" }
};

export function InfoCard({
  title,
  description,
  bullets,
  kicker,
  tone = "mist"
}: {
  title: string;
  description: string;
  bullets?: string[];
  kicker?: string;
  tone?: string;
}) {
  return (
    <article className={`info-card tone-${tone}`}>
      {kicker ? <span className="info-kicker">{kicker}</span> : null}
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      {bullets && bullets.length > 0 ? (
        <ul className="info-list">
          {bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export function AgentCardList({ cards }: { cards: AgentCard[] }) {
  return (
    <div className="cards-stack">
      {cards.map((card, index) => (
        <InfoCard
          key={`${card.type}-${index}`}
          title={card.title}
          description={card.description}
          bullets={card.bullets}
          kicker={toneByType[card.type].label}
          tone={toneByType[card.type].tone}
        />
      ))}
    </div>
  );
}
