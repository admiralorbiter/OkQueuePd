// Heatmap Chart Component for Multi-Param Sweeps
import React from 'react';
import { ResponsiveContainer, Cell } from 'recharts';

const COLORS = {
  primary: '#00d4aa',
  secondary: '#ff6b6b',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  border: '#1e3a5f',
  card: '#111827',
};

// Simple heatmap implementation using table/divs since recharts doesn't have built-in heatmap
export default function HeatmapChart({
  data,
  xParam,
  yParam,
  metric,
  title,
  height = 400,
}) {
  if (!data || data.length === 0 || !xParam || !yParam) {
    return (
      <div style={{ 
        height: `${height}px`, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '8px',
        color: COLORS.textMuted,
      }}>
        {!xParam || !yParam ? 'Please select X and Y parameters' : 'No data available'}
      </div>
    );
  }

  // Extract unique X and Y values
  const xValues = [...new Set(data.map(d => d.parameters?.[xParam]))].sort((a, b) => a - b);
  const yValues = [...new Set(data.map(d => d.parameters?.[yParam]))].sort((a, b) => a - b);

  // Create a map for quick lookup
  const dataMap = new Map();
  data.forEach(d => {
    const key = `${d.parameters?.[xParam]}_${d.parameters?.[yParam]}`;
    dataMap.set(key, d.metrics?.[metric]);
  });

  // Find min/max for color scaling
  const values = data.map(d => d.metrics?.[metric]).filter(v => typeof v === 'number');
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // Color interpolation
  const getColor = (value) => {
    if (value === undefined || isNaN(value)) return '#2d3748';
    const normalized = (value - min) / range;
    // Interpolate from dark blue (low) to green (high)
    const r = Math.round(0 + normalized * 0);
    const g = Math.round(125 + normalized * 130);
    const b = Math.round(200 - normalized * 100);
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div style={{ width: '100%' }}>
      {title && (
        <h4 style={{ fontSize: '0.75rem', color: COLORS.textMuted, marginBottom: '0.5rem' }}>
          {title}
        </h4>
      )}
      <div style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '8px',
        padding: '1rem',
        overflow: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.7rem', color: COLORS.textMuted }}>
          <span>X: {xParam}</span>
          <span>Y: {yParam}</span>
          <span>Metric: {metric}</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem' }}>
          <thead>
            <tr>
              <th style={{ padding: '0.5rem', color: COLORS.textMuted, textAlign: 'left' }}>
                {yParam} \ {xParam}
              </th>
              {xValues.map(xVal => (
                <th 
                  key={xVal} 
                  style={{ 
                    padding: '0.5rem', 
                    color: COLORS.textMuted, 
                    textAlign: 'center',
                    borderLeft: `1px solid ${COLORS.border}`,
                  }}
                >
                  {typeof xVal === 'number' ? xVal.toFixed(3) : xVal}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {yValues.map(yVal => (
              <tr key={yVal}>
                <td style={{ 
                  padding: '0.5rem', 
                  color: COLORS.textMuted,
                  borderTop: `1px solid ${COLORS.border}`,
                }}>
                  {typeof yVal === 'number' ? yVal.toFixed(3) : yVal}
                </td>
                {xValues.map(xVal => {
                  const key = `${xVal}_${yVal}`;
                  const value = dataMap.get(key);
                  return (
                    <td
                      key={xVal}
                      style={{
                        padding: '0.75rem',
                        background: getColor(value),
                        color: value !== undefined ? COLORS.text : COLORS.textMuted,
                        textAlign: 'center',
                        border: `1px solid ${COLORS.border}`,
                        fontSize: '0.65rem',
                      }}
                      title={`${xParam}=${xVal}, ${yParam}=${yVal}: ${value?.toFixed(2) || 'N/A'}`}
                    >
                      {value !== undefined ? value.toFixed(2) : '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: '1rem', fontSize: '0.65rem', color: COLORS.textMuted }}>
          <span>Range: {min.toFixed(2)} to {max.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

