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
      <div className="card">
        <div className="alert alert-info">Select a project first from the Dashboard.</div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Execution Logs</h1>
      <p style={{ marginBottom: 16, color: '#666' }}>{domain}</p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2>Activity Log</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => handleExport('json')}>
              Export JSON
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleExport('csv')}>
              Export CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner" />
            <p>Loading logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="alert alert-info">No log entries yet.</div>
        ) : (
          <div>
            {logs.slice().reverse().map((log, i) => (
              <div key={i} className="log-entry">
                <span className="log-time">{new Date(log.timestamp).toLocaleString()}</span>
                <span className="log-action">{log.action}</span>
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ExecutionLogs;
