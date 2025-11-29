// Experiment Library Component - Manage saved experiments
import React, { useState, useEffect } from 'react';
import { 
  listExperiments, 
  deleteExperiment, 
  deleteExperiments,
  getAllTags,
  downloadExperiment,
  downloadAllExperiments,
  getStorageStats,
} from '../../utils/ExperimentStorage';
import ExperimentCard from './ExperimentCard';
import ExperimentDetails from './ExperimentDetails';

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

export default function ExperimentLibrary({ onExperimentSelect, onCompare }) {
  const [experiments, setExperiments] = useState([]);
  const [filteredExperiments, setFilteredExperiments] = useState([]);
  const [selectedExperiments, setSelectedExperiments] = useState(new Set());
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [selectedExperiment, setSelectedExperiment] = useState(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTags, setFilterTags] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  
  const allTags = getAllTags();

  // Load experiments
  useEffect(() => {
    refreshExperiments();
  }, []);

  // Apply filters
  useEffect(() => {
    const filtered = listExperiments({
      search: searchQuery || undefined,
      tags: filterTags.length > 0 ? filterTags : undefined,
      type: filterType || undefined,
      status: filterStatus || undefined,
      sortBy,
      sortOrder,
    });
    setFilteredExperiments(filtered);
  }, [searchQuery, filterTags, filterType, filterStatus, sortBy, sortOrder, experiments]);

  const refreshExperiments = () => {
    const exps = listExperiments({ sortBy, sortOrder });
    setExperiments(exps);
    setFilteredExperiments(exps);
  };

  const handleDelete = (id) => {
    deleteExperiment(id);
    refreshExperiments();
    setSelectedExperiments(new Set([...selectedExperiments].filter(s => s !== id)));
  };

  const handleBulkDelete = () => {
    if (selectedExperiments.size === 0) return;
    if (confirm(`Delete ${selectedExperiments.size} experiment(s)?`)) {
      deleteExperiments([...selectedExperiments]);
      refreshExperiments();
      setSelectedExperiments(new Set());
    }
  };

  const handleExport = (experiment) => {
    downloadExperiment(experiment.id, `experiment-${experiment.id}.json`);
  };

  const handleBulkExport = () => {
    // Export selected experiments individually
    selectedExperiments.forEach(id => {
      const exp = experiments.find(e => e.id === id);
      if (exp) {
        downloadExperiment(exp.id, `experiment-${exp.id}.json`);
      }
    });
  };

  const handleSelectExperiment = (experiment) => {
    setSelectedExperiment(experiment);
  };

  const handleTagFilter = (tag) => {
    setFilterTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleSelectAll = () => {
    if (selectedExperiments.size === filteredExperiments.length) {
      setSelectedExperiments(new Set());
    } else {
      setSelectedExperiments(new Set(filteredExperiments.map(e => e.id)));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedExperiments(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const storageStats = getStorageStats();

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem', color: COLORS.text, margin: 0 }}>
          Experiment Library
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: COLORS.textMuted }}>
            {filteredExperiments.length} experiment{filteredExperiments.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
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
            {viewMode === 'grid' ? 'List' : 'Grid'}
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div style={{ marginBottom: '1rem', padding: '1rem', background: COLORS.darker, borderRadius: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <input
            type="text"
            placeholder="Search experiments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '0.5rem',
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '4px',
              color: COLORS.text,
              fontSize: '0.75rem',
            }}
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: '0.5rem',
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '4px',
              color: COLORS.text,
              fontSize: '0.75rem',
            }}
          >
            <option value="">All Types</option>
            <option value="single_param">Single Param</option>
            <option value="multi_param">Multi Param</option>
            <option value="preset">Preset</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '0.5rem',
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '4px',
              color: COLORS.text,
              fontSize: '0.75rem',
            }}
          >
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="running">Running</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={`${sortBy}_${sortOrder}`}
            onChange={(e) => {
              const [by, order] = e.target.value.split('_');
              setSortBy(by);
              setSortOrder(order);
            }}
            style={{
              padding: '0.5rem',
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '4px',
              color: COLORS.text,
              fontSize: '0.75rem',
            }}
          >
            <option value="timestamp_desc">Newest First</option>
            <option value="timestamp_asc">Oldest First</option>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
          </select>
        </div>

        {/* Tags Filter */}
        {allTags.length > 0 && (
          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ fontSize: '0.7rem', color: COLORS.textMuted, marginBottom: '0.5rem' }}>Filter by Tags:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => handleTagFilter(tag)}
                  style={{
                    padding: '0.25rem 0.75rem',
                    background: filterTags.includes(tag) ? COLORS.primary : COLORS.card,
                    border: `1px solid ${filterTags.includes(tag) ? COLORS.primary : COLORS.border}`,
                    borderRadius: '4px',
                    color: filterTags.includes(tag) ? COLORS.darker : COLORS.text,
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedExperiments.size > 0 && (
          <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: COLORS.card, borderRadius: '4px', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: COLORS.textMuted }}>
              {selectedExperiments.size} selected
            </span>
            <button
              onClick={handleBulkExport}
              style={{
                padding: '0.5rem 1rem',
                background: COLORS.tertiary,
                border: 'none',
                borderRadius: '4px',
                color: COLORS.darker,
                cursor: 'pointer',
                fontSize: '0.7rem',
              }}
            >
              Export Selected
            </button>
            <button
              onClick={handleBulkDelete}
              style={{
                padding: '0.5rem 1rem',
                background: COLORS.secondary,
                border: 'none',
                borderRadius: '4px',
                color: COLORS.text,
                cursor: 'pointer',
                fontSize: '0.7rem',
              }}
            >
              Delete Selected
            </button>
            <button
              onClick={() => setSelectedExperiments(new Set())}
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
              Clear Selection
            </button>
          </div>
        )}
      </div>

      {/* Storage Stats */}
      <div style={{ marginBottom: '1rem', padding: '0.75rem', background: COLORS.darker, borderRadius: '4px', fontSize: '0.7rem', color: COLORS.textMuted }}>
        Storage: {storageStats.storageSizeMB} MB / {storageStats.maxSizeMB} MB ({storageStats.usagePercent}% used)
        <button
          onClick={() => downloadAllExperiments(`all-experiments-${Date.now()}.json`)}
          style={{
            marginLeft: '1rem',
            padding: '0.25rem 0.5rem',
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '4px',
            color: COLORS.text,
            cursor: 'pointer',
            fontSize: '0.65rem',
          }}
        >
          Export All
        </button>
      </div>

      {/* Experiments Grid/List */}
      {selectedExperiment ? (
        <ExperimentDetails
          experiment={selectedExperiment}
          onBack={() => setSelectedExperiment(null)}
          onExport={handleExport}
          onDelete={handleDelete}
          onCompare={onCompare}
        />
      ) : (
        <>
          {filteredExperiments.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: COLORS.textMuted }}>
              <p>No experiments found.</p>
              <p style={{ fontSize: '0.7rem', marginTop: '0.5rem' }}>
                Run an experiment to see it here.
              </p>
            </div>
          ) : (
            <div style={{
              display: viewMode === 'grid' ? 'grid' : 'flex',
              gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : null,
              flexDirection: viewMode === 'list' ? 'column' : null,
              gap: '1rem',
            }}>
              {filteredExperiments.map(experiment => (
                <div key={experiment.id} style={{ position: 'relative' }}>
                  {selectedExperiments.size > 0 && (
                    <input
                      type="checkbox"
                      checked={selectedExperiments.has(experiment.id)}
                      onChange={() => handleToggleSelect(experiment.id)}
                      style={{
                        position: 'absolute',
                        top: '0.5rem',
                        left: '0.5rem',
                        zIndex: 10,
                        width: '1.2rem',
                        height: '1.2rem',
                      }}
                    />
                  )}
                  <ExperimentCard
                    experiment={experiment}
                    selected={selectedExperiments.has(experiment.id)}
                    onSelect={handleSelectExperiment}
                    onExport={handleExport}
                    onDelete={handleDelete}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

