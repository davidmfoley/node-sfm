import { DatabaseClient } from '../db'
import { Logger } from '../logger'
import migrationHistory from '../migrationHistory'

export const getInfo = async (
  client: DatabaseClient,
  source: any,
  _logger: Logger
) => {
  const history = migrationHistory(client)
  const migrations = await source()
  const unapplied = await history.filterAlreadyApplied(migrations)

  const applied = await history.getAppliedMigrations()
  return { applied: applied, unapplied: unapplied }
}
