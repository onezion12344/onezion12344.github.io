/** Internal link and noindex verification over dist/. */

import fs from "node:fs";
import path from "node:path";

export function collectHtml(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectHtml(full, acc);
    else if (entry.name.endsWith(".html")) acc.push(full);
  }
  return acc;
}

function exists(target) {
  if (fs.existsSync(target) && fs.statSync(target).isFile()) return true;
  if (fs.existsSync(path.join(target, "index.html"))) return true;
  if (fs.existsSync(`${target}.html`)) return true;
  return false;
}

function resolves(dist, fromFile, href) {
  const clean = href.split("#")[0].split("?")[0];
  if (!clean) return true;
  if (/^(https?:|mailto:|tel:|data:|javascript:)/i.test(clean)) return true;
  const target = clean.startsWith("/")
    ? path.join(dist, clean)
    : path.join(dist, path.dirname(fromFile), clean);
  return exists(target);
}

/**
 * @param {object} options
 * @param {string} options.dist
 * @param {Set<string>} options.generated relative paths produced this run
 * @param {RegExp[]} options.ignore hrefs expected to appear after a later step
 */
export function checkLinks({ dist, generated, ignore = [] }) {
  const fails = [];
  const legacyWarns = [];
  for (const abs of collectHtml(dist)) {
    const rel = path.relative(dist, abs);
    const html = fs.readFileSync(abs, "utf8");
    const isGenerated = generated.has(rel);
    for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const href = m[1];
      if (ignore.some((re) => re.test(href))) continue;
      if (resolves(dist, rel, href)) continue;
      (isGenerated ? fails : legacyWarns).push(`${rel} → ${href}`);
    }
  }
  return { fails, legacyWarns };
}

export function checkNoindex(dist, files) {
  return files.filter((rel) => {
    const abs = path.join(dist, rel);
    if (!fs.existsSync(abs)) return true;
    return !/name="robots"[^>]*noindex/i.test(fs.readFileSync(abs, "utf8"));
  });
}
