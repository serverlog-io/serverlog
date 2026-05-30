import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useUser } from "@/contexts/user.context";
import { PublicLayout } from "@/components/layout/public-layout";
import UserApi from "@/api/user.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, status, getUser } = useUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "idle" || status === "error") {
      router.push("/");
    }
  }, [status, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await UserApi.changePassword({ currentPassword, newPassword });
      await getUser();
      router.push("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  return (
    <PublicLayout title="Change Password">
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg p-4">
        <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
              <span className="text-lg font-bold text-black">S</span>
            </div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Change Password</h1>
          <p className="text-sm text-white/50">
            {user.mustChangePassword
              ? "You must change your password before continuing"
              : "Update your account password"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </form>

        <p className="text-center text-xs text-white/30">
          Serverlog
        </p>
        </div>
      </div>
    </PublicLayout>
  );
}
