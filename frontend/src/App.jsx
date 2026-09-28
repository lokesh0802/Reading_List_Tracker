import { useEffect, useMemo, useState } from "react";
import { fetchBooks, updateBookStatus } from "./api.js";
import FilterBar from "./components/FilterBar.jsx";
import BookList from "./components/BookList.jsx";

const FILTERS = ["all", "to_read", "reading", "done"];

export default function App() {
  const [books, setBooks] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    loadBooks();
  }, []);

  async function loadBooks() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBooks();
      setBooks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id, status) {
    const previous = books;
    setUpdatingId(id);
    setBooks((current) =>
      current.map((book) => (book.id === id ? { ...book, status } : book))
    );
    try {
      const updated = await updateBookStatus(id, status);
      setBooks((current) =>
        current.map((book) => (book.id === id ? updated : book))
      );
    } catch (err) {
      setBooks(previous);
      setError(err.message);
    } finally {
      setUpdatingId(null);
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

      <FilterBar filters={FILTERS} active={filter} onChange={setFilter} />

      {error && (
        <div className="banner error" role="alert">
          {error}
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
          updatingId={updatingId}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
