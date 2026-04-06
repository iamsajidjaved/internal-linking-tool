import React, { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '../services/api';

function Settings({ domain }) {
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [wpUsername, setWpUsername] = useState('');
  const [wpAppPassword, setWpAppPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [hasWpCredentials, setHasWpCredentials] = useState(false);

  useEffect(() => {
    if (!domain) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getSettings(domain)
      .then((data) => {
        setGeminiApiKey(data.geminiApiKey || '');
        setWpUsername(data.wpUsername || '');
        setWpAppPassword(data.wpAppPassword || '');
        setHasGeminiKey(data.hasGeminiKey);
        setHasWpCredentials(data.hasWpCredentials);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [domain]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const result = await saveSettings({
        domain,
        geminiApiKey,
        wpUsername,
        wpAppPassword,
      });
      setGeminiApiKey(result.geminiApiKey || '');
      setWpAppPassword(result.wpAppPassword || '');
      setWpUsername(result.wpUsername || '');
      setHasGeminiKey(result.hasGeminiKey);
      setHasWpCredentials(result.hasWpCredentials);
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings');
    }
    setSaving(false);
  };

  if (!domain) {
    return (
      <div>
        <div className="page-header">
          <h1>Settings ⚙️</h1>
          <p className="page-desc">Configure API keys and WordPress credentials</p>
        </div>
        <div className="card">
          <div className="empty-state">
            <span className="empty-icon">📁</span>
            <h3>No project selected</h3>
            <p>Select a project from the sidebar to configure its settings.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1>Settings ⚙️</h1>
        </div>
        <div className="card"><p>Loading settings...</p></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Settings ⚙️</h1>
            <p className="page-desc">
              Configure API keys and WordPress credentials for{' '}
              <strong>{domain.replace(/^https?:\/\//, '')}</strong>
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <span className="alert-icon">✅</span>
          {success}
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Gemini API Key — Per Project */}
        <div className="card">
          <h3>🤖 Gemini API Key</h3>
          <p className="text-sm text-muted mb-4">
            Get your API key from{' '}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
              Google AI Studio
            </a>.
            Each project stores its own key.
          </p>
          <div className="settings-status">
            {hasGeminiKey ? (
              <span className="score score-high">✓ Configured</span>
            ) : (
              <span className="score score-low">✕ Not configured</span>
            )}
          </div>
          <div className="form-group">
            <label>API Key</label>
            <input
              type="password"
              className="form-input"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder={hasGeminiKey ? 'Enter new key to update' : 'AIzaSy...'}
            />
          </div>
        </div>

        {/* WordPress Credentials — Per Project */}
        <div className="card mt-4">
          <h3>🌐 WordPress Credentials</h3>
          <p className="text-sm text-muted mb-4">
            Required to push internal links to WordPress. Uses{' '}
            <a href="https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/" target="_blank" rel="noopener noreferrer">
              Application Passwords
            </a>{' '}
            for authentication. Each project stores its own credentials.
          </p>
          <div className="settings-status">
            {hasWpCredentials ? (
              <span className="score score-high">✓ Configured</span>
            ) : (
              <span className="score score-low">✕ Not configured</span>
            )}
          </div>
          <div className="form-group">
            <label>WordPress Username</label>
            <input
              type="text"
              className="form-input"
              value={wpUsername}
              onChange={(e) => setWpUsername(e.target.value)}
              placeholder="admin"
            />
          </div>
          <div className="form-group mt-3">
            <label>Application Password</label>
            <input
              type="password"
              className="form-input"
              value={wpAppPassword}
              onChange={(e) => setWpAppPassword(e.target.value)}
              placeholder={hasWpCredentials ? 'Enter new password to update' : 'xxxx xxxx xxxx xxxx xxxx xxxx'}
            />
            <span className="text-sm text-muted">
              Generate at WordPress Admin → Users → Profile → Application Passwords
            </span>
          </div>
        </div>

        <div className="mt-4">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : '💾 Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Settings;
