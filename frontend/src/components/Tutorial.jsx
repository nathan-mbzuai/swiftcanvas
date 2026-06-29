import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

// ── Idle steps (no overlay; all 6 capability cards stay fully visible) ────────

const IDLE_STEPS = [
  {
    target: ".brand",
    position: "right",
    title: "Welcome to InfiniteCanvas",
    body: "Describe any interface in plain language and K2-Think V3 will generate a live, interactive React prototype in seconds. No code required.",
    k2: "K2-Think V3 plans your design requirements, lays out component structure, and generates a full UI schema through chain-of-thought reasoning.",
    hasNext: true,
  },
  {
    target: ".k2-capability-grid",
    position: "top",
    title: "Six K2-Think V3 capabilities",
    body: "Each card is a live demo of a different K2-Think V3 capability. Click any card to generate a prototype that demonstrates it: Generative UI, Chain-of-Thought, Tool Calling, Planning, File Generation, or Streaming.",
    k2: "The same reasoning engine powers all six capabilities. This demo focuses on Generative UI, but the model API is identical for every capability shown.",
    hasNext: true,
  },
  {
    target: ".example-chips",
    position: "right",
    title: "Or type your own prompt",
    body: "Click any example chip or type your own description. K2-Think V3 will reason through the design and generate a live prototype. Watch each stage as it happens.",
    hasNext: false,
    allowInteract: true,
    waitForNav: true,
  },
];

// ── Generating phase commentary (keyed by BUILD_STAGES.key) ──────────────────

const STAGE_COMMENTARY = {
  brief: {
    k2: "Chain-of-thought phase: the model reasons about your design intent before choosing any components.",
    body: "K2-Think V3 is reading your prompt and reasoning about the interface domain: who uses it, what data it holds, what actions it needs to support. Every component decision flows from this.",
  },
  layout: {
    k2: "The model weighs layout options (dashboard, kanban, form, split-pane) against the data model implied by your prompt.",
    body: "K2-Think V3 is selecting the page structure and deciding which section types (stat rows, charts, tables, forms, kanban columns) best match this domain and user flow.",
  },
  data: {
    k2: "Domain-specific data is inferred from context: column names, row values, and KPIs all reflect the actual subject matter.",
    body: "K2-Think V3 is populating realistic sample data with actual column headers, plausible row values, and meaningful KPI numbers drawn from the design domain, not placeholder text.",
  },
  building: {
    k2: "The full prototype spec is a single JSON object. Streaming it lets you watch the model write each section as it reasons.",
    body: "K2-Think V3 is emitting the complete JSON component tree, section by section, prop by prop, data row by data row. Every token in the preview below is being written right now.",
  },
  render: {
    k2: "Validation catches structural issues before the renderer fires, so the prototype always appears in a coherent state.",
    body: "InfiniteCanvas is parsing the completed JSON, checking the component tree, and handing it to the React renderer. Your prototype is about to appear.",
  },
};

const STAGE_FALLBACK = {
  k2: "K2-Think V3 is actively processing this stage.",
  body: "K2-Think V3 is working through this stage: reasoning about requirements, generating structure, and producing output. Watch the token stream in the preview below.",
};

// ── Ready steps (default / Generative UI) ────────────────────────────────────

const READY_DEFAULT = [
  {
    target: ".prototype-canvas",
    position: "left",
    title: "Your live prototype",
    body: "Fully interactive. Sort the table, fill out forms, drag kanban cards, click chart segments. This is real React running in the browser, not a screenshot.",
    k2: "K2-Think V3 generated the entire component tree: layout, section types, sample data, and structure, all in one reasoning pass from your plain-language prompt.",
    hasNext: true,
  },
  {
    target: ".btn-export",
    position: "bottom",
    title: "Export as JSON or JSX",
    body: "Get the raw JSON component schema or auto-generated React JSX ready to drop into a project. The JSX includes Recharts imports and all component wiring.",
    hasNext: true,
  },
  {
    target: ".prompt-area",
    position: "right",
    title: "Iterate in plain language",
    body: "Type a follow-up like 'add a dark mode toggle' or 'replace the table with a kanban board'. K2-Think V3 updates the prototype while preserving the rest of your design.",
    k2: "K2-Think V3 receives the full current component tree as context, reasons about your change, and returns an updated tree that keeps all unchanged sections intact.",
    hasNext: false,
    isFinal: true,
  },
];

// ── Ready steps per capability ────────────────────────────────────────────────

const READY_BY_CAPABILITY = {
  "chain-of-thought": [
    {
      target: ".prototype-canvas",
      position: "left",
      title: "Reasoning Trace Explorer",
      body: "K2-Think V3 built this reasoning explorer using its own chain-of-thought, the very process you watched streaming in the build stages. Each panel in this prototype represents a step in that thought process.",
      k2: "Chain-of-thought is native to every K2-Think V3 response. The reasoning you watched is the exact same mechanism used when calling the model on any task, not a simulation.",
      hasNext: true,
    },
    {
      target: ".btn-export",
      position: "bottom",
      title: "Export this UI",
      body: "Export the reasoning explorer as JSON or working React JSX. Drop it into any project. It comes fully wired with expand/collapse, confidence score rendering, and token counts.",
      hasNext: true,
    },
    {
      target: ".prompt-area",
      position: "right",
      title: "Go deeper",
      body: "Try: 'add a side-by-side model comparison panel' or 'add a timeline view of reasoning steps'. K2-Think V3 will reason through your refinement using the same chain-of-thought it just demonstrated.",
      k2: "Every refinement triggers a new reasoning pass. You can watch K2-Think V3's thought process for each iteration in the build stages.",
      hasNext: false,
      isFinal: true,
    },
  ],

  "tool-calling": [
    {
      target: ".prototype-canvas",
      position: "left",
      title: "API Integration Hub",
      body: "K2-Think V3 generated this tool integration dashboard with request builder, response inspector, auth manager, rate limit gauges, and live call logs, all from a single plain-language prompt.",
      k2: "Tool calling lets K2-Think V3 invoke external APIs, databases, and services during a conversation. This prototype visualises what a tool-orchestration interface looks like.",
      hasNext: true,
    },
    {
      target: ".btn-export",
      position: "bottom",
      title: "Export the integration hub",
      body: "Export as JSON schema or React JSX. Swap in real API endpoints and the call log, response inspector, and auth UI all wire up to live data.",
      hasNext: true,
    },
    {
      target: ".prompt-area",
      position: "right",
      title: "Add more tools",
      body: "Try: 'add a webhooks panel' or 'add an OAuth flow configurator'. K2-Think V3 will update the hub while preserving the existing tool registry and logs.",
      k2: "K2-Think V3 receives the full current component tree and reasons about which new sections to add. It never discards unchanged parts.",
      hasNext: false,
      isFinal: true,
    },
  ],

  "planning": [
    {
      target: ".prototype-canvas",
      position: "left",
      title: "Multi-Agent Orchestration Dashboard",
      body: "K2-Think V3 designed this workflow orchestrator with task dependency graph, agent queue, execution timeline, and run history, reasoning about what a real orchestration interface needs at each planning step.",
      k2: "Planning and orchestration is how K2-Think V3 breaks complex goals into structured sub-tasks and assigns them to agents or tools. This prototype visualises that planning layer.",
      hasNext: true,
    },
    {
      target: ".btn-export",
      position: "bottom",
      title: "Export the orchestrator",
      body: "Export as JSON or JSX and connect to a real workflow engine. The DAG structure, status cards, and timeline are all rendered from the component tree K2-Think V3 generated.",
      hasNext: true,
    },
    {
      target: ".prompt-area",
      position: "right",
      title: "Extend the workflow",
      body: "Try: 'add a cost estimation panel per agent' or 'add a failure retry policy configurator'. K2-Think V3 will plan out the new sections and integrate them into the existing dashboard.",
      k2: "K2-Think V3 treats each refinement as a new planning problem. It reasons about where new sections fit, what data they need, and how they connect to existing components.",
      hasNext: false,
      isFinal: true,
    },
  ],

  "file-generation": [
    {
      target: ".file-export",
      position: "left",
      title: "Real file downloads",
      body: "Click any format button (PDF, DOCX, or PPTX) to generate and download an actual file right now. The document content including headings, bullet points, and author info was written by K2-Think V3.",
      k2: "K2-Think V3 generated all the document content: section titles, bullet points, and metadata. The file generation libraries (jsPDF, docx, pptxgenjs) then render it into each format in the browser.",
      hasNext: true,
    },
    {
      target: ".btn-export",
      position: "bottom",
      title: "Export the generator UI",
      body: "Export this entire document generation studio as JSON or JSX. Swap in your own content schema and the PDF, DOCX, and PPTX download buttons work immediately.",
      hasNext: true,
    },
    {
      target: ".prompt-area",
      position: "right",
      title: "Customise the document",
      body: "Try: 'add a cover page section with logo placeholder' or 'add a competitive analysis section with a comparison table'. K2-Think V3 will add the section and its content to the exported files.",
      k2: "Each refinement updates both the UI and the document content object. New sections you add appear in the downloaded PDF, DOCX, and PPTX automatically.",
      hasNext: false,
      isFinal: true,
    },
  ],

  "streaming": [
    {
      target: ".prototype-canvas",
      position: "left",
      title: "Real-time Streaming Dashboard",
      body: "K2-Think V3 designed this live-data monitoring dashboard with throughput charts, event log feed, latency histogram, and consumer group status, reasoning about what a streaming analytics interface needs.",
      k2: "Real-time streaming is how InfiniteCanvas delivers K2-Think V3's reasoning token-by-token as you generate. This prototype visualises what that streaming infrastructure looks like as a product UI.",
      hasNext: true,
    },
    {
      target: ".btn-export",
      position: "bottom",
      title: "Export the dashboard",
      body: "Export as JSON or React JSX. Wire the charts to a real WebSocket or Kafka consumer and every panel (throughput, latency, error rate) updates live.",
      hasNext: true,
    },
    {
      target: ".prompt-area",
      position: "right",
      title: "Add monitoring panels",
      body: "Try: 'add a dead letter queue monitor' or 'add a per-partition lag chart'. K2-Think V3 will add the panel and its sample data while keeping the rest of the dashboard intact.",
      k2: "K2-Think V3 streams its response to the browser token-by-token. The same real-time streaming this prototype visualises is what you just watched generating it.",
      hasNext: false,
      isFinal: true,
    },
  ],
};

// ── Layout helpers ────────────────────────────────────────────────────────────

function getBubbleStyle(targetEl, position) {
  if (!targetEl) return { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  const rect = targetEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const gap = 16;
  const bubbleW = Math.min(340, vw - gap * 2);
  const bubbleH = 380;

  function computeRaw(pos) {
    switch (pos) {
      case "right":  return { top: rect.top,                 left: rect.right + gap };
      case "left":   return { top: rect.top,                 left: rect.left - bubbleW - gap };
      case "bottom": return { top: rect.bottom + gap,        left: rect.left };
      case "top":    return { top: rect.top - bubbleH - gap, left: rect.left };
      default:       return { top: rect.top,                 left: rect.right + gap };
    }
  }

  const order = [position, "right", "left", "bottom", "top"].filter((v, i, a) => a.indexOf(v) === i);
  const chosen = order.find(pos => {
    const { top: t, left: l } = computeRaw(pos);
    return l >= gap && l + bubbleW <= vw - gap && t >= gap && t + bubbleH <= vh - gap;
  }) || position;

  const { top: rawTop, left: rawLeft } = computeRaw(chosen);
  return {
    position: "fixed",
    top:  Math.max(gap, Math.min(rawTop,  vh - bubbleH - gap)),
    left: Math.max(gap, Math.min(rawLeft, vw - bubbleW - gap)),
  };
}

function getSpotlightStyle(targetEl) {
  if (!targetEl) return null;
  const rect = targetEl.getBoundingClientRect();
  const tall = rect.height > 300;
  const pad = tall ? 12 : 8;
  return {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: tall ? Math.min(rect.height + pad * 2, window.innerHeight * 0.75) : rect.height + pad * 2,
    borderRadius: 12,
  };
}

// ── Generating phase bubble (no overlay; building state fully visible) ────────

function GeneratingTutorial({ stageIdx, stageKey, stageLabel, totalStages, onExit }) {
  const commentary = STAGE_COMMENTARY[stageKey] || STAGE_FALLBACK;
  const displayIdx = Math.min(stageIdx ?? 0, (totalStages ?? 5) - 1);

  const [bubblePos, setBubblePos] = useState(null);
  const [targetEl,  setTargetEl]  = useState(null);

  const updatePos = useCallback(() => {
    const el = document.querySelector(".building-stages") || document.querySelector(".building-state");
    if (!el) { setBubblePos(null); return; }
    if (el !== targetEl) setTargetEl(el);
    setBubblePos(getBubbleStyle(el, "right"));
  }, [targetEl]);

  useEffect(() => {
    updatePos();
    const id = setInterval(updatePos, 600);
    return () => clearInterval(id);
  }, [updatePos]);

  useEffect(() => {
    if (!targetEl) return;
    let deb;
    const h = () => { clearTimeout(deb); deb = setTimeout(updatePos, 80); };
    window.addEventListener("scroll", h, true);
    window.addEventListener("resize", h);
    return () => { window.removeEventListener("scroll", h, true); window.removeEventListener("resize", h); };
  }, [targetEl, updatePos]);

  useEffect(() => {
    if (!targetEl) return;
    const orig = targetEl.style.position;
    if (!orig || orig === "static") targetEl.style.position = "relative";
    targetEl.style.zIndex = "9010";
    return () => { targetEl.style.zIndex = ""; if (!orig || orig === "static") targetEl.style.position = ""; };
  }, [targetEl]);

  const bubble = bubblePos && (
    <div key={`gen-${displayIdx}`} className="tutorial-bubble tutorial-bubble--generating" style={{ ...bubblePos, zIndex: 9030 }}>
      <div className="tutorial-k2-flag">
        <span className="tutorial-k2-label">⚡ K2-Think V3 · Stage {displayIdx + 1}{totalStages ? ` of ${totalStages}` : ""}</span>
        <span className="tutorial-k2-desc">{commentary.k2}</span>
      </div>
      <div className="tutorial-bubble-title">{stageLabel || "Processing…"}</div>
      <div className="tutorial-bubble-body">{commentary.body}</div>
      <div className="tutorial-progress-row">
        {Array.from({ length: totalStages ?? 5 }).map((_, i) => (
          <span key={i} className={`tutorial-progress-dot ${i === displayIdx ? "active" : i < displayIdx ? "done" : ""}`} />
        ))}
        <span className="tutorial-progress-label">Generating…</span>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(bubble, document.body)}
      {createPortal(
        <button className="tutorial-exit-btn" style={{ zIndex: 9030 }} onClick={onExit}>Exit tour</button>,
        document.body
      )}
    </>
  );
}

// ── Idle + Ready phases ───────────────────────────────────────────────────────

function SteppedTutorial({ phase, activeCapability, onExit }) {
  const [stepIdx,      setStepIdx]      = useState(0);
  const [targetEl,     setTargetEl]     = useState(null);
  const [bubblePos,    setBubblePos]    = useState(null);
  const [spotlightPos, setSpotlightPos] = useState(null);
  const scrollTimerRef = useRef(null);

  const steps =
    phase === "idle"  ? IDLE_STEPS :
    phase === "ready" ? (READY_BY_CAPABILITY[activeCapability] || READY_DEFAULT) : [];
  const step = steps[stepIdx] || null;

  // Idle phase: no dark overlay so all capability cards stay fully visible
  const useOverlay = phase !== "idle";

  const updatePos = useCallback(() => {
    if (!step || !targetEl) { setBubblePos(null); setSpotlightPos(null); return; }
    setBubblePos(getBubbleStyle(targetEl, step.position));
    setSpotlightPos(useOverlay ? getSpotlightStyle(targetEl) : null);
  }, [step, targetEl, useOverlay]);

  const findTarget = useCallback(() => {
    if (!step) return;
    for (const sel of step.target.split(",").map(s => s.trim())) {
      const el = document.querySelector(sel);
      if (el) { setTargetEl(el); return; }
    }
    setTargetEl(null);
  }, [step]);

  useEffect(() => {
    findTarget();
    const id = setInterval(findTarget, 500);
    return () => clearInterval(id);
  }, [findTarget]);

  useEffect(() => {
    if (!targetEl) return;
    setBubblePos(null); setSpotlightPos(null);
    clearTimeout(scrollTimerRef.current);
    const rect = targetEl.getBoundingClientRect();
    const inView = rect.top >= 0 && rect.bottom <= window.innerHeight;
    if (inView) {
      scrollTimerRef.current = setTimeout(updatePos, 120);
    } else {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      scrollTimerRef.current = setTimeout(updatePos, 550);
    }
    return () => clearTimeout(scrollTimerRef.current);
  }, [stepIdx, targetEl]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!targetEl) return;
    let deb;
    const h = () => { clearTimeout(deb); deb = setTimeout(updatePos, 80); };
    window.addEventListener("scroll", h, true);
    window.addEventListener("resize", h);
    return () => { window.removeEventListener("scroll", h, true); window.removeEventListener("resize", h); clearTimeout(deb); };
  }, [targetEl, updatePos]);

  useEffect(() => { setStepIdx(0); }, [phase, activeCapability]);

  // Only elevate target element in ready phase (overlay + spotlight)
  useEffect(() => {
    if (!targetEl || !useOverlay) return;
    const orig = targetEl.style.position;
    if (!orig || orig === "static") targetEl.style.position = "relative";
    targetEl.style.zIndex = "9010";
    return () => { targetEl.style.zIndex = ""; if (!orig || orig === "static") targetEl.style.position = ""; };
  }, [targetEl, useOverlay]);

  if (!step) return null;

  function handleNext() {
    if (step.isFinal) { onExit(); return; }
    if (stepIdx < steps.length - 1) setStepIdx(s => s + 1);
    else onExit();
  }

  const bubble = bubblePos && (
    <div key={`${phase}-${activeCapability}-${stepIdx}`} className="tutorial-bubble" style={{ ...bubblePos, zIndex: 9030 }}>
      {step.k2 && (
        <div className="tutorial-k2-flag">
          <span className="tutorial-k2-label">⚡ K2-Think V3</span>
          <span className="tutorial-k2-desc">{step.k2}</span>
        </div>
      )}
      <div className="tutorial-bubble-title">{step.title}</div>
      <div className="tutorial-bubble-body">{step.body}</div>
      <div className="tutorial-bubble-actions">
        {step.hasNext && <button className="tutorial-next-btn" onClick={handleNext}>Next →</button>}
        {step.allowInteract && !step.waitForNav && <button className="tutorial-next-btn" onClick={handleNext}>Next →</button>}
        {step.waitForNav && <span className="tutorial-hint">Click an example to continue</span>}
        {step.isFinal && <button className="tutorial-next-btn" onClick={onExit}>Finish tour</button>}
      </div>
    </div>
  );

  return (
    <>
      {useOverlay && (
        <div className="tutorial-overlay">
          {spotlightPos && <div className="tutorial-spotlight" style={spotlightPos} />}
        </div>
      )}
      {createPortal(bubble, document.body)}
      {createPortal(
        <button className="tutorial-exit-btn" style={{ zIndex: 9030 }} onClick={onExit}>Exit tour</button>,
        document.body
      )}
    </>
  );
}

// ── Entry point ───────────────────────────────────────────────────────────────

export default function Tutorial({ phase, stageIdx, stageKey, stageLabel, totalStages, activeCapability, onExit }) {
  if (phase === "generating") {
    return (
      <GeneratingTutorial
        stageIdx={stageIdx}
        stageKey={stageKey}
        stageLabel={stageLabel}
        totalStages={totalStages}
        onExit={onExit}
      />
    );
  }
  return <SteppedTutorial phase={phase} activeCapability={activeCapability} onExit={onExit} />;
}
