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

## Validation (400)

- Missing `title`
- Non-string (numeric) `title`
- Array request body instead of an object
- Malformed JSON body

All of the above are surfaced by FastAPI as `RequestValidationError`, which is
handled in `app/validation.py` and remapped from the default 422 to 400.

## Tests

`cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && python -m pytest -q`

Result: 11 passed.
