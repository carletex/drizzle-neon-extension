import * as schema from "./schema";
import { Pool as NeonPool, neon } from "@neondatabase/serverless";
import { BatchItem } from "drizzle-orm/batch";
import { drizzle as drizzleNeonHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export const PRODUCTION_DATABASE_HOSTNAME = "your-production-database-hostname";

type DbInstance =
  | ReturnType<typeof drizzle<typeof schema>>
  | ReturnType<typeof drizzleNeon<typeof schema>>
  | ReturnType<typeof drizzleNeonHttp<typeof schema>>;

let dbInstance: DbInstance | null = null;
let poolInstance: Pool | NeonPool | null = null;

const isNextRuntime = !!process.env.NEXT_RUNTIME;

export function getDb(): DbInstance {
  if (dbInstance) {
    return dbInstance;
  }

  const NEON_DB_STRING = "neondb";
  if (process.env.POSTGRES_URL?.includes(NEON_DB_STRING)) {
    if (isNextRuntime) {
      // Use neon-serverless for next runtimes
      poolInstance = new NeonPool({ connectionString: process.env.POSTGRES_URL as string });
      dbInstance = drizzleNeon(poolInstance as NeonPool, { schema, casing: "snake_case" });
    } else {
      // Use neon-http for non-next runtimes so we can take advantage of batch, helpful for import scripts
      const sql = neon(process.env.POSTGRES_URL as string);
      dbInstance = drizzleNeonHttp({ client: sql, schema, casing: "snake_case" });
      console.log("Using neon-http");
    }
  } else {
    // Use node-postgres for non-next runtimes
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
    });

    poolInstance = pool;

    dbInstance = drizzle(pool, {
      schema,
      casing: "snake_case",
    });

    pool.on("error", err => {
      console.error("Unexpected error on idle client", err);
      process.exit(-1);
    });
  }

  return dbInstance;
}

export async function closeDb(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
    dbInstance = null;
  }
}

type QueryType = readonly [BatchItem<"pg">, ...BatchItem<"pg">[]];

async function executeQueries(queries: QueryType): Promise<void> {
  const db = getDb();
  if ("batch" in db && db.constructor.name === "NeonHttpDatabase") {
    if (queries.length > 0) {
      await db.batch(queries);
    }
    console.log("Batch execution complete.");
  } else {
    for (const query of queries) {
      await query;
    }
    console.log("Sequential execution complete.");
  }
}

// Create a proxy to intercept all property accesses and method calls
const dbProxy = new Proxy(
  {},
  {
    get: (target, prop: keyof DbProxy) => {
      if (prop === "close") {
        return closeDb;
      }

      if (prop === "executeQueries") {
        return executeQueries;
      }

      const db = getDb();
      return db[prop];
    },
    has: (target, prop: keyof DbProxy) => {
      const db = getDb();
      return prop in db;
    },
  },
);

type DbProxy = DbInstance & {
  close: () => Promise<void>;
  executeQueries: (queries: QueryType) => Promise<void>;
};

export const db = dbProxy as DbProxy;
