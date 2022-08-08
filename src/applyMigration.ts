export function applyMigration(client, history, logger, migration, cb) {
  function handleError(client, migration, err, cb) {
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
        return handleError(client, migration, err, cb)
      }

      history.markAsComplete(migration.name, function (err) {
        if (err) {
          return handleError(client, migration, err, cb)
        }

        logger.migrationComplete(migration, err)
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
