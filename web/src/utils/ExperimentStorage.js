// Experiment Storage System
// Provides SQLite-based persistence with localStorage migration support

import * as Database from './Database.js';

const STORAGE_KEY = 'cod_matchmaking_experiments';
const STORAGE_VERSION = '1.0';
const MIGRATION_FLAG = 'cod_matchmaking_migrated_to_sqlite';

/**
 * Generate a unique experiment ID
 */
export function generateExperimentId() {
  return `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if migration from localStorage is needed
 */
export function needsMigration() {
  if (localStorage.getItem(MIGRATION_FLAG)) {
    return false; // Already migrated
  }
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return false; // No data to migrate
  }
  
  try {
    const data = JSON.parse(stored);
    return data.experiments && data.experiments.length > 0;
  } catch {
    return false;
  }
}

/**
 * Migrate experiments from localStorage to SQLite
 */
export async function migrateLocalStorageToSQLite() {
  if (!needsMigration()) {
    return { migrated: 0, errors: [] };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { migrated: 0, errors: [] };
    }

    const data = JSON.parse(stored);
    const experiments = data.experiments || [];
    
    let migrated = 0;
    const errors = [];

    // Initialize database if needed
    await Database.initDatabase();

    for (const experiment of experiments) {
      try {
        // Convert experiment format to match database schema
        const dbExperiment = {
          id: experiment.id || generateExperimentId(),
          name: experiment.name || '',
          description: experiment.description || '',
          type: experiment.type || 'single_param',
          config: experiment.config || {},
          status: experiment.status || 'completed',
          timestamp: experiment.timestamp || Date.now(),
        };

        await Database.saveExperiment(dbExperiment);
        migrated++;
      } catch (error) {
        errors.push({ id: experiment.id, error: error.message });
        console.error(`Failed to migrate experiment ${experiment.id}:`, error);
      }
    }

    // Mark migration as complete
    if (migrated > 0) {
      localStorage.setItem(MIGRATION_FLAG, 'true');
    }

    return { migrated, errors };
  } catch (error) {
    console.error('Migration failed:', error);
    return { migrated: 0, errors: [{ error: error.message }] };
  }
}

/**
 * Get all experiments from storage (SQLite)
 */
export async function getAllExperiments() {
  try {
    await Database.initDatabase();
    const experiments = await Database.getAllExperiments();
    
    // For each experiment, also load its results so that "Runs" counts display correctly
    const experimentsWithResults = await Promise.all(
      experiments.map(async (exp) => {
        let results = [];
        try {
          const dbResults = await Database.getResults(exp.id);
          // dbResults items have shape { runData, metrics, ... }
          results = dbResults.map(r => r.runData);
        } catch (err) {
          console.error('Error loading results for experiment', exp.id, err);
        }

        return {
          id: exp.id,
          name: exp.name,
          description: exp.description,
          type: exp.type,
          config: exp.config,
          status: exp.status,
          timestamp: exp.created_at,
          results,
          summary: null,
          duration: null,
          tags: exp.config?.tags || [],
        };
      })
    );

    return experimentsWithResults;
  } catch (error) {
    console.error('Error loading experiments:', error);
    return [];
  }
}

/**
 * Save an experiment to storage (SQLite)
 */
export async function saveExperiment(experiment) {
  try {
    if (!experiment.id) {
      experiment.id = generateExperimentId();
    }
    
    if (!experiment.timestamp) {
      experiment.timestamp = Date.now();
    }

    await Database.initDatabase();

    // Save experiment metadata
    const dbExperiment = {
      id: experiment.id,
      name: experiment.name || '',
      description: experiment.description || '',
      type: experiment.type || 'single_param',
      config: {
        ...experiment.config,
        tags: experiment.tags || [],
      },
      status: experiment.status || 'completed',
      timestamp: experiment.timestamp,
    };

    await Database.saveExperiment(dbExperiment);

    // Save results if present
    if (experiment.results) {
      for (const result of experiment.results) {
        await Database.saveResult({
          experimentId: experiment.id,
          runData: result,
          metrics: result.metrics || {},
        });
      }
    }

    return experiment.id;
  } catch (error) {
    console.error('Error saving experiment:', error);
    throw error;
  }
}

/**
 * Load an experiment by ID
 */
export async function loadExperiment(id) {
  try {
    await Database.initDatabase();
    const experiment = await Database.getExperiment(id);
    
    if (!experiment) {
      return null;
    }

    // Load results
    const results = await Database.getResults(id);

    // Convert to expected format
    return {
      id: experiment.id,
      name: experiment.name,
      description: experiment.description,
      type: experiment.type,
      config: experiment.config,
      status: experiment.status,
      timestamp: experiment.created_at,
      results: results.map(r => r.runData),
      summary: null, // Would need to compute from results
      duration: null,
      tags: experiment.config?.tags || [],
    };
  } catch (error) {
    console.error('Error loading experiment:', error);
    return null;
  }
}

/**
 * Get incomplete experiments (for resume functionality)
 */
export async function getIncompleteExperiments() {
  try {
    await Database.initDatabase();
    const experiments = await Database.getIncompleteExperiments();
    
    return experiments.map(exp => ({
      id: exp.id,
      name: exp.name,
      description: exp.description,
      type: exp.type,
      config: exp.config || {},
      status: exp.status,
      timestamp: exp.created_at || exp.timestamp,
      tags: exp.config?.tags || [],
    }));
  } catch (error) {
    console.error('Error loading incomplete experiments:', error);
    return [];
  }
}

/**
 * Get running/paused experiments with progress information
 */
export async function getRunningExperimentsWithProgress() {
  try {
    await Database.initDatabase();
    const experiments = await Database.getIncompleteExperiments();
    
    // Get progress for each experiment from checkpoints
    const experimentsWithProgress = await Promise.all(
      experiments.map(async (exp) => {
        try {
          const checkpoint = await Database.loadCheckpoint(exp.id);
          let progress = 0;
          let currentRun = 0;
          let totalRuns = 0;
          
          if (checkpoint) {
            currentRun = checkpoint.runIndex || 0;
            const partialResults = checkpoint.partialResults || [];
            
            // Try to determine total runs from config
            // Config structure: { base: {...}, varied: {...}, fixed: {...} }
            if (exp.config) {
              const varied = exp.config.varied || {};
              
              // For single param sweep
              if (exp.type === 'single_param') {
                if (varied.parameter && varied.values && Array.isArray(varied.values)) {
                  totalRuns = varied.values.length;
                } else if (varied.parameter && exp.config.parameter && exp.config.values) {
                  // Fallback to old structure
                  totalRuns = exp.config.values.length;
                }
              } 
              // For multi param sweep
              else if (exp.type === 'multi_param') {
                if (varied.combinations && Array.isArray(varied.combinations)) {
                  totalRuns = varied.combinations.length;
                } else if (exp.config.combinations && Array.isArray(exp.config.combinations)) {
                  // Fallback to old structure
                  totalRuns = exp.config.combinations.length;
                }
              }
            }
            
            // Calculate progress
            if (totalRuns > 0) {
              // Use runIndex if available, otherwise use partialResults length
              currentRun = checkpoint.runIndex || partialResults.length;
              progress = Math.min(100, (currentRun / totalRuns) * 100);
            } else if (partialResults.length > 0) {
              // Estimate based on completed results if we can't determine total
              currentRun = partialResults.length;
              progress = 0; // Can't calculate percentage without total
            } else {
              // No checkpoint data yet
              currentRun = 0;
              progress = 0;
            }
          }
          
          return {
            id: exp.id,
            name: exp.name,
            description: exp.description,
            type: exp.type,
            config: exp.config || {},
            status: exp.status,
            timestamp: exp.created_at || exp.timestamp,
            updatedAt: exp.updated_at || exp.timestamp,
            tags: exp.config?.tags || [],
            progress,
            currentRun,
            totalRuns,
            checkpoint: checkpoint ? {
              runIndex: checkpoint.runIndex,
              resultsCount: checkpoint.partialResults?.length || 0,
              lastSaved: checkpoint.created_at,
            } : null,
          };
        } catch (error) {
          console.error(`Error loading progress for experiment ${exp.id}:`, error);
          return {
            id: exp.id,
            name: exp.name,
            description: exp.description,
            type: exp.type,
            config: exp.config || {},
            status: exp.status,
            timestamp: exp.created_at || exp.timestamp,
            updatedAt: exp.updated_at || exp.timestamp,
            tags: exp.config?.tags || [],
            progress: 0,
            currentRun: 0,
            totalRuns: 0,
            checkpoint: null,
          };
        }
      })
    );
    
    return experimentsWithProgress;
  } catch (error) {
    console.error('Error loading running experiments:', error);
    return [];
  }
}

/**
 * Delete an experiment
 */
export async function deleteExperiment(id) {
  try {
    await Database.initDatabase();
    await Database.deleteExperiment(id);
    return true;
  } catch (error) {
    console.error('Error deleting experiment:', error);
    throw error;
  }
}

/**
 * Delete multiple experiments
 */
export async function deleteExperiments(ids) {
  try {
    await Database.initDatabase();
    for (const id of ids) {
      await Database.deleteExperiment(id);
    }
    return true;
  } catch (error) {
    console.error('Error deleting experiments:', error);
    throw error;
  }
}

/**
 * List experiments with filtering
 */
export async function listExperiments(filters = {}) {
  try {
    let experiments = await getAllExperiments();
    
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
  } catch (error) {
    console.error('Error listing experiments:', error);
    return [];
  }
}

/**
 * Search experiments
 */
export async function searchExperiments(query) {
  return listExperiments({ search: query });
}

/**
 * Get all unique tags from experiments
 */
export async function getAllTags() {
  try {
    const experiments = await getAllExperiments();
    const tagSet = new Set();
    
    experiments.forEach(exp => {
      (exp.tags || []).forEach(tag => tagSet.add(tag));
    });
    
    return Array.from(tagSet).sort();
  } catch (error) {
    console.error('Error getting tags:', error);
    return [];
  }
}

/**
 * Export an experiment to JSON
 */
export async function exportExperiment(id) {
  const experiment = await loadExperiment(id);
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
export async function exportAllExperiments() {
  const experiments = await getAllExperiments();
  
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
export async function importExperiment(jsonString) {
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
      return await saveExperiment(experiment);
    } else if (data.experiments && Array.isArray(data.experiments)) {
      // Multiple experiments import
      const importedIds = [];
      for (const exp of data.experiments) {
        exp.id = generateExperimentId();
        exp.timestamp = Date.now();
        if (exp.status === 'completed' || exp.status === 'failed') {
          exp.status = 'completed';
        }
        importedIds.push(await saveExperiment(exp));
      }
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
export async function downloadExperiment(id, filename) {
  const json = await exportExperiment(id);
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
export async function downloadAllExperiments(filename) {
  const json = await exportAllExperiments();
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
export async function getStorageStats() {
  try {
    await Database.initDatabase();
    const stats = await Database.getDatabaseStats();
    
    return {
      totalExperiments: stats.experiments,
      storageSize: 0, // SQLite size not easily accessible
      storageSizeMB: 'N/A',
      maxSizeMB: 'N/A',
      usagePercent: 'N/A',
    };
  } catch (error) {
    console.error('Error getting storage stats:', error);
    return {
      totalExperiments: 0,
      storageSize: 0,
      storageSizeMB: '0.00',
      maxSizeMB: 'N/A',
      usagePercent: '0.0',
    };
  }
}

/**
 * Clear all experiments
 */
export async function clearAllExperiments() {
  try {
    await Database.initDatabase();
    await Database.clearAllData();
    // Also clear migration flag
    localStorage.removeItem(MIGRATION_FLAG);
    return true;
  } catch (error) {
    console.error('Error clearing experiments:', error);
    throw error;
  }
}
