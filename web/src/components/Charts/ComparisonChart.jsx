// Comparison Chart Component - Overlay multiple experiments
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

export default function ComparisonChart({
  experiments,
  xKey,
  yKey,
  title,
  xLabel,
  yLabel,
  height = 300,
  colors = [COLORS.primary, COLORS.secondary, COLORS.tertiary, COLORS.quaternary],
}) {
  if (!experiments || experiments.length === 0) {
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
        No experiments to compare
      </div>
    );
  }

  // Prepare data for comparison
  // Each experiment contributes a line
  // We need to normalize the data structure
  const prepareData = () => {
    // For single_param experiments, use the parameter value as X and metric as Y
    // We'll combine all experiments into a unified structure
    
    const maxLength = Math.max(...experiments.map(exp => exp.results?.length || 0));
    const data = [];
    
    // For single parameter sweeps, create points from each experiment
    experiments.forEach((exp, expIndex) => {
      if (exp.type === 'single_param' && exp.results) {
        exp.results.forEach((result, resultIndex) => {
          const xValue = result.value;
          
          // Find or create data point for this X value
          let dataPoint = data.find(d => d[xKey] === xValue);
          if (!dataPoint) {
            dataPoint = { [xKey]: xValue };
            data.push(dataPoint);
          }
          
          // Add this experiment's metric value
          const metricValue = result.metrics?.[yKey];
          if (metricValue !== undefined) {
            dataPoint[`${exp.name || `Experiment ${expIndex + 1}`}`] = metricValue;
          }
        });
      }
    });
    
    // Sort by X value
    data.sort((a, b) => a[xKey] - b[xKey]);
    
    return data;
  };

  const data = prepareData();
  const lineKeys = experiments.map((exp, index) => exp.name || `Experiment ${index + 1}`);

  return (
    <div style={{ width: '100%' }}>
      {title && (
        <h4 style={{ fontSize: '0.75rem', color: COLORS.textMuted, marginBottom: '0.5rem' }}>
          {title}
        </h4>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
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
          <Legend wrapperStyle={{ color: COLORS.text }} />
          {lineKeys.map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={key}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

