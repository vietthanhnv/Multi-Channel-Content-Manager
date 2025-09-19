import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChannelSettings } from '../ChannelSettings';
import { AppProvider } from '../../context/AppContext';
import { Channel } from '../../types';
import { CHANNEL_COLORS } from '../../utils/constants';

// Mock channel data
const mockChannel: Channel = {
  id: 'test-channel-1',
  name: 'Test Channel',
  contentType: 'gaming',
  postingSchedule: {
    frequency: 'weekly',
    preferredDays: ['Monday', 'Wednesday'],
    preferredTimes: ['18:00', '20:00'],
  },
  color: CHANNEL_COLORS[0],
  createdAt: new Date('2024-01-01'),
  isActive: true,
};

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <AppProvider>
      {component}
    </AppProvider>
  );
};

describe('ChannelSettings', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('renders nothing when not open', () => {
    renderWithProvider(
      <ChannelSettings
        isOpen={false}
        channel={mockChannel}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('Channel Settings')).not.toBeInTheDocument();
  });

  it('renders nothing when channel is null', () => {
    renderWithProvider(
      <ChannelSettings
        isOpen={true}
        channel={null}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('Channel Settings')).not.toBeInTheDocument();
  });

  it('renders channel settings modal when open with channel', () => {
    renderWithProvider(
      <ChannelSettings
        isOpen={true}
        channel={mockChannel}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Channel Settings')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Channel')).toBeInTheDocument();
    expect(screen.getByDisplayValue('gaming')).toBeInTheDocument();
    expect(screen.getByDisplayValue('weekly')).toBeInTheDocument();
  });

  it('populates form with channel data', () => {
    renderWithProvider(
      <ChannelSettings
        isOpen={true}
        channel={mockChannel}
        onClose={mockOnClose}
      />
    );

    // Check form fields are populated
    expect(screen.getByDisplayValue('Test Channel')).toBeInTheDocument();
    expect(screen.getByDisplayValue('gaming')).toBeInTheDocument();
    expect(screen.getByDisplayValue('weekly')).toBeInTheDocument();
    
    // Check preferred days are selected
    const mondayButton = screen.getByText('Mon');
    const wednesdayButton = screen.getByText('Wed');
    expect(mondayButton).toHaveClass('dayButtonActive');
    expect(wednesdayButton).toHaveClass('dayButtonActive');

    // Check preferred times are displayed
    expect(screen.getByText('18:00')).toBeInTheDocument();
    expect(screen.getByText('20:00')).toBeInTheDocument();

    // Check active toggle is checked
    const activeToggle = screen.getByRole('checkbox');
    expect(activeToggle).toBeChecked();
  });

  it('closes modal when close button is clicked', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <ChannelSettings
        isOpen={true}
        channel={mockChannel}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByLabelText('Close modal');
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('closes modal when overlay is clicked', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <ChannelSettings
        isOpen={true}
        channel={mockChannel}
        onClose={mockOnClose}
      />
    );

    const overlay = screen.getByRole('dialog').parentElement;
    if (overlay) {
      await user.click(overlay);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }
  });

  it('allows editing channel name', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <ChannelSettings
        isOpen={true}
        channel={mockChannel}
        onClose={mockOnClose}
      />
    );

    const nameInput = screen.getByDisplayValue('Test Channel');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Channel Name');

    expect(screen.getByDisplayValue('Updated Channel Name')).toBeInTheDocument();
  });

  it('allows toggling channel active status', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <ChannelSettings
        isOpen={true}
        channel={mockChannel}
        onClose={mockOnClose}
      />
    );

    const activeToggle = screen.getByRole('checkbox');
    expect(activeToggle).toBeChecked();
    expect(screen.getByText('Channel is Active')).toBeInTheDocument();

    await user.click(activeToggle);
    
    expect(activeToggle).not.toBeChecked();
    expect(screen.getByText('Channel is Inactive')).toBeInTheDocument();
  });

  it('allows adding preferred times', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <ChannelSettings
        isOpen={true}
        channel={mockChannel}
        onClose={mockOnClose}
      />
    );

    const timeInput = screen.getByDisplayValue('');
    const addButton = screen.getByText('Add');

    await user.type(timeInput, '14:30');
    await user.click(addButton);

    expect(screen.getByText('14:30')).toBeInTheDocument();
  });

  it('allows removing preferred times', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <ChannelSettings
        isOpen={true}
        channel={mockChannel}
        onClose={mockOnClose}
      />
    );

    // Find the remove button for the first time (18:00)
    const removeButtons = screen.getAllByLabelText(/Remove/);
    await user.click(removeButtons[0]);

    expect(screen.queryByText('18:00')).not.toBeInTheDocument();
    expect(screen.getByText('20:00')).toBeInTheDocument();
  });

  it('shows delete confirmation when delete button is clicked', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <ChannelSettings
        isOpen={true}
        channel={mockChannel}
        onClose={mockOnClose}
      />
    );

    const deleteButton = screen.getByText('Delete Channel');
    await user.click(deleteButton);

    expect(screen.getByText('⚠️ Delete Channel')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <ChannelSettings
        isOpen={true}
        channel={mockChannel}
        onClose={mockOnClose}
      />
    );

    // Clear the channel name
    const nameInput = screen.getByDisplayValue('Test Channel');
    await user.clear(nameInput);

    // Try to submit
    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Channel name is required')).toBeInTheDocument();
    });
  });

  it('validates time format when adding times', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <ChannelSettings
        isOpen={true}
        channel={mockChannel}
        onClose={mockOnClose}
      />
    );

    const timeInput = screen.getByDisplayValue('');
    const addButton = screen.getByText('Add');

    await user.type(timeInput, 'invalid-time');
    await user.click(addButton);

    expect(screen.getByText('Please enter time in HH:MM format (e.g., 14:30)')).toBeInTheDocument();
  });

  it('prevents duplicate times', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <ChannelSettings
        isOpen={true}
        channel={mockChannel}
        onClose={mockOnClose}
      />
    );

    const timeInput = screen.getByDisplayValue('');
    const addButton = screen.getByText('Add');

    // Try to add an existing time
    await user.type(timeInput, '18:00');
    await user.click(addButton);

    expect(screen.getByText('This time is already added')).toBeInTheDocument();
  });

  it('handles escape key to close modal', () => {
    renderWithProvider(
      <ChannelSettings
        isOpen={true}
        channel={mockChannel}
        onClose={mockOnClose}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});