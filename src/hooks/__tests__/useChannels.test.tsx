import { renderHook, act } from '@testing-library/react';
import { useChannels } from '../useChannels';
import { AppProvider } from '../../context/AppContext';
import { Channel } from '../../types';
import { ReactNode } from 'react';

// Mock data
const mockChannel: Channel = {
  id: 'channel-1',
  name: 'Test Channel',
  contentType: 'gaming',
  postingSchedule: {
    frequency: 'weekly',
    preferredDays: ['Monday', 'Wednesday'],
    preferredTimes: ['10:00', '14:00'],
  },
  color: '#ff0000',
  createdAt: new Date('2024-01-01'),
  isActive: true,
};

const mockInactiveChannel: Channel = {
  ...mockChannel,
  id: 'channel-2',
  name: 'Inactive Channel',
  isActive: false,
};

// Test wrapper
const wrapper = ({ children }: { children: ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe('useChannels', () => {
  it('should initialize with empty channels array', () => {
    const { result } = renderHook(() => useChannels(), { wrapper });
    
    expect(result.current.channels).toEqual([]);
    expect(result.current.selectedChannelId).toBeUndefined();
    expect(result.current.selectedChannel).toBeUndefined();
  });

  it('should add a channel', () => {
    const { result } = renderHook(() => useChannels(), { wrapper });
    
    act(() => {
      result.current.addChannel(mockChannel);
    });
    
    expect(result.current.channels).toHaveLength(1);
    expect(result.current.channels[0]).toEqual(mockChannel);
  });

  it('should update a channel', () => {
    const { result } = renderHook(() => useChannels(), { wrapper });
    
    act(() => {
      result.current.addChannel(mockChannel);
    });
    
    act(() => {
      result.current.updateChannel('channel-1', { name: 'Updated Channel' });
    });
    
    expect(result.current.channels[0].name).toBe('Updated Channel');
    expect(result.current.channels[0].contentType).toBe('gaming'); // Other properties unchanged
  });

  it('should delete a channel', () => {
    const { result } = renderHook(() => useChannels(), { wrapper });
    
    act(() => {
      result.current.addChannel(mockChannel);
    });
    
    expect(result.current.channels).toHaveLength(1);
    
    act(() => {
      result.current.deleteChannel('channel-1');
    });
    
    expect(result.current.channels).toHaveLength(0);
  });

  it('should select a channel', () => {
    const { result } = renderHook(() => useChannels(), { wrapper });
    
    act(() => {
      result.current.addChannel(mockChannel);
    });
    
    act(() => {
      result.current.selectChannel('channel-1');
    });
    
    expect(result.current.selectedChannelId).toBe('channel-1');
    expect(result.current.selectedChannel).toEqual(mockChannel);
  });

  it('should deselect a channel', () => {
    const { result } = renderHook(() => useChannels(), { wrapper });
    
    act(() => {
      result.current.addChannel(mockChannel);
      result.current.selectChannel('channel-1');
    });
    
    expect(result.current.selectedChannelId).toBe('channel-1');
    
    act(() => {
      result.current.selectChannel(undefined);
    });
    
    expect(result.current.selectedChannelId).toBeUndefined();
    expect(result.current.selectedChannel).toBeUndefined();
  });

  it('should get channel by ID', () => {
    const { result } = renderHook(() => useChannels(), { wrapper });
    
    act(() => {
      result.current.addChannel(mockChannel);
    });
    
    const foundChannel = result.current.getChannelById('channel-1');
    expect(foundChannel).toEqual(mockChannel);
    
    const notFoundChannel = result.current.getChannelById('non-existent');
    expect(notFoundChannel).toBeUndefined();
  });

  it('should get active channels only', () => {
    const { result } = renderHook(() => useChannels(), { wrapper });
    
    act(() => {
      result.current.addChannel(mockChannel);
      result.current.addChannel(mockInactiveChannel);
    });
    
    expect(result.current.channels).toHaveLength(2);
    
    const activeChannels = result.current.getActiveChannels();
    expect(activeChannels).toHaveLength(1);
    expect(activeChannels[0].isActive).toBe(true);
  });

  it('should handle multiple channels', () => {
    const { result } = renderHook(() => useChannels(), { wrapper });
    
    const channel2: Channel = {
      ...mockChannel,
      id: 'channel-2',
      name: 'Second Channel',
    };
    
    act(() => {
      result.current.addChannel(mockChannel);
      result.current.addChannel(channel2);
    });
    
    expect(result.current.channels).toHaveLength(2);
    expect(result.current.getChannelById('channel-1')?.name).toBe('Test Channel');
    expect(result.current.getChannelById('channel-2')?.name).toBe('Second Channel');
  });

  it('should maintain referential stability for callback functions', () => {
    const { result, rerender } = renderHook(() => useChannels(), { wrapper });
    
    const initialCallbacks = {
      addChannel: result.current.addChannel,
      updateChannel: result.current.updateChannel,
      deleteChannel: result.current.deleteChannel,
      selectChannel: result.current.selectChannel,
      getChannelById: result.current.getChannelById,
      getActiveChannels: result.current.getActiveChannels,
    };
    
    rerender();
    
    expect(result.current.addChannel).toBe(initialCallbacks.addChannel);
    expect(result.current.updateChannel).toBe(initialCallbacks.updateChannel);
    expect(result.current.deleteChannel).toBe(initialCallbacks.deleteChannel);
    expect(result.current.selectChannel).toBe(initialCallbacks.selectChannel);
    expect(result.current.getChannelById).toBe(initialCallbacks.getChannelById);
    expect(result.current.getActiveChannels).toBe(initialCallbacks.getActiveChannels);
  });
});