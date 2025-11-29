// Experiment Builder Component - Visual experiment configuration builder
import React, { useState } from 'react';
import { getBuiltinPresets, applyPreset } from '../../utils/ScenarioPresets';
import { validateExperimentConfig, estimateExperimentDuration } from '../../utils/ExperimentUtils';

const COLORS = {
  primary: '#00d4aa',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  border: '#1e3a5f',
  card: '#111827',
  darker: '#060912',
};

export default function ExperimentBuilder({
  baseConfig,
  onSave,
}) {
  const [experimentType, setExperimentType] = useState('single_param');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  // Single param config
  const [selectedParam, setSelectedParam] = useState('skillSimilarityInitial');
  const [paramValues, setParamValues] = useState([0.01, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3]);
  
  // Options
  const [ticks, setTicks] = useState(500);
  const [population, setPopulation] = useState(5000);
  const [seed, setSeed] = useState(42);

  const paramOptions = [
    { value: 'skillSimilarityInitial', label: 'Skill Similarity Initial' },
    { value: 'skillSimilarityRate', label: 'Skill Similarity Rate' },
    { value: 'deltaPingInitial', label: 'Delta Ping Initial' },
    { value: 'weightSkill', label: 'Weight Skill' },
    { value: 'gamma', label: 'Gamma' },
  ];

  const handleSave = () => {
    const config = {
      type: experimentType,
      parameter: selectedParam,
      values: paramValues.map(v => parseFloat(v)).filter(v => !isNaN(v)),
      ticks: parseInt(ticks),
      population: parseInt(population),
      seed: parseInt(seed),
    };

    const validation = validateExperimentConfig(config);
    if (!validation.valid) {
      alert(`Invalid configuration: ${validation.errors.join(', ')}`);
      return;
    }

    if (onSave) {
      onSave({
        name: name || `Experiment ${Date.now()}`,
        description: description,
        config: config,
      });
    }
  };

  const estimate = estimateExperimentDuration({
    type: experimentType,
    parameter: selectedParam,
    values: paramValues,
    ticks: parseInt(ticks) || 500,
  });

  return (
    <div style={{ padding: '1rem' }}>
      <h3 style={{ fontSize: '1rem', color: COLORS.text, marginBottom: '1rem' }}>
        Experiment Builder
      </h3>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', color: COLORS.textMuted, marginBottom: '0.5rem' }}>
          Experiment Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter experiment name..."
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

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', color: COLORS.textMuted, marginBottom: '0.5rem' }}>
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your experiment..."
          rows={3}
          style={{
            width: '100%',
            padding: '0.5rem',
            background: COLORS.darker,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '4px',
            color: COLORS.text,
            fontSize: '0.75rem',
            resize: 'vertical',
          }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', color: COLORS.textMuted, marginBottom: '0.5rem' }}>
          Parameter
        </label>
        <select
          value={selectedParam}
          onChange={(e) => setSelectedParam(e.target.value)}
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

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', color: COLORS.textMuted, marginBottom: '0.5rem' }}>
          Values (comma-separated)
        </label>
        <input
          type="text"
          value={paramValues.join(', ')}
          onChange={(e) => {
            const values = e.target.value.split(',').map(v => v.trim()).filter(v => v);
            setParamValues(values);
          }}
          placeholder="0.01, 0.05, 0.1, 0.15, 0.2"
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: COLORS.textMuted, marginBottom: '0.5rem' }}>
            Ticks
          </label>
          <input
            type="number"
            value={ticks}
            onChange={(e) => setTicks(e.target.value)}
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
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: COLORS.textMuted, marginBottom: '0.5rem' }}>
            Population
          </label>
          <input
            type="number"
            value={population}
            onChange={(e) => setPopulation(e.target.value)}
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
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: COLORS.textMuted, marginBottom: '0.5rem' }}>
            Seed
          </label>
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
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

      {estimate && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: COLORS.darker, borderRadius: '4px', fontSize: '0.7rem', color: COLORS.textMuted }}>
          Estimated: {estimate.estimatedMinutes < 1 
            ? `${Math.round(estimate.estimatedSeconds)}s`
            : `${estimate.estimatedMinutes.toFixed(1)}m`
          } ({estimate.runs} runs)
        </div>
      )}

      <button
        onClick={handleSave}
        style={{
          width: '100%',
          padding: '0.75rem',
          background: COLORS.primary,
          border: 'none',
          borderRadius: '4px',
          color: '#0a0f1c',
          cursor: 'pointer',
          fontSize: '0.85rem',
          fontWeight: 600,
        }}
      >
        Save Experiment Configuration
      </button>
    </div>
  );
}

