// Database wrapper for SQLite using sql.js with OPFS persistence
// sql.js uses a different export structure, need to handle it properly
let initSqlJsFn = null;

// Try to import sql.js statically - this works better with Vite
let sqlJsStaticImport = null;
try {
  // Use a function that will be called when needed
  sqlJsStaticImport = () => import('sql.js');
} catch (e) {
  // Fallback
  console.warn('Static import of sql.js failed, will use dynamic import');
}

const DB_FILENAME = 'experiments.db';
let db = null;
let sqlJs = null;
let opfsRoot = null;

/**
 * Initialize OPFS (Origin Private File System) directory
 */
async function initOPFS() {
  if (!('FileSystemHandle' in globalThis)) {
    throw new Error('OPFS not supported in this browser');
  }

  try {
    opfsRoot = await navigator.storage.getDirectory();
    return opfsRoot;
  } catch (error) {
    console.error('Failed to initialize OPFS:', error);
    throw error;
  }
}

/**
 * Load database file from OPFS
 */
async function loadDatabaseFromOPFS() {
  if (!opfsRoot) {
    await initOPFS();
  }

  try {
    const fileHandle = await opfsRoot.getFileHandle(DB_FILENAME, { create: true });
    const file = await fileHandle.getFile();
    const arrayBuffer = await file.arrayBuffer();
    
    if (arrayBuffer.byteLength === 0) {
      // Empty file, create new database
      return null;
    }
    
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    if (error.name === 'NotFoundError') {
      return null; // Database doesn't exist yet
    }
    console.error('Failed to load database from OPFS:', error);
    throw error;
  }
}

/**
 * Save database file to OPFS
 */
async function saveDatabaseToOPFS(data) {
  if (!opfsRoot) {
    await initOPFS();
  }

  try {
    const fileHandle = await opfsRoot.getFileHandle(DB_FILENAME, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();
  } catch (error) {
    console.error('Failed to save database to OPFS:', error);
    throw error;
  }
}

/**
 * Initialize SQLite database
 */
export async function initDatabase() {
  try {
    // Initialize sql.js - dynamic import to handle module structure
    if (!sqlJs) {
      if (!initSqlJsFn) {
        // sql.js is a UMD build that doesn't work well with Vite's ES module system
        // Use CDN script tag approach which is more reliable
        if (typeof window === 'undefined') {
          throw new Error('sql.js requires a browser environment (window object)');
        }

        const getInitSqlJs = () => {
          // sql.js CDN exposes initSqlJs directly on window
          if (typeof window.initSqlJs === 'function') {
            return window.initSqlJs;
          }
          // Some versions might use window.SQL.initSqlJs
          if (window.SQL && typeof window.SQL.initSqlJs === 'function') {
            return window.SQL.initSqlJs;
          }
          // Some versions expose SQL as the function itself
          if (window.SQL && typeof window.SQL === 'function') {
            return window.SQL;
          }
          return null;
        };

        // Check if already loaded
        const existingInitSqlJs = getInitSqlJs();
        if (existingInitSqlJs) {
          initSqlJsFn = existingInitSqlJs;
          console.log('Using existing sql.js');
        } else {
          // Load sql.js from CDN
          await new Promise((resolve, reject) => {
            // Check if script is already being loaded
            const existingScript = document.querySelector('script[src*="sql-wasm"]');
            if (existingScript) {
              // Wait for existing script to load
              const checkInterval = setInterval(() => {
                const initFn = getInitSqlJs();
                if (initFn) {
                  clearInterval(checkInterval);
                  initSqlJsFn = initFn;
                  resolve();
                }
              }, 100);
              setTimeout(() => {
                clearInterval(checkInterval);
                const initFn = getInitSqlJs();
                if (initFn) {
                  initSqlJsFn = initFn;
                  resolve();
                } else {
                  reject(new Error('Timeout waiting for sql.js to load from CDN'));
                }
              }, 15000);
            } else {
              // Load the script
              const script = document.createElement('script');
              script.src = 'https://sql.js.org/dist/sql-wasm.js';
              script.async = true;
              script.onload = () => {
                // Wait for sql.js to initialize
                let attempts = 0;
                const maxAttempts = 50; // 5 seconds
                const checkInterval = setInterval(() => {
                  attempts++;
                  const initFn = getInitSqlJs();
                  if (initFn) {
                    clearInterval(checkInterval);
                    initSqlJsFn = initFn;
                    console.log('Loaded sql.js from CDN');
                    resolve();
                  } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    console.error('sql.js CDN load failed - window keys:', Object.keys(window).filter(k => k.toLowerCase().includes('sql')));
                    reject(new Error('sql.js loaded but initSqlJs not available'));
                  }
                }, 100);
              };
              script.onerror = () => reject(new Error('Failed to load sql.js from CDN'));
              document.head.appendChild(script);
            }
          });
        }
        
        if (typeof initSqlJsFn !== 'function') {
          throw new Error('initSqlJs is not a function after loading');
        }
      }
      sqlJs = await initSqlJsFn({
        locateFile: (file) => {
          // Always use CDN for WASM files
          return `https://sql.js.org/dist/${file}`;
        }
      });
    }

    // Try to load existing database from OPFS
    const existingData = await loadDatabaseFromOPFS();
    
    if (existingData) {
      db = new sqlJs.Database(existingData);
    } else {
      // Create new database
      db = new sqlJs.Database();
      await createSchema();
      await saveDatabase();
    }

    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    // Fallback: create in-memory database if OPFS fails
    if (!sqlJs) {
      if (!initSqlJsFn) {
        // Use CDN approach for fallback too
        if (typeof window !== 'undefined') {
          if (window.SQL && typeof window.SQL.initSqlJs === 'function') {
            initSqlJsFn = window.SQL.initSqlJs;
          } else if (window.initSqlJs && typeof window.initSqlJs === 'function') {
            initSqlJsFn = window.initSqlJs;
          } else if (window.SQL && typeof window.SQL === 'function') {
            initSqlJsFn = window.SQL;
          } else {
            throw new Error('sql.js not available in fallback - CDN load may have failed');
          }
        } else {
          throw new Error('sql.js not available in fallback - window not available');
        }
      }
      sqlJs = await initSqlJsFn({
        locateFile: (file) => {
          // Always use CDN for WASM files
          return `https://sql.js.org/dist/${file}`;
        }
      });
    }
    db = new sqlJs.Database();
    await createSchema();
    console.warn('Using in-memory database (OPFS unavailable)');
    return db;
  }
}

/**
 * Create database schema
 */
async function createSchema() {
  if (!db) {
    throw new Error('Database not initialized');
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS experiments (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      type TEXT,
      config TEXT,
      status TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      completed_at INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS checkpoints (
      id TEXT PRIMARY KEY,
      experiment_id TEXT,
      run_index INTEGER,
      partial_results TEXT,
      simulation_state TEXT,
      created_at INTEGER,
      FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS results (
      id TEXT PRIMARY KEY,
      experiment_id TEXT,
      run_data TEXT,
      metrics TEXT,
      created_at INTEGER,
      FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_checkpoints_experiment_id ON checkpoints(experiment_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_results_experiment_id ON results(experiment_id)`);

  await saveDatabase();
}

/**
 * Save database to OPFS
 */
async function saveDatabase() {
  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    const data = db.export();
    await saveDatabaseToOPFS(data);
  } catch (error) {
    console.warn('Failed to save database to OPFS:', error);
    // Continue without saving (in-memory mode)
  }
}

/**
 * Get database instance (initialize if needed)
 */
async function getDatabase() {
  if (!db) {
    await initDatabase();
  }
  return db;
}

/**
 * Save experiment to database
 */
export async function saveExperiment(experiment) {
  const database = await getDatabase();
  
  const now = Date.now();
  const configJson = JSON.stringify(experiment.config || {});
  
  database.run(
    `INSERT OR REPLACE INTO experiments 
     (id, name, description, type, config, status, created_at, updated_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      experiment.id,
      experiment.name || '',
      experiment.description || '',
      experiment.type || 'single_param',
      configJson,
      experiment.status || 'completed',
      experiment.timestamp || now,
      now,
      experiment.status === 'completed' ? now : null
    ]
  );

  await saveDatabase();
  return experiment.id;
}

/**
 * Get experiment by ID
 */
export async function getExperiment(id) {
  const database = await getDatabase();
  
  const result = database.exec(
    `SELECT * FROM experiments WHERE id = ?`,
    [id]
  );

  if (result.length === 0) {
    return null;
  }

  const row = result[0].values[0];
  const columns = result[0].columns;
  
  const experiment = {};
  columns.forEach((col, idx) => {
    experiment[col] = row[idx];
  });

  // Parse JSON fields
  if (experiment.config) {
    experiment.config = JSON.parse(experiment.config);
  }

  return experiment;
}

/**
 * Get all experiments
 */
export async function getAllExperiments(filters = {}) {
  const database = await getDatabase();
  
  let query = 'SELECT * FROM experiments WHERE 1=1';
  const params = [];

  if (filters.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }

  if (filters.type) {
    query += ' AND type = ?';
    params.push(filters.type);
  }

  query += ' ORDER BY created_at DESC';

  const result = database.exec(query, params);

  if (result.length === 0) {
    return [];
  }

  const experiments = [];
  const columns = result[0].columns;
  
  result[0].values.forEach(row => {
    const experiment = {};
    columns.forEach((col, idx) => {
      experiment[col] = row[idx];
    });
    
    // Parse JSON fields
    if (experiment.config) {
      experiment.config = JSON.parse(experiment.config);
    }
    
    experiments.push(experiment);
  });

  return experiments;
}

/**
 * Get incomplete experiments (running or paused)
 */
export async function getIncompleteExperiments() {
  const database = await getDatabase();
  
  const result = database.exec(
    `SELECT * FROM experiments 
     WHERE status IN ('running', 'paused')
     ORDER BY updated_at DESC`
  );

  if (result.length === 0) {
    return [];
  }

  const experiments = [];
  const columns = result[0].columns;
  
  result[0].values.forEach(row => {
    const experiment = {};
    columns.forEach((col, idx) => {
      experiment[col] = row[idx];
    });
    
    // Parse JSON fields
    if (experiment.config) {
      experiment.config = JSON.parse(experiment.config);
    }
    
    experiments.push(experiment);
  });

  return experiments;
}

/**
 * Save checkpoint
 */
export async function saveCheckpoint(checkpoint) {
  const database = await getDatabase();
  
  const now = Date.now();
  const partialResultsJson = JSON.stringify(checkpoint.partialResults || []);
  const simulationStateJson = checkpoint.simulationState 
    ? JSON.stringify(checkpoint.simulationState) 
    : null;

  database.run(
    `INSERT OR REPLACE INTO checkpoints 
     (id, experiment_id, run_index, partial_results, simulation_state, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      checkpoint.id || `${checkpoint.experimentId}-checkpoint`,
      checkpoint.experimentId,
      checkpoint.runIndex || 0,
      partialResultsJson,
      simulationStateJson,
      now
    ]
  );

  await saveDatabase();
  return checkpoint.id;
}

/**
 * Load checkpoint for experiment
 */
export async function loadCheckpoint(experimentId) {
  const database = await getDatabase();
  
  const result = database.exec(
    `SELECT * FROM checkpoints 
     WHERE experiment_id = ? 
     ORDER BY created_at DESC 
     LIMIT 1`,
    [experimentId]
  );

  if (result.length === 0) {
    return null;
  }

  const row = result[0].values[0];
  const columns = result[0].columns;
  
  const checkpoint = {};
  columns.forEach((col, idx) => {
    checkpoint[col] = row[idx];
  });

  // Parse JSON fields
  if (checkpoint.partial_results) {
    checkpoint.partialResults = JSON.parse(checkpoint.partial_results);
  }
  if (checkpoint.simulation_state) {
    checkpoint.simulationState = JSON.parse(checkpoint.simulation_state);
  }

  // Normalize column names to JavaScript-friendly properties
  // The DB column is `run_index`, but the rest of the code expects `runIndex`
  if (checkpoint.run_index !== undefined && checkpoint.run_index !== null) {
    checkpoint.runIndex = checkpoint.run_index;
  }

  return checkpoint;
}

/**
 * Save result
 */
export async function saveResult(result) {
  const database = await getDatabase();
  
  const now = Date.now();
  const runDataJson = JSON.stringify(result.runData || {});
  const metricsJson = JSON.stringify(result.metrics || {});

  database.run(
    `INSERT INTO results (id, experiment_id, run_data, metrics, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [
      result.id || `${result.experimentId}-${now}`,
      result.experimentId,
      runDataJson,
      metricsJson,
      now
    ]
  );

  await saveDatabase();
  return result.id;
}

/**
 * Get results for experiment
 */
export async function getResults(experimentId) {
  const database = await getDatabase();
  
  const result = database.exec(
    `SELECT * FROM results WHERE experiment_id = ? ORDER BY created_at ASC`,
    [experimentId]
  );

  if (result.length === 0) {
    return [];
  }

  const results = [];
  const columns = result[0].columns;
  
  result[0].values.forEach(row => {
    const res = {};
    columns.forEach((col, idx) => {
      res[col] = row[idx];
    });
    
    // Parse JSON fields
    if (res.run_data) {
      res.runData = JSON.parse(res.run_data);
    }
    if (res.metrics) {
      res.metrics = JSON.parse(res.metrics);
    }
    
    results.push(res);
  });

  return results;
}

/**
 * Update experiment status
 */
export async function updateExperimentStatus(id, status) {
  const database = await getDatabase();
  
  const now = Date.now();
  const completedAt = status === 'completed' ? now : null;

  database.run(
    `UPDATE experiments 
     SET status = ?, updated_at = ?, completed_at = ?
     WHERE id = ?`,
    [status, now, completedAt, id]
  );

  await saveDatabase();
}

/**
 * Delete experiment and related data
 */
export async function deleteExperiment(id) {
  const database = await getDatabase();
  
  database.run('DELETE FROM experiments WHERE id = ?', [id]);
  // Checkpoints and results are deleted via CASCADE

  await saveDatabase();
}

/**
 * Clear all data (for testing/reset)
 */
export async function clearAllData() {
  const database = await getDatabase();
  
  database.run('DELETE FROM results');
  database.run('DELETE FROM checkpoints');
  database.run('DELETE FROM experiments');

  await saveDatabase();
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  const database = await getDatabase();
  
  const experimentsResult = database.exec('SELECT COUNT(*) as count FROM experiments');
  const checkpointsResult = database.exec('SELECT COUNT(*) as count FROM checkpoints');
  const resultsResult = database.exec('SELECT COUNT(*) as count FROM results');

  return {
    experiments: experimentsResult[0]?.values[0]?.[0] || 0,
    checkpoints: checkpointsResult[0]?.values[0]?.[0] || 0,
    results: resultsResult[0]?.values[0]?.[0] || 0
  };
}

