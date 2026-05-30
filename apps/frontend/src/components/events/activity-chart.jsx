import { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subHours, subDays, subMinutes } from "date-fns";
import EventApi from "@/api/event.api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

  const date = new Date(label);
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

  return (
    <div className="rounded-lg border border-white/10 bg-black/90 px-3 py-2 shadow-lg">
      <p className="text-xs text-white/50">{formattedDate}</p>
      <p className="text-sm font-medium text-white">
        {payload[0].value} event{payload[0].value !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

export const ActivityChart = forwardRef(function ActivityChart(
  { projectId, channelFilter, userFilter, searchQuery, searchTags },
  ref
) {
  const [data, setData] = useState([]);
  const [interval, setIntervalState] = useState("hour");
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState("24h");
  const [totalEvents, setTotalEvents] = useState(0);
  const intervalRef = useRef("hour");
  const lastFetchParams = useRef(null);

  // Expose addEvent method to parent
  useImperativeHandle(ref, () => ({
    addEvent: (eventTimestamp) => {
      const bucketKey = getBucketKey(eventTimestamp, intervalRef.current);

      setData((prevData) => {
        // Check if bucket already exists
        const bucketIndex = prevData.findIndex((bucket) => bucket.timestamp === bucketKey);

        if (bucketIndex !== -1) {
          // Increment existing bucket
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
            // Slide the window: remove oldest bucket, add new one at the end
            const newBucket = { timestamp: bucketKey, count: 1 };
            return [...prevData.slice(1), newBucket];
          }
        }

        // Event is older than current range, ignore
        return prevData;
      });

      setTotalEvents((prev) => prev + 1);
    },
  }));

  const fetchTimeline = useCallback(async (force = false, showLoading = true) => {
    if (!projectId) return;

    // Build params key to check if we need to refetch
    const paramsKey = JSON.stringify({
      projectId,
      channelFilter,
      userFilter,
      searchQuery,
      searchTags,
      selectedRange,
    });

    // Skip if params haven't changed (unless forced)
    if (!force && lastFetchParams.current === paramsKey && data.length > 0) {
      return;
    }

    // Show loading skeleton when filters change
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

      if (channelFilter) {
        params.channel = channelFilter;
      }
      if (userFilter) {
        params.userId = userFilter;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      if (searchTags) {
        params.tags = searchTags;
      }

      const { data: response } = await EventApi.getTimeline(projectId, params);
      setData(response.data || []);
      setIntervalState(response.interval || "hour");
      intervalRef.current = response.interval || "hour";
      setTotalEvents(response.data?.reduce((sum, d) => sum + d.count, 0) || 0);
      lastFetchParams.current = paramsKey;
    } catch (err) {
      console.error("Failed to fetch timeline:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId, channelFilter, userFilter, searchQuery, searchTags, selectedRange, data.length]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  // Auto-refresh: skip for 1m range (use socket events + slide window instead), 60 seconds otherwise
  useEffect(() => {
    // For 1m range, don't poll - rely on socket events and slide window for real-time updates
    if (selectedRange === "1m") return;

    const timer = setInterval(() => fetchTimeline(true, false), 60000);
    return () => clearInterval(timer);
  }, [fetchTimeline, selectedRange]);

  // Slide window forward as time passes (only for short intervals, not daily)
  useEffect(() => {
    // Skip slide window for daily intervals (7d, 30d)
    if (intervalRef.current === "day") return;

    const timer = setInterval(() => {
      setData((prevData) => {
        if (prevData.length === 0) return prevData;

        const currentBucketKey = getBucketKey(new Date(), intervalRef.current);
        const lastBucket = prevData[prevData.length - 1];

        // Check if bucket already exists (prevent duplicates)
        const bucketExists = prevData.some((d) => d.timestamp === currentBucketKey);
        if (bucketExists) return prevData;

        // If current time is in a newer bucket, slide the window
        if (new Date(currentBucketKey) > new Date(lastBucket.timestamp)) {
          const newBucket = { timestamp: currentBucketKey, count: 0 };
          return [...prevData.slice(1), newBucket];
        }

        return prevData;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [interval]);

  const renderChartLoading = () => (
    <div className="flex h-full items-center justify-center">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-white/40" />
    </div>
  );

  return (
    <div className="mb-4 rounded-lg border border-white/6 bg-white/2 p-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="shrink-0 text-sm font-medium text-white/70">Activity</span>
        <span className="shrink-0 text-xs text-white/40">
          {totalEvents} event{totalEvents !== 1 ? "s" : ""}
        </span>
        <div className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex shrink-0 items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 text-xs font-medium text-white/60 transition-colors hover:text-white hover:bg-white/5">
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
      </div>

      <div className="h-[180px]">
        {loading ? (
          renderChartLoading()
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
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
                fill="#6366f1"
                radius={[2, 2, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
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
