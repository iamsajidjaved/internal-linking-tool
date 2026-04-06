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

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{projects.length}</div>
          <div className="stat-label">Projects</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalArticles}</div>
          <div className="stat-label">Total Articles</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
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
          <div className="alert alert-info">
            No projects yet. Click "New Project" to get started.
          </div>
        ) : (
          <div className="project-grid">
            {projects.map((p, i) => (
              <div key={i} className="project-card" onClick={() => navigate('content', p.domain)}>
                <h3>{p.domain}</h3>
                <p style={{ margin: '8px 0', color: '#666' }}>{p.articleCount} articles</p>
                <span className={`badge badge-${p.status}`}>{p.status}</span>
                {p.lastUpdated && (
                  <p style={{ marginTop: 8, fontSize: '0.8rem', color: '#999' }}>
                    Last updated: {new Date(p.lastUpdated).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
