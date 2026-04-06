import React, { useState } from 'react';
import { generateSuggestions } from '../services/api';

function AISuggestions({ domain, project, navigate, setProjectData }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const articles = project?.articles || [];
  const withSuggestions = articles.filter((a) => a.suggestions && a.suggestions.length > 0);
  const totalLinks = withSuggestions.reduce((sum, a) => sum + a.suggestions.length, 0);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const result = await generateSuggestions(domain);
      setProjectData(result.project);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate suggestions');
    }
    setGenerating(false);
  };

  return (
    <div>
      <div className="page-header">
        <div className="breadcrumb">
          <span onClick={() => navigate('dashboard')}>Dashboard</span>
          <span className="sep">›</span>
          <span>{domain?.replace(/^https?:\/\//, '')}</span>
          <span className="sep">›</span>
          <span>AI Suggestions</span>
        </div>
        <h1>AI Link Suggestions 🤖</h1>
        <p className="page-desc">Let Gemini discover the best internal linking opportunities</p>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {error}
        </div>
      )}
      {done && !error && (
        <div className="alert alert-success">
          <span className="alert-icon">🎉</span>
          Suggestions generated successfully! Review them below.
        </div>
      )}

      {/* Workflow steps */}
      <div className="workflow-steps">
        <div className="workflow-step done"><span className="step-num">✓</span><span>Fetch</span></div>
        <div className="step-connector done" />
        <div className="workflow-step done"><span className="step-num">✓</span><span>Analyze</span></div>
        <div className="step-connector done" />
        <div className="workflow-step active"><span className="step-num">3</span><span>Suggest</span></div>
        <div className="step-connector" />
        <div className="workflow-step"><span className="step-num">4</span><span>Apply</span></div>
      </div>

      {/* Generate card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2>Generate Linking Plan</h2>
            <p className="text-sm text-muted mt-2">Gemini will analyze all articles and find contextual linking opportunities</p>
          </div>
          <div className="btn-group">
            <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <><span className="pulse-dot" /> Generating...</>
              ) : (
                '✨ Generate Suggestions'
              )}
            </button>
            {withSuggestions.length > 0 && (
              <button className="btn btn-success" onClick={() => navigate('review', domain, project)}>
                Review & Approve →
              </button>
            )}
          </div>
        </div>

        {generating && (
          <>
            <div className="alert alert-info">
              <span className="alert-icon">🔄</span>
              Gemini is analyzing your content and building an internal linking strategy. This may take several minutes...
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '45%' }} />
            </div>
          </>
        )}
      </div>

      {/* Stats */}
      {withSuggestions.length > 0 && (
        <div className="stats-grid">
          <div className="stat-card stat-accent">
            <span className="stat-icon">📄</span>
            <div className="stat-value">{withSuggestions.length}</div>
            <div className="stat-label">Articles with Links</div>
          </div>
          <div className="stat-card stat-cyan">
            <span className="stat-icon">🔗</span>
            <div className="stat-value">{totalLinks}</div>
            <div className="stat-label">Total Suggestions</div>
          </div>
          <div className="stat-card stat-green">
            <span className="stat-icon">📊</span>
            <div className="stat-value">{articles.length > 0 ? (totalLinks / Math.max(withSuggestions.length, 1)).toFixed(1) : 0}</div>
            <div className="stat-label">Avg Links / Article</div>
          </div>
        </div>
      )}

      {/* Suggestions table */}
      {withSuggestions.length > 0 && (
        <div className="card">
          <h2 className="mb-4">Suggestions Overview</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Suggested Links</th>
                  <th>Avg Relevance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {withSuggestions.map((a, i) => {
                  const avgScore = a.suggestions.reduce((sum, s) => sum + (s.relevance_score || 0), 0) / a.suggestions.length;
                  return (
                    <tr key={i}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{a.title}</div>
                        <div className="text-sm text-muted">{a.slug}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent)' }}>
                          {a.suggestions.length}
                        </span>
                        <span className="text-muted text-sm"> links</span>
                      </td>
                      <td>
                        <span className={`score ${avgScore > 0.7 ? 'score-high' : avgScore > 0.4 ? 'score-medium' : 'score-low'}`}>
                          {(avgScore * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!generating && withSuggestions.length === 0 && !done && (
        <div className="card">
          <div className="empty-state">
            <span className="empty-icon">💡</span>
            <h3>No suggestions yet</h3>
            <p>Click "Generate Suggestions" to have Gemini analyze your content and recommend internal links. Make sure you've analyzed your content first.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AISuggestions;
