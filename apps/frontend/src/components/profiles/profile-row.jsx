import { getRelativeTime } from "@/lib/time";

export function ProfileRow({ profile, isSelected, onClick }) {
  const properties = profile.properties || {};
  const propertyEntries = Object.entries(properties);

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer border-b border-white/4 px-4 py-4 transition-colors hover:bg-white/2 last:border-b-0 ${
        isSelected ? "bg-white/4" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <img
          src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(profile.externalId)}`}
          alt=""
          className="h-10 w-10 shrink-0 rounded-full bg-white/5"
        />

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{profile.externalId}</span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
              {profile.eventsCount} events
            </span>
          </div>

          {/* Properties as badges */}
          {propertyEntries.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {propertyEntries.map(([key, value]) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 rounded bg-white/4 px-1.5 py-0.5 text-[10px]"
                >
                  <span className="text-white/30">{key}:</span>
                  <span className="text-white/60">{String(value)}</span>
                </span>
              ))}
            </div>
          )}

          {/* Dates */}
          <div className="mt-2 flex items-center gap-3 text-xs text-white/30">
            <span>First seen: {getRelativeTime(profile.firstSeenAt)}</span>
            <span>•</span>
            <span>Last seen: {getRelativeTime(profile.lastSeenAt)}</span>
          </div>
        </div>

        {/* Chevron */}
        <svg
          className={`h-5 w-5 shrink-0 text-white/20 transition-transform ${
            isSelected ? "rotate-90" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </div>
  );
}
