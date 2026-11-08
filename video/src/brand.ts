/**
 * Brand tokens for the promo videos.
 *
 * Mirrors assets/tokens.css exactly. If a value here drifts from the token
 * file, the video stops looking like the site, so keep them in step.
 *
 * Rules carried over from the site:
 *   - no accent hue; emphasis is inversion
 *   - 1px hairlines only
 *   - 2px radius
 *   - serif for display lines, mono for labels and metadata, system sans for prose
 */

export const brand = {
  // colour — copied verbatim from assets/tokens.css
  bg: "#0b0b0c",
  surface: "#131314",
  surface2: "#1a1a1c",
  line: "#2c2c2f",
  lineStrong: "#4a4a4e",
  text: "#f2f2f2",
  muted: "#a3a3a6",
  dim: "#747477",

  // shape and rhythm
  radius: 2,
  sp1: 4,
  sp2: 8,
  sp3: 12,
  sp4: 16,
  sp5: 24,
  sp6: 32,

  // type
  serif: 'ui-serif, "Iowan Old Style", "Palatino Linotype", Georgia, serif',
  mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
  ui: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',

  // frame
  width: 1920,
  height: 1080,
  fps: 30,
} as const;

/** Page margin used by every scene, so captions land on the same line. */
export const MARGIN = 128;
