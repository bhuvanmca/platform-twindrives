"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LayoutDashboard, ArrowRight } from "lucide-react";
import { StudyScene } from "@/components/StudyScene";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/platform/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );
      const data = await res.json();
      // auth-service returns { error } on 4xx; keep `message` as a fallback in
      // case a future endpoint uses it.
      if (!res.ok) throw new Error(data.error || data.message || "Login failed");
      localStorage.setItem("platform_token", data.token);
      router.push("/colleges");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Brand panel — hidden on small screens */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-950 via-violet-900 to-indigo-900 p-12 text-white">
        {/* soft decorative glows */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -right-16 w-96 h-96 rounded-full bg-indigo-400/20 blur-3xl" />
        {/* faint grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold leading-tight">TwinDrives</p>
            <p className="text-xs text-white/60">Platform Console</p>
          </div>
        </div>

        <div className="relative flex flex-col items-center text-center">
          <StudyScene />
          <div className="max-w-sm mt-2">
            <h2 className="text-2xl font-bold leading-snug tracking-tight">
              Burning the midnight oil?
            </h2>
            <p className="text-sm text-white/60 mt-2 leading-relaxed">
              TwinDrives keeps every campus placement drive running — so students
              can focus on what matters.
            </p>
          </div>
        </div>

        <p className="relative text-xs text-white/50">
          © {new Date().getFullYear()} Twincord Technologies
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          {/* Mobile-only logo (brand panel is hidden below lg) */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 leading-tight">
                TwinDrives
              </p>
              <p className="text-xs text-gray-500">Platform Console</p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
            <p className="text-sm text-gray-500 mt-1">
              Sign in to your platform account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@twincord.in"
                autoComplete="email"
                // Some autofill extensions inject an `fdprocessedid` attribute
                // before hydration; ignore the resulting attribute mismatch.
                suppressHydrationWarning
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  suppressHydrationWarning
                  className="w-full px-4 py-2.5 pr-11 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPw ? "Hide password" : "Show password"}
                  suppressHydrationWarning
                >
                  {showPw ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              suppressHydrationWarning
              className="group w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Sign in"}
              {!loading && (
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              )}
            </button>
          </form>

          <p className="lg:hidden text-center text-xs text-gray-400 mt-8">
            © {new Date().getFullYear()} Twincord Technologies
          </p>
        </div>
      </div>
    </div>
  );
}
