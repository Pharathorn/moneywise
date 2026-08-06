import { ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return <div className={`${styles.card} ${className}`}>{children}</div>;
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className={styles['card-header']}>
      <div>
        <h3 className={styles['card-title']}>{title}</h3>
        {subtitle && <p className={styles['card-subtitle']}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
