export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: string;
}) {
  return (
    <header className="dv-page-header">
      {eyebrow && <p className="dv-eyebrow">{eyebrow}</p>}
      {meta && <p className="dv-page-header__meta">{meta}</p>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </header>
  );
}
