import { getRelativeTime } from "@/lib/time";

const MAX_VISIBLE_PROPS = 3;

export function ProfileRow({ profile, onClick }) {
  const properties = profile.properties || {};
  const propertyEntries = Object.entries(properties);
  const visibleProps = propertyEntries.slice(0, MAX_VISIBLE_PROPS);
  const hiddenCount = propertyEntries.length - MAX_VISIBLE_PROPS;
  const displayName = properties.name || profile.externalId;

  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-4 border-b border-border px-4 py-3 text-left transition-colors hover:bg-bg-elevated/40 last:border-b-0"
    >
      <img
        src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(profile.externalId)}`}
        alt=""
        className="h-9 w-9 shrink-0 rounded-md bg-bg-elevated/40 ring-1 ring-border group-hover:ring-accent/40 transition-all"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-fg truncate">{displayName}</span>
          {displayName !== profile.externalId && (
            <span className="font-mono text-xs text-fg-subtle truncate">
              @{profile.externalId}
            </span>
          )}
        </div>

        {visibleProps.length > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {visibleProps.map(([key, value]) => (
              <span
                key={key}
                className="inline-flex items-center gap-1 rounded bg-bg-elevated/60 px-1.5 py-0.5 font-mono text-[10px] border border-border"
              >
                <span className="text-syntax-key">{key}</span>
                <span className="text-fg-muted">{String(value)}</span>
              </span>
            ))}
            {hiddenCount > 0 && (
              <span className="rounded px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle">
                +{hiddenCount}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 text-right">
        <span className="font-mono text-xs text-accent tabular-nums">
          {(profile.eventsCount || 0).toLocaleString()} events
        </span>
        <span className="font-mono text-[10px] text-fg-subtle tabular-nums">
          last seen {getRelativeTime(profile.lastSeenAt)}
        </span>
      </div>

      <span className="text-fg-subtle opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        →
      </span>
    </button>
  );
}
