import { useState, useEffect, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import { subDays, subHours } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import FunnelApi from "@/api/funnel.api";
import EventApi from "@/api/event.api";

const RANGE_OPTIONS = [
  { label: "24h", value: "24h", getRange: () => ({ start: subHours(new Date(), 24), end: new Date() }) },
  { label: "7d", value: "7d", getRange: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
  { label: "30d", value: "30d", getRange: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
  { label: "90d", value: "90d", getRange: () => ({ start: subDays(new Date(), 90), end: new Date() }) },
];
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;

  return (
    <div className="rounded-lg border border-border bg-bg-elevated/90 px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-fg">{data.name}</p>
      <p className="text-sm text-fg-muted">{data.count.toLocaleString()} users</p>
      {data.conversion && (
        <p className="text-xs text-fg-muted">{data.conversion}% from previous</p>
      )}
    </div>
  );
}

function FunnelChart({ results, overallConversion }) {
  if (!results || results.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-fg-subtle">
        No data available
      </div>
    );
  }

  const chartData = results.map((step, index) => ({
    name: step.event,
    count: step.count,
    conversion: index > 0 ? step.conversionFromPrevious : null,
  }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-fg-subtle">Conversion rate</span>
        <span className="font-medium text-green-400">{overallConversion}%</span>
      </div>

      {/* Bar Chart */}
      <div className="space-y-3">
        {chartData.map((step, index) => (
          <div key={index}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-fg-muted">{step.name}</span>
              <span className="tabular-nums">{step.count.toLocaleString()}</span>
            </div>
            <div className="h-8">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[step]}
                  layout="vertical"
                  margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                >
                  <XAxis type="number" hide domain={[0, chartData[0].count]} />
                  <YAxis type="category" hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                  <Bar dataKey="count" radius={4} fill="#8b5cf6" isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {step.conversion && (
              <div className="mt-1 text-xs text-fg-subtle">{step.conversion}% from previous</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AutocompleteInput({ value, onChange, suggestions, placeholder, className }) {
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    if (value && suggestions.length > 0) {
      const matches = suggestions.filter(s =>
        s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()
      );
      setFiltered(matches.slice(0, 5));
    } else {
      setFiltered(suggestions.slice(0, 5));
    }
  }, [value, suggestions]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={className}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-bg-elevated py-1 shadow-lg">
          {filtered.map((suggestion, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onChange(suggestion);
                setOpen(false);
              }}
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-bg-elevated"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StepEditor({ steps, onChange, eventSuggestions = [], channelSuggestions = [] }) {
  const addStep = () => {
    onChange([...steps, { event: "" }]);
  };

  const updateStep = (index, field, value) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    onChange(newSteps);
  };

  const removeStep = (index) => {
    if (steps.length > 2) {
      onChange(steps.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-2">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-elevated text-xs">
            {index + 1}
          </span>
          <AutocompleteInput
            value={step.event}
            onChange={(v) => updateStep(index, "event", v)}
            suggestions={eventSuggestions}
            placeholder="Event name"
            className="flex-1 h-9"
          />
          <AutocompleteInput
            value={step.channel || ""}
            onChange={(v) => updateStep(index, "channel", v)}
            suggestions={channelSuggestions}
            placeholder="Channel"
            className="w-32 h-9"
          />
          {steps.length > 2 && (
            <button
              type="button"
              onClick={() => removeStep(index)}
              className="shrink-0 rounded p-1.5 text-fg-subtle hover:bg-bg-elevated hover:text-fg-muted"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      {steps.length < 10 && (
        <button
          type="button"
          onClick={addStep}
          className="flex items-center gap-1 text-xs text-fg-subtle hover:text-fg-muted"
        >
          <Plus className="h-3 w-3" />
          Add step
        </button>
      )}
    </div>
  );
}

function CreateFunnelDialog({ projectId, onCreated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState([
    { event: "" },
    { event: "" },
  ]);
  const [timeWindow, setTimeWindow] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [eventSuggestions, setEventSuggestions] = useState([]);
  const [channelSuggestions, setChannelSuggestions] = useState([]);

  useEffect(() => {
    if (open) {
      EventApi.getSuggestions(projectId)
        .then(({ data }) => {
          setEventSuggestions(data.events || []);
          setChannelSuggestions(data.channels?.map(c => c.slug) || []);
        })
        .catch(() => {});
    }
  }, [open, projectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (steps.some((s) => !s.event.trim())) {
      setError("All steps must have an event name");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data } = await FunnelApi.create(projectId, {
        name: name.trim(),
        description: description.trim(),
        steps: steps.map((s) => ({
          event: s.event.trim(),
          ...(s.channel?.trim() && { channel: s.channel.trim() }),
        })),
        timeWindow,
      });
      onCreated(data);
      setOpen(false);
      setName("");
      setDescription("");
      setSteps([{ event: "" }, { event: "" }]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create funnel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Create Funnel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-bg border-border">
        <DialogHeader>
          <DialogTitle>Create Funnel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Signup to Purchase"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Track conversion from signup to first purchase"
            />
          </div>

          <div className="space-y-2">
            <Label>Steps (min 2, max 10)</Label>
            <StepEditor
              steps={steps}
              onChange={setSteps}
              eventSuggestions={eventSuggestions}
              channelSuggestions={channelSuggestions}
            />
          </div>

          <div className="space-y-2">
            <Label>Time Window (days)</Label>
            <Input
              type="number"
              min={1}
              max={90}
              value={timeWindow}
              onChange={(e) => setTimeWindow(parseInt(e.target.value) || 7)}
              className="w-24"
            />
            <p className="text-xs text-fg-subtle">
              Users must complete all steps within this time window
            </p>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Creating..." : "Create Funnel"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FunnelCard({ funnel, projectId, onDelete }) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState("30d");

  const loadResults = async (range = selectedRange) => {
    setLoading(true);
    try {
      const rangeOption = RANGE_OPTIONS.find((r) => r.value === range);
      const { start, end } = rangeOption?.getRange() || {};
      const { data } = await FunnelApi.calculate(projectId, funnel.id, {
        startDate: start?.toISOString(),
        endDate: end?.toISOString(),
      });
      setResults(data);
    } catch (err) {
      console.error("Failed to calculate funnel:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, []);

  const handleRangeChange = (range) => {
    setSelectedRange(range);
    loadResults(range);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this funnel?")) return;

    try {
      await FunnelApi.delete(projectId, funnel.id);
      onDelete(funnel.id);
    } catch (err) {
      console.error("Failed to delete funnel:", err);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-bg-elevated/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <h3 className="font-medium">{funnel.name}</h3>
          {funnel.description && (
            <p className="text-sm text-fg-subtle">{funnel.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-fg-subtle">
            {funnel.steps.length} steps
          </span>
          <div className="flex gap-0.5">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleRangeChange(option.value)}
                className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                  selectedRange === option.value
                    ? "bg-bg-elevated text-fg"
                    : "text-fg-subtle hover:text-fg-muted"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleDelete}
            className="rounded p-1.5 text-fg-subtle hover:bg-bg-elevated hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="border-t border-border px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
          </div>
        ) : results ? (
          <FunnelChart
            results={results.results}
            overallConversion={results.overallConversion}
          />
        ) : (
          <div className="text-center text-sm text-fg-subtle">
            Failed to load funnel data
          </div>
        )}
      </div>
    </div>
  );
}

export function FunnelsPanel({ projectId }) {
  const [funnels, setFunnels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFunnels = async () => {
      try {
        const { data } = await FunnelApi.list(projectId);
        setFunnels(data.funnels || []);
      } catch (err) {
        console.error("Failed to fetch funnels:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFunnels();
  }, [projectId]);

  const handleCreated = (funnel) => {
    setFunnels([funnel, ...funnels]);
  };

  const handleDelete = (funnelId) => {
    setFunnels(funnels.filter((f) => f.id !== funnelId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Funnels</h2>
          <p className="text-sm text-fg-subtle">
            Track user conversion through multi-step flows
          </p>
        </div>
        <CreateFunnelDialog projectId={projectId} onCreated={handleCreated} />
      </div>

      {funnels.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-bg-elevated/30 py-16">
          <div className="mb-4 rounded-full bg-bg-elevated/40 p-4">
            <svg
              className="h-8 w-8 text-fg-subtle"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
          </div>
          <h3 className="mb-1 font-medium text-fg-muted">No funnels yet</h3>
          <p className="mb-6 text-sm text-fg-subtle">
            Create your first funnel to track user conversion
          </p>
          <CreateFunnelDialog projectId={projectId} onCreated={handleCreated} />
        </div>
      ) : (
        <div className="space-y-3">
          {funnels.map((funnel) => (
            <FunnelCard
              key={funnel.id}
              funnel={funnel}
              projectId={projectId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
