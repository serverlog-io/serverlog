import { useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "@/contexts/user.context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SetupForm() {
  const router = useRouter();
  const { setup, status, error } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError("");

    if (password !== confirmPassword) {
      setValidationError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setValidationError("Password must be at least 8 characters");
      return;
    }

    try {
      await setup(email, password);
      router.push("/dashboard");
    } catch (err) {
      // Error is handled by context
    }
  };

  const displayError = validationError || error;

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
            <span className="text-lg font-bold text-black">S</span>
          </div>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to Serverlog</h1>
        <p className="text-sm text-white/50">
          Create your admin account to get started
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        {displayError && (
          <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {displayError}
          </div>
        )}
        <Button type="submit" className="w-full" disabled={status === "loading"}>
          {status === "loading" ? "Creating account..." : "Create Admin Account"}
        </Button>
      </form>

      <p className="text-center text-xs text-white/30">
        Serverlog
      </p>
    </div>
  );
}
