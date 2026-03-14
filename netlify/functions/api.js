/**
 * Single Netlify Function that wraps all API route handlers.
 * All api/*.js files use Express-compatible req/res — no changes needed there.
 * Netlify redirects /api/* here; serverless-http passes the original path to
 * Express so existing route strings (e.g. '/api/events') match as-is.
 */
require('dotenv').config();
const express = require('express');
const serverless = require('serverless-http');

const app = express();
app.use(express.json());

const routes = {
  '/api/queue-pending':     require('../../api/queue-pending'),
  '/api/queue-approve':     require('../../api/queue-approve'),
  '/api/queue-reject':      require('../../api/queue-reject'),
  '/api/validate-config':   require('../../api/validate-config'),
  '/api/config-actors':     require('../../api/config-actors'),
  '/api/config-theatres':   require('../../api/config-theatres'),
  '/api/config-options':    require('../../api/config-options'),
  '/api/config-threshold-conditions': require('../../api/config-threshold-conditions'),
  '/api/tweets-pending':    require('../../api/tweets-pending'),
  '/api/tweet-disposition': require('../../api/tweet-disposition'),
  '/api/events':            require('../../api/events'),
  '/api/config':            require('../../api/config'),
  '/api/options':           require('../../api/options'),
  '/api/thresholds':        require('../../api/thresholds'),
  '/api/scenarios':         require('../../api/scenarios'),
  '/api/perspectives':      require('../../api/perspectives'),
  '/api/market':            require('../../api/market'),
  '/api/causal-chain':      require('../../api/causal-chain'),
};

for (const [path, handler] of Object.entries(routes)) {
  app.all(path, handler);
}

module.exports.handler = serverless(app);
