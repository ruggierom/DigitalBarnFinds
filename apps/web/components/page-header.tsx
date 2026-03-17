import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  compact?: boolean;
  level?: "h1" | "h2";
};

export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  compact = false,
  level = "h1",
}: PageHeaderProps) {
  const TitleTag = level;

  return (
    <header
      className={`page-header${meta ? " page-header--split" : ""}${compact ? " page-header--compact" : ""}`}
    >
      <div className="page-header__content">
        {eyebrow ? <div className="page-header__eyebrow">{eyebrow}</div> : null}
        <TitleTag className="section-title">{title}</TitleTag>
        {description ? <p className="page-header__copy">{description}</p> : null}
      </div>
      {meta ? <div className="page-header__meta">{meta}</div> : null}
    </header>
  );
}
