import { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef, useMemo } from "react";
import { useRouter } from "next/router";
import { subHours, subDays, subMinutes } from "date-fns";
import { MoreVertical, Pencil, Trash2, BarChart3 as BarChartIcon, Palette, ExternalLink } from "lucide-react";
import EventApi from "@/api/event.api";
import { colorPalette } from "@/lib/colors";
import { TimeseriesChart } from "@/components/charts/timeseries-chart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CHART_TYPES = [
  { value: "AREA", label: "Area" },
  { value: "LINE", label: "Line" },
  { value: "BAR", label: "Bar" },
  { value: "STEP", label: "Step" },
  { value: "SCATTER", label: "Scatter" },
];

const RANGE_OPTIONS = [
  { label: "1m", value: "1m", getRange: () => ({ start: subMinutes(new Date(), 1), end: new Date() }) },
  { label: "30m", value: "30m", getRange: () => ({ start: subMinutes(new Date(), 30), end: new Date() }) },
  { label: "1h", value: "1h", getRange: () => ({ start: subHours(new Date(), 1), end: new Date() }) },
  { label: "6h", value: "6h", getRange: () => ({ start: subHours(new Date(), 6), end: new Date() }) },
  { label: "24h", value: "24h", getRange: () => ({ start: subHours(new Date(), 24), end: new Date() }) },
  { label: "7d", value: "7d", getRange: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
  { label: "30d", value: "30d", getRange: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
];

function getBucketKey(date, interval) {
  const d = new Date(date);
  if (interval === "second") {
    d.setUTCMilliseconds(0);
  } else if (interval === "minute") {
    d.setUTCSeconds(0, 0);
  } else if (interval === "hour") {
    d.setUTCMinutes(0, 0, 0);
  } else {
    d.setUTCHours(0, 0, 0, 0);
  }
  return d.toISOString();
}

// Parse search query to extract channel, user, tags, and text search
function parseSearchQuery(query) {
  const tagFilters = [];
  const channelFilters = [];
  const userFilters = [];

  const channelRegex = /#([\w-]+)/g;
  let channelMatch;
  while ((channelMatch = channelRegex.exec(query)) !== null) {
    channelFilters.push(channelMatch[1]);
  }

  const userRegex = /@([\w-]+)/g;
  let userMatch;
  while ((userMatch = userRegex.exec(query)) !== null) {
    userFilters.push(userMatch[1]);
  }

  let processedQuery = query.replace(channelRegex, "").replace(userRegex, "").trim();

  let textSearch = "";
  const tagRegex = /([\w-]+):(?:"([^"]*)"|(\S*))/g;
  let match;
  let lastIndex = 0;
  const textParts = [];

  while ((match = tagRegex.exec(processedQuery)) !== null) {
    if (match.index > lastIndex) {
      textParts.push(processedQuery.slice(lastIndex, match.index));
    }
    lastIndex = tagRegex.lastIndex;
    const key = match[1];
    const value = match[2] !== undefined ? match[2] : match[3];
    tagFilters.push({ key, value });
  }

  if (lastIndex < processedQuery.length) {
    textParts.push(processedQuery.slice(lastIndex));
  }

  textSearch = textParts.join("").trim();
  return { tagFilters, channelFilters, userFilters, textSearch };
}

export const DashboardChart = forwardRef(function DashboardChart(
  { chart, projectId, onDelete, onUpdate },
  ref
) {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [interval, setIntervalState] = useState("hour");
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState("24h");
  const [totalEvents, setTotalEvents] = useState(0);
  const [chartType, setChartType] = useState(chart.chartType || "AREA");
  const [chartColor, setChartColor] = useState(chart.color || "#d97757");
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(chart.name);
  const intervalRef = useRef("hour");

  const { textSearch, tagsJson, effectiveChannels, usersFromSearch, tagFilters } = useMemo(() => {
    if (!chart.search && !chart.channel) {
      return { textSearch: "", tagsJson: "", effectiveChannels: [], usersFromSearch: [], tagFilters: [] };
    }
    const { tagFilters, channelFilters, userFilters, textSearch } = parseSearchQuery(chart.search || "");
    const tagsObj = {};
    for (const { key, value } of tagFilters) {
      tagsObj[key] = value;
    }
    const effectiveChannels = channelFilters.length > 0 ? channelFilters : (chart.channel ? [chart.channel] : []);
    return {
      textSearch,
      tagsJson: Object.keys(tagsObj).length > 0 ? JSON.stringify(tagsObj) : "",
      effectiveChannels,
      usersFromSearch: userFilters,
      tagFilters,
    };
  }, [chart.search, chart.channel]);

  useImperativeHandle(ref, () => ({
    addEvent: (event) => {
      const matchesChannel = effectiveChannels.length === 0 || effectiveChannels.includes(event.channel?.slug);
      const matchesUser = usersFromSearch.length === 0 || usersFromSearch.includes(event.userId);

      let matchesTags = true;
      if (tagFilters.length > 0) {
        const eventTags = event.tags || {};
        matchesTags = tagFilters.every(({ key, value }) => {
          if (value === "" || value === null || value === undefined) {
            return key in eventTags;
          }
          return String(eventTags[key]) === String(value);
        });
      }

      let matchesText = true;
      if (textSearch) {
        const searchLower = textSearch.toLowerCase();
        const eventName = (event.event || "").toLowerCase();
        const eventDesc = (event.description || "").toLowerCase();
        matchesText = eventName.includes(searchLower) || eventDesc.includes(searchLower);
      }

      if (!matchesChannel || !matchesUser || !matchesTags || !matchesText) {
        return;
      }

      const eventTimestamp = event.timestamp || event.createdAt;
      const bucketKey = getBucketKey(eventTimestamp, intervalRef.current);

      setData((prevData) => {
        const bucketIndex = prevData.findIndex((bucket) => bucket.timestamp === bucketKey);

        if (bucketIndex !== -1) {
          const newData = [...prevData];
          newData[bucketIndex] = {
            ...newData[bucketIndex],
            count: newData[bucketIndex].count + 1,
          };
          return newData;
        }

        if (prevData.length > 0) {
          const lastBucket = prevData[prevData.length - 1];
          if (new Date(bucketKey) > new Date(lastBucket.timestamp)) {
            const newBucket = { timestamp: bucketKey, count: 1 };
            return [...prevData.slice(1), newBucket];
          }
        }

        return prevData;
      });

      setTotalEvents((prev) => prev + 1);
    },
  }));

  const fetchTimeline = useCallback(async (showLoading = false) => {
    if (!projectId) return;

    if (showLoading) {
      setLoading(true);
    }

    const range = RANGE_OPTIONS.find((r) => r.value === selectedRange)?.getRange() || {
      start: subHours(new Date(), 24),
      end: new Date(),
    };

    try {
      const params = {
        startDate: range.start.toISOString(),
        endDate: range.end.toISOString(),
      };

      if (effectiveChannels.length > 0) {
        params.channel = effectiveChannels.join(',');
      }
      if (usersFromSearch.length > 0) {
        params.userId = usersFromSearch.join(',');
      }
      if (textSearch) {
        params.search = textSearch;
      }
      if (tagsJson) {
        params.tags = tagsJson;
      }

      const { data: response } = await EventApi.getTimeline(projectId, params);
      setData(response.data || []);
      setIntervalState(response.interval || "hour");
      intervalRef.current = response.interval || "hour";
      setTotalEvents(response.data?.reduce((sum, d) => sum + d.count, 0) || 0);
    } catch (err) {
      console.error("Failed to fetch timeline:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId, effectiveChannels, usersFromSearch, textSearch, tagsJson, selectedRange]);

  useEffect(() => {
    fetchTimeline(true);
  }, [fetchTimeline]);

  useEffect(() => {
    if (selectedRange === "1m") return;
    const timer = setInterval(fetchTimeline, 60000);
    return () => clearInterval(timer);
  }, [fetchTimeline, selectedRange]);

  const handleSaveName = () => {
    if (editName.trim() && editName !== chart.name && onUpdate) {
      onUpdate(chart.id, { name: editName.trim() });
    }
    setIsEditing(false);
  };

  useEffect(() => {
    if (loading || interval === "day") return;

    const timer = setInterval(() => {
      setData((prevData) => {
        if (prevData.length === 0) return prevData;

        const currentBucketKey = getBucketKey(new Date(), intervalRef.current);
        const lastBucket = prevData[prevData.length - 1];

        const bucketExists = prevData.some((d) => d.timestamp === currentBucketKey);
        if (bucketExists) return prevData;

        if (new Date(currentBucketKey) > new Date(lastBucket.timestamp)) {
          const newBucket = { timestamp: currentBucketKey, count: 0 };
          return [...prevData.slice(1), newBucket];
        }

        return prevData;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, interval]);

  const hasFilters = textSearch || tagFilters.length > 0 || effectiveChannels.length > 0 || usersFromSearch.length > 0;

  return (
    <div className="rounded-lg border border-border bg-bg-elevated/30">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[0.65rem] font-mono uppercase tracking-[0.18em] text-fg-subtle shrink-0">
            chart
          </span>
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
                if (e.key === "Escape") {
                  setEditName(chart.name);
                  setIsEditing(false);
                }
              }}
              autoFocus
              className="rounded border border-border-strong bg-bg-elevated px-2 py-0.5 text-sm text-fg outline-none focus:border-accent/50"
            />
          ) : (
            <span className="font-serif text-base text-fg truncate">{chart.name}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="shrink-0 text-[0.65rem] font-mono" style={{ color: chartColor }}>
            ●
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="rounded p-1 text-fg-subtle hover:bg-bg-elevated hover:text-fg transition-colors focus:outline-none"
                title="Options"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs">
                  <BarChartIcon className="h-4 w-4" />
                  <span>Chart type</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {CHART_TYPES.map((type) => (
                    <DropdownMenuItem
                      key={type.value}
                      onClick={() => {
                        setChartType(type.value);
                        if (onUpdate) onUpdate(chart.id, { chartType: type.value });
                      }}
                      className={`text-xs ${chartType === type.value ? "bg-bg-elevated text-fg" : ""}`}
                    >
                      {type.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs">
                  <Palette className="h-4 w-4" />
                  <span>Color</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="p-2">
                  <div className="grid grid-cols-6 gap-1.5">
                    {colorPalette.map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          setChartColor(color);
                          if (onUpdate) onUpdate(chart.id, { color });
                        }}
                        className={`h-5 w-5 rounded-full transition-transform hover:scale-110 ${
                          chartColor === color ? "ring-2 ring-offset-2 ring-offset-bg-elevated scale-110" : ""
                        }`}
                        style={{ backgroundColor: color, "--tw-ring-color": color }}
                      />
                    ))}
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem onClick={() => setIsEditing(true)} className="text-xs">
                <Pencil className="h-4 w-4" />
                <span>Edit name</span>
              </DropdownMenuItem>
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(chart.id)}
                    className="text-xs text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 pt-4 pb-1">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-serif text-3xl tracking-tight tabular-nums">
            {totalEvents}
          </span>
          <span className="text-sm text-fg-muted">
            event{totalEvents !== 1 ? "s" : ""}
          </span>
        </div>
        <p className="mt-1 text-xs text-fg-subtle">
          {RANGE_OPTIONS.find((r) => r.value === selectedRange)?.label} range
        </p>
      </div>

      {/* Filter pills */}
      <div className="flex items-center justify-between gap-3 px-5 pt-2 pb-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {textSearch && (
            <button
              onClick={() => router.push(`/projects/${projectId}?search=${encodeURIComponent(textSearch)}`)}
              className="rounded-full bg-bg-elevated px-2.5 py-1 font-mono text-fg-muted border border-border hover:border-border-strong hover:text-fg transition-colors"
            >
              {textSearch}
            </button>
          )}
          {tagFilters.map(({ key, value }, i) => (
            <button
              key={i}
              onClick={() => router.push(`/projects/${projectId}?search=${encodeURIComponent(`${key}:${value}`)}`)}
              className="rounded-full px-2.5 py-1 font-mono border border-border hover:border-border-strong transition-colors"
              style={{ color: "var(--color-syntax-key)" }}
            >
              {key}:{value}
            </button>
          ))}
          {effectiveChannels.map((channel, i) => (
            <button
              key={i}
              onClick={() => router.push(`/projects/${projectId}?search=${encodeURIComponent(`#${channel}`)}`)}
              className="rounded-full px-2.5 py-1 font-mono border border-border hover:border-border-strong transition-colors"
              style={{ color: "var(--color-syntax-keyword)" }}
            >
              #{channel}
            </button>
          ))}
          {usersFromSearch.map((user, i) => (
            <button
              key={i}
              onClick={() => router.push(`/projects/${projectId}?search=${encodeURIComponent(`@${user}`)}`)}
              className="rounded-full px-2.5 py-1 font-mono border border-border hover:border-border-strong transition-colors"
              style={{ color: "var(--color-syntax-string)" }}
            >
              @{user}
            </button>
          ))}
          {!hasFilters && (
            <span className="text-fg-subtle font-mono">all events</span>
          )}
        </div>
        <button
          onClick={() => router.push(`/projects/${projectId}?search=${encodeURIComponent(chart.search || "")}`)}
          className="shrink-0 flex items-center gap-1.5 text-fg-subtle hover:text-fg transition-colors"
          title="View all filtered events"
        >
          <span>View</span>
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>

      {/* Chart */}
      <div className="px-2 pb-2">
        <TimeseriesChart
          data={data}
          interval={interval}
          chartType={chartType}
          color={chartColor}
          loading={loading}
          height={180}
          emptyText="No activity in this time range"
        />
      </div>

      {/* Range pills */}
      <div className="flex items-center justify-end gap-0.5 px-3 py-2 border-t border-border">
        {RANGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setSelectedRange(option.value)}
            className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
              selectedRange === option.value
                ? "bg-bg-elevated text-fg border border-border-strong"
                : "text-fg-subtle hover:text-fg-muted border border-transparent"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
});
