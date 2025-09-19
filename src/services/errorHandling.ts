import { NotificationType } from '../components/NotificationSystem';

export interface ErrorDetails {
  code?: string;
  message: string;
  context?: Record<string, any>;
  timestamp: Date;
  userAgent?: string;
  url?: string;
}

export interface ErrorHandlerOptions {
  showNotification?: boolean;
  logToConsole?: boolean;
  reportToService?: boolean;
  fallbackMessage?: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: ErrorDetails[] = [];
  private maxLogSize = 100;
  private notificationCallback?: (type: NotificationType, title: string, message?: string) => void;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  setNotificationCallback(callback: (type: NotificationType, title: string, message?: string) => void) {
    this.notificationCallback = callback;
  }

  handleError(
    error: Error | string,
    context?: Record<string, any>,
    options: ErrorHandlerOptions = {}
  ): void {
    const {
      showNotification = true,
      logToConsole = true,
      reportToService = false,
      fallbackMessage = 'An unexpected error occurred'
    } = options;

    const errorDetails: ErrorDetails = {
      message: error instanceof Error ? error.message : error,
      context,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Add to error log
    this.addToErrorLog(errorDetails);

    // Log to console in development
    if (logToConsole && import.meta.env.DEV) {
      console.error('Error handled:', errorDetails, error instanceof Error ? error.stack : '');
    }

    // Show notification to user
    if (showNotification && this.notificationCallback) {
      const userMessage = this.getUserFriendlyMessage(errorDetails.message);
      this.notificationCallback('error', 'Error', userMessage || fallbackMessage);
    }

    // Report to external service (placeholder)
    if (reportToService) {
      this.reportError(errorDetails);
    }
  }

  handleAsyncError(
    promise: Promise<any>,
    context?: Record<string, any>,
    options?: ErrorHandlerOptions
  ): Promise<any> {
    return promise.catch((error) => {
      this.handleError(error, context, options);
      throw error; // Re-throw to allow caller to handle if needed
    });
  }

  handleLocalStorageError(operation: string, error: Error): void {
    const context = { operation, storageType: 'localStorage' };
    
    if (error.name === 'QuotaExceededError') {
      this.handleError(
        'Storage quota exceeded. Please clear some data or export your work.',
        context,
        { fallbackMessage: 'Storage is full. Please free up space.' }
      );
    } else if (error.name === 'SecurityError') {
      this.handleError(
        'Storage access denied. Please check your browser settings.',
        context,
        { fallbackMessage: 'Cannot access storage. Check browser settings.' }
      );
    } else {
      this.handleError(
        `Storage operation failed: ${operation}`,
        context,
        { fallbackMessage: 'Data operation failed. Please try again.' }
      );
    }
  }

  handleNetworkError(error: Error, url?: string): void {
    const context = { url, errorType: 'network' };
    
    if (!navigator.onLine) {
      this.handleError(
        'No internet connection. Please check your network.',
        context,
        { fallbackMessage: 'You appear to be offline.' }
      );
    } else {
      this.handleError(
        'Network request failed. Please try again.',
        context,
        { fallbackMessage: 'Connection failed. Please retry.' }
      );
    }
  }

  handleValidationError(field: string, message: string): void {
    const context = { field, errorType: 'validation' };
    this.handleError(
      message,
      context,
      { 
        showNotification: true,
        fallbackMessage: `Invalid ${field}. Please check your input.`
      }
    );
  }

  private addToErrorLog(error: ErrorDetails): void {
    this.errorLog.unshift(error);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }
  }

  private getUserFriendlyMessage(message: string): string {
    // Map technical errors to user-friendly messages
    const errorMappings: Record<string, string> = {
      'Failed to fetch': 'Connection failed. Please check your internet connection.',
      'NetworkError': 'Network error. Please try again.',
      'TypeError': 'Something went wrong. Please refresh the page.',
      'ReferenceError': 'Application error. Please refresh the page.',
      'SyntaxError': 'Data format error. Please try again.',
    };

    for (const [technical, friendly] of Object.entries(errorMappings)) {
      if (message.includes(technical)) {
        return friendly;
      }
    }

    return message;
  }

  private reportError(error: ErrorDetails): void {
    // Placeholder for external error reporting service
    // In a real application, this would send to services like Sentry, LogRocket, etc.
    console.log('Would report error to external service:', error);
  }

  getErrorLog(): ErrorDetails[] {
    return [...this.errorLog];
  }

  clearErrorLog(): void {
    this.errorLog = [];
  }

  exportErrorLog(): string {
    return JSON.stringify(this.errorLog, null, 2);
  }
}

// Utility functions for common error scenarios
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => R,
  context?: Record<string, any>,
  options?: ErrorHandlerOptions
) {
  return (...args: T): R | undefined => {
    try {
      return fn(...args);
    } catch (error) {
      ErrorHandler.getInstance().handleError(error as Error, context, options);
      return undefined;
    }
  };
}

export function withAsyncErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: Record<string, any>,
  options?: ErrorHandlerOptions
) {
  return async (...args: T): Promise<R | undefined> => {
    try {
      return await fn(...args);
    } catch (error) {
      ErrorHandler.getInstance().handleError(error as Error, context, options);
      return undefined;
    }
  };
}

// Global error handlers
export function setupGlobalErrorHandlers(): void {
  const errorHandler = ErrorHandler.getInstance();

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    errorHandler.handleError(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      { type: 'unhandledRejection' },
      { reportToService: true }
    );
  });

  // Handle global JavaScript errors
  window.addEventListener('error', (event) => {
    errorHandler.handleError(
      event.error || new Error(event.message),
      { 
        type: 'globalError',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      },
      { reportToService: true }
    );
  });
}

export default ErrorHandler;