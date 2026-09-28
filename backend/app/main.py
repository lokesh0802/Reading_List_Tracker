from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError

from .routes import router
from .validation import validation_exception_handler

app = FastAPI(title="Reading List Tracker")

app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.include_router(router)
