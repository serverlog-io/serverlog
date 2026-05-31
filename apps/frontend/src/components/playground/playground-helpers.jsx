import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

export const CODE_LANGUAGES = [
  { id: "javascript", label: "JavaScript" },
  { id: "curl", label: "cURL" },
  { id: "python", label: "Python" },
];

export const PRESETS = [
  {
    label: "User Signup",
    data: {
      channel: "auth",
      event: "User Signed Up",
      description: "A new user has signed up",
      icon: "🎉",
      userId: "user-123",
      tags: [
        { key: "plan", value: "pro" },
        { key: "source", value: "web" },
      ],
    },
  },
  {
    label: "Payment Completed",
    data: {
      channel: "billing",
      event: "Payment Completed",
      description: "Subscription renewed",
      icon: "💳",
      userId: "user-123",
      tags: [
        { key: "plan", value: "pro" },
        { key: "amount", value: "29" },
      ],
    },
  },
  {
    label: "API Error",
    data: {
      channel: "api",
      event: "API Error",
      description: "Request failed with server error",
      icon: "❌",
      userId: "user-123",
      tags: [
        { key: "status", value: "500" },
        { key: "endpoint", value: "/v1/data" },
      ],
    },
  },
  {
    label: "Custom (blank)",
    data: {
      channel: "alerts",
      event: "",
      description: "",
      icon: "",
      userId: "",
      tags: [],
    },
  },
];

export const DEFAULT_FORM = {
  channel: "alerts",
  event: "User Signup",
  description: "A new user has signed up",
  icon: "🎉",
  userId: "user-123",
  tags: [{ key: "plan", value: "pro" }],
};

export const formStorageKey = (projectId) =>
  `serverlog:playground:${projectId || "default"}`;
export const historyStorageKey = (projectId) =>
  `serverlog:playground:history:${projectId || "default"}`;

export const loadPersistedForm = (projectId) => {
  if (typeof window === "undefined") return DEFAULT_FORM;
  try {
    const raw = window.localStorage.getItem(formStorageKey(projectId));
    if (!raw) return DEFAULT_FORM;
    return { ...DEFAULT_FORM, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_FORM;
  }
};

export const loadHistory = (projectId) => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(historyStorageKey(projectId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveHistory = (projectId, history) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      historyStorageKey(projectId),
      JSON.stringify(history.slice(0, 50)) // cap at 50 entries
    );
  } catch {}
};

// Generate code preview for a given language using the form payload.
export function generateCode(lang, payload, apiUrl, apiKey = "YOUR_API_KEY") {
  const jsonPayload = JSON.stringify(payload, null, 2);

  switch (lang) {
    case "curl":
      return `curl -X POST ${apiUrl}/v1/log \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '${jsonPayload.replace(/'/g, "\\'")}'`;

    case "python":
      return `import requests

response = requests.post(
    "${apiUrl}/v1/log",
    headers={
        "Authorization": "Bearer ${apiKey}",
        "Content-Type": "application/json"
    },
    json=${jsonPayload
      .replace(/null/g, "None")
      .replace(/true/g, "True")
      .replace(/false/g, "False")}
)`;

    default: // javascript
      return `await fetch("${apiUrl}/v1/log", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${apiKey}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(${jsonPayload
    .split("\n")
    .map((line, i) => (i === 0 ? line : "  " + line))
    .join("\n")})
});`;
  }
}

export function IconPicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");

  const handleEmojiSelect = (emojiData) => {
    onChange(emojiData.emoji);
    setIsOpen(false);
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (customInput.trim()) {
      onChange(customInput.trim());
      setCustomInput("");
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-8 w-full items-center justify-between rounded-md border border-border bg-bg-elevated/40 px-3 py-2 text-sm text-fg transition-colors hover:border-border-strong"
        >
          <span className={value ? "text-base" : "text-xs text-fg-subtle"}>
            {value || "Select"}
          </span>
          <svg
            className={`h-3 w-3 text-fg-subtle transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-auto p-0">
        <EmojiPicker
          onEmojiClick={handleEmojiSelect}
          theme="dark"
          width={320}
          height={400}
          searchPlaceHolder="Search emojis..."
          previewConfig={{ showPreview: false }}
          skinTonesDisabled
          lazyLoadEmojis
        />
        <div className="border-t border-border p-2">
          <form onSubmit={handleCustomSubmit} className="flex gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Custom emoji"
              className="flex-1 rounded-md border border-border bg-bg-elevated/40 px-2 py-1 text-sm text-fg placeholder:text-fg-subtle"
            />
            <button
              type="submit"
              className="rounded-md bg-bg-elevated px-2 py-1 text-sm text-fg hover:bg-bg-elevated"
            >
              Add
            </button>
          </form>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ChannelCombobox({ value, onChange, channels = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const filteredChannels = channels.filter(
    (ch) =>
      ch.slug.toLowerCase().includes(inputValue.toLowerCase()) ||
      ch.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleSelect = (slug) => {
    setInputValue(slug);
    onChange(slug);
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);
    if (!isOpen) setIsOpen(true);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        placeholder="alerts"
        className="h-8 w-full rounded-md border border-border bg-bg-elevated/40 px-3 text-sm text-fg placeholder:text-fg-subtle focus:border-border-strong focus:outline-none"
        required
      />
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[220px] rounded-md border border-border bg-bg-elevated p-1 shadow-xl">
          {filteredChannels.length > 0 ? (
            <div className="max-h-[200px] overflow-auto">
              {filteredChannels.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => handleSelect(ch.slug)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-fg-muted hover:bg-bg-elevated"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: ch.color || "#6366f1" }}
                  />
                  <span className="flex-1 truncate">{ch.name}</span>
                  <span className="text-[10px] text-fg-subtle">{ch.slug}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-2 py-3 text-center text-xs text-fg-subtle">
              {channels.length === 0 ? "No channels yet" : "No matches"}
            </div>
          )}
          {inputValue && !channels.some((ch) => ch.slug === inputValue) && (
            <div className="border-t border-border px-2 py-1.5 text-[10px] text-fg-subtle">
              Press Enter to create "{inputValue}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TagsEditor({ tags, onChange }) {
  const addTag = () => onChange([...tags, { key: "", value: "" }]);

  const updateTag = (index, field, value) => {
    const next = [...tags];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const removeTag = (index) => onChange(tags.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      {tags.map((tag, index) => (
        <div key={index} className="flex gap-2">
          <input
            type="text"
            value={tag.key}
            onChange={(e) => updateTag(index, "key", e.target.value)}
            placeholder="key"
            className="h-8 w-1/3 rounded-md border border-border bg-bg-elevated/40 px-2 font-mono text-xs text-fg placeholder:text-fg-subtle focus:border-border-strong focus:outline-none"
          />
          <input
            type="text"
            value={tag.value}
            onChange={(e) => updateTag(index, "value", e.target.value)}
            placeholder="value"
            className="h-8 flex-1 rounded-md border border-border bg-bg-elevated/40 px-2 font-mono text-xs text-fg placeholder:text-fg-subtle focus:border-border-strong focus:outline-none"
          />
          <button
            type="button"
            onClick={() => removeTag(index)}
            className="h-8 w-8 shrink-0 rounded-md text-fg-subtle transition-colors hover:bg-bg-elevated/40 hover:text-fg-muted"
            aria-label="Remove tag"
          >
            <svg className="mx-auto h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addTag}
        className="flex items-center gap-1 text-[11px] text-fg-subtle transition-colors hover:text-fg-muted"
      >
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add tag
      </button>
    </div>
  );
}
