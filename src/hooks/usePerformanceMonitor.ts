import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: number;
  componentRenderCount: number;
  lastRenderTime: number;
}

interface PerformanceMonitorOptions {
  trackMemory?: boolean;
  logToConsole?: boolean;
  threshold?: number; // Log if render time exceeds this (ms)
}

/**
 * Hook for monitoring component performance
 */
export function usePerformanceMonitor(
  componentName: string,
  options: PerformanceMonitorOptions = {}
) {
  const {
    trackMemory = false,
    logToConsole = false,
    threshold = 16, // 16ms = 60fps
  } = options;

  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(performance.now());
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    componentRenderCount: 0,
    lastRenderTime: 0,
  });

  // Track render performance
  useEffect(() => {
    const renderStart = performance.now();
    renderCountRef.current += 1;

    // Measure render time
    const renderTime = performance.now() - renderStart;
    const timeSinceLastRender = renderStart - lastRenderTimeRef.current;
    lastRenderTimeRef.current = renderStart;

    // Get memory usage if supported and requested
    let memoryUsage: number | undefined;
    if (trackMemory && 'memory' in performance) {
      memoryUsage = (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }

    const newMetrics: PerformanceMetrics = {
      renderTime,
      memoryUsage,
      componentRenderCount: renderCountRef.current,
      lastRenderTime: timeSinceLastRender,
    };

    setMetrics(newMetrics);

    // Log performance issues
    if (logToConsole && renderTime > threshold) {
      console.warn(
        `Performance warning: ${componentName} render took ${renderTime.toFixed(2)}ms`,
        newMetrics
      );
    }
  });

  // Reset metrics
  const resetMetrics = useCallback(() => {
    renderCountRef.current = 0;
    lastRenderTimeRef.current = performance.now();
    setMetrics({
      renderTime: 0,
      componentRenderCount: 0,
      lastRenderTime: 0,
    });
  }, []);

  return {
    metrics,
    resetMetrics,
  };
}

/**
 * Hook for measuring function execution time
 */
export function useExecutionTimer() {
  const measureExecution = useCallback(<T extends any[], R>(
    fn: (...args: T) => R,
    name?: string
  ) => {
    return (...args: T): R => {
      const start = performance.now();
      const result = fn(...args);
      const end = performance.now();
      const duration = end - start;

      if (name && duration > 1) { // Only log if > 1ms
        console.log(`${name} execution time: ${duration.toFixed(2)}ms`);
      }

      return result;
    };
  }, []);

  const measureAsyncExecution = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    name?: string
  ) => {
    return async (...args: T): Promise<R> => {
      const start = performance.now();
      const result = await fn(...args);
      const end = performance.now();
      const duration = end - start;

      if (name && duration > 1) {
        console.log(`${name} async execution time: ${duration.toFixed(2)}ms`);
      }

      return result;
    };
  }, []);

  return {
    measureExecution,
    measureAsyncExecution,
  };
}

/**
 * Hook for tracking component mount/unmount cycles
 */
export function useComponentLifecycle(componentName: string, logToConsole = false) {
  const mountTimeRef = useRef<number>();
  const [lifecycleMetrics, setLifecycleMetrics] = useState({
    mountTime: 0,
    isUnmounted: false,
    totalLifetime: 0,
  });

  useEffect(() => {
    mountTimeRef.current = performance.now();
    
    if (logToConsole) {
      console.log(`${componentName} mounted at ${mountTimeRef.current}`);
    }

    return () => {
      const unmountTime = performance.now();
      const lifetime = mountTimeRef.current ? unmountTime - mountTimeRef.current : 0;
      
      setLifecycleMetrics({
        mountTime: mountTimeRef.current || 0,
        isUnmounted: true,
        totalLifetime: lifetime,
      });

      if (logToConsole) {
        console.log(`${componentName} unmounted after ${lifetime.toFixed(2)}ms`);
      }
    };
  }, [componentName, logToConsole]);

  return lifecycleMetrics;
}

/**
 * Hook for monitoring localStorage performance
 */
export function useLocalStoragePerformance() {
  const [storageMetrics, setStorageMetrics] = useState({
    readTime: 0,
    writeTime: 0,
    storageSize: 0,
    operationCount: 0,
  });

  const measureStorageOperation = useCallback((
    operation: () => void,
    type: 'read' | 'write'
  ) => {
    const start = performance.now();
    operation();
    const end = performance.now();
    const duration = end - start;

    setStorageMetrics(prev => ({
      ...prev,
      [type === 'read' ? 'readTime' : 'writeTime']: duration,
      operationCount: prev.operationCount + 1,
    }));

    return duration;
  }, []);

  const getStorageSize = useCallback(() => {
    let size = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        size += localStorage[key].length + key.length;
      }
    }
    
    setStorageMetrics(prev => ({ ...prev, storageSize: size }));
    return size;
  }, []);

  return {
    storageMetrics,
    measureStorageOperation,
    getStorageSize,
  };
}