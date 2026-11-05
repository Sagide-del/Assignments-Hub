// Preserve initial-HTML SEO while keeping homepage FAQs off other SPA views.
const initialSchema =
  typeof document === "undefined"
    ? ""
    : (document.querySelector('script[type="application/ld+json"]')
        ?.textContent ?? "");
export function showHomepageFaq(show: boolean) {
  const script = document.querySelector('script[type="application/ld+json"]');
  if (!script || !initialSchema) return;
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
