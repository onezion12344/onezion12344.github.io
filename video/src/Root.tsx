import React from "react";
import { Composition } from "remotion";
import { brand } from "./brand";
import {
  WeWritesA,
  WeWritesB,
  WeWritesC,
  WeWritesD,
  WeWritesE,
  durations,
} from "./we-writes/scenes";
import { Promo, totalFrames } from "./projects/promo";
import { compositionIds, promos } from "./projects/specs";

/**
 * One composition per storyboard variant. Nothing here renders on its own —
 * stills and video are pulled out with `remotion still` / `remotion render`.
 */
export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="WeWritesA"
      component={WeWritesA}
      durationInFrames={durations.a}
      fps={brand.fps}
      width={brand.width}
      height={brand.height}
    />
    <Composition
      id="WeWritesB"
      component={WeWritesB}
      durationInFrames={durations.b}
      fps={brand.fps}
      width={brand.width}
      height={brand.height}
    />
    <Composition
      id="WeWritesC"
      component={WeWritesC}
      durationInFrames={durations.c}
      fps={brand.fps}
      width={brand.width}
      height={brand.height}
    />
    <Composition
      id="WeWritesD"
      component={WeWritesD}
      durationInFrames={durations.d}
      fps={brand.fps}
      width={brand.width}
      height={brand.height}
    />
    <Composition
      id="WeWritesE"
      component={WeWritesE}
      durationInFrames={durations.e}
      fps={brand.fps}
      width={brand.width}
      height={brand.height}
    />
    {Object.entries(promos).map(([slug, scenes]) => {
      const SceneList: React.FC = () => <Promo scenes={scenes} />;
      return (
        <Composition
          key={slug}
          id={compositionIds[slug]}
          component={SceneList}
          durationInFrames={totalFrames(scenes)}
          fps={brand.fps}
          width={brand.width}
          height={brand.height}
        />
      );
    })}
  </>
);
