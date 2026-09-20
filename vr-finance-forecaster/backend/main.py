from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ai.routes import router as ai_router
from dashboard.routes import router as dashboard_router

import os
print("GROQ_API_KEY present:", bool(os.environ.get("GROQ_API_KEY")), "starts with:", os.environ.get("GROQ_API_KEY", "")[:5])
app = FastAPI(title="VR Finance Forecaster API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # fine for a local student demo — tighten if this ever goes further
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}