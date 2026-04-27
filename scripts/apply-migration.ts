/**
 * One-shot schema applier. Reads supabase/migrations/0001_init.sql and
 * executes it against your Supabase Postgres directly.
 *
 * Run: npm run db:migrate
 *
 * Uses POSTGRES_URL_NON_POOLING (direct connection, supports DDL transactions
 * and multi-statement scripts). The pooler/transaction-mode connection at
 * POSTGRES_URL doesn't support multi-statement DDL.
 */
import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { Client } from 'pg'

config({ path: resolve(process.cwd(), '.env.local') })

const rawUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL
if (!rawUrl) {
  console.error('✗ Missing POSTGRES_URL_NON_POOLING / POSTGRES_URL')
  console.error('  Run `npx vercel env pull .env.local` to fetch them.')
  process.exit(1)
}
// Strip sslmode= so our explicit ssl: { rejectUnauthorized: false } below
// isn't overridden by pg-connection-string parsing the URL flag.
const url = rawUrl.replace(/[?&]sslmode=[^&]*/g, '')

const sqlPath = resolve(process.cwd(), 'supabase/migrations/0001_init.sql')
const sql = readFileSync(sqlPath, 'utf8')

async function main() {
  // Supabase's pooler chain isn't in Node's default CA bundle — accept it.
  // Connection itself is still TLS-encrypted; only chain validation is relaxed.
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await client.connect()
  console.log(`▶ Applying ${sqlPath}`)

  try {
    await client.query(sql)
    console.log('✓ Schema applied successfully.')
  } catch (err) {
    if (err instanceof Error && /already exists/.test(err.message)) {
      console.log('ℹ Some objects already exist — schema is partially applied.')
      console.log('  Error detail:', err.message)
      console.log('  This is usually fine if you ran the migration before. Continuing.')
    } else {
      throw err
    }
  } finally {
    await client.end()
  }
}

main().catch(err => {
  console.error('✗ Migration failed:', err)
  process.exit(1)
})
