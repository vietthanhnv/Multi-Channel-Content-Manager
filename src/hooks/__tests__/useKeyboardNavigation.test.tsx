import { renderHook, act } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { useKeyboardNavigation, useFocusTrap, useScreenReaderAnnouncement } from '../useKeyboardNavigation';

// Mock navigator.vibrate for mobile tests
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: jest.fn(),
});

describe('useKeyboardNavigation', () => {
  let mockElement: HTMLDivElement;

  beforeEach(() => {
    mockElement = document.createElement('div');
    document.body.appendChild(mockElement);
  });

  afterEach(() => {
    document.body.removeChild(mockElement);
  });

  it('should handle keyboard events correctly', () => {
    const mockOnEnter = jest.fn();
    const mockOnSpace = jest.fn();
    const mockOnEscape = jest.fn();
    const mockOnArrowUp = jest.fn();

    const { result } = renderHook(() =>
      useKeyboardNavigation({
        onEnter: mockOnEnter,
        onSpace: mockOnSpace,
        onEscape: mockOnEscape,
        onArrowUp: mockOnArrowUp,
      })
    );

    // Assign the mock element to the ref
    act(() => {
      result.current.elementRef.current = mockElement;
    });

    // Test Enter key
    act(() => {
      fireEvent.keyDown(mockElement, { key: 'Enter' });
    });
    expect(mockOnEnter).toHaveBeenCalledTimes(1);

    // Test Space key
    act(() => {
      fireEvent.keyDown(mockElement, { key: ' ' });
    });
    expect(mockOnSpace).toHaveBeenCalledTimes(1);

    // Test Escape key
    act(() => {
      fireEvent.keyDown(mockElement, { key: 'Escape' });
    });
    expect(mockOnEscape).toHaveBeenCalledTimes(1);

    // Test Arrow Up key
    act(() => {
      fireEvent.keyDown(mockElement, { key: 'ArrowUp' });
    });
    expect(mockOnArrowUp).toHaveBeenCalledTimes(1);
  });

  it('should track keyboard focus state', () => {
    const { result } = renderHook(() => useKeyboardNavigation());

    act(() => {
      result.current.elementRef.current = mockElement;
    });

    expect(result.current.isKeyboardFocused).toBe(false);

    // Simulate focus event
    act(() => {
      fireEvent.focus(mockElement);
    });
    expect(result.current.isKeyboardFocused).toBe(true);

    // Simulate blur event
    act(() => {
      fireEvent.blur(mockElement);
    });
    expect(result.current.isKeyboardFocused).toBe(false);

    // Simulate mouse down (should set keyboard focus to false)
    act(() => {
      fireEvent.focus(mockElement);
      fireEvent.mouseDown(mockElement);
    });
    expect(result.current.isKeyboardFocused).toBe(false);
  });

  it('should respect disabled state', () => {
    const mockOnEnter = jest.fn();

    const { result } = renderHook(() =>
      useKeyboardNavigation({
        onEnter: mockOnEnter,
        disabled: true,
      })
    );

    act(() => {
      result.current.elementRef.current = mockElement;
    });

    act(() => {
      fireEvent.keyDown(mockElement, { key: 'Enter' });
    });

    expect(mockOnEnter).not.toHaveBeenCalled();
  });

  it('should prevent default for specified keys', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        preventDefault: ['Enter', 'ArrowUp'],
      })
    );

    act(() => {
      result.current.elementRef.current = mockElement;
    });

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    const preventDefaultSpy = jest.spyOn(enterEvent, 'preventDefault');

    act(() => {
      mockElement.dispatchEvent(enterEvent);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});

describe('useFocusTrap', () => {
  let container: HTMLDivElement;
  let firstButton: HTMLButtonElement;
  let lastButton: HTMLButtonElement;

  beforeEach(() => {
    container = document.createElement('div');
    firstButton = document.createElement('button');
    lastButton = document.createElement('button');
    
    firstButton.textContent = 'First';
    lastButton.textContent = 'Last';
    
    container.appendChild(firstButton);
    container.appendChild(lastButton);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should trap focus within container', () => {
    const { result } = renderHook(() => useFocusTrap(true));

    act(() => {
      result.current.current = container;
    });

    // Focus should be set to first element
    expect(document.activeElement).toBe(firstButton);

    // Tab from last element should go to first
    lastButton.focus();
    act(() => {
      fireEvent.keyDown(document, { key: 'Tab' });
    });
    expect(document.activeElement).toBe(firstButton);

    // Shift+Tab from first element should go to last
    firstButton.focus();
    act(() => {
      fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    });
    expect(document.activeElement).toBe(lastButton);
  });

  it('should not trap focus when inactive', () => {
    const { result } = renderHook(() => useFocusTrap(false));

    act(() => {
      result.current.current = container;
    });

    // Focus should not be automatically set
    expect(document.activeElement).not.toBe(firstButton);
  });
});

describe('useScreenReaderAnnouncement', () => {
  it('should create announcement element and announce messages', () => {
    const { result } = renderHook(() => useScreenReaderAnnouncement());

    act(() => {
      result.current.announce('Test message', 'assertive');
    });

    // Check if announcement element was created
    const announcementElements = document.querySelectorAll('[aria-live]');
    expect(announcementElements.length).toBeGreaterThan(0);

    // Check if the message was set
    setTimeout(() => {
      const announcementElement = announcementElements[0] as HTMLElement;
      expect(announcementElement.textContent).toBe('Test message');
      expect(announcementElement.getAttribute('aria-live')).toBe('assertive');
    }, 150);
  });

  it('should clean up announcement element on unmount', () => {
    const { result, unmount } = renderHook(() => useScreenReaderAnnouncement());

    act(() => {
      result.current.announce('Test message');
    });

    const initialCount = document.querySelectorAll('[aria-live]').length;
    expect(initialCount).toBeGreaterThan(0);

    unmount();

    const finalCount = document.querySelectorAll('[aria-live]').length;
    expect(finalCount).toBe(initialCount - 1);
  });
});

describe('Accessibility Integration', () => {
  it('should work with real DOM elements', () => {
    const button = document.createElement('button');
    button.textContent = 'Test Button';
    document.body.appendChild(button);

    const mockCallback = jest.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        onEnter: mockCallback,
      })
    );

    act(() => {
      result.current.elementRef.current = button;
    });

    // Test keyboard interaction
    act(() => {
      button.focus();
      fireEvent.keyDown(button, { key: 'Enter' });
    });

    expect(mockCallback).toHaveBeenCalled();
    expect(result.current.isKeyboardFocused).toBe(true);

    document.body.removeChild(button);
  });

  it('should handle multiple keyboard navigation instances', () => {
    const element1 = document.createElement('div');
    const element2 = document.createElement('div');
    document.body.appendChild(element1);
    document.body.appendChild(element2);

    const callback1 = jest.fn();
    const callback2 = jest.fn();

    const { result: result1 } = renderHook(() =>
      useKeyboardNavigation({ onEnter: callback1 })
    );
    const { result: result2 } = renderHook(() =>
      useKeyboardNavigation({ onEnter: callback2 })
    );

    act(() => {
      result1.current.elementRef.current = element1;
      result2.current.elementRef.current = element2;
    });

    // Test that each instance works independently
    act(() => {
      fireEvent.keyDown(element1, { key: 'Enter' });
    });
    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).not.toHaveBeenCalled();

    act(() => {
      fireEvent.keyDown(element2, { key: 'Enter' });
    });
    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledTimes(1);

    document.body.removeChild(element1);
    document.body.removeChild(element2);
  });
});