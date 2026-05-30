import { useState } from "react";
import { getColorsFromHex } from "@/lib/colors";
import { getRelativeTime } from "@/lib/time";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MAX_VISIBLE_TAGS = 3;

function formatExactDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function MoreMenu({ onDelete, event }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-md p-1 text-white/20 transition-colors hover:text-white/60 hover:bg-white/[0.06]">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => onDelete(event)}
          className="text-red-400 focus:text-red-300 focus:bg-red-400/10"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function EventRow({ event, showChannel = true, compact = false, onChannelClick, onTagClick, onUserClick, onDelete }) {
  const [showAllTags, setShowAllTags] = useState(false);
  const channelColor = event.channel?.color || "#6366f1";
  const colors = getColorsFromHex(channelColor);

  const tags = event.tags || {};
  const tagEntries = Object.entries(tags);
  const hasTags = tagEntries.length > 0;

  const visibleTags = showAllTags ? tagEntries : tagEntries.slice(0, MAX_VISIBLE_TAGS);
  const hiddenTagsCount = tagEntries.length - MAX_VISIBLE_TAGS;

  if (compact) {
    return (
      <div className="group flex items-center gap-3 border-b border-white/[0.06] px-4 py-2 transition-colors hover:bg-white/[0.02] last:border-b-0 overflow-hidden">
        {/* Icon */}
        <span className="shrink-0 text-sm">{event.icon || "●"}</span>

        {/* Event name */}
        <span className="shrink-0 text-sm font-medium text-white truncate max-w-[200px]">{event.event}</span>

        {/* Middle: user + tags — this section truncates */}
        <div className="min-w-0 flex-1 flex items-center gap-2 overflow-hidden">
          {event.userId && (
            <button
              onClick={() => onUserClick?.(event.userId)}
              className="flex shrink-0 items-center gap-1.5 rounded-md bg-white/[0.04] px-1.5 py-0.5 transition-colors hover:bg-white/[0.07]"
            >
              <img
                src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(event.userId)}`}
                alt=""
                className="h-3.5 w-3.5 rounded-full"
              />
              <span className="font-mono text-[11px] text-white/50">{event.userId}</span>
            </button>
          )}
          {visibleTags.map(([key, value]) => (
            <button
              key={key}
              onClick={() => onTagClick?.(key, String(value))}
              className="hidden shrink-0 items-center gap-1 rounded-md bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] transition-colors hover:bg-white/[0.07] lg:flex"
            >
              <span className="text-white/25">{key}</span>
              <span className="text-white/45">{String(value)}</span>
            </button>
          ))}
        </div>

        {/* Right side — always pinned */}
        <div className="flex shrink-0 items-center gap-2">
          {showChannel && event.channel?.name && (
            <button
              onClick={() => onChannelClick?.(event.channel.slug)}
              className="rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors [background:var(--bg)] [color:var(--text)] hover:[background:var(--bg-hover)]"
              style={{
                '--bg': colors.bg,
                '--bg-hover': colors.bgHover,
                '--text': colors.text,
              }}
            >
              {event.channel.name}
            </button>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <time className="min-w-[48px] cursor-default text-right font-mono text-[11px] text-white/25">
                  {getRelativeTime(event.timestamp || event.createdAt)}
                </time>
              </TooltipTrigger>
              <TooltipContent side="top" className="font-mono">
                {formatExactDate(event.timestamp || event.createdAt)}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {onDelete && <MoreMenu onDelete={onDelete} event={event} />}
        </div>
      </div>
    );
  }

  const hasFooter = hasTags || event.userId;

  return (
    <div className="group border-b border-white/[0.06] px-5 py-4 transition-colors hover:bg-white/[0.02] last:border-b-0">
      {/* Main content */}
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.03] text-lg shadow-sm ring-1 ring-white/[0.06]">
          {event.icon || "●"}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 pt-0.5">
          {/* Title row */}
          <h3 className="font-medium tracking-tight text-white">{event.event}</h3>

          {/* Description */}
          {event.description && (
            <p className="mt-0.5 text-[13px] leading-relaxed text-white/45">{event.description}</p>
          )}
        </div>

        {/* Right side: Channel + Time + Menu */}
        <div className="flex shrink-0 items-center gap-3">
          {showChannel && event.channel?.name && (
            <button
              onClick={() => onChannelClick?.(event.channel.slug)}
              className="rounded-md px-2 py-1 text-xs font-medium transition-colors [background:var(--bg)] [color:var(--text)] hover:[background:var(--bg-hover)]"
              style={{
                '--bg': colors.bg,
                '--bg-hover': colors.bgHover,
                '--text': colors.text,
              }}
            >
              {event.channel.name}
            </button>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <time className="min-w-[52px] cursor-default text-right font-mono text-[11px] text-white/30">
                  {getRelativeTime(event.timestamp || event.createdAt)}
                </time>
              </TooltipTrigger>
              <TooltipContent side="top" className="font-mono">
                {formatExactDate(event.timestamp || event.createdAt)}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {onDelete && <MoreMenu onDelete={onDelete} event={event} />}
        </div>
      </div>

      {/* Footer: User + Tags */}
      {hasFooter && (
        <div className="mt-3 flex items-center gap-2 pl-14">
          {/* User */}
          {event.userId && (
            <button
              onClick={() => onUserClick?.(event.userId)}
              className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-2 py-1.5 transition-colors hover:bg-white/[0.07]"
            >
              <img
                src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(event.userId)}`}
                alt=""
                className="h-4 w-4 rounded-full"
              />
              <span className="max-w-[120px] truncate font-mono text-[11px] text-white/60">{event.userId}</span>
            </button>
          )}

          {/* Separator */}
          {event.userId && hasTags && (
            <span className="text-white/10">•</span>
          )}

          {/* Tags */}
          {visibleTags.map(([key, value]) => (
            <button
              key={key}
              onClick={() => onTagClick?.(key, String(value))}
              className="flex items-center gap-1 rounded-md bg-white/[0.04] px-2 py-1 font-mono text-[11px] transition-colors hover:bg-white/[0.07]"
            >
              <span className="text-white/30">{key}</span>
              <span className="text-white/50">{String(value)}</span>
            </button>
          ))}

          {/* More tags */}
          {hiddenTagsCount > 0 && !showAllTags && (
            <button
              onClick={() => setShowAllTags(true)}
              className="rounded-md px-2 py-1 font-mono text-[11px] text-white/30 transition-colors hover:bg-white/[0.04] hover:text-white/50"
            >
              +{hiddenTagsCount}
            </button>
          )}
          {showAllTags && tagEntries.length > MAX_VISIBLE_TAGS && (
            <button
              onClick={() => setShowAllTags(false)}
              className="rounded-md px-2 py-1 font-mono text-[11px] text-white/30 transition-colors hover:bg-white/[0.04] hover:text-white/50"
            >
              less
            </button>
          )}
        </div>
      )}
    </div>
  );
}
