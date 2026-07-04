import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const password = process.argv[2];

if (!password || password.length < 8) {
  console.error("Usage: node scripts/hash-password.mjs '<password-at-least-8-chars>'");
  process.exit(1);
}

const salt = randomBytes(16).toString("base64url");
const key = await scrypt(password, salt, 64);

console.log(`scrypt$${salt}$${Buffer.from(key).toString("base64url")}`);
