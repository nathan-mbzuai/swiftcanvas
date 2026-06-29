from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time as _time
from openai import OpenAI

log = logging.getLogger("infinitecanvas")

SYSTEM_PROMPT = """\
You are InfiniteCanvas, a generative UI system. Convert a plain-language interface description \
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


def _base_url() -> str:
    url = os.environ["K2_THINK_BASE_URL"].rstrip("/")
    # OpenAI SDK appends /chat/completions to the base path, so the path must
    # already include the API version prefix (e.g. /v1).  Auto-correct if missing.
    from urllib.parse import urlparse
    parsed = urlparse(url)
    if not parsed.path or parsed.path in ("/", ""):
        url = url + "/v1"
        log.warning("[config] K2_THINK_BASE_URL had no path prefix — appended /v1: %s", url)
    return url


def _client() -> OpenAI:
    api_key = os.environ["K2_THINK_API_KEY"]
    return OpenAI(api_key=api_key, base_url=_base_url(), max_retries=0)


def _model() -> str:
    return os.environ.get("K2_THINK_MODEL", "k2moe375B-mid3_v3-checkpoint_0003500")


def _strip_think(text: str) -> str:
    if not text:
        return ""
    # Strip think / reasoning blocks
    if "</think>" in text:
        text = text.split("</think>", 1)[1].strip()
    else:
        text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
    # Strip markdown code fences (model sometimes wraps JSON in ```json ... ```)
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        return fence.group(1).strip()
    return text


def _complete_truncated_json(text: str) -> str:
    """
    Append the minimum closing brackets/braces needed to make truncated JSON
    parseable. Walks the string tracking open containers, skipping string
    contents. Returns the completed string (may still be invalid if the input
    is too corrupted).
    """
    stack = []
    in_str = False
    escape = False
    for ch in text:
        if escape:
            escape = False
            continue
        if ch == "\\" and in_str:
            escape = True
            continue
        if ch == '"':
            in_str = not in_str
            continue
        if in_str:
            continue
        if ch in ("{", "["):
            stack.append("}" if ch == "{" else "]")
        elif ch in ("}", "]"):
            if stack and stack[-1] == ch:
                stack.pop()
    return text + "".join(reversed(stack))


def extract_last_json(text: str) -> object:
    """
    Find the root-level JSON object in text.
    Tries to parse from the first { or [ position (forward scan), which is where
    the top-level response object lives. Falls back to reverse scan as a safety net.
    """
    decoder = json.JSONDecoder()
    positions = [m.start() for m in re.finditer(r"[{\[]", text)]
    if not positions:
        return None

    # Forward scan: prefer the first parseable JSON (the root object)
    _KNOWN_KEYS = {"title", "sections", "layout", "theme", "nav", "description"}
    for pos in positions:
        try:
            obj, _ = decoder.raw_decode(text, pos)
            if isinstance(obj, dict) and _KNOWN_KEYS & obj.keys():
                return obj
        except json.JSONDecodeError:
            continue

    # Fallback: return first parseable JSON of any shape
    for pos in positions:
        try:
            obj, _ = decoder.raw_decode(text, pos)
            return obj
        except json.JSONDecodeError:
            continue

    # Last resort: try to complete a truncated JSON object
    for pos in positions:
        try:
            completed = _complete_truncated_json(text[pos:])
            obj = json.loads(completed)
            if isinstance(obj, (dict, list)):
                return obj
        except (json.JSONDecodeError, Exception):
            continue

    return None


def _validate(tree: object) -> bool:
    return (
        isinstance(tree, dict)
        and isinstance(tree.get("sections"), list)
        and len(tree["sections"]) >= 1
    )


def _build_messages(prompt: str, prior_tree: dict | None = None) -> list[dict]:
    """
    V3 only accepts user-role messages in multi-turn (assistant messages require a
    thinking field we don't have). Embed prior tree as context in the user message.
    """
    if prior_tree:
        user_content = (
            f"Current prototype JSON:\n{json.dumps(prior_tree, indent=2)}\n\n"
            f"User instruction: {prompt}"
        )
    else:
        user_content = prompt

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": user_content},
    ]


def generate_blocking(prompt: str, prior_tree: dict | None = None, timeout: float = 90.0) -> dict:
    """Blocking K2-Think call. Returns component tree dict or raises."""
    client = _client()
    t0 = _time.monotonic()

    msgs = _build_messages(prompt, prior_tree)
    response = client.chat.completions.create(
        model=_model(),
        messages=msgs,
        max_tokens=8192,
        timeout=timeout,
    )
    elapsed = _time.monotonic() - t0
    raw = response.choices[0].message.content or ""
    log.info("[generate] K2 responded in %.1fs, %d chars", elapsed, len(raw))

    clean = _strip_think(raw)
    tree = extract_last_json(clean)

    if _validate(tree):
        return tree

    log.warning("[generate] First attempt invalid, retrying with explicit JSON instruction")
    retry_prompt = (
        f"{prompt}\n\n"
        "CRITICAL: Your entire response must be a single valid JSON object with no surrounding "
        "text, no markdown fences, and no code blocks. Start your response with {{ and end with }}. "
        "The JSON must contain 'title' (string) and 'sections' (array with at least one object)."
    )
    response2 = client.chat.completions.create(
        model=_model(),
        messages=_build_messages(retry_prompt, prior_tree),
        max_tokens=8192,
        timeout=timeout,
    )
    raw2 = response2.choices[0].message.content or ""
    clean2 = _strip_think(raw2)
    tree2 = extract_last_json(clean2)

    if _validate(tree2):
        return tree2

    # Third attempt: minimal fallback — ask for the simplest valid prototype
    log.warning("[generate] Second attempt invalid, trying minimal prototype fallback")
    minimal_prompt = (
        f"Generate a minimal UI prototype JSON for: {prompt}\n\n"
        "Return ONLY this JSON structure (fill in the values):\n"
        '{{"title":"...", "description":"...", "theme":"light", "layout":"dashboard",'
        '"nav":{{"brand":"..."}},"sections":[{{"id":"header","type":"header","span":"full",'
        '"props":{{"title":"...","subtitle":"..."}}}}]}}'
    )
    response3 = client.chat.completions.create(
        model=_model(),
        messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": minimal_prompt}],
        max_tokens=4096,
        timeout=timeout,
    )
    raw3 = response3.choices[0].message.content or ""
    clean3 = _strip_think(raw3)
    tree3 = extract_last_json(clean3)

    if _validate(tree3):
        return tree3

    raise ValueError("K2-Think returned malformed output after 3 attempts")


def stream_generate(prompt: str, prior_tree: dict | None, queue: asyncio.Queue, loop: asyncio.AbstractEventLoop):
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
            messages=_build_messages(prompt, prior_tree),
            stream=True,
            max_tokens=8192,
        )

        for chunk in stream:
            if not chunk.choices:
                continue
            delta_obj = chunk.choices[0].delta

            # K2-Think V3 puts reasoning in delta.reasoning / delta.reasoning_content
            # (not in content). Access via model_dump since the SDK doesn't type these.
            try:
                raw = delta_obj.model_dump(exclude_unset=True)
            except Exception:
                raw = {}
            reasoning = (
                raw.get("reasoning") or raw.get("reasoning_content") or
                getattr(delta_obj, "reasoning", "") or
                getattr(delta_obj, "reasoning_content", "") or ""
            )
            if reasoning:
                put({"type": "token", "text": reasoning, "phase": "think"})

            delta = delta_obj.content or ""
            if not delta:
                continue

            buffer += delta

            if not think_done:
                if "</think>" in buffer:
                    # Legacy: some responses embed reasoning in content
                    think_done = True
                    _, after = buffer.split("</think>", 1)
                    if after.strip():
                        put({"type": "token", "text": after, "phase": "json"})
                elif buffer.lstrip().startswith(("{", "[", "```")):
                    think_done = True
                    put({"type": "token", "text": delta, "phase": "json"})
                else:
                    put({"type": "token", "text": delta, "phase": "think"})
            else:
                put({"type": "token", "text": delta, "phase": "json"})

        clean = _strip_think(buffer)
        tree = extract_last_json(clean)

        if not _validate(tree):
            log.warning("[stream] Parse failed, attempting blocking repair")
            try:
                tree = generate_blocking(prompt, prior_tree, timeout=150.0)
            except Exception as repair_exc:
                put({"type": "error", "message": f"Could not parse prototype: {repair_exc}"})
                return

        put({"type": "done", "tree": tree})

    except Exception as exc:
        log.error("[stream] streaming failed (%s), falling back to blocking", exc)
        try:
            tree = generate_blocking(prompt, prior_tree, timeout=150.0)
            put({"type": "done", "tree": tree})
        except Exception as exc2:
            put({"type": "error", "message": str(exc2)})


def test_connectivity() -> dict:
    """Quick connectivity check. Returns {"ok": bool, "model": str, "base_url": str, "elapsed_ms": int}."""
    effective_url = os.environ.get("K2_THINK_BASE_URL", "NOT SET")
    model = _model()
    try:
        base = _base_url()
        t0 = _time.monotonic()
        client = _client()
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "Reply with the single word: ready"}],
            max_tokens=16,
            timeout=30.0,
        )
        elapsed = int((_time.monotonic() - t0) * 1000)
        content = _strip_think(response.choices[0].message.content or "")
        return {
            "ok": True,
            "model": model,
            "base_url": base,
            "calls": f"{base}/chat/completions",
            "response": content.strip(),
            "elapsed_ms": elapsed,
        }
    except Exception as exc:
        return {
            "ok": False,
            "model": model,
            "base_url": effective_url,
            "error": str(exc),
        }
