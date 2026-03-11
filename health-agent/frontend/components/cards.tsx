import { AgentCard } from "@/lib/types";

export function InfoCard({
  title,
  description,
  bullets
}: {
  title: string;
  description: string;
  bullets?: string[];
}) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      {bullets && bullets.length > 0 ? (
        <ul>
          {bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function AgentCardList({ cards }: { cards: AgentCard[] }) {
  return (
    <div className="grid">
      {cards.map((card, index) => (
        <InfoCard
          key={`${card.type}-${index}`}
          title={card.title}
          description={card.description}
          bullets={card.bullets}
        />
      ))}
    </div>
  );
}

