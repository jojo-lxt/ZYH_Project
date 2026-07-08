import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { query, queryOne } from "@/server/db";
import { verifyPassword } from "@/server/auth/password";
import type { AuthUser } from "@/shared/types/auth";

export const authCookieName = "zyh_console_session";

type UserRow = {
  id: string;
  name: string;
  password_hash: string | null;
  phone: string;
  property: string;
  role: string;
  status: string;
};

type SessionUserRow = {
  id: string;
  name: string;
  phone: string;
  property: string;
  role: string;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function toAuthUser(row: SessionUserRow): AuthUser {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    property: row.property,
    role: row.role,
  };
}

export function shouldUseSecureAuthCookie() {
  const configured = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase();

  if (configured === "true") {
    return true;
  }

  if (configured === "false") {
    return false;
  }

  return process.env.NODE_ENV === "production";
}

export function getAuthCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: shouldUseSecureAuthCookie(),
  };
}

export async function loginWithPassword({
  password,
  phone,
  remember,
}: {
  password: string;
  phone: string;
  remember: boolean;
}) {
  const user = await queryOne<UserRow>(
    `
      SELECT id, name, phone, role, property, password_hash, status
      FROM console_users
      WHERE phone = $1
      LIMIT 1
    `,
    [phone],
  );

  if (!user || user.status !== "active") {
    return null;
  }

  const passwordOk = await verifyPassword(password, user.password_hash);

  if (!passwordOk) {
    return null;
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 8;
  const expiresAt = new Date(Date.now() + maxAge * 1000);

  await query(
    `
      INSERT INTO auth_sessions (id, user_id, token_hash, expires_at)
      VALUES ($1, $2, $3, $4)
    `,
    [randomUUID(), user.id, tokenHash, expiresAt],
  );
  await query("UPDATE console_users SET last_login_at = now() WHERE id = $1", [user.id]);

  return {
    maxAge,
    token,
    user: toAuthUser(user),
  };
}

export async function getCurrentUserFromToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const row = await queryOne<SessionUserRow>(
    `
      SELECT u.id, u.name, u.phone, u.role, u.property
      FROM auth_sessions s
      INNER JOIN console_users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.expires_at > now()
        AND u.status = 'active'
      LIMIT 1
    `,
    [hashToken(token)],
  );

  if (!row) {
    return null;
  }

  await query(
    "UPDATE auth_sessions SET last_seen_at = now() WHERE token_hash = $1",
    [hashToken(token)],
  );

  return toAuthUser(row);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  return getCurrentUserFromToken(cookieStore.get(authCookieName)?.value);
}

export async function deleteSession(token: string | undefined) {
  if (!token) {
    return;
  }

  await query("DELETE FROM auth_sessions WHERE token_hash = $1", [hashToken(token)]);
}
