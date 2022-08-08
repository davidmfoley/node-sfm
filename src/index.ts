import { chalkLogger } from './logger'
import { getInfo } from './commands/info'
import { runMigrations } from './commands/run'
import { testMigrations } from './commands/test'
import { connect } from './db'
import { fileSource } from './fileSource'
import { Logger } from './logger/Logger'

type MigrationSource = any

function sfm(url: string, opts?: { logger: Logger }) {
  var logger = (opts || {}).logger || chalkLogger

  return {
    fromDirectory: function (pathname: string) {
      return runner(url, fileSource(pathname))
    },
  }

  function runner(url: string, source: MigrationSource) {
    return {
      run: function (cb) {
        logger.start()
        connect(url, function (err, client, done) {
          if (err) {
            logger.failed(err)
            return cb(err)
          }

          runMigrations(client, source, logger, function (err, result) {
            done()

            if (err) {
              logger.failed(err)
            } else {
              logger.complete(result)
            }

            cb(err, result)
          })
        })
      },
      test: function (cb) {
        logger.start()
        connect(url, function (err, client, done) {
          if (err) {
            logger.failed(err)
            return cb(err)
          }

          testMigrations(client, source, logger, function (err, result) {
            done()

            if (err) {
              logger.failed(err)
            } else {
              logger.complete(result)
            }

            cb(err, result)
          })
        })
      },
      info: function (cb) {
        connect(url, function (err, client, done) {
          if (err) return cb(err)

          getInfo(client, source, logger, function (err, result) {
            done()
            cb(err, result)
          })
        })
      },
    }
  }
}

export default sfm
