import { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef, useMemo } from "react";
import { useRouter } from "next/router";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subHours, subDays, subMinutes } from "date-fns";
import { MoreVertical, Pencil, Trash2, BarChart3 as BarChartIcon, Palette, ExternalLink } from "lucide-react";
import EventApi from "@/api/event.api";
import { colorPalette } from "@/lib/colors";
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
  { value: "BAR", label: "Bar", icon: "▊" },
  { value: "LINE", label: "Line", icon: "⟋" },
  { value: "AREA", label: "Area", icon: "▓" },
  { value: "STEP", label: "Step", icon: "⌐" },
  { value: "SCATTER", label: "Scatter", icon: "⋯" },
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

function formatXAxis(timestamp, interval) {
  const date = new Date(timestamp);
  if (interval === "second") {
    return format(date, "HH:mm:ss");
  } else if (interval === "minute") {
    return format(date, "HH:mm");
  } else if (interval === "hour") {
    return format(date, "HH:mm");
  } else {
    return format(date, "MMM d");
  }
}

function CustomTooltip({ active, payload, label, interval }) {
  if (!active || !payload || !payload.length) return null;

  // For scatter charts, get timestamp from payload data
  const timestamp = label || payload[0]?.payload?.timestamp;
  if (!timestamp) return null;

  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return null;

  let formattedDate;
  if (interval === "second") {
    formattedDate = format(date, "HH:mm:ss");
  } else if (interval === "minute") {
    formattedDate = format(date, "MMM d, HH:mm");
  } else if (interval === "hour") {
    formattedDate = format(date, "MMM d, HH:00");
  } else {
    formattedDate = format(date, "MMM d, yyyy");
  }

  const count = payload[0]?.payload?.count ?? payload[0]?.value ?? 0;

  return (
    <div className="rounded-lg border border-white/10 bg-black/90 px-3 py-2 shadow-lg">
      <p className="text-xs text-white/50">{formattedDate}</p>
      <p className="text-sm font-medium text-white">
        {count} event{count !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

// Parse search query to extract channel, user, tags, and text search
function parseSearchQuery(query) {
  const tagFilters = [];
  const channelFilters = [];
  const userFilters = [];

  // Extract channel filters (#channel)
  const channelRegex = /#([\w-]+)/g;
  let channelMatch;
  while ((channelMatch = channelRegex.exec(query)) !== null) {
    channelFilters.push(channelMatch[1]);
  }

  // Extract user filters (@user)
  const userRegex = /@([\w-]+)/g;
  let userMatch;
  while ((userMatch = userRegex.exec(query)) !== null) {
    userFilters.push(userMatch[1]);
  }

  // Remove channel and user filters from query for further processing
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
  const [chartType, setChartType] = useState(chart.chartType || "BAR");
  const [chartColor, setChartColor] = useState(chart.color || "#6366f1");
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(chart.name);
  const intervalRef = useRef("hour");

  // Parse chart's search query (memoized to avoid infinite re-renders)
  const { textSearch, tagsJson, effectiveChannels, usersFromSearch, tagFilters } = useMemo(() => {
    if (!chart.search && !chart.channel) {
      return { textSearch: "", tagsJson: "", effectiveChannels: [], usersFromSearch: [], tagFilters: [] };
    }
    const { tagFilters, channelFilters, userFilters, textSearch } = parseSearchQuery(chart.search || "");
    const tagsObj = {};
    for (const { key, value } of tagFilters) {
      tagsObj[key] = value;
    }
    // Use channels from search query, or fallback to chart.channel for backwards compatibility
    const effectiveChannels = channelFilters.length > 0 ? channelFilters : (chart.channel ? [chart.channel] : []);
    return {
      textSearch,
      tagsJson: Object.keys(tagsObj).length > 0 ? JSON.stringify(tagsObj) : "",
      effectiveChannels,
      usersFromSearch: userFilters,
      tagFilters,
    };
  }, [chart.search, chart.channel]);

  // Expose addEvent method to parent for real-time updates via socket
  useImperativeHandle(ref, () => ({
    addEvent: (event) => {
      // Check if event matches this chart's filters
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

      // Only update if event matches all filters
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

        // Bucket doesn't exist - check if event is newer than current range
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

  // Initial fetch with loading
  useEffect(() => {
    fetchTimeline(true);
  }, [fetchTimeline]);

  // Auto-refresh: skip for 1m range (use slide window for real-time updates), 60 seconds otherwise
  useEffect(() => {
    // For 1m range, don't poll - rely on slide window for real-time updates
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

  // Slide window forward (only for short intervals, not daily)
  useEffect(() => {
    // Skip slide window for daily intervals (7d, 30d) - no need to update every second
    if (loading || interval === "day") return;

    const timer = setInterval(() => {
      setData((prevData) => {
        if (prevData.length === 0) return prevData;

        const currentBucketKey = getBucketKey(new Date(), intervalRef.current);
        const lastBucket = prevData[prevData.length - 1];

        // Check if current bucket already exists in data (prevent duplicates)
        const bucketExists = prevData.some((d) => d.timestamp === currentBucketKey);
        if (bucketExists) return prevData;

        // Only add new bucket if it's actually a new time period
        if (new Date(currentBucketKey) > new Date(lastBucket.timestamp)) {
          const newBucket = { timestamp: currentBucketKey, count: 0 };
          return [...prevData.slice(1), newBucket];
        }

        return prevData;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, interval]);

  return (
    <div className="rounded-lg border border-white/6 bg-white/2 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
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
              className="rounded border border-white/20 bg-white/5 px-2 py-0.5 text-sm font-medium text-white/70 outline-none focus:border-white/40"
            />
          ) : (
            <span className="text-sm font-medium text-white/70">{chart.name}</span>
          )}
          <span className="text-xs text-white/40">
            {totalEvents} event{totalEvents !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 text-xs font-medium text-white/60 transition-colors hover:text-white hover:bg-white/5">
                {RANGE_OPTIONS.find((r) => r.value === selectedRange)?.label}
                <svg className="h-3 w-3 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {RANGE_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setSelectedRange(option.value)}
                  className={selectedRange === option.value ? "bg-white/10 text-white" : ""}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Options menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="rounded p-1 text-white/30 hover:bg-white/5 hover:text-white/60 focus:outline-none"
                title="Options"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[150px]">
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
                        if (onUpdate) {
                          onUpdate(chart.id, { chartType: type.value });
                        }
                      }}
                      className={`text-xs ${chartType === type.value ? "bg-white/10" : ""}`}
                    >
                      <span className="w-4 text-center">{type.icon}</span>
                      <span>{type.label}</span>
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
                  <div className="grid grid-cols-5 gap-1.5">
                    {colorPalette.map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          setChartColor(color);
                          if (onUpdate) {
                            onUpdate(chart.id, { color });
                          }
                        }}
                        className={`h-6 w-6 rounded-full transition-all hover:scale-110 ${
                          chartColor === color ? "ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1a]" : ""
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem
                onClick={() => setIsEditing(true)}
                className="text-xs"
              >
                <Pencil className="h-4 w-4" />
                <span>Edit name</span>
              </DropdownMenuItem>
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(chart.id)}
                    className="text-xs text-red-400 focus:text-red-300"
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

      {/* Filter info */}
      <div className="mb-3 flex items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {/* Show text search if present */}
          {textSearch && (
            <button
              onClick={() => router.push(`/projects/${projectId}?search=${encodeURIComponent(textSearch)}`)}
              className="rounded-full bg-white/5 px-2.5 py-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white/70"
            >
              {textSearch}
            </button>
          )}
          {/* Show tag filters as separate badges */}
          {tagFilters.map(({ key, value }, i) => (
            <button
              key={i}
              onClick={() => router.push(`/projects/${projectId}?search=${encodeURIComponent(`${key}:${value}`)}`)}
              className="rounded-full bg-blue-500/10 px-2.5 py-1 text-blue-400 transition-colors hover:bg-blue-500/20"
            >
              {key}:{value}
            </button>
          ))}
          {/* Show channel badges */}
          {effectiveChannels.map((channel, i) => (
            <button
              key={i}
              onClick={() => router.push(`/projects/${projectId}?search=${encodeURIComponent(`#${channel}`)}`)}
              className="rounded-full bg-purple-500/10 px-2.5 py-1 text-purple-400 transition-colors hover:bg-purple-500/20"
            >
              #{channel}
            </button>
          ))}
          {/* Show user badges */}
          {usersFromSearch.map((user, i) => (
            <button
              key={i}
              onClick={() => router.push(`/projects/${projectId}?search=${encodeURIComponent(`@${user}`)}`)}
              className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-400 transition-colors hover:bg-emerald-500/20"
            >
              @{user}
            </button>
          ))}
          {!textSearch && tagFilters.length === 0 && effectiveChannels.length === 0 && usersFromSearch.length === 0 && (
            <span className="text-white/30">All events</span>
          )}
        </div>
        {/* View all filtered events button */}
        <button
          onClick={() => router.push(`/projects/${projectId}?search=${encodeURIComponent(chart.search || "")}`)}
          className="shrink-0 flex items-center gap-1.5 text-white/30 transition-colors hover:text-white/60"
          title="View all filtered events"
        >
          <span>View</span>
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>

      <div className="h-[180px] [&_.recharts-wrapper]:!outline-none [&_svg]:!outline-none">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-white/40" />
          </div>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "LINE" ? (
              <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(t) => formatXAxis(t, interval)}
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={50}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip interval={interval} />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={chartColor}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            ) : chartType === "AREA" ? (
              <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(t) => formatXAxis(t, interval)}
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={50}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip interval={interval} />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={chartColor}
                  fill={chartColor}
                  fillOpacity={0.3}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            ) : chartType === "STEP" ? (
              <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(t) => formatXAxis(t, interval)}
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={50}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip interval={interval} />} />
                <Line
                  type="stepAfter"
                  dataKey="count"
                  stroke={chartColor}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            ) : chartType === "SCATTER" ? (
              <ScatterChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(t) => formatXAxis(t, interval)}
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={50}
                  type="category"
                  allowDuplicatedCategory={false}
                />
                <YAxis
                  dataKey="count"
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip interval={interval} />} />
                <Scatter
                  dataKey="count"
                  fill={chartColor}
                  isAnimationActive={false}
                />
              </ScatterChart>
            ) : (
              <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(t) => formatXAxis(t, interval)}
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={50}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip interval={interval} />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                <Bar
                  dataKey="count"
                  fill={chartColor}
                  radius={[2, 2, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-white/30">
            No activity in this time range
          </div>
        )}
      </div>
    </div>
  );
});
