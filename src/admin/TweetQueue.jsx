import { useEffect, useState } from 'react';

const API = '/api';

function adminAuthHeaders() {
  const key = import.meta.env.VITE_ADMIN_API_KEY;
  if (!key) return {};
  return { Authorization: `Bearer ${key}` };
}

export default function TweetQueue() {
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API}/tweets-pending`, { headers: { ...adminAuthHeaders() } })
      .then((r) => r.json())
      .then((data) => {
        setTweets(Array.isArray(data) ? data : []);
        setError(data?.error || null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const updateDisposition = (id, payload) => {
    fetch(`${API}/tweet-disposition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminAuthHeaders() },
      body: JSON.stringify({ tweet_id: id, ...payload }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setTweets((prev) => prev.filter((t) => t.id !== id));
      })
      .catch((e) => setError(e.message));
  };

  if (loading) return <p className="text-slate-600">Loading tweet queue…</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">Tweet Queue</h1>
      <p className="mt-1 text-slate-600">{tweets.length} pending</p>
      <ul className="mt-4 space-y-4">
        {tweets.map((t) => (
          <li key={t.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium text-slate-500">
                  @{t.author_handle} · {t.author_type || 'unknown'}
                </span>
                <p className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">{t.tweet_text}</p>
                <a href={t.tweet_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
                  View on Twitter
                </a>
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateDisposition(t.id, {
                      disposition: 'event',
                      event_payload: {
                        title: t.tweet_text.slice(0, 80),
                        description: t.tweet_text,
                        source_url: t.tweet_url,
                      },
                    })
                  }
                  className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                >
                  Promote to Event
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateDisposition(t.id, {
                      disposition: 'perspective',
                      perspective_payload: {
                        summary: t.tweet_text.slice(0, 200),
                      },
                    })
                  }
                  className="rounded bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
                >
                  Mark as Perspective
                </button>
                <button
                  type="button"
                  onClick={() => updateDisposition(t.id, { disposition: 'rejected' })}
                  className="rounded bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-300"
                >
                  Reject
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {tweets.length === 0 && <p className="mt-4 text-slate-500">No pending tweets.</p>}
    </div>
  );
}

