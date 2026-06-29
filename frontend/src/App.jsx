import { useState, useRef, useEffect, useCallback } from "react";
import Renderer from "./components/Renderer.jsx";
import ExportPanel from "./components/ExportPanel.jsx";
import Tutorial from "./components/Tutorial.jsx";

const API_BASE = window.RUNTIME_API_BASE || import.meta.env.VITE_API_URL || "";

const EXAMPLES = [
  "a CRM pipeline view with deal stages, win rates, and rep performance breakdown",
  "an investment memo builder with reasoning steps and confidence scores per claim",
  "a developer portal with API key management, rate limit dashboards, and webhook logs",
  "a content calendar with article stages, author assignments, and publication timeline",
  "a competitive analysis report generator with market positioning and SWOT export",
];

const CAPABILITIES = [
  {
    key: "generative-ui",
    icon: "🎨",
    title: "Generative UI",
    desc: "Describe any interface and get a live React prototype in seconds",
    prompt: `a UI schema inspector that shows InfiniteCanvas assembling a React prototype in real time. This is a meta-demo: the UI itself is about building UIs.

Use these sections:
- header: title "Schema Inspector", subtitle "Watching K2-Think V3 assemble your interface component by component"
- stat_row: 4 stats: "Sections Built: 7", "Props Resolved: 43", "Schema Valid: Yes", "Render Time: 8.3s"
- kanban: title "Component Library", 4 columns: "Layout" (cards: Header, Stat Row — each card shows the component name and a note like "span: full"), "Visualisation" (cards: Bar Chart, Line Chart, Pie Chart — tag "Recharts"), "Data" (cards: Table sortable, Kanban board, Timeline, List — tag "Interactive"), "Action" (cards: Form, File Export — tag "Generates output"). Use distinct colors per column.
- table: title "Active Schema", columns: id (string), type (string), span (full/half/third), status (badge: Rendered/Building/Queued), tokens (number). Include 7 rows — one per section type being assembled, with "Building" on row 6 and "Queued" on row 7.
- alert: type "success", title "Schema Valid", message "7 sections parsed, all props resolved. Click Export to download the JSON schema or React JSX."`,
  },
  {
    key: "chain-of-thought",
    icon: "🧠",
    title: "Chain-of-Thought",
    desc: "Watch the full reasoning chain before every response",
    prompt: `a chain-of-thought trace viewer showing K2-Think V3 reasoning through a hard question: "Should MBZUAI launch a dedicated robotics research division?"

This UI is about the REASONING PROCESS itself — not a generic dashboard. Make the timeline the dominant section.

Use these sections:
- header: title "Chain-of-Thought Trace Viewer", subtitle "K2-Think V3 reasoning on: Should MBZUAI launch a robotics research division?"
- stat_row: "Reasoning Steps: 12", "Avg Confidence: 81%", "Tokens Used: 3,241", "Branches: 3"
- timeline: title "Reasoning Chain" (span: full), 10 events with realistic step descriptions and statuses:
  "Parsed question — identified key dimensions: strategic fit, resources, talent pipeline" (done),
  "Assessed MBZUAI strengths: NLP, computer vision, reinforcement learning — all adjacent to robotics" (done),
  "Hypothesis A: Robotics is a natural extension, strong RL overlap reduces ramp-up cost" (done),
  "Evidence check: ETH Zurich, CMU robotics programs require 40-60 FTE PhD researchers and physical lab space" (done),
  "Hypothesis B: Resource dilution risk — physical infrastructure unlike pure software AI research" (done),
  "Counter-evidence: Abu Dhabi sovereign fund has capital; MBZUAI already has campus infrastructure" (done),
  "Exploring Branch C: Partnership model with existing robotics lab vs. building from scratch" (current),
  "Weighing Hypothesis A vs B vs C on net strategic value" (upcoming),
  "Synthesising recommendation with confidence weighting" (upcoming),
  "Generating final structured response" (upcoming)
- table: title "Step Analysis", columns: step (number), reasoning_type (badge: Observation/Hypothesis/Evidence/Synthesis), confidence_pct (number), tokens (number), branch (string). 10 rows matching the timeline steps above with realistic values (confidence 71-92%, tokens 180-520 per step).
- bar_chart: title "Token Depth per Reasoning Step", 10 data points named Step 1 through Step 10, values roughly 210, 180, 290, 340, 260, 380, 520, 480, 310, 270 — highest at Branch Exploration and Weighing steps.
- alert: type "info", title "Step 7 of 12 — Active Reasoning", message "Evaluating partnership model (Branch C) against independent lab (Branch A). Branch C shows 84% confidence. Continuing..."`,
  },
  {
    key: "tool-calling",
    icon: "🔧",
    title: "Tool Calling",
    desc: "Connect to APIs, databases, and external services",
    prompt: `a live tool execution console showing a K2-Think V3 agent answering: "Book me a 3-day trip to Dubai leaving next Friday from London."

Show the ACTUAL TOOL CALLS with real function names, arguments, and return values. This is an execution trace, not an API management dashboard.

Use these sections:
- header: title "Tool Execution Console", subtitle "Agent task: Book 3-day Dubai trip from London, departing 2026-07-17"
- stat_row: "Tools Available: 8", "Calls Made: 5", "Tokens Used: 1,847", "Elapsed: 4.2s"
- timeline: title "Execution Trace" (span: full), 7 events showing the exact sequence of tool calls:
  "get_date_today() returned 2026-07-15 (Tuesday)" (done),
  "search_flights(origin=LHR, dest=DXB, depart=2026-07-17, return=2026-07-20, class=economy) returned 3 options: EK001 £420 dep 08:25, BA107 £389 dep 11:00, FZ001 £294 dep 06:45" (done),
  "get_weather(city=Dubai, dates=[2026-07-17, 2026-07-18, 2026-07-19]) returned 39C sunny all days, humidity 65%" (done),
  "search_hotels(city=Dubai, checkin=2026-07-17, nights=3, budget_usd=200, stars=4) returned 3 options: Marriott JBR £185/night, Address Marina £210/night, Rove Downtown £140/night" (done),
  "search_activities(city=Dubai, dates=[2026-07-17, 2026-07-19], interests=[architecture, food, desert]) returned 5 activities: Burj Khalifa tour, Spice Souk walk, Desert Safari, Dubai Frame, Deira food tour" (done),
  "build_itinerary(flight=FZ001, hotel=Rove_Downtown, activities=[...]) generating 3-day plan..." (current),
  "send_confirmation(to=user@example.com, itinerary=...)" (upcoming)
- kanban: title "Tool Queue", 3 columns: "Available" (cards: send_sms, maps_route, currency_convert, translate_text — grey), "Executing" (1 card: build_itinerary — show args: flight, hotel, 5 activities, highlighted/active), "Completed" (5 cards: get_date, search_flights, get_weather, search_hotels, search_activities — green checkmarks with brief result snippets)
- table: title "Tool Call Log", columns: tool (string), args_preview (string — show key args), result_preview (string — truncated output), latency_ms (number), status (badge). 5 completed rows with realistic latency values 80-340ms.`,
  },
  {
    key: "planning",
    icon: "📋",
    title: "Planning & Orchestration",
    desc: "Multi-step agent workflows for complex, long-horizon tasks",
    prompt: `a multi-agent orchestration console for the task: "Produce a 40-page investment research report on the global EV battery sector."

The UI should show AGENTS as the primary organising unit, with tasks flowing between them. Use a kanban where each COLUMN is a specialist agent.

Use these sections:
- header: title "Agent Orchestration Console", subtitle "Task: EV Battery Sector Investment Report — 4 agents, 18 sub-tasks, ETA 4 min"
- stat_row: "Agents Active: 4", "Sub-tasks: 18", "Completed: 12", "ETA: 4 min"
- kanban: title "Agent Workstreams" (span: full), 4 columns where each column is an agent:
  "Research Agent" (cards: done: "Scrape EV market reports 2024-2026", done: "Pull battery maker financials — CATL, BYD, Panasonic", done: "Fetch regulatory filings EU/US/China", done: "Identify top 14 EV battery companies by market share"),
  "Analysis Agent" (cards: done: "Model TAM: $387B by 2030", done: "Score competitive moats per company", done: "Calculate margin trends 2021-2025", active: "Build LFP vs NMC vs solid-state cost curve model"),
  "Writing Agent" (cards: done: "Executive Summary", done: "Market Overview section", active: "Company Profiles section (8 of 14 done)", queued: "Risk Factors", queued: "Investment Thesis and Valuation"),
  "QA Agent" (cards: queued: "Fact-check all citations", queued: "Validate financial figures", queued: "Format, paginate, compile final PDF")
- timeline: title "Orchestration Plan", 6 events:
  "Planner decomposed task into 18 sub-tasks across 4 agent roles" (done),
  "Research Agent completed full data collection phase — 847 sources" (done),
  "Analysis Agent unblocked, began quantitative modelling" (done),
  "Writing Agent began drafting in parallel with late analysis tasks" (current),
  "QA Agent scheduled — triggers when Writing Agent completes" (upcoming),
  "Final compilation, formatting, and report delivery" (upcoming)
- table: title "Task Dependencies", columns: task_id (string), agent (badge), depends_on (string — comma-separated task IDs), status (badge: Done/Active/Queued), est_sec (number). 8 rows showing realistic inter-agent dependencies (e.g. "Write Company Profiles" depends on "Score competitive moats").
- alert: type "info", title "Analysis Agent — Task 4 of 4", message "Building LFP vs NMC vs solid-state cost curve. Est. 90 seconds. Writing Agent will be unblocked on completion."`,
  },
  {
    key: "file-generation",
    icon: "📄",
    title: "File Generation",
    desc: "Export to PowerPoint, DOCX, PDF, and more",
    prompt: `a research report studio for generating an "AI Foundation Model Benchmark Report 2026". The centrepiece is a working file export panel that produces real downloadable files.

Use these sections:
- header: title "AI Benchmark Report Studio", subtitle "Generate and export a full AI model benchmark report as PDF, DOCX, or PPTX"
- stat_row: "Report Sections: 5", "Est. Pages: 14", "Word Count: ~3,800", "Export Formats: 3"
- form: title "Configure Report", fields: report_title (text, default "AI Foundation Model Benchmark Report 2026"), lead_author (text, placeholder "Your name or team"), audience (select: "Technical Teams", "Executive Leadership", "Board and Investors"), detail_level (select: "Executive Summary Only", "Standard Report", "Full Technical Deep Dive"), include_appendix (checkbox labelled "Include raw benchmark data tables"), submit_label "Preview Report"
- file_export section with type: file_export (this is critical — use type "file_export" exactly), span: full, props:
  title "AI Foundation Model Benchmark Report 2026",
  description "Comparative evaluation of K2-Think V3 and leading AI models across reasoning, code generation, instruction following, and multimodal benchmarks — with cost and deployment analysis",
  author "InfiniteCanvas Research Team",
  date "July 2026",
  formats ["pdf", "docx", "pptx"],
  templates ["Executive Brief", "Board Presentation", "Technical Appendix"],
  content.sections:
  {heading: "Executive Summary", bullets: ["K2-Think V3 achieves top ranking on 14 of 18 evaluated benchmarks across reasoning, code, and instruction following", "Reasoning performance improved 31% over previous generation on MATH and GPQA Diamond benchmarks", "Multimodal understanding scores within 2% of specialist vision models on standard image evaluation sets", "Cost per million output tokens fell 44% while quality metrics improved across all evaluated categories", "MoE architecture reduces active compute by 73% per forward pass versus dense model equivalents"]},
  {heading: "Reasoning and Chain-of-Thought Benchmarks", bullets: ["GPQA Diamond: K2-Think V3 scores 72.4% versus GPT-4o 53.6% and Gemini 1.5 Pro 49.1%", "MATH benchmark: 94.1% accuracy with chain-of-thought enabled versus 78.3% without extended reasoning", "Multi-hop logical reasoning tasks show lowest hallucination rate (2.1%) in the entire evaluated cohort", "Average chain-of-thought length 847 tokens per complex query — 2.3x longer than nearest competitor on hard tasks"]},
  {heading: "Code Generation and Tool Use", bullets: ["HumanEval pass@1: 94.7% — highest in cohort across Python, TypeScript, Go, and Rust", "Tool call accuracy (correct function selection and argument structure): 91.2% on 500-query evaluation set", "Parallel tool calling support enables 3.4x faster task completion on multi-step agentic benchmarks", "Zero-shot SQL generation accuracy 88.6% across schema-diverse databases without few-shot examples"]},
  {heading: "Instruction Following and Safety", bullets: ["IFEval strict accuracy 89.3% — strongest adherence to complex multi-constraint instructions in cohort", "Refusal precision: 96.1% appropriate refusals with only 1.4% over-refusal rate on borderline prompts", "Multilingual instruction following within 3% of English baseline across 12 tested languages", "Bias evaluation shows significant improvement in demographic parity and consistency versus prior generation"]},
  {heading: "Deployment Cost and Latency", bullets: ["Time to first token P50: 340ms — competitive with models four times smaller in parameter count", "Throughput scales linearly to 500 concurrent streams on standard 8xH100 inference cluster", "Production cost at scale: $2.40 per million input tokens, $9.60 per million output tokens", "Streaming latency P99 under 800ms — suitable for real-time interactive applications at production load"]}`,
  },
  {
    key: "streaming",
    icon: "⚡",
    title: "Real-time Streaming",
    desc: "Watch reasoning and generation token by token",
    prompt: `a live LLM streaming monitor for a K2-Think V3 production API gateway. The UI should feel like watching token streams arrive in real time — not a generic analytics dashboard.

Use these sections:
- header: title "K2-Think V3 Stream Monitor", subtitle "Live production gateway — UAE North — 3 active streams"
- stat_row: "Tokens/sec: 47.3", "Active Streams: 3", "P50 TTFT: 183ms", "Cache Hit Rate: 68%"
- line_chart: title "Throughput — Last 60 Seconds (tokens/sec)", 12 data points at 5-second intervals. Values: 31, 38, 44, 52, 48, 61, 57, 43, 49, 55, 47, 47. Show realistic production variance.
- table: title "Active Streams", columns: stream_id (string), model (string), prompt_snippet (string — truncated at ~45 chars), tokens_out (number), elapsed_ms (number), status (badge: Streaming). 3 rows:
  stream id "stm-a4f2", model "k2-think-v3", prompt "Summarise the following earnings call transcript from...", tokens_out 412, elapsed 8420, Streaming
  stream id "stm-b8c1", model "k2-think-v3", prompt "Write a Python function to parse ISO 8601 timestamps...", tokens_out 189, elapsed 3910, Streaming
  stream id "stm-e2d9", model "k2-think-v3", prompt "You are a financial analyst. Analyse the following Q3...", tokens_out 67, elapsed 1340, Streaming
- table: title "Recent Completed Streams", columns: stream_id (string), total_tokens (number), ttft_ms (number), duration_ms (number), input_tokens (number), cost_usd (number). 6 rows of realistic completed requests — total_tokens ranging 340-2100, ttft_ms 140-290, duration_ms 7200-44000, cost_usd 0.008-0.024.
- bar_chart: title "Request Mix — Last 1,000 Streams", 5 bars: Analysis 34, Summarisation 28, Code Generation 19, Chat 12, Classification 7`,
  },
];

const BUILD_STAGES = [
  { key: "brief",    label: "Analyzing design brief…" },
  { key: "layout",   label: "Designing component layout…" },
  { key: "data",     label: "Generating sample data…" },
  { key: "building", label: "Building prototype…" },
  { key: "render",   label: "Rendering components…" },
];

function StatusDot({ status }) {
  return <span className={`status-dot ${status}`} />;
}

function statusLabel(status) {
  switch (status) {
    case "thinking":   return "K2-Think is reasoning…";
    case "generating": return "Generating prototype…";
    case "ready":      return "Prototype ready";
    case "error":      return "Generation failed";
    default:           return "Awaiting input";
  }
}

export default function App() {
  const [tutorialActive,    setTutorialActive]    = useState(false);
  const [activeCapability,  setActiveCapability]  = useState(null);
  const [history, setHistory] = useState([]);
  const [tree, setTree]       = useState(null);
  const [status, setStatus]   = useState("idle");
  const [stageIdx, setStageIdx] = useState(0);
  const [stageTimes, setStageTimes]       = useState({});
  const [stageReasoning, setStageReasoning] = useState({});
  const [expandedStage, setExpandedStage] = useState(null);
  const [clockTick, setClockTick]         = useState(0);
  const [streamText, setStreamText] = useState("");
  const [errorMsg, setErrorMsg]     = useState("");
  const [showExport, setShowExport] = useState(false);
  const [prompt, setPrompt]   = useState("");
  const textareaRef        = useRef(null);
  const historyRef         = useRef(null);
  const streamPreviewRef   = useRef(null);
  const streamRef          = useRef("");
  const thinkRef           = useRef("");
  const reasoningCursorRef = useRef(0);
  const stageIdxRef        = useRef(0);
  const stageTimerRef      = useRef(null);
  const clockIntervalRef   = useRef(null);

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [history, status]);

  // Auto-scroll stream preview to bottom as tokens arrive
  useEffect(() => {
    const el = streamPreviewRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [streamText]);

  // Live second counter while generating
  useEffect(() => {
    if (status === "thinking" || status === "generating") {
      clockIntervalRef.current = setInterval(() => setClockTick(t => t + 1), 1000);
    } else {
      clearInterval(clockIntervalRef.current);
    }
    return () => clearInterval(clockIntervalRef.current);
  }, [status]);

  function advanceStages(startAt = 0) {
    const t0 = Date.now();
    setStageIdx(startAt);
    setStageTimes({ [startAt]: t0 });
    setStageReasoning({});
    setExpandedStage(null);
    setClockTick(0);
    stageIdxRef.current = startAt;
    reasoningCursorRef.current = 0;
    let i = startAt;

    function tick() {
      if (i < BUILD_STAGES.length - 1) {
        // Snapshot think-phase text accumulated during this stage
        const snippet = thinkRef.current.slice(reasoningCursorRef.current).trim();
        reasoningCursorRef.current = thinkRef.current.length;
        const finished = i;
        if (snippet) setStageReasoning(prev => ({ ...prev, [finished]: snippet }));

        i++;
        stageIdxRef.current = i;
        setStageTimes(prev => ({ ...prev, [i]: Date.now() }));
        setStageIdx(i);
        stageTimerRef.current = setTimeout(tick, 2800 + Math.random() * 1400);
      }
    }
    stageTimerRef.current = setTimeout(tick, 2400);
  }

  function stopStages() {
    clearTimeout(stageTimerRef.current);
    // Snapshot any remaining reasoning for the last active stage
    const snippet = thinkRef.current.slice(reasoningCursorRef.current).trim();
    if (snippet) {
      setStageReasoning(prev => ({ ...prev, [stageIdxRef.current]: snippet }));
    }
    setStageTimes(prev => ({ ...prev, [BUILD_STAGES.length]: Date.now() }));
    setStageIdx(BUILD_STAGES.length - 1);
  }

  const handleSubmit = useCallback(async (text) => {
    const trimmed = (text || prompt).trim();
    if (!trimmed || status === "thinking" || status === "generating") return;

    setHistory(prev => [...prev, { role: "user", content: trimmed }]);
    setPrompt("");
    setStatus("thinking");
    setStreamText("");
    setErrorMsg("");
    streamRef.current = "";
    thinkRef.current = "";
    reasoningCursorRef.current = 0;
    advanceStages(0);

    try {
      const response = await fetch(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, prior_tree: tree || null }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let evt;
          try { evt = JSON.parse(line.slice(6)); } catch { continue; }

          if (evt.type === "token") {
            if (evt.phase === "think") {
              setStatus("thinking");
              thinkRef.current += evt.text;
            } else {
              setStatus("generating");
            }
            streamRef.current += evt.text;
            setStreamText(streamRef.current);
          } else if (evt.type === "done") {
            stopStages();
            setTree(evt.tree);
            setHistory(prev => [...prev, { role: "assistant", content: evt.tree?.title || "Generated", tree: evt.tree }]);
            setStatus("ready");
          } else if (evt.type === "error") {
            stopStages();
            setErrorMsg(evt.message);
            setStatus("error");
          }
        }
      }
    } catch (err) {
      stopStages();
      setErrorMsg(err.message || "Network error");
      setStatus("error");
    }
  }, [history, prompt, status]);

  function handleBack() {
    setStatus("idle");
    setTree(null);
    setStreamText("");
    setErrorMsg("");
    setActiveCapability(null);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const isGenerating = status === "thinking" || status === "generating";
  const showCanvas   = status !== "idle" || tree;
  const turnCount    = history.filter(m => m.role === "user").length;

  return (
    <div className="app">
      {/* ── Left panel ─────────────────────────────────────────── */}
      <div className="left-panel">
        <div className="left-header">
          <div className="brand">
            <div className="brand-icon">⚡</div>
            <h1>InfiniteCanvas</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="k2-badge">
              <span className="k2-badge-dot" />
              K2-Think V3
            </div>
            <button
              className="tutorial-start-btn"
              onClick={() => {
                if (tree || status === "ready" || status === "error") handleBack();
                setTutorialActive(true);
              }}
              title="Take a guided tour"
            >
              Tutorial
            </button>
          </div>
        </div>

        <div className="history-scroll" ref={historyRef}>
          {history.length === 0 && status === "idle" ? (
            <div className="history-empty">
              <div className="history-empty-icon">🎨</div>
              <p>Describe any interface in plain language and watch K2-Think build it live.</p>
              <div className="example-chips">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    className="example-chip"
                    onClick={() => handleSubmit(ex)}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            history.map((msg, i) => {
              if (msg.role === "user") {
                const versionNum = history.slice(0, i + 1).filter(m => m.role === "user").length;
                return (
                  <div key={i} className="history-turn">
                    <div className="history-user">{msg.content}</div>
                  </div>
                );
              }
              const versionNum = history.slice(0, i + 1).filter(m => m.role === "assistant").length;
              const hasTree = !!msg.tree;
              return (
                <div
                  key={i}
                  className={`history-assistant${hasTree ? " restorable" : ""}`}
                  onClick={hasTree ? () => { setTree(msg.tree); setStatus("ready"); } : undefined}
                  title={hasTree ? "Click to restore this prototype" : undefined}
                >
                  <span className="version-badge">v{versionNum}</span>
                  <span>{msg.content || "Generated prototype"}</span>
                  {hasTree && <span className="restore-hint">Restore</span>}
                </div>
              );
            })
          )}

          {isGenerating && (
            <div className="history-assistant">
              <span className="version-badge">v{turnCount}</span>
              <span style={{ color: "var(--accent)", fontSize: "0.75rem" }}>
                {status === "thinking" ? "Reasoning…" : "Generating…"}
              </span>
            </div>
          )}
        </div>

        <div className="prompt-area">
          <div className="prompt-form">
            <textarea
              ref={textareaRef}
              className="prompt-input"
              placeholder={
                history.length === 0
                  ? "Describe a UI to generate…"
                  : "Refine the prototype… (e.g. add dark mode)"
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isGenerating}
              rows={2}
            />
            <div className="prompt-actions">
              <span className="prompt-hint">⌘↵ to generate</span>
              <button
                className="btn-generate"
                onClick={() => handleSubmit()}
                disabled={!prompt.trim() || isGenerating}
              >
                {isGenerating ? "Generating…" : history.length === 0 ? "Generate" : "Refine"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────── */}
      <div className="right-panel">
        <div className="canvas-toolbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {(tree || status === "error") && (
              <button className="btn-back" onClick={handleBack} title="Return to home screen">
                ← Home
              </button>
            )}
            <div className="canvas-title">
              <StatusDot status={status} />
              {tree?.title || "Canvas"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="canvas-status">
              <span>{statusLabel(status)}</span>
            </div>
            {tree && (
              <button className="btn-export" onClick={() => setShowExport(true)}>
                ⬡ Export
              </button>
            )}
          </div>
        </div>

        <div className="canvas-scroll">
          {status === "idle" && !tree && (
            <div className="canvas-idle">
              <div className="k2-idle-header">
                <div className="k2-idle-logo">⚡</div>
                <div className="k2-idle-title">K2-Think V3</div>
                <div className="k2-idle-sub">Next-generation reasoning model</div>
              </div>

              <div className="k2-capability-grid">
                {CAPABILITIES.map(cap => (
                  <button
                    key={cap.title}
                    className="k2-capability-card"
                    onClick={() => { setActiveCapability(cap.key); handleSubmit(cap.prompt); }}
                    disabled={isGenerating}
                    title={`Generate: ${cap.prompt}`}
                  >
                    <div className="k2-cap-icon">{cap.icon}</div>
                    <div className="k2-cap-title">{cap.title}</div>
                    <div className="k2-cap-desc">{cap.desc}</div>
                    {cap.label && <div className="k2-cap-live">{cap.label}</div>}
                    <div className="k2-cap-cta">Click to demo →</div>
                  </button>
                ))}
              </div>

              <p className="k2-idle-cta">Click any card above or type a prompt on the left</p>
            </div>
          )}

          {isGenerating && (
            <div className={`building-state${tutorialActive ? " in-tour" : ""}`}>
              <div className="k2-powered-bubble">
                <span className="k2-bubble-dot" />
                K2-Think V3 · {status === "thinking" ? "Reasoning…" : "Generating UI…"}
              </div>
              <div className="building-ring" />
              <div className="building-stages">
                {BUILD_STAGES.map((stage, i) => {
                  const isDone   = i < stageIdx;
                  const isActive = i === stageIdx;
                  const t0 = stageTimes[i];
                  const t1 = stageTimes[i + 1] ?? (isDone ? stageTimes[BUILD_STAGES.length] : null);
                  const elapsedMs = t0 ? ((isDone && t1 ? t1 : Date.now()) - t0) : null;
                  const elapsedS  = elapsedMs !== null ? (elapsedMs / 1000).toFixed(1) : null;
                  const reasoning = stageReasoning[i];
                  const isExpanded = expandedStage === i;
                  void clockTick; // trigger re-render for live timer
                  return (
                    <div key={stage.key} className="stage-row">
                      <div className={`building-stage ${isDone ? "done" : isActive ? "active" : ""}`}>
                        <span className="stage-dot" />
                        <span className="stage-label">{stage.label}</span>
                        {elapsedS !== null && (
                          <span className="stage-elapsed">{elapsedS}s</span>
                        )}
                        {reasoning && (
                          <button
                            className={`stage-expand-btn ${isExpanded ? "open" : ""}`}
                            onClick={() => setExpandedStage(isExpanded ? null : i)}
                            title="View K2-Think reasoning"
                          >
                            {isExpanded ? "▲" : "▼"} Reasoning
                          </button>
                        )}
                      </div>
                      {isExpanded && reasoning && (
                        <div className="stage-reasoning">
                          <div className="stage-reasoning-label">
                            K2-Think V3 · Stage reasoning
                          </div>
                          <div className="stage-reasoning-text">{reasoning}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {streamText && (
                <div className="stream-preview" ref={streamPreviewRef}>{streamText}</div>
              )}
            </div>
          )}

          {status === "error" && (
            <div className="error-state">
              <h3>Generation failed</h3>
              <p>{errorMsg}</p>
              <button className="btn-retry" onClick={() => setStatus("idle")}>
                Try again
              </button>
            </div>
          )}

          {status === "ready" && tree && (
            <div className="prototype-canvas">
              <Renderer tree={tree} />
            </div>
          )}
        </div>

        {showExport && tree && (
          <ExportPanel tree={tree} onClose={() => setShowExport(false)} />
        )}
      </div>

      {tutorialActive && (
        <Tutorial
          phase={
            status === "ready" || status === "error" ? "ready"
            : (status === "thinking" || status === "generating") ? "generating"
            : "idle"
          }
          stageIdx={stageIdx}
          stageKey={BUILD_STAGES[stageIdx]?.key}
          stageLabel={BUILD_STAGES[stageIdx]?.label}
          totalStages={BUILD_STAGES.length}
          activeCapability={activeCapability}
          onExit={() => setTutorialActive(false)}
        />
      )}
    </div>
  );
}
