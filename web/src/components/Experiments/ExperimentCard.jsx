// Experiment Card Component
import React from 'react';

const COLORS = {
  primary: '#00d4aa',
  secondary: '#ff6b6b',
  tertiary: '#4ecdc4',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  border: '#1e3a5f',
  card: '#111827',
  darker: '#060912',
  success: '#10b981',
  warning: '#f59e0b',
};

export default function ExperimentCard({
  experiment,
  onSelect,
  onDelete,
  onExport,
  selected = false,
}) {
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatDuration = (ms) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return COLORS.success;
      case 'running': return COLORS.warning;
      case 'failed': return COLORS.secondary;
      default: return COLORS.textMuted;
    }
  };

  const getSummaryMetric = () => {
    if (!experiment.summary || !experiment.summary.metrics) return null;
    
    // Try to find a common metric
    const metrics = experiment.summary.metrics;
    if (metrics.avgSearchTime) {
      return { label: 'Avg Search Time', value: `${metrics.avgSearchTime.mean.toFixed(1)}s` };
    }
    if (metrics.blowoutRate) {
      return { label: 'Blowout Rate', value: `${(metrics.blowoutRate.mean * 100).toFixed(1)}%` };
    }
    return null;
  };

  const summaryMetric = getSummaryMetric();

  return (
    <div
      onClick={() => onSelect && onSelect(experiment)}
      style={{
        background: selected ? COLORS.tertiary + '20' : COLORS.card,
        border: `2px solid ${selected ? COLORS.tertiary : COLORS.border}`,
        borderRadius: '8px',
        padding: '1rem',
        cursor: onSelect ? 'pointer' : 'default',
        transition: 'all 0.2s',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = COLORS.tertiary;
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = COLORS.border;
        }
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
        <h4 style={{ fontSize: '0.85rem', color: COLORS.text, margin: 0, flex: 1 }}>
          {experiment.name || 'Unnamed Experiment'}
        </h4>
        <div style={{
          padding: '0.25rem 0.5rem',
          background: getStatusColor(experiment.status),
          borderRadius: '4px',
          fontSize: '0.65rem',
          color: COLORS.darker,
          fontWeight: 600,
        }}>
          {experiment.status || 'unknown'}
        </div>
      </div>

      {experiment.description && (
        <p style={{ fontSize: '0.7rem', color: COLORS.textMuted, marginBottom: '0.75rem', marginTop: '0.5rem' }}>
          {experiment.description}
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        {experiment.tags && experiment.tags.map(tag => (
          <span
            key={tag}
            style={{
              padding: '0.25rem 0.5rem',
              background: COLORS.darker,
              borderRadius: '4px',
              fontSize: '0.65rem',
              color: COLORS.textMuted,
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.7rem', color: COLORS.textMuted, marginBottom: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '0.65rem', color: COLORS.textMuted }}>Type</div>
          <div style={{ color: COLORS.text }}>{experiment.type || 'unknown'}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', color: COLORS.textMuted }}>Duration</div>
          <div style={{ color: COLORS.text }}>{formatDuration(experiment.duration)}</div>
        </div>
        {summaryMetric && (
          <>
            <div>
              <div style={{ fontSize: '0.65rem', color: COLORS.textMuted }}>{summaryMetric.label}</div>
              <div style={{ color: COLORS.text }}>{summaryMetric.value}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: COLORS.textMuted }}>Runs</div>
              <div style={{ color: COLORS.text }}>{experiment.results?.length || 0}</div>
            </div>
          </>
        )}
      </div>

      <div style={{ fontSize: '0.65rem', color: COLORS.textMuted, marginBottom: '0.75rem' }}>
        {formatDate(experiment.timestamp)}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        {onSelect && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(experiment);
            }}
            style={{
              padding: '0.5rem 1rem',
              background: COLORS.primary,
              border: 'none',
              borderRadius: '4px',
              color: COLORS.darker,
              cursor: 'pointer',
              fontSize: '0.7rem',
              fontWeight: 600,
            }}
          >
            View
          </button>
        )}
        {onExport && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExport(experiment);
            }}
            style={{
              padding: '0.5rem 1rem',
              background: COLORS.darker,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '4px',
              color: COLORS.text,
              cursor: 'pointer',
              fontSize: '0.7rem',
            }}
          >
            Export
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete experiment "${experiment.name}"?`)) {
                onDelete(experiment.id);
              }
            }}
            style={{
              padding: '0.5rem 1rem',
              background: COLORS.darker,
              border: `1px solid ${COLORS.secondary}`,
              borderRadius: '4px',
              color: COLORS.secondary,
              cursor: 'pointer',
              fontSize: '0.7rem',
            }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

