# Personal site rebuild — specification

- Date: 2026-11-06
- Owner: Harry Huang (`onezion12344`)
- Repository: `onezion12344/onezion12344.github.io` (GitHub Pages, branch `main`)
- Status: implementation specification; owner reviews a local preview before publish.

## 1. Goal

Turn the repository from a single AdventureX builder-profile page into a personal site
with two top-level sections — **Portfolio (CV)** and **Projects** — backed by `data/` as
the single source of truth, from which a CV is generated. Every legacy URL keeps working.

Non-goals: blogging engine, CMS, comments, analytics, client-side framework, runtime
services, any `/adv-x/` archive.

## 2. Constraints

| Constraint | Decision |
| --- | --- |
| Output | Static files only, published as a GitHub Pages artifact. |
| Runtime dependencies | **Zero.** Generated pages ship no framework, no bundler, no polyfill, no third-party request. One inline theme script (~350 B). |
| Build dependencies | **Zero.** Node 22+, `node:fs`, `node:path`, `node:url` only. No npm install step. |
| CSS | Hand-written. `assets/tokens.css` copied from Personal OS `tokens.css` and extended in `assets/site.css`. No Tailwind. |
| Languages | `en`, `zh-Hant`, `zh-Hans`. |
| Privacy | No e-mail in v1 (`email: null`). No phone, address, student ID, grades. No analytics, cookies, or third-party fetches. |
| Legacy | Legacy pages are copied verbatim into `dist/`; only a `<meta name="robots" content="noindex">` line is added to the personal-document pages listed in §9. |
| Deployment | GitHub Actions on push to `main`: build → upload Pages artifact → deploy. Pages source becomes "GitHub Actions". |

## 3. Information architecture

```
/                          Home: # about · # now · # work (4 featured) · # projects (all) · # contacts
/cv/                       Portfolio (CV), human-readable, print-friendly
/projects/                 Project index (all projects)
/projects/<slug>/          One page per project, with its demo video where recorded
/zh-hant/…                 Full mirror of every generated page
/zh-hans/…                 Full mirror of every generated page
/404.html                  Not found, full-size illustration
/cv/<lang>.md              ATS-friendly CV (markdown)
/cv/<lang>.html            A4 CV for browser → PDF
/sitemap.xml               Generated pages only
/robots.txt                Points at the sitemap
```

Language roots: `en` → `/`, `zh-Hant` → `/zh-hant/`, `zh-Hans` → `/zh-hans/`.
Every generated page carries a canonical URL, `hreflang` alternates for `en`,
`zh-Hant`, `zh-Hans`, and `x-default` → `en`, plus three plain links in a language
switcher that points at the equivalent path (no JS-only switching).

## 4. Data model

All human-readable strings are objects `{"en": …, "zh-Hant": …, "zh-Hans": …}`.
`zh-Hant` is the authoring language for Chinese (Hong Kong vocabulary: 影片, 軟件,
資料). `zh-Hans` is **derived at build time by conversion** from `zh-Hant` and is
recorded as unreviewed until the owner checks it (§7).

### `data/profile.json`

```jsonc
{
  "name": {…},           // display name
  "nameRomanized": {…},  // Latin form used in meta/OG
  "headline": {…},       // one line, e.g. "AI & Data Science, HKU"
  "location": {…},
  "email": null,         // privacy: no e-mail in v1
  "photo": "/assets/onezion.png",
  "bio": [ {…}, … ],     // 2–3 prose paragraphs
  "now": [ {…}, … ],     // current work, prose
  "links": [ { "id": "github", "label": {…}, "url": "…" } ],
  "stack": [ { "group": {…}, "items": ["…"] } ]
}
```

### `data/resume.json`

`education[]`, `experience[]`, `awards[]`, `skills[]`, `languages[]`,
`certifications[]`. Every entry carries `start`, `end` (or `present`), `title`,
`org`, `location`, and a `summary` or `highlights[]` as localized strings.
Unverified fields are the literal string `"TODO(owner)"` and are listed in the report.

### `data/projects.json`

```jsonc
{
  "id": "wewrites",
  "slug": "we-writes",
  "year": 2026,
  "title": {…},
  "role": {…},
  "status": "live",                  // live | local | archived
  "visibility": "public",            // public | private-local
  "featured": true,
  "tags": ["Next.js", "AI"],
  "links": [{ "label": {…}, "url": "…" }],
  "summary": {…},                    // index card
  "what": {…},                       // what it is
  "why": {…},                        // why it exists
  "challenge": {…},                  // hardest part
  "highlights": [ {…} ],
  "evidence": [ {…} ],               // measured facts with a source date
  "video": "assets/video/<slug>.mp4",
  "poster": "assets/video/<slug>.jpg"
}
```

Video slots exist for exactly four projects: WeWrites, MacClosedAwake, Double-Check,
Personal OS. Personal OS is `private-local`, recorded from `127.0.0.1:18871`, and
carries no public URL.

### `data/i18n.json`

UI strings for all three languages plus per-language review status. Missing key or
missing language value is a build error — the build never emits `undefined`.

## 5. Generated page structure

Shared shell (all pages):

- `<!doctype html>`, `lang` attribute matching the page language, `dir="ltr"`.
- `<head>`: charset, viewport, `<title>`, unique `<meta name="description">`,
  canonical, hreflang alternates, Open Graph (`og:title`, `og:description`,
  `og:image`, `og:url`, `og:type`, `og:locale`), Twitter card
  (`summary_large_image`), theme colour, `assets/tokens.css` + `assets/site.css`,
  inline theme bootstrap (reads `localStorage`, else `prefers-color-scheme`).
- Header: site name (mono, small caps), nav to `#work`-equivalent sections on Home
  and to `cv/` / `projects/`, language switcher, theme toggle button.
- Footer: name, location, links, copyright year, unreviewed-translation note on
  `zh-Hans`, link back to Home.

Home sections:

1. `#about` — illustration avatar (96–120 px), name, headline, prose bio, stack line.
2. `#now` — a short dated list of what is being worked on now.
3. `#work` — four featured project cards with poster stills, linking to project pages.
4. `#projects` — the full index (compact rows: year, title, role, tags, status).
5. `#contacts` — plain list: GitHub, LinkedIn, X. No `mailto:` while `email` is null.

`/cv/` renders `resume.json` as prose-first HTML with print styles, links to the
printable CV (`/cv/<lang>.html`) and the markdown CV (`/cv/<lang>.md`).

Project pages render `what`, `why`, `challenge`, `highlights`, `evidence`, links,
video (when present), and prev/next navigation.

## 6. Build pipeline

`node scripts/build.mjs`

1. Read and validate `data/*.json`: every localized field must have all three
   languages; `zh-Hans` must be absent in source (it is derived).
2. Convert every `zh-Hant` string to `zh-Hans` with `scripts/lib/hant-to-hans.mjs`
   (phrase table first, then character table). Any Han character with no mapping
   is a hard build error listing the character and offending key.
3. Render pages for three languages into `dist/`.
4. Copy legacy files verbatim to their original paths in `dist/`.
5. Copy `assets/` (tokens, site CSS, illustration, video, posters).
6. Emit `sitemap.xml` (generated pages only) and `robots.txt`.
7. Verify internal links resolve inside `dist/`; fail if not.
8. Print a summary: page count, bytes per page, TODO(owner) list.

`node scripts/cv.mjs`

- `dist/cv/<lang>.md` — ATS-friendly: no tables, no columns, no graphics, plain
  headings and hyphen bullets.
- `dist/cv/<lang>.html` — A4 print sheet: `@page { size: A4; margin: 18mm 16mm }`,
  10.5 pt body, `page-break-inside: avoid` on entries, print button hidden in print,
  `noindex`. PDF comes from the browser's print dialog; no PDF dependency.

Both scripts exit non-zero on any validation failure.

## 7. Translation policy

- `zh-Hant` is written by hand in Hong Kong Traditional Chinese.
- `zh-Hans` is produced only by conversion. `data/i18n.json` records
  `"reviewed": { "en": true, "zh-Hant": true, "zh-Hans": false }`; the build reads
  it and, while `zh-Hans` is unreviewed, the `zh-Hans` pages carry a visible footer
  note and `<meta name="translation-status" content="unreviewed">`. Flipping the
  flag to `true` removes both. Simplified strings are never hand-edited in place.

## 8. Design system

Source: Personal OS `tokens.css`, copied to `assets/tokens.css` unchanged; site
extensions live in `assets/site.css` and add no new colours.

Dark (default) and light palettes exactly as in `tokens.css`; light also applies via
`@media (prefers-color-scheme: light)` when no `data-theme` is set.

- Type: `--ui` 14 px/1.5 body; `--serif` for display headlines; `--mono` for labels,
  dates, stack tags, section markers.
- `--radius: 2px`; 1 px hairlines only; spacing scale 4/8/12/16/24/32.
- **No accent colour.** Emphasis is inversion: text on background, background on text.
- Existing `.card`, `.chip`, `.badge`, `.lang-toggle` reused.
- Layout: mono `# about` / `# now` / `# work` section markers, prose-first, generous
  vertical rhythm, ~720 px prose measure, ~1000 px project index.
- Exactly one expressive gesture: the illustration, in full colour at rest, with a
  400 ms reveal on first paint. Everything else is static CSS hover. (The original
  grayscale-at-rest treatment was dropped at the owner's request on 2026-11-06.)
  Under `prefers-reduced-motion: reduce` the gesture is absent.
- Banned: parallax, cursor follower, scroll-jacking, gradient text, scroll-reveal JS.

## 9. SEO

- Title pattern for the Home page: `Harry Huang — AI & Data Science, HKU`; other pages
  follow `Page — Harry Huang`.
- Unique description per page and language.
- Home: JSON-LD `ProfilePage` + `Person` (name, jobTitle, affiliation HKU, sameAs →
  GitHub / LinkedIn / X, image).
- Project pages: JSON-LD `SoftwareSourceCode` (when a source/live URL exists) or
  `CreativeWork`.
- `noindex` on legacy personal-document pages:
  `hku-leave-of-absence-max-registration-report.html`,
  `moc-pilot-enterprises-piano-cars-report.html`,
  `商务部试点企业-钢琴-卖车-研究报告.html`, and every page under
  `projects/casual-research/`.
- `sitemap.xml` lists generated pages only. `robots.txt` allows all and points at it.
- Performance budget: HTML + CSS ≤ 120 KB per page; every image has `width`/`height`
  and `loading="lazy"` (except the avatar above the fold); video `preload="none"`.

## 10. Privacy and fact integrity

- `email: null`; the contacts block is GitHub, LinkedIn, X.
- No phone, address, student ID, or grades anywhere in generated output.
- No raw `mailto:` while `email` is null.
- Never invent clients, earnings, reviews, testimonials, portfolio work, or results.
  Coursework is not client work. Every claim traces to a listed source:
  the `portfolio` repository, this repository's previous `index.html`, the Personal OS
  README, the freelancing brief, or `gh api` repository metadata.
- Unverifiable facts are written as `TODO(owner)` in `data/` and reported, never
  replaced with plausible-looking placeholders.

## 11. Illustration and media

- `assets/onezion.png` + `assets/onezion.webp` from the provided pixel-art image
  (960×960 as supplied; caption retained).
- Home: 96–120 px avatar. 404 and Open Graph: full size with caption intact.
- Videos: `<video muted loop playsinline preload="none" poster="…">`, click-to-play,
  16:9, ≤ 20 s, ≤ 2 MB, MP4 (H.264) plus WebM when cheap. Posters are the first
  meaningful frame of the recording, never stock imagery.
- Recording attempts, in order: `agent-browser record` under Node 26; Playwright
  `recordVideo`; otherwise poster + `TODO(owner)` slot. The report states which was used.

## 12. Legacy preservation

Byte-identical copies of: `advx-research.html`, `casual-research.html`,
`projects/casual-research/*`, `projects/coding-vibe/*`,
`hku-leave-of-absence-max-registration-report.html`,
`moc-pilot-enterprises-piano-cars-report.html`,
`商务部试点企业-钢琴-卖车-研究报告.html`, `assets/*`. The root `index.html` is replaced;
`builder-profile.html` (byte-identical to the old `index.html`) is deleted. No `/adv-x/`
path is created.

## 13. Acceptance checks

1. `node scripts/build.mjs && node scripts/cv.mjs` exit 0.
2. `dist/` contains every legacy file at its original path, plus Home, CV, project
   index, one page per project, and 404 — in all three languages.
3. No `undefined`, `NaN`, or `[object Object]` in output. `TODO` appears only where
   reported.
4. Every internal link resolves inside `dist/`.
5. External links return 200 (dead ones are reported, not deleted).
6. Every generated page is ≤ 120 KB HTML + CSS; each carries canonical, hreflang and
   social metadata.
7. Print CV renders at A4 with no clipped sections; markdown CV contains no tables.
8. No analytics, no cookies, no third-party requests; no `mailto:` in output.
