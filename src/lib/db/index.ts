import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'
import * as relations from './relations'

const fullSchema = { ...schema, ...relations }

type DrizzleClient = ReturnType<typeof drizzle<typeof fullSchema>>

let _db: DrizzleClient | null = null

export function getDb(): DrizzleClient {
  if (_db) return _db
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const postgres = require('postgres')

  // Always use the pooled connection URL for serverless/edge environments.
  // Supabase direct connections (DATABASE_URL) exhaust the 25-connection limit
  // on serverless — DATABASE_URL_POOLED (PgBouncer port 6543) is mandatory.
  const connectionString = process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL!

  const client = postgres(connectionString, {
    max: 1,            // 1 connection per worker instance (serverless best practice)
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,    // Required when going through PgBouncer
  })
  _db = drizzle(client, { schema: fullSchema })
  return _db
}

export { schema }
export type Db = DrizzleClient
