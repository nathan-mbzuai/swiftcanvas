from __future__ import annotations

import asyncio
import json
import logging
import os
import threading
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

load_dotenv()

import backend.k2think as k2think

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("swiftcanvas")

app = FastAPI(title="SwiftCanvas API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    prompt: str
    prior_tree: dict | None = None


@app.post("/api/generate")
async def generate(req: GenerateRequest):
    """SSE streaming endpoint. Yields token events then a done event with the component tree."""
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue = asyncio.Queue()

    thread = threading.Thread(
        target=k2think.stream_generate,
        args=(req.prompt, req.prior_tree, queue, loop),
        daemon=True,
    )
    thread.start()

    async def event_stream():
        while True:
            try:
                msg = await asyncio.wait_for(queue.get(), timeout=120)
            except asyncio.TimeoutError:
                yield f'data: {json.dumps({"type": "error", "message": "Generation timed out"})}\n\n'
                break
            yield f"data: {msg}\n\n"
            parsed = json.loads(msg)
            if parsed.get("type") in ("done", "error"):
                break

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/test")
async def test_k2():
    """Test K2-Think V3 connectivity."""
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, k2think.test_connectivity)
    return result


# ── Static frontend (production) ───────────────────────────────────────────────

DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=str(DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        index = DIST / "index.html"
        if index.is_file():
            return FileResponse(str(index))
        return {"error": "Frontend not built"}
