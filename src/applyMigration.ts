import { DatabaseClient } from './db'
import { Logger } from './logger/Logger'
import { Migration } from './Migration'
import { MigrationHistory } from './migrationHistory'

export const applyMigration =
  (client: DatabaseClient, history: MigrationHistory, logger: Logger) =>
  async (migration: Migration) => {
    logger.migrationStart(migration)

    try {
      if (migration.transaction) await client.query('BEGIN;')
      await migration.action(client)
      await history.markAsComplete(migration.name)
      if (migration.transaction) await client.query('COMMIT;')

      logger.migrationComplete(migration)
    } catch (err) {
      logger.migrationFailed(migration, err)

      if (migration.transaction) await client.query('ROLLBACK')
      //TODO: real error
      var error = new Error(
        'Migration failed: ' + migration.name + ':' + err.message
      ) as any
      error.failedMigration = migration.name
      error.sqlError = err

      throw error
    }
  }
