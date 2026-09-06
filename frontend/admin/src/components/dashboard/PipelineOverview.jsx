import { formatCurrency, formatNumber } from '../../utils/formatters';
import styles from './PipelineOverview.module.css';

/**
 * PipelineOverview — Visual pipeline stage breakdown.
 * Shows deal count, value, and proportional bar for each stage.
 */
export function PipelineOverview({ stages }) {
  const totalValue = stages.reduce((sum, s) => sum + s.value, 0);
  const totalDeals = stages.reduce((sum, s) => sum + s.dealCount, 0);

  return (
    <section className={styles.container} aria-label="Pipeline overview">
      {/* Distribution bar */}
      <div className={styles.bar} role="img" aria-label="Pipeline stage distribution">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className={styles.barSegment}
            style={{
              width: `${(stage.value / totalValue) * 100}%`,
              backgroundColor: stage.color,
            }}
            title={`${stage.label}: ${formatCurrency(stage.value, true)}`}
          />
        ))}
      </div>

      {/* Stage grid */}
      <div className={styles.grid}>
        {stages.map((stage, i) => (
          <div
            key={stage.id}
            className={styles.stage}
            style={{ animationDelay: `${i * 50 + 100}ms` }}
          >
            <div className={styles.stageHeader}>
              <span
                className={styles.stageDot}
                style={{ backgroundColor: stage.color }}
                aria-hidden="true"
              />
              <span className={styles.stageName}>{stage.label}</span>
            </div>
            <div className={styles.stageValue}>
              {formatCurrency(stage.value, true)}
            </div>
            <div className={styles.stageMeta}>
              {formatNumber(stage.dealCount)} deal{stage.dealCount !== 1 ? 's' : ''}
              <span className={styles.stagePct}>
                {((stage.value / totalValue) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary footer */}
      <div className={styles.footer}>
        <span className={styles.footerStat}>
          <strong>{formatNumber(totalDeals)}</strong> total deals
        </span>
        <span className={styles.footerDivider} />
        <span className={styles.footerStat}>
          <strong>{formatCurrency(totalValue, true)}</strong> total value
        </span>
      </div>
    </section>
  );
}
