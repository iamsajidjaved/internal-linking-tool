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

    // Basic URL validation
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
      <h1 style={{ marginBottom: 24 }}>Add Domain</h1>

      <div className="card" style={{ maxWidth: 600 }}>
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Domain URL</label>
            <input
              type="text"
              placeholder="https://example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Data Source</label>
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="sitemap">Sitemap XML</option>
              <option value="wordpress">WordPress REST API</option>
            </select>
          </div>

          {source === 'wordpress' && (
            <>
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
              </div>
              <div className="alert alert-info">
                Generate an Application Password in WordPress under Users → Profile → Application Passwords.
              </div>
            </>
          )}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Fetching Content...' : 'Fetch Content'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default DomainInput;
