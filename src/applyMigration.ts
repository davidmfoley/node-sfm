import { DatabaseClient } from './db'
import { Logger } from './logger/Logger'
import { Migration } from './Migration'
import { MigrationHistory } from './migrationHistory'

export const applyMigration =
  (client: DatabaseClient, history: MigrationHistory, logger: Logger) =>
  (migration: Migration, cb: (err?: Error) => void) => {
    function handleError(err) {
      logger.migrationFailed(migration, err)

      client.query('ROLLBACK', function (rollbackErr) {
        if (rollbackErr) {
          // log...
        }

        //TODO: real error
        var error = new Error(
          'Migration failed: ' + migration.name + ':' + err.message
        ) as any
        error.failedMigration = migration.name
        error.sqlError = err

        return cb(error)
      })
    }

    logger.migrationStart(migration)

    client.query('BEGIN;', function (err) {
      if (err) return cb(err)
      function handleResult(err?: Error) {
        if (err) {
          return handleError(err)
        }

        history.markAsComplete(migration.name, function (err) {
          if (err) {
            return handleError(err)
          }

          logger.migrationComplete(migration)
          client.query('COMMIT;', cb)
        })
      }

      var result = migration.action(client, handleResult)

      if (result && result.then) {
        result.then(function () {
          handleResult()
        }, handleResult)
      }
    })
  }
