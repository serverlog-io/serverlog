import { useState } from "react";
import { format } from "date-fns";

function buildSmoothPath(points) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

function buildStepPath(points) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x.toFixed(2)} ${points[i - 1].y.toFixed(2)}`;
    d += ` L ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)}`;
  }
  return d;
}

function formatXTick(ts, interval) {
  const d = new Date(ts);
  if (interval === "second") return format(d, "HH:mm:ss");
  if (interval === "minute") return format(d, "HH:mm");
  if (interval === "hour") return format(d, "HH:mm");
  return format(d, "MMM d");
}

function formatTooltipLabel(ts, interval) {
  const d = new Date(ts);
  if (interval === "second") return format(d, "HH:mm:ss");
  if (interval === "minute") return format(d, "MMM d, HH:mm");
  if (interval === "hour") return format(d, "MMM d, HH:00");
  return format(d, "MMM d, yyyy");
}

function pickLabelIndices(n, maxLabels = 7) {
  if (n <= maxLabels) return new Set(Array.from({ length: n }, (_, i) => i));
  const set = new Set();
  for (let k = 0; k < maxLabels; k++) {
    set.add(Math.round((k / (maxLabels - 1)) * (n - 1)));
  }
  return set;
}

export function TimeseriesChart({
  data,
  interval = "hour",
  chartType = "BAR",
  color = "#d97757",
  height = 180,
  loading = false,
  emptyText = "No data",
}) {
  const [hoverIdx, setHoverIdx] = useState(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-xs text-fg-subtle" style={{ height }}>
        {emptyText}
      </div>
    );
  }

  const type = String(chartType).toLowerCase();
  const bucketed = type === "bar" || type === "scatter";

  const width = 720;
  const vbHeight = 180;
  const padding = { top: 14, right: 14, bottom: 22, left: 14 };
  const chartW = width - padding.left - padding.right;
  const chartH = vbHeight - padding.top - padding.bottom;

  const counts = data.map((d) => d.count || 0);
  const rawMax = Math.max(...counts, 1);
  const max = rawMax * 1.15;
  const baseY = padding.top + chartH;

  const points = data.map((d, i) => {
    const f =
      bucketed
        ? (i + 0.5) / data.length
        : data.length === 1
        ? 0.5
        : i / (data.length - 1);
    return {
      x: padding.left + f * chartW,
      y: padding.top + chartH - ((d.count || 0) / max) * chartH,
      timestamp: d.timestamp,
      count: d.count || 0,
    };
  });

  const smoothPath = buildSmoothPath(points);
  const stepPath = buildStepPath(points);
  const sharpPath = points.reduce(
    (acc, p, i) =>
      acc +
      (i === 0
        ? `M ${p.x.toFixed(2)} ${p.y.toFixed(2)}`
        : ` L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`),
    ""
  );

  const linePath =
    type === "step" ? stepPath : type === "line" ? sharpPath : smoothPath;
  const last = points[points.length - 1];
  const first = points[0];
  const areaPath = `${linePath} L ${last.x.toFixed(2)} ${baseY} L ${first.x.toFixed(2)} ${baseY} Z`;

  const gridY = [0.25, 0.5, 0.75].map((f) => padding.top + chartH * f);
  const barWidth = Math.min((chartW / data.length) * 0.6, 24);

  const labelIdxs = pickLabelIndices(data.length, 7);

  const handleMove = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const vx = (xPx / rect.width) * width;
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(points[i].x - vx);
      if (d < best) {
        best = d;
        nearest = i;
      }
    }
    setHoverIdx(nearest);
  };
  const handleLeave = () => setHoverIdx(null);
  const hoverPoint = hoverIdx !== null ? points[hoverIdx] : null;
  const gradientId = `chart-fill-${String(color).replace("#", "")}`;
  const showLastMarker = type !== "bar" && type !== "scatter" && hoverIdx === null;

  return (
    <div className="relative" style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${vbHeight}`}
        className="w-full h-full block"
        preserveAspectRatio="none"
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridY.map((y, i) => (
          <line
            key={i}
            x1={padding.left}
            x2={width - padding.right}
            y1={y}
            y2={y}
            stroke="var(--color-border)"
            strokeWidth="1"
            strokeDasharray="2 4"
          />
        ))}

        {type === "bar" &&
          points.map((p, i) => {
            const h = baseY - p.y;
            const isHover = hoverIdx === i;
            return (
              <rect
                key={i}
                x={p.x - barWidth / 2}
                y={p.y}
                width={barWidth}
                height={h}
                rx="1.5"
                fill={color}
                opacity={hoverIdx !== null && !isHover ? 0.5 : 0.85}
              />
            );
          })}

        {type === "scatter" &&
          points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="3"
              fill={color}
              opacity={hoverIdx !== null && hoverIdx !== i ? 0.4 : 0.9}
            />
          ))}

        {(type === "area" || type === "line" || type === "step") && (
          <>
            {type === "area" && <path d={areaPath} fill={`url(#${gradientId})`} />}
            <path
              d={linePath}
              fill="none"
              stroke={color}
              strokeWidth="1.75"
              strokeLinecap={type === "step" ? "butt" : "round"}
              strokeLinejoin={type === "step" ? "miter" : "round"}
            />
            {showLastMarker && (
              <>
                <circle cx={last.x} cy={last.y} r="10" fill={color} opacity="0.18" />
                <circle
                  cx={last.x}
                  cy={last.y}
                  r="3.5"
                  fill="var(--color-bg)"
                  stroke={color}
                  strokeWidth="1.75"
                />
              </>
            )}
          </>
        )}

        {hoverPoint && (
          <>
            <line
              x1={hoverPoint.x}
              x2={hoverPoint.x}
              y1={padding.top}
              y2={baseY}
              stroke={color}
              strokeOpacity="0.35"
              strokeDasharray="2 3"
            />
            {type !== "bar" && type !== "scatter" && (
              <circle
                cx={hoverPoint.x}
                cy={hoverPoint.y}
                r="3.5"
                fill="var(--color-bg)"
                stroke={color}
                strokeWidth="1.75"
              />
            )}
            {type === "scatter" && (
              <circle cx={hoverPoint.x} cy={hoverPoint.y} r="5" fill="none" stroke={color} strokeWidth="1.5" />
            )}
          </>
        )}
      </svg>

      {hoverPoint && (
        <div
          className="absolute pointer-events-none px-2 py-1 rounded border border-border bg-bg-elevated text-[0.7rem] font-mono whitespace-nowrap shadow-lg z-10"
          style={{
            left: `${(hoverPoint.x / width) * 100}%`,
            top: `${(hoverPoint.y / vbHeight) * 100}%`,
            transform: "translate(-50%, calc(-100% - 10px))",
          }}
        >
          <span className="text-fg-subtle">{formatTooltipLabel(hoverPoint.timestamp, interval)}</span>
          <span className="text-fg ml-2 tabular-nums">{hoverPoint.count}</span>
          <span className="text-fg-subtle ml-1">events</span>
        </div>
      )}

      <div className="absolute left-0 right-0 bottom-0 h-5 text-[0.65rem] font-mono text-fg-subtle pointer-events-none">
        {points.map((p, i) => {
          if (!labelIdxs.has(i)) return null;
          const xPct = (p.x / width) * 100;
          let tx = "-50%";
          if (xPct < 8) tx = "0%";
          else if (xPct > 92) tx = "-100%";
          return (
            <span
              key={i}
              className="absolute top-1 whitespace-nowrap"
              style={{ left: `${xPct}%`, transform: `translateX(${tx})` }}
            >
              {formatXTick(p.timestamp, interval)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
