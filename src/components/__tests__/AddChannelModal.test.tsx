import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddChannelModal } from '../AddChannelModal';
import { AppProvider } from '../../context/AppContext';
import { Channel } from '../../types';

// Mock the helpers module
jest.mock('../../utils/helpers', () => ({
  generateId: jest.fn(() => 'test-id-123'),
}));

const mockInitialState = {
  channels: [] as Channel[],
  templates: [],
  currentWeek: {
    weekStartDate: new Date(),
    tasks: [],
    totalScheduledHours: 0,
    userCapacityHours: 40,
    isOverloaded: false,
  },
  selectedChannelId: undefined,
  userSettings: {
    weeklyCapacityHours: 40,
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    workingHours: { start: '09:00', end: '17:00' },
  },
  ui: {
    activeView: 'dashboard' as const,
    isLoading: false,
    errors: [],
  },
};

const renderWithProvider = (component: React.ReactElement, initialState = mockInitialState) => {
  return render(
    <AppProvider initialState={initialState}>
      {component}
    </AppProvider>
  );
};

describe('AddChannelModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    renderWithProvider(
      <AddChannelModal isOpen={false} onClose={mockOnClose} />
    );

    expect(screen.queryByText('Add New Channel')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    renderWithProvider(
      <AddChannelModal isOpen={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('Add New Channel')).toBeInTheDocument();
    expect(screen.getByLabelText('Channel Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Content Type *')).toBeInTheDocument();
    expect(screen.getByLabelText('Posting Frequency *')).toBeInTheDocument();
  });

  it('should close modal when close button is clicked', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <AddChannelModal isOpen={true} onClose={mockOnClose} />
    );

    const closeButton = screen.getByLabelText('Close modal');
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should close modal when escape key is pressed', async () => {
    renderWithProvider(
      <AddChannelModal isOpen={true} onClose={mockOnClose} />
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should close modal when overlay is clicked', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <AddChannelModal isOpen={true} onClose={mockOnClose} />
    );

    const overlay = screen.getByRole('dialog').parentElement;
    if (overlay) {
      await user.click(overlay);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }
  });

  it('should show validation errors for empty required fields', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <AddChannelModal isOpen={true} onClose={mockOnClose} />
    );

    const submitButton = screen.getByText('Create Channel');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Channel name is required')).toBeInTheDocument();
      expect(screen.getByText('Please select at least one preferred day')).toBeInTheDocument();
      expect(screen.getByText('Please add at least one preferred posting time')).toBeInTheDocument();
    });
  });

  it('should validate channel name length', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <AddChannelModal isOpen={true} onClose={mockOnClose} />
    );

    const nameInput = screen.getByLabelText('Channel Name *');
    const longName = 'a'.repeat(101); // Exceeds 100 character limit
    
    await user.type(nameInput, longName);
    
    const submitButton = screen.getByText('Create Channel');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Channel name must be 100 characters or less')).toBeInTheDocument();
    });
  });

  it('should prevent duplicate channel names', async () => {
    const user = userEvent.setup();
    
    const stateWithExistingChannel = {
      ...mockInitialState,
      channels: [{
        id: 'existing-1',
        name: 'Existing Channel',
        contentType: 'gaming' as const,
        postingSchedule: {
          frequency: 'weekly' as const,
          preferredDays: ['Monday'],
          preferredTimes: ['10:00'],
        },
        color: '#ef4444',
        createdAt: new Date(),
        isActive: true,
      }],
    };

    renderWithProvider(
      <AddChannelModal isOpen={true} onClose={mockOnClose} />,
      stateWithExistingChannel
    );

    const nameInput = screen.getByLabelText('Channel Name *');
    await user.type(nameInput, 'Existing Channel');
    
    const submitButton = screen.getByText('Create Channel');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('A channel with this name already exists')).toBeInTheDocument();
    });
  });

  it('should allow selecting preferred days', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <AddChannelModal isOpen={true} onClose={mockOnClose} />
    );

    // Select weekly frequency to show day selector
    const frequencySelect = screen.getByLabelText('Posting Frequency *');
    await user.selectOptions(frequencySelect, 'weekly');

    // Select Monday and Wednesday
    const mondayButton = screen.getByText('Mon');
    const wednesdayButton = screen.getByText('Wed');
    
    await user.click(mondayButton);
    await user.click(wednesdayButton);

    expect(mondayButton).toHaveClass('dayButtonActive');
    expect(wednesdayButton).toHaveClass('dayButtonActive');
  });

  it('should allow adding and removing preferred times', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <AddChannelModal isOpen={true} onClose={mockOnClose} />
    );

    const timeInput = screen.getByDisplayValue('');
    const addButton = screen.getByText('Add');

    // Add a time
    await user.type(timeInput, '14:30');
    await user.click(addButton);

    expect(screen.getByText('14:30')).toBeInTheDocument();

    // Remove the time
    const removeButton = screen.getByLabelText('Remove 14:30');
    await user.click(removeButton);

    expect(screen.queryByText('14:30')).not.toBeInTheDocument();
  });

  it('should validate time format', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <AddChannelModal isOpen={true} onClose={mockOnClose} />
    );

    const timeInput = screen.getByDisplayValue('');
    const addButton = screen.getByText('Add');

    // Try to add invalid time format
    await user.type(timeInput, '25:70'); // Invalid time
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter time in HH:MM format (e.g., 14:30)')).toBeInTheDocument();
    });
  });

  it('should prevent duplicate times', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <AddChannelModal isOpen={true} onClose={mockOnClose} />
    );

    const timeInput = screen.getByDisplayValue('');
    const addButton = screen.getByText('Add');

    // Add a time
    await user.type(timeInput, '14:30');
    await user.click(addButton);

    // Try to add the same time again
    await user.clear(timeInput);
    await user.type(timeInput, '14:30');
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('This time is already added')).toBeInTheDocument();
    });
  });

  it('should allow selecting different colors', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <AddChannelModal isOpen={true} onClose={mockOnClose} />
    );

    const colorButtons = screen.getAllByLabelText(/Select color/);
    expect(colorButtons.length).toBeGreaterThan(0);

    // First color should be selected by default
    expect(colorButtons[0]).toHaveClass('colorButtonActive');

    // Select a different color
    await user.click(colorButtons[1]);
    expect(colorButtons[1]).toHaveClass('colorButtonActive');
    expect(colorButtons[0]).not.toHaveClass('colorButtonActive');
  });

  it('should hide preferred days for daily frequency', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <AddChannelModal isOpen={true} onClose={mockOnClose} />
    );

    const frequencySelect = screen.getByLabelText('Posting Frequency *');
    
    // Select daily frequency
    await user.selectOptions(frequencySelect, 'daily');

    // Preferred days section should not be visible
    expect(screen.queryByText('Preferred Days *')).not.toBeInTheDocument();
  });

  it('should successfully create a channel with valid data', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <AddChannelModal isOpen={true} onClose={mockOnClose} />
    );

    // Fill in the form
    const nameInput = screen.getByLabelText('Channel Name *');
    await user.type(nameInput, 'Test Channel');

    const contentTypeSelect = screen.getByLabelText('Content Type *');
    await user.selectOptions(contentTypeSelect, 'gaming');

    const frequencySelect = screen.getByLabelText('Posting Frequency *');
    await user.selectOptions(frequencySelect, 'weekly');

    // Select a preferred day
    const mondayButton = screen.getByText('Mon');
    await user.click(mondayButton);

    // Add a preferred time
    const timeInput = screen.getByDisplayValue('');
    await user.type(timeInput, '14:30');
    const addButton = screen.getByText('Add');
    await user.click(addButton);

    // Submit the form
    const submitButton = screen.getByText('Create Channel');
    await user.click(submitButton);

    // Modal should close
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('should disable form during submission', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <AddChannelModal isOpen={true} onClose={mockOnClose} />
    );

    // Fill in minimal valid data
    const nameInput = screen.getByLabelText('Channel Name *');
    await user.type(nameInput, 'Test Channel');

    const frequencySelect = screen.getByLabelText('Posting Frequency *');
    await user.selectOptions(frequencySelect, 'daily');

    const timeInput = screen.getByDisplayValue('');
    await user.type(timeInput, '14:30');
    const addButton = screen.getByText('Add');
    await user.click(addButton);

    const submitButton = screen.getByText('Create Channel');
    await user.click(submitButton);

    // During submission, button text should change
    expect(screen.getByText('Creating...')).toBeInTheDocument();
  });
});