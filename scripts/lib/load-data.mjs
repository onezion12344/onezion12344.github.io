/** Shared data loading for build.mjs and cv.mjs. */

import fs from "node:fs";
import path from "node:path";

import { addSimplified } from "./hant-to-hans.mjs";
import { BuildError } from "./render.mjs";

export const ROOT = path.resolve(import.meta.dirname, "../..");
export const DATA = path.join(ROOT, "data");
export const DIST = path.join(ROOT, "dist");

function readJson(name) {
  const raw = fs.readFileSync(path.join(DATA, name), "utf8");
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new BuildError(`data/${name} is not valid JSON: ${err.message}`);
  }
}

function collectTodos(value, where, sink) {
  if (typeof value === "string") {
    if (value === "TODO(owner)") sink.push(where);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => collectTodos(v, `${where}[${i}]`, sink));
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) collectTodos(v, `${where}.${k}`, sink);
  }
}

export function loadData() {
  const problems = [];
  const todos = [];

  const profile = addSimplified(readJson("profile.json"), "profile", problems);
  const resume = addSimplified(readJson("resume.json"), "resume", problems);
  const projects = addSimplified(readJson("projects.json"), "projects", problems);
  const i18n = addSimplified(readJson("i18n.json"), "i18n", problems);

  if (problems.length) {
    throw new BuildError(
      `Simplified Chinese conversion failed:\n  ${problems.join("\n  ")}`,
    );
  }

  collectTodos(profile, "profile", todos);
  collectTodos(resume, "resume", todos);
  collectTodos(projects, "projects", todos);

  const seen = new Set();
  const duplicateIds = [];
  for (const p of projects) {
    if (seen.has(p.slug)) duplicateIds.push(p.slug);
    seen.add(p.slug);
  }
  if (duplicateIds.length) {
    throw new BuildError(`Duplicate project slug(s): ${duplicateIds.join(", ")}`);
  }

  return { profile, resume, projects, strings: i18n.strings, reviewed: i18n.reviewed, todos };
}
