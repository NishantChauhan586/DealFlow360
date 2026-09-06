import styles from './Card.module.css';

/**
 * Card — Base surface primitive
 * @param {'default'|'elevated'|'flat'} variant
 * @param {boolean} hoverable - Add hover elevation effect
 * @param {boolean} interactive - Make it look clickable (pointer cursor)
 */
export function Card({
  children,
  variant = 'default',
  hoverable = false,
  interactive = false,
  className = '',
  onClick,
  ...props
}) {
  return (
    <div
      className={`
        ${styles.card}
        ${styles[variant]}
        ${hoverable ? styles.hoverable : ''}
        ${interactive ? styles.interactive : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive && onClick ? (e) => e.key === 'Enter' && onClick(e) : undefined}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`${styles.header} ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return (
    <div className={`${styles.body} ${className}`}>
      {children}
    </div>
  );
}
