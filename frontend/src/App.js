import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import DomainInput from './pages/DomainInput';
import ContentList from './pages/ContentList';
import AISuggestions from './pages/AISuggestions';
import ReviewApprove from './pages/ReviewApprove';
import ExecutionLogs from './pages/ExecutionLogs';
import './App.css';

const PAGES = {
  dashboard: 'Dashboard',
  input: 'Domain Input',
  content: 'Content List',
  suggestions: 'AI Suggestions',
  review: 'Review & Approve',
  logs: 'Execution Logs',
};

function App() {
  const [page, setPage] = useState('dashboard');
  const [currentDomain, setCurrentDomain] = useState('');
  const [projectData, setProjectData] = useState(null);

  const navigate = (p, domain, data) => {
    if (domain) setCurrentDomain(domain);
    if (data) setProjectData(data);
    setPage(p);
  };

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
      <nav className="sidebar">
        <div className="sidebar-header">
          <h2>🔗 Link Tool</h2>
        </div>
        <ul>
          {Object.entries(PAGES).map(([key, label]) => (
            <li key={key} className={page === key ? 'active' : ''} onClick={() => setPage(key)}>
              {label}
            </li>
          ))}
        </ul>
        {currentDomain && (
          <div className="sidebar-domain">
            <small>Active domain:</small>
            <strong>{currentDomain}</strong>
          </div>
        )}
      </nav>
      <main className="main-content">{renderPage()}</main>
    </div>
  );
}

export default App;
