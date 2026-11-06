/** HTML rendering helpers. No templating library, no dependencies. */

export const LANGS = [
  { code: "en", dir: "", htmlLang: "en" },
  { code: "zh-Hant", dir: "zh-hant", htmlLang: "zh-Hant" },
  { code: "zh-Hans", dir: "zh-hans", htmlLang: "zh-Hans" },
];

export const BASE = "https://onezion12344.github.io";

export class BuildError extends Error {
  constructor(message) {
    super(message);
    this.name = "BuildError";
  }
}

export function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Localised value lookup. Missing language is a build error, never `undefined`. */
export function loc(value, lang, path = "") {
  if (value === null || value === undefined) {
    throw new BuildError(`Missing localised value at ${path} for ${lang}`);
  }
  if (typeof value === "string") {
    if (value === "TODO(owner)") return "";
    return value;
  }
  if (typeof value !== "object") {
    throw new BuildError(`Expected localised object at ${path}, got ${typeof value}`);
  }
  const out = value[lang];
  if (typeof out !== "string" || out.length === 0) {
    throw new BuildError(`Missing "${lang}" string at ${path}`);
  }
  return out;
}

/** UI string lookup with {placeholder} substitution. Missing key is a build error. */
export function t(strings, key, lang, vars = {}) {
  const entry = strings[key];
  if (!entry) throw new BuildError(`Missing i18n key: ${key}`);
  let out = entry[lang];
  if (typeof out !== "string" || out.length === 0) {
    throw new BuildError(`Missing "${lang}" for i18n key: ${key}`);
  }
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  if (out.includes("{")) throw new BuildError(`Unfilled placeholder in ${key}: ${out}`);
  return out;
}

export function urlFor(lang, path = "") {
  const meta = LANGS.find((l) => l.code === lang);
  if (!meta) throw new BuildError(`Unknown language: ${lang}`);
  return `/${meta.dir ? meta.dir + "/" : ""}${path}`;
}

export function fileFor(lang, path = "") {
  const url = urlFor(lang, path);
  return url.endsWith("/") ? `${url}index.html`.slice(1) : url.slice(1);
}

export function canonical(lang, path = "") {
  return BASE + urlFor(lang, path);
}

function alternates(path) {
  const links = LANGS.map(
    (l) =>
      `<link rel="alternate" hreflang="${l.htmlLang}" href="${esc(canonical(l.code, path))}">`,
  );
  links.push(`<link rel="alternate" hreflang="x-default" href="${esc(canonical("en", path))}">`);
  return links.join("\n  ");
}

function themeBoot() {
  return `<script>(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}})();</script>`;
}

function themeToggle(strings, lang) {
  return `<button type="button" class="theme-toggle" data-theme-toggle aria-label="${esc(
    t(strings, "theme.toggle", lang),
  )}" title="${esc(t(strings, "theme.label", lang))}">◐</button>`;
}

function langSwitch(strings, lang, path) {
  const items = LANGS.map((l) => {
    const current = l.code === lang;
    return `<a href="${esc(urlFor(l.code, path))}" hreflang="${l.htmlLang}" lang="${l.htmlLang}"${
      current ? ' aria-current="true" class="on"' : ""
    }>${esc(t(strings, `lang.${l.code}`, lang))}</a>`;
  }).join('<span class="lang-sep" aria-hidden="true">/</span>');
  return `<nav class="lang-toggle" aria-label="${esc(t(strings, "lang.label", lang))}">${items}</nav>`;
}

function header({ strings, lang, path, profile, home = false }) {
  const nav = [
    `<a href="${esc(urlFor(lang))}"${home ? ' aria-current="page"' : ""}>${esc(
      t(strings, "nav.home", lang),
    )}</a>`,
    `<a href="${esc(urlFor(lang, "cv/"))}"${path === "cv/" ? ' aria-current="page"' : ""}>${esc(
      t(strings, "nav.cv", lang),
    )}</a>`,
    `<a href="${esc(urlFor(lang, "projects/"))}"${
      path.startsWith("projects") ? ' aria-current="page"' : ""
    }>${esc(t(strings, "nav.projects", lang))}</a>`,
  ].join("");

  return `<header class="site-head">
  <div class="wrap-wide head-row">
    <a class="brand" href="${esc(urlFor(lang))}">${esc(loc(profile.name, lang))}</a>
    <nav class="site-nav" aria-label="Main">${nav}</nav>
    <div class="head-tools">
      ${langSwitch(strings, lang, path)}
      ${themeToggle(strings, lang)}
    </div>
  </div>
</header>`;
}

function footer({ strings, lang, profile, reviewed }) {
  const year = new Date().getFullYear();
  const links = profile.links
    .map(
      (l) =>
        `<li><a href="${esc(l.url)}" rel="me noopener">${esc(loc(l.label, lang))}</a></li>`,
    )
    .join("");
  const translationNote =
    lang === "zh-Hans" && reviewed["zh-Hans"] === false
      ? `<p class="footer-note" data-translation-status="unreviewed">${esc(
          t(strings, "footer.translation", lang),
        )}</p>`
      : "";
  return `<footer class="site-foot">
  <div class="wrap-wide">
    <ul class="foot-links">${links}</ul>
    <p>${esc(t(strings, "footer.rights", lang, { year }))} · ${esc(
      loc(profile.location, lang),
    )}</p>
    <p class="footer-note">${esc(t(strings, "footer.built", lang))}</p>
    ${translationNote}
    <p><a class="foot-top" href="#top">${esc(t(strings, "footer.top", lang))}</a></p>
  </div>
</footer>`;
}

const VIDEO_SCRIPT = `<script>(function(){var b=document.querySelector("[data-play]");if(!b)return;var f=b.closest("[data-video]");var v=f&&f.querySelector("video");if(!v)return;b.addEventListener("click",function(){v.play();v.setAttribute("controls","");b.hidden=true;});})();</script>`;
const THEME_SCRIPT = `<script>(function(){var b=document.querySelector("[data-theme-toggle]");if(!b)return;b.addEventListener("click",function(){var r=document.documentElement;var cur=r.dataset.theme||(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");var next=cur==="light"?"dark":"light";r.dataset.theme=next;try{localStorage.setItem("theme",next)}catch(e){}});})();</script>`;

/**
 * Full HTML document shell.
 */
export function page({
  lang,
  path,
  title,
  description,
  body,
  strings,
  profile,
  reviewed,
  jsonLd = [],
  robots = "",
  bodyClass = "",
  hasVideo = false,
  alternateLinks = true,
  switchPath = path,
}) {
  const meta = LANGS.find((l) => l.code === lang);
  const ld = jsonLd
    .map((obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`)
    .join("\n  ");
  return `<!doctype html>
<html lang="${meta.htmlLang}" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${esc(canonical(lang, path))}">
  ${alternateLinks ? alternates(path) : ''}
  <meta property="og:type" content="${path.startsWith("projects/") && path !== "projects/" ? "article" : "website"}">
  <meta property="og:site_name" content="${esc(t(strings, "meta.siteName", lang))}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(canonical(lang, path))}">
  <meta property="og:image" content="${esc(BASE + "/assets/onezion.png")}">
  <meta property="og:image:width" content="960">
  <meta property="og:image:height" content="960">
  <meta property="og:image:alt" content="${esc(loc(profile.photoAlt, lang))}">
  <meta property="og:locale" content="${lang === "en" ? "en_HK" : lang === "zh-Hant" ? "zh_HK" : "zh_CN"}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${esc(BASE + "/assets/onezion.png")}">
  <meta name="twitter:creator" content="@onezion12344">
  <meta name="theme-color" content="#0b0b0c" media="(prefers-color-scheme: dark)">
  <meta name="theme-color" content="#f6f6f3" media="(prefers-color-scheme: light)">
  ${lang === "zh-Hans" && reviewed["zh-Hans"] === false ? '<meta name="translation-status" content="unreviewed">' : ""}
  ${robots ? `<meta name="robots" content="${esc(robots)}">` : ""}
  ${ld}
  ${themeBoot()}
  <link rel="stylesheet" href="/assets/tokens.css">
  <link rel="stylesheet" href="/assets/site.css">
  <link rel="icon" href="/assets/onezion-avatar.png" type="image/png">
</head>
<body class="${esc(bodyClass)}" id="top">
  <a class="skip" href="#main">${esc(t(strings, "nav.skip", lang))}</a>
  ${header({ strings, lang, path: switchPath, profile, home: switchPath === "" })}
  <main id="main">
${body}
  </main>
  ${footer({ strings, lang, profile, reviewed })}
  ${hasVideo ? VIDEO_SCRIPT : ""}
  ${THEME_SCRIPT}
</body>
</html>
`;
}

export function marker(strings, key, lang) {
  return `<h2 class="marker" data-section="${esc(key)}"># ${esc(t(strings, key, lang))}</h2>`;
}

export function statusBadge(strings, lang, project) {
  return `<span class="badge">${esc(t(strings, `status.${project.status}`, lang))}</span>`;
}

export function tagChips(tags) {
  return tags.map((tag) => `<span class="chip">${esc(tag)}</span>`).join("");
}
