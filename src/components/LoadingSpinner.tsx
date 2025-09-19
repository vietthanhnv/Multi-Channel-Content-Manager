import React from 'react';
import styles from './LoadingSpinner.module.css';

export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'white';
  text?: string;
  overlay?: boolean;
  className?: string;
}

export function LoadingSpinner({ 
  size = 'medium', 
  color = 'primary', 
  text, 
  overlay = false,
  className 
}: LoadingSpinnerProps) {
  const spinnerClasses = [
    styles.spinner,
    styles[size],
    styles[color],
    className
  ].filter(Boolean).join(' ');

  const content = (
    <div className={styles.spinnerContainer}>
      <div className={spinnerClasses}>
        <div className={styles.spinnerInner}></div>
      </div>
      {text && <p className={styles.spinnerText}>{text}</p>}
    </div>
  );

  if (overlay) {
    return (
      <div className={styles.overlay}>
        {content}
      </div>
    );
  }

  return content;
}

export interface LoadingStateProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
  overlay?: boolean;
}

export function LoadingState({ 
  isLoading, 
  children, 
  loadingComponent,
  overlay = false 
}: LoadingStateProps) {
  if (isLoading) {
    return (
      <>
        {loadingComponent || <LoadingSpinner overlay={overlay} />}
      </>
    );
  }

  return <>{children}</>;
}

export interface ProgressIndicatorProps {
  progress: number; // 0-100
  text?: string;
  showPercentage?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'error';
  size?: 'small' | 'medium' | 'large';
}

export function ProgressIndicator({ 
  progress, 
  text, 
  showPercentage = true,
  color = 'primary',
  size = 'medium'
}: ProgressIndicatorProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  
  return (
    <div className={`${styles.progressContainer} ${styles[size]}`}>
      {text && <p className={styles.progressText}>{text}</p>}
      <div className={styles.progressBar}>
        <div 
          className={`${styles.progressFill} ${styles[color]}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showPercentage && (
        <span className={styles.progressPercentage}>
          {Math.round(clampedProgress)}%
        </span>
      )}
    </div>
  );
}

export interface ButtonLoadingProps {
  isLoading: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export function ButtonLoading({ 
  isLoading, 
  children, 
  disabled,
  onClick,
  className,
  type = 'button'
}: ButtonLoadingProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${styles.loadingButton} ${className || ''}`}
    >
      {isLoading && (
        <LoadingSpinner 
          size="small" 
          color="white" 
          className={styles.buttonSpinner}
        />
      )}
      <span className={isLoading ? styles.buttonTextLoading : ''}>
        {children}
      </span>
    </button>
  );
}

export default LoadingSpinner;