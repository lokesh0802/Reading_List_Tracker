import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routes import _books

@pytest.fixture(autouse=True)
def reset_state():
    _books.clear()
    yield
    _books.clear()


@pytest.fixture
def client():
    return TestClient(app)


def test_health_returns_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_book(client):
    response = client.post("/books", json={"title": "Dune", "author": "Frank Herbert"})
    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Dune"
    assert body["author"] == "Frank Herbert"
    assert body["status"] == "to-do"
    assert "id" in body


def test_create_book_trims_whitespace(client):
    response = client.post(
        "/books", json={"title": "  Dune  ", "author": "  Frank Herbert  "}
    )
    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Dune"
    assert body["author"] == "Frank Herbert"


def test_create_book_with_status(client):
    response = client.post(
        "/books",
        json={"title": "Dune", "author": "Frank Herbert", "status": "reading"},
    )
    assert response.status_code == 201
    assert response.json()["status"] == "reading"


def test_list_books(client):
    client.post("/books", json={"title": "Dune", "author": "Frank Herbert"})
    client.post("/books", json={"title": "1984", "author": "George Orwell"})
    response = client.get("/books")
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_list_books_filtered_by_status(client):
    client.post("/books", json={"title": "Dune", "author": "Frank Herbert", "status": "done"})
    client.post("/books", json={"title": "1984", "author": "George Orwell", "status": "reading"})
    response = client.get("/books", params={"status": "done"})
    assert response.status_code == 200
    books = response.json()
    assert len(books) == 1
    assert books[0]["title"] == "Dune"


def test_books_count(client):
    client.post("/books", json={"title": "Dune", "author": "Frank Herbert", "status": "done"})
    client.post("/books", json={"title": "1984", "author": "George Orwell", "status": "reading"})
    response = client.get("/books/count")
    assert response.status_code == 200
    assert response.json()["count"] == 2


def test_books_count_filtered_by_status(client):
    client.post("/books", json={"title": "Dune", "author": "Frank Herbert", "status": "done"})
    client.post("/books", json={"title": "1984", "author": "George Orwell", "status": "reading"})
    response = client.get("/books/count", params={"status": "done"})
    assert response.status_code == 200
    assert response.json()["count"] == 1


def test_get_unknown_book_returns_404(client):
    response = client.get("/books/999999")
    assert response.status_code == 404


def test_missing_title_returns_400(client):
    response = client.post("/books", json={"author": "Frank Herbert"})
    assert response.status_code == 400


def test_numeric_title_returns_400(client):
    response = client.post("/books", json={"title": 123, "author": "Frank Herbert"})
    assert response.status_code == 400


def test_array_body_returns_400(client):
    response = client.post("/books", json=[{"title": "Dune", "author": "Frank Herbert"}])
    assert response.status_code == 400


def test_malformed_json_returns_400(client):
    response = client.post(
        "/books",
        content="{not valid json",
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 400


def test_whitespace_only_title_returns_400(client):
    response = client.post("/books", json={"title": "   ", "author": "Frank Herbert"})
    assert response.status_code == 400
    assert response.json()["detail"]


def test_whitespace_only_author_returns_400(client):
    response = client.post("/books", json={"title": "Dune", "author": "   "})
    assert response.status_code == 400
    assert response.json()["detail"]


def test_empty_string_title_returns_400(client):
    response = client.post("/books", json={"title": "", "author": "Frank Herbert"})
    assert response.status_code == 400
    assert response.json()["detail"]


def test_patch_status_success(client):
    created = client.post("/books", json={"title": "Dune", "author": "Frank Herbert"})
    book_id = created.json()["id"]
    response = client.patch(f"/books/{book_id}", json={"status": "reading"})
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == book_id
    assert body["status"] == "reading"
    assert body["title"] == "Dune"
    assert body["author"] == "Frank Herbert"

    # persisted
    fetched = client.get(f"/books/{book_id}")
    assert fetched.json()["status"] == "reading"


def test_patch_unknown_book_returns_404(client):
    response = client.patch("/books/999999", json={"status": "done"})
    assert response.status_code == 404


def test_patch_invalid_status_returns_400(client):
    created = client.post("/books", json={"title": "Dune", "author": "Frank Herbert"})
    book_id = created.json()["id"]
    response = client.patch(f"/books/{book_id}", json={"status": "archived"})
    assert response.status_code == 400


def test_cors_allows_configured_origin(client):
    response = client.get("/books", headers={"Origin": "http://localhost:5173"})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_cors_allows_frontend_origin(client):
    origin = "http://localhost:5173"

    get_response = client.get("/books", headers={"Origin": origin})
    assert get_response.status_code == 200
    assert get_response.headers["access-control-allow-origin"] == origin

    preflight_response = client.options(
        "/books",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    assert preflight_response.status_code == 200
    assert preflight_response.headers["access-control-allow-origin"] == origin
