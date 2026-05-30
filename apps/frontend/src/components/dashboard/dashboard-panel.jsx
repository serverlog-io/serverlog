import { useState, useEffect, useRef, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import DashboardApi from "@/api/dashboard.api";
import { DashboardChart } from "./dashboard-chart";
import { useSocket } from "@/hooks/useSocket";

function SortableChart({ chart, projectId, onDelete, onUpdate, chartRef }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chart.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-md bg-bg-elevated/40 text-fg-subtle opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing hover:bg-bg-elevated hover:text-fg-muted"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <DashboardChart
        ref={chartRef}
        chart={chart}
        projectId={projectId}
        onDelete={onDelete}
        onUpdate={onUpdate}
      />
    </div>
  );
}

export function DashboardPanel({ projectId }) {
  const [charts, setCharts] = useState([]);
  const [loading, setLoading] = useState(true);
  const chartRefsMap = useRef(new Map());

  // Handle new events from socket - broadcast to all charts
  const handleNewEvent = useCallback((event) => {
    chartRefsMap.current.forEach((chartRef) => {
      chartRef?.addEvent?.(event);
    });
  }, []);

  // Connect to socket for real-time updates
  useSocket(projectId, handleNewEvent);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!projectId) return;

    const fetchCharts = async () => {
      try {
        const { data } = await DashboardApi.list(projectId);
        setCharts(data.charts || []);
      } catch (err) {
        console.error("Failed to fetch dashboard charts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCharts();
  }, [projectId]);

  const handleDelete = async (chartId) => {
    try {
      await DashboardApi.delete(projectId, chartId);
      setCharts((prev) => prev.filter((c) => c.id !== chartId));
    } catch (err) {
      console.error("Failed to delete chart:", err);
    }
  };

  const handleUpdate = async (chartId, data) => {
    try {
      const { data: updated } = await DashboardApi.update(projectId, chartId, data);
      setCharts((prev) => prev.map((c) => (c.id === chartId ? updated : c)));
    } catch (err) {
      console.error("Failed to update chart:", err);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = charts.findIndex((c) => c.id === active.id);
      const newIndex = charts.findIndex((c) => c.id === over.id);

      const newCharts = arrayMove(charts, oldIndex, newIndex);
      setCharts(newCharts);

      // Persist the new order
      try {
        await DashboardApi.reorder(projectId, newCharts.map((c) => c.id));
      } catch (err) {
        console.error("Failed to reorder charts:", err);
        // Revert on error
        setCharts(charts);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  if (charts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mb-4 rounded-full bg-bg-elevated/50 p-4">
          <svg className="h-8 w-8 text-fg-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="mb-1 font-medium text-fg-muted">No charts yet</h3>
        <p className="mb-2 text-sm text-fg-subtle text-center max-w-sm">
          Save charts from the Events tab by applying filters and clicking "Save to Dashboard"
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={charts.map((c) => c.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 pl-4">
          {charts.map((chart) => (
            <SortableChart
              key={chart.id}
              chart={chart}
              projectId={projectId}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
              chartRef={(ref) => {
                if (ref) {
                  chartRefsMap.current.set(chart.id, ref);
                } else {
                  chartRefsMap.current.delete(chart.id);
                }
              }}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
