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
      className="fixed z-[9999] rounded-xl border border-white/10 bg-[#1a1a1a] p-4 shadow-2xl"
      style={{ top: anchorRect.bottom + 8, left: anchorRect.left }}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-white/40">
        Channel Color
      </p>
      <div className="flex w-48 flex-wrap gap-2">
        {colorPalette.map((c) => (
          <button
            key={c}
            onClick={() => {
              onColorChange(c);
              onClose();
            }}
            className={`h-7 w-7 shrink-0 rounded-full transition-all hover:scale-110 ${
              color === c ? "ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1a]" : ""
            }`}
            style={{ backgroundColor: c }}
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
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-white/60" />
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
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            !selectedChannel
              ? "bg-white/10 text-white"
              : "bg-white/[0.04] text-white/50 hover:text-white/70"
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
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isSelected
                  ? "bg-white/10 text-white"
                  : "bg-white/[0.04] text-white/50 hover:text-white/70"
              }`}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: channel.color || "#6366f1" }}
              />
              {channel.name}
            </button>
          );
        })}
      </div>

      {/* Desktop: vertical list */}
      <div className="hidden md:block">
        <div className="space-y-1">
          <button
            onClick={() => onSelectChannel(null)}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
              !selectedChannel
                ? "bg-white/10 text-white"
                : "text-white/50 hover:bg-white/[0.04] hover:text-white/70"
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            All Events
          </button>

          {channels.length > 0 && (
            <div className="py-2">
              <p className="px-3 pb-2 text-[10px] font-medium uppercase tracking-wider text-white/30">
                Channels
              </p>
              {sortedChannels.map((channel) => {
                const isSelected = selectedChannel === channel.slug;
                return (
                  <div key={channel.id} className="relative">
                    <button
                      onClick={() => onSelectChannel(channel.slug)}
                      className={`group flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                        isSelected
                          ? "bg-white/10 text-white"
                          : "text-white/50 hover:bg-white/[0.04] hover:text-white/70"
                      }`}
                    >
                      <span
                        onClick={(e) => handleColorDotClick(e, channel.id)}
                        className="h-2.5 w-2.5 shrink-0 cursor-pointer rounded-full transition-all hover:scale-150 hover:shadow-[0_0_8px_currentColor]"
                        style={{
                          backgroundColor: channel.color || "#6366f1",
                          boxShadow: "0 0 0 2px transparent",
                          color: channel.color || "#6366f1"
                        }}
                        title="Click to change color"
                      />
                      <span className="flex-1 truncate">{channel.name}</span>
                      <span className="text-[10px] text-white/30">{channel._count?.events || 0}</span>
                      {onDeleteChannel && (
                        <span
                          onClick={(e) => { e.stopPropagation(); onDeleteChannel(channel); }}
                          className="ml-1 rounded p-0.5 text-white/0 transition-colors group-hover:text-white/20 hover:!text-red-400 hover:!bg-red-400/10 cursor-pointer"
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
