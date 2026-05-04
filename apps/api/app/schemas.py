from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=200)


class UserRead(BaseModel):
    id: int
    username: str
    name: str
    role: str

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class ManualStepRead(BaseModel):
    id: int
    text: str
    position: int

    model_config = {"from_attributes": True}


class ManualSectionRead(BaseModel):
    id: int
    title: str
    position: int
    steps: list[ManualStepRead]

    model_config = {"from_attributes": True}


class ManualRead(BaseModel):
    id: int
    unit: str
    title: str
    temperature: str
    time_standard: str
    critical_point: str
    tip: str
    sections: list[ManualSectionRead]

    model_config = {"from_attributes": True}


class ChecklistItemRead(BaseModel):
    id: int
    section: str
    text: str
    done: bool
    completed_at: datetime | None = None
    completed_by: str | None = None


class ChecklistRunRead(BaseModel):
    id: int
    title: str
    category: str
    store: str
    run_date: date
    progress: int
    completed: int
    total: int
    closing_note: str | None = None
    items: list[ChecklistItemRead]


class ChecklistItemUpdate(BaseModel):
    item_id: int
    done: bool


class ClosingNoteUpdate(BaseModel):
    closing_note: str = Field(max_length=1500)


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=12)


class ChatResponse(BaseModel):
    reply: str
    mode: str


class HealthResponse(BaseModel):
    status: str
    service: str
