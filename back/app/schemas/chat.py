import json
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class SourceChunk(BaseModel):
    id:       str
    text:     str
    metadata: dict
    score:    float


class MessageOut(BaseModel):
    id:         str
    session_id: str
    role:       str
    content:    str
    sources:    Optional[list[SourceChunk]] = None
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("sources", mode="before")
    @classmethod
    def _parse_sources(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v


class SessionCreate(BaseModel):
    title: Optional[str] = None


class SessionUpdate(BaseModel):
    title: str


class SessionOut(BaseModel):
    id:            str
    title:         Optional[str]
    created_at:    datetime
    updated_at:    datetime
    message_count: int = 0

    model_config = {"from_attributes": True}


class SessionWithMessages(SessionOut):
    messages: list[MessageOut] = []


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    top_k:    int = Field(default=5, ge=1, le=20)
