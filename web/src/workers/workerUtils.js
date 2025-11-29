// Worker utilities for message types and serialization

/**
 * Message types for worker communication
 */
export const MESSAGE_TYPES = {
  // From main thread to worker
  INIT: 'init',
  RUN_SIMULATION: 'run_simulation',
  SAVE_CHECKPOINT: 'save_checkpoint',
  CANCEL: 'cancel',
  PAUSE: 'pause',
  RESUME: 'resume',
  
  // From worker to main thread
  READY: 'ready',
  PROGRESS: 'progress',
  CHECKPOINT: 'checkpoint',
  COMPLETE: 'complete',
  ERROR: 'error',
  LOG: 'log'
};

/**
 * Create a worker message
 */
export function createMessage(type, data = {}) {
  return {
    type,
    data,
    timestamp: Date.now()
  };
}

/**
 * Serialize config for worker (handles BigInt and other non-serializable types)
 */
export function serializeConfig(config) {
  // Convert BigInt to string for JSON serialization
  const serialized = JSON.parse(JSON.stringify(config, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  }));
  return serialized;
}

/**
 * Deserialize config from worker
 */
export function deserializeConfig(config) {
  // If needed, convert string back to BigInt
  // For now, config should work as-is
  return config;
}

/**
 * Serialize results for storage
 */
export function serializeResults(results) {
  return JSON.stringify(results, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    if (value === undefined) {
      return null;
    }
    return value;
  });
}

/**
 * Deserialize results from storage
 */
export function deserializeResults(resultsJson) {
  if (typeof resultsJson === 'string') {
    return JSON.parse(resultsJson);
  }
  return resultsJson;
}

/**
 * Create error message
 */
export function createErrorMessage(error, context = '') {
  return {
    message: error.message || String(error),
    stack: error.stack,
    context,
    timestamp: Date.now()
  };
}

/**
 * Validate worker message
 */
export function validateMessage(message) {
  if (!message || typeof message !== 'object') {
    return false;
  }
  if (!message.type || typeof message.type !== 'string') {
    return false;
  }
  return true;
}

