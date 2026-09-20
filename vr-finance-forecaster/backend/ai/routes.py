from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ai.llm_client import ask_groq
from ai.summarise import summarize_chart
from dashboard.store import log_event

router = APIRouter()


class AskRequest(BaseModel):
    chart_id: str
    question: str


class AskResponse(BaseModel):
    answer: str


@router.post("/ask", response_model=AskResponse)
def ask(payload: AskRequest):
    context = summarize_chart(payload.chart_id)

    system_prompt = (
        "You are a finance tutor helping a business student understand a chart they are "
        "currently looking at in a VR data visualization lab. Answer their question using "
        "ONLY the data given below — do not invent numbers that aren't provided. Keep your "
        "answer to 2-3 short sentences, since it may be read aloud.\n\n"
        f"Chart data: {context}"
    )

    try:
        answer = ask_groq(system_prompt, payload.question)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI request failed: {exc}") from exc

    log_event({
        "type": "question",
        "chart_id": payload.chart_id,
        "question": payload.question,
        "answer": answer,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    return AskResponse(answer=answer)