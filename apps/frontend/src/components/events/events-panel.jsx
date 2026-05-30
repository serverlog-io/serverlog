import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/router";
import EventApi from "@/api/event.api";
import ChannelApi from "@/api/channel.api";
import DashboardApi from "@/api/dashboard.api";
import { EventRow } from "./event-row";
import { ChannelSidebar } from "./channel-sidebar";
import { ActivityChart } from "./activity-chart";
import { useSocket } from "@/hooks/useSocket";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

// Parse search query to extract channel filters (#channel), user filters (@user), tag filters (key:value) and text search
function parseSearchQuery(query) {
  const tagFilters = [];
  const channelFilters = [];
  const userFilters = [];
  let textSearch = "";

  // First extract channel filters (#channel-name)
  const channelRegex = /#([\w-]+)/g;
  let processedQuery = query;
  let channelMatch;

  while ((channelMatch = channelRegex.exec(query)) !== null) {
    channelFilters.push(channelMatch[1]);
  }

  // Extract user filters (@user-id)
  const userRegex = /@([\w-]+)/g;
  let userMatch;

  while ((userMatch = userRegex.exec(query)) !== null) {
    userFilters.push(userMatch[1]);
  }

  // Remove channel and user filters from query for further processing
  processedQuery = query.replace(channelRegex, "").replace(userRegex, "").trim();

  // Match patterns like "key:value", "key:\"value with spaces\"", or "key:" (any value)
  // Use [\w-]+ to support hyphenated keys like "user-id"
  const tagRegex = /([\w-]+):(?:"([^"]*)"|(\S*))/g;
  let match;
  let lastIndex = 0;
  const textParts = [];

  while ((match = tagRegex.exec(processedQuery)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      textParts.push(processedQuery.slice(lastIndex, match.index));
    }
    lastIndex = tagRegex.lastIndex;

    const key = match[1];
    const value = match[2] !== undefined ? match[2] : match[3]; // quoted or unquoted value (can be empty)
    tagFilters.push({ key, value });
  }

  // Add remaining text
  if (lastIndex < processedQuery.length) {
    textParts.push(processedQuery.slice(lastIndex));
  }

  textSearch = textParts.join("").trim();

  return { tagFilters, channelFilters, userFilters, textSearch };
}

// Render search query with highlighted channel, user, and tag filters
function HighlightedQuery({ query }) {
  if (!query) return null;

  const parts = [];
  // Combined regex for channels (#name), users (@name), and tags (key:value)
  const combinedRegex = /(#[\w-]+)|(@[\w-]+)|([\w-]+):(?:"([^"]*)"|(\S*))/g;
  let match;
  let lastIndex = 0;

  while ((match = combinedRegex.exec(query)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: query.slice(lastIndex, match.index),
      });
    }
    lastIndex = combinedRegex.lastIndex;

    if (match[1]) {
      // Channel match (#name)
      parts.push({
        type: "channel",
        content: match[1],
      });
    } else if (match[2]) {
      // User match (@name)
      parts.push({
        type: "user",
        content: match[2],
      });
    } else {
      // Tag match (key:value)
      parts.push({
        type: "tag",
        content: match[0],
      });
    }
  }

  // Add remaining text
  if (lastIndex < query.length) {
    parts.push({
      type: "text",
      content: query.slice(lastIndex),
    });
  }

  return (
    <>
      {parts.map((part, i) =>
        part.type === "channel" ? (
          <span
            key={i}
            className="rounded bg-purple-500/30 text-purple-300"
          >
            {part.content}
          </span>
        ) : part.type === "user" ? (
          <span
            key={i}
            className="rounded bg-emerald-500/30 text-emerald-300"
          >
            {part.content}
          </span>
        ) : part.type === "tag" ? (
          <span
            key={i}
            className="rounded bg-blue-500/30 text-blue-300"
          >
            {part.content}
          </span>
        ) : (
          <span key={i}>{part.content}</span>
        )
      )}
    </>
  );
}

function SearchBar({ value, onChange }) {
  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-white/30"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      {/* Highlighted overlay */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center pl-10 pr-10 text-sm text-transparent"
        aria-hidden="true"
      >
        <div className="truncate">
          <HighlightedQuery query={value} />
        </div>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search events... (#channel, @userId, key:value)"
        className="relative h-9 w-full rounded-lg border border-white/10 bg-white/[0.02] pl-10 pr-10 text-sm text-white caret-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
        style={{ color: "transparent", caretColor: "white" }}
      />
      {/* Visible text layer */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center pl-10 pr-10 text-sm"
        aria-hidden="true"
      >
        <div className="truncate text-white">
          <HighlightedQuery query={value} />
        </div>
      </div>
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-white/30 hover:text-white/50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function EventsListSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02]">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 border-b border-white/[0.04] px-4 py-3 last:border-b-0"
        >
          <div className="h-8 w-8 animate-pulse rounded-lg bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-16 animate-pulse rounded bg-white/5" />
            </div>
            <div className="h-3 w-48 animate-pulse rounded bg-white/5" />
          </div>
          <div className="h-3 w-12 animate-pulse rounded bg-white/5" />
        </div>
      ))}
    </div>
  );
}

function EventsEmptyState({ onOpenPlayground }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="mb-4 rounded-full bg-white/[0.04] p-4">
        <svg className="h-8 w-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h3 className="mb-1 font-medium text-white/60">No events yet</h3>
      <p className="mb-6 text-sm text-white/30">Events will appear here when you start sending them</p>

      <div className="flex gap-3">
        <Button variant="default" size="sm" onClick={onOpenPlayground}>
          <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Send your first event
        </Button>
      </div>
    </div>
  );
}

const EVENTS_PER_PAGE = 30;
const SEARCH_DEBOUNCE_MS = 300;

// Custom hook for debounced value
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Build search params from parsed query
function buildSearchParams(searchQuery) {
  if (!searchQuery.trim()) return {};

  const { tagFilters, channelFilters, userFilters, textSearch } = parseSearchQuery(searchQuery);
  const params = {};

  if (textSearch) {
    params.search = textSearch;
  }

  if (tagFilters.length > 0) {
    const tagsObj = {};
    for (const { key, value } of tagFilters) {
      tagsObj[key] = value;
    }
    params.tags = JSON.stringify(tagsObj);
  }

  // Support multiple channel filters (#channel1 #channel2)
  if (channelFilters.length > 0) {
    params.channel = channelFilters.join(' ');
  }

  // Support multiple user filters (@user1 @user2)
  if (userFilters.length > 0) {
    params.userId = userFilters.join(' ');
  }

  return params;
}

export function EventsPanel({ projectId, onOpenPlayground }) {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [channels, setChannels] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [chartName, setChartName] = useState("");
  const [savingChart, setSavingChart] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'event' | 'channel', data }
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'compact'
  const [deleting, setDeleting] = useState(false);
  const loaderRef = useRef(null);
  const searchBarRef = useRef(null);
  const chartRef = useRef(null);
  const hasFetchedOnce = useRef(false);

  // Local search state - initialized from URL
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("search") || "";
    }
    return "";
  });

  // Sync search state when URL search param changes (e.g., from dashboard chart click)
  useEffect(() => {
    const urlSearch = router.query.search || "";
    setSearchQuery(urlSearch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.search]);

  // Debounce search query for API calls
  const debouncedSearch = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);

  // Parse search for chart filters, channels, and users
  const { textSearch, tagsJson, channelsFromSearch, userFromSearch, usersFromSearch } = useMemo(() => {
    if (!debouncedSearch) return { textSearch: "", tagsJson: "", channelsFromSearch: [], userFromSearch: null, usersFromSearch: [] };
    const { tagFilters, channelFilters, userFilters, textSearch } = parseSearchQuery(debouncedSearch);
    const tagsObj = {};
    for (const { key, value } of tagFilters) {
      tagsObj[key] = value;
    }
    return {
      textSearch,
      tagsJson: Object.keys(tagsObj).length > 0 ? JSON.stringify(tagsObj) : "",
      channelsFromSearch: channelFilters,
      userFromSearch: userFilters.length > 0 ? userFilters[0] : null,
      usersFromSearch: userFilters,
    };
  }, [debouncedSearch]);

  // Sync URL when debounced search changes (not on every keystroke)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (debouncedSearch) {
      params.set("search", debouncedSearch);
    } else {
      params.delete("search");
    }
    const queryString = params.toString();
    const newUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ""}`;

    window.history.replaceState({}, "", newUrl);
  }, [debouncedSearch]);

  const hasMore = pagination.page < pagination.pages;

  // Handle new events from WebSocket
  const handleNewEvent = useCallback((newEvent) => {
    // Check if event matches current channel filter (from search query)
    const matchesChannel = channelsFromSearch.length === 0 || channelsFromSearch.includes(newEvent.channel?.slug);

    // Check if event matches current user filter (from search query)
    const matchesUser = usersFromSearch.length === 0 || usersFromSearch.includes(newEvent.userId);

    // Check if event matches search filters
    let matchesSearch = true;
    if (debouncedSearch) {
      const { tagFilters, textSearch } = parseSearchQuery(debouncedSearch);

      // Check tag filters
      if (tagFilters.length > 0) {
        const eventTags = newEvent.tags || {};
        matchesSearch = tagFilters.every(({ key, value }) => {
          if (value === "" || value === null || value === undefined) {
            // Key exists with any value
            return key in eventTags;
          }
          // Key equals specific value
          return String(eventTags[key]) === String(value);
        });
      }

      // Check text search
      if (matchesSearch && textSearch) {
        const searchLower = textSearch.toLowerCase();
        const eventName = (newEvent.event || "").toLowerCase();
        const eventDesc = (newEvent.description || "").toLowerCase();
        matchesSearch = eventName.includes(searchLower) || eventDesc.includes(searchLower);
      }
    }

    // Only update list and chart if event matches all filters
    if (matchesChannel && matchesUser && matchesSearch) {
      setEvents((prev) => [newEvent, ...prev]);
      setPagination((prev) => ({ ...prev, total: prev.total + 1 }));
      chartRef.current?.addEvent(newEvent.timestamp || newEvent.createdAt);
    }

    // Always update channel event count (regardless of filters)
    setChannels((prev) => {
      const channelExists = prev.some((ch) => ch.id === newEvent.channel?.id);

      if (channelExists) {
        // Update existing channel count
        return prev.map((ch) =>
          ch.id === newEvent.channel?.id
            ? { ...ch, _count: { ...ch._count, events: (ch._count?.events || 0) + 1 } }
            : ch
        );
      } else if (newEvent.channel) {
        // Add new channel to the list
        return [...prev, { ...newEvent.channel, _count: { events: 1 } }];
      }

      return prev;
    });
  }, [channelsFromSearch, usersFromSearch, debouncedSearch]);

  // Connect to WebSocket for real-time events
  useSocket(projectId, handleNewEvent);

  useEffect(() => {
    if (!projectId) return;

    const fetchChannels = async () => {
      try {
        const { data } = await ChannelApi.list(projectId);
        setChannels(data.channels || []);
      } catch (err) {
        console.error("Failed to fetch channels:", err);
      } finally {
        setChannelsLoading(false);
      }
    };
    fetchChannels();
  }, [projectId]);

  // Fetch events (initial + when search changes)
  useEffect(() => {
    if (!projectId) return;

    const fetchEvents = async () => {
      // Show appropriate loading state
      if (!hasFetchedOnce.current) {
        setInitialLoading(true);
      } else {
        setFilterLoading(true);
      }
      try {
        const params = { limit: EVENTS_PER_PAGE, page: 1 };
        // Add search params (includes channel from #channel syntax)
        const searchParams = buildSearchParams(debouncedSearch);
        Object.assign(params, searchParams);

        const { data } = await EventApi.getByProject(projectId, params);
        setEvents(data.events || []);
        setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
        hasFetchedOnce.current = true;
      } catch (err) {
        console.error("Failed to fetch events:", err);
      } finally {
        setInitialLoading(false);
        setFilterLoading(false);
      }
    };
    fetchEvents();
  }, [projectId, debouncedSearch]);

  // Load more function
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const params = { limit: EVENTS_PER_PAGE, page: pagination.page + 1 };
      // Add search params (includes channel from #channel syntax)
      const searchParams = buildSearchParams(debouncedSearch);
      Object.assign(params, searchParams);

      const { data } = await EventApi.getByProject(projectId, params);
      setEvents((prev) => [...prev, ...(data.events || [])]);
      setPagination(data.pagination || pagination);
    } catch (err) {
      console.error("Failed to load more events:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [projectId, debouncedSearch, pagination, loadingMore, hasMore]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const loader = loaderRef.current;
    if (!loader) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    observer.observe(loader);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  const handleChannelSelect = (slug) => {
    if (slug === null) {
      // Remove channel filter from search query
      setSearchQuery((prev) => prev.replace(/#[\w-]+/g, "").trim());
    } else {
      // Clear entire search and set only the channel filter
      setSearchQuery(`#${slug}`);
    }
    // Scroll to top
    searchBarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleTagClick = (key, value) => {
    const tagFilter = `${key}:${value}`;
    // Add to search if not already present
    if (!searchQuery.includes(tagFilter)) {
      setSearchQuery((prev) => (prev ? `${prev} ${tagFilter}` : tagFilter));
    }
    // Scroll to search bar
    searchBarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleUserClick = (userId) => {
    const userFilter = `@${userId}`;
    // Remove existing user filter and add new one
    const withoutUser = searchQuery.replace(/@[\w-]+/g, "").trim();
    setSearchQuery(withoutUser ? `${userFilter} ${withoutUser}` : userFilter);
    // Scroll to search bar
    searchBarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleColorChange = async (channelId, newColor) => {
    try {
      await ChannelApi.update(projectId, channelId, { color: newColor });
      setChannels((prev) =>
        prev.map((ch) => (ch.id === channelId ? { ...ch, color: newColor } : ch))
      );
      setEvents((prev) =>
        prev.map((ev) =>
          ev.channel?.id === channelId
            ? { ...ev, channel: { ...ev.channel, color: newColor } }
            : ev
        )
      );
    } catch (err) {
      console.error("Failed to update channel color:", err);
    }
  };

  const handleSaveChart = async () => {
    if (!chartName.trim()) return;

    setSavingChart(true);
    try {
      // Channel is already included in the search as #channel, so don't save separately
      await DashboardApi.create(projectId, {
        name: chartName.trim(),
        search: debouncedSearch || "",
        channel: null,
      });
      setSaveDialogOpen(false);
      setChartName("");
    } catch (err) {
      console.error("Failed to save chart:", err);
    } finally {
      setSavingChart(false);
    }
  };

  const handleDeleteEvent = (event) => {
    setDeleteTarget({ type: 'event', data: event });
  };

  const handleDeleteChannel = (channel) => {
    setDeleteTarget({ type: 'channel', data: channel });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === 'event') {
        await EventApi.delete(projectId, deleteTarget.data.id);
        setEvents((prev) => prev.filter((e) => e.id !== deleteTarget.data.id));
        setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
      } else if (deleteTarget.type === 'channel') {
        await ChannelApi.delete(projectId, deleteTarget.data.id);
        setChannels((prev) => prev.filter((ch) => ch.id !== deleteTarget.data.id));
        setEvents((prev) => prev.filter((e) => e.channelId !== deleteTarget.data.id));
        if (channelsFromSearch.includes(deleteTarget.data.slug)) {
          setSearchQuery("");
        }
      }
    } catch (err) {
      console.error(`Failed to delete ${deleteTarget.type}:`, err);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const canSaveChart = debouncedSearch;

  return (
    <div className="flex flex-col gap-4 md:flex-row md:gap-6">
      <ChannelSidebar
        channels={channels}
        selectedChannel={channelsFromSearch.length === 1 ? channelsFromSearch[0] : null}
        onSelectChannel={handleChannelSelect}
        onColorChange={handleColorChange}
        onDeleteChannel={handleDeleteChannel}
        loading={channelsLoading}
      />

      <div className="min-w-0 flex-1">
        {/* Show chart and SearchBar only when there are events in the project */}
        {(pagination.total > 0 || debouncedSearch) && (
          <>
            <div ref={searchBarRef} className="mb-4 scroll-mt-20 flex gap-2 items-center">
              <div className="min-w-0 flex-1">
                <SearchBar value={searchQuery} onChange={setSearchQuery} />
              </div>
              <div className="flex h-9 shrink-0 rounded-md border border-white/10 overflow-hidden">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-2.5 transition-colors ${viewMode === 'cards' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]'}`}
                  title="Card view"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('compact')}
                  className={`px-2.5 transition-colors ${viewMode === 'compact' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]'}`}
                  title="Compact view"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>
              {canSaveChart && (
                <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                  <DialogTrigger asChild>
                    <button
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 text-white/40 transition-colors hover:text-white hover:bg-white/5"
                      title="Save to Dashboard"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md bg-black border-white/10">
                    <DialogHeader>
                      <DialogTitle>Save chart to dashboard</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <label className="text-sm text-white/60">Chart name</label>
                        <Input
                          value={chartName}
                          onChange={(e) => setChartName(e.target.value)}
                          placeholder="e.g., Pro Plan Signups"
                          className="bg-white/5 border-white/10"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-white/60">Filter</label>
                        <div className="rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white/80">
                          {debouncedSearch || "(all events)"}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSaveDialogOpen(false)}
                          className="border-white/10"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveChart}
                          disabled={!chartName.trim() || savingChart}
                        >
                          {savingChart ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <ActivityChart
              ref={chartRef}
              projectId={projectId}
              channelFilter={channelsFromSearch.length > 0 ? channelsFromSearch.join(' ') : null}
              userFilter={usersFromSearch.length > 0 ? usersFromSearch.join(' ') : null}
              searchQuery={textSearch}
              searchTags={tagsJson}
            />
          </>
        )}

        {initialLoading ? (
          <EventsListSkeleton />
        ) : filterLoading ? (
          <EventsListSkeleton />
        ) : events.length === 0 && !debouncedSearch ? (
          <EventsEmptyState onOpenPlayground={onOpenPlayground} />
        ) : (
          <div className="space-y-3">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <svg className="h-8 w-8 text-white/20 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-sm text-white/40">
                  {debouncedSearch ? "No events match your search" : "No events in this channel"}
                </p>
                {debouncedSearch && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-2 text-xs text-white/30 hover:text-white/50"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02]">
                  {events.map((event) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      compact={viewMode === 'compact'}
                      showChannel={channelsFromSearch.length !== 1}
                      onChannelClick={handleChannelSelect}
                      onTagClick={handleTagClick}
                      onUserClick={handleUserClick}
                      onDelete={handleDeleteEvent}
                    />
                  ))}
                </div>

                {/* Infinite scroll loader */}
                <div
                  ref={loaderRef}
                  className="flex items-center justify-center py-4"
                >
                  {loadingMore && (
                    <div className="flex items-center gap-2 text-sm text-white/40">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-white/40" />
                      Loading more...
                    </div>
                  )}
                </div>

                {/* Events count */}
                {!hasMore && events.length > 0 && (
                  <div className="py-3 text-center text-xs text-white/30">
                    {pagination.total} events{debouncedSearch ? " found" : " total"}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-400">
              Delete {deleteTarget?.type === 'channel' ? 'channel' : 'event'}
            </DialogTitle>
            <DialogDescription>
              {deleteTarget?.type === 'channel' ? (
                <>
                  This will permanently delete the channel <strong className="text-white">&quot;{deleteTarget?.data?.name}&quot;</strong> and
                  all <strong className="text-white">{deleteTarget?.data?._count?.events || 0} events</strong> inside it.
                  This action cannot be undone.
                </>
              ) : (
                <>
                  This will permanently delete the event <strong className="text-white">&quot;{deleteTarget?.data?.event}&quot;</strong>.
                  This action cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
            >
              {deleting ? "Deleting..." : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
