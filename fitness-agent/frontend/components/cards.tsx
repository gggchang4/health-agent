import type { AgentCard } from "@/lib/types";
import type { ReactNode } from "react";

const toneByType: Record<AgentCard["type"], { label: string; tone: string }> = {
  health_advice_card: { label: "健康建议", tone: "sage" },
  workout_plan_card: { label: "训练计划", tone: "sand" },
  exercise_card: { label: "动作说明", tone: "slate" },
  recovery_card: { label: "恢复建议", tone: "amber" },
  place_result_card: { label: "地点结果", tone: "marine" },
  reasoning_summary_card: { label: "推理摘要", tone: "mist" },
  tool_activity_card: { label: "工具活动", tone: "mist" },
  action_proposal_card: { label: "待确认操作", tone: "marine" },
  action_result_card: { label: "执行结果", tone: "sage" }
};

function extractProposalId(card: AgentCard) {
  const proposalId = card.data?.proposalId;
  return typeof proposalId === "string" ? proposalId : "";
}

export function InfoCard({
  title,
  description,
  bullets,
  kicker,
  tone = "mist",
  children
}: {
  title: string;
  description: string;
  bullets?: string[];
  kicker?: string;
  tone?: string;
  children?: ReactNode;
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
      {children}
    </article>
  );
}

export function AgentCardList({
  cards,
  onApproveProposal,
  onRejectProposal,
  pendingProposalId
}: {
  cards: AgentCard[];
  onApproveProposal?: (proposalId: string) => void;
  onRejectProposal?: (proposalId: string) => void;
  pendingProposalId?: string | null;
}) {
  return (
    <div className="cards-stack">
      {cards.map((card, index) => {
        const proposalId = extractProposalId(card);
        const isProposal = card.type === "action_proposal_card" && proposalId;
        const isPending = pendingProposalId === proposalId;

        return (
          <InfoCard
            key={`${card.type}-${index}-${proposalId || "card"}`}
            title={card.title}
            description={card.description}
            bullets={card.bullets}
            kicker={toneByType[card.type].label}
            tone={toneByType[card.type].tone}
          >
            {isProposal ? (
              <div className="action-row">
                <button
                  type="button"
                  className="ghost-button"
                  disabled={isPending}
                  onClick={() => onRejectProposal?.(proposalId)}
                >
                  {isPending ? "处理中..." : "拒绝"}
                </button>
                <button
                  type="button"
                  className="button"
                  disabled={isPending}
                  onClick={() => onApproveProposal?.(proposalId)}
                >
                  {isPending ? "处理中..." : "确认执行"}
                </button>
              </div>
            ) : null}
          </InfoCard>
        );
      })}
    </div>
  );
}
