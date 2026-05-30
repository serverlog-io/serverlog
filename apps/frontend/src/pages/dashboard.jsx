import { useState, useEffect } from "react";
import Link from "next/link";
import ProjectApi from "@/api/project.api";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";

function ProjectRow({ project }) {
  return (
    <Link href={`/projects/${project.id}`}>
      <article className="group rounded-lg border border-border bg-bg-elevated/20 px-5 py-5 transition-all duration-200 hover:border-border-strong hover:bg-bg-elevated/40 hover:-translate-y-px">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/10 border border-accent/20 text-accent font-serif text-lg">
              {project.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="font-serif text-xl tracking-tight group-hover:text-accent transition-colors truncate">
                {project.name}
              </h3>
              <p className="text-sm text-fg-muted truncate">
                {project.description || project.slug}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-5 text-xs font-mono text-fg-subtle shrink-0">
            <span className="tabular-nums">
              {project._count?.events || 0} events
            </span>
            <span className="tabular-nums">
              {project._count?.channels || 0} channels
            </span>
            <span className="text-fg-subtle opacity-0 group-hover:opacity-100 transition-opacity">
              →
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function EmptyState({ onCreated }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20">
      <h3 className="mb-2 font-serif text-2xl tracking-tight">
        No projects yet
      </h3>
      <p className="mb-8 text-sm text-fg-muted">
        Create your first project to start tracking events
      </p>
      <CreateProjectDialog onCreated={onCreated} />
    </div>
  );
}

export default function DashboardPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProjects = async () => {
    try {
      const { data } = await ProjectApi.list();
      setProjects(data.projects);
      setError("");
    } catch (err) {
      setError("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <ProtectedLayout title="Projects">
      <div className="space-y-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="eyebrow">Workspace</span>
            <h1 className="mt-3 font-serif text-4xl tracking-tight">
              Projects
            </h1>
          </div>
          {projects.length > 0 && <CreateProjectDialog onCreated={fetchProjects} />}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
          </div>
        ) : error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState onCreated={fetchProjects} />
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
