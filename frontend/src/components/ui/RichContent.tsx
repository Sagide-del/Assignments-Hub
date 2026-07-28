import DOMPurify from 'dompurify';
import 'katex/dist/katex.min.css';
import { resolveUploadUrl } from '../../api/uploads.api';

// Renders teacher-authored rich HTML (from the Rich Editor — see
// features/teacher/rich-editor/RichTextEditor.tsx) anywhere a question body
// needs to show formatting, KaTeX-rendered math/chemistry equations,
// embedded images, or a labeled diagram.
//
// SECURITY: `html` is untrusted (a teacher's browser produced it via Quill,
// which has had HTML-export XSS advisories — GHSA-v3m3-f69x-jf25). This
// component is the ONLY place that's allowed to dangerouslySetInnerHTML a
// question's contentHtml. It always runs DOMPurify first, restricted to the
// tags/attributes real question content actually needs (text formatting,
// images, tables, and KaTeX's rendered SVG/MathML output) — never render
// contentHtml anywhere else without going through this component.
const ALLOWED_TAGS = [
  // Text formatting
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'blockquote',
  'ul', 'ol', 'li', 'span', 'sub', 'sup', 'a', 'h1', 'h2', 'h3',
  // Tables (Quill table module output, if ever enabled)
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
  // Images / diagrams
  'img', 'figure', 'figcaption',
  // KaTeX's own rendered output (math + mhchem chemistry)
  'math', 'annotation', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub',
  'msubsup', 'mfrac', 'msqrt', 'mroot', 'mtable', 'mtr', 'mtd', 'mtext',
  'mspace', 'mstyle', 'mpadded', 'mphantom', 'menclose', 'mglyph',
];
const ALLOWED_ATTR = [
  'class', 'style', 'href', 'target', 'rel',
  'src', 'alt', 'width', 'height',
  // KaTeX / diagram-pin positioning
  'data-value', 'data-label', 'aria-hidden', 'xmlns', 'encoding',
];

export function sanitizeRichHtml(html: string): string {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    USE_PROFILES: { html: true, svg: true, mathMl: true },
    // Never allow inline event handlers or javascript:/data: URIs to sneak
    // through via an allowed attribute like `style` or `href`.
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });

  // Older questions may already contain backend-relative upload paths. Keep
  // the stored HTML portable and resolve those paths only when rendering.
  const template = document.createElement('template');
  template.innerHTML = sanitized;
  template.content.querySelectorAll<HTMLImageElement>('img[src]').forEach((image) => {
    const source = image.getAttribute('src');
    if (source) image.setAttribute('src', resolveUploadUrl(source));
  });
  return template.innerHTML;
}

export function RichContent({ html, className = '' }: { html: string; className?: string }) {
  return (
    <div
      className={`rich-content max-w-none min-w-0 overflow-x-auto break-words text-base leading-7 text-slate-700 [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-2xl [&_p]:mb-3 [&_table]:min-w-max [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(html) }}
    />
  );
}
