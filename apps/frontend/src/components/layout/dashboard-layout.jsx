import { Navbar } from "./navbar";

export function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-screen-xl px-3 py-4 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
