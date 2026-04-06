import React, { useState, useEffect, useCallback } from 'react';
import { getProject } from '../services/api';
import ContentList from './ContentList';
import AISuggestions from './AISuggestions';
import ReviewApprove from './ReviewApprove';

const TABS = [
  { key: 'content', label: 'Fetch Content', step: 1 },
  { key: 'suggestions', label: 'AI Suggestions', step: 2 },
  { key: 'review', label: 'Review & Apply', step: 3 },
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

      {/* Stepper */}
      <div className="project-stepper">
        {TABS.map((tab, idx) => {
          const isAccessible = tab.step <= step + 1;
          const isDone = tab.step <= step;
          const isActive = activeTab === tab.key;
          return (
            <React.Fragment key={tab.key}>
              {idx > 0 && (
                <div className={`stepper-line ${isDone ? 'done' : step >= tab.step - 1 ? 'partial' : ''}`} />
              )}
              <button
                className={`stepper-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''} ${!isAccessible ? 'disabled' : ''}`}
                onClick={() => isAccessible && setActiveTab(tab.key)}
                disabled={!isAccessible}
              >
                <span className="stepper-circle">
                  {isDone ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : tab.step}
                </span>
                <span className="stepper-label">{tab.label}</span>
              </button>
            </React.Fragment>
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
