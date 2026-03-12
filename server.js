/**
 * Local dev API server. Admin UI proxies /api to this. On Vercel, use /api/* serverless.
 */
require('dotenv').config();
const http = require('http');
const url = require('url');
const { requireAdminAuth } = require('./api/lib/adminAuth');

const queuePending = require('./api/queue-pending');
const queueApprove = require('./api/queue-approve');
const queueReject = require('./api/queue-reject');
const validateConfig = require('./api/validate-config');
const configActors = require('./api/config-actors');
const configTheatres = require('./api/config-theatres');
const tweetsPending = require('./api/tweets-pending');
const tweetDisposition = require('./api/tweet-disposition');
const events = require('./api/events');
const config = require('./api/config');
const options = require('./api/options');
const thresholds = require('./api/thresholds');
const scenarios = require('./api/scenarios');
const perspectives = require('./api/perspectives');
const market = require('./api/market');

const routes = {
  '/api/queue-pending': queuePending,
  '/api/queue-approve': queueApprove,
  '/api/queue-reject': queueReject,
  '/api/validate-config': validateConfig,
  '/api/config-actors': configActors,
  '/api/config-theatres': configTheatres,
  '/api/tweets-pending': tweetsPending,
  '/api/tweet-disposition': tweetDisposition,
  '/api/events': events,
  '/api/config': config,
  '/api/options': options,
  '/api/thresholds': thresholds,
  '/api/scenarios': scenarios,
  '/api/perspectives': perspectives,
  '/api/market': market,
};

const ADMIN_ROUTES = new Set([
  '/api/queue-pending',
  '/api/queue-approve',
  '/api/queue-reject',
  '/api/validate-config',
  '/api/config-actors',
  '/api/config-theatres',
  '/api/tweets-pending',
  '/api/tweet-disposition',
]);

const PORT = process.env.API_PORT || 3001;

const server = http.createServer(async (req, res) => {
  const pathname = url.parse(req.url).pathname;
  const handler = routes[pathname];
  if (!handler) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', async () => {
    if (ADMIN_ROUTES.has(pathname) && !requireAdminAuth(req, res)) return;
    const query = url.parse(req.url, true).query;
    const reqProxy = {
      method: req.method,
      headers: req.headers,
      query,
      body: body || undefined,
    };
    let sent = false;
    const resProxy = {
      setHeader(k, v) {
        if (!sent) res.setHeader(k, v);
      },
      status(code) {
        if (!sent) {
          res.writeHead(code, { 'Content-Type': 'application/json' });
          sent = true;
        }
        return resProxy;
      },
      json(obj) {
        if (!sent) res.writeHead(200, { 'Content-Type': 'application/json' });
        sent = true;
        res.end(JSON.stringify(obj));
      },
      end(t) {
        sent = true;
        res.end(t);
      },
    };
    try {
      await handler(reqProxy, resProxy);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`API server http://localhost:${PORT}`);
});
