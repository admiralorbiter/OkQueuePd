// Resume Experiment Dialog Component
import React, { useState, useEffect } from 'react';
import { getIncompleteExperiments, loadExperiment } from '../../utils/ExperimentStorage';
import { loadCheckpoint } from '../../utils/Database';

const COLORS = {
  primary: '#00d4aa',
  secondary: '#ff6b6b',
  tertiary: '#4ecdc4',
  dark: '#0a0f1c',
  darker: '#060912',
  card: '#111827',
  border: '#1e3a5f',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
};

export default function ResumeExperimentDialog({ onResume, onClose }) {
  const [incompleteExperiments, setIncompleteExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExperiment, setSelectedExperiment] = useState(null);
  const [checkpointInfo, setCheckpointInfo] = useState(null);

  useEffect(() => {
    loadIncompleteExperiments();
  }, []);

  const loadIncompleteExperiments = async () => {
    try {
      setLoading(true);
      const experiments = await getIncompleteExperiments();
      setIncompleteExperiments(experiments);
    } catch (error) {
      console.error('Failed to load incomplete experiments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExperiment = async (experiment) => {
    setSelectedExperiment(experiment);
    try {
      const checkpoint = await loadCheckpoint(experiment.id);
      setCheckpointInfo(checkpoint);
    } catch (error) {
      console.error('Failed to load checkpoint:', error);
      // Allow resuming even without checkpoint - will start from beginning
      setCheckpointInfo({ runIndex: 0, partialResults: [] });
    }
  };

  const handleResume = () => {
    if (selectedExperiment && onResume) {
      // Pass checkpoint info, or empty checkpoint to start from beginning
      onResume(selectedExperiment, checkpointInfo || { runIndex: 0, partialResults: [] });
    }
  };

  if (loading) {
    return (
      <div style={{
        padding: '1rem',
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '8px',
        color: COLORS.text
      }}>
        Loading incomplete experiments...
      </div>
    );
  }

  if (incompleteExperiments.length === 0) {
    return null; // Don't show dialog if no incomplete experiments
  }

  return (
    <div style={{
      marginBottom: '1rem',
      padding: '1rem',
      background: COLORS.card,
      border: `1px solid ${COLORS.border}`,
      borderRadius: '8px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
      }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: COLORS.text }}>
          Resume Incomplete Experiments
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: COLORS.textMuted,
              cursor: 'pointer',
              fontSize: '1.2rem',
            }}
          >
            ×
          </button>
        )}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        {incompleteExperiments.map(exp => (
          <div
            key={exp.id}
            onClick={() => handleSelectExperiment(exp)}
            style={{
              padding: '0.75rem',
              marginBottom: '0.5rem',
              background: selectedExperiment?.id === exp.id ? COLORS.darker : COLORS.dark,
              border: `1px solid ${selectedExperiment?.id === exp.id ? COLORS.primary : COLORS.border}`,
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ fontSize: '0.85rem', color: COLORS.text, fontWeight: 500 }}>
              {exp.name || `Experiment ${exp.id.substring(0, 8)}`}
            </div>
            <div style={{ fontSize: '0.7rem', color: COLORS.textMuted, marginTop: '0.25rem' }}>
              Type: {exp.type} | Status: {exp.status} | Created: {new Date(exp.timestamp).toLocaleString()}
            </div>
            {checkpointInfo && selectedExperiment?.id === exp.id && (
              <div style={{ fontSize: '0.7rem', color: COLORS.primary, marginTop: '0.5rem' }}>
                Checkpoint: Run {checkpointInfo.runIndex} completed
                {checkpointInfo.partialResults && (
                  <span> ({checkpointInfo.partialResults.length} results saved)</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedExperiment && (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleResume}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: COLORS.success,
              border: 'none',
              borderRadius: '4px',
              color: COLORS.text,
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            {checkpointInfo && checkpointInfo.runIndex > 0 
              ? `Resume Experiment (from run ${checkpointInfo.runIndex})`
              : 'Start Experiment'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: '0.75rem 1rem',
                background: COLORS.darker,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '4px',
                color: COLORS.text,
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}

