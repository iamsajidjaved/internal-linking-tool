import React, { useEffect, useState } from 'react';
import { getProject, analyzeContent } from '../services/api';

function ContentList({ domain, project: initialProject, navigate }) {
  const [project, setProject] = useState(initialProject);
  const [loading, setLoading] = useState(!initialProject);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!initialProject && domain) {
      loadProject();
    }
  }, [domain]); // eslint-disable-line

  const loadProject = async () => {
    setLoading(true);
    try {
      const data = await getProject(domain);
      setProject(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load project');
    }
    setLoading(false);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError('');
    try {
      const result = await analyzeContent(domain);
      setProject(result.project);
    } catch (err) {
      setError(err.response?.data?.message || 'Analysis failed');
    }
    setAnalyzing(false);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>Loading content...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="card">
        <div className="alert alert-error">No project data. Go to Domain Input to fetch content first.</div>
      </div>
    );
  }

  const articles = project.articles || [];
  const analyzedCount = articles.filter((a) => a.analysis && !a.analysis.error).length;

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Content List</h1>
      <p style={{ marginBottom: 16, color: '#666' }}>{domain}</p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{articles.length}</div>
          <div className="stat-label">Articles</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{analyzedCount}</div>
          <div className="stat-label">Analyzed</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2>Articles ({articles.length})</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handleAnalyze} disabled={analyzing}>
              {analyzing ? 'Analyzing with AI...' : 'Analyze with Gemini'}
            </button>
            {analyzedCount > 0 && (
              <button className="btn btn-success" onClick={() => navigate('suggestions', domain, project)}>
                Generate Link Suggestions →
              </button>
            )}
          </div>
        </div>

        {analyzing && (
          <div className="alert alert-info">
            AI analysis in progress. This may take a few minutes depending on the number of articles...
          </div>
        )}

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>URL</th>
                <th>Type</th>
                <th>Topic</th>
                <th>Keywords</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a, i) => (
                <tr key={i}>
                  <td><strong>{a.title || 'Untitled'}</strong></td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ color: '#4fc3f7' }}>
                      {a.slug || a.url}
                    </a>
                  </td>
                  <td>{a.type}</td>
                  <td>{a.analysis?.main_topic || '—'}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.analysis?.keywords?.join(', ') || '—'}
                  </td>
                  <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ContentList;
