import { createServer } from "vite";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
process.env.NODE_ENV = "production";
const { default: React } = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { StaticRouter } = await import("react-router-dom/server.js");
const root = fileURLToPath(new URL("../", import.meta.url));
const server = await createServer({
  root,
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});
try {
  const { default: Home } = await server.ssrLoadModule("/src/pages/Home.tsx");
  const markup = renderToStaticMarkup(
    React.createElement(
      StaticRouter,
      { location: "/" },
      React.createElement(Home),
    ),
  );
  if (
    !markup.includes("<h1") ||
    !markup.includes("workflow-heading") ||
    !markup.includes("/product-previews/respiratory.webp")
  )
    throw Error("Homepage prerender is incomplete.");
  const path = new URL("../dist/index.html", import.meta.url);
  const html = await readFile(path, "utf8");
  if (!html.includes('<div id="root"></div>'))
    throw Error(
      "Unexpected app shell; refusing to publish an unverified prerender.",
    );
  // SPA deep links use the same S3 fallback. Clear marketing content before
  // paint on those routes; authentication and private endpoints are unchanged.
  const clearDeepLink =
    '<script>(function(){if(location.pathname!=="/"){var r=document.getElementById("root");r.replaceChildren();r.removeAttribute("data-prerendered");}})();</script>';
  await writeFile(
    path,
    html.replace(
      '<div id="root"></div>',
      `<div id="root" data-prerendered="homepage">${markup}</div>${clearDeepLink}`,
    ),
  );
  console.log(
    "Homepage prerendered: headings, grade coverage, workflow and FAQs are available without JavaScript.",
  );
} finally {
  await server.close();
}
