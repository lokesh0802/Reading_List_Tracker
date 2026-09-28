# Backend Agent — Results

## Status: completed

## What was built

FastAPI backend under `backend/`:

- `app/main.py` — FastAPI app, wires the router and a 400-on-validation-error handler.
- `app/models.py` — `Book`, `BookCreate` models and `Status` enum (`to-do`, `reading`, `done`).
- `app/routes.py` — in-memory book store and endpoints.
- `app/validation.py` — converts FastAPI's default 422 validation errors into 400s.
- `tests/test_books.py` — pytest suite covering all endpoints and validation rules.
- `requirements.txt` — fastapi, uvicorn, pydantic, pytest, httpx.

## API

- `POST /books` — create a book (`title`, `author`, optional `status`, default `to-do`).
- `GET /books` — list all books.
- `GET /books?status={status}` — list books filtered by status.
- `GET /books/count` — count of books (optionally filtered by `?status=`).
- `GET /books/{id}` — fetch a single book; 404 if unknown id.
- `PATCH /books/{id}` — update a book's `status`; 404 if unknown id, 400 on invalid status.

## Validation (400)

- Missing `title`
- Non-string (numeric) `title`
- Array request body instead of an object
- Malformed JSON body

All of the above are surfaced by FastAPI as `RequestValidationError`, which is
handled in `app/validation.py` and remapped from the default 422 to 400.

## Tests

`cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && python -m pytest -q`

Result: 17 passed.

## Round 6 — CORS support

`deployment/render.yaml` (deployment agent's worktree) defines a `CORS_ORIGINS`
env var, but `app/main.py` never read it, so cross-origin requests (e.g. a
Vercel-hosted frontend calling the Render backend, or the local Vite dev
server on `:5173`) got no `Access-Control-Allow-Origin` header and were
blocked by the browser.

Added `CORSMiddleware` in `app/main.py`:

- `CORS_ORIGINS` env var, comma-separated list of allowed origins.
- Defaults to `http://localhost:5173` (the local frontend dev server) when
  the env var is unset.
- `allow_methods=["GET", "POST", "PATCH", "OPTIONS"]`, `allow_headers=["Content-Type"]`.

**Usage**: set `CORS_ORIGINS` to a comma-separated list, e.g.
`CORS_ORIGINS=https://reading-list-tracker.vercel.app,http://localhost:5173`.
On Render this is the `CORS_ORIGINS` env var already declared in
`deployment/render.yaml` (currently `sync: false` — set its value in the
Render dashboard once the Vercel URL is known).

Added `test_cors_allows_configured_origin`, asserting `GET /books` with
`Origin: http://localhost:5173` returns that origin in
`Access-Control-Allow-Origin` (using the default, since the test suite runs
without `CORS_ORIGINS` set).

Follow-up: added `test_cors_allows_frontend_origin`, covering both a plain
`GET /books` and an `OPTIONS /books` preflight (with
`Access-Control-Request-Method`/`-Headers`), asserting
`Access-Control-Allow-Origin` on both.

Re-confirmed `PATCH /books/{book_id}` (added in Round 3) already matches:
`BookStatusUpdate` body, 404 on unknown id, 400 on invalid status, 200 with
updated `Book` — no changes needed there.

## Round 5 — GET /health

Added `GET /health` in `app/routes.py` returning `{"status": "ok"}` with 200,
for use as a deployment health check. Added `test_health_returns_ok`.

Not done (out of backend scope): updating `deployment/render.yaml`'s
`healthCheckPath` from `/docs` to `/health` — that file isn't part of the
`backend/` app and belongs to the deployment agent's worktree
(`../deployment-agent`), so it wasn't touched here.

## Round 4 — trim whitespace on create

`BookCreate.not_blank` validated that `title`/`author` weren't blank but
returned the raw (untrimmed) value, so `POST /books` with `"  Dune  "`
stored the padded string as-is. Changed the validator in `app/models.py` to
return `value.strip()`. Added `test_create_book_trims_whitespace`.

## Round 3 — PATCH /books/{book_id}

The frontend (`frontend/src/api.js`) calls `PATCH /books/:id` with body
`{"status": ...}` to update a book's status, but the route didn't exist
(405). Added:

- `BookStatusUpdate` model in `app/models.py` (`status: Status`, required).
- `PATCH /books/{book_id}` in `app/routes.py` — 404 if the id is unknown,
  400 on an invalid status (via the existing validation handler, since an
  out-of-enum value fails `Status` parsing the same way `POST /books` does),
  200 with the updated `Book` on success. Uses `book.model_copy(update=...)`
  to keep the in-memory store pattern.
- Tests: `test_patch_status_success`, `test_patch_unknown_book_returns_404`,
  `test_patch_invalid_status_returns_400`.

Frontend was not touched (not in scope for this agent).

## Review fixes (round 2)

- **Status enum contract**: backend's canonical enum is `to-do` / `reading` / `done`
  (`app/models.py`). Checked the frontend worktree's actual source
  (`App.jsx`, `BookCard.jsx`) and it already uses the same `to-do` values —
  the `to_read` mismatch only existed in a stale note in the frontend's own
  `.agent/results/frontend.md`, not in its code, so no cross-agent code change
  was needed. The contract is shared via FastAPI's auto-generated OpenAPI
  schema (`/openapi.json` → `components.schemas.Status.enum`), which any
  consumer (frontend, tests) should read instead of hardcoding values.
- **500 on blank title/author**: `app/validation.py`'s exception handler was
  passing `exc.errors()` straight into `JSONResponse`, but Pydantic's error
  dicts can carry a `ctx` key containing the raw `ValueError` instance our
  `not_blank` validator raises — `json.dumps` can't serialize that, so the
  handler itself raised and FastAPI returned a 500. Fixed by running the
  errors through `jsonable_encoder(..., exclude={"ctx"})` before building the
  response. Added `test_whitespace_only_title_returns_400`,
  `test_whitespace_only_author_returns_400`, and
  `test_empty_string_title_returns_400` to cover it.
