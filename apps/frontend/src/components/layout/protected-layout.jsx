import { useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useUser } from "@/contexts/user.context";
import { DashboardLayout } from "./dashboard-layout";

export function ProtectedLayout({ children, title }) {
  const router = useRouter();
  const { user, status } = useUser();

  useEffect(() => {
    if (status === "idle" || status === "error") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (user?.mustChangePassword && router.pathname !== "/change-password") {
      router.push("/change-password");
    }
  }, [user, router]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const pageTitle = title ? `${title} | Serverlog` : "Serverlog";

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
      </Head>
      <DashboardLayout>{children}</DashboardLayout>
    </>
  );
}
