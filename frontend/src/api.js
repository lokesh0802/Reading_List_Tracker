// API layer for the Reading List Tracker frontend.
//
// Backend contract (see backend/app/routes.py, backend/app/models.py):
//   GET   /books          -> [{ id, title, author, status }]
//   PATCH /books/:id      -> body { status }, returns updated book
//     NOTE: the backend does not implement this route yet (only POST/GET
//     exist). Calls will fail with 404/405 until it's added; the UI
//     surfaces that as an error banner and rolls back optimistically.
//
// Valid book `status` values: "to-do" | "reading" | "done"
// Base URL is configurable via VITE_API_URL so this can point at any
// backend deployment without code changes. Left empty by default so
// requests go to same-origin /books, which the dev server proxies to
// the backend (see vite.config.js) — the backend router has no prefix.

const BASE_URL = import.meta.env.VITE_API_URL || "";

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch (networkError) {
    throw new Error(
      `Network error while contacting the server: ${networkError.message}`
    );
  }

  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      detail = body.detail || body.message || JSON.stringify(body);
    } catch {
      // response had no JSON body
    }
    throw new Error(
      `Request failed (${response.status} ${response.statusText})${
        detail ? `: ${detail}` : ""
      }`
    );
  }

  if (response.status === 204) return null;
  return response.json();
}

export function fetchBooks() {
  return request("/books");
}

export function updateBookStatus(id, status) {
  return request(`/books/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
