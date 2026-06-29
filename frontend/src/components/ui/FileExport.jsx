import { useState } from "react";

const FORMAT_META = {
  pdf:  { label: "PDF",       ext: "pdf",  icon: "📄", color: "#e53e3e", bg: "#fff5f5", border: "#feb2b2" },
  docx: { label: "Word DOCX", ext: "docx", icon: "📝", color: "#2b6cb0", bg: "#ebf8ff", border: "#90cdf4" },
  pptx: { label: "PowerPoint PPTX", ext: "pptx", icon: "📊", color: "#744210", bg: "#fffaf0", border: "#f6ad55" },
};

function slug(str) {
  return (str || "document").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
}

async function generatePDF(content) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, margin = 20, maxW = W - margin * 2;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(31, 41, 55);
  doc.text(content.title || "Document", margin, 30, { maxWidth: maxW });

  // Author / date line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(107, 114, 128);
  const meta = [content.author, content.date].filter(Boolean).join("  ·  ");
  if (meta) doc.text(meta, margin, 40);

  // Divider
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.4);
  doc.line(margin, 45, W - margin, 45);

  // Description
  let y = 55;
  if (content.description) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(75, 85, 99);
    const descLines = doc.splitTextToSize(content.description, maxW);
    doc.text(descLines, margin, y);
    y += descLines.length * 6 + 8;
  }

  // Sections
  for (const section of (content.sections || [])) {
    if (y > 250) { doc.addPage(); y = 25; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text(section.heading || "", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(75, 85, 99);
    for (const bullet of (section.bullets || [])) {
      if (y > 260) { doc.addPage(); y = 25; }
      const lines = doc.splitTextToSize(`• ${bullet}`, maxW - 5);
      doc.text(lines, margin + 3, y);
      y += lines.length * 5.5 + 1;
    }
    y += 6;
  }

  doc.save(`${slug(content.title)}.pdf`);
}

async function generateDOCX(content) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = await import("docx");

  const children = [];

  // Title
  children.push(new Paragraph({
    children: [new TextRun({ text: content.title || "Document", bold: true, size: 52, color: "1f2937" })],
    heading: HeadingLevel.TITLE,
  }));

  if (content.author || content.date) {
    children.push(new Paragraph({
      children: [new TextRun({ text: [content.author, content.date].filter(Boolean).join("  ·  "), size: 22, color: "6b7280" })],
    }));
  }

  children.push(new Paragraph({ text: "" }));

  if (content.description) {
    children.push(new Paragraph({
      children: [new TextRun({ text: content.description, size: 24, color: "374151" })],
    }));
    children.push(new Paragraph({ text: "" }));
  }

  for (const section of (content.sections || [])) {
    children.push(new Paragraph({
      children: [new TextRun({ text: section.heading || "", bold: true, size: 28, color: "1f2937" })],
      heading: HeadingLevel.HEADING_2,
    }));
    for (const bullet of (section.bullets || [])) {
      children.push(new Paragraph({
        children: [new TextRun({ text: `• ${bullet}`, size: 22, color: "4b5563" })],
        indent: { left: 360 },
      }));
    }
    children.push(new Paragraph({ text: "" }));
  }

  const doc = new Document({
    sections: [{ children }],
    creator: "InfiniteCanvas · K2-Think V3",
    title: content.title || "Document",
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(content.title)}.docx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function generatePPTX(content) {
  const pptxgen = (await import("pptxgenjs")).default;
  const prs = new pptxgen();
  prs.layout = "LAYOUT_WIDE";
  prs.author = "InfiniteCanvas · K2-Think V3";
  prs.title = content.title || "Presentation";

  const ACCENT = "4f46e5";
  const DARK   = "1e293b";
  const MUTED  = "64748b";
  const WHITE  = "ffffff";

  // Title slide
  const titleSlide = prs.addSlide();
  titleSlide.background = { color: ACCENT };
  titleSlide.addText(content.title || "Presentation", {
    x: 0.8, y: 1.8, w: 11.4, h: 1.4,
    fontSize: 40, bold: true, color: WHITE, fontFace: "Arial",
  });
  if (content.description) {
    titleSlide.addText(content.description, {
      x: 0.8, y: 3.4, w: 10, h: 0.9,
      fontSize: 18, color: "c7d2fe", fontFace: "Arial",
    });
  }
  const meta = [content.author, content.date].filter(Boolean).join("  ·  ");
  if (meta) {
    titleSlide.addText(meta, {
      x: 0.8, y: 4.6, w: 10, h: 0.5,
      fontSize: 13, color: "a5b4fc", fontFace: "Arial",
    });
  }

  // One slide per section
  for (const section of (content.sections || [])) {
    const slide = prs.addSlide();
    slide.background = { color: WHITE };

    // Accent bar
    slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: ACCENT } });

    slide.addText(section.heading || "", {
      x: 0.6, y: 0.4, w: 12, h: 0.8,
      fontSize: 26, bold: true, color: DARK, fontFace: "Arial",
    });

    const bullets = (section.bullets || []);
    bullets.forEach((bullet, idx) => {
      slide.addText(`• ${bullet}`, {
        x: 0.8, y: 1.4 + idx * 0.65, w: 11.5, h: 0.6,
        fontSize: 15, color: "374151", fontFace: "Arial",
        breakLine: false,
      });
    });

    // Footer
    slide.addText(content.title || "", {
      x: 0.3, y: 7.0, w: 12.7, h: 0.35,
      fontSize: 9, color: "9ca3af", fontFace: "Arial",
    });
  }

  // Summary slide
  const lastSlide = prs.addSlide();
  lastSlide.background = { color: "f8fafc" };
  lastSlide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: ACCENT } });
  lastSlide.addText("Thank You", {
    x: 1, y: 2.5, w: 11, h: 1.2,
    fontSize: 42, bold: true, color: ACCENT, fontFace: "Arial", align: "center",
  });
  lastSlide.addText("Generated by InfiniteCanvas · K2-Think V3", {
    x: 1, y: 4, w: 11, h: 0.5,
    fontSize: 13, color: MUTED, fontFace: "Arial", align: "center",
  });

  await prs.writeFile({ fileName: `${slug(content.title)}.pptx` });
}

const GENERATORS = { pdf: generatePDF, docx: generateDOCX, pptx: generatePPTX };

export default function FileExport({ title, description, formats = ["pdf", "docx", "pptx"], content = {}, templates = [] }) {
  const [generating, setGenerating] = useState(null);
  const [done,       setDone]       = useState({});
  const [error,      setError]      = useState({});

  const effectiveContent = {
    title: content.title || title || "Document",
    description: content.description || description || "",
    author: content.author || "",
    date: content.date || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    sections: content.sections || [],
  };

  async function handleGenerate(fmt) {
    setGenerating(fmt);
    setError(prev => ({ ...prev, [fmt]: null }));
    try {
      await GENERATORS[fmt](effectiveContent);
      setDone(prev => ({ ...prev, [fmt]: true }));
    } catch (e) {
      console.error(`[FileExport] ${fmt} failed:`, e);
      setError(prev => ({ ...prev, [fmt]: e.message || "Generation failed" }));
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div className="file-export">
      {/* Document preview */}
      <div className="fe-preview">
        <div className="fe-preview-header">
          <div className="fe-preview-icon">📄</div>
          <div>
            <div className="fe-preview-title">{effectiveContent.title}</div>
            {effectiveContent.description && (
              <div className="fe-preview-desc">{effectiveContent.description}</div>
            )}
            {(effectiveContent.author || effectiveContent.date) && (
              <div className="fe-preview-meta">
                {[effectiveContent.author, effectiveContent.date].filter(Boolean).join("  ·  ")}
              </div>
            )}
          </div>
        </div>

        {effectiveContent.sections.length > 0 && (
          <div className="fe-sections">
            {effectiveContent.sections.map((s, i) => (
              <div key={i} className="fe-section">
                <div className="fe-section-heading">{s.heading}</div>
                <ul className="fe-section-bullets">
                  {(s.bullets || []).map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Format download cards */}
      <div className="fe-formats">
        <div className="fe-formats-label">Export as</div>
        <div className="fe-format-cards">
          {formats.map(fmt => {
            const m = FORMAT_META[fmt];
            if (!m) return null;
            const isGenerating = generating === fmt;
            const isDone = done[fmt];
            const hasError = error[fmt];
            return (
              <button
                key={fmt}
                className={`fe-format-card${isDone ? " done" : ""}${hasError ? " has-error" : ""}`}
                style={{ "--fe-color": m.color, "--fe-bg": m.bg, "--fe-border": m.border }}
                onClick={() => handleGenerate(fmt)}
                disabled={!!generating}
              >
                <span className="fe-fmt-icon">{isGenerating ? "⏳" : isDone ? "✅" : m.icon}</span>
                <span className="fe-fmt-label">{m.label}</span>
                <span className="fe-fmt-action">
                  {isGenerating ? "Generating…" : isDone ? "Downloaded" : `Download .${m.ext}`}
                </span>
                {hasError && <span className="fe-fmt-error">{hasError}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Templates row (optional) */}
      {templates.length > 0 && (
        <div className="fe-templates">
          <div className="fe-formats-label">Templates</div>
          <div className="fe-template-chips">
            {templates.map((t, i) => (
              <span key={i} className="fe-template-chip">{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
