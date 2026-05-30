import { useState, useEffect } from "react";
import Link from "next/link";
import ProjectApi from "@/api/project.api";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { Button } from "@/components/ui/button";

function ProjectRow({ project }) {
  return (
    <Link href={`/projects/${project.id}`}>
      <div className="group flex items-center justify-between border-b border-white/5 px-4 py-4 transition-colors hover:bg-white/[0.02]">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
            <span className="text-sm font-medium text-white">
              {project.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-medium text-white group-hover:underline">
              {project.name}
            </h3>
            <p className="text-sm text-white/40">
              {project.description || project.slug}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm text-white/40">
          <span>{project._count?.events || 0} events</span>
          <span>{project._count?.channels || 0} channels</span>
          <svg
            className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ onCreated }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 py-16">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
        <svg className="h-6 w-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      </div>
      <h3 className="mb-1 text-lg font-medium">No projects yet</h3>
      <p className="mb-6 text-sm text-white/40">
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Projects</h1>
          {projects.length > 0 && <CreateProjectDialog onCreated={fetchProjects} />}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState onCreated={fetchProjects} />
        ) : (
          <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
            {projects.map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
