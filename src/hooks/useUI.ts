import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { AppView } from '../types';

export const useUI = () => {
  const { state, dispatch } = useAppContext();

  const setActiveView = useCallback((view: AppView) => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: view });
  }, [dispatch]);

  const setLoading = useCallback((isLoading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: isLoading });
  }, [dispatch]);

  const addError = useCallback((error: string) => {
    dispatch({ type: 'ADD_ERROR', payload: error });
  }, [dispatch]);

  const clearErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ERRORS' });
  }, [dispatch]);

  const navigateTo = useCallback((view: AppView) => {
    setActiveView(view);
  }, [setActiveView]);

  return {
    ui: state.ui,
    activeView: state.ui.activeView,
    isLoading: state.ui.isLoading,
    errors: state.ui.errors,
    setActiveView,
    setLoading,
    addError,
    clearErrors,
    navigateTo,
  };
};