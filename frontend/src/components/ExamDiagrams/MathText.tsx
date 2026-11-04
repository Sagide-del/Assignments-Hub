import katex from "katex";
import { RichContent } from "../ui/RichContent";
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function MathText({ text }: { text: string }) {
  const segments = text.split(
    /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+?\$)/g,
  );
  const html = segments
    .map((s) => {
      const block = s.startsWith("$$") || s.startsWith("\\[");
      const math =
        block || s.startsWith("\\(") || (s.startsWith("$") && s.endsWith("$"));
      if (!math) return escape(s).replace(/\n/g, "<br>");
      const raw = s.slice(
        block || s.startsWith("\\(") ? 2 : 1,
        block || s.startsWith("\\(") ? -2 : -1,
      );
      try {
        return katex.renderToString(raw, {
          displayMode: block,
          throwOnError: false,
          trust: false,
          strict: "ignore",
          maxExpand: 100,
          maxSize: 20,
        });
      } catch {
        return escape(s);
      }
    })
    .join("");
  return (
    <RichContent
      html={html}
      className="!text-inherit !leading-inherit [&_p]:!mb-0"
    />
  );
}
