"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getMe, logoutUser } from "../lib/api";
import type { UserRole, AuthUser } from "../lib/api";

interface AuthContextType {
  isLoggedIn: boolean;
  userRole: UserRole;
  user: AuthUser | null;
  setAuth: (user: AuthUser) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  userRole: "guest",
  user: null,
  setAuth: () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);

  // Restore session on mount — calls api.getMe()
  // When real API is ready, getMe() will verify the JWT with the backend
  useEffect(() => {
    getMe().then((u) => {
      if (u) setUser(u);
    });
  }, []);

  // Called by Login/Signup pages after a successful api.loginUser() / api.signupUser() call
  const setAuth = (u: AuthUser) => {
    setUser(u);
  };

  const logout = async () => {
    await logoutUser(); // calls api.logoutUser() which clears the token
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: !!user,
        userRole: user?.role ?? "guest",
        user,
        setAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
