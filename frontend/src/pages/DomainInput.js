import React, { useState } from 'react';
import { fetchContent } from '../services/api';

function DomainInput({ navigate }) {
  const [domain, setDomain] = useState('');
  const [source, setSource] = useState('sitemap');
  const [wpUsername, setWpUsername] = useState('');
  const [wpAppPassword, setWpAppPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!domain) {
      setError('Please enter a domain');
      return;
    }

    let normalizedDomain = domain.trim();
    if (!normalizedDomain.startsWith('http')) {
      normalizedDomain = 'https://' + normalizedDomain;
    }

    setLoading(true);
    try {
      const payload = { domain: normalizedDomain, source };
      if (source === 'wordpress') {
        payload.wpUsername = wpUsername;
        payload.wpAppPassword = wpAppPassword;
      }

      const result = await fetchContent(payload);
      navigate('content', normalizedDomain, result.project);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch content');
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <div className="breadcrumb">
          <span onClick={() => navigate('dashboard')}>Dashboard</span>
          <span className="sep">›</span>
          <span>Add Domain</span>
        </div>
        <h1>Add a new domain 🌐</h1>
        <p className="page-desc">Enter your WordPress site to start discovering internal linking opportunities</p>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Domain URL</label>
            <input
              type="text"
              placeholder="https://yourblog.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
            <div className="form-hint">Enter your WordPress website URL</div>
          </div>

          <div className="form-group">
            <label>Data Source</label>
            <div className="form-radio-group">
              <div
                className={`radio-option ${source === 'sitemap' ? 'selected' : ''}`}
                onClick={() => setSource('sitemap')}
              >
                <span className="radio-icon">🗺️</span>
                <span className="radio-label">Sitemap XML</span>
                <span className="radio-desc">Parse sitemap_index.xml automatically</span>
              </div>
              <div
                className={`radio-option ${source === 'wordpress' ? 'selected' : ''}`}
                onClick={() => setSource('wordpress')}
              >
                <span className="radio-icon">⚡</span>
                <span className="radio-label">WordPress API</span>
                <span className="radio-desc">Fetch via REST API with auth</span>
              </div>
            </div>
          </div>

          {source === 'wordpress' && (
            <>
              <hr className="divider" />
              <div className="form-group">
                <label>WordPress Username</label>
                <input
                  type="text"
                  placeholder="admin"
                  value={wpUsername}
                  onChange={(e) => setWpUsername(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Application Password</label>
                <input
                  type="password"
                  placeholder="xxxx xxxx xxxx xxxx"
                  value={wpAppPassword}
                  onChange={(e) => setWpAppPassword(e.target.value)}
                />
                <div className="form-hint">Generate in WordPress: Users → Profile → Application Passwords</div>
              </div>
            </>
          )}

          <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ marginTop: 8, width: '100%' }}>
            {loading ? (
              <>
                <span className="pulse-dot" />
                Fetching Content...
              </>
            ) : (
              'Fetch & Analyze Content →'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default DomainInput;
