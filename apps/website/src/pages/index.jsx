import Head from "next/head";
import { createContext, useContext, useEffect, useState } from "react";

const LanguageContext = createContext({
  language: "javascript",
  setLanguage: () => {},
});

function LanguageProvider({ children }) {
  const [language, setLanguage] = useState("javascript");
  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

const ENDPOINTS = [
  {
    method: "POST",
    path: "/v1/log",
    title: "Log an event",
    description:
      "Send a single event to a channel. The most common call — used for every signup, purchase, error, or anything else worth tracking.",
    curl: `curl -X POST https://api.serverlog.dev/v1/log \\
  -H "Authorization: Bearer sl_live_xxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "channel": "billing",
    "event": "Payment Completed",
    "description": "Subscription renewed",
    "icon": "💳",
    "user_id": "user_42",
    "tags": { "plan": "pro", "amount": "29" }
  }'`,
    js: `import axios from "axios";

await axios.post(
  "https://api.serverlog.dev/v1/log",
  {
    channel: "billing",
    event: "Payment Completed",
    description: "Subscription renewed",
    icon: "💳",
    user_id: "user_42",
    tags: { plan: "pro", amount: "29" }
  },
  {
    headers: {
      Authorization: "Bearer sl_live_xxxxx"
    }
  }
);`,
  },
  {
    method: "POST",
    path: "/v1/identify",
    title: "Identify a user",
    description:
      "Attach properties to a user profile. Idempotent — call it on signup, on login, or every time you have new data. Events tagged with the same user_id will be grouped automatically.",
    curl: `curl -X POST https://api.serverlog.dev/v1/identify \\
  -H "Authorization: Bearer sl_live_xxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_id": "user_42",
    "properties": {
      "plan": "pro",
      "country": "AR",
      "email": "alice@example.com"
    }
  }'`,
    js: `import axios from "axios";

await axios.post(
  "https://api.serverlog.dev/v1/identify",
  {
    user_id: "user_42",
    properties: {
      plan: "pro",
      country: "AR",
      email: "alice@example.com"
    }
  },
  {
    headers: {
      Authorization: "Bearer sl_live_xxxxx"
    }
  }
);`,
  },
  {
    method: "POST",
    path: "/v1/insight",
    title: "Upsert an insight",
    description:
      "Push a metric to your dashboard. Insights are upserted by title — re-send the same title to update the value. Great for revenue counters, active users, queue depth.",
    curl: `curl -X POST https://api.serverlog.dev/v1/insight \\
  -H "Authorization: Bearer sl_live_xxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "MRR",
    "value": "12,480",
    "icon": "💰"
  }'`,
    js: `import axios from "axios";

await axios.post(
  "https://api.serverlog.dev/v1/insight",
  {
    title: "MRR",
    value: "12,480",
    icon: "💰"
  },
  {
    headers: {
      Authorization: "Bearer sl_live_xxxxx"
    }
  }
);`,
  },
];

const INSTALL_CURL = `curl -fsSL https://raw.githubusercontent.com/serverlog-io/serverlog/main/scripts/install.sh | bash`;

const SYNTAX = [
  {
    syntax: "@user",
    title: "User filter",
    description:
      "Matches events for a specific user_id — the same identifier you send via /v1/log or /v1/identify.",
    examples: ["@alice", "@user_42"],
  },
  {
    syntax: "#channel",
    title: "Channel filter",
    description:
      "Scopes the query to one channel. Use the slug you defined when creating the channel.",
    examples: ["#billing", "#api"],
  },
  {
    syntax: "key:value",
    title: "Tag & metadata",
    description:
      "Any tag you attach to an event becomes filterable. Wrap values with spaces in quotes.",
    examples: ["plan:pro", "status:500", 'reason:"card expired"'],
  },
  {
    syntax: "text",
    title: "Free text",
    description:
      "Plain words match against event names and descriptions, case-insensitive.",
    examples: ["payment failed", "rate limit"],
  },
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };
  return (
    <button
      onClick={onClick}
      className="text-xs font-mono uppercase tracking-wider text-fg-subtle hover:text-fg transition-colors"
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

function makeRule(type, regex) {
  const flags = regex.flags.includes("y") ? regex.flags : regex.flags + "y";
  return { type, regex: new RegExp(regex.source, flags) };
}

const JSON_RULES = [
  makeRule("key", /"(?:\\.|[^"\\])*"(?=\s*:)/),
  makeRule("string", /"(?:\\.|[^"\\])*"/),
  makeRule("number", /-?\d+(?:\.\d+)?/),
  makeRule("boolean", /\b(?:true|false|null)\b/),
  makeRule("punct", /[{}\[\],:]/),
];

const BASH_RULES = [
  makeRule("comment", /#.*/),
  makeRule("string", /'(?:\\.|[^'\\])*'/),
  makeRule("string", /"(?:\\.|[^"\\])*"/),
  makeRule("keyword", /\bcurl\b/),
  makeRule("keyword", /\b(?:POST|GET|PUT|DELETE|PATCH)\b/),
  makeRule("flag", /-{1,2}[a-zA-Z][\w-]*/),
  makeRule("comment", /https?:\/\/[^\s'"]+/),
];

const JS_KEYWORDS = [
  "await", "async", "const", "let", "var", "function", "return", "new",
  "if", "else", "for", "while", "do", "try", "catch", "finally", "throw",
  "typeof", "instanceof", "in", "of", "import", "export", "from", "default",
  "class", "extends", "this", "super",
];

const SEARCH_RULES = [
  makeRule("key", /@[\w-]+/),
  makeRule("keyword", /#[\w-]+/),
  makeRule("key", /[\w-]+(?=:)/),
  makeRule("punct", /:/),
  makeRule("string", /"[^"]*"/),
  makeRule("string", /(?<=:)\S+/),
];

const JS_RULES = [
  makeRule("comment", /\/\/[^\n]*/),
  makeRule("comment", /\/\*[\s\S]*?\*\//),
  makeRule("string", /`(?:\\.|[^`\\])*`/),
  makeRule("string", /'(?:\\.|[^'\\])*'/),
  makeRule("key", /"(?:\\.|[^"\\])*"(?=\s*:)/),
  makeRule("string", /"(?:\\.|[^"\\])*"/),
  makeRule("keyword", new RegExp(`\\b(?:${JS_KEYWORDS.join("|")})\\b`)),
  makeRule("number", /\b(?:true|false|null|undefined)\b/),
  makeRule("number", /-?\d+(?:\.\d+)?/),
  makeRule("key", /(?<![\w$])[a-zA-Z_$][\w$]*(?=\s*:)/),
  makeRule("punct", /[{}\[\]();,:.]/),
];

const TOKEN_CLASS = {
  string: "text-syntax-string",
  key: "text-syntax-key",
  number: "text-syntax-number",
  boolean: "text-syntax-number",
  keyword: "text-syntax-keyword font-medium",
  flag: "text-syntax-flag",
  punct: "text-syntax-punct",
  comment: "text-syntax-comment",
};

function tokenize(code, rules) {
  const tokens = [];
  let i = 0;
  while (i < code.length) {
    let found = null;
    for (const rule of rules) {
      rule.regex.lastIndex = i;
      const m = rule.regex.exec(code);
      if (m) {
        found = { type: rule.type, text: m[0] };
        break;
      }
    }
    if (found) {
      tokens.push(found);
      i += found.text.length;
    } else {
      const last = tokens[tokens.length - 1];
      if (last && last.type === "plain") last.text += code[i];
      else tokens.push({ type: "plain", text: code[i] });
      i++;
    }
  }
  return tokens;
}

const RULES_BY_LANG = {
  json: JSON_RULES,
  bash: BASH_RULES,
  javascript: JS_RULES,
  js: JS_RULES,
  search: SEARCH_RULES,
};

function Highlighted({ code, language }) {
  const rules = RULES_BY_LANG[language];
  if (!rules) return <>{code}</>;
  const tokens = tokenize(code, rules);
  return tokens.map((t, idx) =>
    t.type === "plain" ? (
      <span key={idx}>{t.text}</span>
    ) : (
      <span key={idx} className={TOKEN_CLASS[t.type]}>
        {t.text}
      </span>
    )
  );
}

function CodeBlock({ code, language = "bash", filename }) {
  return (
    <div className="group border border-border bg-bg-code rounded-md overflow-hidden transition-colors duration-200 hover:border-border-strong">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-xs font-mono text-fg-subtle">
          {filename || language}
        </span>
        <CopyButton text={code} />
      </div>
      <pre className="px-4 py-4 text-sm font-mono overflow-x-auto leading-relaxed">
        <code>
          <Highlighted code={code} language={language} />
        </code>
      </pre>
    </div>
  );
}

function TabbedCode({ tabs }) {
  const { language, setLanguage } = useContext(LanguageContext);
  const matchedIdx = tabs.findIndex((t) => t.language === language);
  const activeIdx = matchedIdx === -1 ? 0 : matchedIdx;
  const current = tabs[activeIdx];
  return (
    <div className="border border-border bg-bg-code rounded-md overflow-hidden">
      <div className="flex items-stretch justify-between border-b border-border pr-4">
        <div className="flex">
          {tabs.map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => setLanguage(tab.language)}
              className={`px-4 py-2 text-xs font-mono transition-colors border-b-2 -mb-px ${
                i === activeIdx
                  ? "text-fg border-accent"
                  : "text-fg-subtle hover:text-fg-muted border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center">
          <CopyButton text={current.code} />
        </div>
      </div>
      <pre className="px-4 py-4 text-sm font-mono overflow-x-auto leading-relaxed">
        <code>
          <Highlighted code={current.code} language={current.language} />
        </code>
      </pre>
    </div>
  );
}

function MethodBadge({ method }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-accent/10 text-accent glow-accent">
      {method}
    </span>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`flex-shrink-0 text-fg-subtle transition-transform duration-200 ${
        open ? "rotate-180" : ""
      }`}
      aria-hidden="true"
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

function EndpointArticle({ ep, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <article
      className={`rounded-lg border transition-all duration-200 ${
        open
          ? "border-border-strong bg-bg-elevated/30"
          : "border-border bg-bg-elevated/10 hover:border-border-strong hover:bg-bg-elevated/30 hover:-translate-y-px"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-6 text-left group cursor-pointer px-5 py-5"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <MethodBadge method={ep.method} />
            <code className="font-mono text-sm text-fg-muted group-hover:text-fg transition-colors">
              {ep.path}
            </code>
          </div>
          <h3 className="font-serif text-2xl tracking-tight group-hover:text-accent transition-colors">
            {ep.title}
          </h3>
        </div>
        <ChevronIcon open={open} />
      </button>
      {open && (
        <div className="px-5 pb-6">
          <p className="mb-6 text-fg-muted leading-relaxed">
            {ep.description}
          </p>
          <TabbedCode
            tabs={[
              { label: "JavaScript", code: ep.js, language: "javascript" },
              { label: "cURL", code: ep.curl, language: "bash" },
            ]}
          />
        </div>
      )}
    </article>
  );
}

const SAMPLE_EVENTS = [
  { channel: "billing", icon: "💳", title: "Payment $29" },
  { channel: "auth", icon: "🔔", title: "New signup" },
  { channel: "api", icon: "⚠️", title: "500 timeout" },
  { channel: "ops", icon: "📦", title: "Deploy shipped" },
  { channel: "billing", icon: "💰", title: "Plan renewed" },
  { channel: "auth", icon: "🔐", title: "Login" },
  { channel: "api", icon: "🚀", title: "Webhook sent" },
  { channel: "email", icon: "📧", title: "Welcome email" },
];

function formatAge(secs) {
  if (secs <= 0) return "now";
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m`;
}

function LiveStream() {
  const [events, setEvents] = useState([
    { id: 0, ...SAMPLE_EVENTS[0], age: 2 },
    { id: 1, ...SAMPLE_EVENTS[1], age: 5 },
    { id: 2, ...SAMPLE_EVENTS[2], age: 9 },
    { id: 3, ...SAMPLE_EVENTS[3], age: 14 },
    { id: 4, ...SAMPLE_EVENTS[4], age: 21 },
    { id: 5, ...SAMPLE_EVENTS[5], age: 32 },
  ]);

  useEffect(() => {
    let nextId = 100;
    let sampleIdx = 6;
    const tick = setInterval(() => {
      setEvents((prev) => prev.map((e) => ({ ...e, age: e.age + 1 })));
    }, 1000);
    const add = setInterval(() => {
      const sample = SAMPLE_EVENTS[sampleIdx % SAMPLE_EVENTS.length];
      sampleIdx++;
      const id = nextId++;
      setEvents((prev) => [{ id, ...sample, age: 0 }, ...prev.slice(0, 5)]);
    }, 3400);
    return () => {
      clearInterval(tick);
      clearInterval(add);
    };
  }, []);

  return (
    <div className="border border-border bg-bg-elevated/40 rounded-lg overflow-hidden backdrop-blur-[1px]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="live-dot w-1.5 h-1.5 rounded-full bg-syntax-string inline-block" />
          <span className="text-[0.65rem] font-mono uppercase tracking-[0.18em] text-fg-subtle">
            live
          </span>
        </div>
        <span className="text-[0.65rem] font-mono text-fg-subtle">
          api.serverlog.dev
        </span>
      </div>
      <ul className="divide-y divide-border">
        {events.map((e, i) => (
          <li
            key={e.id}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm ${
              i === 0 ? "animate-fade-in-up" : ""
            }`}
          >
            <span className="text-base leading-none w-5 text-center">
              {e.icon}
            </span>
            <span className="font-mono text-xs text-syntax-keyword shrink-0">
              #{e.channel}
            </span>
            <span className="text-fg truncate flex-1">{e.title}</span>
            <span className="font-mono text-[0.7rem] text-fg-subtle tabular-nums shrink-0">
              {formatAge(e.age)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function buildSmoothPath(points) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

function buildStepPath(points) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x.toFixed(2)} ${points[i - 1].y.toFixed(2)}`;
    d += ` L ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)}`;
  }
  return d;
}

const CHART_COLORS = [
  { name: "orange", value: "#d97757" },
  { name: "red", value: "#dc6c64" },
  { name: "amber", value: "#d9954c" },
  { name: "green", value: "#8dab6e" },
  { name: "cyan", value: "#7ba8b8" },
  { name: "violet", value: "#a07eb0" },
];

const CHART_TYPES = [
  { key: "area", label: "Area" },
  { key: "line", label: "Line" },
  { key: "bar", label: "Bar" },
  { key: "step", label: "Step" },
];

const CHART_RANGES = {
  "24h": {
    data: [3, 2, 1, 0, 1, 2, 4, 7, 12, 18, 22, 25, 28, 24, 26, 31, 35, 29, 22, 18, 14, 9, 6, 4],
    labels: ["", "", "", "04:00", "", "", "", "08:00", "", "", "", "12:00", "", "", "", "16:00", "", "", "", "20:00", "", "", "", ""],
    tipFormat: (i) => `${String(i).padStart(2, "0")}:00`,
  },
  "7d": {
    data: [42, 56, 38, 64, 71, 88, 102],
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    tipFormat: (i) => ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
  },
  "30d": {
    data: [14, 9, 22, 18, 31, 27, 42, 38, 56, 49, 71, 64, 88, 76, 102, 89, 95, 108, 121, 134, 128, 142, 156, 149, 168, 175, 162, 189, 201, 215],
    labels: ["May 1", "", "", "", "", "May 6", "", "", "", "", "May 11", "", "", "", "", "May 16", "", "", "", "", "May 21", "", "", "", "", "May 26", "", "", "", "May 30"],
    tipFormat: (i) => `May ${i + 1}`,
  },
};

function TypeIcon({ kind }) {
  const cls = "w-3.5 h-3 stroke-current";
  if (kind === "area") {
    return (
      <svg viewBox="0 0 16 12" className={cls} fill="none">
        <path d="M0 9 Q4 4 8 6 T16 3 L16 12 L0 12 Z" fill="currentColor" opacity="0.4" />
        <path d="M0 9 Q4 4 8 6 T16 3" strokeWidth="1.2" />
      </svg>
    );
  }
  if (kind === "line") {
    return (
      <svg viewBox="0 0 16 12" className={cls} fill="none">
        <path d="M0 9 L4 6 L8 8 L12 4 L16 5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "bar") {
    return (
      <svg viewBox="0 0 16 12" className={cls} fill="currentColor">
        <rect x="0.5" y="6" width="2.5" height="6" rx="0.5" />
        <rect x="4.5" y="3" width="2.5" height="9" rx="0.5" />
        <rect x="8.5" y="7" width="2.5" height="5" rx="0.5" />
        <rect x="12.5" y="2" width="2.5" height="10" rx="0.5" />
      </svg>
    );
  }
  if (kind === "step") {
    return (
      <svg viewBox="0 0 16 12" className={cls} fill="none">
        <path d="M0 9 L4 9 L4 6 L8 6 L8 8 L12 8 L12 3 L16 3" strokeWidth="1.5" strokeLinejoin="miter" />
      </svg>
    );
  }
  return null;
}

function ChartPreview() {
  const [chartType, setChartType] = useState("area");
  const [colorIdx, setColorIdx] = useState(0);
  const [rangeKey, setRangeKey] = useState("30d");
  const [hoverIdx, setHoverIdx] = useState(null);

  const color = CHART_COLORS[colorIdx].value;
  const range = CHART_RANGES[rangeKey];
  const data = range.data;
  const labels = range.labels;

  const width = 720;
  const height = 160;
  const padding = { top: 14, right: 14, bottom: 6, left: 14 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const max = Math.max(...data) * 1.15;
  const baseY = padding.top + chartH;

  const bucketed = chartType === "bar";
  const points = data.map((d, i) => {
    const f = bucketed
      ? (i + 0.5) / data.length
      : data.length === 1
      ? 0.5
      : i / (data.length - 1);
    return {
      x: padding.left + f * chartW,
      y: padding.top + chartH - (d / max) * chartH,
    };
  });

  const smoothPath = buildSmoothPath(points);
  const stepPath = buildStepPath(points);
  const sharpPath = points.reduce(
    (acc, p, i) =>
      acc + (i === 0 ? `M ${p.x.toFixed(2)} ${p.y.toFixed(2)}` : ` L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`),
    ""
  );

  const linePath =
    chartType === "step" ? stepPath : chartType === "line" ? sharpPath : smoothPath;
  const last = points[points.length - 1];
  const first = points[0];
  const closeStep = chartType === "step";
  const areaPath = `${linePath} L ${last.x.toFixed(2)} ${baseY} L ${first.x.toFixed(2)} ${baseY} Z`;

  const total = data.reduce((a, b) => a + b, 0);
  const prevTotal = total * 0.88;
  const deltaPct = Math.round(((total - prevTotal) / prevTotal) * 100);

  const gridY = [0.25, 0.5, 0.75].map((f) => padding.top + chartH * f);

  const barWidth = Math.min((chartW / data.length) * 0.6, 24);

  const handleMove = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const vx = (xPx / rect.width) * width;
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(points[i].x - vx);
      if (d < best) {
        best = d;
        nearest = i;
      }
    }
    setHoverIdx(nearest);
  };
  const handleLeave = () => setHoverIdx(null);

  const hoverPoint = hoverIdx !== null ? points[hoverIdx] : null;
  const showLastMarker =
    chartType !== "bar" && hoverIdx === null;

  return (
    <div className="border border-border bg-bg-elevated/30 rounded-lg">
      <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-[0.65rem] font-mono uppercase tracking-[0.18em] text-fg-subtle shrink-0">
            chart
          </span>
          <code className="font-mono text-xs truncate">
            <span className="text-syntax-key">@alice</span>{" "}
            <span className="text-syntax-key">plan</span>
            <span className="text-syntax-punct">:</span>
            <span className="text-syntax-string">pro</span>{" "}
            <span className="text-syntax-keyword">#billing</span>{" "}
            <span className="text-fg-muted">payment</span>
          </code>
        </div>
        <span
          className="text-[0.65rem] font-mono shrink-0"
          style={{ color }}
        >
          ●
        </span>
      </div>

      <div className="px-5 pt-5 pb-1">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-serif text-4xl tracking-tight tabular-nums">
            {total}
          </span>
          <span className="text-sm text-fg-muted">events matched</span>
          <span className="text-xs font-mono text-syntax-string ml-1">
            +{deltaPct}% ↑
          </span>
        </div>
        <p className="mt-1 text-xs text-fg-subtle">
          vs. previous period · {rangeKey === "24h" ? "last 24 hours" : rangeKey === "7d" ? "last 7 days" : "last 30 days"}
        </p>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto block"
          preserveAspectRatio="none"
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
        >
          <defs>
            <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {gridY.map((y, i) => (
            <line
              key={i}
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke="var(--color-border)"
              strokeWidth="1"
              strokeDasharray="2 4"
            />
          ))}

          {chartType === "bar" ? (
            data.map((d, i) => {
              const h = (d / max) * chartH;
              const isHover = hoverIdx === i;
              return (
                <rect
                  key={i}
                  x={points[i].x - barWidth / 2}
                  y={padding.top + chartH - h}
                  width={barWidth}
                  height={h}
                  rx="1.5"
                  fill={color}
                  opacity={hoverIdx !== null && !isHover ? 0.5 : 0.85}
                />
              );
            })
          ) : (
            <>
              {chartType === "area" && (
                <path d={areaPath} fill="url(#chartFill)" />
              )}
              <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth="1.75"
                strokeLinecap={closeStep ? "butt" : "round"}
                strokeLinejoin={closeStep ? "miter" : "round"}
              />
              {showLastMarker && (
                <>
                  <circle cx={last.x} cy={last.y} r="10" fill={color} opacity="0.18" />
                  <circle
                    cx={last.x}
                    cy={last.y}
                    r="3.5"
                    fill="var(--color-bg)"
                    stroke={color}
                    strokeWidth="1.75"
                  />
                </>
              )}
            </>
          )}

          {hoverPoint && (
            <>
              <line
                x1={hoverPoint.x}
                x2={hoverPoint.x}
                y1={padding.top}
                y2={padding.top + chartH}
                stroke={color}
                strokeOpacity="0.35"
                strokeDasharray="2 3"
              />
              {chartType !== "bar" && (
                <circle
                  cx={hoverPoint.x}
                  cy={hoverPoint.y}
                  r="3.5"
                  fill="var(--color-bg)"
                  stroke={color}
                  strokeWidth="1.75"
                />
              )}
            </>
          )}
        </svg>

        {hoverPoint && (
          <div
            className="absolute pointer-events-none px-2 py-1 rounded border border-border bg-bg-elevated text-[0.7rem] font-mono whitespace-nowrap shadow-lg z-10"
            style={{
              left: `${(hoverPoint.x / width) * 100}%`,
              top: `${(hoverPoint.y / height) * 100}%`,
              transform: "translate(-50%, calc(-100% - 10px))",
            }}
          >
            <span className="text-fg-subtle">{range.tipFormat(hoverIdx)}</span>
            <span className="text-fg ml-2 tabular-nums">{data[hoverIdx]}</span>
            <span className="text-fg-subtle ml-1">events</span>
          </div>
        )}
      </div>

      <div className="relative h-7 text-[0.65rem] font-mono text-fg-subtle">
        {labels.map((d, i) => {
          if (!d) return null;
          const xPct = (points[i].x / width) * 100;
          let tx = "-50%";
          if (xPct < 8) tx = "0%";
          else if (xPct > 92) tx = "-100%";
          return (
            <span
              key={i}
              className="absolute top-1 whitespace-nowrap"
              style={{ left: `${xPct}%`, transform: `translateX(${tx})` }}
            >
              {d}
            </span>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 border-t border-border">
        <div className="flex items-center gap-1">
          {CHART_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setChartType(t.key)}
              title={t.label}
              className={`inline-flex items-center justify-center w-8 h-7 rounded border transition-colors ${
                chartType === t.key
                  ? "border-border-strong bg-bg-elevated text-fg"
                  : "border-transparent text-fg-subtle hover:text-fg-muted hover:border-border"
              }`}
            >
              <TypeIcon kind={t.key} />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {CHART_COLORS.map((c, i) => (
            <button
              key={c.name}
              onClick={() => setColorIdx(i)}
              title={c.name}
              className={`w-4 h-4 rounded-full transition-transform ${
                colorIdx === i ? "ring-2 ring-offset-2 ring-offset-bg-elevated scale-110" : "opacity-70 hover:opacity-100"
              }`}
              style={{
                backgroundColor: c.value,
                "--tw-ring-color": c.value,
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-0.5">
          {Object.keys(CHART_RANGES).map((key) => (
            <button
              key={key}
              onClick={() => setRangeKey(key)}
              className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                rangeKey === key
                  ? "bg-bg-elevated text-fg border border-border-strong"
                  : "text-fg-subtle hover:text-fg-muted border border-transparent"
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <LanguageProvider>
      <Head>
        <title>serverlog — open-source event tracking, API-first</title>
        <meta
          name="description"
          content="Real-time event tracking and analytics. Self-hosted. Three endpoints. No SDK required."
        />
      </Head>

      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <a href="/" className="font-serif text-lg tracking-tight">
            serverlog
          </a>
          <nav className="flex items-center gap-6 text-sm text-fg-muted">
            <a href="#api" className="hover:text-fg transition-colors">
              API
            </a>
            <a
              href="https://github.com/serverlog-io/serverlog"
              className="hover:text-fg transition-colors"
            >
              GitHub
            </a>
            <a
              href="http://localhost:3011"
              className="hover:text-fg transition-colors"
            >
              Dashboard →
            </a>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative pt-20 md:pt-28 pb-20 md:pb-28">
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-start">
              <div>
                <h1 className="font-serif text-4xl md:text-5xl lg:text-[3.25rem] leading-[1.05] tracking-[-0.015em]">
                  Event tracking,
                  <br />
                  <span className="text-fg-muted italic">one endpoint away.</span>
                </h1>
                <p className="mt-6 text-base text-fg-muted leading-relaxed">
                  An open-source, self-hosted analytics platform. Three REST
                  endpoints, real-time streaming, no SDK required. Send your
                  first event in under a minute.
                </p>
                <div className="mt-8">
                  <CodeBlock
                    code={INSTALL_CURL}
                    language="bash"
                    filename="install on any VPS"
                  />
                </div>
                <div className="mt-5 flex items-center gap-6">
                  <a
                    href="https://github.com/serverlog-io/serverlog"
                    className="inline-flex items-center text-sm font-medium text-fg-muted hover:text-fg transition-colors"
                  >
                    View on GitHub →
                  </a>
                  <a
                    href="#api"
                    className="inline-flex items-center text-sm font-medium text-fg-muted hover:text-fg transition-colors"
                  >
                    Read the API ↓
                  </a>
                </div>
              </div>
              <div className="lg:pt-2">
                <LiveStream />
                <p className="mt-3 text-xs text-fg-subtle font-mono">
                  ↑ a live feed from a self-hosted instance
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-6">
          <div className="hairline" />
        </div>

        <div className="max-w-3xl mx-auto px-6">
        {/* API Reference */}
        <section id="api" className="pt-20 pb-20">
          <div className="mb-10">
            <span className="eyebrow">Quickstart</span>
            <h2 className="mt-3 font-serif text-3xl tracking-tight">
              Send your first event
            </h2>
            <p className="mt-3 text-fg-muted leading-relaxed">
              Generate an API key from your dashboard, then post an event from
              anywhere — your backend, a serverless function, a shell script.
            </p>
          </div>

          <div className="space-y-4">
            {ENDPOINTS.map((ep, idx) => (
              <EndpointArticle
                key={ep.path}
                ep={ep}
                defaultOpen={idx === 0}
              />
            ))}
          </div>
        </section>

        {/* Search & charts */}
        <section id="search" className="pb-20">
          <div className="mb-10">
            <span className="eyebrow">Search &amp; charts</span>
            <h2 className="mt-3 font-serif text-3xl tracking-tight">
              Query anything, chart anything
            </h2>
            <p className="mt-3 text-fg-muted leading-relaxed">
              One search box, four operators. Combine free text, users,
              channels and tags — then save the query as a chart on your
              dashboard with a single click.
            </p>
          </div>

          <dl className="space-y-8">
            {SYNTAX.map((item) => (
              <div
                key={item.syntax}
                className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3 sm:gap-6"
              >
                <dt>
                  <code className="font-mono text-sm text-syntax-keyword">
                    {item.syntax}
                  </code>
                </dt>
                <dd>
                  <div className="text-fg">{item.title}</div>
                  <p className="mt-1 text-sm text-fg-muted leading-relaxed">
                    {item.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.examples.map((ex) => (
                      <code
                        key={ex}
                        className="font-mono text-xs text-fg-muted bg-bg-elevated px-2 py-1 rounded border border-border"
                      >
                        {ex}
                      </code>
                    ))}
                  </div>
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-12 pt-8 border-t border-border">
            <div className="eyebrow mb-4">Combine them</div>
            <CodeBlock
              code={`@alice plan:pro #billing payment`}
              language="search"
              filename="search"
            />
            <p className="mt-4 text-sm text-fg-muted leading-relaxed">
              Filters by user{" "}
              <code className="font-mono text-syntax-key">alice</code>, tag{" "}
              <code className="font-mono text-syntax-key">plan</code>
              <code className="font-mono text-syntax-punct">:</code>
              <code className="font-mono text-syntax-string">pro</code>,
              channel{" "}
              <code className="font-mono text-syntax-keyword">#billing</code>,
              with{" "}
              <code className="font-mono text-fg">payment</code> appearing in
              the event name or description. Save it and you have a
              time-series chart that updates live.
            </p>

            <div className="mt-6 flex items-center gap-3 text-xs font-mono text-fg-subtle">
              <span className="h-px w-8 bg-border-strong" />
              <span>saved as chart</span>
            </div>
            <div className="mt-3">
              <ChartPreview />
            </div>
          </div>
        </section>

        {/* Auth note */}
        <section className="pb-20">
          <div className="border-l-2 border-accent pl-5 py-1">
            <div className="text-[0.7rem] font-mono uppercase tracking-[0.18em] text-accent mb-2">
              Authentication
            </div>
            <p className="text-fg-muted leading-relaxed">
              Every request needs an{" "}
              <code className="font-mono text-sm text-fg bg-bg-elevated px-1.5 py-0.5 rounded border border-border">
                Authorization: Bearer
              </code>{" "}
              header. Keys are scoped to a single project and can be revoked at
              any time from the dashboard.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 border-t border-border">
          <h2 className="font-serif text-3xl tracking-tight">
            Ready to ship?
          </h2>
          <p className="mt-3 text-fg-muted leading-relaxed max-w-xl">
            Self-host with Docker in one command, or run locally for
            development. The whole stack is fair-code and open to inspection.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <a
              href="https://github.com/serverlog-io/serverlog"
              className="inline-flex items-center px-5 py-2.5 border border-border-strong text-sm font-medium rounded-md hover:bg-bg-elevated hover:border-fg-subtle transition-colors"
            >
              Read the source
            </a>
          </div>
        </section>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between text-sm text-fg-subtle">
          <span className="font-serif">serverlog</span>
          <span>Sustainable Use License · Open source</span>
        </div>
      </footer>
    </LanguageProvider>
  );
}
