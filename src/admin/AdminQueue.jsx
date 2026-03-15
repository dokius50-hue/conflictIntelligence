import { useState, useEffect } from 'react';
import { useConflict } from '../contexts/ConflictContext';

const API = '/api';

function adminAuthHeaders() {
  const key = import.meta.env.VITE_ADMIN_API_KEY;
  if (!key) return {};
  return { Authorization: `Bearer ${key}` };
}

function rawDisplay(raw) {
  if (raw == null) return '(none)';
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return raw;
    }
  }
  return JSON.stringify(raw, null, 2);
}

function AITags({ tags }) {
  if (!tags || typeof tags !== 'object') return null;
  const { options_executed, options_degraded, options_foreclosed, options_unlocked, thresholds_advanced, reasoning } = tags;
  const hasAny = [options_executed, options_degraded, options_foreclosed, options_unlocked, thresholds_advanced].some(
    (a) => Array.isArray(a) && a.length > 0
  );
  if (!hasAny && !reasoning) return null;
  return (
    <div className="mt-2 rounded border border-amber-200 bg-amber-50/80 p-2 text-xs">
      {reasoning && <p className="italic text-slate-600">AI: {reasoning}</p>}
      {hasAny && (
        <div className="mt-1 flex flex-wrap gap-1">
          {Array.isArray(options_executed) &&
            options_executed.length > 0 &&
            options_executed.map((id) => (
              <span key={id} className="rounded bg-green-200 px-1.5 py-0.5 text-slate-800" title="executed">
                +{id}
              </span>
            ))}
          {Array.isArray(options_degraded) &&
            options_degraded.length > 0 &&
            options_degraded.map((id) => (
              <span key={id} className="rounded bg-yellow-200 px-1.5 py-0.5 text-slate-800" title="degraded">
                ~{id}
              </span>
            ))}
          {Array.isArray(options_foreclosed) &&
            options_foreclosed.length > 0 &&
            options_foreclosed.map((id) => (
              <span key={id} className="rounded bg-red-200 px-1.5 py-0.5 text-slate-800" title="foreclosed">
                ×{id}
              </span>
            ))}
          {Array.isArray(options_unlocked) &&
            options_unlocked.length > 0 &&
            options_unlocked.map((id) => (
              <span key={id} className="rounded bg-blue-200 px-1.5 py-0.5 text-slate-800" title="unlocked">
                ↑{id}
              </span>
            ))}
          {Array.isArray(thresholds_advanced) &&
            thresholds_advanced.length > 0 &&
            thresholds_advanced.map((id) => (
              <span key={id} className="rounded bg-purple-200 px-1.5 py-0.5 text-slate-800" title="threshold">
                ⟳{id}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}

export default function AdminQueue() {
  const { conflictId } = useConflict();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openRawId, setOpenRawId] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    fetch(`${API}/queue-pending?conflict_id=${encodeURIComponent(conflictId)}`, { headers: { ...adminAuthHeaders() } })
      .then((r) => r.json())
      .then((data) => {
        setPending(Array.isArray(data) ? data : []);
        setError(data?.error || null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [conflictId]);

  useEffect(() => {
    if (!editRow) return;
    fetch(`${API}/config?conflict_id=${encodeURIComponent(conflictId)}`)
      .then((r) => r.json())
      .then((data) => setConfig(data))
      .catch(() => setConfig({ options: [], threshold_conditions: [] }));
  }, [editRow, conflictId]);

  const approve = (queueId, edits = {}) => {
    fetch(`${API}/queue-approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminAuthHeaders() },
      body: JSON.stringify({ queue_id: queueId, ...edits }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setPending((prev) => prev.filter((r) => r.id !== queueId));
          setEditRow(null);
        }
      })
      .catch((e) => setError(e.message));
  };

  const reject = (queueId, notes) => {
    fetch(`${API}/queue-reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminAuthHeaders() },
      body: JSON.stringify({ queue_id: queueId, reviewer_notes: notes }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setPending((prev) => prev.filter((r) => r.id !== queueId));
          setEditRow(null);
        }
      })
      .catch((e) => setError(e.message));
  };

  if (loading) return <p className="text-slate-600">Loading queue…</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">Review Queue</h1>
      <p className="mt-1 text-slate-600">{pending.length} pending</p>
      <ul className="mt-4 space-y-4">
        {pending.map((row) => (
          <li key={row.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium text-slate-500">[{row.ingestion_source || 'P'}]</span>
                <h2 className="mt-1 font-medium text-slate-900">{row.title || '(no title)'}</h2>
                <p className="mt-1 text-sm text-slate-600 line-clamp-2">{row.description}</p>
                <a href={row.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
                  Source
                </a>
                <AITags tags={row.ai_suggested_tags} />
                <button
                  type="button"
                  onClick={() => setOpenRawId(openRawId === row.id ? null : row.id)}
                  className="mt-2 text-xs text-slate-500 hover:underline"
                >
                  {openRawId === row.id ? 'Hide raw input' : 'Show raw input'}
                </button>
                {openRawId === row.id && (
                  <pre className="mt-2 max-h-48 overflow-auto rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700 whitespace-pre-wrap">
                    {rawDisplay(row.raw_input)}
                  </pre>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => approve(row.id)}
                  className="rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => setEditRow(row)}
                  className="rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
                >
                  Edit & Approve
                </button>
                <button
                  type="button"
                  onClick={() => reject(row.id)}
                  className="rounded bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-300"
                >
                  Reject
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {pending.length === 0 && <p className="mt-4 text-slate-500">No pending items.</p>}

      {editRow && (
        <EditApproveModal
          row={editRow}
          config={config}
          conflictId={conflictId}
          onClose={() => setEditRow(null)}
          onApprove={(edits) => approve(editRow.id, edits)}
          onReject={(notes) => reject(editRow.id, notes)}
        />
      )}
    </div>
  );
}

function EditApproveModal({ row, config, conflictId, onClose, onApprove, onReject }) {
  const [title, setTitle] = useState(row.title ?? '');
  const [description, setDescription] = useState(row.description ?? '');
  const [sourceUrl, setSourceUrl] = useState(row.source_url ?? '');
  const [optionsExecuted, setOptionsExecuted] = useState(row.options_executed ?? row.ai_suggested_tags?.options_executed ?? []);
  const [optionsDegraded, setOptionsDegraded] = useState(row.options_degraded ?? row.ai_suggested_tags?.options_degraded ?? []);
  const [optionsForeclosed, setOptionsForeclosed] = useState(row.options_foreclosed ?? row.ai_suggested_tags?.options_foreclosed ?? []);
  const [optionsUnlocked, setOptionsUnlocked] = useState(row.options_unlocked ?? row.ai_suggested_tags?.options_unlocked ?? []);
  const [thresholdsAdvanced, setThresholdsAdvanced] = useState(row.thresholds_advanced ?? row.ai_suggested_tags?.thresholds_advanced ?? []);
  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(true);
  const [aiTags, setAiTags] = useState(null);
  const [aiTagsLoading, setAiTagsLoading] = useState(false);
  const [aiTagsError, setAiTagsError] = useState(null);

  useEffect(() => {
    setBriefLoading(true);
    setBrief(null);
    fetch(`${API}/review-assist?queue_id=${row.id}&conflict_id=${encodeURIComponent(conflictId)}`, { headers: { ...adminAuthHeaders() } })
      .then((r) => r.json())
      .then((data) => setBrief(data.error ? null : data))
      .catch(() => setBrief(null))
      .finally(() => setBriefLoading(false));
  }, [row.id, conflictId]);

  const requestAiTags = () => {
    setAiTagsLoading(true);
    setAiTagsError(null);
    fetch(`${API}/suggest-tags?queue_id=${row.id}&conflict_id=${encodeURIComponent(conflictId)}`, { headers: { ...adminAuthHeaders() } })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setAiTagsError(data.error);
        } else if (data.tags) {
          setAiTags(data.tags);
          if (data.tags.options_executed?.length) setOptionsExecuted((prev) => [...new Set([...prev, ...data.tags.options_executed])]);
          if (data.tags.options_degraded?.length) setOptionsDegraded((prev) => [...new Set([...prev, ...data.tags.options_degraded])]);
          if (data.tags.options_foreclosed?.length) setOptionsForeclosed((prev) => [...new Set([...prev, ...data.tags.options_foreclosed])]);
          if (data.tags.options_unlocked?.length) setOptionsUnlocked((prev) => [...new Set([...prev, ...data.tags.options_unlocked])]);
          if (data.tags.thresholds_advanced?.length) setThresholdsAdvanced((prev) => [...new Set([...prev, ...data.tags.thresholds_advanced])]);
        }
      })
      .catch((e) => setAiTagsError(e.message))
      .finally(() => setAiTagsLoading(false));
  };

  const options = config?.options ?? [];
  const conditions = config?.threshold_conditions ?? [];

  const toggleArray = (arr, setter, id) => {
    setter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = () => {
    onApprove({
      title: title || row.title,
      description: description || row.description,
      source_url: sourceUrl || row.source_url,
      options_executed: optionsExecuted,
      options_degraded: optionsDegraded,
      options_foreclosed: optionsForeclosed,
      options_unlocked: optionsUnlocked,
      thresholds_advanced: thresholdsAdvanced,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-slate-800">Edit & Approve</h3>
        {briefLoading && <p className="mt-2 text-xs text-slate-500">Loading review brief…</p>}
        {!briefLoading && brief && (
          <div className="mt-2 rounded border border-slate-200 bg-slate-50 p-3 text-xs">
            <p><strong>Context:</strong> {brief.contextSummary}</p>
            <p className="mt-1"><strong>Source:</strong> {brief.verification}</p>
            <p className="mt-1"><strong>Pattern:</strong> {brief.patternNote}</p>
            {brief.flags?.length > 0 && (
              <p className="mt-1 text-amber-700"><strong>Flags:</strong> {brief.flags.join(', ')}</p>
            )}
          </div>
        )}
        <div className="mt-2">
          {!aiTags && !aiTagsLoading && (
            <button
              type="button"
              onClick={requestAiTags}
              className="rounded bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600"
            >
              Suggest Tags (AI)
            </button>
          )}
          {aiTagsLoading && <p className="text-xs text-amber-600">Running tag analysis (3 agents)…</p>}
          {aiTagsError && <p className="text-xs text-red-500">Tag error: {aiTagsError}</p>}
          {aiTags && (
            <div className="rounded border border-amber-200 bg-amber-50/80 p-2 text-xs">
              <p className="font-medium text-amber-800">AI Tag Suggestions (applied to selections below)</p>
              {aiTags.reasoning && <p className="mt-1 italic text-slate-600">{aiTags.reasoning}</p>}
              {aiTags.flags?.length > 0 && (
                <p className="mt-1 text-amber-700"><strong>Cross-theatre:</strong> {aiTags.flags.join('; ')}</p>
              )}
              <p className="mt-1 text-slate-500">Confidence: {aiTags.confidence || 'medium'}</p>
            </div>
          )}
        </div>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Source URL</span>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          {options.length > 0 && (
            <>
              <label className="block">
                <span className="text-xs font-medium text-slate-500">Options executed (valid IDs only)</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleArray(optionsExecuted, setOptionsExecuted, opt.id)}
                      className={`rounded px-2 py-0.5 text-xs ${optionsExecuted.includes(opt.id) ? 'bg-green-200' : 'bg-slate-100'}`}
                    >
                      {opt.label || opt.id}
                    </button>
                  ))}
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-500">Options degraded</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleArray(optionsDegraded, setOptionsDegraded, opt.id)}
                      className={`rounded px-2 py-0.5 text-xs ${optionsDegraded.includes(opt.id) ? 'bg-yellow-200' : 'bg-slate-100'}`}
                    >
                      {opt.label || opt.id}
                    </button>
                  ))}
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-500">Options foreclosed</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleArray(optionsForeclosed, setOptionsForeclosed, opt.id)}
                      className={`rounded px-2 py-0.5 text-xs ${optionsForeclosed.includes(opt.id) ? 'bg-red-200' : 'bg-slate-100'}`}
                    >
                      {opt.label || opt.id}
                    </button>
                  ))}
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-500">Options unlocked</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleArray(optionsUnlocked, setOptionsUnlocked, opt.id)}
                      className={`rounded px-2 py-0.5 text-xs ${optionsUnlocked.includes(opt.id) ? 'bg-blue-200' : 'bg-slate-100'}`}
                    >
                      {opt.label || opt.id}
                    </button>
                  ))}
                </div>
              </label>
            </>
          )}
          {conditions.length > 0 && (
            <label className="block">
              <span className="text-xs font-medium text-slate-500">Thresholds advanced (conditions)</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {conditions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleArray(thresholdsAdvanced, setThresholdsAdvanced, c.id)}
                    className={`rounded px-2 py-0.5 text-xs ${thresholdsAdvanced.includes(c.id) ? 'bg-purple-200' : 'bg-slate-100'}`}
                  >
                    {c.description?.slice(0, 40) || c.id}
                  </button>
                ))}
              </div>
            </label>
          )}
        </div>
        <div className="mt-6 flex gap-2">
          <button type="button" onClick={submit} className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
            Approve with edits
          </button>
          <button type="button" onClick={onClose} className="rounded bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300">
            Cancel
          </button>
          <button type="button" onClick={() => onReject()} className="rounded bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200">
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
