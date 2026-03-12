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

  // Step 1: resolve username -> user(rest_id) via /user
  const userQuery = new URLSearchParams({ username: handle });
  const userOptions = {
    method: 'GET',
    hostname: host,
    path: `/user?${userQuery.toString()}`,
    headers: {
      'X-RapidAPI-Key': key,
      'X-RapidAPI-Host': host,
    },
  };

  try {
    const userData = await httpGetJson(userOptions);
    // Inspect once while stabilising mapping.
    try {
      console.log('twitter241 /user raw (truncated):', JSON.stringify(userData).slice(0, 400));
    } catch {}
    const userRestId =
      userData?.result?.data?.user?.result?.rest_id ||
      userData?.data?.user?.result?.rest_id ||
      userData?.result?.rest_id ||
      userData?.rest_id ||
      userData?.id ||
      null;
    if (!userRestId) {
      console.warn('twitter241: could not resolve user rest_id for handle', handle);
      return [];
    }

    // Step 2: fetch tweets via /user-tweets?user=<rest_id>&count=20
    const tweetsQuery = new URLSearchParams({ user: String(userRestId), count: '20' });
    const tweetsOptions = {
      method: 'GET',
      hostname: host,
      path: `/user-tweets?${tweetsQuery.toString()}`,
      headers: {
        'X-RapidAPI-Key': key,
        'X-RapidAPI-Host': host,
      },
    };

    const data = await httpGetJson(tweetsOptions);
    const instructions = data?.result?.timeline?.instructions || [];
    const out = [];
    const pushFromEntry = (entry) => {
      const ic = entry?.content?.itemContent;
      if (!ic || ic.__typename !== 'TimelineTweet') return;
      const tr = ic.tweet_results?.result;
      if (!tr || tr.__typename !== 'Tweet') return;
      const id = tr.rest_id || tr.legacy?.id_str || tr.legacy?.id;
      const text =
        tr.note_tweet?.note_tweet_results?.result?.text ||
        tr.legacy?.full_text ||
        tr.legacy?.text ||
        '';
      const created = tr.legacy?.created_at;
      const user = tr.core?.user_results?.result;
      const screenName = user?.legacy?.screen_name || user?.core?.screen_name || handle;
      const name = user?.legacy?.name || user?.core?.name || null;
      if (!id || !text) return;
      out.push({
        tweet_id: id,
        text,
        url: `https://twitter.com/i/status/${id}`,
        posted_at: created ? new Date(created).toISOString() : new Date().toISOString(),
        author_handle: screenName,
        author_name: name,
      });
    };
    for (const instr of instructions) {
      if (Array.isArray(instr.entries)) {
        for (const e of instr.entries) pushFromEntry(e);
      } else if (instr.entry) {
        pushFromEntry(instr.entry);
      }
    }
    return out;
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
