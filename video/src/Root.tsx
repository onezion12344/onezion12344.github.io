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
  </>
);
