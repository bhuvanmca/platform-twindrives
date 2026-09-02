// Shared Recharts theming.
//
// Recharts paints raw SVG, so it never sees Tailwind classes — before this,
// chart chrome was hardcoded light hex (#f0f0f0 grids, #fff pie borders) and
// disappeared or glared in dark mode. Every value here is a `var(--…)` token
// from globals.css, which the browser re-resolves when `.dark` toggles, so the
// charts follow the theme with no re-render.

import type { CSSProperties } from "react";

export const CHART = {
  grid: "var(--chart-grid)",
  axis: "var(--chart-axis)",
  /** Border drawn between pie/donut slices — matches the card behind them. */
  slice: "var(--card)",
  /** Neutral fill for "empty"/remainder segments. */
  neutral: "var(--muted)",
  series: [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ],
} as const;

/** Fixed categorical order (identity, never cycled) for file-type slices. */
export const CATEGORICAL = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-axis)",
] as const;

export const axisTick = (fontSize = 11) => ({ fontSize, fill: CHART.axis });

/** Recharts renders its tooltip as a DOM node, so it needs real styles rather
 *  than classes — a white default card is unreadable on a dark background. */
export const tooltipStyle: CSSProperties = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  color: "var(--popover-foreground)",
  fontSize: 12,
  boxShadow: "var(--shadow-md)",
};

export const tooltipLabelStyle: CSSProperties = {
  color: "var(--muted-foreground)",
  fontWeight: 500,
};

export const tooltipItemStyle: CSSProperties = {
  color: "var(--popover-foreground)",
};

/** Spread onto every <Tooltip> so hover cards are themed consistently. */
export const tooltipProps = {
  contentStyle: tooltipStyle,
  labelStyle: tooltipLabelStyle,
  itemStyle: tooltipItemStyle,
  cursor: { fill: "var(--accent)", fillOpacity: 0.5 },
} as const;

export const legendStyle: CSSProperties = { fontSize: 12, color: "var(--muted-foreground)" };
