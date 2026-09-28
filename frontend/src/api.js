// API layer for the Reading List Tracker frontend.
//
// Assumed backend contract (REST, JSON):
//   GET   /api/books            -> [{ id, title, author, status, ... }]
//   PATCH /api/books/:id        -> body { status }, returns updated book
//
// Valid book `status` values: "to_read" | "reading" | "done"
// Base URL is configurable via VITE_API_URL so this can point at any
// backend deployment without code changes.

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

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
