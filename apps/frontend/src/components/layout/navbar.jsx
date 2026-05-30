import Link from "next/link";
import { useRouter } from "next/router";
import { useUser } from "@/contexts/user.context";

export function Navbar() {
  const router = useRouter();
  const { user, logout } = useUser();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const isActive = (path) => router.pathname === path;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-3 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="font-serif text-lg tracking-tight">
            serverlog
          </Link>

          <nav className="hidden items-center gap-6 md:flex text-sm">
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
        </div>

        <div className="flex items-center gap-5">
          <span className="hidden text-xs font-mono text-fg-subtle sm:inline">
            {user?.email}
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-fg-muted hover:text-fg transition-colors"
          >
            Logout →
          </button>
        </div>
      </div>
    </header>
  );
}
