import { Badge } from '../ui/Badge';
import styles from './TaskList.module.css';

const PRIORITY_MAP = {
  high:   { label: 'High',   variant: 'danger' },
  medium: { label: 'Medium', variant: 'warning' },
  low:    { label: 'Low',    variant: 'neutral' },
};

const STATUS_MAP = {
  pending:     { label: 'Pending',     variant: 'neutral' },
  in_progress: { label: 'In Progress', variant: 'info' },
  done:        { label: 'Done',        variant: 'success' },
};

/**
 * TaskList — Upcoming tasks with priority, due date, and status.
 */
export function TaskList({ tasks = [] }) {
  if (!tasks || tasks.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-60)', fontSize: '13px', fontStyle: 'italic' }}>
        No active tasks.
      </div>
    );
  }

  return (
    <ul className={styles.list} role="list" aria-label="Upcoming tasks">
      {tasks.map((task, i) => {
        const priority = PRIORITY_MAP[task.priority] ?? PRIORITY_MAP.low;
        const status   = STATUS_MAP[task.status] ?? STATUS_MAP.pending;

        return (
          <li
            key={task.id}
            className={styles.item}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            {/* Checkbox (mock) */}
            <button
              type="button"
              className={`${styles.checkbox} ${task.status === 'done' ? styles.checked : ''}`}
              aria-label={`Mark "${task.title}" as done`}
              tabIndex={0}
            >
              {task.status === 'done' && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path d="M2 5L4.5 7.5L8 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>

            <div className={styles.content}>
              <div className={styles.top}>
                <p className={`${styles.title} ${task.status === 'done' ? styles.done : ''}`}>
                  {task.title}
                </p>
              </div>

              <div className={styles.meta}>
                <span className={styles.deal}>{task.deal}</span>
                <span className={styles.separator} aria-hidden="true">·</span>
                <time className={styles.due}>{task.dueDate}</time>
              </div>
            </div>

            <div className={styles.badges}>
              <Badge variant={priority.variant} size="sm" dot>
                {priority.label}
              </Badge>
              <Badge variant={status.variant} size="sm">
                {status.label}
              </Badge>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
