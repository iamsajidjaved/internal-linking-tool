import React, { useState, useRef, useCallback } from 'react';
import { updateSuggestions, applyLinks, getProject } from '../services/api';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, BorderStyle } from 'docx';

function ReviewApprove({ domain, project, navigate, setProjectData }) {
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [localSuggestions, setLocalSuggestions] = useState({});
  const [applying, setApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const saveTimers = useRef({});
  const exportRef = useRef(null);

  const articles = (project?.articles || []).filter(
    (a) => a.suggestions && a.suggestions.length > 0
  );

  const getSuggestions = (article) => {
    return localSuggestions[article.url] || article.suggestions || [];
  };

  // Auto-save: debounced save to backend
  const autoSave = useCallback((articleUrl, suggestions) => {
    if (saveTimers.current[articleUrl]) clearTimeout(saveTimers.current[articleUrl]);
    saveTimers.current[articleUrl] = setTimeout(async () => {
      try {
        await updateSuggestions(domain, articleUrl, suggestions);
      } catch { /* silent */ }
    }, 600);
  }, [domain]);

  const updateLocalSuggestion = (articleUrl, index, updates) => {
    const article = articles.find((a) => a.url === articleUrl);
    const current = getSuggestions(article);
    const updated = current.map((s, i) => (i === index ? { ...s, ...updates } : s));
    setLocalSuggestions((prev) => ({ ...prev, [articleUrl]: updated }));
    autoSave(articleUrl, updated);
  };

  const handleApproveAll = (article) => {
    const updated = getSuggestions(article).map((s) => ({ ...s, approved: true }));
    setLocalSuggestions((prev) => ({ ...prev, [article.url]: updated }));
    autoSave(article.url, updated);
  };

  const handleRejectAll = (article) => {
    const updated = getSuggestions(article).map((s) => ({ ...s, approved: false }));
    setLocalSuggestions((prev) => ({ ...prev, [article.url]: updated }));
    autoSave(article.url, updated);
  };

  const handleApproveAllArticles = () => {
    const batch = {};
    for (const a of articles) {
      batch[a.url] = getSuggestions(a).map((s) => ({ ...s, approved: true }));
    }
    setLocalSuggestions((prev) => ({ ...prev, ...batch }));
    for (const url of Object.keys(batch)) {
      autoSave(url, batch[url]);
    }
  };

  const handleRejectAllArticles = () => {
    const batch = {};
    for (const a of articles) {
      batch[a.url] = getSuggestions(a).map((s) => ({ ...s, approved: false }));
    }
    setLocalSuggestions((prev) => ({ ...prev, ...batch }));
    for (const url of Object.keys(batch)) {
      autoSave(url, batch[url]);
    }
  };

  // Apply ALL articles to WordPress (skips already-applied)
  const handleApplyAll = async () => {
    const eligibleArticles = articles.filter((a) => {
      if (a.status === 'applied') return false; // skip already applied
      const suggs = getSuggestions(a);
      return suggs.some((s) => s.approved === true);
    });
    if (eligibleArticles.length === 0) {
      setError('No pending articles with approved links to apply.');
      return;
    }
    if (!window.confirm(`Apply approved links to ${eligibleArticles.length} pending article(s)? This will modify WordPress post content.`)) {
      return;
    }
    setApplying(true);
    setApplyProgress({ done: 0, total: eligibleArticles.length, current: '', failed: [] });
    setError('');
    setSuccess('');

    let succeeded = 0;
    const failedList = [];
    for (const article of eligibleArticles) {
      setApplyProgress((p) => ({ ...p, current: article.title }));
      try {
        await applyLinks({ domain, articleUrl: article.url });
        succeeded++;
      } catch (err) {
        failedList.push(article.title);
      }
      setApplyProgress((p) => ({ ...p, done: succeeded + failedList.length, failed: failedList }));

      // Refresh project data after each article so stats sync in real-time
      try {
        const refreshed = await getProject(domain);
        setProjectData(refreshed);
      } catch { /* silent */ }
    }

    setApplying(false);
    setApplyProgress(null);
    if (failedList.length === 0) {
      setSuccess(`Successfully applied links to all ${succeeded} articles!`);
    } else {
      setError(`Failed on ${failedList.length} article(s): ${failedList.join(', ')}. Click Apply again to retry.`);
      if (succeeded > 0) setSuccess(`Applied to ${succeeded} articles.`);
    }
    setTimeout(() => setSuccess(''), 8000);
  };

  // --- Export helpers ---
  const buildExportData = () => {
    const rows = [];
    for (const a of articles) {
      const suggs = getSuggestions(a).filter((s) => s.approved === true);
      for (const s of suggs) {
        rows.push({
          article_title: a.title,
          article_url: a.url,
          anchor_text: s.anchor_text,
          target_url: s.target_url,
          target_title: s.target_title || '',
          placement_hint: s.placement_hint || '',
          relevance: s.relevance_score != null ? Math.round(s.relevance_score * 100) + '%' : '',
        });
      }
    }
    return rows;
  };

  const exportJSON = () => {
    const data = buildExportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    saveAs(blob, `internal-links-${domain.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
    setExportOpen(false);
  };

  const exportXLSX = () => {
    const data = buildExportData();
    const headers = [
      { key: 'article_title', label: 'Article Title' },
      { key: 'article_url', label: 'Article URL' },
      { key: 'anchor_text', label: 'Anchor Text (Keyword)' },
      { key: 'target_url', label: 'Insert Link' },
      { key: 'target_title', label: 'Target Title' },
      { key: 'placement_hint', label: 'Where to Place' },
      { key: 'relevance', label: 'Relevance' },
    ];
    const wsData = [headers.map((h) => h.label), ...data.map((r) => headers.map((h) => r[h.key]))];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    // Column widths
    ws['!cols'] = [{ wch: 30 }, { wch: 45 }, { wch: 25 }, { wch: 45 }, { wch: 30 }, { wch: 30 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Internal Links');
    XLSX.writeFile(wb, `internal-links-${domain.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
    setExportOpen(false);
  };

  const exportDOCX = async () => {
    const data = buildExportData();
    // Group by article
    const grouped = {};
    for (const r of data) {
      if (!grouped[r.article_url]) grouped[r.article_url] = { title: r.article_title, url: r.article_url, links: [] };
      grouped[r.article_url].links.push(r);
    }

    const borderStyle = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
    const cellBorders = { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle };

    const sections = [];
    for (const g of Object.values(grouped)) {
      sections.push(
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: g.title, bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: g.url, color: '6C5CE7', size: 18 })] }),
        new Paragraph({ text: '' }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: ['Anchor Text', 'Insert This Link', 'Where to Place', 'Relevance'].map((h) =>
                new TableCell({
                  borders: cellBorders,
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, size: 18 })] })],
                })
              ),
            }),
            ...g.links.map((l) =>
              new TableRow({
                children: [
                  new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: l.anchor_text, size: 18 })] })] }),
                  new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: l.target_url, color: '0984E3', size: 18 })] })] }),
                  new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: l.placement_hint, size: 18 })] })] }),
                  new TableCell({ borders: cellBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: l.relevance, size: 18 })] })] }),
                ],
              })
            ),
          ],
        }),
        new Paragraph({ text: '' }),
      );
    }

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: `Internal Linking Plan — ${domain.replace(/^https?:\/\//, '')}`, bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: `${data.length} approved links across ${Object.keys(grouped).length} articles`, color: '636E72', size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString()}`, color: '636E72', size: 18 })] }),
          new Paragraph({ text: '' }),
          ...sections,
        ],
      }],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `internal-links-${domain.replace(/[^a-zA-Z0-9]/g, '_')}.docx`);
    setExportOpen(false);
  };

  // Close export dropdown on outside click
  const handleClickOutside = useCallback((e) => {
    if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false);
  }, []);
  React.useEffect(() => {
    if (exportOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportOpen, handleClickOutside]);

  const totalApproved = articles.reduce((sum, a) => sum + getSuggestions(a).filter((s) => s.approved === true).length, 0);
  const appliedCount = articles.filter((a) => a.status === 'applied').length;
  const pendingApproved = articles.filter((a) => a.status !== 'applied' && getSuggestions(a).some((s) => s.approved === true)).length;

  const approvedCount = selectedArticle
    ? getSuggestions(selectedArticle).filter((s) => s.approved === true).length
    : 0;
  const rejectedCount = selectedArticle
    ? getSuggestions(selectedArticle).filter((s) => s.approved === false).length
    : 0;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Review & Apply ✅</h1>
            <p className="page-desc">Approve, edit, or reject suggestions before applying to WordPress</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <span className="alert-icon">✅</span>
          {success}
        </div>
      )}

      {articles.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-icon">📝</span>
            <h3>No suggestions to review</h3>
            <p>Generate AI suggestions first on the AI Suggestions page.</p>
            <button className="btn btn-primary" onClick={() => navigate('suggestions')}>Go to Suggestions</button>
          </div>
        </div>
      ) : (
        <>
          {/* Global Apply bar */}
          <div className="card mb-4">
            <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <strong>{articles.length}</strong> articles · <strong>{totalApproved}</strong> approved links
                {appliedCount > 0 && (
                  <span className="score score-high" style={{ marginLeft: 8 }}>{appliedCount} applied</span>
                )}
                {pendingApproved > 0 && (
                  <span className="score score-medium" style={{ marginLeft: 4 }}>{pendingApproved} pending</span>
                )}
              </div>
              <div className="btn-group">
                <button className="btn btn-success btn-sm" onClick={handleApproveAllArticles} disabled={applying}>
                  ✓ Approve All
                </button>
                <button className="btn btn-danger btn-sm" onClick={handleRejectAllArticles} disabled={applying}>
                  ✕ Reject All
                </button>
                <div className="export-dropdown-wrap" ref={exportRef}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setExportOpen(!exportOpen)}
                    disabled={totalApproved === 0}
                  >
                    📥 Export ▾
                  </button>
                  {exportOpen && (
                    <div className="export-dropdown">
                      <button onClick={exportJSON}>
                        <span className="export-icon">{ }</span> JSON
                        <span className="export-desc">Raw data format</span>
                      </button>
                      <button onClick={exportXLSX}>
                        <span className="export-icon">📊</span> Excel (.xlsx)
                        <span className="export-desc">Spreadsheet with all links</span>
                      </button>
                      <button onClick={exportDOCX}>
                        <span className="export-icon">📝</span> Word (.docx)
                        <span className="export-desc">Formatted document for manual insertion</span>
                      </button>
                    </div>
                  )}
                </div>
                <button
                  className="btn btn-success"
                  onClick={handleApplyAll}
                  disabled={applying || pendingApproved === 0}
                >
                  {applying ? (
                    <><span className="pulse-dot" /> Applying {applyProgress?.done}/{applyProgress?.total}...</>
                  ) : pendingApproved < articles.filter((a) => getSuggestions(a).some((s) => s.approved === true)).length ? (
                    `🔄 Resume Apply (${pendingApproved} remaining)`
                  ) : (
                    `🚀 Apply All to WordPress (${pendingApproved} articles)`
                  )}
                </button>
              </div>
            </div>
            {applying && applyProgress?.current && (
              <div className="text-sm text-muted mt-3">
                Processing: {applyProgress.current}
                {applyProgress.failed?.length > 0 && (
                  <span className="text-sm" style={{ color: 'var(--red)', marginLeft: 8 }}>
                    ({applyProgress.failed.length} failed)
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="review-layout">
          {/* Article list */}
          <div className="review-sidebar">
            <div className="card">
              <h3>Articles ({articles.length})</h3>
              <div className="mt-4">
                {articles.map((a, i) => {
                  const aApproved = getSuggestions(a).filter((s) => s.approved === true).length;
                  const aTotal = (a.suggestions || []).length;
                  const isApplied = a.status === 'applied';
                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedArticle(a)}
                      className={`article-list-item ${selectedArticle?.url === a.url ? 'selected' : ''} ${isApplied ? 'applied' : ''}`}
                    >
                      <div className="article-title">
                        {isApplied && <span title="Applied" style={{ marginRight: 4 }}>✅</span>}
                        {a.title}
                      </div>
                      <div className="article-count">
                        {isApplied ? 'applied' : `${aApproved}/${aTotal} approved`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Suggestion details */}
          <div className="review-main">
            {selectedArticle ? (
              <div className="card">
                <div className="card-header">
                  <div>
                    <h2>{selectedArticle.title}</h2>
                    <a href={selectedArticle.url} target="_blank" rel="noopener noreferrer" className="link text-sm">
                      {selectedArticle.url}
                    </a>
                  </div>
                  <div className="btn-group">
                    <button className="btn btn-success btn-sm" onClick={() => handleApproveAll(selectedArticle)}>
                      ✓ Approve All
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleRejectAll(selectedArticle)}>
                      ✕ Reject All
                    </button>
                  </div>
                </div>

                {/* Mini stats under the header */}
                <div className="flex gap-3 mb-4">
                  <span className="score score-high">{approvedCount} approved</span>
                  <span className="score score-low">{rejectedCount} rejected</span>
                  <span className="text-sm text-muted" style={{ padding: '3px 10px' }}>
                    {getSuggestions(selectedArticle).length - approvedCount - rejectedCount} pending
                  </span>
                </div>

                {getSuggestions(selectedArticle).map((s, i) => (
                  <div key={i} className={`suggestion-card ${s.approved === true ? 'approved' : s.approved === false ? 'rejected' : ''}`}>
                    <div className="suggestion-header">
                      <span className="suggestion-number">LINK #{i + 1}</span>
                      {s.relevance_score != null && (
                        <span className={`score ${s.relevance_score > 0.7 ? 'score-high' : s.relevance_score > 0.4 ? 'score-medium' : 'score-low'}`}>
                          {(s.relevance_score * 100).toFixed(0)}% relevance
                        </span>
                      )}
                    </div>

                    <div className="suggestion-meta">
                      <strong>Target:</strong>{' '}
                      <a href={s.target_url} target="_blank" rel="noopener noreferrer">
                        {s.target_title || s.target_url}
                      </a>
                    </div>

                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <label style={{ fontSize: '0.78rem' }}>Anchor Text</label>
                      <input
                        className="anchor-edit"
                        value={s.anchor_text}
                        onChange={(e) => updateLocalSuggestion(selectedArticle.url, i, { anchor_text: e.target.value })}
                      />
                    </div>

                    <div className="suggestion-meta">
                      <strong>Placement:</strong> {s.placement_hint}
                    </div>

                    <div className="suggestion-actions">
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => updateLocalSuggestion(selectedArticle.url, i, { approved: true })}
                      >
                        ✓ Approve
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => updateLocalSuggestion(selectedArticle.url, i, { approved: false })}
                      >
                        ✕ Reject
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => updateLocalSuggestion(selectedArticle.url, i, { approved: undefined })}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card">
                <div className="empty-state">
                  <span className="empty-icon">👈</span>
                  <h3>Select an article</h3>
                  <p>Choose an article from the left to review and approve its link suggestions.</p>
                </div>
              </div>
            )}
          </div>
        </div>
        </>
      )}
    </div>
  );
}

export default ReviewApprove;
