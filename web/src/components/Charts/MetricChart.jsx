// Reusable Metric Chart Component
import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = {
  primary: '#00d4aa',
  secondary: '#ff6b6b',
  tertiary: '#4ecdc4',
  quaternary: '#ffe66d',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  border: '#1e3a5f',
  card: '#111827',
};

export default function MetricChart({
  data,
  xKey,
  yKeys,
  type = 'line', // 'line' | 'bar'
  title,
  xLabel,
  yLabel,
  height = 300,
  colors = [COLORS.primary, COLORS.secondary, COLORS.tertiary, COLORS.quaternary],
  showLegend = true,
  strokeWidth = 2,
}) {
  if (!data || data.length === 0) {
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
        No data available
      </div>
    );
  }

  const ChartComponent = type === 'line' ? LineChart : BarChart;

  return (
    <div style={{ width: '100%' }}>
      {title && (
        <h4 style={{ fontSize: '0.75rem', color: COLORS.textMuted, marginBottom: '0.5rem' }}>
          {title}
        </h4>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
          <XAxis 
            dataKey={xKey} 
            tick={{ fill: COLORS.textMuted, fontSize: 10 }} 
            label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5, fill: COLORS.textMuted } : null}
          />
          <YAxis 
            tick={{ fill: COLORS.textMuted, fontSize: 10 }} 
            label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fill: COLORS.textMuted } : null}
          />
          <Tooltip 
            contentStyle={{ 
              background: COLORS.card, 
              border: `1px solid ${COLORS.border}`,
              borderRadius: '4px',
            }}
            labelStyle={{ color: COLORS.text }}
          />
          {showLegend && <Legend wrapperStyle={{ color: COLORS.text }} />}
          {yKeys.map((yKey, index) => {
            const key = typeof yKey === 'string' ? yKey : yKey.key;
            const name = typeof yKey === 'string' ? yKey : yKey.name || key;
            const color = typeof yKey === 'string' ? colors[index % colors.length] : (yKey.color || colors[index % colors.length]);
            
            if (type === 'line') {
              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={name}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  dot={false}
                />
              );
            } else {
              return (
                <Bar
                  key={key}
                  dataKey={key}
                  name={name}
                  fill={color}
                  radius={[2, 2, 0, 0]}
                />
              );
            }
          })}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}

