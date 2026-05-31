import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useUser } from "@/contexts/user.context";
import { useBreadcrumbItems } from "@/contexts/breadcrumb.context";
import ProjectApi from "@/api/project.api";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Small geometric mark — three lines decreasing in width, like a log stream
function Logo() {
  return (
    <Link
      href="/dashboard"
      className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80"
      aria-label="serverlog home"
    >
      <span
        aria-hidden="true"
        className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-accent"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        >
          <path d="M3 5h10" />
          <path d="M3 8h7" />
          <path d="M3 11h9" />
        </svg>
      </span>
      <span className="font-serif text-lg leading-none tracking-tight">
        serverlog
      </span>
    </Link>
  );
}

function ProjectSwitcher({ currentProject, currentProjectId }) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Lazy-load projects when the popover opens
  useEffect(() => {
    if (!open || projects !== null) return;
    let cancelled = false;
    setLoading(true);
    ProjectApi.list()
      .then(({ data }) => {
        if (cancelled) return;
        setProjects(data.projects || data || []);
      })
      .catch(() => {
        if (cancelled) return;
        setProjects([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, projects]);

  const handleSelect = (projectId) => {
    setOpen(false);
    router.push(`/projects/${projectId}`);
  };

  const handleCreateNew = () => {
    setOpen(false);
    // Dashboard has the "Create project" dialog; sending a hint via query.
    router.push("/dashboard?new=1");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-8 max-w-[220px] items-center gap-1.5 rounded-md border border-transparent px-2 text-sm text-fg-muted transition-colors hover:border-border hover:bg-bg-elevated hover:text-fg"
        >
          <span className="truncate">{currentProject || "Projects"}</span>
          <svg
            className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <div className="border-b border-border px-3 py-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
            Switch project
          </span>
        </div>

        <div className="max-h-72 overflow-auto py-1">
          {loading && (
            <p className="px-3 py-4 text-center text-xs text-fg-subtle">
              Loading…
            </p>
          )}
          {!loading && projects && projects.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-fg-subtle">
              No projects yet
            </p>
          )}
          {!loading &&
            projects &&
            projects.map((p) => {
              const isActive = p.id === currentProjectId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p.id)}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-bg-elevated ${
                    isActive ? "text-fg" : "text-fg-muted"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center ${
                      isActive ? "text-accent" : "text-transparent"
                    }`}
                    aria-hidden="true"
                  >
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {p.name}
                  </span>
                  {p.slug && (
                    <span className="shrink-0 font-mono text-[10px] text-fg-subtle">
                      {p.slug}
                    </span>
                  )}
                </button>
              );
            })}
        </div>

        <div className="border-t border-border p-1">
          <button
            type="button"
            onClick={handleCreateNew}
            className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-accent transition-colors hover:bg-accent/10"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New project
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function Navbar() {
  const router = useRouter();
  const { user, logout } = useUser();
  const breadcrumb = useBreadcrumbItems();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // Detect current project from the route — works for `/projects/[projectId]/...`
  const currentProjectId =
    typeof router.query.projectId === "string"
      ? router.query.projectId
      : null;

  // Get the project name from the breadcrumb if available (last item with no href is current).
  // The project page sets this via useBreadcrumb.
  const currentProjectName =
    breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1]?.label : null;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between gap-4 px-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Logo />
          <span aria-hidden="true" className="text-fg-subtle">
            /
          </span>
          <ProjectSwitcher
            currentProject={currentProjectName}
            currentProjectId={currentProjectId}
          />
        </div>

        <div className="flex shrink-0 items-center gap-5">
          <span className="hidden text-xs font-mono text-fg-subtle sm:inline">
            {user?.email}
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-fg-muted transition-colors hover:text-fg"
          >
            Logout →
          </button>
        </div>
      </div>
    </header>
  );
}
