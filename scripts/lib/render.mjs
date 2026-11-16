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

// Three modes, not two. "System" is the default and is represented by the
// absence of data-theme, so a visitor who never touches the control keeps
// following their OS. The choice is stored; system is stored as "system" so an
// explicit choice of "follow the system" survives a reload.
//
// Icons are inline and stroked in currentColor: a glyph like ◐ turns into a
// featureless white blob the moment the active segment inverts, which is
// exactly the one state that has to be legible.
function themeToggle(strings, lang) {
  const svg = (body, extra = "") =>
    `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"${extra}>${body}</svg>`;
  const modes = [
    {
      id: "system",
      label: t(strings, "theme.system", lang),
      icon: svg('<rect x="1.5" y="2.5" width="13" height="9" rx="1"/><path d="M5.5 14h5"/>'),
    },
    {
      id: "light",
      label: t(strings, "theme.light", lang),
      icon: svg(
        '<circle cx="8" cy="8" r="3.1"/><path d="M8 1v1.8M8 13.2V15M1 8h1.8M13.2 8H15M3.1 3.1l1.3 1.3M11.6 11.6l1.3 1.3M12.9 3.1l-1.3 1.3M4.4 11.6l-1.3 1.3"/>',
      ),
    },
    {
      id: "dark",
      label: t(strings, "theme.dark", lang),
      icon: svg('<path d="M13.5 10.2A5.8 5.8 0 0 1 5.8 2.5a5.9 5.9 0 1 0 7.7 7.7z"/>'),
    },
  ];
  return `<div class="theme-switch" role="group" aria-label="${esc(
    t(strings, "theme.label", lang),
  )}">${modes
    .map(
      (m) =>
        `<button type="button" class="theme-opt" data-theme-set="${m.id}" title="${esc(
          m.label,
        )}" aria-label="${esc(m.label)}" aria-pressed="false">${m.icon}</button>`,
    )
    .join("")}</div>`;
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
    `<a href="${esc(urlFor(lang, "hire/"))}"${path === "hire/" ? ' aria-current="page"' : ""}>${esc(
      t(strings, "nav.hire", lang),
    )}</a>`,
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

const THEME_SCRIPT = `<script>(function(){
var r=document.documentElement;
var btns=[].slice.call(document.querySelectorAll("[data-theme-set]"));
if(!btns.length)return;
var mq=matchMedia("(prefers-color-scheme: light)");
function mode(){var t=r.dataset.theme;return t==="light"||t==="dark"?t:"system";}
function paint(){
  var cur=mode();
  for(var i=0;i<btns.length;i++){
    var on=btns[i].getAttribute("data-theme-set")===cur;
    btns[i].setAttribute("aria-pressed",on?"true":"false");
    btns[i].classList.toggle("on",on);
  }
}
for(var i=0;i<btns.length;i++){btns[i].addEventListener("click",function(){
  var v=this.getAttribute("data-theme-set");
  if(v==="system"){delete r.dataset.theme}else{r.dataset.theme=v}
  try{localStorage.setItem("theme",v)}catch(e){}
  paint();
});}
if(mq.addEventListener){mq.addEventListener("change",paint)}
paint();
})();</script>`;

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
  extraScript = "",
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
  ${THEME_SCRIPT}
  ${extraScript}
</body>
</html>
`;
}

export function marker(strings, key, lang) {
  return `<h2 class="marker" data-section="${esc(key)}"><span class="hash" aria-hidden="true">#</span>${esc(t(strings, key, lang))}</h2>`;
}

export function statusBadge(strings, lang, project) {
  return `<span class="badge">${esc(t(strings, `status.${project.status}`, lang))}</span>`;
}

export function tagChips(tags) {
  return tags.map((tag) => `<span class="chip">${esc(tag)}</span>`).join("");
}
