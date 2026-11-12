// Preserve initial-HTML SEO while keeping homepage FAQs off other SPA views.
const initialSchema =
  typeof document === "undefined"
    ? ""
    : (document.querySelector('script[type="application/ld+json"], #homepage-schema-template')
        ?.textContent ?? "");
export function showHomepageFaq(show: boolean) {
  let script = document.querySelector('script[type="application/ld+json"]');
  if (!initialSchema) return;
  if (!script && show) {
    script = document.createElement("script");
    script.setAttribute("type", "application/ld+json");
    document.head.append(script);
  }
  if (!script) return;
  try {
    const schema = JSON.parse(initialSchema);
    if (!Array.isArray(schema["@graph"])) return;
    if (!show)
      schema["@graph"] = schema["@graph"].filter(
        (node: { "@type"?: string }) => node["@type"] !== "FAQPage",
      );
    script.textContent = JSON.stringify(schema).replace(/</g, "\\u003c");
  } catch {
    /* A missing optional schema must never prevent the app from opening. */
  }
}
