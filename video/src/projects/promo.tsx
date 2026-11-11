import React from "react";
import { Sequence } from "remotion";
import { Caption, EndCard, Statement } from "../components/Text";
import { Shot } from "../components/Shot";
import { Stage } from "../components/Stage";
import { MARGIN } from "../brand";

/**
 * The batch promo shape: one claim, the screens it is talking about, the
 * claim that closes the loop, and the card.
 *
 * Every scene is data — see `specs.ts`. Nothing here knows which project it is
 * rendering, so adding a project is a data entry, not a new composition.
 */
export type Screen = {
  src: string;
  label?: string;
  caption?: string;
  focus?: string;
  zoom?: number;
  base?: number;
  delay?: number;
};

export type PromoScene =
  | { kind: "claim"; id: string; frames: number; kicker?: string; text: string; size?: number }
  | ({ kind: "screen"; id: string; frames: number } & Screen)
  | { kind: "end"; id: string; frames: number; title: string; meta: string[] };

const PANEL = { x: MARGIN, y: 190, width: 1280, height: 577 };

const renderScene = (s: PromoScene) => {
  switch (s.kind) {
    case "claim":
      return (
        <Statement kicker={s.kicker} top={372} size={s.size}>
          {s.text}
        </Statement>
      );
    case "screen":
      return (
        <>
          <Shot
            src={s.src}
            {...PANEL}
            base={s.base ?? 1}
            zoom={s.zoom ?? 1.06}
            focus={s.focus ?? "0% 0%"}
            delay={s.delay ?? 0}
            label={s.label}
          />
          {s.caption ? <Caption>{s.caption}</Caption> : null}
        </>
      );
    case "end":
      return <EndCard title={s.title} meta={s.meta} />;
  }
};

export const Promo: React.FC<{ scenes: PromoScene[] }> = ({ scenes }) => {
  let from = 0;
  return (
    <Stage>
      {scenes.map((s) => {
        const start = from;
        from += s.frames;
        return (
          <Sequence key={s.id} from={start} durationInFrames={s.frames} name={s.id}>
            {renderScene(s)}
          </Sequence>
        );
      })}
    </Stage>
  );
};

export const totalFrames = (scenes: PromoScene[]) =>
  scenes.reduce((n, s) => n + s.frames, 0);
