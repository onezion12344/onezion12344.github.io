#!/usr/bin/env node
/**
 * Build the site into dist/.
 *
 * Reads data/*.json, derives Simplified Chinese, renders every page in three
 * languages, copies the legacy site verbatim, and verifies the result.
 * Zero dependencies beyond node: builtins.
 */

import fs from "node:fs";
import path from "node:path";

import {
  BASE,
  BuildError,
  LANGS,
  canonical,
  esc,
  fileFor,
  loc,
  marker,
  page,
  statusBadge,
  t,
  tagChips,
  urlFor,
} from "./lib/render.mjs";
import { DIST, ROOT, loadData } from "./lib/load-data.mjs";
import { checkLinks, checkNoindex } from "./lib/verify.mjs";

const { profile, resume, projects, strings, reviewed, todos } = loadData();

// -------------------------------------------------------------- small helpers

const isTodo = (v) => v === "TODO(owner)";
const paragraphs = (list, lang) =>
  list.map((p) => `<p>${esc(loc(p, lang))}</p>`).join("\n        ");

function metaFor(lang, pathKey, extra = {}) {
  return {
    title: t(strings, `meta.title.${pathKey}`, lang, extra),
    description: t(strings, `meta.desc.${pathKey}`, lang, extra),
  };
}

function personJsonLd(lang) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: canonical(lang),
    inLanguage: lang,
    mainEntity: {
      "@type": "Person",
      name: loc(profile.name, lang),
      jobTitle: loc(profile.headline, lang),
      description: loc(profile.tagline, lang),
      image: BASE + profile.photo,
      url: canonical(lang),
      address: {
        "@type": "PostalAddress",
        addressLocality: loc(profile.location, lang),
        addressCountry: "HK",
      },
      affiliation: {
        "@type": "CollegeOrUniversity",
        name: "The University of Hong Kong",
        url: "https://www.hku.hk/",
      },
      knowsAbout: profile.stack.map((g) => g.items).flat(),
      sameAs: profile.links.map((l) => l.url),
    },
  };
}

function projectJsonLd(project, lang) {
  const source = project.links.find((l) => l.url.includes("github.com"));
  const base = {
    "@context": "https://schema.org",
    "@type": source ? "SoftwareSourceCode" : "CreativeWork",
    name: loc(project.title, lang),
    description: loc(project.summary, lang),
    inLanguage: lang,
    dateCreated: String(project.year),
    author: {
      "@type": "Person",
      name: loc(profile.name, lang),
      url: canonical(lang),
    },
    url: canonical(lang, `projects/${project.slug}/`),
  };
  if (source) base.codeRepository = source.url;
  return base;
}

// ------------------------------------------------------------------- fragments

function stackBlock(lang) {
  const groups = profile.stack
    .map(
      (group) => `<div class="stack-group">
          <h3>${esc(loc(group.group, lang))}</h3>
          <p class="chips">${group.items.map((i) => `<span class="chip">${esc(i)}</span>`).join("")}</p>
        </div>`,
    )
    .join("\n        ");
  return `<div class="stack" aria-label="${esc(t(strings, "home.stackLabel", lang))}">
        ${groups}
      </div>`;
}

function nowBlock(lang) {
  return profile.now
    .map(
      (item) => `<div class="now-item">
          <p class="date">${esc(item.date)}</p>
          <div>
            <h3>${esc(loc(item.title, lang))}</h3>
            <p>${esc(loc(item.body, lang))}</p>
          </div>
        </div>`,
    )
    .join("\n        ");
}

function featuredCard(project, lang) {
  const href = urlFor(lang, `projects/${project.slug}/`);
  const poster = project.media
    ? `<img src="${esc(project.media.poster)}" width="640" height="360" loading="lazy" alt="">`
    : "";
  return `<a class="card work-card" href="${esc(href)}">
          ${poster}
          <span class="work-year">${project.year}</span>
          <h3>${esc(loc(project.title, lang))}</h3>
          <p>${esc(loc(project.summary, lang))}</p>
          <p class="chips">${tagChips(project.tags)} ${statusBadge(strings, lang, project)}</p>
        </a>`;
}

function projectRow(project, lang) {
  return `<li class="row">
          <a class="row-link" href="${esc(urlFor(lang, `projects/${project.slug}/`))}">
            <span class="row-year">${project.year}</span>
            <span class="row-main">
              <span class="row-title">${esc(loc(project.title, lang))}</span>
              <span class="row-role">${esc(loc(project.role, lang))}</span>
              <span class="row-sum">${esc(loc(project.summary, lang))}</span>
              <span class="row-tags">${tagChips(project.tags)}</span>
            </span>
            <span class="row-side">${statusBadge(strings, lang, project)}</span>
          </a>
        </li>`;
}

function videoBlock(project, lang) {
  if (!project.media) return "";
  const m = project.media;
  const label = `${loc(project.title, lang)} — ${t(strings, "video.label", lang)}`;
  return `<figure class="video" data-video>
        <video width="${m.width}" height="${m.height}" muted loop playsinline preload="none" poster="${esc(m.poster)}" aria-label="${esc(label)}">
          <source src="${esc(m.webm)}" type="video/webm">
          <source src="${esc(m.mp4)}" type="video/mp4">
        </video>
        <button type="button" class="video-play" data-play aria-label="${esc(t(strings, "video.play", lang))}">▶ <span>${esc(t(strings, "video.play", lang))}</span></button>
        <figcaption>${esc(label)} · ${esc(t(strings, "video.note", lang))}</figcaption>
      </figure>`;
}

function entryMeta(lang, { start, end, endLabel, location }) {
  const parts = [];
  if (!isTodo(start) && start) parts.push(start);
  if (end === "present") parts.push(t(strings, "cv.present", lang));
  else if (isTodo(end)) parts.push(t(strings, "cv.expected", lang));
  else if (end) parts.push(end);
  if (location) parts.push(loc(location, lang));
  return parts.join(" · ");
}

// --------------------------------------------------------------------- pages

function renderHome(lang) {
  const meta = metaFor(lang, "home");
  const featured = projects.filter((p) => p.featured);
  if (featured.length !== 4) {
    throw new BuildError(`Expected exactly 4 featured projects, found ${featured.length}`);
  }
  const contacts = profile.links
    .map(
      (l) => `<li><a href="${esc(l.url)}" rel="me noopener"><span class="contact-name">${esc(
        loc(l.label, lang),
      )}</span><span class="contact-handle">${esc(l.handle)}</span></a></li>`,
    )
    .join("\n          ");

  const body = `<section class="section hero" id="about">
      <div class="wrap">
        ${marker(strings, "section.about", lang)}
        <div class="hero-top">
          <picture>
            <source srcset="/assets/onezion-avatar.webp" type="image/webp">
            <img class="avatar" src="/assets/onezion-avatar.png" width="112" height="112" alt="${esc(
              loc(profile.photoAlt, lang),
            )}">
          </picture>
          <div>
            <h1>${esc(loc(profile.name, lang))}</h1>
            <p class="headline">${esc(loc(profile.headline, lang))}</p>
            <p class="tagline">${esc(loc(profile.tagline, lang))}</p>
          </div>
        </div>
        <div class="prose">
        ${paragraphs(profile.bio, lang)}
        </div>
        ${stackBlock(lang)}
      </div>
    </section>

    <section class="section" id="now">
      <div class="wrap">
        ${marker(strings, "section.now", lang)}
        <p class="section-note">${esc(t(strings, "home.updated", lang))}</p>
        <div class="now-list">
        ${nowBlock(lang)}
        </div>
      </div>
    </section>

    <section class="section" id="work">
      <div class="wrap-wide">
        ${marker(strings, "section.work", lang)}
        <div class="work-grid">
        ${featured.map((p) => featuredCard(p, lang)).join("\n        ")}
        </div>
        <p class="more"><a class="btn" href="${esc(
          urlFor(lang, "projects/"),
        )}">${esc(t(strings, "home.workMore", lang))} →</a></p>
      </div>
    </section>

    <section class="section" id="projects">
      <div class="wrap-wide">
        ${marker(strings, "section.projects", lang)}
        <p class="section-note">${esc(
          t(strings, "home.projectsCount", lang, { n: projects.length }),
        )}</p>
        <ul class="rows">
        ${projects.map((p) => projectRow(p, lang)).join("\n        ")}
        </ul>
      </div>
    </section>

    <section class="section" id="contacts">
      <div class="wrap">
        ${marker(strings, "section.contacts", lang)}
        <p class="section-note">${esc(t(strings, "contacts.note", lang))}</p>
        <ul class="contacts">
          ${contacts}
        </ul>
      </div>
    </section>`;

  return page({
    lang,
    path: "",
    title: meta.title,
    description: meta.description,
    body,
    strings,
    profile,
    reviewed,
    jsonLd: [personJsonLd(lang)],
  });
}

function renderCv(lang) {
  const meta = metaFor(lang, "cv");

  const education = resume.education
    .map((e) => {
      const gpa = isTodo(e.gpa) ? "" : `<p class="entry-note">${esc(t(strings, "cv.gpa", lang))}: ${esc(e.gpa)}</p>`;
      const programmes = e.programmes.map((p) => esc(loc(p, lang))).join("<br>");
      const highlights = e.highlights?.length
        ? `<ul>${e.highlights.map((h) => `<li>${esc(loc(h, lang))}</li>`).join("")}</ul>`
        : "";
      return `<article class="entry">
          <h3>${esc(loc(e.org, lang))}</h3>
          <p class="entry-meta">${esc(entryMeta(lang, e))}</p>
          <p class="entry-title">${programmes}</p>
          <p>${esc(loc(e.summary, lang))}</p>
          ${highlights}
          ${gpa}
        </article>`;
    })
    .join("\n        ");

  const experience = resume.experience
    .map(
      (e) => `<article class="entry">
          <h3>${esc(loc(e.title, lang))} · ${esc(loc(e.org, lang))}</h3>
          <p class="entry-meta">${esc(entryMeta(lang, e))}</p>
          <p>${esc(loc(e.summary, lang))}</p>
          ${
            e.highlights?.length
              ? `<ul>${e.highlights.map((h) => `<li>${esc(loc(h, lang))}</li>`).join("")}</ul>`
              : ""
          }
        </article>`,
    )
    .join("\n        ");

  const awards = resume.awards
    .map(
      (a) => `<article class="entry">
          <h3>${esc(loc(a.title, lang))}</h3>
          <p class="entry-meta">${esc(loc(a.org, lang))} · ${esc(a.year)}${
            isTodo(a.result) ? "" : ` · ${esc(a.result)}`
          }</p>
          <p>${esc(loc(a.summary, lang))}</p>
        </article>`,
    )
    .join("\n        ");

  const skills = resume.skills
    .map(
      (s) => `<div class="skill-group">
          <h3>${esc(loc(s.group, lang))}</h3>
          <p class="chips">${s.items.map((i) => `<span class="chip">${esc(i)}</span>`).join("")}</p>
        </div>`,
    )
    .join("\n        ");

  const languages = resume.languages
    .filter((l) => !isTodo(l.level))
    .map(
      (l) => `<li><span>${esc(loc(l.name, lang))}</span><span class="muted">${esc(
        loc(l.level, lang),
      )}</span></li>`,
    )
    .join("");

  const certifications = resume.certifications.length
    ? resume.certifications
        .map((c) => `<li><span>${esc(loc(c.name, lang))}</span><span class="muted">${esc(c.year)}</span></li>`)
        .join("")
    : "";

  const body = `<section class="section">
      <div class="wrap">
        <h1>${esc(loc(profile.name, lang))}</h1>
        <p class="lede">${esc(t(strings, "cv.lede", lang))}</p>
        <p class="formats">
          <a class="btn" href="/cv/${lang}.html">${esc(t(strings, "cv.print", lang))}</a>
          <a class="btn" href="/cv/${lang}.md">${esc(t(strings, "cv.markdown", lang))}</a>
        </p>
        <p class="section-note">${esc(t(strings, "cv.note", lang))}</p>

        <h2 class="marker"><span class="hash" aria-hidden="true">#</span>${esc(t(strings, "cv.education", lang))}</h2>
        ${education}

        <h2 class="marker"><span class="hash" aria-hidden="true">#</span>${esc(t(strings, "cv.experience", lang))}</h2>
        ${experience}

        <h2 class="marker"><span class="hash" aria-hidden="true">#</span>${esc(t(strings, "cv.awards", lang))}</h2>
        ${awards}

        <h2 class="marker"><span class="hash" aria-hidden="true">#</span>${esc(t(strings, "cv.skills", lang))}</h2>
        <div class="skills">
        ${skills}
        </div>

        <h2 class="marker"><span class="hash" aria-hidden="true">#</span>${esc(t(strings, "cv.languages", lang))}</h2>
        <ul class="plain">${languages}</ul>

        ${
          certifications
            ? `<h2 class="marker"><span class="hash" aria-hidden="true">#</span>${esc(t(strings, "cv.certifications", lang))}</h2>
        <ul class="plain">${certifications}</ul>`
            : ""
        }

        <h2 class="marker"><span class="hash" aria-hidden="true">#</span>${esc(t(strings, "cv.contact", lang))}</h2>
        <ul class="plain">${profile.links
          .map(
            (l) =>
              `<li><span>${esc(loc(l.label, lang))}</span><span class="muted">${esc(l.url)}</span></li>`,
          )
          .join("")}</ul>
      </div>
    </section>`;

  return page({
    lang,
    path: "cv/",
    title: meta.title,
    description: meta.description,
    body,
    strings,
    profile,
    reviewed,
    jsonLd: [personJsonLd(lang)],
  });
}

function renderProjectIndex(lang) {
  const meta = metaFor(lang, "projects");
  const body = `<section class="section">
      <div class="wrap-wide">
        <h1>${esc(t(strings, "projects.heading", lang))}</h1>
        <p class="lede">${esc(t(strings, "projects.lede", lang))}</p>
        <p class="section-note">${esc(
          t(strings, "projects.countLabel", lang, { n: projects.length }),
        )} · ${esc(t(strings, "projects.privateNote", lang))}</p>
        <ul class="rows">
        ${projects.map((p) => projectRow(p, lang)).join("\n        ")}
        </ul>
      </div>
    </section>`;
  return page({
    lang,
    path: "projects/",
    title: meta.title,
    description: meta.description,
    body,
    strings,
    profile,
    reviewed,
  });
}

function renderProject(project, lang) {
  const title = loc(project.title, lang);
  const description = loc(project.summary, lang);
  const idx = projects.indexOf(project);
  const prev = projects[idx - 1];
  const next = projects[idx + 1];
  const links = project.links.length
    ? `<p class="proj-links">${project.links
        .map(
          (l) =>
            `<a class="btn" href="${esc(l.url)}" rel="noopener">${esc(loc(l.label, lang))} ↗</a>`,
        )
        .join("")}</p>`
    : "";

  const body = `<article class="section project-page">
      <div class="wrap">
        <p class="back"><a href="${esc(urlFor(lang, "projects/"))}">← ${esc(
          t(strings, "project.back", lang),
        )}</a></p>
        <h1>${esc(title)}</h1>
        <p class="lede">${esc(description)}</p>
        <dl class="facts">
          <div><dt>${esc(t(strings, "project.year", lang))}</dt><dd>${project.year}</dd></div>
          <div><dt>${esc(t(strings, "project.role", lang))}</dt><dd>${esc(
            loc(project.role, lang),
          )}</dd></div>
          <div><dt>${esc(t(strings, "project.status", lang))}</dt><dd>${statusBadge(
            strings,
            lang,
            project,
          )} <span class="muted">${esc(
            t(strings, `visibility.${project.visibility}`, lang),
          )}</span></dd></div>
        </dl>
        ${links}
        ${videoBlock(project, lang)}
        <div class="prose">
          <h2 class="marker"><span class="hash" aria-hidden="true">#</span>${esc(t(strings, "project.what", lang))}</h2>
          <p>${esc(loc(project.what, lang))}</p>
          <h2 class="marker"><span class="hash" aria-hidden="true">#</span>${esc(t(strings, "project.why", lang))}</h2>
          <p>${esc(loc(project.why, lang))}</p>
          ${
            project.challenge
              ? `<h2 class="marker"><span class="hash" aria-hidden="true">#</span>${esc(t(strings, "project.challenge", lang))}</h2>
          <p>${esc(loc(project.challenge, lang))}</p>`
              : ""
          }
          <h2 class="marker"><span class="hash" aria-hidden="true">#</span>${esc(t(strings, "project.highlights", lang))}</h2>
          <ul class="bullets">${project.highlights
            .map((h) => `<li>${esc(loc(h, lang))}</li>`)
            .join("")}</ul>
          <h2 class="marker"><span class="hash" aria-hidden="true">#</span>${esc(t(strings, "project.evidence", lang))}</h2>
          <ul class="evidence">${project.evidence
            .map(
              (e) =>
                `<li>${esc(loc(e.text, lang))}<span class="src">${esc(e.source)}</span></li>`,
            )
            .join("")}</ul>
        </div>
        <nav class="pager" aria-label="Projects">
          ${
            prev
              ? `<a href="${esc(urlFor(lang, `projects/${prev.slug}/`))}">← ${esc(
                  t(strings, "project.prev", lang),
                )} · ${esc(loc(prev.title, lang))}</a>`
              : "<span></span>"
          }
          ${
            next
              ? `<a href="${esc(urlFor(lang, `projects/${next.slug}/`))}">${esc(
                  t(strings, "project.next", lang),
                )} · ${esc(loc(next.title, lang))} →</a>`
              : "<span></span>"
          }
        </nav>
      </div>
    </article>`;

  return page({
    lang,
    path: `projects/${project.slug}/`,
    title: t(strings, "meta.title.project", lang, { title }),
    description,
    body,
    strings,
    profile,
    reviewed,
    jsonLd: [projectJsonLd(project, lang)],
    hasVideo: Boolean(project.media),
  });
}

function render404() {
  const lang = "en";
  const meta = metaFor(lang, "404");
  const body = `<section class="section notfound">
      <div class="wrap">
        <picture>
          <source srcset="/assets/onezion.webp" type="image/webp">
          <img class="notfound-art" src="/assets/onezion.png" width="960" height="960" alt="${esc(
            loc(profile.photoAlt, lang),
          )}">
        </picture>
        <h1>${esc(t(strings, "notfound.heading", lang))}</h1>
        <p class="lede">${esc(t(strings, "notfound.body", lang))}</p>
        <p><a class="btn" href="/">${esc(t(strings, "notfound.back", lang))}</a></p>
      </div>
    </section>`;
  return page({
    lang,
    path: "404.html",
    title: meta.title,
    description: meta.description,
    body,
    strings,
    profile,
    reviewed,
    robots: "noindex",
    bodyClass: "is-404",
    alternateLinks: false,
    switchPath: '',
  });
}

// ------------------------------------------------------------------- writing

function write(relPath, contents) {
  const target = path.join(DIST, relPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}

function copyLegacy() {
  const legacyFiles = [
    "advx-research.html",
    "casual-research.html",
    "hku-leave-of-absence-max-registration-report.html",
    "moc-pilot-enterprises-piano-cars-report.html",
    "商务部试点企业-钢琴-卖车-研究报告.html",
    "projects/coding-vibe/index.html",
    "projects/coding-vibe/DOCS.md",
    "projects/casual-research/index.html",
    "projects/casual-research/attachment-and-desire.html",
    "projects/casual-research/attraction-and-conflict.html",
    "projects/casual-research/conflict-styles.html",
    "projects/casual-research/self-love-vs-approval.html",
  ];
  for (const rel of legacyFiles) {
    const src = path.join(ROOT, rel);
    if (!fs.existsSync(src)) throw new BuildError(`Legacy file missing: ${rel}`);
    write(rel, fs.readFileSync(src));
  }
  fs.cpSync(path.join(ROOT, "assets"), path.join(DIST, "assets"), { recursive: true });
}

function sitemap() {
  const urls = [];
  for (const lang of LANGS) {
    urls.push(canonical(lang.code));
    urls.push(canonical(lang.code, "cv/"));
    urls.push(canonical(lang.code, "projects/"));
    for (const p of projects) urls.push(canonical(lang.code, `projects/${p.slug}/`));
  }
  const body = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${u}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>${
          u === BASE + "/" ? "1.0" : "0.7"
        }</priority>\n  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

// --------------------------------------------------------------------- build

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

const generated = [];
for (const langMeta of LANGS) {
  const lang = langMeta.code;
  const pages = [
    ["", renderHome(lang)],
    ["cv/", renderCv(lang)],
    ["projects/", renderProjectIndex(lang)],
    ...projects.map((p) => [`projects/${p.slug}/`, renderProject(p, lang)]),
  ];
  for (const [p, html] of pages) {
    write(fileFor(lang, p), html);
    generated.push(fileFor(lang, p));
  }
}

write("404.html", render404());
generated.push("404.html");
write("sitemap.xml", sitemap());
write(
  "robots.txt",
  `User-agent: *\nAllow: /\n\nSitemap: ${BASE}/sitemap.xml\n`,
);
write(".nojekyll", "");
copyLegacy();

// ------------------------------------------------------------ link checking

const LEGACY_NOINDEX = [
  "hku-leave-of-absence-max-registration-report.html",
  "moc-pilot-enterprises-piano-cars-report.html",
  "商务部试点企业-钢琴-卖车-研究报告.html",
  "projects/casual-research/index.html",
  "projects/casual-research/attachment-and-desire.html",
  "projects/casual-research/attraction-and-conflict.html",
  "projects/casual-research/conflict-styles.html",
  "projects/casual-research/self-love-vs-approval.html",
];

// CV documents are written by scripts/cv.mjs, which runs after this script and
// repeats the full link check once they exist.
const CV_DOCS = [/^\/cv\/[^/]+\.(?:html|md)$/];

const { fails: internalFails, legacyWarns } = checkLinks({
  dist: DIST,
  generated: new Set(generated),
  ignore: CV_DOCS,
});
const noindexMissing = checkNoindex(DIST, LEGACY_NOINDEX);

// ------------------------------------------------------------------ report

const sizes = generated.map((rel) => {
  const html = fs.statSync(path.join(DIST, rel)).size;
  const dir = path.dirname(path.join(DIST, rel));
  let css = 0;
  const tokens = path.join(DIST, "assets/tokens.css");
  const site = path.join(DIST, "assets/site.css");
  if (fs.existsSync(tokens)) css += fs.statSync(tokens).size;
  if (fs.existsSync(site)) css += fs.statSync(site).size;
  return { rel, kb: (html + css) / 1024 };
});
const biggest = sizes.sort((a, b) => b.kb - a.kb)[0];

const report = [
  `Built ${generated.length} pages for ${LANGS.length} languages into dist/.`,
  `Projects: ${projects.length} (${projects.filter((p) => p.featured).length} featured).`,
  `Largest page with CSS: ${biggest.rel} at ${biggest.kb.toFixed(1)} KB.`,
  `Internal links: ${internalFails.length} broken in generated pages.`,
  `Legacy pages: ${legacyWarns.length} pre-existing unresolved internal links.`,
  `noindex missing on ${noindexMissing.length} personal-document page(s).`,
  `TODO(owner) fields: ${todos.length}.`,
  ...todos.map((x) => `  - ${x}`),
];
console.log(report.join("\n"));

if (legacyWarns.length) {
  console.log("\nLegacy link warnings (not generated by this build):");
  for (const w of legacyWarns.slice(0, 20)) console.log(`  ! ${w}`);
}
if (internalFails.length) {
  console.error("\nBroken internal links:");
  for (const f of internalFails) console.error(`  ✗ ${f}`);
}
if (noindexMissing.length) {
  console.error("\nMissing noindex:");
  for (const f of noindexMissing) console.error(`  ✗ ${f}`);
}
if (internalFails.length || noindexMissing.length) process.exit(1);
