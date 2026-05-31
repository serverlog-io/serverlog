import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

function formatDateExact(value) {
  if (!value) return "";
  const d = new Date(value);
  return d.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function Section({ label, children, mono = false }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
        {label}
      </h3>
      <div
        className={
          mono
            ? "font-mono text-xs text-fg"
            : "text-sm text-fg leading-relaxed"
        }
      >
        {children}
      </div>
    </section>
  );
}

function FieldRow({ label, value }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-baseline gap-4">
      <span className="w-28 shrink-0 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
        {label}
      </span>
      <span className="min-w-0 flex-1 break-all font-mono text-xs text-fg">
        {value}
      </span>
    </div>
  );
}

/**
 * Normalize the input event into a shape we can render. Accepts events from
 * both the API feed (full fields) and the playground history (subset).
 */
function normalize(input) {
  if (!input) return null;
  const e = input;
  const p = e.payload || {};
  const r = e.response?.event || {};
  return {
    id: e.id || r.id || null,
    event: e.event || e.eventName || r.event || p.event || "(unnamed)",
    description: e.description || r.description || p.description || null,
    icon: e.icon || r.icon || p.icon || null,
    channel: e.channel || r.channel || p.channel || null,
    channelId: e.channelId || r.channelId || null,
    projectId: e.projectId || r.projectId || null,
    userId: e.userId || e.user_id || r.userId || p.user_id || null,
    tags:
      (e.tags && typeof e.tags === "object" && e.tags) ||
      (r.tags && typeof r.tags === "object" && r.tags) ||
      (p.tags && typeof p.tags === "object" && p.tags) ||
      {},
    parser: e.parser || r.parser || null,
    timestamp: e.timestamp || r.timestamp || null,
    createdAt: e.createdAt || r.createdAt || null,
    updatedAt: e.updatedAt || r.updatedAt || null,
    metadata: e.metadata || r.metadata || null,
    raw: e,
  };
}

export function EventDetailModal({ event, open, onClose, onLoadInEditor, projectName }) {
  const [tab, setTab] = useState("details");
  const data = normalize(event);
  if (!data) return null;

  const channelName =
    typeof data.channel === "object"
      ? data.channel?.name || data.channel?.slug
      : data.channel;
  const channelColor =
    (typeof data.channel === "object" && data.channel?.color) || "#d97757";
  const tagEntries = Object.entries(data.tags || {});
  const hasMetadata =
    data.metadata && typeof data.metadata === "object"
      ? Object.keys(data.metadata).length > 0
      : false;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="max-h-[85vh] w-full max-w-2xl overflow-hidden p-0">
        {/* Title row */}
        <header className="px-6 pb-4 pt-6">
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-elevated/60 text-2xl"
              aria-hidden="true"
            >
              {data.icon || "●"}
            </span>
            <div className="min-w-0 flex-1 pr-6">
              <DialogTitle className="truncate font-serif text-xl text-fg">
                {data.event}
              </DialogTitle>
              <DialogDescription className="mt-1 flex items-center gap-2 truncate text-xs text-fg-muted">
                {channelName && (
                  <span className="inline-flex items-center gap-1.5 font-mono">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: channelColor }}
                    />
                    #{channelName}
                  </span>
                )}
                {data.timestamp && (
                  <>
                    <span className="text-fg-subtle">·</span>
                    <span className="font-mono">
                      {formatDateExact(data.timestamp)}
                    </span>
                  </>
                )}
              </DialogDescription>
            </div>
          </div>
        </header>

        {/* Tabs row — sits on its own border so the active underline merges with the line */}
        <div className="flex items-center gap-1 border-b border-border px-6">
          <button
            type="button"
            onClick={() => setTab("details")}
            className={`relative px-3 py-2.5 text-xs font-medium transition-colors ${
              tab === "details"
                ? "text-fg"
                : "text-fg-subtle hover:text-fg-muted"
            }`}
          >
            Details
            {tab === "details" && (
              <span className="absolute -bottom-px left-0 right-0 h-[2px] bg-accent" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("raw")}
            className={`relative px-3 py-2.5 text-xs font-medium transition-colors ${
              tab === "raw"
                ? "text-fg"
                : "text-fg-subtle hover:text-fg-muted"
            }`}
          >
            Raw JSON
            {tab === "raw" && (
              <span className="absolute -bottom-px left-0 right-0 h-[2px] bg-accent" />
            )}
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {tab === "details" ? (
            <div className="space-y-5">
              {data.description && (
                <Section label="Description">{data.description}</Section>
              )}

              {data.userId && (
                <Section label="User" mono>
                  @{data.userId}
                </Section>
              )}

              {tagEntries.length > 0 && (
                <Section label="Tags">
                  <div className="flex flex-wrap gap-2">
                    {tagEntries.map(([k, v]) => (
                      <span
                        key={k}
                        className="inline-flex items-baseline gap-2 rounded-md border border-border bg-bg-elevated/40 px-2.5 py-1"
                      >
                        <span className="text-[9px] font-medium uppercase tracking-[0.1em] text-fg-subtle">
                          {k}
                        </span>
                        <span className="font-mono text-[12px] text-fg">
                          {String(v)}
                        </span>
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              <Section label="Identifiers">
                <div className="space-y-3">
                  <FieldRow label="Event ID" value={data.id} />
                  <FieldRow label="Channel" value={channelName} />
                  <FieldRow label="Project" value={projectName} />
                  <FieldRow label="Parser" value={data.parser} />
                </div>
              </Section>

              {hasMetadata && (
                <Section label="Metadata">
                  <pre className="overflow-auto rounded-md border border-border bg-bg-code p-3 font-mono text-[11px] text-fg-muted">
                    {JSON.stringify(data.metadata, null, 2)}
                  </pre>
                </Section>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-border bg-bg-code text-xs [&_code]:!bg-transparent [&_span]:!bg-transparent">
              <SyntaxHighlighter
                language="json"
                style={oneDark}
                customStyle={{
                  margin: 0,
                  padding: "1rem",
                  background: "transparent",
                  fontSize: "12px",
                  lineHeight: "1.6",
                }}
                codeTagProps={{ style: { background: "transparent" } }}
              >
                {JSON.stringify(data.raw, null, 2)}
              </SyntaxHighlighter>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-end gap-2 border-t border-border bg-bg-elevated/30 px-6 py-3">
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  JSON.stringify(data.raw, null, 2)
                );
              } catch {}
            }}
            className="rounded-md px-3 py-1.5 text-xs text-fg-muted transition-colors hover:bg-bg-elevated hover:text-fg"
          >
            Copy JSON
          </button>
          {onLoadInEditor && (
            <button
              type="button"
              onClick={() => {
                onLoadInEditor(data.raw);
                onClose?.();
              }}
              className="rounded-md border border-border-strong px-3 py-1.5 text-xs text-fg transition-colors hover:bg-bg-elevated"
            >
              Load in editor
            </button>
          )}
          <button
            type="button"
            onClick={() => onClose?.()}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Close
          </button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
