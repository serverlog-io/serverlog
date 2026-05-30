import Link from "next/link";
import { useRouter } from "next/router";
import { useUser } from "@/contexts/user.context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Projects", href: "/dashboard" },
];

export function Sidebar() {
  const router = useRouter();
  const { user, logout } = useUser();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="text-xl font-bold">
          Serverlog
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
              router.pathname === item.href || router.pathname.startsWith(item.href.replace("/dashboard", "/projects"))
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {item.name}
          </Link>
        ))}
      </nav>

      <div className="border-t p-4">
        <div className="mb-3 text-sm text-muted-foreground">
          {user?.email}
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout} className="w-full">
          Logout
        </Button>
      </div>
    </div>
  );
}
