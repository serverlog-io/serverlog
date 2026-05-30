import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import EventApi from "@/api/event.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
          className="flex h-8 w-full items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition-colors hover:border-white/20"
        >
          <span className={value ? "text-base" : "text-white/30 text-xs"}>
            {value || "Select"}
          </span>
          <svg
            className={`h-3 w-3 text-white/40 transition-transform ${isOpen ? "rotate-180" : ""}`}
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
        <div className="border-t border-white/10 p-2">
          <form onSubmit={handleCustomSubmit} className="flex gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Custom emoji"
              className="flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm text-white placeholder:text-white/30"
            />
            <button
              type="submit"
              className="rounded-md bg-white/10 px-2 py-1 text-sm text-white hover:bg-white/20"
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
        className="h-8 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
        required
      />
      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-[200px] rounded-md border border-white/10 bg-[#1a1a1a] p-1 shadow-xl">
          {filteredChannels.length > 0 ? (
            <div className="max-h-[200px] overflow-auto">
              {filteredChannels.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => handleSelect(ch.slug)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-white/70 hover:bg-white/10"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: ch.color || "#6366f1" }}
                  />
                  <span className="flex-1 truncate">{ch.name}</span>
                  <span className="text-[10px] text-white/30">{ch.slug}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-2 py-3 text-center text-xs text-white/40">
              {channels.length === 0 ? "No channels yet" : "No matches"}
            </div>
          )}
          {inputValue && !channels.some((ch) => ch.slug === inputValue) && (
            <div className="border-t border-white/10 px-2 py-1.5 text-[10px] text-white/40">
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
            className="h-8 w-1/3 rounded-md border border-white/10 bg-white/5 px-2 text-xs text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none font-mono"
          />
          <input
            type="text"
            value={tag.value}
            onChange={(e) => updateTag(index, "value", e.target.value)}
            placeholder="value"
            className="h-8 flex-1 rounded-md border border-white/10 bg-white/5 px-2 text-xs text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none font-mono"
          />
          <button
            type="button"
            onClick={() => removeTag(index)}
            className="h-8 w-8 shrink-0 rounded-md text-white/30 hover:bg-white/5 hover:text-white/60 transition-colors"
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
        className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/60 transition-colors"
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
  const [channel, setChannel] = useState("alerts");
  const [event, setEvent] = useState("User Signup");
  const [description, setDescription] = useState("A new user has signed up");
  const [icon, setIcon] = useState("🎉");
  const [userId, setUserId] = useState("user-123");
  const [tags, setTags] = useState([
    { key: "plan", value: "pro" },
  ]);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("code");
  const [codeLanguage, setCodeLanguage] = useState("javascript");
  const [codeCopied, setCodeCopied] = useState(false);

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
    <div className={inline ? "flex flex-col h-full rounded-lg border border-white/10 bg-[#0a0a0a]" : "flex h-full flex-col"}>
      {/* Header */}
      <div className={`flex items-center justify-between border-b border-white/10 px-4 py-3 ${inline ? "rounded-t-lg" : ""}`}>
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h2 className="font-medium">Playground</h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Form Section */}
      <div className="border-b border-white/10 p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-white/50">Channel</Label>
              <ChannelCombobox
                value={channel}
                onChange={setChannel}
                channels={channels}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="drawer-event" className="text-xs text-white/50">Event</Label>
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
            <Label htmlFor="drawer-description" className="text-xs text-white/50">Description</Label>
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
              <Label htmlFor="drawer-user-id" className="text-xs text-white/50">User ID</Label>
              <Input
                id="drawer-user-id"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="user-123"
                className="h-8 text-sm font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-white/50">Icon</Label>
              <IconPicker value={icon} onChange={setIcon} />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-white/50">Tags</Label>
            <TagsEditor tags={tags} onChange={setTags} />
          </div>

          {error && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
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
              "Send Event"
            )}
          </Button>
        </form>
      </div>

      {/* Tabs Section */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Tab Headers */}
        <div className="flex items-center gap-1 border-b border-white/10 px-4">
          <button
            type="button"
            onClick={() => setActiveTab("code")}
            className={`relative px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === "code" ? "text-white" : "text-white/40 hover:text-white/60"
            }`}
          >
            Code
            {activeTab === "code" && (
              <span className="absolute bottom-0 left-0 right-0 h-px bg-white" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("response")}
            className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === "response" ? "text-white" : "text-white/40 hover:text-white/60"
            }`}
          >
            Response
            {response && (
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            )}
            {activeTab === "response" && (
              <span className="absolute bottom-0 left-0 right-0 h-px bg-white" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto">
          {activeTab === "code" && (
            <div className="h-full flex flex-col">
              {/* Language Selector */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                <div className="flex gap-1">
                  {CODE_LANGUAGES.map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setCodeLanguage(lang.id)}
                      className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                        codeLanguage === lang.id
                          ? "bg-white/10 text-white"
                          : "text-white/40 hover:text-white/60"
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] text-white/40 hover:text-white transition-colors"
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
              {/* Code Block */}
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
                  codeTagProps={{
                    style: { background: "transparent" }
                  }}
                  showLineNumbers={false}
                >
                  {generateCode(codeLanguage)}
                </SyntaxHighlighter>
              </div>
            </div>
          )}

          {activeTab === "response" && (
            <div className="h-full flex flex-col">
              {response ? (
                <>
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-xs text-green-400">200 OK</span>
                    <span className="text-[10px] text-white/30">• Event created</span>
                  </div>
                  <div className="flex-1 overflow-auto text-xs [&_code]:!bg-transparent [&_span]:!bg-transparent">
                    <SyntaxHighlighter
                      language="json"
                      style={oneDark}
                      customStyle={{
                        margin: 0,
                        padding: "1rem",
                        background: "transparent",
                        fontSize: "0.75rem",
                      }}
                      codeTagProps={{
                        style: { background: "transparent" }
                      }}
                    >
                      {JSON.stringify(response, null, 2)}
                    </SyntaxHighlighter>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                  <div className="mb-3 rounded-full bg-white/5 p-3">
                    <svg className="h-5 w-5 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-xs text-white/40">No response yet</p>
                  <p className="text-[10px] text-white/25 mt-1">Send an event to see the response</p>
                </div>
              )}
            </div>
          )}
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
          className="fixed inset-0 z-40 bg-black/30"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-[400px] transform border-l border-white/10 bg-[#0a0a0a] transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {content}
      </div>
    </>
  );
}
