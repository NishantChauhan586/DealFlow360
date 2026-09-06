import styles from './Badge.module.css';

/**
 * Badge — Status indicator primitive
 * @param {'success'|'warning'|'danger'|'info'|'neutral'|'accent'} variant
 * @param {'sm'|'md'} size
 * @param {boolean} dot - Show a colored dot prefix
 */
export function Badge({ children, variant = 'neutral', size = 'md', dot = false }) {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${styles[size]}`}>
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  );
}
