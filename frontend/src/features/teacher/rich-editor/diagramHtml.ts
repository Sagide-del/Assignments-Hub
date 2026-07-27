export interface DiagramLabel {
  x: number; // percent, 0-100
  y: number; // percent, 0-100
  label: string;
}

export interface DiagramValue {
  imageUrl: string;
  labels: DiagramLabel[];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Turns a labeled diagram into a static HTML snippet, appended to a
// question's contentHtml at submit time (see CreateAssignmentRich.tsx).
// Deliberately built OUTSIDE Quill — Quill's HTML parser only understands
// its own registered formats and would strip the absolutely-positioned pin
// markup down to plain text if it ever passed through `value`/onChange.
// This snippet only needs to survive RichContent.tsx's DOMPurify allowlist
// (see components/ui/RichContent.tsx — img/figure/figcaption/span + style
// are all allowed there) and render as static, read-only content for
// students; there is no interactive/gradable drop-zone behavior yet.
export function buildDiagramHtml(diagram: DiagramValue): string {
  if (!diagram.imageUrl) return '';

  const pins = diagram.labels
    .map(
      (l, i) =>
        `<span style="position:absolute;left:${l.x}%;top:${l.y}%;transform:translate(-50%,-50%);width:24px;height:24px;border-radius:9999px;background:#101820;color:#B5E61D;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid #ffffff;box-shadow:0 2px 6px rgba(16,24,32,0.35);">${i + 1}</span>`,
    )
    .join('');

  const legend = diagram.labels
    .map((l, i) => `<div>${i + 1}. ${escapeHtml(l.label)}</div>`)
    .join('');

  return `<figure style="position:relative;max-width:520px;margin:12px 0;">
<span style="position:relative;display:block;">
<img src="${diagram.imageUrl}" alt="Labeled diagram" style="width:100%;height:auto;border-radius:16px;display:block;" />
${pins}
</span>
<figcaption style="margin-top:8px;font-size:13px;color:#475569;">${legend}</figcaption>
</figure>`;
}
