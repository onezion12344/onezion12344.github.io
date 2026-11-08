# Promo videos

Every project on the site can carry two clips:

- **tour** — the existing screen recording, kept in `assets/video/`. It shows the
  product doing its thing, unedited.
- **promo** — this directory. Every scene is code, rendered to MP4 by Remotion, so
  a change is a one-line edit and a re-render instead of a new take.

The site build never reads this directory. `node scripts/build.mjs` stays green
with or without `video/node_modules`.

## Reference

Picked from [whatships.com](https://whatships.com), from the poster frames and
the published durations on the discover page — X blocks logged-out playback, so
the pacing below is read off those durations and stills, not from watching the
full clips.

**Quilt (0:22)** and **Reason Desktop (0:34)**:

> dark, full-bleed product UI; one short lowercase caption parked in a corner;
> hard cuts between scenes; slow push-ins that never overshoot.

What that rules out, and why it is the point: no centred title cards, no
gradient washes, no cross-fades, no invented UI. The product is the picture; the
type is a subtitle, not a headline.

## Layout

```
video/
  src/
    brand.ts            tokens mirrored from assets/tokens.css
    Root.tsx            one composition per storyboard
    components/         Stage, Shot (panel + push-in), Text (Caption, Statement, SpecList, EndCard)
    we-writes/scenes.tsx  the three storyboards, as data
  public/shots/         real screenshots, captured from the live site
  storyboards/we-writes/{a,b,c}/   1920x1080 stills, one per scene
```

## Render

`node_modules` is ~190 MB and Remotion downloads **no browser of its own** if
you point it at an installed one. Keep a local install only while the disk has
room; the batch path is still CI, which needs nothing on this machine.

`.github/workflows/promo-render.yml` is manual (`workflow_dispatch`) and runs in
two stages:

1. **stills** — one PNG per scene, per variant, uploaded as
   `storyboard-<project>-<variant>`. This is the review gate.
2. **video** — MP4 + WebM + poster per variant, uploaded as
   `promo-<project>-<variant>`, and failed if a file exceeds 2 MB.

```sh
# stills first — the review gate
gh workflow run promo-render.yml -f project=we-writes -f variant=all -f stage=stills

# everything, or one variant's MP4s
gh workflow run promo-render.yml -f project=we-writes -f variant=c -f stage=both

# collect the artifacts
gh run download --name storyboard-we-writes-d
```

Scene timings for CI live in `storyboards/manifest.json`. They mirror the
`frames` in `src/we-writes/scenes.tsx`; a frame past the end of a composition
fails the job rather than silently rendering the wrong beat.

Composition ids: `WeWritesA` (18.0 s), `WeWritesB` (20.0 s), `WeWritesC` (19.8 s),
`WeWritesD` (16.0 s), `WeWritesE` (15.5 s), all 1920x1080 at 30 fps.

All five stills sets (`a`–`e`) are in `storyboards/we-writes/`, rendered locally
with the installed Google Chrome.

## Storyboards

Five variants, same rule set, different arguments. All five are rendered to
stills.

### A — The site

The straight read: open on the claim, then walk the site top to bottom, one
product screen per beat, cutting every three and a half seconds. It is the most
literal of the three and the safest: a viewer who has never heard of WeWrites
learns in the first ten seconds that this is a real, live education site with
real teachers on it. The product appears at 3 s and never leaves the frame for
long; the two statement beats are short exhales, not chapters. Rhythm: claim,
three screens, claim, end card.

### B — The system

For someone who will ask "what did you actually build". It leads with the design
system and the content graph, then spends a long five-second beat on one screen
with a numbered spec column beside it — that column is the argument, and it gets
the kind of airtime a caption never does. The screens are chosen to show
structure rather than features: navigation, teacher grid, milestone index. It
runs two seconds longer than A because the spec beat has to be readable, and it
deliberately ends on the course products, so the systems story lands on
something a buyer recognises. Rhythm: thesis, spec, screen, thesis, screen, card.

### C — The pipeline

The internship told as work rather than as a website. It opens on the part that
is hardest to fake — listening papers generated from analysed past papers — and
holds each screen for four seconds, the slowest of the three. No screen appears
twice, and the home page arrives last, framed as the outcome rather than the
introduction. This is the variant to pick if the video is going to a hiring
manager who cares what the day job was. Rhythm: work, product, product, claim,
outcome, card.

### D — Cold open

Starts on the artefact instead of the pitch: a milestone entry with its source
attached, held for two seconds with no caption at all. The claim arrives second
— everything on that page was generated from a source and checked against it —
and only then does the site itself appear. It is the shortest of the five and
the one built for someone who will scroll past unless the first frame is
concrete. Rhythm: object, claim, two screens, claim, card.

### E — Two layers

The only variant that puts two screens in one frame: the public page on the
left, the milestone pipeline on the right, both labelled, one caption
underneath tying them together. It answers "what is the system" spatially
rather than chronologically, and it is the calmest cut — nothing moves except
two slow push-ins. Pick it if the video plays somewhere without sound and the
viewer has time to read. Rhythm: thesis, split, thesis, product, card.

## Rules the video copy follows

- No numbers that are not already in `data/projects.json`.
- Real screenshots only. No invented windows, no placeholder boxes, no stock.
- `private-local` projects are recorded with seeded or synthetic data — every
  frame has to be publishable.
- Same palette as the site, inverted for emphasis, hairlines at 1 px, radius 2 px.
