import { PropsWithChildren, ReactNode } from "react";

export function PageHero({
  eyebrow,
  title,
  description,
  meta,
  children
}: PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
  meta?: string[];
  children?: ReactNode;
}>) {
  return (
    <section className="page-hero">
      <div className="page-hero-copy">
        <span className="page-eyebrow">{eyebrow}</span>
        <h1 className="page-title">{title}</h1>
        <p className="page-description">{description}</p>
        {meta && meta.length > 0 ? (
          <div className="hero-meta">
            {meta.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        ) : null}
      </div>
      {children ? <div className="page-hero-side">{children}</div> : null}
    </section>
  );
}
