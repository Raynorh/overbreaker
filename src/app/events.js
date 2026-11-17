// Synchronous delivery keeps presentation responsive; rules can run without listeners.
export function createEvents() {
  const listeners = new Map();
  return {
    on(type, callback) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(callback);
      return () => listeners.get(type)?.delete(callback);
    },
    emit(type, ...args) {
      for (const callback of listeners.get(type) || []) callback(...args);
    },
    clear() {
      listeners.clear();
    },
  };
}
