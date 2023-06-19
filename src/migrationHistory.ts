import { DatabaseClient } from './db'
import { Migration } from './Migration'

export default function migrationHistory(
  client: DatabaseClient,
  schema?: string
) {
  const migrationsTableName = `${schema || 'public'}.sfm_migrations`
  async function ensureMigrationsTableCreated() {
    await client.query(
      'create table if not exists ' +
        migrationsTableName +
        '(name varchar, applied timestamp)'
    )
  }

  async function markAsComplete(name: string) {
    await client.query(
      'insert into ' + migrationsTableName + '(name, applied) values($1, $2)',
      [name, new Date()]
    )
  }

  async function getAppliedMigrations() {
    const result = await client
      .query(
        'select applied, name from ' + migrationsTableName + ' order by applied'
      )
      .catch((err) => {
        // sfm table not yet setup, no migrations applied
        if (err.code === '42P01') return { rows: [] }
        throw err
      })

    return result.rows
  }

  async function filterAlreadyApplied(migrations: Migration[]) {
    const applied = await getAppliedMigrationNames()

    const result = migrations.filter(
      (migration) => !applied.includes(migration.name)
    )
    return result
  }

  const getAppliedMigrationNames = () =>
    getAppliedMigrations().then((migrations) => migrations.map((m) => m.name))

  return {
    ensureMigrationsTableCreated,
    getAppliedMigrations,
    filterAlreadyApplied,
    markAsComplete,
  }
}

export type MigrationHistory = ReturnType<typeof migrationHistory>
