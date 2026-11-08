import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Caption, EndCard, SpecList, Statement } from "../components/Text";
import { Shot } from "../components/Shot";
import { Stage } from "../components/Stage";
import { MARGIN } from "../brand";

/**
 * Three storyboards for the WeWrites promo.
 *
 * All three are cut from the same rule set — real product screens only, one
 * corner caption, hairline frames, no gradients, no centred title cards — and
 * differ in what they argue, not in what they look like.
 *
 * Copy is limited to what the project data already asserts. No numbers are
 * invented for the video.
 */

type Scene = { id: string; frames: number; render: React.ReactNode };

const PANEL = { x: MARGIN, y: 190, width: 1280, height: 577 };

const Variant: React.FC<{ scenes: Scene[] }> = ({ scenes }) => {
  let from = 0;
  return (
    <Stage>
      {scenes.map((s) => {
        const start = from;
        from += s.frames;
        return (
          <Sequence key={s.id} from={start} durationInFrames={s.frames} name={s.id}>
            {s.render}
          </Sequence>
        );
      })}
    </Stage>
  );
};

/* ------------------------------------------------------------------ variant A
 * The site, top to bottom. Product first, cuts on the beat.
 */
const a: Scene[] = [
  {
    id: "01-open",
    frames: 90,
    render: (
      <Statement kicker="wewrites.ai" top={372}>
        A DSE tutoring team, publishing without a developer.
      </Statement>
    ),
  },
  {
    id: "02-home",
    frames: 105,
    render: (
      <>
        <Shot src="shots/wewrites-home.png" {...PANEL} focus="0% 0%" zoom={1.1} />
        <Caption>The site opens on the claim the team is built around.</Caption>
      </>
    ),
  },
  {
    id: "03-courses",
    frames: 105,
    render: (
      <>
        <Shot
          src="shots/wewrites-courses-scroll.png"
          {...PANEL}
          focus="0% 20%"
          zoom={1}
          delay={6}
          label="wewrites.ai/courses"
        />
        <Caption>Every teacher and every class is a page with its own URL.</Caption>
      </>
    ),
  },
  {
    id: "04-milestones",
    frames: 105,
    render: (
      <>
        <Shot
          src="shots/wewrites-milestones-sources.png"
          {...PANEL}
          focus="0% 0%"
          zoom={1.09}
          delay={6}
          label="wewrites.ai/milestones"
        />
        <Caption>Milestone pages are generated from sources, then fact-checked.</Caption>
      </>
    ),
  },
  {
    id: "05-claim",
    frames: 75,
    render: <Statement top={372}>The team publishes without waiting on engineering.</Statement>,
  },
  {
    id: "06-end",
    frames: 60,
    render: (
      <EndCard
        title="wewrites.ai"
        meta={["Live site", "Engineer, internship", "Next.js · Content system"]}
      />
    ),
  },
];

/* ------------------------------------------------------------------ variant B
 * The system underneath: design system, content graph, generated pages.
 * Statement beats are shorter here; the spec column carries the argument.
 */
const b: Scene[] = [
  {
    id: "01-open",
    frames: 72,
    render: (
      <Statement kicker="The system" top={360} size={84}>
        Content and components, linked as a graph.
      </Statement>
    ),
  },
  {
    id: "02-spec",
    frames: 150,
    render: (
      <>
        <Shot
          src="shots/wewrites-courses-scroll.png"
          x={MARGIN}
          y={250}
          width={1024}
          height={462}
          focus="0% 0%"
          zoom={1}
        />
        <SpecList
          x={1240}
          y={250}
          width={520}
          rows={[
            { k: "Design system", v: "One token set, every page" },
            { k: "Content graph", v: "Pages reference shared components" },
            { k: "Generated", v: "Milestone pages from sources" },
          ]}
        />
      </>
    ),
  },
  {
    id: "03-milestones",
    frames: 120,
    render: (
      <>
        <Shot
          src="shots/wewrites-milestones-sources.png"
          {...PANEL}
          focus="0% 0%"
          zoom={1.08}
          label="wewrites.ai/milestones"
        />
        <Caption>Generated from sources, then checked against them.</Caption>
      </>
    ),
  },
  {
    id: "04-claim",
    frames: 78,
    render: (
      <Statement kicker="What that buys" top={372}>
        A page that stays consistent with the rest of the site.
      </Statement>
    ),
  },
  {
    id: "05-product",
    frames: 105,
    render: (
      <>
        <Shot
          src="shots/wewrites-techproduct.png"
          {...PANEL}
          focus="0% 30%"
          zoom={1.09}
          label="wewrites.ai/techproduct"
        />
        <Caption>And the course products the pipeline feeds.</Caption>
      </>
    ),
  },
  {
    id: "06-end",
    frames: 75,
    render: (
      <EndCard
        title="wewrites.ai"
        meta={["Live site", "Engineer, internship", "Design system · Content graph"]}
      />
    ),
  },
];

/* ------------------------------------------------------------------ variant C
 * The work itself: the pipeline, held longer, stated plainer.
 */
const c: Scene[] = [
  {
    id: "01-open",
    frames: 84,
    render: (
      <Statement kicker="Part of the job" top={372}>
        Listening papers, generated from analysed past papers.
      </Statement>
    ),
  },
  {
    id: "02-product",
    frames: 120,
    render: (
      <>
        <Shot
          src="shots/wewrites-techproduct.png"
          {...PANEL}
          focus="0% 25%"
          zoom={1.1}
          label="wewrites.ai/techproduct"
        />
        <Caption>The course products the pipeline was built to feed.</Caption>
      </>
    ),
  },
  {
    id: "03-milestones",
    frames: 120,
    render: (
      <>
        <Shot
          src="shots/wewrites-milestones-sources.png"
          {...PANEL}
          focus="0% 0%"
          zoom={1.09}
          delay={8}
          label="wewrites.ai/milestones"
        />
        <Caption>Milestone pages: generated, then fact-checked.</Caption>
      </>
    ),
  },
  {
    id: "04-claim",
    frames: 90,
    render: (
      <Statement kicker="The point" top={372}>
        The team edits it. Nobody waits for a deploy.
      </Statement>
    ),
  },
  {
    id: "05-home",
    frames: 105,
    render: (
      <>
        <Shot src="shots/wewrites-home.png" {...PANEL} focus="0% 0%" zoom={1.1} delay={4} />
        <Caption>What the team publishes is the whole point.</Caption>
      </>
    ),
  },
  {
    id: "06-end",
    frames: 75,
    render: (
      <EndCard
        title="wewrites.ai"
        meta={["Live site", "Engineer, internship", "Listening-material pipeline"]}
      />
    ),
  },
];

export const WeWritesA: React.FC = () => <Variant scenes={a} />;
export const WeWritesB: React.FC = () => <Variant scenes={b} />;
export const WeWritesC: React.FC = () => <Variant scenes={c} />;

export const durations = {
  a: a.reduce((n, s) => n + s.frames, 0),
  b: b.reduce((n, s) => n + s.frames, 0),
  c: c.reduce((n, s) => n + s.frames, 0),
};

export const sceneIndex = { a, b, c };
