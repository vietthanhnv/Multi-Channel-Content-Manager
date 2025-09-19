import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChannelGrid } from '../ChannelGrid';
import { Channel, Task } from '../../types';

// Mock CSS modules
jest.mock('../ChannelGrid.module.css', () => ({}));
jest.mock('../ChannelCard.module.css', () => ({}));

const mockChannels: Channel[] = [
  {
    id: '1',
    name: 'Gaming Channel',
    contentType: 'gaming',
    postingSchedule: {
      frequency: 'weekly',
      preferredDays: ['Monday'],
      preferredTimes: ['10:00'],
    },
    color: '#ef4444',
    createdAt: new Date('2024-01-01'),
    isActive: true,
  },
  {
    id: '2',
    name: 'Educational Channel',
    contentType: 'educational',
    postingSchedule: {
      frequency: 'daily',
      preferredDays: ['Monday', 'Tuesday'],
      preferredTimes: ['14:00'],
    },
    color: '#3b82f6',
    createdAt: new Date('2024-01-02'),
    isActive: false,
  },
];

const mockTasks: Task[] = [
  {
    id: '1',
    channelId: '1',
    title: 'Gaming Video 1',
    contentType: 'video',
    estimatedHours: 4,
    status: 'completed',
    scheduledStart: new Date(),
    scheduledEnd: new Date(),
  },
  {
    id: '2',
    channelId: '2',
    title: 'Educational Video 1',
    contentType: 'video',
    estimatedHours: 3,
    status: 'in-progress',
    scheduledStart: new Date(),
    scheduledEnd: new Date(),
  },
];

describe('ChannelGrid', () => {
  it('renders channels correctly', () => {
    render(<ChannelGrid channels={mockChannels} tasks={mockTasks} />);
    
    expect(screen.getByText('Gaming Channel')).toBeInTheDocument();
    expect(screen.getByText('Educational Channel')).toBeInTheDocument();
    expect(screen.getByText('Your Channels')).toBeInTheDocument();
  });

  it('displays channel count correctly', () => {
    render(<ChannelGrid channels={mockChannels} tasks={mockTasks} />);
    
    expect(screen.getByText('1 active, 2 total')).toBeInTheDocument();
  });

  it('shows grid statistics', () => {
    render(<ChannelGrid channels={mockChannels} tasks={mockTasks} />);
    
    expect(screen.getByText('2')).toBeInTheDocument(); // Total Channels
    expect(screen.getByText('1')).toBeInTheDocument(); // Active Channels
    expect(screen.getByText('Total Tasks')).toBeInTheDocument();
    expect(screen.getByText('Completed Tasks')).toBeInTheDocument();
  });

  it('calls onAddChannel when add button is clicked', () => {
    const mockOnAddChannel = jest.fn();
    render(<ChannelGrid channels={mockChannels} onAddChannel={mockOnAddChannel} />);
    
    const addButton = screen.getByText('+ Add Channel');
    fireEvent.click(addButton);
    
    expect(mockOnAddChannel).toHaveBeenCalled();
  });

  it('displays empty state when no channels exist', () => {
    const mockOnAddChannel = jest.fn();
    render(<ChannelGrid channels={[]} onAddChannel={mockOnAddChannel} />);
    
    expect(screen.getByText('No channels yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first channel to start managing your content across multiple platforms.')).toBeInTheDocument();
    
    const createButton = screen.getByText('Create Your First Channel');
    fireEvent.click(createButton);
    
    expect(mockOnAddChannel).toHaveBeenCalled();
  });

  it('passes callback functions to ChannelCard components', () => {
    const mockOnEdit = jest.fn();
    const mockOnToggleActive = jest.fn();
    const mockOnDelete = jest.fn();
    
    render(
      <ChannelGrid 
        channels={mockChannels}
        tasks={mockTasks}
        onEditChannel={mockOnEdit}
        onToggleChannelActive={mockOnToggleActive}
        onDeleteChannel={mockOnDelete}
      />
    );
    
    // Check that the callbacks are passed to ChannelCard components
    // This is tested indirectly by checking that the buttons exist
    expect(screen.getAllByTitle('Edit channel')).toHaveLength(2);
    expect(screen.getAllByTitle(/Activate|Deactivate channel/)).toHaveLength(2);
    expect(screen.getAllByTitle('Delete channel')).toHaveLength(2);
  });

  it('sorts channels with active channels first', () => {
    const { container } = render(<ChannelGrid channels={mockChannels} tasks={mockTasks} />);
    
    const channelCards = container.querySelectorAll('.channel-card');
    expect(channelCards).toHaveLength(2);
    
    // First card should be the active one (Gaming Channel)
    // Second card should be the inactive one (Educational Channel)
    const firstCard = channelCards[0];
    const secondCard = channelCards[1];
    
    expect(firstCard).not.toHaveClass('inactive');
    expect(secondCard).toHaveClass('inactive');
  });

  it('handles empty tasks array', () => {
    render(<ChannelGrid channels={mockChannels} tasks={[]} />);
    
    expect(screen.getByText('Your Channels')).toBeInTheDocument();
    // Should still render channels even without tasks
    expect(screen.getByText('Gaming Channel')).toBeInTheDocument();
  });
});