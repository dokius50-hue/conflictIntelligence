/**
 * Optional admin API key. If ADMIN_API_KEY is set, admin routes require
 * Authorization: Bearer <ADMIN_API_KEY> or x-admin-key: <ADMIN_API_KEY>.
 * If not set, requests are allowed (local dev without key).
 */

function getAdminKeyFromRequest(req) {
  const auth = req.headers?.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return req.headers?.['x-admin-key']?.trim() || null;
}

function requireAdminAuth(req, res) {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) return true; // no key configured: allow (local dev)
  const provided = getAdminKeyFromRequest(req);
  if (provided && provided === expected) return true;
  res.writeHead(401, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Unauthorized' }));
  return false;
}

module.exports = { requireAdminAuth, getAdminKeyFromRequest };
