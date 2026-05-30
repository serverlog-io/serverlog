import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import EventApi from "@/api/event.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

function IconPicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white transition-colors hover:border-white/20 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
      >
        <span className={value ? "text-xl" : "text-white/30"}>
          {value || "Select icon"}
        </span>
        <svg
          className={`h-4 w-4 text-white/40 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-white/10 bg-[#0a0a0a] shadow-xl">
          <EmojiPicker
            onEmojiClick={handleEmojiSelect}
            theme="dark"
            width={350}
            height={400}
            searchPlaceHolder="Search emojis..."
            previewConfig={{ showPreview: false }}
            skinTonesDisabled
            lazyLoadEmojis
          />
          <div className="border-t border-white/10 p-3">
            <form onSubmit={handleCustomSubmit} className="flex gap-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Or type custom emoji/text"
                className="flex-1 rounded-md border border-white/10 bg-white/[0.02] px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/20"
              >
                Add
              </button>
            </form>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className="mt-2 w-full rounded px-2 py-1.5 text-xs text-white/40 transition-colors hover:bg-white/5 hover:text-white/60"
              >
                Clear selection
              </button>
            )}
          </div>
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
            className="h-10 w-1/3 rounded-md border border-white/10 bg-white/[0.02] px-3 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none font-mono"
          />
          <input
            type="text"
            value={tag.value}
            onChange={(e) => updateTag(index, "value", e.target.value)}
            placeholder="value"
            className="h-10 flex-1 rounded-md border border-white/10 bg-white/[0.02] px-3 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none font-mono"
          />
          <button
            type="button"
            onClick={() => removeTag(index)}
            className="h-10 w-10 shrink-0 rounded-md text-white/30 hover:bg-white/5 hover:text-white/60 transition-colors"
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
        className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add tag
      </button>
    </div>
  );
}

export function PlaygroundPanel({ projectId }) {
  const [channel, setChannel] = useState("alerts");
  const [event, setEvent] = useState("User Signup");
  const [description, setDescription] = useState("A new user has signed up");
  const [icon, setIcon] = useState("🎉");
  const [tags, setTags] = useState([
    { key: "user-id", value: "123" },
    { key: "plan", value: "pro" },
  ]);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState("");

  const tagsToObject = () => {
    const obj = {};
    tags.forEach(({ key, value }) => {
      if (key.trim()) {
        obj[key.trim()] = value;
      }
    });
    return obj;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const tagsObj = tagsToObject();

      const payload = {
        channel: channel.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        event,
        ...(description && { description }),
        ...(icon && { icon }),
        ...(Object.keys(tagsObj).length > 0 && { tags: tagsObj }),
      };

      const { data } = await EventApi.create(projectId, payload);
      setResponse(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Form */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-6">
        <h3 className="mb-4 text-sm font-medium text-white/80">Send Event</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="channel">Channel</Label>
              <Input
                id="channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder="alerts"
                required
              />
              <p className="text-xs text-white/30">Lowercase, numbers, hyphens only</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event">Event Name</Label>
              <Input
                id="event"
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                placeholder="User Signup"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>

          <div className="space-y-2">
            <Label>Icon (emoji)</Label>
            <IconPicker value={icon} onChange={setIcon} />
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <TagsEditor tags={tags} onChange={setTags} />
          </div>

          {error && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Sending..." : "Send Event"}
          </Button>
        </form>
      </div>

      {/* Response */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-6">
        <h3 className="mb-4 text-sm font-medium text-white/80">Response</h3>

        {response ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm text-green-400">Event sent successfully</span>
            </div>
            <div className="overflow-x-auto rounded-lg bg-white/[0.03] text-xs [&_code]:!bg-transparent [&_span]:!bg-transparent">
              <SyntaxHighlighter
                language="json"
                style={oneDark}
                customStyle={{
                  margin: 0,
                  padding: "1rem",
                  background: "transparent",
                  fontSize: "0.75rem",
                  borderRadius: "0.5rem",
                }}
                codeTagProps={{
                  style: { background: "transparent" }
                }}
              >
                {JSON.stringify(response, null, 2)}
              </SyntaxHighlighter>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 rounded-full bg-white/[0.04] p-3">
              <svg className="h-6 w-6 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-sm text-white/40">Send an event to see the response</p>
          </div>
        )}
      </div>
    </div>
  );
}
