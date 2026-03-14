/**
 * Fetches source URL and checks if key facts (title, description snippets) appear on the page.
 * Guards against hallucination — Perplexity sometimes fabricates URLs or mangles content.
 */
async function verifySource(queueItem) {
  const url = queueItem.source_url;
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return { ok: false, reason: 'No valid source URL' };
  }
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ConflictIntelligence/1.0 (review-assist)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const html = await res.text();
    const title = (queueItem.title || '').trim();
    const desc = (queueItem.description || '').trim().slice(0, 200);
    const titleWords = title.split(/\s+/).filter((w) => w.length > 3).slice(0, 5);
    const descWords = desc.split(/\s+/).filter((w) => w.length > 4).slice(0, 5);
    const htmlLower = html.toLowerCase();
    const titleHits = titleWords.filter((w) => htmlLower.includes(w.toLowerCase()));
    const descHits = descWords.filter((w) => htmlLower.includes(w.toLowerCase()));
    const titleMatch = titleWords.length === 0 || titleHits.length >= Math.min(2, titleWords.length);
    const descMatch = descWords.length === 0 || descHits.length >= Math.min(2, descWords.length);
    if (titleMatch && descMatch) return { ok: true };
    return { ok: false, reason: 'Key facts from title/description not found on page' };
  } catch (e) {
    return { ok: false, reason: e.message || 'Fetch failed' };
  }
}

module.exports = { verifySource };
