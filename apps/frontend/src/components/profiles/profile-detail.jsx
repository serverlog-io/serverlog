import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import ProfileApi from "@/api/profile.api";
import { getRelativeTime } from "@/lib/time";
import { getColorsFromHex } from "@/lib/colors";

function ActivityChart({ data, loading }) {
  if (loading) {
    return (
      <div className="flex h-full items-end gap-[3px] px-1">
        {[...Array(30)].map((_, i) => (
          <div key={i} className="flex-1 h-full flex items-end">
            <div
              className="w-full rounded-sm bg-white/5 animate-pulse"
              style={{ height: `${20 + Math.random() * 60}%` }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-white/30">
        No activity data
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const hasActivity = data.some((d) => d.count > 0);

  if (!hasActivity) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-white/30">
        No activity in this period
      </div>
    );
  }

  return (
    <div className="flex h-full items-end gap-[3px] px-1">
      {data.map((day, i) => {
        const heightPercent = day.count > 0
          ? Math.max((day.count / maxCount) * 100, 8)
          : 3;
        const hasEvents = day.count > 0;

        return (
          <div key={i} className="group relative flex-1 h-full flex items-end">
            <div
              className={`w-full rounded-sm transition-all duration-200 ${
                hasEvents
                  ? "bg-gradient-to-t from-emerald-500/80 to-emerald-400/60 group-hover:from-emerald-400 group-hover:to-emerald-300"
                  : "bg-white/[0.06]"
              }`}
              style={{ height: `${heightPercent}%` }}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-900 border border-white/10 px-2.5 py-1.5 text-xs text-white shadow-xl group-hover:block z-10">
              <span className="text-white/50">{day.date}</span>
              <span className="mx-1.5 text-white/20">·</span>
              <span className="font-medium text-emerald-400">{day.count}</span>
              <span className="text-white/50"> events</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EventRow({ event }) {
  const channelColor = event.channel?.color || "#6366f1";
  const colors = getColorsFromHex(channelColor);

  return (
    <div className="flex items-start sm:items-center gap-3 bg-white/[0.02] px-3 sm:px-4 py-3 transition-colors hover:bg-white/[0.04] border-b border-white/[0.04] last:border-b-0">
      <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-md bg-white/5 text-xs sm:text-sm">
        {event.icon || "●"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm text-white/90 truncate">{event.event}</div>
            {event.description && (
              <p className="truncate text-xs text-white/40">{event.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 sm:shrink-0">
            {event.channel && (
              <span
                className="rounded px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-medium"
                style={{ backgroundColor: colors.bg, color: colors.text }}
              >
                {event.channel.name}
              </span>
            )}
            <span className="shrink-0 font-mono text-[10px] sm:text-[11px] text-white/30">
              {getRelativeTime(event.timestamp)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value, highlight }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] uppercase tracking-wider text-white/40">{label}</span>
      <span className={`text-sm font-medium tabular-nums ${highlight ? "text-emerald-400" : "text-white"}`}>
        {value}
      </span>
    </div>
  );
}

export function ProfileDetail({ profile, projectId, onBack }) {
  const router = useRouter();
  const [activity, setActivity] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || !projectId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [activityRes, eventsRes] = await Promise.all([
          ProfileApi.getActivity(projectId, profile.id, { days: 30 }),
          ProfileApi.getEvents(projectId, profile.id, { limit: 10 }),
        ]);
        setActivity(activityRes.data.data);
        setEvents(eventsRes.data.events);
      } catch (err) {
        console.error("Failed to fetch profile details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile, projectId]);

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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      {/* Navigation */}
      <div className="mb-6 flex items-center justify-between gap-2">
        <button
          onClick={onBack}
          className="-ml-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-white/40 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Profiles</span>
        </button>
        <button
          onClick={handleViewAllEvents}
          className="flex items-center gap-2 rounded-md border border-white/10 px-2.5 py-1.5 text-xs sm:text-sm sm:px-3 text-white/70 transition-colors hover:border-white/20 hover:text-white"
        >
          <span className="hidden sm:inline">View all events</span>
          <span className="sm:hidden">All events</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Profile header + Stats */}
      <div className="mb-8 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <img
              src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(profile.externalId)}`}
              alt=""
              className="h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-white/5 ring-2 ring-white/10"
            />
            <div>
              <h1 className="text-base font-semibold text-white truncate max-w-[200px] sm:max-w-none">{profile.externalId}</h1>
              <p className="text-xs text-white/40">
                {profile.eventsCount?.toLocaleString() || 0} total events
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:flex sm:items-center sm:gap-8">
            <StatItem
              label="Events"
              value={profile.eventsCount?.toLocaleString() || 0}
              highlight
            />
            <StatItem
              label="First seen"
              value={formatDate(profile.firstSeenAt)}
            />
            <StatItem
              label="Last active"
              value={getRelativeTime(profile.lastSeenAt)}
            />
            <StatItem
              label="Properties"
              value={propertyEntries.length}
            />
          </div>
        </div>
      </div>

      {/* Properties section */}
      {propertyEntries.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-white/30">
            Properties
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {propertyEntries.map(([key, value]) => (
              <div
                key={key}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3"
              >
                <div className="text-[11px] uppercase tracking-wider text-white/40">{key}</div>
                <div className="mt-1 truncate font-mono text-sm text-white">{String(value)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Chart */}
      <div className="mb-8">
        <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-white/30">
          Activity
        </h2>
        <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent">
          <div className="relative h-32 sm:h-40">
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/[0.03] to-transparent" />
            <div className="relative h-full p-3 pb-5 sm:p-4 sm:pb-6">
              <ActivityChart data={activity} loading={loading} />
            </div>
            <div className="absolute bottom-1.5 left-3 sm:bottom-2 sm:left-4 text-[9px] sm:text-[10px] uppercase tracking-wider text-white/30">
              Last 30 days
            </div>
            <div className="absolute bottom-1.5 right-3 sm:bottom-2 sm:right-4 text-[9px] sm:text-[10px] text-white/30">
              {activity?.reduce((sum, d) => sum + d.count, 0) || 0} events
            </div>
          </div>
        </div>
      </div>

      {/* Recent events */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wider text-white/30">
            Recent events
          </h2>
          <button
            onClick={handleViewAllEvents}
            className="text-xs text-white/30 transition-colors hover:text-white/60"
          >
            View all →
          </button>
        </div>
        <div className="overflow-hidden rounded-lg border border-white/[0.06]">
          {loading ? (
            <div className="flex items-center justify-center py-12 bg-white/[0.02]">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-white/40" />
            </div>
          ) : events.length > 0 ? (
            <div>
              {events.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="bg-white/[0.02] py-12 text-center text-sm text-white/30">
              No events yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
