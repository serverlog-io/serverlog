import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Check } from "lucide-react";
import {
  subMinutes,
  subHours,
  subDays,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  startOfYear,
  endOfYear,
  subMonths,
  subYears,
  addMonths,
  eachDayOfInterval,
  isSameDay,
  isAfter,
  isBefore,
  isSameMonth,
  format,
} from "date-fns";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

// ─── Realtime rolling presets (small window, auto-refreshing) ──────────────
const REALTIME_PRESETS = [
  { key: "1m",  label: "Last minute",     getRange: () => ({ start: subMinutes(new Date(), 1),  end: new Date() }) },
  { key: "30m", label: "Last 30 minutes", getRange: () => ({ start: subMinutes(new Date(), 30), end: new Date() }) },
  { key: "1h",  label: "Last hour",       getRange: () => ({ start: subHours(new Date(), 1),   end: new Date() }) },
  { key: "6h",  label: "Last 6 hours",    getRange: () => ({ start: subHours(new Date(), 6),   end: new Date() }) },
  { key: "24h", label: "Last 24 hours",   getRange: () => ({ start: subHours(new Date(), 24),  end: new Date() }) },
];

// ─── Calendar-based presets (start of day / month / year to now) ───────────
const CALENDAR_PRESETS = [
  { key: "today",      label: "Today",        getRange: () => ({ start: startOfDay(new Date()), end: new Date() }) },
  { key: "yesterday",  label: "Yesterday",    getRange: () => {
      const y = subDays(new Date(), 1);
      return { start: startOfDay(y), end: endOfDay(y) };
    } },
  { key: "7d",         label: "Last 7 days",  getRange: () => ({ start: startOfDay(subDays(new Date(), 6)), end: new Date() }) },
  { key: "30d",        label: "Last 30 days", getRange: () => ({ start: startOfDay(subDays(new Date(), 29)), end: new Date() }) },
  { key: "90d",        label: "Last 90 days", getRange: () => ({ start: startOfDay(subDays(new Date(), 89)), end: new Date() }) },
  { key: "mtd",        label: "Month to date", getRange: () => ({ start: startOfMonth(new Date()), end: new Date() }) },
  { key: "last-month", label: "Last month",   getRange: () => {
      const last = subMonths(new Date(), 1);
      return { start: startOfMonth(last), end: endOfMonth(last) };
    } },
  { key: "qtd",        label: "Quarter to date", getRange: () => ({ start: startOfQuarter(new Date()), end: new Date() }) },
  { key: "ytd",        label: "Year to date", getRange: () => ({ start: startOfYear(new Date()), end: new Date() }) },
  { key: "last-year",  label: "Last year",    getRange: () => {
      const last = subYears(new Date(), 1);
      return { start: startOfYear(last), end: endOfYear(last) };
    } },
];

const ALL_PRESETS = [...REALTIME_PRESETS, ...CALENDAR_PRESETS];

// Convert a stored value back into the {start, end} range used by the timeline.
export function rangeFromValue(value) {
  if (value && value.kind === "custom" && value.from && value.to) {
    return { start: new Date(value.from), end: new Date(value.to) };
  }
  const presetKey = (value && value.preset) || "24h";
  const preset = ALL_PRESETS.find((p) => p.key === presetKey) || REALTIME_PRESETS[4];
  return preset.getRange();
}

// Realtime rolling presets get a "live" dot (they auto-refresh).
export function isRealtimePreset(value) {
  if (!value || value.kind !== "preset") return false;
  return REALTIME_PRESETS.some((p) => p.key === value.preset);
}

function formatRange(start, end) {
  const sameDay = isSameDay(start, end);
  if (sameDay) return `${format(start, "MMM d, yyyy")}`;
  const sameYear = start.getFullYear() === end.getFullYear();
  if (sameYear) return `${format(start, "MMM d")} → ${format(end, "MMM d, yyyy")}`;
  return `${format(start, "MMM d, yyyy")} → ${format(end, "MMM d, yyyy")}`;
}

function CalendarMonth({ month, start, end, hoverEnd, onPick }) {
  const days = useMemo(() => {
    const first = startOfMonth(month);
    const last = endOfMonth(month);
    const leadingBlanks = first.getDay(); // 0=Sun
    const cells = [];
    for (let i = 0; i < leadingBlanks; i++) cells.push(null);
    eachDayOfInterval({ start: first, end: last }).forEach((d) => cells.push(d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [month]);

  // For range highlight, use start + (hoverEnd if user is picking, else end)
  const rangeEnd = end || hoverEnd;

  const isInRange = (d) => {
    if (!start || !rangeEnd) return false;
    const lo = isBefore(start, rangeEnd) ? start : rangeEnd;
    const hi = isAfter(start, rangeEnd) ? start : rangeEnd;
    return !isBefore(d, startOfDay(lo)) && !isAfter(d, endOfDay(hi));
  };

  return (
    <div className="flex-1 min-w-0">
      <div className="text-center text-xs font-mono text-fg-muted mb-2">
        {format(month, "MMMM yyyy")}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-[0.65rem] font-mono text-fg-subtle mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((d, i) => {
          if (!d) return <div key={i} />;
          const isStart = start && isSameDay(d, start);
          const isEnd = end && isSameDay(d, end);
          const inRange = isInRange(d);
          const isToday = isSameDay(d, new Date());

          let cls = "h-7 mx-px text-xs font-mono flex items-center justify-center transition-colors cursor-pointer ";
          if (isStart || isEnd) {
            cls += "bg-accent text-fg rounded-md";
          } else if (inRange) {
            cls += "bg-accent/15 text-fg";
          } else {
            cls += "text-fg-muted hover:bg-bg rounded-md";
          }
          if (!isSameMonth(d, month)) cls += " opacity-40";

          return (
            <button
              key={i}
              type="button"
              className={cls}
              onMouseEnter={() => onPick("hover", d)}
              onClick={() => onPick("click", d)}
            >
              <span className={isToday && !isStart && !isEnd ? "underline decoration-accent underline-offset-2" : ""}>
                {d.getDate()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TimeRangeSelector({ value, onChange, autoRefreshing }) {
  const [open, setOpen] = useState(false);
  const isCustom = value?.kind === "custom";

  // Calendar picker state
  const initialRange = useMemo(() => {
    if (isCustom && value.from && value.to) {
      return { start: new Date(value.from), end: new Date(value.to) };
    }
    return rangeFromValue(value);
  }, [open]); // recompute when opening

  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(subMonths(initialRange.end || new Date(), 1))
  );
  const [pickStart, setPickStart] = useState(initialRange.start);
  const [pickEnd, setPickEnd] = useState(initialRange.end);
  const [hoverEnd, setHoverEnd] = useState(null);
  const [pickingEnd, setPickingEnd] = useState(false);

  // Reset draft state every time the popover opens
  useEffect(() => {
    if (open) {
      setPickStart(initialRange.start);
      setPickEnd(initialRange.end);
      setHoverEnd(null);
      setPickingEnd(false);
      setViewMonth(startOfMonth(subMonths(initialRange.end || new Date(), 1)));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Active preset key (for highlighting in the list)
  const activePresetKey = !isCustom ? value?.preset : null;

  const triggerLabel = isCustom
    ? formatRange(new Date(value.from), new Date(value.to))
    : ALL_PRESETS.find((p) => p.key === (value?.preset || "24h"))?.label || "Last 24 hours";

  const handlePreset = (key) => {
    onChange({ kind: "preset", preset: key });
    setOpen(false);
  };

  const handleDayPick = (kind, date) => {
    if (kind === "hover") {
      if (pickingEnd && pickStart) setHoverEnd(date);
      return;
    }
    // click
    if (!pickingEnd) {
      setPickStart(startOfDay(date));
      setPickEnd(null);
      setHoverEnd(null);
      setPickingEnd(true);
    } else {
      if (pickStart && isBefore(date, pickStart)) {
        // Clicked before start → reset start to this date
        setPickStart(startOfDay(date));
        setPickEnd(null);
      } else {
        setPickEnd(endOfDay(date));
        setPickingEnd(false);
      }
      setHoverEnd(null);
    }
  };

  const applyCustom = () => {
    if (!pickStart || !pickEnd) return;
    onChange({
      kind: "custom",
      from: pickStart.toISOString(),
      to: pickEnd.toISOString(),
    });
    setOpen(false);
  };

  const clearDraft = () => {
    setPickStart(null);
    setPickEnd(null);
    setHoverEnd(null);
    setPickingEnd(false);
  };

  const customValid = pickStart && pickEnd && isBefore(pickStart, pickEnd);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center gap-2 rounded-md border border-border bg-bg-elevated/40 px-3 py-1.5 text-sm text-fg hover:border-border-strong hover:bg-bg-elevated/60 transition-colors"
          title="Change time range"
        >
          {autoRefreshing && isRealtimePreset(value) && (
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-syntax-string" />
          )}
          <span className="font-mono text-xs">{triggerLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 text-fg-subtle" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[640px] p-0">
        <div className="flex">
          {/* Presets list */}
          <div className="w-44 border-r border-border py-2 max-h-[420px] overflow-y-auto no-scrollbar">
            <div className="px-3 pt-1 pb-1.5">
              <span className="eyebrow">Realtime</span>
            </div>
            {REALTIME_PRESETS.map((p) => {
              const active = activePresetKey === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handlePreset(p.key)}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-sm transition-colors ${
                    active ? "text-accent" : "text-fg-muted hover:text-fg hover:bg-bg"
                  }`}
                >
                  <span>{p.label}</span>
                  {active && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })}

            <div className="mt-2 px-3 pt-1 pb-1.5">
              <span className="eyebrow">Calendar</span>
            </div>
            {CALENDAR_PRESETS.map((p) => {
              const active = activePresetKey === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handlePreset(p.key)}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-sm transition-colors ${
                    active ? "text-accent" : "text-fg-muted hover:text-fg hover:bg-bg"
                  }`}
                >
                  <span>{p.label}</span>
                  {active && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>

          {/* Calendar */}
          <div className="flex-1 p-4">
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                className="p-1 rounded text-fg-subtle hover:text-fg hover:bg-bg transition-colors"
                title="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[0.65rem] font-mono uppercase tracking-[0.18em] text-fg-subtle">
                Custom range
              </span>
              <button
                type="button"
                onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                className="p-1 rounded text-fg-subtle hover:text-fg hover:bg-bg transition-colors"
                title="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-4">
              <CalendarMonth
                month={viewMonth}
                start={pickStart}
                end={pickEnd}
                hoverEnd={hoverEnd}
                onPick={handleDayPick}
              />
              <CalendarMonth
                month={addMonths(viewMonth, 1)}
                start={pickStart}
                end={pickEnd}
                hoverEnd={hoverEnd}
                onPick={handleDayPick}
              />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-border">
              <div className="text-xs font-mono text-fg-subtle">
                {pickStart && pickEnd ? (
                  <>
                    <span className="text-fg">{format(pickStart, "MMM d, yyyy")}</span>
                    <span className="mx-1.5 text-fg-subtle">→</span>
                    <span className="text-fg">{format(pickEnd, "MMM d, yyyy")}</span>
                  </>
                ) : pickStart ? (
                  <>
                    <span className="text-fg">{format(pickStart, "MMM d, yyyy")}</span>
                    <span className="mx-1.5 text-fg-subtle">→</span>
                    <span className="text-fg-subtle">pick end</span>
                  </>
                ) : (
                  <span>Click a day to start</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={clearDraft} disabled={!pickStart}>
                  Clear
                </Button>
                <Button size="sm" onClick={applyCustom} disabled={!customValid}>
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
