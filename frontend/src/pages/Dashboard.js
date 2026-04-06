import React, { useState } from 'react';
import { getSettings, saveSettings } from '../services/api';

const STATUS_META = {
  fetched: { label: 'Fetched', color: '#3b82f6', bg: '#eff6ff' },
  analyzed: { label: 'Analyzed', color: '#8b5cf6', bg: '#f5f3ff' },
  suggestions_ready: { label: 'Suggestions', color: '#06b6d4', bg: '#ecfeff' },
  reviewed: { label: 'Reviewed', color: '#f59e0b', bg: '#fffbeb' },
  applied: { label: 'Applied', color: '#10b981', bg: '#ecfdf5' },
  unknown: { label: 'Unknown', color: '#9ca3af', bg: '#f9fafb' },
};

function Dashboard({ navigate, projects, loading, onSelectProject, onDeleteProject, onRefresh }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [filterStatus, setFilterStatus] = useState('all');

  // Edit modal state
  const [editDomain, setEditDomain] = useState(null);
  const [editForm, setEditForm] = useState({ geminiApiKey: '', wpUsername: '', wpAppPassword: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState('');

  const openEdit = async (domain, e) => {
    e.stopPropagation();
    setEditDomain(domain);
    setEditForm({ geminiApiKey: '', wpUsername: '', wpAppPassword: '' });
    setEditMsg('');
    setEditLoading(true);
    try {
      const s = await getSettings(domain);
      setEditForm({
        geminiApiKey: s.geminiApiKey || '',
        wpUsername: s.wpUsername || '',
        wpAppPassword: s.wpAppPassword || '',
      });
    } catch { /* silent */ }
    setEditLoading(false);
  };

  const handleEditSave = async () => {
    setEditSaving(true);
    setEditMsg('');
    try {
      await saveSettings({ domain: editDomain, ...editForm });
      setEditMsg('Saved!');
      setTimeout(() => { setEditMsg(''); setEditDomain(null); }, 1200);
    } catch {
      setEditMsg('Failed to save');
    }
    setEditSaving(false);
  };

  const totalArticles = projects.reduce((sum, p) => sum + (p.articleCount || 0), 0);
  const statusCounts = projects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  // Filter & sort
  let filtered = projects.filter((p) =>
    p.domain?.toLowerCase().includes(search.toLowerCase())
  );
  if (filterStatus !== 'all') {
    filtered = filtered.filter((p) => p.status === filterStatus);
  }
  filtered.sort((a, b) => {
    if (sortBy === 'recent') return new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0);
    if (sortBy === 'name') return a.domain.localeCompare(b.domain);
    if (sortBy === 'articles') return (b.articleCount || 0) - (a.articleCount || 0);
    return 0;
  });

  const getStatusMeta = (status) => STATUS_META[status] || STATUS_META.unknown;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Projects</h1>
            <p className="page-desc">Manage all your internal linking projects</p>
          </div>
          <div className="page-header-actions">
            <button className="btn btn-ghost btn-sm" onClick={onRefresh}>↻ Refresh</button>
            <button className="btn btn-primary" onClick={() => navigate('input')}>+ New Project</button>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="stats-row">
        <div className="stat-pill">
          <span className="stat-pill-value">{projects.length}</span>
          <span className="stat-pill-label">Projects</span>
        </div>
        <div className="stat-pill">
          <span className="stat-pill-value">{totalArticles}</span>
          <span className="stat-pill-label">Total Articles</span>
        </div>
        {Object.entries(statusCounts).map(([status, count]) => {
          const meta = getStatusMeta(status);
          return (
            <div
              key={status}
              className={`stat-pill clickable ${filterStatus === status ? 'active' : ''}`}
              onClick={() => setFilterStatus(filterStatus === status ? 'all' : status)}
            >
              <span className="stat-pill-value" style={{ color: meta.color }}>{count}</span>
              <span className="stat-pill-label">{meta.label}</span>
            </div>
          );
        })}
      </div>

      {/* Search + Sort bar */}
      <div className="toolbar">
        <div className="toolbar-search">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="toolbar-controls">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="toolbar-select">
            <option value="recent">Recent First</option>
            <option value="name">Name A-Z</option>
            <option value="articles">Most Articles</option>
          </select>
          {filterStatus !== 'all' && (
            <button className="btn btn-ghost btn-xs" onClick={() => setFilterStatus('all')}>
              ✕ Clear filter
            </button>
          )}
        </div>
      </div>

      {/* Projects grid */}
      {loading ? (
        <div className="loading">
          <div className="spinner" />
          <p>Loading projects...</p>
        </div>
      ) : filtered.length === 0 && projects.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-icon">🚀</span>
            <h3>No projects yet</h3>
            <p>Add your first WordPress domain to start generating SEO-optimized internal links with AI.</p>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('input')}>+ Create First Project</button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-icon">🔍</span>
            <h3>No matching projects</h3>
            <p>Try a different search term or clear filters.</p>
          </div>
        </div>
      ) : (
        <div className="project-grid">
          {filtered.map((p) => {
            const meta = getStatusMeta(p.status);
            const domainShort = p.domain.replace(/^https?:\/\//, '');
            return (
              <div key={p.domain} className="project-card" onClick={() => onSelectProject(p.domain)}>
                <div className="project-card-top">
                  <div className="project-card-domain">
                    <span className="project-card-favicon">
                      {domainShort.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <h3>{domainShort}</h3>
                      <span className="text-sm text-muted">{p.articleCount || 0} articles</span>
                    </div>
                  </div>
                  <div className="project-card-actions">
                    <button
                      className="btn-icon-sm"
                      onClick={(e) => openEdit(p.domain, e)}
                      title="Edit settings"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      className="btn-icon-sm danger"
                      onClick={(e) => { e.stopPropagation(); onDeleteProject(p.domain); }}
                      title="Delete project"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Progress indicator */}
                <div className="project-card-progress">
                  <div className="progress-steps-mini">
                    {['fetched', 'analyzed', 'suggestions_ready', 'applied'].map((s, i) => {
                      const reached = ['fetched', 'analyzed', 'suggestions_ready', 'reviewed', 'applied'].indexOf(p.status) >= i;
                      return (
                        <React.Fragment key={s}>
                          {i > 0 && <div className={`step-line ${reached ? 'done' : ''}`} />}
                          <div className={`step-dot ${reached ? 'done' : ''}`} />
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                <div className="project-card-footer">
                  <span className="project-status-badge" style={{ color: meta.color, background: meta.bg }}>
                    {meta.label}
                  </span>
                  {p.lastUpdated && (
                    <span className="text-xs text-muted">
                      {new Date(p.lastUpdated).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* New project card */}
          <div className="project-card project-card-new" onClick={() => navigate('input')}>
            <div className="new-project-content">
              <span className="new-project-icon">+</span>
              <span>New Project</span>
            </div>
          </div>
        </div>
      )}

      {/* Edit settings modal */}
      {editDomain && (
        <div className="modal-overlay" onClick={() => setEditDomain(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚙️ Settings — {editDomain.replace(/^https?:\/\//, '')}</h3>
              <button className="btn-icon-sm" onClick={() => setEditDomain(null)}>✕</button>
            </div>
            {editLoading ? (
              <p className="text-muted" style={{ padding: 20, textAlign: 'center' }}>Loading...</p>
            ) : (
              <div className="modal-body">
                <div className="form-group">
                  <label>🤖 Gemini API Key</label>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={editForm.geminiApiKey}
                    onChange={(e) => setEditForm((f) => ({ ...f, geminiApiKey: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>🌐 WordPress Username</label>
                  <input
                    type="text"
                    placeholder="admin"
                    value={editForm.wpUsername}
                    onChange={(e) => setEditForm((f) => ({ ...f, wpUsername: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>🔑 Application Password</label>
                  <input
                    type="password"
                    placeholder="xxxx xxxx xxxx xxxx"
                    value={editForm.wpAppPassword}
                    onChange={(e) => setEditForm((f) => ({ ...f, wpAppPassword: e.target.value }))}
                  />
                </div>
                <div className="flex gap-3" style={{ marginTop: 16, alignItems: 'center', justifyContent: 'space-between' }}>
                  <button className="btn btn-ghost" onClick={() => setEditDomain(null)}>Cancel</button>
                  <div className="flex gap-3" style={{ alignItems: 'center' }}>
                    {editMsg && <span className="text-sm" style={{ color: editMsg === 'Saved!' ? 'var(--green)' : 'var(--red)' }}>{editMsg}</span>}
                    <button className="btn btn-primary" onClick={handleEditSave} disabled={editSaving}>
                      {editSaving ? 'Saving...' : '💾 Save'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
