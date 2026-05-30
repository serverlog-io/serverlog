import { Card, CardContent } from "@/components/ui/card";

export function EventItem({ event }) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              {event.icon && <span className="text-lg">{event.icon}</span>}
              <span className="font-medium">{event.event}</span>
            </div>
            {event.description && (
              <p className="text-sm text-muted-foreground">{event.description}</p>
            )}
            {event.tags && Object.keys(event.tags).length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {Object.entries(event.tags).map(([key, value]) => (
                  <span
                    key={key}
                    className="rounded bg-secondary px-1.5 py-0.5 text-xs"
                  >
                    {key}: {value}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">
              {event.channel?.name || "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDate(event.createdAt)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
