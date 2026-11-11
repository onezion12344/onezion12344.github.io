import type { PromoScene, Screen } from "./promo";

/**
 * One entry per project that has real footage.
 *
 * Copy rule: every sentence here is already asserted in `data/projects.json`
 * (summary or highlights) or is legible in the screenshot itself. No new
 * numbers, no invented claims. The screens are frames lifted from the tour
 * clips in `assets/video/`, so every frame is as publishable as the clip that
 * is already on the site.
 */

const SCREEN_FRAMES = 105;

type PromoInput = {
  open: { kicker: string; text: string };
  screens: Screen[];
  close: { kicker: string; text: string };
  end: { title: string; meta: string[] };
};

const promo = ({ open, screens, close, end }: PromoInput): PromoScene[] => {
  const scenes: PromoScene[] = [
    { kind: "claim", id: "01-open", frames: 75, ...open },
  ];
  screens.forEach((s, i) => {
    scenes.push({ kind: "screen", id: `0${i + 2}-screen`, frames: SCREEN_FRAMES, ...s });
  });
  scenes.push({ kind: "claim", id: "05-claim", frames: 90, ...close });
  scenes.push({ kind: "end", id: "06-end", frames: 60, ...end });
  return scenes;
};

export const promos: Record<string, PromoScene[]> = {
  "mac-closed-awake": promo({
    open: { kicker: "macOS", text: "A Mac that stays awake with the lid closed." },
    screens: [
      {
        src: "shots/mac-closed-awake-hero.png",
        label: "macclosedawake.app",
        caption: "The lid closes. The build keeps going.",
        zoom: 1.05,
      },
      {
        src: "shots/mac-closed-awake-features.png",
        label: "Features",
        caption: "Lid-close safe, forever mode, auto-restore.",
        zoom: 1.08,
      },
    ],
    close: { kicker: "Install", text: "Available through a Homebrew cask." },
    end: {
      title: "MacClosedAwake",
      meta: ["macOS app", "Design, build, release", "51 commits · v1.7.0"],
    },
  }),

  "double-check": promo({
    open: { kicker: "AI agents", text: "Fact, logic and tool-use checks, outside the model." },
    screens: [
      {
        src: "shots/double-check-hero.png",
        label: "double-check",
        caption: "Verification is enforced outside the model.",
        zoom: 1.05,
      },
      {
        src: "shots/double-check-routes.png",
        label: "Route A / Route B",
        caption: "Two routes. Only one takes the model out of the loop.",
        zoom: 1.08,
      },
    ],
    close: { kicker: "Enforcement", text: "Hooks the agent cannot opt out of." },
    end: {
      title: "Double-Check",
      meta: ["AI agent plugin", "Author", "Hooks · External enforcement"],
    },
  }),

  "comp2119-lectures": promo({
    open: { kicker: "COMP2119", text: "Every element appears when the narration reaches it." },
    screens: [
      {
        src: "shots/comp2119-hero.png",
        label: "COMP2119 · Fall 2024",
        caption: "11 lectures, 596 slides, 5.8 hours of narration.",
        zoom: 1.05,
      },
      {
        src: "shots/comp2119-tools.png",
        label: "Step tools",
        caption: "Six click-through tools, from recursion trees to graph traversal.",
        zoom: 1.08,
      },
    ],
    close: { kicker: "Slide-faithful", text: "Nothing appears before the narration explains it." },
    end: {
      title: "COMP2119 Lectures",
      meta: ["Course lectures", "Author", "11 lectures · 596 slides"],
    },
  }),

  "let-go-journey": promo({
    open: { kicker: "CBT", text: "Thirty days, ten minutes a day." },
    screens: [
      {
        src: "shots/let-go-hero.png",
        label: "let-go-journey",
        caption: "Bilingual throughout.",
        zoom: 1.05,
      },
      {
        src: "shots/let-go-stages.png",
        label: "Stages",
        caption: "Ten stages, each with a therapeutic focus.",
        zoom: 1.08,
      },
      {
        src: "shots/let-go-science.png",
        label: "Built on science",
        caption: "30 days, 10 stages, 30 badges, 2 languages.",
        zoom: 1.06,
      },
    ],
    close: { kicker: "Live", text: "Public on GitHub Pages, in two languages." },
    end: {
      title: "Let Go Journey",
      meta: ["Web game", "Author", "30 days · Bilingual"],
    },
  }),
};

/** Composition ids, kept in the same shape the workflow derives from a slug. */
export const compositionIds: Record<string, string> = {
  "mac-closed-awake": "MacClosedAwake",
  "double-check": "DoubleCheck",
  "comp2119-lectures": "Comp2119Lectures",
  "let-go-journey": "LetGoJourney",
};
