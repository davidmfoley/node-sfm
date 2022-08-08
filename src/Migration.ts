import { DatabaseClient } from './db'

export type Migration = {
  name: string
  action: (client: DatabaseClient) => Promise<any>
}
