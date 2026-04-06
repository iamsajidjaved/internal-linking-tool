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
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <h3>No project loaded</h3>
          <p>Go to Add Domain to fetch content first.</p>
          <button className="btn btn-primary" onClick={() => navigate('input')}>Add Domain</button>
        </div>
      </div>
    );
  }

  const articles = project.articles || [];
  const analyzedCount = articles.filter((a) => a.analysis && !a.analysis.error).length;
  const progress = articles.length > 0 ? Math.round((analyzedCount / articles.length) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <div className="breadcrumb">
          <span onClick={() => navigate('dashboard')}>Dashboard</span>
          <span className="sep">›</span>
          <span>{domain?.replace(/^https?:\/\//, '')}</span>
          <span className="sep">›</span>
          <span>Content</span>
        </div>
        <h1>Content Library 📄</h1>
        <p className="page-desc">Fetched articles ready for AI analysis</p>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {error}
        </div>
      )}

      {/* Workflow steps */}
      <div className="workflow-steps">
        <div className="workflow-step done"><span className="step-num">✓</span><span>Fetch</span></div>
        <div className="step-connector done" />
        <div className="workflow-step active"><span className="step-num">2</span><span>Analyze</span></div>
        <div className="step-connector" />
        <div className="workflow-step"><span className="step-num">3</span><span>Suggest</span></div>
        <div className="step-connector" />
        <div className="workflow-step"><span className="step-num">4</span><span>Apply</span></div>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-accent">
          <span className="stat-icon">📝</span>
          <div className="stat-value">{articles.length}</div>
          <div className="stat-label">Articles</div>
        </div>
        <div className="stat-card stat-cyan">
          <span className="stat-icon">🤖</span>
          <div className="stat-value">{analyzedCount}</div>
          <div className="stat-label">Analyzed</div>
        </div>
        <div className="stat-card stat-green">
          <span className="stat-icon">📈</span>
          <div className="stat-value">{progress}%</div>
          <div className="stat-label">Progress</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Articles ({articles.length})</h2>
          <div className="btn-group">
            <button className="btn btn-primary" onClick={handleAnalyze} disabled={analyzing}>
              {analyzing ? (
                <><span className="pulse-dot" /> Analyzing with AI...</>
              ) : (
                '🤖 Analyze with Gemini'
              )}
            </button>
            {analyzedCount > 0 && (
              <button className="btn btn-success" onClick={() => navigate('suggestions', domain, project)}>
                Generate Suggestions →
              </button>
            )}
          </div>
        </div>

        {analyzing && (
          <>
            <div className="alert alert-info">
              <span className="alert-icon">⏳</span>
              AI analysis in progress. This may take a few minutes depending on article count...
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '60%' }} />
            </div>
          </>
        )}

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Topic</th>
                <th>Keywords</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{a.title || 'Untitled'}</div>
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="link text-sm truncate" style={{ maxWidth: 250, display: 'inline-block' }}>
                      {a.slug || a.url}
                    </a>
                  </td>
                  <td>
                    <span className="badge" style={{ background: a.type === 'post' ? '#eef2ff' : a.type === 'page' ? '#faf5ff' : '#f0fdfa', color: a.type === 'post' ? '#4338ca' : a.type === 'page' ? '#7c3aed' : '#0d9488' }}>
                      {a.type}
                    </span>
                  </td>
                  <td style={{ maxWidth: 180 }}>{a.analysis?.main_topic || <span className="text-muted">—</span>}</td>
                  <td style={{ maxWidth: 200 }}>
                    {a.analysis?.keywords ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {a.analysis.keywords.slice(0, 3).map((kw, j) => (
                          <span key={j} style={{ background: '#f0f2ff', color: '#4338ca', padding: '2px 8px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600 }}>
                            {kw}
                          </span>
                        ))}
                        {a.analysis.keywords.length > 3 && (
                          <span className="text-muted text-sm">+{a.analysis.keywords.length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
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
