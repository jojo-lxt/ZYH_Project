const sessionKey = "zyh-console-session";

export type AuthSession = {
  loginAt: string;
  phone: string;
};

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function getAuthSession() {
  if (!canUseStorage()) {
    return null;
  }

  const rawSession = window.localStorage.getItem(sessionKey);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as AuthSession;
  } catch {
    window.localStorage.removeItem(sessionKey);
    return null;
  }
}

export function saveAuthSession(phone: string) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    sessionKey,
    JSON.stringify({
      loginAt: new Date().toISOString(),
      phone,
    } satisfies AuthSession),
  );
}

export function clearAuthSession() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(sessionKey);
}

export function hasAuthSession() {
  return Boolean(getAuthSession());
}
