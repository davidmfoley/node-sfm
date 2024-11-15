import { chalkLogger } from './logger'
import { getInfo } from './commands/info'
import { runMigrations } from './commands/run'
import { testMigrations } from './commands/test'
import { connect } from './db'
import { fileSource } from './fileSource'
import { Logger } from './logger/Logger'
import { PoolConfig } from 'pg'

type MigrationSource = any

interface SfmOptions {
  logger: Logger
  schema?: string
}
function sfm(urlOrConfig: string | PoolConfig, opts?: SfmOptions) {
  var logger = (opts || {}).logger || chalkLogger
  var schema = (opts || {}).schema || undefined

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
        try {
          const result = await runMigrations(client, source, logger, schema)
          logger.complete(result)
          return result
        } catch (err) {
          logger.failed(err)
          throw err
        } finally {
          done()
        }
      },
      test: async () => {
        logger.start()

        const { client, done } = await connect(config)
        try {
          const result = await testMigrations(client, source, logger, schema)
          logger.complete(result)
          return result
        } catch (err) {
          logger.failed(err)
          throw err
        } finally {
          done()
        }
      },
      info: async () => {
        const { client, done } = await connect(config)

        return await getInfo(client, source, logger).finally(() => done())
      },
    }
  }
}

export default sfm
