import React, { useState, useCallback } from 'react';
import Dashboard from './pages/Dashboard';
import DomainInput from './pages/DomainInput';
import ContentList from './pages/ContentList';
import AISuggestions from './pages/AISuggestions';
import ReviewApprove from './pages/ReviewApprove';
import ExecutionLogs from './pages/ExecutionLogs';
import './App.css';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊', step: null },
  { key: 'input', label: 'Add Domain', icon: '🌐', step: '1' },
  { key: 'content', label: 'Content', icon: '📄', step: '2' },
  { key: 'suggestions', label: 'AI Suggestions', icon: '🤖', step: '3' },
  { key: 'review', label: 'Review & Apply', icon: '✅', step: '4' },
  { key: 'logs', label: 'Logs & Export', icon: '📋', step: null },
];

function App() {
  const [page, setPage] = useState('dashboard');
  const [currentDomain, setCurrentDomain] = useState('');
  const [projectData, setProjectData] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = useCallback((p, domain, data) => {
    if (domain) setCurrentDomain(domain);
    if (data) setProjectData(data);
    setPage(p);
    setSidebarOpen(false);
  }, []);

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard navigate={navigate} />;
      case 'input':
        return <DomainInput navigate={navigate} />;
      case 'content':
        return <ContentList domain={currentDomain} project={projectData} navigate={navigate} />;
      case 'suggestions':
        return <AISuggestions domain={currentDomain} project={projectData} navigate={navigate} setProjectData={setProjectData} />;
      case 'review':
        return <ReviewApprove domain={currentDomain} project={projectData} navigate={navigate} setProjectData={setProjectData} />;
      case 'logs':
        return <ExecutionLogs domain={currentDomain} navigate={navigate} />;
      default:
        return <Dashboard navigate={navigate} />;
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
        <ul>
          {NAV_ITEMS.map(({ key, label, icon, step }) => (
            <li key={key} className={page === key ? 'active' : ''} onClick={() => navigate(key)}>
              <span className="nav-icon">{icon}</span>
              {label}
              {step && <span className="nav-step">{step}</span>}
            </li>
          ))}
        </ul>
        {currentDomain && (
          <div className="sidebar-domain">
            <small>Active Project</small>
            <div className="domain-text">{currentDomain.replace(/^https?:\/\//, '')}</div>
          </div>
        )}
      </nav>

      <main className="main-content">
        <div className="animate-in" key={page}>
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;
