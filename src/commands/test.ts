import { promisify } from 'node:util'
import { DatabaseClient } from '../db'
import { Logger } from '../logger'
import migrationHistory from '../migrationHistory'
import { AppliedMigration, MigrationResult } from '../migrationResult'

function wrapClient(client: DatabaseClient, logger: Logger): DatabaseClient {
  return {
    query: async (sql: string, params?: any[]) => {
      if (params) {
        logger.info(sql, params)
      } else {
        logger.info(sql)
      }

      return client.query(sql, params).then((result) => {
        logger.info(result.rowCount + ' rows affected')
        return result
      })
    },
  } as any // TODO
}

export const testMigrations = async (
  client: DatabaseClient,
  source: any,
  logger: Logger
) => {
  const migrations = await promisify(source)()

  client = wrapClient(client, logger)
  const history = migrationHistory(client)

  await client.query('BEGIN;')

  await promisify(history.ensureMigrationsTableCreated)()

  const filtered = await promisify(history.filterAlreadyApplied)(migrations)
  const applied = [] as AppliedMigration

  for (let migration of filtered) {
    const result = await promisify(migration.action)(client).catch(
      async (err: Error) => {
        await client.query('ROLLBACK;')
        throw err
      }
    )

    applied.push({ ...result, name: migration.name })
  }
  await client.query('ROLLBACK;')
  return { applied }
}
