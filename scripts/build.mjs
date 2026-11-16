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

const { profile, resume, projects, hire, strings, reviewed, todos } = loadData();

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

// The landing page stopped rendering the full stack and the "now" list — both
// live on the CV and the project hub now — so their renderers went with them.

// A project shows a still from its own clip when it has one, and a generated
// cover when it does not. Failing loudly beats shipping a blank tile.
function posterFor(project) {
  if (project.media?.poster) return project.media.poster;
  const rel = `assets/covers/${project.slug}.svg`;
  if (!fs.existsSync(path.join(ROOT, rel))) {
    throw new BuildError(
      `No still and no cover for "${project.slug}". Run: node scripts/covers.mjs`,
    );
  }
  return `/${rel}`;
}

function featuredCard(project, lang) {
  const href = urlFor(lang, `projects/${project.slug}/`);
  const poster = `<img src="${esc(posterFor(project))}" width="640" height="360" loading="lazy" alt="">`;
  return `<a class="card work-card" href="${esc(href)}">
          ${poster}
          <span class="work-year">${project.year}</span>
          <h3>${esc(loc(project.title, lang))}</h3>
          <p>${esc(loc(project.summary, lang))}</p>
          <p class="chips">${tagChips(project.tags)} ${statusBadge(strings, lang, project)}</p>
        </a>`;
}

function projectRow(project, lang) {
  const thumb = `<span class="row-thumb"><img src="${esc(posterFor(project))}" width="256" height="144" loading="lazy" decoding="async" alt=""></span>`;
  return `<li class="row">
          <a class="row-link" href="${esc(urlFor(lang, `projects/${project.slug}/`))}">
            ${thumb}
            <span class="row-body">
              <span class="row-head">
                <span class="row-year">${project.year}</span>
                <span class="row-title">${esc(loc(project.title, lang))}</span>
              </span>
              <span class="row-role">${esc(loc(project.role, lang))}</span>
              <span class="row-sum">${esc(loc(project.summary, lang))}</span>
              <span class="row-tags">${tagChips(project.tags)}</span>
            </span>
            <span class="row-side">${statusBadge(strings, lang, project)}</span>
          </a>
        </li>`;
}

// A still, not a clip: the promo videos are gone from the site, but the frame
// each project was represented by is still the honest thing to show at the top
// of its page.
function stillBlock(project, lang) {
  const m = project.media;
  if (!m?.poster) return "";
  return `<figure class="still">
        <img src="${esc(m.poster)}" width="${m.width ?? 1280}" height="${
          m.height ?? 720
        }" loading="lazy" decoding="async" alt="${esc(loc(project.title, lang))}">
      </figure>`;
}

function entryMeta(lang, { start, end, endLabel, expectedEnd, location, result }) {
  const parts = [];
  const from = isTodo(start) ? "" : start;
  const sameMonth = from && end === from;
  if (from) parts.push(from);
  if (sameMonth) {
    // a single-month entry is not a range
  } else if (end === "present") parts.push(t(strings, "cv.present", lang));
  else if (isTodo(end)) parts.push(t(strings, "cv.expected", lang));
  else if (end) parts.push(expectedEnd ? `${end} (${t(strings, "cv.expected", lang)})` : end);
  if (location) parts.push(loc(location, lang));
  if (result && !isTodo(result)) parts.push(result);
  return parts.join(" · ");
}

// --------------------------------------------------------------------- pages

function renderHome(lang) {
  const meta = metaFor(lang, "home");
  const featured = projects.filter((p) => p.featured);
  if (featured.length !== 4) {
    throw new BuildError(`Expected exactly 4 featured projects, found ${featured.length}`);
  }
  const contacts = [
    profile.email
      ? `<li><a href="mailto:${esc(profile.email)}"><span class="contact-name">${esc(
          t(strings, "contacts.email", lang),
        )}</span><span class="contact-handle">${esc(profile.email)}</span></a></li>`
      : "",
    ...profile.links.map(
      (l) => `<li><a href="${esc(l.url)}" rel="me noopener"><span class="contact-name">${esc(
        loc(l.label, lang),
      )}</span><span class="contact-handle">${esc(l.handle)}</span></a></li>`,
    ),
  ]
    .filter(Boolean)
    .join("\n          ");

  // A landing page, not a second index: one paragraph and three ways out. The
  // depth lives on the pages this one points at.
  const routes = [
    { path: "projects/", label: t(strings, "nav.projects", lang), solid: true },
    { path: "cv/", label: t(strings, "nav.cv", lang), solid: false },
    { path: "hire/", label: t(strings, "nav.hire", lang), solid: false },
  ];

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
        <p class="lede">${esc(loc(profile.bio[0], lang))} ${esc(loc(profile.bio[1], lang))}</p>
        <nav class="home-routes" aria-label="${esc(t(strings, "home.routesLabel", lang))}">
          ${routes
            .map(
              (r) =>
                `<a class="btn${r.solid ? " btn-solid" : ""}" href="${esc(
                  urlFor(lang, r.path),
                )}">${esc(r.label)} →</a>`,
            )
            .join("\n          ")}
        </nav>
      </div>
    </section>

    <section class="section" id="flagship">
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

    <section class="section" id="contacts">
      <div class="wrap">
        ${marker(strings, "section.contacts", lang)}
        <p class="section-note">${esc(t(strings, "contacts.note", lang))}</p>
        <ul class="contacts">
          ${contacts}
        </ul>
        <div class="hire-cta">
          <h3>${esc(t(strings, "home.hireHeading", lang))}</h3>
          <p>${esc(t(strings, "home.hireBody", lang))}</p>
          <p class="more"><a class="btn" href="${esc(
            urlFor(lang, "hire/"),
          )}">${esc(t(strings, "home.hireCta", lang))} →</a></p>
        </div>
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
      const programmes = (e.programmes ?? []).map((p) => esc(loc(p, lang))).join("<br>");
      const highlights = e.highlights?.length
        ? `<ul>${e.highlights.map((h) => `<li>${esc(loc(h, lang))}</li>`).join("")}</ul>`
        : "";
      const link = e.link
        ? `<p class="entry-note"><a href="${esc(e.link.url)}" rel="noopener">${esc(loc(e.link.label, lang))}</a></p>`
        : "";
      return `<article class="entry">
          <h3>${esc(loc(e.org, lang))}${
            e.title ? ` <span class="org">· ${esc(loc(e.title, lang))}</span>` : ""
          }</h3>
          <p class="entry-meta">${esc(entryMeta(lang, e))}</p>
          ${programmes ? `<p class="entry-title">${programmes}</p>` : ""}
          <p>${esc(loc(e.summary, lang))}</p>
          ${highlights}
          ${link}
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
          ${
            e.link
              ? `<p class="entry-link"><a href="${esc(e.link.url)}" rel="noopener">${esc(
                  loc(e.link.label, lang),
                )}</a></p>`
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
${
  resume.awards.length
    ? `
        <h2 class="marker"><span class="hash" aria-hidden="true">#</span>${esc(t(strings, "cv.awards", lang))}</h2>
        ${awards}
`
    : ""
}

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

const GROUP_ORDER = ["flagship", "internship", "personal"];

function projectIndexGroups(lang) {
  return GROUP_ORDER.map((key) => ({
    key,
    items: projects
      .filter((p) => (p.group || "personal") === key)
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)),
  }))
    .filter((g) => g.items.length)
    .map(
      ({ key, items }) => `<h2 class="marker group-head"><span class="hash" aria-hidden="true">#</span>${esc(
        t(strings, `projects.group.${key}`, lang),
      )}<span class="group-count">${items.length}</span></h2>
        <ul class="rows">
        ${items.map((p) => projectRow(p, lang)).join("\n        ")}
        </ul>`,
    )
    .join("\n        ");
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
        <p class="section-note">${esc(t(strings, "projects.hubNote", lang))}</p>
        ${projectIndexGroups(lang)}
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
        ${stillBlock(project, lang)}
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
          <ul class="highlight-list">${project.highlights
            .map((h) => `<li class="highlight"><p>${esc(loc(h, lang))}</p></li>`)
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
    path: `projects/${project.slug}/`,
  });
}

const HIRE_SCRIPT = `<script>(function(){var b=document.querySelector("[data-copy]");if(!b)return;var el=document.getElementById(b.getAttribute("data-copy"));if(!el)return;var label=b.textContent;b.addEventListener("click",function(){var done=function(){b.textContent=b.getAttribute("data-copied-label")||label;setTimeout(function(){b.textContent=label},2000);};if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(el.textContent).then(done,function(){done()})}else{var r=document.createRange();r.selectNodeContents(el);var s=getSelection();s.removeAllRanges();s.addRange(r);done()}})})();</script>`;

function sectionHeading(label) {
  return `<h2 class="marker"><span class="hash" aria-hidden="true">#</span>${esc(label)}</h2>`;
}

function offerCard(o, lang) {
  return `<li class="offer card">
          <div class="offer-head">
            <h3>${esc(loc(o.title, lang))}</h3>
            <p class="offer-price">${esc(o.price)}</p>
          </div>
          <p class="offer-days">${esc(loc(o.days, lang))}</p>
          <p class="done"><span class="done-label">${esc(
            t(strings, "hire.doneLabel", lang),
          )}</span> ${esc(loc(o.done, lang))}</p>
          <ul class="offer-list">
            ${o.items.map((i) => `<li>${esc(loc(i, lang))}</li>`).join("\n            ")}
          </ul>
        </li>`;
}

function renderHire(lang) {
  const meta = metaFor(lang, "hire");
  if (!profile.email) {
    throw new BuildError("profile.email is empty; the hire page needs an address to send to");
  }
  const mailto = `mailto:${profile.email}?subject=${encodeURIComponent(loc(hire.emailSubject, lang))}`;

  const stats = hire.stats
    .map((s) => `<div><dt>${esc(loc(s.label, lang))}</dt><dd>${esc(loc(s.value, lang))}</dd></div>`)
    .join("\n          ");

  const jump = hire.jump
    .map((j) => `<a href="#${esc(j.id)}">${esc(loc(j.label, lang))}</a>`)
    .join("");

  const offers = hire.offers.map((o) => offerCard(o, lang)).join("\n        ");
  const build = hire.build.map((o) => offerCard(o, lang)).join("\n        ");

  const steps = hire.steps
    .map(
      (s, i) => `<li class="step">
          <span class="step-n" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>
          <div class="step-body">
            <h3>${esc(loc(s.title, lang))}</h3>
            <p>${esc(loc(s.body, lang))}</p>
          </div>
        </li>`,
    )
    .join("\n        ");

  const checks = hire.briefChecks.map((c) => `<li>${esc(loc(c, lang))}</li>`).join("\n          ");
  const template = loc(hire.briefTemplate, lang);

  const terms = hire.terms
    .map(
      (term) => `<div class="term">
          <dt>${esc(loc(term.label, lang))}</dt>
          <dd>${esc(loc(term.value, lang))}</dd>
        </div>`,
    )
    .join("\n          ");

  const proof = hire.proof
    .map(
      (p) => `<a class="card proof-card" href="${esc(urlFor(lang, `projects/${p.slug}/`))}">
          <h3>${esc(p.title)}</h3>
          <p>${esc(loc(p.note, lang))}</p>
        </a>`,
    )
    .join("\n        ");

  const faq = hire.faq
    .map(
      (f) => `<details class="faq-item">
          <summary>${esc(loc(f.q, lang))}</summary>
          <p>${esc(loc(f.a, lang))}</p>
        </details>`,
    )
    .join("\n        ");

  const biggerPrices = hire.bigger.prices
    .map((p) => `<li>${esc(loc(p, lang))}</li>`)
    .join("");

  const body = `<section class="section hire-hero">
      <div class="wrap">
        <p class="eyebrow">${esc(loc(hire.eyebrow, lang))}</p>
        <h1>${esc(loc(hire.heading, lang))}</h1>
        <p class="lede">${esc(loc(hire.lede, lang))}</p>
        <dl class="hire-stats">
          ${stats}
        </dl>
        <nav class="jump" aria-label="${esc(t(strings, "nav.hire", lang))}">${jump}</nav>
      </div>
    </section>

    <section class="section" id="offers">
      <div class="wrap-wide">
        ${sectionHeading(loc(hire.offersHeading, lang))}
        <p class="section-note">${esc(loc(hire.offersNote, lang))}</p>
        <ul class="offers">
        ${offers}
        </ul>
        <p class="price-note">${esc(loc(hire.priceNote, lang))}</p>

        <h2 class="marker build-head"><span class="hash" aria-hidden="true">#</span>${esc(
          loc(hire.buildHeading, lang),
        )}</h2>
        <p class="section-note">${esc(loc(hire.buildNote, lang))}</p>
        <ul class="offers offers-build">
        ${build}
        </ul>

        <div class="bigger">
          <h3>${esc(loc(hire.bigger.title, lang))}</h3>
          <p>${esc(loc(hire.bigger.body, lang))}</p>
          <ul class="bigger-prices">${biggerPrices}</ul>
          <p class="section-note">${esc(loc(hire.bigger.note, lang))}</p>
        </div>
      </div>
    </section>

    <section class="section" id="steps">
      <div class="wrap">
        ${sectionHeading(loc(hire.stepsHeading, lang))}
        <p class="section-note">${esc(loc(hire.stepsNote, lang))}</p>
        <ol class="steps">
        ${steps}
        </ol>
      </div>
    </section>

    <section class="section" id="brief">
      <div class="wrap">
        ${sectionHeading(loc(hire.briefHeading, lang))}
        <p class="section-note">${esc(loc(hire.briefNote, lang))}</p>
        <div class="brief-grid">
          <ul class="checks">
          ${checks}
          </ul>
          <div class="template">
            <pre id="brief-text">${esc(template)}</pre>
            <button type="button" class="btn" data-copy="brief-text" data-copied-label="${esc(
              loc(hire.copiedLabel, lang),
            )}">${esc(loc(hire.copyLabel, lang))}</button>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="terms">
      <div class="wrap">
        ${sectionHeading(loc(hire.termsHeading, lang))}
        <p class="section-note">${esc(loc(hire.termsNote, lang))}</p>
        <dl class="terms">
          ${terms}
        </dl>
      </div>
    </section>

    <section class="section" id="proof">
      <div class="wrap-wide">
        ${sectionHeading(loc(hire.proofHeading, lang))}
        <p class="section-note">${esc(loc(hire.proofNote, lang))}</p>
        <div class="proof-grid">
        ${proof}
        </div>
        <p class="more"><a class="btn" href="${esc(
          urlFor(lang, "projects/"),
        )}">${esc(loc(hire.projectsMore, lang))} →</a></p>
      </div>
    </section>

    <section class="section" id="faq">
      <div class="wrap">
        ${sectionHeading(loc(hire.faqHeading, lang))}
        <p class="section-note">${esc(loc(hire.faqNote, lang))}</p>
        <div class="faq">
        ${faq}
        </div>
      </div>
    </section>

    <section class="section hire-contact" id="contact">
      <div class="wrap">
        ${sectionHeading(loc(hire.contactHeading, lang))}
        <p class="lede">${esc(loc(hire.contactNote, lang))}</p>
        <p class="formats">
          <a class="btn btn-solid" href="${esc(mailto)}">${esc(
            t(strings, "hire.emailCta", lang),
          )} →</a>
          <a class="btn" href="${esc(urlFor(lang, "projects/"))}">${esc(
            t(strings, "projects.heading", lang),
          )} →</a>
        </p>
        <p class="section-note">${esc(profile.email)}</p>
      </div>
    </section>`;

  return page({
    lang,
    path: "hire/",
    title: meta.title,
    description: meta.description,
    body,
    strings,
    profile,
    reviewed,
    extraScript: HIRE_SCRIPT,
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
    urls.push(canonical(lang.code, "hire/"));
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
    ["hire/", renderHire(lang)],
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
