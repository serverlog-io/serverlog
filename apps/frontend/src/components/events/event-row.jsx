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
        <button
          onClick={(e) => e.stopPropagation()}
          className="rounded-md p-1 text-fg-subtle transition-colors hover:text-fg hover:bg-bg-elevated"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => onDelete(event)}
          className="text-destructive focus:text-destructive"
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

export function EventRow({ event, showChannel = true, compact = false, onChannelClick, onTagClick, onUserClick, onDelete, onSelect }) {
  const clickable = !!onSelect;
  const handleSelect = () => onSelect?.(event);
  const stop = (fn) => (e) => {
    e.stopPropagation();
    fn?.();
  };
  const [showAllTags, setShowAllTags] = useState(false);
  const channelColor = event.channel?.color || "#d97757";
  const colors = getColorsFromHex(channelColor);

  const tags = event.tags || {};
  const tagEntries = Object.entries(tags);
  const hasTags = tagEntries.length > 0;

  const visibleTags = showAllTags ? tagEntries : tagEntries.slice(0, MAX_VISIBLE_TAGS);
  const hiddenTagsCount = tagEntries.length - MAX_VISIBLE_TAGS;

  if (compact) {
    return (
      <div
        onClick={clickable ? handleSelect : undefined}
        className={`group flex items-center gap-3 border-b border-border px-4 py-2.5 transition-colors hover:bg-bg-elevated/40 last:border-b-0 overflow-hidden ${clickable ? "cursor-pointer" : ""}`}
      >
        <span className="shrink-0 text-sm w-5 text-center">{event.icon || "●"}</span>
        <span className="shrink-0 text-sm text-fg truncate max-w-[200px]">{event.event}</span>

        <div className="min-w-0 flex-1 flex items-center gap-2 overflow-hidden">
          {event.userId && (
            <button
              onClick={stop(() => onUserClick?.(event.userId))}
              className="flex shrink-0 items-center gap-1.5 rounded bg-bg-elevated px-1.5 py-0.5 transition-colors hover:bg-bg-elevated border border-border hover:border-border-strong"
            >
              <img
                src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(event.userId)}`}
                alt=""
                className="h-3.5 w-3.5 rounded-full"
              />
              <span className="font-mono text-[11px] text-fg-muted">{event.userId}</span>
            </button>
          )}
          {visibleTags.map(([key, value]) => (
            <button
              key={key}
              onClick={stop(() => onTagClick?.(key, String(value)))}
              className="hidden shrink-0 items-center gap-1 rounded bg-bg-elevated/60 px-1.5 py-0.5 font-mono text-[10px] transition-colors hover:bg-bg-elevated lg:flex border border-border"
            >
              <span className="text-syntax-key">{key}</span>
              <span className="text-fg-muted">{String(value)}</span>
            </button>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {showChannel && event.channel?.name && (
            <button
              onClick={stop(() => onChannelClick?.(event.channel.slug))}
              className="rounded px-1.5 py-0.5 font-mono text-[11px] transition-colors [background:var(--bg)] [color:var(--text)] hover:[background:var(--bg-hover)]"
              style={{
                '--bg': colors.bg,
                '--bg-hover': colors.bgHover,
                '--text': colors.text,
              }}
            >
              #{event.channel.slug}
            </button>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <time className="min-w-[48px] cursor-default text-right font-mono text-[11px] text-fg-subtle tabular-nums">
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
    <div
      onClick={clickable ? handleSelect : undefined}
      className={`group border-b border-border px-5 py-4 transition-colors hover:bg-bg-elevated/40 last:border-b-0 ${clickable ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-bg-elevated/60 text-lg">
          {event.icon || "●"}
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="font-medium tracking-tight text-fg">{event.event}</h3>
          {event.description && (
            <p className="mt-0.5 text-[13px] leading-relaxed text-fg-muted">{event.description}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {showChannel && event.channel?.name && (
            <button
              onClick={stop(() => onChannelClick?.(event.channel.slug))}
              className="rounded px-2 py-1 font-mono text-xs transition-colors [background:var(--bg)] [color:var(--text)] hover:[background:var(--bg-hover)]"
              style={{
                '--bg': colors.bg,
                '--bg-hover': colors.bgHover,
                '--text': colors.text,
              }}
            >
              #{event.channel.slug}
            </button>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <time className="min-w-[52px] cursor-default text-right font-mono text-[11px] text-fg-subtle tabular-nums">
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

      {hasFooter && (
        <div className="mt-3 flex items-center gap-2 pl-14 flex-wrap">
          {event.userId && (
            <button
              onClick={stop(() => onUserClick?.(event.userId))}
              className="flex items-center gap-2 rounded bg-bg-elevated/60 px-2 py-1 border border-border hover:border-border-strong transition-colors"
            >
              <img
                src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(event.userId)}`}
                alt=""
                className="h-4 w-4 rounded-full"
              />
              <span className="max-w-[120px] truncate font-mono text-[11px] text-fg-muted">{event.userId}</span>
            </button>
          )}

          {event.userId && hasTags && (
            <span className="text-fg-subtle/40">·</span>
          )}

          {visibleTags.map(([key, value]) => (
            <button
              key={key}
              onClick={stop(() => onTagClick?.(key, String(value)))}
              className="flex items-center gap-1 rounded bg-bg-elevated/60 px-2 py-1 font-mono text-[11px] border border-border hover:border-border-strong transition-colors"
            >
              <span className="text-syntax-key">{key}</span>
              <span className="text-fg-muted">{String(value)}</span>
            </button>
          ))}

          {hiddenTagsCount > 0 && !showAllTags && (
            <button
              onClick={stop(() => setShowAllTags(true))}
              className="rounded px-2 py-1 font-mono text-[11px] text-fg-subtle hover:text-fg transition-colors"
            >
              +{hiddenTagsCount}
            </button>
          )}
          {showAllTags && tagEntries.length > MAX_VISIBLE_TAGS && (
            <button
              onClick={stop(() => setShowAllTags(false))}
              className="rounded px-2 py-1 font-mono text-[11px] text-fg-subtle hover:text-fg transition-colors"
            >
              less
            </button>
          )}
        </div>
      )}
    </div>
  );
}
