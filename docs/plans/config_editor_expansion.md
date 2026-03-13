# Config Editor Expansion

## What's being added

The Config Editor currently has Actors and Theatres tabs. Two new tabs:

- **Options** — lists all `config_options` grouped by actor; each row has a status dropdown (`available / executed / degraded / foreclosed`) and a Save button
- **Thresholds** — lists `config_threshold_conditions` grouped under their parent threshold label; each condition row has a met/unmet toggle and a Save button

This enables manual state correction without needing an event in the queue.

## Note on Multi-conflict (#6)

Zero code changes required. The full 8-step multi-conflict deployment guide already exists in `CONFLICT_INTELLIGENCE_README.md`. Nothing to implement.

---

## New API endpoints

### `api/config-options.js`

Follows the exact pattern of `api/config-actors.js`:

- `GET ?conflict_id=` — returns all options for the conflict (all statuses, sorted by actor then intensity)
- `PATCH { id, updates: { status } }` — updates a single option's status; calls `validate_config_references` for warnings; returns updated options array
- Protected by `requireAdminAuth`

### `api/config-threshold-conditions.js`

- `GET ?conflict_id=` — fetches all thresholds for the conflict, then all their conditions; returns `{ thresholds, conditions }`
- `PATCH { id, updates: { status } }` — updates a single condition's `status`; after the update also checks if all conditions for that threshold are satisfied and if so sets `config_thresholds.status = 'crossed'` (same logic as `queue-approve.js`)
- Protected by `requireAdminAuth`

---

## Registration

Both new endpoints must be added in two places:

**`server.js`** — add to the `routes` map and `ADMIN_ROUTES` set:

```js
const configOptions = require('./api/config-options');
const configThresholdConditions = require('./api/config-threshold-conditions');
// in routes:
'/api/config-options': configOptions,
'/api/config-threshold-conditions': configThresholdConditions,
// in ADMIN_ROUTES:
'/api/config-options',
'/api/config-threshold-conditions',
```

**`netlify/functions/api.js`** — add both to the routes object.

---

## Config Editor UI

**`src/admin/ConfigEditor.jsx`** — add two tabs:

```jsx
// Existing tabs:
'actors' | 'theatres'
// New tabs:
'options' | 'thresholds'
```

### OptionsPanel

- Fetches `GET /api/config-options`
- Groups options by `actor_id`
- Each row: ID (greyed), label, actor badge, status dropdown (`available / executed / degraded / foreclosed`), intensity dots, Save button
- On Save: `PATCH /api/config-options` with `{ id, updates: { status } }`
- Status color coding matches existing `OptionView.jsx` patterns

### ThresholdsPanel

- Fetches `GET /api/config-threshold-conditions` (returns `{ thresholds, conditions }`)
- Groups conditions under their parent threshold as collapsible sections
- Each condition row: label, current status badge, toggle button ("Mark Met" / "Mark Unmet")
- On toggle: `PATCH /api/config-threshold-conditions` with `{ id, updates: { status: 'satisfied' | 'unmet' } }`
- If the PATCH response indicates the parent threshold is now `crossed`, show a visual indicator on the threshold header

---

## Files to create

- `api/config-options.js`
- `api/config-threshold-conditions.js`

## Files to modify

- `server.js` — register both new routes
- `netlify/functions/api.js` — register both new routes
- `src/admin/ConfigEditor.jsx` — add Options and Thresholds tabs + panels
