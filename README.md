# SwiftCanvas

Generative UI demo powered by K2-Think V3. Describe any interface in plain language and watch a live, interactive prototype appear in real time.

## Stack

- **Frontend**: React (Vite), Recharts, plain CSS
- **Backend**: FastAPI, Python 3.11+
- **AI**: K2-Think V3 via OpenAI-compatible chat completions API

## Local development

### Prerequisites

- Python 3.11+
- Node.js 18+

### 1. Clone & env setup

```bash
git clone https://github.com/your-org/swiftcanvas
cd swiftcanvas
cp .env.example .env
# Edit .env with your K2-Think V3 credentials
```

### 2. Backend

```bash
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### 4. Test K2-Think connectivity

```bash
curl http://localhost:8000/api/test
```

## Environment variables

| Variable | Description |
|---|---|
| `K2_THINK_BASE_URL` | K2-Think V3 base URL (e.g. `http://16.78.75.185:8000/v1`) |
| `K2_THINK_MODEL` | Model name (e.g. `k2moe375B-mid3_v3-checkpoint_0003500`) |
| `K2_THINK_API_KEY` | Bearer token for the K2-Think API |

## Railway deployment

1. Push this repo to GitHub (`swiftcanvas`)
2. In Railway: **New Project → Deploy from GitHub repo**
3. Set the three environment variables above in Railway's Variables tab
4. Railway will use `railway.json` to:
   - Build the frontend: `cd frontend && npm install && npm run build`
   - Start the backend: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
5. The FastAPI backend serves the built frontend from `frontend/dist/`

## How it works

1. User types a plain-language UI description
2. Backend sends it to K2-Think V3 requesting a JSON component tree
3. K2-Think streams back its reasoning (`<think>` blocks) then the JSON
4. Backend parses the component tree and sends it to the frontend
5. Frontend dynamically renders it as live React components
6. User can iterate — each follow-up is sent with conversation history so K2-Think updates the design in context

## Component types

The generated JSON schema supports: `header`, `stat_row`, `table`, `bar_chart`, `line_chart`, `pie_chart`, `form`, `kanban`, `timeline`, `list`, `alert`
