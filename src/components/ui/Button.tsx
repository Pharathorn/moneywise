import { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  icon?: ReactNode;
  children?: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', icon, children, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`${styles.button} ${styles[`button-${variant}`]} ${styles[`button-${size}`]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
