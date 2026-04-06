import React, { useState } from 'react';
import { updateSuggestions, applyLinks } from '../services/api';

function ReviewApprove({ domain, project, navigate, setProjectData }) {
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [localSuggestions, setLocalSuggestions] = useState({});
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const articles = (project?.articles || []).filter(
    (a) => a.suggestions && a.suggestions.length > 0
  );

  const getSuggestions = (article) => {
    return localSuggestions[article.url] || article.suggestions || [];
  };

  const updateLocalSuggestion = (articleUrl, index, updates) => {
    const current = getSuggestions(articles.find((a) => a.url === articleUrl));
    const updated = current.map((s, i) => (i === index ? { ...s, ...updates } : s));
    setLocalSuggestions({ ...localSuggestions, [articleUrl]: updated });
  };

  const handleSave = async (article) => {
    setSaving(true);
    setError('');
    try {
      const suggestions = getSuggestions(article);
      await updateSuggestions(domain, article.url, suggestions);
      setSuccess(`Saved suggestions for "${article.title}"`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    }
    setSaving(false);
  };

  const handleApply = async (article) => {
    if (!window.confirm(`Apply approved links to "${article.title}"? This will modify the WordPress post content.`)) {
      return;
    }
    setApplying(article.url);
    setError('');
    try {
      await applyLinks({ domain, articleUrl: article.url });
      setSuccess(`Successfully applied links to "${article.title}"!`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to apply links');
    }
    setApplying('');
  };

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Review & Approve</h1>
      <p style={{ marginBottom: 16, color: '#666' }}>{domain}</p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {articles.length === 0 ? (
        <div className="card">
          <div className="alert alert-info">
            No suggestions to review. Go to AI Suggestions page first.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 24 }}>
          {/* Article list */}
          <div style={{ width: 300, flexShrink: 0 }}>
            <div className="card">
              <h3>Articles ({articles.length})</h3>
              <div style={{ marginTop: 12 }}>
                {articles.map((a, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedArticle(a)}
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      background: selectedArticle?.url === a.url ? '#e3f2fd' : 'transparent',
                      borderRadius: 8,
                      marginBottom: 4,
                      borderLeft: selectedArticle?.url === a.url ? '3px solid #4fc3f7' : '3px solid transparent',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{a.title}</div>
                    <div style={{ fontSize: '0.75rem', color: '#888' }}>
                      {(a.suggestions || []).length} suggestions
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Suggestion details */}
          <div style={{ flex: 1 }}>
            {selectedArticle ? (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2>{selectedArticle.title}</h2>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => handleSave(selectedArticle)} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleApply(selectedArticle)}
                      disabled={applying === selectedArticle.url}
                    >
                      {applying === selectedArticle.url ? 'Applying...' : 'Apply to WordPress'}
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 16 }}>
                  <a href={selectedArticle.url} target="_blank" rel="noopener noreferrer" style={{ color: '#4fc3f7' }}>
                    {selectedArticle.url}
                  </a>
                </p>

                {getSuggestions(selectedArticle).map((s, i) => (
                  <div key={i} className={`suggestion-card ${s.approved === true ? 'approved' : s.approved === false ? 'rejected' : ''}`}>
                    <div className="suggestion-header">
                      <div>
                        <strong>Link #{i + 1}</strong>
                        {s.relevance_score && (
                          <span className={`score ${s.relevance_score > 0.7 ? 'score-high' : s.relevance_score > 0.4 ? 'score-medium' : 'score-low'}`} style={{ marginLeft: 12 }}>
                            Relevance: {(s.relevance_score * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="suggestion-meta">
                      <strong>Target:</strong>{' '}
                      <a href={s.target_url} target="_blank" rel="noopener noreferrer" style={{ color: '#4fc3f7' }}>
                        {s.target_title || s.target_url}
                      </a>
                    </div>

                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <label style={{ fontSize: '0.8rem' }}>Anchor Text</label>
                      <input
                        className="anchor-edit"
                        value={s.anchor_text}
                        onChange={(e) => updateLocalSuggestion(selectedArticle.url, i, { anchor_text: e.target.value })}
                      />
                    </div>

                    <div className="suggestion-meta">
                      <strong>Placement:</strong> {s.placement_hint}
                    </div>

                    <div className="suggestion-actions">
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => updateLocalSuggestion(selectedArticle.url, i, { approved: true })}
                      >
                        ✓ Approve
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => updateLocalSuggestion(selectedArticle.url, i, { approved: false })}
                      >
                        ✗ Reject
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => updateLocalSuggestion(selectedArticle.url, i, { approved: undefined })}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card">
                <div className="alert alert-info">Select an article from the left to review its link suggestions.</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ReviewApprove;
