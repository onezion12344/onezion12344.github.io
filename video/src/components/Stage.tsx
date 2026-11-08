import React from "react";
import { AbsoluteFill } from "remotion";
import { brand } from "../brand";

/** Shared stage: flat background, no gradient, no vignette. */
export const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ backgroundColor: brand.bg, color: brand.text }}>
    {children}
  </AbsoluteFill>
);
