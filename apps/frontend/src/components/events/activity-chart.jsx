import { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from "react";
import { subHours, subDays, subMinutes } from "date-fns";
import EventApi from "@/api/event.api";
import { TimeseriesChart } from "@/components/charts/timeseries-chart";

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

  useImperativeHandle(ref, () => ({
    addEvent: (eventTimestamp) => {
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

  const fetchTimeline = useCallback(async (force = false, showLoading = true) => {
    if (!projectId) return;

    const paramsKey = JSON.stringify({
      projectId,
      channelFilter,
      userFilter,
      searchQuery,
      searchTags,
      selectedRange,
    });

    if (!force && lastFetchParams.current === paramsKey && data.length > 0) {
      return;
    }

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

      if (channelFilter) params.channel = channelFilter;
      if (userFilter) params.userId = userFilter;
      if (searchQuery) params.search = searchQuery;
      if (searchTags) params.tags = searchTags;

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

  useEffect(() => {
    if (selectedRange === "1m") return;
    const timer = setInterval(() => fetchTimeline(true, false), 60000);
    return () => clearInterval(timer);
  }, [fetchTimeline, selectedRange]);

  useEffect(() => {
    if (intervalRef.current === "day") return;

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
  }, [interval]);

  return (
    <div className="mb-4 rounded-lg border border-border bg-bg-elevated/30">
      <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-[0.65rem] font-mono uppercase tracking-[0.18em] text-fg-subtle">
            activity
          </span>
          <span className="font-mono text-xs text-fg-muted tabular-nums">
            {totalEvents} event{totalEvents !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedRange(option.value)}
              className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
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

      <div className="px-2 pb-2 pt-2">
        <TimeseriesChart
          data={data}
          interval={interval}
          chartType="BAR"
          color="#d97757"
          loading={loading}
          height={160}
          emptyText="No activity in this time range"
        />
      </div>
    </div>
  );
});
