import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import EventApi from "@/api/event.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const PRESETS = [
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

const DEFAULT_FORM = {
  channel: "alerts",
  event: "User Signup",
  description: "A new user has signed up",
  icon: "🎉",
  userId: "user-123",
  tags: [{ key: "plan", value: "pro" }],
};

const storageKey = (projectId) => `serverlog:playground:${projectId || "default"}`;

const loadPersisted = (projectId) => {
  if (typeof window === "undefined") return DEFAULT_FORM;
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    if (!raw) return DEFAULT_FORM;
    return { ...DEFAULT_FORM, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_FORM;
  }
};

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

function IconPicker({ value, onChange }) {
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
          <span className={value ? "text-base" : "text-fg-subtle text-xs"}>
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
      <PopoverContent side="left" align="start" className="w-auto p-0">
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

const CODE_LANGUAGES = [
  { id: "javascript", label: "JavaScript" },
  { id: "curl", label: "cURL" },
  { id: "python", label: "Python" },
];

function ChannelCombobox({ value, onChange, channels = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef(null);

  const filteredChannels = channels.filter((ch) =>
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

  // Close on click outside
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
        <div className="absolute top-full left-0 z-50 mt-1 w-[200px] rounded-md border border-border bg-bg-elevated p-1 shadow-xl">
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

function TagsEditor({ tags, onChange }) {
  const addTag = () => {
    onChange([...tags, { key: "", value: "" }]);
  };

  const updateTag = (index, field, value) => {
    const newTags = [...tags];
    newTags[index] = { ...newTags[index], [field]: value };
    onChange(newTags);
  };

  const removeTag = (index) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {tags.map((tag, index) => (
        <div key={index} className="flex gap-2">
          <input
            type="text"
            value={tag.key}
            onChange={(e) => updateTag(index, "key", e.target.value)}
            placeholder="key"
            className="h-8 w-1/3 rounded-md border border-border bg-bg-elevated/40 px-2 text-xs text-fg placeholder:text-fg-subtle focus:border-border-strong focus:outline-none font-mono"
          />
          <input
            type="text"
            value={tag.value}
            onChange={(e) => updateTag(index, "value", e.target.value)}
            placeholder="value"
            className="h-8 flex-1 rounded-md border border-border bg-bg-elevated/40 px-2 text-xs text-fg placeholder:text-fg-subtle focus:border-border-strong focus:outline-none font-mono"
          />
          <button
            type="button"
            onClick={() => removeTag(index)}
            className="h-8 w-8 shrink-0 rounded-md text-fg-subtle hover:bg-bg-elevated/40 hover:text-fg-muted transition-colors"
          >
            <svg className="h-4 w-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addTag}
        className="flex items-center gap-1 text-[10px] text-fg-subtle hover:text-fg-muted transition-colors"
      >
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add tag
      </button>
    </div>
  );
}

export function PlaygroundDrawer({ projectId, isOpen, onClose, channels = [], inline = false, onChannelCreated }) {
  const router = useRouter();
  const initial = () => loadPersisted(projectId);
  const [channel, setChannel] = useState(() => initial().channel);
  const [event, setEvent] = useState(() => initial().event);
  const [description, setDescription] = useState(() => initial().description);
  const [icon, setIcon] = useState(() => initial().icon);
  const [userId, setUserId] = useState(() => initial().userId);
  const [tags, setTags] = useState(() => initial().tags);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState("");
  const [codeLanguage, setCodeLanguage] = useState("javascript");
  const [codeCopied, setCodeCopied] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);

  // Persist form to localStorage (per project) on every change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        storageKey(projectId),
        JSON.stringify({ channel, event, description, icon, userId, tags })
      );
    } catch {}
  }, [projectId, channel, event, description, icon, userId, tags]);

  const applyPreset = (preset) => {
    setChannel(preset.data.channel);
    setEvent(preset.data.event);
    setDescription(preset.data.description);
    setIcon(preset.data.icon);
    setUserId(preset.data.userId);
    setTags(preset.data.tags);
    setPresetsOpen(false);
    setResponse(null);
    setError("");
  };

  const tagsToObject = () => {
    const obj = {};
    tags.forEach(({ key, value }) => {
      if (key.trim()) {
        obj[key.trim()] = value;
      }
    });
    return obj;
  };

  const getPayload = () => {
    const tagsObj = tagsToObject();

    return {
      channel: channel.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      event,
      ...(description && { description }),
      ...(icon && { icon }),
      ...(userId && { user_id: userId }),
      ...(Object.keys(tagsObj).length > 0 && { tags: tagsObj }),
    };
  };

  const generateCode = (lang) => {
    const payload = getPayload();
    const jsonPayload = JSON.stringify(payload, null, 2);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

    switch (lang) {
      case "curl":
        return `curl -X POST ${apiUrl}/v1/log \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${jsonPayload.replace(/'/g, "\\'")}'`;

      case "python":
        return `import requests

response = requests.post(
    "${apiUrl}/v1/log",
    headers={
        "Authorization": "Bearer YOUR_API_KEY",
        "Content-Type": "application/json"
    },
    json=${jsonPayload.replace(/"/g, '"').replace(/: /g, ': ').replace(/null/g, 'None').replace(/true/g, 'True').replace(/false/g, 'False')}
)`;

      default: // javascript
        return `await fetch("${apiUrl}/v1/log", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(${jsonPayload.split('\n').map((line, i) => i === 0 ? line : '  ' + line).join('\n')})
});`;
    }
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(generateCode(codeLanguage));
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const tagsObj = tagsToObject();
      const channelSlug = channel.toLowerCase().replace(/[^a-z0-9-]/g, "-");

      const payload = {
        channel: channelSlug,
        event,
        ...(description && { description }),
        ...(icon && { icon }),
        ...(userId && { userId }),
        ...(Object.keys(tagsObj).length > 0 && { tags: tagsObj }),
      };

      const { data } = await EventApi.create(projectId, payload);
      setResponse(data);

      // If a new channel was created, notify parent
      if (data.channel && onChannelCreated) {
        const isNewChannel = !channels.some(ch => ch.slug === data.channel.slug);
        if (isNewChannel) {
          onChannelCreated(data.channel);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send event");
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className={inline ? "flex flex-col h-full rounded-lg border border-border bg-bg-elevated" : "flex h-full flex-col"}>
      {/* Header */}
      <div className={`flex items-center justify-between border-b border-border px-4 py-3 ${inline ? "rounded-t-lg" : ""}`}>
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-fg-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h2 className="font-medium">Playground</h2>
        </div>
        <div className="flex items-center gap-1">
          <Popover open={presetsOpen} onOpenChange={setPresetsOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-fg-muted transition-colors hover:bg-bg-elevated hover:text-fg"
              >
                Presets
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-1">
              <ul className="space-y-0.5">
                {PRESETS.map((preset) => (
                  <li key={preset.label}>
                    <button
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-fg-muted transition-colors hover:bg-bg-elevated hover:text-fg"
                    >
                      <span className="text-base">{preset.data.icon || "✏️"}</span>
                      <span className="flex-1 truncate">{preset.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-fg-subtle transition-colors hover:bg-bg-elevated hover:text-fg"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Form Section */}
      <div className="border-b border-border p-4">
        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-fg-muted">Channel</Label>
              <ChannelCombobox
                value={channel}
                onChange={setChannel}
                channels={channels}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="drawer-event" className="text-xs text-fg-muted">Event</Label>
              <Input
                id="drawer-event"
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                placeholder="User Signup"
                className="h-8 text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="drawer-description" className="text-xs text-fg-muted">Description</Label>
            <Input
              id="drawer-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              className="h-8 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="drawer-user-id" className="text-xs text-fg-muted">User ID</Label>
              <Input
                id="drawer-user-id"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="user-123"
                className="h-8 text-sm font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-fg-muted">Icon</Label>
              <IconPicker value={icon} onChange={setIcon} />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-fg-muted">Tags</Label>
            <TagsEditor tags={tags} onChange={setTags} />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full h-9">
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                Sending...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Send Event
                <kbd className="rounded border border-black/20 bg-black/10 px-1 py-0 text-[10px] font-mono">⌘↵</kbd>
              </span>
            )}
          </Button>
        </form>
      </div>

      {/* Response (inline, only after submit) */}
      {response && (
        <div className="border-b border-border">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs font-medium text-green-400">200 OK</span>
              <span className="text-[10px] text-fg-subtle">· Event created</span>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/projects/${projectId}`)}
              className="text-[11px] text-accent transition-colors hover:underline"
            >
              View in Events →
            </button>
          </div>
          <div className="max-h-48 overflow-auto text-xs [&_code]:!bg-transparent [&_span]:!bg-transparent">
            <SyntaxHighlighter
              language="json"
              style={oneDark}
              customStyle={{
                margin: 0,
                padding: "0.75rem 1rem",
                background: "transparent",
                fontSize: "0.7rem",
              }}
              codeTagProps={{ style: { background: "transparent" } }}
            >
              {JSON.stringify(response, null, 2)}
            </SyntaxHighlighter>
          </div>
        </div>
      )}

      {/* Code (always visible at the bottom) */}
      <div className="flex flex-1 min-h-0 flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <div className="flex gap-1">
            {CODE_LANGUAGES.map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => setCodeLanguage(lang.id)}
                className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                  codeLanguage === lang.id
                    ? "bg-bg-elevated text-fg"
                    : "text-fg-subtle hover:text-fg-muted"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-1 px-2 py-1 text-[10px] text-fg-subtle transition-colors hover:text-fg"
          >
            {codeCopied ? (
              <>
                <svg className="h-3 w-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-400">Copied</span>
              </>
            ) : (
              <>
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
        <div className="flex-1 overflow-auto text-xs [&_code]:!bg-transparent [&_span]:!bg-transparent">
          <SyntaxHighlighter
            language={codeLanguage === "curl" ? "bash" : codeLanguage}
            style={oneDark}
            customStyle={{
              margin: 0,
              padding: "1rem",
              background: "transparent",
              fontSize: "0.75rem",
            }}
            codeTagProps={{ style: { background: "transparent" } }}
            showLineNumbers={false}
          >
            {generateCode(codeLanguage)}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );

  // Inline mode - just return the content
  if (inline) {
    return content;
  }

  // Drawer mode - with backdrop and fixed positioning
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-bg/70"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-[400px] transform border-l border-border bg-bg-elevated transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {content}
      </div>
    </>
  );
}
