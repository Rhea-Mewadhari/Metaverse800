import json
from pathlib import Path
from threading import Lock

LOG_PATH = Path(__file__).resolve().parent.parent / "data" / "usage_log.jsonl"
_lock = Lock()


def log_event(event: dict) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _lock:
        with LOG_PATH.open("a") as f:
            f.write(json.dumps(event) + "\n")


def read_events() -> list:
    if not LOG_PATH.exists():
        return []
    with LOG_PATH.open() as f:
        return [json.loads(line) for line in f if line.strip()]