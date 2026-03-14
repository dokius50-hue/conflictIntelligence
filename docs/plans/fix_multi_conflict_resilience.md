# Fix Multi-Conflict UI Resilience

**Status:** Pending. Implement when picking up in new session.

## Root cause

`useSearchParams` must be called inside a component rendered within `<Routes>`. Our `ConflictProvider` wraps `Layout` and `Routes` — it is a *parent* of Routes, not a child. That violates the React Router contract and causes runtime errors on localhost.

---

## Fix 1: Move ConflictProvider inside Routes (layout route)

Restructure so `ConflictProvider` is rendered as the element of a Route:

```jsx
// App.jsx
<Routes>
  <Route element={<ConflictLayout />}>
    <Route path="/" element={<Home />} />
    <Route path="/timeline" element={<TimelinePage />} />
    ...
  </Route>
</Routes>

function ConflictLayout() {
  return (
    <ConflictProvider>
      <Layout>
        <Outlet />
      </Layout>
    </ConflictProvider>
  );
}
```

- `ConflictProvider` is now inside the Routes tree (as the element of a parent Route).
- `Layout` wraps `Outlet`; page content renders in `Outlet`.
- `useSearchParams`, `useNavigate`, `useLocation` are valid inside this tree.

---

## Fix 2: Defensive conflictId

- In `useConflict()`: return `DEFAULT_CONFLICT` when context is null.
- In components that receive `conflictId` as prop: use `conflictId ?? DEFAULT_CONFLICT` before API calls.

---

## Fix 3: Graceful API failure handling

- **Layout** (`/api/conflicts`): On fetch error, set `conflicts = []` (already done).
- **Hooks**: On fetch error, keep previous data and set `error` state.

---

## Fix 4: ConfigEditor and Layout prop safety

- Use `conflictId ?? DEFAULT_CONFLICT` when passing to panels and in `navTo`.

---

## Future: Hybrid domains

| Scenario | Behavior |
|----------|----------|
| **Single domain, URL param** | `?conflict_id=pak_afg_2025` overrides `VITE_CONFLICT_ID`. Shareable. |
| **Subdomain per conflict** | `hormuz.conflictintel.app` build with `VITE_CONFLICT_ID=hormuz_2026`. No switcher needed. |
| **Same app, multiple deploys** | Each deploy has its own `VITE_CONFLICT_ID`. URL param can still override. |

**Resilient pattern:** Resolve conflict in order: (1) `?conflict_id=` from URL, (2) `VITE_CONFLICT_ID`, (3) `hormuz_2026`.

---

## Files to change

1. `src/App.jsx` — Introduce `ConflictLayout` with `ConflictProvider` + `Layout` + `Outlet`; wrap all routes in parent `Route element={<ConflictLayout />}`.
2. `src/contexts/ConflictContext.jsx` — Add `conflictId ?? DEFAULT_CONFLICT` in memo.
3. `src/admin/ConfigEditor.jsx` — Use `conflictId ?? DEFAULT_CONFLICT` when passing to panels.
4. `src/components/Layout.jsx` — Use `conflictId ?? DEFAULT_CONFLICT` in `navTo`.

---

## Verification

1. Run `npm run dev` and `npm run dev:api`; load `http://localhost:5173/` and `http://localhost:5173/timeline?conflict_id=pak_afg_2025`.
2. Confirm no console errors.
3. Switch conflict via dropdown; confirm URL updates and data refetches.
