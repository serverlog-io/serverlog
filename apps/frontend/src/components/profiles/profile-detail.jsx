import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { ArrowLeft, ExternalLink, Copy, Check } from "lucide-react";
import ProfileApi from "@/api/profile.api";
import { getRelativeTime } from "@/lib/time";
import { getColorsFromHex } from "@/lib/colors";
import { TimeseriesChart } from "@/components/charts/timeseries-chart";

const RANGE_OPTIONS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-fg-subtle hover:text-fg transition-colors"
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function EventRow({ event, onClick }) {
  const channelColor = event.channel?.color || "#d97757";
  const colors = getColorsFromHex(channelColor);

  return (
    <div
      onClick={onClick}
      className="group flex items-center gap-3 border-b border-border px-4 py-2.5 transition-colors hover:bg-bg-elevated/40 last:border-b-0 cursor-pointer"
    >
      <span className="shrink-0 text-sm w-5 text-center">{event.icon || "●"}</span>
      <span className="shrink-0 text-sm text-fg truncate max-w-[260px]">{event.event}</span>
      <div className="min-w-0 flex-1 text-xs text-fg-muted truncate">
        {event.description}
      </div>
      {event.channel?.slug && (
        <button
          className="rounded px-1.5 py-0.5 font-mono text-[11px] transition-colors"
          style={{
            backgroundColor: colors.bg,
            color: colors.text,
          }}
        >
          #{event.channel.slug}
        </button>
      )}
      <time className="shrink-0 font-mono text-[11px] text-fg-subtle tabular-nums min-w-[48px] text-right">
        {getRelativeTime(event.timestamp)}
      </time>
    </div>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="rounded-lg border border-border bg-bg-elevated/30 px-4 py-3">
      <div className="text-[0.65rem] font-mono uppercase tracking-[0.18em] text-fg-subtle">
        {label}
      </div>
      <div
        className={`mt-1 font-serif text-2xl tracking-tight tabular-nums ${
          accent ? "text-accent" : "text-fg"
        }`}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-fg-muted">{sub}</div>}
    </div>
  );
}

function BreakdownList({ title, items, formatItem, max }) {
  const total = items.reduce((s, i) => s + i.count, 0);
  return (
    <div>
      <span className="eyebrow">{title}</span>
      <div className="mt-3 rounded-lg border border-border bg-bg-elevated/30">
        {items.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-fg-muted">No data yet</p>
        ) : (
          items.map((item, i) => {
            const pct = total > 0 ? (item.count / Math.max(total, max || total)) * 100 : 0;
            const { label, color, icon } = formatItem(item);
            return (
              <div
                key={i}
                className="relative border-b border-border last:border-b-0 px-4 py-2.5 overflow-hidden"
              >
                <div
                  className="absolute inset-y-0 left-0 transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: color
                      ? `${color}1f`
                      : "rgba(217, 119, 87, 0.12)",
                  }}
                />
                <div className="relative flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {icon && <span className="text-sm shrink-0">{icon}</span>}
                    <span className="text-sm text-fg truncate">{label}</span>
                  </div>
                  <span className="font-mono text-xs text-fg-muted tabular-nums shrink-0">
                    {item.count.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function ProfileDetail({ profile, projectId, onBack }) {
  const router = useRouter();
  const [activity, setActivity] = useState(null);
  const [events, setEvents] = useState([]);
  const [breakdown, setBreakdown] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingBreakdown, setLoadingBreakdown] = useState(true);
  const [rangeDays, setRangeDays] = useState(30);

  useEffect(() => {
    if (!profile || !projectId) return;
    setLoadingEvents(true);
    ProfileApi.getEvents(projectId, profile.id, { limit: 12 })
      .then((res) => setEvents(res.data.events))
      .catch(() => {})
      .finally(() => setLoadingEvents(false));
  }, [profile, projectId]);

  useEffect(() => {
    if (!profile || !projectId) return;
    setLoadingActivity(true);
    ProfileApi.getActivity(projectId, profile.id, { days: rangeDays })
      .then((res) => setActivity(res.data.data))
      .catch(() => {})
      .finally(() => setLoadingActivity(false));
  }, [profile, projectId, rangeDays]);

  useEffect(() => {
    if (!profile || !projectId) return;
    setLoadingBreakdown(true);
    ProfileApi.getBreakdown(projectId, profile.id, { days: rangeDays, limit: 6 })
      .then((res) => setBreakdown(res.data))
      .catch(() => {})
      .finally(() => setLoadingBreakdown(false));
  }, [profile, projectId, rangeDays]);

  // Map activity buckets to TimeseriesChart's {timestamp, count} format
  const chartData = useMemo(() => {
    if (!activity) return [];
    return activity.map((d) => ({
      timestamp: new Date(d.date).toISOString(),
      count: d.count,
    }));
  }, [activity]);

  const totalInRange = useMemo(
    () => (activity || []).reduce((s, d) => s + d.count, 0),
    [activity]
  );

  if (!profile) return null;

  const properties = profile.properties || {};
  const propertyEntries = Object.entries(properties);

  const handleViewAllEvents = () => {
    router.push(`/projects/${projectId}?search=${encodeURIComponent(`@${profile.externalId}`)}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const tenureDays = profile.firstSeenAt
    ? Math.max(
        1,
        Math.floor((Date.now() - new Date(profile.firstSeenAt).getTime()) / (24 * 60 * 60 * 1000))
      )
    : 0;

  return (
    <div className="space-y-10">
      {/* Back nav */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onBack}
          className="-ml-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-fg-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to profiles</span>
        </button>
        <button
          onClick={handleViewAllEvents}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
        >
          <span className="hidden sm:inline">View all events</span>
          <span className="sm:hidden">Events</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-6">
        <img
          src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(profile.externalId)}`}
          alt=""
          className="h-20 w-20 sm:h-24 sm:w-24 rounded-md bg-bg-elevated/40 ring-2 ring-accent/40 ring-offset-4 ring-offset-bg shrink-0"
        />
        <div className="min-w-0 flex-1">
          <span className="eyebrow">User profile</span>
          <h1 className="mt-2 font-serif text-4xl tracking-tight truncate">
            {properties.name || profile.externalId}
          </h1>
          <div className="mt-2 flex items-center gap-2 font-mono text-sm text-fg-muted">
            <span>@{profile.externalId}</span>
            <CopyButton value={profile.externalId} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Lifetime events"
          value={(profile.eventsCount || 0).toLocaleString()}
          accent
        />
        <StatCard
          label={`Days active · ${rangeDays}d`}
          value={loadingBreakdown ? "—" : (breakdown?.daysActive ?? 0)}
          sub={breakdown ? `of ${rangeDays}` : null}
        />
        <StatCard
          label="First seen"
          value={formatDate(profile.firstSeenAt)}
          sub={tenureDays > 0 ? `${tenureDays} day${tenureDays === 1 ? "" : "s"} ago` : null}
        />
        <StatCard
          label="Last active"
          value={getRelativeTime(profile.lastSeenAt)}
          sub={formatDateTime(profile.lastSeenAt)}
        />
      </div>

      {/* Activity chart */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <span className="eyebrow">Activity</span>
            <h2 className="mt-3 font-serif text-2xl tracking-tight">
              {totalInRange.toLocaleString()}{" "}
              <span className="text-fg-muted text-base font-sans">events in last {rangeDays} days</span>
            </h2>
          </div>
          <div className="flex items-center gap-0.5">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                onClick={() => setRangeDays(opt.days)}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                  rangeDays === opt.days
                    ? "bg-bg-elevated text-fg border border-border-strong"
                    : "text-fg-subtle hover:text-fg-muted border border-transparent"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-bg-elevated/30 p-2">
          <TimeseriesChart
            data={chartData}
            interval="day"
            chartType="BAR"
            color="#d97757"
            loading={loadingActivity}
            height={180}
            emptyText={`No activity in the last ${rangeDays} days`}
          />
        </div>
      </section>

      {/* Breakdown: top channels + top events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BreakdownList
          title={`Top channels · ${rangeDays}d`}
          items={breakdown?.topChannels || []}
          formatItem={(item) => ({
            label: item.channel?.name || item.channel?.slug || "—",
            color: item.channel?.color,
            icon: item.channel?.icon,
          })}
          max={breakdown?.topChannels?.[0]?.count || 0}
        />
        <BreakdownList
          title={`Top events · ${rangeDays}d`}
          items={breakdown?.topEvents || []}
          formatItem={(item) => ({ label: item.event })}
          max={breakdown?.topEvents?.[0]?.count || 0}
        />
      </div>

      {/* Properties */}
      {propertyEntries.length > 0 && (
        <section>
          <span className="eyebrow">Properties · {propertyEntries.length}</span>
          <div className="mt-3 rounded-lg border border-border bg-bg-elevated/30 divide-y divide-border">
            {propertyEntries.map(([key, value]) => (
              <div
                key={key}
                className="grid grid-cols-[140px_1fr_auto] items-center gap-4 px-4 py-2.5"
              >
                <div className="text-[0.7rem] font-mono uppercase tracking-[0.14em] text-fg-subtle truncate">
                  {key}
                </div>
                <div className="font-mono text-sm text-fg truncate">{String(value)}</div>
                <CopyButton value={String(value)} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent events */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <span className="eyebrow">Recent events</span>
          <button
            onClick={handleViewAllEvents}
            className="text-xs font-mono text-fg-subtle hover:text-fg transition-colors"
          >
            view all →
          </button>
        </div>
        <div className="rounded-lg border border-border bg-bg-elevated/20 overflow-hidden">
          {loadingEvents ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent" />
            </div>
          ) : events.length === 0 ? (
            <div className="py-12 text-center text-sm text-fg-muted">
              No events yet
            </div>
          ) : (
            events.map((event) => (
              <EventRow key={event.id} event={event} onClick={handleViewAllEvents} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
