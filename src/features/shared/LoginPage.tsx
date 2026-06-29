import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Moon01, Shield03, Sun, User01 } from "@untitledui/icons";
import { useAuth } from "../../app/AuthContext";
import { Button } from "../../components/ui/Button";
import { cn } from "../../lib/cn";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<"engineer" | "admin">("engineer");
  const [isLoading, setIsLoading] = useState(false);

  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark") || localStorage.theme === "dark";
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
    }
  }, [isDark]);

  async function handleLogin() {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    login(selectedRole);
    const destination = selectedRole === "admin" ? "/admin/fleet" : "/workspace/machines";
    await navigate({ to: destination });
    setIsLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="absolute right-4 top-4">
        <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)} aria-label="Toggle theme">
          {isDark ? <Sun className="size-4" strokeWidth={1.8} aria-hidden="true" /> : <Moon01 className="size-4" strokeWidth={1.8} aria-hidden="true" />}
        </Button>
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="relative mx-auto flex size-12 items-center justify-center overflow-hidden rounded-md bg-gray-950 text-white dark:bg-gray-100 dark:text-gray-950">
            <span className="relative text-lg font-bold">A</span>
          </div>
          <h1 className="mt-5 text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">Welcome to Ascendra</h1>
          <p className="mt-2 text-[13px] text-gray-500 dark:text-gray-400">Sign in to manage your developer workspaces</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-[#111]">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300">Email</span>
            <input
              className="block h-8 w-full rounded-md border border-gray-300 bg-white px-3 font-sans text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-gray-950 focus:outline-none focus:ring-2 focus:ring-gray-950/10 dark:border-white/10 dark:bg-[#0a0a0a] dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus:border-gray-100 dark:focus:ring-white/10"
              type="email"
              value={selectedRole === "admin" ? "avery@ascendra.dev" : "maya@ascendra.dev"}
              readOnly
              aria-label="Email"
            />
          </label>

          <div className="mt-5">
            <span className="mb-2 block text-[13px] font-medium text-gray-700 dark:text-gray-300">Sign in as</span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole("engineer")}
                className={cn(
                  "rounded-lg border p-4 text-left transition-colors",
                  selectedRole === "engineer"
                    ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100 dark:bg-brand-500/10 dark:ring-brand-500/20"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:bg-[#0a0a0a] dark:hover:border-white/20 dark:hover:bg-white/5",
                )}
              >
                <div className="flex size-8 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <User01 className="size-4" strokeWidth={1.8} aria-hidden="true" />
                </div>
                <p className="mt-3 text-[13px] font-semibold text-gray-900 dark:text-gray-100">Engineer</p>
                <p className="mt-1 text-[11px] leading-tight text-gray-500 dark:text-gray-400">View & manage your own machines</p>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("admin")}
                className={cn(
                  "rounded-lg border p-4 text-left transition-colors",
                  selectedRole === "admin"
                    ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100 dark:bg-brand-500/10 dark:ring-brand-500/20"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:bg-[#0a0a0a] dark:hover:border-white/20 dark:hover:bg-white/5",
                )}
              >
                <div className="flex size-8 items-center justify-center rounded-md bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400">
                  <Shield03 className="size-4" strokeWidth={1.8} aria-hidden="true" />
                </div>
                <p className="mt-3 text-[13px] font-semibold text-gray-900 dark:text-gray-100">Admin</p>
                <p className="mt-1 text-[11px] leading-tight text-gray-500 dark:text-gray-400">Fleet health, inventory & templates</p>
              </button>
            </div>
          </div>

          <Button className="mt-6 w-full" variant="primary" size="lg" loading={isLoading} onClick={handleLogin}>
            Sign in
          </Button>

          <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-600">Demo access is prefilled for quick role switching.</p>
        </div>
      </div>
    </div>
  );
}
