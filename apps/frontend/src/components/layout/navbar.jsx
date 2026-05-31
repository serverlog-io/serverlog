import { Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useUser } from "@/contexts/user.context";
import { useBreadcrumbItems } from "@/contexts/breadcrumb.context";

export function Navbar() {
  const router = useRouter();
  const { user, logout } = useUser();
  const breadcrumb = useBreadcrumbItems();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const isActive = (path) => router.pathname === path;
  const hasBreadcrumb = breadcrumb.length > 0;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between gap-4 px-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/dashboard" className="shrink-0 font-serif text-lg tracking-tight">
            serverlog
          </Link>

          {hasBreadcrumb ? (
            <nav className="hidden min-w-0 items-center gap-2 text-sm md:flex">
              {breadcrumb.map((item, i) => (
                <Fragment key={i}>
                  {i > 0 && (
                    <span aria-hidden="true" className="text-fg-subtle">
                      ›
                    </span>
                  )}
                  {item.href && i < breadcrumb.length - 1 ? (
                    <Link
                      href={item.href}
                      className="text-fg-muted transition-colors hover:text-fg"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className="truncate text-fg">{item.label}</span>
                  )}
                </Fragment>
              ))}
            </nav>
          ) : (
            <nav className="hidden items-center gap-6 text-sm md:flex">
              <Link
                href="/dashboard"
                className={`transition-colors ${
                  isActive("/dashboard")
                    ? "text-fg"
                    : "text-fg-muted hover:text-fg"
                }`}
              >
                Projects
              </Link>
            </nav>
          )}
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
