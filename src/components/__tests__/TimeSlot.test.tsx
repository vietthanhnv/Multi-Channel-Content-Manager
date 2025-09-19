import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TimeSlot from '../TimeSlot';
import { Task } from '../../types';

describe('TimeSlot', () => {
  const mockDate = new Date('2024-01-01T00:00:00');
  const mockTimeSlot = '10:00';
  
  const mockTask: Task = {
    id: 'task1',
    channelId: 'channel1',
    title: 'Test Task',
    contentType: 'video',
    estimatedHours: 2,
    status: 'planned',
    scheduledStart: new Date('2024-01-01T10:00:00'),
    scheduledEnd: new Date('2024-01-01T12:00:00'),
  };

  const mockConflictingTask: Task = {
    id: 'task2',
    channelId: 'channel2',
    title: 'Conflicting Task',
    contentType: 'short',
    estimatedHours: 1,
    status: 'in-progress',
    scheduledStart: new Date('2024-01-01T10:30:00'),
    scheduledEnd: new Date('2024-01-01T11:30:00'),
  };

  it('renders empty time slot for working time', () => {
    render(
      <TimeSlot
        date={mockDate}
        timeSlot={mockTimeSlot}
        tasks={[]}
        isWorkingTime={true}
      />
    );

    const timeSlot = screen.getByTestId('time-slot-2024-01-01-10:00');
    expect(timeSlot).toBeInTheDocument();
    expect(screen.getByText('Drop task here')).toBeInTheDocument();
  });

  it('renders empty time slot for non-working time', () => {
    render(
      <TimeSlot
        date={mockDate}
        timeSlot={mockTimeSlot}
        tasks={[]}
        isWorkingTime={false}
      />
    );

    const timeSlot = screen.getByTestId('time-slot-2024-01-01-10:00');
    expect(timeSlot).toBeInTheDocument();
    expect(timeSlot).toHaveClass('nonWorkingTime');
    expect(screen.queryByText('Drop task here')).not.toBeInTheDocument();
  });

  it('renders single task correctly', () => {
    render(
      <TimeSlot
        date={mockDate}
        timeSlot={mockTimeSlot}
        tasks={[mockTask]}
        isWorkingTime={true}
      />
    );

    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText('2h')).toBeInTheDocument();
    expect(screen.queryByText('Drop task here')).not.toBeInTheDocument();
  });

  it('renders conflicting tasks with conflict indicator', () => {
    render(
      <TimeSlot
        date={mockDate}
        timeSlot={mockTimeSlot}
        tasks={[mockTask, mockConflictingTask]}
        isWorkingTime={true}
      />
    );

    const timeSlot = screen.getByTestId('time-slot-2024-01-01-10:00');
    expect(timeSlot).toHaveClass('hasConflicts');
    
    // Should show primary task (first one)
    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText('2h')).toBeInTheDocument();
    
    // Should show conflict indicator
    expect(screen.getByText('2 tasks')).toBeInTheDocument();
  });

  it('handles drag over event for working time', () => {
    render(
      <TimeSlot
        date={mockDate}
        timeSlot={mockTimeSlot}
        tasks={[]}
        isWorkingTime={true}
      />
    );

    const timeSlot = screen.getByTestId('time-slot-2024-01-01-10:00');
    
    const dragOverEvent = new Event('dragover', { bubbles: true });
    Object.defineProperty(dragOverEvent, 'dataTransfer', {
      value: { dropEffect: '' },
      writable: true,
    });

    fireEvent(timeSlot, dragOverEvent);
    
    // Should prevent default and set drop effect
    expect(dragOverEvent.defaultPrevented).toBe(true);
  });

  it('ignores drag over event for non-working time', () => {
    render(
      <TimeSlot
        date={mockDate}
        timeSlot={mockTimeSlot}
        tasks={[]}
        isWorkingTime={false}
      />
    );

    const timeSlot = screen.getByTestId('time-slot-2024-01-01-10:00');
    
    const dragOverEvent = new Event('dragover', { bubbles: true });
    Object.defineProperty(dragOverEvent, 'dataTransfer', {
      value: { dropEffect: '' },
      writable: true,
    });

    fireEvent(timeSlot, dragOverEvent);
    
    // Should not prevent default for non-working time
    expect(dragOverEvent.defaultPrevented).toBe(false);
  });

  it('handles drop event correctly', () => {
    const mockOnTaskDrop = vi.fn();
    
    render(
      <TimeSlot
        date={mockDate}
        timeSlot={mockTimeSlot}
        tasks={[]}
        isWorkingTime={true}
        onTaskDrop={mockOnTaskDrop}
      />
    );

    const timeSlot = screen.getByTestId('time-slot-2024-01-01-10:00');
    
    const dropEvent = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: {
        getData: vi.fn().mockReturnValue(JSON.stringify({
          id: 'task1',
          estimatedHours: 2,
        })),
      },
    });

    fireEvent(timeSlot, dropEvent);
    
    expect(dropEvent.defaultPrevented).toBe(true);
    expect(mockOnTaskDrop).toHaveBeenCalledWith(
      'task1',
      new Date('2024-01-01T10:00:00'),
      new Date('2024-01-01T12:00:00') // 2 hours later
    );
  });

  it('ignores drop event for non-working time', () => {
    const mockOnTaskDrop = vi.fn();
    
    render(
      <TimeSlot
        date={mockDate}
        timeSlot={mockTimeSlot}
        tasks={[]}
        isWorkingTime={false}
        onTaskDrop={mockOnTaskDrop}
      />
    );

    const timeSlot = screen.getByTestId('time-slot-2024-01-01-10:00');
    
    const dropEvent = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: {
        getData: vi.fn().mockReturnValue(JSON.stringify({
          id: 'task1',
          estimatedHours: 2,
        })),
      },
    });

    fireEvent(timeSlot, dropEvent);
    
    expect(mockOnTaskDrop).not.toHaveBeenCalled();
  });

  it('handles malformed drop data gracefully', () => {
    const mockOnTaskDrop = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <TimeSlot
        date={mockDate}
        timeSlot={mockTimeSlot}
        tasks={[]}
        isWorkingTime={true}
        onTaskDrop={mockOnTaskDrop}
      />
    );

    const timeSlot = screen.getByTestId('time-slot-2024-01-01-10:00');
    
    const dropEvent = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: {
        getData: vi.fn().mockReturnValue('invalid json'),
      },
    });

    fireEvent(timeSlot, dropEvent);
    
    expect(consoleSpy).toHaveBeenCalledWith('Error handling task drop:', expect.any(Error));
    expect(mockOnTaskDrop).not.toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  it('handles drag enter event', () => {
    render(
      <TimeSlot
        date={mockDate}
        timeSlot={mockTimeSlot}
        tasks={[]}
        isWorkingTime={true}
      />
    );

    const timeSlot = screen.getByTestId('time-slot-2024-01-01-10:00');
    
    const dragEnterEvent = new Event('dragenter', { bubbles: true });
    fireEvent(timeSlot, dragEnterEvent);
    
    expect(dragEnterEvent.defaultPrevented).toBe(true);
  });

  it('applies correct CSS classes based on state', () => {
    const { rerender } = render(
      <TimeSlot
        date={mockDate}
        timeSlot={mockTimeSlot}
        tasks={[]}
        isWorkingTime={true}
      />
    );

    let timeSlot = screen.getByTestId('time-slot-2024-01-01-10:00');
    expect(timeSlot).not.toHaveClass('nonWorkingTime');
    expect(timeSlot).not.toHaveClass('hasConflicts');

    // Test non-working time
    rerender(
      <TimeSlot
        date={mockDate}
        timeSlot={mockTimeSlot}
        tasks={[]}
        isWorkingTime={false}
      />
    );

    timeSlot = screen.getByTestId('time-slot-2024-01-01-10:00');
    expect(timeSlot).toHaveClass('nonWorkingTime');

    // Test conflicts
    rerender(
      <TimeSlot
        date={mockDate}
        timeSlot={mockTimeSlot}
        tasks={[mockTask, mockConflictingTask]}
        isWorkingTime={true}
      />
    );

    timeSlot = screen.getByTestId('time-slot-2024-01-01-10:00');
    expect(timeSlot).toHaveClass('hasConflicts');
  });
});