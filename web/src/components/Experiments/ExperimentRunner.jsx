// Enhanced Experiment Runner Component
import React, { useState, useEffect } from 'react';
import { useExperimentRunner } from '../../hooks/useExperimentRunner';
import { saveExperiment, generateExperimentId } from '../../utils/ExperimentStorage';
import { formatExperimentName, estimateExperimentDuration } from '../../utils/ExperimentUtils';
import { getBuiltinPresets, applyPreset } from '../../utils/ScenarioPresets';
// Colors matching the main app
const COLORS = {
  primary: '#00d4aa',
  secondary: '#ff6b6b',
  tertiary: '#4ecdc4',
  quaternary: '#ffe66d',
  dark: '#0a0f1c',
  darker: '#060912',
  card: '#111827',
  cardHover: '#1f2937',
  border: '#1e3a5f',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
};

export default function ExperimentRunner({
  wasmReady,
  SimulationEngine,
  convertConfigToRust,
  baseConfig,
  population = 5000,
  onExperimentComplete,
}) {
  const [experimentType, setExperimentType] = useState('single_param'); // 'single_param' | 'multi_param' | 'preset'
  const [selectedPreset, setSelectedPreset] = useState(null);
  
  // Single param state
  const [singleParam, setSingleParam] = useState('skillSimilarityInitial');
  const [singleParamValues, setSingleParamValues] = useState([0.01, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3]);
  
  // Multi param state
  const [multiParams, setMultiParams] = useState([{ param: 'skillSimilarityInitial', values: [0.05, 0.1, 0.2] }]);
  
  // Experiment options
  const [experimentOptions, setExperimentOptions] = useState({
    ticks: 500,
    seed: 42,
    collectDetailed: false,
    name: '',
    description: '',
    tags: [],
  });

  const {
    running,
    progress,
    currentRun,
    results,
    runSingleParamSweep,
    runMultiParamSweep,
    runExperimentFromConfig,
    cancelExperiment,
    resetExperiment,
  } = useExperimentRunner(wasmReady, SimulationEngine, convertConfigToRust);

  const presets = getBuiltinPresets();

  const handleRunExperiment = async () => {
    try {
      resetExperiment();
      
      let experimentResult;
      let experimentConfig;

      if (experimentType === 'preset' && selectedPreset) {
        const presetConfig = applyPreset(selectedPreset.id, baseConfig);
        // For presets, we'll run a single simulation
        experimentConfig = {
          type: 'preset',
          presetId: selectedPreset.id,
          presetName: selectedPreset.name,
        };
        // Use single param with single value as a workaround for preset runs
        experimentResult = await runSingleParamSweep(
          'skillSimilarityInitial',
          [baseConfig.skillSimilarityInitial],
          presetConfig,
          experimentOptions
        );
      } else if (experimentType === 'single_param') {
        experimentConfig = {
          type: 'single_param',
          parameter: singleParam,
          values: singleParamValues,
        };
        experimentResult = await runSingleParamSweep(
          singleParam,
          singleParamValues,
          baseConfig,
          experimentOptions
        );
      } else if (experimentType === 'multi_param') {
        const params = multiParams.map(p => p.param);
        const valueGrids = multiParams.map(p => p.values);
        experimentConfig = {
          type: 'multi_param',
          parameters: params,
          valueGrids: valueGrids,
        };
        experimentResult = await runMultiParamSweep(
          params,
          valueGrids,
          baseConfig,
          experimentOptions
        );
      }

      // Save experiment
      const experiment = {
        id: generateExperimentId(),
        name: experimentOptions.name || formatExperimentName(experimentType, 
          experimentType === 'single_param' ? [singleParam] : multiParams.map(p => p.param),
          experimentType === 'single_param' ? singleParamValues : selectedPreset),
        description: experimentOptions.description,
        timestamp: Date.now(),
        type: experimentType,
        config: {
          base: baseConfig,
          varied: experimentConfig,
          fixed: {
            population: population,
            ticks: experimentOptions.ticks,
            seed: experimentOptions.seed,
          },
        },
        results: experimentResult.results,
        summary: experimentResult.summary,
        status: 'completed',
        duration: experimentResult.duration,
        tags: experimentOptions.tags,
      };

      const experimentId = saveExperiment(experiment);

      if (onExperimentComplete) {
        onExperimentComplete(experiment);
      }
    } catch (error) {
      console.error('Experiment failed:', error);
      alert(`Experiment failed: ${error.message}`);
    }
  };

  const handleAddMultiParam = () => {
    setMultiParams([...multiParams, { param: 'skillSimilarityInitial', values: [0.05, 0.1] }]);
  };

  const handleRemoveMultiParam = (index) => {
    setMultiParams(multiParams.filter((_, i) => i !== index));
  };

  const handleUpdateMultiParam = (index, field, value) => {
    const updated = [...multiParams];
    updated[index] = { ...updated[index], [field]: value };
    setMultiParams(updated);
  };

  // Estimate duration
  const estimate = estimateExperimentDuration({
    type: experimentType,
    parameter: singleParam,
    values: singleParamValues,
    parameters: multiParams.map(p => p.param),
    valueGrids: multiParams.map(p => p.values),
    ticks: experimentOptions.ticks,
  });

  const paramOptions = [
    { value: 'skillSimilarityInitial', label: 'Skill Similarity Initial' },
    { value: 'skillSimilarityRate', label: 'Skill Similarity Rate' },
    { value: 'skillSimilarityMax', label: 'Skill Similarity Max' },
    { value: 'deltaPingInitial', label: 'Delta Ping Initial' },
    { value: 'deltaPingRate', label: 'Delta Ping Rate' },
    { value: 'weightSkill', label: 'Weight Skill' },
    { value: 'weightGeo', label: 'Weight Geo' },
    { value: 'gamma', label: 'Gamma (Win Probability)' },
    { value: 'skillLearningRate', label: 'Skill Learning Rate' },
    { value: 'partyPlayerFraction', label: 'Party Player Fraction' },
  ];

  return (
    <div style={{ padding: '1rem' }}>
      <h3 style={{ fontSize: '1rem', color: COLORS.text, marginBottom: '1rem' }}>
        Experiment Runner
      </h3>

      {/* Experiment Type Selection */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', color: COLORS.textMuted, marginBottom: '0.5rem' }}>
          Experiment Type
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setExperimentType('single_param')}
            style={{
              padding: '0.5rem 1rem',
              background: experimentType === 'single_param' ? COLORS.primary : COLORS.darker,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '4px',
              color: COLORS.text,
              cursor: 'pointer',
              fontSize: '0.75rem',
            }}
          >
            Single Parameter
          </button>
          <button
            onClick={() => setExperimentType('multi_param')}
            style={{
              padding: '0.5rem 1rem',
              background: experimentType === 'multi_param' ? COLORS.primary : COLORS.darker,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '4px',
              color: COLORS.text,
              cursor: 'pointer',
              fontSize: '0.75rem',
            }}
          >
            Multi Parameter
          </button>
          <button
            onClick={() => setExperimentType('preset')}
            style={{
              padding: '0.5rem 1rem',
              background: experimentType === 'preset' ? COLORS.primary : COLORS.darker,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '4px',
              color: COLORS.text,
              cursor: 'pointer',
              fontSize: '0.75rem',
            }}
          >
            Preset
          </button>
        </div>
      </div>

      {/* Single Parameter Configuration */}
      {experimentType === 'single_param' && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: COLORS.textMuted, marginBottom: '0.5rem' }}>
              Parameter
            </label>
            <select
              value={singleParam}
              onChange={(e) => setSingleParam(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                background: COLORS.darker,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '4px',
                color: COLORS.text,
                fontSize: '0.75rem',
              }}
            >
              {paramOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: COLORS.textMuted, marginBottom: '0.5rem' }}>
              Values (comma-separated)
            </label>
            <input
              type="text"
              value={singleParamValues.join(', ')}
              onChange={(e) => {
                const values = e.target.value.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
                setSingleParamValues(values);
              }}
              style={{
                width: '100%',
                padding: '0.5rem',
                background: COLORS.darker,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '4px',
                color: COLORS.text,
                fontSize: '0.75rem',
              }}
            />
          </div>
        </div>
      )}

      {/* Multi Parameter Configuration */}
      {experimentType === 'multi_param' && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', color: COLORS.textMuted, marginBottom: '0.5rem' }}>
            Parameters
          </label>
          {multiParams.map((param, index) => (
            <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
              <select
                value={param.param}
                onChange={(e) => handleUpdateMultiParam(index, 'param', e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  background: COLORS.darker,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '4px',
                  color: COLORS.text,
                  fontSize: '0.75rem',
                }}
              >
                {paramOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <input
                type="text"
                value={param.values.join(', ')}
                onChange={(e) => {
                  const values = e.target.value.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
                  handleUpdateMultiParam(index, 'values', values);
                }}
                placeholder="values"
                style={{
                  flex: 2,
                  padding: '0.5rem',
                  background: COLORS.darker,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '4px',
                  color: COLORS.text,
                  fontSize: '0.75rem',
                }}
              />
              <button
                onClick={() => handleRemoveMultiParam(index)}
                disabled={multiParams.length === 1}
                style={{
                  padding: '0.5rem',
                  background: COLORS.danger,
                  border: 'none',
                  borderRadius: '4px',
                  color: COLORS.text,
                  cursor: multiParams.length === 1 ? 'not-allowed' : 'pointer',
                  opacity: multiParams.length === 1 ? 0.5 : 1,
                }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={handleAddMultiParam}
            style={{
              padding: '0.5rem',
              background: COLORS.tertiary,
              border: 'none',
              borderRadius: '4px',
              color: COLORS.dark,
              cursor: 'pointer',
              fontSize: '0.75rem',
            }}
          >
            + Add Parameter
          </button>
          <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: COLORS.textMuted }}>
            Total combinations: {multiParams.reduce((total, p) => total * p.values.length, 1)}
          </div>
        </div>
      )}

      {/* Preset Selection */}
      {experimentType === 'preset' && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', color: COLORS.textMuted, marginBottom: '0.5rem' }}>
            Select Preset
          </label>
          <select
            value={selectedPreset?.id || ''}
            onChange={(e) => {
              const preset = presets.find(p => p.id === e.target.value);
              setSelectedPreset(preset || null);
            }}
            style={{
              width: '100%',
              padding: '0.5rem',
              background: COLORS.darker,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '4px',
              color: COLORS.text,
              fontSize: '0.75rem',
            }}
          >
            <option value="">Select a preset...</option>
            {presets.map(preset => (
              <option key={preset.id} value={preset.id}>{preset.name}</option>
            ))}
          </select>
          {selectedPreset && (
            <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: COLORS.darker, borderRadius: '4px', fontSize: '0.7rem', color: COLORS.textMuted }}>
              {selectedPreset.description}
            </div>
          )}
        </div>
      )}

      {/* Experiment Options */}
      <div style={{ marginBottom: '1rem', padding: '1rem', background: COLORS.darker, borderRadius: '4px' }}>
        <h4 style={{ fontSize: '0.75rem', color: COLORS.textMuted, marginBottom: '0.75rem' }}>Experiment Options</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: COLORS.textMuted, marginBottom: '0.25rem' }}>
              Ticks per Run
            </label>
            <input
              type="number"
              value={experimentOptions.ticks}
              onChange={(e) => setExperimentOptions({ ...experimentOptions, ticks: parseInt(e.target.value) || 500 })}
              style={{
                width: '100%',
                padding: '0.5rem',
                background: COLORS.dark,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '4px',
                color: COLORS.text,
                fontSize: '0.75rem',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: COLORS.textMuted, marginBottom: '0.25rem' }}>
              Seed
            </label>
            <input
              type="number"
              value={experimentOptions.seed}
              onChange={(e) => setExperimentOptions({ ...experimentOptions, seed: parseInt(e.target.value) || 42 })}
              style={{
                width: '100%',
                padding: '0.5rem',
                background: COLORS.dark,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '4px',
                color: COLORS.text,
                fontSize: '0.75rem',
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.7rem', color: COLORS.textMuted, gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={experimentOptions.collectDetailed}
              onChange={(e) => setExperimentOptions({ ...experimentOptions, collectDetailed: e.target.checked })}
            />
            Collect Detailed Metrics (slower, more data)
          </label>
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', fontSize: '0.7rem', color: COLORS.textMuted, marginBottom: '0.25rem' }}>
            Name (optional)
          </label>
          <input
            type="text"
            value={experimentOptions.name}
            onChange={(e) => setExperimentOptions({ ...experimentOptions, name: e.target.value })}
            placeholder="Auto-generated if empty"
            style={{
              width: '100%',
              padding: '0.5rem',
              background: COLORS.dark,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '4px',
              color: COLORS.text,
              fontSize: '0.75rem',
            }}
          />
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', fontSize: '0.7rem', color: COLORS.textMuted, marginBottom: '0.25rem' }}>
            Description (optional)
          </label>
          <textarea
            value={experimentOptions.description}
            onChange={(e) => setExperimentOptions({ ...experimentOptions, description: e.target.value })}
            placeholder="Experiment notes..."
            rows={2}
            style={{
              width: '100%',
              padding: '0.5rem',
              background: COLORS.dark,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '4px',
              color: COLORS.text,
              fontSize: '0.75rem',
              resize: 'vertical',
            }}
          />
        </div>
      </div>

      {/* Duration Estimate */}
      {estimate && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: COLORS.darker, borderRadius: '4px', fontSize: '0.7rem', color: COLORS.textMuted }}>
          Estimated duration: {estimate.estimatedMinutes < 1 
            ? `${Math.round(estimate.estimatedSeconds)} seconds`
            : estimate.estimatedHours >= 1
            ? `${estimate.estimatedHours.toFixed(1)} hours`
            : `${estimate.estimatedMinutes.toFixed(1)} minutes`
          } ({estimate.runs} runs)
        </div>
      )}

      {/* Progress */}
      {running && (
        <div style={{ marginBottom: '1rem', padding: '1rem', background: COLORS.darker, borderRadius: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.75rem', color: COLORS.textMuted }}>
            <span>Progress: {Math.round(progress)}%</span>
            {currentRun && (
              <span>Run {currentRun.index} of {currentRun.total}</span>
            )}
          </div>
          <div style={{ width: '100%', height: '8px', background: COLORS.dark, borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: COLORS.primary, transition: 'width 0.3s' }} />
          </div>
          {currentRun && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: COLORS.textMuted }}>
              {currentRun.parameter && (
                <span>{currentRun.parameter}: {currentRun.value}</span>
              )}
              {currentRun.parameters && (
                <span>{Object.entries(currentRun.parameters).map(([k, v]) => `${k}=${v}`).join(', ')}</span>
              )}
            </div>
          )}
          <button
            onClick={cancelExperiment}
            style={{
              marginTop: '0.75rem',
              padding: '0.5rem 1rem',
              background: COLORS.danger,
              border: 'none',
              borderRadius: '4px',
              color: COLORS.text,
              cursor: 'pointer',
              fontSize: '0.75rem',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Run Button */}
      <button
        onClick={handleRunExperiment}
        disabled={running || !wasmReady || (experimentType === 'preset' && !selectedPreset)}
        style={{
          width: '100%',
          padding: '0.75rem',
          background: running || !wasmReady || (experimentType === 'preset' && !selectedPreset) ? COLORS.darker : COLORS.primary,
          border: 'none',
          borderRadius: '4px',
          color: running || !wasmReady || (experimentType === 'preset' && !selectedPreset) ? COLORS.textMuted : COLORS.dark,
          cursor: running || !wasmReady || (experimentType === 'preset' && !selectedPreset) ? 'not-allowed' : 'pointer',
          fontSize: '0.85rem',
          fontWeight: 600,
        }}
      >
        {running ? 'Running...' : 'Run Experiment'}
      </button>
    </div>
  );
}

