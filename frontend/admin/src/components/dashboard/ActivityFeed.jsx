import styles from './ActivityFeed.module.css';

const TYPE_CONFIG = {
  deal_won:     { label: 'Won',      color: 'var(--color-success)',  dot: '#10b981' },
  meeting:      { label: 'Meeting',  color: 'var(--color-info)',     dot: '#3b82f6' },
  proposal:     { label: 'Proposal', color: 'var(--color-accent)',   dot: '#6366f1' },
  stage_change: { label: 'Update',   color: 'var(--color-warning)',  dot: '#f59e0b' },
  note:         { label: 'Note',     color: 'var(--color-text-tertiary)', dot: '#585c78' },
  call:         { label: 'Call',     color: 'var(--color-text-tertiary)', dot: '#585c78' },
};

/**
 * ActivityFeed — Recent deal and team activity list.
 */
export function ActivityFeed({ activities = [] }) {
  if (!activities || activities.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-60)', fontSize: '13px', fontStyle: 'italic' }}>
        No recent activity logged.
      </div>
    );
  }

  return (
    <ul className={styles.list} role="list" aria-label="Recent activity">
      {activities.map((activity, i) => {
        const config = TYPE_CONFIG[activity.type] ?? TYPE_CONFIG.note;
        return (
          <li
            key={activity.id}
            className={styles.item}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            {/* Timeline dot */}
            <span
              className={styles.dot}
              style={{ backgroundColor: config.dot }}
              aria-hidden="true"
            />

            <div className={styles.body}>
              <div className={styles.top}>
                {/* Avatar */}
                <span className={styles.avatar} title={activity.user}>
                  {activity.avatar}
                </span>

                {/* Content */}
                <div className={styles.content}>
                  <p className={styles.title}>{activity.title}</p>
                  <p className={styles.description}>{activity.description}</p>
                </div>
              </div>

              {/* Meta */}
              <div className={styles.meta}>
                <span className={styles.type} style={{ color: config.color }}>
                  {config.label}
                </span>
                <span className={styles.separator} aria-hidden="true">·</span>
                <time className={styles.time} dateTime={activity.timestamp}>
                  {activity.timestamp}
                </time>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
