from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from dashboard.store import log_event, read_events

router = APIRouter()


class Event(BaseModel):
    type: str
    chart_id: Optional[str] = None
    detail: Optional[dict] = None


@router.post("/events")
def create_event(event: Event):
    log_event({**event.model_dump(), "timestamp": datetime.now(timezone.utc).isoformat()})
    return {"status": "logged"}


@router.get("/summary")
def summary():
    events = read_events()
    return {
        "total_events": len(events),
        "questions_asked": sum(1 for e in events if e.get("type") == "question"),
        "events": events[-50:],
    }