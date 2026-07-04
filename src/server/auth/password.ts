import "server-only";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const keyLength = 64;

function scrypt(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keyLength, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const key = await scrypt(password, salt);

  return `scrypt$${salt}$${Buffer.from(key).toString("base64url")}`;
}

export async function verifyPassword(password: string, passwordHash: string | null) {
  if (!passwordHash) {
    return false;
  }

  const [algorithm, salt, storedKey] = passwordHash.split("$");

  if (algorithm !== "scrypt" || !salt || !storedKey) {
    return false;
  }

  const key = await scrypt(password, salt);
  const stored = Buffer.from(storedKey, "base64url");
  const actual = Buffer.from(key);

  return stored.length === actual.length && timingSafeEqual(stored, actual);
}
