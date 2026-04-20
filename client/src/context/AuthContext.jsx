import { useCallback, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/axios.js";
import { AuthContext } from "./auth-context.js";

const TOKEN_STORAGE_KEY = "beacon:auth_token";
const USER_STORAGE_KEY = "beacon:auth_user";

const parseStoredUser = () => {
  try {
    const value = localStorage.getItem(USER_STORAGE_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) ?? "");
  const [user, setUser] = useState(() => parseStoredUser());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const bootstrapSession = async () => {
      if (!token) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const profile = await authApi.getMe(token);
        if (isMounted && profile) {
          setUser(profile);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
        }
      } catch {
        if (isMounted) {
          setToken("");
          setUser(null);
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          localStorage.removeItem(USER_STORAGE_KEY);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const applySession = useCallback((payload) => {
    const nextToken = payload?.token ?? "";
    const nextUser = payload?.user ?? null;

    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
    return payload;
  }, []);

  const login = useCallback(async (credentials) => {
    const payload = await authApi.login(credentials);
    return applySession(payload);
  }, [applySession]);

  const register = useCallback(async (details) => {
    const payload = await authApi.register(details);
    return applySession(payload);
  }, [applySession]);

  const logout = useCallback(() => {
    setToken("");
    setUser(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }, []);

  const contextValue = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(user && token),
      login,
      register,
      logout,
    }),
    [isLoading, login, logout, register, token, user],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
