import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ProjectCard({ project }) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="cursor-pointer transition-colors hover:bg-accent/50">
        <CardHeader>
          <CardTitle>{project.name}</CardTitle>
          <CardDescription>
            {project.description || "No description"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">{project._count?.channels || 0}</span> channels
            </div>
            <div>
              <span className="font-medium text-foreground">{project._count?.events || 0}</span> events
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
