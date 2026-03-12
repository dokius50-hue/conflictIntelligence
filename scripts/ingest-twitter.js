/**
 * Twitter API → tweets_queue. Account list from config_twitter_accounts.
 * Nothing writes to published tables. Raw responses saved to /logs/raw/.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { supabase } = require('./lib/supabase');
const { fetchAccountTimeline } = require('./lib/twitter-client');

const CONFLICT_ID = process.env.CONFLICT_ID || 'hormuz_2026';

function ensureLogDir(subdir) {
  const dir = path.join(process.cwd(), 'logs', subdir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function saveRaw(source, data) {
  const dir = ensureLogDir('raw');
  const name = `${new Date().toISOString().slice(0, 13).replace('T', '-')}-${source}.json`;
  fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2), 'utf8');
}

async function getAccountsToMonitor(conflictId) {
  const { data, error } = await supabase
    .from('config_twitter_accounts')
    .select('handle, author_type')
    .eq('conflict_id', conflictId)
    .eq('is_active', true);
  if (error) throw error;
  return data || [];
}

async function run() {
  const accounts = await getAccountsToMonitor(CONFLICT_ID);
  if (accounts.length === 0) {
    console.log('No active Twitter accounts in config_twitter_accounts; add rows for this conflict.');
    return;
  }

  const allTweets = [];
  for (const { handle, author_type } of accounts) {
    const tweets = await fetchAccountTimeline(handle);
    for (const t of tweets) {
      allTweets.push({
        ...t,
        author_type: author_type || 'journalist',
      });
    }
  }
  saveRaw('twitter', { accounts: accounts.map((a) => a.handle), tweets: allTweets });

  let inserted = 0;
  for (const t of allTweets) {
    const row = {
      conflict_id: CONFLICT_ID,
      tweet_id: t.tweet_id,
      author_handle: t.author_handle || 'unknown',
      author_name: t.author_name || null,
      author_type: t.author_type || 'journalist',
      tweet_text: t.text || '',
      tweet_url: t.url || `https://twitter.com/i/status/${t.tweet_id}`,
      posted_at: t.posted_at || new Date().toISOString(),
      disposition: 'pending',
      raw_tweet: t,
    };
    const { error } = await supabase.from('tweets_queue').insert(row).select('id');
    if (error) {
      if (error.code === '23505') continue; // unique tweet_id
      console.error('Insert error:', error.message);
      continue;
    }
    inserted++;
  }
  console.log(`Twitter ingest: ${inserted} tweets queued.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
