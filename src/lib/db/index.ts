import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'
import * as relations from './relations'

const fullSchema = { ...schema, ...relations }

// Use a module-level variable but only initialise inside the function
// so the postgres client is never created at module import time.
type DrizzleClient = ReturnType<typeof drizzle<typeof fullSchema>>

let _db: DrizzleClient | null = null

export function getDb(): DrizzleClient {
  if (_db) return _db
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const postgres = require('postgres')
  const client = postgres(process.env.DATABASE_URL!, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  })
  _db = drizzle(client, { schema: fullSchema })
  return _db
}

export { schema }
export type Db = DrizzleClient
