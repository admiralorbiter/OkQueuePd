// Experiment Storage System
// Provides localStorage-based persistence with export/import capabilities

const STORAGE_KEY = 'cod_matchmaking_experiments';
const STORAGE_VERSION = '1.0';
const MAX_STORAGE_SIZE = 10 * 1024 * 1024; // 10MB limit

/**
 * Generate a unique experiment ID
 */
export function generateExperimentId() {
  return `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all experiments from storage
 */
export function getAllExperiments() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const data = JSON.parse(stored);
    if (data.version !== STORAGE_VERSION) {
      // Migrate if needed
      console.warn('Storage version mismatch, clearing old data');
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    
    return data.experiments || [];
  } catch (error) {
    console.error('Error loading experiments:', error);
    return [];
  }
}

/**
 * Save an experiment to storage
 */
export function saveExperiment(experiment) {
  try {
    if (!experiment.id) {
      experiment.id = generateExperimentId();
    }
    
    if (!experiment.timestamp) {
      experiment.timestamp = Date.now();
    }
    
    const experiments = getAllExperiments();
    const existingIndex = experiments.findIndex(exp => exp.id === experiment.id);
    
    if (existingIndex >= 0) {
      experiments[existingIndex] = experiment;
    } else {
      experiments.push(experiment);
    }
    
    // Sort by timestamp (newest first)
    experiments.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    const storageData = {
      version: STORAGE_VERSION,
      experiments: experiments,
      lastUpdated: Date.now(),
    };
    
    const jsonString = JSON.stringify(storageData);
    
    // Check storage size
    if (new Blob([jsonString]).size > MAX_STORAGE_SIZE) {
      // Remove oldest experiments if we're over limit
      const targetSize = MAX_STORAGE_SIZE * 0.8; // Target 80% of max
      while (new Blob([JSON.stringify(storageData)]).size > targetSize && experiments.length > 1) {
        experiments.pop(); // Remove oldest
        storageData.experiments = experiments;
      }
      console.warn('Storage limit reached, removed oldest experiments');
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
    return experiment.id;
  } catch (error) {
    console.error('Error saving experiment:', error);
    if (error.name === 'QuotaExceededError') {
      // Try to free up space by removing oldest experiments
      const experiments = getAllExperiments();
      if (experiments.length > 1) {
        experiments.pop();
        try {
          const storageData = {
            version: STORAGE_VERSION,
            experiments: experiments,
            lastUpdated: Date.now(),
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
          // Retry saving
          return saveExperiment(experiment);
        } catch (retryError) {
          throw new Error('Storage quota exceeded. Please delete some experiments.');
        }
      }
      throw new Error('Storage quota exceeded. Please delete some experiments.');
    }
    throw error;
  }
}

/**
 * Load an experiment by ID
 */
export function loadExperiment(id) {
  const experiments = getAllExperiments();
  return experiments.find(exp => exp.id === id) || null;
}

/**
 * Delete an experiment
 */
export function deleteExperiment(id) {
  const experiments = getAllExperiments();
  const filtered = experiments.filter(exp => exp.id !== id);
  
  const storageData = {
    version: STORAGE_VERSION,
    experiments: filtered,
    lastUpdated: Date.now(),
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
  return true;
}

/**
 * Delete multiple experiments
 */
export function deleteExperiments(ids) {
  const experiments = getAllExperiments();
  const filtered = experiments.filter(exp => !ids.includes(exp.id));
  
  const storageData = {
    version: STORAGE_VERSION,
    experiments: filtered,
    lastUpdated: Date.now(),
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
  return true;
}

/**
 * List experiments with filtering
 */
export function listExperiments(filters = {}) {
  let experiments = getAllExperiments();
  
  // Filter by search query
  if (filters.search) {
    const query = filters.search.toLowerCase();
    experiments = experiments.filter(exp => {
      const name = (exp.name || '').toLowerCase();
      const desc = (exp.description || '').toLowerCase();
      const tags = (exp.tags || []).join(' ').toLowerCase();
      return name.includes(query) || desc.includes(query) || tags.includes(query);
    });
  }
  
  // Filter by tags
  if (filters.tags && filters.tags.length > 0) {
    experiments = experiments.filter(exp => {
      const expTags = exp.tags || [];
      return filters.tags.some(tag => expTags.includes(tag));
    });
  }
  
  // Filter by type
  if (filters.type) {
    experiments = experiments.filter(exp => exp.type === filters.type);
  }
  
  // Filter by status
  if (filters.status) {
    experiments = experiments.filter(exp => exp.status === filters.status);
  }
  
  // Filter by date range
  if (filters.dateFrom) {
    experiments = experiments.filter(exp => exp.timestamp >= filters.dateFrom);
  }
  if (filters.dateTo) {
    experiments = experiments.filter(exp => exp.timestamp <= filters.dateTo);
  }
  
  // Sort
  const sortBy = filters.sortBy || 'timestamp';
  const sortOrder = filters.sortOrder || 'desc';
  
  experiments.sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    
    if (sortBy === 'timestamp' || typeof aVal === 'number') {
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    aVal = String(aVal || '').toLowerCase();
    bVal = String(bVal || '').toLowerCase();
    const cmp = aVal.localeCompare(bVal);
    return sortOrder === 'asc' ? cmp : -cmp;
  });
  
  return experiments;
}

/**
 * Search experiments
 */
export function searchExperiments(query) {
  return listExperiments({ search: query });
}

/**
 * Get all unique tags from experiments
 */
export function getAllTags() {
  const experiments = getAllExperiments();
  const tagSet = new Set();
  
  experiments.forEach(exp => {
    (exp.tags || []).forEach(tag => tagSet.add(tag));
  });
  
  return Array.from(tagSet).sort();
}

/**
 * Export an experiment to JSON
 */
export function exportExperiment(id) {
  const experiment = loadExperiment(id);
  if (!experiment) {
    throw new Error(`Experiment ${id} not found`);
  }
  
  const exportData = {
    version: STORAGE_VERSION,
    exportedAt: Date.now(),
    experiment: experiment,
  };
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Export all experiments
 */
export function exportAllExperiments() {
  const experiments = getAllExperiments();
  
  const exportData = {
    version: STORAGE_VERSION,
    exportedAt: Date.now(),
    experiments: experiments,
  };
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Import an experiment from JSON
 */
export function importExperiment(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    
    if (data.experiment) {
      // Single experiment import
      const experiment = data.experiment;
      // Generate new ID and timestamp
      experiment.id = generateExperimentId();
      experiment.timestamp = Date.now();
      if (experiment.status === 'completed' || experiment.status === 'failed') {
        experiment.status = 'completed'; // Reset status
      }
      return saveExperiment(experiment);
    } else if (data.experiments && Array.isArray(data.experiments)) {
      // Multiple experiments import
      const importedIds = [];
      data.experiments.forEach(exp => {
        exp.id = generateExperimentId();
        exp.timestamp = Date.now();
        if (exp.status === 'completed' || exp.status === 'failed') {
          exp.status = 'completed';
        }
        importedIds.push(saveExperiment(exp));
      });
      return importedIds;
    } else {
      throw new Error('Invalid import format');
    }
  } catch (error) {
    console.error('Error importing experiment:', error);
    throw new Error(`Failed to import: ${error.message}`);
  }
}

/**
 * Download experiment as JSON file
 */
export function downloadExperiment(id, filename) {
  const json = exportExperiment(id);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `experiment-${id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download all experiments as JSON file
 */
export function downloadAllExperiments(filename) {
  const json = exportAllExperiments();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `all-experiments-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get storage statistics
 */
export function getStorageStats() {
  const experiments = getAllExperiments();
  const storageData = localStorage.getItem(STORAGE_KEY);
  const storageSize = storageData ? new Blob([storageData]).size : 0;
  
  return {
    totalExperiments: experiments.length,
    storageSize: storageSize,
    storageSizeMB: (storageSize / (1024 * 1024)).toFixed(2),
    maxSizeMB: (MAX_STORAGE_SIZE / (1024 * 1024)).toFixed(2),
    usagePercent: ((storageSize / MAX_STORAGE_SIZE) * 100).toFixed(1),
  };
}

/**
 * Clear all experiments
 */
export function clearAllExperiments() {
  localStorage.removeItem(STORAGE_KEY);
  return true;
}

