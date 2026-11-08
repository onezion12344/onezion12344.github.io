import React from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../brand";

/**
 * A real product screenshot, framed as a window on the dark stage.
 *
 * The source captures are 1280 px wide, so the panel never draws them wider
 * than that — upscaling UI text is what makes a promo look cheap. Movement is
 * a slow push inside a fixed panel, not a scale of the panel itself.
 */
export type ShotProps = {
  src: string;
  /** Left edge of the panel, in stage pixels. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Where the push-in is anchored, as an object-position string. */
  focus?: string;
  /** Scale at the first frame. Captures are pre-cropped, so this usually stays at 1. */
  base?: number;
  /** Scale at the last frame. 1.06 is a barely perceptible push over the scene. */
  zoom?: number;
  /** Small mono label above the panel, e.g. "wewrites.ai/courses". */
  label?: string;
  /** Delay before the push starts, in frames. */
  delay?: number;
  borderColor?: string;
};

const ease = (t: number) => t * t * (3 - 2 * t);

export const Shot: React.FC<ShotProps> = ({
  src,
  x,
  y,
  width,
  height,
  focus = "0% 0%",
  base = 1.0,
  zoom = 1.05,
  label,
  delay = 0,
  borderColor = brand.line,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const span = Math.max(1, durationInFrames - delay);
  const t = Math.min(1, Math.max(0, (frame - delay) / span));
  const scale = base + (zoom - base) * ease(t);

  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      {label ? (
        <div
          style={{
            font: `500 20px ${brand.mono}`,
            letterSpacing: "0.08em",
            color: brand.dim,
            marginBottom: brand.sp3,
          }}
        >
          {label}
        </div>
      ) : null}
      <div
        style={{
          width,
          height,
          border: `1px solid ${borderColor}`,
          borderRadius: brand.radius,
          overflow: "hidden",
          backgroundColor: brand.surface,
        }}
      >
        <Img
          src={staticFile(src)}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: focus,
            transform: `scale(${scale})`,
            transformOrigin: focus,
          }}
        />
      </div>
    </div>
  );
};
