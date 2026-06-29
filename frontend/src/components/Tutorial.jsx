import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

// ── Idle steps (no overlay; all 6 capability cards stay fully visible) ────────

const IDLE_STEPS = [
  {
    target: ".brand",
    position: "right",
    title: "Welcome to InfiniteCanvas",
    body: "Describe any interface in plain language and K2-Think V3 will generate a live, interactive React prototype in seconds. No code required.",
    k2: "K2-Think V3 reasons through your design intent, selects the right component structure, and emits a full UI schema in one pass — all through chain-of-thought.",
    hasNext: true,
  },
  {
    target: ".k2-capability-grid",
    position: "top",
    title: "Six distinct K2-Think V3 demos",
    body: "Each card generates a completely different prototype: a schema assembler, a live reasoning trace, a tool execution console, a multi-agent workboard, a report that exports to real files, and a live token stream monitor.",
    k2: "Every demo uses the same K2-Think V3 API call. The capability being demonstrated changes the prompt structure and the component layout that K2-Think selects — not the model.",
    hasNext: true,
  },
  {
    target: ".example-chips",
    position: "right",
    title: "Or describe your own interface",
    body: "Click any example chip or type your own description. K2-Think V3 will reason through it and generate a live prototype. Watch each build stage as it happens.",
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
    title: "Schema Inspector — a meta-demo",
    body: "The kanban shows the full component library K2-Think V3 draws from, organised by category. The table below it shows the active schema: each section, its type, span, and render status as it was assembled.",
    k2: "This is a self-referential demo. K2-Think V3 generated a UI about the process of generating UIs — using the same component library and schema system it just described in the prototype.",
    hasNext: true,
  },
  {
    target: ".btn-export",
    position: "bottom",
    title: "Export the schema",
    body: "Export the JSON component tree or working React JSX. The JSX is wired and importable — drop it into any React project and it runs immediately.",
    hasNext: true,
  },
  {
    target: ".prompt-area",
    position: "right",
    title: "Iterate in plain language",
    body: "Try: 'add a token usage chart per component type' or 'replace the schema table with a live diff view showing before and after'. K2-Think V3 will update the prototype and keep everything else intact.",
    k2: "K2-Think V3 receives the full current component tree as context, reasons about your change, and returns an updated tree that preserves all unchanged sections.",
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
      title: "Reasoning Trace Viewer",
      body: "The timeline is the main event: 10 labelled reasoning steps K2-Think V3 worked through to answer whether MBZUAI should launch a robotics division. Each step shows its type (Observation, Hypothesis, Evidence, Synthesis), confidence score, and token count. The bar chart shows how the reasoning budget was distributed across steps.",
      k2: "K2-Think V3 used this same chain-of-thought process to generate the prototype itself. The reasoning you watched in the build stages is structurally identical to what this prototype displays as data.",
      hasNext: true,
    },
    {
      target: ".btn-export",
      position: "bottom",
      title: "Export the trace viewer",
      body: "Export as JSON or React JSX. The timeline, step analysis table, and token depth chart are all wired to the data K2-Think V3 produced. Swap in a different reasoning session and everything updates.",
      hasNext: true,
    },
    {
      target: ".prompt-area",
      position: "right",
      title: "Extend the analysis",
      body: "Try: 'change the question to whether MBZUAI should launch a healthcare AI division' or 'add a branch comparison panel showing Hypothesis A vs B vs C confidence scores side by side'.",
      k2: "Every refinement triggers a full reasoning pass. K2-Think V3 re-reasons the new question and updates the trace, confidence scores, and token distribution accordingly.",
      hasNext: false,
      isFinal: true,
    },
  ],

  "tool-calling": [
    {
      target: ".prototype-canvas",
      position: "left",
      title: "Tool Execution Console",
      body: "The timeline shows the exact sequence of tool calls a K2-Think V3 agent made to book a Dubai trip: get_date_today, search_flights with real airline options and prices, get_weather, search_hotels, search_activities, then build_itinerary. Each call shows its function signature, arguments, and return value. The kanban on the right shows the tool queue split into Available, Executing, and Completed.",
      k2: "This is what tool calling looks like at the API level: the model decides which tool to call next, constructs the argument object, receives the result, and decides the next step. K2-Think V3 generated this trace as a realistic demonstration of that loop.",
      hasNext: true,
    },
    {
      target: ".btn-export",
      position: "bottom",
      title: "Export the execution console",
      body: "Export as JSON or React JSX. Replace the static tool call data with a real agent session log and the timeline, call table, and kanban all update live.",
      hasNext: true,
    },
    {
      target: ".prompt-area",
      position: "right",
      title: "Change the agent task",
      body: "Try: 'change the destination to Tokyo and add a currency_convert tool call' or 'add a compare_prices step that evaluates the three flight options before selecting the cheapest'.",
      k2: "K2-Think V3 regenerates the entire tool execution trace for the new task, producing new function calls, arguments, and realistic return values that fit the changed scenario.",
      hasNext: false,
      isFinal: true,
    },
  ],

  "planning": [
    {
      target: ".prototype-canvas",
      position: "left",
      title: "Agent Orchestration Console",
      body: "The kanban columns are the agents themselves: Research, Analysis, Writing, and QA. Task cards flow between them as dependencies resolve. The shared goal is a 40-page EV battery investment report. The timeline below shows the orchestration plan K2-Think V3 designed — how it decomposed the task, sequenced the agents, and scheduled handoffs.",
      k2: "This is how K2-Think V3 approaches long-horizon tasks: decompose into sub-tasks, assign each to a specialist role, sequence by dependency, and execute in parallel where possible. The prototype makes that planning structure visible.",
      hasNext: true,
    },
    {
      target: ".btn-export",
      position: "bottom",
      title: "Export the orchestration UI",
      body: "Export as JSON or React JSX and connect to a real workflow engine. The agent columns, task cards, dependency table, and timeline all render from the component tree K2-Think V3 produced.",
      hasNext: true,
    },
    {
      target: ".prompt-area",
      position: "right",
      title: "Change the task or the agents",
      body: "Try: 'add a fifth agent: Data Visualisation Agent responsible for all charts and figures' or 'change the report topic to lithium-ion supply chain risk and update the task breakdown accordingly'.",
      k2: "K2-Think V3 replans the entire orchestration for the new task: new sub-tasks, new agent assignments, new dependencies. The kanban, timeline, and task table all update to reflect the revised plan.",
      hasNext: false,
      isFinal: true,
    },
  ],

  "file-generation": [
    {
      target: ".file-export",
      position: "left",
      title: "Try it now — download a real file",
      body: "Click PDF, DOCX, or PPTX to download an actual file right now. The content is the AI Foundation Model Benchmark Report 2026: five sections covering K2-Think V3's reasoning scores, code generation results, instruction following, and deployment cost data. All written by K2-Think V3, rendered in the browser by jsPDF, docx, and pptxgenjs.",
      k2: "K2-Think V3 authored the complete document: every section heading, every benchmark figure, every bullet point. The export libraries handle formatting. Nothing was hardcoded — it all came from a single prompt.",
      hasNext: true,
    },
    {
      target: ".btn-export",
      position: "bottom",
      title: "Export the studio UI",
      body: "This button exports the report studio interface itself as JSON or JSX — the configure form, the preview panel, and the download buttons. Swap in your own content schema and it generates your documents.",
      hasNext: true,
    },
    {
      target: ".prompt-area",
      position: "right",
      title: "Update the report",
      body: "Try: 'add a sixth section on multimodal benchmark results' or 'add an appendix section with raw benchmark tables'. The new section will appear in the preview and in every downloaded file.",
      k2: "Each refinement updates the file_export content object in the component tree. New sections you add are embedded in the JSON schema and rendered into PDF, DOCX, and PPTX on the next download.",
      hasNext: false,
      isFinal: true,
    },
  ],

  "streaming": [
    {
      target: ".prototype-canvas",
      position: "left",
      title: "K2-Think V3 Stream Monitor",
      body: "The active streams table shows three real requests mid-generation: an earnings call summary, a Python function, and a financial analysis. Each row shows the prompt snippet, how many tokens have been emitted so far, and elapsed time. The throughput line chart shows 60 seconds of token delivery rate fluctuating across the gateway. The completed streams table shows time-to-first-token and total cost per request.",
      k2: "This prototype was itself delivered to your browser as a token stream. K2-Think V3 emitted the JSON schema token-by-token over SSE. The monitor you're looking at is a visualisation of that exact process at production scale.",
      hasNext: true,
    },
    {
      target: ".btn-export",
      position: "bottom",
      title: "Export the monitor",
      body: "Export as JSON or React JSX. Connect the active streams table to a real SSE endpoint and the throughput chart to a metrics store and everything updates live.",
      hasNext: true,
    },
    {
      target: ".prompt-area",
      position: "right",
      title: "Add monitoring panels",
      body: "Try: 'add a P95 and P99 latency percentile chart' or 'add a stream error log panel showing timed-out and failed requests with error codes'.",
      k2: "K2-Think V3 streams its own response token-by-token as it generates the updated prototype. Every refinement you make is itself a live demonstration of the streaming capability this monitor describes.",
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
