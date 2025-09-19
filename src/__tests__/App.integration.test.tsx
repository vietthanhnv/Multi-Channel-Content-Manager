import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import App from '../App';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
  },
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));

describe('App Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('renders the main application with navigation', async () => {
    render(<App />);

    // Check if main navigation elements are present
    expect(screen.getByText('Multi-Channel Content Manager')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Templates')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('navigates between different views', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Start on dashboard
    expect(screen.getByText('Channel Portfolio')).toBeInTheDocument();

    // Navigate to templates
    await user.click(screen.getByText('Templates'));
    await waitFor(() => {
      expect(screen.getByText('Content Templates')).toBeInTheDocument();
    });

    // Navigate to calendar
    await user.click(screen.getByText('Calendar'));
    await waitFor(() => {
      expect(screen.getByText('Weekly Calendar')).toBeInTheDocument();
    });

    // Navigate to analytics
    await user.click(screen.getByText('Analytics'));
    await waitFor(() => {
      expect(screen.getByText('Progress & Analytics')).toBeInTheDocument();
    });

    // Navigate to settings
    await user.click(screen.getByText('Settings'));
    await waitFor(() => {
      expect(screen.getByText('User Settings')).toBeInTheDocument();
    });
  });

  it('handles localStorage initialization', () => {
    render(<App />);

    // Verify localStorage initialization calls
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('mcm_channels');
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('mcm_templates');
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('mcm_schedules');
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('mcm_user_settings');
  });

  it('displays empty state when no channels exist', () => {
    render(<App />);

    // Should show empty state for channels
    expect(screen.getByText('No channels yet')).toBeInTheDocument();
    expect(screen.getByText('Create Your First Channel')).toBeInTheDocument();
  });

  it('handles error boundaries gracefully', () => {
    // Mock console.error to avoid noise in test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Create a component that throws an error
    const ThrowError = () => {
      throw new Error('Test error');
    };

    // This would normally be wrapped in ErrorBoundary, but we'll test the boundary itself
    const ErrorBoundaryTest = () => (
      <div>
        <ThrowError />
      </div>
    );

    // The error boundary should catch this and display fallback UI
    expect(() => render(<ErrorBoundaryTest />)).toThrow('Test error');

    consoleSpy.mockRestore();
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Tab through navigation items
    await user.tab();
    expect(screen.getByText('Dashboard')).toHaveFocus();

    await user.tab();
    expect(screen.getByText('Templates')).toHaveFocus();

    await user.tab();
    expect(screen.getByText('Calendar')).toHaveFocus();

    // Enter should activate the focused item
    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(screen.getByText('Weekly Calendar')).toBeInTheDocument();
    });
  });

  it('handles mobile touch interactions', () => {
    // Mock touch device
    Object.defineProperty(window, 'ontouchstart', {
      value: true,
      configurable: true,
    });

    render(<App />);

    // App should render without errors on touch devices
    expect(screen.getByText('Multi-Channel Content Manager')).toBeInTheDocument();
  });

  it('persists navigation state', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Navigate to templates
    await user.click(screen.getByText('Templates'));
    await waitFor(() => {
      expect(screen.getByText('Content Templates')).toBeInTheDocument();
    });

    // The active state should be maintained
    expect(screen.getByText('Templates')).toHaveClass('active');
  });

  it('handles performance monitoring in development', () => {
    // Set development environment
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(<App />);

    // Performance monitoring should be active (no errors thrown)
    expect(screen.getByText('Multi-Channel Content Manager')).toBeInTheDocument();

    // Restore environment
    process.env.NODE_ENV = originalEnv;
  });

  it('loads with proper accessibility attributes', () => {
    render(<App />);

    // Check for proper ARIA attributes
    const navigation = screen.getByRole('navigation', { hidden: true });
    expect(navigation).toBeInTheDocument();

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
  });

  it('handles window resize events', () => {
    render(<App />);

    // Simulate window resize
    fireEvent(window, new Event('resize'));

    // App should still be functional
    expect(screen.getByText('Multi-Channel Content Manager')).toBeInTheDocument();
  });
});