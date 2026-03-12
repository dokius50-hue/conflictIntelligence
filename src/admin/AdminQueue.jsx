import { useState, useEffect } from 'react';

const API = '/api';

export default function AdminQueue() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API}/queue-pending`)
      .then((r) => r.json())
      .then((data) => {
        setPending(Array.isArray(data) ? data : []);
        setError(data?.error || null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const approve = (queueId, edits = {}) => {
    fetch(`${API}/queue-approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queue_id: queueId, ...edits }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setPending((prev) => prev.filter((r) => r.id !== queueId));
      })
      .catch((e) => setError(e.message));
  };

  const reject = (queueId, notes) => {
    fetch(`${API}/queue-reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queue_id: queueId, reviewer_notes: notes }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setPending((prev) => prev.filter((r) => r.id !== queueId));
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
                {row.ai_suggested_tags?.reasoning && (
                  <p className="mt-2 text-xs italic text-slate-500">AI: {row.ai_suggested_tags.reasoning}</p>
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
    </div>
  );
}
