import migrationHistory from '../migrationHistory'

export function getInfo(client, source, logger, cb) {
  const history = migrationHistory(client)
  source(function (err, migrations) {
    if (err) {
      return cb(err)
    }

    history.filterAlreadyApplied(migrations, function (err, unapplied) {
      if (err) return cb(err)

      history.getAppliedMigrations(function (err, applied) {
        if (err) {
          return cb(err)
        }
        cb(undefined, { applied: applied, unapplied: unapplied })
      })
    })
  })
}
