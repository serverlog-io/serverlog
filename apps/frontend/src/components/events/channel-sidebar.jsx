import { useState, useRef, useEffect } from "react";
import { colorPalette } from "@/lib/colors";

function ColorPicker({ color, onColorChange, onClose, anchorRect }) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-[9999] rounded-lg border border-border bg-bg-elevated p-4 shadow-2xl"
      style={{ top: anchorRect.bottom + 8, left: anchorRect.left }}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="mb-3 text-[10px] font-mono uppercase tracking-[0.18em] text-fg-subtle">
        Channel color
      </p>
      <div className="flex w-48 flex-wrap gap-2">
        {colorPalette.map((c) => (
          <button
            key={c}
            onClick={() => {
              onColorChange(c);
              onClose();
            }}
            className={`h-7 w-7 shrink-0 rounded-full transition-transform hover:scale-110 ${
              color === c ? "ring-2 ring-offset-2 ring-offset-bg-elevated scale-110" : ""
            }`}
            style={{ backgroundColor: c, "--tw-ring-color": c }}
          />
        ))}
      </div>
    </div>
  );
}

export function ChannelSidebar({ channels, selectedChannel, onSelectChannel, onColorChange, onDeleteChannel, loading }) {
  const [colorPickerChannel, setColorPickerChannel] = useState(null);
  const [colorPickerRect, setColorPickerRect] = useState(null);

  if (loading) {
    return (
      <div className="w-full md:w-48 md:shrink-0">
        <div className="flex items-center justify-center py-4 md:py-8">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent" />
        </div>
      </div>
    );
  }

  const handleColorDotClick = (e, channelId) => {
    e.stopPropagation();
    if (colorPickerChannel === channelId) {
      setColorPickerChannel(null);
      setColorPickerRect(null);
    } else {
      setColorPickerChannel(channelId);
      setColorPickerRect(e.target.getBoundingClientRect());
    }
  };

  const sortedChannels = [...channels].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="w-full md:w-48 md:shrink-0">
      {/* Mobile: horizontal scrollable pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 md:hidden">
        <button
          onClick={() => onSelectChannel(null)}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-mono transition-colors border ${
            !selectedChannel
              ? "bg-bg-elevated text-fg border-border-strong"
              : "text-fg-muted border-border hover:text-fg hover:border-border-strong"
          }`}
        >
          All
        </button>
        {sortedChannels.map((channel) => {
          const isSelected = selectedChannel === channel.slug;
          return (
            <button
              key={channel.id}
              onClick={() => onSelectChannel(channel.slug)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-mono transition-colors border ${
                isSelected
                  ? "bg-bg-elevated text-fg border-border-strong"
                  : "text-fg-muted border-border hover:text-fg hover:border-border-strong"
              }`}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: channel.color || "#d97757" }}
              />
              #{channel.slug}
            </button>
          );
        })}
      </div>

      {/* Desktop: vertical list */}
      <div className="hidden md:block">
        <div className="space-y-1">
          <span className="eyebrow mb-3">Channels</span>
          <button
            onClick={() => onSelectChannel(null)}
            className={`mt-3 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
              !selectedChannel
                ? "bg-bg-elevated text-fg"
                : "text-fg-muted hover:bg-bg-elevated/50 hover:text-fg"
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            All events
          </button>

          {channels.length > 0 && (
            <div className="pt-2">
              {sortedChannels.map((channel) => {
                const isSelected = selectedChannel === channel.slug;
                return (
                  <div key={channel.id} className="relative">
                    <button
                      onClick={() => onSelectChannel(channel.slug)}
                      className={`group flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                        isSelected
                          ? "bg-bg-elevated text-fg"
                          : "text-fg-muted hover:bg-bg-elevated/50 hover:text-fg"
                      }`}
                    >
                      <span
                        onClick={(e) => handleColorDotClick(e, channel.id)}
                        className="h-2.5 w-2.5 shrink-0 cursor-pointer rounded-full transition-transform hover:scale-150"
                        style={{
                          backgroundColor: channel.color || "#d97757",
                        }}
                        title="Click to change color"
                      />
                      <span className="flex-1 truncate font-mono text-[13px]">#{channel.slug}</span>
                      <span className="text-[10px] font-mono text-fg-subtle tabular-nums">{channel._count?.events || 0}</span>
                      {onDeleteChannel && (
                        <span
                          onClick={(e) => { e.stopPropagation(); onDeleteChannel(channel); }}
                          className="ml-1 rounded p-0.5 text-fg-subtle/0 transition-colors group-hover:text-fg-subtle hover:!text-destructive cursor-pointer"
                          title="Delete channel"
                        >
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </span>
                      )}
                    </button>
                    {colorPickerChannel === channel.id && colorPickerRect && (
                      <ColorPicker
                        color={channel.color}
                        onColorChange={(newColor) => onColorChange(channel.id, newColor)}
                        onClose={() => {
                          setColorPickerChannel(null);
                          setColorPickerRect(null);
                        }}
                        anchorRect={colorPickerRect}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
