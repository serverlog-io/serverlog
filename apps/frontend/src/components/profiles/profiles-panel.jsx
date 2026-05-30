import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import ProfileApi from "@/api/profile.api";
import { ProfileRow } from "./profile-row";
import { ProfileDetail } from "./profile-detail";

const PROFILES_PER_PAGE = 20;

const SORT_OPTIONS = [
  { value: "lastSeenAt", label: "Last seen" },
  { value: "firstSeenAt", label: "First seen" },
  { value: "eventsCount", label: "Event count" },
  { value: "externalId", label: "User ID" },
];

function SearchBar({ value, onChange }) {
  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30"
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
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by user ID..."
        className="h-9 w-full rounded-lg border border-white/10 bg-white/2 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
      />
    </div>
  );
}

function SortDropdown({ value, order, onChange, onOrderChange }) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border border-white/10 bg-white/2 px-3 text-sm text-white focus:border-white/20 focus:outline-none"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <button
        onClick={() => onOrderChange(order === "desc" ? "asc" : "desc")}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/2 text-white/60 transition-colors hover:bg-white/4"
        title={order === "desc" ? "Descending" : "Ascending"}
      >
        <svg
          className={`h-4 w-4 transition-transform ${order === "asc" ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
}

function PropertyFilter({ filters, onAdd, onRemove }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const handleAdd = () => {
    if (newKey.trim()) {
      onAdd(newKey.trim(), newValue.trim());
      setNewKey("");
      setNewValue("");
      setIsAdding(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {Object.entries(filters).map(([key, value]) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-1 text-xs text-blue-300"
        >
          {key}:{value || "*"}
          <button
            onClick={() => onRemove(key)}
            className="ml-1 text-blue-300/60 hover:text-blue-300"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}
      {isAdding ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="key"
            className="h-7 w-20 rounded border border-white/10 bg-white/4 px-2 text-xs text-white placeholder:text-white/30 focus:outline-none"
            autoFocus
          />
          <span className="text-white/30">:</span>
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="value"
            className="h-7 w-24 rounded border border-white/10 bg-white/4 px-2 text-xs text-white placeholder:text-white/30 focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button
            onClick={handleAdd}
            className="h-7 rounded bg-white/10 px-2 text-xs text-white/60 hover:bg-white/20"
          >
            Add
          </button>
          <button
            onClick={() => setIsAdding(false)}
            className="text-white/30 hover:text-white/50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-white/20 px-2.5 py-1 text-xs text-white/40 transition-colors hover:border-white/40 hover:text-white/60"
        >
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add filter
        </button>
      )}
    </div>
  );
}

function ProfilesListSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-white/6 bg-white/2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start gap-3 border-b border-white/4 px-4 py-4 last:border-b-0">
          <div className="h-10 w-10 animate-pulse rounded-full bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
            <div className="flex gap-1">
              <div className="h-5 w-16 animate-pulse rounded bg-white/5" />
              <div className="h-5 w-20 animate-pulse rounded bg-white/5" />
            </div>
            <div className="h-3 w-48 animate-pulse rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="mb-4 rounded-full bg-white/4 p-4">
        <svg className="h-8 w-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <h3 className="mb-1 font-medium text-white/60">No profiles yet</h3>
      <p className="text-sm text-white/30 text-center max-w-sm">
        Profiles are created when you send events with a user_id or call the identify API
      </p>
    </div>
  );
}

export function ProfilesPanel({ projectId, profileId }) {
  const router = useRouter();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("lastSeenAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [propertyFilters, setPropertyFilters] = useState({});

  const loaderRef = useRef(null);
  const debouncedSearch = useDebounce(search, 300);

  // Fetch specific profile when profileId is in URL
  useEffect(() => {
    if (!profileId || !projectId) {
      setSelectedProfile(null);
      return;
    }

    const fetchProfile = async () => {
      setLoadingProfile(true);
      try {
        const { data } = await ProfileApi.get(projectId, profileId);
        setSelectedProfile(data);
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        // Profile not found, redirect to profiles list
        router.replace(`/projects/${projectId}/profiles`);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [profileId, projectId, router]);

  const handleSelectProfile = (profile) => {
    router.push(`/projects/${projectId}/profiles/${profile.id}`);
  };

  const handleBackToList = () => {
    router.push(`/projects/${projectId}/profiles`);
  };

  const fetchProfiles = useCallback(async (page = 1, append = false) => {
    if (!projectId) return;

    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = {
        page,
        limit: PROFILES_PER_PAGE,
        sortBy,
        sortOrder,
      };

      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      if (Object.keys(propertyFilters).length > 0) {
        params.propertyFilters = JSON.stringify(propertyFilters);
      }

      const { data } = await ProfileApi.list(projectId, params);

      if (append) {
        setProfiles((prev) => [...prev, ...(data.profiles || [])]);
      } else {
        setProfiles(data.profiles || []);
      }
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      console.error("Failed to fetch profiles:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [projectId, debouncedSearch, sortBy, sortOrder, propertyFilters]);

  useEffect(() => {
    fetchProfiles(1, false);
    setSelectedProfile(null);
  }, [fetchProfiles]);

  // Infinite scroll
  useEffect(() => {
    const loader = loaderRef.current;
    if (!loader) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && pagination.page < pagination.pages && !loadingMore) {
          fetchProfiles(pagination.page + 1, true);
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    observer.observe(loader);
    return () => observer.disconnect();
  }, [pagination, loadingMore, fetchProfiles]);

  const handleAddFilter = (key, value) => {
    setPropertyFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleRemoveFilter = (key) => {
    setPropertyFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const hasMore = pagination.page < pagination.pages;

  // If a profile is selected (via URL), show full-screen detail view
  if (profileId) {
    if (loadingProfile) {
      return (
        <div className="flex items-center justify-center py-32">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-white/60" />
        </div>
      );
    }

    if (selectedProfile) {
      return (
        <ProfileDetail
          profile={selectedProfile}
          projectId={projectId}
          onBack={handleBackToList}
        />
      );
    }

    return null;
  }

  return (
    <div>
      {/* Filters bar */}
      <div className="mb-4 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <SearchBar value={search} onChange={setSearch} />
          </div>
          <SortDropdown
            value={sortBy}
            order={sortOrder}
            onChange={setSortBy}
            onOrderChange={setSortOrder}
          />
        </div>
        <PropertyFilter
          filters={propertyFilters}
          onAdd={handleAddFilter}
          onRemove={handleRemoveFilter}
        />
      </div>

      {/* Results count */}
      {!loading && pagination.total > 0 && (
        <p className="mb-3 text-xs text-white/30">
          {pagination.total} profile{pagination.total !== 1 ? "s" : ""} found
        </p>
      )}

      {/* Profiles list */}
      {loading ? (
        <ProfilesListSkeleton />
      ) : profiles.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-white/6 bg-white/2">
            {profiles.map((profile) => (
              <ProfileRow
                key={profile.id}
                profile={profile}
                isSelected={false}
                onClick={() => handleSelectProfile(profile)}
              />
            ))}
          </div>

          {/* Loader */}
          <div ref={loaderRef} className="flex items-center justify-center py-4">
            {loadingMore && (
              <div className="flex items-center gap-2 text-sm text-white/40">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-white/40" />
                Loading more...
              </div>
            )}
          </div>

          {/* End of list */}
          {!hasMore && profiles.length > 0 && (
            <p className="py-3 text-center text-xs text-white/30">
              {pagination.total} profiles total
            </p>
          )}
        </>
      )}
    </div>
  );
}

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
