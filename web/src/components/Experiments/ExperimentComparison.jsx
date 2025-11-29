// Experiment Comparison Component
import React, { useState } from 'react';
import { loadExperiment } from '../../utils/ExperimentStorage';
import ComparisonChart from '../Charts/ComparisonChart';
import MetricChart from '../Charts/MetricChart';

const COLORS = {
  primary: '#00d4aa',
  secondary: '#ff6b6b',
  tertiary: '#4ecdc4',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  border: '#1e3a5f',
  card: '#111827',
  darker: '#060912',
};

export default function ExperimentComparison({
  experimentIds = [],
  experiments: providedExperiments = [],
  onClose,
}) {
  const [selectedMetrics, setSelectedMetrics] = useState([
    'avgSearchTime',
    'avgDeltaPing',
    'avgSkillDisparity',
    'blowoutRate',
  ]);

  // Load experiments if IDs provided
  const experiments = providedExperiments.length > 0 
    ? providedExperiments
    : experimentIds.map(id => loadExperiment(id)).filter(e => e !== null);

  if (experiments.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: COLORS.textMuted }}>
        No experiments selected for comparison.
      </div>
    );
  }

  // Compute config differences
  const getConfigDiff = () => {
    if (experiments.length < 2) return null;
    
    const baseConfig = experiments[0].config?.base || {};
    const diffs = [];
    
    experiments.slice(1).forEach((exp, index) => {
      const expConfig = exp.config?.base || {};
      const diff = {};
      
      // Compare all config keys
      const allKeys = new Set([...Object.keys(baseConfig), ...Object.keys(expConfig)]);
      allKeys.forEach(key => {
        if (JSON.stringify(baseConfig[key]) !== JSON.stringify(expConfig[key])) {
          diff[key] = {
            base: baseConfig[key],
            experiment: expConfig[key],
          };
        }
      });
      
      if (Object.keys(diff).length > 0) {
        diffs.push({
          experiment: exp.name || `Experiment ${index + 2}`,
          diff: diff,
        });
      }
    });
    
    return diffs;
  };

  const configDiffs = getConfigDiff();

  // Prepare comparison data for charts
  const prepareComparisonData = (metricKey) => {
    const data = [];
    
    experiments.forEach((exp, expIndex) => {
      if (exp.type === 'single_param' && exp.results) {
        exp.results.forEach(result => {
          const xValue = result.value;
          let dataPoint = data.find(d => d.value === xValue);
          if (!dataPoint) {
            dataPoint = { value: xValue };
            data.push(dataPoint);
          }
          
          const metricValue = result.metrics?.[metricKey];
          if (metricValue !== undefined) {
            dataPoint[exp.name || `Exp ${expIndex + 1}`] = metricKey === 'blowoutRate' 
              ? metricValue * 100 
              : metricValue;
          }
        });
      }
    });
    
    data.sort((a, b) => a.value - b.value);
    return data;
  };

  const getMetricLabel = (key) => {
    const labels = {
      avgSearchTime: 'Search Time (s)',
      avgDeltaPing: 'Delta Ping (ms)',
      avgSkillDisparity: 'Skill Disparity',
      blowoutRate: 'Blowout Rate (%)',
      effectivePopulation: 'Effective Population',
      populationChangeRate: 'Population Change Rate',
    };
    return labels[key] || key;
  };

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem', color: COLORS.text, margin: 0 }}>
          Compare Experiments ({experiments.length})
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              background: COLORS.darker,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '4px',
              color: COLORS.text,
              cursor: 'pointer',
              fontSize: '0.75rem',
            }}
          >
            Close
          </button>
        )}
      </div>

      {/* Experiment List */}
      <div style={{ marginBottom: '1rem', padding: '1rem', background: COLORS.darker, borderRadius: '8px' }}>
        <h4 style={{ fontSize: '0.75rem', color: COLORS.textMuted, marginBottom: '0.5rem' }}>
          Comparing:
        </h4>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {experiments.map((exp, index) => (
            <div
              key={exp.id || index}
              style={{
                padding: '0.5rem 1rem',
                background: COLORS.card,
                borderRadius: '4px',
                fontSize: '0.75rem',
                color: COLORS.text,
              }}
            >
              {exp.name || `Experiment ${index + 1}`}
            </div>
          ))}
        </div>
      </div>

      {/* Config Differences */}
      {configDiffs && configDiffs.length > 0 && (
        <div style={{ marginBottom: '1rem', padding: '1rem', background: COLORS.card, borderRadius: '8px' }}>
          <h4 style={{ fontSize: '0.85rem', color: COLORS.text, marginBottom: '0.75rem' }}>
            Configuration Differences
          </h4>
          {configDiffs.map((diff, diffIndex) => (
            <div key={diffIndex} style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: COLORS.tertiary, marginBottom: '0.5rem' }}>
                vs {diff.experiment}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                      <th style={{ padding: '0.5rem', color: COLORS.textMuted, textAlign: 'left' }}>Parameter</th>
                      <th style={{ padding: '0.5rem', color: COLORS.textMuted, textAlign: 'left' }}>Base</th>
                      <th style={{ padding: '0.5rem', color: COLORS.textMuted, textAlign: 'left' }}>Experiment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(diff.diff).map(([key, values]) => (
                      <tr key={key} style={{ borderBottom: `1px solid ${COLORS.border}33` }}>
                        <td style={{ padding: '0.5rem', color: COLORS.text }}>{key}</td>
                        <td style={{ padding: '0.5rem', color: COLORS.text }}>
                          {typeof values.base === 'object' ? JSON.stringify(values.base) : String(values.base)}
                        </td>
                        <td style={{ 
                          padding: '0.5rem', 
                          color: COLORS.text,
                          background: JSON.stringify(values.base) !== JSON.stringify(values.experiment) 
                            ? COLORS.tertiary + '20' 
                            : 'transparent',
                        }}>
                          {typeof values.experiment === 'object' ? JSON.stringify(values.experiment) : String(values.experiment)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Metric Selection */}
      <div style={{ marginBottom: '1rem', padding: '1rem', background: COLORS.darker, borderRadius: '8px' }}>
        <h4 style={{ fontSize: '0.75rem', color: COLORS.textMuted, marginBottom: '0.5rem' }}>
          Select Metrics to Compare
        </h4>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['avgSearchTime', 'avgDeltaPing', 'avgSkillDisparity', 'blowoutRate', 'effectivePopulation', 'populationChangeRate'].map(metric => (
            <label
              key={metric}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.75rem',
                background: selectedMetrics.includes(metric) ? COLORS.primary : COLORS.card,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.7rem',
                color: selectedMetrics.includes(metric) ? COLORS.darker : COLORS.text,
              }}
            >
              <input
                type="checkbox"
                checked={selectedMetrics.includes(metric)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedMetrics([...selectedMetrics, metric]);
                  } else {
                    setSelectedMetrics(selectedMetrics.filter(m => m !== metric));
                  }
                }}
                style={{ margin: 0 }}
              />
              {getMetricLabel(metric)}
            </label>
          ))}
        </div>
      </div>

      {/* Comparison Charts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {selectedMetrics.map(metricKey => {
          const data = prepareComparisonData(metricKey);
          if (data.length === 0) return null;
          
          const lineKeys = experiments.map((exp, index) => exp.name || `Exp ${index + 1}`);
          
          return (
            <div key={metricKey} style={{ padding: '1rem', background: COLORS.card, borderRadius: '8px' }}>
              <ComparisonChart
                experiments={experiments}
                xKey="value"
                yKey={metricKey}
                title={getMetricLabel(metricKey)}
                xLabel="Parameter Value"
                yLabel={getMetricLabel(metricKey)}
                height={300}
              />
            </div>
          );
        })}
      </div>

      {/* Summary Statistics */}
      <div style={{ marginTop: '1rem', padding: '1rem', background: COLORS.card, borderRadius: '8px' }}>
        <h4 style={{ fontSize: '0.85rem', color: COLORS.text, marginBottom: '0.75rem' }}>
          Summary Statistics
        </h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                <th style={{ padding: '0.5rem', color: COLORS.textMuted, textAlign: 'left' }}>Metric</th>
                {experiments.map((exp, index) => (
                  <th key={index} style={{ padding: '0.5rem', color: COLORS.textMuted, textAlign: 'right' }}>
                    {exp.name || `Exp ${index + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selectedMetrics.map(metricKey => {
                const metricLabel = getMetricLabel(metricKey);
                return (
                  <tr key={metricKey} style={{ borderBottom: `1px solid ${COLORS.border}33` }}>
                    <td style={{ padding: '0.5rem', color: COLORS.text }}>{metricLabel}</td>
                    {experiments.map((exp, index) => {
                      const summary = exp.summary?.metrics?.[metricKey];
                      const value = summary?.mean || (metricKey === 'blowoutRate' && summary ? summary.mean * 100 : summary?.mean) || 'N/A';
                      return (
                        <td key={index} style={{ padding: '0.5rem', color: COLORS.text, textAlign: 'right' }}>
                          {typeof value === 'number' ? value.toFixed(2) : value}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

