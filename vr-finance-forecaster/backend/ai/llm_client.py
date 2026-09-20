import os
import requests

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


def ask_groq(system_prompt: str, user_question: str) -> str:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set — add it to backend/.env")

    model = os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant")

    response = requests.post(
        GROQ_API_URL,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_question},
            ],
            "temperature": 0.3,
            "max_tokens": 300,
        },
        timeout=15,
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"].strip()