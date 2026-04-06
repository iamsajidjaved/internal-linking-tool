import React, { useState, useRef, useCallback } from 'react';
import {
  fetchContent,
  analyzeContentStream,
  generateSuggestionsStream,
  getProject,
  updateSuggestions,
  applyLinks,
  saveSettings,
} from '../services/api';

const AP_STAGES = [
  { key: 'fetch', label: 'Fetch', icon: '📥' },
  { key: 'analyze', label: 'Analyze', icon: '🔍' },
  { key: 'suggest', label: 'Suggest', icon: '🤖' },
  { key: 'approve', label: 'Approve', icon: '✓' },
  { key: 'apply', label: 'Apply', icon: '🚀' },
];

function DomainInput({ navigate, onProjectCreated, setProjectData }) {
  const [domain, setDomain] = useState('');
  const [source, setSource] = useState('sitemap');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [wpUsername, setWpUsername] = useState('');
  const [wpAppPassword, setWpAppPassword] = useState('');
  const [autoPilot, setAutoPilot] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // AutoPilot state
  const [apRunning, setApRunning] = useState(false);
  const [apStage, setApStage] = useState(null);
  const [apStageStatus, setApStageStatus] = useState({});
  const [apProgress, setApProgress] = useState({ current: 0, total: 0, message: '' });
  const [apLogs, setApLogs] = useState([]);
  const [apCompleted, setApCompleted] = useState(false);
  const [apDomain, setApDomain] = useState('');
  const abortRef = useRef(false);
  const streamRef = useRef(null);
  const logsEndRef = useRef(null);

  const addLog = useCallback((msg, type = 'info') => {
    const time = new Date().toLocaleTimeString();
    setApLogs((prev) => [...prev, { time, msg, type }]);
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  const runAutoPilot = async (normalizedDomain, projectResult) => {
    setApRunning(true);
    setApCompleted(false);
    setApDomain(normalizedDomain);
    setApStageStatus({ fetch: 'done' });
    setApStage('analyze');
    abortRef.current = false;
    setApLogs([]);

    addLog(`Fetched ${projectResult.project?.articles?.length || 0} articles`);

    try {
      // ===== STAGE 2: Analyze =====
      setApStageStatus((s) => ({ ...s, analyze: 'running' }));
      addLog('Analyzing content...');

      await new Promise((resolve, reject) => {
        const stream = analyzeContentStream(normalizedDomain, {
          onInit: (d) => {
            setApProgress({ current: 0, total: d.total, message: `0/${d.total}` });
          },
          onProgress: (d) => {
            setApProgress({ current: d.current, total: d.total, message: `${d.current}/${d.total} — ${d.title || ''}` });
          },
          onDone: (d) => {
            addLog(`Analysis done: ${d.total} articles`, 'success');
            setApStageStatus((s) => ({ ...s, analyze: 'done' }));
            resolve();
          },
          onError: () => reject(new Error('Analysis failed')),
        });
        streamRef.current = stream;
      });
      if (abortRef.current) throw new Error('Aborted');

      const afterAnalyze = await getProject(normalizedDomain);
      if (setProjectData) setProjectData(afterAnalyze);

      // ===== STAGE 3: Suggest =====
      setApStage('suggest');
      setApStageStatus((s) => ({ ...s, suggest: 'running' }));
      addLog('Generating link suggestions...');

      await new Promise((resolve, reject) => {
        const stream = generateSuggestionsStream(normalizedDomain, {
          onInit: (d) => {
            setApProgress({ current: 0, total: d.total, message: `0/${d.total}` });
          },
          onProgress: (d) => {
            setApProgress({ current: d.current, total: d.total, message: `${d.current}/${d.total} — ${d.title || ''}` });
          },
          onDone: (d) => {
            addLog(`Suggestions done: ${d.generated} generated`, 'success');
            setApStageStatus((s) => ({ ...s, suggest: 'done' }));
            resolve();
          },
          onError: () => reject(new Error('Suggestions failed')),
        });
        streamRef.current = stream;
      });
      if (abortRef.current) throw new Error('Aborted');

      const afterSuggest = await getProject(normalizedDomain);
      if (setProjectData) setProjectData(afterSuggest);

      // ===== STAGE 4: Auto-Approve =====
      setApStage('approve');
      setApStageStatus((s) => ({ ...s, approve: 'running' }));
      addLog('Auto-approving all suggestions...');

      const withSuggs = (afterSuggest.articles || []).filter((a) => a.suggestions?.length > 0);
      let totalLinks = 0;
      for (let i = 0; i < withSuggs.length; i++) {
        if (abortRef.current) throw new Error('Aborted');
        const a = withSuggs[i];
        const approved = a.suggestions.map((s) => ({ ...s, approved: true }));
        totalLinks += approved.length;
        await updateSuggestions(normalizedDomain, a.url, approved);
        setApProgress({ current: i + 1, total: withSuggs.length, message: `${i + 1}/${withSuggs.length} articles` });
      }
      addLog(`Approved ${totalLinks} links`, 'success');
      setApStageStatus((s) => ({ ...s, approve: 'done' }));

      const afterApprove = await getProject(normalizedDomain);
      if (setProjectData) setProjectData(afterApprove);

      // ===== STAGE 5: Apply to WP =====
      setApStage('apply');
      setApStageStatus((s) => ({ ...s, apply: 'running' }));
      addLog('Applying links to WordPress...');

      const toApply = (afterApprove.articles || []).filter(
        (a) => a.status !== 'applied' && a.suggestions?.some((s) => s.approved === true)
      );
      let ok = 0, fail = 0;
      for (let i = 0; i < toApply.length; i++) {
        if (abortRef.current) throw new Error('Aborted');
        const a = toApply[i];
        setApProgress({ current: i + 1, total: toApply.length, message: `${i + 1}/${toApply.length} — ${a.title}` });
        try {
          await applyLinks({ domain: normalizedDomain, articleUrl: a.url });
          ok++;
          addLog(`Applied: ${a.title}`, 'success');
        } catch (err) {
          fail++;
          addLog(`Failed: ${a.title}`, 'error');
        }
      }
      setApStageStatus((s) => ({ ...s, apply: fail === 0 ? 'done' : 'warning' }));
      addLog(`Apply complete: ${ok} succeeded, ${fail} failed`, fail ? 'warning' : 'success');

      const finalProject = await getProject(normalizedDomain);
      if (setProjectData) setProjectData(finalProject);

      setApCompleted(true);
      setApStage(null);
      addLog('AutoPilot finished!', 'success');
    } catch (err) {
      if (err.message === 'Aborted') {
        addLog('Stopped by user', 'warning');
      } else {
        addLog(`Error: ${err.message}`, 'error');
        setError(err.message);
      }
    }
    setApRunning(false);
    streamRef.current = null;
  };

  const handleStop = () => {
    abortRef.current = true;
    if (streamRef.current) { streamRef.current.close(); streamRef.current = null; }
    addLog('Stopping...', 'warning');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!domain) {
      setError('Please enter a domain');
      return;
    }

    if (!geminiApiKey) {
      setError('Gemini API key is required');
      return;
    }

    let normalizedDomain = domain.trim();
    if (!normalizedDomain.startsWith('http')) {
      normalizedDomain = 'https://' + normalizedDomain;
    }

    setLoading(true);
    try {
      // Save credentials per-project before fetching
      await saveSettings({
        domain: normalizedDomain,
        geminiApiKey,
        wpUsername,
        wpAppPassword,
      });

      const payload = { domain: normalizedDomain, source };
      if (source === 'wordpress') {
        payload.wpUsername = wpUsername;
        payload.wpAppPassword = wpAppPassword;
      }

      const result = await fetchContent(payload);
      if (onProjectCreated) onProjectCreated();

      if (autoPilot) {
        setLoading(false);
        runAutoPilot(normalizedDomain, result);
      } else {
        navigate('project', normalizedDomain, result.project);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch content');
      setLoading(false);
    }
  };

  const apProgressPct = apProgress.total > 0 ? Math.round((apProgress.current / apProgress.total) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>New Project 🌐</h1>
            <p className="page-desc">Enter your WordPress site to start discovering internal linking opportunities</p>
          </div>
        </div>
      </div>

      {/* Form — hide when autopilot is running */}
      {!apRunning && !apCompleted && (
        <div className="card" style={{ maxWidth: 640 }}>
          {error && (
            <div className="alert alert-error">
              <span className="alert-icon">⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Domain URL</label>
              <input
                type="text"
                placeholder="https://yourblog.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
              <div className="form-hint">Enter your WordPress website URL</div>
            </div>

            <div className="form-group">
              <label>Data Source</label>
              <div className="form-radio-group">
                <div
                  className={`radio-option ${source === 'sitemap' ? 'selected' : ''}`}
                  onClick={() => setSource('sitemap')}
                >
                  <span className="radio-icon">🗺️</span>
                  <span className="radio-label">Sitemap XML</span>
                  <span className="radio-desc">Parse sitemap_index.xml automatically</span>
                </div>
                <div
                  className={`radio-option ${source === 'wordpress' ? 'selected' : ''}`}
                  onClick={() => setSource('wordpress')}
                >
                  <span className="radio-icon">⚡</span>
                  <span className="radio-label">WordPress API</span>
                  <span className="radio-desc">Fetch via REST API with auth</span>
                </div>
              </div>
            </div>

            <hr className="divider" />

            <div className="form-group">
              <label>🤖 Gemini API Key</label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
              />
              <div className="form-hint">
                Get your key from{' '}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a>
                . Stored per-project.
              </div>
            </div>

            <div className="form-group">
              <label>🌐 WordPress Username</label>
              <input
                type="text"
                placeholder="admin"
                value={wpUsername}
                onChange={(e) => setWpUsername(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>🔑 Application Password</label>
              <input
                type="password"
                placeholder="xxxx xxxx xxxx xxxx"
                value={wpAppPassword}
                onChange={(e) => setWpAppPassword(e.target.value)}
              />
              <div className="form-hint">Generate in WordPress: Users → Profile → Application Passwords. Required for fetching via WP API and applying links.</div>
            </div>

            {/* AutoPilot toggle */}
            <div className="ap-toggle" onClick={() => setAutoPilot(!autoPilot)}>
              <div className={`ap-toggle-switch ${autoPilot ? 'on' : ''}`}>
                <div className="ap-toggle-knob" />
              </div>
              <div className="ap-toggle-text">
                <strong>🚀 AutoPilot</strong>
                <span>Automatically analyze, suggest, approve & apply all internal links</span>
              </div>
            </div>

            <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ marginTop: 12, width: '100%' }}>
              {loading ? (
                <>
                  <span className="pulse-dot" />
                  Fetching Content...
                </>
              ) : autoPilot ? (
                '🚀 Fetch & Run AutoPilot →'
              ) : (
                'Fetch & Analyze Content →'
              )}
            </button>
          </form>
        </div>
      )}

      {/* AutoPilot pipeline UI */}
      {(apRunning || apCompleted) && (
        <div>
          {/* Pipeline stages */}
          <div className="ap-pipeline">
            {AP_STAGES.map((stage, idx) => {
              const status = apStageStatus[stage.key];
              const isCurrent = apStage === stage.key;
              const cls = status === 'done' ? 'done' : status === 'error' ? 'error' : status === 'warning' ? 'warning' : isCurrent ? 'active' : '';
              return (
                <React.Fragment key={stage.key}>
                  {idx > 0 && <div className={`ap-connector ${status === 'done' || apStageStatus[AP_STAGES[idx - 1]?.key] === 'done' ? 'done' : ''}`} />}
                  <div className={`ap-stage ${cls}`}>
                    <div className="ap-stage-icon">
                      {status === 'done' ? '✓' : status === 'error' ? '✕' : status === 'warning' ? '⚠' : stage.icon}
                    </div>
                    <div className="ap-stage-label">{stage.label}</div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Progress */}
          {apRunning && (
            <div className="card mb-4">
              <div className="ap-progress-header">
                <strong>{AP_STAGES.find((s) => s.key === apStage)?.label || 'Processing'}</strong>
                <span className="text-muted">{apProgressPct}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${apProgressPct}%` }} />
              </div>
              <div className="text-sm text-muted mt-3">{apProgress.message}</div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 mb-4">
            {apRunning && (
              <button className="btn btn-danger" onClick={handleStop}>■ Stop</button>
            )}
            {apCompleted && (
              <>
                <button className="btn btn-primary" onClick={() => navigate('project', apDomain)}>
                  📋 Review Results
                </button>
                <button className="btn btn-secondary" onClick={() => {
                  setApCompleted(false);
                  setApLogs([]);
                  setApStageStatus({});
                  setApStage(null);
                }}>
                  ← New Project
                </button>
              </>
            )}
          </div>

          {/* Log */}
          <div className="card">
            <h3>Activity Log</h3>
            <div className="ap-log-container">
              {apLogs.map((log, i) => (
                <div key={i} className={`ap-log-entry ap-log-${log.type}`}>
                  <span className="ap-log-time">{log.time}</span>
                  <span className="ap-log-msg">{log.msg}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DomainInput;
