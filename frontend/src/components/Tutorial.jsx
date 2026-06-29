import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

const IDLE_STEPS = [
  {
    target: ".brand",
    position: "right",
    title: "Welcome to SwiftCanvas",
    body: "Describe any interface in plain language and K2-Think V3 will generate a live, interactive React prototype in seconds — no code required.",
    k2: "K2-Think V3 plans your design requirements, lays out component structure, and generates a full UI schema through chain-of-thought reasoning.",
    hasNext: true,
  },
  {
    target: ".k2-capability-grid",
    position: "top",
    title: "K2-Think V3 capabilities",
    body: "Generative UI is one of K2-Think V3's capabilities. The same model natively supports tool calling, multi-step planning & orchestration, and file generation (PPT, DOCX, PDF).",
    k2: "Each capability card is a K2-Think V3 API feature — the same reasoning engine powers all of them.",
    hasNext: true,
  },
  {
    target: ".example-chips",
    position: "right",
    title: "Try an example",
    body: "Click any example to generate a prototype instantly. You'll see K2-Think V3's reasoning stream live in each build stage.",
    hasNext: false,
    allowInteract: true,
    waitForNav: true,
  },
];

// One entry per BUILD_STAGE — explains what's actually happening at each stage
const STAGE_COMMENTARY = [
  {
    title: "Analyzing your design brief",
    body: "K2-Think V3 is parsing your prompt — identifying entities, user roles, and data relationships to understand exactly what this interface needs to do.",
    k2: "This is the chain-of-thought phase. The model reasons about your intent before committing to any component decisions.",
  },
  {
    title: "Designing component layout",
    body: "K2-Think V3 is choosing the page structure — dashboard, kanban, form, or split-pane — and deciding which section types (charts, tables, KPIs) fit this domain best.",
    k2: "The model weighs layout options against your prompt's implied data model. It considers readability, information density, and domain conventions.",
  },
  {
    title: "Creating sample data",
    body: "K2-Think V3 is generating realistic, domain-specific values — not generic placeholders. Column names, row data, chart figures, and KPI numbers are all inferred from context.",
    k2: "Realistic data matters for demos. The model infers domain-appropriate values (e.g. actual lab equipment names, plausible booking status labels).",
  },
  {
    title: "Streaming the component tree",
    body: "K2-Think V3 is emitting the full JSON component tree token-by-token. Every section, prop, and data row is being written in real time — watch the token stream in the preview below.",
    k2: "The complete prototype spec is a single structured JSON object. Streaming lets you watch the model's output as it happens — nothing is buffered.",
  },
  {
    title: "Finalizing & rendering",
    body: "SwiftCanvas is parsing the completed JSON, validating the component structure, and handing it off to the React renderer. Your prototype will appear any moment.",
    k2: "After streaming ends, SwiftCanvas validates the tree and applies structure repairs if needed — then the React renderer fires and the prototype goes live.",
  },
];

const READY_STEPS = [
  {
    target: ".prototype-canvas",
    position: "left",
    title: "Your live prototype",
    body: "Fully interactive — sort the table, fill out forms, drag kanban cards, click chart segments. This is real React running in the browser, not a screenshot.",
    k2: "K2-Think V3 generated the entire component tree — layout, section types, sample data, and structure — in one reasoning pass from your plain-language prompt.",
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

function getBubbleStyle(targetEl, position) {
  if (!targetEl) return { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  const rect = targetEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const gap = 14;
  const bubbleW = Math.min(340, vw - gap * 2);
  const bubbleH = 360;

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

// ── Generating phase — live bubble that tracks build stages ───────────────────

function GeneratingTutorial({ stageIdx, onExit }) {
  const total   = STAGE_COMMENTARY.length;
  const idx     = Math.min(stageIdx ?? 0, total - 1);
  const comment = STAGE_COMMENTARY[idx];

  const [targetEl,     setTargetEl]     = useState(null);
  const [bubblePos,    setBubblePos]    = useState(null);
  const [spotlightPos, setSpotlightPos] = useState(null);

  const updatePos = useCallback(() => {
    const el = document.querySelector(".building-stages") || document.querySelector(".building-state");
    if (!el) { setBubblePos(null); setSpotlightPos(null); return; }
    if (el !== targetEl) setTargetEl(el);
    setBubblePos(getBubbleStyle(el, "right"));
    setSpotlightPos(getSpotlightStyle(el));
  }, [targetEl]);

  useEffect(() => {
    updatePos();
    const id = setInterval(updatePos, 600);
    return () => clearInterval(id);
  }, [updatePos]);

  useEffect(() => {
    if (!targetEl) return;
    let debounce;
    const handler = () => { clearTimeout(debounce); debounce = setTimeout(updatePos, 80); };
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => { window.removeEventListener("scroll", handler, true); window.removeEventListener("resize", handler); };
  }, [targetEl, updatePos]);

  useEffect(() => {
    if (!targetEl) return;
    const orig = targetEl.style.position;
    if (!orig || orig === "static") targetEl.style.position = "relative";
    targetEl.style.zIndex = "9010";
    return () => {
      targetEl.style.zIndex = "";
      if (!orig || orig === "static") targetEl.style.position = "";
    };
  }, [targetEl]);

  const bubble = bubblePos && (
    <div key={idx} className="tutorial-bubble" style={{ ...bubblePos, zIndex: 9030 }}>
      <div className="tutorial-k2-flag">
        <span className="tutorial-k2-label">⚡ K2-Think V3 · Stage {idx + 1} of {total}</span>
        <span className="tutorial-k2-desc">{comment.k2}</span>
      </div>
      <div className="tutorial-bubble-title">{comment.title}</div>
      <div className="tutorial-bubble-body">{comment.body}</div>
      <div className="tutorial-progress-row">
        {STAGE_COMMENTARY.map((_, i) => (
          <span
            key={i}
            className={`tutorial-progress-dot ${i === idx ? "active" : i < idx ? "done" : ""}`}
          />
        ))}
        <span className="tutorial-progress-label">Generating…</span>
      </div>
    </div>
  );

  return (
    <>
      <div className="tutorial-overlay">
        {spotlightPos && <div className="tutorial-spotlight" style={spotlightPos} />}
      </div>
      {createPortal(bubble, document.body)}
      {createPortal(
        <button className="tutorial-exit-btn" style={{ zIndex: 9030 }} onClick={onExit}>✕ Exit tour</button>,
        document.body
      )}
    </>
  );
}

// ── Idle / Ready phases — step-based ─────────────────────────────────────────

function SteppedTutorial({ phase, onExit }) {
  const [stepIdx,      setStepIdx]      = useState(0);
  const [targetEl,     setTargetEl]     = useState(null);
  const [bubblePos,    setBubblePos]    = useState(null);
  const [spotlightPos, setSpotlightPos] = useState(null);
  const scrollTimerRef = useRef(null);

  const steps = phase === "idle" ? IDLE_STEPS : phase === "ready" ? READY_STEPS : [];
  const step  = steps[stepIdx] || null;

  const updatePos = useCallback(() => {
    if (!step || !targetEl) { setBubblePos(null); setSpotlightPos(null); return; }
    setBubblePos(getBubbleStyle(targetEl, step.position));
    setSpotlightPos(getSpotlightStyle(targetEl));
  }, [step, targetEl]);

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
    setBubblePos(null);
    setSpotlightPos(null);
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
    let debounce;
    const handler = () => { clearTimeout(debounce); debounce = setTimeout(updatePos, 80); };
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
      clearTimeout(debounce);
    };
  }, [targetEl, updatePos]);

  useEffect(() => { setStepIdx(0); }, [phase]);

  useEffect(() => {
    if (!targetEl) return;
    const orig = targetEl.style.position;
    if (!orig || orig === "static") targetEl.style.position = "relative";
    targetEl.style.zIndex = "9010";
    return () => {
      targetEl.style.zIndex = "";
      if (!orig || orig === "static") targetEl.style.position = "";
    };
  }, [targetEl]);

  if (!step) return null;

  function handleNext() {
    if (step.isFinal) { onExit(); return; }
    if (stepIdx < steps.length - 1) setStepIdx(s => s + 1);
    else onExit();
  }

  const bubble = bubblePos && (
    <div key={`${phase}-${stepIdx}`} className="tutorial-bubble" style={{ ...bubblePos, zIndex: 9030 }}>
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
        {step.isFinal && <button className="tutorial-next-btn" onClick={onExit}>Finish tour ✓</button>}
      </div>
    </div>
  );

  return (
    <>
      <div className="tutorial-overlay">
        {spotlightPos && <div className="tutorial-spotlight" style={spotlightPos} />}
      </div>
      {createPortal(bubble, document.body)}
      {createPortal(
        <button className="tutorial-exit-btn" style={{ zIndex: 9030 }} onClick={onExit}>✕ Exit tour</button>,
        document.body
      )}
    </>
  );
}

// ── Entry point ───────────────────────────────────────────────────────────────

export default function Tutorial({ phase, stageIdx, onExit }) {
  if (phase === "generating") {
    return <GeneratingTutorial stageIdx={stageIdx} onExit={onExit} />;
  }
  return <SteppedTutorial phase={phase} onExit={onExit} />;
}
