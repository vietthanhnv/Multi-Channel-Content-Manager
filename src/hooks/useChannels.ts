import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Channel } from '../types';

export const useChannels = () => {
  const { state, dispatch } = useAppContext();

  const addChannel = useCallback((channel: Channel) => {
    dispatch({ type: 'ADD_CHANNEL', payload: channel });
  }, [dispatch]);

  const updateChannel = useCallback((id: string, updates: Partial<Channel>) => {
    dispatch({ type: 'UPDATE_CHANNEL', payload: { id, updates } });
  }, [dispatch]);

  const deleteChannel = useCallback((id: string) => {
    dispatch({ type: 'DELETE_CHANNEL', payload: id });
  }, [dispatch]);

  const selectChannel = useCallback((id: string | undefined) => {
    dispatch({ type: 'SET_SELECTED_CHANNEL', payload: id });
  }, [dispatch]);

  const getChannelById = useCallback((id: string) => {
    return state.channels.find(channel => channel.id === id);
  }, [state.channels]);

  const getActiveChannels = useCallback(() => {
    return state.channels.filter(channel => channel.isActive);
  }, [state.channels]);

  return {
    channels: state.channels,
    selectedChannelId: state.selectedChannelId,
    selectedChannel: state.selectedChannelId ? getChannelById(state.selectedChannelId) : undefined,
    addChannel,
    updateChannel,
    deleteChannel,
    selectChannel,
    getChannelById,
    getActiveChannels,
  };
};