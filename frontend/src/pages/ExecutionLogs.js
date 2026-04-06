import React, { useEffect, useState } from 'react';
import { getLogs, exportReport } from '../services/api';

function ExecutionLogs({ domain, navigate }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (domain) loadLogs();
    else setLoading(false);
  }, [domain]); // eslint-disable-line

  const loadLogs = async () => {
    try {
      const data = await getLogs(domain);
      setLogs(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load logs');
    }
    setLoading(false);
  };

  const handleExport = async (format) => {
    try {
      if (format === 'csv') {
        const response = await fetch(
          `${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}/export?domain=${encodeURIComponent(domain)}&format=csv`
        );
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${Date.now()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const data = await exportReport(domain, 'json');
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${Date.now()}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError('Failed to export report');
    }
  };

  if (!domain) {
    return (
      <div>
        <div className="page-header">
          <h1>Execution Logs 📋</h1>
        </div>
        <div className="card">
          <div className="empty-state">
            <span className="empty-icon">📁</span>
            <h3>No project selected</h3>
            <p>Select a project from the Dashboard first to view its logs.</p>
            <button className="btn btn-primary" onClick={() => navigate('dashboard')}>Go to Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Execution Logs 📋</h1>
            <p className="page-desc">Track all actions and export reports</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2>Activity Log</h2>
          <div className="btn-group">
            <button className="btn btn-secondary btn-sm" onClick={() => handleExport('json')}>
              📥 Export JSON
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleExport('csv')}>
              📊 Export CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner" />
            <p>Loading logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <h3>No log entries yet</h3>
            <p>Actions like fetching, analyzing, and applying will appear here.</p>
          </div>
        ) : (
          <div>
            {logs.slice().reverse().map((log, i) => (
              <div key={i} className="log-entry">
                <span className="log-time">{new Date(log.timestamp).toLocaleString()}</span>
                <span className="log-action">{log.action}</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ExecutionLogs;
