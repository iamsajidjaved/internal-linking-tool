import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getProject, analyzeContentStream } from '../services/api';

function ContentList({ domain, project: initialProject, navigate, setProjectData }) {
  const [project, setProject] = useState(initialProject);
  const [loading, setLoading] = useState(!initialProject);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ analyzed: 0, failed: 0, total: 0, remaining: 0 });
  const [currentArticle, setCurrentArticle] = useState('');
  const streamRef = useRef(null);

  useEffect(() => {
    if (!initialProject && domain) {
      loadProject();
    }
  }, [domain]); // eslint-disable-line

  // Clean up SSE on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.close();
    };
  }, []);

  const loadProject = async () => {
    setLoading(true);
    try {
      const data = await getProject(domain);
      setProject(data);
      if (setProjectData) setProjectData(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load project');
    }
    setLoading(false);
  };

  // Update a single article in project state without replacing the whole project
  const updateArticleInPlace = useCallback((articleUpdate) => {
    setProject((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, articles: prev.articles.map((a) =>
        a.url === articleUpdate.url ? { ...a, ...articleUpdate } : a
      )};
      return updated;
    });
  }, []);

  const handleAnalyze = () => {
    setAnalyzing(true);
    setError('');

    const articles = project?.articles || [];
    const alreadyDone = articles.filter((a) => a.analysis && !a.analysis.error).length;
    setProgress({ analyzed: alreadyDone, failed: 0, total: articles.length, remaining: articles.length - alreadyDone });

    const stream = analyzeContentStream(domain, {
      onInit: (data) => {
        setProgress({ analyzed: data.alreadyDone, failed: 0, total: data.total, remaining: data.total - data.alreadyDone });
      },
      onProgress: (data) => {
        setProgress({ analyzed: data.analyzed, failed: data.failed, total: data.total, remaining: data.remaining });
        setCurrentArticle(data.article.title);
        updateArticleInPlace(data.article);
      },
      onDone: (data) => {
        setProgress({ analyzed: data.analyzed, failed: data.failed, total: data.total, remaining: 0 });
        setAnalyzing(false);
        setCurrentArticle('');
        // Reload full project to get final state
        loadProject();
      },
      onError: () => {
        setError('Connection lost. Click "Analyze" to resume — already-analyzed articles will be skipped.');
        setAnalyzing(false);
        setCurrentArticle('');
      },
    });

    streamRef.current = stream;
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
  const progressPct = progress.total > 0 ? Math.round((progress.analyzed / progress.total) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Content Library 📄</h1>
            <p className="page-desc">Fetched articles ready for AI analysis</p>
          </div>
        </div>
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
          <div className="stat-label">Total Articles</div>
        </div>
        <div className="stat-card stat-cyan">
          <span className="stat-icon">🤖</span>
          <div className="stat-value">{analyzing ? progress.analyzed : analyzedCount}</div>
          <div className="stat-label">Analyzed</div>
        </div>
        <div className="stat-card stat-green">
          <span className="stat-icon">⏳</span>
          <div className="stat-value">{analyzing ? progress.remaining : articles.length - analyzedCount}</div>
          <div className="stat-label">Remaining</div>
        </div>
        {analyzing && progress.failed > 0 && (
          <div className="stat-card" style={{ borderBottom: '3px solid var(--red)' }}>
            <span className="stat-icon">❌</span>
            <div className="stat-value" style={{ color: 'var(--red)' }}>{progress.failed}</div>
            <div className="stat-label">Failed</div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Articles ({articles.length})</h2>
          <div className="btn-group">
            <button className="btn btn-primary" onClick={handleAnalyze} disabled={analyzing}>
              {analyzing ? (
                <><span className="pulse-dot" /> Analyzing...</>
              ) : analyzedCount > 0 && analyzedCount < articles.length ? (
                '🤖 Resume Analysis'
              ) : analyzedCount === articles.length ? (
                '🤖 Re-analyze Failed'
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

        {/* Live progress bar */}
        {analyzing && (
          <div style={{ marginBottom: 20 }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm" style={{ fontWeight: 600 }}>
                Processing: {progress.analyzed} / {progress.total}
              </span>
              <span className="text-sm text-muted">{progressPct}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            {currentArticle && (
              <div className="text-sm text-muted mt-2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="pulse-dot" />
                Analyzing: {currentArticle}
              </div>
            )}
          </div>
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
                  <td style={{ maxWidth: 180 }}>
                    {a.analysis?.error ? (
                      <span style={{ color: 'var(--red)', fontSize: '0.8rem' }}>⚠ Failed</span>
                    ) : a.analysis?.main_topic || (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td style={{ maxWidth: 200 }}>
                    {a.analysis?.keywords && a.analysis.keywords.length > 0 ? (
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
