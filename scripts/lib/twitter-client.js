/**
 * ALL Twitter API calls go through this file.
 * TWITTER_API_MODE=rapidapi | (empty/v2) for direct Twitter v2.
 * Swap implementation here; no other code changes.
 */

const https = require('https');

/**
 * Fetch recent tweets for a handle. Returns array of { tweet_id, text, url, posted_at, author_handle, author_name }.
 */
async function fetchAccountTimeline(handle, sinceId = null) {
  if (process.env.TWITTER_API_MODE === 'rapidapi') {
    return fetchViaRapidAPI(handle, sinceId);
  }
  return fetchViaDirectAPI(handle, sinceId);
}

function httpGetJson(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Failed to parse JSON from Twitter RapidAPI: ${e.message}`));
        }
      });
    });
    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function fetchViaRapidAPI(handle, sinceId) {
  const key = process.env.RAPIDAPI_KEY;
  const host = process.env.RAPIDAPI_HOST || 'twitter241.p.rapidapi.com';
  if (!key) {
    console.warn('RAPIDAPI_KEY not set; skipping Twitter RapidAPI fetch');
    return [];
  }

  const query = new URLSearchParams({ username: handle });
  // Best-effort sinceId support if API exposes it; safe to ignore if not used.
  if (sinceId) query.set('since_id', sinceId);

  const options = {
    method: 'GET',
    hostname: host,
    path: `/user/tweets?${query.toString()}`,
    headers: {
      'X-RapidAPI-Key': key,
      'X-RapidAPI-Host': host,
    },
  };

  try {
    const data = await httpGetJson(options);
    const tweets = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    return tweets.map((t) => {
      const id = t.id_str || t.id || t.tweet_id;
      const text = t.full_text || t.text || '';
      const created = t.created_at || t.timestamp || t.posted_at;
      const user = t.user || t.author || {};
      const screenName = user.screen_name || user.username || handle;
      const name = user.name || user.display_name || null;
      return {
        tweet_id: id,
        text,
        url: `https://twitter.com/i/status/${id}`,
        posted_at: created ? new Date(created).toISOString() : new Date().toISOString(),
        author_handle: screenName,
        author_name: name,
      };
    });
  } catch (e) {
    console.error('Twitter RapidAPI fetch error for handle', handle, e.message);
    return [];
  }
}

async function fetchViaDirectAPI(handle, sinceId) {
  // Placeholder for direct Twitter v2 integration.
  console.warn('Twitter v2 direct not implemented; set TWITTER_API_MODE=rapidapi and RAPIDAPI_KEY');
  return [];
}

module.exports = {
  fetchAccountTimeline,
};
