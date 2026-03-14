/**
 * Integration test for admin queue and config API.
 * Run with API server up: npm run dev:api (in another terminal), then:
 *   node tests/api/admin-queue.integration.js
 * Uses ADMIN_API_KEY from env if set.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const BASE = process.env.API_BASE || 'http://localhost:3001';

function headers() {
  const key = process.env.ADMIN_API_KEY;
  const h = { 'Content-Type': 'application/json' };
  if (key) h.Authorization = `Bearer ${key}`;
  return h;
}

async function main() {
  let failed = 0;

  // GET /api/queue-pending
  try {
    const r = await fetch(`${BASE}/api/queue-pending`, { headers: headers() });
    const data = await r.json();
    if (r.status === 401) {
      console.log('queue-pending: 401 Unauthorized (set ADMIN_API_KEY if server requires it)');
    } else if (!r.ok) {
      console.log('queue-pending: unexpected', r.status, data);
      failed++;
    } else if (!Array.isArray(data)) {
      console.log('queue-pending: response is not array', typeof data);
      failed++;
    } else {
      console.log('queue-pending: OK,', data.length, 'pending');
      if (data.length > 0 && data[0].raw_input !== undefined) console.log('  - raw_input present on first item');
    }
  } catch (e) {
    console.log('queue-pending: fetch failed', e.message);
    failed++;
  }

  // GET /api/config
  try {
    const r = await fetch(`${BASE}/api/config`);
    const data = await r.json();
    if (!r.ok) {
      console.log('config: unexpected', r.status, data);
      failed++;
    } else {
      const required = ['actors', 'theatres', 'options', 'thresholds', 'scenarios'];
      const missing = required.filter((k) => !(k in data));
      if (missing.length) {
        console.log('config: missing keys', missing);
        failed++;
      } else {
        const hasConditions = 'threshold_conditions' in data;
        console.log('config: OK' + (hasConditions ? `, threshold_conditions ${data.threshold_conditions?.length ?? 0}` : ' (no threshold_conditions)'));
      }
    }
  } catch (e) {
    console.log('config: fetch failed', e.message);
    failed++;
  }

  // GET /api/review-assist (expect 404 for fake id, or brief for real id)
  try {
    const r = await fetch(`${BASE}/api/review-assist?queue_id=00000000-0000-0000-0000-000000000000`, { headers: headers() });
    const data = await r.json();
    if (r.status === 401) {
      console.log('review-assist: 401 Unauthorized');
      failed++;
    } else if (r.status === 404 && data.error) {
      console.log('review-assist: OK (404 for unknown id)');
    } else if (r.ok && data.contextSummary !== undefined) {
      console.log('review-assist: OK, brief returned');
    } else if (!r.ok && r.status !== 404) {
      console.log('review-assist: unexpected', r.status, data);
      failed++;
    } else {
      console.log('review-assist: OK');
    }
  } catch (e) {
    console.log('review-assist: fetch failed', e.message);
    failed++;
  }

  if (failed) process.exit(1);
  console.log('Integration checks passed.');
}

main();
