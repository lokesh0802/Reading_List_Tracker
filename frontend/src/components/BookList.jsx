import BookCard from "./BookCard.jsx";

export default function BookList({ books, pendingIds, rowErrors, onStatusChange }) {
  return (
    <ul className="book-list">
      {books.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          updating={pendingIds.has(book.id)}
          error={rowErrors[book.id]}
          onStatusChange={onStatusChange}
        />
      ))}
    </ul>
  );
}
