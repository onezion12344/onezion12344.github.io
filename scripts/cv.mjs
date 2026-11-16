#!/usr/bin/env node
/**
 * Generate the CV, per language:
 *   dist/cv/<lang>.md    ATS-friendly plain markdown (no tables, no columns)
 *   dist/cv/<lang>.html  A4 print sheet; the PDF comes from the browser
 *
 * Run after scripts/build.mjs. Exits non-zero on any validation failure.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { BuildError, LANGS, esc, fileFor, loc, t } from "./lib/render.mjs";
import { DIST, loadData } from "./lib/load-data.mjs";
import { checkLinks } from "./lib/verify.mjs";

const { profile, resume, projects, strings } = loadData();

const isTodo = (v) => v === "TODO(owner)";

// ------------------------------------------------------------------ private
//
// `--private-email <addr>` renders a personal copy that carries a real address
// and writes it OUTSIDE dist/, so it can never be published by a deploy.
// The public sheet deliberately has no plaintext email on it.

const flag = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : null;
};

const PRIVATE_EMAIL = flag("--private-email");
const OUT = PRIVATE_EMAIL
  ? path.resolve(flag("--out") || path.join(os.homedir(), "Documents", "CV"))
  : DIST;

if (!PRIVATE_EMAIL && !fs.existsSync(DIST)) {
  throw new BuildError("dist/ does not exist. Run `node scripts/build.mjs` first.");
}
if (PRIVATE_EMAIL && !/^[^@\s]+@[^@\s]+$/.test(PRIVATE_EMAIL)) {
  throw new BuildError(`--private-email is not an address: ${PRIVATE_EMAIL}`);
}

// A private sheet is opened straight off the disk, where "/assets/..." resolves
// to the filesystem root and the stylesheet silently 404s. Inline it so the file
// is self-contained and prints the same anywhere.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STYLE_TAG = PRIVATE_EMAIL
  ? `<style>\n${fs.readFileSync(path.join(ROOT, "assets", "cv-print.css"), "utf8")}</style>`
  : `<link rel="stylesheet" href="/assets/cv-print.css">`;

function dateRange(lang, { start, end }) {
  const from = isTodo(start) ? "" : start;
  if (from && end === from) return from; // a single-month entry is not a range
  const parts = [];
  if (from) parts.push(from);
  if (end === "present") parts.push(t(strings, "cv.present", lang));
  else if (isTodo(end)) parts.push(t(strings, "cv.expected", lang));
  else if (end) parts.push(end);
  return parts.join(" — ");
}

function contactLine(lang) {
  const parts = [];
  if (PRIVATE_EMAIL) parts.push(`Email: ${PRIVATE_EMAIL}`);
  for (const l of profile.links) parts.push(`${loc(l.label, lang)}: ${l.url}`);
  return parts.join(" · ");
}

// ------------------------------------------------------------------ markdown

function markdown(lang) {
  const L = [];
  const push = (...lines) => L.push(...lines);

  push(`# ${loc(profile.name, lang)}`, "");
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
    const meta = [dateRange(lang, e), loc(e.location, lang)];
    if (e.result && !isTodo(e.result)) meta.push(e.result);
    push(meta.join(" · "), "");
    push(loc(e.summary, lang), "");
    if (e.highlights?.length) {
      for (const h of e.highlights) push(`- ${loc(h, lang)}`);
      push("");
    }
    if (e.link) push(`[${loc(e.link.label, lang)}](${e.link.url})`, "");
  }

  if (resume.awards.length) {
    push(`## ${t(strings, "cv.awards", lang)}`, "");
    for (const a of resume.awards) {
      push(`### ${loc(a.title, lang)}`, "");
      const meta = [loc(a.org, lang), a.year];
      if (!isTodo(a.result)) meta.push(a.result);
      push(meta.join(" · "), "");
      push(loc(a.summary, lang), "");
    }
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
        <p class="meta">${esc(
          [dateRange(lang, e), loc(e.location, lang), e.result && !isTodo(e.result) ? e.result : ""]
            .filter(Boolean)
            .join(" · "),
        )}</p>
        <p>${esc(loc(e.summary, lang))}</p>
        ${e.highlights?.length ? `<ul>${li(e.highlights)}</ul>` : ""}
        ${
          e.link
            ? `<p class="meta link"><a href="${esc(e.link.url)}" rel="noopener">${esc(
                loc(e.link.label, lang),
              )}</a></p>`
            : ""
        }
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

  const contacts = [
    PRIVATE_EMAIL ? `<a href="mailto:${esc(PRIVATE_EMAIL)}">${esc(PRIVATE_EMAIL)}</a>` : "",
    ...profile.links.map(
      (l) => `<a href="${esc(l.url)}" rel="noopener">${esc(loc(l.label, lang))}</a>`,
    ),
  ]
    .filter(Boolean)
    .join(" · ");

  const langLinks = LANGS.map(
    (l) =>
      `<a href="/cv/${l.code}.html" hreflang="${l.htmlLang}"${
        l.code === lang ? ' aria-current="true"' : ""
      }>${l.code}</a>`,
  ).join("");

  // The site's nav bar points at routes that do not exist next to a local file.
  const printBar = PRIVATE_EMAIL
    ? ""
    : `
  <div class="print-bar">
    <a href="/${meta.dir ? meta.dir + "/" : ""}cv/">← ${esc(t(strings, "nav.cv", lang))}</a>
    <span class="spacer"></span>
    <span>${langLinks}</span>
    <button type="button" onclick="window.print()">${esc(
      t(strings, "cv.printButton", lang),
    )}</button>
  </div>`;

  return `<!doctype html>
<html lang="${meta.htmlLang}" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(headline)}</title>
<meta name="description" content="${esc(loc(profile.tagline, lang))}">
<meta name="robots" content="noindex">
${STYLE_TAG}
</head>
<body>
<div class="sheet">
${printBar}

  <header class="cv-head">
    <h1>${esc(loc(profile.name, lang))}</h1>
    <p class="headline">${esc(loc(profile.headline, lang))}</p>
    <p class="contact-line">${esc(loc(profile.location, lang))} · ${contacts}</p>
  </header>

  <p class="summary">${esc(loc(profile.bio[0], lang))}</p>

  <h2>${esc(t(strings, "cv.education", lang))}</h2>
  ${education}

  <h2>${esc(t(strings, "cv.experience", lang))}</h2>
  ${experience}

  ${
    resume.awards.length
      ? `<h2>${esc(t(strings, "cv.awards", lang))}</h2>
  ${awards}`
      : ""
  }

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

const OUT_CV = PRIVATE_EMAIL ? OUT : path.join(DIST, "cv");
fs.mkdirSync(OUT_CV, { recursive: true });

for (const { code } of LANGS) {
  fs.writeFileSync(path.join(OUT_CV, `${code}.md`), markdown(code));
  fs.writeFileSync(path.join(OUT_CV, `${code}.html`), printHtml(code));
}

if (PRIVATE_EMAIL) {
  // A personal copy lives outside the build tree on purpose: nothing in dist/
  // may carry a plaintext address, and `--out` is not reachable from a deploy.
  console.log(
    `Wrote ${LANGS.length * 2} private CV files to ${OUT_CV} (email: ${PRIVATE_EMAIL})`,
  );
  process.exit(0);
}

// The CV documents complete the link graph, so the full internal check runs here.
const generatedSet = new Set(["404.html"]);
for (const { code } of LANGS) {
  generatedSet.add(fileFor(code, ""));
  generatedSet.add(fileFor(code, "cv/"));
  generatedSet.add(fileFor(code, "projects/"));
  generatedSet.add(fileFor(code, "hire/"));
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
