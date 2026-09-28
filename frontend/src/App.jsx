import { useEffect, useMemo, useState } from "react";
import { createBook, fetchBooks, updateBookStatus } from "./api.js";
import FilterBar from "./components/FilterBar.jsx";
import BookList from "./components/BookList.jsx";

const FILTERS = ["all", "to-do", "reading", "done"];

export default function App() {
  const [books, setBooks] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  // Per-book state, keyed by book id, so concurrent updates to different
  // rows never interfere with each other's pending flag or rollback.
  const [pendingIds, setPendingIds] = useState(() => new Set());
  const [rowErrors, setRowErrors] = useState({});
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  useEffect(() => {
    loadBooks();
  }, []);

  async function loadBooks() {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchBooks();
      setBooks(data);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const book = await createBook({ title, author });
      setBooks((current) => [...current, book]);
      setTitle("");
      setAuthor("");
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(id, status) {
    const previousBook = books.find((book) => book.id === id);
    if (!previousBook) return;
    const previousStatus = previousBook.status;

    setPendingIds((current) => new Set(current).add(id));
    setRowErrors((current) => {
      if (!(id in current)) return current;
      const { [id]: _removed, ...rest } = current;
      return rest;
    });
    setBooks((current) =>
      current.map((book) => (book.id === id ? { ...book, status } : book))
    );

    try {
      const updated = await updateBookStatus(id, status);
      setBooks((current) =>
        current.map((book) => (book.id === id ? updated : book))
      );
    } catch (err) {
      // Roll back only this book's status, not the whole list snapshot,
      // so a concurrent update to another row that already succeeded
      // is never clobbered.
      setBooks((current) =>
        current.map((book) =>
          book.id === id ? { ...book, status: previousStatus } : book
        )
      );
      setRowErrors((current) => ({ ...current, [id]: err.message }));
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  const filteredBooks = useMemo(() => {
    if (filter === "all") return books;
    return books.filter((book) => book.status === filter);
  }, [books, filter]);

  return (
    <div className="app">
      <header>
        <h1>Reading List Tracker</h1>
      </header>

      <form className="book-form" onSubmit={handleCreate}>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title"
          required
        />
        <input
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
          placeholder="Author"
          required
        />
        <button type="submit" disabled={creating}>
          {creating ? "Adding..." : "Add book"}
        </button>
      </form>
      {createError && (
        <div className="banner error" role="alert">
          {createError}
        </div>
      )}

      <FilterBar filters={FILTERS} active={filter} onChange={setFilter} />

      {loadError && (
        <div className="banner error" role="alert">
          {loadError}
          <button onClick={loadBooks}>Retry</button>
        </div>
      )}

      {loading ? (
        <p className="status-message">Loading books...</p>
      ) : filteredBooks.length === 0 ? (
        <p className="status-message">No books found for this filter.</p>
      ) : (
        <BookList
          books={filteredBooks}
          pendingIds={pendingIds}
          rowErrors={rowErrors}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
