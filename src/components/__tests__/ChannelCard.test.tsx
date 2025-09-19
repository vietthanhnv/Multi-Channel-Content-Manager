import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChannelCard } from '../ChannelCard';
import { Channel, Task } from '../../types';

// Mock CSS modules
jest.mock('../ChannelCard.module.css', () => ({}));

const mockChannel: Channel = {
  id: '1',
  name: 'Test Gaming Channel',
  contentType: 'gaming',
  postingSchedule: {
    frequency: 'weekly',
    preferredDays: ['Monday', 'Wednesday'],
    preferredTimes: ['10:00', '14:00'],
  },
  color: '#ef4444',
  createdAt: new Date('2024-01-01'),
  isActive: true,
};

const mockTasks: Task[] = [
  {
    id: '1',
    channelId: '1',
    title: 'Test Video 1',
    contentType: 'video',
    estimatedHours: 4,
    status: 'completed',
    scheduledStart: new Date(),
    scheduledEnd: new Date(),
  },
  {
    id: '2',
    channelId: '1',
    title: 'Test Video 2',
    contentType: 'video',
    estimatedHours: 3,
    status: 'in-progress',
    scheduledStart: new Date(),
    scheduledEnd: new Date(),
  },
  {
    id: '3',
    channelId: '1',
    title: 'Test Video 3',
    contentType: 'video',
    estimatedHours: 2,
    status: 'overdue',
    scheduledStart: new Date(),
    scheduledEnd: new Date(),
  },
];

describe('ChannelCard', () => {
  it('renders channel information correctly', () => {
    render(<ChannelCard channel={mockChannel} tasks={mockTasks} />);
    
    expect(screen.getByText('Test Gaming Channel')).toBeInTheDocument();
    expect(screen.getByText('gaming')).toBeInTheDocument();
    expect(screen.getByText('weekly')).toBeInTheDocument();
  });

  it('calculates and displays task statistics correctly', () => {
    render(<ChannelCard channel={mockChannel} tasks={mockTasks} />);
    
    expect(screen.getByText('3')).toBeInTheDocument(); // Total tasks
    expect(screen.getByText('33%')).toBeInTheDocument(); // Completion rate (1/3)
    expect(screen.getByText('1/3 completed')).toBeInTheDocument();
  });

  it('shows status indicators for different task states', () => {
    render(<ChannelCard channel={mockChannel} tasks={mockTasks} />);
    
    expect(screen.getByText('1 in progress')).toBeInTheDocument();
    expect(screen.getByText('1 overdue')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const mockOnEdit = jest.fn();
    render(<ChannelCard channel={mockChannel} onEdit={mockOnEdit} />);
    
    const editButton = screen.getByTitle('Edit channel');
    fireEvent.click(editButton);
    
    expect(mockOnEdit).toHaveBeenCalledWith(mockChannel);
  });

  it('calls onToggleActive when toggle button is clicked', () => {
    const mockOnToggleActive = jest.fn();
    render(<ChannelCard channel={mockChannel} onToggleActive={mockOnToggleActive} />);
    
    const toggleButton = screen.getByTitle('Deactivate channel');
    fireEvent.click(toggleButton);
    
    expect(mockOnToggleActive).toHaveBeenCalledWith('1');
  });

  it('shows confirmation dialog and calls onDelete when delete button is clicked', () => {
    const mockOnDelete = jest.fn();
    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => true);
    
    render(<ChannelCard channel={mockChannel} onDelete={mockOnDelete} />);
    
    const deleteButton = screen.getByTitle('Delete channel');
    fireEvent.click(deleteButton);
    
    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete "Test Gaming Channel"? This action cannot be undone.'
    );
    expect(mockOnDelete).toHaveBeenCalledWith('1');
    
    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('displays inactive state correctly', () => {
    const inactiveChannel = { ...mockChannel, isActive: false };
    const { container } = render(<ChannelCard channel={inactiveChannel} />);
    
    expect(container.querySelector('.channel-card')).toHaveClass('inactive');
    expect(screen.getByTitle('Activate channel')).toBeInTheDocument();
  });

  it('handles empty tasks array', () => {
    render(<ChannelCard channel={mockChannel} tasks={[]} />);
    
    expect(screen.getByText('0')).toBeInTheDocument(); // Total tasks
    expect(screen.getByText('0%')).toBeInTheDocument(); // Completion rate
    expect(screen.getByText('0/0 completed')).toBeInTheDocument();
  });
});