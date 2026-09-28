from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Turn FastAPI's default 422 validation errors into 400s.

    Covers missing title, non-string title, array request bodies, and
    malformed JSON — all of which Starlette/FastAPI surface as a
    RequestValidationError before our route code ever runs.
    """
    return JSONResponse(
        status_code=400,
        content={"detail": exc.errors()},
    )
