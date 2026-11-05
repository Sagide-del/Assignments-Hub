import { readFile, writeFile } from "node:fs/promises";
const data = JSON.parse(
  await readFile(
    new URL("../src/content/homepage.json", import.meta.url),
    "utf8",
  ),
);
const file = new URL("../index.html", import.meta.url);
const escape = (s) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
const graph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": "https://assignmenthub.co.ke/#application",
      name: "Assignment Hub",
      url: "https://assignmenthub.co.ke/",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web browser",
      countryOfOrigin: { "@type": "Country", name: "Kenya", identifier: "KE" },
      description: data.description,
      publisher: { "@id": "https://assignmenthub.co.ke/#organisation" },
    },
    {
      "@type": "EducationalOrganization",
      "@id": "https://assignmenthub.co.ke/#organisation",
      name: "Assignment Hub Kenya",
      alternateName: "Assignment Hub CBC",
      url: "https://assignmenthub.co.ke/",
      logo: "https://assignmenthub.co.ke/logo.png",
      description:
        "CBC/CBE learning support for Kenyan learners in Grades 1–12: topic-led assignments, independent mock practice, SBA planning and interactive STEM labs.",
      address: {
        "@type": "PostalAddress",
        postOfficeBoxNumber: "14069",
        postalCode: "00100",
        addressLocality: "Nairobi",
        addressCountry: "KE",
      },
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+254748519923",
        contactType: "customer support",
        areaServed: "KE",
      },
      sameAs: [
        "https://www.facebook.com/profile.php?id=61596009732397",
        "https://www.linkedin.com/company/assignment-hub-kenya",
      ],
    },
    {
      "@type": "FAQPage",
      "@id": "https://assignmenthub.co.ke/#faq",
      mainEntity: data.faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
  ],
};
let html = await readFile(file, "utf8");
html = html
  .replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(data.title)}</title>`)
  .replace(
    /<meta name="description" content="[^"]*"\s*\/>/,
    `<meta name="description" content="${escape(data.description)}" />`,
  );
for (const [key, value] of [
  ["og:title", data.title],
  ["og:description", data.description],
  ["twitter:title", data.title],
  ["twitter:description", data.description],
  ["og:image", "https://assignmenthub.co.ke/product-previews/respiratory.webp"],
  [
    "twitter:image",
    "https://assignmenthub.co.ke/product-previews/respiratory.webp",
  ],
])
  html = html.replace(
    new RegExp(`<meta (?:property|name)="${key}" content="[^"]*"\\s*/>`),
    `<meta ${key.startsWith("og:") ? "property" : "name"}="${key}" content="${escape(value)}" />`,
  );
html = html.replace(
  /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
  `<script type="application/ld+json">${JSON.stringify(graph).replaceAll("<", "\\u003c")}</script>`,
);
if (!html.includes('property="og:image:alt"'))
  html = html.replace(
    '<meta property="og:type"',
    '<meta property="og:image:alt" content="Assignment Hub 3D respiratory lab with lung anatomy, breathing rate and tidal volume controls" />\n    <meta property="og:image:width" content="1440" />\n    <meta property="og:image:height" content="1767" />\n    <meta property="og:type"',
  );
await writeFile(file, html);
console.log("Homepage metadata and visible FAQ schema synchronized.");
