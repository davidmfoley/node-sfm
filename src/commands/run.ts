import async from 'async'
import { applyMigration } from '../applyMigration'
import migrationHistory from '../migrationHistory'

export function runMigrations(client, source, logger, cb) {
  const history = migrationHistory(client)

  source(function (err, migrations) {
    if (err) {
      return cb(err)
    }

    history.ensureMigrationsTableCreated(function (err) {
      if (err) return cb(err)

      history.filterAlreadyApplied(migrations, function (err, migrations) {
        if (err) return cb(err)

        async.mapSeries(
          migrations,
          applyMigration.bind(null, client, history, logger),

          function (err) {
            if (err) return cb(err)

            cb(undefined, {
              applied: migrations,
            })
          }
        )
      })
    })
  })
}
