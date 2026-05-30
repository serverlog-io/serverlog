import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "@/contexts/user.context";
import { PublicLayout } from "@/components/layout/public-layout";
import { LoginForm } from "@/components/auth/login-form";
import { SetupForm } from "@/components/auth/setup-form";
import UserApi from "@/api/user.api";

export default function LoginPage() {
  const router = useRouter();
  const { user, status } = useUser();
  const [needsSetup, setNeedsSetup] = useState(null);

  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const { data } = await UserApi.getSetupStatus();
        setNeedsSetup(data.needsSetup);
      } catch (error) {
        setNeedsSetup(false);
      }
    };

    if (!user) {
      checkSetupStatus();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      if (user.mustChangePassword) {
        router.push("/change-password");
      } else {
        router.push("/dashboard");
      }
    }
  }, [user, router]);

  if (status === "loading" || needsSetup === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <PublicLayout title="Login">
      <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
        {needsSetup ? <SetupForm /> : <LoginForm />}
      </div>
    </PublicLayout>
  );
}
