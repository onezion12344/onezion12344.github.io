#!/usr/bin/env node
/**
 * Cover art for projects that have no rendered clip.
 *
 * These are NOT screenshots and the site must never present them as such. A
 * project with a storyboard gets a real still from its own composition; a
 * project without one gets a typographic cover derived from its own title and
 * tags, so the index reads as a grid of things rather than a list with holes.
 *
 * Deterministic on purpose: the same slug always produces the same cover, so a
 * rebuild never churns the diff. Run after editing data/projects.json:
 *
 *   node scripts/covers.mjs
 *
 * build.mjs fails if a project has neither a poster nor a cover, so a new
 * project cannot ship a blank tile by accident.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "assets", "covers");
const W = 640;
const H = 360;

const projects = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data", "projects.json"), "utf8"),
);

// FNV-1a. Small, stable, and enough to spread the motifs.
function hash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Greedy wrap on an approximate character budget. Titles here are short enough
// that a real text-measure pass would be more machinery than it is worth.
function wrap(text, perLine) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    if (!line) line = w;
    else if ((line + " " + w).length <= perLine) line += " " + w;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Six motifs, chosen by slug hash, each further varied by seed. Drawn bold on
// purpose: these are read at 132px wide in the index rows, where anything
// thinner than ~6 units in this viewBox disappears. Each one owns the right
// half and leaves the left for type.
function motif(kind, seed) {
  const ink = "#4a4a4e";
  const accent = "#f2f2f2";
  const cx = 470;
  const cy = 180;
  const jitter = (k) => hash(`${seed}:${k}`);

  if (kind === 0) {
    const rings = [];
    const base = 40 + (jitter("r") % 16);
    const accentAt = jitter("a") % 4;
    const count = 3 + (jitter("n") % 2);
    for (let i = 0; i < count; i += 1) {
      rings.push(
        `<circle cx="${cx}" cy="${cy}" r="${base + i * 32}" fill="none" stroke="${i === accentAt ? accent : ink}" stroke-width="${i === accentAt ? 7 : 5}" opacity="${i === accentAt ? 0.95 : 0.7}"/>`,
      );
    }
    return rings.join("");
  }

  if (kind === 1) {
    const bars = [];
    const n = 6 + (jitter("n") % 3);
    for (let i = 0; i < n; i += 1) {
      const h = 60 + (jitter(`h${i}`) % 190);
      const on = jitter(`on${i}`) % 5 === 0;
      bars.push(
        `<rect x="${330 + i * (250 / n)}" y="${cy + 110 - h}" width="${Math.round(260 / n) - 14}" height="${h}" fill="${on ? accent : ink}" opacity="${on ? 0.95 : 0.8}"/>`,
      );
    }
    return bars.join("");
  }

  if (kind === 2) {
    const cells = [];
    const step = 56 + (jitter("s") % 3) * 6;
    const accentAt = jitter("a") % 16;
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 4; c += 1) {
        const idx = r * 4 + c;
        if (jitter(`${r}:${c}`) % 3 !== 0) continue;
        cells.push(
          `<rect x="${330 + c * step}" y="${60 + r * step}" width="${step - 16}" height="${step - 16}" fill="${idx === accentAt ? accent : ink}" opacity="0.9"/>`,
        );
      }
    }
    return cells.join("");
  }

  if (kind === 3) {
    const diag = [];
    const n = 5 + (jitter("n") % 3);
    const accentAt = jitter("a") % n;
    const skew = 90 + (jitter("k") % 90);
    for (let i = 0; i < n; i += 1) {
      diag.push(
        `<path d="M${330 + i * 40} 320 L${330 + i * 40 + skew} 40" stroke="${i === accentAt ? accent : ink}" stroke-width="${i === accentAt ? 8 : 6}" opacity="0.85"/>`,
      );
    }
    return diag.join("");
  }

  if (kind === 4) {
    const dots = [];
    const step = 52 + (jitter("s") % 3) * 8;
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 3; c += 1) {
        const on = jitter(`${r}:${c}`) % 3 === 0;
        dots.push(
          `<circle cx="${360 + c * step}" cy="${80 + r * step}" r="${on ? 22 : 12}" fill="${on ? accent : ink}" opacity="${on ? 0.95 : 0.75}"/>`,
        );
      }
    }
    return dots.join("");
  }

  const rows = [];
  const n = 5 + (jitter("n") % 3);
  for (let i = 0; i < n; i += 1) {
    const w = 90 + (jitter(`w${i}`) % 180);
    const on = jitter(`on${i}`) % 4 === 0;
    rows.push(
      `<rect x="330" y="${70 + i * 42}" width="${w}" height="${on ? 18 : 10}" fill="${on ? accent : ink}" opacity="${on ? 0.95 : 0.8}"/>`,
    );
  }
  return rows.join("");
}

function cover(project) {
  const seed = hash(project.slug);
  const kind = seed % 6;
  const title = project.title?.en ?? project.slug;
  const tags = (project.tags ?? []).slice(0, 3).join(" · ").toLowerCase();
  const lines = wrap(title, 15);
  const startY = 190 - (lines.length - 1) * 34;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(title)} — cover">
  <rect width="${W}" height="${H}" fill="#0b0b0c"/>
  <g>${motif(kind, project.slug)}</g>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="#2c2c2f"/>
  <text x="40" y="52" fill="#747477" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="15" letter-spacing="2">${project.year}${project.status ? " · " + esc(project.status) : ""}</text>
  <rect x="40" y="${startY - 70}" width="44" height="3" fill="#f2f2f2"/>
${lines
  .map(
    (l, i) =>
      `<text x="40" y="${startY + i * 34}" fill="#f2f2f2" font-family="ui-serif, Iowan Old Style, Palatino, Georgia, serif" font-size="30">${esc(l)}</text>`,
  )
  .join("\n")}
  <text x="40" y="${H - 44}" fill="#a3a3a6" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" letter-spacing="1.5">${esc(tags)}</text>
</svg>
`;
}

fs.mkdirSync(OUT, { recursive: true });

// A project that later gains a real still must not leave its cover behind:
// an orphaned file in assets/ is a lie waiting to be picked up again.
const wanted = new Set(
  projects.filter((p) => !p.media?.poster).map((p) => `${p.slug}.svg`),
);
let pruned = 0;
for (const name of fs.readdirSync(OUT)) {
  if (!wanted.has(name)) {
    fs.unlinkSync(path.join(OUT, name));
    pruned += 1;
  }
}

let wrote = 0;
for (const p of projects) {
  if (p.media?.poster) continue; // a real still already exists
  const file = path.join(OUT, `${p.slug}.svg`);
  const svg = cover(p);
  const prev = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (prev !== svg) {
    fs.writeFileSync(file, svg);
    wrote += 1;
  }
}
console.log(
  `Covers: ${wrote} written, ${pruned} pruned, ${wanted.size} projects without a still.`,
);
