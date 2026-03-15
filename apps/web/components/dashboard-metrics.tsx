import Link from "next/link";

type Metric = {
  label: string;
  value: number;
  href?: string;
};

type DashboardMetricsProps = {
  metrics: Metric[];
};

export function DashboardMetrics({ metrics }: DashboardMetricsProps) {
  return (
    <section className="grid">
      {metrics.map((metric) => (
        metric.href ? (
          <Link className="card metric metric--link" href={metric.href as any} key={metric.label}>
            <div className="metric__label">{metric.label}</div>
            <div className="metric__value">{metric.value}</div>
          </Link>
        ) : (
          <article className="card metric" key={metric.label}>
            <div className="metric__label">{metric.label}</div>
            <div className="metric__value">{metric.value}</div>
          </article>
        )
      ))}
    </section>
  );
}
