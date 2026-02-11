"use client";

import { hasUsers, login } from "@/app/actions/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { OrbitLoader } from "@/components/auth/orbit-loader";
import { PinInput } from "@/components/auth/pin-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PIN_LENGTH } from "@/lib/config";
import { Loader2, LogIn, ShieldCheck, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingUsers, setCheckingUsers] = useState(true);

  useEffect(() => {
    // Check if users exist, redirect to setup if not
    hasUsers().then((exists) => {
      if (!exists) {
        router.push("/setup");
      } else {
        setCheckingUsers(false);
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(username, pin);
      if (result.success) {
        // Use full page reload to ensure cookie is sent with next request
        window.location.href = "/";
      } else {
        setError(result.error || "Login failed");
        setPin(""); // Clear PIN on error
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (checkingUsers) {
    return (
      <AuthShell
        badge="Login"
        title="Homeio"
        subtitle="Preparing sign-in…"
        icon={<LogIn className="h-5 w-5 text-muted-foreground" />}
      >
        <div className="flex justify-center py-12">
          <OrbitLoader />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      badge="Login"
      title="Welcome back"
      subtitle="Sign in to Homeio"
      icon={<LogIn className="h-5 w-5 text-muted-foreground" />}
      widthClass="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border border-border bg-secondary/40 p-6 shadow-inner">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary/60">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-foreground">Username</p>
              <p className="text-xs text-muted-foreground">
                Your Homeio account id
              </p>
            </div>
          </div>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            required
            autoComplete="username"
            autoFocus
            className="bg-secondary/60 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/40"
            disabled={loading}
          />
        </div>

        <div className="rounded-lg border border-border bg-secondary/40 p-6 shadow-inner">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary/60">
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-foreground">
                Enter your {PIN_LENGTH}-digit PIN
              </p>
              <p className="text-xs text-muted-foreground">
                Secure authentication code
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-4">
            <PinInput value={pin} onChange={setPin} disabled={loading} center />
            {error && <p className="text-sm text-red-300">{error}</p>}
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading || !username || pin.length !== PIN_LENGTH}
          className="w-full border border-border bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Sign In
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
