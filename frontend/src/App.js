import React, { useState, useCallback, useEffect } from 'react';
import { listProjects, getProject, deleteProject as apiDeleteProject } from './services/api';
import Dashboard from './pages/Dashboard';
import DomainInput from './pages/DomainInput';
import ProjectPage from './pages/ProjectPage';
import './App.css';

function App() {
  const [page, setPage] = useState('dashboard');
  const [currentDomain, setCurrentDomain] = useState('');
  const [projectData, setProjectData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');

  // Load all projects on mount
  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const data = await listProjects();
      setProjects(data);
    } catch {
      setProjects([]);
    }
    setProjectsLoading(false);
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const navigate = useCallback((p, domain, data) => {
    if (domain) setCurrentDomain(domain);
    if (data) setProjectData(data);
    setPage(p);
    setSidebarOpen(false);
  }, []);

  const selectProject = useCallback(async (domain) => {
    setCurrentDomain(domain);
    try {
      const data = await getProject(domain);
      setProjectData(data);
      setPage('project');
    } catch {
      setPage('project');
    }
    setSidebarOpen(false);
  }, []);

  const handleDeleteProject = useCallback(async (domain) => {
    if (!window.confirm(`Delete project "${domain.replace(/^https?:\/\//, '')}" and all its data?`)) return;
    try {
      await apiDeleteProject(domain);
      setProjects((prev) => prev.filter((p) => p.domain !== domain));
      if (currentDomain === domain) {
        setCurrentDomain('');
        setProjectData(null);
        setPage('dashboard');
      }
    } catch { /* ignore */ }
  }, [currentDomain]);

  // Filter projects by search
  const filteredProjects = projects.filter((p) =>
    p.domain?.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return (
          <Dashboard
            navigate={navigate}
            projects={projects}
            loading={projectsLoading}
            onSelectProject={selectProject}
            onDeleteProject={handleDeleteProject}
            onRefresh={loadProjects}
          />
        );
      case 'input':
        return <DomainInput navigate={navigate} onProjectCreated={loadProjects} setProjectData={setProjectData} />;
      case 'project':
      case 'content':
      case 'suggestions':
      case 'review':
      case 'logs':
      case 'settings':
        return (
          <ProjectPage
            domain={currentDomain}
            project={projectData}
            setProjectData={setProjectData}
            navigateApp={navigate}
          />
        );
      default:
        return (
          <Dashboard
            navigate={navigate}
            projects={projects}
            loading={projectsLoading}
            onSelectProject={selectProject}
            onDeleteProject={handleDeleteProject}
            onRefresh={loadProjects}
          />
        );
    }
  };

  return (
    <div className="app">
      <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
        <span /><span /><span />
      </button>

      <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />

      <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>
            <span className="logo-icon">🔗</span>
            LinkForge AI
          </h2>
        </div>

        {/* Primary nav */}
        <div className="sidebar-section">
          <div className="sidebar-section-label">Navigation</div>
          <ul>
            <li className={page === 'dashboard' ? 'active' : ''} onClick={() => navigate('dashboard')}>
              <span className="nav-icon">📊</span>
              Dashboard
            </li>
            <li className={page === 'input' ? 'active' : ''} onClick={() => navigate('input')}>
              <span className="nav-icon">➕</span>
              New Project
            </li>
          </ul>
        </div>

        {/* Project switcher */}
        <div className="sidebar-section">
          <div className="sidebar-section-label">
            Projects
            <span className="sidebar-count">{projects.length}</span>
          </div>
          {projects.length > 3 && (
            <div className="sidebar-search">
              <input
                type="text"
                placeholder="Search projects..."
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
              />
            </div>
          )}
          <ul className="project-list">
            {projectsLoading ? (
              <li className="project-item-loading">Loading...</li>
            ) : filteredProjects.length === 0 ? (
              <li className="project-item-empty">No projects</li>
            ) : (
              filteredProjects.map((p) => (
                <li
                  key={p.domain}
                  className={`project-item ${currentDomain === p.domain ? 'active' : ''}`}
                  onClick={() => selectProject(p.domain)}
                >
                  <div className="project-item-info">
                    <span className={`project-status-dot status-${p.status}`} />
                    <span className="project-item-name">{p.domain.replace(/^https?:\/\//, '')}</span>
                  </div>
                  <span className="project-item-count">{p.articleCount}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Workflow nav — only when a project is active */}

        <div className="sidebar-footer">
          <div className="sidebar-footer-text">LinkForge AI v1.0</div>
        </div>
      </nav>

      <main className="main-content">
        {/* Top bar */}
        <div className="top-bar">
          <div className="top-bar-left">
            {currentDomain && page !== 'dashboard' && page !== 'input' && (
              <div className="top-bar-breadcrumb">
                <span onClick={() => navigate('dashboard')}>Projects</span>
                <span className="sep">/</span>
                <span className="active-crumb current">
                  {currentDomain.replace(/^https?:\/\//, '')}
                </span>
              </div>
            )}
          </div>
          <div className="top-bar-actions">
            {currentDomain && page !== 'dashboard' && (
              <button className="btn-icon" onClick={() => navigate('dashboard')} title="All Projects">
                ◻
              </button>
            )}
          </div>
        </div>

        <div className="page-container" key={`${page}-${currentDomain}`}>
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;
