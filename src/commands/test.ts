import async from 'async'
import migrationHistory from '../migrationHistory'

function wrapClient(client, logger) {
  return {
    query: function (sql, params, cb) {
      if (Array.isArray(params)) {
        logger.info(sql, params)
      } else {
        logger.info(sql)
      }
      if (typeof params === 'function') {
        cb = params
        params = []
      }

      if (typeof cb === 'function') {
        client.query(sql, params, function (err, result) {
          if (result && result.rowCount) {
            console.log(result.rowCount + ' rows affected')
          }
          cb(err, result)
        })
      } else {
        return client.query(sql, params).then((result) => {
          console.log(result.rowCount + ' rows affected')
          return result
        })
      }
    },
  }
}

export function testMigrations(client, source, logger, cb) {
  source(function (err, migrations) {
    if (err) {
      return cb(err)
    }

    client = wrapClient(client, logger)
    const history = migrationHistory(client)

    client.query('BEGIN;', function (err) {
      if (err) return cb(err)

      history.ensureMigrationsTableCreated(function (err) {
        if (err) return cb(err)

        history.filterAlreadyApplied(migrations, function (err, migrations) {
          if (err) return cb(err)
          async.mapSeries(
            migrations,
            function (migration, next) {
              var result = migration.action(client, next)

              if (result && result.then) {
                result.then(function () {
                  next()
                }, next)
              }
            },
            function (err, results) {
              client.query('ROLLBACK;', function (rollbackErr) {
                if (err || rollbackErr) {
                  return cb(err || rollbackErr)
                }
                cb(undefined, {
                  applied: migrations.map(function (m, i) {
                    return Object.assign({ results: results[i] }, m)
                  }),
                })
              })
            }
          )
        })
      })
    })
  })
}
