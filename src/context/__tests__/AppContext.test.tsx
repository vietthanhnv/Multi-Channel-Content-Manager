import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { AppProvider, useAppContext } from '../AppContext';
import { Channel } from '../../types';

// Test component that uses the context
const TestComponent: React.FC = () => {
  const { state, dispatch } = useAppContext();

  const addTestChannel = () => {
    const testChannel: Channel = {
      id: 'test-1',
      name: 'Test Channel',
      contentType: 'gaming',
      postingSchedule: {
        frequency: 'weekly',
        preferredDays: ['Monday'],
        preferredTimes: ['10:00'],
      },
      color: '#ef4444',
      createdAt: new Date(),
      isActive: true,
    };

    dispatch({ type: 'ADD_CHANNEL', payload: testChannel });
  };

  return (
    <div>
      <div data-testid="channel-count">{state.channels.length}</div>
      <div data-testid="active-view">{state.ui.activeView}</div>
      <button onClick={addTestChannel} data-testid="add-channel">
        Add Channel
      </button>
      <button 
        onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'calendar' })}
        data-testid="set-calendar-view"
      >
        Set Calendar View
      </button>
    </div>
  );
};

describe('AppContext', () => {
  it('should provide initial state', () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    expect(screen.getByTestId('channel-count')).toHaveTextContent('0');
    expect(screen.getByTestId('active-view')).toHaveTextContent('dashboard');
  });

  it('should handle ADD_CHANNEL action', () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    act(() => {
      screen.getByTestId('add-channel').click();
    });

    expect(screen.getByTestId('channel-count')).toHaveTextContent('1');
  });

  it('should handle SET_ACTIVE_VIEW action', () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    act(() => {
      screen.getByTestId('set-calendar-view').click();
    });

    expect(screen.getByTestId('active-view')).toHaveTextContent('calendar');
  });

  it('should throw error when useAppContext is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAppContext must be used within an AppProvider');

    consoleSpy.mockRestore();
  });
});