import { appShell } from "./static-pages.mjs";
import { generateRouting } from "./generate-routing.mjs";
import { createServer } from "vite";
import { readFile, writeFile, mkdir } from "node:fs/promises";
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
  const { default: NotFound } = await server.ssrLoadModule("/src/pages/404.tsx");
  const notFound = renderToStaticMarkup(React.createElement(NotFound));
  const path = new URL("../dist/index.html", import.meta.url);
  const html = await readFile(path, "utf8");
  if (!html.includes('<div id="root"></div>'))
    throw Error(
      "Unexpected app shell; refusing to publish an unverified prerender.",
    );
  await writeFile(new URL("../dist/app.html", import.meta.url), appShell(html, "/student"));
  for (const route of ["login", "register"]) {
    await mkdir(new URL(`../dist/${route}/`, import.meta.url), { recursive: true });
    await writeFile(new URL(`../dist/${route}/index.html`, import.meta.url), appShell(html, `/${route}`));
  }
  await writeFile(new URL("../dist/404.html", import.meta.url), appShell(html, "/404", { notFound: true, body: notFound }));
  await writeFile(path, html.replace('<div id="root"></div>', `<div id="root" data-prerendered="homepage">${markup}</div>`));
  await generateRouting();
  console.log(
    "Static pages generated: homepage, separate noindex account shells, app shell and branded 404.",
  );
} finally {
  await server.close();
}
