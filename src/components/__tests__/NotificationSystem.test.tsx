import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { NotificationProvider, useNotifications } from '../NotificationSystem';

// Test component that uses notifications
const TestComponent = () => {
  const { 
    notifications, 
    showSuccess, 
    showError, 
    showWarning, 
    showInfo,
    clearAll 
  } = useNotifications();

  return (
    <div>
      <div data-testid="notification-count">{notifications.length}</div>
      <button onClick={() => showSuccess('Success', 'Success message')}>
        Show Success
      </button>
      <button onClick={() => showError('Error', 'Error message')}>
        Show Error
      </button>
      <button onClick={() => showWarning('Warning', 'Warning message')}>
        Show Warning
      </button>
      <button onClick={() => showInfo('Info', 'Info message')}>
        Show Info
      </button>
      <button onClick={clearAll}>Clear All</button>
    </div>
  );
};

describe('NotificationSystem', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('throws error when useNotifications is used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useNotifications must be used within a NotificationProvider');
    
    consoleSpy.mockRestore();
  });

  it('shows success notification', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('shows error notification', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Error'));

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByText('✕')).toBeInTheDocument();
  });

  it('shows warning notification', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Warning'));

    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('Warning message')).toBeInTheDocument();
    expect(screen.getByText('⚠')).toBeInTheDocument();
  });

  it('shows info notification', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Info'));

    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(screen.getByText('Info message')).toBeInTheDocument();
    expect(screen.getByText('ℹ')).toBeInTheDocument();
  });

  it('auto-removes notifications after duration', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success')).toBeInTheDocument();

    // Fast-forward time
    vi.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(screen.queryByText('Success')).not.toBeInTheDocument();
    });
  });

  it('does not auto-remove error notifications', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Error'));
    expect(screen.getByText('Error')).toBeInTheDocument();

    // Fast-forward time
    vi.advanceTimersByTime(10000);

    // Error should still be there (persistent)
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('removes notification when close button is clicked', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Close notification'));
    expect(screen.queryByText('Success')).not.toBeInTheDocument();
  });

  it('clears all notifications', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));
    
    expect(screen.getByTestId('notification-count')).toHaveTextContent('2');

    fireEvent.click(screen.getByText('Clear All'));
    
    expect(screen.getByTestId('notification-count')).toHaveTextContent('0');
  });

  it('handles notifications with actions', () => {
    const TestWithAction = () => {
      const { addNotification } = useNotifications();
      
      const handleAction = vi.fn();
      
      const showWithAction = () => {
        addNotification({
          type: 'info',
          title: 'Action Test',
          action: {
            label: 'Click Me',
            onClick: handleAction
          }
        });
      };

      return (
        <button onClick={showWithAction}>Show With Action</button>
      );
    };

    render(
      <NotificationProvider>
        <TestWithAction />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show With Action'));
    expect(screen.getByText('Action Test')).toBeInTheDocument();
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('tracks notification count correctly', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    expect(screen.getByTestId('notification-count')).toHaveTextContent('0');

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByTestId('notification-count')).toHaveTextContent('1');

    fireEvent.click(screen.getByText('Show Error'));
    expect(screen.getByTestId('notification-count')).toHaveTextContent('2');

    fireEvent.click(screen.getByLabelText('Close notification'));
    expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
  });
});