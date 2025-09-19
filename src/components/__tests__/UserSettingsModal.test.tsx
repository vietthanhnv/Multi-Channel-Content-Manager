import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserSettingsModal } from '../UserSettingsModal';
import { useUserSettings } from '../../hooks/useUserSettings';

// Mock the useUserSettings hook
jest.mock('../../hooks/useUserSettings');
const mockUseUserSettings = useUserSettings as jest.MockedFunction<typeof useUserSettings>;

const mockUserSettings = {
  weeklyCapacityHours: 40,
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  workingHours: { start: '09:00', end: '17:00' }
};

describe('UserSettingsModal', () => {
  beforeEach(() => {
    mockUseUserSettings.mockReturnValue({
      userSettings: mockUserSettings,
      updateUserSettings: jest.fn(),
      setWeeklyCapacity: jest.fn(),
      setWorkingDays: jest.fn(),
      setWorkingHours: jest.fn(),
      isWorkingDay: jest.fn(),
      getWorkingHoursPerDay: jest.fn(),
      getMaxDailyCapacity: jest.fn(),
    });
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <UserSettingsModal isOpen={false} onClose={jest.fn()} />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('renders modal when isOpen is true', () => {
    render(<UserSettingsModal isOpen={true} onClose={jest.fn()} />);
    
    expect(screen.getByText('User Settings')).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', () => {
    const mockOnClose = jest.fn();
    render(<UserSettingsModal isOpen={true} onClose={mockOnClose} />);
    
    const backdrop = screen.getByText('User Settings').closest('.backdrop');
    fireEvent.click(backdrop!);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not call onClose when modal content is clicked', () => {
    const mockOnClose = jest.fn();
    render(<UserSettingsModal isOpen={true} onClose={mockOnClose} />);
    
    const modalContent = screen.getByText('User Settings');
    fireEvent.click(modalContent);
    
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('calls onClose when close button is clicked', () => {
    const mockOnClose = jest.fn();
    render(<UserSettingsModal isOpen={true} onClose={mockOnClose} />);
    
    const closeButton = screen.getByLabelText(/close settings/i);
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });
});