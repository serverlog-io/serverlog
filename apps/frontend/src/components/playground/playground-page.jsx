import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import EventApi from "@/api/event.api";
import ApiKeyApi from "@/api/apiKey.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  IconPicker,
  ChannelCombobox,
  TagsEditor,
  CODE_LANGUAGES,
  formStorageKey,
  loadHistory,
  saveHistory,
  generateCode,
} from "./playground-helpers";
import { EventDetailModal } from "@/components/events/event-detail-modal";

const VIEW_MODE_KEY = "serverlog:playground:viewMode";

const SYNTAX_STYLE = {
  margin: 0,
  padding: "0.875rem 1rem",
  background: "transparent",
  fontSize: "0.75rem",
};

// Rich library of one-click templates. Each can be fired immediately with the
// [▶] button or clicked to load into the editor for tweaking.
const TEMPLATES = [
  {
    id: "user-signup",
    icon: "🎉",
    name: "User Signed Up",
    description: "New account",
    payload: {
      channel: "auth",
      event: "User Signed Up",
      description: "A new user has signed up",
      icon: "🎉",
      user_id: "user-123",
      tags: { plan: "pro", source: "web" },
    },
  },
  {
    id: "user-login",
    icon: "🔑",
    name: "User Logged In",
    description: "Authentication",
    payload: {
      channel: "auth",
      event: "User Logged In",
      description: "Authenticated successfully",
      icon: "🔑",
      user_id: "user-123",
      tags: { method: "google" },
    },
  },
  {
    id: "payment-completed",
    icon: "💳",
    name: "Payment Completed",
    description: "Subscription renewed",
    payload: {
      channel: "billing",
      event: "Payment Completed",
      description: "Subscription renewed",
      icon: "💳",
      user_id: "user-123",
      tags: { plan: "pro", amount: "29" },
    },
  },
  {
    id: "payment-failed",
    icon: "🚨",
    name: "Payment Failed",
    description: "Card declined",
    payload: {
      channel: "billing",
      event: "Payment Failed",
      description: "Payment could not be processed",
      icon: "🚨",
      user_id: "user-123",
      tags: { reason: "card-expired" },
    },
  },
  {
    id: "api-error",
    icon: "❌",
    name: "API Error",
    description: "Server error 500",
    payload: {
      channel: "api",
      event: "API Error",
      description: "Request failed with server error",
      icon: "❌",
      user_id: "user-123",
      tags: { status: "500", endpoint: "/v1/data" },
    },
  },
  {
    id: "rate-limit",
    icon: "🚫",
    name: "Rate Limit Hit",
    description: "Too many requests",
    payload: {
      channel: "api",
      event: "Rate Limit Hit",
      description: "Too many requests from client",
      icon: "🚫",
      user_id: "user-123",
      tags: { endpoint: "/v1/data", limit: "100/min" },
    },
  },
  {
    id: "checkout-started",
    icon: "🛒",
    name: "Checkout Started",
    description: "Purchase flow began",
    payload: {
      channel: "billing",
      event: "Checkout Started",
      description: "User initiated checkout",
      icon: "🛒",
      user_id: "user-123",
      tags: { plan: "pro" },
    },
  },
  {
    id: "notification-sent",
    icon: "🔔",
    name: "Push Notification",
    description: "Alert delivered",
    payload: {
      channel: "notifications",
      event: "Push Notification Sent",
      description: "Alert delivered to device",
      icon: "🔔",
      user_id: "user-123",
      tags: { type: "reminder" },
    },
  },
  {
    id: "email-bounced",
    icon: "⚠️",
    name: "Email Bounced",
    description: "Delivery failed",
    payload: {
      channel: "notifications",
      event: "Email Bounced",
      description: "Email delivery failed",
      icon: "⚠️",
      user_id: "user-123",
      tags: { reason: "invalid-address" },
    },
  },
  {
    id: "password-changed",
    icon: "🔒",
    name: "Password Changed",
    description: "Security event",
    payload: {
      channel: "account",
      event: "Password Changed",
      description: "Account password updated",
      icon: "🔒",
      user_id: "user-123",
      tags: {},
    },
  },
];

const BLANK_PAYLOAD = {
  channel: "alerts",
  event: "",
  user_id: "user-123",
  tags: {},
};

function formatTime(iso) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function statusColor(status) {
  if (!status) return "bg-fg-subtle";
  if (status >= 200 && status < 300) return "bg-green-500";
  if (status >= 400 && status < 500) return "bg-yellow-500";
  return "bg-red-500";
}

// Convert the JSON payload back-end expects to the body-text we show in the editor
function payloadToBody(payload) {
  return JSON.stringify(payload, null, 2);
}

export function PlaygroundPage({ projectId, projectName, channels = [], onChannelCreated }) {
  const router = useRouter();

  const [body, setBody] = useState(() => payloadToBody(TEMPLATES[0].payload));
  const [bodyError, setBodyError] = useState(null);
  const textareaRef = useRef(null);

  const [apiKeys, setApiKeys] = useState([]);
  const [selectedKeyId, setSelectedKeyId] = useState(null);

  const [response, setResponse] = useState(null);
  const [responseError, setResponseError] = useState(null);
  const [responseStatus, setResponseStatus] = useState(null);
  const [responseMs, setResponseMs] = useState(null);
  const [loading, setLoading] = useState(false);

  const [history, setHistory] = useState(() => loadHistory(projectId));
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState(null);

  const [codeLanguage, setCodeLanguage] = useState("javascript");
  const [codeCopied, setCodeCopied] = useState(false);
  const [responseCopied, setResponseCopied] = useState(false);

  // Tick once a minute so relative timestamps ("9h", "5m") refresh in place.
  const [, setTimeTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTimeTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // View mode: "form" (widgets) or "text" (JSON editor). Persisted.
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window === "undefined") return "form";
    return window.localStorage.getItem(VIEW_MODE_KEY) || "form";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  // Parsed view of the body — form mode reads from here. Invalid JSON yields {}.
  const parsedBody = useMemo(() => {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }, [body]);

  // Form-mode field updaters: each writes back into the body string.
  const updateField = useCallback(
    (field, value) => {
      const next = { ...parsedBody };
      if (value === "" || value == null) delete next[field];
      else next[field] = value;
      setBody(JSON.stringify(next, null, 2));
    },
    [parsedBody]
  );

  // Tag rows live as form state so empty rows persist while the user types.
  // Only non-empty keys are reflected back into the body. We use a ref to tell
  // "external" body changes (template loaded, JSON edited) apart from our own
  // updates — external ones reset the rows from the body.
  const [formTags, setFormTags] = useState(() => {
    const t = parsedBody.tags;
    return t && typeof t === "object"
      ? Object.entries(t).map(([k, v]) => ({ key: k, value: String(v) }))
      : [];
  });
  const lastInternalBodyRef = useRef(body);

  useEffect(() => {
    if (body === lastInternalBodyRef.current) return;
    lastInternalBodyRef.current = body;
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      return;
    }
    const t = parsed.tags;
    const fromBody =
      t && typeof t === "object"
        ? Object.entries(t).map(([k, v]) => ({ key: k, value: String(v) }))
        : [];
    setFormTags(fromBody);
  }, [body]);

  const updateTags = useCallback(
    (entries) => {
      setFormTags(entries);
      const tagsObj = {};
      entries.forEach(({ key, value }) => {
        if (key && key.trim()) tagsObj[key.trim()] = value;
      });
      const next = { ...parsedBody };
      if (Object.keys(tagsObj).length > 0) next.tags = tagsObj;
      else delete next.tags;
      const newBody = JSON.stringify(next, null, 2);
      lastInternalBodyRef.current = newBody;
      setBody(newBody);
    },
    [parsedBody]
  );

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3010");

  // Live JSON validation
  useEffect(() => {
    try {
      JSON.parse(body);
      setBodyError(null);
    } catch (e) {
      setBodyError(e.message);
    }
  }, [body]);

  // Persist editor body so it survives refresh
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const parsed = JSON.parse(body);
      window.localStorage.setItem(
        formStorageKey(projectId),
        JSON.stringify({
          channel: parsed.channel || "alerts",
          event: parsed.event || "",
          description: parsed.description || "",
          icon: parsed.icon || "",
          userId: parsed.user_id || "",
          tags: parsed.tags
            ? Object.entries(parsed.tags).map(([k, v]) => ({ key: k, value: String(v) }))
            : [],
        })
      );
    } catch {}
  }, [body, projectId]);

  // Load API keys
  useEffect(() => {
    let cancelled = false;
    ApiKeyApi.list(projectId)
      .then(({ data }) => {
        if (cancelled) return;
        const keys = data.apiKeys || data || [];
        setApiKeys(keys);
        if (keys.length > 0 && !selectedKeyId) setSelectedKeyId(keys[0].id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const selectedKey = apiKeys.find((k) => k.id === selectedKeyId);
  const keyForCode = selectedKey?.keyPreview || selectedKey?.preview || "YOUR_API_KEY";

  const codeString = useMemo(() => {
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = {};
    }
    return generateCode(codeLanguage, parsed, apiUrl, keyForCode);
  }, [body, codeLanguage, apiUrl, keyForCode]);

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(codeString);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 1500);
  };

  // Core send function — used by both the main Send button and the quick-fire [▶] rows
  const sendPayload = useCallback(
    async (payload, rowId = null) => {
      const startedAt = performance.now();
      try {
        const submitPayload = { ...payload };
        if (payload.user_id !== undefined) {
          submitPayload.userId = payload.user_id;
          delete submitPayload.user_id;
        }
        const { data } = await EventApi.create(projectId, submitPayload);
        const durationMs = Math.round(performance.now() - startedAt);

        const entry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toISOString(),
          status: 200,
          eventName: payload.event || "(no name)",
          icon: payload.icon || null,
          payload,
          response: data,
          durationMs,
        };
        const next = [entry, ...history].slice(0, 50);
        setHistory(next);
        saveHistory(projectId, next);

        if (data.channel && onChannelCreated) {
          const isNew = !channels.some((ch) => ch.slug === data.channel.slug);
          if (isNew) onChannelCreated(data.channel);
        }

        return { ok: true, data, durationMs, status: 200 };
      } catch (err) {
        const durationMs = Math.round(performance.now() - startedAt);
        const message = err.response?.data?.message || "Failed to send event";
        const status = err.response?.status || 0;

        const entry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toISOString(),
          status,
          eventName: payload.event || "(no name)",
          icon: payload.icon || null,
          payload,
          error: message,
          durationMs,
        };
        const next = [entry, ...history].slice(0, 50);
        setHistory(next);
        saveHistory(projectId, next);

        return { ok: false, error: message, durationMs, status };
      }
    },
    [projectId, history, channels, onChannelCreated]
  );

  // Main "Send" — uses what's currently in the editor
  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (bodyError) return;
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      return;
    }
    setLoading(true);
    setResponse(null);
    setResponseError(null);
    setResponseStatus(null);
    setResponseMs(null);

    const result = await sendPayload(parsed);
    if (result.ok) {
      setResponse(result.data);
      setResponseStatus(result.status);
      setResponseMs(result.durationMs);
    } else {
      setResponseError(result.error);
      setResponseStatus(result.status);
      setResponseMs(result.durationMs);
    }
    setLoading(false);
  };

  // Click row → load into editor (no quick-fire)
  const loadTemplate = (template) => {
    setBody(payloadToBody(template.payload));
    setResponse(null);
    setResponseError(null);
    setResponseStatus(null);
    setResponseMs(null);
    textareaRef.current?.focus();
  };

  const loadFromHistory = (entry) => {
    setBody(payloadToBody(entry.payload));
    if (entry.response) {
      setResponse(entry.response);
      setResponseError(null);
      setResponseStatus(entry.status);
    } else {
      setResponse(null);
      setResponseError(entry.error || null);
      setResponseStatus(entry.status);
    }
    setResponseMs(entry.durationMs ?? null);
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory(projectId, []);
  };

  const loadBlank = () => {
    setBody(payloadToBody(BLANK_PAYLOAD));
    textareaRef.current?.focus();
  };

  const handleEditorKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit(e);
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.target;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = body.slice(0, start) + "  " + body.slice(end);
      setBody(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const el = e.target;
      const start = el.selectionStart;
      const end = el.selectionEnd;

      // Indent matching the current line
      const before = body.slice(0, start);
      const lineStart = before.lastIndexOf("\n") + 1;
      const currentLine = before.slice(lineStart);
      const baseIndent = (currentLine.match(/^(\s*)/) || ["", ""])[1];

      // Last meaningful char before cursor and first after — handles "{|}" → expand
      const prevChar = before.replace(/\s+$/, "").slice(-1);
      const nextChar = body.slice(end, end + 1);
      const opens = prevChar === "{" || prevChar === "[" || prevChar === "(";
      const closes =
        (prevChar === "{" && nextChar === "}") ||
        (prevChar === "[" && nextChar === "]") ||
        (prevChar === "(" && nextChar === ")");

      if (closes) {
        const insert = "\n" + baseIndent + "  " + "\n" + baseIndent;
        const next = body.slice(0, start) + insert + body.slice(end);
        setBody(next);
        requestAnimationFrame(() => {
          const caret = start + 1 + baseIndent.length + 2;
          el.selectionStart = el.selectionEnd = caret;
        });
        return;
      }

      const extra = opens ? "  " : "";
      const insert = "\n" + baseIndent + extra;
      const next = body.slice(0, start) + insert + body.slice(end);
      setBody(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + insert.length;
      });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* ─── LEFT: Editor + Response ──────────────────────────────── */}
      <section className="flex flex-col gap-4">
        {/* Top action bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-mono text-sm">
            <span className="rounded bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
              POST
            </span>
            <span className="text-fg">/v1/log</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {apiKeys.length > 0 ? (
              <select
                value={selectedKeyId || ""}
                onChange={(e) => setSelectedKeyId(e.target.value)}
                className="h-8 rounded-md border border-border bg-bg-elevated/40 px-2 font-mono text-xs text-fg-muted focus:border-border-strong focus:outline-none"
              >
                {apiKeys.map((key) => (
                  <option key={key.id} value={key.id}>
                    {key.keyPreview || key.preview || key.name}
                  </option>
                ))}
              </select>
            ) : (
              <button
                type="button"
                onClick={() => router.push(`/projects/${projectId}/apikeys`)}
                className="rounded-md border border-border bg-bg-elevated/40 px-2 py-1 text-xs text-accent transition-colors hover:bg-bg-elevated"
              >
                Create API key →
              </button>
            )}

            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-bg-elevated/40 px-2.5 text-xs text-fg-muted transition-colors hover:bg-bg-elevated hover:text-fg"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  Copy as code
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[480px] max-w-[90vw] p-0">
                <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                  <div className="flex gap-1">
                    {CODE_LANGUAGES.map((lang) => (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => setCodeLanguage(lang.id)}
                        className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
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
                    className="flex items-center gap-1 text-[11px] text-fg-subtle transition-colors hover:text-fg"
                  >
                    {codeCopied ? (
                      <>
                        <svg className="h-3 w-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-green-400">Copied</span>
                      </>
                    ) : (
                      "Copy"
                    )}
                  </button>
                </div>
                <div className="max-h-80 overflow-auto text-xs [&_code]:!bg-transparent [&_span]:!bg-transparent">
                  <SyntaxHighlighter
                    language={codeLanguage === "curl" ? "bash" : codeLanguage}
                    style={oneDark}
                    customStyle={SYNTAX_STYLE}
                    codeTagProps={{ style: { background: "transparent" } }}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Body editor with Templates button + Form / JSON toggle */}
        <div className="overflow-hidden rounded-lg border border-border bg-bg-elevated/30">
          <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
                Body
              </span>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-md border border-border bg-bg-elevated/50 px-2 py-0.5 text-[10px] font-medium text-fg-muted transition-colors hover:bg-bg-elevated hover:text-fg"
                  >
                    <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Templates
                    <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 p-0">
                  <div className="flex items-center justify-between border-b border-border px-3 py-2">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
                      Templates
                    </span>
                    <button
                      type="button"
                      onClick={loadBlank}
                      className="text-[10px] text-fg-subtle transition-colors hover:text-fg-muted"
                    >
                      + Blank
                    </button>
                  </div>
                  <ul className="max-h-80 divide-y divide-border overflow-auto">
                    {TEMPLATES.map((tpl) => (
                      <li key={tpl.id}>
                        <button
                          type="button"
                          onClick={() => loadTemplate(tpl)}
                          className="flex w-full min-w-0 items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-bg-elevated/40"
                        >
                          <span className="w-5 shrink-0 text-center text-base">
                            {tpl.icon}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium text-fg">
                              {tpl.name}
                            </span>
                            <span className="block truncate text-[10px] text-fg-subtle">
                              {tpl.description}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-3">
              {bodyError && viewMode === "text" && (
                <span className="truncate font-mono text-[10px] text-red-400">
                  {bodyError}
                </span>
              )}
              <div className="flex items-center gap-0.5 rounded-md border border-border bg-bg-elevated/50 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("form")}
                  className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                    viewMode === "form"
                      ? "bg-bg-elevated text-fg"
                      : "text-fg-subtle hover:text-fg-muted"
                  }`}
                >
                  Form
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("text")}
                  className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                    viewMode === "text"
                      ? "bg-bg-elevated text-fg"
                      : "text-fg-subtle hover:text-fg-muted"
                  }`}
                >
                  JSON
                </button>
              </div>
            </div>
          </div>

          {viewMode === "form" ? (
            <div
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              className="space-y-3 p-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-fg-muted">Channel</Label>
                  <ChannelCombobox
                    value={parsedBody.channel || ""}
                    onChange={(v) => updateField("channel", v)}
                    channels={channels}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pg-event" className="text-xs text-fg-muted">
                    Event
                  </Label>
                  <Input
                    id="pg-event"
                    value={parsedBody.event || ""}
                    onChange={(e) => updateField("event", e.target.value)}
                    placeholder="User Signup"
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="pg-description" className="text-xs text-fg-muted">
                  Description
                </Label>
                <Input
                  id="pg-description"
                  value={parsedBody.description || ""}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Optional"
                  className="h-8 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="pg-user-id" className="text-xs text-fg-muted">
                    User ID
                  </Label>
                  <Input
                    id="pg-user-id"
                    value={parsedBody.user_id || ""}
                    onChange={(e) => updateField("user_id", e.target.value)}
                    placeholder="user-123"
                    className="h-8 font-mono text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-fg-muted">Icon</Label>
                  <IconPicker
                    value={parsedBody.icon || ""}
                    onChange={(v) => updateField("icon", v)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-fg-muted">Tags</Label>
                <TagsEditor tags={formTags} onChange={updateTags} />
              </div>
            </div>
          ) : (
          <div className="relative font-mono text-[13px] leading-relaxed">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 overflow-hidden font-mono text-[13px] leading-relaxed [&>pre]:!m-0 [&>pre]:!bg-transparent"
            >
              <SyntaxHighlighter
                language="json"
                style={oneDark}
                customStyle={{
                  margin: 0,
                  padding: "0.75rem 1rem",
                  background: "transparent",
                  fontSize: "13px",
                  lineHeight: "1.625",
                  fontFamily: "inherit",
                }}
                codeTagProps={{
                  style: {
                    background: "transparent",
                    fontFamily: "inherit",
                    fontSize: "13px",
                    lineHeight: "1.625",
                  },
                }}
              >
                {body || " "}
              </SyntaxHighlighter>
            </div>
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={handleEditorKeyDown}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              rows={Math.min(22, Math.max(10, body.split("\n").length))}
              className="relative block w-full resize-none border-0 bg-transparent px-4 py-3 font-mono text-[13px] leading-relaxed outline-none placeholder:text-fg-subtle"
              style={{
                color: "transparent",
                WebkitTextFillColor: "transparent",
                caretColor: "rgb(236, 233, 224)",
              }}
              placeholder='{ "channel": "...", "event": "..." }'
            />
          </div>
          )}
          <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2">
            {response || responseError ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-md border border-border bg-bg-elevated/40 px-2.5 py-1 transition-colors hover:bg-bg-elevated"
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        response ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <span
                      className={`text-[11px] font-medium ${
                        response ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {responseStatus
                        ? `${responseStatus} ${response ? "OK" : "Error"}`
                        : "Error"}
                    </span>
                    {responseMs != null && (
                      <span className="font-mono text-[10px] text-fg-subtle">
                        {responseMs}ms
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  side="top"
                  className="w-[520px] max-w-[90vw] p-0"
                >
                  <div className="flex items-center justify-between border-b border-border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          response ? "bg-green-500" : "bg-red-500"
                        }`}
                      />
                      <span
                        className={`text-xs font-medium ${
                          response ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {responseStatus
                          ? `${responseStatus} ${response ? "OK" : "Error"}`
                          : "Error"}
                      </span>
                      {responseMs != null && (
                        <span className="font-mono text-[10px] text-fg-subtle">
                          · {responseMs}ms
                        </span>
                      )}
                    </div>
                    {response && (
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(
                            JSON.stringify(response, null, 2)
                          );
                          setResponseCopied(true);
                          setTimeout(() => setResponseCopied(false), 1500);
                        }}
                        className="flex items-center gap-1 text-[11px] text-fg-subtle transition-colors hover:text-fg"
                      >
                        {responseCopied ? (
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
                    )}
                  </div>
                  {responseError && (
                    <p className="m-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                      {responseError}
                    </p>
                  )}
                  {response && (
                    <div className="max-h-96 overflow-auto text-xs [&_code]:!bg-transparent [&_span]:!bg-transparent">
                      <SyntaxHighlighter
                        language="json"
                        style={oneDark}
                        customStyle={SYNTAX_STYLE}
                        codeTagProps={{ style: { background: "transparent" } }}
                      >
                        {JSON.stringify(response, null, 2)}
                      </SyntaxHighlighter>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-fg-subtle">⌘↵ to send</span>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !!bodyError}
                className="h-8 px-5"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                    Sending
                  </span>
                ) : (
                  "Send"
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── RIGHT: Events sent from the playground ───────────────── */}
      <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-180px)]">
        <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-bg-elevated/30">
          <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
              Events sent
              {history.length > 0 && (
                <span className="rounded bg-bg-elevated px-1.5 font-mono text-[10px] text-fg-muted">
                  {history.length}
                </span>
              )}
            </span>
            {history.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="text-[10px] text-fg-subtle transition-colors hover:text-fg-muted"
              >
                Clear
              </button>
            )}
          </header>

          {history.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
              <div className="rounded-full bg-bg-elevated/40 p-3">
                <svg
                  className="h-5 w-5 text-fg-subtle"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <p className="text-xs text-fg-subtle">No events yet</p>
              <p className="text-[10px] text-fg-subtle">
                Send one to see it here
              </p>
            </div>
          ) : (
            <ul className="flex-1 divide-y divide-border overflow-auto">
              {history.map((entry) => {
                const tagEntries = Object.entries(entry.payload?.tags || {}).slice(0, 2);
                const extraTags = Math.max(0, Object.keys(entry.payload?.tags || {}).length - 2);
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedHistoryEntry(entry)}
                      className="flex w-full min-w-0 items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-bg-elevated/40"
                    >
                      <span
                        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${statusColor(entry.status)}`}
                      />
                      <span className="mt-0.5 w-5 shrink-0 text-center text-sm">
                        {entry.icon || "●"}
                      </span>
                      <span className="min-w-0 flex-1 space-y-1">
                        <span className="flex items-baseline gap-2">
                          <span className="min-w-0 flex-1 truncate text-xs font-medium text-fg">
                            {entry.eventName}
                          </span>
                          <span className="shrink-0 font-mono text-[10px] text-fg-subtle">
                            {formatTime(entry.timestamp)}
                          </span>
                        </span>
                        {(entry.payload?.user_id || tagEntries.length > 0) && (
                          <span className="flex flex-wrap items-center gap-1">
                            {entry.payload?.user_id && (
                              <span className="rounded border border-border bg-bg-elevated px-1.5 py-0.5 font-mono text-[9px] text-fg-muted">
                                @{entry.payload.user_id}
                              </span>
                            )}
                            {tagEntries.map(([k, v]) => (
                              <span
                                key={k}
                                className="rounded border border-border bg-bg-elevated px-1.5 py-0.5 font-mono text-[9px] text-fg-muted"
                              >
                                {k}:{String(v)}
                              </span>
                            ))}
                            {extraTags > 0 && (
                              <span className="font-mono text-[9px] text-fg-subtle">
                                +{extraTags}
                              </span>
                            )}
                          </span>
                        )}
                        <span className="font-mono text-[9px] text-fg-subtle">
                          {entry.status || "ERR"}
                          {entry.durationMs != null && ` · ${entry.durationMs}ms`}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <EventDetailModal
        event={selectedHistoryEntry}
        open={!!selectedHistoryEntry}
        onClose={() => setSelectedHistoryEntry(null)}
        projectName={projectName}
        onLoadInEditor={() => {
          if (selectedHistoryEntry) loadFromHistory(selectedHistoryEntry);
        }}
      />
    </div>
  );
}
