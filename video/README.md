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

Remotion's CLI is unhappy on the machine's default Node 26, so pin Node 22:

```sh
cd video
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
npm install

# one storyboard still (1920x1080)
npx remotion still src/index.ts WeWritesA storyboards/we-writes/a/02-home.png --frame=140

# preview all three in the browser
npx remotion studio src/index.ts

# final video, once a variant is approved
npx remotion render src/index.ts WeWritesA out/we-writes-a.mp4
```

Composition ids: `WeWritesA` (18.0 s), `WeWritesB` (20.0 s), `WeWritesC` (19.8 s),
all 1920x1080 at 30 fps.

## Storyboards

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

## Rules the video copy follows

- No numbers that are not already in `data/projects.json`.
- Real screenshots only. No invented windows, no placeholder boxes, no stock.
- `private-local` projects are recorded with seeded or synthetic data — every
  frame has to be publishable.
- Same palette as the site, inverted for emphasis, hairlines at 1 px, radius 2 px.
