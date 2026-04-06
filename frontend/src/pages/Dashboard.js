import React, { useEffect, useState } from 'react';
import { listProjects } from '../services/api';

function Dashboard({ navigate }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await listProjects();
      setProjects(data);
    } catch {
      // No projects yet
    }
    setLoading(false);
  };

  const totalArticles = projects.reduce((sum, p) => sum + (p.articleCount || 0), 0);
  const analyzedProjects = projects.filter((p) => p.status === 'analyzed' || p.status === 'suggestions_ready' || p.status === 'reviewed' || p.status === 'applied').length;

  return (
    <div>
      <div className="page-header">
        <h1>Welcome back 👋</h1>
        <p className="page-desc">Your AI-powered internal linking command center</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-accent">
          <span className="stat-icon">📁</span>
          <div className="stat-value">{projects.length}</div>
          <div className="stat-label">Projects</div>
        </div>
        <div className="stat-card stat-cyan">
          <span className="stat-icon">📝</span>
          <div className="stat-value">{totalArticles}</div>
          <div className="stat-label">Total Articles</div>
        </div>
        <div className="stat-card stat-green">
          <span className="stat-icon">✨</span>
          <div className="stat-value">{analyzedProjects}</div>
          <div className="stat-label">Analyzed</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Your Projects</h2>
          <button className="btn btn-primary" onClick={() => navigate('input')}>
            + New Project
          </button>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner" />
            <p>Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🚀</span>
            <h3>No projects yet</h3>
            <p>Add your first WordPress domain to start generating SEO-optimized internal links with AI.</p>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('input')}>
              + Create First Project
            </button>
          </div>
        ) : (
          <div className="project-grid">
            {projects.map((p, i) => (
              <div key={i} className="project-card" onClick={() => navigate('content', p.domain)}>
                <h3>{p.domain.replace(/^https?:\/\//, '')}</h3>
                <div className="project-articles">
                  {p.articleCount || 0}
                  <span>articles</span>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className={`badge badge-${p.status}`}>{p.status}</span>
                  {p.lastUpdated && (
                    <span className="text-sm text-muted">
                      {new Date(p.lastUpdated).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick start workflow guide */}
      {projects.length === 0 && (
        <div className="card">
          <h2>How it works</h2>
          <div className="workflow-steps mt-4">
            <div className="workflow-step active">
              <span className="step-num">1</span>
              <span>Add Domain</span>
            </div>
            <div className="step-connector" />
            <div className="workflow-step">
              <span className="step-num">2</span>
              <span>Fetch Content</span>
            </div>
            <div className="step-connector" />
            <div className="workflow-step">
              <span className="step-num">3</span>
              <span>AI Analysis</span>
            </div>
            <div className="step-connector" />
            <div className="workflow-step">
              <span className="step-num">4</span>
              <span>Review & Apply</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
