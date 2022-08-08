import { DatabaseClient } from './db'

export type Migration = {
  name: string
  action: (
    client: DatabaseClient,
    cb: (err?: Error) => void
  ) => Promise<any> | void
}
