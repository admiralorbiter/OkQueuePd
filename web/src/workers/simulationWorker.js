// Web Worker for running simulations in background
import init, { SimulationEngine } from '../wasm/cod_matchmaking_sim.js';
import { MESSAGE_TYPES, createMessage, createErrorMessage } from './workerUtils.js';

let wasmReady = false;
let currentSim = null;
let cancelRequested = false;
let paused = false;

/**
 * Initialize WASM module
 */
async function initializeWASM() {
  if (wasmReady) {
    return;
  }

  try {
    await init();
    wasmReady = true;
    self.postMessage(createMessage(MESSAGE_TYPES.READY));
  } catch (error) {
    self.postMessage(createMessage(MESSAGE_TYPES.ERROR, createErrorMessage(error, 'WASM initialization')));
  }
}

/**
 * Run a single simulation
 */
async function runSimulation(config, options) {
  if (!wasmReady) {
    await initializeWASM();
  }

  const {
    population = 5000,
    ticks = 500,
    seed = 42,
    collectDetailed = false,
  } = options;

  try {
    // Create simulation instance
    currentSim = new SimulationEngine(BigInt(seed));
    currentSim.update_config(JSON.stringify(config));
    currentSim.generate_population(population);

    // Run simulation in batches
    const BATCH_SIZE = ticks > 1000 ? 100 : 50;
    let completedTicks = 0;

    while (completedTicks < ticks) {
      // Check for cancel
      if (cancelRequested) {
        throw new Error('Simulation cancelled');
      }

      // Check for pause
      while (paused && !cancelRequested) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (cancelRequested) {
        throw new Error('Simulation cancelled');
      }

      // Process a batch of ticks
      const ticksThisBatch = Math.min(BATCH_SIZE, ticks - completedTicks);
      for (let i = 0; i < ticksThisBatch; i++) {
        currentSim.tick();
      }
      completedTicks += ticksThisBatch;

      // Send progress update
      const progress = (completedTicks / ticks) * 100;
      self.postMessage(createMessage(MESSAGE_TYPES.PROGRESS, {
        completedTicks,
        totalTicks: ticks,
        progress
      }));

      // Yield to allow other messages
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    // Collect metrics
    const statsJson = currentSim.get_stats();
    const rawStats = JSON.parse(statsJson);

    const additionalData = {};
    
    if (collectDetailed) {
      try {
        const regionStatsJson = currentSim.get_region_stats();
        additionalData.regionStats = JSON.parse(regionStatsJson);
        
        const retentionStatsJson = currentSim.get_retention_stats();
        const retentionStats = JSON.parse(retentionStatsJson);
        additionalData.effectivePopulation = retentionStats.effective_population || 0;
        additionalData.continuationRate = retentionStats.avg_continue_rate || 0;
      } catch (e) {
        console.warn('Could not fetch detailed metrics:', e);
      }
    }

    // Clean up
    currentSim = null;

    return {
      config,
      metrics: {
        ...rawStats,
        ...additionalData
      },
      detailed: collectDetailed ? {
        stats: rawStats,
        ...additionalData,
      } : null,
    };
  } catch (error) {
    currentSim = null;
    throw error;
  }
}

/**
 * Handle messages from main thread
 */
self.onmessage = async (e) => {
  const { type, data } = e.data;

  try {
    switch (type) {
      case MESSAGE_TYPES.INIT:
        await initializeWASM();
        break;

      case MESSAGE_TYPES.RUN_SIMULATION:
        cancelRequested = false;
        paused = false;
        try {
          const result = await runSimulation(data.config, data.options);
          self.postMessage(createMessage(MESSAGE_TYPES.COMPLETE, {
            result
          }));
        } catch (error) {
          if (error.message !== 'Simulation cancelled') {
            self.postMessage(createMessage(MESSAGE_TYPES.ERROR, createErrorMessage(error, 'Simulation execution')));
          }
        }
        break;

      case MESSAGE_TYPES.SAVE_CHECKPOINT:
        // Checkpoint saving is handled by main thread via database
        // Worker just acknowledges
        self.postMessage(createMessage(MESSAGE_TYPES.CHECKPOINT, {
          saved: true,
          timestamp: Date.now()
        }));
        break;

      case MESSAGE_TYPES.CANCEL:
        cancelRequested = true;
        if (currentSim) {
          // Clean up current simulation
          currentSim = null;
        }
        break;

      case MESSAGE_TYPES.PAUSE:
        paused = true;
        self.postMessage(createMessage(MESSAGE_TYPES.PROGRESS, {
          paused: true
        }));
        break;

      case MESSAGE_TYPES.RESUME:
        paused = false;
        self.postMessage(createMessage(MESSAGE_TYPES.PROGRESS, {
          paused: false,
          resumed: true
        }));
        break;

      default:
        console.warn('Unknown message type:', type);
    }
  } catch (error) {
    self.postMessage(createMessage(MESSAGE_TYPES.ERROR, createErrorMessage(error, `Handling ${type}`)));
  }
};

// Initialize on worker load
initializeWASM().catch(error => {
  self.postMessage(createMessage(MESSAGE_TYPES.ERROR, createErrorMessage(error, 'Worker initialization')));
});

