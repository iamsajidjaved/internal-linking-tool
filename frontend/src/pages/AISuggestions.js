import React, { useState, useRef, useCallback } from 'react';
import { generateSuggestionsStream, getProject } from '../services/api';

function AISuggestions({ domain, project, navigate, setProjectData }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // Real-time progress state
  const [total, setTotal] = useState(0);
  const [generated, setGenerated] = useState(0);
  const [failed, setFailed] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [currentArticle, setCurrentArticle] = useState(null);
  const [processedArticles, setProcessedArticles] = useState([]);
  const streamRef = useRef(null);

  const articles = project?.articles || [];
  const analyzedArticles = articles.filter((a) => a.analysis && !a.analysis.error);
  const withSuggestions = articles.filter((a) => a.suggestions && a.suggestions.length > 0);
  const totalLinks = withSuggestions.reduce((sum, a) => sum + a.suggestions.length, 0);

  // Determine button label based on state
  const hasExistingSuggestions = withSuggestions.length > 0;
  const hasFailedSuggestions = articles.some((a) => a._suggestError);
  const allHaveSuggestions = analyzedArticles.length > 0 && analyzedArticles.every(
    (a) => a.suggestions && a.suggestions.length > 0 && !a._suggestError
  );

  let buttonLabel = '✨ Generate Suggestions';
  if (hasExistingSuggestions && !allHaveSuggestions) buttonLabel = '🔄 Resume Suggestions';
  if (allHaveSuggestions) buttonLabel = '🔄 Re-generate All';

  const handleGenerate = useCallback(() => {
    setGenerating(true);
    setError('');
    setDone(false);
    setProcessedArticles([]);
    setCurrentArticle(null);

    streamRef.current = generateSuggestionsStream(domain, {
      onInit: (data) => {
        setTotal(data.total);
        setGenerated(data.alreadyDone);
        setRemaining(data.total - data.alreadyDone);
        if (data.alreadyDone > 0) {
          setProcessedArticles([{
            title: `${data.alreadyDone} articles resumed from previous run`,
            status: 'resumed',
            suggestionCount: null,
          }]);
        }
      },
      onProgress: (data) => {
        setGenerated(data.generated);
        setFailed(data.failed);
        setRemaining(data.remaining);
        setCurrentArticle(data.article);
        setProcessedArticles((prev) => [
          ...prev,
          {
            title: data.article.title,
            url: data.article.url,
            status: data.article.error ? 'failed' : 'done',
            suggestionCount: data.article.suggestionCount || 0,
            error: data.article.error,
          },
        ]);
      },
      onDone: async (data) => {
        setGenerated(data.generated);
        setFailed(data.failed);
        setGenerating(false);
        setDone(true);
        // Refresh full project data
        try {
          const refreshed = await getProject(domain);
          setProjectData(refreshed);
        } catch (_) {}
      },
      onError: () => {
        setError('Connection lost. Your progress is saved — click the button to resume.');
        setGenerating(false);
      },
    });
  }, [domain, setProjectData]);

  const handleStop = () => {
    if (streamRef.current) {
      streamRef.current.close();
      streamRef.current = null;
    }
    setGenerating(false);
    setError('Stopped. Progress is saved — you can resume anytime.');
  };

  const progressPercent = total > 0 ? ((generated + failed) / total) * 100 : 0;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>AI Link Suggestions 🤖</h1>
            <p className="page-desc">Let Gemini discover the best internal linking opportunities</p>
          </div>
        </div>
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
          Suggestions generated! {generated} processed, {failed} failed. Review them below.
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
            <p className="text-sm text-muted mt-2">
              {analyzedArticles.length} analyzed articles ready for suggestion generation
            </p>
          </div>
          <div className="btn-group">
            {generating ? (
              <button className="btn btn-danger" onClick={handleStop}>
                ⏹ Stop
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleGenerate} disabled={analyzedArticles.length === 0}>
                {buttonLabel}
              </button>
            )}
            {withSuggestions.length > 0 && !generating && (
              <button className="btn btn-success" onClick={() => navigate('review', domain, project)}>
                Review & Approve →
              </button>
            )}
          </div>
        </div>

        {/* Live progress section */}
        {generating && (
          <>
            {/* Stats row */}
            <div className="stats-grid" style={{ marginBottom: '1rem' }}>
              <div className="stat-card stat-accent">
                <span className="stat-icon">📄</span>
                <div className="stat-value">{total}</div>
                <div className="stat-label">Total Articles</div>
              </div>
              <div className="stat-card stat-green">
                <span className="stat-icon">✅</span>
                <div className="stat-value">{generated}</div>
                <div className="stat-label">Completed</div>
              </div>
              <div className="stat-card stat-cyan">
                <span className="stat-icon">⏳</span>
                <div className="stat-value">{remaining}</div>
                <div className="stat-label">Remaining</div>
              </div>
              <div className="stat-card" style={{ borderLeft: '4px solid var(--danger)' }}>
                <span className="stat-icon">❌</span>
                <div className="stat-value">{failed}</div>
                <div className="stat-label">Failed</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progressPercent}%`, transition: 'width 0.4s ease' }} />
            </div>
            <div className="text-sm text-muted" style={{ marginTop: '0.5rem', textAlign: 'center' }}>
              {progressPercent.toFixed(1)}% — {generated + failed} of {total} articles processed
            </div>

            {/* Current article */}
            {currentArticle && (
              <div className="alert alert-info" style={{ marginTop: '1rem' }}>
                <span className="alert-icon">🔄</span>
                Processing: <strong>{currentArticle.title}</strong>
                {currentArticle.suggestionCount > 0 && (
                  <span> — {currentArticle.suggestionCount} links found</span>
                )}
              </div>
            )}

            {/* Live log */}
            {processedArticles.length > 0 && (
              <div style={{
                maxHeight: '200px', overflow: 'auto', marginTop: '1rem',
                background: 'var(--bg-main)', borderRadius: '8px', padding: '0.75rem',
                fontSize: '0.85rem', fontFamily: 'monospace'
              }}>
                {processedArticles.map((a, i) => (
                  <div key={i} style={{ padding: '0.25rem 0', borderBottom: '1px solid var(--border)' }}>
                    {a.status === 'resumed' ? (
                      <span style={{ color: 'var(--cyan)' }}>↩ {a.title}</span>
                    ) : a.status === 'failed' ? (
                      <span style={{ color: 'var(--danger)' }}>✗ {a.title} — {a.error}</span>
                    ) : (
                      <span style={{ color: 'var(--success)' }}>✓ {a.title} — {a.suggestionCount} links</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Stats (when not generating) */}
      {!generating && withSuggestions.length > 0 && (
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
          {hasFailedSuggestions && (
            <div className="stat-card" style={{ borderLeft: '4px solid var(--danger)' }}>
              <span className="stat-icon">⚠️</span>
              <div className="stat-value">{articles.filter((a) => a._suggestError).length}</div>
              <div className="stat-label">Failed (Resumable)</div>
            </div>
          )}
        </div>
      )}

      {/* Suggestions table */}
      {!generating && withSuggestions.length > 0 && (
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
