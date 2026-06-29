import { useState, useRef, useEffect, useCallback } from "react";
import Renderer from "./components/Renderer.jsx";
import ExportPanel from "./components/ExportPanel.jsx";

const API_BASE = window.RUNTIME_API_BASE || import.meta.env.VITE_API_URL || "";

const EXAMPLES = [
  "a dashboard for tracking lab equipment bookings",
  "a kanban board for a software sprint",
  "a patient intake form for a clinic",
  "a timeline for a product launch roadmap",
  "an analytics dashboard for e-commerce sales",
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
  const [history, setHistory] = useState([]);
  const [tree, setTree]       = useState(null);
  const [status, setStatus]   = useState("idle");
  const [stageIdx, setStageIdx] = useState(0);
  const [streamText, setStreamText] = useState("");
  const [errorMsg, setErrorMsg]     = useState("");
  const [showExport, setShowExport] = useState(false);
  const [prompt, setPrompt]   = useState("");
  const textareaRef  = useRef(null);
  const historyRef   = useRef(null);
  const streamRef    = useRef("");
  const stageTimerRef = useRef(null);

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [history, status]);

  function advanceStages(startAt = 0) {
    setStageIdx(startAt);
    let i = startAt;
    function tick() {
      if (i < BUILD_STAGES.length - 1) {
        i++;
        setStageIdx(i);
        stageTimerRef.current = setTimeout(tick, 2800 + Math.random() * 1400);
      }
    }
    stageTimerRef.current = setTimeout(tick, 2400);
  }

  function stopStages() {
    clearTimeout(stageTimerRef.current);
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
            } else {
              setStatus("generating");
            }
            streamRef.current += evt.text;
            setStreamText(streamRef.current.slice(-400));
          } else if (evt.type === "done") {
            stopStages();
            setTree(evt.tree);
            setHistory(prev => [...prev, { role: "assistant", content: evt.tree?.title || "Generated" }]);
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
            <h1>SwiftCanvas</h1>
          </div>
          <div className="k2-badge">
            <span className="k2-badge-dot" />
            K2-Think V3
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
              let parsed = null;
              try { parsed = JSON.parse(msg.content); } catch {}
              return (
                <div key={i} className="history-assistant">
                  <span className="version-badge">v{versionNum}</span>
                  <span>{parsed?.title || "Generated prototype"}</span>
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
          <div className="canvas-title">
            <StatusDot status={status} />
            {tree?.title || "Canvas"}
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
                {[
                  { icon: "🎨", title: "Generative UI", desc: "Describe any interface → live React prototype in seconds", active: true },
                  { icon: "🧠", title: "Chain-of-Thought", desc: "Deep reasoning before every response — watch it think live" },
                  { icon: "🔧", title: "Tool Calling", desc: "Connect to APIs, databases, and external services" },
                  { icon: "📋", title: "Planning & Orchestration", desc: "Multi-step agent workflows for complex, long-horizon tasks" },
                  { icon: "📄", title: "File Generation", desc: "Export to PowerPoint, DOCX, PDF, and more" },
                  { icon: "⚡", title: "Real-time Streaming", desc: "Watch reasoning and generation token by token" },
                ].map(cap => (
                  <div key={cap.title} className={`k2-capability-card${cap.active ? " active" : ""}`}>
                    <div className="k2-cap-icon">{cap.icon}</div>
                    <div className="k2-cap-title">{cap.title}</div>
                    <div className="k2-cap-desc">{cap.desc}</div>
                    {cap.active && <div className="k2-cap-live">● Live demo</div>}
                  </div>
                ))}
              </div>

              <p className="k2-idle-cta">Type a prompt on the left to see <strong>Generative UI</strong> in action</p>
            </div>
          )}

          {isGenerating && (
            <div className="building-state">
              <div className="k2-powered-bubble">
                <span className="k2-bubble-dot" />
                K2-Think V3 · {status === "thinking" ? "Reasoning…" : "Generating UI…"}
              </div>
              <div className="building-ring" />
              <div className="building-stages">
                {BUILD_STAGES.map((stage, i) => (
                  <div
                    key={stage.key}
                    className={`building-stage ${i < stageIdx ? "done" : i === stageIdx ? "active" : ""}`}
                  >
                    <span className="stage-dot" />
                    {stage.label}
                  </div>
                ))}
              </div>
              {streamText && (
                <div className="stream-preview">{streamText}</div>
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
    </div>
  );
}
