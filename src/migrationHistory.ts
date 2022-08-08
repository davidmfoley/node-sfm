const migrationsTableName = 'sfm_migrations'

export default function migrationHistory(client) {
  function ensureMigrationsTableCreated(cb) {
    client.query(
      'create table if not exists ' +
        migrationsTableName +
        '(name varchar, applied timestamp)',
      cb
    )
  }

  function markAsComplete(name, cb) {
    client.query(
      'insert into ' + migrationsTableName + '(name, applied) values($1, $2)',
      [name, new Date()],
      function (err) {
        cb(err)
      }
    )
  }

  function getAppliedMigrations(cb) {
    client.query(
      'select applied, name from ' + migrationsTableName + ' order by applied',
      function (err, result) {
        if (err) {
          // sfm table not yet setup, no migrations applied
          if (err.code === '42P01') return cb(undefined, [])
          return cb(err)
        }
        return cb(undefined, result.rows)
      }
    )
  }
  function filterAlreadyApplied(migrations, cb) {
    getAppliedMigrationNames(function (err, applied) {
      if (err) return cb(err)

      var notYetApplied = migrations.filter(function (migration) {
        return applied.indexOf(migration.name) === -1
      })

      cb(null, notYetApplied)
    })
  }

  function getAppliedMigrationNames(cb) {
    getAppliedMigrations(function (err, migrations) {
      if (err) return cb(err)
      var names = migrations.map(function (row) {
        return row.name
      })
      cb(undefined, names)
    })
  }

  return {
    ensureMigrationsTableCreated,
    getAppliedMigrations,
    filterAlreadyApplied,
    markAsComplete,
  }
}

export type MigrationHistory = ReturnType<typeof migrationHistory>
