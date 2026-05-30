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
      <div className="space-y-3 text-center">
        <div className="font-serif text-2xl tracking-tight text-fg-muted">serverlog</div>
        <h1 className="font-serif text-3xl tracking-tight">Welcome to serverlog</h1>
        <p className="text-sm text-fg-muted">
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
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {displayError}
          </div>
        )}
        <Button type="submit" className="w-full" disabled={status === "loading"}>
          {status === "loading" ? "Creating account..." : "Create admin account →"}
        </Button>
      </form>

      <p className="text-center text-[0.65rem] font-mono uppercase tracking-[0.18em] text-fg-subtle">
        Self-hosted · Open source
      </p>
    </div>
  );
}
