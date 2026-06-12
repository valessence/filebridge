import { drizzle } from "drizzle-orm/mysql2";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;

export function getDb() {
  if (!env.hasDatabase) {
    throw new Error("Database is not configured. File sharing works without it.");
  }
  if (!instance) {
    instance = drizzle(env.databaseUrl, {
      mode: "planetscale",
      schema: fullSchema,
    });
  }
  return instance;
}
