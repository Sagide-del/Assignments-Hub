import home from "../content/homepage.json";

const origin = "https://assignmenthub.co.ke";
export function routeMetadata(path: string, notFound = false) {
  const pathname = path.replace(/\/+$/, "") || "/";
  if (notFound) return { title: "Page Not Found | Assignment Hub Kenya", description: "Find your way back to Assignment Hub or browse available free revision.", robots: "noindex, nofollow", canonical: null };
  if (pathname === "/") return { title: home.title, description: home.description, robots: "index, follow, max-image-preview:large", canonical: `${origin}/` };
  const register = /^\/register(?:\/|$)/.test(pathname);
  const login = /^\/login(?:\/|$)/.test(pathname) || /^\/school\/[^/]+\/login$/.test(pathname) || pathname === "/platform-console";
  return {
    title: register ? "Create Account | Assignment Hub Kenya" : login ? "Login | Assignment Hub Kenya" : "Workspace | Assignment Hub Kenya",
    description: register ? "Create your Assignment Hub learner account." : login ? "Sign in to your school, independent learner or staff account." : "Your Assignment Hub learning workspace.",
    robots: "noindex, nofollow",
    canonical: register ? `${origin}/register` : login ? `${origin}/login` : null,
  };
}

export function applyRouteMetadata(path: string, notFound = false) {
  const data = routeMetadata(path, notFound);
  document.title = data.title;
  for (const [key, value] of Object.entries({ robots: data.robots, description: data.description, "og:title": data.title, "og:description": data.description, "twitter:title": data.title, "twitter:description": data.description })) {
    const attr = key.startsWith("og:") ? "property" : "name";
    const node = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`) ?? document.createElement("meta");
    node.setAttribute(attr, key);
    node.content = value;
    if (!node.parentNode) document.head.append(node);
  }
  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (data.canonical) {
    canonical ??= document.createElement("link");
    canonical.rel = "canonical";
    canonical.href = data.canonical;
    if (!canonical.parentNode) document.head.append(canonical);
  } else canonical?.remove();
  const ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
  if (ogUrl) ogUrl.content = data.canonical ?? origin + path;
}
