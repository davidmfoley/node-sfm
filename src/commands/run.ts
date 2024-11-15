import { applyMigration } from '../applyMigration'
import { DatabaseClient } from '../db'
import { Logger } from '../logger'
import migrationHistory from '../migrationHistory'

export async function runMigrations(
  client: DatabaseClient,
  source: any,
  logger: Logger,
  schema?: string
) {
  if (schema) {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`)
  }

  const history = migrationHistory(client, schema)

  const migrations = await source()

  const unapplied = await history.filterAlreadyApplied(migrations)

  if (unapplied.length) {
    await history.ensureMigrationsTableCreated()
    const applier = applyMigration(client, history, logger)

    for (const migration of unapplied) {
      await applier(migration)
    }
  }

  return { applied: unapplied }
}
