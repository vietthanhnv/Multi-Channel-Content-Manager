import React, { useCallback, useMemo, useRef } from 'react';

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): T {
  let timeout: number | null = null;
  
  return ((...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  }) as T;
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T {
  let inThrottle: boolean;
  
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }) as T;
}

/**
 * Hook for debounced callbacks
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList
): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useMemo(
    () => debounce((...args: Parameters<T>) => callbackRef.current(...args), delay),
    [delay, ...deps]
  ) as T;
}

/**
 * Hook for throttled callbacks
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  limit: number,
  deps: React.DependencyList
): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useMemo(
    () => throttle((...args: Parameters<T>) => callbackRef.current(...args), limit),
    [limit, ...deps]
  ) as T;
}

/**
 * Memoization utility for expensive calculations
 */
export class MemoCache<K, V> {
  private cache = new Map<string, { value: V; timestamp: number }>();
  private maxSize: number;
  private ttl: number; // Time to live in milliseconds

  constructor(maxSize = 100, ttl = 5 * 60 * 1000) { // 5 minutes default TTL
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  private generateKey(key: K): string {
    return typeof key === 'object' ? JSON.stringify(key) : String(key);
  }

  get(key: K): V | undefined {
    const keyStr = this.generateKey(key);
    const cached = this.cache.get(keyStr);
    
    if (!cached) return undefined;
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(keyStr);
      return undefined;
    }
    
    return cached.value;
  }

  set(key: K, value: V): void {
    const keyStr = this.generateKey(key);
    
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    
    this.cache.set(keyStr, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Hook for memoized expensive calculations
 */
export function useMemoizedCalculation<T, K>(
  calculation: (key: K) => T,
  key: K,
  deps: React.DependencyList
): T {
  const cacheRef = useRef(new MemoCache<K, T>());
  
  return useMemo(() => {
    const cached = cacheRef.current.get(key);
    if (cached !== undefined) {
      return cached;
    }
    
    const result = calculation(key);
    cacheRef.current.set(key, result);
    return result;
  }, [key, ...deps]);
}

/**
 * Batch DOM updates for better performance
 */
export function batchDOMUpdates(updates: (() => void)[]): void {
  // Use requestAnimationFrame to batch DOM updates
  requestAnimationFrame(() => {
    updates.forEach(update => update());
  });
}

/**
 * Intersection Observer hook for lazy loading
 */
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const [hasIntersected, setHasIntersected] = React.useState(false);

  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [elementRef, hasIntersected, options]);

  return { isIntersecting, hasIntersected };
}

/**
 * Image lazy loading hook
 */
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = React.useState(placeholder || '');
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isError, setIsError] = React.useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  const { isIntersecting } = useIntersectionObserver(imgRef);

  React.useEffect(() => {
    if (isIntersecting && src && !isLoaded && !isError) {
      const img = new Image();
      
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
      };
      
      img.onerror = () => {
        setIsError(true);
      };
      
      img.src = src;
    }
  }, [isIntersecting, src, isLoaded, isError]);

  return {
    imgRef,
    imageSrc,
    isLoaded,
    isError,
  };
}

/**
 * Performance-optimized array operations
 */
export const ArrayUtils = {
  /**
   * Fast array filtering with early termination
   */
  fastFilter<T>(array: T[], predicate: (item: T, index: number) => boolean, maxResults?: number): T[] {
    const result: T[] = [];
    for (let i = 0; i < array.length; i++) {
      if (predicate(array[i], i)) {
        result.push(array[i]);
        if (maxResults && result.length >= maxResults) break;
      }
    }
    return result;
  },

  /**
   * Fast array search with early termination
   */
  fastFind<T>(array: T[], predicate: (item: T, index: number) => boolean): T | undefined {
    for (let i = 0; i < array.length; i++) {
      if (predicate(array[i], i)) {
        return array[i];
      }
    }
    return undefined;
  },

  /**
   * Chunk array into smaller arrays for processing
   */
  chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },

  /**
   * Process array in chunks with delays to prevent blocking
   */
  async processInChunks<T, R>(
    array: T[],
    processor: (chunk: T[]) => R[],
    chunkSize = 100,
    delay = 0
  ): Promise<R[]> {
    const chunks = this.chunk(array, chunkSize);
    const results: R[] = [];

    for (const chunk of chunks) {
      results.push(...processor(chunk));
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return results;
  },
};

/**
 * Memory management utilities
 */
export const MemoryUtils = {
  /**
   * Get current memory usage (if supported)
   */
  getMemoryUsage(): { used: number; total: number; percentage: number } | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize / 1024 / 1024, // MB
        total: memory.totalJSHeapSize / 1024 / 1024, // MB
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      };
    }
    return null;
  },

  /**
   * Force garbage collection (if supported)
   */
  forceGC(): void {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  },

  /**
   * Monitor memory usage and warn if high
   */
  monitorMemoryUsage(threshold = 80): void {
    const usage = this.getMemoryUsage();
    if (usage && usage.percentage > threshold) {
      console.warn(`High memory usage detected: ${usage.percentage.toFixed(1)}%`);
    }
  },
};