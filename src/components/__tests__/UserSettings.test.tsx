import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserSettings } from '../UserSettings';
import { useUserSettings } from '../../hooks/useUserSettings';

// Mock the useUserSettings hook
jest.mock('../../hooks/useUserSettings');
const mockUseUserSettings = useUserSettings as jest.MockedFunction<typeof useUserSettings>;

const mockUserSettings = {
  weeklyCapacityHours: 40,
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  workingHours: { start: '09:00', end: '17:00' }
};

const mockUpdateUserSettings = jest.fn();

describe('UserSettings', () => {
  beforeEach(() => {
    mockUseUserSettings.mockReturnValue({
      userSettings: mockUserSettings,
      updateUserSettings: mockUpdateUserSettings,
      setWeeklyCapacity: jest.fn(),
      setWorkingDays: jest.fn(),
      setWorkingHours: jest.fn(),
      isWorkingDay: jest.fn(),
      getWorkingHoursPerDay: jest.fn(),
      getMaxDailyCapacity: jest.fn(),
    });
    jest.clearAllMocks();
  });

  it('renders user settings form with current values', () => {
    render(<UserSettings />);
    
    expect(screen.getByDisplayValue('40')).toBeInTheDocument();
    expect(screen.getByDisplayValue('09:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('17:00')).toBeInTheDocument();
    
    // Check working days checkboxes
    expect(screen.getByLabelText('Monday')).toBeChecked();
    expect(screen.getByLabelText('Tuesday')).toBeChecked();
    expect(screen.getByLabelText('Saturday')).not.toBeChecked();
    expect(screen.getByLabelText('Sunday')).not.toBeChecked();
  });

  it('updates weekly capacity when input changes', () => {
    render(<UserSettings />);
    
    const capacityInput = screen.getByLabelText(/total hours per week/i);
    fireEvent.change(capacityInput, { target: { value: '50' } });
    
    expect(capacityInput).toHaveValue(50);
  });

  it('toggles working days when checkboxes are clicked', () => {
    render(<UserSettings />);
    
    const saturdayCheckbox = screen.getByLabelText('Saturday');
    fireEvent.click(saturdayCheckbox);
    
    expect(saturdayCheckbox).toBeChecked();
    
    const mondayCheckbox = screen.getByLabelText('Monday');
    fireEvent.click(mondayCheckbox);
    
    expect(mondayCheckbox).not.toBeChecked();
  });

  it('updates working hours when selects change', () => {
    render(<UserSettings />);
    
    const startTimeSelect = screen.getByLabelText(/start time/i);
    fireEvent.change(startTimeSelect, { target: { value: '08:00' } });
    
    expect(startTimeSelect).toHaveValue('08:00');
    
    const endTimeSelect = screen.getByLabelText(/end time/i);
    fireEvent.change(endTimeSelect, { target: { value: '18:00' } });
    
    expect(endTimeSelect).toHaveValue('18:00');
  });

  it('shows validation error when end time is before start time', () => {
    render(<UserSettings />);
    
    const startTimeSelect = screen.getByLabelText(/start time/i);
    const endTimeSelect = screen.getByLabelText(/end time/i);
    
    fireEvent.change(startTimeSelect, { target: { value: '17:00' } });
    fireEvent.change(endTimeSelect, { target: { value: '09:00' } });
    
    expect(screen.getByText(/end time must be after start time/i)).toBeInTheDocument();
  });

  it('calculates and displays daily hours', () => {
    render(<UserSettings />);
    
    // With 5 working days and 40 hours, should show 8 hours per day
    expect(screen.getByText(/average hours per working day: 8/i)).toBeInTheDocument();
  });

  it('enables save button when changes are made', async () => {
    render(<UserSettings />);
    
    const saveButton = screen.getByText(/save settings/i);
    expect(saveButton).toBeDisabled();
    
    const capacityInput = screen.getByLabelText(/total hours per week/i);
    fireEvent.change(capacityInput, { target: { value: '45' } });
    
    await waitFor(() => {
      expect(saveButton).toBeEnabled();
    });
  });

  it('saves settings when save button is clicked', async () => {
    render(<UserSettings />);
    
    const capacityInput = screen.getByLabelText(/total hours per week/i);
    fireEvent.change(capacityInput, { target: { value: '45' } });
    
    const saveButton = screen.getByText(/save settings/i);
    await waitFor(() => {
      expect(saveButton).toBeEnabled();
    });
    
    fireEvent.click(saveButton);
    
    expect(mockUpdateUserSettings).toHaveBeenCalledWith({
      weeklyCapacityHours: 45,
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      workingHours: { start: '09:00', end: '17:00' }
    });
  });

  it('resets form when reset button is clicked', async () => {
    render(<UserSettings />);
    
    const capacityInput = screen.getByLabelText(/total hours per week/i);
    fireEvent.change(capacityInput, { target: { value: '45' } });
    
    const resetButton = screen.getByText(/reset/i);
    await waitFor(() => {
      expect(resetButton).toBeEnabled();
    });
    
    fireEvent.click(resetButton);
    
    expect(capacityInput).toHaveValue(40);
  });

  it('calls onClose when close button is clicked', () => {
    const mockOnClose = jest.fn();
    render(<UserSettings onClose={mockOnClose} />);
    
    const closeButton = screen.getByLabelText(/close settings/i);
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('disables save button when no working days are selected', async () => {
    render(<UserSettings />);
    
    // Uncheck all working days
    const workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    workingDays.forEach(day => {
      const checkbox = screen.getByLabelText(day);
      fireEvent.click(checkbox);
    });
    
    const saveButton = screen.getByText(/save settings/i);
    await waitFor(() => {
      expect(saveButton).toBeDisabled();
    });
  });

  it('limits weekly capacity to maximum 168 hours', () => {
    render(<UserSettings />);
    
    const capacityInput = screen.getByLabelText(/total hours per week/i);
    fireEvent.change(capacityInput, { target: { value: '200' } });
    
    expect(capacityInput).toHaveValue(168);
  });

  it('prevents negative weekly capacity values', () => {
    render(<UserSettings />);
    
    const capacityInput = screen.getByLabelText(/total hours per week/i);
    fireEvent.change(capacityInput, { target: { value: '-10' } });
    
    expect(capacityInput).toHaveValue(0);
  });
});