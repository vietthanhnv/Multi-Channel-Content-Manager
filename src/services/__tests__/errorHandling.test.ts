import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ErrorHandler, { 
  withErrorHandling, 
  withAsyncErrorHandling, 
  setupGlobalErrorHandlers 
} from '../errorHandling';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let mockNotificationCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    errorHandler = ErrorHandler.getInstance();
    mockNotificationCallback = vi.fn();
    errorHandler.setNotificationCallback(mockNotificationCallback);
    errorHandler.clearErrorLog();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('singleton pattern', () => {
    it('returns the same instance', () => {
      const instance1 = ErrorHandler.getInstance();
      const instance2 = ErrorHandler.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('handleError', () => {
    it('handles Error objects', () => {
      const error = new Error('Test error');
      const context = { component: 'TestComponent' };

      errorHandler.handleError(error, context);

      expect(mockNotificationCallback).toHaveBeenCalledWith(
        'error',
        'Error',
        'Test error'
      );

      const errorLog = errorHandler.getErrorLog();
      expect(errorLog).toHaveLength(1);
      expect(errorLog[0].message).toBe('Test error');
      expect(errorLog[0].context).toEqual(context);
    });

    it('handles string errors', () => {
      const errorMessage = 'String error message';

      errorHandler.handleError(errorMessage);

      expect(mockNotificationCallback).toHaveBeenCalledWith(
        'error',
        'Error',
        errorMessage
      );

      const errorLog = errorHandler.getErrorLog();
      expect(errorLog).toHaveLength(1);
      expect(errorLog[0].message).toBe(errorMessage);
    });

    it('respects showNotification option', () => {
      const error = new Error('Test error');

      errorHandler.handleError(error, {}, { showNotification: false });

      expect(mockNotificationCallback).not.toHaveBeenCalled();
    });

    it('uses fallback message when provided', () => {
      const error = new Error('Technical error');
      const fallbackMessage = 'User-friendly message';

      errorHandler.handleError(error, {}, { fallbackMessage });

      expect(mockNotificationCallback).toHaveBeenCalledWith(
        'error',
        'Error',
        fallbackMessage
      );
    });

    it('logs to console in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const error = new Error('Test error');
      errorHandler.handleError(error);

      expect(consoleSpy).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });
  });

  describe('handleAsyncError', () => {
    it('handles rejected promises', async () => {
      const error = new Error('Async error');
      const rejectedPromise = Promise.reject(error);

      await expect(
        errorHandler.handleAsyncError(rejectedPromise)
      ).rejects.toThrow('Async error');

      expect(mockNotificationCallback).toHaveBeenCalledWith(
        'error',
        'Error',
        'Async error'
      );
    });

    it('passes through resolved promises', async () => {
      const resolvedPromise = Promise.resolve('success');

      const result = await errorHandler.handleAsyncError(resolvedPromise);

      expect(result).toBe('success');
      expect(mockNotificationCallback).not.toHaveBeenCalled();
    });
  });

  describe('handleLocalStorageError', () => {
    it('handles quota exceeded error', () => {
      const error = new Error('Storage quota exceeded');
      error.name = 'QuotaExceededError';

      errorHandler.handleLocalStorageError('setItem', error);

      expect(mockNotificationCallback).toHaveBeenCalledWith(
        'error',
        'Error',
        'Storage quota exceeded. Please clear some data or export your work.'
      );
    });

    it('handles security error', () => {
      const error = new Error('Storage access denied');
      error.name = 'SecurityError';

      errorHandler.handleLocalStorageError('getItem', error);

      expect(mockNotificationCallback).toHaveBeenCalledWith(
        'error',
        'Error',
        'Storage access denied. Please check your browser settings.'
      );
    });

    it('handles generic storage error', () => {
      const error = new Error('Generic storage error');

      errorHandler.handleLocalStorageError('removeItem', error);

      expect(mockNotificationCallback).toHaveBeenCalledWith(
        'error',
        'Error',
        'Storage operation failed: removeItem'
      );
    });
  });

  describe('handleNetworkError', () => {
    it('handles offline error', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      const error = new Error('Network error');
      errorHandler.handleNetworkError(error, 'https://api.example.com');

      expect(mockNotificationCallback).toHaveBeenCalledWith(
        'error',
        'Error',
        'No internet connection. Please check your network.'
      );
    });

    it('handles online network error', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      const error = new Error('Network error');
      errorHandler.handleNetworkError(error);

      expect(mockNotificationCallback).toHaveBeenCalledWith(
        'error',
        'Error',
        'Network request failed. Please try again.'
      );
    });
  });

  describe('handleValidationError', () => {
    it('handles validation errors', () => {
      errorHandler.handleValidationError('email', 'Invalid email format');

      expect(mockNotificationCallback).toHaveBeenCalledWith(
        'error',
        'Error',
        'Invalid email format'
      );

      const errorLog = errorHandler.getErrorLog();
      expect(errorLog[0].context).toEqual({
        field: 'email',
        errorType: 'validation'
      });
    });
  });

  describe('error log management', () => {
    it('maintains error log', () => {
      errorHandler.handleError('Error 1');
      errorHandler.handleError('Error 2');

      const errorLog = errorHandler.getErrorLog();
      expect(errorLog).toHaveLength(2);
      expect(errorLog[0].message).toBe('Error 2'); // Most recent first
      expect(errorLog[1].message).toBe('Error 1');
    });

    it('limits error log size', () => {
      // Add more than max log size (100)
      for (let i = 0; i < 105; i++) {
        errorHandler.handleError(`Error ${i}`);
      }

      const errorLog = errorHandler.getErrorLog();
      expect(errorLog).toHaveLength(100);
      expect(errorLog[0].message).toBe('Error 104'); // Most recent
    });

    it('clears error log', () => {
      errorHandler.handleError('Error 1');
      errorHandler.handleError('Error 2');

      errorHandler.clearErrorLog();

      expect(errorHandler.getErrorLog()).toHaveLength(0);
    });

    it('exports error log as JSON', () => {
      errorHandler.handleError('Test error');

      const exported = errorHandler.exportErrorLog();
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].message).toBe('Test error');
    });
  });

  describe('user-friendly message mapping', () => {
    it('maps technical errors to user-friendly messages', () => {
      errorHandler.handleError('Failed to fetch data from server');

      expect(mockNotificationCallback).toHaveBeenCalledWith(
        'error',
        'Error',
        'Connection failed. Please check your internet connection.'
      );
    });

    it('returns original message for unmapped errors', () => {
      errorHandler.handleError('Custom application error');

      expect(mockNotificationCallback).toHaveBeenCalledWith(
        'error',
        'Error',
        'Custom application error'
      );
    });
  });
});

describe('withErrorHandling', () => {
  let errorHandler: ErrorHandler;
  let mockNotificationCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    errorHandler = ErrorHandler.getInstance();
    mockNotificationCallback = vi.fn();
    errorHandler.setNotificationCallback(mockNotificationCallback);
    errorHandler.clearErrorLog();
  });

  it('wraps synchronous functions', () => {
    const throwingFunction = () => {
      throw new Error('Function error');
    };

    const wrappedFunction = withErrorHandling(throwingFunction);
    const result = wrappedFunction();

    expect(result).toBeUndefined();
    expect(mockNotificationCallback).toHaveBeenCalled();
  });

  it('returns result for successful functions', () => {
    const successFunction = (x: number, y: number) => x + y;

    const wrappedFunction = withErrorHandling(successFunction);
    const result = wrappedFunction(2, 3);

    expect(result).toBe(5);
    expect(mockNotificationCallback).not.toHaveBeenCalled();
  });
});

describe('withAsyncErrorHandling', () => {
  let errorHandler: ErrorHandler;
  let mockNotificationCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    errorHandler = ErrorHandler.getInstance();
    mockNotificationCallback = vi.fn();
    errorHandler.setNotificationCallback(mockNotificationCallback);
    errorHandler.clearErrorLog();
  });

  it('wraps async functions', async () => {
    const throwingAsyncFunction = async () => {
      throw new Error('Async function error');
    };

    const wrappedFunction = withAsyncErrorHandling(throwingAsyncFunction);
    const result = await wrappedFunction();

    expect(result).toBeUndefined();
    expect(mockNotificationCallback).toHaveBeenCalled();
  });

  it('returns result for successful async functions', async () => {
    const successAsyncFunction = async (x: number) => x * 2;

    const wrappedFunction = withAsyncErrorHandling(successAsyncFunction);
    const result = await wrappedFunction(5);

    expect(result).toBe(10);
    expect(mockNotificationCallback).not.toHaveBeenCalled();
  });
});

describe('setupGlobalErrorHandlers', () => {
  let errorHandler: ErrorHandler;
  let mockNotificationCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    errorHandler = ErrorHandler.getInstance();
    mockNotificationCallback = vi.fn();
    errorHandler.setNotificationCallback(mockNotificationCallback);
    errorHandler.clearErrorLog();
  });

  it('sets up global error handlers', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    setupGlobalErrorHandlers();

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'unhandledrejection',
      expect.any(Function)
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'error',
      expect.any(Function)
    );

    addEventListenerSpy.mockRestore();
  });
});