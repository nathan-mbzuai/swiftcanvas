from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time as _time
from openai import OpenAI

log = logging.getLogger("swiftcanvas")

SYSTEM_PROMPT = """\
You are SwiftCanvas, a generative UI system. Convert a plain-language interface description \
into a JSON component tree that a React renderer will display as a live, interactive prototype.

CRITICAL: Respond ONLY with a single valid JSON object. \
No explanatory text, no markdown fences, no commentary — just the JSON.

OUTPUT SCHEMA:
{
  "title": "App title (2-5 words)",
  "description": "One sentence describing what this interface does",
  "theme": "light",
  "layout": "dashboard | form | list | split | kanban | timeline",
  "nav": {
    "brand": "App or brand name",
    "links": [{"label": "string", "active": true}]
  },
  "sections": [ ... ]
}

SECTION OBJECT:
{
  "id": "unique-kebab-id",
  "type": "<component type — see below>",
  "span": "full | half | third",
  "props": { <component-specific props> }
}

COMPONENT TYPES:

"header" — Page title block. span: full.
props: { "title": "string", "subtitle": "string", "badge": "string or null" }

"stat_row" — Row of KPI metric cards. span: full.
props: { "stats": [{ "label": "Metric Name", "value": "142 or $3.2M or 91%", "change": "+12% vs last month", "trend": "up|down|neutral" }] }
Include 3-5 stats.

"table" — Sortable data table. span: full.
props: {
  "title": "string or null",
  "columns": [{ "key": "snake_case_key", "label": "Column Header", "type": "text|badge|number|date" }],
  "rows": [ { "key": value } ],
  "sortable": true
}
Include 6-10 rows with realistic domain-specific data. badge columns should have short status words.

"bar_chart" — Vertical bar chart. span: full or half.
props: { "title": "string", "data": [{ "name": "Category", "value": <number> }], "color": "#4f46e5", "unit": "% or $ or null" }
Include 5-8 data points.

"line_chart" — Line chart for time series. span: full or half.
props: { "title": "string", "data": [{ "name": "Period", "value": <number> }], "color": "#6366f1", "unit": "string or null" }

"pie_chart" — Donut chart. span: third or half.
props: { "title": "string", "data": [{ "name": "Segment", "value": <number> }], "donut": true }
Include 3-6 segments.

"form" — Interactive form. span: half or third.
props: {
  "title": "string or null",
  "fields": [{ "id": "field_id", "label": "Label", "type": "text|email|select|date|textarea|checkbox|number", "placeholder": "hint", "options": ["A","B"], "required": true }],
  "submit_label": "Button label"
}

"kanban" — Kanban board. span: full.
props: {
  "title": "string or null",
  "columns": [{ "id": "col-id", "title": "Column", "color": "#hex", "cards": [{ "id": "card-id", "title": "Card", "subtitle": "detail", "tag": "Label", "priority": "high|medium|low" }] }]
}
Include 3-4 columns with 2-4 cards each.

"timeline" — Vertical timeline. span: half or full.
props: { "title": "string or null", "events": [{ "date": "Date string", "title": "Event", "description": "Detail", "status": "done|current|upcoming" }] }

"list" — Item list. span: half or third.
props: { "title": "string or null", "items": [{ "primary": "Main", "secondary": "Sub", "badge": "Tag", "badgeColor": "#hex" }], "numbered": false }

"alert" — Alert box. span: full or half.
props: { "type": "info|success|warning|error", "title": "string", "message": "string" }

LAYOUT RULES:
- First section MUST be "header"
- stat_row is always span "full"
- For dashboards: header → stat_row → charts → table
- Include 4-8 sections total
- Charts at half span look great paired side by side; pie_chart pairs well with bar_chart

DATA QUALITY:
- Use realistic, domain-specific sample data — not generic "Item 1, Item 2"
- Table rows: 6-10 varied, realistic entries
- Stats: plausible numbers with units
- Chart values: vary realistically

ITERATION: If the conversation history contains a previous assistant response (a component tree JSON), \
modify it according to the new user request, preserving all unchanged sections. \
Return the complete updated tree.

CRITICAL REMINDER: Your response must be ONLY the JSON object. Nothing else."""


def _client() -> OpenAI:
    base_url = os.environ["K2_THINK_BASE_URL"].rstrip("/")
    api_key = os.environ["K2_THINK_API_KEY"]
    return OpenAI(api_key=api_key, base_url=base_url, max_retries=0)


def _model() -> str:
    return os.environ.get("K2_THINK_MODEL", "k2moe375B-mid3_v3-checkpoint_0003500")


def _strip_think(text: str) -> str:
    if not text:
        return ""
    if "</think>" in text:
        return text.split("</think>", 1)[1].strip()
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


def extract_last_json(text: str) -> object:
    decoder = json.JSONDecoder()
    positions = [m.start() for m in re.finditer(r"[{\[]", text)]
    _KNOWN_KEYS = {"title", "sections", "layout", "theme", "nav", "description"}

    for pos in reversed(positions):
        try:
            obj, _ = decoder.raw_decode(text, pos)
            if isinstance(obj, dict) and _KNOWN_KEYS & obj.keys():
                return obj
        except json.JSONDecodeError:
            continue

    for pos in reversed(positions):
        try:
            obj, _ = decoder.raw_decode(text, pos)
            return obj
        except json.JSONDecodeError:
            continue

    return None


def _validate(tree: object) -> bool:
    return (
        isinstance(tree, dict)
        and isinstance(tree.get("sections"), list)
        and len(tree["sections"]) >= 1
    )


def _build_messages(messages: list[dict]) -> list[dict]:
    return [{"role": "system", "content": SYSTEM_PROMPT}] + messages


def generate_blocking(messages: list[dict], timeout: float = 90.0) -> dict:
    """Blocking K2-Think call. Returns component tree dict or raises."""
    client = _client()
    t0 = _time.monotonic()

    response = client.chat.completions.create(
        model=_model(),
        messages=_build_messages(messages),
        max_tokens=4096,
        timeout=timeout,
    )
    elapsed = _time.monotonic() - t0
    raw = response.choices[0].message.content or ""
    log.info("[generate] K2 responded in %.1fs, %d chars", elapsed, len(raw))

    clean = _strip_think(raw)
    tree = extract_last_json(clean)

    if _validate(tree):
        return tree

    log.warning("[generate] First attempt invalid, retrying with repair prompt")
    repair_msgs = messages + [
        {"role": "assistant", "content": raw[:500]},
        {"role": "user", "content": (
            "Your response was not valid JSON. Return ONLY the JSON object "
            "with 'title', 'sections', and other required fields. Nothing else."
        )},
    ]
    response2 = client.chat.completions.create(
        model=_model(),
        messages=_build_messages(repair_msgs),
        max_tokens=4096,
        timeout=timeout,
    )
    raw2 = response2.choices[0].message.content or ""
    clean2 = _strip_think(raw2)
    tree2 = extract_last_json(clean2)

    if _validate(tree2):
        return tree2

    raise ValueError("K2-Think returned malformed output after retry")


def stream_generate(messages: list[dict], queue: asyncio.Queue, loop: asyncio.AbstractEventLoop):
    """
    Thread target. Streams K2-Think tokens into queue as JSON-serialized SSE event strings.

    Event shapes:
      {"type": "token", "text": "...", "phase": "think|json"}
      {"type": "done",  "tree": {...}}
      {"type": "error", "message": "..."}
    """
    def put(event: dict):
        loop.call_soon_threadsafe(queue.put_nowait, json.dumps(event))

    client = _client()
    buffer = ""
    think_done = False

    try:
        stream = client.chat.completions.create(
            model=_model(),
            messages=_build_messages(messages),
            stream=True,
            max_tokens=4096,
        )

        for chunk in stream:
            delta = (chunk.choices[0].delta.content or "") if chunk.choices else ""
            if not delta:
                continue

            buffer += delta

            if not think_done:
                if "</think>" in buffer:
                    think_done = True
                    _, after = buffer.split("</think>", 1)
                    if after.strip():
                        put({"type": "token", "text": after, "phase": "json"})
                else:
                    put({"type": "token", "text": delta, "phase": "think"})
            else:
                put({"type": "token", "text": delta, "phase": "json"})

        clean = _strip_think(buffer)
        tree = extract_last_json(clean)

        if not _validate(tree):
            log.warning("[stream] Parse failed, attempting blocking repair")
            try:
                tree = generate_blocking(messages, timeout=60.0)
            except Exception as repair_exc:
                put({"type": "error", "message": f"Could not parse prototype: {repair_exc}"})
                return

        put({"type": "done", "tree": tree})

    except Exception as exc:
        log.error("[stream] streaming failed (%s), falling back to blocking", exc)
        try:
            tree = generate_blocking(messages, timeout=90.0)
            put({"type": "done", "tree": tree})
        except Exception as exc2:
            put({"type": "error", "message": str(exc2)})


def test_connectivity() -> dict:
    """Quick connectivity check. Returns {"ok": bool, "model": str, "elapsed_ms": int}."""
    try:
        t0 = _time.monotonic()
        client = _client()
        response = client.chat.completions.create(
            model=_model(),
            messages=[{"role": "user", "content": "Reply with the single word: ready"}],
            max_tokens=16,
            timeout=30.0,
        )
        elapsed = int((_time.monotonic() - t0) * 1000)
        content = _strip_think(response.choices[0].message.content or "")
        return {"ok": True, "model": _model(), "response": content.strip(), "elapsed_ms": elapsed}
    except Exception as exc:
        return {"ok": False, "model": _model(), "error": str(exc)}
