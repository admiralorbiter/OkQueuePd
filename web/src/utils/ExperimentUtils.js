// Experiment utility functions

/**
 * Extract comprehensive metrics from simulation stats
 */
export function extractMetrics(rawStats, additionalData = {}) {
  return {
    // Search time metrics
    avgSearchTime: rawStats.avg_search_time || 0,
    searchTimeP50: rawStats.search_time_p50 || 0,
    searchTimeP90: rawStats.search_time_p90 || 0,
    searchTimeP99: rawStats.search_time_p99 || 0,
    
    // Ping metrics
    avgDeltaPing: rawStats.avg_delta_ping || 0,
    deltaPingP50: rawStats.delta_ping_p50 || 0,
    deltaPingP90: rawStats.delta_ping_p90 || 0,
    
    // Skill metrics
    avgSkillDisparity: rawStats.avg_skill_disparity || 0,
    avgMatchQuality: rawStats.avg_match_quality || 0,
    
    // Blowout metrics
    blowoutRate: rawStats.blowout_rate || 0,
    blowoutCount: rawStats.blowout_count || 0,
    blowoutSeverity: rawStats.blowout_severity_counts || {},
    perPlaylistBlowoutRate: rawStats.per_playlist_blowout_rate || {},
    
    // Match metrics
    totalMatches: rawStats.total_matches || 0,
    activeMatches: rawStats.active_matches || 0,
    
    // Player state metrics
    playersOffline: rawStats.players_offline || 0,
    playersInLobby: rawStats.players_in_lobby || 0,
    playersSearching: rawStats.players_searching || 0,
    playersInMatch: rawStats.players_in_match || 0,
    
    // Party metrics
    partyCount: rawStats.party_count || 0,
    avgPartySize: rawStats.avg_party_size || 0,
    partyMatchCount: rawStats.party_match_count || 0,
    soloMatchCount: rawStats.solo_match_count || 0,
    
    // Retention metrics
    effectivePopulation: additionalData.effectivePopulation || 0,
    populationChangeRate: rawStats.population_change_rate || 0,
    avgMatchesPerSession: rawStats.avg_matches_per_session || 0,
    continuationRate: additionalData.continuationRate || 0,
    
    // Skill evolution metrics
    skillEvolutionEnabled: rawStats.skill_evolution_enabled || false,
    totalSkillUpdates: rawStats.total_skill_updates || 0,
    
    // Regional metrics (from additionalData)
    regionStats: additionalData.regionStats || {},
    
    // Time elapsed
    timeElapsed: rawStats.time_elapsed || 0,
    ticks: rawStats.ticks || 0,
  };
}

/**
 * Compute summary statistics from experiment results
 */
export function computeSummary(results) {
  if (!results || results.length === 0) {
    return null;
  }
  
  const metrics = {};
  const firstResult = results[0];
  
  // Get all metric keys from first result
  const metricKeys = Object.keys(firstResult.metrics || {});
  
  metricKeys.forEach(key => {
    const values = results
      .map(r => r.metrics?.[key])
      .filter(v => typeof v === 'number' && !isNaN(v));
    
    if (values.length > 0) {
      const sorted = [...values].sort((a, b) => a - b);
      const sum = values.reduce((a, b) => a + b, 0);
      
      metrics[key] = {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        mean: sum / values.length,
        median: sorted[Math.floor(sorted.length / 2)],
        stdDev: computeStdDev(values, sum / values.length),
        count: values.length,
      };
    }
  });
  
  return { metrics };
}

/**
 * Compute standard deviation
 */
function computeStdDev(values, mean) {
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Generate parameter combinations for multi-param sweep
 */
export function generateCombinations(params, valueGrids) {
  if (params.length === 0) return [{}];
  if (params.length === 1) {
    return valueGrids[0].map(val => ({ [params[0]]: val }));
  }
  
  // Recursive cartesian product
  const combinations = [];
  const [firstParam, ...restParams] = params;
  const [firstValues, ...restValueGrids] = valueGrids;
  
  const restCombinations = generateCombinations(restParams, restValueGrids);
  
  firstValues.forEach(firstVal => {
    restCombinations.forEach(restCombo => {
      combinations.push({
        [firstParam]: firstVal,
        ...restCombo,
      });
    });
  });
  
  return combinations;
}

/**
 * Format experiment name from parameters
 */
export function formatExperimentName(type, params, values) {
  if (type === 'single_param') {
    return `Sweep: ${params[0]} (${values.length} values)`;
  } else if (type === 'multi_param') {
    return `Multi-Param: ${params.join(', ')}`;
  } else if (type === 'preset') {
    return `Preset: ${values.presetName || 'Unknown'}`;
  }
  return 'Custom Experiment';
}

/**
 * Validate experiment configuration
 */
export function validateExperimentConfig(config) {
  const errors = [];
  
  if (!config.base && !config.preset) {
    errors.push('Missing base config or preset');
  }
  
  if (config.type === 'single_param' && (!config.parameter || !config.values || config.values.length === 0)) {
    errors.push('Single param experiments require parameter and values');
  }
  
  if (config.type === 'multi_param') {
    if (!config.parameters || config.parameters.length === 0) {
      errors.push('Multi-param experiments require parameters array');
    }
    if (!config.valueGrids || config.valueGrids.length !== config.parameters.length) {
      errors.push('Value grids must match parameters length');
    }
  }
  
  if (!config.population || config.population < 1) {
    errors.push('Population must be at least 1');
  }
  
  if (!config.ticks || config.ticks < 1) {
    errors.push('Ticks must be at least 1');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors,
  };
}

/**
 * Estimate experiment duration
 */
export function estimateExperimentDuration(config) {
  let runs = 1;
  
  if (config.type === 'single_param') {
    runs = config.values?.length || 1;
  } else if (config.type === 'multi_param') {
    runs = config.valueGrids?.reduce((total, grid) => total * grid.length, 1) || 1;
  }
  
  // Rough estimate: 500 ticks per run takes ~5 seconds
  const ticksPerRun = config.ticks || 500;
  const secondsPerRun = (ticksPerRun / 500) * 5;
  const totalSeconds = runs * secondsPerRun;
  
  return {
    runs: runs,
    estimatedSeconds: totalSeconds,
    estimatedMinutes: totalSeconds / 60,
    estimatedHours: totalSeconds / 3600,
  };
}

