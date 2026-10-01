// Regenerates the search-engine pages from the content in index.html:
//   views/<id>.html  - one plain-HTML page per view (readable without JavaScript)
//   sitemap.xml, robots.txt
//   the <div id="seo-index"> block inside index.html
// Run after editing any view content:  node tools/build-seo.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SITE = "https://pocustips.netlify.app/";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = join(ROOT, "index.html");
let index = readFileSync(indexPath, "utf8");

const grab = (start, end) => {
  const i = index.indexOf(start);
  const j = index.indexOf(end, i);
  if (i < 0 || j < 0) throw new Error("Could not find " + start + " in index.html");
  return index.slice(i + start.length, j + end.length - 1);
};
const DATA = Function("return " + grab("const DATA = ", "\n];"))();
const MEDIA_BASE = Function("return " + grab("const MEDIA_BASE = ", "};"))();
const reviewed = (index.match(/Last reviewed (\d{4}-\d{2}-\d{2})/) || [])[1] || new Date().toISOString().slice(0, 10);

const GROUP_ORDER = ["Essentials", "Cardiac", "Lung", "Volume"];
const ORDER = GROUP_ORDER.flatMap(g => DATA.filter(v => v.group === g));

const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const list = (items, f) => items && items.length ? items.map(f).join("\n") : "";
const viewUrl = v => SITE + "views/" + v.id + ".html";

function description(v) {
  const d = v.name + " (" + v.abbr + ") point-of-care ultrasound: " + v.purpose;
  return d.length > 158 ? d.slice(0, 155).replace(/\s+\S*$/, "") + "…" : d;
}

function page(v) {
  const i = ORDER.indexOf(v);
  const prev = ORDER[(i - 1 + ORDER.length) % ORDER.length];
  const next = ORDER[(i + 1) % ORDER.length];
  const poster = v.media ? "../assets/posters/" + MEDIA_BASE[v.media] + ".webp" : null;
  const image = v.media ? SITE + "assets/posters/" + MEDIA_BASE[v.media] + ".webp" : SITE + "assets/og-image.png";
  const title = v.name + " (" + v.abbr + ") — POCUS Tips";
  const ld = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: title,
    headline: v.name,
    description: v.purpose,
    url: viewUrl(v),
    image,
    lastReviewed: reviewed,
    inLanguage: "en-US",
    audience: { "@type": "MedicalAudience", audienceType: "Clinician" },
    author: { "@type": "Person", name: "Yonathan Daniel, MD", url: "https://yonathan.online" },
    isPartOf: { "@type": "WebSite", name: "POCUS Tips", url: SITE }
  };
  const section = (title, body) => body ? `<section><h2>${esc(title)}</h2>\n${body}\n</section>` : "";
  const items = (arr) => arr && arr.length ? `<ul class="cards">${list(arr, it => `<li><strong>${esc(it.t)}</strong><span>${esc(it.d)}</span></li>`)}</ul>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description(v))}">
<link rel="canonical" href="${viewUrl(v)}">
<meta name="theme-color" content="#161826">
<meta property="og:type" content="article">
<meta property="og:site_name" content="POCUS Tips">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(v.purpose)}">
<meta property="og:url" content="${viewUrl(v)}">
<meta property="og:image" content="${image}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>
  :root { --bg:#161826; --surface:#1c1e2b; --text:#e9e9ed; --muted:#9397ab; --line:#3f424d; --accent:#9184d9; --accent-2:#d2cefd; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font:15.5px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif; }
  main { max-width: 820px; margin: 0 auto; padding: 32px 18px 72px; }
  a { color: var(--accent); }
  .crumb { font-size: 13px; color: var(--muted); }
  .open { display:inline-block; margin: 14px 0 6px; padding: 9px 14px; border:1px solid var(--accent); border-radius:8px; text-decoration:none; font-size:14px; }
  h1 { font-size: clamp(26px, 5vw, 34px); letter-spacing: -0.02em; margin: 12px 0 4px; }
  h1 small { font: 12px ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--accent); border:1px solid var(--accent); border-radius:5px; padding:2px 7px; vertical-align: middle; margin-left: 8px; }
  h2 { font-size: 13px; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); margin: 34px 0 10px; }
  .lede { font-size: 17px; color: #c9cad3; margin: 0; }
  figure { margin: 22px 0 0; } figure img { max-width: 100%; max-height: 440px; width: auto; height: auto; border-radius: 8px; background: #000; display: block; margin: 0 auto; }
  figcaption { font-size: 12px; color: var(--muted); margin-top: 6px; }
  dl { display:grid; grid-template-columns: max-content 1fr; gap: 6px 16px; margin: 0; } dt { color: var(--muted); } dd { margin: 0; }
  ol, ul { padding-left: 20px; } li { margin: 4px 0; }
  ul.cards { list-style: none; padding: 0; display: grid; gap: 8px; }
  ul.cards li { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; margin: 0; }
  ul.cards strong { display:block; font-weight: 600; } ul.cards span { color: #c9cad3; font-size: 14px; }
  .table { overflow-x: auto; } table { border-collapse: collapse; width: 100%; font-size: 14px; }
  th, td { text-align: left; vertical-align: top; padding: 8px 10px; border-bottom: 1px solid var(--line); }
  th { color: var(--muted); font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
  td small { display:block; color: var(--muted); }
  .note { margin-top: 36px; padding: 14px 16px; border: 1px solid var(--line); border-radius: 8px; font-size: 13px; color: var(--muted); }
  nav.pager { display:flex; justify-content: space-between; gap: 12px; margin-top: 28px; font-size: 14px; }
</style>
</head>
<body>
<main>
  <div class="crumb"><a href="../">POCUS Tips</a> › ${esc(v.group === "Volume" ? "IVC" : v.group === "Essentials" ? "Setup" : v.group)}</div>
  <h1>${esc(v.name)}<small>${esc(v.abbr)}</small></h1>
  <p class="lede">${esc(v.purpose)}</p>
  <a class="open" href="../#${v.id}">Open the interactive view with the loop and quiz →</a>
  ${poster ? `<figure><img src="${poster}" alt="${esc(v.name)} ultrasound frame" loading="lazy"><figcaption>Still frame from the ${esc(v.name)} loop. ${esc(v.credit || "Loop: Pocus 101")}.</figcaption></figure>` : ""}
  ${v.site ? section("Where to put the probe", `<dl><dt>Window</dt><dd>${esc(v.site)}</dd><dt>Marker</dt><dd>${esc(v.marker)}</dd>${list(v.settings, s => `<dt>${esc(s.k)}</dt><dd>${esc(s.v)}</dd>`)}</dl>`) : ""}
  ${section(v.stepsTitle || "Get the view", v.steps && v.steps.length ? `<ol>${list(v.steps, s => `<li>${esc(s)}</li>`)}</ol>` : "")}
  ${section("What you are looking at", v.structures && v.structures.length ? `<dl>${list(v.structures, s => `<dt>${esc(s.name)}</dt><dd>${esc(s.note)}</dd>`)}</dl>` : "")}
  ${v.compare ? section(v.compare.title, `<p>${esc(v.compare.note)}</p>${items(v.compare.cols.map(c => ({ t: c.side + ": " + c.t, d: c.d })))}`) : ""}
  ${section(v.tableTitle || "Numbers that matter", v.rows && v.rows.length ? `<div class="table"><table><thead><tr><th>${esc(v.colA)}</th><th>${esc(v.colB)}</th><th>${esc(v.colC)}</th></tr></thead><tbody>${list(v.rows, r => `<tr><td>${esc(r.a)}<small>${esc(r.how)}</small></td><td>${esc(r.b)}</td><td>${esc(r.c)}</td></tr>`)}</tbody></table></div>` : "")}
  ${section("Don’t be fooled — pitfalls", items(v.pitfalls))}
  ${section("Bad image? Fix it", items(v.fixes))}
  ${section("So what — what the finding changes", items(v.actions))}
  <p class="note">Educational use only. Not for diagnosis or treatment decisions — confirm findings with formal imaging and your own judgment. By <a href="https://yonathan.online">Yonathan Daniel, MD</a> · <a href="../about.html">About</a> · Last reviewed ${reviewed}.</p>
  <nav class="pager" aria-label="Other views"><a href="${prev.id}.html">← ${esc(prev.name)}</a><a href="${next.id}.html">${esc(next.name)} →</a></nav>
</main>
</body>
</html>
`;
}

mkdirSync(join(ROOT, "views"), { recursive: true });
for (const v of ORDER) writeFileSync(join(ROOT, "views", v.id + ".html"), page(v));

const urls = [SITE, SITE + "about.html", ...ORDER.map(viewUrl)];
writeFileSync(join(ROOT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${u}</loc><lastmod>${reviewed}</lastmod></url>`).join("\n") + `\n</urlset>\n`);
writeFileSync(join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`);

// Crawler-readable table of contents in index.html (hidden once JavaScript runs).
const block = `<div id="seo-index">
  <h1>POCUS Tips — Bedside Point-of-Care Ultrasound Reference</h1>
  <p>How to get each cardiac, lung and IVC view, what normal and abnormal look like, common pitfalls, and what each finding changes about management.</p>
  <ul>
${ORDER.map(v => `    <li><a href="views/${v.id}.html">${esc(v.name)} (${esc(v.abbr)})</a> — ${esc(v.purpose)}</li>`).join("\n")}
  </ul>
  <p><a href="about.html">About the author</a></p>
</div>`;
const re = /<div id="seo-index">[\s\S]*?<\/div>/;
if (!re.test(index)) throw new Error('index.html is missing <div id="seo-index">');
index = index.replace(re, block);
writeFileSync(indexPath, index);
console.log("Wrote " + ORDER.length + " view pages, sitemap.xml, robots.txt and the index block.");
