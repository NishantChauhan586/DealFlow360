import { ArrowRight } from 'lucide-react';
import styles from './AIInsights.module.css';

const TYPE_CONFIG = {
  attention: {
    label: 'Attention Required',
    className: 'attention',
  },
  risk: {
    label: 'Risk Detected',
    className: 'risk',
  },
  recommendation: {
    label: 'Recommendation',
    className: 'recommendation',
  },
  observation: {
    label: 'Observation',
    className: 'observation',
  },
};

/**
 * AIInsights — AI-generated deal/pipeline insights panel.
 * NOTE: All data here is mock/demo. The AI layer should never
 * override deterministic business rules (per ai-intelligence-layer.md).
 */
export function AIInsights({ insights = [] }) {
  if (!insights || insights.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-60)', fontSize: '13px', fontStyle: 'italic' }}>
        No active AI insights available.
      </div>
    );
  }

  return (
    <ul className={styles.list} role="list" aria-label="AI Insights">
      {insights.map((insight, i) => {
        const config = TYPE_CONFIG[insight.type] ?? TYPE_CONFIG.observation;
        return (
          <li
            key={insight.id}
            className={`${styles.item} ${styles[config.className]}`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className={styles.top}>
              <span className={styles.typeTag}>{config.label}</span>
              {insight.action && (
                <button type="button" className={styles.actionBtn} aria-label={`${insight.action} — ${insight.title}`}>
                  {insight.action}
                  <ArrowRight size={11} aria-hidden="true" />
                </button>
              )}
            </div>
            <p className={styles.title}>{insight.title}</p>
            <p className={styles.description}>{insight.description}</p>
          </li>
        );
      })}
    </ul>
  );
}
