// Hook for running experiments
import { useState, useCallback, useRef } from 'react';
import { extractMetrics, generateCombinations, computeSummary } from '../utils/ExperimentUtils';

export function useExperimentRunner(wasmReady, SimulationEngine, convertConfigToRust) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentRun, setCurrentRun] = useState(null);
  const [results, setResults] = useState(null);
  const cancelRef = useRef(false);
  const progressCallbackRef = useRef(null);

  /**
   * Run a single simulation and collect metrics
   * Optimized to yield periodically to prevent UI freezing.
   * Processes ticks in batches and yields to browser between batches.
   */
  const runSingleSimulation = useCallback(async (config, options = {}) => {
    const {
      population = 5000,
      ticks = 500,
      seed = 42,
      collectDetailed = false,
    } = options;

    const rustConfig = convertConfigToRust(config);
    const sim = new SimulationEngine(BigInt(seed));
    sim.update_config(JSON.stringify(rustConfig));
    sim.generate_population(population);

    // Run simulation in batches to yield to browser
    // Adaptive batch size: larger batches for longer runs to reduce overhead
    const BATCH_SIZE = ticks > 1000 ? 100 : 50;
    let completedTicks = 0;

    while (completedTicks < ticks) {
      if (cancelRef.current) {
        throw new Error('Experiment cancelled');
      }

      // Process a batch of ticks
      const ticksThisBatch = Math.min(BATCH_SIZE, ticks - completedTicks);
      for (let i = 0; i < ticksThisBatch; i++) {
        sim.tick();
      }
      completedTicks += ticksThisBatch;

      // Yield to browser every batch to keep UI responsive
      // Use requestAnimationFrame for smoother updates
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 0);
        });
      });
    }

    // Collect metrics
    const statsJson = sim.get_stats();
    const rawStats = JSON.parse(statsJson);

    const additionalData = {};
    
    if (collectDetailed) {
      try {
        // Get additional detailed metrics
        const regionStatsJson = sim.get_region_stats();
        additionalData.regionStats = JSON.parse(regionStatsJson);
        
        const retentionStatsJson = sim.get_retention_stats();
        const retentionStats = JSON.parse(retentionStatsJson);
        additionalData.effectivePopulation = retentionStats.effective_population || 0;
        additionalData.continuationRate = retentionStats.avg_continue_rate || 0;
      } catch (e) {
        console.warn('Could not fetch detailed metrics:', e);
      }
    }

    const metrics = extractMetrics(rawStats, additionalData);

    return {
      config,
      metrics,
      detailed: collectDetailed ? {
        stats: rawStats,
        ...additionalData,
      } : null,
    };
  }, [SimulationEngine, convertConfigToRust]);

  /**
   * Run single parameter sweep
   */
  const runSingleParamSweep = useCallback(async (paramName, values, baseConfig, options = {}) => {
    if (!wasmReady) {
      throw new Error('WASM not ready');
    }

    setRunning(true);
    setProgress(0);
    cancelRef.current = false;
    const startTime = Date.now();

    try {
      const results = [];
      
      for (let i = 0; i < values.length; i++) {
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
        
        // Yield to browser before starting simulation
        await new Promise(resolve => setTimeout(resolve, 10));

        const runResult = await runSingleSimulation(testConfig, options);
        
        results.push({
          value: value,
          metrics: runResult.metrics,
          detailed: runResult.detailed,
        });

        // Update progress after completing this run
        const newProgress = ((i + 1) / values.length) * 100;
        setProgress(newProgress);
        
        if (progressCallbackRef.current) {
          progressCallbackRef.current(newProgress, i + 1, values.length);
        }

        // Yield to browser after each run to keep UI responsive
        await new Promise(resolve => setTimeout(resolve, 10));
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
      throw error;
    }
  }, [wasmReady, runSingleSimulation]);

  /**
   * Run multi-parameter sweep
   */
  const runMultiParamSweep = useCallback(async (params, valueGrids, baseConfig, options = {}) => {
    if (!wasmReady) {
      throw new Error('WASM not ready');
    }

    setRunning(true);
    setProgress(0);
    cancelRef.current = false;
    const startTime = Date.now();

    try {
      const combinations = generateCombinations(params, valueGrids);
      const results = [];

      for (let i = 0; i < combinations.length; i++) {
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

        // Yield to browser before starting simulation
        await new Promise(resolve => setTimeout(resolve, 10));

        const runResult = await runSingleSimulation(testConfig, options);
        
        results.push({
          parameters: combo,
          metrics: runResult.metrics,
          detailed: runResult.detailed,
        });

        // Update progress after completing this run
        const newProgress = ((i + 1) / combinations.length) * 100;
        setProgress(newProgress);
        
        if (progressCallbackRef.current) {
          progressCallbackRef.current(newProgress, i + 1, combinations.length);
        }

        // Yield to browser after each run to keep UI responsive
        await new Promise(resolve => setTimeout(resolve, 10));
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
      throw error;
    }
  }, [wasmReady, runSingleSimulation]);

  /**
   * Run experiment from configuration object
   */
  const runExperimentFromConfig = useCallback(async (experimentConfig, baseConfig, options = {}) => {
    if (experimentConfig.type === 'single_param') {
      return runSingleParamSweep(
        experimentConfig.parameter,
        experimentConfig.values,
        baseConfig,
        options
      );
    } else if (experimentConfig.type === 'multi_param') {
      return runMultiParamSweep(
        experimentConfig.parameters,
        experimentConfig.valueGrids,
        baseConfig,
        options
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
    setRunning(false);
  }, []);

  /**
   * Reset experiment state
   */
  const resetExperiment = useCallback(() => {
    setRunning(false);
    setProgress(0);
    setCurrentRun(null);
    setResults(null);
    cancelRef.current = false;
  }, []);

  /**
   * Set progress callback
   */
  const setProgressCallback = useCallback((callback) => {
    progressCallbackRef.current = callback;
  }, []);

  return {
    running,
    progress,
    currentRun,
    results,
    runSingleParamSweep,
    runMultiParamSweep,
    runExperimentFromConfig,
    cancelExperiment,
    resetExperiment,
    setProgressCallback,
  };
}

