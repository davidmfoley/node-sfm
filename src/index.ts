import { chalkLogger } from './logger'
import { getInfo } from './commands/info'
import { runMigrations } from './commands/run'
import { testMigrations } from './commands/test'
import { connect } from './db'
import { fileSource } from './fileSource'
import { Logger } from './logger/Logger'
import { PoolConfig } from 'pg'

type MigrationSource = any

function sfm(urlOrConfig: string | PoolConfig, opts?: { logger: Logger }) {
  var logger = (opts || {}).logger || chalkLogger

  let config: PoolConfig
  if (typeof urlOrConfig === 'string') {
    config = { connectionString: urlOrConfig }
  } else {
    config = urlOrConfig
  }
  return {
    fromDirectory: function (pathname: string) {
      return runner(config, fileSource(pathname))
    },
  }

  function runner(config: PoolConfig, source: MigrationSource) {
    return {
      run: async () => {
        logger.start()
        const { client, done } = await connect(config)
        return await runMigrations(client, source, logger)
          .then((result) => {
            logger.complete(result)
            return result
          })
          .catch((err) => {
            logger.failed(err)
            throw err
          })
          .finally(() => done())
      },
      test: () => {
        logger.start()

        return connect(config)
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
      info: async () => {
        const { client, done } = await connect(config)

        return await getInfo(client, source, logger).finally(() => done())
      },
    }
  }
}

export default sfm
