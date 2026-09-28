# Frontend Agent — Results

## What was built

A React app (Vite) in `frontend/` for the Reading List Tracker:

- **Display books**: `App.jsx` fetches books on mount and renders them via
  `components/BookList.jsx` / `BookCard.jsx`.
- **Filter**: `components/FilterBar.jsx` provides All / To Read / Reading / Done
  filter buttons; filtering happens client-side over the loaded book list.
- **Change book status**: each book card has a status `<select>` that calls
  `updateBookStatus`, applies an optimistic UI update, and rolls back with a
  per-row error message if the request fails.
- **API layer**: `src/api.js` centralizes all backend calls (`fetchBooks`,
  `updateBookStatus`) behind a shared `request()` helper that handles JSON
  parsing and throws readable errors on non-2xx responses or network failures.
- **Loading / success / error handling**: `App.jsx` tracks `loading`,
  `loadError`, and per-book `pendingIds`/`rowErrors` state; shows a loading
  message, an empty-filter message, a retryable error banner for the initial
  fetch, and a per-row error message for a failed status update.

## Concurrency fix: per-book pending/error state

Originally `App.jsx` tracked a single `updatingId` and rolled a failed update
back by restoring a whole-list snapshot captured before the optimistic
update. With more than one row updating concurrently, that snapshot could be
stale by the time a later failure rolled it back — overwriting a different
row's already-successful update, and `updatingId` being a scalar meant only
one row could ever show as pending at a time.

Fixed: `pendingIds` is now a `Set<id>` (each row's `disabled` state is
`pendingIds.has(book.id)`, independent of any other row), and on failure
only the affected book's `status` field is reset to the value captured
right before that specific optimistic update — not the whole list. Errors
are tracked per row in `rowErrors: { [id]: message }` and rendered under the
affected book, cleared when that book's next update starts. Two rows
updating at once (one succeeding, one failing) can no longer interfere with
each other.

## API contract (aligned to actual backend)

Originally built against an assumed `/api`-prefixed contract before backend
code existed in this worktree. After the backend agent's implementation
landed (`backend/app/routes.py`, `backend/app/models.py`), a review caught
two mismatches, both now fixed on the frontend side:

- **Path prefix**: backend mounts its router with no prefix at all
  (`app.include_router(router)` in `backend/app/main.py`) — routes are
  `/books`, not `/api/books`. `src/api.js` now defaults `VITE_API_URL` to
  `""` and calls `/books` directly; `vite.config.js`'s dev proxy key changed
  from `/api` to `/books` to match.
- **Status enum values**: backend's `Status` enum
  (`backend/app/models.py`) is `"to-do" | "reading" | "done"`, not
  `"to_read"`. Updated `App.jsx` (`FILTERS`), `BookCard.jsx`
  (`STATUS_OPTIONS`), and `FilterBar.jsx` (`LABELS`) to use `"to-do"` while
  keeping the "To Read" display label.

Current contract:

- `GET  /books` → `[{ id, title, author, status }]`
- `PATCH /books/:id` with body `{ status }` → updated book object

**Update — backend gap closed:** the backend agent has since added
`PATCH /books/{book_id}` (`backend/app/routes.py`, using the new
`BookStatusUpdate` model in `backend/app/models.py`). Re-verified live
against the real backend through the frontend's dev proxy, no frontend
code changes were required — `api.js` was already targeting the correct
contract:

- `PATCH /books/1` with `{"status":"reading"}` → `200`, updated book body.
- `PATCH /books/9999` (unknown id) → `404 {"detail":"Book not found"}`.
- `PATCH /books/1` with `{"status":"bogus"}` → `400`, FastAPI validation
  error body — handled by `api.js`'s `request()` the same as any other
  non-2xx response, surfaced as the per-row error message added in the
  concurrency fix above.

## Verified

- `npm install` — succeeds (62 packages).
- `npm run build` — succeeds, produces `dist/`.
- End-to-end smoke test against the real backend (`backend-agent` worktree,
  `uvicorn app.main:app --port 8000`) with the frontend dev server
  proxying to it:
  - `GET /books` through the dev proxy → returns seeded book correctly
    (path-prefix fix confirmed working).
  - `PATCH /books/1` (valid status), `PATCH /books/9999` (unknown id),
    `PATCH /books/1` with an invalid status → 200 / 404 / 400 respectively,
    all through the dev proxy against the real backend. No frontend code
    changes were needed for this pass.

## Files added

```
frontend/
  package.json
  vite.config.js
  index.html
  .env.example
  .gitignore
  src/
    main.jsx
    App.jsx
    index.css
    api.js
    components/
      FilterBar.jsx
      BookList.jsx
      BookCard.jsx
```
