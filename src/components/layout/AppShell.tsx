import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell01, Home01, Menu01, Moon01, Settings01, Sun, User01, XClose } from "@untitledui/icons";
import { cn } from "../../lib/cn";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { AdminRefreshProvider } from "../../app/AdminRefreshContext";
import { useAuth } from "../../app/AuthContext";
import { AdminNotificationsButton } from "../../features/admin/AdminNotificationsButton";
import { focusFirstElement, keepFocusInside } from "../../lib/focus";

const workspaceNav = [{ label: "My Machines", to: "/workspace/machines", icon: Home01 }];

const adminNav = [
  { label: "Fleet Overview", to: "/admin/fleet", icon: Home01 },
  { label: "VM Inventory", to: "/admin/vms", icon: User01 },
  { label: "Templates", to: "/admin/templates", icon: Settings01 },
];

function AscendraMark({ compactOnMobile = false }: { compactOnMobile?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex size-9 items-center justify-center overflow-hidden rounded-md bg-gray-950 text-white dark:bg-gray-100 dark:text-gray-950">
        <span className="relative text-sm font-bold">A</span>
      </div>
      <div className={compactOnMobile ? "hidden sm:block" : undefined}>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">Ascendra</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Workspaces</p>
      </div>
    </div>
  );
}

function getHeaderTitle(pathname: string) {
  if (pathname === "/workspace/machines") return "My Machines";
  if (pathname === "/admin/fleet") return "Fleet Overview";
  if (pathname === "/admin/vms") return "VM Inventory";
  if (pathname === "/admin/templates") return "Templates";
  return null;
}

function SidebarContent({ mode, pathname, onNavigate }: { mode: string; pathname: string; onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = mode === "admin" ? adminNav : workspaceNav;

  function handleLogout() {
    logout();
    void navigate({ to: "/login" });
    onNavigate?.();
  }

  return (
    <>
      <div className="flex h-16 items-center border-b border-gray-200 px-4 dark:border-white/10">
        <AscendraMark />
      </div>

      <nav className="flex-1 space-y-1 px-4 py-4" aria-label={mode === "admin" ? "Admin navigation" : "Workspace navigation"}>
        <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          {mode === "admin" ? "Admin Console" : "Personal Workspace"}
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.to || (item.to === "/workspace/machines" && pathname.startsWith("/workspace/machines/"));

          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200",
              )}
            >
              <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {user ? (
        <div className="border-t border-gray-200 p-4 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 dark:bg-brand-500/20 dark:text-brand-400 dark:ring-brand-500/30">
              {user.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-500">{user.email}</p>
            </div>
            <Badge tone={user.role === "admin" ? "purple" : "brand"}>
              {user.role === "admin" ? "Admin" : "Dev"}
            </Badge>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 flex h-8 w-full items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 font-sans text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-white/10 dark:bg-[#111] dark:text-gray-300 dark:hover:bg-[#1a1a1a] dark:hover:text-white"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuPanelRef = useRef<HTMLElement | null>(null);
  const mode = pathname.startsWith("/admin") ? "admin" : "workspace";
  const headerTitle = getHeaderTitle(pathname);

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

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => focusFirstElement(mobileMenuPanelRef.current), 0);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        return;
      }

      keepFocusInside(event, mobileMenuPanelRef.current);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      mobileMenuButtonRef.current?.focus();
    };
  }, [mobileMenuOpen]);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <AdminRefreshProvider>
      <div className="min-h-screen lg:flex">
        <aside className="hidden w-72 shrink-0 border-r border-gray-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col dark:border-white/10 dark:bg-[#0a0a0a]">
          <SidebarContent mode={mode} pathname={pathname} />
        </aside>

        {mobileMenuOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button className="absolute inset-0 bg-gray-950/40" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" />
            <aside
              ref={mobileMenuPanelRef}
              className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-gray-200 bg-white outline-none dark:border-white/10 dark:bg-[#0a0a0a]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-menu-title"
              tabIndex={-1}
            >
              <h2 id="mobile-menu-title" className="sr-only">Navigation menu</h2>
              <div className="absolute right-3 top-3 z-10">
                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)} aria-label="Close">
                  <XClose className="size-4" strokeWidth={1.8} aria-hidden="true" />
                </Button>
              </div>
              <SidebarContent mode={mode} pathname={pathname} onNavigate={() => setMobileMenuOpen(false)} />
            </aside>
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 h-16 border-b border-gray-200 bg-white dark:border-white/10 dark:bg-[#0a0a0a]">
            <div className="relative mx-auto flex h-full max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3 lg:hidden">
                <button
                  ref={mobileMenuButtonRef}
                  onClick={() => setMobileMenuOpen(true)}
                  className="flex size-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
                  aria-label="Open menu"
                >
                  <Menu01 className="size-5" strokeWidth={1.8} aria-hidden="true" />
                </button>
                <AscendraMark compactOnMobile />
              </div>

              <div className="hidden min-w-0 flex-1 lg:flex" />

              {headerTitle ? (
                <h1 className="pointer-events-none absolute left-1/2 max-w-[42vw] -translate-x-1/2 truncate text-center text-[15px] font-semibold text-gray-900 dark:text-gray-100">
                  {headerTitle}
                </h1>
              ) : null}

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)} aria-label="Toggle theme">
                  {isDark ? <Sun className="size-4" strokeWidth={1.8} aria-hidden="true" /> : <Moon01 className="size-4" strokeWidth={1.8} aria-hidden="true" />}
                </Button>
                {mode === "admin" ? (
                  <AdminNotificationsButton />
                ) : (
                  <Button variant="ghost" size="icon" aria-label="Notifications">
                    <Bell01 className="size-5" strokeWidth={1.8} aria-hidden="true" />
                  </Button>
                )}
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </AdminRefreshProvider>
  );
}
