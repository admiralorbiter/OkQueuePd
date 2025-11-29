// Experiment Details Component - View detailed experiment information
import React from 'react';
import MetricChart from '../Charts/MetricChart';
import { formatExperimentName } from '../../utils/ExperimentUtils';

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

export default function ExperimentDetails({
  experiment,
  onBack,
  onExport,
  onDelete,
  onCompare,
}) {
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (ms) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  };

  // Prepare chart data
  const getChartData = () => {
    if (!experiment.results || experiment.results.length === 0) return [];
    
    if (experiment.type === 'single_param') {
      return experiment.results.map(result => ({
        value: result.value,
        avgSearchTime: result.metrics?.avgSearchTime || 0,
        avgDeltaPing: result.metrics?.avgDeltaPing || 0,
        avgSkillDisparity: result.metrics?.avgSkillDisparity || 0,
        blowoutRate: (result.metrics?.blowoutRate || 0) * 100,
        effectivePopulation: result.metrics?.effectivePopulation || 0,
        populationChangeRate: result.metrics?.populationChangeRate || 0,
      }));
    }
    
    // For multi-param, show first parameter vs metric
    if (experiment.type === 'multi_param' && experiment.config?.varied?.parameters) {
      const firstParam = experiment.config.varied.parameters[0];
      return experiment.results.map(result => ({
        [firstParam]: result.parameters?.[firstParam] || 0,
        avgSearchTime: result.metrics?.avgSearchTime || 0,
        avgDeltaPing: result.metrics?.avgDeltaPing || 0,
      }));
    }
    
    return [];
  };

  const chartData = getChartData();
  const paramName = experiment.type === 'single_param' 
    ? experiment.config?.varied?.parameter 
    : experiment.config?.varied?.parameters?.[0];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', color: COLORS.text, marginBottom: '0.5rem' }}>
            {experiment.name || 'Unnamed Experiment'}
          </h3>
          {experiment.description && (
            <p style={{ fontSize: '0.75rem', color: COLORS.textMuted }}>
              {experiment.description}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {onCompare && (
            <button
              onClick={() => onCompare([experiment])}
              style={{
                padding: '0.5rem 1rem',
                background: COLORS.tertiary,
                border: 'none',
                borderRadius: '4px',
                color: COLORS.darker,
                cursor: 'pointer',
                fontSize: '0.75rem',
              }}
            >
              Compare
            </button>
          )}
          {onExport && (
            <button
              onClick={() => onExport(experiment)}
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
              Export
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => {
                if (confirm(`Delete experiment "${experiment.name}"?`)) {
                  onDelete(experiment.id);
                  if (onBack) onBack();
                }
              }}
              style={{
                padding: '0.5rem 1rem',
                background: COLORS.secondary,
                border: 'none',
                borderRadius: '4px',
                color: COLORS.text,
                cursor: 'pointer',
                fontSize: '0.75rem',
              }}
            >
              Delete
            </button>
          )}
          {onBack && (
            <button
              onClick={onBack}
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
              Back
            </button>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '0.75rem',
        marginBottom: '1rem',
        padding: '1rem',
        background: COLORS.darker,
        borderRadius: '8px',
      }}>
        <div>
          <div style={{ fontSize: '0.65rem', color: COLORS.textMuted }}>Type</div>
          <div style={{ fontSize: '0.85rem', color: COLORS.text }}>{experiment.type || 'unknown'}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', color: COLORS.textMuted }}>Status</div>
          <div style={{ fontSize: '0.85rem', color: COLORS.text }}>{experiment.status || 'unknown'}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', color: COLORS.textMuted }}>Created</div>
          <div style={{ fontSize: '0.85rem', color: COLORS.text }}>{formatDate(experiment.timestamp)}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', color: COLORS.textMuted }}>Duration</div>
          <div style={{ fontSize: '0.85rem', color: COLORS.text }}>{formatDuration(experiment.duration)}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', color: COLORS.textMuted }}>Runs</div>
          <div style={{ fontSize: '0.85rem', color: COLORS.text }}>{experiment.results?.length || 0}</div>
        </div>
      </div>

      {/* Tags */}
      {experiment.tags && experiment.tags.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {experiment.tags.map(tag => (
              <span
                key={tag}
                style={{
                  padding: '0.25rem 0.75rem',
                  background: COLORS.card,
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  color: COLORS.textMuted,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Summary Metrics */}
      {experiment.summary && experiment.summary.metrics && (
        <div style={{ 
          marginBottom: '1rem', 
          padding: '1rem', 
          background: COLORS.darker, 
          borderRadius: '8px' 
        }}>
          <h4 style={{ fontSize: '0.85rem', color: COLORS.text, marginBottom: '0.75rem' }}>
            Summary Statistics
          </h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: '0.75rem' 
          }}>
            {Object.entries(experiment.summary.metrics).slice(0, 6).map(([key, stats]) => (
              <div key={key}>
                <div style={{ fontSize: '0.65rem', color: COLORS.textMuted }}>{key}</div>
                <div style={{ fontSize: '0.75rem', color: COLORS.text }}>
                  Mean: {stats.mean?.toFixed(2) || 'N/A'}
                </div>
                <div style={{ fontSize: '0.7rem', color: COLORS.textMuted }}>
                  [{stats.min?.toFixed(2) || 'N/A'}, {stats.max?.toFixed(2) || 'N/A'}]
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      {chartData.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: COLORS.card, borderRadius: '8px' }}>
            <MetricChart
              data={chartData}
              xKey={paramName || 'value'}
              yKeys={[
                { key: 'avgSearchTime', name: 'Search Time (s)' },
                { key: 'avgDeltaPing', name: 'Delta Ping (ms)' },
                { key: 'avgSkillDisparity', name: 'Skill Disparity' },
                { key: 'blowoutRate', name: 'Blowout Rate (%)' },
              ]}
              type="line"
              title="Key Metrics"
              xLabel={paramName || 'Parameter Value'}
              height={300}
            />
          </div>
        </div>
      )}

      {/* Results Table */}
      {experiment.results && experiment.results.length > 0 && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '1rem', 
          background: COLORS.card, 
          borderRadius: '8px' 
        }}>
          <h4 style={{ fontSize: '0.85rem', color: COLORS.text, marginBottom: '0.75rem' }}>
            Results ({experiment.results.length} runs)
          </h4>
          <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem' }}>
              <thead style={{ position: 'sticky', top: 0, background: COLORS.darker }}>
                <tr>
                  {experiment.type === 'single_param' && (
                    <th style={{ padding: '0.5rem', color: COLORS.textMuted, textAlign: 'left', borderBottom: `1px solid ${COLORS.border}` }}>
                      {paramName || 'Value'}
                    </th>
                  )}
                  <th style={{ padding: '0.5rem', color: COLORS.textMuted, textAlign: 'right', borderBottom: `1px solid ${COLORS.border}` }}>
                    Search Time
                  </th>
                  <th style={{ padding: '0.5rem', color: COLORS.textMuted, textAlign: 'right', borderBottom: `1px solid ${COLORS.border}` }}>
                    Delta Ping
                  </th>
                  <th style={{ padding: '0.5rem', color: COLORS.textMuted, textAlign: 'right', borderBottom: `1px solid ${COLORS.border}` }}>
                    Skill Disparity
                  </th>
                  <th style={{ padding: '0.5rem', color: COLORS.textMuted, textAlign: 'right', borderBottom: `1px solid ${COLORS.border}` }}>
                    Blowout Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {experiment.results.slice(0, 50).map((result, index) => (
                  <tr key={index} style={{ borderBottom: `1px solid ${COLORS.border}33` }}>
                    {experiment.type === 'single_param' && (
                      <td style={{ padding: '0.5rem', color: COLORS.text }}>
                        {typeof result.value === 'number' ? result.value.toFixed(3) : result.value}
                      </td>
                    )}
                    <td style={{ padding: '0.5rem', color: COLORS.text, textAlign: 'right' }}>
                      {result.metrics?.avgSearchTime?.toFixed(1) || 'N/A'}s
                    </td>
                    <td style={{ padding: '0.5rem', color: COLORS.text, textAlign: 'right' }}>
                      {result.metrics?.avgDeltaPing?.toFixed(1) || 'N/A'}ms
                    </td>
                    <td style={{ padding: '0.5rem', color: COLORS.text, textAlign: 'right' }}>
                      {result.metrics?.avgSkillDisparity?.toFixed(4) || 'N/A'}
                    </td>
                    <td style={{ padding: '0.5rem', color: COLORS.text, textAlign: 'right' }}>
                      {((result.metrics?.blowoutRate || 0) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {experiment.results.length > 50 && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: COLORS.textMuted, textAlign: 'center' }}>
                Showing first 50 of {experiment.results.length} results
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

