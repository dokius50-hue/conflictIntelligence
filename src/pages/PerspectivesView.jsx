import { useState } from 'react';
import { usePerspectives } from '../hooks/usePerspectives';

const AUTHOR_TYPE_BADGE = {
  osint: 'bg-blue-100 text-blue-700',
  analyst: 'bg-purple-100 text-purple-700',
  official: 'bg-green-100 text-green-700',
  journalist: 'bg-orange-100 text-orange-700',
};

export default function PerspectivesView() {
  const [theatreFilter, setTheatreFilter] = useState('');
  const { perspectives, loading, error } = usePerspectives(theatreFilter || null);

  if (loading) return <p className="text-slate-600">Loading perspectives…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Analyst Perspectives</h1>
        <p className="mt-1 text-sm text-slate-500">
          Curated commentary from OSINT analysts and conflict researchers. These are
          analyst perspectives — not part of the factual event record.
        </p>
      </div>

      <div className="flex gap-2">
        {['', 'gulf_waters', 'red_sea'].map((t) => (
          <button
            key={t}
            onClick={() => setTheatreFilter(t)}
            className={`rounded px-3 py-1 text-sm ${
              theatreFilter === t
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t === '' ? 'All' : t === 'gulf_waters' ? 'Gulf' : 'Red Sea'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {perspectives.map((p) => (
          <PerspectiveCard key={p.id} perspective={p} />
        ))}
      </div>
      {perspectives.length === 0 && (
        <p className="text-slate-500">No perspectives for this selection.</p>
      )}
    </div>
  );
}

function PerspectiveCard({ perspective: p }) {
  const badgeClass = AUTHOR_TYPE_BADGE[p.author_type] || 'bg-slate-100 text-slate-600';

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold text-slate-800">@{p.author_handle}</span>
        {p.author_name && (
          <span className="text-slate-500">{p.author_name}</span>
        )}
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${badgeClass}`}>
          {p.author_type || 'analyst'}
        </span>
        {p.theatres?.map((t) => (
          <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
            {t}
          </span>
        ))}
        <span className="ml-auto text-xs text-slate-400">
          {p.posted_at?.slice(0, 10)}
        </span>
      </div>

      <p className="mt-2 text-sm text-slate-700 leading-relaxed">{p.tweet_text}</p>

      {p.summary && p.summary !== p.tweet_text && (
        <p className="mt-2 rounded bg-slate-50 p-2 text-xs text-slate-600 italic">
          {p.summary}
        </p>
      )}

      <a
        href={p.tweet_url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-xs text-blue-500 hover:underline"
      >
        Source →
      </a>
    </article>
  );
}
