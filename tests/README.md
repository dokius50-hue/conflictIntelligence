# Tests

## Integration (API)

- **Admin queue + config:** Start the API (`npm run dev:api`), then run:
  ```bash
  node tests/api/admin-queue.integration.js
  ```
  - Asserts `GET /api/queue-pending` returns an array (or 401 if `ADMIN_API_KEY` is required and not set).
  - Asserts `GET /api/config` returns `actors`, `theatres`, `options`, `thresholds`, `scenarios`, `threshold_conditions`.
  - Set `ADMIN_API_KEY` in `.env` if the server is protected; the script uses it for the queue-pending request.
  - Optional: `API_BASE=http://localhost:3001` (default) to point at another host/port.

## Unit (reasoning)

- `lib/reasoning/` functions are pure; test with Node REPL or a small script that loads data and calls the functions (see README build sequence Stage 5).
