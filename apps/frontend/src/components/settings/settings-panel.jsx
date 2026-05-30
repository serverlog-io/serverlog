import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProjectApi from "@/api/project.api";
import ProjectSettingsApi from "@/api/projectSettings.api";

const SETTINGS_SECTIONS = [
  {
    title: "Public API rate limiting",
    eyebrow: "Throughput",
    description:
      "Limits applied to /v1/* requests made with this project's API keys. Changes propagate within ~10s without restarting the server.",
    keys: [
      "publicApiRateLimitEnabled",
      "publicApiRateLimitWindowSec",
      "publicApiKeyRateLimit",
    ],
  },
  {
    title: "Event payload limits",
    eyebrow: "Validation",
    description:
      "Bounds enforced on every /v1/log call. Tighter limits help keep noisy clients from filling up storage.",
    keys: ["maxEventDescriptionLength", "maxTagsPerEvent"],
  },
  {
    title: "Retention",
    eyebrow: "Storage",
    description:
      "How long events are kept before the pruning job removes them. Set higher to retain longer.",
    keys: ["eventRetentionDays"],
  },
];

const LABELS = {
  publicApiRateLimitEnabled: "Rate limiting enabled",
  publicApiRateLimitWindowSec: "Window length (seconds)",
  publicApiKeyRateLimit: "Requests per window — per API key",
  maxEventDescriptionLength: "Max description length (chars)",
  maxTagsPerEvent: "Max tags per event",
  eventRetentionDays: "Event retention (days)",
};

function SettingRow({ k, spec, value, onChange, onReset, dirty }) {
  if (spec.type === "boolean") {
    return (
      <div className="flex items-start justify-between gap-6 py-4 border-t border-border first:border-t-0">
        <div className="min-w-0 flex-1">
          <div className="text-sm text-fg">{LABELS[k] || k}</div>
          <p className="mt-1 text-xs text-fg-muted leading-relaxed">{spec.description}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(!value)}
          aria-pressed={!!value}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            value ? "bg-accent" : "bg-bg-elevated border border-border"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-fg transition-transform ${
              value ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-6 py-4 border-t border-border first:border-t-0">
      <div className="min-w-0 flex-1">
        <Label className="text-fg-muted">{LABELS[k] || k}</Label>
        <p className="mt-1.5 text-xs text-fg-muted leading-relaxed">{spec.description}</p>
        <div className="mt-1 flex items-center gap-3 text-[0.7rem] font-mono text-fg-subtle">
          <span>default {spec.default}</span>
          {spec.min != null && spec.max != null && <span>range {spec.min}–{spec.max}</span>}
          {String(value) !== String(spec.default) && (
            <button
              type="button"
              onClick={onReset}
              className="text-fg-subtle hover:text-fg transition-colors"
            >
              reset →
            </button>
          )}
        </div>
      </div>
      <Input
        type="number"
        min={spec.min}
        max={spec.max}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={`w-32 font-mono tabular-nums text-right ${
          dirty ? "border-accent/50" : ""
        }`}
      />
    </div>
  );
}

function ProjectSettingsForm({ projectId }) {
  const [settings, setSettings] = useState(null);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState(null);

  const fetchSettings = async () => {
    try {
      const { data } = await ProjectSettingsApi.list(projectId);
      setSettings(data.settings);
      const initial = {};
      for (const [k, s] of Object.entries(data.settings)) initial[k] = s.value;
      setDraft(initial);
      setError("");
    } catch (err) {
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchSettings();
  }, [projectId]);

  const dirty = settings
    ? Object.keys(draft).some((k) => String(draft[k]) !== String(settings[k].value))
    : false;

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = {};
      for (const [k, v] of Object.entries(draft)) {
        const spec = settings[k];
        if (String(v) === String(spec.value)) continue;
        if (spec.type === "integer") payload[k] = parseInt(v, 10);
        else if (spec.type === "boolean") payload[k] = !!v;
        else payload[k] = v;
      }
      await ProjectSettingsApi.update(projectId, payload);
      setSavedAt(new Date());
      await fetchSettings();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (key) => {
    try {
      await ProjectSettingsApi.reset(projectId, key);
      await fetchSettings();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }
  if (!settings) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error || "Failed to load settings"}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {SETTINGS_SECTIONS.map((section) => (
        <section key={section.title}>
          <div className="mb-4">
            <span className="eyebrow">{section.eyebrow}</span>
            <h3 className="mt-3 font-serif text-xl tracking-tight">
              {section.title}
            </h3>
            <p className="mt-2 text-sm text-fg-muted leading-relaxed">
              {section.description}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-bg-elevated/30 px-5">
            {section.keys.map((k) => {
              if (!settings[k]) return null;
              const isDirty = String(draft[k]) !== String(settings[k].value);
              return (
                <SettingRow
                  key={k}
                  k={k}
                  spec={settings[k]}
                  value={draft[k]}
                  onChange={(v) => setDraft({ ...draft, [k]: v })}
                  onReset={() => handleReset(k)}
                  dirty={isDirty}
                />
              );
            })}
          </div>
        </section>
      ))}

      <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
        <div className="text-xs font-mono text-fg-subtle">
          {error ? (
            <span className="text-destructive">{error}</span>
          ) : dirty ? (
            <span>unsaved changes</span>
          ) : savedAt ? (
            <span>saved {savedAt.toLocaleTimeString()}</span>
          ) : (
            <span>up to date</span>
          )}
        </div>
        <Button onClick={handleSave} disabled={!dirty || saving}>
          {saving ? "Saving..." : "Save changes →"}
        </Button>
      </div>
    </div>
  );
}

export function SettingsPanel({ project, onDelete, onUpdate }) {
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasChanges = name !== project.name || description !== (project.description || "");

  const handleSave = async () => {
    setSaving(true);
    try {
      await ProjectApi.update(project.id, { name, description });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (onUpdate) onUpdate({ ...project, name, description });
    } catch (error) {
      console.error("Failed to update project:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete();
  };

  return (
    <div className="space-y-10">
      {/* Project Details */}
      <section>
        <div className="mb-4">
          <span className="eyebrow">General</span>
          <h3 className="mt-3 font-serif text-xl tracking-tight">Project details</h3>
        </div>
        <div className="rounded-lg border border-border bg-bg-elevated/30 p-5 space-y-4">
          <div className="space-y-2">
            <Label className="text-fg-muted">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-fg-muted">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
            <div className="flex flex-col gap-1">
              <span className="text-[0.65rem] font-mono uppercase tracking-[0.18em] text-fg-subtle">Project ID</span>
              <code className="text-xs text-fg-muted truncate">{project.id}</code>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[0.65rem] font-mono uppercase tracking-[0.18em] text-fg-subtle">Slug</span>
              <code className="text-xs text-fg-muted">{project.slug}</code>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[0.65rem] font-mono uppercase tracking-[0.18em] text-fg-subtle">Created</span>
              <span className="text-xs text-fg-muted">{new Date(project.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || saving || !name.trim()}
          >
            {saving ? "Saving..." : saved ? "Saved!" : "Save changes"}
          </Button>
        </div>
      </section>

      {/* Per-project tunable settings */}
      <ProjectSettingsForm projectId={project.id} />

      {/* Danger zone */}
      <section>
        <div className="mb-4">
          <span className="eyebrow" style={{ color: "var(--color-accent)" }}>Danger</span>
          <h3 className="mt-3 font-serif text-xl tracking-tight text-destructive">
            Delete project
          </h3>
          <p className="mt-2 text-sm text-fg-muted">
            Permanently removes all events, channels, API keys and settings.
          </p>
        </div>
        <div className="rounded-lg border border-destructive/30 bg-destructive/[0.04] p-5">
          {!showDelete ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDelete(true)}
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive"
            >
              Delete project
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-fg-muted">
                Type <strong className="font-mono text-fg">{project.name}</strong> to confirm:
              </p>
              <Input
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={project.name}
                className="border-destructive/30"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowDelete(false);
                    setConfirmName("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={confirmName !== project.name || deleting}
                >
                  {deleting ? "Deleting..." : "Delete permanently"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
