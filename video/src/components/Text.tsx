import React from "react";
import { brand, MARGIN } from "../brand";

/** Bottom-left caption. Lowercase, mono, quiet — the reference style's habit. */
export const Caption: React.FC<{ children: React.ReactNode; y?: number }> = ({
  children,
  y = 900,
}) => (
  <div style={{ position: "absolute", left: MARGIN, top: y, width: 980 }}>
    <div style={{ width: 64, height: 1, backgroundColor: brand.line, marginBottom: brand.sp4 }} />
    <div
      style={{
        font: `400 26px/1.4 ${brand.mono}`,
        color: brand.muted,
        letterSpacing: "-0.005em",
      }}
    >
      {children}
    </div>
  </div>
);

/** A statement beat: mono kicker over one serif line. No centred text, no gradient. */
export const Statement: React.FC<{
  kicker?: string;
  children: React.ReactNode;
  size?: number;
  width?: number;
  top?: number;
}> = ({ kicker, children, size = 76, width = 1240, top = 330 }) => (
  <div style={{ position: "absolute", left: MARGIN, top, width }}>
    {kicker ? (
      <div
        style={{
          font: `400 22px ${brand.mono}`,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: brand.dim,
          marginBottom: brand.sp5,
        }}
      >
        {kicker}
      </div>
    ) : null}
    <div
      style={{
        font: `400 ${size}px/1.16 ${brand.serif}`,
        letterSpacing: "-0.02em",
        color: brand.text,
      }}
    >
      {children}
    </div>
  </div>
);

/** Right-hand spec column: numbered mono rows, hairlines only. */
export const SpecList: React.FC<{
  x: number;
  y: number;
  width: number;
  rows: { k: string; v: string }[];
}> = ({ x, y, width, rows }) => (
  <div style={{ position: "absolute", left: x, top: y, width }}>
    {rows.map((r, i) => (
      <div
        key={r.k}
        style={{
          borderTop: `1px solid ${brand.line}`,
          paddingTop: brand.sp3,
          paddingBottom: brand.sp4,
        }}
      >
        <div style={{ font: `400 18px ${brand.mono}`, color: brand.dim, letterSpacing: "0.12em" }}>
          {String(i + 1).padStart(2, "0")}
        </div>
        <div style={{ font: `400 22px/1.3 ${brand.ui}`, color: brand.text, marginTop: brand.sp2 }}>
          {r.k}
        </div>
        <div style={{ font: `400 19px/1.35 ${brand.mono}`, color: brand.muted, marginTop: 2 }}>
          {r.v}
        </div>
      </div>
    ))}
  </div>
);

/** End card: one serif line, one mono line, one hairline. Nothing else. */
export const EndCard: React.FC<{ title: string; meta: string[] }> = ({ title, meta }) => (
  <div style={{ position: "absolute", left: MARGIN, top: 392, width: 1400 }}>
    <div style={{ font: `400 96px/1.05 ${brand.serif}`, letterSpacing: "-0.025em" }}>{title}</div>
    <div style={{ height: 1, backgroundColor: brand.line, margin: `${brand.sp6}px 0` }} />
    <div style={{ display: "flex", gap: brand.sp6 }}>
      {meta.map((m) => (
        <div key={m} style={{ font: `400 22px ${brand.mono}`, color: brand.muted }}>
          {m}
        </div>
      ))}
    </div>
  </div>
);
