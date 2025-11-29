// Hook for running experiments with Web Workers
import { useState, useCallback, useRef, useEffect } from 'react';
import { extractMetrics, generateCombinations, computeSummary } from '../utils/ExperimentUtils';
import { MESSAGE_TYPES, createMessage, serializeConfig } from '../workers/workerUtils';
import { saveCheckpoint, loadCheckpoint, updateExperimentStatus } from '../utils/Database';

export function useExperimentRunner(wasmReady, SimulationEngine, convertConfigToRust) {
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentRun, setCurrentRun] = useState(null);
  const [results, setResults] = useState(null);
  const [workerReady, setWorkerReady] = useState(false);
  
  const workerRef = useRef(null);
  const cancelRef = useRef(false);
  const progressCallbackRef = useRef(null);
  const currentExperimentIdRef = useRef(null);
  const partialResultsRef = useRef([]);

  /**
   * Save checkpoint
   */
  const saveExperimentCheckpoint = useCallback(async (experimentId, runIndex, partialResults) => {
    if (!experimentId) {
      return;
    }

    try {
      await saveCheckpoint({
        experimentId,
        runIndex,
        partialResults
      });
    } catch (error) {
      console.warn('Failed to save checkpoint:', error);
    }
  }, []);

  /**
   * Initialize worker
   */
  useEffect(() => {
    if (!wasmReady) {
      return;
    }

    // Create worker
    const worker = new Worker(
      new URL('../workers/simulationWorker.js', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e) => {
      const { type, data } = e.data;

      switch (type) {
        case MESSAGE_TYPES.READY:
          setWorkerReady(true);
          break;

        case MESSAGE_TYPES.PROGRESS:
          if (data.progress !== undefined) {
            setProgress(data.progress);
          }
          if (data.paused !== undefined) {
            setPaused(data.paused);
          }
          break;

        case MESSAGE_TYPES.COMPLETE:
          // Handle completion in the calling function
          break;

        case MESSAGE_TYPES.ERROR:
          console.error('Worker error:', data);
          setRunning(false);
          setPaused(false);
          break;

        case MESSAGE_TYPES.CHECKPOINT:
          // Checkpoint saved
          break;

        default:
          console.warn('Unknown worker message type:', type);
      }
    };

    worker.onerror = (error) => {
      console.error('Worker error:', error);
      setWorkerReady(false);
      setRunning(false);
    };

    workerRef.current = worker;

    // Initialize worker
    worker.postMessage(createMessage(MESSAGE_TYPES.INIT));

    // Save checkpoint before page unload
    const handleBeforeUnload = async () => {
      if (currentExperimentIdRef.current && partialResultsRef.current.length > 0) {
        try {
          // Save a final checkpoint before leaving
          await saveExperimentCheckpoint(
            currentExperimentIdRef.current,
            partialResultsRef.current.length,
            partialResultsRef.current
          );
        } catch (error) {
          console.error('Failed to save checkpoint before unload:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      
      if (workerRef.current) {
        // Save checkpoint before terminating worker
        if (currentExperimentIdRef.current && partialResultsRef.current.length > 0) {
          saveExperimentCheckpoint(
            currentExperimentIdRef.current,
            partialResultsRef.current.length,
            partialResultsRef.current
          ).catch(err => console.error('Failed to save checkpoint on cleanup:', err));
        }
        
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [wasmReady]);

  /**
   * Run a single simulation via worker
   */
  const runSingleSimulation = useCallback(async (config, options = {}) => {
    if (!workerReady || !workerRef.current) {
      throw new Error('Worker not ready');
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Simulation timeout'));
      }, 600000); // 10 minute timeout

      const messageHandler = (e) => {
        const { type, data } = e.data;

        if (type === MESSAGE_TYPES.COMPLETE) {
          clearTimeout(timeout);
          workerRef.current.removeEventListener('message', messageHandler);
          resolve(data.result);
        } else if (type === MESSAGE_TYPES.ERROR) {
          clearTimeout(timeout);
          workerRef.current.removeEventListener('message', messageHandler);
          reject(new Error(data.message || 'Simulation failed'));
        }
      };

      workerRef.current.addEventListener('message', messageHandler);

      const rustConfig = convertConfigToRust(config);
      workerRef.current.postMessage(createMessage(MESSAGE_TYPES.RUN_SIMULATION, {
        config: rustConfig,
        options
      }));
    });
  }, [workerReady, convertConfigToRust]);

  /**
   * Run single parameter sweep
   */
  const runSingleParamSweep = useCallback(async (paramName, values, baseConfig, options = {}) => {
    if (!workerReady) {
      throw new Error('Worker not ready');
    }

    const experimentId = options.experimentId || `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    currentExperimentIdRef.current = experimentId;
    partialResultsRef.current = [];

    // Check for existing checkpoint
    let startIndex = 0;
    if (options.resume) {
      const checkpoint = await loadCheckpoint(experimentId);
      if (checkpoint) {
        // runIndex is 1-based (represents the last completed run number)
        // If runIndex is 1, that means run 1 (index 0) is complete, so we start from index 1 (run 2)
        const completedRuns = checkpoint.runIndex || 0;
        startIndex = completedRuns;
        partialResultsRef.current = checkpoint.partialResults || [];
      } else {
        startIndex = 0;
        partialResultsRef.current = [];
      }
    } else {
      // Not resuming, start fresh
      partialResultsRef.current = [];
    }

    setRunning(true);
    setPaused(false);
    setProgress(startIndex > 0 ? (startIndex / values.length) * 100 : 0);
    cancelRef.current = false;
    const startTime = Date.now();

    try {
      // Save experiment to database with 'running' status if it doesn't exist
      // This ensures it shows up in the running experiments section
      const { saveExperiment } = await import('../utils/ExperimentStorage');
      const experimentData = {
        id: experimentId,
        name: options.name || `Sweep: ${paramName} (${values.length} values)`,
        description: options.description || '',
        timestamp: Date.now(),
        type: 'single_param',
        config: {
          base: baseConfig,
          varied: {
            type: 'single_param',
            parameter: paramName,
            values: values,
          },
          fixed: {
            population: options.population,
            ticks: options.ticks,
            seed: options.seed,
          },
          tags: options.tags || [],
        },
        status: 'running',
        tags: options.tags || [],
      };
      await saveExperiment(experimentData);
      
      // Update experiment status (in case it already existed)
      await updateExperimentStatus(experimentId, 'running');

      // Start with existing results from checkpoint (if any)
      const results = [...partialResultsRef.current];
      
      for (let i = startIndex; i < values.length; i++) {
        if (cancelRef.current) {
          throw new Error('Experiment cancelled');
        }

        const value = values[i];
        const testConfig = { ...baseConfig, [paramName]: value };
        
        setCurrentRun({
          parameter: paramName,
          value: value,
          index: i + 1,
          total: values.length,
        });

        // Update progress before starting this run
        const progressBeforeRun = (i / values.length) * 100;
        setProgress(progressBeforeRun);
        
        // Run simulation via worker
        const runResult = await runSingleSimulation(testConfig, options);
        
        const resultEntry = {
          value: value,
          metrics: extractMetrics(runResult.metrics || runResult, {}),
          detailed: runResult.detailed,
        };
        
        results.push(resultEntry);
        partialResultsRef.current = results;

        // Save checkpoint after each run
        await saveExperimentCheckpoint(experimentId, i + 1, results);

        // Update progress after completing this run
        const newProgress = ((i + 1) / values.length) * 100;
        setProgress(newProgress);
        
        if (progressCallbackRef.current) {
          progressCallbackRef.current(newProgress, i + 1, values.length);
        }
      }

      const duration = Date.now() - startTime;
      const summary = computeSummary(results);

      setResults({
        type: 'single_param',
        parameter: paramName,
        values: values,
        results: results,
        summary: summary,
        duration: duration,
      });

      // Update experiment status
      await updateExperimentStatus(experimentId, 'completed');

      setRunning(false);
      setProgress(100);
      
      return {
        type: 'single_param',
        parameter: paramName,
        values: values,
        results: results,
        summary: summary,
        duration: duration,
      };
    } catch (error) {
      setRunning(false);
      await updateExperimentStatus(experimentId, 'failed');
      throw error;
    }
  }, [workerReady, runSingleSimulation, saveExperimentCheckpoint]);

  /**
   * Run multi-parameter sweep
   */
  const runMultiParamSweep = useCallback(async (params, valueGrids, baseConfig, options = {}) => {
    if (!workerReady) {
      throw new Error('Worker not ready');
    }

    const experimentId = options.experimentId || `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    currentExperimentIdRef.current = experimentId;
    partialResultsRef.current = [];

    // Check for existing checkpoint
    let startIndex = 0;
    if (options.resume) {
      const checkpoint = await loadCheckpoint(experimentId);
      if (checkpoint) {
        const completedRuns = checkpoint.runIndex || 0;
        startIndex = completedRuns;
        partialResultsRef.current = checkpoint.partialResults || [];
      } else {
        startIndex = 0;
        partialResultsRef.current = [];
      }
    } else {
      partialResultsRef.current = [];
    }

    setRunning(true);
    setPaused(false);
    const combinations = generateCombinations(params, valueGrids);
    setProgress(startIndex > 0 ? (startIndex / combinations.length) * 100 : 0);
    cancelRef.current = false;
    const startTime = Date.now();

    try {
      // Save experiment to database with 'running' status if it doesn't exist
      const { saveExperiment } = await import('../utils/ExperimentStorage');
      const experimentData = {
        id: experimentId,
        name: options.name || `Multi-param sweep (${combinations.length} combinations)`,
        description: options.description || '',
        timestamp: Date.now(),
        type: 'multi_param',
        config: {
          base: baseConfig,
          varied: {
            type: 'multi_param',
            parameters: params,
            valueGrids: valueGrids,
            combinations: combinations,
          },
          fixed: {
            population: options.population,
            ticks: options.ticks,
            seed: options.seed,
          },
          tags: options.tags || [],
        },
        status: 'running',
        tags: options.tags || [],
      };
      await saveExperiment(experimentData);
      
      // Update experiment status (in case it already existed)
      await updateExperimentStatus(experimentId, 'running');

      const results = [...partialResultsRef.current];

      for (let i = startIndex; i < combinations.length; i++) {
        if (cancelRef.current) {
          throw new Error('Experiment cancelled');
        }

        const combo = combinations[i];
        const testConfig = { ...baseConfig };
        Object.assign(testConfig, combo);

        setCurrentRun({
          parameters: combo,
          index: i + 1,
          total: combinations.length,
        });

        // Update progress before starting this run
        const progressBeforeRun = (i / combinations.length) * 100;
        setProgress(progressBeforeRun);

        // Run simulation via worker
        const runResult = await runSingleSimulation(testConfig, options);
        
        const resultEntry = {
          parameters: combo,
          metrics: extractMetrics(runResult.metrics || runResult, {}),
          detailed: runResult.detailed,
        };
        
        results.push(resultEntry);
        partialResultsRef.current = results;

        // Save checkpoint after each run
        await saveExperimentCheckpoint(experimentId, i + 1, results);

        // Update progress after completing this run
        const newProgress = ((i + 1) / combinations.length) * 100;
        setProgress(newProgress);
        
        if (progressCallbackRef.current) {
          progressCallbackRef.current(newProgress, i + 1, combinations.length);
        }
      }

      const duration = Date.now() - startTime;
      const summary = computeSummary(results);

      setResults({
        type: 'multi_param',
        parameters: params,
        valueGrids: valueGrids,
        results: results,
        summary: summary,
        duration: duration,
      });

      // Update experiment status
      await updateExperimentStatus(experimentId, 'completed');

      setRunning(false);
      setProgress(100);
      
      return {
        type: 'multi_param',
        parameters: params,
        valueGrids: valueGrids,
        results: results,
        summary: summary,
        duration: duration,
      };
    } catch (error) {
      setRunning(false);
      await updateExperimentStatus(experimentId, 'failed');
      throw error;
    }
  }, [workerReady, runSingleSimulation, saveExperimentCheckpoint]);

  /**
   * Run experiment from configuration object
   */
  const runExperimentFromConfig = useCallback(async (experimentConfig, baseConfig, options = {}) => {
    if (experimentConfig.type === 'single_param') {
      return runSingleParamSweep(
        experimentConfig.parameter,
        experimentConfig.values,
        baseConfig,
        { ...options, experimentId: experimentConfig.id }
      );
    } else if (experimentConfig.type === 'multi_param') {
      return runMultiParamSweep(
        experimentConfig.parameters,
        experimentConfig.valueGrids,
        baseConfig,
        { ...options, experimentId: experimentConfig.id }
      );
    } else {
      throw new Error(`Unknown experiment type: ${experimentConfig.type}`);
    }
  }, [runSingleParamSweep, runMultiParamSweep]);

  /**
   * Cancel running experiment
   */
  const cancelExperiment = useCallback(() => {
    cancelRef.current = true;
    if (workerRef.current) {
      workerRef.current.postMessage(createMessage(MESSAGE_TYPES.CANCEL));
    }
    setRunning(false);
    setPaused(false);
  }, []);

  /**
   * Pause experiment
   */
  const pauseExperiment = useCallback(() => {
    if (workerRef.current && running) {
      workerRef.current.postMessage(createMessage(MESSAGE_TYPES.PAUSE));
      setPaused(true);
      if (currentExperimentIdRef.current) {
        updateExperimentStatus(currentExperimentIdRef.current, 'paused');
      }
    }
  }, [running]);

  /**
   * Resume experiment
   */
  const resumeExperiment = useCallback(() => {
    if (workerRef.current && paused) {
      workerRef.current.postMessage(createMessage(MESSAGE_TYPES.RESUME));
      setPaused(false);
      if (currentExperimentIdRef.current) {
        updateExperimentStatus(currentExperimentIdRef.current, 'running');
      }
    }
  }, [paused]);

  /**
   * Reset experiment state
   */
  const resetExperiment = useCallback(() => {
    setRunning(false);
    setPaused(false);
    setProgress(0);
    setCurrentRun(null);
    setResults(null);
    cancelRef.current = false;
    currentExperimentIdRef.current = null;
    partialResultsRef.current = [];
  }, []);

  /**
   * Set progress callback
   */
  const setProgressCallback = useCallback((callback) => {
    progressCallbackRef.current = callback;
  }, []);

  return {
    running,
    paused,
    progress,
    currentRun,
    results,
    workerReady,
    runSingleParamSweep,
    runMultiParamSweep,
    runExperimentFromConfig,
    cancelExperiment,
    pauseExperiment,
    resumeExperiment,
    resetExperiment,
    setProgressCallback,
  };
}
