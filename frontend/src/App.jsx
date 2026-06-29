import { useState, useRef, useEffect, useCallback } from "react";
import Renderer from "./components/Renderer.jsx";
import ExportPanel from "./components/ExportPanel.jsx";
import Tutorial from "./components/Tutorial.jsx";

const API_BASE = window.RUNTIME_API_BASE || import.meta.env.VITE_API_URL || "";

const EXAMPLES = [
  "a dashboard for tracking lab equipment bookings",
  "a kanban board for a software sprint",
  "a patient intake form for a clinic",
  "a timeline for a product launch roadmap",
  "an analytics dashboard for e-commerce sales",
];

const CAPABILITIES = [
  {
    icon: "🎨",
    title: "Generative UI",
    desc: "Describe any interface and get a live React prototype in seconds",
    active: true,
    prompt: "a project management dashboard with sprint board, task assignments, velocity chart, team workload breakdown, and deadline alert panel",
  },
  {
    icon: "🧠",
    title: "Chain-of-Thought",
    desc: "Watch the full reasoning chain before every response",
    prompt: "an AI reasoning trace explorer with expandable step-by-step thought chains, confidence scores per step, token usage breakdown, branching decision paths, and a model run comparison table",
  },
  {
    icon: "🔧",
    title: "Tool Calling",
    desc: "Connect to APIs, databases, and external services",
    prompt: "an API tool integration hub with connected services registry, live call logs, request builder with response inspector, authentication manager, rate limit gauges, and error tracking panel",
  },
  {
    icon: "📋",
    title: "Planning & Orchestration",
    desc: "Multi-step agent workflows for complex, long-horizon tasks",
    prompt: "a multi-agent workflow orchestration dashboard with task dependency graph, agent assignment queue, execution timeline, agent status cards, step completion tracker, and run history log",
  },
  {
    icon: "📄",
    title: "File Generation",
    desc: "Export to PowerPoint, DOCX, PDF, and more",
    prompt: "a quarterly business review report generator. Include a stat_row with report metrics, a form for configuring report details, and a file_export section (type: file_export) with realistic content including sections for Executive Summary, Key Performance Metrics, Regional Breakdown, and Strategic Recommendations — with actual PDF, DOCX, and PPTX download buttons that generate real files",
  },
  {
    icon: "⚡",
    title: "Real-time Streaming",
    desc: "Watch reasoning and generation token by token",
    prompt: "a real-time streaming analytics dashboard with live throughput chart, event log feed, latency histogram, consumer group status table, error rate monitor, and stream health indicators",
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
  const [tutorialActive, setTutorialActive] = useState(false);
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
              onClick={() => setTutorialActive(true)}
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
                    className={`k2-capability-card${cap.active ? " active" : ""}`}
                    onClick={() => handleSubmit(cap.prompt)}
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
          onExit={() => setTutorialActive(false)}
        />
      )}
    </div>
  );
}
