import { useEffect, useRef, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Briefcase,
  DollarSign,
  Target,
  Clock,
} from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';
import { formatKpiValue, formatTrend } from '../../utils/formatters';
import styles from './KPICard.module.css';

const ICON_MAP = {
  TrendingUp,
  Briefcase,
  DollarSign,
  Target,
  Clock,
};

const COLOR_MAP = {
  accent:  { bg: 'var(--color-accent-muted)',   icon: 'var(--color-accent-text)' },
  info:    { bg: 'var(--color-info-muted)',      icon: 'var(--color-info-text)' },
  success: { bg: 'var(--color-success-muted)',   icon: 'var(--color-success-text)' },
  warning: { bg: 'var(--color-warning-muted)',   icon: 'var(--color-warning-text)' },
  danger:  { bg: 'var(--color-danger-muted)',    icon: 'var(--color-danger-text)' },
};

/**
 * KPICard — Displays a single key performance indicator.
 * Animates number on mount, shows trend direction.
 */
export function KPICard({ metric, animDelay = 0 }) {
  const { label, value, format, trend, trendPeriod, color } = metric;
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  // Start count-up after animation delay
  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), animDelay);
    return () => clearTimeout(timer);
  }, [animDelay]);

  const animValue = useCountUp(value, 1200, started);
  const displayValue = formatKpiValue(animValue, format);
  const colors = COLOR_MAP[color] ?? COLOR_MAP.accent;

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendClass = trend > 0 ? styles.trendUp : trend < 0 ? styles.trendDown : styles.trendNeutral;

  return (
    <article
      ref={ref}
      className={styles.card}
      style={{ animationDelay: `${animDelay}ms` }}
      aria-label={`${label}: ${formatKpiValue(value, format)}`}
    >
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        <span
          className={styles.iconWrap}
          style={{ backgroundColor: colors.bg }}
        >
          <KpiIcon name={metric.icon} color={colors.icon} />
        </span>
      </div>

      <div className={styles.value} aria-live="polite" aria-atomic="true">
        {displayValue}
      </div>

      <div className={styles.trend}>
        <span className={`${styles.trendBadge} ${trendClass}`}>
          <TrendIcon size={11} aria-hidden="true" />
          {formatTrend(Math.abs(trend), format === 'currency' ? 'percent' : 'percent')}
        </span>
        <span className={styles.trendPeriod}>{trendPeriod}</span>
      </div>
    </article>
  );
}

/** Resolves a Lucide icon by name from the static ICON_MAP */
function KpiIcon({ name, color }) {
  const Icon = ICON_MAP[name];
  if (!Icon) return <span style={{ width: 16, height: 16 }} />;
  return <Icon size={15} color={color} aria-hidden="true" />;
}
