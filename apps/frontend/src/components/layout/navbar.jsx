import Link from "next/link";
import { useRouter } from "next/router";
import { useUser } from "@/contexts/user.context";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const router = useRouter();
  const { user, logout } = useUser();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-black/50 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-white">
              <span className="text-xs font-bold text-black">S</span>
            </div>
            <span className="font-semibold">Serverlog</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/dashboard"
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                router.pathname === "/dashboard"
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Projects
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-white/60 sm:inline">{user?.email}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
