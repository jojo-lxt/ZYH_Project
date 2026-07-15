"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AuthUser } from "@/shared/types/auth";

// 让控制台内的任意页面(如用户管理)拿到当前登录用户的角色,
// 不必再各自请求 /api/auth/me —— ConsoleShell 已在服务端取到并向下提供。
const CurrentUserContext = createContext<AuthUser | null>(null);

export function CurrentUserProvider({ user, children }: { user: AuthUser; children: ReactNode }) {
  return <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): AuthUser {
  const user = useContext(CurrentUserContext);
  if (!user) {
    throw new Error("useCurrentUser 必须在 CurrentUserProvider 内使用");
  }
  return user;
}
