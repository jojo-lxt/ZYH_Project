import "server-only";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

declare global {
  var contentPublisherPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  return new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  });
}

export function getPool() {
  globalThis.contentPublisherPool ??= createPool();
  return globalThis.contentPublisherPool;
}

export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  return getPool().query<T>(text, values);
}

export async function queryRows<T extends QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  const result = await query<T>(text, values);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  const result = await query<T>(text, values);
  return result.rows[0] ?? null;
}

export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
