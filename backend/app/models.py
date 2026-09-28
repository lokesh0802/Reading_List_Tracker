from enum import Enum

from pydantic import BaseModel, field_validator


class Status(str, Enum):
    TO_DO = "to-do"
    READING = "reading"
    DONE = "done"


class BookCreate(BaseModel):
    title: str
    author: str
    status: Status = Status.TO_DO

    @field_validator("title", "author")
    @classmethod
    def not_blank(cls, value: str) -> str:
        if not isinstance(value, str) or not value.strip():
            raise ValueError("must be a non-empty string")
        return value


class Book(BaseModel):
    id: int
    title: str
    author: str
    status: Status
