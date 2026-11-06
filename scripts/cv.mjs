#!/usr/bin/env node
/**
 * Generate the CV, per language:
 *   dist/cv/<lang>.md    ATS-friendly plain markdown (no tables, no columns)
 *   dist/cv/<lang>.html  A4 print sheet; the PDF comes from the browser
 *
 * Run after scripts/build.mjs. Exits non-zero on any validation failure.
 */

import fs from "node:fs";
import path from "node:path";

import { BuildError, LANGS, esc, fileFor, loc, t } from "./lib/render.mjs";
import { DIST, loadData } from "./lib/load-data.mjs";
import { checkLinks } from "./lib/verify.mjs";

const { profile, resume, projects, strings } = loadData();

if (!fs.existsSync(DIST)) {
  throw new BuildError("dist/ does not exist. Run `node scripts/build.mjs` first.");
}

const isTodo = (v) => v === "TODO(owner)";

function dateRange(lang, { start, end }) {
  const parts = [];
  if (!isTodo(start) && start) parts.push(start);
  if (end === "present") parts.push(t(strings, "cv.present", lang));
  else if (isTodo(end)) parts.push(t(strings, "cv.expected", lang));
  else if (end) parts.push(end);
  return parts.join(" — ");
}

function contactLine(lang) {
  return profile.links.map((l) => `${loc(l.label, lang)}: ${l.url}`).join(" · ");
}

// ------------------------------------------------------------------ markdown

function markdown(lang) {
  const L = [];
  const push = (...lines) => L.push(...lines);

  push(`# ${loc(profile.name, lang)}`, "");
  push(t(strings, "cv.aka", lang), "");
  push(`${loc(profile.headline, lang)} · ${loc(profile.location, lang)}`, "");
  push(contactLine(lang), "");
  push(`## ${t(strings, "cv.summary", lang)}`, "");
  push(loc(profile.bio[0], lang), "");

  push(`## ${t(strings, "cv.education", lang)}`, "");
  for (const e of resume.education) {
    push(`### ${loc(e.org, lang)}`, "");
    push(`${dateRange(lang, e)} · ${loc(e.location, lang)}`, "");
    for (const p of e.programmes) push(loc(p, lang), "");
    push(loc(e.summary, lang), "");
    if (e.highlights?.length) {
      for (const h of e.highlights) push(`- ${loc(h, lang)}`);
      push("");
    }
  }

  push(`## ${t(strings, "cv.experience", lang)}`, "");
  for (const e of resume.experience) {
    push(`### ${loc(e.title, lang)}, ${loc(e.org, lang)}`, "");
    push(`${dateRange(lang, e)} · ${loc(e.location, lang)}`, "");
    push(loc(e.summary, lang), "");
    if (e.highlights?.length) {
      for (const h of e.highlights) push(`- ${loc(h, lang)}`);
      push("");
    }
  }

  push(`## ${t(strings, "cv.awards", lang)}`, "");
  for (const a of resume.awards) {
    push(`### ${loc(a.title, lang)}`, "");
    const meta = [loc(a.org, lang), a.year];
    if (!isTodo(a.result)) meta.push(a.result);
    push(meta.join(" · "), "");
    push(loc(a.summary, lang), "");
  }

  push(`## ${t(strings, "cv.skills", lang)}`, "");
  for (const s of resume.skills) {
    push(`**${loc(s.group, lang)}:** ${s.items.join(", ")}`, "");
  }

  push(`## ${t(strings, "cv.languages", lang)}`, "");
  for (const l of resume.languages) {
    if (isTodo(l.level)) continue;
    push(`- ${loc(l.name, lang)} — ${loc(l.level, lang)}`);
  }
  push("");

  if (resume.certifications.length) {
    push(`## ${t(strings, "cv.certifications", lang)}`, "");
    for (const c of resume.certifications) {
      push(`- ${loc(c.name, lang)} — ${c.year}`);
    }
    push("");
  }

  return L.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

// ------------------------------------------------------------- print document

function printHtml(lang) {
  const meta = LANGS.find((l) => l.code === lang);
  const headline = `${loc(profile.name, lang)} — ${loc(profile.headline, lang)}`;
  const li = (items) => items.map((h) => `<li>${esc(loc(h, lang))}</li>`).join("");

  const education = resume.education
    .map(
      (e) => `<article class="entry">
        <h3>${esc(loc(e.org, lang))}</h3>
        <p class="meta">${esc(dateRange(lang, e))} · ${esc(loc(e.location, lang))}</p>
        <p class="programme">${e.programmes.map((p) => esc(loc(p, lang))).join("<br>")}</p>
        <p>${esc(loc(e.summary, lang))}</p>
        ${e.highlights?.length ? `<ul>${li(e.highlights)}</ul>` : ""}
      </article>`,
    )
    .join("\n");

  const experience = resume.experience
    .map(
      (e) => `<article class="entry">
        <h3>${esc(loc(e.title, lang))} <span class="org">· ${esc(loc(e.org, lang))}</span></h3>
        <p class="meta">${esc(dateRange(lang, e))} · ${esc(loc(e.location, lang))}</p>
        <p>${esc(loc(e.summary, lang))}</p>
        ${e.highlights?.length ? `<ul>${li(e.highlights)}</ul>` : ""}
      </article>`,
    )
    .join("\n");

  const awards = resume.awards
    .map(
      (a) => `<article class="entry">
        <h3>${esc(loc(a.title, lang))}</h3>
        <p class="meta">${esc(loc(a.org, lang))} · ${esc(a.year)}${
          isTodo(a.result) ? "" : ` · ${esc(a.result)}`
        }</p>
        <p>${esc(loc(a.summary, lang))}</p>
      </article>`,
    )
    .join("\n");

  const skills = resume.skills
    .map(
      (s) =>
        `<p><b>${esc(loc(s.group, lang))}:</b> ${esc(s.items.join(", "))}</p>`,
    )
    .join("\n");

  const languages = resume.languages
    .filter((l) => !isTodo(l.level))
    .map(
      (l) =>
        `<li><span>${esc(loc(l.name, lang))}</span><span class="dim">${esc(
          loc(l.level, lang),
        )}</span></li>`,
    )
    .join("");

  const certifications = resume.certifications.length
    ? `<h2>${esc(t(strings, "cv.certifications", lang))}</h2>
      <ul class="plain">${resume.certifications
        .map(
          (c) =>
            `<li><span>${esc(loc(c.name, lang))}</span><span class="dim">${esc(
              c.year,
            )}</span></li>`,
        )
        .join("")}</ul>`
    : "";

  const contacts = profile.links
    .map((l) => `<a href="${esc(l.url)}" rel="noopener">${esc(loc(l.label, lang))}</a>`)
    .join(" · ");

  const langLinks = LANGS.map(
    (l) =>
      `<a href="/cv/${l.code}.html" hreflang="${l.htmlLang}"${
        l.code === lang ? ' aria-current="true"' : ""
      }>${l.code}</a>`,
  ).join("");

  return `<!doctype html>
<html lang="${meta.htmlLang}" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(headline)}</title>
<meta name="description" content="${esc(loc(profile.tagline, lang))}">
<meta name="robots" content="noindex">
<link rel="stylesheet" href="/assets/cv-print.css">
</head>
<body>
<div class="sheet">
  <div class="print-bar">
    <a href="/${meta.dir ? meta.dir + "/" : ""}cv/">← ${esc(t(strings, "nav.cv", lang))}</a>
    <span class="spacer"></span>
    <span>${langLinks}</span>
    <button type="button" onclick="window.print()">${esc(
      t(strings, "cv.printButton", lang),
    )}</button>
  </div>

  <header class="cv-head">
    <h1>${esc(loc(profile.name, lang))}</h1>
    <p class="aka">${esc(t(strings, "cv.aka", lang))}</p>
    <p class="headline">${esc(loc(profile.headline, lang))}</p>
    <p class="contact-line">${esc(loc(profile.location, lang))} · ${contacts}</p>
  </header>

  <p class="summary">${esc(loc(profile.bio[0], lang))}</p>

  <h2>${esc(t(strings, "cv.education", lang))}</h2>
  ${education}

  <h2>${esc(t(strings, "cv.experience", lang))}</h2>
  ${experience}

  <h2>${esc(t(strings, "cv.awards", lang))}</h2>
  ${awards}

  <h2>${esc(t(strings, "cv.skills", lang))}</h2>
  <div class="skills">
  ${skills}
  </div>

  <h2>${esc(t(strings, "cv.languages", lang))}</h2>
  <ul class="plain">${languages}</ul>

  ${certifications}

  <p class="pdf-hint">${esc(t(strings, "cv.note", lang))}</p>
</div>
</body>
</html>
`;
}

// -------------------------------------------------------------------- write

fs.mkdirSync(path.join(DIST, "cv"), { recursive: true });

for (const { code } of LANGS) {
  fs.writeFileSync(path.join(DIST, "cv", `${code}.md`), markdown(code));
  fs.writeFileSync(path.join(DIST, "cv", `${code}.html`), printHtml(code));
}

// The CV documents complete the link graph, so the full internal check runs here.
const generatedSet = new Set(["404.html"]);
for (const { code } of LANGS) {
  generatedSet.add(fileFor(code, ""));
  generatedSet.add(fileFor(code, "cv/"));
  generatedSet.add(fileFor(code, "projects/"));
  for (const p of projects) generatedSet.add(fileFor(code, `projects/${p.slug}/`));
  generatedSet.add(`cv/${code}.html`);
}

const { fails, legacyWarns } = checkLinks({ dist: DIST, generated: generatedSet });
if (fails.length) {
  console.error("Broken internal links:");
  for (const f of fails) console.error(`  ✗ ${f}`);
  process.exit(1);
}

const count = LANGS.length * 2;
console.log(
  `Wrote ${count} CV files: ${LANGS.map((l) => `cv/${l.code}.md, cv/${l.code}.html`).join("; ")}`,
);
console.log(`Internal links: 0 broken across ${generatedSet.size} generated pages.`);
if (legacyWarns.length) console.log(`Legacy page warnings: ${legacyWarns.length}.`);
