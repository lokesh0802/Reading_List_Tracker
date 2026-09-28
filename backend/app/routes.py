from itertools import count
from typing import Optional

from fastapi import APIRouter, HTTPException

from .models import Book, BookCreate, BookStatusUpdate, Status

router = APIRouter()

_books: dict[int, Book] = {}
_id_counter = count(1)


@router.post("/books", response_model=Book, status_code=201)
def create_book(payload: BookCreate) -> Book:
    book_id = next(_id_counter)
    book = Book(id=book_id, title=payload.title, author=payload.author, status=payload.status)
    _books[book_id] = book
    return book


@router.get("/books", response_model=list[Book])
def list_books(status: Optional[Status] = None) -> list[Book]:
    books = list(_books.values())
    if status is not None:
        books = [book for book in books if book.status == status]
    return books


@router.get("/books/count")
def count_books(status: Optional[Status] = None) -> dict[str, int]:
    books = list(_books.values())
    if status is not None:
        books = [book for book in books if book.status == status]
    return {"count": len(books)}


@router.get("/books/{book_id}", response_model=Book)
def get_book(book_id: int) -> Book:
    book = _books.get(book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@router.patch("/books/{book_id}", response_model=Book)
def update_book_status(book_id: int, payload: BookStatusUpdate) -> Book:
    book = _books.get(book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    updated = book.model_copy(update={"status": payload.status})
    _books[book_id] = updated
    return updated
