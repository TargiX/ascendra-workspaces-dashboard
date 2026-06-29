import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { User } from "../domain/types";

const mockUsers: Record<string, User> = {
  engineer: {
    id: "usr_102",
    name: "Maya Chen",
    email: "maya@ascendra.dev",
    role: "engineer",
    team: "Platform Apps",
    vmCount: 3,
  },
  admin: {
    id: "usr_101",
    name: "Avery Stone",
    email: "avery@ascendra.dev",
    role: "admin",
    team: "DevEx",
    vmCount: 0,
  },
};

const AUTH_ROLE_STORAGE_KEY = "ascendra.mockRole";
type MockRole = keyof typeof mockUsers;

function getStoredUser() {
  if (typeof window === "undefined") return null;

  const storedRole = window.localStorage.getItem(AUTH_ROLE_STORAGE_KEY);
  if (storedRole === "engineer" || storedRole === "admin") {
    return mockUsers[storedRole];
  }

  return null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (role: MockRole) => void;
  logout: () => void;
  switchRole: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser());

  const login = useCallback((role: MockRole) => {
    window.localStorage.setItem(AUTH_ROLE_STORAGE_KEY, role);
    setUser(mockUsers[role]);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(AUTH_ROLE_STORAGE_KEY);
    setUser(null);
  }, []);

  const switchRole = useCallback(() => {
    if (!user) return;
    const nextRole = user.role === "engineer" ? "admin" : "engineer";
    window.localStorage.setItem(AUTH_ROLE_STORAGE_KEY, nextRole);
    setUser(mockUsers[nextRole]);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: Boolean(user), login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
