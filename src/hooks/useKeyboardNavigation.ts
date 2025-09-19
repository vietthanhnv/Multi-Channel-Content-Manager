import { useEffect, useRef, useState, useCallback } from 'react';

interface KeyboardNavigationOptions {
  onEnter?: () => void;
  onSpace?: () => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onTab?: (shiftKey: boolean) => void;
  onHome?: () => void;
  onEnd?: () => void;
  onPageUp?: () => void;
  onPageDown?: () => void;
  preventDefault?: string[]; // Array of key names to prevent default for
  stopPropagation?: string[]; // Array of key names to stop propagation for
  disabled?: boolean;
}

export const useKeyboardNavigation = (options: KeyboardNavigationOptions = {}) => {
  const {
    onEnter,
    onSpace,
    onEscape,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onTab,
    onHome,
    onEnd,
    onPageUp,
    onPageDown,
    preventDefault = [],
    stopPropagation = [],
    disabled = false,
  } = options;

  const elementRef = useRef<HTMLElement>(null);
  const [isKeyboardFocused, setIsKeyboardFocused] = useState(false);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (disabled) return;

    const { key, shiftKey } = event;

    // Check if we should prevent default or stop propagation
    if (preventDefault.includes(key)) {
      event.preventDefault();
    }
    if (stopPropagation.includes(key)) {
      event.stopPropagation();
    }

    // Handle specific keys
    switch (key) {
      case 'Enter':
        if (onEnter) {
          event.preventDefault();
          onEnter();
        }
        break;
      case ' ':
      case 'Space':
        if (onSpace) {
          event.preventDefault();
          onSpace();
        }
        break;
      case 'Escape':
        if (onEscape) {
          onEscape();
        }
        break;
      case 'ArrowUp':
        if (onArrowUp) {
          event.preventDefault();
          onArrowUp();
        }
        break;
      case 'ArrowDown':
        if (onArrowDown) {
          event.preventDefault();
          onArrowDown();
        }
        break;
      case 'ArrowLeft':
        if (onArrowLeft) {
          event.preventDefault();
          onArrowLeft();
        }
        break;
      case 'ArrowRight':
        if (onArrowRight) {
          event.preventDefault();
          onArrowRight();
        }
        break;
      case 'Tab':
        if (onTab) {
          onTab(shiftKey);
        }
        break;
      case 'Home':
        if (onHome) {
          event.preventDefault();
          onHome();
        }
        break;
      case 'End':
        if (onEnd) {
          event.preventDefault();
          onEnd();
        }
        break;
      case 'PageUp':
        if (onPageUp) {
          event.preventDefault();
          onPageUp();
        }
        break;
      case 'PageDown':
        if (onPageDown) {
          event.preventDefault();
          onPageDown();
        }
        break;
    }
  }, [
    disabled,
    onEnter,
    onSpace,
    onEscape,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onTab,
    onHome,
    onEnd,
    onPageUp,
    onPageDown,
    preventDefault,
    stopPropagation,
  ]);

  const handleFocus = useCallback(() => {
    setIsKeyboardFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsKeyboardFocused(false);
  }, []);

  const handleMouseDown = useCallback(() => {
    setIsKeyboardFocused(false);
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('keydown', handleKeyDown);
    element.addEventListener('focus', handleFocus);
    element.addEventListener('blur', handleBlur);
    element.addEventListener('mousedown', handleMouseDown);

    return () => {
      element.removeEventListener('keydown', handleKeyDown);
      element.removeEventListener('focus', handleFocus);
      element.removeEventListener('blur', handleBlur);
      element.removeEventListener('mousedown', handleMouseDown);
    };
  }, [handleKeyDown, handleFocus, handleBlur, handleMouseDown]);

  return {
    elementRef,
    isKeyboardFocused,
    setKeyboardFocused: setIsKeyboardFocused,
  };
};

// Hook for managing focus within a container (like a modal or dropdown)
export const useFocusTrap = (isActive: boolean = true) => {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus the first element when trap becomes active
    firstElement?.focus();

    document.addEventListener('keydown', handleTabKey);

    return () => {
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [isActive]);

  return containerRef;
};

// Hook for managing roving tabindex (like in a grid or list)
export const useRovingTabIndex = (
  items: HTMLElement[],
  orientation: 'horizontal' | 'vertical' | 'both' = 'both'
) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const moveToNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const moveToPrevious = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  const moveToFirst = useCallback(() => {
    setActiveIndex(0);
  }, []);

  const moveToLast = useCallback(() => {
    setActiveIndex(items.length - 1);
  }, [items.length]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault();
          moveToNext();
        }
        break;
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault();
          moveToPrevious();
        }
        break;
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault();
          moveToNext();
        }
        break;
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault();
          moveToPrevious();
        }
        break;
      case 'Home':
        event.preventDefault();
        moveToFirst();
        break;
      case 'End':
        event.preventDefault();
        moveToLast();
        break;
    }
  }, [orientation, moveToNext, moveToPrevious, moveToFirst, moveToLast]);

  useEffect(() => {
    items.forEach((item, index) => {
      if (item) {
        item.tabIndex = index === activeIndex ? 0 : -1;
        if (index === activeIndex) {
          item.focus();
        }
      }
    });
  }, [items, activeIndex]);

  return {
    activeIndex,
    setActiveIndex,
    handleKeyDown,
    moveToNext,
    moveToPrevious,
    moveToFirst,
    moveToLast,
  };
};

// Hook for announcing changes to screen readers
export const useScreenReaderAnnouncement = () => {
  const announcementRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announcementRef.current) {
      // Create announcement element if it doesn't exist
      const element = document.createElement('div');
      element.setAttribute('aria-live', priority);
      element.setAttribute('aria-atomic', 'true');
      element.className = 'sr-only';
      element.style.position = 'absolute';
      element.style.left = '-10000px';
      element.style.width = '1px';
      element.style.height = '1px';
      element.style.overflow = 'hidden';
      document.body.appendChild(element);
      announcementRef.current = element;
    }

    const element = announcementRef.current;
    element.setAttribute('aria-live', priority);
    
    // Clear and then set the message to ensure it's announced
    element.textContent = '';
    setTimeout(() => {
      element.textContent = message;
    }, 100);
  }, []);

  useEffect(() => {
    return () => {
      if (announcementRef.current) {
        document.body.removeChild(announcementRef.current);
      }
    };
  }, []);

  return { announce };
};

// Hook for managing drag and drop accessibility
export const useAccessibleDragDrop = () => {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const { announce } = useScreenReaderAnnouncement();

  const startDrag = useCallback((itemId: string, itemLabel: string) => {
    setDraggedItem(itemId);
    announce(`Started dragging ${itemLabel}. Use arrow keys to navigate to a drop zone, then press Enter or Space to drop.`, 'assertive');
  }, [announce]);

  const endDrag = useCallback((success: boolean, itemLabel: string, targetLabel?: string) => {
    if (success && targetLabel) {
      announce(`${itemLabel} dropped successfully on ${targetLabel}.`, 'assertive');
    } else {
      announce(`Drag cancelled for ${itemLabel}.`, 'polite');
    }
    setDraggedItem(null);
    setDropTarget(null);
  }, [announce]);

  const setDropTargetWithAnnouncement = useCallback((targetId: string | null, targetLabel?: string) => {
    setDropTarget(targetId);
    if (targetId && targetLabel && draggedItem) {
      announce(`Drop zone: ${targetLabel}. Press Enter or Space to drop here.`, 'polite');
    }
  }, [draggedItem, announce]);

  return {
    draggedItem,
    dropTarget,
    startDrag,
    endDrag,
    setDropTarget: setDropTargetWithAnnouncement,
    announce,
  };
};