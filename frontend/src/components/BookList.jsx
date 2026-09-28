import BookCard from "./BookCard.jsx";

export default function BookList({ books, updatingId, onStatusChange }) {
  return (
    <ul className="book-list">
      {books.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          updating={updatingId === book.id}
          onStatusChange={onStatusChange}
        />
      ))}
    </ul>
  );
}
