import React, { useState, useEffect, useCallback } from 'react';
import { getProject } from '../services/api';
import ContentList from './ContentList';
import AISuggestions from './AISuggestions';
import ReviewApprove from './ReviewApprove';
import ExecutionLogs from './ExecutionLogs';
import Settings from './Settings';

const TABS = [
  { key: 'content', label: 'Content', icon: '📄', step: 1 },
  { key: 'suggestions', label: 'AI Suggest', icon: '🤖', step: 2 },
  { key: 'review', label: 'Review & Apply', icon: '✅', step: 3 },
  { key: 'logs', label: 'Logs', icon: '📋', step: null },
  { key: 'settings', label: 'Settings', icon: '⚙️', step: null },
];

function ProjectPage({ domain, project: initialProject, setProjectData, navigateApp }) {
  const [project, setProject] = useState(initialProject);
  const [activeTab, setActiveTab] = useState('content');

  useEffect(() => {
    setProject(initialProject);
  }, [initialProject]);

  useEffect(() => {
    if (!initialProject && domain) {
      getProject(domain).then((data) => {
        setProject(data);
        if (setProjectData) setProjectData(data);
      }).catch(() => {});
    }
  }, [domain]); // eslint-disable-line

  const handleSetProjectData = useCallback((data) => {
    setProject(data);
    if (setProjectData) setProjectData(data);
  }, [setProjectData]);

  // Navigate within tabs
  const navigate = useCallback((page, dom, data) => {
    if (page === 'dashboard' || page === 'input') {
      navigateApp(page, dom, data);
      return;
    }
    if (data) handleSetProjectData(data);
    setActiveTab(page);
  }, [navigateApp, handleSetProjectData]);

  // Compute workflow step
  const getStep = () => {
    if (!project) return 0;
    const articles = project.articles || [];
    const hasAnalysis = articles.some((a) => a.analysis && !a.analysis.error);
    const hasSuggestions = articles.some((a) => a.suggestions && a.suggestions.length > 0);
    if (hasSuggestions) return 3;
    if (hasAnalysis) return 2;
    if (articles.length > 0) return 1;
    return 0;
  };

  const step = getStep();
  const domainShort = domain.replace(/^https?:\/\//, '');

  const renderTab = () => {
    switch (activeTab) {
      case 'content':
        return <ContentList domain={domain} project={project} navigate={navigate} setProjectData={handleSetProjectData} />;
      case 'suggestions':
        return <AISuggestions domain={domain} project={project} navigate={navigate} setProjectData={handleSetProjectData} />;
      case 'review':
        return <ReviewApprove domain={domain} project={project} navigate={navigate} setProjectData={handleSetProjectData} />;
      case 'logs':
        return <ExecutionLogs domain={domain} navigate={navigate} />;
      case 'settings':
        return <Settings domain={domain} />;
      default:
        return <ContentList domain={domain} project={project} navigate={navigate} setProjectData={handleSetProjectData} />;
    }
  };

  return (
    <div>
      {/* Project header */}
      <div className="project-hub-header">
        <div className="project-hub-title">
          <span className="project-hub-favicon">{domainShort.charAt(0).toUpperCase()}</span>
          <div>
            <h1>{domainShort}</h1>
            <p className="text-sm text-muted">
              {project?.articles?.length || 0} articles · {project?.status || 'loading'}
            </p>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigateApp('dashboard')}>
          ← All Projects
        </button>
      </div>

      {/* Tab bar */}
      <div className="project-tabs">
        {TABS.map((tab) => {
          const isAccessible = tab.step === null || tab.step <= step + 1;
          const isDone = tab.step !== null && tab.step <= step;
          return (
            <button
              key={tab.key}
              className={`project-tab ${activeTab === tab.key ? 'active' : ''} ${!isAccessible ? 'disabled' : ''}`}
              onClick={() => isAccessible && setActiveTab(tab.key)}
              disabled={!isAccessible}
            >
              <span className="project-tab-icon">{isDone ? '✓' : tab.icon}</span>
              <span className="project-tab-label">{tab.label}</span>
              {tab.step && isDone && <span className="project-tab-done" />}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="project-tab-content">
        {renderTab()}
      </div>
    </div>
  );
}

export default ProjectPage;
