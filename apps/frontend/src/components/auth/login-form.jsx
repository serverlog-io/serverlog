import { useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "@/contexts/user.context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const { login, status, error } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await login(email, password);
      if (data.user.mustChangePassword) {
        router.push("/change-password");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      // Error is handled by context
    }
  };

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="space-y-3 text-center">
        <div className="font-serif text-2xl tracking-tight text-fg-muted">serverlog</div>
        <h1 className="font-serif text-3xl tracking-tight">Welcome back</h1>
        <p className="text-sm text-fg-muted">
          Sign in to your account
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <Button type="submit" className="w-full" disabled={status === "loading"}>
          {status === "loading" ? "Signing in..." : "Continue →"}
        </Button>
      </form>

      <p className="text-center text-[0.65rem] font-mono uppercase tracking-[0.18em] text-fg-subtle">
        Self-hosted · Open source
      </p>
    </div>
  );
}
