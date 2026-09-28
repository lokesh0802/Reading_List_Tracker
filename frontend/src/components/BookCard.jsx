const STATUS_OPTIONS = [
  { value: "to-do", label: "To Read" },
  { value: "reading", label: "Reading" },
  { value: "done", label: "Done" },
];

export default function BookCard({ book, updating, error, onStatusChange }) {
  return (
    <li className="book-card">
      <div className="book-info">
        <h2>{book.title}</h2>
        {book.author && <p className="author">by {book.author}</p>}
        {error && (
          <p className="row-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <select
        value={book.status}
        disabled={updating}
        onChange={(event) => onStatusChange(book.id, event.target.value)}
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </li>
  );
}
