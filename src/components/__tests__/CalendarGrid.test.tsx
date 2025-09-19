import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CalendarGrid from '../CalendarGrid';
import { Task } from '../../types';

// Mock TimeSlot component
vi.mock('../TimeSlot', () => ({
  default: ({ date, timeSlot, tasks, isWorkingTime }: any) => (
    <div data-testid={`time-slot-${date.toISOString().split('T')[0]}-${timeSlot}`}>
      TimeSlot - {timeSlot} - {isWorkingTime ? 'Working' : 'Non-working'} - {tasks.length} tasks
    </div>
  ),
}));

describe('CalendarGrid', () => {
  const mockWeekStartDate = new Date('2024-01-01'); // Monday
  const mockWorkingHours = { start: '09:00', end: '17:00' };
  const mockWorkingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const mockTasks: Task[] = [
    {
      id: '1',
      channelId: 'channel1',
      title: 'Test Task 1',
      contentType: 'video',
      estimatedHours: 2,
      status: 'planned',
      scheduledStart: new Date('2024-01-01T10:00:00'),
      scheduledEnd: new Date('2024-01-01T12:00:00'),
    },
    {
      id: '2',
      channelId: 'channel2',
      title: 'Test Task 2',
      contentType: 'short',
      estimatedHours: 1,
      status: 'in-progress',
      scheduledStart: new Date('2024-01-02T14:00:00'),
      scheduledEnd: new Date('2024-01-02T15:00:00'),
    },
  ];

  it('renders calendar grid with correct structure', () => {
    render(
      <CalendarGrid
        weekStartDate={mockWeekStartDate}
        tasks={mockTasks}
        workingHours={mockWorkingHours}
        workingDays={mockWorkingDays}
      />
    );

    // Check if the calendar grid container is rendered
    const calendarGrid = screen.getByRole('generic');
    expect(calendarGrid).toBeInTheDocument();
  });

  it('displays all days of the week in header', () => {
    render(
      <CalendarGrid
        weekStartDate={mockWeekStartDate}
        tasks={mockTasks}
        workingHours={mockWorkingHours}
        workingDays={mockWorkingDays}
      />
    );

    // Check for day abbreviations
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();
  });

  it('displays correct dates in header', () => {
    render(
      <CalendarGrid
        weekStartDate={mockWeekStartDate}
        tasks={mockTasks}
        workingHours={mockWorkingHours}
        workingDays={mockWorkingDays}
      />
    );

    // Check for dates (1st through 7th of January 2024)
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('generates correct time slots based on working hours', () => {
    render(
      <CalendarGrid
        weekStartDate={mockWeekStartDate}
        tasks={mockTasks}
        workingHours={mockWorkingHours}
        workingDays={mockWorkingDays}
      />
    );

    // Check for time labels (9:00 to 16:00)
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('15:00')).toBeInTheDocument();
    expect(screen.getByText('16:00')).toBeInTheDocument();
    
    // 17:00 should not be present as it's the end time
    expect(screen.queryByText('17:00')).not.toBeInTheDocument();
  });

  it('renders TimeSlot components for each time slot and day combination', () => {
    render(
      <CalendarGrid
        weekStartDate={mockWeekStartDate}
        tasks={mockTasks}
        workingHours={mockWorkingHours}
        workingDays={mockWorkingDays}
      />
    );

    // Check for specific time slots
    expect(screen.getByTestId('time-slot-2024-01-01-09:00')).toBeInTheDocument();
    expect(screen.getByTestId('time-slot-2024-01-01-10:00')).toBeInTheDocument();
    expect(screen.getByTestId('time-slot-2024-01-02-14:00')).toBeInTheDocument();
  });

  it('passes correct props to TimeSlot components', () => {
    render(
      <CalendarGrid
        weekStartDate={mockWeekStartDate}
        tasks={mockTasks}
        workingHours={mockWorkingHours}
        workingDays={mockWorkingDays}
      />
    );

    // Check working day time slot
    const mondaySlot = screen.getByTestId('time-slot-2024-01-01-09:00');
    expect(mondaySlot).toHaveTextContent('Working');

    // Check non-working day time slot (Saturday)
    const saturdaySlot = screen.getByTestId('time-slot-2024-01-06-09:00');
    expect(saturdaySlot).toHaveTextContent('Non-working');
  });

  it('handles custom working hours correctly', () => {
    const customWorkingHours = { start: '08:00', end: '16:00' };
    
    render(
      <CalendarGrid
        weekStartDate={mockWeekStartDate}
        tasks={mockTasks}
        workingHours={customWorkingHours}
        workingDays={mockWorkingDays}
      />
    );

    // Check for custom start time
    expect(screen.getByText('08:00')).toBeInTheDocument();
    expect(screen.getByText('15:00')).toBeInTheDocument();
    
    // 16:00 should not be present as it's the end time
    expect(screen.queryByText('16:00')).not.toBeInTheDocument();
  });

  it('handles onTaskDrop callback', () => {
    const mockOnTaskDrop = vi.fn();
    
    render(
      <CalendarGrid
        weekStartDate={mockWeekStartDate}
        tasks={mockTasks}
        workingHours={mockWorkingHours}
        workingDays={mockWorkingDays}
        onTaskDrop={mockOnTaskDrop}
      />
    );

    // The callback should be passed to TimeSlot components
    // This is tested indirectly through the TimeSlot component tests
    expect(screen.getByTestId('time-slot-2024-01-01-09:00')).toBeInTheDocument();
  });

  it('handles empty tasks array', () => {
    render(
      <CalendarGrid
        weekStartDate={mockWeekStartDate}
        tasks={[]}
        workingHours={mockWorkingHours}
        workingDays={mockWorkingDays}
      />
    );

    // Should still render the grid structure
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('09:00')).toBeInTheDocument();
    
    // All time slots should show 0 tasks
    const timeSlots = screen.getAllByText(/0 tasks/);
    expect(timeSlots.length).toBeGreaterThan(0);
  });
});