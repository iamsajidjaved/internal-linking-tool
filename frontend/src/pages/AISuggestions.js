import React, { useState } from 'react';
import { generateSuggestions } from '../services/api';

function AISuggestions({ domain, project, navigate, setProjectData }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const articles = project?.articles || [];
  const withSuggestions = articles.filter((a) => a.suggestions && a.suggestions.length > 0);

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
      <h1 style={{ marginBottom: 24 }}>AI Link Suggestions</h1>
      <p style={{ marginBottom: 16, color: '#666' }}>{domain}</p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2>Generate Linking Plan</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generating with Gemini...' : 'Generate Suggestions'}
            </button>
            {withSuggestions.length > 0 && (
              <button className="btn btn-success" onClick={() => navigate('review', domain, project)}>
                Review & Approve →
              </button>
            )}
          </div>
        </div>

        {generating && (
          <div className="alert alert-info">
            Gemini is analyzing your content and generating internal linking opportunities. This may take several minutes...
          </div>
        )}

        {done && <div className="alert alert-success">Suggestions generated successfully!</div>}
      </div>

      {withSuggestions.length > 0 && (
        <div className="card">
          <h2>Suggestions Overview ({withSuggestions.length} articles)</h2>
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
                      <td><strong>{a.title}</strong></td>
                      <td>{a.suggestions.length}</td>
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

      {!generating && withSuggestions.length === 0 && !done && (
        <div className="card">
          <div className="alert alert-info">
            Click "Generate Suggestions" to have Gemini analyze your content and suggest internal links.
            Make sure you've analyzed your content first on the Content List page.
          </div>
        </div>
      )}
    </div>
  );
}

export default AISuggestions;
