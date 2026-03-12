/**
 * ALL Twitter API calls go through this file.
 * TWITTER_API_MODE=rapidapi | (empty/v2) for direct Twitter v2.
 * Swap implementation here; no other code changes.
 */

/**
 * Fetch recent tweets for a handle. Returns array of { tweet_id, text, url, posted_at, author_handle, author_name }.
 * Stub: implement fetchViaRapidAPI and fetchViaDirectAPI when keys are available.
 */
async function fetchAccountTimeline(handle, sinceId = null) {
  if (process.env.TWITTER_API_MODE === 'rapidapi') {
    return fetchViaRapidAPI(handle, sinceId);
  }
  return fetchViaDirectAPI(handle, sinceId);
}

async function fetchViaRapidAPI(handle, sinceId) {
  // TODO: RapidAPI Twitter client. Require RAPIDAPI_KEY and endpoint.
  console.warn('Twitter RapidAPI not implemented; add RAPIDAPI_KEY and implement fetchViaRapidAPI');
  return [];
}

async function fetchViaDirectAPI(handle, sinceId) {
  // TODO: Twitter API v2 GET /2/users/:id/tweets. Require TWITTER_BEARER_TOKEN.
  console.warn('Twitter v2 direct not implemented; add TWITTER_BEARER_TOKEN and implement fetchViaDirectAPI');
  return [];
}

module.exports = {
  fetchAccountTimeline,
};
