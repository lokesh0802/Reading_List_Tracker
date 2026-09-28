from fastapi import Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Turn FastAPI's default 422 validation errors into 400s.

    Covers missing title, non-string title, array request bodies, and
    malformed JSON — all of which Starlette/FastAPI surface as a
    RequestValidationError before our route code ever runs.

    exc.errors() can contain non-JSON-serializable values (e.g. the
    ValueError instance our own validators raise, in each error's "ctx"),
    so it must go through jsonable_encoder before JSONResponse can dump it -
    otherwise this handler itself raises and the client sees a 500.
    """
    errors = jsonable_encoder(exc.errors(), exclude={"ctx"})
    return JSONResponse(
        status_code=400,
        content={"detail": errors},
    )
