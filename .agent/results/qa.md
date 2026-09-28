# QA Review — Reading List Tracker

Reviewed: `backend-agent` (FastAPI), `frontend-agent` (React/Vite), `deployment-agent` (Docker/Render), `testing-agent` (pytest). Review is read-only per QA-lead scope — no application code was written or modified.

## 🔴 Critical — will break the app end-to-end

1. **No `PATCH /books/{id}` endpoint exists in the backend.**
   `frontend/src/api.js` calls `PATCH /books/:id` to change a book's status (the app's core interaction, wired up in `App.jsx` → `BookCard.jsx`'s status `<select>`). `backend/app/routes.py` only defines `POST /books`, `GET /books`, `GET /books/count`, `GET /books/{id}`. Every status-change click in the UI will fail (404/405). This is a blocking API contract gap, not a bug in either side alone — the two agents built against different assumed contracts.

2. **Status enum values don't match between frontend and backend.**
   Backend `Status` enum (`models.py`): `"to-do"`, `"reading"`, `"done"`.
   Frontend (`App.jsx`, `BookCard.jsx`, `FilterBar.jsx`): `"to_read"`, `"reading"`, `"done"`.
   Any book created via the API defaults to `"to-do"`, which isn't one of the frontend's `<select>` options or filter values — React will render an unmatched `<select>` value and the "To Do" filter will never match any book. Needs a single source of truth for status values (shared enum/constants, or an OpenAPI-generated contract) — a real cause of #1 and #2 together.

3. **Route base path mismatch outside of local dev.**
   Backend mounts routes at `/books` with no prefix. Frontend defaults `BASE_URL` to `/api` (`api.js`) and only resolves `/api/books` → `/books` via the Vite dev proxy (`vite.config.js`), which does not exist in production. In production the frontend must set `VITE_API_URL` to the deployed backend's full origin *and* the backend needs to actually serve `/books` at that root — there's no `/api` prefix on the backend at all, so even a correctly-set `VITE_API_URL=https://backend.onrender.com/api` would 404. No documented, agreed contract for the production URL scheme.

4. **No CORS middleware configured on the backend.**
   `render.yaml` declares a `CORS_ORIGINS` env var with a comment "*Only takes effect if/when CORS middleware is added to the FastAPI app*" — it hasn't been added (`main.py` has no `CORSMiddleware`). Once frontend and backend are deployed to different origins (e.g. Vercel + Render), every browser request will be blocked by CORS. This silently blocks the entire deployed app while working fine in any same-origin/manual testing.

## 🟠 High — functional/data-integrity gaps

5. **No persistence layer.** `_books: dict[int, Book] = {}` is in-memory only. Any redeploy, crash, or Render free-tier idle-spindown wipes all data. No DB is configured anywhere in the stack despite `deployment/` existing. Acceptable for a pure demo, but should be an explicit, called-out decision, not a silent gap discovered at demo time.
6. **No DELETE endpoint**, and no PUT/PATCH for editing title/author — only status can theoretically move (once #1 is fixed). Users can't remove a mis-entered book.
7. **`itertools.count()` id generator is process-local, in-memory, and not thread/worker-safe.** Fine for a single-process demo; will silently produce duplicate IDs under multiple uvicorn workers (nothing currently declares `--workers`, but nothing prevents someone adding one for "production readiness" later either).

## 🟡 Medium — validation & robustness

8. **`validation.py` converts all `RequestValidationError`s to 400 with FastAPI's raw `exc.errors()` payload.** This leaks internal Pydantic error structures (`loc`, `type`, `ctx`) to the client instead of a clean `{"detail": "..."}` shape the frontend's `api.js` (`body.detail || body.message`) can render nicely — the frontend will display a raw error list/object instead of readable text.
9. **`BookCreate.not_blank` validator strips nothing** — a title of `"  Dune  "` is accepted with surrounding whitespace intact and stored as-is (no `.strip()` applied to the returned value), so list/detail views and any future search/sort will be inconsistent with what the user typed vs. what's stored.
10. **No max-length or type constraints on `title`/`author`** beyond "non-empty" — no protection against pathologically long strings.
11. **`GET /books/{book_id}` accepts any int** but there's no validation that `book_id` is positive; FastAPI will 422 on non-numeric ids by default (fine), but this is untested (see coverage gaps below).
12. **Health check hits `/docs`** (`render.yaml: healthCheckPath: /docs`) — this is Swagger UI, not a real health endpoint. It works today only because FastAPI serves docs by default; if docs are ever disabled for prod hardening, the health check silently breaks deploys. Should be a dedicated `/health` route.

## Frontend workflow review

- **Happy path** (load → list → filter → change status) is logically sound in `App.jsx`: optimistic update with rollback on error (`handleStatusChange`) is a good pattern — but is entirely untestable right now because the PATCH endpoint doesn't exist (#1).
- **Loading/empty/error states** are handled (`loading`, `error`, "No books found for this filter").
- **`FilterBar`** hardcodes `to_read` — will need to change to match whatever canonical status values are agreed (#2).
- **No frontend automated tests found** anywhere in `frontend-agent` (no `*.test.jsx`, no Vitest/Jest/RTL config, no `test` script in `package.json`). 100% of frontend logic (filtering, optimistic update/rollback, error rendering) is currently unverified by any test.
- **`.env.example`** documents `VITE_API_URL` but nothing enforces or validates it's set correctly for a given deployment target — easy to deploy frontend pointed at the wrong backend URL with no build-time check.

## Testing coverage review (backend — `testing-agent` / `backend-agent`)

Present (`test_books.py`, 12 tests): create (default + explicit status), list, list filtered, count, count filtered, 404 on unknown id, 400 on missing title / numeric title / array body / malformed JSON. Solid coverage of what exists.

**Missing:**
- No test for `PATCH` (doesn't exist yet — see #1).
- No test for `DELETE` (doesn't exist).
- No test asserting the exact shape of `Book`/error responses matches what frontend `api.js` expects.
- No test for concurrent/duplicate id generation.
- No test for whitespace-only title after stripping (e.g. `"   "`) — actually covered implicitly by `not_blank`, but not explicitly asserted via a test case.
- No integration/contract test that runs frontend and backend together (e.g. Playwright/Cypress hitting a real running backend) — the mismatches in #1–#3 would have been caught immediately by even one such test.
- No CI config found anywhere in the repo (no `.github/workflows`, no `render.yaml` build-gate) — nothing currently runs `pytest` automatically before merge/deploy.

## Deployment readiness review

- Backend Dockerfile is reasonable: slim base image, layer-cached deps, non-reload production `uvicorn` command, `$PORT` binding for Render. ✅
- `render.yaml` only deploys the **backend**. There is no deployment config (Vercel/Netlify/static host config, `vercel.json`, second Render static site, etc.) for the **frontend** anywhere in the repo — deployment is only half-specified.
- `CORS_ORIGINS` env var is declared in `render.yaml` but never read by the application (#4) — dead config that gives false confidence it's handled.
- No health endpoint dedicated to liveness/readiness (#12).
- No logging/observability, no `SENTRY_DSN`/error-tracking hook, no rate limiting — acceptable for a demo, but worth being explicit that this is demo-grade, not production-grade.
- Root `.gitignore`/per-folder `.gitignore`s correctly exclude `.venv/`, `node_modules/`, `dist/`, `.env` — confirmed none of these are actually tracked in git (checked via `git ls-files`). No secrets or build artifacts committed. ✅

## Summary: blocking items before demo/integration

| # | Issue | Blocks |
|---|-------|--------|
| 1 | Missing `PATCH /books/{id}` | Status-change UI entirely non-functional |
| 2 | Status enum mismatch (`to-do` vs `to_read`) | Filtering + status display broken |
| 3 | No agreed API base path / prod URL contract | Frontend can't reach backend once deployed |
| 4 | No CORS middleware | Cross-origin deployment fully blocked |

Recommend the backend and frontend agents reconcile a single written API contract (endpoints, status enum values, base path) before further work, and that an integration smoke test (frontend + backend running together) be added to catch this class of issue automatically going forward.

## Test run

Ran the existing backend suite (`backend-agent/backend/tests/test_books.py`) in an isolated venv against `requirements.txt`:

```
11 passed in 0.75s
```

All 11 existing tests pass — they validate only the endpoints that exist today (POST/GET list/GET count/GET by id + validation errors), so this is a clean result on a known-incomplete contract, not a sign the integration issues above are resolved. No frontend automated tests exist to run (see Testing coverage review).
