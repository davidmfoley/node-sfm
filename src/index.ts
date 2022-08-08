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
      run: (cb) => {
        logger.start()
        connect(url)
          .then(function ({ client, done }) {
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
          .catch((err) => {
            logger.failed(err)
            cb(err)
          })
      },
      test: () => {
        logger.start()

        return connect(url)
          .catch((err) => {
            logger.failed(err)
            throw err
          })
          .then(({ client, done }) =>
            testMigrations(client, source, logger)
              .catch((err) => {
                logger.failed(err)
                done()
                throw err
              })
              .then((r) => {
                logger.complete(r)
                done()
                return r
              })
          )
      },
      info: async function (cb) {
        const { client, done } = await connect(url)
        getInfo(client, source, logger, function (err, result) {
          done()
          cb(err, result)
        })
      },
    }
  }
}

export default sfm
