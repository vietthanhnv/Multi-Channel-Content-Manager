import React, { useEffect, useRef } from 'react';
import { useFocusTrap, useKeyboardNavigation, useScreenReaderAnnouncement } from '../hooks/useKeyboardNavigation';
import styles from './AddChannelModal.module.css';
import accessibilityStyles from '../styles/accessibility.module.css';

interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  initialFocus?: 'first' | 'close' | 'none';
  className?: string;
  ariaDescribedBy?: string;
  ariaLabelledBy?: string;
}

const AccessibleModal: React.FC<AccessibleModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  initialFocus = 'first',
  className = '',
  ariaDescribedBy,
  ariaLabelledBy,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  
  const { announce } = useScreenReaderAnnouncement();
  
  // Focus trap for modal content
  const focusTrapRef = useFocusTrap(isOpen);
  
  // Keyboard navigation for modal
  const { elementRef: modalKeyboardRef } = useKeyboardNavigation({
    onEscape: closeOnEscape ? onClose : undefined,
  });

  // Handle overlay click
  const handleOverlayClick = (event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === overlayRef.current) {
      onClose();
    }
  };

  // Handle close button click
  const handleCloseClick = () => {
    onClose();
  };

  // Manage focus and body scroll
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Announce modal opening
      announce(`Modal opened: ${title}`, 'assertive');
      
      // Set initial focus
      setTimeout(() => {
        if (initialFocus === 'close' && closeButtonRef.current) {
          closeButtonRef.current.focus();
        } else if (initialFocus === 'first') {
          const firstFocusable = modalRef.current?.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          ) as HTMLElement;
          if (firstFocusable) {
            firstFocusable.focus();
          } else if (closeButtonRef.current) {
            closeButtonRef.current.focus();
          }
        }
        // If initialFocus is 'none', don't set focus automatically
      }, 100);
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
      
      // Restore focus to previous element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
        previousActiveElement.current = null;
      }
      
      // Announce modal closing
      announce('Modal closed', 'polite');
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, title, initialFocus, announce]);

  // Handle escape key globally when modal is open
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) {
    return null;
  }

  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-lg',
    large: 'max-w-4xl',
  };

  return (
    <div
      ref={overlayRef}
      className={`${styles.modalOverlay} ${accessibilityStyles.accessibleModal}`}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy || 'modal-title'}
      aria-describedby={ariaDescribedBy}
    >
      <div
        ref={(el) => {
          modalRef.current = el;
          focusTrapRef.current = el;
          modalKeyboardRef.current = el;
        }}
        className={`
          ${styles.modalContent} 
          ${accessibilityStyles.accessibleModalContent}
          ${sizeClasses[size]}
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={`${styles.modalHeader} ${accessibilityStyles.accessibleModalHeader}`}>
          <h2 
            id={ariaLabelledBy || 'modal-title'}
            className={`${styles.modalTitle} ${accessibilityStyles.accessibleModalTitle}`}
          >
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className={`${styles.closeButton} ${accessibilityStyles.accessibleModalCloseButton}`}
            onClick={handleCloseClick}
            aria-label="Close modal"
            title="Close modal"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className={styles.modalContent}>
          {children}
        </div>

        {/* Screen reader instructions */}
        <div className={accessibilityStyles.srOnly}>
          <p>
            Modal dialog. Press Escape to close or use the close button.
            Use Tab to navigate between interactive elements.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AccessibleModal;