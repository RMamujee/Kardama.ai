import { config } from 'dotenv'
import { resolve } from 'path'
import { Client } from 'pg'

config({ path: resolve(process.cwd(), '.env.local') })

const url = (process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || '')
  .replace(/[?&]sslmode=[^&]*/g, '')

async function main() {
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await client.connect()

  const types = await client.query(
    `select typname from pg_type where typnamespace = 'public'::regnamespace and typtype = 'e' order by typname`
  )
  const tables = await client.query(
    `select tablename from pg_tables where schemaname = 'public' order by tablename`
  )
  const policies = await client.query(
    `select tablename, count(*) as n from pg_policies where schemaname='public' group by tablename order by tablename`
  )

  console.log('Enums:    ', types.rows.map(r => r.typname).join(', ') || '(none)')
  console.log('Tables:   ', tables.rows.map(r => r.tablename).join(', ') || '(none)')
  console.log('Policies:')
  for (const r of policies.rows) console.log('   ', r.tablename, '×', r.n)

  await client.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
