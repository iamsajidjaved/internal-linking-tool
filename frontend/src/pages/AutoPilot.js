import React, { useState, useRef, useCallback } from 'react';
import {
  analyzeContentStream,
  generateSuggestionsStream,
  getProject,
  updateSuggestions,
  applyLinks,
} from '../services/api';

const STAGES = [
  { key: 'analyze', label: 'Analyze Content', icon: '🔍', desc: 'AI analyzes all articles for topics, keywords & link opportunities' },
  { key: 'suggest', label: 'Generate Links', icon: '🤖', desc: 'Gemini suggests internal links based on content analysis' },
  { key: 'approve', label: 'Auto-Approve', icon: '✓', desc: 'Automatically approve all suggested links' },
  { key: 'apply', label: 'Apply to WordPress', icon: '🚀', desc: 'Push approved links to WordPress posts' },
];

function AutoPilot({ domain, project, navigate, setProjectData }) {
  const [running, setRunning] = useState(false);
  const [currentStage, setCurrentStage] = useState(null); // 'analyze' | 'suggest' | 'approve' | 'apply'
  const [stageStatus, setStageStatus] = useState({}); // { analyze: 'done', suggest: 'running', ... }
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  const abortRef = useRef(false);
  const streamRef = useRef(null);
  const logsEndRef = useRef(null);

  const addLog = useCallback((msg, type = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { time, msg, type }]);
  }, []);

  // Scroll logs to bottom
  const scrollLogs = useCallback(() => {
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  const runAutoPilot = async () => {
    if (!domain) return;
    if (!window.confirm('Run AutoPilot? This will analyze all articles, generate link suggestions, auto-approve them, and apply to WordPress.')) return;

    setRunning(true);
    setCompleted(false);
    setError('');
    setLogs([]);
    setStageStatus({});
    abortRef.current = false;

    addLog('AutoPilot started');

    try {
      // ========== STAGE 1: Analyze ==========
      setCurrentStage('analyze');
      setStageStatus((s) => ({ ...s, analyze: 'running' }));
      addLog('Stage 1: Analyzing content...');

      await new Promise((resolve, reject) => {
        const stream = analyzeContentStream(domain, {
          onInit: (data) => {
            setProgress({ current: 0, total: data.total, message: `0/${data.total} articles` });
            addLog(`Found ${data.total} articles to analyze`);
            scrollLogs();
          },
          onProgress: (data) => {
            setProgress({ current: data.current, total: data.total, message: `${data.current}/${data.total} — ${data.title || ''}` });
            scrollLogs();
          },
          onDone: (data) => {
            addLog(`Analysis complete: ${data.total} articles analyzed`, 'success');
            setStageStatus((s) => ({ ...s, analyze: 'done' }));
            scrollLogs();
            resolve();
          },
          onError: () => {
            reject(new Error('Analysis stream failed'));
          },
        });
        streamRef.current = stream;
      });

      if (abortRef.current) throw new Error('Aborted');

      // Refresh project data
      const afterAnalyze = await getProject(domain);
      setProjectData(afterAnalyze);

      // ========== STAGE 2: Suggest ==========
      setCurrentStage('suggest');
      setStageStatus((s) => ({ ...s, suggest: 'running' }));
      addLog('Stage 2: Generating link suggestions...');

      await new Promise((resolve, reject) => {
        const stream = generateSuggestionsStream(domain, {
          onInit: (data) => {
            setProgress({ current: 0, total: data.total, message: `0/${data.total} articles` });
            addLog(`Generating suggestions for ${data.total} articles`);
            scrollLogs();
          },
          onProgress: (data) => {
            setProgress({ current: data.current, total: data.total, message: `${data.current}/${data.total} — ${data.title || ''}` });
            scrollLogs();
          },
          onDone: (data) => {
            addLog(`Suggestions complete: ${data.generated} generated`, 'success');
            setStageStatus((s) => ({ ...s, suggest: 'done' }));
            scrollLogs();
            resolve();
          },
          onError: () => {
            reject(new Error('Suggestion stream failed'));
          },
        });
        streamRef.current = stream;
      });

      if (abortRef.current) throw new Error('Aborted');

      // Refresh project data
      const afterSuggest = await getProject(domain);
      setProjectData(afterSuggest);

      // ========== STAGE 3: Auto-Approve ==========
      setCurrentStage('approve');
      setStageStatus((s) => ({ ...s, approve: 'running' }));
      addLog('Stage 3: Auto-approving all suggestions...');

      const articlesWithSuggestions = (afterSuggest.articles || []).filter(
        (a) => a.suggestions && a.suggestions.length > 0
      );
      let totalLinks = 0;
      for (let i = 0; i < articlesWithSuggestions.length; i++) {
        if (abortRef.current) throw new Error('Aborted');
        const article = articlesWithSuggestions[i];
        const approved = article.suggestions.map((s) => ({ ...s, approved: true }));
        totalLinks += approved.length;
        await updateSuggestions(domain, article.url, approved);
        setProgress({
          current: i + 1,
          total: articlesWithSuggestions.length,
          message: `${i + 1}/${articlesWithSuggestions.length} articles approved`,
        });
        scrollLogs();
      }
      addLog(`Auto-approved ${totalLinks} links across ${articlesWithSuggestions.length} articles`, 'success');
      setStageStatus((s) => ({ ...s, approve: 'done' }));

      // Refresh
      const afterApprove = await getProject(domain);
      setProjectData(afterApprove);

      // ========== STAGE 4: Apply to WordPress ==========
      setCurrentStage('apply');
      setStageStatus((s) => ({ ...s, apply: 'running' }));
      addLog('Stage 4: Applying links to WordPress...');

      const toApply = (afterApprove.articles || []).filter(
        (a) => a.status !== 'applied' && a.suggestions?.some((s) => s.approved === true)
      );
      let applySuccess = 0;
      let applyFail = 0;
      for (let i = 0; i < toApply.length; i++) {
        if (abortRef.current) throw new Error('Aborted');
        const article = toApply[i];
        setProgress({
          current: i + 1,
          total: toApply.length,
          message: `${i + 1}/${toApply.length} — ${article.title}`,
        });
        try {
          await applyLinks({ domain, articleUrl: article.url });
          applySuccess++;
          addLog(`Applied: ${article.title}`, 'success');
        } catch (err) {
          applyFail++;
          addLog(`Failed: ${article.title} — ${err.response?.data?.message || err.message}`, 'error');
        }
        scrollLogs();
      }

      setStageStatus((s) => ({ ...s, apply: applyFail === 0 ? 'done' : 'warning' }));
      addLog(`Apply complete: ${applySuccess} succeeded, ${applyFail} failed`, applyFail ? 'warning' : 'success');

      // Final refresh
      const finalProject = await getProject(domain);
      setProjectData(finalProject);

      setCompleted(true);
      setCurrentStage(null);
      addLog('AutoPilot finished!', 'success');
      scrollLogs();
    } catch (err) {
      if (err.message === 'Aborted') {
        addLog('AutoPilot was stopped by user', 'warning');
      } else {
        setError(err.message || 'AutoPilot encountered an error');
        addLog(`Error: ${err.message}`, 'error');
      }
      // Mark current stage as failed
      if (currentStage) {
        setStageStatus((s) => ({ ...s, [currentStage]: 'error' }));
      }
      scrollLogs();
    }

    setRunning(false);
    streamRef.current = null;
  };

  const handleStop = () => {
    abortRef.current = true;
    if (streamRef.current) {
      streamRef.current.close();
      streamRef.current = null;
    }
    addLog('Stopping AutoPilot...', 'warning');
  };

  const progressPct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  if (!domain) {
    return (
      <div>
        <div className="page-header">
          <h1>AutoPilot 🚀</h1>
          <p className="page-desc">Fully automated internal linking pipeline</p>
        </div>
        <div className="card">
          <div className="empty-state">
            <span className="empty-icon">📁</span>
            <h3>No project selected</h3>
            <p>Select a project from the sidebar first, then run AutoPilot.</p>
          </div>
        </div>
      </div>
    );
  }

  const articleCount = project?.articles?.length || 0;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>AutoPilot 🚀</h1>
            <p className="page-desc">
              Fully automated: Analyze → Suggest → Approve → Apply for{' '}
              <strong>{domain.replace(/^https?:\/\//, '')}</strong>
            </p>
          </div>
          <div className="btn-group">
            {!running && !completed && (
              <button
                className="btn btn-primary"
                onClick={runAutoPilot}
                disabled={articleCount === 0}
              >
                ▶ Start AutoPilot
              </button>
            )}
            {running && (
              <button className="btn btn-danger" onClick={handleStop}>
                ■ Stop
              </button>
            )}
            {completed && (
              <>
                <button className="btn btn-secondary" onClick={() => navigate('review')}>
                  📋 View Results
                </button>
                <button className="btn btn-primary" onClick={runAutoPilot}>
                  🔄 Run Again
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {articleCount === 0 && (
        <div className="card">
          <div className="empty-state">
            <span className="empty-icon">📝</span>
            <h3>No articles fetched</h3>
            <p>Fetch content first before running AutoPilot.</p>
            <button className="btn btn-primary" onClick={() => navigate('input')}>
              Fetch Content
            </button>
          </div>
        </div>
      )}

      {articleCount > 0 && (
        <>
          {error && (
            <div className="alert alert-error">
              <span className="alert-icon">⚠️</span>
              {error}
            </div>
          )}

          {/* Stage pipeline */}
          <div className="ap-pipeline">
            {STAGES.map((stage, idx) => {
              const status = stageStatus[stage.key]; // undefined | 'running' | 'done' | 'error' | 'warning'
              const isCurrent = currentStage === stage.key;
              const stageClass = status === 'done' ? 'done' : status === 'error' ? 'error' : status === 'warning' ? 'warning' : isCurrent ? 'active' : '';
              return (
                <React.Fragment key={stage.key}>
                  {idx > 0 && <div className={`ap-connector ${status === 'done' ? 'done' : ''}`} />}
                  <div className={`ap-stage ${stageClass}`}>
                    <div className="ap-stage-icon">
                      {status === 'done' ? '✓' : status === 'error' ? '✕' : status === 'warning' ? '⚠' : stage.icon}
                    </div>
                    <div className="ap-stage-label">{stage.label}</div>
                    <div className="ap-stage-desc">{stage.desc}</div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Progress bar — visible when running */}
          {running && (
            <div className="card mb-4">
              <div className="ap-progress-header">
                <strong>
                  {STAGES.find((s) => s.key === currentStage)?.label || 'Processing'}
                </strong>
                <span className="text-muted">{progressPct}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="text-sm text-muted mt-3">{progress.message}</div>
            </div>
          )}

          {/* Log output */}
          <div className="card">
            <h3>Activity Log</h3>
            <div className="ap-log-container">
              {logs.length === 0 ? (
                <div className="text-sm text-muted" style={{ padding: '20px 0', textAlign: 'center' }}>
                  Click "Start AutoPilot" to begin the fully automated pipeline
                </div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={`ap-log-entry ap-log-${log.type}`}>
                    <span className="ap-log-time">{log.time}</span>
                    <span className="ap-log-msg">{log.msg}</span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AutoPilot;
