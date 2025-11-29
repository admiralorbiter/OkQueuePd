// Scenario Preset System
// Built-in presets and preset management

const PRESETS_STORAGE_KEY = 'cod_matchmaking_presets';
const BUILTIN_PRESET_PREFIX = 'builtin-';

// Base config structure for reference
const getBaseConfig = () => ({
  maxPing: 200,
  deltaPingInitial: 10,
  deltaPingRate: 2,
  deltaPingMax: 100,
  skillSimilarityInitial: 0.05,
  skillSimilarityRate: 0.01,
  skillSimilarityMax: 0.5,
  maxSkillDisparityInitial: 0.1,
  maxSkillDisparityRate: 0.02,
  maxSkillDisparityMax: 0.8,
  weightGeo: 0.3,
  weightSkill: 0.4,
  weightInput: 0.15,
  weightPlatform: 0.15,
  partyPlayerFraction: 0.5,
  tickInterval: 5,
  numSkillBuckets: 10,
  topKCandidates: 50,
  arrivalRate: 10,
  useExactTeamBalancing: true,
  gamma: 2.0,
  blowoutSkillCoefficient: 0.4,
  blowoutImbalanceCoefficient: 0.3,
  blowoutMildThreshold: 0.15,
  blowoutModerateThreshold: 0.35,
  blowoutSevereThreshold: 0.6,
  skillLearningRate: 0.01,
  performanceNoiseStd: 0.15,
  enableSkillEvolution: true,
  skillUpdateBatchSize: 10,
  retentionConfig: {
    thetaPing: -0.02,
    thetaSearchTime: -0.015,
    thetaBlowout: -0.5,
    thetaWinRate: 0.8,
    thetaPerformance: 0.6,
    baseContinueProb: 0.0,
    experienceWindowSize: 5,
  },
  regionConfigs: {},
});

// Built-in presets
const BUILTIN_PRESETS = [
  // SBMM Configs
  {
    id: 'builtin-tight-sbmm',
    name: 'Tight SBMM',
    description: 'Very strict skill-based matching with tight skill ranges. Prioritizes skill similarity over ping.',
    category: 'sbmm',
    tags: ['sbmm', 'skill', 'strict', 'quality'],
    expectedBehaviors: [
      'Longer search times, especially for extreme skill buckets',
      'Lower blowout rates and better skill matching',
      'Higher skill disparity within acceptable ranges',
      'Possible tradeoff: increased search time vs match quality',
    ],
    config: {
      skillSimilarityInitial: 0.01,
      skillSimilarityRate: 0.005,
      skillSimilarityMax: 0.2,
      maxSkillDisparityInitial: 0.05,
      maxSkillDisparityRate: 0.01,
      maxSkillDisparityMax: 0.3,
      weightSkill: 0.6,
      weightGeo: 0.2,
    },
  },
  {
    id: 'builtin-loose-sbmm',
    name: 'Loose SBMM',
    description: 'Relaxed skill-based matching with wider skill ranges. Prioritizes connection quality and speed.',
    category: 'sbmm',
    tags: ['sbmm', 'speed', 'ping', 'loose'],
    expectedBehaviors: [
      'Faster search times across all skill buckets',
      'Higher blowout rates but better ping',
      'More mixed-skill lobbies',
      'Tradeoff: faster matches vs match quality',
    ],
    config: {
      skillSimilarityInitial: 0.15,
      skillSimilarityRate: 0.02,
      skillSimilarityMax: 0.8,
      maxSkillDisparityInitial: 0.3,
      maxSkillDisparityRate: 0.05,
      maxSkillDisparityMax: 1.0,
      weightSkill: 0.2,
      weightGeo: 0.5,
    },
  },
  {
    id: 'builtin-skill-first',
    name: 'Skill-First',
    description: 'Prioritizes skill matching over connection quality. Similar to tight SBMM but with more aggressive weighting.',
    category: 'sbmm',
    tags: ['sbmm', 'skill', 'fairness'],
    expectedBehaviors: [
      'Best skill matching quality',
      'Longer search times',
      'Higher delta ping',
      'Lowest blowout rates',
    ],
    config: {
      skillSimilarityInitial: 0.02,
      skillSimilarityRate: 0.008,
      skillSimilarityMax: 0.25,
      weightSkill: 0.7,
      weightGeo: 0.15,
      weightInput: 0.075,
      weightPlatform: 0.075,
    },
  },
  {
    id: 'builtin-ping-first',
    name: 'Ping-First',
    description: 'Prioritizes connection quality over skill matching. Fast matches with low ping.',
    category: 'sbmm',
    tags: ['ping', 'speed', 'connection'],
    expectedBehaviors: [
      'Fastest search times',
      'Lowest delta ping',
      'Higher skill disparity',
      'Potential for more blowouts',
    ],
    config: {
      skillSimilarityInitial: 0.2,
      skillSimilarityRate: 0.03,
      skillSimilarityMax: 1.0,
      weightSkill: 0.1,
      weightGeo: 0.7,
      deltaPingInitial: 5,
      deltaPingMax: 50,
    },
  },
  
  // Retention Configs
  {
    id: 'builtin-ping-first-retention',
    name: 'Ping-First Retention',
    description: 'Retention model optimized for ping-sensitive players. Higher retention for low-ping experiences.',
    category: 'retention',
    tags: ['retention', 'ping', 'population'],
    expectedBehaviors: [
      'Higher retention for low-ping players',
      'Lower retention for high-ping players',
      'Population health depends on geographic distribution',
      'Better overall population in ping-advantaged regions',
    ],
    config: {
      retentionConfig: {
        thetaPing: -0.05,
        thetaSearchTime: -0.01,
        thetaBlowout: -0.3,
        thetaWinRate: 0.5,
        thetaPerformance: 0.3,
        baseContinueProb: 0.0,
        experienceWindowSize: 5,
      },
      deltaPingInitial: 5,
      deltaPingMax: 50,
    },
  },
  {
    id: 'builtin-skill-first-retention',
    name: 'Skill-First Retention',
    description: 'Retention model optimized for skill-focused players. Higher retention for balanced matches.',
    category: 'retention',
    tags: ['retention', 'skill', 'fairness'],
    expectedBehaviors: [
      'Higher retention for mid-skill players',
      'Better match quality leads to longer sessions',
      'Population health improves with skill-based matching',
      'Lower churn due to fair matches',
    ],
    config: {
      retentionConfig: {
        thetaPing: -0.01,
        thetaSearchTime: -0.02,
        thetaBlowout: -0.8,
        thetaWinRate: 1.2,
        thetaPerformance: 1.0,
        baseContinueProb: 0.0,
        experienceWindowSize: 5,
      },
      skillSimilarityInitial: 0.03,
      weightSkill: 0.6,
    },
  },
  {
    id: 'builtin-lenient-retention',
    name: 'Lenient Retention',
    description: 'Forgiving retention model that keeps players engaged even with suboptimal experiences.',
    category: 'retention',
    tags: ['retention', 'lenient', 'engagement'],
    expectedBehaviors: [
      'Higher overall retention',
      'More blowouts accepted by players',
      'Longer session lengths',
      'Higher effective population',
    ],
    config: {
      retentionConfig: {
        thetaPing: -0.005,
        thetaSearchTime: -0.005,
        thetaBlowout: -0.1,
        thetaWinRate: 0.3,
        thetaPerformance: 0.2,
        baseContinueProb: 0.1,
        experienceWindowSize: 3,
      },
    },
  },
  {
    id: 'builtin-strict-retention',
    name: 'Strict Retention',
    description: 'Strict retention model that penalizes poor experiences heavily. High quality bar.',
    category: 'retention',
    tags: ['retention', 'strict', 'quality'],
    expectedBehaviors: [
      'Lower retention but better match quality',
      'Players quit faster after bad experiences',
      'Population health depends on consistent quality',
      'Lower overall population but higher satisfaction',
    ],
    config: {
      retentionConfig: {
        thetaPing: -0.03,
        thetaSearchTime: -0.025,
        thetaBlowout: -1.0,
        thetaWinRate: 1.0,
        thetaPerformance: 0.8,
        baseContinueProb: -0.1,
        experienceWindowSize: 7,
      },
    },
  },
  
  // Regional Configs
  {
    id: 'builtin-low-population-region',
    name: 'Low Population Region',
    description: 'Configuration for regions with sparse player populations. Allows more cross-region matching.',
    category: 'regional',
    tags: ['regional', 'population', 'cross-region'],
    expectedBehaviors: [
      'Longer search times in low-pop regions',
      'Higher delta ping due to cross-region matches',
      'More cross-region matching',
      'Better match rates but worse connection quality',
    ],
    config: {
      deltaPingInitial: 20,
      deltaPingMax: 150,
      skillSimilarityInitial: 0.1,
      skillSimilarityMax: 0.9,
      regionConfigs: {
        // Example: would need to be configured per region
      },
    },
  },
  {
    id: 'builtin-high-population-region',
    name: 'High Population Region',
    description: 'Configuration for regions with dense player populations. Stricter matching within region.',
    category: 'regional',
    tags: ['regional', 'population', 'local'],
    expectedBehaviors: [
      'Faster search times',
      'Lower delta ping',
      'Minimal cross-region matching',
      'Better overall match quality',
    ],
    config: {
      deltaPingInitial: 5,
      deltaPingMax: 50,
      skillSimilarityInitial: 0.03,
      skillSimilarityMax: 0.3,
    },
  },
  
  // Party Configs
  {
    id: 'builtin-solo-only',
    name: 'Solo Only',
    description: 'Configuration with no parties. All players search individually.',
    category: 'party',
    tags: ['party', 'solo'],
    expectedBehaviors: [
      'More flexible matchmaking',
      'Faster search times for solo players',
      'No party integrity constraints',
      'Different team balancing dynamics',
    ],
    config: {
      partyPlayerFraction: 0.0,
    },
  },
  {
    id: 'builtin-party-heavy',
    name: 'Party Heavy (50%)',
    description: 'Half of players are in parties. Realistic CoD-style party distribution.',
    category: 'party',
    tags: ['party', 'mixed'],
    expectedBehaviors: [
      'Party search times may be longer',
      'Team balancing more constrained',
      'Realistic party dynamics',
      'Mixed solo/party matchmaking',
    ],
    config: {
      partyPlayerFraction: 0.5,
    },
  },
  
  // Evolution Configs
  {
    id: 'builtin-static-skill',
    name: 'Static Skill',
    description: 'Skill values do not evolve over time. Players maintain fixed skill levels.',
    category: 'evolution',
    tags: ['skill', 'evolution', 'static'],
    expectedBehaviors: [
      'Stable skill distribution over time',
      'Predictable matchmaking behavior',
      'No skill drift',
      'Baseline for comparison',
    ],
    config: {
      enableSkillEvolution: false,
    },
  },
  {
    id: 'builtin-evolving-skill',
    name: 'Evolving Skill',
    description: 'Skill values evolve based on performance. Default learning rate.',
    category: 'evolution',
    tags: ['skill', 'evolution', 'dynamic'],
    expectedBehaviors: [
      'Skill distribution shifts over time',
      'Players improve or decline based on performance',
      'Blowout rates may change as skills update',
      'More realistic long-term behavior',
    ],
    config: {
      enableSkillEvolution: true,
      skillLearningRate: 0.01,
      performanceNoiseStd: 0.15,
    },
  },
  {
    id: 'builtin-high-learning-rate',
    name: 'High Learning Rate',
    description: 'Skill evolution with aggressive learning rate. Skills change quickly.',
    category: 'evolution',
    tags: ['skill', 'evolution', 'fast'],
    expectedBehaviors: [
      'Rapid skill changes',
      'Quick adaptation to performance',
      'Potentially unstable skill distribution',
      'Fast convergence to true skill',
    ],
    config: {
      enableSkillEvolution: true,
      skillLearningRate: 0.05,
      performanceNoiseStd: 0.2,
    },
  },
];

/**
 * Get all built-in presets
 */
export function getBuiltinPresets() {
  return BUILTIN_PRESETS;
}

/**
 * Get built-in preset by ID
 */
export function getBuiltinPreset(id) {
  return BUILTIN_PRESETS.find(p => p.id === id) || null;
}

/**
 * Get custom presets from storage
 */
export function getCustomPresets() {
  try {
    const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error loading custom presets:', error);
    return [];
  }
}

/**
 * Get all presets (built-in + custom)
 */
export function getAllPresets() {
  return [...BUILTIN_PRESETS, ...getCustomPresets()];
}

/**
 * Get preset by ID (built-in or custom)
 */
export function getPreset(id) {
  if (id.startsWith(BUILTIN_PRESET_PREFIX)) {
    return getBuiltinPreset(id);
  }
  
  const custom = getCustomPresets();
  return custom.find(p => p.id === id) || null;
}

/**
 * List presets by category
 */
export function listPresets(category = null) {
  const all = getAllPresets();
  if (!category) return all;
  return all.filter(p => p.category === category);
}

/**
 * Save a custom preset
 */
export function savePreset(preset) {
  if (preset.id && preset.id.startsWith(BUILTIN_PRESET_PREFIX)) {
    throw new Error('Cannot overwrite built-in presets');
  }
  
  if (!preset.id) {
    preset.id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  if (!preset.created) {
    preset.created = Date.now();
  }
  
  preset.updated = Date.now();
  
  const custom = getCustomPresets();
  const existingIndex = custom.findIndex(p => p.id === preset.id);
  
  if (existingIndex >= 0) {
    custom[existingIndex] = preset;
  } else {
    custom.push(preset);
  }
  
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(custom));
  return preset.id;
}

/**
 * Delete a custom preset
 */
export function deletePreset(id) {
  if (id.startsWith(BUILTIN_PRESET_PREFIX)) {
    throw new Error('Cannot delete built-in presets');
  }
  
  const custom = getCustomPresets();
  const filtered = custom.filter(p => p.id !== id);
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Apply preset to base config
 */
export function applyPreset(presetId, baseConfig = null) {
  const preset = getPreset(presetId);
  if (!preset) {
    throw new Error(`Preset ${presetId} not found`);
  }
  
  const config = baseConfig || getBaseConfig();
  
  // Deep merge preset config into base config
  const merged = { ...config };
  
  // Merge top-level config properties
  Object.keys(preset.config || {}).forEach(key => {
    if (typeof preset.config[key] === 'object' && !Array.isArray(preset.config[key]) && preset.config[key] !== null) {
      merged[key] = { ...merged[key], ...preset.config[key] };
    } else {
      merged[key] = preset.config[key];
    }
  });
  
  return merged;
}

/**
 * Get preset categories
 */
export function getPresetCategories() {
  const categories = new Set();
  getAllPresets().forEach(preset => {
    if (preset.category) {
      categories.add(preset.category);
    }
  });
  return Array.from(categories).sort();
}

/**
 * Export preset to JSON
 */
export function exportPreset(id) {
  const preset = getPreset(id);
  if (!preset) {
    throw new Error(`Preset ${id} not found`);
  }
  
  return JSON.stringify(preset, null, 2);
}

/**
 * Import preset from JSON
 */
export function importPreset(jsonString) {
  try {
    const preset = JSON.parse(jsonString);
    
    // Validate preset structure
    if (!preset.name || !preset.config) {
      throw new Error('Invalid preset format');
    }
    
    // Generate new ID if importing
    if (preset.id && preset.id.startsWith(BUILTIN_PRESET_PREFIX)) {
      preset.id = null; // Will generate new ID
    }
    
    return savePreset(preset);
  } catch (error) {
    throw new Error(`Failed to import preset: ${error.message}`);
  }
}

