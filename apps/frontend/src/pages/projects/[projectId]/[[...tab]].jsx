import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import ProjectApi from "@/api/project.api";
import ChannelApi from "@/api/channel.api";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { useBreadcrumb } from "@/contexts/breadcrumb.context";
import { EventsPanel } from "@/components/events/events-panel";
import { OnlineUsersIndicator } from "@/components/events/online-users-indicator";
import { ApiKeysPanel } from "@/components/api-keys/api-keys-panel";
import { PlaygroundDrawer } from "@/components/playground/playground-drawer";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { FunnelsPanel } from "@/components/funnels/funnels-panel";
import { ProfilesPanel } from "@/components/profiles/profiles-panel";

const VALID_TABS = ["events", "dashboard", "funnels", "profiles", "apikeys", "settings"];
const DEFAULT_TAB = "events";

export default function ProjectDetailPage() {
  const router = useRouter();
  const { projectId, tab: tabSegments } = router.query;
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPlaygroundOpen, setIsPlaygroundOpen] = useState(false);
  const [channels, setChannels] = useState([]);

  useEffect(() => {
    if (isPlaygroundOpen) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [isPlaygroundOpen]);

  // Get active tab from URL path segment
  const tabFromUrl = tabSegments?.[0] || DEFAULT_TAB;
  const activeTab = VALID_TABS.includes(tabFromUrl) ? tabFromUrl : DEFAULT_TAB;

  // Check if we're viewing a specific profile (profiles/[profileId])
  const profileId = activeTab === "profiles" && tabSegments?.[1] ? tabSegments[1] : null;

  const handleTabChange = (tab) => {
    if (tab === DEFAULT_TAB) {
      router.push(`/projects/${projectId}`, undefined, { shallow: true });
    } else {
      router.push(`/projects/${projectId}/${tab}`, undefined, { shallow: true });
    }
  };

  useEffect(() => {
    if (!projectId) return;

    const fetchProject = async () => {
      try {
        const [projectRes, channelsRes] = await Promise.all([
          ProjectApi.getById(projectId),
          ChannelApi.list(projectId),
        ]);
        setProject(projectRes.data);
        setChannels(channelsRes.data.channels || []);
        setError("");
      } catch (err) {
        setError("Failed to load project");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  const handleDelete = async () => {
    await ProjectApi.delete(projectId);
    router.push("/dashboard");
  };

  // Hooks must be called unconditionally — keep this above the early returns.
  useBreadcrumb(
    project
      ? [
          { label: "Projects", href: "/dashboard" },
          { label: project.name },
        ]
      : []
  );

  if (!projectId) return null;

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center py-32">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent" />
        </div>
      </ProtectedLayout>
    );
  }

  if (error || !project) {
    return (
      <ProtectedLayout>
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error || "Project not found"}
        </div>
      </ProtectedLayout>
    );
  }

  const tabs = [
    { id: "events", label: "Events" },
    { id: "dashboard", label: "Dashboard" },
    { id: "funnels", label: "Funnels" },
    { id: "profiles", label: "Profiles" },
    { id: "apikeys", label: "API Keys" },
    { id: "settings", label: "Settings" },
  ];

  const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label || "Events";
  const pageTitle = `${activeTabLabel} - ${project.name}`;

  return (
    <ProtectedLayout title={pageTitle}>
      <div className="flex gap-6">
        {/* Main Content */}
        <div className="min-w-0 flex-1 space-y-6">
          {/* Tab strip with online indicator inline on the right */}
          <div className="-mx-3 flex items-center justify-between gap-6 border-b border-border px-3 sm:mx-0 sm:px-0">
            <nav
              className="flex min-w-0 flex-1 overflow-x-auto no-scrollbar"
              role="tablist"
              aria-label="Project sections"
            >
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleTabChange(tab.id)}
                    className={`relative shrink-0 whitespace-nowrap px-4 py-3 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 rounded-t ${
                      isActive
                        ? "font-medium text-fg"
                        : "text-fg-subtle hover:text-fg-muted"
                    }`}
                  >
                    {tab.label}
                    <span
                      aria-hidden="true"
                      className={`absolute -bottom-px left-3 right-3 h-[2px] transition-colors ${
                        isActive ? "bg-accent" : "bg-transparent"
                      }`}
                    />
                  </button>
                );
              })}
            </nav>
            <div className="hidden shrink-0 sm:block">
              <OnlineUsersIndicator projectId={projectId} />
            </div>
          </div>


          {/* Tab Content */}
          {activeTab === "events" && (
            <EventsPanel
              projectId={projectId}
              onOpenPlayground={() => setIsPlaygroundOpen(true)}
            />
          )}
          {activeTab === "dashboard" && <DashboardPanel projectId={projectId} />}
          {activeTab === "funnels" && <FunnelsPanel projectId={projectId} />}
          {activeTab === "profiles" && <ProfilesPanel projectId={projectId} profileId={profileId} />}
          {activeTab === "apikeys" && <ApiKeysPanel projectId={projectId} />}
          {activeTab === "settings" && <SettingsPanel project={project} onDelete={handleDelete} onUpdate={setProject} />}
        </div>

        {/* Playground Side Panel - Only in events tab */}
        {activeTab === "events" && isPlaygroundOpen && (
          <div className="hidden w-[420px] shrink-0 self-start lg:block">
            <PlaygroundDrawer
              projectId={projectId}
              isOpen={isPlaygroundOpen}
              onClose={() => setIsPlaygroundOpen(false)}
              channels={channels}
              inline
              onChannelCreated={(newChannel) => {
                setChannels(prev => [...prev, { ...newChannel, _count: { events: 1 } }]);
              }}
            />
          </div>
        )}
      </div>

      {/* Floating Playground Button - Only in events tab */}
      {activeTab === "events" && !isPlaygroundOpen && (
        <button
          onClick={() => setIsPlaygroundOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-12 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-fg shadow-[0_0_40px_-10px_rgba(217,119,87,0.7)] transition-all hover:scale-105 hover:bg-accent-hover"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Playground
        </button>
      )}
    </ProtectedLayout>
  );
}
